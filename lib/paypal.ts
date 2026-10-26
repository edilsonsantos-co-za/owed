// Thin client for the PayPal REST endpoints Owed uses: OAuth, Invoicing v2 and Transaction Search.
// Server-only: credentials never reach the browser.
import 'server-only';

const BASE_URL = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com';

export const hasPayPalCredentials = () => !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);

export interface Money {
  currency_code: string;
  value: string;
}

export interface PayPalInvoice {
  id: string;
  status: string;
  detail: {
    invoice_number?: string;
    invoice_date?: string;
    currency_code: string;
    note?: string;
    memo?: string;
    payment_term?: { term_type?: string; due_date?: string };
    metadata?: { create_time?: string; last_update_time?: string };
  };
  invoicer?: { business_name?: string; email_address?: string };
  primary_recipients?: {
    billing_info?: {
      name?: { given_name?: string; surname?: string; full_name?: string };
      business_name?: string;
      email_address?: string;
    };
  }[];
  items?: { name: string; quantity: string; unit_amount: Money; description?: string }[];
  amount?: Money & { breakdown?: unknown };
  due_amount?: Money;
  payments?: {
    paid_amount?: Money;
    transactions?: { payment_id?: string; payment_date?: string; method?: string; amount?: Money; note?: string }[];
  };
}

export interface PayPalTransaction {
  transaction_info: {
    transaction_id: string;
    transaction_event_code?: string;
    transaction_initiation_date?: string;
    transaction_amount?: Money;
    fee_amount?: Money;
    transaction_status?: string;
    transaction_note?: string;
    invoice_id?: string;
  };
  payer_info?: { email_address?: string; payer_name?: { alternate_full_name?: string } };
}

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly debugId?: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });
  if (!res.ok) throw new PayPalError(`PayPal OAuth failed (${res.status})`, res.status);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

async function call<T>(method: string, path: string, body?: unknown, attempt = 0): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if ((res.status === 401 || res.status === 429 || res.status >= 500) && attempt < 2) {
    if (res.status === 401) cachedToken = undefined;
    await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    return call(method, path, body, attempt + 1);
  }
  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const detail = json?.details?.[0]?.description ?? json?.message ?? res.statusText;
    throw new PayPalError(`${method} ${path} failed: ${detail}`, res.status, json?.debug_id, json?.details);
  }
  return json as T;
}

// --- Invoicing ----------------------------------------------------------------------

export async function listInvoices(): Promise<PayPalInvoice[]> {
  const summaries: { id: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await call<{ items?: { id: string }[]; total_pages?: number }>(
      'GET',
      `/v2/invoicing/invoices?page=${page}&page_size=100&total_required=true`,
    );
    summaries.push(...(res.items ?? []));
    if (!res.total_pages || page >= res.total_pages) break;
  }
  // List results omit payments and line items, so fetch each invoice in full (a few at a time).
  const full: PayPalInvoice[] = [];
  for (let i = 0; i < summaries.length; i += 8) {
    full.push(...(await Promise.all(summaries.slice(i, i + 8).map((s) => getInvoice(s.id)))));
  }
  return full;
}

export const getInvoice = (id: string) => call<PayPalInvoice>('GET', `/v2/invoicing/invoices/${id}`);

export async function sendReminder(id: string, subject: string, note: string) {
  await call('POST', `/v2/invoicing/invoices/${id}/remind`, {
    subject,
    note,
    send_to_invoicer: false,
    send_to_recipient: true,
  });
}

export interface NewInvoice {
  recipientEmail: string;
  recipientName: string;
  businessName?: string;
  currency: string;
  invoiceDate: string;
  dueDate: string;
  note?: string;
  items: { name: string; quantity: number; unitAmount: number; description?: string }[];
}

export async function createInvoice(input: NewInvoice): Promise<PayPalInvoice> {
  const [given, ...rest] = input.recipientName.split(' ');
  const created = await call<PayPalInvoice | { href?: string }>('POST', '/v2/invoicing/invoices', {
    detail: {
      currency_code: input.currency,
      invoice_date: input.invoiceDate,
      note: input.note,
      payment_term: { due_date: input.dueDate },
    },
    invoicer: { business_name: process.env.OWED_BUSINESS_NAME ?? 'Owed Studio' },
    primary_recipients: [
      {
        billing_info: {
          name: { given_name: given, surname: rest.join(' ') || undefined },
          business_name: input.businessName,
          email_address: input.recipientEmail,
        },
      },
    ],
    items: input.items.map((item) => ({
      name: item.name,
      description: item.description,
      quantity: String(item.quantity),
      unit_amount: { currency_code: input.currency, value: item.unitAmount.toFixed(2) },
      unit_of_measure: 'QUANTITY',
    })),
  });
  if ('id' in created && created.id) return created as PayPalInvoice;
  const href = (created as { href?: string }).href ?? '';
  return getInvoice(href.split('/').pop() ?? '');
}

export async function sendInvoice(id: string, subject?: string, note?: string) {
  await call('POST', `/v2/invoicing/invoices/${id}/send`, {
    subject,
    note,
    send_to_invoicer: false,
    send_to_recipient: true,
  });
}

export async function recordPayment(id: string, amount: Money, paymentDate: string, method = 'BANK_TRANSFER') {
  await call('POST', `/v2/invoicing/invoices/${id}/payments`, { method, payment_date: paymentDate, amount });
}

export async function cancelInvoice(id: string) {
  await call('POST', `/v2/invoicing/invoices/${id}/cancel`, { send_to_invoicer: false, send_to_recipient: false });
}

// --- Transaction Search ---------------------------------------------------------------

// Transaction Search covers at most 31 days per request and rejects fractional seconds.
export async function searchTransactions(days = 30): Promise<PayPalTransaction[]> {
  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');
  try {
    const res = await call<{ transaction_details?: PayPalTransaction[] }>(
      'GET',
      `/v1/reporting/transactions?start_date=${iso(start)}&end_date=${iso(end)}&fields=all&page_size=500`,
    );
    return res.transaction_details ?? [];
  } catch (err) {
    // Transaction Search is a per-app feature toggle; without it the rest of Owed still works.
    if (err instanceof PayPalError && (err.status === 403 || err.status === 400)) return [];
    throw err;
  }
}
