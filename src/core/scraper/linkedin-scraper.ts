import * as cheerio from 'cheerio';

// ============================================================================
// LinkedIn Public Job Scraper — No login required
// Uses LinkedIn's guest API endpoints (same as what Google indexes)
// ============================================================================

const BASE_URL = 'https://www.linkedin.com/jobs-guest/jobs/api';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// --- Types ---

export interface JobSearchParams {
  keywords: string;
  location?: string;
  geoId?: string;
  /** 'remote' | 'hybrid' | 'onsite' */
  workType?: 'remote' | 'hybrid' | 'onsite';
  /** Experience levels: 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'executive' */
  experienceLevel?: Array<'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'executive'>;
  /** Time posted: '24hr' | 'week' | 'month' | 'any' */
  datePosted?: '24hr' | 'week' | 'month' | 'any';
  /** Job type: 'full-time' | 'part-time' | 'contract' | 'temporary' | 'internship' */
  jobType?: Array<'full-time' | 'part-time' | 'contract' | 'temporary' | 'internship'>;
  /** Number of results per page (LinkedIn returns 25 per page) */
  limit?: number;
  /** Page number (0-indexed) */
  page?: number;
  /** Salary range filter */
  salary?: string;
}

export interface JobSearchResult {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  postedDate: string;
  jobUrl: string;
  salary?: string;
}

export interface JobDetail {
  jobId: string;
  title: string;
  company: string;
  companyUrl?: string;
  companyLogo?: string;
  location: string;
  workType?: string;
  employmentType?: string;
  seniorityLevel?: string;
  postedDate?: string;
  applicantCount?: string;
  salary?: string;
  description: string;
  descriptionHtml: string;
  jobUrl: string;
  applyUrl?: string;
  /** 'external' = apply on company site, 'easy_apply' = apply on LinkedIn */
  applyType: 'external' | 'easy_apply';
}

// --- Filter Mappings ---

const WORK_TYPE_MAP: Record<string, string> = {
  'onsite': '1',
  'remote': '2',
  'hybrid': '3',
};

const EXPERIENCE_MAP: Record<string, string> = {
  'internship': '1',
  'entry': '2',
  'associate': '3',
  'mid-senior': '4',
  'director': '5',
  'executive': '6',
};

const JOB_TYPE_MAP: Record<string, string> = {
  'full-time': 'F',
  'part-time': 'P',
  'contract': 'C',
  'temporary': 'T',
  'internship': 'I',
};

const DATE_POSTED_MAP: Record<string, string> = {
  '24hr': 'r86400',
  'week': 'r604800',
  'month': 'r2592000',
  'any': '',
};

// --- Rate Limiting ---

let lastRequestTime = 0;
const MIN_DELAY_MS = 500; // 500ms between requests (batched externally)

async function rateLimitedFetch(url: string, retries = 3): Promise<string> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.status === 429) {
        // Rate limited — exponential backoff
        const backoff = Math.pow(2, attempt + 1) * 1000;
        console.warn(`[scraper] Rate limited, waiting ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}

// --- Search Jobs ---

function buildSearchUrl(params: JobSearchParams): string {
  const url = new URL(`${BASE_URL}/seeMoreJobPostings/search`);

  url.searchParams.set('keywords', params.keywords);

  if (params.location) url.searchParams.set('location', params.location);
  if (params.geoId) url.searchParams.set('geoId', params.geoId);

  if (params.workType) {
    url.searchParams.set('f_WT', WORK_TYPE_MAP[params.workType] || '');
  }

  if (params.experienceLevel?.length) {
    url.searchParams.set('f_E', params.experienceLevel.map(l => EXPERIENCE_MAP[l]).join(','));
  }

  if (params.datePosted && params.datePosted !== 'any') {
    url.searchParams.set('f_TPR', DATE_POSTED_MAP[params.datePosted] || '');
  }

  if (params.jobType?.length) {
    url.searchParams.set('f_JT', params.jobType.map(t => JOB_TYPE_MAP[t]).join(','));
  }

  if (params.salary) {
    url.searchParams.set('f_SB2', params.salary);
  }

  // Pagination: LinkedIn guest API returns 10 results per page
  const start = (params.page || 0) * 10;
  url.searchParams.set('start', String(start));

  return url.toString();
}

function parseSearchResults(html: string): JobSearchResult[] {
  const $ = cheerio.load(html);
  const jobs: JobSearchResult[] = [];

  $('li').each((_, el) => {
    const card = $(el);

    // Extract job ID from data-entity-urn
    const urn = card.find('[data-entity-urn]').attr('data-entity-urn') || '';
    const jobId = urn.replace('urn:li:jobPosting:', '');
    if (!jobId) return;

    // Title
    const title = card.find('.base-search-card__title').text().trim();

    // Company — strip taglines after separators
    const rawCompanySearch = card.find('.base-search-card__subtitle a').text().trim()
      || card.find('h4.base-search-card__subtitle').text().trim();
    const company = rawCompanySearch.split(/\s+[-–|•·]\s*|\s{2,}/)[0].trim();

    // Location
    const location = card.find('.job-search-card__location').text().trim();

    // Posted date
    const postedDate = card.find('time').attr('datetime')
      || card.find('time').text().trim()
      || '';

    // Company logo
    const companyLogo = card.find('img').attr('data-delayed-url')
      || card.find('img').attr('src')
      || undefined;

    // Job URL
    const jobUrl = card.find('a.base-card__full-link').attr('href')?.split('?')[0]
      || `https://www.linkedin.com/jobs/view/${jobId}`;

    // Salary (if shown in listing)
    const salary = card.find('.job-search-card__salary-info').text().trim() || undefined;

    if (title && company) {
      jobs.push({
        jobId,
        title,
        company,
        companyLogo,
        location,
        postedDate,
        jobUrl,
        salary,
      });
    }
  });

  return jobs;
}

