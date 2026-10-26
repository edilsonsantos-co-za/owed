// Turns raw PayPal invoices into the receivables model Owed reasons about: invoices with aging,
// clients with payment behaviour and risk, payments, and a cash-collection forecast.
import type { PayPalInvoice, PayPalTransaction } from './paypal';

export type StatusGroup = 'Draft' | 'Open' | 'Overdue' | 'Paid' | 'Cancelled';
export type Tone = 'friendly' | 'firm' | 'final';

export interface InvoiceRow {
  id: string;
  number: string;
  clientId: string;
  client: string;
  status: string;
  statusGroup: StatusGroup;
  currency: string;
  description: string;
  invoiceDate: string;
  dueDate: string;
  paidDate: string | null;
  total: number;
  paid: number;
  outstanding: number;
  overdueAmount: number;
  daysOverdue: number;
  agingBucket: string;
  daysToPay: number | null;
  daysLate: number | null;
  remindersSent: number;
  lastReminder: string | null;
}

export interface ClientRow {
  id: string;
  name: string;
  company: string;
  email: string;
  invoiceCount: number;
  billed: number;
  collected: number;
  outstanding: number;
  overdue: number;
  avgDaysToPay: number | null;
  avgDaysLate: number | null;
  onTimeRate: number | null;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  suggestedTone: Tone;
}

export interface PaymentRow {
  id: string;
  invoiceId: string;
  clientId: string;
  date: string;
  amount: number;
  method: string;
}

export interface ForecastRow {
  id: string;
  invoiceId: string;
  clientId: string;
  client: string;
  expectedDate: string;
  expectedWeek: string;
  amount: number;
  confidence: 'High' | 'Medium' | 'Low';
}

export interface TransactionRow {
  id: string;
  date: string;
  eventCode: string;
  status: string;
  amount: number;
  fee: number;
  counterparty: string;
  note: string;
}

export interface Ledger {
  asOf: string;
  mode: 'live' | 'demo';
  business: string;
  invoices: InvoiceRow[];
  clients: ClientRow[];
  payments: PaymentRow[];
  forecast: ForecastRow[];
  transactions: TransactionRow[];
}

export interface ReminderLogEntry {
  invoiceId: string;
  sentAt: string;
}

const DAY = 86_400_000;
const num = (v?: string) => (v ? Number(v) : 0);
const dayDiff = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);
const round = (n: number) => Math.round(n * 100) / 100;

function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return addDays(date, -offset);
}

function agingBucket(daysOverdue: number, open: boolean) {
  if (!open) return 'Settled';
  if (daysOverdue <= 0) return 'Not yet due';
  if (daysOverdue <= 15) return '1–15 days';
  if (daysOverdue <= 30) return '16–30 days';
  if (daysOverdue <= 60) return '31–60 days';
  return '60+ days';
}

function recipientOf(invoice: PayPalInvoice) {
  const info = invoice.primary_recipients?.[0]?.billing_info ?? {};
  const name = info.name?.full_name ?? [info.name?.given_name, info.name?.surname].filter(Boolean).join(' ');
  const email = (info.email_address ?? 'unknown@example.com').toLowerCase();
  return { email, name: name || email, company: info.business_name ?? name ?? email };
}

