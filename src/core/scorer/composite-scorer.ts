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
 * Score achievement quality — do bullets demonstrate concrete impact?
 * Uses a tiered scoring system:
 *   - Hard metrics (numbers, $, %) → full credit (1.0)
 *   - Concrete specifics (named systems, scope, before/after) → partial credit (0.6)
 *   - Generic/vague → no credit (0)
 */
function scoreAchievementQuality(resume: Resume): number {
  const allBullets = resume.experience.flatMap(e => e.bullets);
  if (allBullets.length === 0) return 0;

  // Tier 1: Hard quantified metrics (full credit)
  const hardMetricPatterns = [
    /\d+%/,                          // percentages
    /\$[\d,.]+[KkMmBb]?/,           // dollar amounts
    /\d+[xX]\b/,                     // multipliers (3x, 10x)
    /\d+\+?\s*(users|customers|engineers|team|requests|events|services|regions|markets|departments)/i,
    /\d+\s*(ms|seconds|minutes|hours|days)/i,  // time metrics
    /\d+\s*(rps|rpm|req\/s|tps|qps)/i,         // throughput
  ];

  // Tier 2: Concrete specifics without hard numbers (partial credit)
  const concretePatterns = [
    /reduced|increased|improved|grew|saved|cut|boosted|accelerated|eliminated|streamlined/i, // impact verbs
    /from\s+\S+\s+to\s+\S+/i,       // before/after ("from monolith to microservices")
    /zero[- ]downtime|100%\s*uptime|99\.\d+%/i,  // reliability specifics
    /\b(SOC|HIPAA|GDPR|PCI|WCAG|ISO)\b/i,        // compliance standards
    /\b(team of|across|company-wide|org-wide|platform|enterprise)\b/i, // scope indicators
    /\b(migration|rewrite|redesign|launch|shipped|deployed to production)\b/i, // delivery specifics
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:'s)?\s+(?:API|SDK|platform|service|system|pipeline|dashboard)\b/, // named systems
  ];

  let totalScore = 0;
  for (const bullet of allBullets) {
    if (hardMetricPatterns.some(p => p.test(bullet))) {
      totalScore += 1.0;
    } else if (concretePatterns.some(p => p.test(bullet))) {
      totalScore += 0.6;
    }
  }

  return Math.min((totalScore / allBullets.length) * 100, 100);
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
