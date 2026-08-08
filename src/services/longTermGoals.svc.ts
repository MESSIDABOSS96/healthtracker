// src/services/longTermGoals.svc.ts
// Long-term goal storage + the progress math the Dashboard benchmarks against.
//
// Design notes:
//   - startWeight is snapshotted the first time a weight goal is saved, so
//     progress measures from the real starting point rather than a window that
//     slides forward as you weigh in.
//   - Rate/projection use the EMA series, never raw weigh-ins — day-to-day water
//     swings would produce wild projections ("goal in 3 days!").
//   - Projection is deliberately withheld when the trend is flat or moving away
//     from the target; a misleading date is worse than no date.

import { db } from '@/db/db';
import type { LongTermGoals, WeightEntry } from '@/db/schema';
import { computeEma } from './weight.svc';
import { addDays, keyToDate } from '@/lib/dayKey';

export const SINGLETON_ID = 'singleton';

/** Days of EMA history used to estimate the current rate of change. */
const RATE_WINDOW_DAYS = 28;
/** Below this weekly movement the trend is treated as flat (no projection). */
const FLAT_RATE_EPSILON = 0.05;

export function getLongTermGoals(): Promise<LongTermGoals | undefined> {
  return db.longTermGoals.get(SINGLETON_ID);
}

export interface LongTermGoalsInput {
  targetWeight?: number;
  targetDate?: string;
  liftsPerWeek?: number;
  cardioPerWeek?: number;
}

/**
 * Save goals, snapshotting the starting weight the first time a target weight
 * is set (or re-snapshotting if the target is cleared and later set again).
 * `currentWeight` is supplied by the caller (the smoothed value it already has)
 * so this service never re-reads the weight series.
 */
export async function saveLongTermGoals(
  input: LongTermGoalsInput,
  currentWeight: number | undefined,
  todayKey: string,
): Promise<void> {
  const existing = await db.longTermGoals.get(SINGLETON_ID);
  const hadTarget = existing?.targetWeight !== undefined;
  const hasTarget = input.targetWeight !== undefined;

  let startWeight = existing?.startWeight;
  let startDayKey = existing?.startDayKey;

  if (!hasTarget) {
    // Target cleared — drop the snapshot so a future goal starts fresh.
    startWeight = undefined;
    startDayKey = undefined;
  } else if (!hadTarget && currentWeight !== undefined) {
    startWeight = currentWeight;
    startDayKey = todayKey;
  }

  const row: LongTermGoals = {
    id: SINGLETON_ID,
    ...input,
    startWeight,
    startDayKey,
    updatedAt: Date.now(),
  };
  await db.longTermGoals.put(row);
}

// ---------------------------------------------------------------------------
// Weight goal progress
// ---------------------------------------------------------------------------

export interface WeightGoalProgress {
  startWeight: number;
  currentWeight: number;
  targetWeight: number;
  /** 0..100, clamped. */
  percent: number;
  /** Absolute distance still to cover. */
  remaining: number;
  /** Signed weekly change from the EMA (negative = losing). null if unknown. */
  ratePerWeek: number | null;
  /** Projected dayKey of arrival, or null when flat / moving away / reached. */
  projectedDayKey: string | null;
  /** vs an explicit targetDate: true = on pace, false = behind. null if N/A. */
  onTrack: boolean | null;
  reached: boolean;
  /** True when the trend is moving away from the target. */
  movingAway: boolean;
}

export function computeWeightGoalProgress(
  goals: LongTermGoals | undefined,
  weights: WeightEntry[],
  todayKey: string,
): WeightGoalProgress | null {
  if (!goals || goals.targetWeight === undefined || weights.length === 0) return null;
  const target = goals.targetWeight;

  const ema = computeEma(weights);
  const current = ema.at(-1)!.ema;
  const start = goals.startWeight ?? ema[0].ema;

  const losing = target < start;
  const remaining = Math.max(0, losing ? current - target : target - current);
  const reached = losing ? current <= target : current >= target;

  const span = Math.abs(start - target);
  const covered = Math.abs(start - current);
  const towardTarget = losing ? current <= start : current >= start;
  const percent = span === 0
    ? 100
    : Math.max(0, Math.min(100, (towardTarget ? covered : 0) / span * 100));

  // Rate from the EMA over the trailing window.
  const windowStart = addDays(todayKey, -RATE_WINDOW_DAYS);
  const windowed = ema.filter(e => e.dayKey >= windowStart);
  let ratePerWeek: number | null = null;
  if (windowed.length >= 2) {
    const first = windowed[0];
    const last = windowed.at(-1)!;
    const days =
      (keyToDate(last.dayKey).getTime() - keyToDate(first.dayKey).getTime()) / 86_400_000;
    if (days >= 7) ratePerWeek = ((last.ema - first.ema) / days) * 7;
  }

  // Projection only when the trend actually moves toward the target.
  let projectedDayKey: string | null = null;
  let movingAway = false;
  if (ratePerWeek !== null && !reached) {
    const movingToward = losing ? ratePerWeek < -FLAT_RATE_EPSILON : ratePerWeek > FLAT_RATE_EPSILON;
    movingAway = losing ? ratePerWeek > FLAT_RATE_EPSILON : ratePerWeek < -FLAT_RATE_EPSILON;
    if (movingToward) {
      const weeks = remaining / Math.abs(ratePerWeek);
      // Cap at ~3 years — beyond that the projection is noise, not information.
      if (weeks <= 156) projectedDayKey = addDays(todayKey, Math.ceil(weeks * 7));
    }
  }

  let onTrack: boolean | null = null;
  if (goals.targetDate) {
    if (reached) onTrack = true;
    else if (projectedDayKey) onTrack = projectedDayKey <= goals.targetDate;
    else if (movingAway) onTrack = false;
  }

  return {
    startWeight: start,
    currentWeight: current,
    targetWeight: target,
    percent: reached ? 100 : percent,
    remaining,
    ratePerWeek,
    projectedDayKey,
    onTrack,
    reached,
    movingAway,
  };
}
