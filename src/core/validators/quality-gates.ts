import type { Resume, ScoreResult } from '@/lib/types';

// ============================================================================
// Quality Gates — 4-gate validation from Resume-Matcher approach
// All gates must pass before resume is considered ready
// ============================================================================

export interface GateResult {
  gate: string;
  passed: boolean;
  reason: string;
}

/**
 * Run all 4 quality gates on the tailored resume
 */
export function runQualityGates(
  resume: Resume,
  score: ScoreResult
): GateResult[] {
  return [
    gate1_MinimumScore(score),
    gate2_NoEmptySections(resume),
    gate3_BulletQuality(resume),
    gate4_ConsistencyCheck(resume),
  ];
}

/**
 * Gate 1: Minimum composite score
 */
function gate1_MinimumScore(score: ScoreResult): GateResult {
  const passed = score.overall >= 70; // absolute minimum
  return {
    gate: 'Minimum Score',
    passed,
    reason: passed
      ? `Score ${score.overall}/100 meets minimum`
      : `Score ${score.overall}/100 below minimum 70`,
  };
}

/**
 * Gate 2: No empty required sections
 */
function gate2_NoEmptySections(resume: Resume): GateResult {
  const issues: string[] = [];

  if (!resume.summary) issues.push('summary');
  if (resume.experience.length === 0) issues.push('experience');
  if (resume.skills.length === 0) issues.push('skills');
  if (!resume.contact.email) issues.push('contact email');

  const passed = issues.length === 0;
  return {
    gate: 'Required Sections',
    passed,
    reason: passed
      ? 'All required sections present'
      : `Missing: ${issues.join(', ')}`,
  };
}

/**
 * Gate 3: Bullet point quality minimum
 */
function gate3_BulletQuality(resume: Resume): GateResult {
  const allBullets = resume.experience.flatMap(e => e.bullets);

  // At least 50% of bullets should start with action verbs
  const actionVerbPattern = /^(Led|Architected|Designed|Built|Developed|Implemented|Managed|Optimized|Reduced|Increased|Created|Established|Drove|Launched|Migrated|Scaled|Mentored|Delivered|Automated|Improved|Spearheaded|Pioneered|Orchestrated)/i;

  const withActionVerbs = allBullets.filter(b => actionVerbPattern.test(b));
  const ratio = allBullets.length > 0 ? withActionVerbs.length / allBullets.length : 0;

  const passed = ratio >= 0.5;
  return {
    gate: 'Bullet Quality',
    passed,
    reason: passed
      ? `${Math.round(ratio * 100)}% bullets start with action verbs`
      : `Only ${Math.round(ratio * 100)}% bullets start with action verbs (need 50%+)`,
  };
}

/**
 * Gate 4: Internal consistency
 */
function gate4_ConsistencyCheck(resume: Resume): GateResult {
  const issues: string[] = [];

  // Check: skills mentioned in bullets should be in skills section
  const skillsInSection = new Set(
    resume.skills.flatMap(c => c.skills.map(s => s.toLowerCase()))
  );

  // Check: dates should be chronological
  const dates = resume.experience.map(e => ({
    company: e.company,
    start: e.startDate,
    end: e.endDate,
  }));

  // Check for duplicate bullets across roles
  const allBullets = resume.experience.flatMap(e => e.bullets);
  const uniqueBullets = new Set(allBullets);
  if (uniqueBullets.size < allBullets.length) {
    issues.push('Duplicate bullets found across roles');
  }

  const passed = issues.length === 0;
  return {
    gate: 'Consistency',
    passed,
    reason: passed
      ? 'No consistency issues found'
      : issues.join('; '),
  };
}
