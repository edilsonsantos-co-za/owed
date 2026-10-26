import { z } from 'zod';
import { getLedger } from '@/lib/ledger';
import { addDraft } from '@/lib/store';

const Reminder = z.object({
  kind: z.literal('reminder'),
  invoiceId: z.string(),
  tone: z.enum(['friendly', 'firm', 'final']),
  subject: z.string().min(3).max(200),
  note: z.string().min(10).max(4000),
  rationale: z.string().max(1000),
});

const Invoice = z.object({
  kind: z.literal('invoice'),
  clientId: z.string().email(),
  dueInDays: z.number().int().min(0).max(120),
  items: z.array(z.object({ name: z.string().min(1), quantity: z.number().positive(), unitAmount: z.number().positive() })).min(1),
  note: z.string().max(2000).default(''),
  rationale: z.string().max(1000),
});

const Body = z.discriminatedUnion('kind', [Reminder, Invoice]);

// Agents call this to queue an action for human approval. Nothing here touches PayPal.
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  const body = parsed.data;
  const ledger = await getLedger();

  if (body.kind === 'reminder') {
    const invoice = ledger.invoices.find((i) => i.id === body.invoiceId || i.number === body.invoiceId);
    if (!invoice) return Response.json({ error: `No invoice ${body.invoiceId}` }, { status: 404 });
    if (invoice.outstanding <= 0) return Response.json({ error: `${invoice.number} has nothing outstanding` }, { status: 409 });
    const draft = await addDraft({
      kind: 'reminder',
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      clientId: invoice.clientId,
      client: invoice.client,
      amount: invoice.outstanding,
      currency: invoice.currency,
      daysOverdue: invoice.daysOverdue,
      tone: body.tone,
      subject: body.subject,
      note: body.note,
      rationale: body.rationale,
      createdBy: 'collections agent',
    });
    return Response.json({ draft });
  }

  const client = ledger.clients.find((c) => c.id === body.clientId.toLowerCase());
  if (!client) return Response.json({ error: `Unknown client ${body.clientId}` }, { status: 404 });
  const amount = Math.round(body.items.reduce((a, i) => a + i.quantity * i.unitAmount, 0) * 100) / 100;
  const draft = await addDraft({
    kind: 'invoice',
    clientId: client.id,
    client: client.company,
    recipientName: client.name,
    currency: 'USD',
    dueInDays: body.dueInDays,
    items: body.items,
    note: body.note,
    amount,
    rationale: body.rationale,
    createdBy: 'collections agent',
  });
  return Response.json({ draft });
}
