// src/services/closure.svc.ts
// What makes a day count.
//
// v1 asked three yes/no questions — did you log any food, did you lift, did you
// do cardio — and closed the day only if all three were yes. That was wrong in
// both directions. "Any food logged" is not a nutrition goal (a banana closed
// the segment), and requiring lift AND cardio every single day sets a bar
// almost nobody clears, so the ring sat at 2/3 forever and stopped meaning
// anything.
//
// The model now grades three components, each returning a 0..1 progress AND a
// hard met/not-met verdict:
//
//   protein   — hit the daily protein goal. The macro that matters most.
//   calories  — land on the right side of the calorie goal. Which side depends
//               on whether you're cutting or bulking (see resolveWeightDirection):
//               a ceiling on a cut, a floor on a bulk, a band on maintenance.
//   training  — lift OR cardio OR a declared rest day. Either session is a
//               training day, and a planned day off is not a failure to train.
//
// progress drives the ring fill and the grid shading; `met` decides closure.
// They are separate on purpose: 49g of a 50g protein goal should look nearly
// full and still not be a pass, and deriving the verdict from a rounded
// percentage would make that a float-comparison question.
//
// Query discipline (v1 Anti-Pattern 3): one Promise.all of range queries per
// consumer — never a query per day cell. The two goal singletons are read once
// for the whole range, not once per day.

import { db } from '@/db/db';
import type { WeightDirection } from '@/db/schema';
import { addDays } from '@/lib/dayKey';
import {
  calorieComponent,
  proteinComponent,
  resolveWeightDirection,
  trainingComponent,
  type ClosureComponent,
} from '@/lib/closureMath';

export type { ClosureComponent };

export interface DayClosure {
  protein: ClosureComponent;
  calories: ClosureComponent;
  training: ClosureComponent;
  /** Mean of the three components, 0..1. */
  progress: number;
  closed: boolean;
  /** Raw totals, so the UI can show "40 / 50g" without re-querying. */
  proteinTotal: number;
  proteinGoal: number;
  caloriesTotal: number;
  caloriesGoal: number;
  /** Kept separate from `training` for the check-off buttons and tooltips. */
  lift: boolean;
  cardio: boolean;
  /** The day was declared a planned day off — training is met without a session. */
  rest: boolean;
  direction: WeightDirection;
  /**
   * How many of the day's meals carry no calorie figure. Non-zero means
   * `caloriesTotal` is a floor, the calorie component cannot pass a ceiling,
   * and the UI owes the user a note saying which meals to fill in.
   */
  mealsMissingCalories: number;
}

function emptyClosure(
  proteinGoal: number,
  caloriesGoal: number,
  direction: WeightDirection,
): DayClosure {
  return {
    protein: { progress: 0, met: false },
    calories: { progress: 0, met: false },
    training: { progress: 0, met: false },
    progress: 0,
    closed: false,
    proteinTotal: 0,
    proteinGoal,
    caloriesTotal: 0,
    caloriesGoal,
    lift: false,
    cardio: false,
    rest: false,
    direction,
    mealsMissingCalories: 0,
  };
}

/** A zero-state closure for components rendering before the query resolves. */
export function blankClosure(): DayClosure {
  return emptyClosure(0, 0, 'lose');
}

/** Inclusive range → Map keyed by dayKey. Days with no activity are absent. */
export async function getClosureForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, DayClosure>> {
  const [meals, checkins, goals, longTerm] = await Promise.all([
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.dailyCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.goals.get('singleton'),
    db.longTermGoals.get('singleton'),
  ]);

  const proteinGoal = goals?.proteinG ?? 0;
  const caloriesGoal = goals?.calories ?? 0;
  const direction = resolveWeightDirection(longTerm);

  const map = new Map<string, DayClosure>();
  const ensure = (key: string): DayClosure => {
    let c = map.get(key);
    if (!c) {
      c = emptyClosure(proteinGoal, caloriesGoal, direction);
      map.set(key, c);
    }
    return c;
  };

  const hasFood = new Set<string>();
  for (const m of meals) {
    const day = ensure(m.dayKey);
    // Unknowns are counted, not summed. A meal with no protein figure adds
    // nothing to the protein total and nothing to the missing count either —
    // protein is a floor, and a floor is unharmed by what it can't see. A meal
    // with no calorie figure is the case that matters, and it is tracked.
    if (m.computedProteinG !== undefined) day.proteinTotal += m.computedProteinG;
    if (m.computedCalories !== undefined) day.caloriesTotal += m.computedCalories;
    else day.mealsMissingCalories += 1;
    hasFood.add(m.dayKey);
  }
  for (const c of checkins) {
    const day = ensure(c.dayKey);
    if (c.kind === 'lift') day.lift = true;
    if (c.kind === 'cardio') day.cardio = true;
    if (c.kind === 'rest') day.rest = true;
  }

  for (const [key, day] of map) {
    day.proteinTotal = Math.round(day.proteinTotal * 10) / 10;
    day.caloriesTotal = Math.round(day.caloriesTotal);
    day.protein = proteinComponent(day.proteinTotal, proteinGoal);
    day.calories = calorieComponent(
      day.caloriesTotal,
      caloriesGoal,
      direction,
      hasFood.has(key),
      day.mealsMissingCalories > 0,
    );
    day.training = trainingComponent(day.lift, day.cardio, day.rest);
    day.progress = (day.protein.progress + day.calories.progress + day.training.progress) / 3;
    day.closed = day.protein.met && day.calories.met && day.training.met;
  }
  return map;
}

/**
 * One day, always fully formed. A day with nothing logged is ABSENT from the
 * range map (that's what keeps the grid's history cheap), but the ring still
 * has to render the goals that day is being measured against — so the empty
 * case is rebuilt here with the real goals rather than handed back as zeros.
 */
export async function getClosureForDay(dayKey: string): Promise<DayClosure> {
  const [map, goals, longTerm] = await Promise.all([
    getClosureForRange(dayKey, dayKey),
    db.goals.get('singleton'),
    db.longTermGoals.get('singleton'),
  ]);
  return (
    map.get(dayKey) ??
    emptyClosure(goals?.proteinG ?? 0, goals?.calories ?? 0, resolveWeightDirection(longTerm))
  );
}

/**
 * Current closure streak. Anchor: today if closed, else yesterday if closed,
 * else 0. Counts consecutive closed days backward, capped at 730 (2 years) —
 * same semantics as v1's streak count.
 */
export async function getCurrentClosureStreak(todayKey: string): Promise<number> {
  const CAP = 730;
  const startKey = addDays(todayKey, -CAP);
  const map = await getClosureForRange(startKey, todayKey);

  let anchor: string;
  if (map.get(todayKey)?.closed) {
    anchor = todayKey;
  } else if (map.get(addDays(todayKey, -1))?.closed) {
    anchor = addDays(todayKey, -1);
  } else {
    return 0;
  }

  let count = 0;
  let cursor = anchor;
  while (count < CAP && map.get(cursor)?.closed) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
