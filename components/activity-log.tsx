import { Bot, Server, User } from 'lucide-react';
import type { AuditEntry } from '@/lib/store';
import { ago } from '@/lib/format';
import { Card, cx } from './ui';

const ACTOR = {
  human: { label: 'You', icon: User, className: 'bg-brand text-white' },
  agent: { label: 'Agent', icon: Bot, className: 'bg-ai-soft text-ai' },
  system: { label: 'System', icon: Server, className: 'bg-bad-soft text-bad' },
} as const;

export default function ActivityLog({ audit }: { audit: AuditEntry[] }) {
  return (
    <Card className="p-6">
      {audit.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No activity yet. Drafts, approvals and PayPal calls will appear here.</p>
      ) : (
        <ol className="relative space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line">
          {audit.slice(0, 100).map((a) => {
            const actor = ACTOR[a.actor];
            return (
              <li key={a.id} className="relative flex gap-4">
                <span className={cx('z-10 grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-surface', actor.className)}>
                  <actor.icon className="size-4" />
                </span>
                <div className="min-w-0 pt-1">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">{actor.label}</span> {a.action}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">{a.detail}</p>
                </div>
                <time className="ml-auto shrink-0 pt-1 text-xs text-faint" dateTime={a.at}>
                  {ago(a.at)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
