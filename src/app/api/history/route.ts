import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { filenameToId } from '@/lib/format';

const OUTPUT_DIR = path.join(process.cwd(), 'data', 'output');

export async function GET() {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.startsWith('tailored-') && f.endsWith('.json'))
      .sort().reverse();

    const results = files.map(filename => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, filename), 'utf-8'));
        return {
          id: filenameToId(filename),
          filename,
          company: data.tailoredResume?.experience?.[0]?.company || data.parsedJob?.company || 'Unknown',
          title: data.parsedJob?.title || data.tailoredResume?.experience?.[0]?.title || 'Unknown',
          scoreBefore: data.scoreBefore?.overall ?? 0,
          scoreAfter: data.scoreAfter?.overall ?? 0,
          iterations: data.iterations ?? 0,
          generatedAt: data.generatedAt || filenameToId(filename),
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read history' }, { status: 500 });
  }
}
