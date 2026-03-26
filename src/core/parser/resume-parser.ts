import type { Resume } from '@/lib/types';

// ============================================================================
// Resume Parser — PDF/DOCX/JSON → Structured Resume
// ============================================================================

/**
 * Parse a resume file into structured data
 * Supports: PDF, DOCX, JSON (pre-structured)
 */
export async function parseResume(
  filePath: string
): Promise<Resume> {
  const ext = filePath.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'json':
      return parseJsonResume(filePath);
    case 'pdf':
      return parsePdfResume(filePath);
    case 'docx':
      return parseDocxResume(filePath);
    default:
      throw new Error(`Unsupported resume format: .${ext}. Use PDF, DOCX, or JSON.`);
  }
}

/**
 * JSON resume — already structured, just validate
 */
async function parseJsonResume(filePath: string): Promise<Resume> {
  const { readFileSync } = await import('fs');
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

  // TODO: Validate against resumeSchema
  return {
    ...raw,
    id: raw.id || generateId(),
    isBase: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * PDF resume — extract text then use LLM to structure
 */
async function parsePdfResume(filePath: string): Promise<Resume> {
  const { readFileSync } = await import('fs');
  const pdfParse = (await import('pdf-parse')).default;

  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);
  const text = data.text;

  console.log(`[resume-parser] Extracted ${text.length} chars from PDF`);

  return structureResumeText(text);
}

/**
 * DOCX resume — extract text then use LLM to structure
 */
async function parseDocxResume(filePath: string): Promise<Resume> {
  const { readFileSync } = await import('fs');
  const mammoth = await import('mammoth');

  const buffer = readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value;

  console.log(`[resume-parser] Extracted ${text.length} chars from DOCX`);

  return structureResumeText(text);
}

/**
 * Use LLM to convert raw resume text into structured JSON
 * This is the heavy lifting — understanding resume layout from plain text
 */
async function structureResumeText(text: string): Promise<Resume> {
  const { generateObject } = await import('ai');
  const { getModel, defaultConfig } = await import('@/ai/providers');
  const { resumeSchema } = await import('@/data/schema/resume');

  console.log('[resume-parser] Structuring resume text with LLM...');

  const { model } = getModel('parse', defaultConfig);

  const { object } = await generateObject({
    model,
    schema: resumeSchema,
    system: `You are an expert resume parser. Convert the raw resume text into a structured JSON object.

Rules:
- Extract ALL work experience entries with company, title, dates, location, and bullet points
- Extract ALL skills and group them by category (Languages, Frameworks, Cloud, Databases, Tools, etc.)
- Extract education details including institution, degree, field, graduation date
- Extract certifications if any
- Extract projects if any
- Write a summary if one exists in the resume; if not, leave it as empty string
- For each work experience, create tags from the technologies/skills mentioned in its bullets
- Generate a unique id for each work experience and project entry
- Use "Present" for current role end dates
- Keep bullet points exactly as written — do not rewrite them
- Set isBase to true`,
    prompt: `Parse this resume:\n\n${text}`,
    temperature: 0.2,
  });

  return {
    ...object,
    id: object.id || generateId(),
    isBase: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Resume;
}

function generateId(): string {
  return `resume_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
