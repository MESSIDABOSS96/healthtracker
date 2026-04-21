// src/services/goals.svc.ts
// Goals singleton CRUD — one record per origin (id === SINGLETON_ID).
// Seeded idempotently from main.tsx:initApp() so useLiveQuery fires with data on first paint (D-13).

import { db } from '@/db/db';
import type { Goals } from '@/db/schema';

export const SINGLETON_ID = 'singleton';

const DEFAULTS = { calories: 2000, proteinG: 180, carbsG: 180, fatG: 65, steps: 8000 };

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
}
