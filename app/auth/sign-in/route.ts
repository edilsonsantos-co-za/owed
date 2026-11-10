import { NextResponse, type NextRequest } from 'next/server';
import { FLOW_COOKIE, authConfig, safeReturn, startFlow } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const config = authConfig();
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  if (!config) return NextResponse.redirect(new URL(safeReturn(returnTo), request.url));
  const { url, flow } = await startFlow(config, {
    register: request.nextUrl.searchParams.get('register') === '1',
    returnTo: returnTo ?? undefined,
  });
  const res = NextResponse.redirect(url);
  res.cookies.set(FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: config.baseUrl.startsWith('https'),
    sameSite: 'lax',
    path: '/auth',
    maxAge: 600,
  });
  return res;
}
