import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  TabStopPosition,
  TabStopType,
  convertInchesToTwip,
} from 'docx';
import type { Resume } from '@/lib/types';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = join(process.cwd(), 'data', 'output');

// ============================================================================
// DOCX Generator — ATS-optimized Word document with proper bold formatting
// ============================================================================

/**
 * Parse markdown bold (**text**) into TextRun segments
 * "Architected **microservices** using **Node.js**" →
 *   [TextRun("Architected "), TextRun("microservices", bold), TextRun(" using "), TextRun("Node.js", bold)]
 */
function parseMarkdownToRuns(text: string, baseFontSize: number = 21): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the bold
    if (match.index > lastIndex) {
      runs.push(new TextRun({
        text: text.slice(lastIndex, match.index),
        font: 'Calibri',
        size: baseFontSize,
      }));
    }
    // Bold text
    runs.push(new TextRun({
      text: match[1],
      bold: true,
      font: 'Calibri',
      size: baseFontSize,
    }));
    lastIndex = regex.lastIndex;
  }

  // Remaining text after last bold
  if (lastIndex < text.length) {
    runs.push(new TextRun({
      text: text.slice(lastIndex),
      font: 'Calibri',
      size: baseFontSize,
    }));
  }

  // If no markdown found, return the full text as a single run
  if (runs.length === 0) {
    runs.push(new TextRun({
      text,
      font: 'Calibri',
      size: baseFontSize,
    }));
  }

  return runs;
}

/**
 * Build section heading with bottom border
 */
function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: text.toUpperCase(),
      bold: true,
      font: 'Calibri',
      size: 24,  // 12pt
    })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '000000' },
    },
  });
}

/**
 * Build job header: Title | Company ............... Dates
 */
function jobHeader(title: string, company: string, startDate: string, endDate: string): Paragraph {
  return new Paragraph({
    tabStops: [{
      type: TabStopType.RIGHT,
      position: TabStopPosition.MAX,
    }],
    children: [
      new TextRun({ text: title, bold: true, font: 'Calibri', size: 22 }),
      new TextRun({ text: ` | ${company}`, font: 'Calibri', size: 22 }),
      new TextRun({ text: `\t${startDate} – ${endDate}`, italics: true, font: 'Calibri', size: 22 }),
    ],
    spacing: { before: 120, after: 40 },
  });
}

/**
 * Build bullet point with markdown bold conversion
 */
function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: parseMarkdownToRuns(text, 21),  // 10.5pt
    bullet: { level: 0 },
    spacing: { after: 40 },
    indent: { left: convertInchesToTwip(0.25) },
  });
}

/**
 * Generate DOCX from structured resume
 */
