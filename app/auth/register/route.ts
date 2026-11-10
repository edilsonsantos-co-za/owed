import { NextResponse, type NextRequest } from 'next/server';
import { publicUrl } from '@/lib/auth';

export function GET(request: NextRequest) {
  const url = publicUrl('/auth/sign-in', request);
  url.searchParams.set('register', '1');
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(url);
}
