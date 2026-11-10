// Writes .data/video.json: a few pending agent drafts and a short activity trail on the demo scenario,
// so Approvals and Activity have something to show while the video is recorded without a Claude key.
// Run the app with OWED_STORE=video.json to use it. The real store (.data/owed.json) is never touched.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { CLIENTS, scenarioInvoices } from '../lib/scenario';

const invoices = scenarioInvoices();
const today = Date.now();
const ago = (min: number) => new Date(today - min * 60_000).toISOString();
const days = (due: string) => Math.max(0, Math.floor((today - new Date(due).getTime()) / 86_400_000));

function open(company: string, item: string) {
  // The oldest unpaid invoice for that client and line item.
  const inv = invoices
    .filter((i) => i.status === 'SENT' && i.primary_recipients?.[0]?.billing_info?.business_name === company && i.items?.[0]?.name === item)
    .sort((x, y) => x.detail.invoice_date.localeCompare(y.detail.invoice_date))[0];
  if (!inv) throw new Error(`No open demo invoice: ${company} / ${item}`);
  const client = CLIENTS.find((c) => c.company === company)!;
  return { inv, client };
}

const reminders = [
  {
    company: 'Vantage Robotics',
    item: 'Product launch landing page',
    tone: 'final' as const,
    subject: 'Final notice: invoice {n} is {d} days overdue',
    note:
      'Hi Grace, invoice {n} for the product launch landing page is now {d} days past due. Please settle the balance this week; further work is paused until it is paid. Thank you.',
    rationale: 'Largest overdue balance, already past even their usual 48 days late. A final notice is right.',
    min: 14,
  },
  {
    company: 'Quarry & Co Architects',
    item: 'Portfolio site redesign - final',
    tone: 'firm' as const,
    subject: 'Invoice {n} is {d} days overdue',
    note: 'Hi Tom, a reminder that invoice {n} for the final redesign milestone is {d} days overdue. Could you let me know when it will be paid?',
    rationale: 'Past due but within their usual pattern (about 33 days late). Firm, and ask for a payment date.',
    min: 12,
  },
  {
    company: 'Harbor Street Bakery',
    item: 'Menu & signage refresh',
    tone: 'friendly' as const,
    subject: 'Quick reminder about invoice {n}',
    note: 'Hi Leo, just a friendly nudge that invoice {n} slipped past its due date. Here is the pay link whenever you are ready. Thanks!',
    rationale: 'Reliable client who is a little later than usual. A friendly nudge keeps the relationship warm.',
    min: 11,
  },
];

const drafts = [];
const audit = [];
for (const r of reminders) {
  const { inv, client } = open(r.company, r.item);
  const n = inv.detail.invoice_number;
  const d = days(inv.detail.payment_term?.due_date ?? inv.detail.invoice_date);
  const fill = (s: string) => s.replaceAll('{n}', n).replaceAll('{d}', String(d));
  const at = ago(r.min);
  drafts.push({
    kind: 'reminder',
    invoiceId: inv.id,
    invoiceNumber: n,
    clientId: client.email,
    client: client.company,
    amount: Number(inv.due_amount?.value ?? inv.amount.value),
    currency: 'USD',
    daysOverdue: d,
    tone: r.tone,
    subject: fill(r.subject),
    note: fill(r.note),
    id: randomUUID(),
    status: 'pending',
    rationale: r.rationale,
    createdAt: at,
    createdBy: 'collections agent',
  });
  audit.push({ id: randomUUID(), at, actor: 'agent', action: 'drafted reminder', detail: `${client.company} · ${n} (${r.tone})`, invoiceId: inv.id });
}
audit.push(
  { id: randomUUID(), at: ago(15), actor: 'agent', action: 'checked PayPal', detail: 'Listed open invoices and recent payments' },
  { id: randomUUID(), at: ago(16), actor: 'human', action: 'asked the agents', detail: 'Chase everyone more than 10 days late' },
  { id: randomUUID(), at: ago(60 * 26), actor: 'human', action: 'sent reminder', detail: 'Bluebird Dental Group · friendly, approved from a draft' },
  { id: randomUUID(), at: ago(60 * 26 + 3), actor: 'agent', action: 'drafted reminder', detail: 'Bluebird Dental Group (friendly)' },
  { id: randomUUID(), at: ago(60 * 27), actor: 'system', action: 'synced PayPal', detail: 'Refreshed invoices from PayPal Invoicing' },
);
audit.sort((a, b) => b.at.localeCompare(a.at));

const file = path.join(process.cwd(), '.data', 'video.json');
mkdirSync(path.dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify({ drafts, reminders: [], audit, demoInvoices: [] }, null, 2));
console.log(`${file}: ${drafts.length} drafts, ${audit.length} activity entries`);
