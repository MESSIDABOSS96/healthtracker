// src/features/day/DayScreen.tsx
// One screen for any day, today or past. `/daily` and `/day/:dayKey` are both
// thin wrappers over this, which is what makes stepping through days with the
// arrows — and clicking a square in the closure grid — land somewhere that
// looks the same every time. They used to be two separately-built screens that
// drifted: only one of them had the ring.
//
// Layout is a single centred column at EVERY width — no desktop split. The ring
// is the thing the app exists for, and putting anything beside it demotes it to
// "one of two things happening at once". Stacking keeps it at the top, alone,
// as the focus, and keeps desktop reading identically to the phone.
//
// The column is capped well below the shell's max width because these are forms
// and lists, not a dashboard — a 1150px-wide weight input would be absurd. The
// Dashboard is where the extra width earns its keep.
//
// Freeform entry is today-only (per D-20: no backdated parsing). The library
// chips cover "forgot to log yesterday" without spending a parse.

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClosureRing } from '@/features/closure/ClosureRing';
import { useDayClosure, useClosureStreak } from '@/features/closure/hooks';
import { CheckinButtons } from '@/features/checkins/CheckinButtons';
import { FoodEntry } from '@/features/food/FoodEntry';
import { LibraryChips } from '@/features/food/LibraryChips';
import { MacroSummary } from '@/features/food/MacroSummary';
import { TodayMealList } from '@/features/food/TodayMealList';
import { WeightCard } from '@/features/weight/WeightCard';
import { DayNav } from './DayNav';

const EMPTY = { food: false, lift: false, cardio: false, closed: false };

interface DayScreenProps {
  dayKey: string;
  todayKey: string;
}

export function DayScreen({ dayKey, todayKey }: DayScreenProps) {
  const isToday = dayKey === todayKey;
  const closure = useDayClosure(dayKey);
  // The streak is a live "right now" fact, so it only belongs on today's view —
  // showing it above a day in March would read as that day's streak.
  const streak = useClosureStreak(todayKey);

  return (
    <div className="px-4 pb-10 pt-3 lg:px-6 lg:pt-5">
      <div className="mx-auto w-full space-y-5 lg:max-w-2xl lg:space-y-6">
        {/* Hero — the ring, alone, above everything. */}
        <div className="mb-2 lg:mb-3">
          <DayNav dayKey={dayKey} todayKey={todayKey} />
          <div className="mt-5">
            <ClosureRing closure={closure ?? EMPTY} streak={isToday ? streak : undefined} />
          </div>
        </div>

        <CheckinButtons dayKey={dayKey} />

        <Card>
          <CardHeader>
            <CardTitle>Nutrition</CardTitle>
          </CardHeader>
          <CardContent>
            <MacroSummary dayKey={dayKey} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {isToday && <FoodEntry dayKey={dayKey} />}
          <LibraryChips dayKey={dayKey} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayMealList dayKey={dayKey} />
          </CardContent>
        </Card>

        <WeightCard dayKey={dayKey} />
      </div>
    </div>
  );
}
