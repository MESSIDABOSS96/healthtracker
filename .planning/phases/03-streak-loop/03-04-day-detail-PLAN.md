---
phase: 03-streak-loop
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/pt.svc.ts
  - src/services/steps.svc.ts
  - src/services/lifts.svc.ts
  - src/features/calendar/dayDetailHooks.ts
  - src/features/calendar/DayDetailSection.tsx
  - src/features/calendar/DayDetailHeader.tsx
  - src/features/calendar/DayDetail.tsx
  - src/routes/DayDetailScreen.tsx
  - src/App.tsx
autonomous: false
requirements:
  - STREAK-06
must_haves:
  truths:
    - "Route `/#/day/:dayKey` registered in App.tsx; invalid dayKey param silently redirects to `/calendar` via regex guard `/^\\d{4}-\\d{2}-\\d{2}$/`"
    - "DayDetail renders all 4 areas for the selected dayKey (PT sessions, meals, step entry, lift check-in) with totals (D-14 current-goals policy for food macros)"
    - "Past-day edit reuses EXISTING Phase 2 components: MealEntryRow (food), StepsInlineInput (steps), LiftToggle + LiftNoteInput (lift). PT edit opens existing PT Session Sheet via saveSession."
    - "Past-day delete uses three additive 1-line service functions: deleteSession (pt.svc), deleteSteps (steps.svc), deleteLift (lifts.svc). deleteMealEntry already exists in meals.svc."
    - "No backdated NEW-log adding — Day Detail is edit/delete-only in Phase 3 (CONTEXT `<deferred>`)"
    - "No confirmation modal on delete — inherits Phase 2 D-04 policy (immediate delete, no confirm)"
    - "Files this plan modifies do not overlap with Plans 03-01/02/03 — parallel-safe in Wave 1"
  artifacts:
    - path: "src/services/pt.svc.ts"
      provides: "+ export async function deleteSession(id: string): Promise<void>"
      contains: "deleteSession"
    - path: "src/services/steps.svc.ts"
      provides: "+ export async function deleteSteps(dayKey: string): Promise<void>"
      contains: "deleteSteps"
    - path: "src/services/lifts.svc.ts"
      provides: "+ export async function deleteLift(dayKey: string): Promise<void>"
      contains: "deleteLift"
    - path: "src/features/calendar/dayDetailHooks.ts"
      provides: "useDayDetail(dayKey) — composite read hook for the 4 areas + food totals"
      exports: ["useDayDetail"]
    - path: "src/features/calendar/DayDetailSection.tsx"
      provides: "Generic Card-backed section wrapper with title + body"
      exports: ["DayDetailSection"]
    - path: "src/features/calendar/DayDetailHeader.tsx"
      provides: "Back button + date label + empty right slot header row"
      exports: ["DayDetailHeader"]
    - path: "src/features/calendar/DayDetail.tsx"
      provides: "Per-day composer: header + 4 sections (PT/Food/Steps/Lift) + summary row"
      exports: ["DayDetail"]
    - path: "src/routes/DayDetailScreen.tsx"
      provides: "Route shell: useParams → regex validate → <DayDetail dayKey={valid} /> or <Navigate to='/calendar' replace />"
      exports: ["DayDetailScreen"]
    - path: "src/App.tsx"
      provides: "New <Route path='/day/:dayKey' element={<DayDetailScreen />} /> entry"
      contains: "path=\"/day/:dayKey\""
  key_links:
    - from: "src/App.tsx"
      to: "src/routes/DayDetailScreen.tsx"
      via: "<Route path='/day/:dayKey' element={<DayDetailScreen />} />"
      pattern: "path=\"/day/:dayKey\""
    - from: "src/routes/DayDetailScreen.tsx"
      to: "src/features/calendar/DayDetail.tsx"
      via: "useParams → regex → <DayDetail dayKey={dayKey} /> OR <Navigate to='/calendar' replace />"
      pattern: "\\/\\^\\\\d\\{4\\}-\\\\d\\{2\\}-\\\\d\\{2\\}\\$\\/"
    - from: "src/features/calendar/DayDetail.tsx"
      to: "src/features/calendar/dayDetailHooks.ts:useDayDetail"
      via: "const { sessions, meals, steps, lift, totals } = useDayDetail(dayKey)"
      pattern: "useDayDetail\\(dayKey\\)"
    - from: "Day Detail delete buttons"
      to: "pt/steps/lifts/meals service delete functions"
      via: "onClick = () => deleteX(id|dayKey)"
      pattern: "delete(Session|Steps|Lift|MealEntry)"
---

<objective>
Build the Day Detail surface: a new hash route `/#/day/:dayKey` that renders all four areas' logs + totals for a chosen day, with past-day edit/delete flows wired to existing Phase 2 services + three additive 1-line delete service functions. Route-param is regex-validated; invalid keys silently redirect to `/calendar`.

Purpose: Delivers STREAK-06 — the `/day/:dayKey` navigation destination that completes the calendar-tap-to-detail loop. It's the only Phase 3 screen with a user-influenced route parameter, so it owns the phase's only meaningful threat surface (regex-validated at the route boundary).

Output: 6 new files + 3 modified service files (each 1-line addition) + 1 modified router. Zero schema changes, zero npm installs. Parallel-safe with Plans 03-01/02/03 (zero file overlap).
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
@.planning/phases/02-tracking-slices/02-CONTEXT.md
@CLAUDE.md
@src/App.tsx
@src/services/meals.svc.ts
@src/services/pt.svc.ts
@src/services/steps.svc.ts
@src/services/lifts.svc.ts
@src/lib/dayKey.ts
@src/db/schema.ts
@src/components/ui/card.tsx
@src/features/food/MealEntryRow.tsx
@src/features/food/hooks.ts
@src/features/steps/StepsInlineInput.tsx
@src/features/lifts/LiftToggle.tsx
@src/features/lifts/LiftNoteInput.tsx
@src/features/settings/hooks.ts

<interfaces>
<!-- Existing service signatures — use as-is; no changes except the 3 additive 1-liners. -->