export async function searchJobs(params: JobSearchParams): Promise<{
  jobs: JobSearchResult[];
  total: number;
  page: number;
  hasMore: boolean;
}> {
  const url = buildSearchUrl(params);
  console.log(`[scraper] Searching: ${params.keywords} in ${params.location || 'anywhere'}`);

  const html = await rateLimitedFetch(url);
  const jobs = parseSearchResults(html);

  // LinkedIn guest API returns 10 per page; empty = no more
  const hasMore = jobs.length === 10;
  const page = params.page || 0;

  console.log(`[scraper] Found ${jobs.length} jobs on page ${page}`);

  return {
    jobs,
    total: jobs.length + (page * 10), // approximate
    page,
    hasMore,
  };
}

// --- Job Detail ---

function parseJobDetail(html: string, jobId: string): JobDetail {
  const $ = cheerio.load(html);

  // Title
  const title = $('h2.top-card-layout__title').text().trim()
    || $('h1').first().text().trim();

  // Company — strip taglines after separators like " -", " |", " –"
  const rawCompany = $('a.topcard__org-name-link').text().trim()
    || $('.topcard__flavor a').first().text().trim();
  const company = rawCompany.split(/\s+[-–|•·]\s*|\s{2,}/)[0].trim();

  const companyUrl = $('a.topcard__org-name-link').attr('href') || undefined;

  // Company logo
  const companyLogo = $('.artdeco-entity-image').attr('data-delayed-url')
    || $('img.artdeco-entity-image').attr('src')
    || undefined;

  // Location
  const location = $('span.topcard__flavor--bullet').text().trim();

  // Posted date
  const postedDate = $('span.posted-time-ago__text').text().trim()
    || $('span.topcard__flavor--metadata time').text().trim();

  // Applicant count
  const applicantCount = $('span.num-applicants__caption').text().trim()
    || $('figcaption.num-applicants__caption').text().trim();

  // Description (HTML and text)
  const descriptionHtml = $('.show-more-less-html__markup').first().html() || '';
  const description = $('.show-more-less-html__markup').first().text().trim()
    .replace(/\s+/g, ' ');

  // Job criteria (seniority, employment type, etc.)
  let seniorityLevel: string | undefined;
  let employmentType: string | undefined;
  let workType: string | undefined;

  $('li.description__job-criteria-item').each((_, el) => {
    const label = $(el).find('h3').text().trim().toLowerCase();
    const value = $(el).find('span').text().trim();

    if (label.includes('seniority')) seniorityLevel = value;
    else if (label.includes('employment')) employmentType = value;
    else if (label.includes('job function') || label.includes('industries')) { /* skip */ }
    else workType = value;
  });

  // Salary
  const salary = $('.salary-main-rail__salary-container').text().trim()
    || $('.compensation__salary').text().trim()
    || undefined;

  // Apply URL & Type detection
  const offSiteLink = $('a[data-tracking-control-name="public_jobs_apply-link-offsite"]').attr('href');
  const hasOffsite = html.includes('offsite') || !!offSiteLink;
  const applyType: 'external' | 'easy_apply' = hasOffsite ? 'external' : 'easy_apply';
  const applyUrl = offSiteLink
    || $('a.apply-button').attr('href')
    || undefined;

  return {
    jobId,
    title,
    company,
    companyUrl,
    companyLogo,
    location,
    workType,
    employmentType,
    seniorityLevel,
    postedDate,
    applicantCount,
    salary,
    description,
    descriptionHtml,
    jobUrl: `https://www.linkedin.com/jobs/view/${jobId}`,
    applyUrl,
    applyType,
  };
}

export async function getJobDetail(jobId: string): Promise<JobDetail> {
  console.log(`[scraper] Fetching detail for job ${jobId}`);

  const url = `${BASE_URL}/jobPosting/${jobId}`;
  const html = await rateLimitedFetch(url);

  return parseJobDetail(html, jobId);
}

// --- Batch Search (multiple pages) ---

export async function searchJobsBatch(
  params: JobSearchParams,
  maxPages: number = 4
): Promise<JobSearchResult[]> {
  const allJobs: JobSearchResult[] = [];

  for (let page = 0; page < maxPages; page++) {
    const result = await searchJobs({ ...params, page });
    allJobs.push(...result.jobs);

    if (!result.hasMore) break;

    // Extra delay between pages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[scraper] Total: ${allJobs.length} jobs across ${Math.min(maxPages, Math.ceil(allJobs.length / 10))} pages`);
  return allJobs;
}

// --- Lightweight Apply Type Check (no full parse) ---

export async function checkApplyType(jobId: string): Promise<'external' | 'easy_apply'> {
  const url = `${BASE_URL}/jobPosting/${jobId}`;
  const html = await rateLimitedFetch(url);
  return html.includes('offsite') ? 'external' : 'easy_apply';
}

/**
 * Batch check apply types for multiple jobs (parallel, 5 at a time)
 */
export async function batchCheckApplyTypes(
  jobIds: string[]
): Promise<Map<string, 'external' | 'easy_apply'>> {
  const results = new Map<string, 'external' | 'easy_apply'>();
  const batchSize = 5;

  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batch = jobIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (id) => {
        try {
          return { id, type: await checkApplyType(id) };
        } catch {
          return { id, type: 'easy_apply' as const }; // default on error
        }
      })
    );
    batchResults.forEach(r => results.set(r.id, r.type));
  }

  return results;
}
