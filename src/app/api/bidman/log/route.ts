import { NextRequest, NextResponse } from 'next/server';
import { getLogEntries } from '@/lib/bidman-log';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    // If ?resultId= is provided, return the full tailored result JSON
    const resultId = req.nextUrl.searchParams.get('resultId');
    if (resultId) {
      const resultPath = path.join(process.cwd(), 'data', 'output', `tailored-${resultId}.json`);
      if (!fs.existsSync(resultPath)) {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 });
      }
      const data = JSON.parse(fs.readFileSync(resultPath, 'utf-8'));
      return NextResponse.json(data);
    }

    const entries = getLogEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error('[api/bidman/log] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load log' },
      { status: 500 }
    );
  }
}