From src/services/meals.svc.ts (pre-existing):
```typescript
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;          // dayKey-agnostic despite name
export async function getDailyTotals(dayKey: string): Promise<DailyTotals>;     // D-14 consumer: totals against CURRENT goals
export async function updateMealEntry(id: string, patch: {servings: number; bucket: MealBucket}): Promise<void>;
export async function deleteMealEntry(id: string): Promise<void>;               // already exists — reuse
```

From src/services/pt.svc.ts (pre-existing):
```typescript
export function getTodaySessions(dayKey: string): Promise<PTSession[]>;         // dayKey-agnostic despite name
export async function saveSession(session: PTSession): Promise<void>;           // upsert by id
// NEEDED: export async function deleteSession(id: string): Promise<void>;       // additive in this plan
```

From src/services/steps.svc.ts (pre-existing):
```typescript
export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined>;
export async function upsertSteps(dayKey: string, count: number): Promise<void>;
// NEEDED: export async function deleteSteps(dayKey: string): Promise<void>;     // additive in this plan
```

From src/services/lifts.svc.ts (pre-existing):
```typescript
export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined>;
export async function toggleLift(dayKey: string): Promise<void>;
export async function setLiftNote(dayKey: string, note: string): Promise<void>;
// NEEDED: export async function deleteLift(dayKey: string): Promise<void>;      // additive in this plan
```

Canonical one-liner delete analog (from src/services/meals.svc.ts:63-65):
```typescript
export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id);
}
```

From src/db/schema.ts — primary keys:
- `ptSessions` PK = `id: string`  → `deleteSession(id)`
- `stepEntries` PK = `dayKey: string` (natural key) → `deleteSteps(dayKey)`
- `liftCheckins` PK = `dayKey: string` (natural key) → `deleteLift(dayKey)`

From src/App.tsx (current — will be modified):
```tsx
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayScreen } from './routes/TodayScreen';
import { CalendarScreen } from './routes/CalendarScreen';
import { SettingsScreen } from './routes/SettingsScreen';

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

Route validation regex (UI-SPEC:302, RESEARCH §6, PATTERNS.md §DayDetailScreen):
```typescript
const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;
```

Card analog (from src/components/ui/card.tsx — use `<Card>` as the section wrapper; pattern from FoodSection.tsx:36):
```tsx
<Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
  <div className="flex items-baseline justify-between">
    <h2 className="text-base font-semibold text-text">{title}</h2>
  </div>
  {children}
</Card>
```

Current goals for D-14 food totals (from src/features/settings/hooks.ts):
```typescript
export function useGoals(): Goals | undefined;
```

AppShell header analog for DayDetailHeader (from src/components/AppShell.tsx, sticky pattern). The Day Detail header is NOT sticky (UI-SPEC:496) — scrolls with content. Use a plain flex row.

Lucide icon: `ChevronLeft` from `lucide-react` (already used by Plan 03-03 MonthHeader — pkg is in package.json already).

UI-SPEC locked copy (lines 240-261) — use verbatim:
- Back button: `aria-label="Back to calendar"`, visible text `Back`, ChevronLeft icon
- Date label format: `{Weekday}, {Month} {Day}` — e.g. `Tuesday, April 21`
- Today suffix: ` (today)` in --muted after date when dayKey === todayKey()
- Summary row: `{N} of 4 logged` centered below date; 0 → `no logs yet`; 4 → `all 4 logged`
- Section titles: `PT`, `Food`, `Steps`, `Lift`
- Empty copy: `No PT session logged on this day.`, `No meals logged on this day.`, `No steps logged on this day.`, `No lift check-in on this day.`
- Food totals: `{cals} cal · {p}g P · {c}g C · {f}g F` (computed against current goals — D-14)
- Delete aria-labels: `Delete PT session`, `Delete step entry`, `Delete lift check-in`
- Lift rows: `✓ Lifted` (lifted=true) or `☐ Rest day` (lifted=false explicit)
- Section order fixed: PT → Food → Steps → Lift (matches Today + DayCell D-08)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add additive delete functions to 3 services + create useDayDetail hook</name>
  <files>src/services/pt.svc.ts, src/services/steps.svc.ts, src/services/lifts.svc.ts, src/features/calendar/dayDetailHooks.ts</files>
  <read_first>
    - src/services/meals.svc.ts lines 63-65 (deleteMealEntry — the canonical 1-liner analog)
    - src/services/pt.svc.ts (full file — append at end; verify deleteSession does NOT already exist)
    - src/services/steps.svc.ts (full file — append at end; verify deleteSteps does NOT already exist)
    - src/services/lifts.svc.ts (full file — append at end; verify deleteLift does NOT already exist)
    - src/db/schema.ts (confirm `ptSessions` PK = `id`, `stepEntries` PK = `dayKey`, `liftCheckins` PK = `dayKey`)
    - src/db/db.ts lines 56-64 (schema declaration — primary key confirmation)
    - src/features/food/hooks.ts (full file — canonical hook-file style + useLiveQuery patterns)
    - src/features/steps/hooks.ts (lines 1-15 — parameterized hook pattern)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §6 lines 455-498 (day-detail service table + 3 additive delete sketches)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"Service delete additions" (lines 459-485)
  </read_first>
  <action>
**Service edits — append 1-line delete functions. Each change is ADDITIVE; do not modify existing functions.**

**File 1 — `src/services/pt.svc.ts`** — append after the last existing function (after `formatRelativeDays`, which is the last export per the current file). Follow the header-comment convention (pitfall notes already in lines 1-3). Add:

```typescript

// ------- Session delete (Phase 3 — past-day delete from Day Detail) -------
// Single-statement Dexie delete auto-transactions (Pitfall #1 not applicable).

export async function deleteSession(id: string): Promise<void> {
  await db.ptSessions.delete(id);
}
```

**File 2 — `src/services/steps.svc.ts`** — append at end of file:

```typescript

