'use client';

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  History,
  Inbox,
  LayoutDashboard,
  PanelsTopLeft,
  PlugZap,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Logo, cx } from './ui';

export type TourView = 'overview' | 'clients' | 'approvals' | 'activity';
export type TourTarget = TourView | 'customize' | 'ask';

export interface Setup {
  paypal: boolean;
  claude: boolean;
  studio: boolean;
}

interface Step {
  icon: LucideIcon;
  tone: string;
  title: string;
  body: ReactNode;
  view?: TourView;
  anchor?: string;
}

const loop = [
  { icon: PlugZap, label: 'PayPal invoices', note: 'pulled on every refresh' },
  {
    icon: Sparkles,
    label: 'Claude agents',
    note: 'spot risk, draft follow-ups',
  },
  { icon: Inbox, label: 'You approve', note: 'nothing sends without you' },
];

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-2">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const Prompt = ({ children }: { children: string }) => (
  <span className="block rounded-full bg-ai-soft/70 px-4 py-2 text-[13px] text-ink">“{children}”</span>
);

const STEPS: Step[] = [
  {
    icon: Sparkles,
    tone: 'bg-ai-soft text-ai',
    title: 'Welcome to Owed',
    body: (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          Owed reads the invoices you send through PayPal, works out who is late and who is about to be, and drafts the reminders for you. You stay in charge:
          every message waits for your approval. This walkthrough opens each page in turn, about a minute end to end.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {loop.map((s, i) => (
            <div key={s.label} className="relative rounded-[22px] bg-sunken/70 p-3 text-center">
              <s.icon className="mx-auto size-5 text-ink-2" />
              <p className="mt-2 text-[13px] font-semibold text-ink">{s.label}</p>
              <p className="mt-0.5 text-xs text-muted">{s.note}</p>
              {i < loop.length - 1 && <ArrowRight className="absolute -right-3 top-1/2 z-10 size-4 -translate-y-1/2 rounded-full bg-surface text-faint" />}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: LayoutDashboard,
    tone: 'bg-sunken text-ink',
    title: 'Four pages, one workflow',
    view: 'overview',
    anchor: 'nav',
    body: (
      <Bullets
        items={[
          <>
            <b className="text-ink">Overview</b>: what you are owed and what to do today.
          </>,
          <>
            <b className="text-ink">Clients</b>: how each client really pays.
          </>,
          <>
            <b className="text-ink">Approvals</b>: drafts waiting for your yes.
          </>,
          <>
            <b className="text-ink">Activity</b>: everything that happened, and who did it.
          </>,
        ]}
      />
    ),
  },
  {
    icon: LayoutDashboard,
    tone: 'bg-sunken text-ink',
    title: 'Your money at a glance',
    view: 'overview',
    anchor: 'kpis',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        <b className="text-ink">Outstanding</b> is every unpaid invoice. <b className="text-ink">Overdue</b> is the part past its due date.{' '}
        <b className="text-ink">Expected next 14 days</b> is the cash that should land soon, judged by each client&apos;s real habits, not the due date.
      </p>
    ),
  },
  {
    icon: Sparkles,
    tone: 'bg-ai-soft text-ai',
    title: "Today's focus",
    view: 'overview',
    anchor: 'focus',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        Each morning Owed names the clients to chase first and how firmly: <b className="text-ink">friendly</b>, <b className="text-ink">firm</b> or{' '}
        <b className="text-ink">final</b>. With the Claude agents on, an agent checks PayPal and writes this brief for you.
      </p>
    ),
  },
  {
    icon: BarChart3,
    tone: 'bg-sunken text-ink',
    title: 'How late, and when it lands',
    view: 'overview',
    anchor: 'studio',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        <b className="text-ink">Aging</b> groups what is owed by how late it is. <b className="text-ink">Cash forecast</b> shows the weeks the money should
        arrive, shifted by how late each client usually pays. Below them, every open invoice, most overdue first.
      </p>
    ),
  },
  {
    icon: Users,
    tone: 'bg-sunken text-ink',
    title: 'Clients: who pays, and how',
    view: 'clients',
    anchor: 'studio',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        Every client gets a profile from their history: average days late, on-time rate and risk. A client who always pays seven weeks late gets a different
        reminder from one who slipped once.
      </p>
    ),
  },
  {
    icon: Sparkles,
    tone: 'bg-ai-soft text-ai',
    title: 'Ask Owed to do the chasing',
    view: 'overview',
    anchor: 'ask',
    body: (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          <b className="text-ink">Ask Owed</b> opens a chat with the agents beside your dashboard. Anything they write lands in Approvals as a draft. Try:
        </p>
        <div className="mt-3 space-y-2">
          <Prompt>Chase everyone more than 30 days late</Prompt>
          <Prompt>Add a chart of overdue amounts by client</Prompt>
        </div>
      </>
    ),
  },
  {
    icon: Inbox,
    tone: 'bg-good-soft text-good',
    title: 'Approvals: nothing sends without you',
    view: 'approvals',
    anchor: 'page',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        Every draft waits here with its tone and the agent&apos;s reason. Edit the subject or message, then <b className="text-ink">Approve &amp; send</b>:
        Owed sends a real PayPal reminder with a pay button. Or discard it. Agents can never send on their own.
      </p>
    ),
  },
  {
    icon: History,
    tone: 'bg-sunken text-ink',
    title: 'Activity: the audit trail',
    view: 'activity',
    anchor: 'page',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        Every draft, approval, send and PayPal call is logged with who did it: you, an agent, or Owed itself. If a client asks &quot;when did you remind
        me?&quot;, the answer is here.
      </p>
    ),
  },
  {
    icon: PanelsTopLeft,
    tone: 'bg-warn-soft text-warn',
    title: 'Make the dashboard yours',
    view: 'overview',
    anchor: 'customize',
    body: (
      <p className="text-sm leading-relaxed text-ink-2">
        <b className="text-ink">Customize</b> opens the dashboard full screen: move and resize charts, change chart types, drag in new fields. Undo anything,
        save when you are happy, or reset to the default.
      </p>
    ),
  },
];

