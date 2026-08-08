// src/routes/DailyScreen.tsx
// The Daily tab: today's closure ring + every logging entry point.
// Layout: ring hero → lift/cardio check-offs → food card → weight card.

import { useDayKey } from '@/lib/useDayKey';
import { keyToDate } from '@/lib/dayKey';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClosureRing } from '@/features/closure/ClosureRing';
import { useDayClosure, useClosureStreak } from '@/features/closure/hooks';
import { CheckinButtons } from '@/features/checkins/CheckinButtons';
import { FoodEntry } from '@/features/food/FoodEntry';
import { LibraryChips } from '@/features/food/LibraryChips';
import { MacroSummary } from '@/features/food/MacroSummary';
import { TodayMealList } from '@/features/food/TodayMealList';
import { WeightCard } from '@/features/weight/WeightCard';

const EMPTY = { food: false, lift: false, cardio: false, closed: false };

export function DailyScreen() {
  const dayKey = useDayKey();
  const closure = useDayClosure(dayKey);
  const streak = useClosureStreak(dayKey);

  const dateLabel = keyToDate(dayKey).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="text-center">
        <p className="text-xs text-muted uppercase tracking-wide">{dateLabel}</p>
      </div>

      <ClosureRing closure={closure ?? EMPTY} streak={streak} />

      <CheckinButtons dayKey={dayKey} />

      <Card>
        <CardHeader>
          <CardTitle>Food</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MacroSummary dayKey={dayKey} />
          <FoodEntry dayKey={dayKey} />
          <LibraryChips dayKey={dayKey} />
          <TodayMealList dayKey={dayKey} />
        </CardContent>
      </Card>

      <WeightCard dayKey={dayKey} />
    </div>
  );
}
