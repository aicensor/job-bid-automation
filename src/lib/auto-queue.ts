import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { searchJobsBatch, batchCheckApplyTypes, getJobDetail, type JobSearchParams } from '@/core/scraper/linkedin-scraper';
import { resolveExternalLink } from '@/core/scraper/external-link-resolver';
import { loadQueue, addToQueue, type QueuedJob } from './queue';

// ============================================================================
// Auto-Queue — Automatically find matching jobs and add to queue
// ============================================================================

const CONFIG_PATH = path.join(process.cwd(), 'data', 'auto-queue-config.yaml');

export interface AutoQueueConfig {
  enabled: boolean;
  search: {
    keywords: string;
    location: string;
    workType: string;
    experienceLevel: string;
    datePosted: string;
    salary: string;
    externalOnly: boolean;
  };
  filter: {
    maxJobsPerRun: number;
    minKeywordMatchPercent: number;
    excludeCompanies: string[];
    excludeTitlePatterns: string[];
    requireTitlePatterns: string[];
  };
  autoRun: {
    enabled: boolean;
    maxConcurrent: number;
  };
}

export interface AutoQueueResult {
  searched: number;
  filtered: number;
  added: number;
  skipped: number;
  skippedReasons: Array<{ title: string; company: string; reason: string }>;
  jobs: QueuedJob[];
}

// --- Config Management ---

export function loadAutoQueueConfig(): AutoQueueConfig {
  const defaults: AutoQueueConfig = {
    enabled: true,
    search: {
      keywords: 'senior software engineer',
      location: 'United States',
      workType: 'remote',
      experienceLevel: 'mid-senior',
      datePosted: '24hr',
      salary: '',
      externalOnly: true,
    },
    filter: {
      maxJobsPerRun: 10,
      minKeywordMatchPercent: 30,
      excludeCompanies: [],
      excludeTitlePatterns: [],
      requireTitlePatterns: ['senior', 'staff', 'lead', 'principal'],
    },
    autoRun: { enabled: false, maxConcurrent: 1 },
  };

  try {
    if (!fs.existsSync(CONFIG_PATH)) return defaults;
    const data = yaml.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    return {
      enabled: data.enabled ?? defaults.enabled,
      search: { ...defaults.search, ...data.search },
      filter: { ...defaults.filter, ...data.filter },
      autoRun: { ...defaults.autoRun, ...data.autoRun },
    };
  } catch {
    return defaults;
  }
}

export function saveAutoQueueConfig(config: AutoQueueConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, yaml.stringify(config));
}

// --- Resume Skills for Quick Matching ---

// --- Load Base Resume as Full Text ---

function loadBaseResumeText(): string {
  try {
    // Try from most recent tailored result first (already parsed)
    const outputDir = path.join(process.cwd(), 'data', 'output');
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('tailored-') && f.endsWith('.json'))
      .sort().reverse();

    if (files.length > 0) {
      const data = JSON.parse(fs.readFileSync(path.join(outputDir, files[0]), 'utf-8'));
      const resume = data.tailoredResume;
      if (resume) {
        const parts: string[] = [];
        parts.push(resume.summary || '');
        for (const exp of resume.experience || []) {
          parts.push(`${exp.title} ${exp.company}`);
          parts.push(...(exp.bullets || []));
        }
        for (const cat of resume.skills || []) {
          parts.push(`${cat.category}: ${(cat.skills || []).join(' ')}`);
        }
        for (const proj of resume.projects || []) {
          parts.push(`${proj.name} ${proj.description}`);
          parts.push(...(proj.bullets || []));
        }
        for (const edu of resume.education || []) {
          parts.push(`${edu.degree} ${edu.field} ${edu.institution}`);
        }
        const text = parts.join(' ').replace(/\*\*/g, '');
        if (text.length > 100) return text;
      }
    }

    // Fallback: achievement bank
    const achPath = path.join(process.cwd(), 'data', 'achievement-bank.yaml');
    if (fs.existsSync(achPath)) {
      const data = yaml.parse(fs.readFileSync(achPath, 'utf-8'));
      const parts: string[] = [];
      for (const a of data?.achievements || []) {
        parts.push(`${a.context} ${a.action} ${a.result} ${(a.tags || []).join(' ')}`);
      }
      return parts.join(' ');
    }

    return '';
  } catch {
    return '';
  }
}

// --- LLM-Based Job Matching ---
// Uses NVIDIA NIM (free) to score job match with full context understanding

