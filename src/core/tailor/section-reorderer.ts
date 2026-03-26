import type { Resume, ParsedJob } from '@/lib/types';

// ============================================================================
// Section Reorderer — Promotes most relevant sections to the top
// ============================================================================

/**
 * Reorder resume sections based on what the JD emphasizes most
 * ATS and recruiters scan top-down — most relevant content must be first
 */
export function reorderSections(resume: Resume, job: ParsedJob): Resume {
  const scores = scoreSectionRelevance(resume, job);

  // Always keep summary first, then sort by relevance
  const orderedSections = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([section]) => section);

  // Summary always first
  const withSummary = [
    'summary',
    ...orderedSections.filter(s => s !== 'summary'),
  ];

  console.log(`  → Section order: ${withSummary.join(' → ')}`);

  return {
    ...resume,
    sectionOrder: withSummary,
  };
}

/**
 * Score each section's relevance to the JD
 */
function scoreSectionRelevance(
  resume: Resume,
  job: ParsedJob
): Record<string, number> {
  const jdKeywords = new Set(job.keywords.map(k => k.toLowerCase()));
  const scores: Record<string, number> = {};

  // Score experience section
  const expText = resume.experience
    .flatMap(e => [...e.bullets, e.title, ...e.tags])
    .join(' ')
    .toLowerCase();
  scores['experience'] = countKeywordHits(expText, jdKeywords);

  // Score skills section
  const skillsText = resume.skills
    .flatMap(c => c.skills)
    .join(' ')
    .toLowerCase();
  scores['skills'] = countKeywordHits(skillsText, jdKeywords);

  // Score projects section
  const projText = resume.projects
    .flatMap(p => [...p.bullets, ...p.technologies, p.description])
    .join(' ')
    .toLowerCase();
  scores['projects'] = countKeywordHits(projText, jdKeywords);

  // Education — boost if JD mentions specific degrees/certs
  const eduText = resume.education
    .map(e => `${e.degree} ${e.field} ${e.institution}`)
    .join(' ')
    .toLowerCase();
  scores['education'] = countKeywordHits(eduText, jdKeywords);

  // Certifications — boost if JD requires specific certs
  const certText = resume.certifications
    .map(c => `${c.name} ${c.issuer}`)
    .join(' ')
    .toLowerCase();
  scores['certifications'] = countKeywordHits(certText, jdKeywords);

  return scores;
}

function countKeywordHits(text: string, keywords: Set<string>): number {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) hits++;
  }
  return hits;
}
