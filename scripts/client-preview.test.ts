import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('approved client previews', async (t) => {
  const cwd = process.cwd();
  const env = { ...process.env };
  const directory = await mkdtemp(path.join(tmpdir(), 'owed-client-preview-'));
  process.chdir(directory);
  process.env.OWED_MODE = 'live';
  process.env.OWED_STORE = 'test.json';
  process.env.PAYPAL_CLIENT_ID = 'test-client';
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret';
  process.env.PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com';

  const requests: { method: string; path: string; body?: Record<string, unknown> }[] = [];
  const clientUrl = 'https://www.sandbox.paypal.com/invoice/p/#TEST';
  let invoiceUrl: string | undefined = clientUrl;
  let lookupFails = false;
  let sendFails = false;
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    if (url.pathname === '/v1/oauth2/token') {
      return Response.json({ access_token: 'test-token', expires_in: 3600 });
    }
    requests.push({ method, path: url.pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (method === 'POST' && /\/(remind|send)$/.test(url.pathname)) {
      return sendFails
        ? Response.json({ message: 'Send rejected' }, { status: 422 })
        : new Response(null, { status: 204 });
    }
    if (method === 'POST' && url.pathname === '/v2/invoicing/invoices') {
      return Response.json({ id: 'INV2-NEW', status: 'DRAFT', detail: { currency_code: 'USD' } }, { status: 201 });
    }
    if (method === 'GET' && url.pathname.startsWith('/v2/invoicing/invoices/')) {
      return lookupFails
        ? Response.json({ message: 'Lookup unavailable' }, { status: 404 })
        : Response.json({ id: 'INV2-TEST', status: 'SENT', detail: { currency_code: 'USD', metadata: { recipient_view_url: invoiceUrl } } });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  try {
    const { addDraft, readStore } = await import('../lib/store');
    const { sendDraft } = await import('../lib/ledger');
    const reminder = () => addDraft({
      kind: 'reminder', invoiceId: 'INV2-TEST', invoiceNumber: 'OWED-TEST',
      clientId: 'client@example.test', client: 'Test client', amount: 100, currency: 'USD',
      daysOverdue: 10, tone: 'friendly', subject: 'Original subject', note: 'Original note',
      rationale: 'Test reminder', createdBy: 'collections agent',
    });
    const invoice = () => addDraft({
      kind: 'invoice', clientId: 'client@example.test', client: 'Test client', recipientName: 'Test Client',
      currency: 'USD', dueInDays: 14, items: [{ name: 'Design work', quantity: 1, unitAmount: 100 }],
      note: 'Original note', amount: 100, rationale: 'Test invoice', createdBy: 'collections agent',
    });

    await t.test('reminders persist approved edits and the genuine PayPal client link', async () => {
      const draft = await reminder();
      const sent = await sendDraft(draft.id, { subject: 'Approved subject', note: 'Approved message' });
      assert.equal(sent.status, 'sent');
      assert.equal(sent.clientId, 'client@example.test');
      assert.equal(sent.paypalId, 'INV2-TEST');
      assert.deepEqual(sent.delivery, { mode: 'sandbox', invoiceUrl: clientUrl });
      assert.deepEqual(requests[0], {
        method: 'POST', path: '/v2/invoicing/invoices/INV2-TEST/remind',
        body: { subject: 'Approved subject', note: 'Approved message', send_to_invoicer: false, send_to_recipient: true },
      });
      const stored = JSON.parse(await readFile(path.join(directory, '.data/test.json'), 'utf8'));
      const persisted = stored.drafts.find((d: { id: string }) => d.id === draft.id);
      assert.equal(persisted.subject, 'Approved subject');
      assert.equal(persisted.note, 'Approved message');
      assert.deepEqual(persisted.delivery, sent.delivery);
    });

    await t.test('new invoices retrieve their client view only after PayPal accepts sending', async () => {
      requests.length = 0;
      const draft = await invoice();
      const sent = await sendDraft(draft.id, { note: 'Approved invoice note' });
      assert.equal(sent.status, 'sent');
      assert.equal(sent.paypalId, 'INV2-NEW');
      assert.deepEqual(sent.delivery, { mode: 'sandbox', invoiceUrl: clientUrl });
      assert.deepEqual(requests.map(({ method, path }) => `${method} ${path}`), [
        'POST /v2/invoicing/invoices', 'POST /v2/invoicing/invoices/INV2-NEW/send', 'GET /v2/invoicing/invoices/INV2-NEW',
      ]);
      assert.equal((requests[0].body?.detail as { note: string }).note, 'Approved invoice note');
      assert.deepEqual(requests[0].body?.primary_recipients, [{
        billing_info: { name: { given_name: 'Test', surname: 'Client' }, business_name: 'Test client', email_address: 'client@example.test' },
      }]);
    });

    await t.test('a preview lookup failure never changes an accepted send to failed or allows resending', async () => {
      lookupFails = true;
      const remindersBefore = (await readStore()).reminders.length;
      const draft = await reminder();
      const sent = await sendDraft(draft.id);
      assert.equal(sent.status, 'sent');
      assert.deepEqual(sent.delivery, { mode: 'sandbox' });
      const before = requests.length;
      await assert.rejects(sendDraft(draft.id), /already sent/);
      assert.equal(requests.length, before);
      assert.equal((await readStore()).reminders.length, remindersBefore + 1);
      lookupFails = false;
    });

    await t.test('missing, malformed and non-PayPal URLs are never exposed as client links', async () => {
      for (const value of [
        undefined, 'not a URL', 'javascript:alert(1)', 'http://www.paypal.com/invoice/test',
        'https://www.paypal.com.evil.example/invoice/test', 'https://user:pass@www.paypal.com/invoice/test',
        'https://www.paypal.com:8443/invoice/test',
      ]) {
        invoiceUrl = value;
        const draft = await reminder();
        const sent = await sendDraft(draft.id);
        assert.equal(sent.status, 'sent');
        assert.deepEqual(sent.delivery, { mode: 'sandbox' });
      }
      invoiceUrl = clientUrl;
    });

    await t.test('rejected sends do not claim PayPal acceptance or retrieve a client link', async () => {
      sendFails = true;
      requests.length = 0;
      const draft = await reminder();
      const failed = await sendDraft(draft.id);
      assert.equal(failed.status, 'failed');
      assert.match(failed.error ?? '', /Send rejected/);
      assert.equal(failed.delivery, undefined);
      assert.equal(requests.length, 1);
      sendFails = false;
    });

    await t.test('demo reminders and invoices remain simulated with no PayPal requests or links', async () => {
      process.env.OWED_MODE = 'demo';
      requests.length = 0;
      for (const draft of [await reminder(), await invoice()]) {
        const sent = await sendDraft(draft.id);
        assert.equal(sent.status, 'sent');
        assert.deepEqual(sent.delivery, { mode: 'demo' });
      }
      assert.equal(requests.length, 0);
      assert.ok((await readStore()).audit.some((a) => a.action === 'simulated reminder'));
      assert.ok((await readStore()).audit.some((a) => a.action === 'simulated invoice'));
    });
  } finally {
    process.chdir(cwd);
    process.env = env;
    await rm(directory, { recursive: true, force: true });
  }
});
