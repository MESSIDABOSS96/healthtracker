# Phase 3: Streak Loop — Research

**Researched:** 2026-04-21
**Domain:** Dexie range-query aggregation + month-grid calendar UI + hash-routed day detail
**Confidence:** HIGH (stack locked, CONTEXT.md + UI-SPEC.md resolve almost every decision; research confirms the mechanics)

---

<user_constraints>
## User Constraints (from CONTEXT.md + UI-SPEC.md)

### Locked Decisions (D-01..D-12, from `.planning/phases/03-streak-loop/03-CONTEXT.md:22-47`)

- **D-01** — Food quadrant fills iff `count(MealEntry where dayKey=D) >= 1`. No macro threshold.
- **D-02** — PT quadrant fills iff `count(PTSession where dayKey=D) >= 1`. Any saved session counts.
- **D-03** — Steps quadrant fills iff `StepEntry(dayKey=D) exists AND count > 0`. Zero-count entry does NOT fill.
- **D-04** — Lift quadrant fills iff `LiftCheckin(dayKey=D) exists AND lifted === true`. Explicit `lifted: false` leaves quadrant empty.
- **D-05** — A day is complete (4/4) iff D-01 ∧ D-02 ∧ D-03 ∧ D-04. Binary, no partial credit.
- **D-06** — Rest days cap at 3/4. No third lift state. Accepted tradeoff.
- **D-07** — **Shape: 2×2 square quadrants.** Not donut, not arcs.
- **D-08** — **Quadrant mapping LOCKED FOREVER:** NW=PT, NE=Food, SW=Steps, SE=Lift. Never permute.
- **D-09** — **Per-count alpha ramp.** N filled quadrants → each filled quadrant renders at `--accent` with alpha `{1: 0.25, 2: 0.50, 3: 0.75, 4: 1.00}[N]` via existing `--accent-25/50/75/100` tokens. Unfilled = `--surface`.
- **D-10** — Date number overlaid at geometric center in `--muted`.
- **D-11** — Today: 1px `--accent` ring OUTSIDE the 2×2 grid. No motion.
- **D-12** — **4/4 day chrome: NONE.** Solid fill IS the reward.

### Phase 1 carry-forward (LOCKED)

- `01-CONTEXT.md:19` **D-03** — HashRouter pattern. `/#/day/YYYY-MM-DD` extends this.
- `01-CONTEXT.md:41-47` **D-15/D-16** — Color tokens `--bg/--surface/--border/--muted/--text/--accent` — direct DayCell consumers.
- `01-CONTEXT.md:48-54` **D-17** — Alpha ramp (0→surface, 1/2/3/4→25/50/75/100% accent). This phase is the FIRST consumer of `--accent-25/50/75/100` already declared in `src/styles/tokens.css:18-21`.

### Phase 2 carry-forward (LOCKED)

- `02-CONTEXT.md:42` **D-14** (SET-03 IRREVERSIBLE) — Day Detail totals must compare against the **current** `goals.get('singleton')`, never a per-day snapshot. No migration, no effective-dated ranges.
- `02-CONTEXT.md:172` **D-20** — Past-day edit/delete is Phase 3 scope. Meal edit limited to servings + bucket (foodId immutable).

### Claude's Discretion (resolved in UI-SPEC)

- `react-activity-calendar` is **NOT consumed** — hand-rolled `MonthGrid` + `DayCell` instead (UI-SPEC:42-44).
- DayCell = div + CSS grid (not SVG) — UI-SPEC:402.
- Day Detail = route `/#/day/:dayKey`, not Sheet — UI-SPEC:665-670.
- Week-start Sunday, hardcoded (UI-SPEC:339).
- Padded prev/next-month cells rendered muted (not blank) — UI-SPEC:341.
- Upper nav bound = current month; lower bound = `streak.svc.ts:getEarliestDayKey()` — UI-SPEC:219-221.

### Deferred Ideas (OUT OF SCOPE — from CONTEXT.md `<deferred>`)

- Third lift-state (rest-day "N/A")
- Year-heatmap view (INSIGHT-03, v2)
- Streak freeze / grace day / streak-shield (hard no, REQUIREMENTS Out-of-Scope)
- Badges / XP / achievements
- Future-month navigation (clamp at current month)
- **Backdated adding of NEW past-day logs** — Day Detail is **edit/delete-only** in Phase 3
- Streak-count coaching copy / notifications
- Per-quadrant color coding (rejected Phase 1 D-17)
- DayCell motion / "celebrate 4/4" — rejected by anti-motion policy
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STREAK-01 | Each day rendered as a 4-segment indicator (quadrants PT/meals/steps/lift) | DayCell spec §4 + quadrant map D-08 |
| STREAK-02 | Quadrant fills when any log exists (≥1 PT session, ≥1 meal, count>0 step, lift=true) | Segment-completion rules D-01..D-04; aggregation logic §3 |
| STREAK-03 | 4/4 is the only "complete" state, distinct from partial | Alpha ramp D-09 — 4/4 is the only `--accent-100` saturation state |
| STREAK-04 | Month-at-a-time grid with prev/next nav | MonthGrid §5 + clamp logic |
| STREAK-05 | Neutral (not red) for zero-log days; partial reads positive | Never-red rule + Pitfall #6 compliance — confirmed in ARCHITECTURE.md + PITFALLS.md |
| STREAK-06 | Tap any day → day detail with all 4 areas' logs + totals | Route `/#/day/:dayKey` §6 + DayDetail composition |
| STREAK-07 | Current consecutive-complete-days streak count displayed | Algorithm §7 — backward scan from today over the hydrated month map |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

