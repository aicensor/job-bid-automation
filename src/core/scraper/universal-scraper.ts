import { generateObject } from 'ai';
import { z } from 'zod';
import { getModel } from '@/ai/providers';
import { defaultConfig } from '@/ai/providers';

// ============================================================================
// Universal Job Scraper — Works with any job site URL
// Uses Patchright (undetected Playwright) to load pages + LLM to extract fields
// ============================================================================

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// --- Schema for LLM extraction ---

export const scrapedJobSchema = z.object({
  title: z.string().describe('Job title, e.g. "Senior Software Engineer"'),
  company: z.string().describe('Company name'),
  industry: z
    .string()
    .describe(
      'Company industry, e.g. "Fintech", "Healthcare", "SaaS", "E-commerce", "Cybersecurity". Infer from company name and job context if not explicit.'
    ),
  mainTechStacks: z
    .string()
    .describe(
      'Comma-separated list of main technologies/frameworks required, e.g. "React, Node.js, PostgreSQL". Extract from requirements and description. Keep to the top 3-6 most important.'
    ),
  location: z.string().describe('Job location or "Remote"'),
  workType: z
    .string()
    .describe('One of: remote, hybrid, onsite. Infer from location/description if not explicit.'),
  employmentType: z
    .string()
    .describe('One of: full-time, part-time, contract. Default to "full-time" if unclear.'),
  salary: z.string().optional().describe('Salary range if mentioned, otherwise omit'),
  description: z.string().describe('Full job description text, preserving key details'),
});

export type ScrapedJob = z.infer<typeof scrapedJobSchema> & {
  url: string;
  scrapedAt: string;
};

// --- Page loading ---

let chromium: any = null;

async function getBrowser() {
  if (!chromium) {
    try {
      const patchright = await import('patchright');
      chromium = patchright.chromium;
    } catch {
      throw new Error(
        'Patchright not installed. Run: npm i patchright && npx patchright install chromium'
      );
    }
  }
  return chromium;
}

/**
 * Load a page with Patchright and extract text content.
 * Handles JS-rendered pages, cookie banners, etc.
 */
async function loadPageContent(url: string): Promise<string> {
  const browser = await getBrowser();
  const instance = await browser.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await instance.newContext({ userAgent: USER_AGENT });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for content to render
    await page.waitForTimeout(3000);

    // Try to dismiss common cookie/popup overlays
    try {
      const dismissSelectors = [
        'button[id*="accept"]',
        'button[class*="accept"]',
        'button[id*="cookie"]',
        'button[class*="cookie"]',
        'button[id*="dismiss"]',
        'button[aria-label*="close"]',
        'button[aria-label*="Close"]',
      ];
      for (const sel of dismissSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
          await btn.click().catch(() => {});
          break;
        }
      }
    } catch {
      // Ignore — popups are optional
    }

    // Extract main text content, stripping nav/footer noise
    const text = await page.evaluate(() => {
      // Remove noisy elements
      const removeSelectors = [
        'nav', 'footer', 'header', 'script', 'style', 'noscript',
        '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]',
        '.cookie-banner', '.popup', '.modal-overlay',
      ];
      removeSelectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => el.remove());
      });

      // Try to find the main job content area
      const mainContent =
        document.querySelector('main') ||
        document.querySelector('[role="main"]') ||
        document.querySelector('article') ||
        document.querySelector('.job-description') ||
        document.querySelector('.job-details') ||
        document.querySelector('#job-details') ||
        document.body;

      return mainContent?.innerText?.substring(0, 15000) || '';
    });

    await context.close();
    return text;
  } finally {
    await instance.close();
  }
}

/**
 * Lightweight fetch for pages that don't need JS rendering.
 * Falls back to Patchright if the result is too short.
 */
async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    // Use cheerio to extract text
    const cheerio = await import('cheerio');
    const $ = cheerio.load(html);

    // Remove noisy elements
    $('nav, footer, header, script, style, noscript').remove();

    const text =
      $('main').text() ||
      $('article').text() ||
      $('[role="main"]').text() ||
      $('body').text();

    const cleaned = text.replace(/\s+/g, ' ').trim();

    // If too short, page likely needs JS rendering
    if (cleaned.length < 200) {
      throw new Error('Content too short, likely JS-rendered page');
    }

    return cleaned.substring(0, 15000);
  } catch {
    // Fallback to browser rendering
    console.log('[universal-scraper] Falling back to browser rendering...');
    return loadPageContent(url);
  }
}

// --- LLM extraction ---

/**
 * Extract structured job fields from raw page text using LLM.
 */
async function extractJobFields(
  pageText: string,
  url: string
): Promise<z.infer<typeof scrapedJobSchema>> {
  const { model } = getModel('parse', defaultConfig);

  console.log('[universal-scraper] Extracting job fields with LLM...');

  const { object } = await generateObject({
    model,
    schema: scrapedJobSchema,
    system: `You are a job posting parser. Extract structured job information from the raw text of a job posting page.

Rules:
- Extract exactly what is stated in the posting. Do not invent information.
- For "industry", infer from the company name, product description, or domain if not explicitly stated.
- For "mainTechStacks", extract the primary technologies, languages, and frameworks mentioned in requirements. Keep to 3-6 most important. Format as comma-separated.
- For "description", include the full job description preserving requirements, responsibilities, and qualifications. This will be used for resume tailoring.
- If a field is truly not available, use "Not specified".

The job URL is: ${url}`,
    prompt: `Extract structured job information from this page:\n\n${pageText}`,
    temperature: 0.2,
  });

  return object;
}

// --- Public API ---

export interface ScrapeResult {
  success: true;
  job: ScrapedJob;
}

export interface ScrapeError {
  success: false;
  error: string;
}

/**
 * Scrape a job posting from any URL.
 * 1. Fetches page content (plain HTTP first, Patchright fallback)
 * 2. Uses LLM to extract structured fields
 */
export async function scrapeJobUrl(
  url: string
): Promise<ScrapeResult | ScrapeError> {
  console.log(`[universal-scraper] Scraping: ${url}`);

  try {
    // Validate URL
    new URL(url);
  } catch {
    return { success: false, error: 'Invalid URL' };
  }

  try {
    // Step 1: Fetch page content
    const pageText = await fetchPageContent(url);

    if (!pageText || pageText.length < 50) {
      return {
        success: false,
        error: 'Could not extract enough content from the page',
      };
    }

    // Step 2: LLM extraction
    const fields = await extractJobFields(pageText, url);

    const job: ScrapedJob = {
      ...fields,
      url,
      scrapedAt: new Date().toISOString(),
    };

    console.log(
      `[universal-scraper] Extracted: "${job.title}" at ${job.company} (${job.industry})`
    );

    return { success: true, job };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown scraping error';
    console.error(`[universal-scraper] Failed: ${message}`);
    return { success: false, error: message };
  }
}
