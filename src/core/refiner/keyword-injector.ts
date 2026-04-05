import { generateObject } from 'ai';
import { z } from 'zod';
import { withModelFallback } from '@/ai/timeout';
import type { Resume, ParsedJob, PipelineConfig } from '@/lib/types';

// ============================================================================
// Keyword Injector — Pass 1 of 3-pass refinement
// Naturally injects missing JD keywords into resume
// ============================================================================

const injectionSchema = z.object({
  injections: z.array(z.object({
    keyword: z.string(),
    section: z.string(),
    location: z.string(),         // which bullet/field
    originalText: z.string(),
    modifiedText: z.string(),
    justification: z.string(),
  })),
  skippedKeywords: z.array(z.object({
    keyword: z.string(),
    reason: z.string(),           // "candidate lacks this skill", "already present"
  })),
});

/**
 * Inject missing keywords naturally into the resume
 */
export async function injectKeywords(
  resume: Resume,
  job: ParsedJob,
  config: PipelineConfig
): Promise<Resume> {
  // Find missing keywords — cap at 15 to avoid LLM timeouts
  const MAX_KEYWORDS = 15;
  const resumeText = getAllText(resume).toLowerCase();
  const allMissing = job.keywords.filter(k => !resumeText.includes(k.toLowerCase()));

  if (allMissing.length === 0) {
    console.log('  → No missing keywords');
    return resume;
  }

  // Prioritize required skill keywords over general keywords
  const requiredSkillNames = new Set(job.requiredSkills.map(s => s.skill.toLowerCase()));
  const missing = allMissing
    .sort((a, b) => {
      const aReq = requiredSkillNames.has(a.toLowerCase()) ? 0 : 1;
      const bReq = requiredSkillNames.has(b.toLowerCase()) ? 0 : 1;
      return aReq - bReq;
    })
    .slice(0, MAX_KEYWORDS);

  console.log(`  → ${allMissing.length} missing keywords, injecting top ${missing.length}`);

  const prompt = `
## Missing Keywords
${missing.join(', ')}

## Current Resume
Summary: ${resume.summary}

Experience:
${resume.experience.map(e => `
${e.title} at ${e.company}
${e.bullets.map(b => `- ${b}`).join('\n')}
`).join('\n')}

Skills:
${resume.skills.map(c => `${c.category}: ${c.skills.join(', ')}`).join('\n')}

For each missing keyword, find the most natural place to insert it. Modify the existing text minimally. Skip keywords that would require fabrication.
  `.trim();

  const { object } = await withModelFallback('rewrite', 'keyword-injector', (model) =>
    generateObject({
      model,
      schema: injectionSchema,
      system: `You are a resume keyword optimization expert. Inject missing keywords ONLY where they fit naturally into existing text. Rules:
- Do NOT add "by XX%" or any fabricated metrics
- Do NOT add bold (**) around injected keywords
- Make minimal changes — swap a synonym or add a parenthetical, don't rewrite the whole bullet
- Skip keywords that would require fabrication or feel forced
- It's better to skip a keyword than to make a bullet sound unnatural`,
      prompt,
      temperature: 0.3,
    })
  );

  // Apply injections
  let updated = JSON.parse(JSON.stringify(resume)) as Resume;

  for (const injection of object.injections) {
    updated = applyInjection(updated, injection);
  }

  console.log(`  → Injected ${object.injections.length} keywords, skipped ${object.skippedKeywords.length}`);

  return updated;
}

function applyInjection(
  resume: Resume,
  injection: { section: string; originalText: string; modifiedText: string }
): Resume {
  const updated = { ...resume };

  // Search and replace in all text fields
  if (updated.summary.includes(injection.originalText)) {
    updated.summary = updated.summary.replace(injection.originalText, injection.modifiedText);
    return updated;
  }

  updated.experience = updated.experience.map(exp => ({
    ...exp,
    bullets: exp.bullets.map(b =>
      b.includes(injection.originalText)
        ? b.replace(injection.originalText, injection.modifiedText)
        : b
    ),
  }));

  return updated;
}

function getAllText(resume: Resume): string {
  return [
    resume.summary,
    ...resume.experience.flatMap(e => [...e.bullets, e.title, ...e.tags]),
    ...resume.skills.flatMap(c => c.skills),
    ...resume.projects.flatMap(p => [...p.technologies, ...p.bullets]),
  ].join(' ');
}
