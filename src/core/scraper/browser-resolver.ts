// ============================================================================
// Patchwright Browser Resolver — Tier 3
// Uses undetected Playwright (Patchright) to render JS career pages
// and find specific job posting links
// ============================================================================

let chromium: any = null;

async function getBrowser() {
  if (!chromium) {
    try {
      const patchright = await import('patchright');
      chromium = patchright.chromium;
    } catch {
      throw new Error('Patchright not installed. Run: npm i patchright && npx patchright install chromium');
    }
  }
  return chromium;
}

/**
 * Visit a URL, render JS, and find a job posting link matching the title.
 * Returns the direct job URL or null.
 */
export async function resolveWithBrowser(
  url: string,
  jobTitle: string
): Promise<string | null> {
  const browser = await getBrowser();
  const instance = await browser.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });

  try {
    const context = await instance.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate with timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait for dynamic content
    await page.waitForTimeout(2000);

    // Get all links on the page
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.href,
        text: a.textContent?.trim() || '',
      }));
    });

    // Score links by title word match
    const titleWords = jobTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    let bestLink: string | null = null;
    let bestScore = 0;

    for (const link of links) {
      if (!link.href || link.href === '#' || link.href.startsWith('javascript:')) continue;
      if (link.href.includes('linkedin.com') || link.href.includes('indeed.com')) continue;

      const textLower = link.text.toLowerCase();
      const hrefLower = link.href.toLowerCase();

      // Count title word matches in link text and URL
      const textMatches = titleWords.filter(w => textLower.includes(w)).length;
      const urlMatches = titleWords.filter(w => hrefLower.includes(w)).length;
      const score = textMatches * 2 + urlMatches;

      // Must match at least 40% of title words
      if (score > bestScore && textMatches >= titleWords.length * 0.4) {
        bestScore = score;
        bestLink = link.href;
      }
    }

    if (bestLink) {
      console.log(`[browser-resolver] Found job link: ${bestLink} (score: ${bestScore})`);
    } else {
      // If no specific job link found, check if the current page IS the job page
      const pageTitle = await page.title();
      const pageText = await page.evaluate(() => document.body.innerText.substring(0, 2000));
      const pageLower = `${pageTitle} ${pageText}`.toLowerCase();

      const pageMatchCount = titleWords.filter(w => pageLower.includes(w)).length;
      if (pageMatchCount >= titleWords.length * 0.5) {
        // The URL itself is the job page
        bestLink = page.url();
        console.log(`[browser-resolver] Current page IS the job: ${bestLink}`);
      }
    }

    await context.close();
    return bestLink;
  } catch (error) {
    console.warn('[browser-resolver] Error:', error instanceof Error ? error.message : error);
    return null;
  } finally {
    await instance.close();
  }
}
