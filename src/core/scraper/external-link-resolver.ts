// ============================================================================
// External Apply Link Resolver — 4-Tier Fallback Chain
//
// Tier 0: LinkedIn Voyager API (instant, 100% accurate when authenticated)
// Tier 1: Serper.dev API (Google search → structured JSON, ~70-80% hit rate)
// Tier 2: ATS URL pattern probing (parallel HEAD requests, free)
// Tier 3: Patchwright browser (JS rendering for career pages)
// ============================================================================

// --- Types ---

export interface ResolverResult {
  applyUrl: string | null;
  source: 'voyager' | 'serper' | 'ats_probe' | 'browser' | 'cache' | null;
  confidence: 'high' | 'medium' | 'low';
}

// --- Tier 0: LinkedIn Voyager API ---

async function resolveViaVoyager(jobId: string): Promise<string | null> {
  const liAt = process.env.LINKEDIN_LI_AT;
  const jsessionId = process.env.LINKEDIN_JSESSIONID;

  if (!liAt) {
    console.warn('[resolver] No LINKEDIN_LI_AT set, skipping Voyager API');
    return null;
  }

  try {
    const csrfToken = jsessionId || 'ajax:0';
    const res = await fetch(
      `https://www.linkedin.com/voyager/api/jobs/jobPostings/${jobId}`,
      {
        headers: {
          'Cookie': `li_at=${liAt}; JSESSIONID="${csrfToken}"`,
          'csrf-token': csrfToken,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/vnd.linkedin.normalized+json+2.1',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      console.warn(`[resolver] Voyager API returned ${res.status}`);
      return null;
    }

    const data = await res.json();
    const applyMethod = data?.data?.applyMethod;

    if (applyMethod?.companyApplyUrl) {
      console.log(`[resolver] Voyager found: ${applyMethod.companyApplyUrl}`);
      return applyMethod.companyApplyUrl;
    }

    // It's an Easy Apply job — no external URL
    if (applyMethod?.$type?.includes('OnsiteApply')) {
      console.log(`[resolver] Voyager: Easy Apply job, no external URL`);
      return null;
    }

    return null;
  } catch (error) {
    console.warn('[resolver] Voyager API failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

// --- Cache ---

const cache = new Map<string, { result: ResolverResult; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// --- Known ATS URL patterns ---

const ATS_PATTERNS = [
  (slug: string) => `https://boards.greenhouse.io/${slug}`,
  (slug: string) => `https://job-boards.greenhouse.io/${slug}`,
  (slug: string) => `https://jobs.lever.co/${slug}`,
  (slug: string) => `https://jobs.ashbyhq.com/${slug}`,
  (slug: string) => `https://apply.workable.com/${slug}`,
  (slug: string) => `https://${slug}.bamboohr.com/careers`,
  (slug: string) => `https://${slug}.breezy.hr`,
  (slug: string) => `https://careers.smartrecruiters.com/${slug}`,
  (slug: string) => `https://jobs.jobvite.com/${slug}`,
  (slug: string) => `https://app.dover.com/apply/${slug}`,
  (slug: string) => `https://ats.rippling.com/${slug}`,
  (slug: string) => `https://wellfound.com/company/${slug}/jobs`,
];

// Company site career paths to probe
const CAREER_PATHS = ['/careers', '/jobs', '/open-positions', '/join-us'];

// ATS domains for scoring Serper results
const ATS_DOMAINS = [
  'greenhouse.io', 'lever.co', 'ashbyhq.com', 'workable.com',
  'myworkdayjobs.com', 'icims.com', 'jobvite.com', 'smartrecruiters.com',
  'bamboohr.com', 'breezy.hr', 'dover.com', 'wellfound.com', 'rippling.com',
];

// Skip these domains in Serper results
const SKIP_DOMAINS = [
  'linkedin.com', 'indeed.com', 'glassdoor.com', 'ziprecruiter.com',
  'google.com', 'bing.com', 'wikipedia.org', 'crunchbase.com',
  'salary.com', 'comparably.com', 'levels.fyi',
  'pitchmeai.com', 'jobilize.com', 'jobleads.com', 'jobtoday.com',
  'talent.com', 'adzuna.com', 'simplyhired.com', 'monster.com',
  'careerbuilder.com', 'dice.com', 'hired.com', 'triplebyte.com',
  'workatastartup.com', 'builtin.com', 'themuse.com',
  'lensa.com', 'jobgether.com', 'remotive.com', 'weworkremotely.com',
  'vaia.com', 'talents.vaia.com', 'aitrainer.work', 'flexjobs.com',
  'snagajob.com', 'getonbrd.com', 'angel.co', 'turing.com',
];

// --- Tier 1: Serper.dev API ---

async function searchSerper(
  company: string,
  title: string,
  companySlugFromLinkedIn?: string
): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    console.warn('[resolver] No SERPER_API_KEY set, skipping Tier 1');
    return null;
  }

  try {
    const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Use LinkedIn company slug for a more targeted search (e.g., "askethos" for "Ethos")
    const linkedInSlug = companySlugFromLinkedIn || companySlug;

    const queries: string[] = [
      // Query 1: Company careers page search
      `"${company}" "${title}" careers OR jobs OR apply -site:linkedin.com -site:indeed.com -site:glassdoor.com`,
    ];
    // Query 2: If LinkedIn slug differs from company name, search with it too
    if (linkedInSlug !== companySlug) {
      queries.push(`${linkedInSlug} "${title}" careers OR jobs OR apply -site:linkedin.com -site:indeed.com -site:glassdoor.com`);
    }
    // Query 3: Try ATS-focused search
    queries.push(`"${company}" "${title}" site:greenhouse.io OR site:lever.co OR site:ashbyhq.com OR site:workable.com OR site:bamboohr.com`);

    const results = await Promise.all(
      queries.map(q =>
        fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q, num: 5 }),
          signal: AbortSignal.timeout(8000),
        })
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    );

    // Collect all organic results
    const allLinks: Array<{ title: string; link: string; snippet: string }> = [];
    for (const result of results) {
      if (result?.organic) {
        allLinks.push(...result.organic);
      }
    }

    if (allLinks.length === 0) return null;

    // Score and rank links
    let bestLink: string | null = null;
    let bestScore = 0;

    // Also check for company's own domain (e.g., underdog.io → domain is "underdog.io")
    const companyDomainClean = company.toLowerCase().replace(/[^a-z0-9.]/g, '');

    for (const item of allLinks) {
      const linkLower = item.link.toLowerCase();

      // Skip job boards and aggregators
      if (SKIP_DOMAINS.some(d => linkLower.includes(d))) continue;

      let score = 0;

      const isAts = ATS_DOMAINS.some(d => linkLower.includes(d));

      // Check if link is on the company's OWN domain (highest priority)
      // Match by company display name AND LinkedIn slug (e.g., "Ethos" + "askethos")
      let isCompanyDomain = false;
      try {
        const linkHost = new URL(item.link).hostname.replace('www.', '');
        isCompanyDomain = linkHost.includes(companySlug)
          || linkHost === companyDomainClean
          || (linkedInSlug ? linkHost.includes(linkedInSlug) : false);
      } catch { /* skip */ }

      const hasCompanyInPath = linkLower.includes(companySlug)
        || (linkedInSlug ? linkLower.includes(linkedInSlug) : false);

      // Company's own domain with /jobs/ or /careers/ path = highest
      if (isCompanyDomain && (linkLower.includes('/jobs/') || linkLower.includes('/careers/'))) score = 110;
      // Company's own domain with /jobs or /careers
      else if (isCompanyDomain && (linkLower.includes('/jobs') || linkLower.includes('/careers'))) score = 105;
      // ATS domain with company name in URL
      else if (isAts && hasCompanyInPath) score = 100;
      // Company's own domain (any page)
      else if (isCompanyDomain) score = 95;
      // ATS domain without company name
      else if (isAts) score = 50;
      // Company name in path on third-party site (aggregators like pitchmeai)
      else if (hasCompanyInPath) score = 20;
      // Skip everything else
      else continue;

      // Bonus: title words in link text/snippet
      const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const textToCheck = `${item.title} ${item.snippet}`.toLowerCase();
      const titleMatchCount = titleWords.filter(w => textToCheck.includes(w)).length;
      score += titleMatchCount * 5;

      if (score > bestScore) {
        bestScore = score;
        bestLink = item.link;
      }
    }

    if (bestLink) {
      console.log(`[resolver] Serper found: ${bestLink} (score: ${bestScore})`);
    }

    return bestLink;
  } catch (error) {
    console.warn('[resolver] Serper search failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

// --- Tier 2: ATS URL Pattern Probing ---

async function probeAtsUrls(company: string, linkedInSlug?: string): Promise<string[]> {
  // Clean company name: "Underdog.io" → "underdog", "ESHYFT" → "eshyft"
  // Strip domain suffixes (.io, .com, .ai, etc.) and non-alpha chars
  const cleaned = company.toLowerCase()
    .replace(/\.(io|com|ai|co|dev|app|tech|org|net|xyz)$/i, '') // strip TLD suffixes
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
  const slug = cleaned.replace(/\s+/g, '-');
  const slugNoHyphens = cleaned.replace(/[\s-]/g, '');

  // Generate all candidate URLs with multiple slug variants
  // Include LinkedIn slug if different (e.g., "askethos" for company name "Ethos")
  const slugs = [...new Set([slug, slugNoHyphens, ...(linkedInSlug ? [linkedInSlug] : [])])];
  const candidates: string[] = [];
  for (const s of slugs) {
    for (const pattern of ATS_PATTERNS) {
      candidates.push(pattern(s));
    }
  }

  // Also try company domain + career paths (with original TLD if present)
  const domainBase = company.toLowerCase().replace(/[^a-z0-9.-]/g, '');
  const hasTld = /\.(io|com|ai|co|dev|app|tech)$/i.test(company);
  const companyDomains = hasTld
    ? [`https://${domainBase}`, `https://www.${domainBase}`]
    : [`https://${slugNoHyphens}.com`, `https://www.${slugNoHyphens}.com`, `https://${slugNoHyphens}.io`];
  // Also try LinkedIn slug as domain
  if (linkedInSlug && linkedInSlug !== slugNoHyphens) {
    companyDomains.push(`https://${linkedInSlug}.com`, `https://agent.${linkedInSlug}.com`);
  }
  for (const domain of companyDomains) {
    for (const path of CAREER_PATHS) {
      candidates.push(`${domain}${path}`);
    }
  }

  console.log(`[resolver] Probing ${candidates.length} ATS URLs for "${company}"...`);

  // Parallel HEAD requests with short timeout
  const results = await Promise.allSettled(
    candidates.map(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        return { url, status: res.status, finalUrl: res.url };
      } catch {
        return { url, status: 0, finalUrl: url };
      }
    })
  );

  // Collect URLs that returned 200 or 301/302
  const validUrls: string[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { url, status, finalUrl } = result.value;
      if (status >= 200 && status < 400) {
        validUrls.push(finalUrl || url);
        console.log(`[resolver] ATS probe hit: ${url} → ${status}`);
      }
    }
  }

  return validUrls;
}

// --- Tier 3: Patchwright Browser (lazy loaded) ---

let browserResolverLoaded = false;
let browserResolve: ((url: string, title: string) => Promise<string | null>) | null = null;

async function loadBrowserResolver() {
  if (browserResolverLoaded) return browserResolve;
  try {
    const mod = await import('./browser-resolver');
    browserResolve = mod.resolveWithBrowser;
    browserResolverLoaded = true;
    return browserResolve;
  } catch (error) {
    console.warn('[resolver] Patchwright not available, skipping Tier 3:', error instanceof Error ? error.message : error);
    browserResolverLoaded = true;
    browserResolve = null;
    return null;
  }
}

// --- Main Resolver ---

export async function resolveExternalLink(
  company: string,
  title: string,
  jobId: string,
  companyLinkedInUrl?: string
): Promise<ResolverResult> {
  const cacheKey = `${company}:${title}:${jobId}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { ...cached.result, source: 'cache' };
  }

  // Extract LinkedIn company slug from URL (e.g., "/company/askethos" → "askethos")
  const linkedInSlug = companyLinkedInUrl
    ?.match(/\/company\/([^/?]+)/)?.[1]
    ?.toLowerCase();

  console.log(`[resolver] Resolving external link for "${title}" at ${company}${linkedInSlug ? ` (slug: ${linkedInSlug})` : ''}`);

  // --- Tier 0: LinkedIn Voyager API (instant, 100% accurate) ---
  const voyagerResult = await resolveViaVoyager(jobId);
  if (voyagerResult) {
    const result: ResolverResult = { applyUrl: voyagerResult, source: 'voyager', confidence: 'high' };
    cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // --- Tier 1: Serper.dev ---
  const serperResult = await searchSerper(company, title, linkedInSlug);
  if (serperResult) {
    const result: ResolverResult = { applyUrl: serperResult, source: 'serper', confidence: 'high' };
    cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // --- Tier 2: ATS URL Probing ---
  const atsUrls = await probeAtsUrls(company, linkedInSlug);
  if (atsUrls.length > 0) {
    // Return the first valid ATS URL (prefer greenhouse/lever/ashby)
    const prioritized = atsUrls.sort((a, b) => {
      const aScore = ATS_DOMAINS.findIndex(d => a.includes(d));
      const bScore = ATS_DOMAINS.findIndex(d => b.includes(d));
      return (aScore === -1 ? 99 : aScore) - (bScore === -1 ? 99 : bScore);
    });

    const result: ResolverResult = { applyUrl: prioritized[0], source: 'ats_probe', confidence: 'medium' };
    cache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  // --- Tier 3: Patchwright Browser ---
  const browserFn = await loadBrowserResolver();
  if (browserFn) {
    // Try company careers page
    const companySlug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const careerUrls = [
      `https://${companySlug}.com/careers`,
      `https://www.${companySlug}.com/careers`,
      `https://${companySlug}.com/jobs`,
    ];

    for (const url of careerUrls) {
      try {
        const found = await browserFn(url, title);
        if (found) {
          const result: ResolverResult = { applyUrl: found, source: 'browser', confidence: 'medium' };
          cache.set(cacheKey, { result, timestamp: Date.now() });
          return result;
        }
      } catch {
        continue;
      }
    }
  }

  // --- No result ---
  console.log(`[resolver] No external link found for ${company} - ${title}`);
  const result: ResolverResult = { applyUrl: null, source: null, confidence: 'low' };
  cache.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

// --- Batch Resolver ---

export async function resolveExternalLinks(
  jobs: Array<{ company: string; title: string; jobId: string }>
): Promise<Map<string, ResolverResult>> {
  const results = new Map<string, ResolverResult>();
  const batchSize = 3;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(j => resolveExternalLink(j.company, j.title, j.jobId))
    );
    batch.forEach((job, idx) => results.set(job.jobId, batchResults[idx]));

    if (i + batchSize < jobs.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