export function buildLedger(
  rawInvoices: PayPalInvoice[],
  rawTransactions: PayPalTransaction[],
  reminders: ReminderLogEntry[],
  opts: { mode: Ledger['mode']; today?: string; business?: string },
): Ledger {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const remindersByInvoice = new Map<string, string[]>();
  for (const r of reminders) remindersByInvoice.set(r.invoiceId, [...(remindersByInvoice.get(r.invoiceId) ?? []), r.sentAt]);

  const payments: PaymentRow[] = [];
  const invoices: InvoiceRow[] = [];
  const clientInfo = new Map<string, { name: string; company: string }>();

  for (const inv of rawInvoices) {
    const recipient = recipientOf(inv);
    clientInfo.set(recipient.email, { name: recipient.name, company: recipient.company });
    const invoiceDate = inv.detail.invoice_date ?? inv.detail.metadata?.create_time?.slice(0, 10) ?? today;
    const dueDate = inv.detail.payment_term?.due_date ?? invoiceDate;
    const total = num(inv.amount?.value);
    const txs = inv.payments?.transactions ?? [];
    const paid = num(inv.payments?.paid_amount?.value);
    const paidDate = txs.map((t) => t.payment_date?.slice(0, 10)).filter(Boolean).sort().at(-1) ?? null;
    txs.forEach((t, i) =>
      payments.push({
        id: t.payment_id ?? `${inv.id}-p${i}`,
        invoiceId: inv.id,
        clientId: recipient.email,
        date: t.payment_date?.slice(0, 10) ?? paidDate ?? invoiceDate,
        amount: num(t.amount?.value),
        method: t.method ?? 'PAYPAL',
      }),
    );

    const settled = ['PAID', 'MARKED_AS_PAID', 'REFUNDED', 'PARTIALLY_REFUNDED', 'MARKED_AS_REFUNDED'].includes(inv.status);
    const cancelled = inv.status === 'CANCELLED';
    const draft = inv.status === 'DRAFT' || inv.status === 'SCHEDULED';
    const open = !settled && !cancelled && !draft;
    const outstanding = open ? num(inv.due_amount?.value) || round(total - paid) : 0;
    const daysOverdue = open ? Math.max(0, dayDiff(dueDate, today)) : 0;
    const statusGroup: StatusGroup = cancelled ? 'Cancelled' : draft ? 'Draft' : settled ? 'Paid' : daysOverdue > 0 ? 'Overdue' : 'Open';
    const sent = remindersByInvoice.get(inv.id) ?? [];

    invoices.push({
      id: inv.id,
      number: inv.detail.invoice_number ?? inv.id,
      clientId: recipient.email,
      client: recipient.company,
      status: inv.status,
      statusGroup,
      currency: inv.detail.currency_code,
      description: inv.items?.[0]?.name ?? inv.detail.note ?? '',
      invoiceDate,
      dueDate,
      paidDate: settled ? paidDate : null,
      total,
      paid,
      outstanding,
      overdueAmount: daysOverdue > 0 ? outstanding : 0,
      daysOverdue,
      agingBucket: agingBucket(daysOverdue, open),
      daysToPay: settled && paidDate ? dayDiff(invoiceDate, paidDate) : null,
      daysLate: settled && paidDate ? Math.max(0, dayDiff(dueDate, paidDate)) : null,
      remindersSent: sent.length,
      lastReminder: sent.sort().at(-1) ?? null,
    });
  }

  const clients: ClientRow[] = [...clientInfo.entries()].map(([email, info]) => {
    const mine = invoices.filter((i) => i.clientId === email && i.statusGroup !== 'Cancelled' && i.statusGroup !== 'Draft');
    const settled = mine.filter((i) => i.daysToPay !== null);
    const avg = (xs: number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
    const avgDaysLate = avg(settled.map((i) => i.daysLate ?? 0));
    const onTimeRate = settled.length ? round(settled.filter((i) => (i.daysLate ?? 0) <= 2).length / settled.length) : null;
    const outstanding = round(mine.reduce((a, i) => a + i.outstanding, 0));
    const overdue = round(mine.reduce((a, i) => a + i.overdueAmount, 0));
    const worstOverdue = Math.max(0, ...mine.map((i) => i.daysOverdue));
    // Risk blends history (how late they usually pay) with the present (how late they are now).
    const riskScore = Math.min(
      100,
      Math.round((avgDaysLate ?? 10) * 1.2 + worstOverdue * 0.9 + (1 - (onTimeRate ?? 0.5)) * 25 + (overdue > 0 ? 10 : 0)),
    );
    const riskLevel = riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Medium' : 'Low';
    const suggestedTone: Tone = worstOverdue > 45 ? 'final' : worstOverdue > 20 || riskLevel === 'High' ? 'firm' : 'friendly';
    return {
      id: email,
      name: info.name,
      company: info.company,
      email,
      invoiceCount: mine.length,
      billed: round(mine.reduce((a, i) => a + i.total, 0)),
      collected: round(mine.reduce((a, i) => a + i.paid, 0)),
      outstanding,
      overdue,
      avgDaysToPay: avg(settled.map((i) => i.daysToPay ?? 0)),
      avgDaysLate,
      onTimeRate,
      riskScore,
      riskLevel,
      suggestedTone,
    };
  });

  const byClient = new Map(clients.map((c) => [c.id, c]));
  const forecast: ForecastRow[] = invoices
    .filter((i) => i.outstanding > 0)
    .map((i) => {
      const c = byClient.get(i.clientId);
      const lag = c?.avgDaysLate ?? 7;
      const expected = [addDays(i.dueDate, Math.round(lag)), addDays(today, 3)].sort().at(-1)!;
      const confidence = c?.riskLevel === 'Low' ? 'High' : c?.riskLevel === 'Medium' ? 'Medium' : 'Low';
      return {
        id: `f-${i.id}`,
        invoiceId: i.id,
        clientId: i.clientId,
        client: i.client,
        expectedDate: expected,
        expectedWeek: mondayOf(expected),
        amount: i.outstanding,
        confidence,
      };
    });

  const transactions: TransactionRow[] = rawTransactions.map((t) => ({
    id: t.transaction_info.transaction_id,
    date: t.transaction_info.transaction_initiation_date ?? today,
    eventCode: t.transaction_info.transaction_event_code ?? '',
    status: t.transaction_info.transaction_status ?? '',
    amount: num(t.transaction_info.transaction_amount?.value),
    fee: num(t.transaction_info.fee_amount?.value),
    counterparty: t.payer_info?.payer_name?.alternate_full_name ?? t.payer_info?.email_address ?? '',
    note: t.transaction_info.transaction_note ?? '',
  }));

  return {
    asOf: today,
    mode: opts.mode,
    business: opts.business ?? 'Owed Studio',
    invoices: invoices.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate)),
    clients: clients.sort((a, b) => b.riskScore - a.riskScore),
    payments,
    forecast,
    transactions,
  };
}
