// ============================================================================
// Pipeline Runtime Log — Tracks step timing and status for debugging
// ============================================================================

export interface LogEntry {
  timestamp: string;
  elapsed: string;
  step: string;
  message: string;
  level: 'info' | 'warn' | 'error';
}

let currentRunId: string | null = null;
let runStartTime: number = 0;
let entries: LogEntry[] = [];

export function startRun(): string {
  currentRunId = Date.now().toString(36);
  runStartTime = Date.now();
  entries = [];
  log('info', 'pipeline', 'Pipeline started');
  return currentRunId;
}

export function log(level: LogEntry['level'], step: string, message: string) {
  const now = Date.now();
  const elapsedMs = now - (runStartTime || now);
  const elapsedStr = `${(elapsedMs / 1000).toFixed(1)}s`;
  const entry: LogEntry = {
    timestamp: new Date(now).toISOString(),
    elapsed: elapsedStr,
    step,
    message,
    level,
  };
  entries.push(entry);

  // Also console.log with timing
  const prefix = level === 'error' ? '  ✗' : level === 'warn' ? '  ⚠' : '  ▸';
  console.log(`[${elapsedStr}] ${prefix} [${step}] ${message}`);
}

export function endRun() {
  log('info', 'pipeline', `Pipeline finished in ${((Date.now() - runStartTime) / 1000).toFixed(1)}s`);
  currentRunId = null;
}

export function getEntries(): LogEntry[] {
  return [...entries];
}

export function isRunning(): boolean {
  return currentRunId !== null;
}
