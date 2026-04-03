import { NextRequest, NextResponse } from 'next/server';
import { getDb, type DbResumeAssignment } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// GET /api/admin/assignments?userId=X — list assignments for a user (or all)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const userId = req.nextUrl.searchParams.get('userId');

  if (userId) {
    const assignments = db
      .prepare('SELECT * FROM resume_assignments WHERE user_id = ? ORDER BY created_at')
      .all(Number(userId)) as DbResumeAssignment[];
    return NextResponse.json(assignments);
  }

  const assignments = db
    .prepare(
      `SELECT ra.*, u.username FROM resume_assignments ra
       JOIN users u ON u.id = ra.user_id
       ORDER BY u.username, ra.created_at`
    )
    .all();
  return NextResponse.json(assignments);
}

// POST /api/admin/assignments — assign resume to user
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, resumeFilename, tailoringInstructions, strictTruthCheck } = await req.json();

  if (!userId || !resumeFilename) {
    return NextResponse.json({ error: 'userId and resumeFilename required' }, { status: 400 });
  }

  const db = getDb();
  const strictVal = strictTruthCheck === false ? 0 : 1;
  try {
    db.prepare(
      `INSERT INTO resume_assignments (user_id, resume_filename, tailoring_instructions, strict_truth_check)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, resume_filename) DO UPDATE SET
       tailoring_instructions = excluded.tailoring_instructions,
       strict_truth_check = excluded.strict_truth_check`
    ).run(Number(userId), resumeFilename, tailoringInstructions || '', strictVal);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Assignment failed' }, { status: 500 });
  }
}

// DELETE /api/admin/assignments — remove assignment
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, resumeFilename } = await req.json();

  const db = getDb();
  db.prepare('DELETE FROM resume_assignments WHERE user_id = ? AND resume_filename = ?').run(
    Number(userId),
    resumeFilename
  );

  return NextResponse.json({ success: true });
}
