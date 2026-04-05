import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ redirect: '/login' });
}

// GET support for redirect-based logout (stale cookie cleanup)
export async function GET(req: NextRequest) {
  await clearSessionCookie();
  const redirectTo = req.nextUrl.searchParams.get('redirect') || '/login';
  return NextResponse.redirect(new URL(redirectTo, req.url));
}
