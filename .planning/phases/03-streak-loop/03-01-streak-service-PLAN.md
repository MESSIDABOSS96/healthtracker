---
phase: 03-streak-loop
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/streak.svc.ts
  - src/features/calendar/monthMath.ts
  - src/features/calendar/hooks.ts
autonomous: true
requirements:
  - STREAK-01
  - STREAK-05
  - STREAK-06
  - STREAK-07
must_haves:
  truths:
    - "Service issues ONE Promise.all over 4 Dexie tables (ptSessions, mealEntries, stepEntries, liftCheckins) per range query — never per-cell (Anti-Pattern 3 hard-fail)"
    - "useMonthStreakData(year, month0) returns {data: Map<dayKey,QuadrantState>|undefined, cells: {dayKey, inMonth}[]} — ONE useLiveQuery subscription that observes all 4 tables"
    - "useCurrentStreakCount() returns number — backward scan from today through hydrated range map; today counted only when already 4/4; no 'broken' framing"
    - "getEarliestDayKey() returns lexicographically smallest dayKey across 4 tables (null if none) for prev-month nav lower-bound clamp"
    - "useDayDetail(dayKey) lives in the canonical src/features/calendar/hooks.ts file (UI-SPEC:648) — ONE composite hook with 5 parameterized useLiveQuery subscriptions (sessions, meals, steps, lift, food totals) for the Day Detail screen consumed by Plan 03-04"
    - "All dayKey construction routes through src/lib/dayKey.ts (dateToKey/keyToDate/todayKey); ZERO toISOString().split or new Date(key) usage"
    - "Segment rules D-01..D-05 verbatim: food=any MealEntry, PT=any PTSession, steps=StepEntry && count>0, lift=LiftCheckin && lifted===true, complete=all 4 AND"
  artifacts:
    - path: "src/services/streak.svc.ts"
      provides: "getStreakDataForRange, getCurrentStreakCount, getEarliestDayKey — pure reads, no transaction wrapper"
      exports: ["QuadrantState", "getStreakDataForRange", "getCurrentStreakCount", "getEarliestDayKey"]
    - path: "src/features/calendar/monthMath.ts"
      provides: "firstOfMonth, lastOfMonth, sundayOnOrBefore, addDays, monthRangeKeys — all dayKey output routes through dateToKey"
      exports: ["firstOfMonth", "lastOfMonth", "sundayOnOrBefore", "addDays", "monthRangeKeys"]
    - path: "src/features/calendar/hooks.ts"
      provides: "useLiveQuery wrappers around streak.svc + composite useDayDetail hook for Plan 03-04"
      exports: ["useMonthStreakData", "useCurrentStreakCount", "useEarliestDayKey", "useDayDetail", "DayDetailData", "MonthStreakData"]
  key_links:
    - from: "src/features/calendar/hooks.ts:useMonthStreakData"
      to: "src/services/streak.svc.ts:getStreakDataForRange"
      via: "useLiveQuery callback"
      pattern: "useLiveQuery\\(\\(\\) => getStreakDataForRange\\("
    - from: "src/services/streak.svc.ts:getStreakDataForRange"
      to: "db.ptSessions / db.mealEntries / db.stepEntries / db.liftCheckins"
      via: "Promise.all of 4 .where('dayKey').between(start, end, true, true).toArray()"
      pattern: "Promise\\.all"
    - from: "src/features/calendar/monthMath.ts"
      to: "src/lib/dayKey.ts"
      via: "import { dateToKey, keyToDate } from '@/lib/dayKey'"
      pattern: "from '@/lib/dayKey'"
    - from: "src/features/calendar/hooks.ts:useDayDetail"
      to: "meals.svc / pt.svc / steps.svc / lifts.svc read functions"
      via: "5 parameterized useLiveQuery calls keyed on [dayKey]"
      pattern: "useLiveQuery\\(\\(\\) => get(TodaySessions|TodayEntries|StepsForDay|LiftForDay|DailyTotals)"
---

