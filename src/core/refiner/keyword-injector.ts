import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/ai/providers';
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
  // Find missing keywords
  const resumeText = getAllText(resume).toLowerCase();
  const missing = job.keywords.filter(k => !resumeText.includes(k.toLowerCase()));

  if (missing.length === 0) {
    console.log('  → No missing keywords');
    return resume;
  }

  console.log(`  → ${missing.length} missing keywords to inject`);

  const { model } = getModel('rewrite', config);

  const { object } = await generateObject({
    model,
    schema: injectionSchema,
    system: `You are a resume keyword optimization expert. Your task is to naturally inject missing keywords into a resume WITHOUT fabricating experience. Only inject keywords that the candidate genuinely has based on their existing experience. Skip keywords that would require fabrication.`,
    prompt: `
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
    `.trim(),
    temperature: 0.3,
  });

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
