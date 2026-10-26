// The demo business: a two-person design studio and its clients, each with a payment habit.
// Used two ways: rendered as in-memory PayPal invoices for demo mode (no credentials), and
// pushed into a PayPal sandbox account by scripts/seed-sandbox.ts so live mode has history.
import type { PayPalInvoice } from './paypal';

export interface ScenarioClient {
  key: string;
  name: string;
  company: string;
  email: string;
  /** Days after the due date this client usually pays; negative pays early. */
  habit: number;
}

export interface ScenarioInvoice {
  client: string;
  item: string;
  amount: number;
  /** Days before today the invoice was issued. */
  issuedDaysAgo: number;
  termDays: number;
  /** Paid this many days after issue, or null if still open. */
  paidAfter: number | null;
}

export const BUSINESS_NAME = 'Owed Studio';

export const CLIENTS: ScenarioClient[] = [
  { key: 'northwind', name: 'Maya Chen', company: 'Northwind Coffee Roasters', email: 'maya@northwind-roasters.example', habit: -2 },
  { key: 'bluebird', name: 'Dr. Sam Okafor', company: 'Bluebird Dental Group', email: 'accounts@bluebird-dental.example', habit: 19 },
  { key: 'fernhill', name: 'Priya Nair', company: 'Fernhill Yoga', email: 'priya@fernhill.example', habit: 4 },
  { key: 'quarry', name: 'Tom Becker', company: 'Quarry & Co Architects', email: 'tom@quarryco.example', habit: 33 },
  { key: 'lumen', name: 'Ana Souza', company: 'Lumen Kids Books', email: 'ana@lumenbooks.example', habit: 1 },
  { key: 'harbor', name: 'Leo Martins', company: 'Harbor Street Bakery', email: 'leo@harborbakery.example', habit: 11 },
  { key: 'vantage', name: 'Grace Lee', company: 'Vantage Robotics', email: 'ap@vantage-robotics.example', habit: 48 },
];

const monthly = (client: string, item: string, amount: number, months: number[], termDays: number, habit: number, openFrom: number) =>
  months.map<ScenarioInvoice>((m) => {
    const issuedDaysAgo = m * 30 + 4;
    const paidAfter = issuedDaysAgo > openFrom ? Math.max(1, termDays + habit) : null;
    return { client, item, amount, issuedDaysAgo, termDays, paidAfter: paidAfter !== null && paidAfter < issuedDaysAgo ? paidAfter : null };
  });

// Recurring retainers plus one-off projects. Anything whose "paid" date would land in the future
// stays open, so overdue and not-yet-due invoices fall out of each client's habit naturally.
export const INVOICES: ScenarioInvoice[] = [
  ...monthly('northwind', 'Monthly brand retainer', 1200, [0, 1, 2, 3, 4, 5], 14, -2, 10),
  ...monthly('bluebird', 'Website care plan', 650, [0, 1, 2, 3, 4, 5], 14, 19, 30),
  ...monthly('fernhill', 'Social content pack', 480, [0, 1, 2, 3, 4], 7, 4, 8),
  ...monthly('harbor', 'Menu & signage refresh', 380, [1, 2, 3, 4], 14, 11, 40),
  { client: 'quarry', item: 'Portfolio site redesign - milestone 1', amount: 4800, issuedDaysAgo: 150, termDays: 30, paidAfter: 61 },
  { client: 'quarry', item: 'Portfolio site redesign - milestone 2', amount: 4800, issuedDaysAgo: 96, termDays: 30, paidAfter: 66 },
  { client: 'quarry', item: 'Portfolio site redesign - final', amount: 3600, issuedDaysAgo: 52, termDays: 30, paidAfter: null },
  { client: 'lumen', item: 'Picture-book cover illustration', amount: 2200, issuedDaysAgo: 120, termDays: 30, paidAfter: 31 },
  { client: 'lumen', item: 'Series style guide', amount: 1500, issuedDaysAgo: 18, termDays: 30, paidAfter: null },
  { client: 'vantage', item: 'Investor deck design', amount: 3900, issuedDaysAgo: 140, termDays: 30, paidAfter: 79 },
  { client: 'vantage', item: 'Product launch landing page', amount: 6500, issuedDaysAgo: 78, termDays: 30, paidAfter: null },
  { client: 'vantage', item: 'Trade show booth graphics', amount: 2400, issuedDaysAgo: 41, termDays: 21, paidAfter: null },
];

const iso = (daysAgo: number, today: Date) => new Date(today.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10);

/** The scenario as PayPal Invoicing v2 objects, dated relative to `today`. */
export function scenarioInvoices(today = new Date()): PayPalInvoice[] {
  const clients = new Map(CLIENTS.map((c) => [c.key, c]));
  return INVOICES.map((inv, n) => {
    const client = clients.get(inv.client)!;
    const invoiceDate = iso(inv.issuedDaysAgo, today);
    const dueDate = iso(inv.issuedDaysAgo - inv.termDays, today);
    const value = inv.amount.toFixed(2);
    const paid = inv.paidAfter !== null;
    const [given, ...rest] = client.name.split(' ');
    return {
      id: `INV2-DEMO-${String(n + 1).padStart(4, '0')}`,
      status: paid ? 'PAID' : 'SENT',
      detail: {
        invoice_number: `OWED-${String(1001 + n)}`,
        invoice_date: invoiceDate,
        currency_code: 'USD',
        payment_term: { term_type: 'DUE_ON_DATE_SPECIFIED', due_date: dueDate },
      },
      invoicer: { business_name: BUSINESS_NAME },
      primary_recipients: [
        {
          billing_info: {
            name: { given_name: given, surname: rest.join(' ') },
            business_name: client.company,
            email_address: client.email,
          },
        },
      ],
      items: [{ name: inv.item, quantity: '1', unit_amount: { currency_code: 'USD', value } }],
      amount: { currency_code: 'USD', value },
      due_amount: { currency_code: 'USD', value: paid ? '0.00' : value },
      payments: paid
        ? {
            paid_amount: { currency_code: 'USD', value },
            transactions: [
              {
                payment_id: `PAY-DEMO-${n + 1}`,
                payment_date: iso(inv.issuedDaysAgo - inv.paidAfter!, today),
                method: n % 3 === 0 ? 'BANK_TRANSFER' : 'PAYPAL',
                amount: { currency_code: 'USD', value },
              },
            ],
          }
        : undefined,
    };
  });
}
