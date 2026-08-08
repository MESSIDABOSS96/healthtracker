// src/services/closure.svc.ts
// Replaces v1's streak.svc. A day "closes" when all three components are
// addressed: food (≥1 meal entry — any-log semantics, deliberately NOT
// hit-target, so the daily win stays low-friction), lift check-off, and
// cardio check-off. Target adherence lives on the Dashboard instead.
//
// Query discipline (v1 Anti-Pattern 3): one Promise.all of range queries per
// consumer — never a query per day cell.

import { db } from '@/db/db';
import { addDays } from '@/lib/dayKey';

export interface DayClosure {
  food: boolean;
  lift: boolean;
  cardio: boolean;
  closed: boolean;
}

const EMPTY: DayClosure = { food: false, lift: false, cardio: false, closed: false };

/** Inclusive range → Map keyed by dayKey. Days with no activity are absent. */
export async function getClosureForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, DayClosure>> {
  const [meals, checkins] = await Promise.all([
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.dailyCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);

  const map = new Map<string, DayClosure>();
  const ensure = (key: string): DayClosure => {
    let c = map.get(key);
    if (!c) {
      c = { ...EMPTY };
      map.set(key, c);
    }
    return c;
  };

  for (const m of meals) ensure(m.dayKey).food = true;
  for (const c of checkins) {
    const day = ensure(c.dayKey);
    if (c.kind === 'lift') day.lift = true;
    if (c.kind === 'cardio') day.cardio = true;
  }
  for (const c of map.values()) c.closed = c.food && c.lift && c.cardio;
  return map;
}

export function getClosureForDay(dayKey: string): Promise<Map<string, DayClosure>> {
  return getClosureForRange(dayKey, dayKey);
}

/**
 * Current closure streak. Anchor: today if closed, else yesterday if closed,
 * else 0. Counts consecutive closed days backward, capped at 730 (2 years) —
 * same semantics as v1's streak count.
 */
export async function getCurrentClosureStreak(todayKey: string): Promise<number> {
  const CAP = 730;
  const startKey = addDays(todayKey, -CAP);
  const map = await getClosureForRange(startKey, todayKey);

  let anchor: string;
  if (map.get(todayKey)?.closed) {
    anchor = todayKey;
  } else if (map.get(addDays(todayKey, -1))?.closed) {
    anchor = addDays(todayKey, -1);
  } else {
    return 0;
  }

  let count = 0;
  let cursor = anchor;
  while (count < CAP && map.get(cursor)?.closed) {
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}
