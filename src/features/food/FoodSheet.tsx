// src/features/food/FoodSheet.tsx
//
// Full D-05 vertical composition for the Food Sheet:
//   MacroTotalsBar (sticky top) -> Recent chips -> Frequent chips -> FoodPicker -> TodayMealList
//
// QuickLogChip taps AND FoodPicker filter-row taps both call the SAME
// handleChipLog (B-02) — FOOD-04 pre-fills last-used servings, D-08 auto-infers
// bucket, D-04 closes the Sheet on any successful log.

import type { Food } from '@/db/schema';
import { MacroTotalsBar } from './MacroTotalsBar';
import { QuickLogChipRow } from './QuickLogChipRow';
import { FoodPicker } from './FoodPicker';
import { TodayMealList } from './TodayMealList';
import { useRecentFoods, useFrequentFoods } from './hooks';
import { logMeal, getLastServingsForFood } from '@/services/meals.svc';
import { inferBucket, todayKey } from '@/lib/dayKey';

export function FoodSheet({ onClose }: { onClose: () => void }) {
  const recent = useRecentFoods();
  const frequent = useFrequentFoods();

  // B-02 — shared handler for QuickLogChip rows AND FoodPicker filter-result rows.
  // FoodPicker declares `onLog` in its API (Task 2); FoodSheet passes handleChipLog
  // down via that prop here.
  const handleChipLog = async (food: Food) => {
    const last = await getLastServingsForFood(food.id);
    await logMeal({
      food,
      servings: last ?? 1, // FOOD-04: pre-fill last-used servings
      bucket: inferBucket(), // D-08: auto-inferred from local time
      dayKey: todayKey(),
    });
    onClose(); // D-04: close immediately on log
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      <MacroTotalsBar />
      <div className="flex-1 overflow-y-auto space-y-4 pt-2">
        <QuickLogChipRow
          label="Recent"
          foods={recent}
          emptyCopy="No recent foods yet — search or add below."
          onLog={handleChipLog}
        />
        <QuickLogChipRow label="Frequent" foods={frequent} onLog={handleChipLog} />
        <FoodPicker onLog={handleChipLog} onLogged={onClose} />
        <TodayMealList />
      </div>
    </div>
  );
}
