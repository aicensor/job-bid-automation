import { NextRequest, NextResponse } from 'next/server';
import { getDb, type DbUser } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as DbUser | undefined;

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    if (user.status === 'pending') {
      return NextResponse.json({ error: 'Your account is pending admin approval' }, { status: 403 });
    }

    if (user.status === 'disabled') {
      return NextResponse.json({ error: 'Your account has been disabled' }, { status: 403 });
    }

    const token = createSession(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, username: user.username, role: user.role },
      redirect: user.role === 'admin' ? '/admin' : '/bidman',
    });
  } catch (error) {
    console.error('[auth/login]', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
