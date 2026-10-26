'use client';

import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Circle,
  Inbox,
  LayoutDashboard,
  PanelsTopLeft,
  PlugZap,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Button, Logo, cx } from './ui';

export type TourTarget = 'overview' | 'clients' | 'approvals' | 'activity' | 'customize' | 'ask';

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
  show?: { label: string; target: TourTarget };
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
  <span className="block rounded-lg border border-ai/15 bg-ai-soft/60 px-3 py-2 text-[13px] text-ink">“{children}”</span>
);

const STEPS: Step[] = [
  {
    icon: Sparkles,
    tone: 'bg-ai-soft text-ai',
    title: 'Owed gets your invoices paid',
    body: (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          Owed reads the invoices you send through PayPal, works out who is late and who is about to be, and drafts the reminders for you. You stay in charge:
          every message waits for your approval.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {loop.map((s, i) => (
            <div key={s.label} className="relative rounded-xl border border-line p-3 text-center">
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
    tone: 'bg-sky-50 text-sky-700',
    title: 'See what you are owed',
    body: (
      <Bullets
        items={[
          <>
            <b className="text-ink">Overview</b> shows what is outstanding, what is overdue, and the cash expected in the next 14 days.
          </>,
          <>
            <b className="text-ink">Today&apos;s focus</b> names the clients to chase first and how firmly.
          </>,
          <>
            <b className="text-ink">Aging</b> and <b className="text-ink">Cash forecast</b> chart how late money is and when it should land, based on each
            client&apos;s real payment habits.
          </>,
          <>
            <b className="text-ink">Clients</b> ranks everyone by payment risk and days to pay.
          </>,
        ]}
      />
    ),
    show: { label: 'Open Overview', target: 'overview' },
  },
  {
    icon: Sparkles,
    tone: 'bg-ai-soft text-ai',
    title: 'Ask Owed to do the chasing',
    body: (
      <>
        <p className="text-sm leading-relaxed text-ink-2">
          <b className="text-ink">Ask Owed</b> opens a chat with the agents next to your dashboard. They check PayPal before they answer, and anything they
          write lands in Approvals as a draft. Try:
        </p>
        <div className="mt-4 space-y-2">
          <Prompt>Chase everyone more than 30 days late</Prompt>
          <Prompt>Invoice Fernhill Yoga for this month&apos;s social content pack, same as last time</Prompt>
          <Prompt>Add a chart of overdue amounts by client</Prompt>
        </div>
      </>
    ),
    show: { label: 'Open Ask Owed', target: 'ask' },
  },
  {
    icon: Inbox,
    tone: 'bg-good-soft text-good',
    title: 'Approve before anything is sent',
    body: (
      <Bullets
        items={[
          <>
            <b className="text-ink">Approvals</b> lists every draft, most overdue first, with the agent&apos;s reason for it.
          </>,
          'Edit the subject and message, then approve. Owed sends it through PayPal Invoicing, so the client gets a real PayPal reminder or invoice with a pay button.',
          'Discard anything you do not like. Agents never send on their own.',
          <>
            <b className="text-ink">Activity</b> records who did what: you, an agent, or a PayPal call.
          </>,
        ]}
      />
    ),
    show: { label: 'Open Approvals', target: 'approvals' },
  },
  {
    icon: PanelsTopLeft,
    tone: 'bg-warn-soft text-warn',
    title: 'Make the dashboard yours',
    body: (
      <Bullets
        items={[
          <>
            <b className="text-ink">Customize</b> opens the dashboard full screen in an editor.
          </>,
          'Move and resize charts, change chart types, or drag new fields in to build a chart.',
          'Undo anything, Save when you are happy, or Reset to default at any time.',
          'Saved layouts stay in this browser.',
        ]}
      />
    ),
    show: { label: 'Try Customize', target: 'customize' },
  },
];

function SetupStep({ setup }: { setup: Setup }) {
  const rows = [
    {
      done: setup.paypal,
      name: 'PayPal sandbox',
      what: 'Real invoices, payments and reminders',
      how: 'PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET from developer.paypal.com, then npm run seed',
      off: 'Using built-in demo data',
    },
    {
      done: setup.claude,
      name: 'Claude (Anthropic API)',
      what: 'Ask Owed, the agents and the morning brief',
      how: 'ANTHROPIC_API_KEY from console.anthropic.com',
      off: 'Agents are off',
    },
    {
      done: setup.studio,
      name: 'AG Studio licence',
      what: 'Removes the trial watermark',
      how: 'AG_STUDIO_LICENSE_KEY, free 45-day trial from AG Grid',
      off: 'Trial watermark shows',
    },
  ];
  return (
    <>
      <p className="text-sm leading-relaxed text-ink-2">
        Owed works on demo data out of the box. Add these to <code className="rounded bg-black/[0.05] px-1 text-[13px]">.env.local</code> and restart the server
        to switch each one on.
      </p>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {rows.map((r) => (
          <li key={r.name} className="flex gap-3 p-3">
            {r.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" /> : <Circle className="mt-0.5 size-5 shrink-0 text-faint" />}
            <div className="min-w-0 text-[13px]">
              <p className="font-semibold text-ink">
                {r.name} <span className={cx('ml-1 font-normal', r.done ? 'text-good' : 'text-muted')}>{r.done ? 'Connected' : r.off}</span>
              </p>
              <p className="text-muted">{r.what}</p>
              {!r.done && <p className="mt-1 text-xs text-ink-2">{r.how}</p>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const SEEN = 'owed.tour.v1';

export function tourSeen() {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true;
  }
}

export default function WelcomeTour({
  open,
  initialStep = 0,
  setup,
  onClose,
  onShow,
}: {
  open: boolean;
  initialStep?: number;
  setup: Setup;
  onClose: () => void;
  onShow: (target: TourTarget) => void;
}) {
  const [step, setStep] = useState(initialStep);
  const total = STEPS.length + 1;
  const last = step === total - 1;

  const close = () => {
    try {
      localStorage.setItem(SEEN, '1');
    } catch {}
    onClose();
  };

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
  const current = STEPS[step];
  const Icon = current?.icon ?? BarChart3;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4 backdrop-blur-[2px]" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        onClick={(e) => e.stopPropagation()}
        className="toast-in flex max-h-[calc(100dvh-2rem)] w-full max-w-[540px] flex-col overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          <Logo size={22} />
          <span className="text-[13px] font-semibold text-ink">How Owed works</span>
          <span className="ml-auto text-xs text-muted">
            {step + 1} of {total}
          </span>
          <button onClick={close} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-black/[0.04] hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-6 max-sm:flex-1 sm:h-[470px]">
          <span className={cx('grid size-11 place-items-center rounded-xl', current?.tone ?? 'bg-black/[0.05] text-ink-2')}>
            {current ? <Icon className="size-5" /> : <PlugZap className="size-5" />}
          </span>
          <h2 id="tour-title" className="mt-4 text-xl font-semibold tracking-tight text-ink">
            {current?.title ?? 'Connect your accounts'}
          </h2>
          <div className="mt-2">{current ? current.body : <SetupStep setup={setup} />}</div>
        </div>

        <div className="flex items-center gap-2 border-t border-line bg-canvas/60 px-5 py-3">
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                tabIndex={-1}
                onClick={() => setStep(i)}
                className={cx('h-1.5 rounded-full transition-all', i === step ? 'w-5 bg-ink' : 'w-1.5 bg-black/15 hover:bg-black/30')}
              />
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {current?.show && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  close();
                  onShow(current.show!.target);
                }}
              >
                {current.show.label}
              </Button>
            )}
            {step > 0 && (
              <Button size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={() => (last ? close() : setStep(step + 1))}>
              {last ? 'Start using Owed' : 'Next'}
              {!last && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const SETUP_STEP = STEPS.length;