<objective>
Build the Phase 3 data foundation: a single read-only service (`streak.svc.ts`) that issues ONE `Promise.all` over four Dexie range queries to return a `Map<dayKey, QuadrantState>` for any date range; a pure date-math utility (`monthMath.ts`) that computes 42-cell month-grid windows using native `Date` routed through `src/lib/dayKey.ts`; and the canonical `hooks.ts` file housing ALL calendar-feature useLiveQuery wrappers — both the month-grid/streak-count hooks AND the `useDayDetail` composite hook that Plan 03-04 consumes (UI-SPEC:648 locks `useDayDetail` to this file, so it must be authored here rather than in a separate file).

Purpose: Satisfies ARCHITECTURE.md §"Pattern for the streak calendar" — the WHOLE month grid refreshes on any write to any of the 4 tables via ONE subscription. Any per-cell query is an automatic HARD-FAIL (Anti-Pattern 3). This plan establishes the contract the entire Phase 3 UI consumes. Authoring `useDayDetail` here (instead of in Plan 03-04) honors the UI-SPEC canonical placement and keeps Wave 1 file-ownership clean: Plan 03-01 owns `hooks.ts` end-to-end; Plan 03-04 imports from it.

Output: 3 new files, zero schema changes, zero npm adds, zero writes anywhere. All reads.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-streak-loop/03-CONTEXT.md
@.planning/phases/03-streak-loop/03-RESEARCH.md
@.planning/phases/03-streak-loop/03-PATTERNS.md
@.planning/phases/03-streak-loop/03-UI-SPEC.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@src/lib/dayKey.ts
@src/db/db.ts
@src/db/schema.ts
@src/services/meals.svc.ts
@src/services/pt.svc.ts
@src/services/steps.svc.ts
@src/services/lifts.svc.ts
@src/features/food/hooks.ts

<interfaces>
<!-- Key types and contracts the executor needs. Use these directly — no codebase exploration needed. -->

From src/db/schema.ts (data shape):
```typescript
export interface MealEntry   { id: string; dayKey: string; foodId: string; servings: number; bucket: MealBucket; loggedAt: number; computedCalories: number; computedProteinG: number; computedCarbsG: number; computedFatG: number; }
export interface PTSession   { id: string; dayKey: string; templateId: string; /* ...other fields */; loggedAt: number; }
export interface StepEntry   { dayKey: string; count: number; loggedAt: number; }       // dayKey is PK
export interface LiftCheckin { dayKey: string; lifted: boolean; note?: string; loggedAt: number; } // dayKey is PK
```

From src/db/db.ts (indexed fields — all dayKey ranges are cheap):
```typescript
this.version(1).stores({
  'ptSessions':   'id, dayKey, templateId, loggedAt',   // dayKey is secondary index
  'mealEntries':  'id, dayKey, foodId, loggedAt',       // dayKey is secondary index
  'stepEntries':  'dayKey',                              // dayKey IS the primary key
  'liftCheckins': 'dayKey',                              // dayKey IS the primary key
});
```

