// The report Owed opens on: a Receivables page (what is owed, how late, and when cash will land)
// and a Clients page (who pays how). Field ids refer to the data sources in ./data.ts.
import type { AgPageState, AgReportState, AgWidgetLayoutState } from 'ag-studio';

const at = (xTrack: number, yTrack: number, xSpan: number, ySpan: number): AgWidgetLayoutState => ({ xTrack, yTrack, xSpan, ySpan });
const title = (text: string) => ({ title: { enabled: true, text } });
const sum = (id: string) => ({ id, aggregation: 'sum' as const });
const avg = (id: string) => ({ id, aggregation: 'avg' as const });

const kpi = (text: string, value: { id: string; aggregation?: 'sum' | 'avg' | 'countd' }) => ({
  type: 'value' as const,
  dataMapping: { value: [value] },
  format: { title: { enabled: true, text } },
});

export const PAGE_TITLES: Record<string, string> = {
  receivables: 'Receivables',
  clients: 'Clients',
};

const receivables: AgPageState = {
  id: 'receivables',
  widgets: {
    'kpi-outstanding': kpi('Outstanding', sum('invoices.outstanding')),
    'kpi-overdue': kpi('Overdue', sum('invoices.overdueAmount')),
    'kpi-open': kpi('Open invoices', { id: 'invoices.number', aggregation: 'countd' }),
    'kpi-late': kpi('Avg days overdue', avg('invoices.daysOverdue')),
    aging: {
      type: 'column-chart-stacked',
      dataMapping: {
        categoryKey: [{ id: 'invoices.agingBucket' }],
        valueKey: [sum('invoices.outstanding')],
        legendKey: [{ id: 'clients.company' }],
      },
      format: title('Outstanding by age, stacked by client'),
    },
    forecast: {
      type: 'column-chart-stacked',
      dataMapping: {
        categoryKey: [{ id: 'forecast.expectedWeek' }],
        valueKey: [sum('forecast.amount')],
        legendKey: [{ id: 'forecast.confidence' }],
      },
      format: title('Cash forecast by week (confidence from client history)'),
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
    'kpi-outstanding': at(0, 0, 6, 7),
    'kpi-overdue': at(6, 0, 6, 7),
    'kpi-open': at(12, 0, 6, 7),
    'kpi-late': at(18, 0, 6, 7),
    aging: at(0, 7, 12, 18),
    forecast: at(12, 7, 12, 18),
    'open-invoices': at(0, 25, 24, 18),
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
      format: title('Payment risk score by client'),
    },
    lateness: {
      type: 'bar-chart-grouped',
      dataMapping: { categoryKey: [{ id: 'clients.company' }], valueKey: [avg('invoices.daysToPay')] },
      format: title('Average days to pay, by client'),
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
      format: title('Client payment behaviour'),
    },
  },
  widgetLayout: {
    risk: at(0, 0, 12, 18),
    lateness: at(12, 0, 12, 18),
    'client-grid': at(0, 18, 24, 18),
  },
};

export const initialReport: AgReportState = {
  selectedPageId: receivables.id,
  pages: [receivables, clients],
};