/** True on the hosted demo, where visitors can't edit .env.local, so the setup step shows status instead. */
const isHosted = () => {
  try {
    return !['localhost', '127.0.0.1'].includes(window.location.hostname);
  } catch {
    return false;
  }
};

export const setupTitle = (setup: Setup) =>
  isHosted() || (setup.paypal && setup.claude) ? 'Connected and ready' : 'Connect your accounts';

function SetupStep({ setup }: { setup: Setup }) {
  const hosted = isHosted();
  const rows = [
    {
      done: setup.paypal,
      name: 'PayPal sandbox',
      what: setup.paypal ? 'Live sandbox invoices, payments and reminders' : 'Real invoices, payments and reminders',
      how: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from developer.paypal.com, then npm run seed',
      off: 'Using built-in demo data',
    },
    {
      done: setup.claude,
      name: 'Claude (Anthropic API)',
      what: 'Ask Owed, the collections agent and the morning brief',
      how: 'ANTHROPIC_API_KEY from console.anthropic.com',
      off: 'Agents are off',
    },
    {
      done: setup.studio,
      name: 'AG Studio licence',
      what: setup.studio ? 'Dashboard and agent framework, fully licensed' : 'Removes the trial watermark',
      how: 'AG_STUDIO_LICENSE_KEY, free 45-day trial from AG Grid',
      off: 'Trial watermark shows',
    },
  ];
  return (
    <>
      {hosted ? (
        <p className="text-sm leading-relaxed text-ink-2">
          This hosted demo is already connected: it reads a <b className="text-ink">PayPal sandbox</b> business (seven clients, no real money) and its agents
          run on <b className="text-ink">Claude</b>. Try <b className="text-ink">Ask Owed</b> → &quot;Chase everyone more than 30 days late&quot;, then approve a
          draft in Approvals.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-ink-2">
          Owed works on demo data out of the box. Add these to <code className="rounded bg-sunken px-1 text-[13px]">.env.local</code> and restart the server
          to switch each one on.
        </p>
      )}
      <ul className="mt-4 divide-y divide-line rounded-[22px] bg-sunken/60">
        {rows.map((r) => (
          <li key={r.name} className="flex gap-3 p-3">
            {r.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" /> : <Circle className="mt-0.5 size-5 shrink-0 text-faint" />}
            <div className="min-w-0 text-[13px]">
              <p className="font-semibold text-ink">
                {r.name} <span className={cx('ml-1 font-normal', r.done ? 'text-good' : 'text-muted')}>{r.done ? 'Connected' : r.off}</span>
              </p>
              <p className="text-muted">{r.what}</p>
              {!r.done && !hosted && <p className="mt-1 text-xs text-ink-2">{r.how}</p>}
            </div>
          </li>
        ))}
      </ul>
      {hosted && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Want it on your own PayPal account? The code is open source: github.com/edilsonsantos-co-za/owed
        </p>
      )}
    </>
  );
}

