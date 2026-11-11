import { NextResponse, type NextRequest } from 'next/server';
import { FLOW_COOKIE, authConfig, publicUrl, startFlow } from '@/lib/auth';
import { createAccount, signUpEnabled } from '@/lib/logto-admin';

// GET: Owed's own sign-up form when the Logto M2M app is configured, else Logto's hosted sign-up.
export function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('returnTo');
  const url = publicUrl(signUpEnabled() ? '/signup' : '/auth/sign-in', request);
  if (!signUpEnabled()) url.searchParams.set('register', '1');
  if (returnTo) url.searchParams.set('returnTo', returnTo);
  return NextResponse.redirect(url);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const attempts = new Map<string, number[]>();
function allowed(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const mine = (attempts.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (mine.length >= 10) return false;
  attempts.set(ip, [...mine, now]);
  return true;
}

// POST from /signup: create the account in Logto, then sign in with a one-time token (no email sent).
export async function POST(request: NextRequest) {
  const config = authConfig();
  const back = (error: string) => NextResponse.redirect(publicUrl(`/signup?error=${error}`, request), 303);
  if (!config || !signUpEnabled()) return NextResponse.redirect(publicUrl('/auth/register', request), 303);

  const form = await request.formData();
  if (form.get('website')) return back('failed'); // honeypot
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const name = String(form.get('name') ?? '').trim().slice(0, 80) || undefined;
  if (!EMAIL.test(email) || email.length > 254) return back('email');
  if (password.length < 8 || password.length > 256) return back('password');
  if (!allowed(request)) return back('limit');

  const result = await createAccount(email, password, name).catch((err) => {
    console.error('[owed] sign-up error', err);
    return { ok: false as const, error: 'failed' as const };
  });
  if (!result.ok) return back(result.error);

  const { url, flow } = await startFlow(config, { oneTimeToken: result.oneTimeToken, loginHint: email });
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(FLOW_COOKIE, JSON.stringify(flow), {
    httpOnly: true,
    secure: config.baseUrl.startsWith('https'),
    sameSite: 'lax',
    path: '/auth',
    maxAge: 600,
  });
  return res;
}
