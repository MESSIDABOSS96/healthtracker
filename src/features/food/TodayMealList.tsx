// src/features/food/TodayMealList.tsx
// The day's meals, in the order they were logged.
//
// This used to group into Breakfast / Lunch / Dinner / Snack, with each entry
// stamped with a bucket inferred from the clock. The grouping was removed
// because nothing consumed it: closure grades protein, calories and training,
// the Dashboard trends on daily totals, and no screen ever asked which meal a
// calorie came from. What it cost was a decision on every single log — a
// segmented control to check, and a wrong guess to correct at 4pm — in exchange
// for four headings that only re-stated the order the list was already in.
//
// Time of day is still on screen, on each row, where it costs nothing.

import { useMemo } from 'react';
import type { Food } from '@/db/schema';
import { eyebrow } from '@/components/ui/styles';
import { useEntriesForDay, useAllFoods } from './hooks';
import { MealEntryRow } from './MealEntryRow';

export function TodayMealList({ dayKey }: { dayKey: string }) {
  const entries = useEntriesForDay(dayKey);
  const allFoods = useAllFoods();

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach(f => m.set(f.id, f));
    return m;
  }, [allFoods]);

  if (entries === undefined) return null;

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-muted">
        Nothing logged yet. Type what you ate above.
      </p>
    );
  }

  // Entries with no calorie figure contribute nothing and are counted instead,
  // so the subtotal never passes off a floor as a sum.
  const subtotal = Math.round(entries.reduce((sum, e) => sum + (e.computedCalories ?? 0), 0));
  const unknown = entries.filter(e => e.computedCalories === undefined).length;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-1.5">
        <h3 className={eyebrow}>Today</h3>
        <span className="stat text-[11px] text-faint">
          {subtotal.toLocaleString()}
          {unknown > 0 && '+'} cal
        </span>
      </div>
      <ul className="divide-y divide-hairline">
        {entries.map(e => (
          <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
        ))}
      </ul>
    </section>
  );
}
