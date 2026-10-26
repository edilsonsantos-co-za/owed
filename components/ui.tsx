// Small presentational building blocks used across the app.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { avatarColours, initials } from '@/lib/format';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border border-line bg-surface shadow-[var(--shadow-card)]', className)}>{children}</div>;
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'danger';
const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-sm',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-canvas shadow-sm',
  ghost: 'text-ink-2 hover:bg-black/[0.04]',
  ai: 'bg-ai text-white hover:bg-[#5b38f0] shadow-sm',
  danger: 'text-bad hover:bg-bad-soft',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-[13px]' : 'h-9 px-3.5 text-sm',
        BUTTON[variant],
        className,
      )}
    />
  );
}

type BadgeTone = 'neutral' | 'good' | 'warn' | 'bad' | 'ai' | 'info';
const BADGE: Record<BadgeTone, string> = {
  neutral: 'bg-black/[0.05] text-ink-2',
  good: 'bg-good-soft text-good',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-bad-soft text-bad',
  ai: 'bg-ai-soft text-ai',
  info: 'bg-sky-50 text-sky-700',
};

export function Badge({ tone = 'neutral', dot, className, children }: { tone?: BadgeTone; dot?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', BADGE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const TONE_BADGE = { friendly: 'good', firm: 'warn', final: 'bad' } as const;

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full font-semibold"
      style={{ ...avatarColours(name), width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="#0f1729" />
      <circle cx="16" cy="16" r="7.5" fill="none" stroke="#fff" strokeWidth="3.2" />
      <path d="M16 8.5a7.5 7.5 0 0 1 7.5 7.5" fill="none" stroke="#34d399" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}
