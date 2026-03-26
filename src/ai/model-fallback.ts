import type { PipelineConfig } from '@/lib/types';
import type { ModelTask } from './providers';
import { getModel } from './providers';

// ============================================================================
// Model Fallback Chain — Automatically retries with alternative models
// ============================================================================

/**
 * Execute an AI operation with automatic fallback on failure
 * Tries primary model first, then falls back through the chain
 */
export async function withFallback<T>(
  task: ModelTask,
  config: PipelineConfig,
  operation: (model: any, provider: string) => Promise<T>
): Promise<T> {
  const chain = [config.primaryModel, ...config.fallbackModels];
  const errors: Array<{ provider: string; error: string }> = [];

  for (const provider of chain) {
    try {
      const { model } = getModel(task, {
        ...config,
        primaryModel: provider,
        fallbackModels: [],
      });

      console.log(`[fallback] Trying ${provider} for ${task}...`);
      const result = await operation(model, provider);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ provider, error: message });
      console.warn(`[fallback] ${provider} failed for ${task}: ${message}`);

      // Don't retry on non-retryable errors
      if (isNonRetryable(error)) {
        throw error;
      }
    }
  }

  throw new Error(
    `All models failed for task "${task}":\n` +
    errors.map(e => `  - ${e.provider}: ${e.error}`).join('\n')
  );
}

/**
 * Check if an error should not be retried with another model
 */
function isNonRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Schema validation errors won't be fixed by switching models
    if (msg.includes('schema') || msg.includes('validation')) return false; // still retry
    // Auth errors for ALL providers means nothing will work
    if (msg.includes('invalid api key') || msg.includes('unauthorized')) return false; // try next
  }
  return false;
}
