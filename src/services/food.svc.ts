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

/**
 * Dismiss a food from the Recent/Frequent chip rows.
 *
 * Deliberately not `deleteFood`. A MealEntry stores only a foodId — no name
 * snapshot — so dropping the library row leaves every past log of it rendering
 * as "—" while its calories still count toward those days' totals. The chips
 * are a convenience surface; removing something from them should not rewrite
 * history. Logging the food again clears the flag and brings the chip back.
 */
export async function hideFoodFromChips(id: string): Promise<void> {
  await db.foods.update(id, { hiddenAt: Date.now() });
}

/**
 * Remove a food from the library for good.
 *
 * Logged meal entries are deliberately NOT cascaded. Their macro totals are
 * denormalized, so they remain arithmetically correct on their own, and
 * deleting them would rewrite finished days — a tidy-up in Settings must never
 * silently change what a past day's ring said. What those entries did depend on
 * the library row for was their NAME, so it's stamped onto every one of them
 * first; entries logged before `foodName` existed are backfilled by this pass.
 *
 * The photo is dropped before the row, in that order: a failed OPFS delete
 * leaves an orphaned blob (recoverable, invisible), while the reverse leaves a
 * row pointing at a file that's gone.
 */
export async function deleteFood(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;

  await db.mealEntries
    .where('foodId')
    .equals(id)
    .modify(entry => {
      if (!entry.foodName) entry.foodName = food.name;
    });

  if (food.photoKey) {
    try {
      await deletePhoto(food.photoKey);
    } catch (err) {
      console.error('[food.svc] photo delete failed', err);
    }
  }
  await db.foods.delete(id);
}

/**
 * Edit a library food's per-serving facts.
 *
 * Past entries keep the numbers they were logged with. Their computed totals
 * are already denormalized, and re-deriving them here would let one correction
 * in Settings quietly restate weeks of finished days — including days whose
 * closure ring has already been earned. The fix applies from the next log on;
 * a single wrong entry is corrected on the entry itself.
 */
export async function updateFood(
  id: string,
  patch: Partial<Pick<Food, 'name' | 'calories' | 'proteinG' | 'carbsG' | 'fatG'>>,
): Promise<void> {
  const next: Partial<Food> = { ...patch };
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) return;
    next.name = trimmed;
    // The dedupe key is derived, never typed — letting it drift from the name
    // would strand the row: the auto-library would stop matching it and start a
    // duplicate on the next log.
    next.normalizedName = normalizeFoodName(trimmed);
  }
  await db.foods.update(id, next);
}

/** Undo a chip dismissal — see hideFoodFromChips. */
export async function unhideFoodInChips(id: string): Promise<void> {
  await db.foods.where('id').equals(id).modify(f => {
    delete f.hiddenAt;
  });
}

/** Substring search, case-insensitive, ordered by name. */
export function searchFoods(query: string): Promise<Food[]> {
  const q = query.toLowerCase();
  return db.foods
    .orderBy('name')
    .toArray()
    .then(all => (q ? all.filter(f => f.name.toLowerCase().includes(q)) : all));
}
