import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, endSessionUrl, publicUrl } from '@/lib/auth';

export function GET(request: NextRequest) {
  const config = authConfig();
  const res = NextResponse.redirect(config ? endSessionUrl(config) : publicUrl('/', request));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
