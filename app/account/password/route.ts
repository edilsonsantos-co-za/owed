import type { NextRequest } from 'next/server';
import { changePassword } from '@/lib/logto-admin';
import { accountUser, backTo, toSignIn } from '../session';

const tries = new Map<string, number[]>();
/** At most 5 password attempts per person per 15 minutes, so the current-password check can't be guessed at. */
function allowed(sub: string) {
  const now = Date.now();
  const mine = (tries.get(sub) ?? []).filter((t) => now - t < 900_000);
  tries.set(sub, [...mine, now]);
  return mine.length < 5;
}

export async function POST(request: NextRequest) {
  const session = await accountUser(request);
  if (!session) return toSignIn(request);
  const form = await request.formData();
  const current = String(form.get('current') ?? '');
  const next = String(form.get('password') ?? '');
  if (next.length < 8 || next.length > 256) return backTo(request, 'password', 'weak');
  if (next !== String(form.get('confirm') ?? '')) return backTo(request, 'password', 'mismatch');
  if (!allowed(session.user.sub)) return backTo(request, 'password', 'limit');
  const result = await changePassword(session.user.sub, current, next).catch((err) => {
    console.error('[owed] password change error', err);
    return 'failed' as const;
  });
  return backTo(request, 'password', result);
}
