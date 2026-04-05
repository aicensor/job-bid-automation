import { generateObject } from 'ai';
import { z } from 'zod';
import { withModelFallback } from '@/ai/timeout';
import type { Resume, PipelineConfig } from '@/lib/types';

// ============================================================================
// AI Phrase Cleaner — Pass 2 of 3-pass refinement
// Removes robotic/AI-sounding language
// ============================================================================

// Common AI-generated phrases to flag
const AI_PHRASE_PATTERNS = [
  /leverag(ed|ing) cutting-edge/i,
  /spearheaded innovative/i,
  /drove synergies/i,
  /holistic approach/i,
  /passionate about/i,
  /dynamic environment/i,
  /state-of-the-art/i,
  /best-in-class/i,
  /paradigm shift/i,
  /thought leader/i,
  /results-driven professional/i,
  /proven track record of success/i,
  /excellent communication skills/i,
  /fast-paced environment/i,
  /team player/i,
  /go-getter/i,
  /self-starter/i,
  /detail-oriented/i,
  /synergiz/i,
  /revolutioniz/i,
  /transformative/i,
  /game-?chang/i,
  /seamless(ly)?/i,
  /robust and scalable/i,
  /end-to-end/i,    // overused
];

// Structural AI patterns — checked across all bullets, not individual
const STRUCTURAL_AI_CHECKS = {
  // Bullets with fabricated-looking "by XX%" at the end
  fabricatedMetricPattern: /(?:reducing|improving|increasing|boosting|cutting|decreasing|enhancing|accelerating|streamlining)\s+\w[\w\s]*\bby\s+\d+%/i,
  // Over-bolding: 3+ bold phrases in one bullet
  overBoldPattern: /(\*\*[^*]+\*\*.*){3,}/,
  // Bold on soft skills / generic phrases
  softSkillBoldPattern: /\*\*(cross-functional collaboration|code reviews?|technical design discussions?|architectural decisions?|data protection|responsive UI|accessible UI|cloud-based SaaS|best practices|agile methodologies?)\*\*/i,
};

const cleanupSchema = z.object({
  cleanups: z.array(z.object({
    original: z.string(),
    cleaned: z.string(),
    reason: z.string(),
  })),
});

/**
 * Clean AI-sounding phrases from the resume
 * Note: **bold** markdown is preserved — it's converted to proper formatting
 * in the HTML/DOCX generators, not stripped here.
 */
export async function cleanAiPhrases(
  resume: Resume,
  config: PipelineConfig
): Promise<Resume> {

  // Quick scan for obvious AI phrases + structural patterns
  const allText = getAllBullets(resume);
  const flagged = new Set<string>();

  // Pass 1: obvious AI buzzwords
  for (const text of allText) {
    if (AI_PHRASE_PATTERNS.some(p => p.test(text))) flagged.add(text);
  }

  // Pass 2: structural AI patterns (fabricated metrics, over-bolding, soft-skill bolding)
  for (const text of allText) {
    if (STRUCTURAL_AI_CHECKS.fabricatedMetricPattern.test(text)) flagged.add(text);
    if (STRUCTURAL_AI_CHECKS.overBoldPattern.test(text)) flagged.add(text);
    if (STRUCTURAL_AI_CHECKS.softSkillBoldPattern.test(text)) flagged.add(text);
  }

  // Pass 3: check for repeated bold keywords across bullets (same phrase bolded 3+ times)
  const boldCounts = new Map<string, number>();
  for (const text of allText) {
    const bolds = text.match(/\*\*[^*]+\*\*/g) || [];
    for (const b of bolds) {
      boldCounts.set(b, (boldCounts.get(b) || 0) + 1);
    }
  }
  const overusedBolds = new Set([...boldCounts.entries()].filter(([, c]) => c >= 3).map(([k]) => k));
  if (overusedBolds.size > 0) {
    for (const text of allText) {
      if ([...overusedBolds].some(b => text.includes(b))) flagged.add(text);
    }
  }

  if (flagged.size === 0) {
    console.log('  → No AI phrases detected');
    return resume;
  }

  const flaggedArr = [...flagged];
  console.log(`  → ${flaggedArr.length} bullets flagged for AI phrase cleanup`);

  const flaggedPrompt = flaggedArr.map((b, i) => `${i + 1}. ${b}`).join('\n');

  // Build specific instructions based on what we detected
  const issues: string[] = [];
  const metricsCount = flaggedArr.filter(t => STRUCTURAL_AI_CHECKS.fabricatedMetricPattern.test(t)).length;
  if (metricsCount > 0) issues.push(`${metricsCount} bullets have suspicious "by XX%" metrics — remove fabricated percentages. If the metric wasn't in the original resume, remove it or replace with a concrete description of what improved.`);
  if (overusedBolds.size > 0) issues.push(`These bold keywords are overused (3+ times each): ${[...overusedBolds].join(', ')} — keep bold only on first occurrence, remove bold from the rest.`);
  const softBoldCount = flaggedArr.filter(t => STRUCTURAL_AI_CHECKS.softSkillBoldPattern.test(t)).length;
  if (softBoldCount > 0) issues.push(`${softBoldCount} bullets bold non-technical phrases like "cross-functional collaboration" or "code reviews" — remove bold from soft skills, only bold specific technologies.`);

  const { object } = await withModelFallback('rewrite', 'ai-phrase-cleaner', (model) =>
    generateObject({
      model,
      schema: cleanupSchema,
      system: `You are an editor who makes resume bullet points sound natural and human-written. Your job is to make AI-generated text undetectable. Replace corporate buzzwords with plain language. Remove fabricated metrics. Reduce excessive bolding. Keep the same meaning but make it sound like the candidate actually wrote it.`,
      prompt: `Clean up these bullet points:\n\n${flaggedPrompt}\n\nSpecific issues found:\n${issues.map(i => '- ' + i).join('\n')}`,
      temperature: 0.4,
    })
  );

  // Apply cleanups
  let updated = JSON.parse(JSON.stringify(resume)) as Resume;
  for (const cleanup of object.cleanups) {
    updated.experience = updated.experience.map(exp => ({
      ...exp,
      bullets: exp.bullets.map(b =>
        b.includes(cleanup.original)
          ? b.replace(cleanup.original, cleanup.cleaned)
          : b
      ),
    }));
    if (updated.summary.includes(cleanup.original)) {
      updated.summary = updated.summary.replace(cleanup.original, cleanup.cleaned);
    }
  }

  console.log(`  → Cleaned ${object.cleanups.length} AI phrases`);

  return updated;
}

function getAllBullets(resume: Resume): string[] {
  return [
    resume.summary,
    ...resume.experience.flatMap(e => e.bullets),
    ...resume.projects.flatMap(p => p.bullets),
  ];
}
