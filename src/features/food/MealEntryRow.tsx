// src/features/food/MealEntryRow.tsx
//
// One meal entry. Resting state is a two-line row — food name over its serving
// detail — with the entry's calories set right, so the list scans down a clean
// numeric column. Tapping expands inline edit: servings + calories + macros +
// bucket + footer.
//
// The bucket badge that used to sit at the right of each row is gone: the list
// is grouped by bucket, so every row repeated its own section heading. The
// calorie figure took the slot instead, which the row didn't show at all.
//
// Calories and macros are editable per entry, and that is the point of the
// screen: the resolver's answer is a good default, not a verdict. USDA's egg is
// a 44g medium and yours are 50g large; an AI estimate of a restaurant dish is
// a guess you can improve. Fixing it here rewrites THIS entry only — the shared
// library row is untouched, so correcting one dinner never silently restates
// every other day that logged the same food. (Per D-20 foodId stays immutable:
// this edits the numbers, never which food the entry points at.)
//
// Per UI-SPEC §"Destructive confirmations: NONE" — meal-entry delete is silent.
// Keyboard: Escape collapses without commit; Enter in any field commits Save.

import { useState, useEffect, type KeyboardEvent } from 'react';
import { Trash2 } from 'lucide-react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { field, focusRing } from '@/components/ui/styles';
import { updateMealEntry, deleteMealEntry } from '@/services/meals.svc';
import { cn } from '@/lib/utils';

const BUCKETS: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BUCKET_OPTIONS = BUCKETS.map(b => ({ value: b, label: b }));

const round1 = (n: number) => Math.round(n * 10) / 10;
const num = (s: string) => Math.max(0, parseFloat(s) || 0);

interface Totals {
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
}

function totalsOf(entry: MealEntry): Totals {
  return {
    calories: String(round1(entry.computedCalories)),
    proteinG: String(round1(entry.computedProteinG)),
    carbsG: String(round1(entry.computedCarbsG)),
    fatG: String(round1(entry.computedFatG)),
  };
}

interface MealEntryRowProps {
  entry: MealEntry;
  food: Food | undefined;
}

export function MealEntryRow({ entry, food }: MealEntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [servings, setServings] = useState<number>(entry.servings);
  const [bucket, setBucket] = useState<MealBucket>(entry.bucket);
  const [totals, setTotals] = useState<Totals>(() => totalsOf(entry));

  // Re-sync local edit state if the underlying entry changes while the row
  // is open (e.g. another tab updates it — unusual for single-user PWA, but cheap).
  useEffect(() => {
    setServings(entry.servings);
    setBucket(entry.bucket);
    setTotals(totalsOf(entry));
  }, [entry.servings, entry.bucket, entry.computedCalories]);

  /**
   * Retyping the serving count rescales the four numbers under it, so the row
   * stays arithmetically honest without the user reaching for a calculator.
   *
   * It scales from what's currently in the fields rather than recomputing from
   * the food row, which is what preserves a correction: an entry hand-fixed to
   * 358 kcal for 5 eggs becomes 429.6 for 6, not the library's 378. Recomputing
   * would quietly discard the edit the moment the amount was nudged.
   */
  const handleServingsChange = (next: number) => {
    const prev = servings;
    setServings(next);
    if (!(prev > 0) || !(next > 0)) return;
    const factor = next / prev;
    setTotals(t => ({
      calories: String(round1(num(t.calories) * factor)),
      proteinG: String(round1(num(t.proteinG) * factor)),
      carbsG: String(round1(num(t.carbsG) * factor)),
      fatG: String(round1(num(t.fatG) * factor)),
    }));
  };

  const handleSave = async () => {
    if (!(servings > 0)) return;
    await updateMealEntry(entry.id, {
      servings,
      bucket,
      totals: {
        calories: num(totals.calories),
        proteinG: num(totals.proteinG),
        carbsG: num(totals.carbsG),
        fatG: num(totals.fatG),
      },
    });
    setEditing(false);
  };

  const handleDelete = async () => {
    // Silent delete — no confirm (UI-SPEC §Destructive confirmations: NONE).
    // Component unmounts via useLiveQuery refire; no setEditing reset needed.
    await deleteMealEntry(entry.id);
  };

  const handleCancel = () => {
    setServings(entry.servings);
    setBucket(entry.bucket);
    setTotals(totalsOf(entry));
    setEditing(false);
  };

  if (!editing) {
    // Two controls side by side, so the trash can't nest inside the expand
    // button. The trailing delete is hover-only: on a phone the row is already
    // one tap from an editor with a Delete in it, and a permanent trash target
    // beside every row is a mis-tap waiting to happen on the one screen where
    // a mis-tap costs real data.
    return (
      <li className="group/row -mx-2 flex items-center rounded-sm transition-colors duration-150 ease-out-soft [@media(hover:hover)]:hover:bg-surface-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 rounded-sm px-2 py-2.5 text-left',
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

        <button
          type="button"
          onClick={() => void handleDelete()}
          aria-label={`Delete ${food?.name ?? 'entry'}`}
          className={cn(
            'mr-1 ml-1 hidden h-7 w-7 shrink-0 place-items-center rounded-full text-faint',
            '[@media(hover:hover)]:grid',
            '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100',
            'focus-visible:opacity-100',
            'hover:bg-danger/10 hover:text-danger',
            'transition-[opacity,background-color,color] duration-150 ease-out-soft',
            focusRing,
          )}
        >
          <Trash2 size={14} aria-hidden />
        </button>
      </li>
    );
  }

  const commitKeys = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handleCancel();
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSave();
    }
  };

  const macroField = (labelText: string, key: keyof Totals, span: string) => (
    <label className={cn('block', span)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{labelText}</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        value={totals[key]}
        onChange={e => setTotals({ ...totals, [key]: e.target.value })}
        onKeyDown={commitKeys}
        className={cn(field, 'stat')}
      />
    </label>
  );

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
            onChange={e => handleServingsChange(parseFloat(e.target.value) || 0)}
            onKeyDown={commitKeys}
            aria-label="Servings"
            className={cn(field, 'stat w-24')}
          />
        </label>
        <p className="pb-3 text-[13px] text-muted">× {food?.servingLabel ?? 'serving'}</p>
      </div>

      <div className="grid grid-cols-6 gap-2.5">
        {macroField('Calories', 'calories', 'col-span-6')}
        {macroField('Protein', 'proteinG', 'col-span-2')}
        {macroField('Carbs', 'carbsG', 'col-span-2')}
        {macroField('Fat', 'fatG', 'col-span-2')}
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
        <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete()}>
          Delete
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" variant="default" size="sm" onClick={() => void handleSave()}>
          Save
        </Button>
      </div>
    </li>
  );
}