From src/lib/dayKey.ts (Pitfall #4 — the ONLY day-key constructors in the codebase):
```typescript
export function todayKey(): string;             // local YYYY-MM-DD of new Date()
export function dateToKey(date: Date): string;  // local getFullYear / getMonth+1 / getDate, padStart(2,'0')
export function keyToDate(key: string): Date;   // new Date(y, m-1, d) — LOCAL not UTC
```

From src/services/meals.svc.ts (needed by useDayDetail):
```typescript
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;          // dayKey-agnostic despite name
export async function getDailyTotals(dayKey: string): Promise<DailyTotals>;
export type DailyTotals = { calories: number; proteinG: number; carbsG: number; fatG: number; };
```

From src/services/pt.svc.ts:
```typescript
export function getTodaySessions(dayKey: string): Promise<PTSession[]>;          // dayKey-agnostic despite name
```

From src/services/steps.svc.ts:
```typescript
export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined>;
```

From src/services/lifts.svc.ts:
```typescript
export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined>;
```

Canonical service-file hygiene (from src/services/meals.svc.ts:1-4):
```typescript
// src/services/<name>.svc.ts
// <one-line purpose>.
// <Pitfall #4 dayKey note> / <Pitfall #1 txn note if applicable>.
import { db } from '@/db/db';
```

Canonical hook file pattern (from src/features/food/hooks.ts:1-44):
```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { getTodayEntries } from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function useTodayEntries() {
  return useLiveQuery(() => getTodayEntries(todayKey()), []);
}
export function useLastServingsForFood(foodId: string) {
  return useLiveQuery(() => getLastServingsForFood(foodId), [foodId]);  // parameterized deps
}
```

Dexie range query shape (verified in RESEARCH §3):
```typescript
db.ptSessions.where('dayKey').between(startKey, endKey, true, true).toArray()
// ^ lowInclusive=true, highInclusive=true. MUST pass both booleans — default (false) misses last day.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write src/features/calendar/monthMath.ts — pure date utility</name>
  <files>src/features/calendar/monthMath.ts</files>
  <read_first>
    - src/lib/dayKey.ts (full file — this module MUST import and route EVERY Date→string through dateToKey)
    - .planning/research/PITFALLS.md §Pitfall 4 (UTC drift failure mode)
    - CLAUDE.md rule #3 (NEVER toISOString().split, NEVER new Date(key) — both project-breaking)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §2 "Native Date math vs date-fns/dayjs" (lines 116-158 — the complete authoritative sketch of monthMath)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"src/features/calendar/monthMath.ts" (lines 81-116)
  </read_first>
  <action>
Create new file `src/features/calendar/monthMath.ts`. The file has ZERO Dexie dependencies, ZERO React dependencies — pure date math. Mirror the header-comment + local-getter discipline from `src/lib/dayKey.ts:1-27` (pitfall-citing comment, local getters only).

Required file content (authoritative — no invention; copy structure verbatim from RESEARCH §2):

```typescript
// src/features/calendar/monthMath.ts
// Month-grid date math for the 42-cell calendar window (6 weeks × 7 days).
// EVERY Date→string conversion MUST route through src/lib/dayKey.ts — never call
// toISOString() or construct dayKey by hand (Pitfall #4 / CLAUDE.md rule #3).
// This module is pure (no Dexie, no React, no side effects).

import { dateToKey, keyToDate } from '@/lib/dayKey';

export function firstOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1);
}

export function lastOfMonth(year: number, month0: number): Date {
  // Day 0 of next month === last day of this month. No DST wrap risk (day arithmetic, not hour).
  return new Date(year, month0 + 1, 0);
}

export function sundayOnOrBefore(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay()); // getDay(): Sun=0..Sat=6
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export interface MonthCell {
  dayKey: string;
  inMonth: boolean;
}

export interface MonthRange {
  startKey: string;
  endKey: string;
  cells: MonthCell[];
}

/**
 * Compute the 42-cell month-grid window anchored at the Sunday on-or-before the
 * 1st of (year, month0). Returns startKey/endKey (inclusive bounds) for the
 * Dexie range query AND a 42-element cells array, each cell flagged inMonth.
 *
 * month0 is a JS month index: Jan=0..Dec=11 (matches Date.getMonth()).
 */
