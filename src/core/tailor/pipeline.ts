import type { Resume, ParsedJob, TailorResult, TailorPreferences, PipelineConfig, Achievement } from '@/lib/types';
import { parseJobDescription } from '@/core/parser/jd-parser';
import { analyzeGaps } from './gap-analyzer';
import { rewriteBullets } from './rewriter';
import { reorderSections } from './section-reorderer';
import { generateSummary } from './summary-generator';
import { injectKeywords } from '@/core/refiner/keyword-injector';
import { cleanAiPhrases } from '@/core/refiner/ai-phrase-cleaner';
import { validateTruth } from '@/core/refiner/truth-validator';
import { scoreResume } from '@/core/scorer/composite-scorer';
import { validateBlockedFields } from '@/core/validators/blocked-fields';
import { defaultConfig } from '@/ai/providers';

// ============================================================================
// Main Tailoring Pipeline — Orchestrates the full resume transformation
// ============================================================================

export interface PipelineInput {
  baseResume: Resume;
  jobDescription: string;          // raw JD text or URL
  achievements: Achievement[];      // achievement bank
  preferences: TailorPreferences;
  config?: Partial<PipelineConfig>;
}

/**
 * Main pipeline: Base Resume + JD → Tailored Resume (scored & validated)
 *
 * Flow:
 * 1. Parse JD → structured requirements
 * 2. Score base resume (before)
 * 3. Analyze gaps between resume and JD
 * 4. Rewrite bullets using JD language + achievements
 * 5. Generate targeted summary
 * 6. Reorder sections by relevance
 * 7. 3-pass refinement (keywords → AI cleanup → truth check)
 * 8. Score tailored resume (after)
 * 9. Loop if score < threshold (max 3 iterations)
 */
export async function tailorResume(input: PipelineInput): Promise<TailorResult> {
  const config = { ...defaultConfig, ...input.config };
  const { baseResume, jobDescription, achievements, preferences } = input;

  console.log('═══════════════════════════════════════════════════');
  console.log('  TAILOR RESUME PIPELINE');
  console.log('═══════════════════════════════════════════════════');

  // Step 1: Parse job description
  console.log('\n[Step 1/9] Parsing job description...');
  const parsedJob = await parseJobDescription(jobDescription, config);
  console.log(`  → ${parsedJob.company} | ${parsedJob.title} | ${parsedJob.keywords.length} keywords`);

  // Step 2: Score base resume (before)
  console.log('\n[Step 2/9] Scoring base resume...');
  const scoreBefore = await scoreResume(baseResume, parsedJob, config);
  console.log(`  → Base score: ${scoreBefore.overall}/100`);

  // Step 3: Deep copy resume for tailoring
  let tailored: Resume = JSON.parse(JSON.stringify(baseResume));
  tailored.isBase = false;
  tailored.jobId = parsedJob.id;

  let iterations = 0;
  let currentScore = scoreBefore;

  // Iterative improvement loop
  while (iterations < config.maxIterations) {
    iterations++;
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ITERATION ${iterations}/${config.maxIterations}`);
    console.log(`${'─'.repeat(50)}`);

    // Step 4: Analyze gaps
    console.log('\n[Step 3/9] Analyzing gaps...');
    const gaps = await analyzeGaps(tailored, parsedJob, achievements);
    console.log(`  → ${gaps.missingSkills.length} missing skills, ${gaps.relevantAchievements.length} usable achievements`);

    // Step 5: Rewrite bullets
    console.log('\n[Step 4/9] Rewriting experience bullets...');
    tailored = await rewriteBullets(tailored, parsedJob, gaps, preferences, config);

    // Step 6: Generate summary
    console.log('\n[Step 5/9] Generating targeted summary...');
    tailored = await generateSummary(tailored, parsedJob, preferences, config);

    // Step 7: Reorder sections
    console.log('\n[Step 6/9] Reordering sections by relevance...');
    tailored = reorderSections(tailored, parsedJob);

    // Step 8: 3-pass refinement
    console.log('\n[Step 7/9] Pass 1: Injecting missing keywords...');
    tailored = await injectKeywords(tailored, parsedJob, config);

    console.log('[Step 7/9] Pass 2: Cleaning AI-sounding phrases...');
    tailored = await cleanAiPhrases(tailored, config);

    console.log('[Step 7/9] Pass 3: Validating truthfulness...');
    const truthResult = await validateTruth(tailored, baseResume, config);
    if (truthResult.violations.length > 0) {
      console.warn(`  ⚠️ ${truthResult.violations.length} truth violations found — reverting`);
      tailored = truthResult.correctedResume;
    }

    // Validate blocked fields haven't changed
    validateBlockedFields(baseResume, tailored, preferences);

    // Step 9: Score tailored resume
    console.log('\n[Step 8/9] Scoring tailored resume...');
    currentScore = await scoreResume(tailored, parsedJob, config);
    console.log(`  → Score: ${currentScore.overall}/100 (threshold: ${config.scoreThreshold})`);

    if (currentScore.passesThreshold) {
      console.log('\n  ✅ Score passes threshold!');
      break;
    }

    if (iterations < config.maxIterations) {
      console.log(`  ⚠️ Below threshold, running iteration ${iterations + 1}...`);
    }
  }

  // Build result
  const result: TailorResult = {
    baseResumeId: baseResume.id,
    jobId: parsedJob.id,
    tailoredResume: tailored,
    scoreBefore,
    scoreAfter: currentScore,
    iterations,
    changes: [], // TODO: track individual changes
    generatedAt: new Date(),
  };

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  PIPELINE COMPLETE');
  console.log(`  Score: ${scoreBefore.overall} → ${currentScore.overall} (+${currentScore.overall - scoreBefore.overall})`);
  console.log(`  Iterations: ${iterations}`);
  console.log('═══════════════════════════════════════════════════');

  return result;
}
