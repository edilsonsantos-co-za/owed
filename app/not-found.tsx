import Link from 'next/link';
import { Brand, Stamp } from '@/components/ui';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 text-ink">
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Owed home">
          <Brand />
        </Link>
        <div className="perforated mt-8 rounded-t-2xl border border-b-0 border-line bg-surface p-8 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <p className="eyebrow text-muted">Error 404</p>
            <Stamp tone="warn">Not found</Stamp>
          </div>
          <h1 className="serif mt-6 text-5xl leading-none">Nothing owed here.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">This page doesn&apos;t exist, or your account can&apos;t open it.</p>
          <div className="mt-8 flex gap-2">
            <a href="/app" className="inline-flex h-10 items-center rounded-[10px] bg-forest px-4 text-sm font-medium text-white hover:bg-brand-hover">
              Open the dashboard
            </a>
            <Link href="/" className="inline-flex h-10 items-center rounded-[10px] border border-line-strong px-4 text-sm font-medium hover:bg-sunken">
              Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
