# Bidman Workflow — Implementation Plan

**Status:** Draft
**Date:** 2026-03-30
**Project:** job-bid-automation

---

## 1. Overview

A new streamlined page (`/bidman`) where a bidman can:

1. Paste any job URL (LinkedIn, Indeed, company sites, etc.)
2. System scrapes and displays job details
3. Select a base resume from a radio button list
4. Click "Tailor Resume" to generate a tailored PDF
5. PDF auto-downloads when ready
6. A tailor log is saved locally and pushed to Google Sheets

---

## 2. User Flow

```
┌─────────────────────────────────────────────────┐
│  /bidman                                        │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Paste Job URL:  [________________________]│  │
│  │                 [Find Job]                │  │
│  └───────────────────────────────────────────┘  │
│                     │                           │
│                     ▼                           │
│  ┌───────────────────────────────────────────┐  │
│  │ Job Found:                                │  │
│  │   Title: Senior Backend Engineer          │  │
│  │   Company: Acme Corp                      │  │
│  │   Location: Remote                        │  │
│  │   Description: (collapsible)              │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Select Resume:                            │  │
│  │   ○ Steven_Backend_2026.pdf               │  │
│  │   ● Steven_Fullstack_2026.pdf             │  │
│  │   ○ Steven_DevOps_2026.pdf                │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  [Tailor Resume]                                │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ Progress: Parsing JD... ██████░░░░ 60%    │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ ✓ Resume ready! Downloading PDF...        │  │
│  │   Score: 72 → 91                          │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ── Recent Tailor Logs ──────────────────────── │
│  │ Job URL  │ Company │ Resume │ Score │ Time │ │
│  │ link...  │ Acme    │ Full.. │ 91    │ 2m   │ │
│  │ link...  │ Beta    │ Back.. │ 88    │ 5m   │ │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 3. Implementation Phases

### Phase 1: Universal Job Scraper

**Goal:** Scrape job details from any URL (not just LinkedIn).

**Approach:**
- Use Puppeteer (headless browser) to load any job page and extract raw HTML
- Use Cheerio to parse the HTML content
- Use LLM (via AI SDK) to extract structured fields from raw text
- This avoids writing site-specific scrapers — the LLM handles any format

**New files:**
- `src/core/scraper/universal-scraper.ts` — Puppeteer-based page loader + LLM field extraction

**Extracted fields:**
- Job title
- Company name
- Industry (e.g. Fintech, Healthcare, SaaS — inferred by LLM)
- Main tech stacks (e.g. "React, Node" — extracted by LLM from requirements)
- Location
- Work type (remote/hybrid/onsite)
- Job description (full text — used for tailoring pipeline)
- Requirements / qualifications
- Salary (if available)
- Posted date (if available)
- Apply URL (if different from input URL)

**API route:**
- `POST /api/jobs/scrape` — Input: `{ url }`, Output: `{ jobInfo, rawDescription }`

---

### Phase 2: Bidman Page UI

**Goal:** New `/bidman` page with the full workflow.

**New files:**
- `src/app/bidman/page.tsx` — Main page (server component wrapper)
- `src/components/bidman/JobUrlInput.tsx` — URL input + "Find Job" button
- `src/components/bidman/JobPreview.tsx` — Scraped job details display
- `src/components/bidman/ResumeSelector.tsx` — Radio button resume list
- `src/components/bidman/TailorAction.tsx` — Tailor button + progress + download
- `src/components/bidman/TailorLog.tsx` — Recent logs table on page

**Modified files:**
- `src/components/layout/Sidebar.tsx` — Add "Bidman" nav link
- `src/app/api/resume/route.ts` — Reuse existing `GET /api/resume` for listing

**UI states (sequential):**
1. **Input** — URL field visible, everything else hidden
2. **Loading** — Spinner while scraping
3. **Job found** — Show job details + resume selector + tailor button
4. **Job not found** — Error message, retry
5. **Tailoring** — Progress bar/steps indicator
6. **Done** — Score result, auto-download triggered, log entry added

---

### Phase 3: Tailor + Auto-Download

**Goal:** Wire the tailor pipeline to the Bidman page and auto-download PDF.

**Flow:**
1. Frontend sends `POST /api/bidman/tailor` with `{ jobUrl, jobInfo, rawDescription, resumeFileName }`
2. Backend runs existing `tailorResumePipeline()` from `src/core/tailor/pipeline.ts`
3. Backend generates PDF via `src/integrations/pdf/generator.ts`
4. Returns result JSON + PDF download URL
5. Frontend triggers browser download via `<a download>` or `window.open()`

**New files:**
- `src/app/api/bidman/tailor/route.ts` — Bidman-specific tailor endpoint (orchestrates scrape → tailor → PDF → log)

**PDF serving:**
- `GET /api/export/[id]` — Serve generated PDF by result ID (or reuse existing `/api/export`)

---

### Phase 4: Tailor Log (Local)

**Goal:** Persist a log of every tailor action performed by the bidman.

**Log entry schema:**
```typescript
interface TailorLogEntry {
  no: number;                   // auto-increment row number
  date: string;                 // e.g. "03/26/2026"
  jobTitle: string;             // e.g. "Senior Software Engineer"
  mainTechStacks: string;       // e.g. "React, Node" (extracted by LLM)
  companyName: string;          // e.g. "Coinbase"
  industry: string;             // e.g. "Fintech" (extracted by LLM)
  jobLink: string;              // original job URL
  bidder: string;               // bidman name (Phase 6: from user identity)
  // local-only fields (not in Google Sheet)
  tailoredResumeId: string;     // result ID (links to /data/output/)
  tailoredResumePath: string;   // path to generated PDF
  originalResume: string;       // base resume filename
  scoreBefore: number;
  scoreAfter: number;
}
```

**Storage:**
- `data/bidman-log.json` — Append-only JSON array
- New utility: `src/lib/bidman-log.ts` — Read/append/query log entries

**Display:**
- Separate page: `/bidman/log` — full tailor log table with filtering/search
- Sidebar sub-item under "Bidman" → "Log"
- `/bidman` page itself stays clean — workflow only, no log table

---

### Phase 5: Google Sheets Integration

**Goal:** Push each tailor log entry to a remote Google Sheet.

**Prerequisites (from user):**
- Google Cloud project with Sheets API enabled
- Service account JSON key
- Sheet ID shared with service account

**New files:**
- `src/integrations/google-sheets/client.ts` — Sheets API client (append row)
- `src/integrations/google-sheets/sync.ts` — Push log entry after tailor completes

**NPM package:**
- `googleapis` (Google APIs Node.js client)

**Environment variables (.env):**
```
GOOGLE_SERVICE_ACCOUNT_KEY=<path to JSON key or inline JSON>
GOOGLE_SHEET_ID=<sheet ID>
GOOGLE_SHEET_NAME=TailorLog   # tab name
```

**Sheet columns (matches existing sheet structure):**
| No | Date | Job Title | Main Tech Stacks | Company Name | Industry | Job Link | Bidder |
|----|------|-----------|-----------------|--------------|----------|----------|--------|
| 1 | 03/26/2026 | Senior Software Engineer | React, Node | Coinbase | Fintech | link | Bidder1 |

**Behavior:**
- Write happens after successful tailor, non-blocking (fire-and-forget with error logging)
- If Sheets API is not configured, skip silently (log warning once)

---

### Phase 6: User Role Management (Future)

**Goal:** Admin can manage bidmen and their resume assignments.

**Roles:**
- **Admin** — Manages base resumes, assigns resumes to bidmen, sets custom instructions per bidman
- **Bidman** — Uses `/bidman` page, sees only assigned resumes

**Scope (to be designed later):**
- Auth system (simple password-based or OAuth)
- Admin page: `/admin`
  - Manage bidmen (add/remove/edit)
  - Assign resumes per bidman
  - Set additional tailoring instructions per bidman
- Bidman page filters resumes by assignment
- Log entries tagged with bidman identity

---

## 4. File Changes Summary

### New Files
```
src/app/bidman/page.tsx                    — Bidman workflow page
src/app/bidman/log/page.tsx                — Tailor log page (full table)
src/components/bidman/JobUrlInput.tsx       — URL input + "Find Job" button
src/components/bidman/JobPreview.tsx        — Scraped job details display
src/components/bidman/ResumeSelector.tsx    — Radio button resume list
src/components/bidman/TailorAction.tsx      — Tailor button + progress + download
src/components/bidman/LogTable.tsx          — Log table component (used on /bidman/log)
src/core/scraper/universal-scraper.ts      — Puppeteer + LLM universal scraper
src/app/api/bidman/tailor/route.ts         — Bidman tailor endpoint
src/app/api/bidman/log/route.ts            — GET/POST log entries
src/app/api/jobs/scrape/route.ts           — Universal job scrape endpoint
src/lib/bidman-log.ts                      — Log read/append/query
src/integrations/google-sheets/client.ts   — Sheets API client
src/integrations/google-sheets/sync.ts     — Push log entry to Sheet
```

### Modified Files
```
src/components/layout/Sidebar.tsx          — Add "Bidman" group with sub-items: Bid, Log
package.json                               — Add googleapis dependency
```

---

## 5. Dependencies

| Package | Purpose | Phase |
|---------|---------|-------|
| (existing) puppeteer | Universal page scraping | 1 |
| (existing) cheerio | HTML parsing | 1 |
| (existing) ai SDK | LLM field extraction | 1 |
| googleapis | Google Sheets API | 5 |

---

## 6. Open Questions

1. **Job fields to extract** — Confirm exact list of fields the bidman needs to see
2. **Google Sheets API key** — User will provide later
3. **Tailored resume link in Sheet** — Should this be a local file path, a download URL (requires the app to be publicly hosted), or a Google Drive link?
4. **Error handling** — If scraping fails for a site, should we fall back to manual JD paste?
5. **Concurrent usage** — Will multiple bidmen use the app simultaneously? (Affects file locking for logs)

---

## 7. Implementation Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5  →  Phase 6
Scraper     UI Page     Tailor+DL   Local Log    Sheets      Roles
  ▲                                                           (future)
  │
Start here
```

Estimated phases 1-5 can be built incrementally, each phase producing a working feature.
