// src/features/food/FoodSection.tsx
// Today-card Food wrapper — the only card in Phase 2 with a 4-bar stack under its header
// (UI-SPEC §"Today-card status slot" exception). Tapping the card opens the Food Sheet
// bottom-side with anti-motion override (data-[state=open]:animate-none + closed variant).

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ProgressBar';
import { FoodSheet } from './FoodSheet';
import { useDailyTotals } from './hooks';
import { useGoals } from '@/features/settings/hooks';

export function FoodSection() {
  const [open, setOpen] = useState(false);
  const totals = useDailyTotals();
  const goals = useGoals();

  const calsConsumed = Math.round(totals?.calories ?? 0);
  const calsTarget = goals?.calories ?? 0;

  // UI-SPEC Today-card populated-status Food table:
  //  target === 0 && consumed > 0   -> "{consumed} cal"
  //  target === 0 && consumed === 0 -> em-dash
  //  otherwise                       -> "{consumed} / {target} cal"
  const statusText =
    calsTarget === 0 && calsConsumed > 0
      ? `${calsConsumed} cal`
      : calsTarget === 0 && calsConsumed === 0
        ? '—'
        : `${calsConsumed} / ${calsTarget} cal`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">Food</h2>
            <span className="text-sm text-muted">{statusText}</span>
          </div>
          {/* UI-SPEC Food card exception: 4 macro ProgressBars stacked below card header */}
          <div className="space-y-2">
            <ProgressBar
              value={Math.round(totals?.calories ?? 0)}
              max={goals?.calories ?? 0}
              label="Cal"
            />
            <ProgressBar
              value={Math.round(totals?.proteinG ?? 0)}
              max={goals?.proteinG ?? 0}
              label="P"
            />
            <ProgressBar
              value={Math.round(totals?.carbsG ?? 0)}
              max={goals?.carbsG ?? 0}
              label="C"
            />
            <ProgressBar
              value={Math.round(totals?.fatG ?? 0)}
              max={goals?.fatG ?? 0}
              label="F"
            />
          </div>
        </Card>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader>
            <SheetTitle>Log food</SheetTitle>
          </SheetHeader>
          <FoodSheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
