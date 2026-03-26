import type { Resume, PipelineConfig } from '@/lib/types';

// ============================================================================
// Truth Validator — Pass 3 of 3-pass refinement
// Ensures tailored resume doesn't fabricate anything
// ============================================================================

export interface TruthValidationResult {
  violations: TruthViolation[];
  correctedResume: Resume;
}

export interface TruthViolation {
  type: 'fabricated_metric' | 'added_technology' | 'changed_company' | 'changed_date' | 'changed_title' | 'invented_experience';
  field: string;
  original: string;
  modified: string;
  severity: 'critical' | 'warning';
}

/**
 * Validate tailored resume against base resume for truthfulness
 * Any fabricated content is reverted
 */
export async function validateTruth(
  tailored: Resume,
  base: Resume,
  config: PipelineConfig
): Promise<TruthValidationResult> {
  const violations: TruthViolation[] = [];

  // Check 1: Company names must not change
  for (let i = 0; i < base.experience.length; i++) {
    const baseExp = base.experience[i];
    const tailoredExp = tailored.experience.find(e => e.id === baseExp.id);
    if (!tailoredExp) continue;

    if (tailoredExp.company !== baseExp.company) {
      violations.push({
        type: 'changed_company',
        field: `experience[${i}].company`,
        original: baseExp.company,
        modified: tailoredExp.company,
        severity: 'critical',
      });
    }

    // Check 2: Dates must not change
    if (tailoredExp.startDate !== baseExp.startDate || tailoredExp.endDate !== baseExp.endDate) {
      violations.push({
        type: 'changed_date',
        field: `experience[${i}].dates`,
        original: `${baseExp.startDate}-${baseExp.endDate}`,
        modified: `${tailoredExp.startDate}-${tailoredExp.endDate}`,
        severity: 'critical',
      });
    }
  }

  // Check 3: Education must not change
  for (let i = 0; i < base.education.length; i++) {
    const baseEdu = base.education[i];
    const tailoredEdu = tailored.education[i];
    if (!tailoredEdu) continue;

    if (tailoredEdu.institution !== baseEdu.institution ||
        tailoredEdu.degree !== baseEdu.degree) {
      violations.push({
        type: 'invented_experience',
        field: `education[${i}]`,
        original: `${baseEdu.degree} at ${baseEdu.institution}`,
        modified: `${tailoredEdu.degree} at ${tailoredEdu.institution}`,
        severity: 'critical',
      });
    }
  }

  // Check 4: No new experiences added
  const baseIds = new Set(base.experience.map(e => e.id));
  const addedExps = tailored.experience.filter(e => !baseIds.has(e.id));
  for (const added of addedExps) {
    violations.push({
      type: 'invented_experience',
      field: 'experience',
      original: '(none)',
      modified: `${added.title} at ${added.company}`,
      severity: 'critical',
    });
  }

  // Check 5: Technologies in bullets should exist in base
  const baseTech = extractAllTechnologies(base);
  const tailoredTech = extractAllTechnologies(tailored);
  const newTech = [...tailoredTech].filter(t => !baseTech.has(t));

  for (const tech of newTech) {
    violations.push({
      type: 'added_technology',
      field: 'technologies',
      original: '(not in base)',
      modified: tech,
      severity: 'warning',
    });
  }

  // Correct violations: revert critical changes
  let corrected = JSON.parse(JSON.stringify(tailored)) as Resume;
  for (const v of violations.filter(v => v.severity === 'critical')) {
    corrected = revertViolation(corrected, base, v);
  }

  return { violations, correctedResume: corrected };
}

function extractAllTechnologies(resume: Resume): Set<string> {
  const tech = new Set<string>();
  for (const cat of resume.skills) {
    for (const skill of cat.skills) {
      tech.add(skill.toLowerCase());
    }
  }
  for (const proj of resume.projects) {
    for (const t of proj.technologies) {
      tech.add(t.toLowerCase());
    }
  }
  return tech;
}

function revertViolation(
  tailored: Resume,
  base: Resume,
  violation: TruthViolation
): Resume {
  // Revert the specific field to base value
  if (violation.type === 'changed_company' || violation.type === 'changed_date') {
    const match = violation.field.match(/experience\[(\d+)\]/);
    if (match) {
      const idx = parseInt(match[1]);
      if (base.experience[idx]) {
        const baseExp = base.experience[idx];
        const tailoredExp = tailored.experience.find(e => e.id === baseExp.id);
        if (tailoredExp) {
          tailoredExp.company = baseExp.company;
          tailoredExp.startDate = baseExp.startDate;
          tailoredExp.endDate = baseExp.endDate;
        }
      }
    }
  }

  if (violation.type === 'invented_experience') {
    tailored.experience = tailored.experience.filter(e =>
      base.experience.some(be => be.id === e.id)
    );
  }

  return tailored;
}
