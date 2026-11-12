import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authEnabled, publicUrl, readSession } from '@/lib/auth';

// The landing page, auth routes and health check are public; the app and its API need an SSO session.
export async function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (user) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Sign in to use Owed.' }, { status: 401 });
  }
  const url = publicUrl('/auth/sign-in', request);
  url.searchParams.set('returnTo', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/app/:path*', '/admin/:path*', '/account', '/api/((?!health).*)'],
};
