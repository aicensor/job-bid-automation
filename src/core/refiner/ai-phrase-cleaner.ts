import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/ai/providers';
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

  // Quick scan for obvious AI phrases
  const allText = getAllBullets(resume);
  const flagged = allText.filter(text =>
    AI_PHRASE_PATTERNS.some(p => p.test(text))
  );

  if (flagged.length === 0) {
    console.log('  → No AI phrases detected');
    return resume;
  }

  console.log(`  → ${flagged.length} bullets flagged for AI phrase cleanup`);

  const { model } = getModel('rewrite', config);

  const { object } = await generateObject({
    model,
    schema: cleanupSchema,
    system: `You are an editor who makes resume bullet points sound natural and human-written. Replace corporate buzzwords and AI-generated phrases with specific, concrete language. Keep the same meaning but make it sound like a real engineer wrote it.`,
    prompt: `Clean up these bullet points that contain AI-sounding language:\n\n${flagged.map((b, i) => `${i + 1}. ${b}`).join('\n')}`,
    temperature: 0.4,
  });

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
