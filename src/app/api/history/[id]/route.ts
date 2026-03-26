import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { idToFilename } from '@/lib/format';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filename = idToFilename(id);
    const filepath = path.join(OUTPUT_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 });
    }

    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return NextResponse.json({ id, ...data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read result' }, { status: 500 });
  }
}
