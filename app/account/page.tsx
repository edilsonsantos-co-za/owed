import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { SESSION_COOKIE, authEnabled, readSession } from '@/lib/auth';
import { Brand, Eyebrow } from '@/components/ui';

export const metadata: Metadata = { title: 'Owed · Your account' };

const ERRORS: Record<string, string> = {
  expired: 'That link has expired or was already used. Ask for a new one below.',
  email: 'Your sign-in has no email address, so we cannot send the confirmation link.',
};

const primary = 'inline-flex h-11 items-center justify-center rounded-full px-6 text-[15px] font-semibold';

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block" aria-label="Owed home">
          <Brand inverted />
        </Link>
        {children}
      </div>
    </main>
  );
}

async function Account({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string; deleted?: string; error?: string }> }) {
  await connection();
  const { token, sent, deleted, error } = await searchParams;

  if (deleted) {
    return (
      <Shell>
        <Eyebrow className="text-white/50">Account</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Your Owed account is deleted.</h1>
        <p className="mt-3 text-sm text-white/60">You&apos;re signed out, and we&apos;ve emailed you a confirmation. Your DataSparkLab sign-in is unchanged.</p>
        <Link href="/" className={`${primary} mt-6 bg-white/10 hover:bg-white/15`}>Back to Owed</Link>
      </Shell>
    );
  }

  // The emailed link lands here; deleting takes a button press, so link scanners never delete anything
  if (token) {
    return (
      <Shell>
        <Eyebrow className="text-white/50">Delete account</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Delete your Owed account?</h1>
        <p className="mt-3 text-sm text-white/60">
          This removes your Owed account and signs you out. Your DataSparkLab sign-in, which other apps use too, stays as it is.
        </p>
        <form method="post" action="/account/delete" className="mt-6 flex gap-3">
          <input type="hidden" name="token" value={token} />
          <button className={`${primary} bg-[#f87171] text-forest hover:bg-[#fca5a5]`}>Delete my Owed account</button>
          <Link href="/app" className={`${primary} bg-white/10 hover:bg-white/15`}>Keep it</Link>
        </form>
      </Shell>
    );
  }

  const user = authEnabled() ? await readSession((await cookies()).get(SESSION_COOKIE)?.value) : null;
  if (!user) redirect('/auth/sign-in?returnTo=/account');

  return (
    <Shell>
      <Eyebrow className="text-white/50">Your account</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">{user.name || user.email}</h1>
      {user.name && user.email && <p className="mt-1 text-sm text-white/60">{user.email}</p>}
      {error && (
        <p role="alert" className="mt-5 rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
          {ERRORS[error] ?? ERRORS.expired}
        </p>
      )}
      <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-semibold">Delete your Owed account</h2>
        {sent ? (
          <p className="mt-2 text-sm text-white/60" role="status">
            Check your inbox at {user.email}: the link to confirm works for one hour.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/60">
              We&apos;ll email you a link to confirm. Your DataSparkLab sign-in, used by other apps, stays as it is.
            </p>
            <form method="post" action="/account/delete-request" className="mt-4">
              <button className={`${primary} bg-white/10 hover:bg-white/15`}>Email me a confirmation link</button>
            </form>
          </>
        )}
      </section>
      <Link href="/app" className="mt-6 inline-block text-sm text-white/60 hover:text-white">← Back to the dashboard</Link>
    </Shell>
  );
}

export default function AccountPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string; deleted?: string; error?: string }> }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-forest" />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}
