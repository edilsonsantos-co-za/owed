// Owed's own state: the approval queue of AI-drafted actions and the audit log of what was sent.
// Kept in a JSON file so it survives restarts; small enough that a database would be overkill.
import 'server-only';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PayPalInvoice } from './paypal';
import type { ReminderLogEntry, Tone } from './receivables';
import { money } from './format';

export type DraftKind = 'reminder' | 'invoice';
export type DraftStatus = 'pending' | 'sent' | 'discarded' | 'failed';

export interface ReminderDraft {
  kind: 'reminder';
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  client: string;
  amount: number;
  currency: string;
  daysOverdue: number;
  tone: Tone;
  subject: string;
  note: string;
}

export interface InvoiceDraft {
  kind: 'invoice';
  clientId: string;
  client: string;
  recipientName: string;
  currency: string;
  dueInDays: number;
  items: { name: string; quantity: number; unitAmount: number }[];
  note: string;
  amount: number;
}

export type Draft = (ReminderDraft | InvoiceDraft) & {
  id: string;
  status: DraftStatus;
  rationale: string;
  createdAt: string;
  createdBy: string;
  resolvedAt?: string;
  error?: string;
  paypalId?: string;
};

export interface AuditEntry {
  id: string;
  at: string;
  actor: 'human' | 'agent' | 'system';
  action: string;
  detail: string;
  invoiceId?: string;
}

interface StoreShape {
  drafts: Draft[];
  reminders: ReminderLogEntry[];
  audit: AuditEntry[];
  /** Invoices created while running in demo mode, where there is no PayPal account to hold them. */
  demoInvoices: PayPalInvoice[];
}

const FILE = path.join(process.cwd(), '.data', process.env.OWED_STORE ?? 'owed.json');
let cache: StoreShape | undefined;
let writing = Promise.resolve();

async function load(): Promise<StoreShape> {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, 'utf8')) as StoreShape;
    cache = { ...parsed, demoInvoices: parsed.demoInvoices ?? [] };
  } catch {
    cache = { drafts: [], reminders: [], audit: [], demoInvoices: [] };
  }
  return cache;
}

async function save() {
  const snapshot = JSON.stringify(cache, null, 2);
  writing = writing.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, snapshot);
  });
  await writing;
}

export async function readStore() {
  return structuredClone(await load());
}

export async function addDraft(draft: (ReminderDraft | InvoiceDraft) & { rationale: string; createdBy: string }) {
  const store = await load();
  // One pending reminder per invoice: a newer draft replaces the older one.
  if (draft.kind === 'reminder') {
    for (const d of store.drafts) {
      if (d.kind === 'reminder' && d.invoiceId === draft.invoiceId && d.status === 'pending') d.status = 'discarded';
    }
  }
  const entry: Draft = { ...draft, id: randomUUID(), status: 'pending', createdAt: new Date().toISOString() };
  store.drafts.unshift(entry);
  store.audit.unshift({
    id: randomUUID(),
    at: entry.createdAt,
    actor: 'agent',
    action: draft.kind === 'reminder' ? 'drafted reminder' : 'drafted invoice',
    detail: draft.kind === 'reminder' ? `${draft.client} · ${draft.invoiceNumber} (${draft.tone})` : `${draft.client} · ${money(draft.amount, draft.currency, true)}`,
    invoiceId: draft.kind === 'reminder' ? draft.invoiceId : undefined,
  });
  await save();
  return entry;
}

export async function updateDraft(id: string, patch: Partial<Pick<Draft, 'status' | 'error' | 'paypalId'>> & { subject?: string; note?: string }) {
  const store = await load();
  const draft = store.drafts.find((d) => d.id === id);
  if (!draft) return undefined;
  Object.assign(draft, patch);
  if (patch.status && patch.status !== 'pending') draft.resolvedAt = new Date().toISOString();
  await save();
  return draft;
}

export async function getDraft(id: string) {
  return (await load()).drafts.find((d) => d.id === id);
}

export async function logReminder(invoiceId: string) {
  const store = await load();
  store.reminders.push({ invoiceId, sentAt: new Date().toISOString() });
  await save();
}

export async function audit(entry: Omit<AuditEntry, 'id' | 'at'>) {
  const store = await load();
  store.audit.unshift({ ...entry, id: randomUUID(), at: new Date().toISOString() });
  store.audit = store.audit.slice(0, 200);
  await save();
}

export async function addDemoInvoice(invoice: PayPalInvoice) {
  const store = await load();
  store.demoInvoices.push(invoice);
  await save();
}
