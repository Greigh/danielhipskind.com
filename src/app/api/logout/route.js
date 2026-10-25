import { NextResponse } from 'next/server';
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth';

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out' });
  res.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