// Phase 3 — past-day delete wired from Day Detail. Single-statement Dexie
// delete; no transaction wrapper needed (Pitfall #1 not applicable).
export async function deleteSteps(dayKey: string): Promise<void> {
  await db.stepEntries.delete(dayKey); // stepEntries.dayKey is PK (natural key)
}
```

**File 3 — `src/services/lifts.svc.ts`** — append at end of file:

```typescript

// Phase 3 — past-day delete wired from Day Detail. Single-statement Dexie
// delete; no transaction wrapper needed (Pitfall #1 not applicable).
export async function deleteLift(dayKey: string): Promise<void> {
  await db.liftCheckins.delete(dayKey); // liftCheckins.dayKey is PK (natural key)
}
```

***

**File 4 — Create `src/features/calendar/dayDetailHooks.ts`** — composite read hook.

The hook file is SEPARATE from `src/features/calendar/hooks.ts` (owned by Plan 03-01) to avoid file conflicts between parallel Wave 1 plans. The file is namespaced purely to this plan (`dayDetailHooks.ts`) — downstream (Plan 03-04's own files) import from `./dayDetailHooks`, not `./hooks`. This keeps Wave 1 parallelism clean.

```typescript
// src/features/calendar/dayDetailHooks.ts
// Composite read hook for the Day Detail screen — one useLiveQuery per area
// subscribing to each area's existing service read function + a 5th for the
// food daily totals. 4 tables × 1 dayKey = 5 tiny subscriptions; RESEARCH §6
// §"Day Detail data hook" explicitly accepts this shape (it's different from
// the MonthGrid's range query because scale is 1 day, not 42).
//
// Anti-Pattern 3 note: Anti-Pattern 3 forbids per-CELL queries on a 42-cell
// grid. Day Detail is a single-screen single-day composition, not a grid.
// Five subscriptions with constant cost per write is fine.

import { useLiveQuery } from 'dexie-react-hooks';
import { getTodayEntries, getDailyTotals, type DailyTotals } from '@/services/meals.svc';
import { getTodaySessions } from '@/services/pt.svc';
import { getStepsForDay } from '@/services/steps.svc';
import { getLiftForDay } from '@/services/lifts.svc';
import type { PTSession, MealEntry, StepEntry, LiftCheckin } from '@/db/schema';

export interface DayDetailData {
  sessions: PTSession[] | undefined;
  meals: MealEntry[] | undefined;
  steps: StepEntry | undefined | null;       // undefined = loading; StepEntry|undefined once resolved
  lift: LiftCheckin | undefined | null;
  totals: DailyTotals | undefined;
}

export function useDayDetail(dayKey: string): DayDetailData {
  const sessions = useLiveQuery(() => getTodaySessions(dayKey), [dayKey]);
  const meals    = useLiveQuery(() => getTodayEntries(dayKey), [dayKey]);
  const steps    = useLiveQuery(() => getStepsForDay(dayKey), [dayKey]);
  const lift     = useLiveQuery(() => getLiftForDay(dayKey), [dayKey]);
  const totals   = useLiveQuery(() => getDailyTotals(dayKey), [dayKey]);
  return { sessions, meals, steps, lift, totals };
}
```

The `| null` on steps/lift is cosmetic — `useLiveQuery` returns `undefined` while loading; once loaded, the underlying service returns `StepEntry | undefined`. The compound type is `StepEntry | undefined | null` only if you want to model "explicitly null" separately; simpler `StepEntry | undefined` is acceptable. If TypeScript complains about excess null, drop it.

***

Do NOT:
- Rename any existing service function (`getTodaySessions` is misnamed but DayDetail reuses it as-is per RESEARCH §6 — the codename is accurate to callers).
- Add `deleteSession` anywhere OTHER than pt.svc.ts (DayDetailHeader etc. consume it via import).
- Place `useDayDetail` in `src/features/calendar/hooks.ts` — that file is owned by Plan 03-01 and sharing it between parallel Wave 1 plans causes merge conflicts.
- Wrap the additive delete functions in `db.transaction('rw', ...)` — they're single-statement deletes; Dexie auto-transacts them.
- Add `deleteMealEntry` anywhere — it already exists in meals.svc.ts.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "export async function deleteSession" src/services/pt.svc.ts` is 1
    - `grep -c "export async function deleteSteps" src/services/steps.svc.ts` is 1
    - `grep -c "export async function deleteLift" src/services/lifts.svc.ts` is 1
    - `grep -c "db.ptSessions.delete" src/services/pt.svc.ts` is 1
    - `grep -c "db.stepEntries.delete" src/services/steps.svc.ts` is 1
    - `grep -c "db.liftCheckins.delete" src/services/lifts.svc.ts` is 1
    - `! grep -E "db\\.transaction" src/services/pt.svc.ts | grep -i delete` (no txn wrapper on deleteSession)
    - `! grep -E "db\\.transaction" src/services/steps.svc.ts`
    - `! grep -E "db\\.transaction" src/services/lifts.svc.ts`
    - `test -f src/features/calendar/dayDetailHooks.ts` exits 0
    - `grep -c "export function useDayDetail" src/features/calendar/dayDetailHooks.ts` is 1
    - `grep -c "export interface DayDetailData" src/features/calendar/dayDetailHooks.ts` is 1
    - `grep -c "useLiveQuery" src/features/calendar/dayDetailHooks.ts` is 5 (one per section + totals)
    - `grep -c "\\[dayKey\\]" src/features/calendar/dayDetailHooks.ts` is 5 (parameterized deps on every hook)
    - `! grep -E "from '@/db/db'" src/features/calendar/dayDetailHooks.ts` (hooks go through services, not db direct)
    - `! grep -E "todayKey\\(\\)" src/features/calendar/dayDetailHooks.ts` (the hook uses passed-in dayKey, not today)
    - `grep -c "getTodaySessions\\|getTodayEntries\\|getStepsForDay\\|getLiftForDay\\|getDailyTotals" src/features/calendar/dayDetailHooks.ts` is at least 5
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>3 delete functions added; useDayDetail composite hook created in a plan-private file; all service file headers still cite Pitfall #4 / #1 correctly; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create DayDetailSection.tsx + DayDetailHeader.tsx + DayDetail.tsx</name>
  <files>src/features/calendar/DayDetailSection.tsx, src/features/calendar/DayDetailHeader.tsx, src/features/calendar/DayDetail.tsx</files>
  <read_first>
    - src/components/ui/card.tsx (full file — Card primitive export)
    - src/features/food/FoodSection.tsx lines 33-65 (Card usage analog for section title + subheader pattern)
    - src/features/food/MealEntryRow.tsx (full file — reused verbatim in Day Detail Food section)
    - src/features/steps/StepsInlineInput.tsx (full file — reused for Steps edit)
    - src/features/lifts/LiftToggle.tsx (full file — reused for Lift edit)
    - src/features/lifts/LiftNoteInput.tsx (full file — reused for Lift note)
    - src/features/settings/hooks.ts (useGoals — for D-14 food totals subtitle)
    - src/features/food/hooks.ts (useAllFoods — MealEntryRow requires `food: Food | undefined` prop; need to look up by foodId)
    - src/db/schema.ts (MealBucket enum — needed for Food bucket grouping)
    - src/lib/dayKey.ts (todayKey, keyToDate — for "(today)" suffix + date formatting)
    - src/features/calendar/dayDetailHooks.ts (from Task 1 — useDayDetail contract)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 434-497 (Day Detail layout contract, section order, Card wrappers, header anatomy)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 236-270 (all Day Detail copy — verbatim in implementation)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §DayDetail + §DayDetailHeader + §DayDetailSection (lines 324-389)
  </read_first>
  <action>
