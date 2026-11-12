import type { Metadata } from 'next';
import Link from 'next/link';
import { Brand, Eyebrow } from '@/components/ui';

export const metadata: Metadata = { title: 'Owed · Account deleted', robots: { index: false } };

export default function Deleted() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest px-4 py-12 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-block" aria-label="Owed home">
          <Brand inverted />
        </Link>
        <Eyebrow className="text-white/50">Account</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Your Owed account is deleted.</h1>
        <p className="mt-3 text-sm text-white/60">
          You&apos;re signed out, and we&apos;ve emailed you a confirmation. Your DataSparkLab sign-in is unchanged.
        </p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-white/10 px-6 text-[15px] font-semibold hover:bg-white/15">
          Back to Owed
        </Link>
      </div>
    </main>
  );
}
