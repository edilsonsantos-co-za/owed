import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { ArrowRight, ArrowUpRight, Check, Code2 as Github, Link2 as Linkedin, PlayCircle, Sparkles } from 'lucide-react';
import { SESSION_COOKIE, authEnabled, readSession } from '@/lib/auth';
import { Brand, Eyebrow, Stamp, cx } from '@/components/ui';

const REPO = 'https://github.com/edilsonsantos-co-za/owed';

/** GitHub's mark, for the icon-only link in the header. */
const GitHubMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);
const DEVPOST = 'https://paypalaihackathon.devpost.com/';
const AVATAR = 'https://edilsonsantos.co.za/storage/avatar/G8FHimUVLP_1773882903.jpg';

async function Cta({ size = 'lg', dark = false }: { size?: 'lg' | 'sm'; dark?: boolean }) {
  await connection();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const big = size === 'lg';
  const btn = big ? 'h-12 px-5 text-[15px]' : 'h-9 px-4 text-sm';
  const primary = dark ? 'bg-[#f4f1ea] text-forest hover:bg-white' : 'bg-forest text-white hover:bg-brand-hover';
  if (user || !authEnabled()) {
    return (
      <a href="/app" className={cx('inline-flex items-center gap-2 rounded-full font-medium transition-colors', primary, btn)}>
        Open the dashboard <ArrowRight className="size-4" />
      </a>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <a href="/auth/register" className={cx('inline-flex items-center gap-2 rounded-full font-medium transition-colors', primary, btn)}>
        Create account <ArrowRight className="size-4" />
      </a>
      <a href="/auth/sign-in" className={cx('font-medium underline-offset-4 hover:underline', big ? 'text-[15px]' : 'text-sm', dark ? 'text-[#f4f1ea]' : 'text-forest')}>
        Sign in
      </a>
    </span>
  );
}

async function AuthNotice({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const { auth } = await searchParams;
  if (!auth) return null;
  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
        {auth === 'expired' ? 'Your sign-in timed out. Sign in again with your email and password.' : 'Sign-in did not complete. Please try again.'}
      </p>
    </div>
  );
}

function Video() {
  const id = process.env.OWED_YOUTUBE_ID;
  if (id) {
    return (
      <iframe
        className="aspect-video w-full rounded-xl bg-black"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title="Owed demo video"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-forest">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/screens/overview.png" alt="Owed receivables dashboard" className="size-full object-cover object-left-top opacity-60" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink shadow-[var(--shadow-pop)]">
          <PlayCircle className="size-5 text-ai" /> Demo video coming soon
        </span>
      </span>
    </div>
  );
}

async function VideoSlot() {
  await connection();
  return <Video />;
}

/** The hero's artwork: an overdue invoice, the agent's reasoning, and the reminder waiting for approval. */
function HeroArt() {
  return (
    <div className="relative mx-auto w-full max-w-[540px] pb-44 pt-10">
      {/* Paid receipt, behind */}
      <div className="perforated absolute -right-8 -top-4 hidden w-40 rotate-[6deg] rounded-t-xl border border-b-0 border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:block">
        <p className="eyebrow text-[10px] text-muted">Receipt</p>
        <p className="mt-2 text-sm font-medium">Bluebird Dental</p>
        <p className="serif mt-1 text-3xl leading-none">$1,240</p>
        <Stamp tone="good" className="mt-3">Paid</Stamp>
      </div>

      {/* The invoice */}
      <div className="perforated relative w-[86%] -rotate-[1.5deg] sm:w-[68%] rounded-t-2xl border border-b-0 border-line bg-surface p-6 shadow-[var(--shadow-pop)] ">
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow text-[10px] text-muted">Invoice · INV-1042</p>
            <p className="mt-1.5 text-[15px] font-medium">Vantage Robotics</p>
            <p className="text-xs text-muted">Due 23 Sep 2026 · sent via PayPal</p>
          </div>
          <Stamp tone="bad" className="mt-1">Overdue</Stamp>
        </div>
        <div className="mt-5 space-y-2 border-t border-dashed border-line-strong pt-4 text-sm">
          <p className="flex justify-between"><span className="text-ink-2">Brand system design</span><span className="font-mono tabular">6,400.00</span></p>
          <p className="flex justify-between"><span className="text-ink-2">Prototype sprint</span><span className="font-mono tabular">2,500.00</span></p>
        </div>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <span className="eyebrow text-[10px] text-muted">Balance due</span>
          <span className="serif text-[42px] leading-none">$8,900</span>
        </div>
        <p className="mt-3 font-mono text-[11px] text-bad">48 days late · usually pays 49 days late</p>
      </div>

      {/* The agent's draft */}
      <div className="absolute bottom-0 right-0 w-[86%] rotate-[0.75deg] rounded-2xl border border-ai/20 bg-surface p-5 shadow-[var(--shadow-pop)] sm:w-[70%]">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-ai-soft"><Sparkles className="size-3.5 text-ai" /></span>
          <span className="text-xs font-medium text-ai">Collections agent</span>
          <Stamp tone="ai" className="ml-auto scale-90">Draft</Stamp>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
          Past even their usual pattern, and the largest balance you&apos;re owed. A <span className="font-medium text-ink">final notice</span> is right: amount, days late, and that work pauses until it&apos;s settled.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-forest px-3.5 text-xs font-medium text-white"><Check className="size-3.5" /> Approve &amp; send</span>
          <span className="inline-flex h-8 items-center rounded-full border border-line-strong px-3.5 text-xs font-medium">Edit</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  { title: 'Connect PayPal', body: 'Owed reads your invoices and payments through PayPal Invoicing v2 and Transaction Search.' },
  { title: 'Learn each client', body: 'Days to pay, on-time rate and a 0–100 risk score per client, worked out from real history.' },
  { title: 'Agents draft', body: 'Claude agents choose the tone for every overdue invoice (friendly, firm or final) and write the reminder.' },
  { title: 'You approve', body: 'Edit, approve and send through PayPal, or discard. Nothing reaches a client without your click.' },
];

const STACK = [
  { name: 'PayPal', tag: 'Payments', points: ['Invoicing v2: list, remind, create and send', 'Transaction Search for the ledger', 'Agent Toolkit tools for the morning brief', 'Sandbox seeded through the same APIs'] },
  { name: 'Claude', tag: 'Agents', points: ['A custom AG Studio adapter streams Claude as AG-UI events', 'A collections agent the lead agent delegates to', 'Tone judged from each client’s history', 'A read-only morning brief over PayPal data'] },
  { name: 'AG Studio', tag: 'Dashboard', points: ['Themed, embedded dashboard with custom widgets', 'Studio agent framework: 5 built-in agents plus Owed’s own', 'Full-screen editor with undo, reset and saved layouts', 'Agents add charts and pages on request'] },
];

export default function Landing({ searchParams }: PageProps<'/'>) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link href="/" aria-label="Owed home">
            <Brand />
          </Link>
          <nav className="ml-8 hidden gap-7 text-sm text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#product" className="hover:text-ink">Product</a>
            <a href="#built" className="hover:text-ink">Built with</a>
            <a href="#about" className="hover:text-ink">About</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={REPO}
              aria-label="Owed on GitHub"
              title="Source code on GitHub"
              className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink"
            >
              <GitHubMark className="size-[18px]" />
            </a>
            <Suspense fallback={null}>
              <Cta size="sm" />
            </Suspense>
          </div>
        </div>
      </header>

      <Suspense fallback={null}>
        <AuthNotice searchParams={searchParams as Promise<{ auth?: string }>} />
      </Suspense>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <div>
          <p className="eyebrow inline-flex items-center gap-2 text-ai">
            <span className="size-1.5 rounded-full bg-ai" /> PayPal AI Hackathon 2026 · Entry
          </p>
          <h1 className="serif mt-6 text-[clamp(44px,5.6vw,80px)] leading-[0.98]">
            Get paid for the work <em className="text-good">you already did.</em>
          </h1>
          <p className="mt-7 max-w-[34rem] text-[17px] leading-relaxed text-ink-2">
            Owed is an AI collections copilot for freelancers and small studios who bill through PayPal. Claude agents read your invoices,
            learn how each client really pays, and draft the right reminder. You approve before anything is sent.
          </p>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted">
            {['Agents only draft', 'Every send is your click'].map((t) => (
              <li key={t} className="flex items-center gap-1.5"><Check className="size-4 text-good" />{t}</li>
            ))}
            <li>
              <a href={REPO} className="flex items-center gap-1.5 underline-offset-4 hover:text-ink hover:underline">
                <Check className="size-4 text-good" />Open source, MIT
              </a>
            </li>
          </ul>
        </div>
        <HeroArt />
      </section>

      {/* Built on */}
      <div className="border-y border-line bg-surface/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-12 gap-y-3 px-4 py-5">
          <Eyebrow>Built on</Eyebrow>
          {[['PayPal', 'Invoicing v2 · Agent Toolkit'], ['Claude', 'by Anthropic'], ['AG Studio', 'by AG Grid']].map(([n, d]) => (
            <span key={n} className="text-sm"><span className="font-medium">{n}</span> <span className="text-muted">{d}</span></span>
          ))}
        </div>
      </div>

      {/* The problem */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <Eyebrow>§ 01 · The problem</Eyebrow>
        <p className="serif mt-6 max-w-4xl text-[clamp(32px,4.4vw,56px)] leading-[1.05]">
          The work is done and the invoice is sent. Then someone has to notice it&apos;s late, decide how hard to push{' '}
          <em className="text-bad">this</em> client, and write the awkward email.
        </p>
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
          {[
            ['Notices', 'Every overdue invoice, the day it slips, ranked by how much and how late.'],
            ['Judges', 'Tone from each client’s real payment habit, not one template for everyone.'],
            ['Writes', 'A ready reminder for you to approve, so you keep the judgement and lose the chore.'],
          ].map(([t, b]) => (
            <div key={t} className="bg-surface p-7">
              <p className="serif text-3xl">{t}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product band */}
      <section id="product" className="ledger-grid scroll-mt-16 bg-forest text-white">
        <div className="mx-auto max-w-6xl px-4 py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:items-end">
            <div>
              <Eyebrow className="text-mint">§ 02 · The product</Eyebrow>
              <h2 className="serif mt-5 text-[clamp(38px,4.6vw,60px)] leading-[1]">
                Your receivables, <em className="text-mint">read by agents.</em>
              </h2>
            </div>
            <p className="max-w-xl text-[15px] leading-relaxed text-white/65 lg:justify-self-end">
              Outstanding, overdue, aging by client and a cash forecast shifted by how late each client usually pays: an AG Studio dashboard the
              agents can rebuild on request, with an approvals inbox beside it.
            </p>
          </div>
          <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.8)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/screens/overview.png" alt="Owed receivables dashboard" className="w-full rounded-xl" />
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              ['Cash forecast', 'Each due date moved by that client’s real payment habit, so you see when money actually lands.'],
              ['Approvals inbox', 'Every draft shows the agent’s reasoning. Edit, approve and send through PayPal, or discard.'],
              ['Audit log', 'Every draft, approval and PayPal call, recorded and timestamped.'],
            ].map(([t, b]) => (
              <div key={t} className="border-t border-white/15 pt-5">
                <p className="font-medium">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/60">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto grid max-w-6xl scroll-mt-16 gap-12 px-4 py-24 lg:grid-cols-[1fr_1.7fr]">
        <div>
          <Eyebrow>§ 03 · How it works</Eyebrow>
          <h2 className="serif mt-5 text-[clamp(38px,4.6vw,60px)] leading-[1]">Four steps, one approval queue.</h2>
        </div>
        <ol className="border-t border-line">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[56px_1fr] gap-4 border-b border-line py-7 sm:grid-cols-[72px_200px_1fr]">
              <span className="serif text-4xl leading-none text-faint">0{i + 1}</span>
              <p className="pt-1 text-[17px] font-medium">{s.title}</p>
              <p className="col-start-2 text-[15px] leading-relaxed text-ink-2 sm:col-start-3 sm:pt-1">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Video */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid items-center gap-10 rounded-[28px] border border-line bg-surface p-3 shadow-[var(--shadow-card)] lg:grid-cols-[1.5fr_1fr] lg:p-4">
          <Suspense fallback={<div className="skeleton aspect-video w-full" />}>
            <VideoSlot />
          </Suspense>
          <div className="px-4 pb-6 lg:px-6 lg:pb-0">
            <Eyebrow>See it work · 3 minutes</Eyebrow>
            <h2 className="serif mt-4 text-4xl leading-[1.05]">From overdue invoice to an approved PayPal reminder.</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-2">The dashboard, the agents deciding how firm to be with each client, and the queue where every reminder waits for you.</p>
          </div>
        </div>
      </section>

      {/* Built with */}
      <section id="built" className="mx-auto max-w-6xl scroll-mt-16 px-4 pb-24">
        <Eyebrow>§ 04 · Built with</Eyebrow>
        <h2 className="serif mt-5 text-[clamp(38px,4.6vw,60px)] leading-[1]">PayPal, Claude and AG Studio.</h2>
        <div className="mt-12 grid gap-3 lg:grid-cols-3">
          {STACK.map((s) => (
            <div key={s.name} className="rounded-2xl border border-line bg-surface p-7 shadow-[var(--shadow-card)]">
              <div className="flex items-baseline justify-between">
                <p className="serif text-3xl">{s.name}</p>
                <Eyebrow>{s.tag}</Eyebrow>
              </div>
              <ul className="mt-6 space-y-3 border-t border-line pt-5 text-sm text-ink-2">
                {s.points.map((t) => (
                  <li key={t} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-good" />{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Hackathon + about */}
      <section className="mx-auto grid max-w-6xl gap-3 px-4 pb-24 lg:grid-cols-[1.4fr_1fr]">
        <div id="hackathon" className="scroll-mt-20 rounded-2xl border border-line bg-surface p-8 shadow-[var(--shadow-card)]">
          <Eyebrow>The hackathon</Eyebrow>
          <h2 className="serif mt-4 text-4xl leading-[1.05]">PayPal AI Hackathon on Devpost</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-2">
            Build something that meaningfully combines PayPal and AI. Owed is a working product for the freelancers and small studios who live on
            PayPal invoices, built around AG Studio&apos;s agent framework.
          </p>
          <dl className="mt-7 grid gap-px overflow-hidden rounded-xl border border-line bg-line text-sm sm:grid-cols-3">
            {[['Submissions close', '12 Nov 2026, 12:00 PST'], ['Targeting', 'Best Use of AG Grid · PayPal + AI'], ['Licence', 'MIT, open source']].map(([k, v]) => (
              <div key={k} className="bg-canvas p-4"><dt className="eyebrow text-[10px] text-muted">{k}</dt><dd className="mt-1.5 font-medium">{v}</dd></div>
            ))}
          </dl>
          <div className="mt-7 flex flex-wrap gap-2 text-sm font-medium">
            <a href={DEVPOST} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 hover:bg-sunken">Devpost <ArrowUpRight className="size-4" /></a>
            <a href={REPO} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 hover:bg-sunken"><Github className="size-4" /> Source code</a>
          </div>
        </div>
        <div id="about" className="scroll-mt-20 rounded-2xl border border-line bg-surface p-8 shadow-[var(--shadow-card)]">
          <Eyebrow>Built by</Eyebrow>
          <div className="mt-5 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR} alt="Edilson Santos" className="size-16 rounded-full object-cover ring-4 ring-sunken" />
            <div>
              <p className="serif text-3xl leading-none">Edilson Santos</p>
              <p className="mt-1 text-sm text-muted">Full-stack developer · Johannesburg</p>
            </div>
          </div>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-2">
            Eleven years building production systems: customer-facing platforms, APIs, automation and the infrastructure behind them. Owed came from
            watching small businesses do great work and then wait months to be paid for it.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 text-sm font-medium">
            <a href="https://edilsonsantos.co.za" className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-white hover:bg-brand-hover">Portfolio <ArrowUpRight className="size-4" /></a>
            <a href="https://github.com/edilsonsantos-co-za" className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 hover:bg-sunken"><Github className="size-4" /> GitHub</a>
            <a href="https://www.linkedin.com/in/edilsonsantos-co-za/" className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 hover:bg-sunken"><Linkedin className="size-4" /> LinkedIn</a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="ledger-grid relative overflow-hidden rounded-[28px] bg-forest px-8 py-16 text-white sm:px-14">
          <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-[radial-gradient(closest-side,rgba(61,220,151,0.18),transparent)]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="serif text-[clamp(40px,5.2vw,72px)] leading-[0.95]">
                Stop chasing.<br />
                <em className="text-mint">Start approving.</em>
              </h2>
              <p className="mt-5 max-w-md text-[15px] text-white/65">Sign in to explore the dashboard, chat with the agents and approve a reminder on a live PayPal sandbox.</p>
            </div>
            <Suspense fallback={null}>
              <Cta dark />
            </Suspense>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted">
          <Brand size={24} />
          <a href={REPO} className="inline-flex items-center gap-1.5 hover:text-ink">
            <Github className="size-4" /> Open source under MIT · github.com/edilsonsantos-co-za/owed
          </a>
          <span className="ml-auto">© 2026 Edilson Santos · Made in Johannesburg</span>
        </div>
      </footer>
    </div>
  );
}
