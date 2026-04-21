// src/features/pt/PTSection.tsx
//
// Today-card wrapper for the PT domain. Tap the card → opens the PT bottom
// Sheet (instant, no slide per UI-SPEC anti-motion). Status copy follows
// UI-SPEC §"Today-card populated-status copy patterns" PT rows:
//   "not logged yet" when zero sessions today
//   "{templateName} · {done}/{total} ex" when any session exists
// NO progress bar on the PT card (UI-SPEC §"Today-card status slot" line 566).

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { PTSheet } from './PTSheet';
import { useTodayPTSessions, useTemplates } from './hooks';

export function PTSection() {
  const [open, setOpen] = useState(false);
  const todaySessions = useTodayPTSessions();
  const templates = useTemplates();

  let statusText: string;
  if (!todaySessions || todaySessions.length === 0) {
    statusText = 'not logged yet';
  } else {
    // Most-recent session wins per UI-SPEC "Any session exists for today; most-recent session wins"
    const latest = [...todaySessions].sort((a, b) => b.loggedAt - a.loggedAt)[0];
    const templateName = templates?.find((t) => t.id === latest.templateId)?.name ?? 'Session';
    const done = latest.exercises.filter((e) => e.completed).length;
    const total = latest.exercises.length;
    statusText = `${templateName} · ${done}/${total} ex`;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        <Card className="bg-surface border border-border rounded-lg p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">PT</h2>
            <span className="text-sm text-muted">{statusText}</span>
          </div>
        </Card>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
          <PTSheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
