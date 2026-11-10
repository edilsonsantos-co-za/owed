import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { ArrowRight, BadgeCheck, Bot, CalendarClock, CheckCircle2, Gauge, Code2 as Github, Inbox, LayoutDashboard, Link2 as Linkedin, PlayCircle, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { SESSION_COOKIE, authEnabled, readSession } from '@/lib/auth';
import { Brand } from '@/components/ui';

const REPO = 'https://github.com/edilsonsantos-co-za/owed';
const DEVPOST = 'https://paypalaihackathon.devpost.com/';
const AVATAR = 'https://edilsonsantos.co.za/storage/avatar/G8FHimUVLP_1773882903.jpg';

function Tile({ className = '', children }: { className?: string; children: React.ReactNode }) {
  const bg = /(^|\s)bg-/.test(className) ? "" : "bg-surface";
  return <div className={`rounded-[20px] border border-line ${bg} p-6 shadow-card ${className}`}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{children}</p>;
}

async function Cta({ size = 'lg', dark = false }: { size?: 'lg' | 'sm'; dark?: boolean }) {
  await connection();
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const big = size === 'lg';
  const btn = big ? 'h-12 px-5 text-[15px]' : 'h-9 px-3.5 text-sm';
  const primary = dark ? 'bg-white text-ink hover:bg-white/90' : 'bg-brand text-white hover:bg-brand-hover';
  const secondary = dark ? 'border border-white/20 text-white hover:bg-white/10' : 'border border-line-strong bg-surface hover:bg-canvas';
  if (user || !authEnabled()) {
    return (
      <a href="/app" className={`inline-flex items-center gap-2 rounded-xl font-semibold ${primary} ${btn}`}>
        Open the dashboard <ArrowRight className="size-4" />
      </a>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href="/auth/register" className={`inline-flex items-center gap-2 rounded-xl font-semibold ${primary} ${btn}`}>
        {big ? 'Create a free account' : 'Sign up'} <ArrowRight className="size-4" />
      </a>
      <a href="/auth/sign-in" className={`inline-flex items-center rounded-xl font-semibold ${secondary} ${btn}`}>
        Sign in
      </a>
    </div>
  );
}

async function AuthNotice({ searchParams }: { searchParams: Promise<{ auth?: string }> }) {
  const { auth } = await searchParams;
  if (!auth) return null;
  return (
    <div className="mx-auto mt-4 max-w-6xl px-4">
      <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
        {auth === 'expired' ? 'That sign-in link expired. Please try again.' : 'Sign-in did not complete. Please try again.'}
      </p>
    </div>
  );
}

function Video() {
  const id = process.env.OWED_YOUTUBE_ID;
  if (id) {
    return (
      <iframe
        className="aspect-video w-full rounded-2xl border border-line bg-black"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
        title="Owed demo video"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-ink">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/screens/overview.png" alt="Owed receivables dashboard" className="size-full object-cover object-left-top opacity-80" />
      <span className="absolute inset-0 grid place-items-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-ink shadow-pop">
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

const STEPS = [
  { icon: LayoutDashboard, title: 'Connect PayPal', body: 'Owed reads your PayPal invoices and payments through Invoicing v2 and Transaction Search.' },
  { icon: Gauge, title: 'Learn each client', body: 'Average days to pay, on-time rate and a 0–100 risk score per client, from real history.' },
  { icon: Bot, title: 'Agents draft', body: 'Claude agents pick the right tone for every overdue invoice and draft the reminder.' },
  { icon: Inbox, title: 'You approve', body: 'Edit, approve and send through PayPal — or discard. Nothing reaches a client without you.' },
];

export default function Landing({ searchParams }: PageProps<'/'>) {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -right-40 top-10 size-[640px] rounded-full bg-[radial-gradient(closest-side,rgba(109,74,255,0.35),transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.14),transparent)]" />

        <header className="sticky top-0 z-20 border-b border-white/10 bg-ink/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
            <Link href="/" aria-label="Owed home">
              <Brand inverted />
            </Link>
            <nav className="ml-6 hidden gap-6 text-sm font-medium text-white/65 md:flex">
              <a href="#how" className="hover:text-white">How it works</a>
              <a href="#built" className="hover:text-white">Built with</a>
              <a href="#hackathon" className="hover:text-white">Hackathon</a>
              <a href="#about" className="hover:text-white">About</a>
            </nav>
            <div className="ml-auto">
              <Suspense fallback={null}>
                <Cta size="sm" dark />
              </Suspense>
            </div>
          </div>
        </header>

        <Suspense fallback={null}>
          <AuthNotice searchParams={searchParams as Promise<{ auth?: string }>} />
        </Suspense>

        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 lg:grid-cols-[1fr_1.15fr] lg:pb-28 lg:pt-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#c9bcff]">
              <Sparkles className="size-3.5" /> PayPal AI Hackathon 2026 entry
            </span>
            <h1 className="mt-6 text-[clamp(38px,4.1vw,56px)] font-bold leading-[1.02] tracking-[-0.05em]">
              <span className="lg:whitespace-nowrap">Get paid for the work</span> <span className="block text-[#34d399]">you already did.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/70">
              Owed is an AI collections copilot for freelancers and small studios who bill through PayPal. Claude agents read your
              invoices, judge how each client really pays, and draft the right reminder. You approve before anything is sent.
            </p>
            <div className="mt-8">
              <Suspense fallback={<div className="h-12" />}>
                <Cta dark />
              </Suspense>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/60">
              {['Agents only draft', 'Every send is your click', 'Open source, MIT'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-[#34d399]" />{t}</li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1.5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.7)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/overview.png" alt="Owed receivables dashboard" className="w-full rounded-xl" />
            </div>
            <div className="absolute -bottom-8 -left-4 w-[min(320px,85%)] rounded-2xl border border-line bg-surface p-4 text-ink shadow-[var(--shadow-pop)] sm:-left-10">
              <div className="flex items-center gap-2 text-xs font-semibold text-ai"><Sparkles className="size-3.5" /> Draft ready for you</div>
              <p className="mt-2 text-sm font-semibold">Final notice · Vantage Robotics</p>
              <p className="text-xs text-muted">$8,900 · 48 days late · usually pays 49 days late</p>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-ink px-3 text-xs font-semibold text-white"><CheckCircle2 className="size-3.5" /> Approve &amp; send</span>
                <span className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-semibold">Edit</span>
              </div>
            </div>
            <div className="absolute -right-3 -top-5 hidden items-center gap-2 rounded-full border border-white/10 bg-ink/90 px-3.5 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur sm:flex">
              <span className="size-2 rounded-full bg-[#34d399]" /> $7,130 collected this month
            </div>
          </div>
        </section>
      </div>

      <div className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-sm text-muted">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-faint">Built on</span>
          <span className="font-semibold text-ink">PayPal <span className="font-normal text-muted">Invoicing v2 · Agent Toolkit</span></span>
          <span className="font-semibold text-ink">Claude <span className="font-normal text-muted">by Anthropic</span></span>
          <span className="font-semibold text-ink">AG Studio <span className="font-normal text-muted">by AG Grid</span></span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 pb-16">
        {/* Demo video */}
        <section className="grid items-center gap-3 pt-12 lg:grid-cols-5">
          <Tile className="p-3 lg:col-span-3">
            <Suspense fallback={<div className="skeleton aspect-video w-full" />}>
              <VideoSlot />
            </Suspense>
          </Tile>
          <div className="px-2 lg:col-span-2 lg:pl-6">
            <Label>See it work</Label>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">From overdue invoice to an approved PayPal reminder</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              A three-minute walk through the dashboard, the agents deciding how firm to be with each client, and the approval queue
              where every reminder waits for you.
            </p>
          </div>
        </section>

        {/* Problem / numbers */}
        <section className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile className="bg-ink text-white sm:col-span-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/60">The problem</p>
            <p className="mt-3 text-xl font-semibold leading-snug tracking-tight">
              The work is done and the invoice is sent. Then someone has to notice it&apos;s late, decide how hard to push
              <em> this</em> client, and write the awkward email.
            </p>
            <p className="mt-3 text-sm text-white/70">Most freelancers chase too late, or chase everyone the same way. Owed does the noticing and the writing; you keep the judgement.</p>
          </Tile>
          <Tile>
            <CalendarClock className="size-5 text-warn" />
            <p className="mt-4 text-xl font-bold tracking-tight">Cash forecast</p>
            <p className="mt-1 text-sm text-ink-2">Each due date shifted by that client&apos;s real payment habit, so you know when money actually lands.</p>
          </Tile>
          <Tile>
            <ShieldCheck className="size-5 text-good" />
            <p className="mt-4 text-xl font-bold tracking-tight">Human-in-the-loop</p>
            <p className="mt-1 text-sm text-ink-2">Agents can only draft. Every send is your click, recorded in an audit log.</p>
          </Tile>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 pt-14">
          <Label>How it works</Label>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Four steps, one approval queue</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <Tile key={s.title}>
                <div className="flex items-center justify-between">
                  <s.icon className="size-5 text-ai" />
                  <span className="font-mono text-xs text-faint">0{i + 1}</span>
                </div>
                <p className="mt-4 font-semibold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.body}</p>
              </Tile>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Tile className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/overview.png" alt="Receivables overview with KPI cards and AG Studio dashboard" className="w-full border-b border-line" />
              <p className="p-4 text-sm text-ink-2"><span className="font-semibold text-ink">Receivables.</span> Outstanding, overdue, aging by client and a forecast — an AG Studio dashboard the agents can rebuild on request.</p>
            </Tile>
            <Tile className="overflow-hidden p-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/screens/approvals.png" alt="Approvals inbox with agent reasoning" className="w-full border-b border-line" />
              <p className="p-4 text-sm text-ink-2"><span className="font-semibold text-ink">Approvals.</span> Each draft shows the agent&apos;s reasoning. Edit, approve and send through PayPal, or discard.</p>
            </Tile>
          </div>
        </section>

        {/* Built with */}
        <section id="built" className="scroll-mt-20 pt-14">
          <Label>Built with</Label>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">PayPal + Claude + AG Studio</h2>
          <div className="mt-6 grid gap-3 lg:grid-cols-3">
            <Tile>
              <p className="font-semibold">PayPal</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-2">
                {['Invoicing v2: list, remind, create + send', 'Transaction Search for the ledger', 'Agent Toolkit tools for the morning-brief agent', 'Sandbox seeded through the same APIs'].map((t) => (
                  <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-good" />{t}</li>
                ))}
              </ul>
            </Tile>
            <Tile>
              <p className="font-semibold">Claude (Anthropic)</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-2">
                {['Custom AG Studio adapter streams Claude into AG-UI events', 'A collections agent the built-in lead delegates to', 'Tone judged from each client’s history', 'Read-only morning brief over PayPal data'].map((t) => (
                  <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ai" />{t}</li>
                ))}
              </ul>
            </Tile>
            <Tile>
              <p className="font-semibold">AG Studio by AG Grid</p>
              <ul className="mt-3 space-y-2 text-sm text-ink-2">
                {['Themed embedded dashboard with custom widgets', 'Studio Agent Framework: 5 built-in agents + Owed’s own', 'Full-screen editor with undo, reset and saved layouts', 'Agents can add charts and pages on request'].map((t) => (
                  <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ink" />{t}</li>
                ))}
              </ul>
            </Tile>
          </div>
        </section>

        {/* Hackathon + about bento */}
        <section className="grid gap-3 pt-14 lg:grid-cols-5">
          <Tile className="scroll-mt-20 lg:col-span-3" >
            <div id="hackathon" className="scroll-mt-24" />
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-warn" />
              <Label>The hackathon</Label>
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">PayPal AI Hackathon on Devpost</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Build something that meaningfully combines PayPal and AI. Owed is entered in the business-tools track: a working product for
              the freelancers and small studios who live on PayPal invoices, built around AG Studio&apos;s agent framework.
            </p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted">Submissions close</dt><dd className="font-semibold">12 Nov 2026, 12:00 PST</dd></div>
              <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted">Targeting</dt><dd className="font-semibold">Best Use of AG Grid · PayPal + AI</dd></div>
              <div className="rounded-xl bg-canvas p-3"><dt className="text-xs text-muted">Licence</dt><dd className="font-semibold">MIT, open source</dd></div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              <a href={DEVPOST} className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 hover:bg-canvas">Devpost <ArrowRight className="size-4" /></a>
              <a href={REPO} className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 hover:bg-canvas"><Github className="size-4" /> Source code</a>
            </div>
          </Tile>
          <Tile className="lg:col-span-2">
            <div id="about" className="scroll-mt-24" />
            <Label>Built by</Label>
            <div className="mt-4 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR} alt="Edilson Santos" className="size-16 rounded-2xl object-cover" />
              <div>
                <p className="text-lg font-bold tracking-tight">Edilson Santos</p>
                <p className="text-sm text-muted">Backend developer · Johannesburg, South Africa</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-2">
              Eleven years building production systems: customer-facing platforms, APIs, automation and the infrastructure behind them.
              Owed came from watching small businesses do great work and then wait months to be paid for it.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
              <a href="https://edilsonsantos.co.za" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-white hover:bg-brand-hover">Portfolio <ArrowRight className="size-4" /></a>
              <a href="https://github.com/edilsonsantos-co-za" className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 hover:bg-canvas"><Github className="size-4" /> GitHub</a>
              <a href="https://www.linkedin.com/in/edilsonsantos-co-za/" className="inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-3.5 py-2 hover:bg-canvas"><Linkedin className="size-4" /> LinkedIn</a>
            </div>
          </Tile>
        </section>

        {/* Final CTA */}
        <section className="mt-3">
          <Tile className="flex flex-col items-start justify-between gap-5 bg-ai-soft sm:flex-row sm:items-center">
            <div>
              <p className="text-xl font-bold tracking-tight">Try Owed on a live PayPal sandbox</p>
              <p className="text-sm text-ink-2">Create a free account to explore the dashboard, chat with the agents and approve a reminder.</p>
            </div>
            <Suspense fallback={null}>
              <Cta />
            </Suspense>
          </Tile>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 text-sm text-muted">
          <Brand size={22} />
          <span>· open source under MIT</span>
          <span className="ml-auto">© 2026 Edilson Santos · Made in Johannesburg</span>
        </div>
      </footer>
    </div>
  );
}
