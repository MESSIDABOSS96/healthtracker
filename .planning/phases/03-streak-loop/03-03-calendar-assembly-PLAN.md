---
phase: 03-streak-loop
plan: 03
type: execute
wave: 2
depends_on:
  - "03-01"
  - "03-02"
files_modified:
  - src/features/calendar/MonthHeader.tsx
  - src/features/calendar/WeekdayHeader.tsx
  - src/features/calendar/MonthGrid.tsx
  - src/features/calendar/StreakCount.tsx
  - src/features/calendar/StreakCalendar.tsx
  - src/routes/CalendarScreen.tsx
autonomous: false
requirements:
  - STREAK-01
  - STREAK-04
  - STREAK-05
  - STREAK-07
must_haves:
  truths:
    - "CalendarScreen renders the current month's 4-segment grid when first opened (STREAK-01/02/03 visible via 03-02's DayCell + 03-01's streak.svc)"
    - "StreakCount displays current consecutive-complete-days number with positive-framed copy (STREAK-05); renders `0 days` + subtitle for day-1/zero-state and `N days` (+ optional 'finish today's 4th to extend' subtitle) otherwise"
    - "MonthHeader renders 'April 2026' format + prev/next chevrons; prev disabled when view equals getEarliestDayKey()'s month; next disabled when view equals today's month (STREAK-07 clamps)"
    - "MonthGrid maps the 42 cells from useMonthStreakData → DayCell props; undefined data renders 42 --surface cells (no skeleton, no spinner); ONE useLiveQuery subscription via useMonthStreakData (Anti-Pattern 3 guard)"
    - "WeekdayHeader renders aria-hidden Sun..Sat labels in the same 7-col grid rhythm"
    - "StreakCalendar is the composer: owns {year, month0} state, wires prev/next nav, stacks StreakCount → MonthHeader → WeekdayHeader → MonthGrid"
    - "CalendarScreen.tsx stub body replaced with <StreakCalendar /> wrapped in px-4 py-6 space-y-4 (matches TodayScreen rhythm)"
  artifacts:
    - path: "src/features/calendar/MonthHeader.tsx"
      provides: "prev/next chevrons + month label with clamp logic"
      exports: ["MonthHeader"]
    - path: "src/features/calendar/WeekdayHeader.tsx"
      provides: "7-column aria-hidden weekday label row"
      exports: ["WeekdayHeader"]
    - path: "src/features/calendar/MonthGrid.tsx"
      provides: "42-cell grid + DayCell mapping + undefined-data fallback"
      exports: ["MonthGrid"]
    - path: "src/features/calendar/StreakCount.tsx"
      provides: "hero number + day/days suffix + conditional subtitle"
      exports: ["StreakCount"]
    - path: "src/features/calendar/StreakCalendar.tsx"
      provides: "top-level composer; owns view-month state; orchestrates children"
      exports: ["StreakCalendar"]
    - path: "src/routes/CalendarScreen.tsx"
      provides: "Route-mounted screen body; composes <StreakCalendar /> inside the Phase 1/2 screen rhythm"
      exports: ["CalendarScreen"]
  key_links:
    - from: "src/routes/CalendarScreen.tsx"
      to: "src/features/calendar/StreakCalendar.tsx"
      via: "import + JSX render inside px-4 py-6 wrapper"
      pattern: "<StreakCalendar"
    - from: "src/features/calendar/MonthGrid.tsx"
      to: "src/features/calendar/hooks.ts:useMonthStreakData + DayCell"
      via: "single useMonthStreakData call, 42 <DayCell> renders"
      pattern: "useMonthStreakData\\(year, month0\\)"
    - from: "src/features/calendar/StreakCount.tsx"
      to: "src/features/calendar/hooks.ts:useCurrentStreakCount"
      via: "reactive subscription"
      pattern: "useCurrentStreakCount"
    - from: "src/features/calendar/MonthHeader.tsx prev/next onClick"
      to: "StreakCalendar setState({year, month0})"
      via: "onPrev / onNext props"
      pattern: "onPrev|onNext"
---

<objective>
Assemble the CalendarScreen: StreakCount (hero) + MonthHeader (label + prev/next chevrons) + WeekdayHeader (Sun..Sat row) + MonthGrid (42 DayCells). Wire `useMonthStreakData`, `useCurrentStreakCount`, `useEarliestDayKey` from Plan 03-01; consume `<DayCell>` from Plan 03-02. Replace the Phase 1 stub body in `src/routes/CalendarScreen.tsx`. Month-nav clamps: upper bound = today's month; lower bound = month of `getEarliestDayKey()`.

