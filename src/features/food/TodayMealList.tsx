// src/features/food/TodayMealList.tsx
// Section-grouped meal list for a day, in fixed order (Breakfast / Lunch /
// Dinner / Snack). Parameterized by dayKey so DayDetail reuses it.
//
// Only sections with entries render. The old layout printed all four headings
// plus an em-dash for each empty one, so a day with a single logged breakfast
// cost four headings and three dashes — noise standing in for information.
//
// Each section carries its own calorie subtotal, read straight off the
// denormalized MealEntry.computedCalories (no join, no extra query).

import { useMemo } from 'react';
import type { Food, MealBucket, MealEntry } from '@/db/schema';
import { eyebrow } from '@/components/ui/styles';
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
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        Nothing logged yet. Type what you ate above.
      </p>
    );
  }

  const filled = BUCKET_ORDER.filter(b => byBucket[b].length > 0);

  return (
    <div className="space-y-5">
      {filled.map(b => {
        const rows = byBucket[b];
        const subtotal = Math.round(rows.reduce((sum, e) => sum + e.computedCalories, 0));
        return (
          <section key={b}>
            <div className="flex items-baseline justify-between gap-3 pb-1.5">
              <h3 className={eyebrow}>{BUCKET_LABELS[b]}</h3>
              <span className="stat text-[11px] text-faint">{subtotal.toLocaleString()} cal</span>
            </div>
            <ul className="divide-y divide-hairline">
              {rows.map(e => (
                <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
