// src/features/steps/StepsSection.tsx
// Today-card Steps wrapper. Layout per UI-SPEC §"Today-card status slot (live layout)"
// Steps row: Heading left + status string right + ONE ProgressBar below (no leading
// label, unlike the Food card's 4 labelled bars). D-02 inline edit (NO Sheet) —
// tapping the status slot reveals the StepsInlineInput in place.
//
// Status copy (UI-SPEC §"Today-card populated-status copy patterns" Steps rows):
//   steps &&  target > 0   → `${count} / ${target}`
//   steps &&  target === 0 → `${count}`
//  !steps &&  target > 0   → `0 / ${target}`
//  !steps &&  target === 0 → `—`

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ProgressBar';
import { StepsInlineInput } from './StepsInlineInput';
import { useStepsForDay } from './hooks';
import { useGoals } from '@/features/settings/hooks';

export function StepsSection() {
  const steps = useStepsForDay();
  const goals = useGoals();
  const [editing, setEditing] = useState(false);

  const count = steps?.count ?? 0;
  const target = goals?.steps ?? 0;

  const statusText =
    steps && target > 0
      ? `${count} / ${target}`
      : steps && target === 0
        ? `${count}`
        : !steps && target > 0
          ? `0 / ${target}`
          : '—';

  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-text">Steps</h2>
        {editing ? (
          <StepsInlineInput currentCount={count} onCommitted={() => setEditing(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Enter step count for today"
            className="text-sm text-muted text-right"
          >
            {statusText}
          </button>
        )}
      </div>
      <ProgressBar value={count} max={target} ariaLabel="Steps progress" />
    </Card>
  );
}
