import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { signUpEnabled } from '@/lib/logto-admin';
import { Brand, Eyebrow } from '@/components/ui';

export const metadata: Metadata = { title: 'Owed · Create your account' };

const ERRORS: Record<string, string> = {
  email: 'Enter a valid email address.',
  password: 'Use a password of at least 8 characters, mixing letters, numbers or symbols.',
  exists: 'An account with that email already exists. Sign in instead.',
  limit: 'Too many attempts. Please try again in an hour.',
  failed: 'We could not create your account. Please try again.',
};

const field =
  'h-11 w-full rounded-full border border-white/15 bg-white/5 px-4 text-[15px] text-white placeholder:text-white/40 outline-none focus:border-[#34d399] focus:ring-2 focus:ring-[#34d399]/30';

async function SignUpForm({ searchParams }: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  await connection();
  if (!signUpEnabled()) redirect('/auth/sign-in?register=1');
  const { error } = await searchParams;
  return (
    <main className="grid min-h-dvh bg-forest text-white lg:grid-cols-2">
      <section className="hidden flex-col justify-between p-10 lg:flex">
        <Link href="/" aria-label="Owed home">
          <Brand inverted />
        </Link>
        <div>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em]">
            Get paid for the work <span className="text-[#34d399]">you already did.</span>
          </h1>
          <p className="mt-5 max-w-md text-white/60">
            Claude agents read how each client really pays and draft the right reminder. Nothing is sent until you approve it.
          </p>
        </div>
        <span />
      </section>
      <section className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-8 inline-block lg:hidden" aria-label="Owed home">
            <Brand inverted />
          </Link>
          <Eyebrow className="text-white/50">Create your account</Eyebrow>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Start getting paid.</h2>
          <p className="mt-2 text-sm text-white/60">Free. It runs on PayPal sandbox data, so nothing real is sent.</p>
          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-[#f87171]/40 bg-[#f87171]/10 px-4 py-3 text-sm text-[#fecaca]">
              {ERRORS[error] ?? ERRORS.failed}
            </p>
          )}
          <form method="post" action="/auth/register" className="mt-6 flex flex-col gap-3">
            <label className="sr-only" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" placeholder="Email" className={field} />
            <label className="sr-only" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Password (8+ characters)" className={field} />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <button type="submit" className="mt-2 h-11 rounded-full bg-[#f4f1ea] text-[15px] font-medium text-forest transition-colors hover:bg-white">
              Create account
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-white/60">
            Already have an account?{' '}
            <a href="/auth/sign-in" className="font-medium text-[#34d399] hover:underline">
              Sign in
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}

export default function SignUp(props: { searchParams: Promise<{ error?: string; returnTo?: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-forest" />}>
      <SignUpForm {...props} />
    </Suspense>
  );
}
