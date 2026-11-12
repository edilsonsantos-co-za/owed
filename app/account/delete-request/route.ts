import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, publicUrl, readSession, signDeleteToken } from '@/lib/auth';
import { deleteRequestEmail, sendEmail } from '@/lib/mail';

// One confirmation email per account every 5 minutes, so the button cannot be used to flood an inbox.
const WAIT_MS = 5 * 60_000;
const lastSent = new Map<string, number>();

export async function POST(request: NextRequest) {
  const config = authConfig();
  const user = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!config || !user) return NextResponse.redirect(publicUrl('/auth/sign-in?returnTo=/account', request), 303);
  if (!user.email) return NextResponse.redirect(publicUrl('/account?error=email', request), 303);
  const now = Date.now();
  if (now - (lastSent.get(user.sub) ?? 0) < WAIT_MS) return NextResponse.redirect(publicUrl('/account?sent=1', request), 303);
  lastSent.set(user.sub, now);
  const token = await signDeleteToken(user.sub, config.secret);
  await sendEmail(user.email, deleteRequestEmail({ name: user.name, confirmUrl: `${config.baseUrl}/account?token=${encodeURIComponent(token)}` }));
  return NextResponse.redirect(publicUrl('/account?sent=1', request), 303);
}
