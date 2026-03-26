import fs from 'fs';
import path from 'path';

// ============================================================================
// Job Queue — JSON file-based queue for batch resume tailoring
// ============================================================================

const QUEUE_PATH = path.join(process.cwd(), 'data', 'queue.json');

export type QueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface QueuedJob {
  id: string;                    // queue ID (q-timestamp)
  jobId: string;                 // LinkedIn job ID
  title: string;
  company: string;
  location: string;
  jobUrl: string;
  applyUrl?: string;
  description: string;
  status: QueueStatus;
  addedAt: string;               // ISO timestamp
  completedAt: string | null;
  resultId: string | null;       // links to tailored-{id}.json
  score: number | null;
  scoreBefore: number | null;
  error: string | null;
}

interface QueueData {
  jobs: QueuedJob[];
}

function ensureFile(): void {
  const dir = path.dirname(QUEUE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(QUEUE_PATH)) {
    fs.writeFileSync(QUEUE_PATH, JSON.stringify({ jobs: [] }, null, 2));
  }
}

export function loadQueue(): QueuedJob[] {
  ensureFile();
  try {
    const data: QueueData = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf-8'));
    return data.jobs || [];
  } catch {
    return [];
  }
}

export function saveQueue(jobs: QueuedJob[]): void {
  ensureFile();
  fs.writeFileSync(QUEUE_PATH, JSON.stringify({ jobs }, null, 2));
}

export function addToQueue(job: Omit<QueuedJob, 'id' | 'status' | 'addedAt' | 'completedAt' | 'resultId' | 'score' | 'scoreBefore' | 'error'>): QueuedJob {
  const jobs = loadQueue();

  // Dedup: skip if same LinkedIn jobId already in queue
  if (jobs.some(j => j.jobId === job.jobId)) {
    throw new Error(`Job ${job.jobId} is already in the queue`);
  }

  const queuedJob: QueuedJob = {
    ...job,
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    status: 'pending',
    addedAt: new Date().toISOString(),
    completedAt: null,
    resultId: null,
    score: null,
    scoreBefore: null,
    error: null,
  };

  jobs.push(queuedJob);
  saveQueue(jobs);
  return queuedJob;
}

export function removeFromQueue(id: string): boolean {
  const jobs = loadQueue();
  const filtered = jobs.filter(j => j.id !== id);
  if (filtered.length === jobs.length) return false;
  saveQueue(filtered);
  return true;
}

export function updateJobStatus(
  id: string,
  updates: Partial<Pick<QueuedJob, 'status' | 'resultId' | 'score' | 'scoreBefore' | 'completedAt' | 'error'>>
): QueuedJob | null {
  const jobs = loadQueue();
  const job = jobs.find(j => j.id === id);
  if (!job) return null;

  Object.assign(job, updates);
  saveQueue(jobs);
  return job;
}

export function clearCompleted(): number {
  const jobs = loadQueue();
  const pending = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const removed = jobs.length - pending.length;
  saveQueue(pending);
  return removed;
}

export function getPendingJobs(): QueuedJob[] {
  return loadQueue().filter(j => j.status === 'pending');
}

export function getQueueStats(): { total: number; pending: number; processing: number; completed: number; failed: number } {
  const jobs = loadQueue();
  return {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
  };
}
