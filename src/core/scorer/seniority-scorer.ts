import type { Resume, ParsedJob } from '@/lib/types';

// ============================================================================
// Seniority Scorer — Detects leadership, impact, and scope signals
// ============================================================================

// Senior-level action verbs (weighted by seniority signal strength)
const SENIOR_VERBS: Record<string, number> = {
  'architected': 10, 'designed': 8, 'led': 9, 'spearheaded': 9,
  'mentored': 8, 'established': 8, 'drove': 7, 'championed': 8,
  'pioneered': 9, 'orchestrated': 8, 'defined': 7, 'owned': 8,
  'scaled': 8, 'optimized': 7, 'transformed': 8, 'modernized': 7,
  'directed': 7, 'governed': 7, 'influenced': 7, 'negotiated': 6,
  // Common strong verbs that real ATS systems also recognize
  'built': 7, 'implemented': 6, 'developed': 6, 'created': 6,
  'deployed': 6, 'automated': 7, 'refactored': 6, 'migrated': 7,
  'reduced': 7, 'improved': 6, 'delivered': 6, 'launched': 7,
  'integrated': 6, 'streamlined': 7, 'engineered': 8, 'constructed': 6,
  'introduced': 7, 'boosted': 6, 'enhanced': 6, 'accelerated': 7,
};

// Weak verbs that signal junior level
const WEAK_VERBS = new Set([
  'helped', 'assisted', 'participated', 'worked on',
  'was responsible for', 'supported', 'contributed to',
  'involved in', 'tasked with', 'handled',
]);

/**
 * Score seniority signals in the resume
 */
export async function scoreSenioritySignals(
  resume: Resume,
  job: ParsedJob
): Promise<number> {
  const allBullets = resume.experience.flatMap(e => e.bullets);
  if (allBullets.length === 0) return 0;

  let totalScore = 0;
  let maxPossible = 0;

  for (const bullet of allBullets) {
    // Strip markdown bold markers for analysis
    const clean = bullet.replace(/\*\*/g, '');
    const lower = clean.toLowerCase();
    maxPossible += 10;

    // Check for senior verbs — match at start of bullet or after markdown
    let verbScore = 0;
    for (const [verb, weight] of Object.entries(SENIOR_VERBS)) {
      if (lower.startsWith(verb) || lower.includes(` ${verb} `) || lower.includes(` ${verb}ed `) || lower.includes(` ${verb}ing `)) {
        verbScore = Math.max(verbScore, weight);
      }
    }

    // Penalty for weak verbs (only if no strong verb found)
    if (verbScore === 0) {
      for (const weak of WEAK_VERBS) {
        if (lower.startsWith(weak) || lower.includes(weak)) {
          verbScore = -2;
          break;
        }
      }
    }

    // Bonus for quantified metrics (real ATS systems love these)
    if (/\d+%/.test(clean)) verbScore += 2;          // percentages
    if (/\$[\d,.]+/.test(clean)) verbScore += 2;      // dollar amounts
    if (/\d+[xX]\s/.test(clean)) verbScore += 2;      // multipliers
    if (/\d+K?\+?\s*(users|customers|requests|transactions)/i.test(clean)) verbScore += 2; // scale

    // Bonus for scope indicators
    if (/\d+\s*(engineer|developer|member|person|people|team)/i.test(clean)) {
      verbScore += 2; // team size mentioned
    }
    if (/cross-functional|cross functional|stakeholder|cross-team/i.test(clean)) {
      verbScore += 1; // cross-team collaboration
    }
    if (/company-wide|org-wide|platform|infrastructure|organization/i.test(clean)) {
      verbScore += 1; // broad scope
    }

    totalScore += Math.min(Math.max(verbScore, 0), 10);
  }

  // Check seniority alignment with JD
  const seniorityMultiplier = getSeniorityMultiplier(resume, job);

  return Math.min((totalScore / maxPossible) * 100 * seniorityMultiplier, 100);
}

/**
 * Multiplier based on how well resume seniority matches JD level
 */
function getSeniorityMultiplier(resume: Resume, job: ParsedJob): number {
  // Check if titles suggest matching seniority
  const titles = resume.experience.map(e => e.title.toLowerCase());
  const targetLevel = job.seniorityLevel;

  const seniorityKeywords: Record<string, string[]> = {
    senior: ['senior', 'sr.', 'sr ', 'lead'],
    staff: ['staff', 'principal', 'architect'],
    principal: ['principal', 'distinguished', 'fellow'],
    director: ['director', 'vp', 'head of'],
  };

  const targetKeywords = seniorityKeywords[targetLevel] || [];
  const hasMatch = titles.some(t =>
    targetKeywords.some(k => t.includes(k))
  );

  return hasMatch ? 1.0 : 0.85; // slight penalty if titles don't match
}
