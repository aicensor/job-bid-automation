# CLAUDE.md — Job Bid Automation Project Guide

## Project Overview

AI-powered resume tailoring engine that automatically optimizes resumes for specific job postings to achieve top ATS scores. Built with Next.js 15, TypeScript, SQLite, and multi-provider LLM integration.

**Live URL:** http://156.67.24.31:3000 (Ubuntu VPS)
**Dev URL:** http://localhost:3000

## Architecture

```
User Flow:
  Admin → Upload resumes → Assign to bidmen → Set instructions + strict mode
  Bidman → Paste job URL → Select resume → Tailor → Download PDF

Pipeline Flow:
  1. Parse JD → structured requirements + keywords
  2. Score base resume (before)
  3. Analyze gaps (missing skills, achievements)
  4. Rewrite bullets (LLM, STAR format) + Generate summary (parallel)
  5. Reorder sections by relevance
  6. 3-pass refinement:
     a. Inject missing keywords
     b. Clean AI phrases
     c. Truth validation (if strict mode ON)
  7. Score tailored resume (after)
  8. Loop if score < threshold (default 85, max iterations configurable)
```

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Database:** SQLite (better-sqlite3) at `data/app.db`
- **Auth:** HMAC-SHA256 signed session cookies (7-day TTL)
- **AI:** NVIDIA NIM (free, primary) → Gemini (free, fallback) → OpenRouter (paid, last resort)
- **AI SDK:** Vercel AI SDK v4 (`ai@4.3.19`)
- **PDF:** Puppeteer for generation, pdf-parse for extraction
- **DOCX:** `docx` library for export, `mammoth` for import
- **Styling:** Tailwind CSS v4
- **Validation:** Zod schemas for LLM output parsing

## Directory Structure

```
src/
  app/              # Next.js App Router
    (auth)/         # Login, Register (no sidebar)
    (dashboard)/    # Admin tools: Dashboard, Tailor, History, Jobs, Settings
    admin/          # Admin pages: Users, Resume assignments
    bidman/         # Bidman pages: Bid workflow, Log
    api/            # 26 REST API endpoints
  core/             # Core AI/ML logic
    parser/         # Resume + JD parsing
    tailor/         # Pipeline, gap analysis, rewriter, summary generator
    scorer/         # ATS, semantic, seniority, readability scoring
    refiner/        # Keyword injection, AI cleanup, truth validation
    scraper/        # LinkedIn search, universal job scraper
    validators/     # Blocked fields, quality gates
  ai/               # Provider config, timeouts, prompts
  integrations/     # DOCX, PDF, Google Sheets, LinkedIn bot
  lib/              # DB, auth, types, queue, logging
  components/       # React components (admin, auth, bidman, dashboard, etc.)
data/
  app.db            # SQLite database
  base-resume/      # Uploaded base resumes (PDF/DOCX)
  output/           # Generated tailored resumes (JSON)
  achievement-bank.yaml   # Real achievements in STAR format
  preferences.yaml        # Tailoring preferences
  bidman-log.json         # Bidman activity log
  queue.json              # Job queue state
```

## Database Schema (SQLite)

```sql
users (id, username, password_hash, role[admin|bidman], status[pending|approved|disabled], created_at, updated_at)
sessions (id, user_id FK, created_at, expires_at)
resume_assignments (id, user_id FK, resume_filename, tailoring_instructions, strict_truth_check[0|1], created_at, UNIQUE(user_id, resume_filename))
```

