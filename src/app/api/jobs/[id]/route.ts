import { NextRequest, NextResponse } from 'next/server';
import { getJobDetail } from '@/core/scraper/linkedin-scraper';
import { resolveExternalLink } from '@/core/scraper/external-link-resolver';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid job ID' }, { status: 400 });
    }

    const detail = await getJobDetail(id);

    if (!detail.title) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // If external job, resolve the actual apply URL via Google + career page scrape
    // LinkedIn guest API never exposes the real external URL (only LinkedIn signup links)
    const hasRealUrl = detail.applyUrl && !detail.applyUrl.includes('linkedin.com');
    if (detail.applyType === 'external' && !hasRealUrl) {
      const resolved = await resolveExternalLink(detail.company, detail.title, id, detail.companyUrl);
      if (resolved.applyUrl) {
        detail.applyUrl = resolved.applyUrl;
      }
    }

    return NextResponse.json(detail);
  } catch (error) {
    console.error(`[api/jobs/${(await params).id}] Error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job detail' },
      { status: 500 }
    );
  }
}
