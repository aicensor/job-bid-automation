import { NextRequest, NextResponse } from 'next/server';
import { searchJobsBatch, batchCheckApplyTypes, type JobSearchParams } from '@/core/scraper/linkedin-scraper';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '25');
    const externalOnly = searchParams.get('externalOnly') === 'true';

    const params: JobSearchParams = {
      keywords: searchParams.get('keywords') || 'senior software engineer',
      location: searchParams.get('location') || 'United States',
      workType: (searchParams.get('workType') as JobSearchParams['workType']) || undefined,
      datePosted: (searchParams.get('datePosted') as JobSearchParams['datePosted']) || '24hr',
      page: parseInt(searchParams.get('page') || '0'),
    };

    // Salary filter
    const salary = searchParams.get('salary');
    if (salary) {
      params.salary = salary;
    }

    // Parse experience levels
    const expLevels = searchParams.get('experienceLevel');
    if (expLevels) {
      params.experienceLevel = expLevels.split(',') as JobSearchParams['experienceLevel'];
    }

    // Parse job types
    const jobTypes = searchParams.get('jobType');
    if (jobTypes) {
      params.jobType = jobTypes.split(',') as JobSearchParams['jobType'];
    }

    // Fetch more pages if filtering by external (some will be filtered out)
    const fetchMultiplier = externalOnly ? 3 : 1;
    const maxPages = Math.ceil((limit * fetchMultiplier) / 10);
    const allJobs = await searchJobsBatch(params, maxPages);

    let finalJobs = allJobs;

    // If externalOnly, batch-check apply types and filter
    if (externalOnly && allJobs.length > 0) {
      console.log(`[search] Checking apply types for ${allJobs.length} jobs...`);
      const applyTypes = await batchCheckApplyTypes(allJobs.map(j => j.jobId));

      finalJobs = allJobs
        .filter(j => applyTypes.get(j.jobId) === 'external')
        .map(j => ({ ...j, applyType: 'external' as const }));

      console.log(`[search] ${finalJobs.length}/${allJobs.length} are external`);
    }

    const trimmed = finalJobs.slice(0, limit);

    return NextResponse.json({
      jobs: trimmed,
      total: trimmed.length,
      page: 0,
      hasMore: finalJobs.length > limit,
    });
  } catch (error) {
    console.error('[api/jobs/search] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Search failed' },
      { status: 500 }
    );
  }
}
