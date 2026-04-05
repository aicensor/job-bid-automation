import type { Resume, ParsedJob, TailorResult, TailorPreferences, PipelineConfig, Achievement } from '@/lib/types';
import { parseJobDescription } from '@/core/parser/jd-parser';
import { analyzeGaps } from './gap-analyzer';
import { rewriteBullets } from './rewriter';
import { reorderSections } from './section-reorderer';
import { generateSummary } from './summary-generator';
import { tailorSkills } from './skills-tailorer';
import { injectKeywords } from '@/core/refiner/keyword-injector';
import { cleanAiPhrases } from '@/core/refiner/ai-phrase-cleaner';
import { validateTruth } from '@/core/refiner/truth-validator';
import { scoreResume } from '@/core/scorer/composite-scorer';
import { validateBlockedFields } from '@/core/validators/blocked-fields';
import { defaultConfig } from '@/ai/providers';
import { startRun, log, endRun } from '@/lib/pipeline-log';

// ============================================================================
// Main Tailoring Pipeline — Orchestrates the full resume transformation
// ============================================================================

export interface PipelineInput {
  baseResume: Resume;
  jobDescription: string;
  achievements: Achievement[];
  preferences: TailorPreferences;
  config?: Partial<PipelineConfig>;
  additionalInstructions?: string;
  strictTruthCheck?: boolean;
}

export async function tailorResume(input: PipelineInput): Promise<TailorResult> {
  const config = { ...defaultConfig, ...input.config };
  const { baseResume, jobDescription, achievements, preferences, additionalInstructions, strictTruthCheck = true } = input;

  startRun();
  log('info', 'pipeline', 'TAILOR RESUME PIPELINE');

  // Step 1: Parse JD
  log('info', 'step-1', 'Parsing job description...');
  const parsedJob = await parseJobDescription(jobDescription, config);
  log('info', 'step-1', `Done: ${parsedJob.company} | ${parsedJob.title} | ${parsedJob.keywords.length} keywords`);

  // Step 2: Score base resume
  log('info', 'step-2', 'Scoring base resume...');
  const scoreBefore = await scoreResume(baseResume, parsedJob, config);
  log('info', 'step-2', `Done: base score ${scoreBefore.overall}/100`);

  // Deep copy for tailoring
  let tailored: Resume = JSON.parse(JSON.stringify(baseResume));
  tailored.isBase = false;
  tailored.jobId = parsedJob.id;

  let iterations = 0;
  let currentScore = scoreBefore;

  while (iterations < config.maxIterations) {
    iterations++;
    log('info', 'iteration', `Starting iteration ${iterations}/${config.maxIterations}`);

    // Step 3: Analyze gaps
    log('info', 'step-3', 'Analyzing gaps...');
    const gaps = await analyzeGaps(tailored, parsedJob, achievements);
    log('info', 'step-3', `Done: ${gaps.missingSkills.length} missing skills, ${gaps.relevantAchievements.length} achievements`);

    // Steps 4+5: Rewrite bullets + generate summary (parallel)
    log('info', 'step-4+5', 'Rewriting bullets + generating summary (parallel)...');
    const [rewrittenResume, summaryResume] = await Promise.all([
      rewriteBullets(tailored, parsedJob, gaps, preferences, config, additionalInstructions),
      generateSummary(tailored, parsedJob, preferences, config, additionalInstructions),
    ]);
    tailored = { ...rewrittenResume, summary: summaryResume.summary };
    log('info', 'step-4+5', 'Done: bullets rewritten + summary generated');

    // Step 5b: Tailor skills section
    log('info', 'step-5b', 'Tailoring skills section...');
    tailored = await tailorSkills(tailored, parsedJob, config);
    log('info', 'step-5b', 'Done');

    // Step 6: Reorder sections
    log('info', 'step-6', 'Reordering sections...');
    tailored = reorderSections(tailored, parsedJob);
    log('info', 'step-6', `Done: ${tailored.sectionOrder.join(' → ')}`);

    // Step 7: Keyword injection
    log('info', 'step-7a', 'Injecting missing keywords...');
    tailored = await injectKeywords(tailored, parsedJob, config);
    log('info', 'step-7a', 'Done');

    // Step 7b+c: AI cleanup + truth validation (parallel)
    if (strictTruthCheck) {
      log('info', 'step-7bc', 'Cleaning AI phrases + validating truth (parallel)...');
      const [cleanedResume, truthResult] = await Promise.all([
        cleanAiPhrases(tailored, config),
        validateTruth(tailored, baseResume, config),
      ]);
      tailored = cleanedResume;
      if (truthResult.violations.length > 0) {
        log('warn', 'step-7bc', `${truthResult.violations.length} truth violations found — reverting`);
        tailored = truthResult.correctedResume;
      }
      log('info', 'step-7bc', 'Done');
    } else {
      log('info', 'step-7bc', 'Strict truth checking disabled — cleaning AI phrases only...');
      tailored = await cleanAiPhrases(tailored, config);
      log('info', 'step-7bc', 'Done');
    }

    // Validate blocked fields
    validateBlockedFields(baseResume, tailored, preferences);

    // Step 8: Score tailored resume
    log('info', 'step-8', 'Scoring tailored resume...');
    currentScore = await scoreResume(tailored, parsedJob, config);
    log('info', 'step-8', `Done: score ${currentScore.overall}/100 (threshold: ${config.scoreThreshold})`);

    if (currentScore.passesThreshold) {
      log('info', 'pipeline', 'Score passes threshold!');
      break;
    }

    if (iterations < config.maxIterations) {
      log('warn', 'pipeline', `Below threshold, running iteration ${iterations + 1}...`);
    }
  }

  const result: TailorResult = {
    baseResumeId: baseResume.id,
    jobId: parsedJob.id,
    tailoredResume: tailored,
    scoreBefore,
    scoreAfter: currentScore,
    iterations,
    changes: [],
    generatedAt: new Date(),
  };

  log('info', 'pipeline', `COMPLETE: ${scoreBefore.overall} → ${currentScore.overall} (+${currentScore.overall - scoreBefore.overall}) in ${iterations} iteration(s)`);
  endRun();

  return result;
}
