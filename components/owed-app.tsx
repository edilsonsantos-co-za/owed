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
import SideNav, { type View } from './side-nav';
import WelcomeTour, { SETUP_STEP, tourSeen } from './welcome-tour';

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

export interface AppUser {
  name?: string;
  email?: string;
  admin?: boolean;
}

export default function OwedApp({
  licenseKey,
  aiEnabled,
  briefEnabled,
  user,
}: {
  licenseKey?: string;
  aiEnabled: boolean;
  briefEnabled: boolean;
  user?: AppUser | null;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('overview');
  const [surface, setSurface] = useState<StudioSurface>('view');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const apiRef = useRef<AgStudioApi | null>(null);
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
    window.history.replaceState(null, '', next === 'overview' ? '/app' : `/app?view=${next}`);
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
      notify(`${added} new draft${added === 1 ? '' : 's'} waiting for your approval`, {
        label: 'Review',
        onClick: () => {
          setSurface('view');
          go('approvals');
        },
      });
    }
  }, [go, notify]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    // /app?view=approvals (links from /admin and the side nav there) opens that view
    const wanted = new URLSearchParams(window.location.search).get('view') as View | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wanted && wanted in VIEWS && wanted !== 'overview') go(wanted);
  }, [go]);

  useEffect(() => {
    // First visit: explain the app before anything else. Read after mount, since localStorage is browser-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!tourSeen()) setTour({ open: true, step: 0 });
  }, []);

  // Owed AI opens as a pop-up over whatever page is showing, so it never has to be found in the page.
  const openCopilot = useCallback(() => {
    if (!aiEnabled) return;
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
  }, [aiEnabled]);

  useEffect(() => {
    if (surface !== 'copilot') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSurface('view');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [surface]);

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

  const ledger = snapshot?.ledger;
  const pending = snapshot?.drafts.filter((d) => d.status === 'pending').length ?? 0;
  const live = ledger?.mode === 'live';
  const studioVisible = !!VIEWS[view].studioPage;
  const copilot = surface === 'copilot';

  return (
    <div className="flex h-dvh bg-canvas text-ink">
      <SideNav
        active={view}
        onGo={go}
        pending={pending}
        business={ledger?.business}
        live={live}
        aiEnabled={aiEnabled}
        user={user && { name: user.name, email: user.email, admin: user.admin }}
        onTour={() => setTour({ open: true, step: 0 })}
        onSetup={() => setTour({ open: true, step: SETUP_STEP })}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-canvas/85 px-4 py-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={24} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="serif text-[30px] leading-none text-ink">{VIEWS[view].title}</h1>
              {ledger && !live && <Badge tone="warn">Demo data</Badge>}
            </div>
            <p className="mt-1 hidden text-[13px] text-muted sm:block">
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
              <Button size="sm" onClick={startEditing} title="Edit this dashboard full screen" data-tour="customize">
                <PanelsTopLeft className="size-4" />
                Customize
              </Button>
            )}
            <Button
              variant="ai"
              size="sm"
              onClick={() => (copilot ? setSurface('view') : openCopilot())}
              disabled={!aiEnabled}
              data-tour="ask"
              title={aiEnabled ? 'Chat with the Owed agents' : 'Set ANTHROPIC_API_KEY to enable the agents'}
            >
              <Sparkles className="size-4" />
              Ask Owed
            </Button>
          </div>
          <nav className="flex w-full gap-1 overflow-x-auto lg:hidden" aria-label="Main">
            {(Object.keys(VIEWS) as View[]).map((id) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={cx('whitespace-nowrap rounded-full px-3 py-1.5 text-sm', view === id ? 'bg-forest font-medium text-white' : 'text-ink-2')}
              >
                {VIEWS[id].label}
                {id === 'approvals' && pending > 0 && ` (${pending})`}
              </button>
            ))}
            {user?.admin && (
              <a href="/admin" className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-ink-2">
                Sign-ups
              </a>
            )}
          </nav>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div data-tour="page" className="mx-auto flex max-w-[1600px] flex-col gap-4 p-4 sm:p-8">
            {error && <div className="rounded-lg border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad">Could not load PayPal data: {error}</div>}

            {view === 'overview' &&
              (ledger ? (
                <>
                  <div data-tour="kpis">
                    <KpiStrip ledger={ledger} />
                  </div>
                  <div data-tour="focus">
                    <MorningBrief key={ledger.asOf} ledger={ledger} enabled={briefEnabled} onAsk={aiEnabled ? openCopilot : undefined} />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="skeleton h-[118px] rounded-xl" />
                  ))}
                </div>
              ))}

            {copilot && <div className="fixed inset-0 z-40 bg-forest/40 backdrop-blur-[2px]" onClick={() => setSurface('view')} aria-hidden />}
            <section
              data-tour="studio"
              role={copilot ? 'dialog' : undefined}
              aria-modal={copilot || undefined}
              className={cx(
                surface === 'customize' && 'fixed inset-0 z-50 flex flex-col bg-canvas',
                copilot &&
                  'fixed inset-2 z-50 mx-auto flex max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-[var(--shadow-pop)] sm:inset-6',
                surface === 'view' && 'overflow-hidden rounded-xl',
                surface === 'view' && !studioVisible && 'hidden',
              )}
              aria-label={surface === 'customize' ? 'Dashboard editor' : copilot ? 'Owed AI' : 'Dashboard'}
            >
              {copilot && (
                <div className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-ai-soft text-ai">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight text-ink">Owed AI</p>
                    <p className="truncate text-xs text-muted">Drafts go to Approvals. Nothing reaches a client until you send it.</p>
                  </div>
                  <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSurface('view')} aria-label="Close Owed AI" title="Close (Esc)">
                    <X className="size-4" />
                  </Button>
                </div>
              )}
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
                className={cx(surface !== 'view' && 'min-h-0 flex-1')}
                // 36 layout rows of 20px (see lib/studio/report.ts); the AI panel needs at least this much room too.
                style={
                  surface === 'view' ? { height: 724 } : undefined
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
        onView={(v) => {
          setSurface('view');
          go(v);
        }}
      />

      {toast && (
        <div
          key={toast.id}
          role="status"
          className="toast-in fixed bottom-5 right-5 z-[60] flex items-center gap-3 rounded-xl bg-forest py-2.5 pl-4 pr-2 text-sm text-white shadow-[var(--shadow-pop)]"
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