const SEEN = 'owed.tour.v2';

export function tourSeen() {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
}

type Box = { top: number; left: number; width: number; height: number };

export default function WelcomeTour({
  open,
  initialStep = 0,
  setup,
  onClose,
  onView,
}: {
  open: boolean;
  initialStep?: number;
  setup: Setup;
  onClose: () => void;
  onView: (view: TourView) => void;
}) {
  const [step, setStep] = useState(initialStep);
  const [box, setBox] = useState<Box | null>(null);
  const total = STEPS.length + 1;
  const last = step === total - 1;
  const current: Step | undefined = STEPS[step];
  const anchor = current ? current.anchor : 'connections';

  const close = () => {
    try {
      localStorage.setItem(SEEN, '1');
    } catch {}
    onClose();
  };

  // Each step opens its page, then spotlights the part it explains.
  useEffect(() => {
    if (!open) return;
    if (current?.view) onView(current.view);
    if (!anchor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBox(null);
      return;
    }
    let raf = 0;
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`);
      const r = el?.getBoundingClientRect();
      setBox(r && r.width > 0 ? { top: r.top - 8, left: r.left - 8, width: r.width + 16, height: Math.min(r.height + 16, window.innerHeight - r.top) } : null);
    };
    const settle = window.setTimeout(() => {
      document.querySelector<HTMLElement>(`[data-tour="${anchor}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      measure();
      window.setTimeout(measure, 450);
    }, 260);
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.clearTimeout(settle);
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setStep((s) => Math.min(s + 1, total - 1));
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open) return null;
  const Icon = current?.icon ?? PlugZap;
  const spot = anchor ? box : null;

  // Rendered on <body> so no part of the app (the side nav included) can sit above the spotlight.
  return createPortal(
    <div className="fixed inset-0 z-[1000]">
      {spot ? (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[26px] transition-all duration-300 ease-out"
          style={{
            ...spot,
            outline: '2px solid #3ddc97',
            background: 'rgb(61 220 151 / 0.07)',
            boxShadow: '0 0 0 9999px rgb(16 32 26 / 0.55), 0 0 28px 4px rgb(61 220 151 / 0.35)',
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-ink/45 backdrop-blur-[2px]" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className={cx(
          'toast-in fixed flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-[28px] bg-surface shadow-[var(--shadow-pop)]',
          spot
            ? 'inset-x-4 bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[420px]'
            : 'left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-[540px] -translate-x-1/2 -translate-y-1/2',
        )}
      >
        <div className="flex items-center gap-2 px-6 pt-5">
          <Logo size={22} />
          <span className="text-[13px] font-semibold text-ink">How Owed works</span>
          <span className="ml-auto text-xs font-medium text-muted">
            {step + 1} of {total}
          </span>
          <button onClick={close} aria-label="Close the walkthrough" className="rounded-full p-1.5 text-muted hover:bg-sunken hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 pb-5 pt-4">
          <div className="flex items-center gap-3">
            <span className={cx('grid size-10 shrink-0 place-items-center rounded-full', current?.tone ?? 'bg-sunken text-ink-2')}>
              <Icon className="size-5" />
            </span>
            <h2 id="tour-title" className="serif text-[22px] leading-tight text-ink">
              {current?.title ?? setupTitle(setup)}
            </h2>
          </div>
          <div className="mt-3">{current ? current.body : <SetupStep setup={setup} />}</div>
        </div>

        <div className="flex items-center gap-2 px-6 pb-5">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                tabIndex={-1}
                onClick={() => setStep(i)}
                className={cx('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-ink' : 'w-1.5 bg-line-strong hover:bg-faint')}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {step === 0 ? (
              <Button variant="ghost" size="sm" onClick={close}>
                Skip
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => (last ? close() : setStep(step + 1))}>
              {step === 0 ? 'Show me around' : last ? 'Start using Owed' : 'Next'}
              {!last && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export const SETUP_STEP = STEPS.length;
