// AG Studio data sources over the receivables ledger: one table per row type, related by client,
// plus a shared calendar so every date can be grouped by month or week.
import type { AgDataSourcesDefinition, AgFieldDefinition, AgFormat, AgRelationDefinition } from 'ag-studio';
import type { Ledger } from '@/lib/receivables';

type FieldSpec = [id: string, name: string, format: AgFormat, hide?: boolean];
// Whole dollars read better on a receivables dashboard than Studio's default two-decimal numbers.
const FORMAT_OPTIONS: Partial<Record<AgFormat, { format: Intl.NumberFormat }>> = {
  currencyFormat: { format: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }) },
  decimalFormat: { format: new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }) },
  percentageFormat: { format: new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 0 }) },
};
const fields = (specs: FieldSpec[]): AgFieldDefinition[] =>
  specs.map(([id, name, format, hide]) => ({
    id,
    name,
    format,
    ...(FORMAT_OPTIONS[format] && { formatOptions: FORMAT_OPTIONS[format] }),
    ...(hide && { hide }),
  }));

const toClient = (id: string, tableId: string): AgRelationDefinition => ({
  id,
  source: { tableId, fieldId: 'clientId' },
  target: { tableId: 'clients', fieldId: 'id' },
  type: 'many-to-one',
});

const onCalendar = (tableId: string, fieldId: string): AgRelationDefinition => ({
  id: `${tableId}-${fieldId}-calendar`,
  source: { tableId, fieldId },
  target: { calendarId: 'calendar' },
});

export function buildStudioData(ledger: Ledger): AgDataSourcesDefinition {
  const dates = [...ledger.invoices.map((i) => i.invoiceDate), ...ledger.forecast.map((f) => f.expectedDate)].sort();

  return {
    description:
      `Accounts receivable for ${ledger.business}, a small design studio that bills clients through PayPal invoices. ` +
      'All amounts are USD. "Outstanding" is what is still owed on open invoices; "Overdue" is the part of that past its due date. ' +
      'Client risk scores (0-100) blend how late a client usually pays with how late they are now.',
    sources: [
      {
        id: 'clients',
        description: 'One row per client, with payment behaviour computed from their PayPal invoice history.',
        data: ledger.clients,
        fields: fields([
          ['id', 'Client Email', 'textFormat', true],
          ['company', 'Client', 'textFormat'],
          ['name', 'Contact', 'textFormat'],
          ['email', 'Email', 'textFormat'],
          ['invoiceCount', 'Invoices', 'integerFormat'],
          ['billed', 'Billed', 'currencyFormat'],
          ['collected', 'Collected', 'currencyFormat'],
          ['outstanding', 'Client Outstanding', 'currencyFormat'],
          ['overdue', 'Client Overdue', 'currencyFormat'],
          ['avgDaysToPay', 'Avg Days to Pay', 'decimalFormat'],
          ['avgDaysLate', 'Avg Days Late', 'decimalFormat'],
          ['onTimeRate', 'On-time Rate', 'percentageFormat'],
          ['riskScore', 'Risk Score', 'integerFormat'],
          ['riskLevel', 'Risk', 'textFormat'],
          ['suggestedTone', 'Suggested Tone', 'textFormat'],
        ]),
      },
      {
        id: 'invoices',
        description: 'One row per PayPal invoice. Aging Bucket groups open invoices by how far past due they are.',
        data: ledger.invoices,
        fields: fields([
          ['id', 'PayPal Invoice ID', 'textFormat', true],
          ['number', 'Invoice', 'textFormat'],
          ['clientId', 'Client Email', 'textFormat', true],
          ['client', 'Invoice Client', 'textFormat', true],
          ['description', 'Work', 'textFormat'],
          ['status', 'PayPal Status', 'textFormat'],
          ['statusGroup', 'Status', 'textFormat'],
          ['invoiceDate', 'Invoice Date', 'dateFormat'],
          ['dueDate', 'Due Date', 'dateFormat'],
          ['paidDate', 'Paid Date', 'dateFormat'],
          ['total', 'Invoice Total', 'currencyFormat'],
          ['paid', 'Paid', 'currencyFormat'],
          ['outstanding', 'Outstanding', 'currencyFormat'],
          ['overdueAmount', 'Overdue', 'currencyFormat'],
          ['daysOverdue', 'Days Overdue', 'integerFormat'],
          ['agingBucket', 'Aging Bucket', 'textFormat'],
          ['daysToPay', 'Days to Pay', 'integerFormat'],
          ['daysLate', 'Days Late', 'integerFormat'],
          ['remindersSent', 'Reminders Sent', 'integerFormat'],
        ]),
      },
      {
        id: 'payments',
        description: 'Payments recorded against invoices.',
        data: ledger.payments,
        fields: fields([
          ['id', 'Payment ID', 'textFormat', true],
          ['invoiceId', 'Payment Invoice ID', 'textFormat', true],
          ['clientId', 'Payment Client Email', 'textFormat', true],
          ['date', 'Payment Date', 'dateFormat'],
          ['amount', 'Payment Amount', 'currencyFormat'],
          ['method', 'Payment Method', 'textFormat'],
        ]),
      },
      {
        id: 'forecast',
        name: 'Cash Forecast',
        description:
          'Expected collection of every open invoice: due date shifted by the client\'s usual lateness. Confidence follows client risk.',
        data: ledger.forecast,
        fields: fields([
          ['id', 'Forecast ID', 'textFormat', true],
          ['invoiceId', 'Forecast Invoice ID', 'textFormat', true],
          ['clientId', 'Forecast Client Email', 'textFormat', true],
          ['client', 'Forecast Client', 'textFormat', true],
          ['expectedDate', 'Expected Date', 'dateFormat'],
          ['expectedWeek', 'Expected Week', 'dateFormat'],
          ['amount', 'Expected Cash', 'currencyFormat'],
          ['confidence', 'Confidence', 'textFormat'],
        ]),
      },
    ],
    relationships: [
      toClient('invoice-client', 'invoices'),
      toClient('payment-client', 'payments'),
      toClient('forecast-client', 'forecast'),
      onCalendar('invoices', 'invoiceDate'),
      onCalendar('payments', 'date'),
    ],
    calendars: [
      {
        id: 'calendar',
        label: 'Calendar',
        range: {
          from: { type: 'date', value: dates[0] ?? ledger.asOf },
          to: { type: 'date', value: dates.at(-1) ?? ledger.asOf },
        },
        fragments: ['year', 'quarter', 'month', 'week', 'day'],
      },
    ],
    expressions: [
      {
        id: 'collectionRate',
        name: 'Collection Rate',
        description: 'Paid / billed.',
        format: 'percentageFormat',
        formatOptions: FORMAT_OPTIONS.percentageFormat,
        isMeasure: true,
        expression: { operator: 'divide', inputs: [{ id: 'invoices.paid', aggregation: 'sum' }, { id: 'invoices.total', aggregation: 'sum' }] },
      },
    ],
  };
}
