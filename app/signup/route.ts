import { NextResponse, type NextRequest } from 'next/server';
import { publicUrl } from '@/lib/auth';

// Old links to Owed's own sign-up form go to the shared DataSparkLab sign-up instead.
export function GET(request: NextRequest) {
  const url = publicUrl('/auth/register', request);
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(url);
}
