// src/features/food/TodayMealList.tsx
// Section-grouped meal list for a day: 4 fixed sections (Breakfast / Lunch /
// Dinner / Snack) in order; empty sections show em-dash; truly-empty day shows
// a single friendly line. Parameterized by dayKey so DayDetail reuses it.

import { useMemo } from 'react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { useEntriesForDay, useAllFoods } from './hooks';
import { MealEntryRow } from './MealEntryRow';

const BUCKET_ORDER: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const BUCKET_LABELS: Record<MealBucket, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function TodayMealList({ dayKey }: { dayKey: string }) {
  const entries = useEntriesForDay(dayKey);
  const allFoods = useAllFoods();

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach(f => m.set(f.id, f));
    return m;
  }, [allFoods]);

  if (entries === undefined) return null;

  const byBucket: Record<MealBucket, MealEntry[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  entries.forEach(e => byBucket[e.bucket].push(e));

  if (entries.length === 0) {
    return <p className="text-sm text-muted py-2">Nothing logged yet.</p>;
  }

  return (
    <div>
      {BUCKET_ORDER.map(b => (
        <section key={b}>
          <h3 className="text-xs text-muted uppercase tracking-wide pt-3 pb-1 border-t border-border first:border-t-0 first:pt-0">
            {BUCKET_LABELS[b]}
          </h3>
          {byBucket[b].length === 0 ? (
            <p className="text-sm text-muted py-2">—</p>
          ) : (
            <ul className="divide-y divide-border">
              {byBucket[b].map(e => (
                <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
