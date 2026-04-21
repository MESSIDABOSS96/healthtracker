// src/features/pt/PTTemplateList.tsx
//
// Template list mode of the PT Sheet. Shows one Card per template; tapping the
// card body starts a session; tapping the ⋯ overflow opens a tiny menu with
// Edit / Delete (destructive, immediate — no confirm per UI-SPEC §"Destructive
// confirmations: NONE").
//
// Empty state per UI-SPEC §"PT Sheet copy":
//   "No PT templates yet. Create one to start logging sessions." + New template
// Non-empty layout: "Start session" section header, list, "+ New template"
// bottom button.

import { useState } from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { deleteTemplate } from '@/services/pt.svc';
import type { PTTemplate } from '@/db/schema';

interface PTTemplateListProps {
  templates: PTTemplate[];
  onStartSession: (t: PTTemplate) => void;
  onEditTemplate: (t: PTTemplate) => void;
  onNewTemplate: () => void;
}

export function PTTemplateList({
  templates,
  onStartSession,
  onEditTemplate,
  onNewTemplate,
}: PTTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="px-4 py-6 space-y-4">
        <p className="text-sm text-muted">No PT templates yet. Create one to start logging sessions.</p>
        <Button variant="default" onClick={onNewTemplate} className="w-full">
          <Plus className="w-4 h-4 mr-2" aria-hidden /><span>New template</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="text-xs text-muted uppercase tracking-wide">Start session</div>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li key={t.id}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStartSession(t)}
                className="flex-1 text-left"
              >
                <Card className="p-4">
                  <div className="text-sm text-text">{t.name}</div>
                  <div className="text-xs text-muted">{t.exercises.length} exercises</div>
                </Card>
              </button>
              <TemplateOverflowMenu
                onEdit={() => onEditTemplate(t)}
                onDelete={async () => {
                  await deleteTemplate(t.id);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="default" onClick={onNewTemplate} className="w-full">
        <Plus className="w-4 h-4 mr-2" aria-hidden /><span>New template</span>
      </Button>
    </div>
  );
}

function TemplateOverflowMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="More"
        onClick={() => setOpen((o) => !o)}
        className="h-11 w-11 flex items-center justify-center text-muted"
      >
        <MoreHorizontal className="w-5 h-5" aria-hidden />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full z-20 bg-surface border border-border rounded-md shadow-lg overflow-hidden min-w-[160px]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="block w-full text-left px-3 py-2 text-sm text-text hover:bg-border/40"
            >Edit template</button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-border/40"
              style={{ color: '#ef4444' }}
            >Delete template</button>
          </div>
        </>
      )}
    </div>
  );
}
