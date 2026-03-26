# Tailor Resume Generator

AI-powered resume tailoring engine that auto-generates optimized resumes for specific job postings to rank in the top 10 of ATS scoring systems.

## Features

- **Resume Tailoring Pipeline** - Parse JD, gap analysis, LLM-powered bullet rewriting, ATS scoring
- **LinkedIn Job Scraper** - Search jobs with filters (remote, salary, experience level)
- **External Apply URL Resolution** - LinkedIn Voyager API + Serper Google search
- **Job Queue** - Batch processing with SSE real-time progress
- **Auto-Queue** - LLM-scored job matching, auto-find and queue matching jobs
- **DOCX/PDF/HTML Export** - ATS-compatible output with proper bold formatting
- **Multi-Provider AI** - NVIDIA NIM (free) > Google Gemini (free) > OpenRouter (paid)
- **Company Blacklist** - Exclude companies from auto-queue
- **Settings UI** - Configure search criteria, filters, and preferences

## Quick Start

### Prerequisites

- Node.js 20+
- Chrome/Chromium (for PDF generation)

### Setup

```bash
# Clone
git clone https://github.com/aicensor/job-bid-automation.git
cd job-bid-automation

# Install
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (see below)

# Run development server
npm run dev
# Open http://localhost:3000
```

### Production (Ubuntu VPS)

```bash
npm run build
npm start
# Or with PM2:
pm2 start npm --name "tailor" -- start
```

See [docs/DEPLOY_UBUNTU.md](docs/DEPLOY_UBUNTU.md) for full VPS deployment guide.

## Environment Variables

Create a `.env` file in the project root:

```bash
# NVIDIA NIM — Primary provider (FREE)
NVIDIA_API_KEY=nvapi-your-key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=qwen/qwen3-next-80b-a3b-instruct
NVIDIA_EMBEDDING_MODEL=nvidia/nv-embedqa-e5-v5

# Google Gemini — Secondary (FREE)
GOOGLE_GEMINI_API_KEY=AIzaSy-your-key
GEMINI_MODEL=gemini-2.5-flash

# OpenRouter — Paid fallback (optional)
OPENROUTER_API_KEY=sk-or-v1-your-key
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PRIMARY_MODEL=anthropic/claude-sonnet-4

# Serper.dev — Google Search for external job links
SERPER_API_KEY=your-serper-key

# LinkedIn Voyager API — External apply URL resolution
LINKEDIN_LI_AT=your-li-at-cookie
LINKEDIN_JSESSIONID=ajax:your-session-id

# App config
NODE_ENV=development
PORT=3000
```

### Getting API Keys

| Provider | URL | Cost |
|---|---|---|
| NVIDIA NIM | https://build.nvidia.com | Free |
| Google Gemini | https://aistudio.google.com/apikey | Free tier |
| OpenRouter | https://openrouter.ai/keys | Pay-per-use |
| Serper.dev | https://serper.dev | Free 2500 queries |
| LinkedIn cookies | Browser DevTools > Application > Cookies | Free (your account) |

## Project Structure

```
src/
  app/                    # Next.js 15 App Router
    api/
      tailor/             # POST: resume tailoring pipeline
      score/              # POST: score resume against JD
      jobs/search/        # GET: LinkedIn job search
      jobs/[id]/          # GET: job detail + external link
      queue/              # GET/POST/DELETE: job queue CRUD
      queue/run/          # POST: batch process queue (SSE)
      queue/auto/         # POST: auto-find + queue jobs (SSE)
      export/             # POST: DOCX/PDF export
      settings/           # GET/POST: app settings
    jobs/                 # Find Jobs page
    jobs/queue/           # Job Queue page
    tailor/               # New Tailoring page
    history/              # Tailoring history
    settings/             # Settings page

  core/
    parser/               # Resume (PDF/DOCX) + JD parsing
    tailor/               # Pipeline: gap analysis, rewriter, summary
    scorer/               # ATS keyword, semantic, seniority, readability
    refiner/              # 3-pass: keyword inject, AI cleanup, truth check
    scraper/              # LinkedIn scraper + external link resolver
    validators/           # Blocked fields, quality gates

  ai/
    providers.ts          # NVIDIA NIM + Gemini + OpenRouter
    model-fallback.ts     # Automatic fallback chain
    prompts/              # System prompts for each pipeline step

  integrations/
    docx/generator.ts     # DOCX export with bold formatting
    pdf/generator.ts      # PDF via Puppeteer
    linkedin-bot/         # LinkedIn bot adapter

  lib/
    queue.ts              # Job queue (JSON file storage)
    auto-queue.ts         # Auto-find + LLM match scoring
    types.ts              # TypeScript interfaces

data/
  base-resume/            # Your resume files (PDF/DOCX)
  output/                 # Generated tailored resumes
  achievement-bank.yaml   # Your real achievements for bullet rewriting
  preferences.yaml        # Tailoring preferences
  auto-queue-config.yaml  # Auto-queue search settings
  queue.json              # Current job queue state
```

## How It Works

```
Base Resume + Job Description
        |
  1. Parse JD → structured requirements + keywords
  2. Score base resume (before)
  3. Analyze gaps (missing skills, weak bullets)
  4. Rewrite bullets using JD language + achievement bank
  5. Generate targeted summary
  6. Reorder sections by relevance
  7. 3-pass refinement:
     - Inject missing keywords
     - Clean AI-sounding phrases
     - Validate truthfulness
  8. Score tailored resume (after)
  9. Loop if score < threshold
        |
  Output: Tailored Resume (JSON + DOCX + PDF)
  Score: 41 → 83 (+42 improvement)
```

## AI Provider Priority

| Priority | Provider | Cost | Used For |
|---|---|---|---|
| 1st | NVIDIA NIM | Free | All LLM tasks + embeddings |
| 2nd | Google Gemini | Free | Fallback if NVIDIA unavailable |
| 3rd | OpenRouter | Paid | Last resort (Claude/GPT) |

See [docs/AI_PROVIDERS.md](docs/AI_PROVIDERS.md) for details.

## Tech Stack

- **Framework**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **AI**: Vercel AI SDK, NVIDIA NIM, Google Gemini, OpenRouter
- **Scraping**: Cheerio, LinkedIn Guest API, Voyager API
- **Export**: docx (npm), Puppeteer
- **Config**: YAML, Zod validation

## License

Private — not for redistribution.
