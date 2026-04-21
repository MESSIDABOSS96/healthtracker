// src/services/lifts.svc.ts
// Natural-key upsert into liftCheckins (dayKey is PK — one record per day).
// Schema field is `lifted: boolean` (NOT `didLift`) — see schema.ts.
// dayKey is passed by callers (Pitfall #4).

import { db } from '@/db/db';
import type { LiftCheckin } from '@/db/schema';

export async function toggleLift(dayKey: string): Promise<void> {
  const existing = await db.liftCheckins.get(dayKey);
  const next: LiftCheckin = {
    dayKey,
    lifted: !(existing?.lifted ?? false),
    note: existing?.note,
    loggedAt: Date.now(),
  };
  await db.liftCheckins.put(next);
}

export async function setLiftNote(dayKey: string, note: string): Promise<void> {
  const existing = await db.liftCheckins.get(dayKey);
  const next: LiftCheckin = {
    dayKey,
    lifted: existing?.lifted ?? false,
    note: note || undefined,
    loggedAt: Date.now(),
  };
  await db.liftCheckins.put(next);
}

export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined> {
  return db.liftCheckins.get(dayKey);
}
