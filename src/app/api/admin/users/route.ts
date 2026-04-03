import { NextResponse } from 'next/server';
import { getDb, type DbUser } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const users = db
    .prepare('SELECT id, username, role, status, created_at, updated_at FROM users ORDER BY created_at DESC')
    .all() as Omit<DbUser, 'password_hash'>[];

  return NextResponse.json(users);
}
