'use client';

import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Brief } from '@/lib/brief';
import type { Ledger } from '@/lib/receivables';
import { money } from '@/lib/format';
import { Avatar, Badge, Button, Card, TONE_BADGE } from './ui';

const ACTION = {
  friendly: 'A friendly nudge should do it.',
  firm: 'Send a firm reminder and ask for a payment date.',
  final: 'Final notice: amount, days late, and that work pauses until settled.',
};

/** Without an Anthropic key there is no agent brief, so the same card shows a plain summary of the ledger. */
function ruleBrief(ledger: Ledger): Omit<Brief, 'generatedAt' | 'mode'> {
  const late = ledger.invoices.filter((i) => i.overdueAmount > 0);
  const overdue = late.reduce((a, i) => a + i.overdueAmount, 0);
  const focus = [...ledger.clients]
    .filter((c) => c.overdue > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 3)
    .map((c) => {
      const worst = Math.max(...late.filter((i) => i.clientId === c.id).map((i) => i.daysOverdue));
      return {
        client: c.company,
        why: `${money(c.overdue)} overdue, ${worst} days late; usually pays ${Math.round(c.avgDaysLate ?? 0)} days late.`,
        suggestedAction: ACTION[c.suggestedTone],
      };
    });
  const soon = ledger.forecast.filter((f) => f.expectedDate >= ledger.asOf && Date.parse(f.expectedDate) - Date.parse(ledger.asOf) <= 14 * 86_400_000);
  const top = focus[0] && ledger.clients.find((c) => c.company === focus[0]!.client);
  const points = [
    soon.length > 0 &&
      `${money(soon.reduce((a, f) => a + f.amount, 0))} should land in the next 14 days, based on when each client usually pays.`,
    top && overdue > 0 && `${top.company} holds ${Math.round((top.overdue / overdue) * 100)}% of everything overdue.`,
    late.some((i) => i.remindersSent === 0) && `${late.filter((i) => i.remindersSent === 0).length} overdue invoices have not had a reminder yet.`,
  ].filter((p): p is string => !!p);
  return {
    headline: late.length ? `${money(overdue)} is overdue across ${late.length} invoices.` : 'Nothing is overdue today.',
    points,
    focus,
    toolCalls: [],
  };
}

export default function MorningBrief({ ledger, enabled, onAsk }: { ledger: Ledger; enabled: boolean; onAsk?: () => void }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [failed, setFailed] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    fetch('/api/brief')
      .then(async (res) => {
        const json = await res.json();
        if (!alive) return;
        if (res.ok) setBrief(json);
        else setFailed(true);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [enabled]);

  const fromAgent = !failed;
  const shown = brief ?? (failed ? ruleBrief(ledger) : null);
  const tones = Object.fromEntries(ledger.clients.map((c) => [c.company, c.suggestedTone]));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-gradient-to-r from-ai-soft/70 to-transparent px-4 py-2.5">
        <Sparkles className="size-4 text-ai" />
        <span className="text-[13px] font-semibold text-ink">{fromAgent ? 'Morning brief' : "Today's focus"}</span>
        <span className="hidden truncate text-xs text-muted md:inline">
          {fromAgent ? 'Written by Claude after checking your PayPal account' : 'Summary of your ledger · add an Anthropic key for the agent-written brief'}
        </span>
        {onAsk && (
          <Button variant="ghost" size="sm" className="ml-auto text-ai" onClick={onAsk}>
            Ask Owed <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>

      {!shown ? (
        <div className="grid gap-3 p-4 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-2">
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-2/3" />
            <p className="pt-1 text-xs text-muted">Claude is reviewing your PayPal account…</p>
          </div>
          <div className="space-y-2">
            <div className="skeleton h-10" />
            <div className="skeleton h-10" />
          </div>
        </div>
      ) : (
        <div className="grid gap-x-6 gap-y-3 p-4 md:grid-cols-[1.1fr_1fr]">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-snug text-ink">{shown.headline}</p>
            {shown.points.length > 0 && (
              <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-ink-2">
                {shown.points.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-faint" />
                    {p}
                  </li>
                ))}
              </ul>
            )}
            {shown.toolCalls.length > 0 && (
              <p className="mt-3 text-[11px] text-faint">Checked with PayPal Agent Toolkit: {[...new Set(shown.toolCalls)].join(', ')}</p>
            )}
          </div>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {shown.focus.length === 0 && <li className="p-3 text-[13px] text-muted">No client needs chasing today.</li>}
            {shown.focus.map((f) => (
              <li key={f.client} className="flex items-start gap-3 p-3">
                <Avatar name={f.client} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-semibold text-ink">{f.client}</span>
                    {tones[f.client] && (
                      <Badge tone={TONE_BADGE[tones[f.client]!]} className="ml-auto capitalize">
                        {tones[f.client]}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-muted">{f.why}</p>
                  <p className="mt-1 text-xs font-medium text-ink-2">→ {f.suggestedAction}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
