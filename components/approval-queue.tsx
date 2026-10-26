'use client';

import { useState } from 'react';
import type { AuditEntry, Draft } from '@/lib/store';

const money = (n: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
const toneStyle: Record<string, string> = {
  friendly: 'bg-emerald-100 text-emerald-800',
  firm: 'bg-amber-100 text-amber-800',
  final: 'bg-rose-100 text-rose-800',
};
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
};

function DraftCard({ draft, onDone, live }: { draft: Draft; onDone: () => void; live: boolean }) {
  const [subject, setSubject] = useState(draft.kind === 'reminder' ? draft.subject : '');
  const [note, setNote] = useState(draft.note);
  const [busy, setBusy] = useState<'send' | 'discard' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (action: 'send' | 'discard') => {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action === 'send' ? { action, subject: subject || undefined, note } : { action }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return setError(json.error ?? 'Something went wrong');
    if (json.draft?.status === 'failed') return setError(json.draft.error);
    onDone();
  };

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" data-testid="draft-card">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{draft.client}</p>
          <p className="text-xs text-slate-500">
            {draft.kind === 'reminder'
              ? `${draft.invoiceNumber} · ${money(draft.amount, draft.currency)} · ${draft.daysOverdue > 0 ? `${draft.daysOverdue} days overdue` : 'not yet due'}`
              : `New invoice · ${money(draft.amount, draft.currency)} · due in ${draft.dueInDays} days`}
          </p>
        </div>
        {draft.kind === 'reminder' ? (
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${toneStyle[draft.tone]}`}>{draft.tone}</span>
        ) : (
          <span className="shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">invoice</span>
        )}
      </header>
      <p className="mt-2 text-xs italic text-slate-500">{draft.rationale}</p>
      {draft.kind === 'reminder' && (
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          aria-label="Subject"
          className="mt-2 w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-800"
        />
      )}
      {draft.kind === 'invoice' && (
        <ul className="mt-2 space-y-0.5 text-xs text-slate-700">
          {draft.items.map((item, i) => (
            <li key={i} className="flex justify-between">
              <span>{item.quantity} × {item.name}</span>
              <span>{money(item.quantity * item.unitAmount)}</span>
            </li>
          ))}
        </ul>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Message"
        rows={5}
        className="mt-2 w-full resize-y rounded-md border border-slate-200 px-2 py-1 text-xs leading-relaxed text-slate-800"
      />
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => act('send')}
          disabled={!!busy}
          className="flex-1 rounded-md bg-[#0b1f33] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#13304d] disabled:opacity-60"
        >
          {busy === 'send' ? 'Sending…' : live ? 'Approve & send via PayPal' : 'Approve & send (demo)'}
        </button>
        <button
          onClick={() => act('discard')}
          disabled={!!busy}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          Discard
        </button>
      </div>
    </article>
  );
}

export default function ApprovalQueue({ drafts, audit, live, onChange }: { drafts: Draft[]; audit: AuditEntry[]; live: boolean; onChange: () => void }) {
  const pending = drafts.filter((d) => d.status === 'pending');
  const total = pending.reduce((a, d) => a + d.amount, 0);
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <section className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-semibold text-slate-900">Approval queue</h2>
          <span className="text-xs text-slate-500">{pending.length ? `${pending.length} drafts · ${money(total)}` : 'empty'}</span>
        </div>
        <p className="px-1 pb-2 text-[11px] leading-snug text-slate-500">
          Agents draft; you decide. Nothing reaches a client until you press send.
        </p>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Ask the assistant to chase overdue invoices and its drafts will appear here.
            </div>
          )}
          {pending.map((d) => (
            <DraftCard key={d.id} draft={d} live={live} onDone={onChange} />
          ))}
        </div>
      </section>
      <section className="max-h-[32%] min-h-0 shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Audit log</h3>
        <ol className="space-y-1">
          {audit.length === 0 && <li className="text-xs text-slate-400">No activity yet.</li>}
          {audit.slice(0, 30).map((a) => (
            <li key={a.id} className="text-[11px] leading-snug text-slate-600">
              <span className={a.actor === 'human' ? 'font-semibold text-slate-900' : a.actor === 'agent' ? 'font-semibold text-indigo-700' : 'font-semibold text-rose-700'}>
                {a.actor === 'human' ? 'You' : a.actor === 'agent' ? 'Agent' : 'System'}
              </span>{' '}
              {a.action} — {a.detail} <span className="text-slate-400">· {ago(a.at)}</span>
            </li>
          ))}
        </ol>
      </section>
    </aside>
  );
}
