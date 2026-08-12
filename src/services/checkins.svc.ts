// src/services/checkins.svc.ts
// One-tap lift/cardio/rest daily check-offs. Row existence = checked; un-checking
// deletes the row. `source` is 'manual' today — a future Hevy sync writer would
// put rows with source 'hevy' through this same store (TRAIN-03).
// All dayKey values are passed in by callers (Pitfall #4 — never derived here).

import { db } from '@/db/db';
import type { CheckinKind, DailyCheckin } from '@/db/schema';
import { markDeleted, markWritten } from './syncMeta.svc';

/**
 * Kinds that cannot stand beside a newly-checked one, cleared automatically.
 *
 * 'rest' is a claim that no session was meant to happen, so it contradicts both
 * session kinds and they contradict it. Enforcing that here rather than in the
 * UI means it holds for every writer — including a future Hevy import, which
 * would otherwise happily file a lifted session onto a day still marked rest.
 *
 * Lift and cardio do NOT conflict with each other: doing both is a normal day.
 */
const CONFLICTS: Record<CheckinKind, readonly CheckinKind[]> = {
  lift: ['rest'],
  cardio: ['rest'],
  rest: ['lift', 'cardio'],
};

export async function toggleCheckin(dayKey: string, kind: CheckinKind): Promise<void> {
  // One transaction so a toggle that also clears a conflicting kind is atomic —
  // a half-applied swap would leave the day claiming both "rest" and "lifted".
  // Every await inside is a Dexie call (Pitfall #1); syncMeta is listed because
  // markWritten/markDeleted write to it.
  await db.transaction('rw', [db.dailyCheckins, db.syncMeta], async () => {
    const existing = await db.dailyCheckins.get([dayKey, kind]);
    if (existing) {
      await db.dailyCheckins.delete([dayKey, kind]);
      // Un-checking is a delete, so it needs a tombstone like any other. Without
      // one, the next pull sees a row the other device still has and helpfully
      // re-checks the day.
      await markDeleted('dailyCheckins', [dayKey, kind]);
      return;
    }

    // One clock for the whole action, so the write and the conflict-clearing
    // deletes can't sort against each other on a remote device.
    const now = Date.now();
    for (const other of CONFLICTS[kind]) {
      if (!(await db.dailyCheckins.get([dayKey, other]))) continue;
      await db.dailyCheckins.delete([dayKey, other]);
      await markDeleted('dailyCheckins', [dayKey, other], now);
    }
    const row: DailyCheckin = { dayKey, kind, source: 'manual', loggedAt: now };
    await db.dailyCheckins.put(row);
    await markWritten('dailyCheckins', [dayKey, kind], now);
  });
}

export function getCheckinsForDay(dayKey: string): Promise<DailyCheckin[]> {
  return db.dailyCheckins.where('dayKey').equals(dayKey).toArray();
}

/** Inclusive range query on the secondary dayKey index. */
export function getCheckinsInRange(startKey: string, endKey: string): Promise<DailyCheckin[]> {
  return db.dailyCheckins.where('dayKey').between(startKey, endKey, true, true).toArray();
}
