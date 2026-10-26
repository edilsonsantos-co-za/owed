'use client';

import { useEffect, useState } from 'react';
import type { Brief } from '@/lib/brief';

export default function MorningBrief() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/brief')
      .then(async (res) => {
        const json = await res.json();
        if (!alive) return;
        if (res.ok) setBrief(json);
        else setError(json.error);
      })
      .catch((err) => alive && setError(String(err)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) return null;
  return (
    <section className="border-b border-indigo-100 bg-indigo-50/70 px-5 py-2 text-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Brief</span>
        <div className="min-w-0 flex-1">
          {!brief ? (
            <p className="animate-pulse text-indigo-900/70">Claude is reviewing your PayPal account…</p>
          ) : (
            <>
              <button onClick={() => setOpen(!open)} className="text-left font-semibold text-indigo-950">
                {brief.headline}
              </button>
              {open && (
                <div className="mt-1 grid gap-x-6 gap-y-1 text-xs text-indigo-950/80 md:grid-cols-2">
                  <ul className="list-disc space-y-0.5 pl-4">
                    {brief.points.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                  <ul className="space-y-0.5">
                    {brief.focus.map((f, i) => (
                      <li key={i}>
                        <strong>{f.client}</strong> — {f.why} <span className="text-indigo-700">→ {f.suggestedAction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {open && brief.toolCalls.length > 0 && (
                <p className="mt-1 text-[10px] text-indigo-900/50">
                  Checked with PayPal Agent Toolkit: {[...new Set(brief.toolCalls)].join(', ')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