export async function generateDocx(resume: Resume, filename: string): Promise<string> {
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const children: Paragraph[] = [];

  // --- Header: Name ---
  children.push(new Paragraph({
    children: [new TextRun({
      text: resume.contact.name,
      bold: true,
      font: 'Calibri',
      size: 36,  // 18pt
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));

  // --- Contact Info ---
  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedin,
    resume.contact.github,
  ].filter(Boolean);

  children.push(new Paragraph({
    children: [new TextRun({
      text: contactParts.join(' | '),
      font: 'Calibri',
      size: 20,  // 10pt
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  }));

  // --- Sections in order ---
  for (const section of resume.sectionOrder) {
    switch (section) {
      case 'summary':
        if (resume.summary) {
          children.push(sectionHeading('Professional Summary'));
          children.push(new Paragraph({
            children: parseMarkdownToRuns(resume.summary, 21),
            spacing: { after: 80 },
          }));
        }
        break;

      case 'experience':
        if (resume.experience.length > 0) {
          children.push(sectionHeading('Professional Experience'));
          for (const exp of resume.experience) {
            children.push(jobHeader(exp.title, exp.company, exp.startDate, exp.endDate));
            if (exp.location) {
              children.push(new Paragraph({
                children: [new TextRun({
                  text: exp.location,
                  font: 'Calibri',
                  size: 20,
                  color: '555555',
                })],
                spacing: { after: 40 },
              }));
            }
            for (const bullet of exp.bullets) {
              children.push(bulletPoint(bullet));
            }
          }
        }
        break;

      case 'skills':
        if (resume.skills.length > 0) {
          children.push(sectionHeading('Technical Skills'));
          for (const cat of resume.skills) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${cat.category}: `, bold: true, font: 'Calibri', size: 21 }),
                new TextRun({ text: cat.skills.join(', '), font: 'Calibri', size: 21 }),
              ],
              spacing: { after: 40 },
            }));
          }
        }
        break;

      case 'projects':
        if (resume.projects.length > 0) {
          children.push(sectionHeading('Projects'));
          for (const proj of resume.projects) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: proj.name, bold: true, font: 'Calibri', size: 22 }),
                new TextRun({ text: ` — ${proj.technologies.join(', ')}`, font: 'Calibri', size: 21 }),
              ],
              spacing: { before: 80, after: 40 },
            }));
            for (const bullet of proj.bullets) {
              children.push(bulletPoint(bullet));
            }
          }
        }
        break;

      case 'education':
        if (resume.education.length > 0) {
          children.push(sectionHeading('Education'));
          for (const edu of resume.education) {
            children.push(new Paragraph({
              children: [
                new TextRun({ text: `${edu.degree} in ${edu.field}`, bold: true, font: 'Calibri', size: 22 }),
                new TextRun({ text: ` — ${edu.institution} (${edu.graduationDate})`, font: 'Calibri', size: 22 }),
              ],
              spacing: { after: 40 },
            }));
          }
        }
        break;

      case 'certifications':
        if (resume.certifications.length > 0) {
          children.push(sectionHeading('Certifications'));
          for (const cert of resume.certifications) {
            children.push(new Paragraph({
              children: [new TextRun({
                text: `${cert.name} — ${cert.issuer} (${cert.date})`,
                font: 'Calibri',
                size: 21,
              })],
              spacing: { after: 40 },
            }));
          }
        }
        break;
    }
  }

  // --- Build document ---
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.5),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.6),
            right: convertInchesToTwip(0.6),
          },
          size: {
            width: convertInchesToTwip(8.5),
            height: convertInchesToTwip(11),
          },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = join(OUTPUT_DIR, `${filename}.docx`);
  writeFileSync(outputPath, buffer);

  console.log(`[docx-generator] Saved: ${outputPath}`);
  return outputPath;
}

/**
 * Generate DOCX buffer (for API response / download)
 */
export async function generateDocxBuffer(resume: Resume): Promise<Buffer> {
  // Same document building as above but returns buffer instead of saving
  const children: Paragraph[] = [];

  // Header
  children.push(new Paragraph({
    children: [new TextRun({ text: resume.contact.name, bold: true, font: 'Calibri', size: 36 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 40 },
  }));

  const contactParts = [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.linkedin, resume.contact.github].filter(Boolean);
  children.push(new Paragraph({
    children: [new TextRun({ text: contactParts.join(' | '), font: 'Calibri', size: 20 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  }));

  for (const section of resume.sectionOrder) {
    switch (section) {
      case 'summary':
        if (resume.summary) {
          children.push(sectionHeading('Professional Summary'));
          children.push(new Paragraph({ children: parseMarkdownToRuns(resume.summary, 21), spacing: { after: 80 } }));
        }
        break;
      case 'experience':
        if (resume.experience.length > 0) {
          children.push(sectionHeading('Professional Experience'));
          for (const exp of resume.experience) {
            children.push(jobHeader(exp.title, exp.company, exp.startDate, exp.endDate));
            if (exp.location) children.push(new Paragraph({ children: [new TextRun({ text: exp.location, font: 'Calibri', size: 20, color: '555555' })], spacing: { after: 40 } }));
            for (const bullet of exp.bullets) children.push(bulletPoint(bullet));
          }
        }
        break;
      case 'skills':
        if (resume.skills.length > 0) {
          children.push(sectionHeading('Technical Skills'));
          for (const cat of resume.skills) {
            children.push(new Paragraph({ children: [new TextRun({ text: `${cat.category}: `, bold: true, font: 'Calibri', size: 21 }), new TextRun({ text: cat.skills.join(', '), font: 'Calibri', size: 21 })], spacing: { after: 40 } }));
          }
        }
        break;
      case 'projects':
        if (resume.projects.length > 0) {
          children.push(sectionHeading('Projects'));
          for (const proj of resume.projects) {
            children.push(new Paragraph({ children: [new TextRun({ text: proj.name, bold: true, font: 'Calibri', size: 22 }), new TextRun({ text: ` — ${proj.technologies.join(', ')}`, font: 'Calibri', size: 21 })], spacing: { before: 80, after: 40 } }));
            for (const bullet of proj.bullets) children.push(bulletPoint(bullet));
          }
        }
        break;
      case 'education':
        if (resume.education.length > 0) {
          children.push(sectionHeading('Education'));
          for (const edu of resume.education) {
            children.push(new Paragraph({ children: [new TextRun({ text: `${edu.degree} in ${edu.field}`, bold: true, font: 'Calibri', size: 22 }), new TextRun({ text: ` — ${edu.institution} (${edu.graduationDate})`, font: 'Calibri', size: 22 })], spacing: { after: 40 } }));
          }
        }
        break;
      case 'certifications':
        if (resume.certifications.length > 0) {
          children.push(sectionHeading('Certifications'));
          for (const cert of resume.certifications) {
            children.push(new Paragraph({ children: [new TextRun({ text: `${cert.name} — ${cert.issuer} (${cert.date})`, font: 'Calibri', size: 21 })], spacing: { after: 40 } }));
          }
        }
        break;
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: convertInchesToTwip(0.5), bottom: convertInchesToTwip(0.5), left: convertInchesToTwip(0.6), right: convertInchesToTwip(0.6) },
          size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
        },
      },
      children,
    }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
