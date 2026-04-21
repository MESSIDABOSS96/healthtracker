// src/services/food.svc.ts
// Food library CRUD with OPFS photo orchestration.
//
// CRITICAL Pitfall #1 discipline: the OPFS photo pipeline runs BEFORE db.foods.put.
// OPFS calls are NOT IDB, so they must never live inside a Dexie multi-store txn — a
// non-IDB await inside one causes IDB to auto-commit and drop subsequent writes.
// Dexie single-statement puts auto-transaction, so no explicit wrapper is needed here.

import { db } from '@/db/db';
import type { Food } from '@/db/schema';
import { resizePhoto, savePhoto, deletePhoto } from '@/lib/photoStore';

export async function createFood(params: {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string;
  photoFile?: File | null;
}): Promise<Food> {
  const { photoFile, ...rest } = params;

  // Step 1 — photo pipeline BEFORE any Dexie write (Pitfall #1, CLAUDE.md rule #1).
  let photoKey: string | undefined;
  if (photoFile) {
    try {
      const resized = await resizePhoto(photoFile); // 800×800 WebP@80% (photoStore.ts)
      photoKey = await savePhoto(resized); // OPFS write
    } catch (err) {
      console.error('[food.svc] photo save failed', err);
      photoKey = undefined; // silent fallback per UI-SPEC
    }
  }

  // Step 2 — Dexie write (single-statement auto-txn; no explicit tx needed).
  const food: Food = {
    id: crypto.randomUUID(),
    ...rest,
    photoKey,
    createdAt: Date.now(),
  };
  await db.foods.put(food);
  return food;
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

/** Substring search in local case-insensitive; orders by name (CONTEXT.md D-05). */
export function searchFoods(query: string): Promise<Food[]> {
  const q = query.toLowerCase();
  return db.foods
    .orderBy('name')
    .toArray()
    .then(all => (q ? all.filter(f => f.name.toLowerCase().includes(q)) : all));
}
