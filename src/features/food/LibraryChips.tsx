// src/features/food/LibraryChips.tsx
// One-tap re-log from the auto-library: Recent + Frequent rows. Uses the
// last-used servings for the food. A short cooldown per
// food guards against accidental double-taps double-logging.

import { useRef } from 'react';
import type { Food } from '@/db/schema';
import { QuickLogChipRow } from './QuickLogChipRow';
import { useRecentFoods, useFrequentFoods } from './hooks';
import { logMeal, getLastServingsForFood } from '@/services/meals.svc';
import { hideFoodFromChips } from '@/services/food.svc';

const DOUBLE_TAP_GUARD_MS = 1500;

export function LibraryChips({ dayKey }: { dayKey: string }) {
  const recent = useRecentFoods();
  const frequent = useFrequentFoods();
  const lastLogged = useRef<Map<string, number>>(new Map());

  const handleLog = async (food: Food) => {
    const now = Date.now();
    const last = lastLogged.current.get(food.id) ?? 0;
    if (now - last < DOUBLE_TAP_GUARD_MS) return;
    lastLogged.current.set(food.id, now);

    const servings = (await getLastServingsForFood(food.id)) ?? 1;
    await logMeal({ food, servings, dayKey });
  };

  // Dismiss, not delete — see hideFoodFromChips. Silent, matching the meal-row
  // delete (UI-SPEC §"Destructive confirmations: NONE"): nothing is destroyed,
  // and logging the food again brings the chip straight back.
  const handleRemove = async (food: Food) => {
    await hideFoodFromChips(food.id);
  };

  // Frequent row hides foods already shown in Recent to avoid duplicate chips.
  const recentIds = new Set((recent ?? []).map(f => f.id));
  const frequentFiltered = frequent?.filter(f => !recentIds.has(f.id));

  // -mx-4 cancels the screen's horizontal padding so the scroll rows reach both
  // edges of the phone; each row re-applies px-4 to its own label and first
  // chip. On desktop the rows live inside a grid column, where bleeding would
  // spill into the gutter — so the bleed is cancelled at `lg`.
  return (
    <div className="-mx-4 space-y-4 lg:mx-0">
      <QuickLogChipRow
        label="Recent"
        foods={recent}
        emptyCopy="Foods you log will show up here for one-tap re-logging."
        onLog={handleLog}
        onRemove={food => void handleRemove(food)}
      />
      <QuickLogChipRow
        label="Frequent"
        foods={frequentFiltered}
        onLog={handleLog}
        onRemove={food => void handleRemove(food)}
      />
    </div>
  );
}
