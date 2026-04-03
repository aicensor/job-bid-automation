import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser, hashPassword } from '@/lib/auth';

// PATCH /api/admin/users/[id]/password — change a user's password
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const db = getDb();
  const hash = hashPassword(password);
  const result = db
    .prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hash, Number(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Destroy their sessions so they must re-login
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(Number(id));

  return NextResponse.json({ success: true });
}
