import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { PipelineConfig } from '@/lib/types';

// ============================================================================
// AI Providers — NVIDIA NIM (primary/free) + Gemini (free) + OpenRouter (paid fallback)
// ============================================================================

// NVIDIA NIM — Free, high-quality models + embeddings
const nvidia = createOpenAICompatible({
  name: 'nvidia',
  baseURL: process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1',
  apiKey: process.env.NVIDIA_API_KEY,
});

// Google Gemini — Free tier (generous limits)
const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

// OpenRouter — Paid fallback (Claude, GPT)
const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://tailor-resume-generator.local',
    'X-Title': 'Tailor Resume Generator',
  },
});

// Default models
const nvidiaModel = process.env.NVIDIA_MODEL || 'qwen/qwen3-next-80b-a3b-instruct';
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Model registry — NVIDIA primary, Gemini secondary, OpenRouter last resort
export const models = {
  // Rewriting: primary task for resume tailoring
  rewrite: {
    primary: nvidia(nvidiaModel),
    fallback1: gemini(geminiModel),
    fallback2: openrouter(process.env.PRIMARY_MODEL || 'anthropic/claude-sonnet-4'),
  },

  // Parsing: structured extraction from JDs and resumes
  parse: {
    primary: nvidia(nvidiaModel),
    fallback1: gemini(geminiModel),
    fallback2: openrouter(process.env.PRIMARY_MODEL || 'anthropic/claude-sonnet-4'),
  },

  // Scoring/Analysis: lightweight tasks
  analyze: {
    primary: nvidia(nvidiaModel),
    fallback1: gemini(geminiModel),
    fallback2: openrouter('openai/gpt-4o-mini'),
  },

  // Embeddings: NVIDIA NIM (free) → OpenRouter fallback
  embedding: {
    primary: nvidia(process.env.NVIDIA_EMBEDDING_MODEL || 'nvidia/nv-embedqa-e5-v5'),
    fallback1: openrouter(process.env.EMBEDDING_MODEL || 'openai/text-embedding-3-small'),
  },
} as const;

export type ModelTask = keyof typeof models;
type ModelSlot = 'primary' | 'fallback1' | 'fallback2';

/**
 * Get model with fallback chain
 * Tries primary → fallback1 → fallback2
 */
export function getModel(task: ModelTask, config: PipelineConfig) {
  const chain: ModelSlot[] = ['primary', 'fallback1', 'fallback2'];

  for (const slot of chain) {
    const taskModels = models[task] as Record<string, any>;
    const model = taskModels[slot];
    if (model) return { model, provider: slot };
  }

  throw new Error(`No available model for task: ${task}`);
}

/**
 * Default pipeline config
 */
export const defaultConfig: PipelineConfig = {
  scoreThreshold: 85,
  maxIterations: 1,    // 1 iteration = ~2 min, 3 iterations = ~6 min
  primaryModel: 'primary',
  fallbackModels: ['fallback1', 'fallback2'],
  temperature: 0.5,
};
