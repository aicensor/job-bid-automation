# AI Providers — Tailor Resume Generator

## Provider Stack (Priority Order)

| Priority | Provider | Cost | Models | Used For |
|---|---|---|---|---|
| **1st** | NVIDIA NIM | **Free** | Qwen3 80B, NV-EmbedQA-E5 | All LLM tasks + embeddings |
| **2nd** | Google Gemini | **Free** (Tier 1) | Gemini 2.5 Flash | Fallback if NVIDIA down |
| **3rd** | OpenRouter | Paid ($0.001-0.009/call) | Claude Sonnet 4, GPT-4o | Last resort, quality comparison |

## Cost Breakdown

| Operation | NVIDIA NIM | Gemini | OpenRouter |
|---|---|---|---|
| Auto-queue match (30 jobs) | $0 | $0 | ~$0.03 |
| Resume tailoring (1 job) | $0 | $0 | ~$0.05-0.15 |
| Batch tailor (10 jobs) | $0 | $0 | ~$0.50-1.50 |
| **100 jobs end-to-end** | **$0** | **$0** | **~$5-15** |

## Configuration

### .env

```bash
# NVIDIA NIM — Primary (FREE)
NVIDIA_API_KEY=nvapi-xxxxx
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=qwen/qwen3-next-80b-a3b-instruct
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5

# Google Gemini — Secondary (FREE tier 1)
GOOGLE_GEMINI_API_KEY=AIzaSyxxxxx
GEMINI_MODEL=gemini-2.5-flash

# OpenRouter — Paid fallback (last resort)
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PRIMARY_MODEL=anthropic/claude-sonnet-4
FALLBACK_MODEL_1=openai/gpt-4o
EMBEDDING_MODEL=openai/text-embedding-3-small
```

## How Fallback Works

```
Every LLM call follows this chain:
  1. Try NVIDIA NIM (free)
     ↓ if error/timeout
  2. Try Google Gemini (free)
     ↓ if error/timeout
  3. Try OpenRouter (paid)
     ↓ if all fail
  4. Throw error
```

The fallback is automatic — defined in `src/ai/providers.ts` and executed by `src/ai/model-fallback.ts`.

## Task-to-Model Mapping

| Task | What It Does | Model Used |
|---|---|---|
| `rewrite` | Rewrite resume bullets, generate summaries | NVIDIA Qwen3 80B |
| `parse` | Parse resumes (PDF→JSON), parse job descriptions | NVIDIA Qwen3 80B |
| `analyze` | Score resumes, auto-queue job matching | NVIDIA Qwen3 80B |
| `embedding` | Semantic similarity scoring | NVIDIA NV-EmbedQA-E5 |

## Auto-Queue LLM Matching

The auto-queue uses LLM scoring instead of keyword matching:

```
For each candidate job:
  Input: resume summary + skills (2000 chars) + JD title + description (1500 chars)
  Model: NVIDIA Qwen3 80B (free)
  Output: { score: 0-100, reason: "one sentence explanation" }

Scoring guide:
  80-100: Strong stack match + seniority fit
  50-79:  Partial overlap, transferable skills
  20-49:  Weak match, different primary stack
  0-19:   Completely different role/stack

Threshold: 30+ gets added to queue (configurable in settings)
```

**Why LLM over keyword matching:**
- Understands context: "Go experience is a plus" (optional) vs "Senior Go Engineer" (required)
- Handles synonyms: .NET/C#/ASP.NET are the same ecosystem
- Evaluates seniority fit: Staff vs Junior expectations
- Cost: $0 via NVIDIA NIM

## NVIDIA NIM Available Models

### LLM Models
- `qwen/qwen3-next-80b-a3b-instruct` (default) — 80B params, excellent for code/tech
- `meta/llama-3.1-70b-instruct` — Meta's Llama
- `mistralai/mixtral-8x7b-instruct-v0.1` — Mistral's MoE

### Embedding Models
- `nvidia/nv-embedqa-e5-v5` (default) — 1024 dims, requires `input_type` param
- `nvidia/nv-embed-v1` — General purpose
- `baai/bge-m3` — Multilingual
- `snowflake/arctic-embed-l` — Snowflake's model

## Adding New Providers

To add a new OpenAI-compatible provider:

```typescript
// In src/ai/providers.ts
const newProvider = createOpenAICompatible({
  name: 'my-provider',
  baseURL: process.env.MY_PROVIDER_BASE_URL,
  apiKey: process.env.MY_PROVIDER_API_KEY,
});

// Add to model registry
export const models = {
  rewrite: {
    primary: newProvider('model-name'),
    fallback1: nvidia(nvidiaModel),
    // ...
  },
};
```
