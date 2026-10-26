// Seeds a PayPal sandbox account with Owed's demo scenario: seven clients, six months of invoices,
// payment history recorded against the paid ones, and a handful left open or overdue.
//
//   npm run seed            create the scenario (skips if it is already there)
//   npm run seed -- --reset cancel previously seeded open invoices first, then create
import { CLIENTS, INVOICES } from '../lib/scenario';
import * as paypal from '../lib/paypal';

const TAG = 'Seeded by Owed';
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString().slice(0, 10);

async function main() {
  if (!paypal.hasPayPalCredentials()) throw new Error('Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox) in .env.local first.');
  const existing = (await paypal.listInvoices()).filter((i) => i.detail.note?.includes(TAG));

  if (existing.length && !process.argv.includes('--reset')) {
    console.log(`Found ${existing.length} seeded invoices already; pass --reset to start over.`);
    return;
  }
  for (const inv of existing) {
    if (['SENT', 'UNPAID', 'PARTIALLY_PAID'].includes(inv.status)) await paypal.cancelInvoice(inv.id).catch(() => {});
  }

  const clients = new Map(CLIENTS.map((c) => [c.key, c]));
  let n = 0;
  for (const plan of INVOICES) {
    const client = clients.get(plan.client)!;
    const created = await paypal.createInvoice({
      recipientEmail: client.email,
      recipientName: client.name,
      businessName: client.company,
      currency: 'USD',
      invoiceDate: iso(plan.issuedDaysAgo),
      dueDate: iso(plan.issuedDaysAgo - plan.termDays),
      note: `${TAG}. Thank you for your business!`,
      items: [{ name: plan.item, quantity: 1, unitAmount: plan.amount }],
    });
    await paypal.sendInvoice(created.id);
    if (plan.paidAfter !== null) {
      await paypal.recordPayment(created.id, { currency_code: 'USD', value: plan.amount.toFixed(2) }, iso(plan.issuedDaysAgo - plan.paidAfter));
    }
    n++;
    console.log(`${String(n).padStart(2)} ${created.detail.invoice_number ?? created.id}  ${client.company.padEnd(28)} $${plan.amount}  ${plan.paidAfter === null ? 'open' : 'paid'}`);
  }
  console.log(`\nSeeded ${n} invoices. Start the app with \`npm run dev\` to see them.`);
}

main().catch((err) => {
  console.error(err instanceof paypal.PayPalError ? `${err.message} (debug id ${err.debugId})` : err);
  process.exit(1);
});
