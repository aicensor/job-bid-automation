import { generateText } from 'ai';
import { withModelFallback } from '@/ai/timeout';
import type { Resume, ParsedJob, TailorPreferences, PipelineConfig } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Summary Generator — Creates a targeted professional summary
// ============================================================================

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), 'src/ai/prompts/generate-summary.md'),
  'utf-8'
);

/**
 * Generate a targeted summary paragraph for this specific JD
 */
export async function generateSummary(
  resume: Resume,
  job: ParsedJob,
  preferences: TailorPreferences,
  config: PipelineConfig
): Promise<Resume> {
  const prompt = `
## Target Role
${job.title} at ${job.company}
Seniority: ${job.seniorityLevel}

## Key Requirements
${job.requiredSkills.slice(0, 8).map(s => `- ${s.skill}`).join('\n')}

## Top Responsibilities
${job.responsibilities.slice(0, 5).map(r => `- ${r}`).join('\n')}

## Candidate's Current Experience
${resume.experience.slice(0, 3).map(e =>
    `- ${e.title} at ${e.company} (${e.startDate}-${e.endDate})`
  ).join('\n')}

## Candidate's Top Skills
${resume.skills.flatMap(c => c.skills).slice(0, 15).join(', ')}

## Candidate's Current Summary
${resume.summary || '(none)'}

## Preferences
Tone: ${preferences.tone}
Emphasis: ${preferences.emphasis}
Target seniority: ${preferences.targetSeniority}

Generate a 3-4 sentence professional summary optimized for this role.
  `.trim();

  const { text } = await withModelFallback('rewrite', 'summary-generator', (model) =>
    generateText({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      temperature: config.temperature,
    })
  );

  console.log(`  → Generated ${text.split(' ').length}-word summary`);

  return {
    ...resume,
    summary: text.trim(),
  };
}
