import type { Resume } from '@/lib/types';

// ============================================================================
// Readability Scorer — Structure, formatting, and ATS-parseability checks
// ============================================================================

/**
 * Score resume readability and ATS-parseability
 */
export async function scoreReadability(resume: Resume): Promise<number> {
  let score = 100;
  const penalties: string[] = [];

  // Check 1: Contact info completeness
  if (!resume.contact.email) { score -= 10; penalties.push('Missing email'); }
  if (!resume.contact.phone) { score -= 5; penalties.push('Missing phone'); }
  if (!resume.contact.linkedin) { score -= 1; penalties.push('Missing LinkedIn'); }

  // Check 2: Summary exists and is right length
  if (!resume.summary) {
    score -= 10;
    penalties.push('No summary');
  } else {
    const wordCount = resume.summary.split(/\s+/).length;
    if (wordCount > 100) { score -= 5; penalties.push('Summary too long (>100 words)'); }
    else if (wordCount > 80) { score -= 2; penalties.push('Summary slightly long (>80 words)'); }
    if (wordCount < 15) { score -= 5; penalties.push('Summary too short (<15 words)'); }
  }

  // Check 3: Bullet point quality
  for (const exp of resume.experience) {
    // Too many bullets
    if (exp.bullets.length > 8) {
      score -= 3;
      penalties.push(`${exp.company}: Too many bullets (${exp.bullets.length})`);
    }
    // Too few bullets
    if (exp.bullets.length < 2) {
      score -= 3;
      penalties.push(`${exp.company}: Too few bullets (${exp.bullets.length})`);
    }

    // Check individual bullet length (real ATS allows up to ~40 words per bullet)
    for (const bullet of exp.bullets) {
      const words = bullet.replace(/\*\*/g, '').split(/\s+/).length;
      if (words > 40) {
        score -= 2;
        penalties.push(`Long bullet (${words} words) at ${exp.company}`);
      }
    }
  }

  // Check 4: Has at least some work experience
  if (resume.experience.length === 0) {
    score -= 20;
    penalties.push('No work experience');
  }

  // Check 5: Skills section exists
  if (resume.skills.length === 0) {
    score -= 10;
    penalties.push('No skills section');
  }

  // Check 6: Section order makes sense
  const order = resume.sectionOrder;
  if (order.indexOf('summary') > 0) {
    score -= 5;
    penalties.push('Summary not first section');
  }
  if (order.indexOf('experience') > 2) {
    score -= 5;
    penalties.push('Experience buried too deep');
  }

  // Check 7: No empty sections in the order
  for (const section of order) {
    if (section === 'experience' && resume.experience.length === 0) {
      score -= 3;
      penalties.push('Empty experience section listed');
    }
    if (section === 'projects' && resume.projects.length === 0) {
      score -= 1;
      penalties.push('Empty projects section listed');
    }
  }

  if (penalties.length > 0) {
    console.log(`  → Readability penalties: ${penalties.join(', ')}`);
  }

  return Math.max(score, 0);
}