export function monthRangeKeys(year: number, month0: number): MonthRange {
  const first = firstOfMonth(year, month0);
  const gridStart = sundayOnOrBefore(first);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({ dayKey: dateToKey(d), inMonth: d.getMonth() === month0 });
  }
  return { startKey: cells[0].dayKey, endKey: cells[41].dayKey, cells };
}
```

Note the allowed imports are ONLY `dateToKey` and `keyToDate` from `@/lib/dayKey`. `keyToDate` is re-exported for downstream consumers (DayCell, etc.) — exporting or re-exporting it here is NOT required because they can import it directly from `@/lib/dayKey`. So the import here is `dateToKey` only. If TS unused-import triggers, drop `keyToDate`.

The JSDoc comment on `monthRangeKeys` is required (explains month0 convention so downstream callers don't fumble the 0-vs-1 off-by-one).
  </action>
  <verify>
    <automated>test -f src/features/calendar/monthMath.ts &amp;&amp; npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/monthMath.ts` exits 0
    - `grep -c "from '@/lib/dayKey'" src/features/calendar/monthMath.ts` is 1 (exactly one dayKey import)
    - `grep -E "export function (firstOfMonth|lastOfMonth|sundayOnOrBefore|addDays|monthRangeKeys)" src/features/calendar/monthMath.ts` prints 5 matches
    - `grep -c "export interface MonthCell" src/features/calendar/monthMath.ts` is 1
    - `grep -c "export interface MonthRange" src/features/calendar/monthMath.ts` is 1
    - `! grep -E "toISOString|\.split\('T'\)" src/features/calendar/monthMath.ts` (zero forbidden UTC formatters)
    - `! grep -E "new Date\([\"'][0-9]{4}-" src/features/calendar/monthMath.ts` (zero `new Date("2026-...")` ISO-string constructions)
    - `! grep -E "import.*\{[^}]*db[^}]*\}.*from.*'@/db" src/features/calendar/monthMath.ts` (zero Dexie imports — pure module)
    - `! grep -E "from 'react'" src/features/calendar/monthMath.ts` (zero React imports)
    - `grep -c "for (let i = 0; i &lt; 42; i++)" src/features/calendar/monthMath.ts` is 1 (the 42-cell loop)
    - `npx tsc --noEmit` exits 0 (no type errors anywhere in the project)
  </acceptance_criteria>
  <done>monthMath.ts exports the 5 functions + 2 interfaces; uses dateToKey for every Date→string; compiles cleanly.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write src/services/streak.svc.ts — read-only 4-table range service</name>
  <files>src/services/streak.svc.ts</files>
  <read_first>
    - src/services/meals.svc.ts (full file — canonical service-file hygiene: header comment style, import order, interface export, where().equals() pattern)
    - src/db/db.ts (transaction rule comment lines 30-43; dayKey index declarations lines 57-62)
    - src/db/schema.ts (StepEntry.count type, LiftCheckin.lifted type — D-03/D-04 filter preconditions)
    - src/lib/dayKey.ts (dateToKey, keyToDate, todayKey — for getCurrentStreakCount scan logic)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §3 "Streak Service + Query Pattern" (lines 166-289 — the authoritative code sketch; includes the WRONG pattern to reject)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §7 "Streak Count Algorithm" (lines 511-601 — authoritative streak count sketch with edge-case table)
    - .planning/phases/03-streak-loop/03-CONTEXT.md §D-01..D-06 (segment fill + completion rules — verbatim in aggregation)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"src/services/streak.svc.ts" (lines 36-79)
    - .planning/research/ARCHITECTURE.md §"Pattern for the streak calendar" + §"Anti-Pattern 3"
  </read_first>
  <action>