**File 1 — `src/features/calendar/DayDetailSection.tsx`** — generic card wrapper.

```tsx
// src/features/calendar/DayDetailSection.tsx
// Generic section wrapper for Day Detail's four area cards (PT/Food/Steps/Lift).
// Mirrors the Card pattern used by src/features/food/FoodSection.tsx:36 so the
// visual rhythm stays consistent with the Today screen.

import { type ReactNode } from 'react';
import { Card } from '@/components/ui/card';

export interface DayDetailSectionProps {
  title: string;
  subtitle?: string;       // e.g. Food macros row; optional
  children: ReactNode;
}

export function DayDetailSection({ title, subtitle, children }: DayDetailSectionProps) {
  return (
    <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </Card>
  );
}
```

***

**File 2 — `src/features/calendar/DayDetailHeader.tsx`** — back button + date + empty right slot.

```tsx
// src/features/calendar/DayDetailHeader.tsx
// Day Detail top chrome — Back affordance, date label, (today) suffix when
// applicable, and a reserved-empty right slot (Phase 4 may add "Export day"
// there per RESEARCH §9 Phase 4 hook-in note). Header is NOT sticky (UI-SPEC:496).

import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { keyToDate, todayKey } from '@/lib/dayKey';

export interface DayDetailHeaderProps {
  dayKey: string;
}

export function DayDetailHeader({ dayKey }: DayDetailHeaderProps) {
  const navigate = useNavigate();
  const d = keyToDate(dayKey);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  const day = d.getDate();
  const isToday = dayKey === todayKey();

  return (
    <div className="flex items-center justify-between h-14 border-b border-border">
      <button
        type="button"
        onClick={() => navigate('/calendar')}
        aria-label="Back to calendar"
        className={
          'flex items-center gap-1 -ml-2 p-2 rounded-md ' +
          'text-muted ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
        }
      >
        <ChevronLeft size={20} aria-hidden="true" />
        <span className="text-sm">Back</span>
      </button>

      <div className="flex flex-col items-center">
        <h1 className="text-base font-semibold text-text">{`${weekday}, ${month} ${day}`}</h1>
        {isToday && <span className="text-xs text-muted">(today)</span>}
      </div>

      {/* Right slot reserved empty — Phase 4 may add "Export day" */}
      <div className="w-[56px]" aria-hidden="true" />
    </div>
  );
}
```

The `w-[56px]` spacer on the right balances the left Back button's effective width (icon + label + `-ml-2 p-2`) so the centered date label stays visually centered. A flex-justify-between + visible-width spacer is simpler than `justify-center` + absolute-positioning the back button.

`navigate('/calendar')` — UI-SPEC:239 allows either `navigate(-1)` or `navigate('/calendar')`. Use explicit `/calendar` because (a) it's deterministic regardless of history, (b) the CalendarScreen unmounts on route change (RESEARCH §6 line 506), so `navigate(-1)` is equivalent in the common case but less clear about intent.

***

**File 3 — `src/features/calendar/DayDetail.tsx`** — the composer. Renders header + summary row + 4 section cards.

