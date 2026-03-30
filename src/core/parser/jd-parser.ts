import { generateObject } from 'ai';
import { withModelFallback } from '@/ai/timeout';
import { parsedJobSchema } from '@/data/schema/job';
import type { ParsedJob, PipelineConfig } from '@/lib/types';
import { readFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Job Description Parser — Extracts structured requirements from JD text
// ============================================================================

const SYSTEM_PROMPT = readFileSync(
  join(process.cwd(), 'src/ai/prompts/parse-jd.md'),
  'utf-8'
);

/**
 * Parse a raw job description into structured requirements
 * Uses LLM to extract skills, keywords, and requirements
 */
export async function parseJobDescription(
  rawJD: string,
  config: PipelineConfig
): Promise<ParsedJob> {
  const { object } = await withModelFallback('parse', 'jd-parser', (model) =>
    generateObject({
      model,
      schema: parsedJobSchema,
      system: SYSTEM_PROMPT,
      prompt: `Parse the following job description:\n\n${rawJD}`,
      temperature: 0.3,
    })
  );

  const parsedJob = {
    id: generateId(),
    ...object,
    rawDescription: rawJD,
    parsedAt: new Date(),
  } as ParsedJob;

  console.log(`[jd-parser] Extracted ${parsedJob.keywords.length} keywords, ${parsedJob.requiredSkills.length} required skills`);
  return parsedJob;
}

/**
 * Extract keywords using simple NLP as fallback (no LLM needed)
 * Used for quick scoring without API calls
 */
export function extractKeywordsLocal(text: string): string[] {
  // Remove common stop words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'we', 'you', 'they', 'our',
    'your', 'their', 'this', 'that', 'these', 'those', 'as', 'if', 'about',
    'up', 'out', 'no', 'not', 'only', 'very', 'just', 'also', 'than',
    'other', 'into', 'over', 'after', 'before', 'between', 'through',
    'during', 'each', 'few', 'more', 'most', 'some', 'such', 'own',
    'same', 'so', 'too', 'all', 'both', 'any', 'every', 'who', 'which',
    'what', 'when', 'where', 'how', 'why', 'able', 'work', 'working',
    'experience', 'including', 'strong', 'ability', 'team', 'role',
    'join', 'looking', 'etc', 'well', 'must', 'need', 'new', 'like',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\+\#\.]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));

  // Also extract multi-word terms (bigrams)
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  // Deduplicate and return
  return [...new Set([...words, ...bigrams])];
}

function generateId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
