import type { Resume, TailorPreferences } from '@/lib/types';

// ============================================================================
// Blocked Fields Validator — Ensures protected fields remain unchanged
// ============================================================================

/**
 * Validate that fields the user marked as "never modify" haven't changed
 * Throws if violations found
 */
export function validateBlockedFields(
  base: Resume,
  tailored: Resume,
  preferences: TailorPreferences
): void {
  const violations: string[] = [];

  // Company names are always protected
  if (preferences.neverModify.companyNames) {
    for (const baseExp of base.experience) {
      const match = tailored.experience.find(e => e.id === baseExp.id);
      if (match && match.company !== baseExp.company) {
        violations.push(`Company changed: "${baseExp.company}" → "${match.company}"`);
        match.company = baseExp.company; // auto-fix
      }
    }
  }

  // Dates are always protected
  if (preferences.neverModify.dates) {
    for (const baseExp of base.experience) {
      const match = tailored.experience.find(e => e.id === baseExp.id);
      if (match) {
        if (match.startDate !== baseExp.startDate) {
          violations.push(`Date changed: "${baseExp.startDate}" → "${match.startDate}"`);
          match.startDate = baseExp.startDate;
        }
        if (match.endDate !== baseExp.endDate) {
          violations.push(`Date changed: "${baseExp.endDate}" → "${match.endDate}"`);
          match.endDate = baseExp.endDate;
        }
      }
    }
  }

  // Education
  if (preferences.neverModify.education) {
    for (let i = 0; i < base.education.length; i++) {
      const baseEdu = base.education[i];
      const tailoredEdu = tailored.education[i];
      if (tailoredEdu) {
        if (tailoredEdu.institution !== baseEdu.institution ||
            tailoredEdu.degree !== baseEdu.degree ||
            tailoredEdu.field !== baseEdu.field) {
          violations.push(`Education changed at index ${i}`);
          tailored.education[i] = { ...baseEdu };
        }
      }
    }
  }

  // Certifications
  if (preferences.neverModify.certifications) {
    tailored.certifications = [...base.certifications];
  }

  // Contact info is ALWAYS protected (never in the prompt, but enforce anyway)
  tailored.contact = { ...base.contact };

  if (violations.length > 0) {
    console.warn(`  ⚠️ Blocked field violations (auto-fixed): ${violations.join('; ')}`);
  }
}
