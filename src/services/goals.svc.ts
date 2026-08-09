// src/services/goals.svc.ts
// Goals singleton CRUD — one record per origin (id === SINGLETON_ID).
// Seeded idempotently from main.tsx:initApp() so useLiveQuery fires with data on first paint (D-13).

import { db } from '@/db/db';
import { markWritten } from './syncMeta.svc';
import type { Goals } from '@/db/schema';

export const SINGLETON_ID = 'singleton';

const DEFAULTS = { calories: 2000, proteinG: 180, carbsG: 180, fatG: 65, weightUnit: 'lb' as const };

/**
 * Deliberately NOT marked for sync.
 *
 * This runs on every launch, before sign-in, and writes defaults on any device
 * that has no goals row yet — which is exactly the state of a NEW device about
 * to pull an existing account. Marking it would stamp those defaults with a
 * fresh clock, and the first push would then overwrite the user's real goals on
 * the server with 2000/180/180/65 before the pull ever ran. A local default is
 * not a user decision; `saveGoals` is where one gets recorded.
 */
export async function seedGoalsIfAbsent(): Promise<void> {
  const existing = await db.goals.get(SINGLETON_ID);
  if (existing) return;
  const goals: Goals = { id: SINGLETON_ID, ...DEFAULTS, updatedAt: Date.now() };
  await db.goals.put(goals);
}

export function getGoals(): Promise<Goals | undefined> {
  return db.goals.get(SINGLETON_ID);
}

export async function saveGoals(input: Omit<Goals, 'id' | 'updatedAt'>): Promise<void> {
  const goals: Goals = { id: SINGLETON_ID, ...input, updatedAt: Date.now() };
  await db.goals.put(goals);
  await markWritten('goals', SINGLETON_ID);
}
