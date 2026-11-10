import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { SESSION_COOKIE, authEnabled, isOwner, readSession } from '@/lib/auth';
import { listUsers } from '@/lib/users';
import { Logo } from '@/components/ui';

export const metadata: Metadata = { title: 'Owed · Sign-ups', robots: { index: false } };

const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' });

async function SignUps() {
  await connection();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (authEnabled() && !isOwner(user)) notFound();
  const rows = await listUsers();
  const csv = ['email,name,first_seen,last_seen,sign_ins', ...rows.map((r) => [r.email ?? '', (r.name ?? '').replaceAll(',', ' '), r.firstSeen, r.lastSeen, r.signIns].join(','))].join('\n');
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Logo />
        <h1 className="text-xl font-semibold tracking-tight">Sign-ups</h1>
        <span className="rounded-full bg-ai-soft px-2 text-sm font-semibold text-ai">{rows.length}</span>
        <a href="/app" className="ml-auto text-sm text-muted hover:text-ink">Back to dashboard</a>
        <a
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
          download="owed-sign-ups.csv"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:border-line-strong"
        >
          Export CSV
        </a>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">First seen</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3 text-right">Sign-ins</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {rows.map((r) => (
              <tr key={r.sub} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5">{r.name || '—'}</td>
                <td className="px-4 py-2.5">{r.email || '—'}</td>
                <td className="px-4 py-2.5 text-ink-2">{when(r.firstSeen)}</td>
                <td className="px-4 py-2.5 text-ink-2">{when(r.lastSeen)}</td>
                <td className="px-4 py-2.5 text-right">{r.signIns}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">No sign-ins yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <SignUps />
    </Suspense>
  );
}
