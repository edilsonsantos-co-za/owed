'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgStudioApi } from 'ag-studio';
import type { Ledger } from '@/lib/receivables';
import type { AuditEntry, Draft } from '@/lib/store';
import { PAGE_TITLES } from '@/lib/studio/report';
import ApprovalQueue from './approval-queue';
import MorningBrief from './morning-brief';

// AG Studio measures the DOM, so it renders in the browser only.
const StudioDashboard = dynamic(() => import('./studio-dashboard'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-slate-500">Loading dashboard…</div>,
});

interface Snapshot {
  ledger: Ledger;
  drafts: Draft[];
  audit: AuditEntry[];
}

const money = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function OwedApp({ licenseKey, aiEnabled, briefEnabled }: { licenseKey?: string; aiEnabled: boolean; briefEnabled: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageId, setPageId] = useState('receivables');
  const [editing, setEditing] = useState(false);
  const apiRef = useRef<AgStudioApi | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/ledger', { cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return setError(json.error ?? `HTTP ${res.status}`);
    setError(null);
    setSnapshot(json);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const goToPage = (id: string) => {
    setPageId(id);
    const api = apiRef.current;
    if (api) api.setState({ ...api.getState(), selectedPageId: id });
  };

  const ledger = snapshot?.ledger;
  const overdue = ledger?.invoices.reduce((a, i) => a + i.overdueAmount, 0) ?? 0;
  const outstanding = ledger?.invoices.reduce((a, i) => a + i.outstanding, 0) ?? 0;

  return (
    <div className="flex h-dvh flex-col bg-slate-100 text-slate-900">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-200 bg-[#0b1f33] px-5 py-3 text-white">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold tracking-tight">owed</span>
          <span className="text-xs text-slate-300">AI collections copilot for PayPal invoices</span>
        </div>
        <nav className="flex gap-1">
          {Object.entries(PAGE_TITLES).map(([id, title]) => (
            <button
              key={id}
              onClick={() => goToPage(id)}
              className={`rounded-md px-3 py-1 text-sm ${pageId === id ? 'bg-white/15 font-semibold' : 'text-slate-300 hover:bg-white/10'}`}
            >
              {title}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-4 text-sm">
          {ledger && (
            <>
              <span>
                Outstanding <strong>{money(outstanding)}</strong>
              </span>
              <span className="text-rose-200">
                Overdue <strong>{money(overdue)}</strong>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ledger.mode === 'live' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}
                title={ledger.mode === 'live' ? 'Reading and writing your PayPal sandbox account' : 'No PayPal credentials: using built-in demo data'}
              >
                {ledger.mode === 'live' ? 'PayPal sandbox · live' : 'Demo data'}
              </span>
            </>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className={`rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10 ${editing ? 'bg-white/15' : ''}`}
          >
            {editing ? 'Done editing' : 'Edit dashboard'}
          </button>
          <button onClick={() => void refresh()} className="rounded-md border border-white/20 px-2 py-1 text-xs hover:bg-white/10">
            Refresh
          </button>
        </div>
      </header>

      {error && <div className="bg-rose-50 px-5 py-2 text-sm text-rose-800">Could not load PayPal data: {error}</div>}
      {briefEnabled && ledger && <MorningBrief key={ledger.asOf} />}

      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-[540px] overflow-hidden rounded-xl border border-slate-200 bg-white">
          {ledger ? (
            <StudioDashboard
              ledger={ledger}
              licenseKey={licenseKey}
              aiEnabled={aiEnabled}
              pageId={pageId}
              mode={editing ? 'edit' : 'view'}
              onDraft={() => void refresh()}
              onApi={(api) => (apiRef.current = api)}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-slate-500">{error ? 'No data' : 'Fetching invoices from PayPal…'}</div>
          )}
        </section>
        {snapshot && <ApprovalQueue drafts={snapshot.drafts} audit={snapshot.audit} live={snapshot.ledger.mode === 'live'} onChange={() => void refresh()} />}
      </main>
    </div>
  );
}
