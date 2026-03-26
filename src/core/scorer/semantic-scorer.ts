import type { Resume, ParsedJob, PipelineConfig } from '@/lib/types';

// ============================================================================
// Semantic Scorer — Embedding-based cosine similarity
// Uses sentence embeddings for contextual matching beyond exact keywords
// ============================================================================

/**
 * Score semantic similarity between resume and JD using embeddings
 * Falls back to basic text similarity if no embedding API available
 */
export async function scoreSemanticSimilarity(
  resume: Resume,
  job: ParsedJob,
  config: PipelineConfig
): Promise<number> {
  // Try embedding-based scoring first
  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await scoreWithEmbeddings(resume, job);
    } catch (e) {
      console.warn('[semantic-scorer] Embedding API failed, falling back to text similarity');
    }
  }

  // Fallback: basic text similarity (Jaccard)
  return scoreWithJaccard(resume, job);
}

/**
 * Embedding-based semantic similarity using OpenRouter embeddings API
 */
async function scoreWithEmbeddings(
  resume: Resume,
  job: ParsedJob
): Promise<number> {
  const resumeText = buildResumeDocument(resume);
  const jdText = buildJdDocument(job);

  const embeddingModel = process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small';
  const baseURL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  const response = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: embeddingModel,
      input: [resumeText, jdText],
    }),
  });

  if (!response.ok) throw new Error(`Embedding API failed: ${response.statusText}`);

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
  };

  const [resumeEmb, jdEmb] = data.data.map((d: { embedding: number[] }) => d.embedding);
  const similarity = cosineSimilarity(resumeEmb, jdEmb);

  // Normalize to 0-100 scale (similarity typically 0.5-0.95 for relevant docs)
  return Math.min(Math.max((similarity - 0.4) / 0.5 * 100, 0), 100);
}

/**
 * Fallback: Jaccard similarity on word sets
 */
function scoreWithJaccard(resume: Resume, job: ParsedJob): number {
  const resumeWords = new Set(
    buildResumeDocument(resume).toLowerCase().split(/\s+/).filter(w => w.length > 2)
  );
  const jdWords = new Set(
    buildJdDocument(job).toLowerCase().split(/\s+/).filter(w => w.length > 2)
  );

  const intersection = new Set([...resumeWords].filter(w => jdWords.has(w)));
  const union = new Set([...resumeWords, ...jdWords]);

  return (intersection.size / union.size) * 100;
}

function buildResumeDocument(resume: Resume): string {
  return [
    resume.summary,
    ...resume.experience.flatMap(e => [e.title, ...e.bullets]),
    ...resume.skills.flatMap(c => c.skills),
    ...resume.projects.flatMap(p => [p.description, ...p.bullets]),
  ].join(' ');
}

function buildJdDocument(job: ParsedJob): string {
  return [
    job.title,
    ...job.responsibilities,
    ...job.qualifications,
    ...job.requiredSkills.map(s => s.skill),
    ...job.preferredSkills.map(s => s.skill),
    ...job.keywords,
  ].join(' ');
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
