import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, sessionMaxAge, signSession } from '@/lib/auth';
import { updateProfile } from '@/lib/logto-admin';
import { accountUser, backTo, toSignIn } from '../session';

// Name and username live in the DataSparkLab SSO (Logto), so a change shows in every app.
export async function POST(request: NextRequest) {
  const session = await accountUser(request);
  if (!session) return toSignIn(request);
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim().slice(0, 80);
  const username = String(form.get('username') ?? '').trim();
  const result = await updateProfile(session.user.sub, name, username).catch((err) => {
    console.error('[owed] profile update error', err);
    return 'failed' as const;
  });
  const res = backTo(request, 'profile', result);
  if (result === 'saved') {
    // The sidebar reads the name from the session cookie, so re-issue it with the new one
    const user = { ...session.user, name: name || username || undefined };
    res.cookies.set(SESSION_COOKIE, await signSession(user, session.config.secret), {
      httpOnly: true,
      secure: session.config.baseUrl.startsWith('https'),
      sameSite: 'lax',
      path: '/',
      maxAge: sessionMaxAge,
    });
  }
  return res;
}
