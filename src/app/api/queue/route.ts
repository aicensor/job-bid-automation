import { NextRequest, NextResponse } from 'next/server';
import { loadQueue, addToQueue, clearCompleted } from '@/lib/queue';

// GET /api/queue — list all queued jobs
export async function GET() {
  const jobs = loadQueue();
  return NextResponse.json({ jobs });
}

// POST /api/queue — add a job to the queue
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobId, title, company, location, jobUrl, applyUrl, description } = body;

    if (!jobId || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields: jobId, title, description' }, { status: 400 });
    }

    const job = addToQueue({
      jobId,
      title,
      company: company || '',
      location: location || '',
      jobUrl: jobUrl || `https://www.linkedin.com/jobs/view/${jobId}`,
      applyUrl,
      description,
    });

    return NextResponse.json({ success: true, job });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to add to queue';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

// DELETE /api/queue — clear completed/failed jobs
export async function DELETE() {
  const removed = clearCompleted();
  return NextResponse.json({ success: true, removed });
}
