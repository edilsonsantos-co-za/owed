import { AlertTriangle, CalendarClock, CircleDollarSign, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Ledger } from '@/lib/receivables';
import { money } from '@/lib/format';
import { Card, cx } from './ui';

const DAY = 86_400_000;
const within = (iso: string, from: string, days: number) => {
  const d = Date.parse(iso) - Date.parse(from);
  return days >= 0 ? d >= 0 && d <= days * DAY : d <= 0 && d >= days * DAY;
};

function Kpi({ label, value, icon, foot, accent, dark }: { label: string; value: string; icon: ReactNode; foot: ReactNode; accent: string; dark?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cx('text-[13px] font-medium', dark ? 'text-white/60' : 'text-muted')}>{label}</span>
        <span className={cx('grid size-8 place-items-center rounded-lg', accent)}>{icon}</span>
      </div>
      <span className={cx('tabular text-[24px] font-semibold leading-none tracking-[-0.035em] sm:text-[32px]', dark ? 'text-white' : 'text-ink')}>{value}</span>
      <div className={cx('text-xs', dark ? 'text-white/60' : 'text-muted')}>{foot}</div>
    </>
  );
  if (dark) {
    return (
      <div className="relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-xl bg-ink p-3 shadow-[var(--shadow-card)] sm:p-5">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-[radial-gradient(closest-side,rgba(109,74,255,0.45),transparent)]" />
        <div className="relative flex flex-col gap-3">{body}</div>
      </div>
    );
  }
  return <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-5">{body}</Card>;
}

export default function KpiStrip({ ledger }: { ledger: Ledger }) {
  const open = ledger.invoices.filter((i) => i.outstanding > 0);
  const late = open.filter((i) => i.overdueAmount > 0);
  const outstanding = open.reduce((a, i) => a + i.outstanding, 0);
  const overdue = late.reduce((a, i) => a + i.overdueAmount, 0);
  const share = outstanding ? overdue / outstanding : 0;
  const next14 = ledger.forecast.filter((f) => within(f.expectedDate, ledger.asOf, 14));
  const expected = next14.reduce((a, f) => a + f.amount, 0);
  const confident = next14.filter((f) => f.confidence === 'High').reduce((a, f) => a + f.amount, 0);
  const collected = ledger.payments.filter((p) => within(p.date, ledger.asOf, -30)).reduce((a, p) => a + p.amount, 0);
  const worst = [...late].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi
        label="Outstanding"
        value={money(outstanding)}
        icon={<Wallet className="size-4" />}
        accent="bg-white/10 text-white"
        dark
        foot={
          <div className="space-y-2">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-[#34d399]" style={{ width: `${100 - Math.round(share * 100)}%` }} />
              <div className="h-full bg-[#f43f5e]" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            <span>{`${open.length} open invoice${open.length === 1 ? '' : 's'} across ${new Set(open.map((i) => i.clientId)).size} clients`}</span>
          </div>
        }
      />
      <Kpi
        label="Overdue"
        value={money(overdue)}
        icon={<AlertTriangle className="size-4" />}
        accent="bg-bad-soft text-bad"
        foot={
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-bad" style={{ width: `${Math.round(share * 100)}%` }} />
            </div>
            <span className="tabular">{Math.round(share * 100)}% of outstanding</span>
          </div>
        }
      />
      <Kpi
        label="Expected next 14 days"
        value={money(expected)}
        icon={<CalendarClock className="size-4" />}
        accent="bg-ai-soft text-ai"
        foot={`${money(confident)} from clients who reliably pay`}
      />
      <Kpi
        label="Collected last 30 days"
        value={money(collected)}
        icon={<CircleDollarSign className="size-4" />}
        accent="bg-good-soft text-good"
        foot={worst ? `Oldest overdue: ${worst.client}, ${worst.daysOverdue} days` : 'Nothing overdue'}
      />
    </div>
  );
}
