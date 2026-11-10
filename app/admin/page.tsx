import { Suspense } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { SESSION_COOKIE, authEnabled, isAdmin, readSession } from '@/lib/auth';
import { listUsers } from '@/lib/users';
import SideNav from '@/components/side-nav';
import { Avatar, Card, Eyebrow } from '@/components/ui';

export const metadata: Metadata = { title: 'Owed · Sign-ups', robots: { index: false } };

const TZ = 'Africa/Johannesburg';
const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ });
const DAY = 86_400_000;

/** Counts for the stat tiles (a plain function: the page renders per request, so "now" is the request time). */
function summarise(rows: Awaited<ReturnType<typeof listUsers>>) {
  const now = Date.now();
  return {
    week: rows.filter((r) => now - Date.parse(r.lastSeen) < 7 * DAY).length,
    fresh: rows.filter((r) => now - Date.parse(r.firstSeen) < 7 * DAY).length,
    signIns: rows.reduce((a, r) => a + r.signIns, 0),
  };
}

function Stat({ label, value, foot }: { label: string; value: string | number; foot: string }) {
  return (
    <Card className="p-5">
      <Eyebrow>{label}</Eyebrow>
      <p className="serif mt-3 text-[44px] leading-none text-ink">{value}</p>
      <p className="mt-2 text-xs text-muted">{foot}</p>
    </Card>
  );
}

async function SignUps() {
  await connection();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  // Only the owed-admin role (the platform owner) may see who signed up; everyone else gets a 404.
  if (authEnabled() && !isAdmin(user)) notFound();
  const rows = await listUsers();
  const { week, fresh, signIns } = summarise(rows);
  const csv = ['email,name,first_seen,last_seen,sign_ins', ...rows.map((r) => [r.email ?? '', (r.name ?? '').replaceAll(',', ' '), r.firstSeen, r.lastSeen, r.signIns].join(','))].join('\n');

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <SideNav active="admin" user={user ? { name: user.name, email: user.email, admin: true } : { name: 'Local admin', admin: true }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-canvas/85 px-4 py-4 backdrop-blur sm:px-8">
          <div className="min-w-0">
            <h1 className="serif text-[30px] leading-none">Sign-ups</h1>
            <p className="mt-1 hidden text-[13px] text-muted sm:block">Everyone who has signed in to Owed through the DataSparkLab SSO.</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href="/app" className="rounded-[10px] px-3 py-2 text-sm text-ink-2 hover:bg-sunken lg:hidden">
              Dashboard
            </a>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
              download="owed-sign-ups.csv"
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3.5 text-sm font-medium hover:bg-sunken"
            >
              <Download className="size-4" /> Export CSV
            </a>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 p-4 sm:p-8">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="People" value={rows.length} foot={`${fresh} new in the last 7 days`} />
              <Stat label="Active this week" value={week} foot="signed in during the last 7 days" />
              <Stat label="Sign-ins" value={signIns} foot="across everyone, all time" />
            </div>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <p className="font-medium">All sign-ups</p>
                  <p className="text-xs text-muted">Most recently active first · times in Johannesburg</p>
                </div>
                <span className="rounded-full bg-sunken px-2.5 py-0.5 font-mono text-xs text-ink-2">{rows.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="eyebrow border-b border-line bg-canvas/60 text-[10px] text-muted">
                    <tr>
                      <th className="px-5 py-3 font-medium">Person</th>
                      <th className="px-5 py-3 font-medium">First seen</th>
                      <th className="px-5 py-3 font-medium">Last seen</th>
                      <th className="px-5 py-3 text-right font-medium">Sign-ins</th>
                    </tr>
                  </thead>
                  <tbody className="tabular">
                    {rows.map((r) => (
                      <tr key={r.sub} className="border-b border-line last:border-0 hover:bg-canvas/50">
                        <td className="px-5 py-3">
                          <span className="flex items-center gap-3">
                            <Avatar name={r.name || r.email || '?'} size={32} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{r.name || '—'}</span>
                              <span className="block truncate text-xs text-muted">{r.email || '—'}</span>
                            </span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-ink-2">{when(r.firstSeen)}</td>
                        <td className="px-5 py-3 text-ink-2">{when(r.lastSeen)}</td>
                        <td className="px-5 py-3 text-right font-mono">{r.signIns}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-5 py-14 text-center text-muted">
                          No sign-ins yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="h-dvh bg-canvas" />}>
      <SignUps />
    </Suspense>
  );
}