Create new file `src/services/streak.svc.ts`. This is a READ-ONLY service — NO writes, NO `db.transaction` wrapper (Pitfall #1 rule not applicable since there are no awaits-then-writes; documented in header comment). Mirror `src/services/meals.svc.ts:1-15` for file hygiene (header comment, import order, interface export).

Required file content (authoritative — values below are D-01..D-06 verbatim; do not alter filter conditions):

```typescript
// src/services/streak.svc.ts
// Phase 3 streak-loop data source. Read-only: 4-table Promise.all range queries
// feed the 4-segment month grid (STREAK-01), the consecutive-complete-days
// streak count (STREAK-05), and prev-month lower-bound nav clamp (STREAK-07).
// All dayKey values are passed in by callers (Pitfall #4). No writes, no
// transaction wrapper (Pitfall #1 not applicable — all awaits are Dexie reads).
//
// CRITICAL: This service is the ONE place per month-range where the calendar
// touches IDB. Components MUST NOT issue their own per-cell useLiveQuery /
// useEffect reads — see .planning/research/ARCHITECTURE.md §Anti-Pattern 3.

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
 *   - If most-recent 4/4 is &gt; 1 day before today → return 0.
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
```

Do NOT:
- Wrap any function in `db.transaction(...)` — reads auto-manage; adding a txn buys nothing and is a source of accidental Pitfall #1 bugs later.
- Split `getStreakDataForRange` into per-table exports (Pitfall 5 in RESEARCH — cascade re-renders).
- Add a `useLiveQuery` call in this file (that belongs in hooks.ts — keeping the service pure-async makes it unit-testable).
- Call `new Date(someDayKey)` — use `keyToDate` which parses components locally.
- Use `.between(a, b)` without the two trailing `true, true` (Pitfall 6 in RESEARCH).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/services/streak.svc.ts` exits 0
    - `grep -c "Promise.all" src/services/streak.svc.ts` is at least 2 (getStreakDataForRange + getEarliestDayKey)
    - `grep -c ".between(startKey, endKey, true, true)" src/services/streak.svc.ts` is 4 (one per table in getStreakDataForRange)
    - `grep -E "export (async )?function (getStreakDataForRange|getCurrentStreakCount|getEarliestDayKey)" src/services/streak.svc.ts` prints 3 matches
    - `grep -c "export interface QuadrantState" src/services/streak.svc.ts` is 1
    - `grep -c "if (s.count > 0)" src/services/streak.svc.ts` is 1 (D-03 guard)
    - `grep -c "if (l.lifted === true)" src/services/streak.svc.ts` is 1 (D-04 guard)
    - `! grep -E "useLiveQuery" src/services/streak.svc.ts` (svc must NOT import useLiveQuery — that's hooks.ts's job)
    - `! grep -E "db\.transaction" src/services/streak.svc.ts` (no txn wrapper — reads are fine bare)
    - `! grep -E "toISOString|\.split\('T'\)" src/services/streak.svc.ts` (no forbidden UTC formatters)
    - `! grep -E "new Date\([\"'][0-9]" src/services/streak.svc.ts` (no `new Date("YYYY-...")` — use keyToDate)
    - `grep -c "from '@/db/db'" src/services/streak.svc.ts` is 1
    - `grep -c "from '@/lib/dayKey'" src/services/streak.svc.ts` is 1
    - `grep -E "MAX_SCAN_DAYS = 730" src/services/streak.svc.ts` matches (the planner-approved default from RESEARCH §7)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>streak.svc.ts exports QuadrantState + 3 async functions; all segment rules implemented per D-01..D-04; no transaction wrappers; no useLiveQuery; no forbidden date APIs; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write src/features/calendar/hooks.ts — the ONE calendar hook file (month-grid + streak-count + day-detail)</name>
  <files>src/features/calendar/hooks.ts</files>
  <read_first>
    - src/features/food/hooks.ts (full file — canonical hook-file pattern: useLiveQuery wrapper, empty deps, parameterized deps convention)
    - src/features/steps/hooks.ts (smaller analog for sanity)
    - src/features/lifts/hooks.ts (smaller analog for sanity)
    - src/services/meals.svc.ts (full file — exports getTodayEntries, getDailyTotals, DailyTotals type)
    - src/services/pt.svc.ts (full file — exports getTodaySessions)
    - src/services/steps.svc.ts (full file — exports getStepsForDay)
    - src/services/lifts.svc.ts (full file — exports getLiftForDay)
    - src/db/schema.ts (full file — PTSession, MealEntry, StepEntry, LiftCheckin type exports)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §3 lines 216-232 ("The hook" sketch — exact shape of useMonthStreakData)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §7 lines 599-602 (useCurrentStreakCount = own subscription, separate from month grid)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §6 lines 455-498 (Day Detail composite hook sketch — 5 parameterized useLiveQuery subscriptions)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 646-648 (UI-SPEC canonical placement: all three plus useDayDetail in src/features/calendar/hooks.ts)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"src/features/calendar/hooks.ts" (lines 119-161)
  </read_first>
  <action>
Create new file `src/features/calendar/hooks.ts`. This is the CANONICAL calendar hook file — per UI-SPEC:646-648 it houses `useMonthStreakData`, `useCurrentStreakCount`, AND `useDayDetail`. Plan 03-04 imports `useDayDetail` from here rather than authoring its own file. Do NOT import `db` here (the `useAllFoods` exception in `src/features/food/hooks.ts:38-40` is domain-justified and documented; calendar has no equivalent need).

Required file content:

```typescript
// src/features/calendar/hooks.ts
// Canonical calendar-feature hook module (UI-SPEC:646-648). Houses:
//   - useMonthStreakData   — month-grid subscription feeding MonthGrid (Plan 03-03)
//   - useCurrentStreakCount — StreakCount hero number (Plan 03-03)
//   - useEarliestDayKey    — prev-month nav lower-bound clamp (Plan 03-03)
//   - useDayDetail         — composite per-day hook feeding DayDetail (Plan 03-04)
//
// Each hook registers its underlying tables for observation via the service
// call — so a write to ANY observed table refreshes the subscribed hook. ONE
// subscription per hook consumer, never per-cell (Anti-Pattern 3). Dep arrays
// follow src/features/food/hooks.ts convention: empty [] when the query is
// fully parameter-free; [param,...] when parameters drive re-subscription.
//
// useDayDetail issues 5 parameterized subscriptions keyed on [dayKey]. This is
// NOT Anti-Pattern 3 — Anti-Pattern 3 forbids per-CELL subscriptions on a
// 42-cell grid. Day Detail is a single-screen, single-day composition; 5
// subscriptions × 1 day = constant cost per write. RESEARCH §6 explicitly
// accepts this shape.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getStreakDataForRange,
  getCurrentStreakCount,
  getEarliestDayKey,
  type QuadrantState,
} from '@/services/streak.svc';
import { monthRangeKeys, type MonthCell } from './monthMath';
import { getTodayEntries, getDailyTotals, type DailyTotals } from '@/services/meals.svc';
import { getTodaySessions } from '@/services/pt.svc';
import { getStepsForDay } from '@/services/steps.svc';
import { getLiftForDay } from '@/services/lifts.svc';
import type { PTSession, MealEntry, StepEntry, LiftCheckin } from '@/db/schema';

