import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// Middleware — Route protection via signed session cookie
// Uses Web Crypto API (Edge Runtime compatible)
// ============================================================================

const HMAC_SECRET = process.env.SESSION_SECRET || 'tailor-resume-default-secret-change-me';
const SESSION_COOKIE = 'session';

async function verifyToken(token: string): Promise<{ valid: boolean; expired: boolean }> {
  const parts = token.split('|');
  if (parts.length !== 3) return { valid: false, expired: false };
  const [sessionId, expiresAt, sig] = parts;

  // HMAC-SHA256 using Web Crypto API
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(HMAC_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(`${sessionId}|${expiresAt}`));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (sig !== expected) return { valid: false, expired: false };
  if (new Date(expiresAt) < new Date()) return { valid: true, expired: true };
  return { valid: true, expired: false };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // Auth pages: redirect if already logged in, clear bad cookies
  if (pathname === '/login' || pathname === '/register') {
    if (token) {
      const { valid, expired } = await verifyToken(token);
      if (valid && !expired) {
        return NextResponse.redirect(new URL('/bidman', request.url));
      }
      // Invalid/expired token — clear it and let them see the login page
      const response = NextResponse.next();
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
    return NextResponse.next();
  }

  // Protected routes: require valid session
  const isApi = pathname.startsWith('/api/');

  if (!token) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { valid, expired } = await verifyToken(token);
  if (!valid || expired) {
    if (isApi) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/bidman/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/api/bidman/:path*',
    '/api/admin/:path*',
  ],
};
