import { NextRequest, NextResponse } from 'next/server';
import { removeFromQueue } from '@/lib/queue';

// DELETE /api/queue/[id] — remove a specific job from queue
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const removed = removeFromQueue(id);

  if (!removed) {
    return NextResponse.json({ error: 'Job not found in queue' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
