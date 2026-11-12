import { NextResponse, type NextRequest } from 'next/server';
import { FLOW_COOKIE, authConfig, publicUrl, safeReturn, startFlow } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const config = authConfig();
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (!config) return NextResponse.redirect(publicUrl(safeReturn(returnTo), request));
  const { url, flow } = await startFlow(config, {
    register: request.nextUrl.searchParams.get('register') === '1',
    returnTo: returnTo ?? undefined,
    resume: request.nextUrl.searchParams.get('resume') === '1',
  });
  const res = NextResponse.redirect(url);
  res.cookies.set(FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: config.baseUrl.startsWith('https'),
    sameSite: 'lax',
    path: '/auth',
    // Sign-up (email, code from the inbox, password) can take a while: keep the flow for an hour
    maxAge: 3600,
  });
  return res;
}
