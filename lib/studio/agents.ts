// The AI team inside the dashboard: AG Studio's five built-in agents (lead, planning, data, page,
// widget) plus Owed's collections agent, all running on Claude through ./claude-adapter.
// The lead is rewired so it can hand anything about chasing payments to the collections agent.
import {
  createAiHarness,
  directLlmRunner,
  type AgAiHarnessSetup,
  type AgAiModel,
  type AgAiPromptStarter,
  type AgStudioApi,
} from 'ag-studio';
import type { Ledger } from '@/lib/receivables';
import { claudeAdapter } from './claude-adapter';

export const MODELS: AgAiModel[] = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
];

const PROMPT_STARTERS: AgAiPromptStarter[] = [
  { label: 'Chase overdue invoices', prompt: 'Who owes me money right now? Draft reminders for everything overdue, in the right tone for each client.' },
  { label: 'Forecast cash', prompt: 'How much cash should I expect in the next 30 days, and which client is the biggest risk to that?' },
  { label: 'Add a lateness chart', prompt: 'Add a chart to this page showing overdue amount by client.' },
  { label: 'Bill a client', prompt: 'Invoice Fernhill Yoga for this month\'s social content pack, same as last time.' },
];

interface Hooks {
  ledger: () => Ledger | null;
  onDraft: () => void;
}

function collectionsInstructions(ledger: Ledger | null) {
  const today = ledger?.asOf ?? new Date().toISOString().slice(0, 10);
  return `You are Owed's collections agent for ${ledger?.business ?? 'a small design studio'}, a two-person studio that bills clients with PayPal invoices. Today is ${today}.

Your job: help the owner get paid without damaging client relationships. You read live PayPal invoice data, judge each client's payment behaviour, and draft PayPal invoice reminders and new invoices. You never send anything yourself: every draft goes to the owner's approval queue, and only a person pressing Send there calls PayPal. Never say a reminder or invoice was sent; say it is drafted and waiting for approval.

How to choose a tone (the client's history matters as much as the days late):
- friendly: up to ~20 days overdue, or any client who usually pays on time. Warm, assumes an oversight.
- firm: 21-45 days overdue, or a client with a habit of paying late. Polite, specific, asks for a payment date.
- final: more than 45 days overdue. Courteous but clear: states amount, days overdue, and that work may pause until it is settled. Never threaten legal action or fees that are not in the invoice.

Writing reminders: address the contact by first name, name the invoice number, the work, the amount and the due date. Keep the note under 90 words, plain text, no placeholders, signed "${ledger?.business ?? 'The studio'}". Mention they can pay with the PayPal link on the invoice. Subjects under 60 characters.

Workflow: call get_receivables first, then get_client_profile for anyone you are unsure about, then draft_reminder once per invoice. When you finish, give the owner a short summary: what you drafted, for whom, which tone and why, and the total amount you are chasing. Use US dollars.`;
}

