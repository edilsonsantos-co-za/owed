import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, endSessionUrl } from '@/lib/auth';

export function GET(request: NextRequest) {
  const config = authConfig();
  const res = NextResponse.redirect(config ? endSessionUrl(config) : new URL('/', request.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
