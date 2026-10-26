// The report Owed opens on: a Receivables page (what is owed, how late, and when cash will land)
// and a Clients page (who pays how). Field ids refer to the data sources in ./data.ts.
import type { AgPageState, AgReportState, AgWidgetLayoutState } from 'ag-studio';

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string, subtitle?: string) => ({
  title: { enabled: true, text },
  ...(subtitle && { subtitle: { enabled: true, text: subtitle } }),
});
// Stacked charts need their legend, or the colours mean nothing.
const withLegend = (format: ReturnType<typeof title>) => ({
  ...format,
  style: { theme: { common: { legend: { enabled: true, position: 'bottom' as const } } } },
});
const sum = (id: string) => ({ id, aggregation: 'sum' as const });
const avg = (id: string) => ({ id, aggregation: 'avg' as const });

export const PAGE_TITLES: Record<string, string> = {
  receivables: 'Receivables',
  clients: 'Clients',
};

const receivables: AgPageState = {
  id: 'receivables',
  widgets: {
    aging: {
      type: 'column-chart-stacked',
      dataMapping: {
        categoryKey: [{ id: 'invoices.agingBucket' }],
        valueKey: [sum('invoices.outstanding')],
        legendKey: [{ id: 'clients.company' }],
      },
      format: withLegend(title('Aging', 'Outstanding by days past due, per client')),
    },
    forecast: {
      type: 'column-chart-stacked',
      dataMapping: {
        categoryKey: [{ id: 'forecast.expectedWeek' }],
        valueKey: [sum('forecast.amount')],
        legendKey: [{ id: 'forecast.confidence' }],
      },
      format: withLegend(title('Cash forecast', "Expected by week, shifted by each client's usual lateness; colour is confidence")),
    },
    'open-invoices': {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'invoices.number' },
          { id: 'clients.company' },
          { id: 'invoices.description' },
          { id: 'invoices.statusGroup' },
          { id: 'invoices.dueDate' },
          { id: 'invoices.daysOverdue' },
          { id: 'invoices.remindersSent' },
          sum('invoices.outstanding'),
        ],
      },
      sort: [{ field: { id: 'invoices.daysOverdue' }, direction: 'desc' }],
      format: title('Open invoices, most overdue first'),
    },
  },
  widgetLayout: {
    aging: at(0, 0, 12, 17),
    forecast: at(12, 0, 12, 17),
    'open-invoices': at(0, 17, 24, 19),
  },
  filter: {
    page: [{ field: { id: 'invoices.statusGroup' }, model: { operator: 'isIn', value: ['Open', 'Overdue'] } }],
  },
};

const clients: AgPageState = {
  id: 'clients',
  widgets: {
    risk: {
      type: 'bar-chart-grouped',
      dataMapping: { categoryKey: [{ id: 'clients.company' }], valueKey: [sum('clients.riskScore')] },
      format: title('Payment risk', '0–100, from lateness history and current overdue'),
    },
    lateness: {
      type: 'bar-chart-grouped',
      dataMapping: { categoryKey: [{ id: 'clients.company' }], valueKey: [avg('invoices.daysToPay')] },
      format: title('Days to pay', 'Average days from invoice to payment'),
    },
    'client-grid': {
      type: 'grid',
      dataMapping: {
        cols: [
          { id: 'clients.company' },
          { id: 'clients.name' },
          { id: 'clients.riskLevel' },
          { id: 'clients.suggestedTone' },
          avg('clients.avgDaysLate'),
          avg('clients.onTimeRate'),
          sum('clients.billed'),
          sum('clients.outstanding'),
          sum('clients.overdue'),
        ],
      },
      sort: [{ field: sum('clients.overdue'), direction: 'desc' }],
      format: title('Client payment behaviour', 'Sorted by overdue amount'),
    },
  },
  widgetLayout: {
    risk: at(0, 0, 12, 17),
    lateness: at(12, 0, 12, 17),
    'client-grid': at(0, 17, 24, 19),
  },
};

export const initialReport: AgReportState = {
  selectedPageId: receivables.id,
  pages: [receivables, clients],
};
