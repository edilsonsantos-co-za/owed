'use client';

import { useEffect, useMemo, useState } from 'react';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { AgStudioAiModule, studioTheme, type AgPanelConfig, type AgReportState, type AgStudioApi } from 'ag-studio';
import type { Ledger } from '@/lib/receivables';
import { buildStudioData } from '@/lib/studio/data';
import { initialReport } from '@/lib/studio/report';
import { buildAi } from '@/lib/studio/agents';
import { loadPages } from '@/lib/layout';

export type StudioSurface = 'view' | 'copilot' | 'customize';

interface Props {
  ledger: Ledger;
  licenseKey?: string;
  aiEnabled: boolean;
  pageId: string;
  surface: StudioSurface;
  onDraft: () => void;
  onApi: (api: AgStudioApi) => void;
  onStateUpdated?: (state: AgReportState) => void;
}

// Without a licence key, AG Studio prints its trial banner through console.error, one line per row of
// asterisks. Next.js counts each line as an app error, so the banner goes to console.info instead.
if (typeof window !== 'undefined') {
  const error = console.error;
  console.error = (...args: unknown[]) => {
    const [first] = args;
    if (args.length === 1 && typeof first === 'string' && /^\*.*\*$/.test(first.trim())) return console.info(first);
    error(...args);
  };
}

// Matches the tokens in app/globals.css so Studio reads as part of the app, not an embed.
const INK = '#0f1729';
const theme = studioTheme.withParams({
  fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  accentColor: '#6d4aff',
  backgroundColor: '#ffffff',
  foregroundColor: INK,
  textColor: INK,
  subtleTextColor: '#6b7385',
  borderColor: '#e7e9ee',
  borderRadius: 8,
  rowHoverColor: '#f6f7f9',
  studioWrapperBackgroundColor: '#f6f7f9',
  studioWrapperBorder: 'none',
  studioWrapperSpacing: 0,
  studioCanvasPadding: 0,
  studioCanvasRowHeight: 20,
  studioCanvasBackgroundColor: '#f6f7f9',
  studioCanvasBorder: 'none',
  studioCanvasShadow: 'none',
  studioPanelContainerBorder: '1px solid #e7e9ee',
  studioPanelContainerBorderRadius: 12,
  studioWidgetBorder: '1px solid #e7e9ee',
  studioWidgetBorderRadius: 12,
  studioWidgetPadding: 16,
  studioWidgetTitleFontSize: 14,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: INK,
  studioWidgetSubtitleFontSize: 12,
  studioWidgetSubtitleTextColor: '#6b7385',
  studioAiPanelWidth: 420,
  gridHeaderBackgroundColor: '#ffffff',
  gridHeaderTextColor: '#6b7385',
  gridHeaderFontWeight: 500,
  gridHeaderFontSize: 12,
  gridCellFontSize: 13,
  gridRowHeight: 40,
  gridHeaderHeight: 36,
  gridWrapperBorder: 'none',
  gridColumnBorder: 'none',
  gridRowBorder: '1px solid #f0f1f4',
  chartFontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  chartGridLineColor: '#eef0f3',
  chartAxisLineColor: '#e2e5ea',
  chartSubtleTextColor: '#6b7385',
  // Distinguishable series colours. Studio orders series alphabetically, so the forecast's High / Low / Medium
  // confidence lands on green / red / amber.
  chartPaletteFills1Color: '#0b8a5f',
  chartPaletteFills2Color: '#e1475a',
  chartPaletteFills3Color: '#f59e0b',
  chartPaletteFills4Color: '#6d4aff',
  chartPaletteFills5Color: '#0ea5e9',
  chartPaletteFills6Color: '#94a3b8',
  chartPaletteFills7Color: '#14b8a6',
  chartPaletteStrokes1Color: '#0b8a5f',
  chartPaletteStrokes2Color: '#e1475a',
  chartPaletteStrokes3Color: '#f59e0b',
  chartPaletteStrokes4Color: '#6d4aff',
  chartPaletteStrokes5Color: '#0ea5e9',
  chartPaletteStrokes6Color: '#94a3b8',
  chartPaletteStrokes7Color: '#14b8a6',
});

// View mode is a clean dashboard; "copilot" is edit mode showing only the chat; "customize" is the full editor.
const PANELS: Record<StudioSurface, AgPanelConfig> = {
  view: { view: { left: [], right: [] } },
  copilot: { view: { left: [], right: [] }, edit: { left: [], right: ['ai'] } },
  customize: { view: { left: [], right: [] }, edit: { left: ['data'], right: ['edit', 'filters'] } },
};

export default function StudioDashboard({ ledger, licenseKey, aiEnabled, pageId, surface, onDraft, onApi, onStateUpdated }: Props) {
  // The harness is built once, so agents read the newest ledger through this holder rather than a
  // value captured at creation. It lives outside React state on purpose: changing it must not re-render.
  const [live] = useState(() => ({ ledger, onDraft }));
  useEffect(() => {
    Object.assign(live, { ledger, onDraft });
  }, [live, ledger, onDraft]);

  const data = useMemo(() => buildStudioData(ledger), [ledger]);
  const [ai] = useState(() => (aiEnabled ? buildAi({ ledger: () => live.ledger, onDraft: () => live.onDraft() }) : undefined));
  const [initialState] = useState(() => ({
    ...initialReport,
    pages: loadPages() ?? initialReport.pages,
    selectedPageId: pageId,
    panels: { ai: { collapsed: false, width: 420 } },
  }));

  return (
    <AgStudioProvider licenseKey={licenseKey} modules={ai ? [AgStudioAiModule] : undefined}>
      <AgStudio
        style={{ height: '100%', width: '100%' }}
        data={data}
        ai={ai}
        theme={theme}
        mode={surface === 'view' ? 'view' : 'edit'}
        panels={PANELS[surface]}
        initialState={initialState}
        localeText={{ aiMessageInputPlaceholder: 'Ask Owed about your invoices, clients or this dashboard…' }}
        onApiReady={(event) => onApi(event.api)}
        onStateUpdated={onStateUpdated && ((event) => onStateUpdated(event.state))}
      />
    </AgStudioProvider>
  );
}
