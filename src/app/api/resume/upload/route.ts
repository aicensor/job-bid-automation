import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BASE_RESUME_DIR = path.join(process.cwd(), 'data', 'base-resume');

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx'].includes(ext || '')) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are supported' }, { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Ensure directory exists
    fs.mkdirSync(BASE_RESUME_DIR, { recursive: true });

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name;
    const filePath = path.join(BASE_RESUME_DIR, filename);

    fs.writeFileSync(filePath, buffer);

    return NextResponse.json({
      success: true,
      filename,
      size: file.size,
      path: filePath,
    });
  } catch (error) {
    console.error('[api/resume/upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
