// src/services/checkins.svc.ts
// One-tap lift/cardio daily check-offs. Row existence = checked; un-checking
// deletes the row. `source` is 'manual' today — a future Hevy sync writer would
// put rows with source 'hevy' through this same store (TRAIN-03).
// All dayKey values are passed in by callers (Pitfall #4 — never derived here).

import { db } from '@/db/db';
import type { CheckinKind, DailyCheckin } from '@/db/schema';
import { markDeleted, markWritten } from './syncMeta.svc';

export async function toggleCheckin(dayKey: string, kind: CheckinKind): Promise<void> {
  const existing = await db.dailyCheckins.get([dayKey, kind]);
  if (existing) {
    await db.dailyCheckins.delete([dayKey, kind]);
    // Un-checking is a delete, so it needs a tombstone like any other. Without
    // one, the next pull sees a row the other device still has and helpfully
    // re-checks the day.
    await markDeleted('dailyCheckins', [dayKey, kind]);
  } else {
    const row: DailyCheckin = { dayKey, kind, source: 'manual', loggedAt: Date.now() };
    await db.dailyCheckins.put(row);
    await markWritten('dailyCheckins', [dayKey, kind]);
  }
}

export function getCheckinsForDay(dayKey: string): Promise<DailyCheckin[]> {
  return db.dailyCheckins.where('dayKey').equals(dayKey).toArray();
}

/** Inclusive range query on the secondary dayKey index. */
export function getCheckinsInRange(startKey: string, endKey: string): Promise<DailyCheckin[]> {
  return db.dailyCheckins.where('dayKey').between(startKey, endKey, true, true).toArray();
}
