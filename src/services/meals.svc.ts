// src/services/meals.svc.ts
// Meal-entry CRUD + denormalized day totals (FOOD-06: computed* fields on MealEntry avoid runtime joins).
// All dayKey values are passed in by callers — services never call new Date() to derive dayKey (Pitfall #4).
// Single-statement Dexie puts auto-transaction; no explicit wrapper needed (Pitfall #1).

import { db } from '@/db/db';
import type { Food, MealEntry } from '@/db/schema';
import { scaleMacros, sumMacros, type MacroTotals, type Macros } from '@/lib/macros';
import { markDeleted, markWritten } from './syncMeta.svc';

export type DailyTotals = MacroTotals;

/** The four numbers a food carries, pulled off the row in one place. */
export function foodMacros(food: Food): Macros {
  return {
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
  };
}

/** The four numbers an entry was logged with. */
export function entryMacros(entry: MealEntry): Macros {
  return {
    calories: entry.computedCalories,
    proteinG: entry.computedProteinG,
    carbsG: entry.computedCarbsG,
    fatG: entry.computedFatG,
  };
}

// ------- Writes -------

/** Returns the new entry's id so the caller can offer an undo. */
export async function logMeal(params: {
  food: Food;
  servings: number;
  dayKey: string;
}): Promise<string> {
  const { food, servings, dayKey } = params;
  // Unknowns survive the multiplication — 1.5 servings of a food whose fat was
  // never filled in has unknown fat, not 0 g of it.
  const totals = scaleMacros(foodMacros(food), servings);
  const entry: MealEntry = {
    id: crypto.randomUUID(),
    dayKey,
    foodId: food.id,
    foodName: food.name,
    servings,
    loggedAt: Date.now(),
    computedCalories: totals.calories,
    computedProteinG: totals.proteinG,
    computedCarbsG: totals.carbsG,
    computedFatG: totals.fatG,
  };
  await db.mealEntries.put(entry);
  // Auto-library bookkeeping: every log bumps recency + frequency.
  await db.foods.update(food.id, {
    usageCount: (food.usageCount ?? 0) + 1,
    lastUsedAt: entry.loggedAt,
  });
  // Logging a food you'd dismissed from the chips un-dismisses it — you just
  // told us it's back in rotation, and leaving it hidden would make Recent look
  // broken. Cleared with an explicit `delete` inside modify() rather than by
  // passing `undefined` to update(), whose treatment of undefined values is not
  // something to bet a silently-stuck flag on.
  if (food.hiddenAt) {
    await db.foods.where('id').equals(food.id).modify(f => {
      delete f.hiddenAt;
    });
  }
  // One clock for both rows: the entry and the food's usage bump are a single
  // logical action, and stamping them a millisecond apart would order them
  // against each other on the other device for no reason.
  const now = Date.now();
  await markWritten('mealEntries', entry.id, now);
  await markWritten('foods', food.id, now);
  return entry.id;
}

/**
 * Reverse a log the user just made — the deterministic tiers of the food
 * resolver write straight through without a confirm step, so undo is what
 * makes that safe.
 *
 * `lastUsedAt` is deliberately NOT restored: the previous value isn't recorded
 * anywhere, and recency ordering being one entry stale is invisible next to the
 * cost of storing history for it. The usage count is restored, because that one
 * accumulates.
 */
export async function undoMealLog(entryId: string): Promise<void> {
  const entry = await db.mealEntries.get(entryId);
  if (!entry) return;
  await db.mealEntries.delete(entryId);
  const now = Date.now();
  await markDeleted('mealEntries', entryId, now);
  const food = await db.foods.get(entry.foodId);
  if (food) {
    await db.foods.update(food.id, {
      usageCount: Math.max(0, (food.usageCount ?? 1) - 1),
    });
    await markWritten('foods', food.id, now);
  }
}

