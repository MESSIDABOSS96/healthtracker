// src/features/calendar/hooks.ts
// Canonical calendar-feature hook module (UI-SPEC:646-648). Houses:
//   - useMonthStreakData   — month-grid subscription feeding MonthGrid (Plan 03-03)
//   - useCurrentStreakCount — StreakCount hero number (Plan 03-03)
//   - useEarliestDayKey    — prev-month nav lower-bound clamp (Plan 03-03)
//   - useDayDetail         — composite per-day hook feeding DayDetail (Plan 03-04)
//
// Each hook registers its underlying tables for observation via the service
// call — so a write to ANY observed table refreshes the subscribed hook. ONE
// subscription per hook consumer, never per-cell (Anti-Pattern 3). Dep arrays
// follow src/features/food/hooks.ts convention: empty [] when the query is
// fully parameter-free; [param,...] when parameters drive re-subscription.
//
// useDayDetail issues 5 parameterized subscriptions keyed on the dayKey
// argument. This is NOT Anti-Pattern 3 — Anti-Pattern 3 forbids per-CELL
// subscriptions on a 42-cell grid. Day Detail is a single-screen, single-day
// composition; 5 subscriptions × 1 day = constant cost per write. RESEARCH §6
// explicitly accepts this shape.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getStreakDataForRange,
  getCurrentStreakCount,
  getEarliestDayKey,
  type QuadrantState,
} from '@/services/streak.svc';
import { monthRangeKeys, type MonthCell } from './monthMath';
import { getTodayEntries, getDailyTotals, type DailyTotals } from '@/services/meals.svc';
import { getTodaySessions } from '@/services/pt.svc';
import { getStepsForDay } from '@/services/steps.svc';
import { getLiftForDay } from '@/services/lifts.svc';
import type { PTSession, MealEntry, StepEntry, LiftCheckin } from '@/db/schema';

// ---------- Month-grid + streak-count + earliest-data (Plan 03-03 consumers) ----------

export interface MonthStreakData {
  data: Map<string, QuadrantState> | undefined;
  cells: MonthCell[];
  startKey: string;
  endKey: string;
}

/**
 * Reactive month-grid data. month0 is 0-indexed (Date.getMonth() convention:
 * Jan=0..Dec=11). `data` is undefined on first paint for one microtask, then
 * populates; UI-SPEC §Loading accepts this flash as correct behavior.
 */
export function useMonthStreakData(year: number, month0: number): MonthStreakData {
  const { startKey, endKey, cells } = monthRangeKeys(year, month0);
  const data = useLiveQuery(
    () => getStreakDataForRange(startKey, endKey),
    [startKey, endKey],
  );
  return { data, cells, startKey, endKey };
}

/** Reactive streak count. Undefined on first paint; caller coalesces to 0. */
export function useCurrentStreakCount(): number | undefined {
  return useLiveQuery(() => getCurrentStreakCount(), []);
}

/** Reactive earliest-data dayKey for prev-month nav clamp. */
export function useEarliestDayKey(): string | null | undefined {
  return useLiveQuery(() => getEarliestDayKey(), []);
}

// ---------- Day Detail composite (Plan 03-04 consumer) ----------

export interface DayDetailData {
  sessions: PTSession[] | undefined;
  meals: MealEntry[] | undefined;
  steps: StepEntry | undefined;
  lift: LiftCheckin | undefined;
  totals: DailyTotals | undefined;
}

/**
 * Composite hook for /#/day/:dayKey. Five parameterized live subscriptions,
 * each keyed on the dayKey argument so changing days re-subscribes. Any of the
 * fields is `undefined` on first paint; DayDetail renders loading-safe JSX.
 * UI-SPEC:648 locks this hook's placement to THIS file.
 */
export function useDayDetail(dayKey: string): DayDetailData {
  const sessions = useLiveQuery(() => getTodaySessions(dayKey), [dayKey]);
  const meals    = useLiveQuery(() => getTodayEntries(dayKey), [dayKey]);
  const steps    = useLiveQuery(() => getStepsForDay(dayKey), [dayKey]);
  const lift     = useLiveQuery(() => getLiftForDay(dayKey), [dayKey]);
  const totals   = useLiveQuery(() => getDailyTotals(dayKey), [dayKey]);
  return { sessions, meals, steps, lift, totals };
}
