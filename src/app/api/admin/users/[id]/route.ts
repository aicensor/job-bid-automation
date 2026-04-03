import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// PATCH /api/admin/users/[id] — approve, disable, or enable a user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();

  if (!['approved', 'disabled', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const db = getDb();
  const result = db
    .prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ? AND id != ?")
    .run(status, id, user.id); // prevent self-disable

  if (result.changes === 0) {
    return NextResponse.json({ error: 'User not found or cannot modify own account' }, { status: 404 });
  }

  // If disabling, destroy their sessions
  if (status === 'disabled') {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/users/[id] — remove a user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const db = getDb();
  const target = db.prepare('SELECT role FROM users WHERE id = ?').get(Number(id)) as { role: string } | undefined;

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (target.role === 'admin') {
    return NextResponse.json({ error: 'Cannot delete admin accounts' }, { status: 400 });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(Number(id));
  return NextResponse.json({ success: true });
}
