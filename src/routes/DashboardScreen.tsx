// src/routes/DashboardScreen.tsx
// Long-term progress: range selector + weight trend, eating adherence,
// training consistency, closed-day history. One useLiveQuery per data domain.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useDayKey } from '@/lib/useDayKey';
import { addDays, keyToDate, dateToKey } from '@/lib/dayKey';
import { getAllWeights } from '@/services/weight.svc';
import { getCaloriesByDay } from '@/services/meals.svc';
import { getCheckinsInRange } from '@/services/checkins.svc';
import type { DailyCheckin } from '@/db/schema';
import { getLongTermGoals, computeWeightGoalProgress } from '@/services/longTermGoals.svc';
import { useGoals } from '@/features/settings/hooks';
import { GoalProgressCard } from '@/features/dashboard/GoalProgressCard';
import { useClosureRange, useClosureStreak } from '@/features/closure/hooks';
import { WeightChart } from '@/features/dashboard/WeightChart';
import { CaloriesChart, type CaloriesDatum } from '@/features/dashboard/CaloriesChart';
import { TrainingChart, type TrainingWeekDatum } from '@/features/dashboard/TrainingChart';
import { ClosureGrid } from '@/features/dashboard/ClosureGrid';
import { Segmented } from '@/components/ui/segmented';

type Range = '4w' | '3m' | 'all';
const RANGE_DAYS: Record<Range, number> = { '4w': 28, '3m': 91, all: 365 * 5 };
const RANGES: ReadonlyArray<{ value: Range; label: string }> = [
  { value: '4w', label: '4 weeks' },
  { value: '3m', label: '3 months' },
  { value: 'all', label: 'All' },
];

/** Monday of the week containing dayKey. */
function weekStart(dayKey: string): string {
  const dow = (keyToDate(dayKey).getDay() + 6) % 7;
  return addDays(dayKey, -dow);
}

export function DashboardScreen() {
  const todayKey = useDayKey();
  const goals = useGoals();
  const [range, setRange] = useState<Range>('4w');
  const startKey = addDays(todayKey, -(RANGE_DAYS[range] - 1));

  const allWeights = useLiveQuery(() => getAllWeights(), []);
  const caloriesByDay = useLiveQuery(() => getCaloriesByDay(startKey, todayKey), [startKey, todayKey]);
  const checkins = useLiveQuery(() => getCheckinsInRange(startKey, todayKey), [startKey, todayKey]);
  const longTermGoals = useLiveQuery(() => getLongTermGoals(), []);

  // 26 weeks: the closure grid shows 12 on phones and 26 on desktop, where
  // it spans the full row. Fetching the wider range once covers both.
  const gridStartKey = addDays(todayKey, -(26 * 7));
  const closures = useClosureRange(gridStartKey, todayKey);
  const streak = useClosureStreak(todayKey);

  // Calories: one datum per day in range (chronological, 0 for unlogged days).
  const caloriesData: CaloriesDatum[] = [];
  if (caloriesByDay) {
    // Cap "all" to the earliest logged day to avoid a five-year axis of zeros.
    const loggedKeys = [...caloriesByDay.keys()].sort();
    const effectiveStart =
      range === 'all' && loggedKeys.length > 0 && loggedKeys[0] > startKey
        ? loggedKeys[0]
        : startKey;
    for (let k = effectiveStart; k <= todayKey; k = addDays(k, 1)) {
      caloriesData.push({ dayKey: k, calories: Math.round(caloriesByDay.get(k) ?? 0) });
    }
  }

  // Training: sessions per week. Rest days are check-ins but not SESSIONS —
  // they close the day's training component without being something that
  // happened, so counting them here would inflate every weekly bar and every
  // frequency goal with days spent deliberately not training.
  const sessions = (checkins ?? []).filter(
    (c): c is DailyCheckin & { kind: 'lift' | 'cardio' } => c.kind !== 'rest',
  );
  const trainingData: TrainingWeekDatum[] = [];
  if (checkins) {
    const byWeek = new Map<string, { lift: number; cardio: number }>();
    for (let k = weekStart(startKey); k <= todayKey; k = addDays(k, 7)) {
      byWeek.set(k, { lift: 0, cardio: 0 });
    }
    for (const c of sessions) {
      const wk = byWeek.get(weekStart(c.dayKey));
      if (wk) wk[c.kind] += 1;
    }
    for (const [wkStart, counts] of byWeek) {
      const d = keyToDate(wkStart);
      trainingData.push({
        weekLabel: `${d.getMonth() + 1}/${d.getDate()}`,
        ...counts,
      });
    }
  }

  // Long-term goal benchmarking. Progress always uses the FULL weight history
  // (the goal is anchored to its own start date, not the selected range).
  const goalProgress = computeWeightGoalProgress(longTermGoals, allWeights ?? [], todayKey);
  const currentWeekStart = weekStart(todayKey);
  const thisWeek = sessions.reduce(
    (acc, c) => {
      if (c.dayKey >= currentWeekStart) acc[c.kind] += 1;
      return acc;
    },
    { lift: 0, cardio: 0 },
  );

  const rangedWeights = (allWeights ?? []).filter(w => range === 'all' || w.dayKey >= startKey);
  const weightStartKey =
    range === 'all'
      ? (rangedWeights[0]?.dayKey ?? dateToKey(new Date(0)))
      : startKey;

  return (
    <div className="px-4 pb-10 pt-3 lg:px-6 lg:pt-4">
      <h1 className="sr-only">Dashboard</h1>

      {/* The range selector governs every card below it, so it stays full
          width and above the grid rather than becoming a first cell. */}
      <Segmented
        value={range}
        onChange={setRange}
        options={RANGES}
        ariaLabel="Time range"
        className="lg:mx-auto lg:max-w-sm"
      />

      {/* Charts are wider than they are tall, so two per row on desktop reads
          better than one 1100px-wide sparkline.

          `[&>*]:min-w-0` is load-bearing, not tidiness. Grid ITEMS default to
          `min-width: auto`, i.e. they refuse to shrink below their content's
          intrinsic width — and Recharts' ResponsiveContainer reports a large
          one. Without this the cards overflow their tracks, the page grows a
          horizontal scrollbar, and `mx-auto` then centres against that wider
          scroll width, which is what made the whole layout look shifted left.
          (The tracks themselves were never the problem: Tailwind's grid-cols-2
          already emits `repeat(2, minmax(0,1fr))`.)

          Rows stretch rather than `items-start`, so a short card sits flush
          with its taller neighbour instead of leaving a hole beside it. */}
      <div className="mt-4 space-y-4 lg:grid lg:grid-cols-2 lg:items-stretch lg:gap-7 lg:space-y-0 lg:[&>*]:min-w-0">
        <GoalProgressCard
          goals={longTermGoals}
          progress={goalProgress}
          unit={goals?.weightUnit ?? 'lb'}
          thisWeek={thisWeek}
        />

        <WeightChart
          allWeights={allWeights ?? []}
          startKey={weightStartKey}
          unit={goals?.weightUnit ?? 'lb'}
        />
        <CaloriesChart data={caloriesData} target={goals?.calories ?? 0} />
        <TrainingChart data={trainingData} />
        {/* Fifth of five, so it is always alone on the last row — spanning
            both columns keeps the grid from ending on a lopsided half-row. */}
        <div className="lg:col-span-2">
          <ClosureGrid todayKey={todayKey} closures={closures ?? new Map()} streak={streak} />
        </div>
      </div>
    </div>
  );
}