// ---------- Month-grid + streak-count + earliest-data (Plan 03-03 consumers) ----------

export interface MonthStreakData {
  data: Map<string, QuadrantState> | undefined;
  cells: MonthCell[];
  startKey: string;
  endKey: string;
}

/**
 * Reactive month-grid data. month0 is 0-indexed (Date.getMonth() convention:
 * Jan=0..Dec=11). `data` is undefined on first paint for one microtask, then
 * populates; UI-SPEC §Loading accepts this flash as correct behavior.
 */
export function useMonthStreakData(year: number, month0: number): MonthStreakData {
  const { startKey, endKey, cells } = monthRangeKeys(year, month0);
  const data = useLiveQuery(
    () => getStreakDataForRange(startKey, endKey),
    [startKey, endKey],
  );
  return { data, cells, startKey, endKey };
}

/** Reactive streak count. Undefined on first paint; caller coalesces to 0. */
export function useCurrentStreakCount(): number | undefined {
  return useLiveQuery(() => getCurrentStreakCount(), []);
}

/** Reactive earliest-data dayKey for prev-month nav clamp. */
export function useEarliestDayKey(): string | null | undefined {
  return useLiveQuery(() => getEarliestDayKey(), []);
}

// ---------- Day Detail composite (Plan 03-04 consumer) ----------

export interface DayDetailData {
  sessions: PTSession[] | undefined;
  meals: MealEntry[] | undefined;
  steps: StepEntry | undefined;
  lift: LiftCheckin | undefined;
  totals: DailyTotals | undefined;
}

/**
 * Composite hook for /#/day/:dayKey. Five parameterized useLiveQuery
 * subscriptions, each keyed on [dayKey] so changing days re-subscribes. Any of
 * the fields is `undefined` on first paint; DayDetail renders loading-safe JSX.
 * UI-SPEC:648 locks this hook's placement to THIS file.
 */
