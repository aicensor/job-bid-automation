import { generateObject } from 'ai';
import { z } from 'zod';
import { withModelFallback } from '@/ai/timeout';
import type { Resume, ParsedJob, TailorPreferences, PipelineConfig } from '@/lib/types';
import type { GapAnalysis } from './gap-analyzer';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Bullet Point Rewriter — LLM-powered experience tailoring
// ============================================================================

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), 'src/ai/prompts/rewrite-bullets.md'),
  'utf-8'
);

const rewrittenExperienceSchema = z.object({
  experiences: z.array(z.object({
    id: z.string(),
    bullets: z.array(z.string()),
    title: z.string(),
  })),
});

/**
 * Rewrite resume bullets to match JD language while staying truthful
 */
export async function rewriteBullets(
  resume: Resume,
  job: ParsedJob,
  gaps: GapAnalysis,
  preferences: TailorPreferences,
  config: PipelineConfig,
  additionalInstructions?: string
): Promise<Resume> {
  // Only rewrite recent experience (based on preferences)
  const experienceToRewrite = resume.experience.filter((_, i) =>
    i < preferences.yearsToHighlight
  );

  const prompt = buildRewritePrompt(experienceToRewrite, job, gaps, preferences, additionalInstructions);

  const { object } = await withModelFallback('rewrite', 'bullet-rewriter', (model) =>
    generateObject({
      model,
      schema: rewrittenExperienceSchema,
      system: SYSTEM_PROMPT,
      prompt,
      temperature: config.temperature,
    })
  );

  // Merge rewritten bullets back into resume
  const updated = { ...resume };
  updated.experience = resume.experience.map(exp => {
    const rewritten = object.experiences.find(r => r.id === exp.id);
    if (rewritten) {
      return {
        ...exp,
        bullets: rewritten.bullets,
        title: rewritten.title,
      };
    }
    return exp;
  });

  const totalBullets = object.experiences.reduce((sum, e) => sum + e.bullets.length, 0);
  console.log(`  → Rewrote ${totalBullets} bullets across ${object.experiences.length} roles`);

  return updated;
}

function buildRewritePrompt(
  experience: Resume['experience'],
  job: ParsedJob,
  gaps: GapAnalysis,
  preferences: TailorPreferences,
  additionalInstructions?: string
): string {
  return `
## Target Job
Company: ${job.company}
Title: ${job.title}
Seniority: ${job.seniorityLevel}

## Required Skills
${job.requiredSkills.map(s => `- ${s.skill} (${s.priority})`).join('\n')}

## Key Responsibilities from JD
${job.responsibilities.map(r => `- ${r}`).join('\n')}

## Keywords to Incorporate
${job.keywords.join(', ')}

## Missing Skills (inject if truthful)
${gaps.missingSkills.join(', ')}

## Relevant Achievements Available
${gaps.relevantAchievements.map(a =>
    `- [${a.tags.join(', ')}] ${a.action} → ${a.result}`
  ).join('\n')}

## Preferences
- Tone: ${preferences.tone}
- Emphasis: ${preferences.emphasis}
- Max bullets per role: ${preferences.maxBulletsPerRole}
${additionalInstructions ? `\n## Additional Instructions\n${additionalInstructions}\n` : ''}
## Current Experience to Rewrite
${experience.map(exp => `
### ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate})
${exp.bullets.map(b => `- ${b}`).join('\n')}
Tags: ${exp.tags.join(', ')}
ID: ${exp.id}
`).join('\n')}

Rewrite each role's bullets to maximize relevance to this specific job posting.
Use achievements from the bank where they genuinely apply.
Return the same experience IDs with updated bullets and optimized titles.
`.trim();
}
