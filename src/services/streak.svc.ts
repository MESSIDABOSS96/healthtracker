// src/services/streak.svc.ts
// Phase 3 streak-loop data source. Read-only: 4-table Promise.all range queries
// feed the 4-segment month grid (STREAK-01), the consecutive-complete-days
// streak count (STREAK-05), and prev-month lower-bound nav clamp (STREAK-07).
// All dayKey values are passed in by callers (Pitfall #4). No writes, no
// transaction wrapper (Pitfall #1 not applicable — all awaits are Dexie reads).
//
// CRITICAL: This service is the ONE place per month-range where the calendar
// touches IDB. Components MUST NOT issue their own per-cell reactive or effect
// reads — see .planning/research/ARCHITECTURE.md §Anti-Pattern 3.

import { db } from '@/db/db';
import { dateToKey, keyToDate, todayKey } from '@/lib/dayKey';

export interface QuadrantState {
  pt: boolean;
  food: boolean;
  steps: boolean;
  lift: boolean;
}

// ---------- Range aggregation (the load-bearing function) ----------

/**
 * Fetch 4-segment completion state for every dayKey in [startKey, endKey] (both
 * inclusive). Returns a Map keyed by dayKey; absent keys mean "no logs that day"
 * (caller treats missing entry as all-false).
 *
 * D-01..D-04 filter rules verbatim:
 *   food  = any MealEntry on dayKey
 *   pt    = any PTSession on dayKey
 *   steps = StepEntry on dayKey AND count > 0
 *   lift  = LiftCheckin on dayKey AND lifted === true
 */
export async function getStreakDataForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, QuadrantState>> {
  // .between(lo, hi, lowInclusive=true, highInclusive=true) — BOTH booleans MUST
  // be present; omitting the second flips highInclusive to false and silently
  // drops the last day of the range. See RESEARCH §3 + Dexie docs.
  const [sessions, meals, steps, lifts] = await Promise.all([
    db.ptSessions  .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.mealEntries .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.stepEntries .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.liftCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);

  const map = new Map<string, QuadrantState>();
  const ensure = (k: string): QuadrantState => {
    let v = map.get(k);
    if (!v) {
      v = { pt: false, food: false, steps: false, lift: false };
      map.set(k, v);
    }
    return v;
  };

  for (const s of sessions) ensure(s.dayKey).pt = true;             // D-02
  for (const m of meals)    ensure(m.dayKey).food = true;           // D-01
  for (const s of steps)    if (s.count > 0)        ensure(s.dayKey).steps = true;   // D-03
  for (const l of lifts)    if (l.lifted === true)  ensure(l.dayKey).lift = true;    // D-04

  return map;
}

// ---------- Earliest-data lookup (prev-month clamp) ----------

/**
 * Lexicographically smallest dayKey across all 4 source tables. Returns null
 * when no logs exist anywhere. YYYY-MM-DD string-min === chronological-min.
 */
export async function getEarliestDayKey(): Promise<string | null> {
  const [pt, meal, step, lift] = await Promise.all([
    db.ptSessions  .orderBy('dayKey').first(),
    db.mealEntries .orderBy('dayKey').first(),
    db.stepEntries .orderBy('dayKey').first(),
    db.liftCheckins.orderBy('dayKey').first(),
  ]);
  const keys = [pt?.dayKey, meal?.dayKey, step?.dayKey, lift?.dayKey]
    .filter((k): k is string => typeof k === 'string');
  if (keys.length === 0) return null;
  return keys.reduce((a, b) => (a < b ? a : b));
}

// ---------- Consecutive-complete-days streak count ----------

// MAX_SCAN_DAYS caps the backward scan window. 730 covers any realistic solo
// user's streak; RESEARCH §7 + Assumptions Log A1 — planner-approved default.
const MAX_SCAN_DAYS = 730;

/**
 * Current consecutive-complete-days streak per UI-SPEC §"Streak semantics":
 *   - If today is 4/4 → anchor = today; count includes today.
 *   - If today is NOT 4/4 but yesterday was → anchor = yesterday; today NOT counted.
 *   - If most-recent 4/4 is > 1 day before today → return 0.
 * Anti-Pitfall #6: no "broken" framing — today being 0-3 of 4 just means today
 * isn't the anchor; the UI layer (StreakCount) handles positive-framed copy.
 */
export async function getCurrentStreakCount(): Promise<number> {
  const today = todayKey();
  const earliest = await getEarliestDayKey();
  if (!earliest) return 0;

  const scanStartDate = keyToDate(today);
  scanStartDate.setDate(scanStartDate.getDate() - MAX_SCAN_DAYS);
  const scanStartKeyRaw = dateToKey(scanStartDate);
  const scanStartKey = scanStartKeyRaw < earliest ? earliest : scanStartKeyRaw;

  const rangeMap = await getStreakDataForRange(scanStartKey, today);

  const isComplete = (key: string): boolean => {
    const q = rangeMap.get(key);
    return !!q && q.pt && q.food && q.steps && q.lift;
  };

  // Determine anchor (most-recent 4/4 day, which must be today or yesterday).
  let cursor = keyToDate(today);
  let anchorKey: string;
  if (isComplete(dateToKey(cursor))) {
    anchorKey = dateToKey(cursor);
  } else {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = dateToKey(cursor);
    if (yesterdayKey >= scanStartKey && isComplete(yesterdayKey)) {
      anchorKey = yesterdayKey;
    } else {
      return 0; // Most-recent 4/4 is more than 1 day back, or never — streak = 0
    }
  }

  // Walk backward from anchor, counting consecutive 4/4 days.
  let count = 0;
  cursor = keyToDate(anchorKey);
  while (true) {
    const key = dateToKey(cursor);
    if (key < scanStartKey) break;
    if (!isComplete(key)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
