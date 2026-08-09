// src/lib/closureMath.ts
// The rules that decide whether a day counts. Pure — no Dexie, no dates, no
// React — so it can be tested directly (`npm test`) and so the service layer
// above it is only responsible for fetching.
//
// Split out of closure.svc.ts for the same reason ringMath.ts is separate from
// ClosureRing.tsx: this is arithmetic with opinions in it, and opinions that
// decide whether a user's day "counted" deserve to be readable and provable on
// their own.

import type { LongTermGoals, WeightDirection } from '@/db/schema';

export interface ClosureComponent {
  /** 0..1, for the ring arc and the grid shade. */
  progress: number;
  /** The pass/fail verdict. Never inferred from `progress`. */
  met: boolean;
}

/**
 * How far past a calorie limit you can drift before the component reads zero.
 * 25% of a 2000 kcal target is 500 kcal — a bad day, not a catastrophe, and the
 * arc draining rather than vanishing is the honest picture of that.
 */
export const CALORIE_TOLERANCE = 0.25;

/** Half-width of the "close enough" band on maintenance. */
export const MAINTAIN_BAND = 0.1;

/** Below this difference between start and target, a weight goal is "hold". */
const MAINTAIN_EPSILON = 0.5;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Are we eating under a ceiling or over a floor today?
 *
 * Derived from the weight goal by default — a target below where you started
 * is a cut — because that fact is already recorded and asking for it twice
 * invites the two answers to disagree. The explicit override exists for the
 * cases derivation can't see: no goal weight set yet, a recomp, or a deliberate
 * bulk toward a lower long-run target.
 *
 * With neither a goal nor an override this answers 'lose'. That is a real
 * assumption, not a neutral one — it makes the calorie goal a ceiling — and it
 * is surfaced as such in Settings rather than left implicit.
 */
export function resolveWeightDirection(
  goals: Pick<LongTermGoals, 'targetWeight' | 'startWeight' | 'directionOverride'> | undefined,
): WeightDirection {
  if (goals?.directionOverride) return goals.directionOverride;
  const { targetWeight, startWeight } = goals ?? {};
  if (targetWeight !== undefined && startWeight !== undefined) {
    const delta = targetWeight - startWeight;
    if (Math.abs(delta) < MAINTAIN_EPSILON) return 'maintain';
    return delta < 0 ? 'lose' : 'gain';
  }
  return 'lose';
}

export function proteinComponent(proteinG: number, goal: number): ClosureComponent {
  // No goal set is not a failure the user can act on — treat it as satisfied
  // rather than permanently blocking closure.
  if (!(goal > 0)) return { progress: 1, met: true };
  return { progress: clamp01(proteinG / goal), met: proteinG >= goal };
}

export function calorieComponent(
  calories: number,
  goal: number,
  direction: WeightDirection,
  hasFood: boolean,
): ClosureComponent {
  if (!(goal > 0)) return { progress: 1, met: true };
  // An unlogged day is not a day spent under your limit. Without this guard a
  // cut would score full calorie credit for eating nothing, which is both
  // wrong and the exact opposite of the habit this is meant to build.
  if (!hasFood) return { progress: 0, met: false };

  const ratio = calories / goal;

  if (direction === 'gain') {
    // A floor you climb toward: every calorie counts until you clear it.
    return { progress: clamp01(ratio), met: calories >= goal };
  }

  // Overshoot decay, shared by 'lose' and 'maintain'.
  const over = (limit: number) => clamp01(1 - (ratio - limit) / CALORIE_TOLERANCE);

  if (direction === 'maintain') {
    const low = 1 - MAINTAIN_BAND;
    const high = 1 + MAINTAIN_BAND;
    if (ratio < low) return { progress: clamp01(ratio / low), met: false };
    if (ratio > high) return { progress: over(high), met: false };
    return { progress: 1, met: true };
  }

  // 'lose' — a ceiling. Anywhere at or under it is a full pass.
  if (ratio <= 1) return { progress: 1, met: true };
  return { progress: over(1), met: false };
}

/** Either check-off is a training day. Doing both is not worth extra credit —
 *  the goal is showing up, and weighting it would quietly reintroduce the old
 *  "lift AND cardio" bar that nobody cleared. */
export function trainingComponent(lift: boolean, cardio: boolean): ClosureComponent {
  const done = lift || cardio;
  return { progress: done ? 1 : 0, met: done };
}