export function useDayDetail(dayKey: string): DayDetailData {
  const sessions = useLiveQuery(() => getTodaySessions(dayKey), [dayKey]);
  const meals    = useLiveQuery(() => getTodayEntries(dayKey), [dayKey]);
  const steps    = useLiveQuery(() => getStepsForDay(dayKey), [dayKey]);
  const lift     = useLiveQuery(() => getLiftForDay(dayKey), [dayKey]);
  const totals   = useLiveQuery(() => getDailyTotals(dayKey), [dayKey]);
  return { sessions, meals, steps, lift, totals };
}
```

The exported `MonthStreakData` + `DayDetailData` interfaces are load-bearing: Plan 03-03's MonthGrid consumes `MonthStreakData`; Plan 03-04's DayDetail consumes `DayDetailData`. Keeping the contract explicit prevents drift.

Do NOT:
- Import `db` here (not needed; all data flows through *.svc files).
- Split `useDayDetail` into a separate file (UI-SPEC:648 locks placement to this canonical location; the previous revision's `dayDetailHooks.ts` was a workaround that violates the spec).
- Memoize the `monthRangeKeys()` call with `useMemo` — it's pure and cheap; useLiveQuery's deps array `[startKey, endKey]` is what prevents re-subscription churn.
- Add a `todayKey()` call inside `useDayDetail` — it must receive dayKey as a parameter from the caller (DayDetailScreen).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/hooks.ts` exits 0
    - `grep -c "from 'dexie-react-hooks'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from '@/services/streak.svc'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from '@/services/meals.svc'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from '@/services/pt.svc'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from '@/services/steps.svc'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from '@/services/lifts.svc'" src/features/calendar/hooks.ts` is 1
    - `grep -c "from './monthMath'" src/features/calendar/hooks.ts` is 1
    - `grep -E "export function (useMonthStreakData|useCurrentStreakCount|useEarliestDayKey|useDayDetail)" src/features/calendar/hooks.ts` prints 4 matches
    - `grep -c "export interface MonthStreakData" src/features/calendar/hooks.ts` is 1
    - `grep -c "export interface DayDetailData" src/features/calendar/hooks.ts` is 1
    - `grep -c "\[startKey, endKey\]" src/features/calendar/hooks.ts` is 1 (useMonthStreakData deps)
    - `grep -c "\[dayKey\]" src/features/calendar/hooks.ts` is 5 (useDayDetail's 5 parameterized subscriptions)
    - `! grep -E "from '@/db/db'" src/features/calendar/hooks.ts` (hooks must NOT import db directly — svc only)
    - `! grep -E "todayKey\(\)" src/features/calendar/hooks.ts` (useDayDetail uses passed-in dayKey, not today)
    - `grep -c "useLiveQuery" src/features/calendar/hooks.ts` is 8 (3 top-level + 5 inside useDayDetail; verify exact count)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>hooks.ts exports 4 hooks + MonthStreakData + DayDetailData interfaces; each top-level hook wraps exactly one streak.svc call; useDayDetail wraps 5 service calls with [dayKey] deps; no db imports; compiles.</done>
</task>

</tasks>

<threat_model>
  <scope>Read-only service layer. Four Dexie range queries + native date math + five single-day read subscriptions for Day Detail. No user input reaches this plan's code (useDayDetail receives an already-regex-validated dayKey from Plan 03-04's DayDetailScreen route shell).</scope>
  <inputs>
    - name: "year, month0 (useMonthStreakData args)"
      validated_by: "caller — provided by StreakCalendar local useState, not user input"
      severity_if_unvalidated: "low"
    - name: "dayKey (useDayDetail arg)"
      validated_by: "caller (Plan 03-04 DayDetailScreen) — regex-validated `/^\\d{4}-\\d{2}-\\d{2}$/` BEFORE the hook is called"
      severity_if_unvalidated: "low — Dexie string-equality lookup has no injection vector even on garbage input, but regex guard is in place at the route boundary"
    - name: "startKey, endKey (internal, derived from monthRangeKeys)"
      validated_by: "src/lib/dayKey.ts:dateToKey — producer guarantees YYYY-MM-DD format"
      severity_if_unvalidated: "low"
  </inputs>
  <data_flow>UI (Plan 03-03 / 03-04 hooks) → useLiveQuery → streak.svc / meals.svc / pt.svc / steps.svc / lifts.svc → Dexie. Read-only, no writes.</data_flow>
  <threats_considered>
    - S/T/R/I/D/E (STRIDE): Tampering (malformed dayKey) — regex-validated upstream
    - D (Denial-of-service): 4 range queries × large history could block main thread
    - I (Information disclosure): None — fully local IDB, no network
  </threats_considered>
  <mitigations>
    - threat: "Malformed dayKey from future callers"
      mitigation: "All dayKey construction routed through src/lib/dayKey.ts:dateToKey (padStart'd YYYY-MM-DD); MAX_SCAN_DAYS caps backward scan at 730 days; indexed .between() is O(log n + k) — tested up to 2 years of daily logs remains &lt; 10ms per RESEARCH §8"
    - threat: "Per-cell IDB amplification (Anti-Pattern 3)"
      mitigation: "Plan 03-03 uses exactly one useMonthStreakData subscription for the grid. useDayDetail issues 5 per-dayKey subscriptions — but only one DayDetail screen is mounted at a time, so total cost is 5 reads per single-day view, not per-cell. Architectural constraint encoded in acceptance criteria."
  </mitigations>
  <residual_risk>none — pure-local read path over indexed columns; user-influenced input (Plan 03-04's :dayKey route param) is regex-validated upstream before reaching useDayDetail</residual_risk>
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0 (whole project still type-checks)
- `npx eslint src/services/streak.svc.ts src/features/calendar/monthMath.ts src/features/calendar/hooks.ts` exits 0 (or matches Phase 1/2 lint baseline — no NEW warnings)
- Manual smoke (optional, in browser dev console after `npm run dev`):
  ```js
  const { getStreakDataForRange, getCurrentStreakCount, getEarliestDayKey } = await import('/src/services/streak.svc.ts');
  await getStreakDataForRange('2026-04-01', '2026-04-30'); // returns Map
  await getCurrentStreakCount();                            // returns number
  await getEarliestDayKey();                                // returns string | null
  ```
- Verify anti-patterns absent across ALL 3 files:
  - `! grep -rE "toISOString|\.split\('T'\)|new Date\([\"'][0-9]{4}-" src/features/calendar/ src/services/streak.svc.ts`
- Verify hook subscription count (Anti-Pattern 3 guard):
  - `grep -c useLiveQuery src/features/calendar/hooks.ts` is exactly 8 (3 top-level + 5 inside useDayDetail)
  - `! grep -r useLiveQuery src/services/streak.svc.ts` (service layer stays pure-async)
</verification>

<success_criteria>
- 3 new files exist: `src/services/streak.svc.ts`, `src/features/calendar/monthMath.ts`, `src/features/calendar/hooks.ts`
- Zero files modified outside the 3 new files
- Zero npm installs (verify: `git diff package.json package-lock.json` → empty)
- Zero schema changes (verify: `git diff src/db/schema.ts src/db/db.ts` → empty)
- `getStreakDataForRange` issues exactly 4 Dexie range queries in a single `Promise.all`
- `getCurrentStreakCount` uses its own `getStreakDataForRange` call (not the hook's Map) — independent subscription per RESEARCH §7
- `useDayDetail` issues 5 parameterized `useLiveQuery` calls keyed on `[dayKey]`
- All dayKey construction flows through `src/lib/dayKey.ts` exports (grep verified)
- Whole project still type-checks (`npx tsc --noEmit` exit 0)
- Phase 3 data foundation is ready for Plan 03-03 (month grid) and Plan 03-04 (day detail) consumption — BOTH import from the same canonical `hooks.ts`
</success_criteria>

<output>
After completion, create `.planning/phases/03-streak-loop/03-01-SUMMARY.md` documenting:
- Exact exports of each of the 3 files
- Decisions made during implementation (e.g., if `keyToDate` import was dropped from monthMath.ts due to unused-import)
- Any deviations from the sketches in RESEARCH/PATTERNS (expected: none — sketches are authoritative)
- Confirmation that `useLiveQuery` count is exactly 8 in hooks.ts (3 top-level + 5 inside useDayDetail) and service layer has zero `useLiveQuery` calls
- Confirmation that `useDayDetail` lives in `hooks.ts` per UI-SPEC:648 (no separate dayDetailHooks.ts file created)
</output>
</content>
</invoke>