Default admin seeded on first run: `admin` / `admin123` (or `ADMIN_DEFAULT_PASSWORD` env var).

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/core/tailor/pipeline.ts` | Main tailoring orchestrator — the heart of the system |
| `src/core/tailor/rewriter.ts` | LLM bullet rewriting with achievement bank |
| `src/core/tailor/summary-generator.ts` | LLM summary generation |
| `src/core/refiner/truth-validator.ts` | Prevents fabricated content (skipped when strict=OFF) |
| `src/ai/providers.ts` | Model registry + fallback chain config |
| `src/ai/timeout.ts` | 60s timeout per LLM call + model fallback |
| `src/lib/db.ts` | SQLite schema + seed + types |
| `src/lib/auth.ts` | Session management (HMAC signed cookies) |
| `src/middleware.ts` | Route protection (Edge Runtime, Web Crypto API) |
| `src/app/api/bidman/tailor/route.ts` | Bidman tailoring API endpoint |
| `src/components/bidman/BidmanWorkflow.tsx` | Bidman UI workflow orchestrator |
| `src/components/admin/ResumeManager.tsx` | Resume upload + assignment UI |
| `data/achievement-bank.yaml` | Achievement bank for bullet enrichment |
| `data/preferences.yaml` | Tailoring preferences (tone, emphasis, seniority) |

## AI Provider Chain

```
Task        Primary (free)           Fallback1 (free)      Fallback2 (paid)
─────────   ──────────────────────   ──────────────────    ─────────────────────
rewrite     NVIDIA NIM qwen3-80b     Gemini 2.5 Flash      OpenRouter Claude Sonnet
parse       NVIDIA NIM qwen3-80b     Gemini 2.5 Flash      OpenRouter Claude Sonnet
analyze     NVIDIA NIM qwen3-80b     Gemini 2.5 Flash      OpenRouter GPT-4o-mini
embedding   NVIDIA NIM nv-embedqa    —                      OpenRouter text-embedding-3-small
```

Timeout: 60s per call. On timeout/error, automatically tries next model in chain.

## Scoring System (0-100)

| Dimension | Weight | Source |
|-----------|--------|--------|
| ATS Keywords | 35% | TF-IDF + exact + synonym matching |
| Semantic Similarity | 20% | Embedding cosine similarity |
| Seniority Signals | 20% | Action verbs, metrics, leadership |
| Readability | 10% | Structure, bullet clarity, formatting |
| Achievement Quality | 15% | STAR format, quantification |

Threshold: 85/100 default. Typical improvement: +20-40 points.

## Auth & Roles

- **Admin:** Full access — user management, resume uploads, assignments, all tools
- **Bidman:** Can only see assigned resumes, run tailoring, view own log
- **Middleware:** Edge Runtime with Web Crypto HMAC verification (not Node.js crypto)
- **Token format:** `sessionId|expiresAt|hmacSignature` (pipe-delimited, not colon)

## Common Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npx tsc --noEmit     # Type-check without emitting
```

## Environment Variables

See `.env.example` for full list. Key ones:
- `NVIDIA_API_KEY` — Primary LLM provider (free)
- `GOOGLE_GEMINI_API_KEY` — Fallback LLM (free)
- `OPENROUTER_API_KEY` — Paid fallback
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` — Google Sheets integration
- `GOOGLE_SHEET_ID` — Target spreadsheet
- `SESSION_SECRET` — HMAC signing key for auth tokens

## Known Issues & Constraints

1. **LLM timeout:** NVIDIA NIM sometimes exceeds 60s on large resumes → falls back to Gemini
2. **Skills section not tailored:** The rewriter only modifies experience bullets + summary, not the skills section. Skills remain from base resume even when mismatched.
3. **Resume-job mismatch:** No pre-check for resume-job fit. Bidman can select a C#/.NET resume for a Python job, resulting in low scores. **TODO:** Add pre-tailoring fit check + best resume suggestion.
4. **Truth validator strictness:** When strict mode ON, new technologies/content are blocked. When OFF, truth validation is completely skipped. **TODO:** Consider a middle ground.
5. **Job titles can be fabricated:** The rewriter can change job titles (e.g., "Software Engineer" → "Python DevOps Engineer"). Truth validator checks company/dates but not titles aggressively enough.
6. **Google Sheets:** Uses service account auth. To change accounts, replace the JSON key file and update `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` + `GOOGLE_SHEET_ID` in `.env`.

## Planned Features

- [x] Pre-tailoring resume-job fit score — warn bidman if resume is a poor match, auto-suggest best resume
- [ ] Skills section tailoring — reorder/filter skills to match JD requirements
- [ ] Middle-ground truth checking — allow new content but flag for review
- [ ] Bidman activity dashboard — stats per bidman (bids/day, avg score improvement)
- [ ] Resume versioning — track changes across tailoring runs

## Development Notes

- Always delete `data/app.db` after schema changes (it uses `CREATE TABLE IF NOT EXISTS`, won't add new columns)
- Middleware runs in Edge Runtime — cannot use Node.js `crypto` module, must use Web Crypto API
- The `(dashboard)` route group has its own sidebar layout; `(auth)` has no sidebar; `admin/` and `bidman/` have their own sidebars
- PM2 production process runs as user `tailor` on port 3000 — stop it with `sudo -u tailor pm2 stop tailor` before dev
- Session token delimiter is `|` not `:` (ISO dates contain colons which broke the original parser)
