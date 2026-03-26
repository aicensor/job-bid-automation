import type { Resume, ParsedJob } from '@/lib/types';
import { SKILLS_TAXONOMY } from '@/data/skills-taxonomy';

// ============================================================================
// ATS Keyword Scorer — TF-IDF + exact match + synonym matching
// ============================================================================

/**
 * Score keyword match between resume and JD
 * Combines exact matching, synonym matching, and TF-IDF weighting
 */
export async function scoreAtsKeywords(
  resume: Resume,
  job: ParsedJob
): Promise<number> {
  const resumeText = extractAllText(resume).toLowerCase();
  const resumeTokens = tokenize(resumeText);

  // Score required skills (weighted 2x)
  const requiredScore = scoreSkillMatch(
    job.requiredSkills.map(s => s.skill),
    resumeTokens,
    resumeText
  );

  // Score preferred skills (weighted 1x)
  const preferredScore = scoreSkillMatch(
    job.preferredSkills.map(s => s.skill),
    resumeTokens,
    resumeText
  );

  // Score raw keywords
  const keywordScore = scoreKeywordPresence(job.keywords, resumeText);

  // Weighted combination (required skills matter most)
  const combined = (requiredScore * 0.5) + (keywordScore * 0.3) + (preferredScore * 0.2);

  return Math.min(combined, 100);
}

/**
 * Score skill matching with synonym awareness
 */
function scoreSkillMatch(
  skills: string[],
  resumeTokens: Set<string>,
  resumeText: string
): number {
  if (skills.length === 0) return 100;

  let matched = 0;

  for (const skill of skills) {
    const lower = skill.toLowerCase();

    // Exact match
    if (resumeText.includes(lower)) {
      matched++;
      continue;
    }

    // Synonym match via taxonomy
    const synonyms = SKILLS_TAXONOMY[lower] || [];
    if (synonyms.some(syn => resumeText.includes(syn.toLowerCase()))) {
      matched += 0.8; // slightly lower weight for synonym match
      continue;
    }

    // Partial/token match
    if (resumeTokens.has(lower)) {
      matched += 0.5;
    }
  }

  return (matched / skills.length) * 100;
}

/**
 * Score raw keyword presence using TF-IDF-like weighting
 */
function scoreKeywordPresence(keywords: string[], resumeText: string): number {
  if (keywords.length === 0) return 100;

  let weightedHits = 0;
  let totalWeight = 0;

  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    // Longer keywords are more specific and valuable
    const weight = Math.min(lower.split(' ').length, 3);
    totalWeight += weight;

    if (resumeText.includes(lower)) {
      weightedHits += weight;
    }
  }

  return totalWeight > 0 ? (weightedHits / totalWeight) * 100 : 100;
}

function extractAllText(resume: Resume): string {
  return [
    resume.summary,
    ...resume.experience.flatMap(e => [e.title, e.company, ...e.bullets, ...e.tags]),
    ...resume.skills.flatMap(c => [c.category, ...c.skills]),
    ...resume.projects.flatMap(p => [p.name, p.description, ...p.technologies, ...p.bullets]),
    ...resume.education.map(e => `${e.degree} ${e.field} ${e.institution}`),
    ...resume.certifications.map(c => `${c.name} ${c.issuer}`),
  ].join(' ').replace(/\*\*/g, ''); // strip markdown bold markers
}

function tokenize(text: string): Set<string> {
  return new Set(
    text.replace(/[^a-z0-9\s\-\+\#\.]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
  );
}
