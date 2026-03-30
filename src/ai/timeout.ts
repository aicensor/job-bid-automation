// ============================================================================
// LLM Call Timeout + Fallback — Wraps generateObject/generateText with
// per-call timeout and automatic model fallback
// ============================================================================

import { models, type ModelTask } from './providers';
import { log } from '@/lib/pipeline-log';

const LLM_TIMEOUT_MS = 60_000; // 60s per LLM call

/**
 * Race a promise against a timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

type ModelSlot = 'primary' | 'fallback1' | 'fallback2';

/**
 * Run an LLM operation with timeout + automatic fallback through model chain.
 * If primary times out or errors, tries fallback1, then fallback2.
 */
export async function withModelFallback<T>(
  task: ModelTask,
  label: string,
  operation: (model: any) => Promise<T>,
  timeoutMs: number = LLM_TIMEOUT_MS
): Promise<T> {
  const slots: ModelSlot[] = ['primary', 'fallback1', 'fallback2'];
  const taskModels = models[task] as Record<string, any>;

  for (const slot of slots) {
    const model = taskModels[slot];
    if (!model) continue;

    const start = Date.now();
    try {
      log('info', label, `Trying ${slot}...`);
      const result = await withTimeout(operation(model), timeoutMs, `${label} (${slot})`);
      log('info', label, `${slot} succeeded in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log('warn', label, `${slot} failed after ${((Date.now() - start) / 1000).toFixed(1)}s: ${msg}`);
      continue;
    }
  }

  log('error', label, 'All models failed');
  throw new Error(`[${label}] All models failed`);
}
