// src/services/meals.svc.ts
// Meal-entry CRUD + denormalized day totals (FOOD-06: computed* fields on MealEntry avoid runtime joins).
// All dayKey values are passed in by callers — services never call new Date() to derive dayKey (Pitfall #4).
// Single-statement Dexie puts auto-transaction; no explicit wrapper needed (Pitfall #1).

import { db } from '@/db/db';
import type { Food, MealEntry, MealBucket } from '@/db/schema';

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

// ------- Writes -------

/** Returns the new entry's id so the caller can offer an undo. */
export async function logMeal(params: {
  food: Food;
  servings: number;
  bucket: MealBucket;
  dayKey: string;
}): Promise<string> {
  const { food, servings, bucket, dayKey } = params;
  const entry: MealEntry = {
    id: crypto.randomUUID(),
    dayKey,
    foodId: food.id,
    servings,
    bucket,
    loggedAt: Date.now(),
    computedCalories: food.calories * servings,
    computedProteinG: food.proteinG * servings,
    computedCarbsG: food.carbsG * servings,
    computedFatG: food.fatG * servings,
  };
  await db.mealEntries.put(entry);
  // Auto-library bookkeeping: every log bumps recency + frequency.
  await db.foods.update(food.id, {
    usageCount: (food.usageCount ?? 0) + 1,
    lastUsedAt: entry.loggedAt,
  });
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
  const food = await db.foods.get(entry.foodId);
  if (food) {
    await db.foods.update(food.id, {
      usageCount: Math.max(0, (food.usageCount ?? 1) - 1),
    });
  }
}

export async function updateMealEntry(
  id: string,
  patch: { servings: number; bucket: MealBucket },
): Promise<void> {
  const existing = await db.mealEntries.get(id);
  if (!existing) return;
  const food = await db.foods.get(existing.foodId);
  if (!food) return;
  const updated: MealEntry = {
    ...existing,
    servings: patch.servings,
    bucket: patch.bucket,
    // Recompute denormalized totals (FOOD-06).
    computedCalories: food.calories * patch.servings,
    computedProteinG: food.proteinG * patch.servings,
    computedCarbsG: food.carbsG * patch.servings,
    computedFatG: food.fatG * patch.servings,
  };
  await db.mealEntries.put(updated);
}

export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id);
}

// ------- Reads -------

export function getTodayEntries(dayKey: string): Promise<MealEntry[]> {
  return db.mealEntries.where('dayKey').equals(dayKey).sortBy('loggedAt');
}

export async function getDailyTotals(dayKey: string): Promise<DailyTotals> {
  const entries = await db.mealEntries.where('dayKey').equals(dayKey).toArray();
  return entries.reduce<DailyTotals>(
    (acc, e) => ({
      calories: acc.calories + e.computedCalories,
      proteinG: acc.proteinG + e.computedProteinG,
      carbsG: acc.carbsG + e.computedCarbsG,
      fatG: acc.fatG + e.computedFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

/** Most-recently-logged foods, newest first — served by the v2 lastUsedAt index. */
export async function getRecentFoods(limit = 10): Promise<Food[]> {
  const foods = await db.foods.orderBy('lastUsedAt').reverse().limit(limit * 2).toArray();
  return foods.filter(f => (f.usageCount ?? 0) > 0).slice(0, limit);
}

/** Most-frequently-logged foods (recent 30 days weighting kept simple: lifetime count). */
export async function getFrequentFoods(limit = 8): Promise<Food[]> {
  const foods = await db.foods.orderBy('usageCount').reverse().limit(limit * 2).toArray();
  return foods.filter(f => (f.usageCount ?? 0) > 1).slice(0, limit);
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
