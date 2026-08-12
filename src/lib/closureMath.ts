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

/**
 * Protein is a FLOOR, so an incomplete day can still clear it: 150 g of protein
 * you definitely ate is 150 g whether or not some other meal's protein was
 * never filled in. The unknowns can only mean there was more. See the note on
 * calorieComponent for the other half of this rule.
 */
export function proteinComponent(proteinG: number, goal: number): ClosureComponent {
  // No goal set is not a failure the user can act on — treat it as satisfied
  // rather than permanently blocking closure.
  if (!(goal > 0)) return { progress: 1, met: true };
  return { progress: clamp01(proteinG / goal), met: proteinG >= goal };
}

/**
 * @param unknownCalories - the day holds at least one meal with no calorie
 * figure, so `calories` is a FLOOR rather than a total.
 *
 * AN UNKNOWN CANNOT HELP YOU CLEAR A CEILING, AND CANNOT STOP YOU CLEARING A
 * FLOOR. That single rule settles every case here, and it falls out of what the
 * unknown could be hiding: a meal with no calorie figure can only push the true
 * total UP. On a cut, where the goal is a ceiling, that means a day with a
 * blank meal in it cannot be shown to be under the limit — so it does not pass,
 * however small the known sum looks. On a bulk, where the goal is a floor, the
 * same blank is irrelevant to a total that already cleared it.
 *
 * This is the same argument as the `hasFood` guard directly below, one step
 * further on: 0 kcal is not a day spent under your limit, and neither is 400
 * kcal plus a dinner you never gave a number to.
 */
export function calorieComponent(
  calories: number,
  goal: number,
  direction: WeightDirection,
  hasFood: boolean,
  unknownCalories = false,
): ClosureComponent {
  if (!(goal > 0)) return { progress: 1, met: true };
  // An unlogged day is not a day spent under your limit. Without this guard a
  // cut would score full calorie credit for eating nothing, which is both
  // wrong and the exact opposite of the habit this is meant to build.
  if (!hasFood) return { progress: 0, met: false };

  const ratio = calories / goal;

  if (direction === 'gain') {
    // A floor you climb toward: every calorie counts until you clear it. An
    // unknown can only add to the total, so it can't invalidate a pass here.
    return { progress: clamp01(ratio), met: calories >= goal };
  }

  // Ceiling and band directions below — both need to see the whole day, and
  // this one has a hole in it. Progress still reflects what IS known, so the
  // ring reads as partly earned rather than blank.
  if (unknownCalories) {
    return { progress: clamp01(ratio), met: false };
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

/**
 * Either check-off is a training day. Doing both is not worth extra credit —
 * the goal is showing up, and weighting it would quietly reintroduce the old
 * "lift AND cardio" bar that nobody cleared.
 *
 * A DECLARED REST DAY ALSO SATISFIES THIS, and it has to satisfy it fully.
 * Every real program has scheduled off days, and grading one as a miss meant a
 * correctly-followed week could never close more than five days — the ring
 * punished the plan for being a plan. Partial credit would be worse than
 * nothing here: a rest day is not a half-finished workout, it is a day where
 * the training question has been answered.
 *
 * The three are mutually exclusive at the write site, not here, so this stays
 * a pure reading of whatever rows exist — including a legacy pair from before
 * that rule, where lift and rest both being true still reads as done.
 */
export function trainingComponent(lift: boolean, cardio: boolean, rest = false): ClosureComponent {
  const done = lift || cardio || rest;
  return { progress: done ? 1 : 0, met: done };
}
