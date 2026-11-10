'use client';

// The dashboard's side navigation, shared by /app and /admin. Inside the app the items switch views in
// place (onGo); on other pages they are links back to /app?view=….
import { CircleHelp, History, Inbox, LayoutDashboard, LogOut, ShieldCheck, UserCog, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Brand, cx } from './ui';

export type View = 'overview' | 'clients' | 'approvals' | 'activity';
export type NavItem = View | 'admin';

export const NAV: Record<View, { label: string; icon: LucideIcon }> = {
  overview: { label: 'Overview', icon: LayoutDashboard },
  clients: { label: 'Clients', icon: Users },
  approvals: { label: 'Approvals', icon: Inbox },
  activity: { label: 'Activity', icon: History },
};

export interface NavUser {
  name?: string;
  email?: string;
  admin?: boolean;
}

function Item({
  icon: Icon,
  label,
  active,
  href,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  href?: string;
  onClick?: () => void;
  badge?: number;
}) {
  const cls = cx(
    'group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm transition-colors',
    active ? 'bg-white/[0.08] font-medium text-white' : 'text-white/60 hover:bg-white/[0.04] hover:text-white',
  );
  const body = (
    <>
      {active && <span className="absolute inset-y-2.5 -left-3 w-[3px] rounded-r-full bg-mint" />}
      <Icon className={cx('size-[18px]', active ? 'text-mint' : 'text-white/40 group-hover:text-white/75')} strokeWidth={1.75} />
      {label}
      {!!badge && <span className="ml-auto rounded-full bg-ai px-2 font-mono text-[11px] font-semibold leading-5 text-white">{badge}</span>}
    </>
  );
  return href ? (
    <a href={href} aria-current={active ? 'page' : undefined} className={cls}>
      {body}
    </a>
  ) : (
    <button onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
      {body}
    </button>
  );
}

export default function SideNav({
  active,
  onGo,
  pending = 0,
  business,
  live = false,
  aiEnabled = false,
  user,
  onTour,
  onSetup,
}: {
  active: NavItem;
  onGo?: (view: View) => void;
  pending?: number;
  business?: string;
  live?: boolean;
  aiEnabled?: boolean;
  user?: NavUser | null;
  onTour?: () => void;
  onSetup?: () => void;
}) {
  return (
    <aside className="ledger-grid relative hidden w-[264px] shrink-0 flex-col overflow-hidden bg-forest text-white lg:flex">
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgba(61,220,151,0.13),transparent)]" />
      <div className="relative px-6 pb-6 pt-7">
        <Link href="/" aria-label="Owed home">
          <Brand size={30} inverted />
        </Link>
      </div>

      <div className="relative mx-3 mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
        <p className="eyebrow text-[10px] text-white/40">Workspace</p>
        <p className="mt-1 truncate text-[14px] font-medium">{business ?? 'Owed Studio'}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/55">
          <span className={cx('size-1.5 rounded-full', live ? 'bg-mint' : 'bg-amber-400')} />
          {live ? 'PayPal sandbox, live' : 'Demo data'}
        </p>
      </div>

      <nav className="relative flex flex-col gap-0.5 px-3" aria-label="Main">
        {(Object.keys(NAV) as View[]).map((id) => (
          <Item
            key={id}
            icon={NAV[id].icon}
            label={NAV[id].label}
            active={active === id}
            onClick={onGo ? () => onGo(id) : undefined}
            href={onGo ? undefined : id === 'overview' ? '/app' : `/app?view=${id}`}
            badge={id === 'approvals' ? pending : undefined}
          />
        ))}
        {user?.admin && (
          <>
            <p className="eyebrow mt-5 px-3 pb-1.5 text-[10px] text-white/35">Admin</p>
            <Item icon={UserCog} label="Sign-ups" active={active === 'admin'} href="/admin" />
          </>
        )}
      </nav>

      <div className="relative mt-auto space-y-2 p-3">
        {onTour && (
          <button
            onClick={onTour}
            className="flex h-10 w-full items-center gap-3 rounded-[10px] px-3 text-sm text-white/60 hover:bg-white/[0.04] hover:text-white"
          >
            <CircleHelp className="size-[18px] text-white/40" strokeWidth={1.75} />
            How Owed works
          </button>
        )}
        <button
          onClick={onSetup}
          disabled={!onSetup}
          className="block w-full rounded-xl border border-white/10 bg-white/[0.03] p-3.5 text-left text-xs enabled:hover:border-white/20 enabled:hover:bg-white/[0.06]"
          title="See what to connect and how"
        >
          <p className="mb-2.5 flex items-center">
            <span className="eyebrow text-[10px] text-white/45">Connections</span>
            {onSetup && <span className="ml-auto font-medium text-[#b8a8ff]">Set up</span>}
          </p>
          <p className="flex items-center gap-2 text-white/75">
            <span className={cx('size-2 rounded-full', live ? 'bg-mint' : 'bg-amber-400')} />
            PayPal {live ? 'sandbox' : '· demo data'}
          </p>
          <p className="mt-1.5 flex items-center gap-2 text-white/75">
            <span className={cx('size-2 rounded-full', aiEnabled ? 'bg-mint' : 'bg-white/25')} />
            Claude agents {aiEnabled ? '· on' : '· off'}
          </p>
        </button>
        <p className="flex gap-2 px-1 pt-1 text-[11px] leading-snug text-white/40">
          <ShieldCheck className="size-3.5 shrink-0 text-mint/70" />
          Agents only draft. Nothing reaches a client without your approval.
        </p>
        {user && (
          <div className="flex items-center gap-2.5 border-t border-white/10 px-1 pt-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f4f1ea] text-xs font-semibold text-forest">
              {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{user.name || user.email}</span>
              <span className="block truncate text-[11px] text-white/50">{user.admin ? 'Administrator' : user.email}</span>
            </span>
            <a href="/auth/sign-out" className="rounded-md p-1.5 text-white/50 hover:bg-white/10 hover:text-white" title="Sign out">
              <LogOut className="size-4" />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}
