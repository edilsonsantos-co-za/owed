import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authConfig, publicUrl, verifyDeleteToken } from '@/lib/auth';
import { accountDeletedEmail, sendEmail } from '@/lib/mail';
import { deleteUser, listUsers } from '@/lib/users';

// The emailed link opens /account?token=…, whose button posts here: a GET (mail scanners) never deletes.
export async function POST(request: NextRequest) {
  const config = authConfig();
  if (!config) return NextResponse.redirect(publicUrl('/', request), 303);
  const token = String((await request.formData()).get('token') ?? '');
  const link = await verifyDeleteToken(token, config.secret);
  // A link from before the current account existed (deleted, then signed up again) no longer applies
  const current = link && (await listUsers()).find((r) => r.sub === link.sub);
  if (!link || (current && Date.parse(current.firstSeen) > link.issuedAt)) {
    return NextResponse.redirect(publicUrl('/account?error=expired', request), 303);
  }
  const removed = await deleteUser(link.sub);
  if (removed?.email) await sendEmail(removed.email, accountDeletedEmail({ name: removed.name, siteUrl: config.baseUrl }));
  console.info(`[owed] account deleted (${removed ? 'had' : 'no'} Owed record)`);
  const res = NextResponse.redirect(publicUrl('/account?deleted=1', request), 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
