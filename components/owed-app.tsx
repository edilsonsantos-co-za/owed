'use client';

import dynamic from 'next/dynamic';
import { CircleHelp, History, Inbox, LayoutDashboard, PanelsTopLeft, RefreshCw, Sparkles, Users, X, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgReportState, AgStudioApi } from 'ag-studio';
import type { Ledger } from '@/lib/receivables';
import type { AuditEntry, Draft } from '@/lib/store';
import { longDate } from '@/lib/format';
import { savePages } from '@/lib/layout';
import { initialReport, PAGE_TITLES } from '@/lib/studio/report';
import ActivityLog from './activity-log';
import ApprovalQueue from './approval-queue';
import EditorBar from './editor-bar';
import KpiStrip from './kpi-strip';
import MorningBrief from './morning-brief';
import type { StudioSurface } from './studio-dashboard';
import { Badge, Button, Logo, cx } from './ui';
import WelcomeTour, { SETUP_STEP, tourSeen, type TourTarget } from './welcome-tour';

// AG Studio measures the DOM, so it renders in the browser only.
const StudioDashboard = dynamic(() => import('./studio-dashboard'), {
  ssr: false,
  loading: () => <div className="skeleton m-4 h-[calc(100%-2rem)]" />,
});

interface Snapshot {
  ledger: Ledger;
  drafts: Draft[];
  audit: AuditEntry[];
}

type View = 'overview' | 'clients' | 'approvals' | 'activity';

const VIEWS: Record<View, { label: string; icon: LucideIcon; title: string; studioPage?: string }> = {
  overview: {
    label: 'Overview',
    icon: LayoutDashboard,
    title: 'Receivables',
    studioPage: 'receivables',
  },
  clients: {
    label: 'Clients',
    icon: Users,
    title: 'Clients',
    studioPage: 'clients',
  },
  approvals: { label: 'Approvals', icon: Inbox, title: 'Approvals' },
  activity: { label: 'Activity', icon: History, title: 'Activity' },
};

const SUBTITLES: Record<View, string> = {
  overview: 'What you are owed, how late it is, and when the cash will land.',
  clients: 'How each client actually pays, from their PayPal invoice history.',
  approvals: 'Agents draft. You decide what reaches a client.',
  activity: 'Every draft, approval and PayPal call, newest first.',
};

