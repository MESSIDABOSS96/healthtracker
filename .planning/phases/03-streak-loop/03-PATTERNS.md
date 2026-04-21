# Phase 3: Streak Loop — Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 13 new/modified (8 new features, 2 new services, 1 new route shell, 3 modified)
**Analogs found:** 12 / 13 (one file — `streak.svc.ts` — has a partial analog only; see "No Analog Found")

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/streak.svc.ts` | service (multi-store read) | CRUD — read-only, 4-table range query | `src/services/meals.svc.ts` (`getDailyTotals`) + `src/services/food.svc.ts` (multi-step pattern) | **partial** — no existing 4-table `Promise.all` precedent; best single-table `.where('dayKey').equals()` analog is `meals.svc.ts:69-83` |
| `src/features/calendar/monthMath.ts` | utility (pure functions) | transform | `src/lib/dayKey.ts` | **exact** (domain + dependency) |
| `src/features/calendar/hooks.ts` | hook (useLiveQuery wrappers) | request-response (reactive) | `src/features/food/hooks.ts` | **exact** |
| `src/features/calendar/DayCell.tsx` | component (atomic, interactive) | request-response (navigate on click) | `src/features/food/MealEntryRow.tsx` (button + inline edit pattern) + `src/components/ui/button.tsx` (focus-ring tokens) | **role-match** — no existing component uses `--accent-25/50/75/100`; Phase 3 is first consumer |
| `src/features/calendar/MonthGrid.tsx` | component (list/grid composer) | request-response (renders Map) | `src/features/food/TodayMealList.tsx` (maps hook data → grouped cells) | **role-match** |
| `src/features/calendar/StreakCount.tsx` | component (stat display) | request-response | `src/features/steps/StepsSection.tsx` (hook value → text w/ fallback) | **role-match** |
| `src/features/calendar/StreakCalendar.tsx` | component (top-level container) | request-response | `src/routes/TodayScreen.tsx` (thin composer of feature sections) | **exact** |
| `src/features/calendar/MonthHeader.tsx` | component (chrome w/ prev/next) | event-driven (user nav) | `src/components/TabBar.tsx` (NavLink pattern) + `src/features/lifts/LiftSection.tsx` (conditional render) | **role-match** |
| `src/features/calendar/WeekdayHeader.tsx` | component (static labels) | — | (none — static labels, inline trivially) | **n/a** |
| `src/features/calendar/DayDetail.tsx` | component (feature composer) | request-response | `src/routes/TodayScreen.tsx` (4-section composer — this is the per-day analog) | **exact** |
| `src/features/calendar/DayDetailHeader.tsx` | component (chrome) | — | `src/components/AppShell.tsx` (header slot pattern) | **role-match** |
| `src/features/calendar/DayDetailSection.tsx` | component (generic wrapper) | — | `src/components/ui/card.tsx` (Card primitive) | **exact** |
| `src/routes/DayDetailScreen.tsx` | route shell (reads `useParams`) | request-response | `src/routes/CalendarScreen.tsx` / `src/routes/TodayScreen.tsx` (thin screen shells) | **role-match** — no existing route uses `useParams`; Phase 3 is first |
| `src/App.tsx` (MODIFIED) | router | — | itself — add one `<Route>` | **exact (self)** |
| `src/routes/CalendarScreen.tsx` (MODIFIED) | route screen | — | `src/routes/TodayScreen.tsx` (replace stub with feature composer) | **exact** |
| `src/services/pt.svc.ts` (MODIFIED — add `deleteSession`) | service write | CRUD — delete | `src/services/meals.svc.ts:63-65` (`deleteMealEntry`) | **exact** |
| `src/services/steps.svc.ts` (MODIFIED — add `deleteSteps`) | service write | CRUD — delete | `src/services/meals.svc.ts:63-65` (`deleteMealEntry`) | **exact** |
| `src/services/lifts.svc.ts` (MODIFIED — add `deleteLift`) | service write | CRUD — delete | `src/services/meals.svc.ts:63-65` (`deleteMealEntry`) | **exact** |

---

## Pattern Assignments

### `src/services/streak.svc.ts` (service, multi-store read-only)

**Primary analog:** `src/services/meals.svc.ts` — closest existing service-shape (plain async functions, top-of-file header comment, no transactions for reads).
**Caveat:** No existing service executes `Promise.all` across >1 store. Research §3 (`03-RESEARCH.md:166-289`) is the load-bearing sketch; planner must treat it as the source, using meals.svc.ts only for *service-file hygiene* (header comment, import order, `db` aliasing, function-export shape).

**Service-file hygiene pattern** (from `src/services/meals.svc.ts:1-15`):
```typescript
// src/services/meals.svc.ts
// Meal-entry CRUD + denormalized day totals (FOOD-06: computed* fields on MealEntry avoid runtime joins).
// All dayKey values are passed in by callers — services never call new Date() to derive dayKey (Pitfall #4).
// Single-statement Dexie puts auto-transaction; no explicit wrapper needed (Pitfall #1).