async function llmMatchScore(
  resumeText: string,
  jdTitle: string,
  jdDescription: string,
  log: (msg: string) => void,
): Promise<{ score: number; reason: string }> {
  try {
    const { generateText } = await import('ai');
    const { getModel, defaultConfig } = await import('@/ai/providers');
    const { model } = getModel('analyze', defaultConfig);

    // Trim inputs to keep tokens low
    const resumeShort = resumeText.substring(0, 2000);
    const jdShort = jdDescription.substring(0, 1500);

    const { text } = await generateText({
      model,
      prompt: `Score how well this candidate matches this job. Consider: tech stack overlap, seniority fit, project type alignment, and domain relevance.

CANDIDATE RESUME:
${resumeShort}

JOB: ${jdTitle}
${jdShort}

Reply ONLY with JSON: {"score": <0-100>, "reason": "<one sentence>"}
- 80-100: Strong stack match + seniority fit
- 50-79: Partial overlap, transferable skills
- 20-49: Weak match, different primary stack
- 0-19: Completely different role/stack`,
      maxTokens: 100,
      temperature: 0.1,
    });

    // Parse response — handle LLM wrapping in code blocks
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const match = cleaned.match(/\{[^}]*"score"\s*:\s*(\d+)[^}]*"reason"\s*:\s*"([^"]*)"[^}]*\}/);
    if (match) {
      return { score: parseInt(match[1]), reason: match[2] };
    }

    // Fallback: try to find just a number
    const numMatch = cleaned.match(/(\d+)/);
    if (numMatch) {
      return { score: parseInt(numMatch[1]), reason: 'Score parsed from response' };
    }

    log(`[auto-queue] LLM response unparseable: ${text.substring(0, 100)}`);
    return { score: 50, reason: 'Could not parse LLM response' };

  } catch (err) {
    log(`[auto-queue] LLM match error: ${err instanceof Error ? err.message : String(err)}`);
    return { score: 50, reason: 'LLM scoring failed, using default' };
  }
}

// --- History Dedup ---

function getHistoryJobIds(): Set<string> {
  const ids = new Set<string>();
  try {
    const outputDir = path.join(process.cwd(), 'data', 'output');
    if (!fs.existsSync(outputDir)) return ids;

    for (const file of fs.readdirSync(outputDir).filter(f => f.endsWith('.json'))) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(outputDir, file), 'utf-8'));
        if (data.jobInfo?.jobId) ids.add(data.jobInfo.jobId);
      } catch { /* skip corrupt files */ }
    }
  } catch { /* ignore */ }
  return ids;
}

// --- Main Auto-Queue Function ---

