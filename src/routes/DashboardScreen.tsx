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
import { getLongTermGoals, computeWeightGoalProgress } from '@/services/longTermGoals.svc';
import { useGoals } from '@/features/settings/hooks';
import { GoalProgressCard } from '@/features/dashboard/GoalProgressCard';
import { useClosureRange, useClosureStreak } from '@/features/closure/hooks';
import { WeightChart } from '@/features/dashboard/WeightChart';
import { CaloriesChart, type CaloriesDatum } from '@/features/dashboard/CaloriesChart';
import { TrainingChart, type TrainingWeekDatum } from '@/features/dashboard/TrainingChart';
import { ClosureGrid } from '@/features/dashboard/ClosureGrid';
import { cn } from '@/lib/utils';

type Range = '4w' | '3m' | 'all';
const RANGE_DAYS: Record<Range, number> = { '4w': 28, '3m': 91, all: 365 * 5 };
const RANGES: Array<{ key: Range; label: string }> = [
  { key: '4w', label: '4 weeks' },
  { key: '3m', label: '3 months' },
  { key: 'all', label: 'All' },
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

  const gridStartKey = addDays(todayKey, -(12 * 7));
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

  // Training: sessions per week.
  const trainingData: TrainingWeekDatum[] = [];
  if (checkins) {
    const byWeek = new Map<string, { lift: number; cardio: number }>();
    for (let k = weekStart(startKey); k <= todayKey; k = addDays(k, 7)) {
      byWeek.set(k, { lift: 0, cardio: 0 });
    }
    for (const c of checkins) {
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
  const thisWeek = (checkins ?? []).reduce(
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
    <div className="px-4 py-6 space-y-4">
      <div
        role="radiogroup"
        aria-label="Time range"
        className="flex rounded-lg bg-surface border border-border p-1"
      >
        {RANGES.map(r => (
          <button
            key={r.key}
            type="button"
            role="radio"
            aria-checked={range === r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              'flex-1 h-9 rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              range === r.key ? 'bg-border/60 text-text font-medium' : 'text-muted',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

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
      <ClosureGrid todayKey={todayKey} closures={closures ?? new Map()} streak={streak} />
    </div>
  );
}
