'use client';

import { Check, Lightbulb, Redo2, RotateCcw, Undo2, X } from 'lucide-react';
import { useState } from 'react';
import { Button, Logo, cx } from './ui';

export interface EditorPage {
  id: string;
  title: string;
}

interface Props {
  pages: EditorPage[];
  pageId: string;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  onPage: (id: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onCancel: () => void;
  onSave: () => void;
}

const TIPS = [
  ['Add a chart', 'drag a chart type from Compose onto the canvas, then pick its data'],
  ['Change a chart', 'click it to open Setup and Format on the right'],
  ['Move', 'drag the handle at the top of a chart'],
  ['Resize', 'drag its edges'],
] as const;

// The toolbar of the full-screen dashboard editor. Changes stay local to the editor until Save.
export default function EditorBar(props: Props) {
  const { pages, pageId, canUndo, canRedo, dirty } = props;
  const [tips, setTips] = useState(true);

  return (
    <div className="shrink-0 border-b border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <Logo size={24} />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-ink">Edit dashboard</p>
          <p className="text-xs text-muted">{dirty ? 'Unsaved changes' : 'No changes yet'}</p>
        </div>

        <div className="ml-2 flex rounded-lg bg-black/[0.05] p-0.5" role="tablist" aria-label="Page">
          {pages.map((p) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={p.id === pageId}
              onClick={() => props.onPage(p.id)}
              className={cx('rounded-md px-3 py-1 text-[13px]', p.id === pageId ? 'bg-surface font-semibold text-ink shadow-sm' : 'text-ink-2 hover:text-ink')}
            >
              {p.title}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={props.onUndo} disabled={!canUndo} aria-label="Undo" title="Undo">
            <Undo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={props.onRedo} disabled={!canRedo} aria-label="Redo" title="Redo">
            <Redo2 className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={props.onReset} title="Put back the dashboard Owed ships with">
            <RotateCcw className="size-4" />
            <span className="max-sm:hidden">Reset to default</span>
          </Button>
          <span className="mx-1 h-5 w-px bg-line" />
          <Button size="sm" onClick={props.onCancel}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={props.onSave}>
            <Check className="size-4" />
            Save
          </Button>
        </div>
      </div>

      {tips && (
        <div className="flex items-start gap-3 border-t border-line bg-ai-soft/50 px-4 py-2 text-[13px]">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-ai" />
          <ul className="flex flex-1 flex-wrap gap-x-5 gap-y-1 text-ink-2">
            {TIPS.map(([label, how]) => (
              <li key={label}>
                <span className="font-semibold text-ink">{label}:</span> {how}
              </li>
            ))}
          </ul>
          <button onClick={() => setTips(false)} className="text-xs font-medium text-muted hover:text-ink">
            Hide tips
          </button>
        </div>
      )}
    </div>
  );
}
