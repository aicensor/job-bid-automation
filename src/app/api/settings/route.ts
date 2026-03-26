import { NextRequest, NextResponse } from 'next/server';
import { loadAutoQueueConfig, saveAutoQueueConfig } from '@/lib/auto-queue';

// GET /api/settings — get all settings
export async function GET() {
  const autoQueue = loadAutoQueueConfig();
  return NextResponse.json({ autoQueue });
}

// PUT /api/settings — update settings
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.autoQueue) {
      const current = loadAutoQueueConfig();
      const updated = {
        ...current,
        ...body.autoQueue,
        search: { ...current.search, ...body.autoQueue.search },
        filter: { ...current.filter, ...body.autoQueue.filter },
        autoRun: { ...current.autoRun, ...body.autoQueue.autoRun },
      };
      saveAutoQueueConfig(updated);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}
