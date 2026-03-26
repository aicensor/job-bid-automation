import type { Resume } from '@/lib/types';
import { join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// ============================================================================
// PDF Generator — Creates ATS-compatible PDF resumes
// Uses Puppeteer for reliable, consistent output
// ============================================================================

const OUTPUT_DIR = join(process.cwd(), 'data', 'output');

/**
 * Generate an ATS-friendly PDF from structured resume data
 */
export async function generatePdf(
  resume: Resume,
  filename: string
): Promise<string> {
  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const html = buildResumeHtml(resume);
  const outputPath = join(OUTPUT_DIR, `${filename}.pdf`);

  // Use Puppeteer for PDF generation
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: outputPath,
    format: 'Letter',
    margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' },
    printBackground: false,           // ATS prefers no background
  });

  await browser.close();

  console.log(`[pdf-generator] Saved: ${outputPath}`);
  return outputPath;
}

/**
 * Build ATS-compatible HTML
 * Rules: simple layout, no tables, no columns, standard fonts, no images
 */
/** Convert markdown bold/italic to proper HTML tags */
function md(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')   // **bold** → <strong>
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')        // __bold__ → <strong>
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')                // *italic* → <em>
    .replace(/_([^_]+)_/g, '<em>$1</em>');                 // _italic_ → <em>
}

export function buildResumeHtml(resume: Resume): string {
  const sections: Record<string, () => string> = {
    summary: () => resume.summary ? `
      <section>
        <h2>Professional Summary</h2>
        <p>${md(resume.summary)}</p>
      </section>` : '',

    experience: () => resume.experience.length > 0 ? `
      <section>
        <h2>Professional Experience</h2>
        ${resume.experience.map(exp => `
          <div class="experience">
            <div class="job-header">
              <strong>${exp.title}</strong> | ${exp.company}
              <span class="dates">${exp.startDate} - ${exp.endDate}</span>
            </div>
            <div class="location">${exp.location}</div>
            <ul>
              ${exp.bullets.map(b => `<li>${md(b)}</li>`).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </section>` : '',

    skills: () => resume.skills.length > 0 ? `
      <section>
        <h2>Technical Skills</h2>
        ${resume.skills.map(cat => `
          <p><strong>${cat.category}:</strong> ${cat.skills.join(', ')}</p>
        `).join('\n')}
      </section>` : '',

    projects: () => resume.projects.length > 0 ? `
      <section>
        <h2>Projects</h2>
        ${resume.projects.map(proj => `
          <div class="project">
            <strong>${proj.name}</strong> — ${proj.technologies.join(', ')}
            <ul>
              ${proj.bullets.map(b => `<li>${md(b)}</li>`).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </section>` : '',

    education: () => resume.education.length > 0 ? `
      <section>
        <h2>Education</h2>
        ${resume.education.map(edu => `
          <p><strong>${edu.degree} in ${edu.field}</strong> — ${edu.institution} (${edu.graduationDate})</p>
        `).join('\n')}
      </section>` : '',

    certifications: () => resume.certifications.length > 0 ? `
      <section>
        <h2>Certifications</h2>
        ${resume.certifications.map(cert => `
          <p>${cert.name} — ${cert.issuer} (${cert.date})</p>
        `).join('\n')}
      </section>` : '',
  };

  // Render sections in the order specified by the resume
  const orderedSections = resume.sectionOrder
    .map(s => sections[s]?.() || '')
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    /* ATS-compatible styling — simple, parseable, no columns */
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      max-width: 100%;
    }
    h1 {
      font-size: 18pt;
      margin-bottom: 4px;
      text-align: center;
    }
    .contact {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 12px;
    }
    h2 {
      font-size: 12pt;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 2px;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }
    .dates { font-style: italic; }
    .location { font-size: 10pt; color: #333; }
    ul {
      margin: 4px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 3px;
      font-size: 10.5pt;
    }
    section { margin-bottom: 8px; }
    p { margin: 2px 0; }
  </style>
</head>
<body>
  <h1>${resume.contact.name}</h1>
  <div class="contact">
    ${resume.contact.email} | ${resume.contact.phone} | ${resume.contact.location}
    ${resume.contact.linkedin ? `| ${resume.contact.linkedin}` : ''}
    ${resume.contact.github ? `| ${resume.contact.github}` : ''}
  </div>

  ${orderedSections}
</body>
</html>`;
}
