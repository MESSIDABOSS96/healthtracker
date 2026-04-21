// src/services/steps.svc.ts
// Natural-key upsert into stepEntries (dayKey is PK — one record per day).
// dayKey is passed by callers (Pitfall #4 — services never derive it from new Date()).

import { db } from '@/db/db';
import type { StepEntry } from '@/db/schema';

export async function upsertSteps(dayKey: string, count: number): Promise<void> {
  const entry: StepEntry = { dayKey, count, loggedAt: Date.now() };
  await db.stepEntries.put(entry); // natural-key upsert — dayKey is PK
}

export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined> {
  return db.stepEntries.get(dayKey);
}
