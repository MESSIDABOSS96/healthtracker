// src/features/food/MealEntryRow.tsx
//
// One meal entry. Resting state is a two-line row — food name over its serving
// detail — with the entry's calories set right, so the list scans down a clean
// numeric column. Tapping expands inline edit: servings + bucket + footer.
//
// The bucket badge that used to sit at the right of each row is gone: the list
// is grouped by bucket, so every row repeated its own section heading. The
// calorie figure took the slot instead, which the row didn't show at all.
//
// Per D-20 — only servings + bucket are editable; foodId is immutable.
// Per UI-SPEC §"Destructive confirmations: NONE" — meal-entry delete is silent.
// Keyboard: Escape collapses without commit; Enter in servings commits Save.

import { useState, useEffect } from 'react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing } from '@/components/ui/styles';
import { updateMealEntry, deleteMealEntry } from '@/services/meals.svc';
import { cn } from '@/lib/utils';

const BUCKETS: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BUCKET_OPTIONS = BUCKETS.map(b => ({ value: b, label: b }));

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
          className={cn(
            '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-2.5 text-left',
            'transition-colors duration-150 ease-out-soft',
            '[@media(hover:hover)]:hover:bg-surface-2',
            focusRing,
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] text-text">{food?.name ?? '—'}</span>
            <span className="stat mt-0.5 block text-[11.5px] text-faint">
              {entry.servings} × {food?.servingLabel ?? 'serving'}
            </span>
          </span>
          <span className="stat shrink-0 text-[13px] text-muted">
            {Math.round(entry.computedCalories).toLocaleString()}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li className="py-3 space-y-3.5">
      <p className="text-[14px] font-medium text-text">{food?.name ?? '—'}</p>

      <div className="flex items-end gap-3">
        <label htmlFor={`servings-${entry.id}`} className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Servings</span>
          <input
            id={`servings-${entry.id}`}
            type="number"
            inputMode="decimal"
            step="0.1"
            value={servings}
            onChange={e => setServings(parseFloat(e.target.value) || 0)}
            onKeyDown={e => {
              if (e.key === 'Escape') handleCancel();
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSave();
              }
            }}
            aria-label="Servings"
            className={cn(field, 'stat w-24')}
          />
        </label>
        <p className="pb-3 text-[13px] text-muted">× {food?.servingLabel ?? 'serving'}</p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Meal</p>
        <Segmented
          value={bucket}
          onChange={setBucket}
          options={BUCKET_OPTIONS}
          ariaLabel="Meal"
          itemClassName="capitalize"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="danger" size="sm" onClick={handleDelete}>
          Delete
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" variant="default" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </li>
  );
}
