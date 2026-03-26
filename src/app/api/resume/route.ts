import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_RESUME_DIR = path.join(process.cwd(), 'data', 'base-resume');

export async function GET() {
  try {
    if (!fs.existsSync(BASE_RESUME_DIR)) {
      return NextResponse.json({ error: 'No base resume directory' }, { status: 404 });
    }

    const files = fs.readdirSync(BASE_RESUME_DIR)
      .filter(f => f.endsWith('.pdf') || f.endsWith('.docx') || f.endsWith('.json'));

    if (files.length === 0) {
      return NextResponse.json({ error: 'No base resume found' }, { status: 404 });
    }

    // Return file info (parsing happens during tailoring)
    return NextResponse.json({
      files: files.map(f => ({
        name: f,
        path: path.join(BASE_RESUME_DIR, f),
        size: fs.statSync(path.join(BASE_RESUME_DIR, f)).size,
      })),
      primary: files[0],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read base resume' }, { status: 500 });
  }
}
