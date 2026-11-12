import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, publicUrl } from '@/lib/auth';
import { accountDeletedEmail, sendEmail } from '@/lib/mail';
import { revokeSessions } from '@/lib/revoked';
import { deleteUser } from '@/lib/users';
import { accountUser, toSignIn } from '../session';

// The profile page's "Delete my account" asks for confirmation in place, then posts here. Deletes the Owed
// account only: the DataSparkLab sign-in stays, since other apps use it too.
export async function POST(request: NextRequest) {
  const session = await accountUser(request);
  if (!session) return toSignIn(request);
  if ((await request.formData()).get('confirm') !== 'delete') return NextResponse.redirect(publicUrl('/account', request), 303);
  const { user, config } = session;
  const removed = await deleteUser(user.sub);
  await revokeSessions(user.sub);
  const email = removed?.email ?? user.email;
  if (email) await sendEmail(email, accountDeletedEmail({ name: removed?.name ?? user.name, siteUrl: config.baseUrl }));
  console.info(`[owed] account deleted by its owner (${removed ? 'had' : 'no'} Owed record)`);
  const res = NextResponse.redirect(publicUrl('/account/deleted', request), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
