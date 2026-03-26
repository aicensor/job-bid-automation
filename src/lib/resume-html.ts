import type { Resume } from './types';

/** Convert markdown **bold** to <strong> tags */
function md(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>');
}

/**
 * Build a clean, ATS-compatible HTML resume preview.
 * Shared between web preview and PDF generation.
 */
export function buildResumeHtml(resume: Resume): string {
  const { contact, summary, experience, education, skills, projects, certifications } = resume;

  const html = `
    <div style="font-family: 'Georgia', 'Times New Roman', serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; line-height: 1.5; font-size: 14px;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1a1a1a; padding-bottom: 16px;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 1px;">${contact.name}</h1>
        <p style="font-size: 13px; color: #555; margin: 0;">
          ${[contact.email, contact.phone, contact.location].filter(Boolean).join(' | ')}
          ${contact.linkedin ? ` | <a href="${contact.linkedin}" style="color: #2563eb;">${contact.linkedin}</a>` : ''}
          ${contact.github ? ` | <a href="${contact.github}" style="color: #2563eb;">${contact.github}</a>` : ''}
        </p>
      </div>

      <!-- Summary -->
      ${summary ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Professional Summary</h2>
        <p style="margin: 0; font-size: 13px;">${md(summary)}</p>
      </div>` : ''}

      <!-- Experience -->
      ${experience.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 12px;">Professional Experience</h2>
        ${experience.map(exp => `
          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: baseline;">
              <strong style="font-size: 14px;">${exp.title}</strong>
              <span style="font-size: 12px; color: #666;">${exp.startDate} - ${exp.endDate}</span>
            </div>
            <div style="font-size: 13px; color: #555; font-style: italic; margin-bottom: 6px;">${exp.company}${exp.location ? ` | ${exp.location}` : ''}</div>
            <ul style="margin: 0; padding-left: 20px;">
              ${exp.bullets.map(b => `<li style="font-size: 13px; margin-bottom: 3px;">${md(b)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Skills -->
      ${skills.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Technical Skills</h2>
        ${skills.map(s => `
          <p style="font-size: 13px; margin: 0 0 4px 0;"><strong>${s.category}:</strong> ${s.skills.join(', ')}</p>
        `).join('')}
      </div>` : ''}

      <!-- Projects -->
      ${projects && projects.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 12px;">Projects</h2>
        ${projects.map(p => `
          <div style="margin-bottom: 10px;">
            <strong style="font-size: 13px;">${p.name}</strong>
            ${p.technologies.length > 0 ? `<span style="font-size: 12px; color: #666;"> | ${p.technologies.join(', ')}</span>` : ''}
            <ul style="margin: 4px 0 0; padding-left: 20px;">
              ${p.bullets.map(b => `<li style="font-size: 13px; margin-bottom: 2px;">${md(b)}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Education -->
      ${education.length > 0 ? `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Education</h2>
        ${education.map(edu => `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <strong style="font-size: 13px;">${edu.degree} in ${edu.field}</strong>
              <span style="font-size: 12px; color: #666;">${edu.graduationDate}</span>
            </div>
            <div style="font-size: 13px; color: #555;">${edu.institution}${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
          </div>
        `).join('')}
      </div>` : ''}

      <!-- Certifications -->
      ${certifications && certifications.length > 0 ? `
      <div>
        <h2 style="font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px;">Certifications</h2>
        ${certifications.map(c => `
          <p style="font-size: 13px; margin: 0 0 4px 0;">${c.name} - ${c.issuer} (${c.date})</p>
        `).join('')}
      </div>` : ''}
    </div>
  `;

  return html;
}