export function buildAi(hooks: Hooks): AgAiHarnessSetup {
  const adapter = claudeAdapter();

  return ({ api }: { api: AgStudioApi }) =>
    createAiHarness(api, ({ builtIn, tools }) => {
      const postDraft = async (body: unknown, signal?: AbortSignal) => {
        const res = await fetch('/api/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        hooks.onDraft();
        return json.draft;
      };

      const getReceivables = api.defineAiTool({
        name: 'get_receivables',
        description:
          'List invoices from PayPal with what is still owed, days overdue and reminders already sent. Defaults to open and overdue invoices.',
        params: (s) =>
          s.object({
            status: s.enum(['overdue', 'open', 'all'], { description: 'overdue = past due only; open = unpaid incl. not yet due; all = everything.' }).optional(),
            client: s.string({ description: 'Filter to one client by company name or email.' }).optional(),
          }),
        execute: async (args, ctx) => {
          const ledger = hooks.ledger();
          if (!ledger) return ctx.error('The PayPal data has not loaded yet.');
          const status = args.status ?? 'open';
          const needle = args.client?.toLowerCase();
          const rows = ledger.invoices
            .filter((i) => (status === 'all' ? true : status === 'overdue' ? i.daysOverdue > 0 && i.outstanding > 0 : i.outstanding > 0))
            .filter((i) => !needle || i.client.toLowerCase().includes(needle) || i.clientId.includes(needle))
            .map(({ id, number, client, clientId, description, dueDate, outstanding, daysOverdue, remindersSent, lastReminder, statusGroup }) => ({
              id, number, client, clientId, description, dueDate, outstanding, daysOverdue, remindersSent, lastReminder, statusGroup,
            }));
          const total = rows.reduce((a, r) => a + r.outstanding, 0);
          return ctx.success(`${rows.length} invoices, $${total.toFixed(2)} outstanding.`, { invoices: rows });
        },
      });

      const getClientProfile = api.defineAiTool({
        name: 'get_client_profile',
        description: "A client's payment behaviour: average days to pay and late, on-time rate, risk, suggested tone, and their invoice history.",
        params: (s) => s.object({ client: s.string({ description: 'Company name or email.' }) }),
        execute: async (args, ctx) => {
          const ledger = hooks.ledger();
          if (!ledger) return ctx.error('The PayPal data has not loaded yet.');
          const needle = args.client.toLowerCase();
          const client = ledger.clients.find((c) => c.id === needle || c.company.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle));
          if (!client) return ctx.error(`No client matches "${args.client}". Known clients: ${ledger.clients.map((c) => c.company).join(', ')}.`);
          const history = ledger.invoices
            .filter((i) => i.clientId === client.id)
            .map(({ number, description, invoiceDate, dueDate, paidDate, total, outstanding, daysLate, daysOverdue, remindersSent }) => ({
              number, description, invoiceDate, dueDate, paidDate, total, outstanding, daysLate, daysOverdue, remindersSent,
            }));
          return ctx.success(`${client.company}: risk ${client.riskLevel} (${client.riskScore}).`, { client, history });
        },
      });

      const draftReminder = api.defineAiTool({
        name: 'draft_reminder',
        description:
          "Draft a PayPal invoice reminder and put it in the owner's approval queue. Does not send anything; the owner reviews and sends it.",
        params: (s) =>
          s.object({
            invoiceId: s.string({ description: 'The PayPal invoice id (the `id` field from get_receivables).' }),
            tone: s.enum(['friendly', 'firm', 'final']),
            subject: s.string({ description: 'Email subject, under 60 characters.' }),
            note: s.string({ description: 'The reminder message, under 90 words, signed by the business.' }),
            rationale: s.string({ description: 'One sentence for the owner: why this tone for this client.' }),
          }),
        execute: async (args, ctx) => {
          try {
            const draft = await postDraft({ kind: 'reminder', ...args }, ctx.signal);
            return ctx.success(`Drafted a ${args.tone} reminder for ${draft.client} (${draft.invoiceNumber}); it is waiting for approval.`, { draft });
          } catch (err) {
            return ctx.error(err instanceof Error ? err.message : String(err));
          }
        },
      });

      const draftInvoice = api.defineAiTool({
        name: 'draft_invoice',
        description: "Draft a new PayPal invoice for an existing client and put it in the owner's approval queue. Does not send anything.",
        params: (s) =>
          s.object({
            clientEmail: s.string({ description: "The client's email (the client id from get_client_profile)." }),
            items: s.array(
              s.object({
                name: s.string(),
                quantity: s.number(),
                unitAmount: s.number({ description: 'Price per unit in USD.' }),
              }),
            ),
            dueInDays: s.number({ description: 'Payment terms in days, usually the same as this client had before.' }),
            note: s.string({ description: 'Short note shown on the invoice.' }),
            rationale: s.string({ description: 'One sentence for the owner explaining the amount and terms.' }),
          }),
        execute: async (args, ctx) => {
          try {
            const { clientEmail, ...rest } = args;
            const draft = await postDraft({ kind: 'invoice', clientId: clientEmail, ...rest }, ctx.signal);
            return ctx.success(`Drafted a $${draft.amount} invoice for ${draft.client}; it is waiting for approval.`, { draft });
          } catch (err) {
            return ctx.error(err instanceof Error ? err.message : String(err));
          }
        },
      });

      const collections = directLlmRunner({
        id: 'collections',
        name: 'Collections',
        adapter,
        description:
          'Chases payments over PayPal: finds overdue invoices, judges each client\'s payment habits, and drafts reminders or new invoices for the owner to approve. Use for anything about who owes money, reminders, invoicing or cash expected.',
        schema: (s) => s.undefined(),
        instructions: () => collectionsInstructions(hooks.ledger()),
        tools: ({ studio }) => [getReceivables, getClientProfile, draftReminder, draftInvoice, studio.viewSchema(), studio.executeQuery()],
        maxTurns: 40,
      });

      const lead = builtIn.lead;
      const wiredLead = directLlmRunner({
        ...lead,
        adapter,
        instructions: (ctx, params) =>
          `${lead.instructions?.(ctx, params) ?? ''}\n\nThis dashboard belongs to a small business that gets paid through PayPal invoices. ` +
          'Anything about chasing payments, overdue clients, reminders, drafting invoices or expected cash goes to the `collections` agent via delegate_to. ' +
          'Dashboard building (charts, pages, filters) stays with the built-in agents.',
        tools: (ctx, params) => [
          ...(lead.tools?.(ctx, params) ?? []).filter((tool) => tool.name !== 'delegate_to'),
          tools.delegateTo(['planning', 'data', 'page', 'widget', 'collections']),
        ],
      });

      return {
        agents: [
          wiredLead,
          ...(['planning', 'data', 'page', 'widget'] as const).map((id) => directLlmRunner({ ...builtIn[id], adapter })),
          collections,
        ],
        primary: 'lead',
        models: MODELS,
        promptStarters: PROMPT_STARTERS,
      };
    });
}
