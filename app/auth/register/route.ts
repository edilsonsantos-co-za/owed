import { NextResponse, type NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const url = new URL('/auth/sign-in', request.url);
  url.searchParams.set('register', '1');
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(url);
}