export async function runAutoQueue(
  config?: AutoQueueConfig,
  onProgress?: (msg: string) => void
): Promise<AutoQueueResult> {
  const cfg = config || loadAutoQueueConfig();
  const log = onProgress || console.log;

  const result: AutoQueueResult = {
    searched: 0, filtered: 0, added: 0, skipped: 0,
    skippedReasons: [], jobs: [],
  };

  // 1. Build search params
  const searchParams: JobSearchParams = {
    keywords: cfg.search.keywords,
    location: cfg.search.location,
    datePosted: cfg.search.datePosted as any,
  };
  if (cfg.search.workType) searchParams.workType = cfg.search.workType as any;
  if (cfg.search.experienceLevel) searchParams.experienceLevel = [cfg.search.experienceLevel as any];
  if (cfg.search.salary) searchParams.salary = cfg.search.salary;

  // 2. Search LinkedIn
  log(`[auto-queue] Searching: "${cfg.search.keywords}" in ${cfg.search.location}`);
  const fetchPages = Math.ceil((cfg.filter.maxJobsPerRun * 3) / 10); // Fetch 3x to account for filtering
  const allJobs = await searchJobsBatch(searchParams, fetchPages);
  result.searched = allJobs.length;
  log(`[auto-queue] Found ${allJobs.length} jobs`);

  if (allJobs.length === 0) return result;

  // 3. Filter by external only (if enabled)
  let candidates = allJobs;
  if (cfg.search.externalOnly) {
    log(`[auto-queue] Checking apply types...`);
    const applyTypes = await batchCheckApplyTypes(candidates.map(j => j.jobId));
    candidates = candidates.filter(j => applyTypes.get(j.jobId) === 'external');
    log(`[auto-queue] ${candidates.length}/${allJobs.length} are external`);
  }

  // 4. Dedup against queue and history (by jobId AND by company+title)
  const queue = loadQueue();
  const queueJobIds = new Set(queue.map(j => j.jobId));
  const queueCompanyTitles = new Set(queue.map(j => `${j.company.toLowerCase()}::${j.title.toLowerCase()}`));
  const historyJobIds = getHistoryJobIds();

  // Also track company+title within this batch to avoid adding duplicates from same run
  const seenCompanyTitles = new Set<string>();

  candidates = candidates.filter(j => {
    const companyTitle = `${j.company.toLowerCase()}::${j.title.toLowerCase()}`;

    if (queueJobIds.has(j.jobId)) {
      result.skipped++;
      result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Already in queue (same job ID)' });
      return false;
    }
    if (historyJobIds.has(j.jobId)) {
      result.skipped++;
      result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Already processed' });
      return false;
    }
    if (queueCompanyTitles.has(companyTitle)) {
      result.skipped++;
      result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Same company+title already in queue' });
      return false;
    }
    if (seenCompanyTitles.has(companyTitle)) {
      result.skipped++;
      result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Duplicate company+title in this batch' });
      return false;
    }
    seenCompanyTitles.add(companyTitle);
    return true;
  });

  log(`[auto-queue] ${candidates.length} after dedup (${result.skipped} skipped)`);

  // 5. Filter by title patterns
  if (cfg.filter.requireTitlePatterns.length > 0) {
    candidates = candidates.filter(j => {
      const titleLower = j.title.toLowerCase();
      const matches = cfg.filter.requireTitlePatterns.some(p => titleLower.includes(p.toLowerCase()));
      if (!matches) {
        result.skipped++;
        result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Title pattern mismatch' });
      }
      return matches;
    });
  }

  if (cfg.filter.excludeCompanies.length > 0) {
    candidates = candidates.filter(j => {
      const excluded = cfg.filter.excludeCompanies.some(c => j.company.toLowerCase().includes(c.toLowerCase()));
      if (excluded) {
        result.skipped++;
        result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Excluded company' });
      }
      return !excluded;
    });
  }

  if (cfg.filter.excludeTitlePatterns.length > 0) {
    candidates = candidates.filter(j => {
      const titleLower = j.title.toLowerCase();
      const excluded = cfg.filter.excludeTitlePatterns.some(p => titleLower.includes(p.toLowerCase()));
      if (excluded) {
        result.skipped++;
        result.skippedReasons.push({ title: j.title, company: j.company, reason: 'Excluded title pattern' });
      }
      return !excluded;
    });
  }

  // 6. Fetch details and score against resume (LLM-based matching via NVIDIA NIM)
  const resumeText = loadBaseResumeText();
  log(`[auto-queue] Loaded resume text (${resumeText.length} chars) for LLM matching`);

  const toQueue: Array<{ title: string; company: string; location: string; jobId: string; jobUrl: string; applyUrl?: string; description: string; matchScore: number }> = [];

  // Fetch details and score each
  const maxFetch = Math.min(candidates.length, cfg.filter.maxJobsPerRun * 2);
  for (let i = 0; i < maxFetch; i++) {
    const job = candidates[i];

    try {
      log(`[auto-queue] Fetching detail ${i + 1}/${maxFetch}: ${job.title} @ ${job.company}`);
      const detail = await getJobDetail(job.jobId);

      // LLM-based matching (NVIDIA NIM — free)
      const match = await llmMatchScore(resumeText, detail.title || job.title, detail.description, log);
      log(`[auto-queue]   → Match: ${match.score}% — ${match.reason} (${job.title} @ ${job.company})`);

      if (match.score < cfg.filter.minKeywordMatchPercent) {
        result.skipped++;
        result.skippedReasons.push({ title: job.title, company: job.company, reason: match.reason || `Low match: ${match.score}%` });
        continue;
      }

      // Resolve external link
      let applyUrl = detail.applyUrl;
      if (detail.applyType === 'external' && (!applyUrl || applyUrl.includes('linkedin.com'))) {
        const resolved = await resolveExternalLink(detail.company, detail.title, job.jobId, detail.companyUrl);
        applyUrl = resolved.applyUrl || undefined;
      }

      toQueue.push({
        title: detail.title || job.title,
        company: detail.company || job.company,
        location: detail.location || job.location,
        jobId: job.jobId,
        jobUrl: job.jobUrl,
        applyUrl,
        description: detail.description,
        matchScore: match.score,
      });

      if (toQueue.length >= cfg.filter.maxJobsPerRun) break;

    } catch (err) {
      log(`[auto-queue] Error fetching ${job.jobId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  result.filtered = toQueue.length;

  // 7. Sort by match score (highest first) and add to queue
  toQueue.sort((a, b) => b.matchScore - a.matchScore);

  for (const job of toQueue.slice(0, cfg.filter.maxJobsPerRun)) {
    try {
      const queued = addToQueue({
        jobId: job.jobId,
        title: job.title,
        company: job.company,
        location: job.location,
        jobUrl: job.jobUrl,
        applyUrl: job.applyUrl,
        description: job.description,
      });
      result.added++;
      result.jobs.push(queued);
      log(`[auto-queue] ✅ Added: ${job.title} @ ${job.company} (match: ${job.matchScore}%)`);
    } catch (err) {
      result.skipped++;
      result.skippedReasons.push({ title: job.title, company: job.company, reason: err instanceof Error ? err.message : 'Add failed' });
    }
  }

  log(`[auto-queue] Done: searched=${result.searched}, added=${result.added}, skipped=${result.skipped}`);
  return result;
}