interface Toast {
  id: number;
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function OwedApp({ licenseKey, aiEnabled, briefEnabled }: { licenseKey?: string; aiEnabled: boolean; briefEnabled: boolean }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [surface, setSurface] = useState<StudioSurface>('view');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const apiRef = useRef<AgStudioApi | null>(null);
  const studioRef = useRef<HTMLElement | null>(null);
  const pendingRef = useRef<number | null>(null);
  const viewRef = useRef(view);
  const [tour, setTour] = useState<{ open: boolean; step: number }>({
    open: false,
    step: 0,
  });
  const [history, setHistory] = useState({
    canUndo: false,
    canRedo: false,
    reset: false,
  });
  // The dashboard as it was when the editor opened, so Cancel can put it back.
  const beforeEditRef = useRef<AgReportState | null>(null);

  const notify = useCallback((message: string, action?: Toast['action']) => setToast({ id: Date.now(), message, action }), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const go = useCallback((next: View) => {
    setView(next);
    viewRef.current = next;
    const page = VIEWS[next].studioPage;
    const api = apiRef.current;
    if (page && api) api.setState({ ...api.getState(), selectedPageId: page });
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const res = await fetch('/api/ledger', { cache: 'no-store' });
    const json = await res.json();
    setRefreshing(false);
    if (!res.ok) return setError(json.error ?? `HTTP ${res.status}`);
    setError(null);
    setSnapshot(json);
    // Agents queue drafts while the owner watches the dashboard, so say when new ones arrive.
    const pending = (json.drafts as Draft[]).filter((d) => d.status === 'pending').length;
    const before = pendingRef.current;
    pendingRef.current = pending;
    if (before !== null && pending > before && viewRef.current !== 'approvals') {
      const added = pending - before;
      notify(`${added} new draft${added === 1 ? '' : 's'} waiting for your approval`, { label: 'Review', onClick: () => go('approvals') });
    }
  }, [go, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    // First visit: explain the app before anything else. Read after mount, since localStorage is browser-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!tourSeen()) setTour({ open: true, step: 0 });
  }, []);

  const openCopilot = useCallback(() => {
    if (!aiEnabled) return;
    if (!VIEWS[viewRef.current].studioPage) go('overview');
    setSurface('copilot');
    const api = apiRef.current;
    if (api)
      api.setState({
        ...api.getState(),
        panels: {
          ...api.getState().panels,
          ai: { ...api.getState().panels?.ai, collapsed: false },
        },
      });
    requestAnimationFrame(() => studioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [aiEnabled, go]);

  const startEditing = useCallback(() => {
    if (!VIEWS[viewRef.current].studioPage) go('overview');
    const api = apiRef.current;
    if (api) {
      beforeEditRef.current = api.getState();
      api.clearHistory();
    }
    setHistory({ canUndo: false, canRedo: false, reset: false });
    setSurface('customize');
  }, [go]);

  const finishEditing = useCallback(
    (keep: boolean) => {
      const api = apiRef.current;
      if (api) {
        if (keep) savePages(api.getState().pages);
        else if (beforeEditRef.current)
          api.setState({
            ...beforeEditRef.current,
            selectedPageId: api.getState().selectedPageId,
          });
      }
      beforeEditRef.current = null;
      setSurface('view');
      if (keep) notify('Dashboard saved');
    },
    [notify],
  );

  const resetLayout = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    api.setState({ ...api.getState(), pages: initialReport.pages });
    setHistory((h) => ({ ...h, reset: true }));
  }, []);

  const onStudioState = useCallback(() => {
    const api = apiRef.current;
    if (!api) return;
    const h = api.getHistory();
    setHistory((prev) => ({
      ...prev,
      canUndo: h.undo.length > 0,
      canRedo: h.redo.length > 0,
    }));
  }, []);

  const showFromTour = useCallback(
    (target: TourTarget) => {
      if (target === 'customize') return startEditing();
      if (target === 'ask') return aiEnabled ? openCopilot() : setTour({ open: true, step: SETUP_STEP });
      go(target);
    },
    [aiEnabled, go, openCopilot, startEditing],
  );

  const ledger = snapshot?.ledger;
  const pending = snapshot?.drafts.filter((d) => d.status === 'pending').length ?? 0;
  const live = ledger?.mode === 'live';
  const studioVisible = !!VIEWS[view].studioPage;

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <Logo />
          <span className="text-[17px] font-semibold tracking-tight">Owed</span>
        </div>
        <div className="mx-3 mb-3 rounded-lg border border-line px-3 py-2">
          <p className="truncate text-[13px] font-semibold">{ledger?.business ?? 'Loading…'}</p>
          <p className="text-xs text-muted">{live ? 'PayPal sandbox account' : 'Demo workspace'}</p>
        </div>
        <nav className="flex flex-col gap-0.5 px-3" aria-label="Main">
          {(Object.keys(VIEWS) as View[]).map((id) => {
            const item = VIEWS[id];
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={view === id ? 'page' : undefined}
                className={cx(
                  'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
                  view === id ? 'bg-black/[0.05] font-semibold text-ink' : 'text-ink-2 hover:bg-black/[0.03]',
                )}
              >
                <item.icon className={cx('size-4', view === id ? 'text-ink' : 'text-muted')} />
                {item.label}
                {id === 'approvals' && pending > 0 && (
                  <span className="ml-auto rounded-full bg-ai px-1.5 text-[11px] font-semibold leading-5 text-white">{pending}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 p-3">
          <button
            onClick={() => setTour({ open: true, step: 0 })}
            className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-black/[0.03]"
          >
            <CircleHelp className="size-4 text-muted" />
            How Owed works
          </button>
          <button
            onClick={() => setTour({ open: true, step: SETUP_STEP })}
            className="block w-full rounded-lg border border-line p-3 text-left text-xs hover:border-line-strong hover:bg-canvas"
            title="See what to connect and how"
          >
            <p className="mb-2 flex items-center font-semibold text-ink">
              Connections
              <span className="ml-auto font-medium text-ai">Set up</span>
            </p>
            <p className="flex items-center gap-2 text-ink-2">
              <span className={cx('size-2 rounded-full', live ? 'bg-good' : 'bg-amber-400')} />
              PayPal {live ? 'sandbox' : '· demo data'}
            </p>
            <p className="mt-1.5 flex items-center gap-2 text-ink-2">
              <span className={cx('size-2 rounded-full', aiEnabled ? 'bg-good' : 'bg-faint')} />
              Claude agents {aiEnabled ? '' : '· off'}
            </p>
          </button>
          <p className="px-1 text-[11px] leading-snug text-faint">Agents only draft. Nothing reaches a client without your approval.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{VIEWS[view].title}</h1>
              {ledger && !live && <Badge tone="warn">Demo data</Badge>}
            </div>
            <p className="hidden text-[13px] text-muted sm:block">
              {SUBTITLES[view]}
              {ledger && view === 'overview' && <span className="text-faint"> · {longDate(ledger.asOf)}</span>}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void refresh()} aria-label="Refresh" title="Reload invoices from PayPal">
              <RefreshCw className={cx('size-4', refreshing && 'animate-spin')} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTour({ open: true, step: 0 })}
              aria-label="How Owed works"
              title="How Owed works"
              className="lg:hidden"
            >
              <CircleHelp className="size-4" />
            </Button>
            {studioVisible && (
              <Button size="sm" onClick={startEditing} title="Edit this dashboard full screen">
                <PanelsTopLeft className="size-4" />
                Customize
              </Button>
            )}
            <Button
              variant="ai"
              size="sm"
              onClick={() => (surface === 'copilot' && studioVisible ? setSurface('view') : openCopilot())}
              disabled={!aiEnabled}
              title={aiEnabled ? 'Chat with the Owed agents' : 'Set ANTHROPIC_API_KEY to enable the agents'}
            >
              <Sparkles className="size-4" />
              {surface === 'copilot' && studioVisible ? 'Close Owed AI' : 'Ask Owed'}
            </Button>
          </div>
          <nav className="flex w-full gap-1 overflow-x-auto lg:hidden" aria-label="Main">
            {(Object.keys(VIEWS) as View[]).map((id) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={cx('whitespace-nowrap rounded-lg px-3 py-1.5 text-sm', view === id ? 'bg-black/[0.06] font-semibold' : 'text-ink-2')}
              >
                {VIEWS[id].label}
                {id === 'approvals' && pending > 0 && ` (${pending})`}
              </button>
            ))}
          </nav>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-6">
            {error && <div className="rounded-lg border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">Could not load PayPal data: {error}</div>}

            {view === 'overview' &&
              (ledger ? (
                <>
                  <KpiStrip ledger={ledger} />
                  <MorningBrief key={ledger.asOf} ledger={ledger} enabled={briefEnabled} onAsk={aiEnabled ? openCopilot : undefined} />
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-[118px] rounded-xl" />
                  ))}
                </div>
              ))}

            <section
              ref={studioRef}
              className={cx(
                surface === 'customize' ? 'fixed inset-0 z-50 flex flex-col bg-canvas' : 'scroll-mt-4 overflow-hidden rounded-xl',
                !studioVisible && 'hidden',
              )}
              aria-label={surface === 'customize' ? 'Dashboard editor' : 'Dashboard'}
            >
              {surface === 'customize' && (
                <EditorBar
                  pages={initialReport.pages.map((p) => ({
                    id: p.id,
                    title: PAGE_TITLES[p.id] ?? p.id,
                  }))}
                  pageId={VIEWS[view].studioPage ?? 'receivables'}
                  canUndo={history.canUndo}
                  canRedo={history.canRedo}
                  dirty={history.canUndo || history.reset}
                  onPage={(id) => go(id === 'clients' ? 'clients' : 'overview')}
                  onUndo={() => apiRef.current?.undo()}
                  onRedo={() => apiRef.current?.redo()}
                  onReset={resetLayout}
                  onCancel={() => finishEditing(false)}
                  onSave={() => finishEditing(true)}
                />
              )}
              <div
                className={cx(surface === 'customize' && 'min-h-0 flex-1')}
                // 36 layout rows of 20px (see lib/studio/report.ts); the AI panel needs at least this much room too.
                style={
                  surface === 'customize'
                    ? undefined
                    : {
                        height: surface === 'view' ? 724 : 'max(724px, calc(100dvh - 120px))',
                      }
                }
              >
                {ledger ? (
                  <StudioDashboard
                    ledger={ledger}
                    licenseKey={licenseKey}
                    aiEnabled={aiEnabled}
                    pageId={VIEWS[view].studioPage ?? 'receivables'}
                    surface={surface}
                    onDraft={() => void refresh()}
                    onApi={(api) => (apiRef.current = api)}
                    onStateUpdated={onStudioState}
                  />
                ) : (
                  <div className="skeleton h-full" />
                )}
              </div>
            </section>

            {view === 'approvals' && snapshot && (
              <ApprovalQueue
                drafts={snapshot.drafts}
                live={live}
                onChange={() => void refresh()}
                onAsk={aiEnabled ? openCopilot : undefined}
                onNotify={notify}
              />
            )}
            {view === 'activity' && snapshot && <ActivityLog audit={snapshot.audit} />}
          </div>
        </main>
      </div>

      <WelcomeTour
        key={`${tour.open}-${tour.step}`}
        open={tour.open}
        initialStep={tour.step}
        setup={{ paypal: live, claude: aiEnabled, studio: !!licenseKey }}
        onClose={() => setTour((t) => ({ ...t, open: false }))}
        onShow={showFromTour}
      />

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-xl bg-ink py-2.5 pl-4 pr-2 text-sm text-white shadow-[var(--shadow-pop)]"
        >
          <Sparkles className="size-4 text-[#b9a6ff]" />
          {toast.message}
          {toast.action && (
            <button
              onClick={() => {
                toast.action!.onClick();
                setToast(null);
              }}
              className="rounded-lg bg-white/10 px-2.5 py-1 text-[13px] font-semibold hover:bg-white/20"
            >
              {toast.action.label}
            </button>
          )}
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="rounded-md p-1 text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
