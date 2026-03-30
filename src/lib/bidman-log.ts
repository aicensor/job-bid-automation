import fs from 'fs';
import path from 'path';

// ============================================================================
// Bidman Tailor Log — Local JSON storage
// ============================================================================

export interface TailorLogEntry {
  no: number;
  date: string;                   // MM/DD/YYYY
  jobTitle: string;
  mainTechStacks: string;
  companyName: string;
  industry: string;
  jobLink: string;
  bidder: string;
  // Local-only fields
  tailoredResumeId: string;
  tailoredResumePath: string;
  originalResume: string;
  scoreBefore: number;
  scoreAfter: number;
}

const LOG_PATH = path.join(process.cwd(), 'data', 'bidman-log.json');

function ensureLogFile(): TailorLogEntry[] {
  if (!fs.existsSync(LOG_PATH)) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, '[]');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

export function getLogEntries(): TailorLogEntry[] {
  return ensureLogFile();
}

export function appendLogEntry(
  entry: Omit<TailorLogEntry, 'no'>
): TailorLogEntry {
  const entries = ensureLogFile();
  const nextNo = entries.length > 0 ? Math.max(...entries.map((e) => e.no)) + 1 : 1;

  const full: TailorLogEntry = { no: nextNo, ...entry };
  entries.push(full);

  fs.writeFileSync(LOG_PATH, JSON.stringify(entries, null, 2));
  return full;
}
