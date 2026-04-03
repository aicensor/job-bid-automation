import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const hash = hashPassword(password);
    db.prepare(
      'INSERT INTO users (username, password_hash, role, status) VALUES (?, ?, ?, ?)'
    ).run(username, hash, 'bidman', 'pending');

    return NextResponse.json({ message: 'Registration successful. Please wait for admin approval.' });
  } catch (error) {
    console.error('[auth/register]', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
