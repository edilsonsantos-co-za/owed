import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { SESSION_COOKIE, authEnabled, isAdmin, readSession } from '@/lib/auth';
import { getProfile } from '@/lib/logto-admin';
import SideNav from '@/components/side-nav';
import { Avatar, Card, Eyebrow } from '@/components/ui';
import DeleteAccount from './delete-account';

export const metadata: Metadata = { title: 'Owed · Your profile', robots: { index: false } };

const PROFILE: Record<string, [ok: boolean, text: string]> = {
  saved: [true, 'Profile saved. Your new name shows in every DataSparkLab app.'],
  'username-taken': [false, 'That username is taken. Try another.'],
  'username-invalid': [false, 'A username is 3 to 32 letters, numbers or underscores, and starts with a letter or underscore.'],
  'username-required': [false, 'Your account has no email, so it needs a username to sign in with.'],
  failed: [false, 'We could not save your profile. Please try again.'],
};
const PASSWORD: Record<string, [ok: boolean, text: string]> = {
  saved: [true, 'Password changed. Use it next time you sign in to any DataSparkLab app.'],
  'wrong-current': [false, 'Your current password is not right.'],
  weak: [false, 'Use at least 8 characters, mixing letters, numbers or symbols.'],
  mismatch: [false, 'The two new passwords don’t match.'],
  limit: [false, 'Too many attempts. Please try again in 15 minutes.'],
  failed: [false, 'We could not change your password. Please try again.'],
};

const field = 'h-10 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-mint/30';
const save = 'inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-canvas hover:opacity-90';

function Notice({ entry }: { entry?: [boolean, string] }) {
  if (!entry) return null;
  const [ok, text] = entry;
  return (
    <p role={ok ? 'status' : 'alert'} className={`mt-4 rounded-xl border px-3 py-2 text-sm ${ok ? 'border-line bg-sunken' : 'border-[#f87171]/40 bg-[#f87171]/10 text-[#991b1b]'}`}>
      {text}
    </p>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-medium">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>
      {children}
    </Card>
  );
}

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
    </label>
  );
}

type Params = { profile?: string; password?: string };

async function Profile({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  const { profile: profileResult, password: passwordResult } = await searchParams;
  const user = authEnabled() ? await readSession((await cookies()).get(SESSION_COOKIE)?.value) : null;
  if (!user) redirect(authEnabled() ? '/auth/sign-in?returnTo=/account' : '/app');
  const profile = await getProfile(user.sub);
  const email = profile?.email || user.email;

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <SideNav active="account" user={{ name: user.name, email: user.email, admin: isAdmin(user) }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-4 backdrop-blur sm:px-8">
          <div className="min-w-0">
            <h1 className="serif text-[30px] leading-none">Your profile</h1>
            <p className="mt-1 hidden text-[13px] text-muted sm:block">Your DataSparkLab account, as Owed uses it.</p>
          </div>
          <a href="/app" className="ml-auto rounded-full px-3 py-2 text-sm text-ink-2 hover:bg-sunken lg:hidden">
            Dashboard
          </a>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[720px] flex-col gap-4 p-4 sm:p-8">
            <Card className="flex items-center gap-4 p-5">
              <Avatar name={user.name || email || '?'} size={48} />
              <div className="min-w-0">
                <p className="truncate font-medium">{profile?.name || user.name || email}</p>
                <p className="truncate text-sm text-muted">{email}</p>
              </div>
            </Card>

            {profile ? (
              <>
                <Section title="Name and username" hint="These belong to your DataSparkLab sign-in, so they change in every app you use it for.">
                  <form method="post" action="/account/profile" className="mt-5 grid gap-4 sm:grid-cols-2">
                    <Field label="Name">
                      <input name="name" defaultValue={profile.name} maxLength={80} autoComplete="name" className={field} />
                    </Field>
                    <Field label="Username" note="Optional. You can sign in with it instead of your email.">
                      <input name="username" defaultValue={profile.username} maxLength={32} autoComplete="username" pattern="[A-Za-z_]\w{2,31}" className={field} />
                    </Field>
                    <div className="sm:col-span-2">
                      <button className={save}>Save profile</button>
                    </div>
                  </form>
                  <Notice entry={profileResult ? PROFILE[profileResult] ?? PROFILE.failed : undefined} />
                </Section>

                {profile.hasPassword && (
                  <Section title="Password" hint="Changes the password for your DataSparkLab sign-in.">
                    <form method="post" action="/account/password" className="mt-5 grid gap-4 sm:grid-cols-2">
                      <input type="text" name="username" autoComplete="username" defaultValue={email} hidden readOnly />
                      <div className="sm:col-span-2">
                        <Field label="Current password">
                          <input name="current" type="password" required autoComplete="current-password" className={field} />
                        </Field>
                      </div>
                      <Field label="New password" note="At least 8 characters.">
                        <input name="password" type="password" required minLength={8} maxLength={256} autoComplete="new-password" className={field} />
                      </Field>
                      <Field label="Repeat new password">
                        <input name="confirm" type="password" required minLength={8} maxLength={256} autoComplete="new-password" className={field} />
                      </Field>
                      <div className="sm:col-span-2">
                        <button className={save}>Change password</button>
                      </div>
                    </form>
                    <Notice entry={passwordResult ? PASSWORD[passwordResult] ?? PASSWORD.failed : undefined} />
                  </Section>
                )}
              </>
            ) : (
              <Card className="p-5 text-sm text-muted">Profile changes are unavailable right now. Please try again later.</Card>
            )}

            <Card className="mt-4 border-[#f87171]/30 p-5 sm:p-6">
              <Eyebrow className="text-[#b91c1c]">Danger zone</Eyebrow>
              <h2 className="mt-2 font-medium">Delete your Owed account</h2>
              <p className="mb-4 mt-1 text-sm text-muted">
                Removes your Owed account and its data, and signs you out. Your DataSparkLab sign-in, used by other apps, stays.
              </p>
              <DeleteAccount email={email} />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AccountPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <Profile searchParams={searchParams} />
    </Suspense>
  );
}