Purpose: Deliver visible Phase 3 success criteria 1 (month grid), 3 (4/4 distinct via DayCell pass-through), 5 (streak count + prev/next nav). Success criteria 2 (zero-log = positive, never red) is enforced architecturally by DayCell's Pitfall #6 contract.

Output: 5 new files + 1 modified route screen. No schema changes, no npm adds, no writes (all reads via hooks).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/03-streak-loop/03-CONTEXT.md
@.planning/phases/03-streak-loop/03-RESEARCH.md
@.planning/phases/03-streak-loop/03-PATTERNS.md
@.planning/phases/03-streak-loop/03-UI-SPEC.md
@.planning/phases/03-streak-loop/03-01-SUMMARY.md
@.planning/phases/03-streak-loop/03-02-SUMMARY.md
@CLAUDE.md
@src/services/streak.svc.ts
@src/features/calendar/hooks.ts
@src/features/calendar/monthMath.ts
@src/features/calendar/DayCell.tsx
@src/lib/dayKey.ts
@src/components/ui/button.tsx
@src/components/ui/card.tsx
@src/routes/TodayScreen.tsx
@src/routes/CalendarScreen.tsx
@src/features/food/TodayMealList.tsx
@src/features/steps/StepsSection.tsx

<interfaces>
<!-- Contracts from upstream plans + existing codebase — use directly. -->

From Plan 03-01 (src/features/calendar/hooks.ts):
```typescript
export interface MonthStreakData {
  data: Map<string, QuadrantState> | undefined;
  cells: MonthCell[];     // 42 cells, each { dayKey, inMonth }
  startKey: string;
  endKey: string;
}
export function useMonthStreakData(year: number, month0: number): MonthStreakData;
export function useCurrentStreakCount(): number | undefined;
export function useEarliestDayKey(): string | null | undefined;
```

From Plan 03-01 (src/services/streak.svc.ts):
```typescript
export interface QuadrantState { pt: boolean; food: boolean; steps: boolean; lift: boolean; }
```

From Plan 03-02 (src/features/calendar/DayCell.tsx):
```typescript
export interface DayCellProps {
  dayKey: string;
  filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean };
  today: boolean;
  inMonth: boolean;
}
export function DayCell(props: DayCellProps): JSX.Element;
```

From src/lib/dayKey.ts:
```typescript
export function todayKey(): string;
export function keyToDate(key: string): Date;
```

From lucide-react (already in package.json):
- `ChevronLeft`, `ChevronRight` (20px icons)

Existing stub being replaced — src/routes/CalendarScreen.tsx (current body):
```tsx
export function CalendarScreen() {
  return (
    <div className="flex items-center justify-center min-h-full px-4 py-6">
      <p className="text-sm text-muted">{'Coming in Phase 3'}</p>
    </div>
  );
}
```

Screen-rhythm analog — src/routes/TodayScreen.tsx:14-23 (composer pattern):
```tsx
export function TodayScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <PTSection /> <FoodSection /> <StepsSection /> <LiftSection />
    </div>
  );
}
```

Hook-to-grid analog — src/features/food/TodayMealList.tsx:24-36 (data-to-cells mapping):
```tsx
const entries = useTodayEntries();
const allFoods = useAllFoods();
if (entries === undefined) return null;     // ← DO NOT COPY — MonthGrid renders 42 surface cells on undefined (UI-SPEC:690)
```

Fallback/coalesce analog — src/features/steps/StepsSection.tsx:20-25:
```tsx
const steps = useStepsForDay();
const count = steps?.count ?? 0;            // ← coalesce-to-default pattern; StreakCount uses this shape
```

Disabled button tokens (from src/components/ui/button.tsx:13):
```
'disabled:pointer-events-none disabled:opacity-50'
```

Focus-visible stack (verbatim):
```
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
```

UI-SPEC copy for StreakCount (lines 186-198):
| State                                  | Number | Suffix   | Subtitle                                      |
| 0 consecutive complete days            | 0      | days     | log all 4 areas today to start a streak       |
| 1 consecutive complete day             | 1      | day      | (hidden if today 4/4; else "finish today's 4th to extend") |
| N ≥ 2, today is 4/4                    | N      | days     | (hidden)                                       |
| N ≥ 2, today is NOT 4/4 yet            | N      | days     | finish today's 4th to extend                   |

