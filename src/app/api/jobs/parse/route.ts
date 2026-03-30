import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { getModel, defaultConfig } from '@/ai/providers';
import { scrapedJobSchema } from '@/core/scraper/universal-scraper';

export const maxDuration = 60;

// ============================================================================
// POST /api/jobs/parse — Extract structured job fields from raw text
// Used when the server can't scrape the URL directly (CDN blocks, etc.)
// The client fetches the page text and sends it here for LLM extraction.
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, url } = body as { text: string; url: string };

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    if (text.length < 50) {
      return NextResponse.json(
        { error: 'Job description text is too short' },
        { status: 400 }
      );
    }

    const { model } = getModel('parse', defaultConfig);

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

The job URL is: ${url || 'unknown'}`,
      prompt: `Extract structured job information from this page:\n\n${text.substring(0, 15000)}`,
      temperature: 0.2,
    });

    return NextResponse.json({
      ...object,
      url: url || '',
      scrapedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[api/jobs/parse] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Parse failed' },
      { status: 500 }
    );
  }
}
