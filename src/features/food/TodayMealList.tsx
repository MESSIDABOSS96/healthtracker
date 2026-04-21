// src/features/food/TodayMealList.tsx
//
// Section-grouped today's meals per D-18: 4 fixed sections (Breakfast / Lunch /
// Dinner / Snack) always rendered in that order; empty sections show em-dash.
//
// Special case per UI-SPEC §"Today's meals empty state": when ALL buckets are
// empty, render a single friendly message instead of 4 em-dashes. This applies
// only to the truly-empty case — once ANY bucket has entries, show all 4
// sections with em-dashes for the empty ones (D-18).

import { useMemo } from 'react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { useTodayEntries, useAllFoods } from './hooks';
import { MealEntryRow } from './MealEntryRow';

const BUCKET_ORDER: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BUCKET_LABELS: Record<MealBucket, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function TodayMealList() {
  const entries = useTodayEntries();
  const allFoods = useAllFoods();

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [allFoods]);

  if (entries === undefined) return null;

  const byBucket: Record<MealBucket, MealEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  entries.forEach((e) => byBucket[e.bucket].push(e));

  const totallyEmpty = entries.length === 0;

  return (
    <div className="space-y-1 px-4">
      <h2 className="text-xs text-muted uppercase tracking-wide mt-4">Today</h2>
      {totallyEmpty ? (
        <p className="text-sm text-muted px-4 py-2">No meals logged yet today.</p>
      ) : (
        <div>
          {BUCKET_ORDER.map((b) => (
            <section key={b}>
              <h3 className="text-xs text-muted uppercase tracking-wide pt-3 pb-1 border-t border-border first:border-t-0">
                {BUCKET_LABELS[b]}
              </h3>
              {byBucket[b].length === 0 ? (
                <p className="text-sm text-muted py-3">—</p>
              ) : (
                <ul className="divide-y divide-border">
                  {byBucket[b].map((e) => (
                    <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
