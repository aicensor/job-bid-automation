import type { Resume, ParsedJob, Achievement } from '@/lib/types';

// ============================================================================
// Gap Analyzer — Maps resume to JD requirements, identifies what's missing
// ============================================================================

export interface GapAnalysis {
  matchedSkills: SkillMatch[];
  missingSkills: string[];
  relevantAchievements: Achievement[];
  suggestedReorder: string[];         // sections to promote
  seniorityGap: 'none' | 'minor' | 'major';
}

export interface SkillMatch {
  jdSkill: string;
  resumeSkill: string | null;       // null if not found
  matchType: 'exact' | 'synonym' | 'partial' | 'missing';
  location: string;                   // where in resume it was found
}

/**
 * Analyze gaps between resume and job requirements
 */
export async function analyzeGaps(
  resume: Resume,
  job: ParsedJob,
  achievements: Achievement[]
): Promise<GapAnalysis> {
  // Extract all skills from resume
  const resumeSkills = extractResumeSkills(resume);

  // Match JD skills against resume
  const matchedSkills = matchSkills(job, resumeSkills);
  const missingSkills = matchedSkills
    .filter(m => m.matchType === 'missing')
    .map(m => m.jdSkill);

  // Find achievements that could fill gaps
  const relevantAchievements = findRelevantAchievements(
    achievements,
    job.keywords,
    missingSkills
  );

  // Check seniority alignment
  const seniorityGap = assessSeniorityGap(resume, job);

  return {
    matchedSkills,
    missingSkills,
    relevantAchievements,
    suggestedReorder: suggestReorder(resume, job),
    seniorityGap,
  };
}

/**
 * Extract all skills mentioned anywhere in the resume
 */
function extractResumeSkills(resume: Resume): Set<string> {
  const skills = new Set<string>();

  // From skills section
  for (const category of resume.skills) {
    for (const skill of category.skills) {
      skills.add(skill.toLowerCase());
    }
  }

  // From experience bullets
  for (const exp of resume.experience) {
    for (const bullet of exp.bullets) {
      // Simple extraction — will be enhanced with NLP later
      const words = bullet.toLowerCase().split(/\s+/);
      words.forEach(w => skills.add(w));
    }
    for (const tag of exp.tags) {
      skills.add(tag.toLowerCase());
    }
  }

  // From projects
  for (const proj of resume.projects) {
    for (const tech of proj.technologies) {
      skills.add(tech.toLowerCase());
    }
  }

  return skills;
}

/**
 * Match JD skills against resume skills (with synonym awareness)
 */
function matchSkills(job: ParsedJob, resumeSkills: Set<string>): SkillMatch[] {
  const allJdSkills = [
    ...job.requiredSkills.map(s => s.skill),
    ...job.preferredSkills.map(s => s.skill),
  ];

  return allJdSkills.map(jdSkill => {
    const lower = jdSkill.toLowerCase();

    if (resumeSkills.has(lower)) {
      return { jdSkill, resumeSkill: jdSkill, matchType: 'exact' as const, location: 'direct' };
    }

    // Check synonyms (imported from skills taxonomy)
    // TODO: integrate skills-taxonomy.ts
    const synonym = findSynonym(lower, resumeSkills);
    if (synonym) {
      return { jdSkill, resumeSkill: synonym, matchType: 'synonym' as const, location: 'synonym' };
    }

    // Partial match (substring)
    for (const skill of resumeSkills) {
      if (skill.includes(lower) || lower.includes(skill)) {
        return { jdSkill, resumeSkill: skill, matchType: 'partial' as const, location: 'partial' };
      }
    }

    return { jdSkill, resumeSkill: null, matchType: 'missing' as const, location: 'none' };
  });
}

/**
 * Find achievements that match job requirements
 */
function findRelevantAchievements(
  achievements: Achievement[],
  jdKeywords: string[],
  missingSkills: string[]
): Achievement[] {
  const keywordSet = new Set(jdKeywords.map(k => k.toLowerCase()));
  const missingSet = new Set(missingSkills.map(s => s.toLowerCase()));

  return achievements
    .map(achievement => {
      const tagSet = new Set(achievement.tags.map(t => t.toLowerCase()));
      const keywordOverlap = [...tagSet].filter(t => keywordSet.has(t)).length;
      const fillsGap = [...tagSet].filter(t => missingSet.has(t)).length;
      const score = keywordOverlap * 2 + fillsGap * 3; // gap-filling weighted higher
      return { achievement, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ achievement }) => achievement);
}

function findSynonym(skill: string, resumeSkills: Set<string>): string | null {
  // TODO: Use skills-taxonomy.ts for comprehensive synonym matching
  return null;
}

function assessSeniorityGap(resume: Resume, job: ParsedJob): 'none' | 'minor' | 'major' {
  // TODO: Analyze action verbs, team sizes, scope indicators
  return 'none';
}

function suggestReorder(resume: Resume, job: ParsedJob): string[] {
  // TODO: Based on JD emphasis, suggest which sections to move up
  return resume.sectionOrder;
}