```tsx
// src/features/calendar/DayDetail.tsx
// Per-day detail composer for /#/day/:dayKey. Owns no state beyond what its
// reused Phase-2 leaf components own (MealEntryRow inline-edit state,
// StepsInlineInput number state, LiftToggle click state). Reads via one
// composite useDayDetail hook that subscribes to all 4 tables for this dayKey.
//
// D-14 (Phase 2 carry-forward): food totals compare against CURRENT goals —
// useGoals() reads the singleton, no per-day snapshot.
// UI-SPEC `<deferred>`: no backdated NEW-log adding here — edit/delete only.

import { useMemo } from 'react';
import { DayDetailHeader } from './DayDetailHeader';
import { DayDetailSection } from './DayDetailSection';
import { useDayDetail } from './dayDetailHooks';
import { useAllFoods } from '@/features/food/hooks';
import { useGoals } from '@/features/settings/hooks';
import { MealEntryRow } from '@/features/food/MealEntryRow';
import { StepsInlineInput } from '@/features/steps/StepsInlineInput';
import { LiftToggle } from '@/features/lifts/LiftToggle';
import { LiftNoteInput } from '@/features/lifts/LiftNoteInput';
import { deleteSession } from '@/services/pt.svc';
import { deleteSteps } from '@/services/steps.svc';
import { deleteLift } from '@/services/lifts.svc';
import type { Food, MealBucket } from '@/db/schema';

interface DayDetailProps {
  dayKey: string;
}

const BUCKET_ORDER: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function DayDetail({ dayKey }: DayDetailProps) {
  const { sessions, meals, steps, lift, totals } = useDayDetail(dayKey);
  const allFoods = useAllFoods();
  const goals = useGoals();

  const foodById = useMemo(() => {
    const m = new Map<string, Food>();
    (allFoods ?? []).forEach((f) => m.set(f.id, f));
    return m;
  }, [allFoods]);

  // Filled-count summary row (UI-SPEC:243).
  const count =
    Number((sessions?.length ?? 0) >= 1) +
    Number((meals?.length ?? 0) >= 1) +
    Number((steps?.count ?? 0) > 0) +
    Number(lift?.lifted === true);

  const summary =
    count === 0 ? 'no logs yet' :
    count === 4 ? 'all 4 logged' :
                  `${count} of 4 logged`;

  // Food macros subtitle — D-14 against current goals.
  let foodSubtitle: string | undefined;
  if (totals && (meals?.length ?? 0) > 0) {
    foodSubtitle =
      `${Math.round(totals.calories)} cal · ` +
      `${Math.round(totals.proteinG)}g P · ` +
      `${Math.round(totals.carbsG)}g C · ` +
      `${Math.round(totals.fatG)}g F`;
  }
  // Optional: include a trailing "against {target} goal" hint if goals.calories > 0
  // — UI-SPEC leaves copy flexible on this. Skipping for Phase 3 to keep parity
  // with Today's food section where totals are shown without a "vs target" trail.

  // Group meals by bucket (UI-SPEC:459 — reuses Phase 2 D-18 section-grouped layout).
  const mealsByBucket = new Map<MealBucket, typeof meals>();
  for (const b of BUCKET_ORDER) mealsByBucket.set(b, []);
  (meals ?? []).forEach((e) => {
    const bucket = mealsByBucket.get(e.bucket) ?? [];
    bucket.push(e);
    mealsByBucket.set(e.bucket, bucket);
  });

  return (
    <div className="space-y-6">
      <DayDetailHeader dayKey={dayKey} />

      <div className="text-sm text-muted text-center">{summary}</div>

      <DayDetailSection title="PT">
        {(sessions?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No PT session logged on this day.</p>
        )}
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-text">
              {/* Session template name isn't on PTSession — call out that the row is still useful */}
              {`Session · ${s.exercises?.length ?? 0} exercises`}
            </span>
            <button
              type="button"
              aria-label="Delete PT session"
              onClick={() => deleteSession(s.id)}
              style={{ color: '#ef4444' }}
              className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Delete
            </button>
          </div>
        ))}
      </DayDetailSection>

      <DayDetailSection title="Food" subtitle={foodSubtitle}>
        {(meals?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No meals logged on this day.</p>
        )}
        {BUCKET_ORDER.map((bucket) => {
          const entries = mealsByBucket.get(bucket) ?? [];
          if (entries.length === 0) return null;
          return (
            <div key={bucket} className="space-y-1">
              <p className="text-xs text-muted uppercase tracking-wide">{bucket}</p>
              <ul>
                {entries.map((e) => (
                  <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />
                ))}
              </ul>
            </div>
          );
        })}
      </DayDetailSection>

      <DayDetailSection title="Steps">
        {!steps ? (
          <p className="text-sm text-muted">No steps logged on this day.</p>
        ) : (
          <div className="flex items-center justify-between">
            <StepsInlineInput dayKey={dayKey} initialCount={steps.count} />
            <button
              type="button"
              aria-label="Delete step entry"
              onClick={() => deleteSteps(dayKey)}
              style={{ color: '#ef4444' }}
              className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              Delete
            </button>
          </div>
        )}
        {steps && (goals?.steps ?? 0) > 0 && (
          <p className="text-xs text-muted">{`against ${goals!.steps}-step goal`}</p>
        )}
      </DayDetailSection>

      <DayDetailSection title="Lift">
        {!lift ? (
          <p className="text-sm text-muted">No lift check-in on this day.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <LiftToggle dayKey={dayKey} />
              <button
                type="button"
                aria-label="Delete lift check-in"
                onClick={() => deleteLift(dayKey)}
                style={{ color: '#ef4444' }}
                className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Delete
              </button>
            </div>
            <LiftNoteInput dayKey={dayKey} />
          </div>
        )}
      </DayDetailSection>
    </div>
  );
}
```

**Executor notes for the reused Phase 2 components**:
- **`StepsInlineInput`** — the current Phase 2 prop shape MUST be verified before writing this plan's file. If `StepsInlineInput` reads `todayKey()` internally (doesn't take `dayKey` as a prop), you CANNOT pass `dayKey`; in that case, the Steps section must render `{steps.count} steps` as a read-only row with a Delete button only, and flag in SUMMARY that past-day step EDIT is blocked until Plan 03-04 extends `StepsInlineInput` to accept a `dayKey` prop. First read the current `StepsInlineInput` signature from `src/features/steps/StepsInlineInput.tsx` BEFORE writing the JSX above. If the prop shape is incompatible, adapt: render a static `{count} steps` + Delete button (edit-via-inline-input deferred to the reuse-compat pass below).
- **`LiftToggle` / `LiftNoteInput`** — same: verify their prop shapes accept a `dayKey`. If they hardcode `todayKey()`, render read-only for past days (show `✓ Lifted` or `☐ Rest day` text + note text) with Delete button only; note the limitation in SUMMARY and queue a Phase-3 reuse-compat follow-up plan if edit-in-past-day is user-blocking. Same applies to `MealEntryRow` — the component already takes explicit `entry` + `food` props (not dayKey), so it works for past days verbatim.
- **PT session edit** — UI-SPEC:246 calls for tap-to-edit-via-PTSheet. For Phase 3, if opening `PTSheet` from a past session row is wiring-heavy, ship with DELETE ONLY for PT past-day rows and DEFER edit-via-Sheet to a minor follow-up. The summary row shows `Session · N exercises` so the user can still see what's there; delete is sufficient to satisfy STREAK-06 "all four areas' logs and totals for that day" (logs are read + deletable; edit is a nice-to-have subject to Phase 2 component compatibility).

