import { generateObject } from 'ai';
import { z } from 'zod';
import { withModelFallback } from '@/ai/timeout';
import type { Resume, ParsedJob, PipelineConfig } from '@/lib/types';

// ============================================================================
// Skills Section Tailorer — Reorder, add missing, trim irrelevant
// ============================================================================
// The skills section has HIGH ATS keyword weight. Each keyword should appear
// 2-3 times across sections (summary, experience, skills). This step ensures
// JD-relevant skills are present and prominent in the skills section.
// ============================================================================

const tailoredSkillsSchema = z.object({
  skills: z.array(z.object({
    category: z.string(),
    skills: z.array(z.string()),
  })),
});

/**
 * Tailor the skills section to match the job description.
 * - Reorders categories: most JD-relevant first
 * - Within each category: JD-matched skills first
 * - Adds missing JD skills that the candidate plausibly has
 * - Trims irrelevant skills if section gets too long
 */
export async function tailorSkills(
  resume: Resume,
  job: ParsedJob,
  config: PipelineConfig
): Promise<Resume> {
  // Collect all JD skill terms
  const jdSkills = [
    ...job.requiredSkills.map(s => s.skill),
    ...job.preferredSkills.map(s => s.skill),
  ];
  const jdKeywords = job.keywords;

  // Quick check: if skills section is empty, nothing to tailor
  if (resume.skills.length === 0) {
    console.log('  → No skills section to tailor');
    return resume;
  }

  // Collect all current resume skills for context
  const currentSkills = resume.skills.flatMap(c => c.skills);

  // Build the prompt
  const prompt = `## Current Skills Section
${resume.skills.map(c => `${c.category}: ${c.skills.join(', ')}`).join('\n')}

## Job Required Skills
${jdSkills.join(', ')}

## Job Keywords (for ATS matching)
${jdKeywords.slice(0, 40).join(', ')}

## Job Title
${job.title} at ${job.company}

## Job Responsibilities (top 5)
${job.responsibilities.slice(0, 5).map(r => `- ${r}`).join('\n')}

## Instructions
Tailor this skills section for the job above. Follow these rules exactly:

1. **Reorder categories** — put the most job-relevant category first
2. **Reorder skills within each category** — put JD-matched skills first in each list
3. **Add missing skills** — if the JD requires skills that are PLAUSIBLE given the candidate's existing stack, add them to the appropriate category. For example:
   - A Node.js developer can plausibly know Express, Fastify
   - A React developer can plausibly know Redux, Next.js
   - An AWS developer can plausibly know CloudFormation, Lambda
   - A Python developer can plausibly know Django, FastAPI
   - BUT a C# developer probably doesn't know Rust or Elixir — don't add those
4. **Don't add skills from a completely different stack** — only add skills adjacent to what's already listed
5. **Trim low-value skills** — if a category grows beyond 10 items, remove the least relevant ones (ones not in the JD and not core to the candidate's stack)
6. **Rename categories if needed** — to match common ATS section names (e.g., "DevOps & Cloud" is fine, "My Toolkit" is not)
7. **Keep it realistic** — max 8-10 skills per category, 5-8 categories total
8. **Preserve the candidate's core identity** — their primary stack should still be prominent

Return the tailored skills section.`.trim();

  const { object } = await withModelFallback('rewrite', 'skills-tailorer', (model) =>
    generateObject({
      model,
      schema: tailoredSkillsSchema,
      system: `You are a resume skills section optimizer. Your job is to make the skills section maximize ATS keyword matches while staying truthful to the candidate's actual capabilities. Only add skills that are plausible given their existing tech stack. Never add skills from a completely unrelated domain.`,
      prompt,
      temperature: 0.3,
    })
  );

  // Count changes for logging
  const newSkills = object.skills.flatMap(c => c.skills);
  const added = newSkills.filter(s => !currentSkills.some(cs => cs.toLowerCase() === s.toLowerCase()));
  const removed = currentSkills.filter(s => !newSkills.some(ns => ns.toLowerCase() === s.toLowerCase()));

  console.log(`  → Skills tailored: ${added.length} added, ${removed.length} trimmed, ${object.skills.length} categories`);
  if (added.length > 0) console.log(`    Added: ${added.slice(0, 10).join(', ')}${added.length > 10 ? ` +${added.length - 10}` : ''}`);

  return {
    ...resume,
    skills: object.skills,
  };
}
