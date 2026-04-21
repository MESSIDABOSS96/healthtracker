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

const THIRTY_DAYS_MS = 30 * 86_400_000;

// ------- Writes -------

export async function logMeal(params: {
  food: Food;
  servings: number;
  bucket: MealBucket;
  dayKey: string;
}): Promise<void> {
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

/** Most-recently-logged unique foods, newest first. */
export async function getRecentFoods(limit = 10): Promise<Food[]> {
  const entries = await db.mealEntries.orderBy('loggedAt').reverse().toArray();
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const e of entries) {
    if (seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    orderedIds.push(e.foodId);
    if (orderedIds.length >= limit) break;
  }
  if (orderedIds.length === 0) return [];
  const foods = await db.foods.bulkGet(orderedIds);
  return foods.filter((f): f is Food => f !== undefined);
}

/** Most-frequently-logged foods in the last 30 days. */
export async function getFrequentFoods(limit = 8): Promise<Food[]> {
  const since = Date.now() - THIRTY_DAYS_MS;
  const entries = await db.mealEntries.where('loggedAt').above(since).toArray();
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1);
  const orderedIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (orderedIds.length === 0) return [];
  const foods = await db.foods.bulkGet(orderedIds);
  return foods.filter((f): f is Food => f !== undefined);
}

export async function getLastServingsForFood(foodId: string): Promise<number | undefined> {
  const entries = await db.mealEntries
    .where('foodId').equals(foodId)
    .reverse()
    .sortBy('loggedAt');
  return entries[0]?.servings;
}