The pragmatic fallback: **if any reused component doesn't accept the needed props, render that section as read-only + Delete only** for Phase 3, and document the compat gap in the plan summary. UI-SPEC:263-268 calls for inline-edit reuse — if reuse isn't possible, the delete-only path still satisfies STREAK-06.

Do NOT:
- Import `db` directly in any of these 3 files.
- Add a confirmation modal before delete — UI-SPEC:273-278 prohibits it (Phase 2 D-04 policy).
- Show a "Complete", "Finish", or "Confirm day" button — UI-SPEC:288 bans those verbs.
- Use `toISOString().split('T')[0]` anywhere (Pitfall #4).
- Render year in the date label (UI-SPEC:240 — year is visible one tap back in calendar).
- Use `navigate(-1)` — the back button explicitly navigates to `/calendar` for deterministic behavior.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/DayDetailSection.tsx src/features/calendar/DayDetailHeader.tsx src/features/calendar/DayDetail.tsx` exits 0
    - `grep -c "export function DayDetailSection" src/features/calendar/DayDetailSection.tsx` is 1
    - `grep -c "<Card" src/features/calendar/DayDetailSection.tsx` is 1 (uses shadcn Card primitive)
    - `grep -c "export function DayDetailHeader" src/features/calendar/DayDetailHeader.tsx` is 1
    - `grep -c "ChevronLeft" src/features/calendar/DayDetailHeader.tsx` is at least 2 (import + usage)
    - `grep -c "aria-label=\"Back to calendar\"" src/features/calendar/DayDetailHeader.tsx` is 1
    - `grep -c "(today)" src/features/calendar/DayDetailHeader.tsx` is 1
    - `grep -c "export function DayDetail" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "useDayDetail(dayKey)" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"PT\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Food\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Steps\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Lift\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No PT session logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No meals logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No steps logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No lift check-in on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete PT session\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete step entry\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete lift check-in\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "deleteSession\\|deleteSteps\\|deleteLift" src/features/calendar/DayDetail.tsx` is at least 3
    - `! grep -E "from '@/db/db'" src/features/calendar/DayDetail.tsx` (no direct db import)
    - `! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" src/features/calendar/DayDetailSection.tsx src/features/calendar/DayDetailHeader.tsx src/features/calendar/DayDetail.tsx` (Pitfall #4)
    - `! grep -E "confirm\\(" src/features/calendar/DayDetail.tsx` (UI-SPEC:273 — no confirm modal)
    - `! grep -E "Complete day|Finish day|Confirm day" src/features/calendar/DayDetail.tsx` (UI-SPEC:288)
    - `grep -c "useGoals" src/features/calendar/DayDetail.tsx` is 1 (D-14 current-goals for food totals)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>3 files created; all UI-SPEC copy strings present; imports DayDetailHeader/DayDetailSection/useDayDetail correctly; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Create DayDetailScreen.tsx route shell + register /day/:dayKey in App.tsx</name>
  <files>src/routes/DayDetailScreen.tsx, src/App.tsx</files>
  <read_first>
    - src/App.tsx (full file — current Routes declaration; additive `<Route>` goes between `/calendar` and `/settings`)
    - src/routes/CalendarScreen.tsx (existing route-screen shell pattern)
    - src/routes/TodayScreen.tsx (existing route-screen shell pattern)
    - src/features/calendar/DayDetail.tsx (from Task 2 — DayDetailProps shape: `{ dayKey: string }`)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 300-303 (invalid-key redirect policy)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §6 lines 424-451 (route registration + useParams + regex validation)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"src/routes/DayDetailScreen.tsx" (lines 391-411)
  </read_first>
  <action>
**File 1 — Create `src/routes/DayDetailScreen.tsx`** — the thin route shell.

```tsx
// src/routes/DayDetailScreen.tsx
// Route shell mounted at /#/day/:dayKey. Validates the dayKey route param
// (regex format check) and falls through to /calendar on invalid. The format
// check is defensive — valid-but-nonexistent dayKeys (e.g. 2099-12-31 or
// 2020-01-01 with no logs) render the empty-state version of <DayDetail>,
// which is correct per UI-SPEC:303.

import { useParams, Navigate } from 'react-router-dom';
import { DayDetail } from '@/features/calendar/DayDetail';

// D-01..D-04 all construct keys via dateToKey which outputs strict zero-padded
// YYYY-MM-DD — validate the same shape here so a hand-crafted URL with a typo
// (`2026-4-21`) or garbage (`../secret`) redirects out rather than rendering.
const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DayDetailScreen() {
  const { dayKey } = useParams<{ dayKey: string }>();

  if (!dayKey || !DAYKEY_RE.test(dayKey)) {
    return <Navigate to="/calendar" replace />;
  }

  return (
    <div className="px-4 py-6">
      <DayDetail dayKey={dayKey} />
    </div>
  );
}
```

The outer `<div className="px-4 py-6">` applies the standard screen-body padding (matches TodayScreen + CalendarScreen). `space-y-*` is managed by DayDetail itself (`space-y-6` wrapper set in Task 2's DayDetail.tsx).

***

**File 2 — Modify `src/App.tsx`** — add one `<Route>` and one import.

Current file is 22 lines. Apply TWO additive changes:

**Change 1 — add import after the `SettingsScreen` import (line 5):**
```tsx
import { DayDetailScreen } from './routes/DayDetailScreen';
```

**Change 2 — add a `<Route>` entry between the `/calendar` route (line 16) and the `/settings` route (line 17):**
```tsx
<Route path="/day/:dayKey" element={<DayDetailScreen />} />
```

Final file shape (for reference — do NOT restructure the HashRouter/AppShell/Routes scaffold, only add the two lines):

```tsx
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { TodayScreen } from './routes/TodayScreen';
import { CalendarScreen } from './routes/CalendarScreen';
import { SettingsScreen } from './routes/SettingsScreen';
import { DayDetailScreen } from './routes/DayDetailScreen';

// D-03: HashRouter sidesteps SW navigation-fallback edge cases and supports
// future deep links (e.g. /#/day/2026-04-20 in Phase 3).
export default function App() {
  return (
    <HashRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Navigate to="/today" replace />} />
          <Route path="/today" element={<TodayScreen />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/day/:dayKey" element={<DayDetailScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
        </Routes>
      </AppShell>
    </HashRouter>
  );
}
```

Do NOT:
- Modify the HashRouter wrapper, AppShell wrapper, or Routes hierarchy — only ADD the import line and the route line.
- Add a catch-all `<Route path="*" element={...} />` — Phase 3 has no phase-wide 404 requirement; invalid dayKey is already handled by the DayDetailScreen internal `<Navigate>` fall-through.
- Import `DayDetail` directly — App.tsx only sees `DayDetailScreen`. `DayDetail` is a feature component, not a route element.
- Change the default-export shape or reorder existing routes beyond the one insertion.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/routes/DayDetailScreen.tsx` exits 0
    - `grep -c "export function DayDetailScreen" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "useParams" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "Navigate to=\"/calendar\" replace" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "/\\^\\\\d{4}-\\\\d{2}-\\\\d{2}\\$/" src/routes/DayDetailScreen.tsx` is 1 OR equivalent regex literal `grep -cE "\\\\d\\{4\\}-\\\\d\\{2\\}-\\\\d\\{2\\}" src/routes/DayDetailScreen.tsx` is at least 1
    - `grep -c "DAYKEY_RE" src/routes/DayDetailScreen.tsx` is at least 2 (declaration + test site)
    - `grep -c "<DayDetail dayKey={dayKey}" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "path=\"/day/:dayKey\"" src/App.tsx` is 1
    - `grep -c "DayDetailScreen" src/App.tsx` is at least 2 (import + element)
    - `grep -c "from './routes/DayDetailScreen'" src/App.tsx` is 1
    - Route order preserved: `/today` appears before `/calendar` appears before `/day/:dayKey` appears before `/settings` in src/App.tsx
    - `! grep -E "toISOString" src/routes/DayDetailScreen.tsx` (Pitfall #4)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>DayDetailScreen route shell validates dayKey format and redirects invalid; App.tsx adds the route; build succeeds.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Human verify — Day Detail route renders + edit/delete wiring works</name>
  <files>(none — human-verification checkpoint; no code files touched)</files>
  <action>Run the dev server (`npm run dev`) and walk through the verification steps below. The &lt;what-built&gt; block describes the surface under review; the &lt;how-to-verify&gt; block lists the concrete steps with expected outcomes. Respond via &lt;resume-signal&gt; after completing the walkthrough.</action>
  <what-built>
The Phase 3 Day Detail route is live:
- Tapping any current-month day cell in Calendar navigates to `/#/day/YYYY-MM-DD`
- The Day Detail screen shows header (Back + formatted date + (today) suffix when applicable), summary row ("N of 4 logged"), and 4 section cards (PT, Food, Steps, Lift) in that order
- Each section shows its logs or the "No X logged on this day." empty-state line
- Past-day edit flows reuse the Phase 2 components (MealEntryRow for food; LiftToggle/LiftNoteInput for lift; StepsInlineInput for steps — if compatible)
- Delete buttons on each row remove the record immediately (no confirm)
- Invalid route like `/#/day/not-a-date` silently redirects to Calendar
  </what-built>
  <how-to-verify>
1. Dev server running (`npm run dev`)
2. Open browser to Calendar tab — tap any current-month date cell that has at least one log
3. VERIFY URL hash changes to `/#/day/YYYY-MM-DD`
4. VERIFY header shows: `← Back    {Weekday}, {Month} {Day}   [empty]` — and `(today)` appears below the date if it's today
5. VERIFY summary row below header: "N of 4 logged" (or "no logs yet" / "all 4 logged")
6. VERIFY 4 section cards render in order: PT, Food, Steps, Lift
7. For each section, VERIFY:
   - Has logs → renders row(s) with a Delete button
   - No logs → renders `No X logged on this day.` empty-copy
8. Meals section: VERIFY entries grouped by bucket (Breakfast / Lunch / Dinner / Snack labels above each group)
9. Tap a meal entry → inline edit form appears (reused MealEntryRow) → edit servings → Save → row updates
10. Tap Delete on any log → the row disappears (no confirm modal — UI-SPEC:273)
11. Tap Back → returns to `/#/calendar`
12. Navigate directly to `/#/day/not-a-date` in the URL bar → silently redirects to `/#/calendar`
13. Navigate directly to `/#/day/2099-12-31` → renders Day Detail with all sections showing their empty-state copy (valid format, no data)
14. VERIFY deleting a log on a past day then returning to Calendar reflects the change in the DayCell fill state (useLiveQuery reactivity across the 4 subscriptions)
15. VERIFY no console errors throughout

KNOWN COMPATIBILITY NOTE (acceptable for Phase 3):
- If any of `StepsInlineInput` / `LiftToggle` / `LiftNoteInput` does NOT accept a `dayKey` prop in its Phase 2 implementation, past-day EDIT of that area may not be possible — only DELETE. This is acceptable per UI-SPEC flexibility (RESEARCH §10 judgment call #3). If delete works but edit doesn't for steps/lift on past days, that's still passing Phase 3 scope — flag in your feedback.

If ANY of 3-13 fails → describe the issue. If step 14 fails (DayCell fills don't update after Day Detail delete), that's a useLiveQuery wiring bug — flag.
  </how-to-verify>
  <acceptance_criteria>
    - Tapping a current-month DayCell navigates to `/#/day/YYYY-MM-DD`
    - Day Detail header + summary row + 4 sections all render
    - Empty-state copy appears for sections with no logs
    - Delete on any row silently removes the record
    - Invalid dayKey param redirects to /calendar
    - Valid-but-empty dayKey renders empty-state sections (no redirect)
    - Delete on past-day log updates the Calendar DayCell fill on back-navigation
    - No console errors
  </acceptance_criteria>
  <resume-signal>Type "approved" or describe issues (e.g. "section order wrong", "invalid key doesn't redirect", "delete doesn't update calendar", "StepsInlineInput incompatible with dayKey prop")</resume-signal>
  <verify>
    <automated>MANUAL — executor reports results to the user; the user signals approval via resume-signal. Any automated checks (npx tsc --noEmit, build, lint) run in the preceding implementation tasks before this checkpoint.</automated>
  </verify>
  <done>User responds "approved" (or equivalent) via resume-signal. Any described blockers are triaged into a follow-up plan before execution continues past this wave.</done>
</task>

</tasks>

<threat_model>
  <scope>Hash-route deep link `/#/day/:dayKey` — the ONLY user-influenced input surface in Phase 3. Day Detail aggregates 4 existing Phase 2 services + 3 additive 1-line deletes.</scope>
  <inputs>
    - name: ":dayKey route parameter"
      validated_by: "src/routes/DayDetailScreen.tsx DAYKEY_RE regex `/^\\d{4}-\\d{2}-\\d{2}$/` BEFORE any downstream component sees it; invalid → `<Navigate to='/calendar' replace />`"
      severity_if_unvalidated: "medium — a pass-through of arbitrary strings could feed Dexie `.get(dayKey)` / `.where('dayKey').equals(dayKey)` calls; Dexie safely returns undefined/empty arrays for non-matching keys (no injection vector — IndexedDB string-key lookups are string-equality only, not query parsing), but bypassing validation could enable weird edge cases like `../secret` being rendered in the UI via keyToDate which parses split-by-dash numbers"
  </inputs>
  <data_flow>URL hash → react-router useParams → DayDetailScreen regex validate → DayDetail → useDayDetail(dayKey) → 5 parallel useLiveQuery → service reads → Dexie. Delete actions: DayDetail button onClick → service delete → Dexie (no user-supplied IDs beyond what was already stored). No network, no external data.</data_flow>
  <threats_considered>
    - Tampering (T): User hand-crafts `/#/day/../../../secret` → regex rejects, redirect to /calendar
    - Information disclosure (I): Valid-format future/ancient dayKey renders empty sections — no leak because there IS no data
    - Denial-of-service (D): Extreme past dayKey (e.g. `0001-01-01`) → Dexie string comparison is cheap, all 5 queries return empty, no regression
    - XSS: All rendered strings (date label, summary, section titles, empty-copy, user-saved meal names/notes) are React-escaped; no dangerouslySetInnerHTML anywhere
    - Destructive accidental-click on delete: UI-SPEC:273 inherits Phase 2 D-04 "no confirm" — accepted tradeoff; Phase 4 JSON export is the safety net
  </threats_considered>
  <mitigations>
    - threat: "Malformed :dayKey"
      mitigation: "src/routes/DayDetailScreen.tsx:DAYKEY_RE regex at route boundary — invalid → <Navigate to='/calendar' replace />; validation runs BEFORE useParams value crosses the DayDetail component boundary"
    - threat: "Future XSS regression (e.g. devolution to raw HTML)"
      mitigation: "No dangerouslySetInnerHTML in any Phase 3 file; acceptance criteria can later grep-assert if regressions suspected"
    - threat: "Destructive delete misclick"
      mitigation: "Documented accepted risk per Phase 2 D-04 + Phase 4 JSON export is the recovery path; deferring confirm-modal work keeps Phase 3 focused on the motivator loop"
  </mitigations>
  <residual_risk>low — one regex-validated input is the ONLY user-controllable surface; Phase 4 JSON export mitigates accidental-delete catastrophe; no network or XSS vectors present</residual_risk>
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (full bundle builds with new route)
- 9 files in `files_modified` exist / contain the stated changes
- Route registration check:
  ```
  grep -E "path=\"/day/:dayKey\"" src/App.tsx       # exactly one match
  grep -E "<DayDetailScreen" src/App.tsx             # exactly one match (element=)
  ```
- Regex guard present:
  ```
  grep -E "\\\\d\\{4\\}-\\\\d\\{2\\}-\\\\d\\{2\\}" src/routes/DayDetailScreen.tsx   # at least one match
  ```
- Pitfall #4 guard across ALL new files:
  ```
  ! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" \
      src/routes/DayDetailScreen.tsx \
      src/features/calendar/DayDetail.tsx \
      src/features/calendar/DayDetailSection.tsx \
      src/features/calendar/DayDetailHeader.tsx \
      src/features/calendar/dayDetailHooks.ts
  ```
- Human checkpoint validates the whole user flow (Task 4)
</verification>

<success_criteria>
- 6 new files + 3 modified services + 1 modified router (= 9 files in files_modified)
- Zero npm installs, zero schema changes
- `/#/day/YYYY-MM-DD` renders Day Detail for any in-range dayKey
- `/#/day/garbage` silently redirects to `/#/calendar`
- All 4 sections (PT, Food, Steps, Lift) render with logs OR empty-state copy
- Delete on any row removes the record and triggers useLiveQuery refresh on Calendar
- Human-verify checkpoint passes
- D-14 current-goals policy honored in food totals subtitle
</success_criteria>

<output>
After completion, create `.planning/phases/03-streak-loop/03-04-SUMMARY.md` documenting:
- All 9 modified files
- Which Phase 2 components successfully reused with a `dayKey` prop vs. which fell back to read-only + Delete (e.g., "StepsInlineInput accepts dayKey — full edit works" OR "LiftToggle hardcodes todayKey — past-day edit unavailable, rendered read-only + Delete")
- Confirmation of route regex validation
- Confirmation that Phase 2 D-04 (no confirm on delete) is honored
- Any deviations from UI-SPEC for compatibility reasons (list + rationale)
- Note for Phase 4 planner: DayDetailHeader right slot is reserved empty; `w-[56px]` spacer can be replaced with an Export-day action
</output>
