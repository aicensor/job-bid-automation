import { randomBytes, createHmac } from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb, type DbUser } from './db';

// ============================================================================
// Auth — Password hashing, sessions, cookie management
// ============================================================================

const SESSION_COOKIE = 'session';
const SESSION_TTL_HOURS = 24 * 7; // 7 days
const HMAC_SECRET = process.env.SESSION_SECRET || 'tailor-resume-default-secret-change-me';

// --- Password ---

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

// --- Sessions ---

function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

function signToken(sessionId: string, expiresAt: string): string {
  const payload = `${sessionId}|${expiresAt}`;
  const sig = createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
  return `${payload}|${sig}`;
}

function verifyToken(token: string): { sessionId: string; expiresAt: string } | null {
  const parts = token.split('|');
  if (parts.length !== 3) return null;
  const [sessionId, expiresAt, sig] = parts;
  const expected = createHmac('sha256', HMAC_SECRET).update(`${sessionId}|${expiresAt}`).digest('hex');
  if (sig !== expected) return null;
  if (new Date(expiresAt) < new Date()) return null;
  return { sessionId, expiresAt };
}

export function createSession(userId: number): string {
  const db = getDb();
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString();

  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(
    sessionId,
    userId,
    expiresAt
  );

  // Clean up expired sessions
  db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

  return signToken(sessionId, expiresAt);
}

export function destroySession(token: string): void {
  const parsed = verifyToken(token);
  if (!parsed) return;
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE id = ?').run(parsed.sessionId);
}

export function getUserFromToken(token: string): DbUser | null {
  const parsed = verifyToken(token);
  if (!parsed) return null;

  const db = getDb();
  const user = db
    .prepare(
      `SELECT u.* FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE s.id = ? AND s.expires_at > datetime('now') AND u.status = 'approved'`
    )
    .get(parsed.sessionId) as DbUser | undefined;

  return user || null;
}

// --- Cookie helpers (for use in server components / API routes) ---

export async function getSessionUser(): Promise<DbUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserFromToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) destroySession(token);
  cookieStore.delete(SESSION_COOKIE);
}