import { db } from '@/db/db';
import type { Food, MealEntry, MealBucket } from '@/db/schema';

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
```

**Single-table reduce pattern** (from `src/services/meals.svc.ts:73-83`) — closest existing "read → map/reduce → return domain struct" analog; streak.svc's 4-loop ensure-map-then-fill pattern builds on this shape:
```typescript
export async function getDailyTotals(dayKey: string): Promise<DailyTotals> {
  const entries = await db.mealEntries.where('dayKey').equals(dayKey).toArray();
  return entries.reduce<DailyTotals>(
    (acc, e) => ({
      calories: acc.calories + e.computedCalories,
      proteinG: acc.proteinG + e.computedProteinG,
      carbsG: acc.carbsG + e.computedCarbsG,
      fatG: acc.fatG + e.computedFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
```

**Target pattern (from RESEARCH.md §3):** 4-table `Promise.all` with `.where('dayKey').between(start, end, true, true)`, returning `Map<string, QuadrantState>`. Both bounds inclusive. Read-only — **no `db.transaction` wrapper**, Pitfall #1 not applicable. See `03-RESEARCH.md:183-214`.

**Don't copy from meals.svc:** `getRecentFoods` / `getFrequentFoods` (unrelated — aggregate loops over one store).

---

### `src/features/calendar/monthMath.ts` (utility, pure functions)

**Analog:** `src/lib/dayKey.ts` — **primary analog AND a hard dependency**. Every dayKey construction in monthMath MUST route through `dateToKey`/`keyToDate`/`todayKey` (CLAUDE.md rule #3 / Pitfall #4).

**Header comment + local-getter discipline** (from `src/lib/dayKey.ts:1-27`):
```typescript
// src/lib/dayKey.ts
// Single source of truth for day-identity across all stores.
// MUST use local Date getters (year/month/day) — never the UTC ISO-formatting
// path — to avoid UTC-drift on western timezones at night (see
// .planning/research/PITFALLS.md §Pitfall 4 and CLAUDE.md rule #3).

export function todayKey(): string {
  return dateToKey(new Date());
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function keyToDate(key: string): Date {
  // Parse components as local — direct ISO-date parsing would produce UTC midnight.
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

**Apply to monthMath.ts:**
- Header comment noting Pitfall #4 dependency
- Import `dateToKey` / `keyToDate` / `todayKey` and route every Date→string conversion through them
- Use local `.getFullYear()` / `.getMonth()` / `.getDate()` — never `toISOString()` (CLAUDE.md rule #3)
- Expected exports per RESEARCH §9: `firstOfMonth`, `sundayOnOrBefore`, `monthRangeKeys`, `addDays`

---

### `src/features/calendar/hooks.ts` (hook, reactive wrappers)

**Analog:** `src/features/food/hooks.ts` — exact match. Also see `src/features/pt/hooks.ts`, `src/features/steps/hooks.ts`, `src/features/lifts/hooks.ts` — identical shape.

**Hook file pattern** (from `src/features/food/hooks.ts:1-44`):
```typescript
// src/features/food/hooks.ts
// Plan 02-03 (food slice) — useLiveQuery wrappers around meals.svc / food.svc.
// Each hook re-fires when its backing store mutates (any put/delete in mealEntries
// or foods), driving FOOD-07 live-totals reactivity and the picker / chip rows.
//
// Note: useAllFoods is the ONE place in the feature layer that touches `db` directly
// (for orderBy queries the meals service doesn't expose). Acceptable here because
// hooks.ts is already a reactive-read layer, not a UI component. Other features
// should stick to service functions only.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getTodayEntries,
  getDailyTotals,
  // ...
} from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function useTodayEntries() {
  return useLiveQuery(() => getTodayEntries(todayKey()), []);
}

export function useDailyTotals() {
  return useLiveQuery(() => getDailyTotals(todayKey()), []);
}
```

**Dependency-array discipline** (from `src/features/pt/hooks.ts:7-9`): empty `[]` is correct when the query fn reads `todayKey()` internally — the observable refires on any write to the queried tables regardless. For Phase 3 `useMonthStreakData(year, month0)`, deps MUST be `[startKey, endKey]` per RESEARCH `03-RESEARCH.md:226-229` (year/month change must resubscribe).

**Parameterized-hook analog** (from `src/features/food/hooks.ts:42-44`):
```typescript
export function useLastServingsForFood(foodId: string) {
  return useLiveQuery(() => getLastServingsForFood(foodId), [foodId]);
}
```
— structure for `useDayDetail(dayKey)` and `useMonthStreakData(year, month0)`.

---

### `src/features/calendar/DayCell.tsx` (component, atomic interactive)

**Primary analog:** `src/features/food/MealEntryRow.tsx` (for `<button>`-as-card + inline-state pattern).
**Target sketch:** `03-RESEARCH.md:296-346` — that is the authoritative DayCell code; use MealEntryRow only for ambient conventions (focus ring, accessibility, tailwind tokens).

**Button-with-focus-ring pattern** (from `src/features/food/MealEntryRow.tsx:58-68`):
```typescript
<button
  type="button"
  onClick={() => setEditing(true)}
  className="w-full flex items-center justify-between py-3 text-left hover:bg-border/20 px-2 rounded-md"
>
  <span className="text-sm text-text">
    {food?.name ?? '—'} · {entry.servings}× {food?.servingLabel ?? ''}
  </span>
  <span className="text-xs text-muted lowercase">{entry.bucket}</span>
</button>
```

**Canonical focus-visible ring tokens** (from `src/components/ui/button.tsx:14`):
```typescript
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
```
(Also repeated in `MealEntryRow.tsx:91` and `MealEntryRow.tsx:106`. Apply this token stack verbatim to DayCell's `<button>`.)

**Alpha-ramp tokens** (from `src/styles/tokens.css:17-21`) — **Phase 3 is the first consumer**:
```css
/* DayCell partial-fill alpha ramp (D-17) — declared in Phase 1, consumed in Phase 3 */
--accent-25:   rgba(34, 197, 94, 0.25);
--accent-50:   rgba(34, 197, 94, 0.50);
--accent-75:   rgba(34, 197, 94, 0.75);
--accent-100:  #22c55e;
```
Access via `var(--accent-25)` etc. in inline `style={{ backgroundColor: ... }}` (no Tailwind utility exists for these — tokens.css only declares them as CSS vars). Pattern: `['var(--surface)', 'var(--accent-25)', 'var(--accent-50)', 'var(--accent-75)', 'var(--accent-100)']` indexed by `count`. Source: RESEARCH §4 line 308.

**Don't copy from MealEntryRow:** editing state, servings input, buckets radiogroup — DayCell is non-editing (navigates on click instead).

---

### `src/features/calendar/MonthGrid.tsx` (component, grid composer)

**Analog:** `src/features/food/TodayMealList.tsx` — closest "map over hook data into grouped child cells" pattern.

**Hook-to-grid pattern** (from `src/features/food/TodayMealList.tsx:24-72`):
```typescript
export function TodayMealList() {
  const entries = useTodayEntries();
  const allFoods = useAllFoods();

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [allFoods]);

  if (entries === undefined) return null;
  // ... group, then render
}
```

**Apply to MonthGrid:**
- Take `year`/`month0` props; call `useMonthStreakData(year, month0)` to get `{ data, cells }`
- When `data === undefined`, UI-SPEC:690 says render 42 cells as 0/4 surface (NOT `return null` — that differs from the TodayMealList `return null` pattern); don't copy the null-return
- Map `cells` (from `monthMath.monthRangeKeys`) → `<DayCell>` children, reading per-key from `data ?? new Map()`
- **Roving tabindex** local state via `useState<string>(focusedDayKey)` per RESEARCH §4 `03-RESEARCH.md:384` — not Zustand

**Loading-state divergence from analog:** TodayMealList returns null while loading; DayCell grid renders 42 surface cells. Don't copy the `return null` — per `03-UI-SPEC.md:690-691`.

---

### `src/features/calendar/StreakCount.tsx` (component, stat display)

**Analog:** `src/features/steps/StepsSection.tsx` — closest "hook value + text w/ sentinel fallback" pattern.

**Value-to-text with fallback** (from `src/features/steps/StepsSection.tsx:20-36`):
```typescript
export function StepsSection() {
  const steps = useStepsForDay();
  const goals = useGoals();
  const [editing, setEditing] = useState(false);

  const count = steps?.count ?? 0;
  const target = goals?.steps ?? 0;

  const statusText =
    steps && target > 0
      ? `${count} / ${target}`
      : steps && target === 0
        ? `${count}`
        : !steps && target > 0
          ? `0 / ${target}`
          : '—';
  // ...
}
```

**Apply to StreakCount:**
- Call `useCurrentStreakCount()` (from `hooks.ts`)
- Derive count + hero line + subtitle per UI-SPEC §Streak Count copy rules
- Use `text-text` / `text-muted` / `text-accent` color classes (matches Phase 1 token scale)
- No loading spinner — render `0` or placeholder per UI-SPEC; see StepsSection's `?? 0` coalescing.

---

### `src/features/calendar/StreakCalendar.tsx` (component, top-level composer)

**Analog:** `src/routes/TodayScreen.tsx` — thin composer that stacks feature sections vertically.

**Composer pattern** (from `src/routes/TodayScreen.tsx:14-23`):
```typescript
export function TodayScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <PTSection />
      <FoodSection />
      <StepsSection />
      <LiftSection />
    </div>
  );
}
```

**Apply to StreakCalendar:**
- Outer `div` with `px-4 py-6 space-y-4` (matches Phase 1/2 screen rhythm — don't diverge)
- Stack: `<StreakCount />`, `<MonthHeader />`, `<WeekdayHeader />`, `<MonthGrid />`
- Own the current-view-month state (`useState<{year, month0}>`) and pass year/month0 to children + handle prev/next from MonthHeader

---

### `src/features/calendar/MonthHeader.tsx` (component, chrome with nav)

**Analog:** No exact match. Combine two patterns:
1. **Disabled-button chevron** — closest is `src/components/ui/button.tsx` (Button primitive with `disabled:pointer-events-none disabled:opacity-50` at line 13).
2. **Conditional content** — `src/features/lifts/LiftSection.tsx:27-50` (conditional `lifted && (...)`)  .

**Disabled button semantics** (from `src/components/ui/button.tsx:9-14`):
```typescript
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'text-sm font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
  ].join(' '),
```
Use `<Button variant="ghost" size="icon" disabled={prevDisabled}>` + `<ChevronLeft />` from `lucide-react` (imported already per `src/components/AppShell.tsx:3` and `src/components/TabBar.tsx:2` for `Home`/`CalendarDays`/`Settings`).

**Prev/next clamp logic:** per `03-RESEARCH.md:410-415` — `prevDisabled` when `{year,month0} === monthOf(getEarliestDayKey())`; `nextDisabled` when `{year,month0} === monthOf(todayKey())`.

---

### `src/features/calendar/WeekdayHeader.tsx` (component, static labels)

**No analog needed** — 7-column grid of `aria-hidden="true"` labels (`Sun Mon Tue Wed Thu Fri Sat`). Use `grid grid-cols-7 gap-1` to match MonthGrid column rhythm. Match Phase 1 typography: `text-xs text-muted uppercase tracking-wide` (reused pattern from `src/features/food/TodayMealList.tsx:48`):
```typescript
<h2 className="text-xs text-muted uppercase tracking-wide mt-4">Today</h2>
```

---

### `src/features/calendar/DayDetail.tsx` (component, per-day composer)

**Analog:** `src/routes/TodayScreen.tsx` — **perfect structural twin**. DayDetail = TodayScreen, but for an arbitrary `dayKey` instead of `todayKey()`.

**Applied pattern:** use `TodayScreen.tsx:14-23` (see StreakCalendar section above) as the stacking-sections shape. The difference:
- Each section must be fed a `dayKey` prop (existing Phase 2 sections currently hardcode `todayKey()` inside their hooks)
- Phase 2 services already accept `dayKey` arg (`getTodayEntries(dayKey)`, `getTodaySessions(dayKey)`, `getStepsForDay(dayKey)`, `getLiftForDay(dayKey)` — see `03-RESEARCH.md:650-656`), so DayDetail bypasses the existing hooks and calls services directly via `useLiveQuery(() => svcFn(dayKey), [dayKey])` — or adds parameterized hook variants to `calendar/hooks.ts`.

**Edit/delete wiring** (per `03-CONTEXT.md:103` + `<code_context>`):
- Meal edit/delete — reuse `MealEntryRow` verbatim (`src/features/food/MealEntryRow.tsx:24`)
- PT session edit — reuse `PTSheet` + `PTSessionForm` (`src/features/pt/PTSheet.tsx:23`, `PTSessionForm`)
- Steps edit — reuse `StepsInlineInput` (`src/features/steps/StepsInlineInput.tsx`)
- Lift edit — reuse `LiftToggle` + `LiftNoteInput` (`src/features/lifts/LiftToggle.tsx`, `LiftNoteInput.tsx`)

**Critical — D-14 current-goals policy** (from `src/features/settings/hooks.ts` + CONTEXT `03-CONTEXT.md:87-88`):
- DayDetail food totals compare against `useGoals()` (CURRENT goals), NEVER a per-day snapshot. Copy the Food section pattern verbatim — it already does this.

**Don't copy from TodayScreen:** the `todayKey()` implicit assumption in child sections. DayDetail must thread `dayKey` through.

---

### `src/features/calendar/DayDetailHeader.tsx` (component, chrome)

**Analog:** `src/components/AppShell.tsx:23-34` — the app header (back-nav icon + title + right slot).

**Sticky header pattern** (from `src/components/AppShell.tsx:23-34`):
```typescript
<header className="safe-area-top sticky top-0 z-40 bg-surface border-b border-border">
  <div className="h-14 flex items-center justify-between px-4">
    <span className="text-xl font-semibold">HealthTracker</span>
    <Link
      to="/settings"
      aria-label="Settings"
      className="text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md p-2"
    >
      <SettingsIcon size={20} />
    </Link>
  </div>
</header>
```

**Apply to DayDetailHeader:**
- Back button via `useNavigate()` with `onClick={() => navigate(-1)}` + `<ChevronLeft />`
- Center: formatted date ("Monday, April 20, 2026") from `keyToDate(dayKey)`
- Right slot: empty (reserved for Phase 4 per `03-RESEARCH.md:695`)
- Reuse the exact focus-ring classes from AppShell's Settings Link

---

### `src/features/calendar/DayDetailSection.tsx` (component, generic wrapper)

**Analog:** `src/components/ui/card.tsx` — exact match. Also see how `src/features/food/FoodSection.tsx:36` applies Card as the section chrome.

**Card usage pattern** (from `src/features/food/FoodSection.tsx:36-40`):
```typescript
<Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
  <div className="flex items-baseline justify-between">
    <h2 className="text-base font-semibold text-text">Food</h2>
    <span className="text-sm text-muted">{statusText}</span>
  </div>
  {/* ...content... */}
</Card>
```

**Apply to DayDetailSection:** thin wrapper around `<Card>` with props `{ title: string, children: ReactNode }`. Same tailwind classes as FoodSection's Card for visual continuity.

---

### `src/routes/DayDetailScreen.tsx` (route shell, reads useParams)

**Analog:** `src/routes/CalendarScreen.tsx` (Phase 1 stub — the body is what's being replaced in this very phase) + `src/routes/TodayScreen.tsx` (3-line screen shell).

**Thin screen shell** (from `src/routes/TodayScreen.tsx:14-23`) — see StreakCalendar section above for the excerpt.

**New pattern — `useParams` read:** No existing route uses `useParams`. Planner introduces it here per `react-router-dom`. Recommended shape:
```typescript
import { useParams, Navigate } from 'react-router-dom';
import { DayDetail } from '@/features/calendar/DayDetail';

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();
  // Validate via regex or try/catch around keyToDate — if invalid, redirect.
  if (!dayKey || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return <Navigate to="/calendar" replace />;
  }
  return <DayDetail dayKey={dayKey} />;
}
```
**No existing `<Navigate>` usage for invalid-param redirect** — closest precedent is `src/App.tsx:14` (`<Navigate to="/today" replace />`). Match that API usage.

---

### `src/App.tsx` (MODIFIED — register new route)

**Pattern is self-referential** (from `src/App.tsx:9-22`):
```typescript
export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
```
**Add one line:** `<Route path="/day/:dayKey" element={<DayDetailScreen />} />` (placed between `/calendar` and `/settings` is cleanest).

---

### `src/routes/CalendarScreen.tsx` (MODIFIED — replace stub body)

**Current state** (entire file, `src/routes/CalendarScreen.tsx:1-11`):
```typescript
/**
 * Calendar screen — Phase 1 stub (D-06).
 * Phase 3 replaces with the 4-segment month grid + streak count.
 */
export function CalendarScreen() {
  return (
    <div className="flex items-center justify-center min-h-full px-4 py-6">
      <p className="text-sm text-muted">{'Coming in Phase 3'}</p>
    </div>
  );
}
```
**Replacement pattern** mirrors `src/routes/TodayScreen.tsx:14-23` (see StreakCalendar section): wrap the new `<StreakCalendar />` container in a `<div className="px-4 py-6 space-y-4">` and that's the whole screen body. No `AppShell` wrapping — Phase 1 App.tsx already nests routes inside `<AppShell>`.

---

### Service delete additions — `pt.svc.ts`, `steps.svc.ts`, `lifts.svc.ts` (MODIFIED)

**Canonical analog:** `src/services/meals.svc.ts:63-65`:
```typescript
export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id);
}
```

Secondary — template-delete precedent in same file family (`src/services/pt.svc.ts:26-28`):
```typescript
export async function deleteTemplate(id: string): Promise<void> {
  await db.ptTemplates.delete(id);
}
```

**Per-service apply:**

| Target file | New function | Delete key | Signature |
|-------------|--------------|------------|-----------|
| `src/services/pt.svc.ts` | `deleteSession(id)` | `id` (PK) | `export async function deleteSession(id: string): Promise<void> { await db.ptSessions.delete(id); }` |
| `src/services/steps.svc.ts` | `deleteSteps(dayKey)` | `dayKey` (natural PK per `src/db/db.ts:61`) | `export async function deleteSteps(dayKey: string): Promise<void> { await db.stepEntries.delete(dayKey); }` |
| `src/services/lifts.svc.ts` | `deleteLift(dayKey)` | `dayKey` (natural PK per `src/db/db.ts:62`) | `export async function deleteLift(dayKey: string): Promise<void> { await db.liftCheckins.delete(dayKey); }` |

**Steps/Lift take `dayKey` not `id`** — schema difference: `stepEntries` and `liftCheckins` use `dayKey` as PK (see `src/db/db.ts:61-62`), unlike `mealEntries`/`ptSessions` which use `id`. Match `meals.deleteMealEntry`'s one-liner shape; swap the PK type per table.

**Single-statement Dexie delete auto-transactions** (header comment precedent in `pt.svc.ts:3`, `steps.svc.ts:1-3`, `lifts.svc.ts:1-4`) — no `db.transaction` wrapper needed; Pitfall #1 not applicable.

---

## Shared Patterns

### 1. Header comment discipline (all services + utils)

**Source:** every existing service file top (`meals.svc.ts:1-4`, `pt.svc.ts:1-3`, `steps.svc.ts:1-3`, `lifts.svc.ts:1-4`, `food.svc.ts:1-7`).

**Shape:**
```typescript
// src/services/<name>.svc.ts
// <one-line purpose>.
// <pitfall-discipline note — usually Pitfall #4 (dayKey) and #1 (txn)>.
```

**Apply to:** `streak.svc.ts` (MUST note it is read-only so Pitfall #1 not applicable), `monthMath.ts` (MUST note routing through `dayKey.ts`), `calendar/hooks.ts` (note `useLiveQuery` observes all tables touched).

---

### 2. `db` dependency direction

**Rule** (from `03-CONTEXT.md:123` + research ARCHITECTURE):
- Services import `{ db } from '@/db/db'` — yes
- Features import services — yes
- Features import `db` directly — **forbidden**, one documented exception at `src/features/food/hooks.ts:38-40` (`useAllFoods` for `db.foods.orderBy('name')`) which is explicitly flagged in that hook's header comment as the sole allowed case

**Apply to:** `DayCell`, `MonthGrid`, `StreakCount`, `DayDetail`, `DayDetailHeader`, `DayDetailSection`, `StreakCalendar`, `DayDetailScreen` — all go through `streak.svc.ts` + Phase 2 services via `calendar/hooks.ts`. **Never `import { db }` in a feature component.**

---

### 3. Focus-visible ring token stack (all interactive elements)

**Source:** `src/components/ui/button.tsx:14` (canonical), echoed in `MealEntryRow.tsx:91,106`, `AppShell.tsx:29`, `TabBar.tsx:29`, `StepsSection.tsx` and `StepsInlineInput.tsx`.

**Token stack** (verbatim):
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg
```

**Apply to:** DayCell button, MonthHeader chevrons, DayDetailHeader back-button, any interactive element in DayDetail that's not already a reused Phase 2 component.

---

### 4. Color token conventions (surface/text/muted/border/accent)

**Source:** `src/styles/tokens.css:6-22` + Tailwind class usage across all feature components.

**Tailwind utility map** (verified live across codebase):
- `bg-bg` / `bg-surface` / `bg-border` / `bg-accent`
- `text-text` / `text-muted` / `text-accent`
- `border-border` / `border-accent`
- `ring-accent` / `ring-offset-bg`

**For DayCell alpha ramp** — no Tailwind utility exists for `--accent-25/50/75/100`. Use inline `style={{ backgroundColor: 'var(--accent-25)' }}` pattern per RESEARCH §4:308. This is the one place the codebase will have inline style backgrounds; document the why in the component header comment.

---

### 5. Card primitive for section chrome

**Source:** `src/components/ui/card.tsx:8-17` declares Card + CardHeader + CardTitle + CardContent. Phase 2 usage (`FoodSection.tsx:36`, `StepsSection.tsx:38`, `LiftSection.tsx:22`, `PTSection.tsx:36`, `SettingsScreen.tsx:31`) standardized on:
```typescript
<Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
```

**Apply to:** `DayDetailSection` + any Phase 3 section wrapper. Don't introduce a new wrapper — reuse Card.

---

### 6. `useLiveQuery` + `undefined`-on-first-paint convention

**Source:** `src/features/steps/hooks.ts:10-12`, `src/features/food/hooks.ts:22-40`, etc.

**Handling patterns across the codebase:**
- `TodayMealList.tsx:34` — `if (entries === undefined) return null;` (silent skip)
- `PTSheet.tsx:35-38` — `if (templates === undefined) { return <div />; }` (render empty placeholder)
- `StepsSection.tsx:25` — `const count = steps?.count ?? 0;` (coalesce to default)

**Apply to Phase 3:**
- `MonthGrid` — **don't return null** (UI-SPEC:690 explicitly requires 42 surface-fill cells on undefined data). Diverges from TodayMealList's null-return; follow `StepsSection`'s coalesce style: treat `data ?? new Map()` as default.
- `StreakCount` — coalesce missing count to `0` or render dash per UI-SPEC copy rules.
- `DayDetail` — each section handles its own `undefined` case via Phase 2 components' existing patterns.

---

### 7. Anti-motion policy carries forward

**Source:** `src/components/ProgressBar.tsx:4` comment ("Fill width updates instantly — no CSS tween property"), `src/features/food/FoodSection.tsx:70` / `src/features/pt/PTSection.tsx:47` (`data-[state=open]:animate-none data-[state=closed]:animate-none` on Sheet).

**Apply to Phase 3:**
- DayCell fill state changes: instant, no `transition-colors` on the quadrant divs
- Today ring: static 1px outline, no pulse
- Month transition: instant (UI-SPEC:512 and RESEARCH §5)
- 4/4 chrome: explicitly NONE per CONTEXT D-12 — no glow, no ring, no animation

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/services/streak.svc.ts` (partial — the Promise.all-over-4-tables shape) | service (multi-store read) | CRUD read | No existing service queries more than one table in parallel. `meals.svc.getDailyTotals` is the nearest shape but only touches one table. Planner must use `03-RESEARCH.md:183-214` as the source-of-truth sketch; meals.svc only contributes service-file hygiene (header comment style, import order, interface-export shape). Zero existing precedent for `.where('dayKey').between(a, b, true, true)` either — only `.where('dayKey').equals()` is used today. |
| `src/routes/DayDetailScreen.tsx` (the `useParams` piece specifically) | route shell | — | No existing route reads URL params — `App.tsx` only has 3 static routes + a `/` redirect. Planner introduces `useParams<{dayKey: string}>()` here for the first time. The screen-shell shape is reused from TodayScreen; only the params read is novel. Validate `dayKey` format via regex `/^\d{4}-\d{2}-\d{2}$/` and fall through to `<Navigate to="/calendar" replace />` (same `<Navigate>` API already used in `App.tsx:14`). |
| `src/features/calendar/WeekdayHeader.tsx` | component (static labels) | — | Trivial — no analog needed; inline constants. Not a gap, just not worth copying from anywhere. |

---

## Metadata

**Analog search scope:** `src/services/` (6 files), `src/features/*/` (all 5 features), `src/routes/` (3 files), `src/components/` + `src/components/ui/` (10 files), `src/lib/` (7 files), `src/App.tsx`, `src/db/db.ts`, `src/styles/tokens.css`.

**Files scanned:** 41 TypeScript/TSX + 1 CSS.

**Key cross-cuts observed:**
- Every service file opens with a 2–4 line header comment citing Pitfalls #1 and #4 where relevant — enforce on `streak.svc.ts`.
- Every `useLiveQuery` wrapper lives in `src/features/<area>/hooks.ts` with empty `[]` deps UNLESS the query is parameterized (then `[param]`). `calendar/hooks.ts` follows this.
- No component in the codebase currently uses `--accent-25/50/75/100`; Phase 3 DayCell is the first consumer per `03-CONTEXT.md:116` and `tokens.css:17` comment.
- `react-router-dom`'s `useNavigate`, `NavLink`, `Link`, `HashRouter`, `Route`, `Routes`, `Navigate` are already in use — `useParams` is the only new import.
- `lucide-react` icons available via direct import (`Home`, `CalendarDays`, `Settings`, `Settings as SettingsIcon`) — `ChevronLeft` / `ChevronRight` additions are consistent with that pattern.
- Dexie `.where('dayKey').equals(dayKey)` and `.get(dayKey)` patterns established; `.where('dayKey').between(start, end, true, true)` is new to this codebase but uses the same index — verified safe per RESEARCH §3.

**Pattern extraction date:** 2026-04-21.
