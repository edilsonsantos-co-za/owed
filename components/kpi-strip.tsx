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

function Kpi({ label, value, icon, foot, accent }: { label: string; value: string; icon: ReactNode; foot: ReactNode; accent: string }) {
  return (
    <Card className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span className={cx('grid size-7 place-items-center rounded-lg', accent)}>{icon}</span>
      </div>
      <span className="tabular text-[22px] font-semibold leading-none tracking-tight text-ink sm:text-[28px]">{value}</span>
      <div className="text-xs text-muted">{foot}</div>
    </Card>
  );
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
        accent="bg-black/[0.05] text-ink-2"
        foot={`${open.length} open invoice${open.length === 1 ? '' : 's'} across ${new Set(open.map((i) => i.clientId)).size} clients`}
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
        accent="bg-sky-50 text-sky-700"
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
