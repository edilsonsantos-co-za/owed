import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, publicUrl, readSession } from '@/lib/auth';

/** The signed-in person for an /account form post, or null (the caller then redirects to sign-in). */
export async function accountUser(request: NextRequest) {
  const config = authConfig();
  const user = config ? await readSession(request.cookies.get(SESSION_COOKIE)?.value) : null;
  return config && user ? { config, user } : null;
}

/** Back to the profile page with a result code for the notice (303 so the browser follows with a GET). */
export const backTo = (request: NextRequest, key: 'profile' | 'password' | 'error', value: string) =>
  NextResponse.redirect(publicUrl(`/account?${key}=${value}`, request), 303);

export const toSignIn = (request: NextRequest) => NextResponse.redirect(publicUrl('/auth/sign-in?returnTo=/account', request), 303);
