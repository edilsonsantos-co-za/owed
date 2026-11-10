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
const INK = '#10201a';
const theme = studioTheme.withParams({
  fontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  accentColor: '#5a3fe0',
  backgroundColor: '#fffdf8',
  foregroundColor: INK,
  textColor: INK,
  subtleTextColor: '#6b776f',
  borderColor: '#e4ddcf',
  borderRadius: 8,
  rowHoverColor: '#f4f1ea',
  studioWrapperBackgroundColor: '#f4f1ea',
  studioWrapperBorder: 'none',
  studioWrapperSpacing: 0,
  studioCanvasPadding: 0,
  studioCanvasRowHeight: 20,
  studioCanvasBackgroundColor: '#f4f1ea',
  studioCanvasBorder: 'none',
  studioCanvasShadow: 'none',
  studioPanelContainerBorder: '1px solid #e4ddcf',
  studioPanelContainerBorderRadius: 16,
  studioWidgetBorder: '1px solid #e4ddcf',
  studioWidgetBorderRadius: 16,
  studioWidgetPadding: 20,
  studioWidgetTitleFontSize: 15,
  studioWidgetTitleFontWeight: 500,
  studioWidgetTitleTextColor: INK,
  studioWidgetSubtitleFontSize: 12,
  studioWidgetSubtitleTextColor: '#6b776f',
  studioAiPanelWidth: 420,
  gridHeaderBackgroundColor: '#fffdf8',
  gridHeaderTextColor: '#6b776f',
  gridHeaderFontWeight: 500,
  gridHeaderFontSize: 12,
  gridCellFontSize: 13,
  gridRowHeight: 40,
  gridHeaderHeight: 36,
  gridWrapperBorder: 'none',
  gridColumnBorder: 'none',
  gridRowBorder: '1px solid #efe9dd',
  chartFontFamily: 'var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif',
  chartGridLineColor: '#ece6da',
  chartAxisLineColor: '#d9d1c1',
  chartSubtleTextColor: '#6b776f',
  // Distinguishable series colours. Studio orders series alphabetically, so the forecast's High / Low / Medium
  // confidence lands on green / sand (faded: least sure) / ochre.
  chartPaletteFills1Color: '#0f7b53',
  chartPaletteFills2Color: '#cdbb9c',
  chartPaletteFills3Color: '#e0a33a',
  chartPaletteFills4Color: '#5a3fe0',
  chartPaletteFills5Color: '#4f7a8a',
  chartPaletteFills6Color: '#a3826a',
  chartPaletteFills7Color: '#8fb8a0',
  chartPaletteStrokes1Color: '#0f7b53',
  chartPaletteStrokes2Color: '#cdbb9c',
  chartPaletteStrokes3Color: '#e0a33a',
  chartPaletteStrokes4Color: '#5a3fe0',
  chartPaletteStrokes5Color: '#4f7a8a',
  chartPaletteStrokes6Color: '#a3826a',
  chartPaletteStrokes7Color: '#8fb8a0',
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