/**
 * `totals` are the numbers as the user last saw them, and they win outright.
 *
 * The edit form shows calories and macros as live fields that rescale while the
 * servings box is being typed in, so whatever is on screen at Save time is the
 * complete intent — including a hand-corrected figure the food row can't
 * express (USDA calls an egg 44g; yours are 50g). Recomputing from the Food
 * here would silently throw that correction away one field after it was made.
 * The entry keeps the override; the shared library row is left alone, so
 * fixing one meal never rewrites what every other day logged.
 *
 * Without `totals` the old behaviour stands: derive from the food row.
 */
export async function updateMealEntry(
  id: string,
  patch: {
    servings: number;
    totals?: Macros;
  },
): Promise<void> {
  const existing = await db.mealEntries.get(id);
  if (!existing) return;

  let totals = patch.totals;
  if (!totals) {
    const food = await db.foods.get(existing.foodId);
    // Nothing to recompute from and nothing supplied — leave the entry alone
    // rather than zeroing a day's calories.
    if (!food) return;
    totals = scaleMacros(foodMacros(food), patch.servings);
  }

  const updated: MealEntry = {
    ...existing,
    servings: patch.servings,
    // Denormalized totals (FOOD-06) — day totals never join.
    computedCalories: totals.calories,
    computedProteinG: totals.proteinG,
    computedCarbsG: totals.carbsG,
    computedFatG: totals.fatG,
  };
  await db.mealEntries.put(updated);
  await markWritten('mealEntries', id);
}

export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id);
  await markDeleted('mealEntries', id);
}

// ------- Reads -------

export function getTodayEntries(dayKey: string): Promise<MealEntry[]> {
  return db.mealEntries.where('dayKey').equals(dayKey).sortBy('loggedAt');
}

/**
 * The day's numbers, plus how many entries had nothing to contribute to each.
 *
 * The `missing` counts are not decoration. A day holding one meal with no
 * calorie figure has a calorie total that is a FLOOR, and both the summary
 * ("540+") and closure (which refuses to pass a ceiling it can't see the top
 * of) need to know that. Returning a bare sum would make an incomplete day
 * indistinguishable from a complete one — the same collapse that made a blank
 * macro mean zero.
 */
export async function getDailyTotals(dayKey: string): Promise<DailyTotals> {
  const entries = await db.mealEntries.where('dayKey').equals(dayKey).toArray();
  return sumMacros(entries.map(entryMacros));
}

/**
 * Most-recently-logged foods, newest first — served by the v2 lastUsedAt index.
 *
 * The overfetch factor covers rows dropped by the filters below: `hiddenAt` is
 * unindexed, so dismissed chips can only be removed after reading. Four times
 * the ask is far more headroom than a handful of dismissals needs, and it's
 * still a single small indexed page.
 */
export async function getRecentFoods(limit = 10): Promise<Food[]> {
  const foods = await db.foods.orderBy('lastUsedAt').reverse().limit(limit * 4).toArray();
  return foods.filter(f => (f.usageCount ?? 0) > 0 && !f.hiddenAt).slice(0, limit);
}

/** Most-frequently-logged foods (recent 30 days weighting kept simple: lifetime count). */
export async function getFrequentFoods(limit = 8): Promise<Food[]> {
  const foods = await db.foods.orderBy('usageCount').reverse().limit(limit * 4).toArray();
  return foods.filter(f => (f.usageCount ?? 0) > 1 && !f.hiddenAt).slice(0, limit);
}

/** Calories summed per dayKey over an inclusive range (Dashboard eating trend). */
export async function getCaloriesByDay(
  startKey: string,
  endKey: string,
): Promise<Map<string, number>> {
  const entries = await db.mealEntries
    .where('dayKey').between(startKey, endKey, true, true)
    .toArray();
  const byDay = new Map<string, number>();
  for (const e of entries) {
    if (e.computedCalories === undefined) continue;
    byDay.set(e.dayKey, (byDay.get(e.dayKey) ?? 0) + e.computedCalories);
  }
  return byDay;
}

export async function getLastServingsForFood(foodId: string): Promise<number | undefined> {
  const entries = await db.mealEntries
    .where('foodId').equals(foodId)
    .reverse()
    .sortBy('loggedAt');
  return entries[0]?.servings;
}
