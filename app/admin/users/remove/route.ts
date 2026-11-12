import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, authEnabled, isAdmin, publicUrl, readSession } from '@/lib/auth';
import { removeLogtoUser } from '@/lib/logto-admin';
import { revokeSessions } from '@/lib/revoked';
import { deleteUser, listUsers } from '@/lib/users';

// Owed admins remove a person: their DataSparkLab account in Logto (every app's sign-in) and Owed's record.
// The admin page asks for confirmation first; owners/admins and your own account can't be removed here.
export async function POST(request: NextRequest) {
  const admin = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!authEnabled() || !isAdmin(admin)) return new NextResponse('Not found', { status: 404 });
  const form = await request.formData();
  const sub = String(form.get('sub') ?? '');
  const back = (q: string) => NextResponse.redirect(publicUrl(`/admin?${q}`, request), 303);
  if (sub === admin!.sub) return back('result=self');
  const row = (await listUsers()).find((r) => r.sub === sub);
  if (!sub || !row) return back('result=missing');

  const logto = await removeLogtoUser(sub).catch((err) => {
    console.error('[owed] removing a user from the SSO failed', err);
    return 'failed' as const;
  });
  if (logto === 'protected') return back('result=protected');
  if (logto === 'failed') return back('result=failed');
  await deleteUser(sub);
  await revokeSessions(sub);
  console.info(`[owed] admin removed a user (Logto: ${logto})`);
  return back(`result=removed&who=${encodeURIComponent(row.email || row.name || 'the person')}`);
}
