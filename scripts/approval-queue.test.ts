import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ApprovalQueue from '../components/approval-queue';
import type { Draft } from '../lib/store';

const common = {
  id: 'preview-test', clientId: 'client@example.test', client: 'Test client',
  amount: 100, currency: 'USD', rationale: 'The invoice is overdue.',
  createdBy: 'collections agent', createdAt: '2026-11-14T09:00:00Z',
  note: 'Approved message',
};
const reminder: Draft = {
  ...common, kind: 'reminder', status: 'pending', invoiceId: 'INV2-TEST',
  invoiceNumber: 'OWED-TEST', daysOverdue: 10, tone: 'friendly', subject: 'Approved subject',
};
const invoice: Draft = {
  ...common, kind: 'invoice', status: 'pending', recipientName: 'Test Client', dueInDays: 14,
  items: [{ name: 'Design work', quantity: 1, unitAmount: 100 }],
};
const render = (draft: Draft) => renderToStaticMarkup(createElement(ApprovalQueue, {
  drafts: [draft], live: true, onChange: () => {}, onNotify: () => {},
}));

test('sent reminders and invoices show preview and reasoning without form fields', () => {
  for (const draft of [reminder, invoice]) {
    for (const delivery of [
      { mode: 'sandbox' as const, invoiceUrl: 'https://www.sandbox.paypal.com/invoice/p/#TEST' },
      { mode: 'demo' as const },
      undefined,
    ]) {
      const html = render({ ...draft, status: 'sent', delivery });
      assert.match(html, /Client preview/);
      assert.match(html, /Why the agent chose this/);
      assert.match(html, /The invoice is overdue\./);
      assert.doesNotMatch(html, /<(?:input|textarea|table)\b/);
      assert.doesNotMatch(html, /Approved subject|Approved message|Design work|content below/);
      assert.doesNotMatch(html, /Approve &amp; send/);
      if (delivery?.invoiceUrl) assert.match(html, /View as client/);
    }
  }
});

test('pending drafts retain editable fields and approval actions', () => {
  for (const draft of [reminder, invoice]) {
    const html = render(draft);
    assert.match(html, /<textarea\b/);
    assert.match(html, /Approved message/);
    assert.match(html, /Approve &amp; send/);
    assert.doesNotMatch(html, /\sreadonly(?:=|\s|>)/i);
    assert.match(html, draft.kind === 'reminder' ? /<input\b/ : /Design work/);
  }
});

test('failed and discarded drafts remain read-only rather than editable', () => {
  for (const status of ['failed', 'discarded'] as const) {
    const html = render({ ...reminder, status });
    assert.match(html, /<textarea\b[^>]*readonly/i);
    assert.doesNotMatch(html, /Approve &amp; send/);
  }
});