CRITICAL: StreakCount logic needs to know whether today is 4/4 to decide whether to show the subtitle. Two strategies exist:
  (a) Call `useMonthStreakData(viewYear, viewMonth0)` and look up todayKey() → complex cross-dependency with view state
  (b) Call a dedicated `useLiveQuery(() => getStreakDataForRange(todayKey(), todayKey()))` OR derive from `useCurrentStreakCount` + a convention
  (c) SIMPLEST: subscribe separately to just today's row via the streak.svc. Since Plan 03-01 already exposes `getStreakDataForRange`, add a small hook in THIS plan's StreakCount.tsx (locally) that wraps `getStreakDataForRange(todayKey(), todayKey())` — ONE additional useLiveQuery, confined to StreakCount, no Anti-Pattern 3 risk (it's a single-day query, not per-cell).
  We pick (c). StreakCount owns its own subscription; no prop-drilling from StreakCalendar.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create MonthHeader.tsx + WeekdayHeader.tsx + MonthGrid.tsx + StreakCount.tsx</name>
  <files>src/features/calendar/MonthHeader.tsx, src/features/calendar/WeekdayHeader.tsx, src/features/calendar/MonthGrid.tsx, src/features/calendar/StreakCount.tsx</files>
  <read_first>
    - src/features/calendar/hooks.ts (from Plan 03-01 — the 3 hooks + MonthStreakData interface)
    - src/features/calendar/DayCell.tsx (from Plan 03-02 — DayCellProps shape)
    - src/features/calendar/monthMath.ts (from Plan 03-01 — MonthCell shape)
    - src/services/streak.svc.ts (from Plan 03-01 — getStreakDataForRange, needed by StreakCount for "is today 4/4?")
    - src/lib/dayKey.ts (todayKey, keyToDate)
    - src/components/ui/button.tsx (focus-visible + disabled token stacks)
    - src/features/steps/StepsSection.tsx lines 20-36 (coalesce-to-default pattern for StreakCount)
    - src/features/food/TodayMealList.tsx (hook-to-grid pattern; NOTE: DO NOT copy the `return null` for undefined — MonthGrid renders 42 surface cells instead per UI-SPEC:690)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 315-395 (CalendarScreen/MonthHeader/WeekdayHeader/MonthGrid layout contracts, sizes, ARIA)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 186-217 (StreakCount + MonthHeader copy rules)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 344-357 (StreakCount component contract)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §5 lines 388-420 (MonthGrid layout facts, padded-cell policy, first-render behavior)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §7 lines 511-601 (streak count semantics — drives StreakCount copy logic)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §MonthGrid + §StreakCount + §MonthHeader (lines 203-321)
  </read_first>
  <action>
Create 4 sibling files in `src/features/calendar/`. Each is small (~40–80 LOC). Write them in dependency order: MonthHeader (standalone), WeekdayHeader (standalone), MonthGrid (uses DayCell + MonthStreakData), StreakCount (uses useCurrentStreakCount + streak.svc for today-row).

***

**File 1 — `src/features/calendar/WeekdayHeader.tsx`** (smallest; no hooks):

```tsx
// src/features/calendar/WeekdayHeader.tsx
// Static Sun..Sat row above the month grid. aria-hidden because each DayCell's
// aria-label already spells out the weekday name (UI-SPEC:379).

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function WeekdayHeader() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-7 gap-1 h-8 mb-2"
    >
      {DAYS.map((d) => (
        <div
          key={d}
          className="flex items-center justify-center text-xs text-muted uppercase tracking-wide"
        >
          {d}
        </div>
      ))}
    </div>
  );
}
```

***

**File 2 — `src/features/calendar/MonthHeader.tsx`** (prev/next chevrons + month label):

```tsx
// src/features/calendar/MonthHeader.tsx
// Prev-chevron · "Month Year" · Next-chevron row. Clamp booleans arrive as
// props — caller (StreakCalendar) computes them from useEarliestDayKey + todayKey.

import { ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthHeaderProps {
  year: number;
  month0: number; // 0..11
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
}

export function MonthHeader({ year, month0, onPrev, onNext, prevDisabled, nextDisabled }: MonthHeaderProps) {
  const label = `${MONTH_NAMES[month0]} ${year}`;

  return (
    <div className="flex items-center justify-between h-12 border-b border-border">
      <button
        type="button"
        aria-label="Previous month"
        aria-disabled={prevDisabled}
        disabled={prevDisabled}
        onClick={onPrev}
        className={
          'h-11 w-11 flex items-center justify-center rounded-md ' +
          'text-muted ' +
          'disabled:text-border disabled:pointer-events-none ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
          'active:bg-border/40'
        }
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>

      <h2 className="text-base font-semibold text-text">{label}</h2>

      <button
        type="button"
        aria-label="Next month"
        aria-disabled={nextDisabled}
        disabled={nextDisabled}
        onClick={onNext}
        className={
          'h-11 w-11 flex items-center justify-center rounded-md ' +
          'text-muted ' +
          'disabled:text-border disabled:pointer-events-none ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
          'active:bg-border/40'
        }
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
```

***

**File 3 — `src/features/calendar/MonthGrid.tsx`** (42-cell grid, data mapping, no return-null):

```tsx
// src/features/calendar/MonthGrid.tsx
// 42-cell activity grid for (year, month0). ONE useLiveQuery subscription via
// useMonthStreakData drives all 42 DayCells — Anti-Pattern 3 (per-cell IDB) is
// an auto-fail. On undefined data (first microtask of render), all 42 cells
// render as 0/4 --surface (UI-SPEC:690 — no skeleton, no null-return).

import { useMonthStreakData } from './hooks';
import { DayCell } from './DayCell';
import { todayKey } from '@/lib/dayKey';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const EMPTY_FILL = { pt: false, food: false, steps: false, lift: false } as const;

export interface MonthGridProps {
  year: number;
  month0: number;
}

export function MonthGrid({ year, month0 }: MonthGridProps) {
  const { data, cells } = useMonthStreakData(year, month0);
  const today = todayKey();
  const gridLabel = `${MONTH_NAMES[month0]} ${year} activity calendar`;

  return (
    <div
      role="grid"
      aria-label={gridLabel}
      className="grid grid-cols-7 gap-1"
    >
      {cells.map((cell) => (
        <DayCell
          key={cell.dayKey}
          dayKey={cell.dayKey}
          inMonth={cell.inMonth}
          today={cell.dayKey === today}
          filled={data?.get(cell.dayKey) ?? EMPTY_FILL}
        />
      ))}
    </div>
  );
}
```

Note: `aspect-square` is applied to each DayCell root (Plan 03-02) — the MonthGrid container uses `grid-cols-7 gap-1` without explicit row rules; the cells' square aspect + grid auto-flow produces the 6-row layout automatically once 42 cells fill 7 columns.

***

**File 4 — `src/features/calendar/StreakCount.tsx`** (hero number + suffix + conditional subtitle):

```tsx
// src/features/calendar/StreakCount.tsx
// Hero streak-count block above the month grid. Positive-framed copy per
// UI-SPEC §Streak count component (lines 186-198): today never shown as
// "broken" — if today isn't 4/4 yet, subtitle is "finish today's 4th to
// extend" (forward-looking, anti-Pitfall #6). Instant text swap on change
// (no count-up animation, per anti-motion policy).

import { useLiveQuery } from 'dexie-react-hooks';
import { useCurrentStreakCount } from './hooks';
import { getStreakDataForRange } from '@/services/streak.svc';
import { todayKey } from '@/lib/dayKey';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;

  // Dedicated single-day subscription: is today 4/4? Needed to decide whether
  // the "finish today's 4th to extend" subtitle shows. One range query on a
  // single day is O(1) — not Anti-Pattern 3 (that's about per-cell amplification).
  const todaysRow = useLiveQuery(() => {
    const k = todayKey();
    return getStreakDataForRange(k, k);
  }, []);
  const today = todayKey();
  const todayState = todaysRow?.get(today);
  const todayIsComplete =
    !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;

  const suffix = count === 1 ? 'day' : 'days';

  let subtitle: string | null = null;
  if (count === 0) {
    subtitle = 'log all 4 areas today to start a streak';
  } else if (!todayIsComplete) {
    subtitle = "finish today's 4th to extend";
  }
  // else: today IS complete and the streak includes today — no subtitle needed.

  const ariaLabel = `Streak: ${count} ${suffix}`;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className="pt-6 pb-4 flex flex-col items-center"
    >
      <span className="text-xl font-semibold text-text tabular-nums">{count}</span>
      <span className="text-sm text-muted">{suffix}</span>
      {subtitle && (
        <span className="text-xs text-muted mt-1">{subtitle}</span>
      )}
    </div>
  );
}
```

**Important note on StreakCount's second subscription**: This adds a second `useLiveQuery` in the calendar feature (first is `useMonthStreakData` in MonthGrid). They both re-fire on writes to the 4 tables, but the amplification is constant (2 queries per write, not 42). This matches RESEARCH §7 line 599 which explicitly allows two subscriptions on CalendarScreen. Anti-Pattern 3 forbids per-cell queries, not multiple feature-level hooks.

***

Do NOT:
- Copy TodayMealList.tsx's `return null` for undefined — MonthGrid renders 42 --surface cells (UI-SPEC:690).
- Use `Intl.DateTimeFormat` for month names — hardcode the array (UI-SPEC:162 stance on locale simplicity).
- Add `React.memo` on any of these (RESEARCH §8).
- Add any motion/transition classes (`transition-colors`, `animate-*`) — anti-motion policy.
- Introduce a skeleton/spinner (UI-SPEC:690-691 explicitly forbids).
- Compute `getEarliestDayKey` in MonthHeader — it's StreakCalendar's job; MonthHeader just receives `prevDisabled` / `nextDisabled` booleans.
- Import `db` directly in any of these 4 files (go through hooks.ts or streak.svc only).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/WeekdayHeader.tsx src/features/calendar/MonthHeader.tsx src/features/calendar/MonthGrid.tsx src/features/calendar/StreakCount.tsx` exits 0
    - `grep -c "export function WeekdayHeader" src/features/calendar/WeekdayHeader.tsx` is 1
    - `grep -c "aria-hidden=\"true\"" src/features/calendar/WeekdayHeader.tsx` is 1
    - `grep -E "'Sun'|\"Sun\"" src/features/calendar/WeekdayHeader.tsx` matches (hardcoded Sunday-first convention)
    - `grep -c "export function MonthHeader" src/features/calendar/MonthHeader.tsx` is 1
    - `grep -c "export interface MonthHeaderProps" src/features/calendar/MonthHeader.tsx` is 1
    - `grep -c "ChevronLeft\|ChevronRight" src/features/calendar/MonthHeader.tsx` is at least 2
    - `grep -c "aria-label=\"Previous month\"" src/features/calendar/MonthHeader.tsx` is 1
    - `grep -c "aria-label=\"Next month\"" src/features/calendar/MonthHeader.tsx` is 1
    - `grep -c "export function MonthGrid" src/features/calendar/MonthGrid.tsx` is 1
    - `grep -c "useMonthStreakData" src/features/calendar/MonthGrid.tsx` is 1
    - `grep -c "role=\"grid\"" src/features/calendar/MonthGrid.tsx` is 1
    - `grep -c "grid-cols-7 gap-1" src/features/calendar/MonthGrid.tsx` is 1
    - `grep -c "data?.get(cell.dayKey) ?? EMPTY_FILL" src/features/calendar/MonthGrid.tsx` is 1 (correct undefined-data fallback)
    - `! grep -E "return null" src/features/calendar/MonthGrid.tsx` (UI-SPEC:690 — no null-return on undefined)
    - `grep -c "export function StreakCount" src/features/calendar/StreakCount.tsx` is 1
    - `grep -c "useCurrentStreakCount" src/features/calendar/StreakCount.tsx` is 1
    - `grep -c "useLiveQuery" src/features/calendar/StreakCount.tsx` is 1 (the single-day today-row subscription)
    - `grep -c "role=\"status\"" src/features/calendar/StreakCount.tsx` is 1
    - `grep -c "aria-live=\"polite\"" src/features/calendar/StreakCount.tsx` is 1
    - `grep -c "log all 4 areas today to start a streak" src/features/calendar/StreakCount.tsx` is 1 (locked copy UI-SPEC:188)
    - `grep -cE "finish today'?s 4th to extend" src/features/calendar/StreakCount.tsx` is 1 (locked copy UI-SPEC:191)
    - `! grep -rE "from '@/db/db'" src/features/calendar/MonthHeader.tsx src/features/calendar/WeekdayHeader.tsx src/features/calendar/MonthGrid.tsx src/features/calendar/StreakCount.tsx` (no direct db imports)
    - `! grep -rE "React\\.memo" src/features/calendar/MonthHeader.tsx src/features/calendar/WeekdayHeader.tsx src/features/calendar/MonthGrid.tsx src/features/calendar/StreakCount.tsx` (no memo per RESEARCH §8)
    - `! grep -rE "transition-|animate-(pulse|bounce|ping|spin)" src/features/calendar/MonthHeader.tsx src/features/calendar/WeekdayHeader.tsx src/features/calendar/MonthGrid.tsx src/features/calendar/StreakCount.tsx` (anti-motion)
    - `! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" src/features/calendar/MonthHeader.tsx src/features/calendar/WeekdayHeader.tsx src/features/calendar/MonthGrid.tsx src/features/calendar/StreakCount.tsx` (Pitfall #4)
    - `! grep -rE "Streak lost|Streak broken|missed|🔥|🎉" src/features/calendar/StreakCount.tsx` (UI-SPEC:200-206 banned copy)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>4 files created; all ARIA contracts met; no forbidden patterns; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create StreakCalendar.tsx composer + replace CalendarScreen.tsx stub</name>
  <files>src/features/calendar/StreakCalendar.tsx, src/routes/CalendarScreen.tsx</files>
  <read_first>
    - src/features/calendar/hooks.ts (useEarliestDayKey for lower-bound clamp logic)
    - src/features/calendar/MonthHeader.tsx (from Task 1 — props contract)
    - src/features/calendar/WeekdayHeader.tsx (from Task 1)
    - src/features/calendar/MonthGrid.tsx (from Task 1 — props contract)
    - src/features/calendar/StreakCount.tsx (from Task 1)
    - src/lib/dayKey.ts (todayKey, keyToDate)
    - src/routes/TodayScreen.tsx (full file — composer pattern, outer wrapper classes)
    - src/routes/CalendarScreen.tsx (current stub — to be replaced)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 310-342 (CalendarScreen layout contract — StreakCount → MonthHeader → WeekdayHeader → MonthGrid order, outer wrapper)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 219-221 (clamp logic: upper=today's month; lower=month of earliest dayKey)
  </read_first>
  <action>
**File 1 — Create `src/features/calendar/StreakCalendar.tsx`** — the CalendarScreen composer. Owns `{year, month0}` view state. Derives clamp booleans from `useEarliestDayKey()` + `todayKey()`.

```tsx
// src/features/calendar/StreakCalendar.tsx
// CalendarScreen composer. Owns the currently-viewed {year, month0} local state
// and stacks: StreakCount → MonthHeader → WeekdayHeader → MonthGrid. Month-nav
// clamps (UI-SPEC:219-221):
//   upper bound = today's month (future-month navigation blocked)
//   lower bound = month of getEarliestDayKey() (if null: lower==upper)

import { useState } from 'react';
import { StreakCount } from './StreakCount';
import { MonthHeader } from './MonthHeader';
import { WeekdayHeader } from './WeekdayHeader';
import { MonthGrid } from './MonthGrid';
import { useEarliestDayKey } from './hooks';
import { todayKey, keyToDate } from '@/lib/dayKey';

interface ViewMonth {
  year: number;
  month0: number;
}

function viewFromKey(key: string): ViewMonth {
  const d = keyToDate(key);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

function samMonth(a: ViewMonth, b: ViewMonth): boolean {
  return a.year === b.year && a.month0 === b.month0;
}

function shiftMonth(v: ViewMonth, delta: number): ViewMonth {
  // Use Date math so December→January and year-boundaries work correctly.
  const d = new Date(v.year, v.month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export function StreakCalendar() {
  const todayView = viewFromKey(todayKey());
  const [view, setView] = useState<ViewMonth>(todayView);

  const earliest = useEarliestDayKey(); // string | null | undefined
  const earliestView: ViewMonth = earliest ? viewFromKey(earliest) : todayView;

  const prevDisabled = samMonth(view, earliestView);
  const nextDisabled = samMonth(view, todayView);

  const handlePrev = () => {
    if (prevDisabled) return;
    setView((v) => shiftMonth(v, -1));
  };
  const handleNext = () => {
    if (nextDisabled) return;
    setView((v) => shiftMonth(v, 1));
  };

  return (
    <div className="space-y-2">
      <StreakCount />
      <MonthHeader
        year={view.year}
        month0={view.month0}
        onPrev={handlePrev}
        onNext={handleNext}
        prevDisabled={prevDisabled}
        nextDisabled={nextDisabled}
      />
      <WeekdayHeader />
      <MonthGrid year={view.year} month0={view.month0} />
    </div>
  );
}
```

(Minor typo-safety: the function is named `samMonth` above — rename to `sameMonth` in the actual file. Do not ship the typo.)

Corrected final: use `sameMonth` throughout.

**File 2 — Modify `src/routes/CalendarScreen.tsx`** — replace the stub body:

```tsx
// src/routes/CalendarScreen.tsx
// Phase 3 — Calendar screen mounts the <StreakCalendar> composer inside the
// standard Phase-1/2 screen wrapper (px-4 py-6 space-y-4, matches TodayScreen
// rhythm). Outer AppShell header, tab bar, and safe-area insets are handled
// upstream by App.tsx + AppShell (Phase 1).

import { StreakCalendar } from '@/features/calendar/StreakCalendar';

export function CalendarScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <StreakCalendar />
    </div>
  );
}
```

Preserve the `export function CalendarScreen()` named export — `App.tsx` imports it by name (`import { CalendarScreen } from './routes/CalendarScreen'`). Do NOT change the export name or add a default export.

Do NOT:
- Add a second wrapper `<div>` around StreakCalendar — StreakCalendar already sets its own `space-y-2`.
- Introduce any data subscription in CalendarScreen.tsx — the screen is a pure composer (mirror TodayScreen).
- Nest anything inside `<AppShell>` — App.tsx already wraps routes in AppShell.
- Touch App.tsx in this plan — Plan 03-04 owns the route registration for DayDetail.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/StreakCalendar.tsx` exits 0
    - `grep -c "export function StreakCalendar" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "useState" src/features/calendar/StreakCalendar.tsx` is 1 (view-month state)
    - `grep -c "useEarliestDayKey" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "<StreakCount" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "<MonthHeader" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "<WeekdayHeader" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "<MonthGrid" src/features/calendar/StreakCalendar.tsx` is 1
    - `grep -c "prevDisabled" src/features/calendar/StreakCalendar.tsx` is at least 2 (compute + pass)
    - `grep -c "nextDisabled" src/features/calendar/StreakCalendar.tsx` is at least 2
    - `! grep -E "samMonth" src/features/calendar/StreakCalendar.tsx` (typo caught — must be `sameMonth` or inlined)
    - `! grep -E "from '@/db/db'" src/features/calendar/StreakCalendar.tsx` (no direct db access)
    - `! grep -E "toISOString|new Date\\([\"'][0-9]" src/features/calendar/StreakCalendar.tsx`
    - `grep -c "export function CalendarScreen" src/routes/CalendarScreen.tsx` is 1
    - `grep -c "Coming in Phase 3" src/routes/CalendarScreen.tsx` is 0 (stub removed)
    - `grep -c "<StreakCalendar" src/routes/CalendarScreen.tsx` is 1
    - `grep -c "px-4 py-6" src/routes/CalendarScreen.tsx` is 1 (standard screen rhythm)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0 (final bundle succeeds)
  </acceptance_criteria>
  <done>StreakCalendar composes all 4 sub-components; CalendarScreen stub replaced; prev/next clamp logic compiles; production build succeeds.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human verify — calendar renders live in browser</name>
  <files>(none — human-verification checkpoint; no code files touched)</files>
  <action>Run the dev server (`npm run dev`) and walk through the verification steps below. The &lt;what-built&gt; block describes the surface under review; the &lt;how-to-verify&gt; block lists the concrete steps with expected outcomes. Respond via &lt;resume-signal&gt; after completing the walkthrough.</action>
  <what-built>
The Phase 3 Calendar surface is live:
- Navigate to `/#/calendar` in the dev server
- You should see: streak count hero number, month header "{Month} {Year}" with prev/next chevrons, Sun..Sat row, 42-cell month grid
- Each day with data shows filled quadrants per D-08 glance-map (NW=PT, NE=Food, SW=Steps, SE=Lift)
- Today's cell has a 1px accent outline
- Partial days (1-3 of 4) show the alpha-ramp; 4/4 days show solid accent green
- Zero-log days and never-logged days look IDENTICAL (Pitfall #6 — never red, never empty-shame)
- No motion anywhere — alpha swaps are instant
  </what-built>
  <how-to-verify>
1. Start dev server: `npm run dev` (if not already running)
2. Open the PWA URL (check the terminal for the local URL, typically http://localhost:5173)
3. Tap the Calendar tab in the bottom tab bar
4. VERIFY the month header shows the current month (e.g. "April 2026") — NOT "Coming in Phase 3"
5. VERIFY the streak count number renders (if you have no logs yet: "0 days" + subtitle "log all 4 areas today to start a streak")
6. VERIFY prev-chevron (`◀`) is disabled/muted if no historical logs exist; next-chevron (`▶`) is disabled because today IS the max month
7. VERIFY the weekday header row shows `SUN MON TUE WED THU FRI SAT` in uppercase muted
8. VERIFY the 42-cell grid is laid out as 6 rows × 7 columns with small 4px gaps
9. VERIFY today's cell has a 1px green outline (accent color)
10. Go to Today tab, log an item in any of the 4 areas (e.g. toggle Lift), return to Calendar — the corresponding quadrant on today's cell should now be filled at `--accent-25` alpha (since 1/4 filled). If you log a 2nd area, both filled quadrants should jump to `--accent-50`. Confirm the alpha ramp increases with count.
11. Tap any past-month date (they should be muted and disabled — clicking should do NOTHING)
12. Tap any current-month cell — the URL hash should change to `/#/day/YYYY-MM-DD` (but DayDetailScreen isn't mounted until Plan 03-04 — it'll show either a blank route or whatever fallback; that's EXPECTED this plan)
13. VERIFY no red colors anywhere in the grid
14. VERIFY no animations — alpha changes happen instantly without fade/transition
15. VERIFY no console errors in browser devtools

If any of 4-14 fails → describe the issue for re-plan. If the `/#/day/YYYY-MM-DD` route renders blank (step 12), that's fine — Plan 03-04 creates DayDetailScreen.
  </how-to-verify>
  <acceptance_criteria>
    - Calendar tab renders the month grid (not the Phase 1 stub)
    - Streak count visible with correct zero-state copy OR actual count
    - Today's cell has the accent outline
    - Logging an item on Today → returning to Calendar shows live quadrant fill on today's cell (useLiveQuery reactivity working)
    - Zero console errors
    - No red, no motion, no skeletons
  </acceptance_criteria>
  <resume-signal>Type "approved" or describe issues (e.g. "quadrant order wrong", "today ring missing", "alpha ramp not increasing with count", "console error: X")</resume-signal>
  <verify>
    <automated>MANUAL — executor reports results to the user; the user signals approval via resume-signal. Any automated checks (npx tsc --noEmit, build, lint) run in the preceding implementation tasks before this checkpoint.</automated>
  </verify>
  <done>User responds "approved" (or equivalent) via resume-signal. Any described blockers are triaged into a follow-up plan before execution continues past this wave.</done>
</task>

</tasks>

<threat_model>
  <scope>Route-mounted calendar screen composing 5 feature components. All data flows from Plan 03-01's streak.svc via useLiveQuery (read-only local IDB). User inputs: prev/next button clicks, view-month state transitions.</scope>
  <inputs>
    - name: "prev/next click (increments view-month state)"
      validated_by: "StreakCalendar handlePrev/handleNext check prev/nextDisabled before shiftMonth; shiftMonth uses new Date(y, m+delta, 1) which handles year-boundary roll-over"
      severity_if_unvalidated: "low"
    - name: "view.year / view.month0 → useMonthStreakData → monthRangeKeys"
      validated_by: "monthMath.ts:dateToKey produces valid YYYY-MM-DD for any (y, m0); Dexie .between tolerates valid keys"
      severity_if_unvalidated: "low"
  </inputs>
  <data_flow>UI event → StreakCalendar setState → child hooks re-fire → streak.svc range queries → UI renders Map. No network, no writes, no external inputs.</data_flow>
  <threats_considered>
    - XSS: All rendered text is React-escaped (day numbers, month names, streak count, weekday labels). No dangerouslySetInnerHTML.
    - Nav-state corruption: view exceeds clamp due to double-click race → handlePrev/handleNext guard with explicit early-return check
    - ARIA violations for a11y: role="grid" + role="gridcell" hierarchy preserved; aria-live on StreakCount announces updates
  </threats_considered>
  <mitigations>
    - threat: "User rapidly clicks prev beyond earliest → ungoverned state"
      mitigation: "handlePrev checks prevDisabled; disabled on the button doubles as pointer-events:none; clamps computed from useEarliestDayKey re-fire on IDB writes"
    - threat: "Anti-Pattern 3 regression in MonthGrid"
      mitigation: "Acceptance criteria grep: MonthGrid.tsx has `useMonthStreakData` called exactly once, no useLiveQuery/useEffect inside the cells.map loop; structural guard from Plan 03-02 ensures DayCell cannot fetch its own data"
  </mitigations>
  <residual_risk>none — read-only render of locked tokens; clamp logic and view-state are ephemeral; no persistent side effects</residual_risk>
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (bundle includes new files)
- Purity guards across all 6 files in this plan:
  ```
  ! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" \
      src/features/calendar/MonthHeader.tsx \
      src/features/calendar/WeekdayHeader.tsx \
      src/features/calendar/MonthGrid.tsx \
      src/features/calendar/StreakCount.tsx \
      src/features/calendar/StreakCalendar.tsx \
      src/routes/CalendarScreen.tsx
  ```
- useLiveQuery count across NEW calendar-assembly files: exactly 2 (MonthGrid via useMonthStreakData, StreakCount's local today-row subscription). No per-cell subscriptions.
- Manual smoke captured by the checkpoint task
</verification>

<success_criteria>
- 5 new files + 1 modified file (total = 6 files in `files_modified`)
- Zero npm installs, zero schema changes
- CalendarScreen no longer shows the Phase 1 stub "Coming in Phase 3" string
- Live month grid renders 42 DayCells via ONE `useMonthStreakData` subscription
- Prev/next chevrons clamp correctly (prev disabled at earliest-data month; next disabled at today's month)
- StreakCount displays correct copy for 0-streak, 1-day, N-day, today-complete, today-not-complete states
- Logging an activity on Today updates the Calendar quadrant fill live (useLiveQuery reactivity)
- Human-verify checkpoint passes
</success_criteria>

<output>
After completion, create `.planning/phases/03-streak-loop/03-03-SUMMARY.md` documenting:
- All 5 new components + the CalendarScreen replacement
- useLiveQuery subscription count on CalendarScreen (exactly 2: MonthGrid's month-range + StreakCount's today-row)
- Clamp logic outcome: what prevDisabled/nextDisabled evaluate to on Day-1 (no data) vs. with historical logs
- Any deviations from UI-SPEC (expected: none)
- Confirmation of DayCell import path from Plan 03-02 + hook imports from Plan 03-01
</output>
