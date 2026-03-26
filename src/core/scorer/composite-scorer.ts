import type { Resume, ParsedJob, ScoreResult, PipelineConfig } from '@/lib/types';
import { scoreAtsKeywords } from './ats-scorer';
import { scoreSemanticSimilarity } from './semantic-scorer';
import { scoreSenioritySignals } from './seniority-scorer';
import { scoreReadability } from './readability-scorer';

// ============================================================================
// Composite Scorer — Weighted aggregate of all scoring dimensions
// ============================================================================

// Weights calibrated against real ATS systems (Jobscan, Greenhouse, Workday)
// ATS keyword match is king — most systems are 40-50% keyword-based
const WEIGHTS = {
  atsKeywordMatch: 0.35,       // most important — direct ATS gate
  semanticSimilarity: 0.20,    // contextual relevance beyond keywords
  senioritySignals: 0.20,      // leadership, metrics, scope
  readability: 0.10,           // structure, formatting
  achievementQuality: 0.15,    // quantified results (recruiters love metrics)
};

/**
 * Score a resume against a parsed job description
 * Returns 0-100 composite score with breakdown
 */
export async function scoreResume(
  resume: Resume,
  job: ParsedJob,
  config: PipelineConfig
): Promise<ScoreResult> {
  // Run all scorers in parallel
  const [atsScore, semanticScore, seniorityScore, readabilityScore] = await Promise.all([
    scoreAtsKeywords(resume, job),
    scoreSemanticSimilarity(resume, job, config),
    scoreSenioritySignals(resume, job),
    scoreReadability(resume),
  ]);

  // Achievement quality is derived from seniority signals
  const achievementScore = scoreAchievementQuality(resume);

  // Weighted composite
  const overall = Math.round(
    atsScore * WEIGHTS.atsKeywordMatch +
    semanticScore * WEIGHTS.semanticSimilarity +
    seniorityScore * WEIGHTS.senioritySignals +
    readabilityScore * WEIGHTS.readability +
    achievementScore * WEIGHTS.achievementQuality
  );

  // Find missing keywords for feedback
  const missingKeywords = findMissingKeywords(resume, job);

  // Generate suggestions
  const suggestions = generateSuggestions({
    atsScore,
    semanticScore,
    seniorityScore,
    readabilityScore,
    achievementScore,
    missingKeywords,
  });

  return {
    overall,
    breakdown: {
      atsKeywordMatch: Math.round(atsScore),
      semanticSimilarity: Math.round(semanticScore),
      senioritySignals: Math.round(seniorityScore),
      readability: Math.round(readabilityScore),
      achievementQuality: Math.round(achievementScore),
    },
    missingKeywords,
    suggestions,
    passesThreshold: overall >= config.scoreThreshold,
  };
}

/**
 * Score achievement quality — do bullets have quantified metrics?
 */
function scoreAchievementQuality(resume: Resume): number {
  const allBullets = resume.experience.flatMap(e => e.bullets);
  if (allBullets.length === 0) return 0;

  // Patterns that indicate quantified achievements
  const metricPatterns = [
    /\d+%/,                          // percentages
    /\$[\d,.]+[KkMmBb]?/,           // dollar amounts
    /\d+[xX]/,                       // multipliers (3x, 10x)
    /\d+\+?\s*(users|customers|engineers|team|requests|events)/i,  // scale
    /reduced|increased|improved|grew|saved|cut|boosted/i,          // impact verbs
    /\d+\s*(ms|seconds|minutes|hours)/i,  // time metrics
  ];

  let bulletsWithMetrics = 0;
  for (const bullet of allBullets) {
    if (metricPatterns.some(p => p.test(bullet))) {
      bulletsWithMetrics++;
    }
  }

  return (bulletsWithMetrics / allBullets.length) * 100;
}

function findMissingKeywords(resume: Resume, job: ParsedJob): string[] {
  const resumeText = [
    resume.summary,
    ...resume.experience.flatMap(e => [...e.bullets, e.title, ...e.tags]),
    ...resume.skills.flatMap(c => c.skills),
    ...resume.projects.flatMap(p => [...p.technologies, ...p.bullets]),
  ].join(' ').toLowerCase();

  return job.keywords.filter(k => !resumeText.includes(k.toLowerCase()));
}

function generateSuggestions(scores: Record<string, any>): string[] {
  const suggestions: string[] = [];

  if (scores.atsScore < 70) {
    suggestions.push(`Add missing keywords: ${scores.missingKeywords.slice(0, 5).join(', ')}`);
  }
  if (scores.seniorityScore < 70) {
    suggestions.push('Use stronger action verbs (Architected, Led, Spearheaded) and add team sizes');
  }
  if (scores.achievementScore < 60) {
    suggestions.push('Quantify more achievements with specific metrics (%, $, team size, scale)');
  }
  if (scores.readabilityScore < 70) {
    suggestions.push('Shorten bullet points to 1-2 lines and ensure consistent formatting');
  }

  return suggestions;
}