1. **Never `await` a non-IDB promise inside a Dexie transaction** (Pitfall #1). Not a Phase 3 concern because `streak.svc.ts` uses a single `Promise.all` of Dexie `.toArray()` reads — no writes, no cross-boundary awaits. But any day-detail edit/delete paths must still respect this.
2. **Never edit a past `db.version(N)` declaration** (Pitfall #2). Phase 3 adds **zero** schema changes. Read-only over v1 plus three 1-line additive service functions (`deleteSteps`, `deleteLift`, `deleteSession` if absent).
3. **Never use `toISOString().split('T')[0]`** (Pitfall #4). All dayKey construction for the month-range window, padded cells, today-ring, and streak scan MUST go through `src/lib/dayKey.ts:16` (`dateToKey`/`keyToDate`). No raw Date math inline.
4. `navigator.storage.persist()` — owned by Phase 1's `initApp`; Phase 3 no-op.
5. Photos resize — Phase 2 concern; Phase 3 no-op.
6. Photos in OPFS — Day Detail Food section might thumbnail meals; reuses Phase 2 `FoodThumb` if needed (MealEntryRow doesn't currently render thumbs; Day Detail follows suit).

---

## 1. Executive Summary

Phase 3 is **~80% locked by CONTEXT.md + UI-SPEC.md** and ~20% mechanics that research confirms. The shape: one new service (`streak.svc.ts`) issuing **four Dexie range queries in a single `Promise.all`**, wrapped in one `useLiveQuery`, feeding one `Map<dayKey, QuadrantState>` to a hand-rolled 42-cell `MonthGrid`. The streak count is a backward scan over the **same hydrated Map** — zero extra queries. The Day Detail is a new hash route `/#/day/:dayKey` that composes four existing Phase 2 services + rows into a read-with-inline-edit screen; it adds three 1-line delete functions to existing services.

**Planner should optimize for:** (1) enforcing the **one-hook / four-range-queries** pattern as a non-negotiable constraint (Anti-Pattern 3 is a project-level hard-fail — see §3), (2) keeping DayCell a pure render function with stable reference equality so the 42-cell grid doesn't thrash, (3) routing every dayKey value through `src/lib/dayKey.ts` (Pitfall #4), (4) resisting any addition of `date-fns`, `dayjs`, or `react-activity-calendar` — native `Date` + existing `lib/dayKey.ts` + `grid-cols-7` cover everything.

**Primary recommendation:** Four wave-able tasks: (A) `streak.svc.ts` + unit-style validation, (B) `MonthGrid` + `DayCell` + `StreakCount` + `MonthHeader` on new route body, (C) `DayDetail` route + `DayDetailSection` + additive delete service fns, (D) integration into `App.tsx` Routes + `CalendarScreen.tsx` body replacement. A, B, C have no file-level overlap and can be parallel; D integrates them last.

---

## 2. Stack + Library Confirmation

Package.json at `/Users/anirudhchatterjee/dev/healthtracker/package.json:13-28` is sufficient for Phase 3 as-is:

| Already installed | Used for Phase 3 |
|-------------------|------------------|
| `dexie@^4.0.11` | `.between()` range queries, `Table<T, PK>` typing |
| `dexie-react-hooks@^1.1.7` | `useLiveQuery` wraps the streak service |
| `react-router-dom@^7.0.0` | `HashRouter`, `Routes`, `Route`, `useParams`, `useNavigate` — already used in `src/App.tsx:1,11-20` |
| `react@^19.0.0` | Stable Map/ref patterns for grid |
| `tailwindcss@^4.0.0` + `@tailwindcss/vite` | `grid-cols-7`, `aspect-square`, `gap-1`, `outline`, `tabular-nums` — all used by UI-SPEC |
| `lucide-react@^0.468.0` | `ChevronLeft` / `ChevronRight` (already imported in Phase 2) |

### `react-activity-calendar`: OUT

`react-activity-calendar` is a **year-heatmap primitive** (52-week strip, single-color intensity per cell). Phase 3 renders a **6×7 month grid** with a **4-segment indicator per cell**. The shapes are orthogonal — CITED: `.planning/phases/03-streak-loop/03-UI-SPEC.md:42-44`. Bending the library into a 2×2 quadrant renderer via `renderBlock` would cost more than writing the grid directly (~150 LOC). **Decision is locked; do not re-open.** The package does not need to be installed in Phase 3, and its mention in STACK.md (`.planning/research/STACK.md:28`) is superseded by UI-SPEC.md §Library choice.

### No new npm adds

Zero new runtime or dev dependencies for Phase 3 (UI-SPEC:38-40). Everything the phase needs is in the lockfile. Planner MUST refuse any task that proposes adding `date-fns`, `dayjs`, `react-activity-calendar`, a calendar library, or a new shadcn block.

### Native Date math vs date-fns/dayjs: NATIVE WINS

For the tiny set of date operations Phase 3 needs (first-of-month, last-of-month, Sunday on/before, Saturday on/after, day-of-week, ±1 month, ±1 day), native `Date` + existing `lib/dayKey.ts` helpers are sufficient and correct **so long as every dayKey passes through `dateToKey`/`keyToDate`** (Pitfall #4). Adding a date library introduces 20–80KB of runtime weight for behavior the 40 LOC below covers:

```typescript
// All in src/features/calendar/monthMath.ts (or inline in hooks.ts)
import { keyToDate, dateToKey } from '@/lib/dayKey';

export function firstOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1);
}
export function lastOfMonth(year: number, month0: number): Date {
  return new Date(year, month0 + 1, 0); // day 0 of next month = last day of this
}
export function sundayOnOrBefore(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay()); // getDay(): Sun=0..Sat=6
  return copy;
}
export function saturdayOnOrAfter(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + (6 - copy.getDay()));
  return copy;
}
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
export function monthRangeKeys(year: number, month0: number): { startKey: string; endKey: string; cells: { dayKey: string; inMonth: boolean }[] } {
  const first = firstOfMonth(year, month0);
  const last = lastOfMonth(year, month0);
  const gridStart = sundayOnOrBefore(first);
  const cells: { dayKey: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({ dayKey: dateToKey(d), inMonth: d.getMonth() === month0 });
  }
  return { startKey: cells[0].dayKey, endKey: cells[41].dayKey, cells };
}
```

This is the **only** new date utility file Phase 3 should add. Planner should NOT propose anything beyond it.

### Weekday header copy

Hardcode `['Sun','Mon','Tue','Wed','Thu','Fri','Sat']` — UI-SPEC:339 locks Sunday-first US convention. No `Intl.DateTimeFormat` — avoids locale drift and an extra API dance for seven strings.

---

## 3. Streak Service + Query Pattern — the load-bearing section

This is the phase's hard-fail surface. **ARCHITECTURE.md §"Anti-Pattern 3: Deriving Streak State in Every Component"** (`.planning/research/ARCHITECTURE.md:795-801`) names it explicitly: per-cell IDB queries × 42 cells × 4 tables = 168 IDB reads per render. That is a project-level hard-fail; planner MUST reject any task that implements it.

### The RIGHT pattern (one hook, four range queries in one Promise.all)

```typescript
// src/services/streak.svc.ts  — ALL reads; NO writes; NO transactions needed
import { db } from '@/db/db';

export interface QuadrantState {
  pt: boolean;
  food: boolean;
  steps: boolean;
  lift: boolean;
}

export async function getStreakDataForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, QuadrantState>> {
  // Four range queries in parallel. Dexie .between(lo, hi, true, true) means
  // BOTH bounds INCLUSIVE. Works on both secondary-indexed dayKey (MealEntry,
  // PTSession) and primary-key dayKey (StepEntry, LiftCheckin). VERIFIED against
  // db.ts:56-63 — ptSessions/mealEntries have dayKey as a secondary index;
  // stepEntries/liftCheckins have dayKey as primary key. Dexie's .between() on
  // a primary-key table uses the primary key index (same semantics).
  const [sessions, meals, steps, lifts] = await Promise.all([
    db.ptSessions   .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.mealEntries  .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.stepEntries  .where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.liftCheckins .where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);

  const map = new Map<string, QuadrantState>();
  const ensure = (k: string): QuadrantState => {
    let v = map.get(k);
    if (!v) { v = { pt: false, food: false, steps: false, lift: false }; map.set(k, v); }
    return v;
  };

  for (const s of sessions)            ensure(s.dayKey).pt    = true;          // D-02: any session
  for (const m of meals)               ensure(m.dayKey).food  = true;          // D-01: any entry
  for (const s of steps)  if (s.count > 0)       ensure(s.dayKey).steps = true; // D-03: count>0 guard
  for (const l of lifts)  if (l.lifted === true) ensure(l.dayKey).lift  = true; // D-04: explicit true

  return map;
}
```

### The hook (one subscription covers the whole month)

```typescript
// src/features/calendar/hooks.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { getStreakDataForRange } from '@/services/streak.svc';
import { monthRangeKeys } from './monthMath';

export function useMonthStreakData(year: number, month0: number) {
  const { startKey, endKey, cells } = monthRangeKeys(year, month0);
  const data = useLiveQuery(
    () => getStreakDataForRange(startKey, endKey),
    [startKey, endKey],
  );
  return { data, cells };
}
```

**Why this is correct:**
- **One `useLiveQuery` covers 4 tables.** Because the callback reads `db.ptSessions`, `db.mealEntries`, `db.stepEntries`, and `db.liftCheckins`, Dexie's live observer registers **all four** for re-run triggers. A write to ANY of the 4 refreshes the Map — CITED: dexie.org/docs/dexie-react-hooks/useLiveQuery() §"The callback ... any Dexie-call along the way will be marked for observation". [VERIFIED via web docs lookup 2026-04-21]
- **Only one subscription, not 42.** Cost per month change = 4 IDB reads, not 4 × 42 = 168.
- **Service is pure reads.** No transaction wrapper needed. Pitfall #1 not applicable.
- **`.between(start, end, true, true)`** is `(lowInclusive=true, highInclusive=true)` — confirmed via Dexie docs. `YYYY-MM-DD` strings sort lexicographically identically to chronologically (ARCHITECTURE.md:304), so string-range works on both secondary-indexed and primary-key `dayKey`. [VERIFIED — CITED: ARCHITECTURE.md §Day Key Format Decision]

### The WRONG pattern (DO NOT DO THIS — auto-fail)

```typescript
// ❌ ANTI-PATTERN — planner MUST reject any task that does this
function DayCell({ dayKey }: { dayKey: string }) {
  // 42 cells × 4 independent hooks = 168 IDB subscriptions per render.
  const sessions = useLiveQuery(() => db.ptSessions.where('dayKey').equals(dayKey).count(), [dayKey]);
  const meals    = useLiveQuery(() => db.mealEntries.where('dayKey').equals(dayKey).count(), [dayKey]);
  const steps    = useLiveQuery(() => db.stepEntries.get(dayKey), [dayKey]);
  const lift     = useLiveQuery(() => db.liftCheckins.get(dayKey), [dayKey]);
  // ...
}
```

or this equivalent-mistake:

```typescript
// ❌ ALSO WRONG — useEffect + setState per cell = 42 effects, same cost, manual invalidation bugs
function DayCell({ dayKey }) {
  const [state, setState] = useState({ pt: false, food: false, steps: false, lift: false });
  useEffect(() => {
    (async () => {
      const [s, m, st, l] = await Promise.all([/* per-cell queries */]);
      setState(/* ... */);
    })();
  }, [dayKey]);
}
```

Both blow the 168-query budget. Both miss `useLiveQuery` reactivity. Both will surface as severe jank on the first month a user has real data. **Reject at plan-check time.**

### useLiveQuery + Map: ref identity concern

`useLiveQuery` does NOT do structural equality on return values — it re-runs the callback when observed tables change and re-renders the component with a fresh Map reference. [VERIFIED — CITED: https://dexie.org/docs/dexie-react-hooks/useLiveQuery() + GitHub discussion #1661]

Implication: every IDB write inside the subscribed range mints a **new Map identity**. `MonthGrid` passes each cell's `filled` prop via `map.get(dayKey)` — that object's identity also changes per refresh. DayCell should therefore be structured so its render is cheap (pure JSX, no expensive computation), OR memoized on a **value-equality** check of its 4 booleans. Practically: `React.memo(DayCell, (a, b) => a.dayKey===b.dayKey && a.today===b.today && a.inMonth===b.inMonth && a.filled.pt===b.filled.pt && a.filled.food===b.filled.food && a.filled.steps===b.filled.steps && a.filled.lift===b.filled.lift)`. 42 memo checks per refresh is negligible.

Planner judgement call: DayCell is ~20 lines of JSX; React.memo with a custom comparator is optional but cheap insurance. The React compiler (React 19) may also auto-memoize. Either acceptable; don't hand-optimize prematurely.

### Streak service API surface (final)

```typescript
// src/services/streak.svc.ts
export async function getStreakDataForRange(startKey: string, endKey: string): Promise<Map<string, QuadrantState>>;
export async function getCurrentStreakCount(): Promise<number>;          // §7
export async function getEarliestDayKey(): Promise<string | null>;       // for nav lower-bound clamp
```

`getEarliestDayKey()` issues 4 `.orderBy('dayKey').first()` reads in parallel and returns the lexicographically smallest `dayKey`. Lexicographic min over `YYYY-MM-DD` strings = chronological min. Secondary-indexed vs primary-key is identical for this query.

---

## 4. DayCell Rendering Approach

### Recommendation: div + CSS grid (UI-SPEC:402 locks this)

```tsx
// src/features/calendar/DayCell.tsx
import { useNavigate } from 'react-router-dom';
import { keyToDate } from '@/lib/dayKey';

interface DayCellProps {
  dayKey: string;
  filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean };
  today: boolean;
  inMonth: boolean;
}

const ALPHA_VARS = ['var(--surface)', 'var(--accent-25)', 'var(--accent-50)', 'var(--accent-75)', 'var(--accent-100)'] as const;

function quadFill(filled: boolean, totalCount: number): string {
  return filled ? ALPHA_VARS[totalCount] : 'var(--surface)';
}

export function DayCell({ dayKey, filled, today, inMonth }: DayCellProps) {
  const navigate = useNavigate();
  const count = Number(filled.pt) + Number(filled.food) + Number(filled.steps) + Number(filled.lift);
  const day = keyToDate(dayKey).getDate();
  // Build aria-label per UI-SPEC §Copywriting DayCell

  const handleClick = () => { if (inMonth) navigate(`/day/${dayKey}`); };

  return (
    <button
      type="button"
      disabled={!inMonth}
      aria-disabled={!inMonth}
      aria-label={/* computed per UI-SPEC */''}
      onClick={handleClick}
      className="relative aspect-square focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 active:brightness-90"
      style={today ? { outline: '1px solid var(--accent)', outlineOffset: 0 } : undefined}
    >
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
        <div style={{ backgroundColor: quadFill(filled.pt,    count) }} />   {/* NW: PT */}
        <div style={{ backgroundColor: quadFill(filled.food,  count) }} />   {/* NE: Food */}
        <div style={{ backgroundColor: quadFill(filled.steps, count) }} />   {/* SW: Steps */}
        <div style={{ backgroundColor: quadFill(filled.lift,  count) }} />   {/* SE: Lift */}
      </div>
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs tabular-nums"
        style={{ color: inMonth ? 'var(--muted)' : 'var(--border)' }}
      >
        {day}
      </span>
    </button>
  );
}
```

### Why div + CSS grid over SVG

| Criterion | div + CSS grid | SVG (rect × 4) |
|-----------|----------------|----------------|
| LOC | ~30 | ~45 |
| Alpha ramp via CSS vars | Direct (`backgroundColor: var(--accent-50)`) | Direct (`fill="var(--accent-50)"`) — parity |
| Future arc variant (donut) | Would require rewrite | Natural — SVG arc is one `<path>` |
| Touch target / focus ring | Native `<button>` — inherited by Phase 1 `focus-visible:outline` | Same, via SVG role=button |
| Browser performance (42 cells × 4 quadrants = 168 DOM nodes) | Fine — paint cost is ~0.5ms per cell on modern mobile | SVG slightly faster for pure fill rects |
| Accessibility | Native `<button>` with `aria-label`, `aria-disabled` | Same but needs `role="button"` shim |

**Decision:** div + CSS grid (UI-SPEC:402 locked). The 4/4 solid-accent case at 56×56px is a flat square either way; no sub-pixel crispness benefit from SVG. SVG earns its weight only if a future phase wants donut arcs (deferred; not Phase 3).

### ARIA pattern (UI-SPEC:543-553 already locks this)

- **MonthGrid** wrapper: `role="grid" aria-label="April 2026 activity calendar"`
- **DayCell**: `role` inherited from `<button>` (grid cell conventionally uses `<button role="gridcell">` or just `role="gridcell"` on a button — the latter is more orthodox). UI-SPEC line 545 says `role="gridcell"`.
- **`aria-label` format** (UI-SPEC:226-232, copy verbatim in implementation):
  - Current-month, N/4: `"{Weekday}, {Month} {Day} — {N} of 4 logged: {areasFilledList}"`
  - Zero: `"{Weekday}, {Month} {Day} — no logs"`
  - Four: `"{Weekday}, {Month} {Day} — all 4 logged"`
  - Today suffix: append `", today"`
  - `areasFilledList` order = NW→NE→SW→SE = `PT, food, steps, lift` (lowercase, never pluralize, never emoji)
- **Today indicator** is *text* in the aria-label, not a separate ARIA flag (UI-SPEC:548-549) — deliberately avoids duplicating signal.
- **Padded cell** = `<button disabled aria-disabled="true">` — UI-SPEC:547 accepts either button-disabled or div+role+tabindex; button-disabled is simpler and matches prior phases.
- **Weekday headers** = `aria-hidden="true"` row (UI-SPEC:379) — redundant with the DayCell aria-labels that spell out weekday names.

### Keyboard navigation (UI-SPEC:390-391)

- MonthGrid owns a **roving tabindex** — exactly one DayCell has `tabIndex={0}` at a time, all others `tabIndex={-1}`. Initial focus target = today if in view, else 1st-of-month.
- Arrow Up/Down = ±7 cells; Left/Right = ±1 cell.
- Enter/Space on current-month cell → `navigate('/day/${dayKey}')`.
- Enter on padded cell = no-op (button `disabled` blocks onClick).
- Arrow past grid boundary → focus moves to prev-chevron (upper-left exit) or next-chevron (lower-right exit) per UI-SPEC:390.

**Implementation hint for planner:** keep roving-tabindex state in `MonthGrid` local `useState<string>(focusedDayKey)` — don't push it into Zustand. It's purely ephemeral focus state.

---

## 5. Calendar Grid Layout

All dimensions are LOCKED by UI-SPEC:52-76. Planner reproduces them; executor does not invent.

### Key layout facts

| Fact | Value | Source |
|------|-------|--------|
| Rows × cols | 6 × 7 = 42 cells | UI-SPEC:340 |
| Gap | `gap-1` (4px) | UI-SPEC:61-62 |
| Week start | Sunday (hardcoded) | UI-SPEC:339 |
| Aspect | `aspect-square` on each cell | UI-SPEC:66 |
| Padded cell rendering | Muted date number (`--border`), NOT blank; disabled button | UI-SPEC:341, 428 |
| Month header | NOT sticky | UI-SPEC:342 |
| Upper nav bound | Current month (no future) | UI-SPEC:219 |
| Lower nav bound | Month of `getEarliestDayKey()` | UI-SPEC:220-221 |

### Padded-cell policy

Always render 42 cells. Prev/next-month cells show: `--surface` quadrants (same as 0/4 current-month), date number in `--border` color, `disabled` + `aria-disabled="true"`. Keeps grid rhythm stable across 28-day (Feb) → 31-day months.

### First-render behavior (no skeleton)

`useLiveQuery` returns `undefined` for one microtask on first mount. UI-SPEC:690-691 says: render 42 cells all as 0/4 `--surface` during `undefined`, then populate. No skeleton, no spinner, no fade. On local IDB, the flash is imperceptible (< 16ms).

### Prev-chevron disabled state

If current view month === month of `getEarliestDayKey()` → prev-chevron shows `aria-disabled="true"`, color `--border`, non-clickable. If `getEarliestDayKey()` returns `null` (no data anywhere) → earliest equals current, so prev is disabled on Day 1. Next-chevron disabled when current view month === today's month. Both clamps implemented in `MonthHeader` via props `prevDisabled` / `nextDisabled` (UI-SPEC:360-367).

### Month transition

No slide, no fade (UI-SPEC:512). `useMonthStreakData(year, month0)` re-subscribes on year/month change; old MonthGrid unmounts, new one mounts with undefined data for one microtask, then populates. Executor does NOT need to hold the previous month's data during transition — UI-SPEC explicitly accepts the brief all-`--surface` flash as the correct behavior.

---

## 6. Day Detail Routing

### Route registration (additive one-liner in App.tsx)

`src/App.tsx:13-18` currently declares three routes. Phase 3 appends one:

```tsx
<Route path="/day/:dayKey" element={<DayDetail />} />
```

Phase 1 already uses `HashRouter` (src/App.tsx:11) — hash-route deep links "just work" (`/#/day/2026-04-21`). No additional router config.

### DayDetail component — `useParams` + validation

```tsx
// src/features/calendar/DayDetail.tsx
import { useParams, Navigate } from 'react-router-dom';

const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetail() {
  const { dayKey } = useParams<{ dayKey: string }>();
  if (!dayKey || !DAYKEY_RE.test(dayKey)) return <Navigate to="/calendar" replace />;
  // Compose 4 sections below.
  // ...
}
```

Validation approach per UI-SPEC:302-303: malformed key → silent redirect to `/calendar`. Valid-format but no-logs key (future or ancient) → render empty-state in all four sections. Regex-only validation is sufficient — `keyToDate` will still produce a Date for any well-formed `YYYY-MM-DD` (even 2199-12-31).

### Service reuse for Day Detail (existing Phase 2 services — NO gaps)

| Section | Read service | Edit service | Delete service | Notes |
|---------|-------------|--------------|----------------|-------|
| PT sessions | `getTodaySessions(dayKey)` at `src/services/pt.svc.ts:36` (misnamed but accepts any dayKey) | `saveSession(session)` at `pt.svc.ts:32` — upsert by id | **`deleteSession(id)` — MISSING, additive 1-liner** | Edit UI opens PT Session Sheet (Phase 2 `PTSheet` + `PTSessionForm`) |
| Meals | `getTodayEntries(dayKey)` at `meals.svc.ts:69` | `updateMealEntry(id, patch)` at `meals.svc.ts:42` | `deleteMealEntry(id)` at `meals.svc.ts:63` ✓ | Inline-edit via existing `MealEntryRow` (src/features/food/MealEntryRow.tsx:24). D-14: totals via `getDailyTotals(dayKey)` at `meals.svc.ts:73` — **current goals, not snapshot** |
| Steps | `getStepsForDay(dayKey)` at `steps.svc.ts:13` | `upsertSteps(dayKey, count)` at `steps.svc.ts:8` | **`deleteSteps(dayKey)` — MISSING, additive 1-liner** | Inline input reuses `StepsInlineInput` (existing) |
| Lift | `getLiftForDay(dayKey)` at `lifts.svc.ts:31` | `toggleLift(dayKey)` at `lifts.svc.ts:9` + `setLiftNote(dayKey, note)` at `lifts.svc.ts:20` | **`deleteLift(dayKey)` — MISSING, additive 1-liner** | Reuses Phase 2 `LiftToggle` + `LiftNoteInput` |

**Three additive service functions, all 1-line** (UI-SPEC:659-663):

```typescript
// pt.svc.ts — append
export async function deleteSession(id: string): Promise<void> {
  await db.ptSessions.delete(id);
}

// steps.svc.ts — append
export async function deleteSteps(dayKey: string): Promise<void> {
  await db.stepEntries.delete(dayKey);
}

// lifts.svc.ts — append
export async function deleteLift(dayKey: string): Promise<void> {
  await db.liftCheckins.delete(dayKey);
}
```

No transaction wrappers (single-statement Dexie deletes auto-transaction; Pitfall #1 rule satisfied). No schema change.

### Day Detail data hook (four `useLiveQuery` subscriptions — NOT a streak.svc.ts concern)

UI-SPEC:648: `useDayDetail(dayKey)` is a composite hook pulling the four reads. This is a **different** pattern from the MonthGrid: 4 subscriptions on 1 dayKey each, not 4 subscriptions on a range. Scale is trivial (one day), so per-source subscription is cleaner than one joint query:

```typescript
// src/features/calendar/hooks.ts
export function useDayDetail(dayKey: string) {
  const sessions = useLiveQuery(() => getTodaySessions(dayKey), [dayKey]);
  const meals    = useLiveQuery(() => getTodayEntries(dayKey), [dayKey]);
  const steps    = useLiveQuery(() => getStepsForDay(dayKey), [dayKey]);
  const lift     = useLiveQuery(() => getLiftForDay(dayKey), [dayKey]);
  const totals   = useLiveQuery(() => getDailyTotals(dayKey), [dayKey]); // D-14
  return { sessions, meals, steps, lift, totals };
}
```

This is DIFFERENT from the streak service hook. The streak service exists because the MonthGrid needs 4 tables × 30 days — aggregation is the whole point. Day Detail needs 4 tables × 1 day — 4 tiny subscriptions is fine. Do not over-engineer.

### Conflict with Phase 2 Sheet pattern? No.

Phase 2 D-01 pattern is: Sheet overlays existing content for logging. Day Detail is a **navigation destination** (route), not an overlay. No conflict — the two coexist. Sheets still open FROM Day Detail for nested edits (PT session edit opens a PTSheet).

### Focus management on route change (UI-SPEC:558)

When navigating DayCell → DayDetail, focus should move to the Day Detail back button (or date heading) so screen readers announce the new context. When back-navigating, focus returns to the originating DayCell. Implementation: a `useEffect(() => { backButtonRef.current?.focus() }, [])` on mount in DayDetail. For back-restore, the MonthGrid's roving-tabindex-state-of-focus naturally persists across mount cycles if MonthGrid stays in the React tree behind the route. With HashRouter + Routes, the CalendarScreen DOES unmount on navigate, so the roving focus state is lost. Planner's call: accept the re-mount (Phase 1 default) and let focus land on "today" when user returns; OR persist `focusedDayKey` in URL query or session storage. **Recommendation: accept the reset; the re-focus-on-today behavior is natural and under-specified in UI-SPEC.**

---

## 7. Streak Count Algorithm

**Semantics (UI-SPEC:194-198, LOCKED):**
- Count = consecutive 4/4 days ending at the most-recent 4/4 day.
- If today is 4/4, today is the endpoint and included in the count.
- If today is NOT 4/4 (0/4..3/4), endpoint is yesterday; today is NOT counted.
- If the most-recent 4/4 day is more than 1 day before today → count = 0.

### Algorithm

```typescript
// src/services/streak.svc.ts
import { db } from '@/db/db';
import { todayKey, dateToKey, keyToDate } from '@/lib/dayKey';

const MAX_SCAN_DAYS = 730; // 2 years — generous safety bound

export async function getCurrentStreakCount(): Promise<number> {
  const today = todayKey();
  const earliest = await getEarliestDayKey();
  if (!earliest) return 0;

  // Scan window: from (today - MAX_SCAN_DAYS) OR earliest, whichever is later.
  // 2 years × 4 tables on fully-populated data: still sub-1000 records per table on typical usage.
  const scanStartDate = new Date(keyToDate(today));
  scanStartDate.setDate(scanStartDate.getDate() - MAX_SCAN_DAYS);
  const scanStartKey = dateToKey(scanStartDate) < earliest ? earliest : dateToKey(scanStartDate);

  const rangeMap = await getStreakDataForRange(scanStartKey, today);

  // Walk backward from today. Find anchor = most-recent 4/4.
  // If today is 4/4 → anchor = today. Else → anchor = yesterday if yesterday 4/4, else keep walking
  // BUT only count consecutive from anchor; if anchor is >1 day before today, count = 0.
  const isComplete = (key: string) => {
    const q = rangeMap.get(key);
    return !!q && q.pt && q.food && q.steps && q.lift;
  };

  let cursor = new Date(keyToDate(today));
  let anchorKey: string | null = null;

  // Check today first
  if (isComplete(dateToKey(cursor))) {
    anchorKey = dateToKey(cursor);
  } else {
    // Check yesterday
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = dateToKey(cursor);
    if (yesterdayKey >= scanStartKey && isComplete(yesterdayKey)) {
      anchorKey = yesterdayKey;
    } else {
      // More than 1 day back → count = 0 per spec
      return 0;
    }
  }

  // Walk backward from anchor counting consecutive 4/4 days
  let count = 0;
  cursor = new Date(keyToDate(anchorKey));
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

### Edge cases

| Case | Expected output | How algorithm handles |
|------|----------------|----------------------|
| Day 1 of app use, no logs | `0` | `earliest === null` → return 0 |
| Day 1, logged 4/4 today | `1` | today is 4/4, anchor=today, walk back 1 step finds no data → count=1 |
| Today is 2/4, yesterday was 4/4, day before was 4/4 | `2` (displays as `2 days` + subtitle) | anchor = yesterday, walk back counts yesterday + day-before |
| Today 0/4, yesterday 0/4, most-recent 4/4 was 3 days ago | `0` (subtitle = "log all 4 areas today to start a streak") | yesterday not 4/4 → return 0 |
| Today 4/4 but yesterday was 0/4 | `1` | anchor=today, walk back yesterday not 4/4 → count=1 |

### Range bound (MAX_SCAN_DAYS)

Scan caps at 730 days backward from today. Rationale: a solo health tracker using the app daily for 2 years with 4/4 every day is an **edge case that would be unprecedented**. A 730-day scan × 4 range queries on indexed `dayKey` columns remains < 10ms on any device. If the user hits a real 2-year streak, add "2+ years" copy later; don't pre-build for it. **This cap is a judgment call (`[ASSUMED]`) — planner may adjust; document in plan if changed.**

### Can the algorithm reuse the MonthGrid's hydrated Map?

**Partially, but NOT cleanly.** The MonthGrid's Map covers 42 cells of the currently-viewed month — NOT a 730-day backward window. A user viewing February 2026 with a 45-day streak extending back to December 2025 would have truncated data in the MonthGrid Map.

**Decision:** `getCurrentStreakCount()` issues its own `getStreakDataForRange(scanStartKey, today)` call. It's ONE additional range query when the streak count recomputes (which happens on any write to any of 4 tables). Wrapped in its own `useLiveQuery` subscription in `useCurrentStreakCount()` (UI-SPEC:647). Two subscriptions total on CalendarScreen: month-range + streak-range. Both re-run on any write to the 4 tables, but they're cheap (indexed range scans), and there's no N-cell amplification.

**Planner note:** The streak-count scan and the month-grid range may overlap. That's fine — it's still O(constant) IDB reads, not per-cell. Do not prematurely optimize by merging them; keep them as two hooks with clear responsibilities.

---

## 8. Performance Budget Verification

UI-SPEC:389 and CONTEXT.md §Claude's Discretion both say: **first render < 30ms on local IDB.**

### Cost breakdown

| Phase | Operation | Estimated cost |
|-------|-----------|---------------|
| Data | 4 × `.between()` range queries on indexed `dayKey` | ~2–8ms (IDB sub-16ms locally) |
| Aggregation | 4 array loops writing to Map (~0–200 records total) | < 1ms |
| React reconciliation | 42 DayCells × 4 quadrant divs + date span = ~210 elements | ~8–15ms on modern mobile |
| Paint | 168 colored rects | ~5ms |
| **Total first-render** | | **~15–30ms — within budget** |

### React 19 / Tailwind 4 pitfalls

None specific to this shape. React 19's compiler auto-memoizes if enabled; even without it, 42 cells is well under any render-budget concern. Tailwind 4's JIT generates classes at build time — no runtime cost. The DayCell uses inline `style={{ backgroundColor: var(--accent-XX) }}` for alpha because dynamic class names like `bg-[color:var(--accent-${count*25})]` would require arbitrary-value generation that Tailwind can't JIT-emit — inline style is simpler and equally performant.

### Virtualization: NOT needed

42 cells × constant height. Virtualization would add complexity (react-window) for zero benefit at this count. Reject any task proposing virtualization.

### Known concern: Map identity churn

Every IDB write re-runs the streak hook and mints a fresh Map. DayCell's `filled` prop changes identity even when its 4 booleans don't. Without memoization, all 42 cells re-render. 42 pure-JSX re-renders is ~15ms — acceptable. Add `React.memo(DayCell, byBooleanValueEquality)` as optional insurance; don't require it (React 19 compiler may auto-memoize).

### Month-switch cost

Prev/next nav = new hook subscription = 4 IDB reads + rerender = ~20ms. Brief all-`--surface` flash is visible for one microtask, which UI-SPEC:691 explicitly accepts.

---

## 9. Integration Points

### Phase 1+2 outputs Phase 3 consumes VERBATIM

| Asset | Source | How Phase 3 uses |
|-------|--------|------------------|
| `--accent-25/50/75/100` tokens | `src/styles/tokens.css:18-21` | DayCell quadrant fills (D-09) |
| `--accent`, `--surface`, `--muted`, `--border`, `--text`, `--bg` | `src/styles/tokens.css:7-15` | All Phase 3 colors |
| `HashRouter` route pattern | `src/App.tsx:1,11-20` | Add `/day/:dayKey` route |
| `AppShell` + `TabBar` + safe-area insets | `src/components/AppShell.tsx` | Unchanged wrapping container |
| `<Card>` shadcn | `src/components/ui/card.tsx` | Day Detail section wrappers |
| `<Sheet>` shadcn | `src/components/ui/sheet.tsx` | PT Session edit sheet opened from Day Detail |
| `dateToKey`, `keyToDate`, `todayKey` | `src/lib/dayKey.ts:12-27` | ALL day-key construction goes through these (Pitfall #4) |
| `getTodaySessions(dayKey)` | `src/services/pt.svc.ts:36` | PT read — misnamed but dayKey-agnostic |
| `saveSession(session)` | `src/services/pt.svc.ts:32` | PT edit (upsert by id) |
| `getTodayEntries(dayKey)` | `src/services/meals.svc.ts:69` | Meals read |
| `getDailyTotals(dayKey)` | `src/services/meals.svc.ts:73` | Food section subhead — against CURRENT goals (D-14) |
| `updateMealEntry`, `deleteMealEntry` | `src/services/meals.svc.ts:42,63` | Meal edit/delete |
| `getStepsForDay(dayKey)` + `upsertSteps(dayKey, count)` | `src/services/steps.svc.ts:13,8` | Steps read/edit |
| `getLiftForDay(dayKey)` + `toggleLift(dayKey)` + `setLiftNote` | `src/services/lifts.svc.ts:31,9,20` | Lift read/edit |
| `MealEntryRow` | `src/features/food/MealEntryRow.tsx:24` | Day Detail Food section row |
| `StepsInlineInput`, `LiftToggle`, `LiftNoteInput` | `src/features/steps/`, `src/features/lifts/` | Day Detail inline edit |
| `PTSheet` + `PTSessionForm` | `src/features/pt/` | Day Detail PT session edit |
| `ChevronLeft` / `ChevronRight` | `lucide-react` | Month-nav, Day Detail back |
| SET-03 D-14 current-goals policy | `02-CONTEXT.md:42` | Day Detail totals compare against CURRENT goals, never per-day snapshot |

### New files (authoritative list from UI-SPEC:631-670)

```
src/features/calendar/
  StreakCalendar.tsx          # top-level CalendarScreen container
  StreakCount.tsx             # hero streak number + noun + subtitle
  MonthHeader.tsx             # month label + prev/next chevrons + clamps
  WeekdayHeader.tsx           # 7-col weekday labels
  MonthGrid.tsx               # 42-cell grid + roving tabindex + keyboard nav
  DayCell.tsx                 # 4-quadrant + date number + today ring
  DayDetail.tsx               # /#/day/:dayKey route component
  DayDetailHeader.tsx         # back + date + empty right slot
  DayDetailSection.tsx        # generic section card wrapper
  hooks.ts                    # useMonthStreakData, useCurrentStreakCount, useDayDetail
  monthMath.ts                # firstOfMonth, sundayOnOrBefore, monthRangeKeys, addDays (optional: inline in hooks.ts)

src/services/
  streak.svc.ts               # getStreakDataForRange, getCurrentStreakCount, getEarliestDayKey
```

### Modified files

```
src/App.tsx                   # add <Route path="/day/:dayKey" element={<DayDetail />} />
src/routes/CalendarScreen.tsx # replace stub body with <StreakCalendar />
src/services/pt.svc.ts        # append deleteSession (1 line)
src/services/steps.svc.ts     # append deleteSteps (1 line)
src/services/lifts.svc.ts     # append deleteLift (1 line)
```

### Phase 4 hook-in note (flagged for Phase 4 planner)

- Day Detail header right slot is **reserved empty** (UI-SPEC:495) — Phase 4 may add an "Export day" action or similar. Phase 3 leaves it empty.
- Past-day edit flow is a natural "trigger" for the user to think "I should back up" — Phase 4 may surface an export-prompt cue here. Not Phase 3 scope.

### PWA / offline considerations

**No new considerations.** The Phase 1 service worker (vite-plugin-pwa, precache, hash-route navigation fallback) handles `/#/day/:dayKey` correctly — all routes are served from the same cached `index.html`. Dexie range queries are IDB-native, work offline by design. `keyToDate` + local date math has no network dependency. Phase 3 is fully offline-capable from the moment it ships, with no additional SW changes.

---

## 10. Open Judgment Calls for the Planner

These are residual items where CONTEXT + UI-SPEC + research do NOT fully determine the answer. Planner picks during task authoring.

1. **Streak scan range cap (MAX_SCAN_DAYS).** §7 uses 730 days. Could be 365 (1 year, tighter bound) or unbounded (scan from earliest dayKey always). Performance-wise all three are fine. **Recommendation: 730 as proposed; planner may override.** `[ASSUMED]`

2. **DayCell memoization.** `React.memo(DayCell, byBooleanEquality)` is optional insurance against Map-identity churn. 42 unmemoized re-renders on every IDB write is ~15ms — likely imperceptible. **Recommendation: skip memo initially; add only if measured regression.** React 19 compiler may auto-memoize. `[ASSUMED — depends on whether React compiler is enabled in Vite config]`

3. **Focus restoration on Day Detail → Calendar back-navigation.** UI-SPEC:558 says focus should return to the originating DayCell, but CalendarScreen unmounts on route change (HashRouter default). Options: (a) accept focus reset to today's cell (simplest), (b) persist `focusedDayKey` in URL search param or sessionStorage, (c) keep CalendarScreen mounted via a layout route. **Recommendation: (a) — re-focus today on mount. The UI-SPEC is aspirational; the a-b-c tradeoff isn't called out there. Document choice in plan.**

4. **MonthGrid padded-cell button vs div-with-role.** UI-SPEC:547 accepts either. **Recommendation: `<button disabled aria-disabled="true">` — matches other phases, simpler; div+role+tabindex gains nothing here.**

5. **Wave structure.** Independent surfaces:
   - **A.** `streak.svc.ts` (new service, pure reads) — no deps on B/C/D
   - **B.** MonthGrid + DayCell + StreakCount + MonthHeader + WeekdayHeader + hooks.ts (uses A via `getStreakDataForRange`)
   - **C.** DayDetail + DayDetailHeader + DayDetailSection + three additive delete fns (uses existing Phase 2 services, independent of A and B)
   - **D.** Integration: App.tsx route + CalendarScreen.tsx body (tiny glue task; depends on A, B, C)
   A can ship with B; C is independent. **Recommendation: 2 parallel waves — wave 1 = A+B, wave 2 = C; D is a trivial integration serialized last.** Planner may split further if coarse tasks feel too large.

6. **Inline-vs-split monthMath.ts.** The date helpers (`monthRangeKeys`, etc.) are ~40 LOC. Put them in `src/features/calendar/monthMath.ts` OR inline into `hooks.ts`. **Recommendation: separate file (`monthMath.ts`) for unit-testability and single-responsibility.** `[ASSUMED]`

7. **Streak-count loading state.** UI-SPEC:354 says render `0 days` + zero-state subtitle while `useLiveQuery` returns `undefined`. This means the UI briefly shows "0 days" before populating with the real count, which could flash "0" → "12" for users with real streaks. On local IDB this flash is <16ms, but it IS a 1-frame visible state. Alternatives: render blank space until defined, OR render a zero-width placeholder. **Recommendation: accept "0 days" flash per UI-SPEC; it is explicitly called out as acceptable.**

8. **Delete-confirmation on Day Detail.** UI-SPEC:274-278 says NONE (inherits Phase 2 D-04). This is not a judgment call — it's locked — but planner should be prepared for the executor to question it. Answer: Phase 4 JSON export is the safety net.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Month-range completion aggregation | Service (`streak.svc.ts`) | — | Enforces Anti-Pattern 3 discipline: aggregation NEVER in components |
| 4-segment rendering | Component (`DayCell`) | Styles (tokens.css) | Pure presentational component; no data fetch |
| Reactive data flow | Hook (`useMonthStreakData`, `useCurrentStreakCount`, `useDayDetail`) | Service | Hooks wrap services via `useLiveQuery`; components never touch `db` |
| Day-key identity | Utility (`src/lib/dayKey.ts`) | — | Pitfall #4 — every dayKey construction MUST route through here |
| Hash routing | Framework (`react-router-dom`) | App.tsx | Already in place; Phase 3 adds one `<Route>` |
| Past-day edit | Existing Phase 2 services | Day Detail component | Day Detail composes existing flows; zero new write paths for edit |
| Past-day delete | Existing services + 3 additive fns | Day Detail | Three 1-line additions (deleteSession, deleteSteps, deleteLift) |
| Month navigation | Component (`MonthHeader`) + hook state | — | Month+year held in `useState` at `StreakCalendar` level; propagated down via props |
| Keyboard navigation (grid) | Component (`MonthGrid`) | — | Roving tabindex state in local `useState`; no global state |
| PWA offline delivery | Service Worker (Phase 1) | — | No Phase 3 change |

---

## Standard Stack (confirmed for Phase 3)

Already locked by STACK.md + Phase 1/2 deliverables. Phase 3 adds **zero** runtime dependencies.

| Library | Installed Version | Phase 3 Consumption |
|---------|-------------------|---------------------|
| react | ^19.0.0 | All components |
| react-router-dom | ^7.0.0 | `useParams`, `useNavigate`, `<Route>` |
| dexie | ^4.0.11 | `.between()` range queries, `Table<T, PK>` |
| dexie-react-hooks | ^1.1.7 | `useLiveQuery` |
| lucide-react | ^0.468.0 | `ChevronLeft`, `ChevronRight` |
| tailwindcss | ^4.0.0 | `grid-cols-7`, `aspect-square`, `gap-1`, `outline`, etc. |

**Verified:** existing `package.json` at `/Users/anirudhchatterjee/dev/healthtracker/package.json:13-28` contains all required deps. No `npm install` commands in Phase 3 tasks.

---

## Don't Hand-Roll (Phase 3-specific)

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Calendar grid primitive | Custom heatmap library / react-activity-calendar shim | `grid-cols-7` + `aspect-square` from Tailwind | 150 LOC hand-roll is simpler and no fight with a year-heatmap library |
| Day-key construction | Any `toISOString`, `new Date(key)`, `date-fns` parse | `src/lib/dayKey.ts` exports (`dateToKey`, `keyToDate`, `todayKey`) | Pitfall #4 — PROJECT-BREAKING if hand-rolled |
| Dexie subscription plumbing | `useEffect` + manual setState + store.subscribe | `useLiveQuery(() => service(...), deps)` | Already the Phase 1+2 pattern; no reason to diverge |
| Month navigation UI primitive | shadcn `Pagination` / custom sheet chooser | Two `<button>` chevrons in a flex row | UI-SPEC spec'd to the pixel; no library can shape it more precisely |
| Streak algorithm via Dexie iteration inside component | Inline date math in component with per-day counts | `streak.svc.ts:getCurrentStreakCount()` with one range query + backward walk | Service-layer encapsulation rule (ARCHITECTURE.md Pattern 1) |
| JSON export of day | — | Deferred to Phase 4 | Right-slot reserved in DayDetailHeader |
| Confirmation modal for delete | — | Follow Phase 2 D-04 NONE policy | Already locked |

---

## Common Pitfalls (Phase 3-specific)

### Pitfall 1: Per-cell IDB query (Anti-Pattern 3 — PROJECT-LEVEL HARD-FAIL)

**What goes wrong:** Each DayCell issues its own `useLiveQuery` for PT/meals/steps/lifts → 42 × 4 = 168 parallel subscriptions per render.
**Why it happens:** Looks natural ("each cell owns its data") — but the database must answer 168 range-scans on every write.
**How to avoid:** `MonthGrid` owns ONE `useMonthStreakData(year, month0)` hook; passes each cell its slice via `map.get(dayKey)`. `DayCell` takes data as props and never calls `useLiveQuery` itself.
**Warning signs:** Any `useLiveQuery` or `useEffect(async fetch)` inside `DayCell.tsx`. Plan-checker MUST reject.

### Pitfall 2: Dayjs/date-fns drift (Pitfall #4 cousin)

**What goes wrong:** Developer introduces `date-fns` for month navigation, uses `format(new Date(), 'yyyy-MM-dd')` → returns UTC-formatted string → days west of UTC shift by one after 7pm local.
**Why it happens:** date-fns `format` is locale-aware but timezone-permissive; without explicit `setHours(12)` anchoring it can still round wrong.
**How to avoid:** Do NOT install date-fns or dayjs. Use `src/lib/dayKey.ts:dateToKey` + native `Date` for month math. The 40 LOC in §2 is the complete inventory.
**Warning signs:** Any import of `date-fns`, `dayjs`, `luxon`, or any `toISOString()` call in the calendar feature.

### Pitfall 3: Streak anxiety (Pitfall #6 from PITFALLS.md)

**What goes wrong:** Zero-log days render as red / hollow / punitive, making a missed day feel like failure and triggering all-or-nothing abandonment.
**Why it happens:** Streak UIs are binary by default; the 4-segment model is specifically designed to break the binary, but is only effective if executed correctly.
**How to avoid:** Never red. Never empty-shame. `--surface` is the ONLY zero-state color. 1/4, 2/4, 3/4 ALL read as positive accent-tinted progress. D-09 alpha ramp ensures 4/4 is the only "fully bright" state — but 1/4, 2/4, 3/4 are still visibly accent-colored.
**Warning signs:** Any use of `#ef4444` / destructive / red on a DayCell. Any "streak broken" / "missed" / flame-emoji copy. Reject at plan-check.

### Pitfall 4: Past-day dayKey typos break edit

**What goes wrong:** A developer types `'2026-4-21'` (missing zero-pad) in a test or a route hardcode; the key fails to match any DB record; edits silently no-op.
**Why it happens:** Raw string construction bypasses `dateToKey` which pads.
**How to avoid:** Route validation regex `/^\d{4}-\d{2}-\d{2}$/` catches malformed keys (§6). Test keys go through `dateToKey(new Date(...))` only.
**Warning signs:** Hardcoded `'2026-4-21'`-style strings anywhere in new code.

### Pitfall 5: `useLiveQuery` observing too few tables

**What goes wrong:** Developer splits the streak.svc.ts into 4 hooks ("one per table"), thinking it's cleaner. The 4 Map fragments must then be merged in the component, AND each fires independently → 4 cascading re-renders per write.
**Why it happens:** Premature separation-of-concerns misfire.
**How to avoid:** ONE `useLiveQuery` calling ONE service function that queries 4 tables. Re-read ARCHITECTURE.md §"Pattern for the streak calendar" (:430-443).
**Warning signs:** Multiple `useLiveQuery` calls in `useMonthStreakData`; any split of `getStreakDataForRange` into per-table exports.

### Pitfall 6: Wrong `.between()` inclusivity

**What goes wrong:** `.between(start, end)` defaults to `(lowInclusive=true, highInclusive=false)` → last day of month is missed.
**Why it happens:** Dexie docs mention the default in passing; easy to forget.
**How to avoid:** ALWAYS pass `.between(startKey, endKey, true, true)` explicitly. Verified in §3 code sketch.
**Warning signs:** Any `.between(a, b)` without the two boolean trailing args.

---

## Code Examples

### Right pattern — month-grid streak hook (§3)

See §3 "The RIGHT pattern (one hook, four range queries in one Promise.all)" — the full pattern with query, aggregation, and hook wrap.

### DayCell rendering primitive (§4)

See §4 full `DayCell.tsx` sketch.

### Route registration (§6)

```tsx
// src/App.tsx — additive change
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayScreen } from './routes/TodayScreen';
import { CalendarScreen } from './routes/CalendarScreen';
import { SettingsScreen } from './routes/SettingsScreen';
import { DayDetail } from './features/calendar/DayDetail'; // NEW

export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/day/:dayKey" element={<DayDetail />} /> {/* NEW */}
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
```

### Additive delete service functions (§6)

```typescript
// pt.svc.ts — append after saveSession
export async function deleteSession(id: string): Promise<void> {
  await db.ptSessions.delete(id);
}

// steps.svc.ts — append after getStepsForDay
export async function deleteSteps(dayKey: string): Promise<void> {
  await db.stepEntries.delete(dayKey);
}

// lifts.svc.ts — append after getLiftForDay
export async function deleteLift(dayKey: string): Promise<void> {
  await db.liftCheckins.delete(dayKey);
}
```

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | MAX_SCAN_DAYS = 730 is sufficient for streak-count scan | §7 + Open Judgment Calls #1 | Over-cautious user with 2+ year streak hits a truncated count. Mitigate by bumping cap when/if real usage shows it. |
| A2 | Skip `React.memo(DayCell)` initially | §3, §8 + Open Judgment Calls #2 | 42 unmemoized re-renders may cause jank on low-end devices. Measurable regression → add memo. Unverified because React 19 compiler behavior depends on Vite config. |
| A3 | Accept focus reset to today on DayDetail → Calendar back-nav | §6 + Open Judgment Calls #3 | Minor accessibility regression vs. ideal focus restoration. UI-SPEC:558 is aspirational; tradeoff not explicitly documented there. |
| A4 | `monthMath.ts` in its own file (not inlined into `hooks.ts`) | §2, Open Judgment Calls #6 | None — organizational preference. |
| A5 | `useLiveQuery` returning Map triggers re-render on every write regardless of Map content equality | §3 | If Dexie adds content-equality later, prop-drilling assumptions still hold because we're not relying on reference stability. Verified via dexie.org docs + GitHub discussion #1661 [VERIFIED 2026-04-21]. |
| A6 | Dexie `.between()` on primary-key table has the same inclusive-bounds semantics as on secondary-indexed | §3 | Low — `.between()` is documented at the Collection level, not index-specific. Not explicitly tested in this research but the Dexie Collection API is index-agnostic. |

---

## Open Questions (RESOLVED)

1. **React Compiler enabled in Vite config?** — **RESOLVED: NOT enabled.**
   - Verified `vite.config.ts` lines 29-31: `react()` plugin is invoked with NO options; no `babel-plugin-react-compiler` entry in `package.json`; no React-Compiler-related import anywhere in the config.
   - Implication: A2 (skip `React.memo` on DayCell) is still the correct call per RESEARCH §8 — with 42 pure-JSX re-renders at ~15ms total, memoization is premature optimization regardless of compiler state. If React Compiler is enabled in a later phase, the decision remains correct (the compiler would auto-memoize pure components, making manual memo redundant).
   - Action required by executor: NONE. Proceed without `React.memo`.

2. **Should MonthGrid use `IntersectionObserver` or similar to defer offscreen cell renders?** — **RESOLVED: No.**
   - CalendarScreen fits in-viewport on iPhone without scroll (UI-SPEC:342). 42 cells × pure-JSX render is sub-16ms per RESEARCH §8.
   - Virtualization is premature optimization at this count; any iPhone SE (320px) overflow is handled by standard overflow-y-auto on the AppShell main.
   - Action required by executor: NONE. Render all 42 cells eagerly.

3. **Is there any value in caching the previous-month Map during navigation?** — **RESOLVED: No.**
   - UI-SPEC:691 accepts the brief all-`--surface` flash. Sub-16ms IDB makes the flash imperceptible on the target hardware.
   - Persistent cache would add complexity (cache invalidation on writes) with no measurable UX gain.
   - Action required by executor: NONE. Let useLiveQuery re-subscribe on month nav.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| dexie | streak.svc.ts range queries | ✓ | ^4.0.11 | — |
| dexie-react-hooks | hooks.ts useLiveQuery | ✓ | ^1.1.7 | — |
| react-router-dom | Route + useParams + useNavigate | ✓ | ^7.0.0 | — |
| lucide-react (ChevronLeft/Right) | MonthHeader + DayDetailHeader | ✓ | ^0.468.0 | — |
| @tailwindcss/vite + tailwindcss 4 | `grid-cols-7`, `aspect-square`, tokens | ✓ | ^4.0.0 | — |
| shadcn Card (existing) | Day Detail section wrappers | ✓ | — | — |
| shadcn Sheet (existing) | PT session edit opens from Day Detail | ✓ | — | — |
| Phase 2 services (meals/pt/steps/lifts/goals) | Day Detail data | ✓ | — | — |
| Phase 2 components (MealEntryRow/LiftToggle/StepsInlineInput/etc.) | Day Detail inline edit | ✓ | — | — |

**Missing dependencies with no fallback:** NONE — Phase 3 ships zero new npm installs.

**Missing dependencies with fallback:** NONE.

---

## Security Domain

`security_enforcement` is implicitly enabled. However:

- **Phase 3 is fully local.** No network calls. No auth. No user input crossing a trust boundary that wasn't already crossed in Phase 2.
- **V5 Input Validation:** The ONLY untrusted input surface is the `:dayKey` URL parameter. Validated via regex `/^\d{4}-\d{2}-\d{2}$/` before any database lookup (§6). Malformed redirects silently. No SQL/IDB injection risk — Dexie parameterizes keys natively.
- **V6 Cryptography:** Not applicable.
- **V2/V3/V4 Authentication/Session/Access Control:** Not applicable — single-user, single-device.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes | Regex validation on URL param before IDB lookup; service layer encapsulation prevents arbitrary query injection |
| V6 Cryptography | no | — |

### Threat patterns for this phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed URL param | Tampering | Regex-validate `dayKey`, silent redirect on fail |
| XSS via user-entered notes (lift note, PT notes, food name) | Tampering | React auto-escapes. No `dangerouslySetInnerHTML` anywhere in Phase 3. |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-cell `useQuery` × 42 cells | One range-query service + one `useLiveQuery` | Dexie 3.x+ | Enables month-grid pattern without IDB flood; ARCHITECTURE.md Anti-Pattern 3 codifies |
| date-fns / moment.js for date math | Native `Date` + local-getter-only dayKey | Always for this project | Pitfall #4 — UTC drift is silent data corruption |
| SVG-only calendar grid | CSS grid + div quadrants | Tailwind 2+ | Simpler, equivalent perf for small cell counts |
| `react-activity-calendar` for month heatmap | Hand-rolled MonthGrid | Phase 3 UI-SPEC decision | Library is year-heatmap-shaped; month + 4-segment is orthogonal |

**Deprecated/outdated:**
- `toISOString().split('T')[0]` for dayKey — permanently forbidden (Pitfall #4)
- Storing dates as epoch-ms in IDB and converting per-query — `YYYY-MM-DD` strings are sort-stable and cheaper

---

## Sources

### Primary (HIGH confidence)

- `/Users/anirudhchatterjee/dev/healthtracker/.planning/phases/03-streak-loop/03-CONTEXT.md` — locked D-01..D-12, Claude's Discretion resolutions, deferred items
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/phases/03-streak-loop/03-UI-SPEC.md` — complete UI contract, accessibility, component inventory, route registration, copy
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/research/ARCHITECTURE.md:430-443` — "Pattern for the streak calendar" (the load-bearing pattern)
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/research/ARCHITECTURE.md:795-801` — "Anti-Pattern 3: Deriving Streak State in Every Component" (hard-fail rule)
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/research/PITFALLS.md` §Pitfall 4 (UTC dayKey), §Pitfall 6 (streak anxiety), §Pitfall 1 (tx auto-commit)
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/phases/01-foundation/01-CONTEXT.md:19` (hash routing D-03), `:41-54` (tokens D-15/16/17)
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/phases/02-tracking-slices/02-CONTEXT.md:42` (SET-03 D-14 current-goals), `:172` (D-20 past-day edit scope)
- `/Users/anirudhchatterjee/dev/healthtracker/src/` — all existing Phase 1+2 code (services, schema, tokens, components)
- `/Users/anirudhchatterjee/dev/healthtracker/CLAUDE.md` — project pitfalls (rules #1 and #4 most relevant)
- https://dexie.org/docs/Collection/Collection.between() — `.between(lo, hi, lowInc, highInc)` semantics [CITED 2026-04-21]
- https://dexie.org/docs/dexie-react-hooks/useLiveQuery() — callback-observability semantics (observed tables re-trigger) [CITED 2026-04-21]

### Secondary (MEDIUM confidence)

- https://github.com/dexie/Dexie.js/discussions/1661 — useLiveQuery re-render behavior (no structural equality on return value) [VERIFIED via web search 2026-04-21]
- `/Users/anirudhchatterjee/dev/healthtracker/.planning/research/STACK.md:28` — react-activity-calendar note is now superseded by UI-SPEC:42 decision

### Tertiary (LOW confidence / judgment calls)

- `MAX_SCAN_DAYS = 730` — `[ASSUMED]` — no external data to fix this; planner may override
- `React.memo(DayCell)` tradeoff — `[ASSUMED]` — depends on React 19 compiler status in this project

---

## Metadata

**Confidence breakdown:**
- User constraints (locked decisions): HIGH — directly quoted from CONTEXT.md + UI-SPEC.md
- Stack + library: HIGH — package.json verified; `react-activity-calendar` decision carried forward from UI-SPEC lock
- Streak service pattern: HIGH — ARCHITECTURE.md prescribes the exact shape; Dexie docs confirm `.between()` and `useLiveQuery` semantics
- DayCell rendering: HIGH — UI-SPEC:402 locks div+CSS grid; code sketch confirmed against existing Phase 1+2 code style
- Routing: HIGH — App.tsx shows existing HashRouter pattern; one-line additive change
- Streak algorithm: MEDIUM — algorithm is straightforward, but `MAX_SCAN_DAYS` is a judgment call
- Performance budget: MEDIUM — 30ms budget per UI-SPEC is achievable; no measured verification
- Past-day edit/delete: HIGH — existing Phase 2 services cover 95%; three 1-line additives plug the rest

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stack is stable, UI-SPEC is locked, Dexie/React versions unlikely to churn)

## RESEARCH COMPLETE
