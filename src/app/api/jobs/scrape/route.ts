import { NextRequest, NextResponse } from 'next/server';
import { scrapeJobUrl } from '@/core/scraper/universal-scraper';

export const maxDuration = 120; // 120s — page loading (redirects) + LLM extraction

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    const result = await scrapeJobUrl(url);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json(result.job);
  } catch (error) {
    console.error('[api/jobs/scrape] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scrape failed' },
      { status: 500 }
    );
  }
}
