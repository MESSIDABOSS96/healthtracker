// src/features/food/MealEntryRow.tsx
//
// One meal entry. Resting state shows `{name} · {servings}× {servingLabel}` on the
// left and the bucket badge on the right. Tap to enter inline-edit: servings
// number input + 4-pill bucket radiogroup + footer (Delete / Cancel / Save).
//
// Per D-20 — only servings + bucket are editable; foodId is immutable.
// Per UI-SPEC §"Destructive confirmations: NONE" — meal-entry delete is silent.
// Keyboard: Escape collapses without commit; Enter in servings commits Save.

import { useState, useEffect } from 'react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { updateMealEntry, deleteMealEntry } from '@/services/meals.svc';
import { cn } from '@/lib/utils';

const BUCKETS: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];

interface MealEntryRowProps {
  entry: MealEntry;
  food: Food | undefined;
}

export function MealEntryRow({ entry, food }: MealEntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [servings, setServings] = useState<number>(entry.servings);
  const [bucket, setBucket] = useState<MealBucket>(entry.bucket);

  // Re-sync local edit state if the underlying entry changes while the row
  // is open (e.g. another tab updates it — unusual for single-user PWA, but cheap).
  useEffect(() => {
    setServings(entry.servings);
    setBucket(entry.bucket);
  }, [entry.servings, entry.bucket]);

  const handleSave = async () => {
    if (servings > 0) {
      await updateMealEntry(entry.id, { servings, bucket });
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    // Silent delete — no confirm (UI-SPEC §Destructive confirmations: NONE).
    // Component unmounts via useLiveQuery refire; no setEditing reset needed.
    await deleteMealEntry(entry.id);
  };

  const handleCancel = () => {
    setServings(entry.servings);
    setBucket(entry.bucket);
    setEditing(false);
  };

  if (!editing) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-between py-3 text-left hover:bg-border/20 px-2 rounded-md"
        >
          <span className="text-sm text-text">
            {food?.name ?? '—'} · {entry.servings}× {food?.servingLabel ?? ''}
          </span>
          <span className="text-xs text-muted lowercase">{entry.bucket}</span>
        </button>
      </li>
    );
  }

  return (
    <li className="py-3 px-2 space-y-3">
      <div className="space-y-1">
        <label htmlFor={`servings-${entry.id}`} className="block text-xs text-muted">Servings</label>
        <input
          id={`servings-${entry.id}`}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={servings}
          onChange={(e) => setServings(parseFloat(e.target.value) || 0)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            }
          }}
          aria-label="Servings"
          className="w-24 h-11 px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
      </div>

      <div className="space-y-1">
        <p className="block text-xs text-muted">Meal</p>
        <div role="radiogroup" aria-label="Meal" className="flex gap-2">
          {BUCKETS.map((b) => (
            <button
              key={b}
              type="button"
              role="radio"
              aria-checked={bucket === b}
              onClick={() => setBucket(b)}
              className={cn(
                'h-11 flex-1 rounded-md border text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                bucket === b
                  ? 'bg-bg border-accent text-accent'
                  : 'bg-bg border-border text-text hover:bg-border/40',
              )}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={handleDelete}
          style={{ color: 'var(--danger)' }}
        >
          Delete
        </Button>
        <Button type="button" variant="ghost" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" variant="default" onClick={handleSave}>
          Save
        </Button>
      </div>
    </li>
  );
}
