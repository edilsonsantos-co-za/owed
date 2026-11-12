import { NextResponse, type NextRequest } from 'next/server';
import { FLOW_COOKIE, SESSION_COOKIE, authConfig, finishFlow, publicUrl, sessionMaxAge, signSession, type Flow } from '@/lib/auth';
import { sendEmail, welcomeEmail } from '@/lib/mail';
import { recordSignIn } from '@/lib/users';

const RESUME_COOKIE = 'owed_resume';

export async function GET(request: NextRequest) {
  const config = authConfig();
  if (!config) return NextResponse.redirect(publicUrl('/app', request));
  const base = config.baseUrl;
  const params = request.nextUrl.searchParams;
  let flow: Flow | null = null;
  try {
    flow = JSON.parse(request.cookies.get(FLOW_COOKIE)?.value ?? 'null');
  } catch {}
  const code = params.get('code');
  if (!flow || !code || params.get('state') !== flow.state) {
    // The person finished at Logto but this browser lost the flow (it took over an hour, or another tab
    // started a new one). Their Logto session is fresh, so start once more without a prompt: they land
    // signed in. RESUME_COOKIE stops a loop if that fails too.
    if (code && !request.cookies.get(RESUME_COOKIE)) {
      const res = NextResponse.redirect(`${base}/auth/sign-in?resume=1&returnTo=/app`);
      res.cookies.set(RESUME_COOKIE, '1', { httpOnly: true, secure: base.startsWith('https'), sameSite: 'lax', path: '/auth', maxAge: 120 });
      return res;
    }
    return NextResponse.redirect(`${base}/?auth=expired`);
  }
  try {
    const user = await finishFlow(config, code, flow);
    const isNew = await recordSignIn(user).catch((err) => {
      console.error('[owed] could not record sign-in', err);
      return false;
    });
    if (isNew && user.email) {
      await sendEmail(user.email, welcomeEmail({ name: user.name, email: user.email, appUrl: `${base}/app`, accountUrl: `${base}/account` }));
    }
    const res = NextResponse.redirect(`${base}${flow.returnTo}`);
    res.cookies.set(SESSION_COOKIE, await signSession(user, config.secret), {
      httpOnly: true,
      secure: base.startsWith('https'),
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });
    res.cookies.delete({ name: FLOW_COOKIE, path: '/auth' });
    res.cookies.delete({ name: RESUME_COOKIE, path: '/auth' });
    return res;
  } catch (err) {
    console.error('[owed] sign-in failed', err);
    return NextResponse.redirect(`${base}/?auth=failed`);
  }
}
