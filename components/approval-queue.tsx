'use client';

import { Bot, Check, CheckCircle2, FileText, Inbox, Send, ShieldCheck, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Draft } from '@/lib/store';
import { ago, money, shortDate } from '@/lib/format';
import { Avatar, Badge, Button, Card, TONE_BADGE, cx } from './ui';

function KindBadge({ draft }: { draft: Draft }) {
  return draft.kind === 'reminder' ? (
    <Badge tone={TONE_BADGE[draft.tone]} className="capitalize">
      {draft.tone}
    </Badge>
  ) : (
    <Badge tone="info">New invoice</Badge>
  );
}

function DraftEditor({ draft, live, onDone }: { draft: Draft; live: boolean; onDone: (message: string) => void }) {
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
    onDone(
      action === 'discard'
        ? `Discarded the draft for ${draft.client}`
        : draft.kind === 'reminder'
          ? `Reminder for ${draft.invoiceNumber} sent${live ? ' through PayPal' : ' (demo)'}`
          : `Invoice for ${draft.client} created and sent${live ? ' through PayPal' : ' (demo)'}`,
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="draft-card">
      <header className="flex flex-wrap items-start gap-3 border-b border-line px-6 py-4">
        <Avatar name={draft.client} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-ink">{draft.client}</h2>
            <KindBadge draft={draft} />
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {draft.kind === 'reminder'
              ? `${draft.invoiceNumber} · ${draft.daysOverdue > 0 ? `${draft.daysOverdue} days overdue` : 'not yet due'} · to ${draft.clientId}`
              : `Due in ${draft.dueInDays} days · to ${draft.recipientName} <${draft.clientId}>`}
          </p>
        </div>
        <div className="text-right">
          <p className="tabular text-xl font-semibold text-ink">{money(draft.amount, draft.currency, true)}</p>
          <p className="text-xs text-muted">{draft.kind === 'reminder' ? 'amount due' : 'invoice total'}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <div className="flex gap-3 rounded-lg border border-ai/15 bg-ai-soft/60 p-3">
          <Bot className="mt-0.5 size-4 shrink-0 text-ai" />
          <div className="text-[13px] leading-relaxed">
            <p className="font-medium text-ink">Why the agent chose this</p>
            <p className="text-ink-2">{draft.rationale}</p>
            <p className="mt-1 text-xs text-muted">
              Drafted by the {draft.createdBy.replace(/ agent$/, '')} agent · {ago(draft.createdAt)}
            </p>
          </div>
        </div>

        {draft.kind === 'reminder' && (
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              aria-label="Subject"
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-ink outline-none focus:border-ai focus:ring-3 focus:ring-ai/15"
            />
          </label>
        )}

        {draft.kind === 'invoice' && (
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">Line items</span>
            <div className="overflow-hidden rounded-lg border border-line">
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-line">
                  {draft.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-ink">{item.name}</td>
                      <td className="tabular px-3 py-2 text-right text-muted">
                        {item.quantity} × {money(item.unitAmount, draft.currency, true)}
                      </td>
                      <td className="tabular px-3 py-2 text-right font-medium text-ink">{money(item.quantity * item.unitAmount, draft.currency, true)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">{draft.kind === 'reminder' ? 'Message' : 'Note to client'}</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-label="Message"
            rows={8}
            className="w-full resize-y rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm leading-relaxed text-ink outline-none focus:border-ai focus:ring-3 focus:ring-ai/15"
          />
        </label>
        {error && <p className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">{error}</p>}
      </div>

      <footer className="flex flex-wrap items-center gap-3 border-t border-line bg-canvas/60 px-6 py-3">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="size-3.5" />
          {live ? 'Sends through PayPal Invoicing when you approve.' : 'Demo data: approving simulates the PayPal call.'}
        </p>
        <div className="ml-auto flex gap-2">
          <Button variant="danger" onClick={() => act('discard')} disabled={!!busy}>
            <Trash2 className="size-4" />
            Discard
          </Button>
          <Button variant="primary" onClick={() => act('send')} disabled={!!busy}>
            <Send className="size-4" />
            {busy === 'send' ? 'Sending…' : live ? 'Approve & send via PayPal' : 'Approve & send (demo)'}
          </Button>
        </div>
      </footer>
    </div>
  );
}

export default function ApprovalQueue({
  drafts,
  live,
  onChange,
  onAsk,
  onNotify,
}: {
  drafts: Draft[];
  live: boolean;
  onChange: () => void;
  onAsk?: () => void;
  onNotify: (message: string) => void;
}) {
  // Most urgent first: the longest-overdue reminder, then new invoices.
  const pending = drafts
    .filter((d) => d.status === 'pending')
    .sort((a, b) => (b.kind === 'reminder' ? b.daysOverdue : -1) - (a.kind === 'reminder' ? a.daysOverdue : -1));
  const resolved = drafts.filter((d) => d.status !== 'pending').slice(0, 8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = pending.find((d) => d.id === selectedId) ?? pending[0];
  const total = pending.reduce((a, d) => a + d.amount, 0);

  return (
    <Card className="flex min-h-[560px] flex-1 overflow-hidden">
      <aside className="flex w-full max-w-[320px] shrink-0 flex-col border-r border-line max-md:hidden">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[13px] font-semibold text-ink">Waiting for you</p>
          <p className="text-xs text-muted">{pending.length ? `${pending.length} drafts · ${money(total)} to collect` : 'Nothing pending'}</p>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto p-2">
          {pending.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => setSelectedId(d.id)}
                className={cx(
                  'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  d.id === selected?.id ? 'bg-ai-soft/70 ring-1 ring-ai/20' : 'hover:bg-canvas',
                )}
              >
                <Avatar name={d.client} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">{d.client}</span>
                    <span className="tabular ml-auto text-[13px] font-medium text-ink">{money(d.amount, d.currency)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <span className="truncate">{d.kind === 'reminder' ? `${d.invoiceNumber} · ${d.daysOverdue}d late` : 'New invoice'}</span>
                    <span className="ml-auto">
                      <KindBadge draft={d} />
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {resolved.length > 0 && (
            <>
              <li className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-faint">Recently handled</li>
              {resolved.map((d) => (
                <li key={d.id} className="flex items-center gap-3 px-3 py-2 text-xs text-muted">
                  {d.status === 'sent' ? <CheckCircle2 className="size-4 text-good" /> : <Trash2 className="size-4 text-faint" />}
                  <span className="truncate">
                    {d.client} · {d.kind === 'reminder' ? d.invoiceNumber : 'invoice'}
                  </span>
                  <span className="ml-auto whitespace-nowrap">{d.status === 'failed' ? 'failed' : d.resolvedAt ? shortDate(d.resolvedAt) : d.status}</span>
                </li>
              ))}
            </>
          )}
        </ul>
      </aside>

      {selected ? (
        <DraftEditor
          key={selected.id}
          draft={selected}
          live={live}
          onDone={(message) => {
            onNotify(message);
            setSelectedId(null);
            onChange();
          }}
        />
      ) : (
        <div className="grid flex-1 place-items-center p-10 text-center">
          <div className="max-w-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-good-soft text-good">
              {resolved.length ? <Check className="size-6" /> : <Inbox className="size-6" />}
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">{resolved.length ? "You're all caught up" : 'No drafts yet'}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Ask Owed to chase overdue invoices or bill a client. Its drafts land here, and nothing reaches a client until you approve it.
            </p>
            {onAsk && (
              <Button variant="ai" className="mt-5" onClick={onAsk}>
                <Sparkles className="size-4" />
                Ask Owed to chase overdue invoices
              </Button>
            )}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-faint">
              <FileText className="size-3.5" /> Every action is recorded in Activity.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
