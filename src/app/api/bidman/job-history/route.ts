import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET — list job search history for current user
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM job_search_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(user.id);

  return NextResponse.json(rows);
}

// POST — save a scraped job to history
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { jobUrl, jobTitle, company, techStacks, industry, jobData } = await req.json();

  if (!jobUrl || !jobTitle) {
    return NextResponse.json({ error: 'jobUrl and jobTitle required' }, { status: 400 });
  }

  const db = getDb();

  // Avoid duplicates — update if same URL exists for this user
  const existing = db
    .prepare('SELECT id FROM job_search_history WHERE user_id = ? AND job_url = ?')
    .get(user.id, jobUrl) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      'UPDATE job_search_history SET job_title = ?, company = ?, tech_stacks = ?, industry = ?, job_data = ?, created_at = datetime(\'now\') WHERE id = ?'
    ).run(jobTitle, company || '', techStacks || '', industry || '', JSON.stringify(jobData), existing.id);
  } else {
    db.prepare(
      'INSERT INTO job_search_history (user_id, job_url, job_title, company, tech_stacks, industry, job_data) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(user.id, jobUrl, jobTitle, company || '', techStacks || '', industry || '', JSON.stringify(jobData));
  }

  return NextResponse.json({ success: true });
}

// DELETE — clear history
export async function DELETE() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  db.prepare('DELETE FROM job_search_history WHERE user_id = ?').run(user.id);

  return NextResponse.json({ success: true });
}
