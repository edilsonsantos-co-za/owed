'use client';

import { useEffect, useMemo, useState } from 'react';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { AgStudioAiModule, type AgStudioApi, type AgStudioMode } from 'ag-studio';
import type { Ledger } from '@/lib/receivables';
import { buildStudioData } from '@/lib/studio/data';
import { initialReport } from '@/lib/studio/report';
import { buildAi } from '@/lib/studio/agents';

interface Props {
  ledger: Ledger;
  licenseKey?: string;
  aiEnabled: boolean;
  pageId: string;
  mode: AgStudioMode;
  onDraft: () => void;
  onApi: (api: AgStudioApi) => void;
}

export default function StudioDashboard({ ledger, licenseKey, aiEnabled, pageId, mode, onDraft, onApi }: Props) {
  // The harness is built once, so agents read the newest ledger through this holder rather than a
  // value captured at creation. It lives outside React state on purpose: changing it must not re-render.
  const [live] = useState(() => ({ ledger, onDraft }));
  useEffect(() => {
    Object.assign(live, { ledger, onDraft });
  }, [live, ledger, onDraft]);

  const data = useMemo(() => buildStudioData(ledger), [ledger]);
  const [ai] = useState(() => (aiEnabled ? buildAi({ ledger: () => live.ledger, onDraft: () => live.onDraft() }) : undefined));
  const [initialState] = useState(() => ({ ...initialReport, selectedPageId: pageId }));

  return (
    <AgStudioProvider licenseKey={licenseKey} modules={ai ? [AgStudioAiModule] : undefined}>
      <AgStudio
        style={{ height: '100%', width: '100%' }}
        data={data}
        ai={ai}
        mode={mode}
        initialState={initialState}
        layout={{ widgetBorderEnabled: true }}
        onApiReady={(event) => onApi(event.api)}
      />
    </AgStudioProvider>
  );
}
