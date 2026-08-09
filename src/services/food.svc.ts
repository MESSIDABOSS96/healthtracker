// src/services/food.svc.ts
// v2 auto-library. There is no manual "create food" flow anymore — items enter
// the library exclusively by confirming a parse (AI or local), deduped by
// normalizedName (exact match only — fuzzy merging is a deliberate anti-feature).
//
// Pitfall #1 discipline: any OPFS photo work must happen BEFORE Dexie writes;
// parse fetches must complete before Dexie writes (see parse.svc.ts).

import { db } from '@/db/db';
import type { Food, MealBucket } from '@/db/schema';
import { normalizeFoodName } from '@/lib/normalizeFoodName';
import { deletePhoto } from '@/lib/photoStore';
import type { ParsedFood } from './parse.svc';
import { logMeal } from './meals.svc';

/**
 * Convert a confirmed parse into per-serving food data + a servings count.
 * Weight/volume units store a per-100 serving (so re-logs scale naturally);
 * discrete items store a per-1 serving.
 */
export function toServingBasis(parsed: ParsedFood): {
  perServing: { calories: number; proteinG: number; carbsG: number; fatG: number };
  servingLabel: string;
  servingQty: number;
  servingUnit: string;
  servings: number;
} {
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const isMeasure = parsed.unit === 'g' || parsed.unit === 'ml';
  const servings = isMeasure ? parsed.quantity / 100 : parsed.quantity;
  const safeServings = servings > 0 ? servings : 1;
  return {
    perServing: {
      calories: round1(parsed.calories / safeServings),
      proteinG: round1(parsed.proteinG / safeServings),
      carbsG: round1(parsed.carbsG / safeServings),
      fatG: round1(parsed.fatG / safeServings),
    },
    servingLabel: isMeasure ? `100 ${parsed.unit}` : '1 item',
    servingQty: isMeasure ? 100 : 1,
    servingUnit: isMeasure ? parsed.unit : 'count',
    servings: safeServings,
  };
}

/**
 * Upsert a confirmed parse into the library (dedupe on normalizedName) and
 * log it as a meal entry for the given day. Returns the library food used and
 * the new entry's id, so the caller can offer an undo.
 */
export async function logParsedFood(params: {
  parsed: ParsedFood;
  bucket: MealBucket;
  dayKey: string;
}): Promise<{ food: Food; entryId: string }> {
  const { parsed, bucket, dayKey } = params;
  const basis = toServingBasis(parsed);
  const normalizedName = normalizeFoodName(parsed.name);

  const existing = await db.foods.where('normalizedName').equals(normalizedName).first();
  let food: Food;
  if (existing) {
    // Same item re-parsed — refresh its per-serving facts with the latest
    // confirmed values (the user just verified them in the confirm form).
    food = {
      ...existing,
      name: parsed.name,
      ...basis.perServing,
      servingLabel: basis.servingLabel,
      servingQty: basis.servingQty,
      servingUnit: basis.servingUnit,
      parseSource: parsed.source,
    };
  } else {
    food = {
      id: crypto.randomUUID(),
      name: parsed.name,
      normalizedName,
      ...basis.perServing,
      servingLabel: basis.servingLabel,
      servingQty: basis.servingQty,
      servingUnit: basis.servingUnit,
      parseSource: parsed.source,
      usageCount: 0,
      lastUsedAt: Date.now(),
      createdAt: Date.now(),
    };
  }
  await db.foods.put(food);
  const entryId = await logMeal({ food, servings: basis.servings, bucket, dayKey });
  return { food, entryId };
}

export async function deleteFood(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;
  if (food.photoKey) {
    try {
      await deletePhoto(food.photoKey);
    } catch (err) {
      console.error('[food.svc] photo delete failed', err);
    }
  }
  await db.foods.delete(id);
}

/** Substring search, case-insensitive, ordered by name. */
export function searchFoods(query: string): Promise<Food[]> {
  const q = query.toLowerCase();
  return db.foods
    .orderBy('name')
    .toArray()
    .then(all => (q ? all.filter(f => f.name.toLowerCase().includes(q)) : all));
}
