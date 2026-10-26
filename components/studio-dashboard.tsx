'use client';

import { useMemo, useRef } from 'react';
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
  // Agents read the newest ledger through a ref, so the harness (built once) never sees stale data.
  const ledgerRef = useRef(ledger);
  ledgerRef.current = ledger;
  const onDraftRef = useRef(onDraft);
  onDraftRef.current = onDraft;

  const data = useMemo(() => buildStudioData(ledger), [ledger]);
  const ai = useMemo(
    () => (aiEnabled ? buildAi({ ledger: () => ledgerRef.current, onDraft: () => onDraftRef.current() }) : undefined),
    [aiEnabled],
  );
  const [initialState] = useMemo(() => [{ ...initialReport, selectedPageId: pageId }], []); // eslint-disable-line react-hooks/exhaustive-deps

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
