import { NextResponse } from 'next/server';
import { getEntries, isRunning } from '@/lib/pipeline-log';

// GET /api/bidman/status — Real-time pipeline progress
export async function GET() {
  return NextResponse.json({
    running: isRunning(),
    entries: getEntries(),
  });
}
