import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Resume } from '../lib/types';

// ============================================================================
// Generate HTML resume from tailored JSON — open in browser, print to PDF
// ============================================================================

const args = process.argv.slice(2);
const inputPath = args[0] || findLatestOutput();

console.log(`📄 Loading: ${inputPath}`);
const data = JSON.parse(readFileSync(resolve(process.cwd(), inputPath), 'utf-8'));
const resume: Resume = data.tailoredResume || data;

const html = buildResumeHtml(resume);
const outputPath = inputPath.replace('.json', '.html');
writeFileSync(resolve(process.cwd(), outputPath), html);
console.log(`✅ Generated: ${outputPath}`);
console.log('   Open in browser → Ctrl+P → Save as PDF');

function findLatestOutput(): string {
  const { readdirSync } = require('fs');
  const dir = resolve(process.cwd(), 'data/output');
  const files = (readdirSync(dir) as string[])
    .filter((f: string) => f.endsWith('.json') && f.startsWith('tailored-'))
    .sort()
    .reverse();
  if (files.length === 0) { console.error('No tailored output found'); process.exit(1); }
  return `data/output/${files[0]}`;
}

function buildResumeHtml(resume: Resume): string {
  const sections: Record<string, () => string> = {
    summary: () => resume.summary ? `
      <section>
        <h2>Professional Summary</h2>
        <p>${formatBold(resume.summary)}</p>
      </section>` : '',

    experience: () => resume.experience.length > 0 ? `
      <section>
        <h2>Professional Experience</h2>
        ${resume.experience.map(exp => `
          <div class="experience">
            <div class="job-header">
              <div><strong>${exp.title}</strong> | ${exp.company}</div>
              <div class="dates">${exp.startDate} – ${exp.endDate}</div>
            </div>
            ${exp.location ? `<div class="location">${exp.location}</div>` : ''}
            <ul>
              ${exp.bullets.map(b => `<li>${formatBold(b)}</li>`).join('\n')}
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
              ${proj.bullets.map(b => `<li>${formatBold(b)}</li>`).join('\n')}
            </ul>
          </div>
        `).join('\n')}
      </section>` : '',

    education: () => resume.education.length > 0 ? `
      <section>
        <h2>Education</h2>
        ${resume.education.map(edu => `
          <div class="job-header">
            <div><strong>${edu.degree}${edu.field ? ` in ${edu.field}` : ''}</strong> — ${edu.institution}</div>
            <div class="dates">${edu.graduationDate}</div>
          </div>
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

  const orderedSections = resume.sectionOrder
    .map(s => sections[s]?.() || '')
    .filter(s => s.trim())
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${resume.contact.name} - Resume</title>
  <style>
    @page {
      size: Letter;
      margin: 0.5in 0.6in;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Calibri', 'Helvetica Neue', Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #1a1a1a;
      max-width: 7.5in;
      margin: 0 auto;
      padding: 0.5in 0.6in;
    }
    h1 {
      font-size: 20pt;
      font-weight: 700;
      text-align: center;
      margin-bottom: 2px;
      color: #000;
    }
    .contact {
      text-align: center;
      font-size: 9.5pt;
      color: #333;
      margin-bottom: 10px;
    }
    .contact a { color: #333; text-decoration: none; }
    .contact .sep { margin: 0 4px; }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1.5px solid #2c3e50;
      padding-bottom: 2px;
      margin-top: 10px;
      margin-bottom: 5px;
      color: #2c3e50;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-top: 6px;
      margin-bottom: 1px;
    }
    .dates { font-style: italic; font-size: 10pt; white-space: nowrap; }
    .location { font-size: 9.5pt; color: #555; margin-bottom: 2px; }
    ul {
      margin: 2px 0 4px 0;
      padding-left: 18px;
    }
    li {
      margin-bottom: 2px;
      font-size: 10pt;
      line-height: 1.3;
    }
    section { margin-bottom: 4px; }
    p { margin: 1px 0; font-size: 10pt; }
    strong { font-weight: 600; }

    @media print {
      body { padding: 0; }
      a { color: #000 !important; }
    }
  </style>
</head>
<body>
  <h1>${resume.contact.name}</h1>
  <div class="contact">
    ${resume.contact.email}<span class="sep">|</span>${resume.contact.phone}<span class="sep">|</span>${resume.contact.location}
    ${resume.contact.linkedin ? `<span class="sep">|</span><a href="https://${resume.contact.linkedin}">${resume.contact.linkedin}</a>` : ''}
    ${resume.contact.github ? `<span class="sep">|</span><a href="https://${resume.contact.github}">${resume.contact.github}</a>` : ''}
    ${resume.contact.website ? `<span class="sep">|</span><a href="${resume.contact.website}">${resume.contact.website}</a>` : ''}
  </div>

  ${orderedSections}
</body>
</html>`;
}

function formatBold(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
