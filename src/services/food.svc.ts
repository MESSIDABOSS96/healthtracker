// src/services/food.svc.ts
// Foods the app knows, and how they get there.
//
// A food is a name plus the numbers for ONE SERVING of it, and that single
// shape covers everything: a dining-hall meal is a food whose serving is "1
// (the whole thing)", a packet of fruit snacks is one whose serving is "1
// packet", chicken breast is one whose serving is "100 g". Logging is then
// always the same operation — that food, times a count.
//
// Foods enter exactly one way now: you fill in the label card, once, the first
// time a name appears. That replaced an auto-library that derived a per-serving
// basis back out of whatever a parser had just produced, re-wrote the row's
// facts on every single log, and forced every weight-measured food to a per-100
// serving whether or not that was how its label read. The derivation was the
// problem — a stored fact should be the thing the user typed, not a quantity
// reverse-engineered from a total.
//
// Pitfall #1 discipline: any OPFS photo work must happen BEFORE Dexie writes.

import { db } from '@/db/db';
import type { Food } from '@/db/schema';
import { normalizeFoodName } from '@/lib/normalizeFoodName';
import { deletePhoto } from '@/lib/photoStore';
import type { Macros } from '@/lib/macros';
import { logMeal } from './meals.svc';
import { markDeleted, markManyWritten, markWritten } from './syncMeta.svc';

export interface FoodLabel {
  name: string;
  /** What one serving is. 1 + 'count' is "the whole thing". */
  servingQty: number;
  servingUnit: string;
  servingLabel: string;
  /** Per serving. Any of these may be undefined — that means unknown. */
  macros: Macros;
}

/**
 * Create or update a food from a filled-in label, then log `servings` of it.
 *
 * The upsert is keyed on normalizedName, exact match only — fuzzy merging is a
 * deliberate anti-feature, because a false positive there silently rewrites the
 * facts of a food you already trusted.
 */
export async function saveLabelAndLog(params: {
  label: FoodLabel;
  servings: number;
  dayKey: string;
  /** Set when editing a known food rather than creating one. */
  foodId?: string;
}): Promise<{ food: Food; entryId: string }> {
  const { label, servings, dayKey } = params;
  const normalizedName = normalizeFoodName(label.name);

  const existing =
    (params.foodId ? await db.foods.get(params.foodId) : undefined) ??
    (await db.foods.where('normalizedName').equals(normalizedName).first());

  const food: Food = existing
    ? {
        ...existing,
        name: label.name,
        normalizedName,
        ...label.macros,
        servingLabel: label.servingLabel,
        servingQty: label.servingQty,
        servingUnit: label.servingUnit,
        parseSource: 'local',
      }
    : {
        id: crypto.randomUUID(),
        name: label.name,
        normalizedName,
        ...label.macros,
        servingLabel: label.servingLabel,
        servingQty: label.servingQty,
        servingUnit: label.servingUnit,
        parseSource: 'local',
        usageCount: 0,
        lastUsedAt: Date.now(),
        createdAt: Date.now(),
      };

  await db.foods.put(food);
  await markWritten('foods', food.id);
  const entryId = await logMeal({ food, servings, dayKey });
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
  await markWritten('foods', id);
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

  const stamped = await db.mealEntries.where('foodId').equals(id).primaryKeys();
  await db.mealEntries
    .where('foodId')
    .equals(id)
    .modify(entry => {
      if (!entry.foodName) entry.foodName = food.name;
    });
  // The backfill is a real edit to those entries — without marking them, the
  // other device deletes the food and is left with the "—" rows this avoids.
  await markManyWritten('mealEntries', stamped as string[]);

  if (food.photoKey) {
    try {
      await deletePhoto(food.photoKey);
    } catch (err) {
      console.error('[food.svc] photo delete failed', err);
    }
  }
  await db.foods.delete(id);
  await markDeleted('foods', id);
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
  await markWritten('foods', id);
}

/** Undo a chip dismissal — see hideFoodFromChips. */
export async function unhideFoodInChips(id: string): Promise<void> {
  await db.foods.where('id').equals(id).modify(f => {
    delete f.hiddenAt;
  });
  await markWritten('foods', id);
}

/** Substring search, case-insensitive, ordered by name. */
export function searchFoods(query: string): Promise<Food[]> {
  const q = query.toLowerCase();
  return db.foods
    .orderBy('name')
    .toArray()
    .then(all => (q ? all.filter(f => f.name.toLowerCase().includes(q)) : all));
}
