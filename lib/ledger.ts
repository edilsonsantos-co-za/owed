// Loads the receivables ledger from PayPal (live mode) or from the built-in scenario (demo mode),
// and carries out approved actions against whichever backend is active.
import 'server-only';
import { money } from './format';
import * as paypal from './paypal';
import { buildLedger, type Ledger } from './receivables';
import { BUSINESS_NAME, scenarioInvoices } from './scenario';
import { addDemoInvoice, audit, getDraft, logReminder, readStore, updateDraft, type Draft } from './store';

export const isLive = () => process.env.OWED_MODE !== 'demo' && paypal.hasPayPalCredentials();

export async function getLedger(): Promise<Ledger> {
  const store = await readStore();
  if (!isLive()) {
    return buildLedger([...scenarioInvoices(), ...store.demoInvoices], [], store.reminders, { mode: 'demo', business: BUSINESS_NAME });
  }
  const [invoices, transactions] = await Promise.all([paypal.listInvoices(), paypal.searchTransactions(30)]);
  return buildLedger(invoices, transactions, store.reminders, {
    mode: 'live',
    business: process.env.OWED_BUSINESS_NAME ?? BUSINESS_NAME,
  });
}

const isoDay = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

/** Send an approved draft through PayPal. Only ever called from a human click. */
export async function sendDraft(id: string, edits?: { subject?: string; note?: string }): Promise<Draft> {
  const draft = await getDraft(id);
  if (!draft) throw new Error('Draft not found');
  if (draft.status !== 'pending') throw new Error(`Draft is already ${draft.status}`);
  if (edits) await updateDraft(id, edits);
  const current = (await getDraft(id))!;

  try {
    if (current.kind === 'reminder') {
      if (isLive()) await paypal.sendReminder(current.invoiceId, current.subject, current.note);
      await logReminder(current.invoiceId);
      await audit({
        actor: 'human',
        action: 'sent reminder via PayPal',
        detail: `${current.client} · ${current.invoiceNumber} · ${current.tone}`,
        invoiceId: current.invoiceId,
      });
      return (await updateDraft(id, { status: 'sent' }))!;
    }

    const invoice = {
      recipientEmail: current.clientId,
      recipientName: current.recipientName,
      businessName: current.client,
      currency: current.currency,
      invoiceDate: isoDay(),
      dueDate: isoDay(current.dueInDays),
      note: current.note,
      items: current.items,
    };
    let paypalId: string;
    if (isLive()) {
      const created = await paypal.createInvoice(invoice);
      await paypal.sendInvoice(created.id);
      paypalId = created.id;
    } else {
      paypalId = `INV2-DEMO-NEW-${Date.now().toString(36).toUpperCase()}`;
      const total = current.items.reduce((a, i) => a + i.quantity * i.unitAmount, 0).toFixed(2);
      const [given, ...rest] = current.recipientName.split(' ');
      await addDemoInvoice({
        id: paypalId,
        status: 'SENT',
        detail: {
          invoice_number: `OWED-${Date.now().toString().slice(-4)}`,
          invoice_date: invoice.invoiceDate,
          currency_code: invoice.currency,
          payment_term: { due_date: invoice.dueDate },
        },
        primary_recipients: [
          { billing_info: { name: { given_name: given, surname: rest.join(' ') }, business_name: current.client, email_address: current.clientId } },
        ],
        items: current.items.map((i) => ({
          name: i.name,
          quantity: String(i.quantity),
          unit_amount: { currency_code: invoice.currency, value: i.unitAmount.toFixed(2) },
        })),
        amount: { currency_code: invoice.currency, value: total },
        due_amount: { currency_code: invoice.currency, value: total },
      });
    }
    await audit({ actor: 'human', action: 'sent invoice via PayPal', detail: `${current.client} · ${money(current.amount, current.currency, true)}`, invoiceId: paypalId });
    return (await updateDraft(id, { status: 'sent', paypalId }))!;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await audit({ actor: 'system', action: 'PayPal call failed', detail: message });
    return (await updateDraft(id, { status: 'failed', error: message }))!;
  }
}

export async function discardDraft(id: string) {
  const draft = await updateDraft(id, { status: 'discarded' });
  if (draft) await audit({ actor: 'human', action: 'discarded draft', detail: draft.kind === 'reminder' ? draft.invoiceNumber : draft.client });
  return draft;
}
