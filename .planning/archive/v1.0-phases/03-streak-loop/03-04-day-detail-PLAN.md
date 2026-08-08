---
phase: 03-streak-loop
plan: 04
type: execute
wave: 2
depends_on:
  - "03-01"
files_modified:
  - src/services/pt.svc.ts
  - src/services/steps.svc.ts
  - src/services/lifts.svc.ts
  - src/features/steps/StepsInlineInput.tsx
  - src/features/lifts/LiftToggle.tsx
  - src/features/lifts/LiftNoteInput.tsx
  - src/features/pt/PTSheet.tsx
  - src/features/pt/PTSessionForm.tsx
  - src/features/calendar/DayDetailSection.tsx
  - src/features/calendar/DayDetailHeader.tsx
  - src/features/calendar/DayDetail.tsx
  - src/routes/DayDetailScreen.tsx
  - src/App.tsx
autonomous: false
requirements:
  - STREAK-06
destructive_color_policy:
  note: >
    Delete buttons in DayDetail.tsx use `style={{ color: '#ef4444' }}` inline,
    matching the Phase 2 precedent set by src/features/food/MealEntryRow.tsx:123
    and src/components/ui/Button variants. Phase 3 CONTEXT.md does NOT introduce
    a `--destructive` token in tokens.css (the token set is locked in Phase 3
    per Phase 1 D-17 / D-15..D-16 palette policy). Acceptance criteria cap the
    hex-literal count at ≤4 (one per delete button: PT, Meal, Steps, Lift) so
    the pattern cannot drift. If hex-color accumulation later becomes a concern,
    introducing a `--destructive` token is a future-phase task.
must_haves:
  truths:
    - "Route `/#/day/:dayKey` registered in App.tsx; invalid dayKey param silently redirects to `/calendar` via regex guard `/^\\d{4}-\\d{2}-\\d{2}$/`"
    - "DayDetail renders all 4 areas for the selected dayKey (PT sessions, meals, step entry, lift check-in) with totals (D-14 current-goals policy for food macros)"
    - "Phase 2 StepsInlineInput, LiftToggle, LiftNoteInput extended to accept an optional `dayKey?: string` prop defaulting to todayKey() — past-day edits from DayDetail now write to the correct dayKey (satisfies UI-SPEC:263-268 past-day edit reuse contract). Today callers are unaffected because the prop defaults to todayKey()."
    - "PTSheet + PTSessionForm extended to accept an optional `editSession?: PTSession` prop. When supplied, PTSheet skips list mode and opens PTSessionForm pre-filled with the session's exercises/pain/notes; save preserves the session's id + dayKey + loggedAt and upserts via the existing saveSession (which is already put-by-id). This is the UI-SPEC:246 PT-edit wiring — no placeholder, no prose fallback."
    - "Past-day delete uses three additive 1-line service functions: deleteSession (pt.svc), deleteSteps (steps.svc), deleteLift (lifts.svc). deleteMealEntry already exists in meals.svc."
    - "DayDetail.tsx JSX passes `dayKey={dayKey}` explicitly to StepsInlineInput, LiftToggle, LiftNoteInput — at least 3 such pass-throughs; grep-enforced."
    - "useDayDetail is imported from src/features/calendar/hooks.ts (Plan 03-01 authors it per UI-SPEC:648); Plan 03-04 does NOT create a separate dayDetailHooks.ts file."
    - "No backdated NEW-log adding — Day Detail is edit/delete-only in Phase 3 (CONTEXT `<deferred>`)"
    - "No confirmation modal on delete — inherits Phase 2 D-04 policy (immediate delete, no confirm)"
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
    - path: "src/features/steps/StepsInlineInput.tsx"
      provides: "Extended props: { currentCount, onCommitted, dayKey? } — dayKey defaults to todayKey(); commits upsertSteps(dayKey, count)"
      contains: "dayKey?: string"
    - path: "src/features/lifts/LiftToggle.tsx"
      provides: "Extended props: { lifted, dayKey? } — dayKey defaults to todayKey(); onClick toggles via toggleLift(dayKey)"
      contains: "dayKey?: string"
    - path: "src/features/lifts/LiftNoteInput.tsx"
      provides: "Extended props: { currentNote, onCommitted, dayKey? } — dayKey defaults to todayKey(); commits setLiftNote(dayKey, note)"
      contains: "dayKey?: string"
    - path: "src/features/pt/PTSheet.tsx"
      provides: "Extended props: { onClose, editSession? } — when editSession present, skips list mode and mounts PTSessionForm in edit mode"
      contains: "editSession?: PTSession"
    - path: "src/features/pt/PTSessionForm.tsx"
      provides: "Extended props: { template, onClose, editSession? } — values pre-fill from editSession; saveSession preserves id/dayKey/loggedAt on edit"
      contains: "editSession?: PTSession"
    - path: "src/features/calendar/DayDetailSection.tsx"
      provides: "Generic Card-backed section wrapper with title + body"
      exports: ["DayDetailSection"]
    - path: "src/features/calendar/DayDetailHeader.tsx"
      provides: "Back button + date label + empty right slot header row"
      exports: ["DayDetailHeader"]
    - path: "src/features/calendar/DayDetail.tsx"
      provides: "Per-day composer: header + 4 sections (PT/Food/Steps/Lift) + summary row + PT edit-Sheet"
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
      to: "src/features/calendar/hooks.ts:useDayDetail"
      via: "const { sessions, meals, steps, lift, totals } = useDayDetail(dayKey)"
      pattern: "useDayDetail\\(dayKey\\)"
    - from: "Day Detail delete buttons"
      to: "pt/steps/lifts/meals service delete functions"
      via: "onClick = () => deleteX(id|dayKey)"
      pattern: "delete(Session|Steps|Lift|MealEntry)"
    - from: "DayDetail reused Phase 2 components"
      to: "steps.svc.upsertSteps / lifts.svc.toggleLift / lifts.svc.setLiftNote via extended-dayKey-prop flow"
      via: "StepsInlineInput/LiftToggle/LiftNoteInput each read dayKey prop (defaulting to todayKey()) and pass it to the service call"
      pattern: "dayKey\\s*\\?\\?|dayKey \\|\\| todayKey"
    - from: "DayDetail PT row"
      to: "PTSheet (editSession prop)"
      via: "Controlled Sheet open state; onEdit(session) sets editingSession and opens Sheet"
      pattern: "editSession=\\{"
---

<objective>
Build the Day Detail surface: a new hash route `/#/day/:dayKey` that renders all four areas' logs + totals for a chosen day, with past-day edit/delete flows wired to existing Phase 2 services. This plan honors UI-SPEC:246 (PT tap-to-edit-via-PTSheet) and UI-SPEC:263-268 (inline-edit reuse for Food/Steps/Lift) in full — NO prose "compat fallbacks" or "read-only for past days." The three Phase 2 leaf input components gain an optional `dayKey?: string` prop (default `todayKey()`), and PTSheet/PTSessionForm gain an optional `editSession?: PTSession` prop. All changes are additive and backward-compatible with Phase 2 callers. Route-param is regex-validated; invalid keys silently redirect to `/calendar`.

Purpose: Delivers STREAK-06 — the `/day/:dayKey` navigation destination that completes the calendar-tap-to-detail loop, including the full past-day edit contract from UI-SPEC.

Output: 6 new files + 5 modified Phase 2 files (3 service 1-liners + 3 leaf component prop extensions + 2 PT sheet/form edit-mode extensions) + 1 modified router. Zero schema changes, zero npm installs. Wave 2 (depends on Plan 03-01's hooks.ts which exports `useDayDetail`).
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
@.planning/phases/03-streak-loop/03-01-SUMMARY.md
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
@src/features/steps/StepsSection.tsx
@src/features/lifts/LiftToggle.tsx
@src/features/lifts/LiftNoteInput.tsx
@src/features/lifts/LiftSection.tsx
@src/features/pt/PTSheet.tsx
@src/features/pt/PTSessionForm.tsx
@src/features/pt/PTSection.tsx
@src/features/pt/hooks.ts
@src/features/settings/hooks.ts
@src/features/calendar/hooks.ts

<interfaces>
<!-- Phase 2 service signatures already accept arbitrary dayKey (Pitfall #4 policy). Only the leaf input components hardcoded todayKey() — which is what this plan fixes. -->

From src/services/meals.svc.ts (pre-existing):
```typescript
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;          // dayKey-agnostic despite name
export async function getDailyTotals(dayKey: string): Promise<DailyTotals>;     // D-14 consumer: totals against CURRENT goals
export async function updateMealEntry(id: string, patch: {servings: number; bucket: MealBucket}): Promise<void>;
export async function deleteMealEntry(id: string): Promise<void>;               // already exists — reuse
```

From src/services/pt.svc.ts (pre-existing — VERIFIED by reading source during revision):
```typescript
export function getTodaySessions(dayKey: string): Promise<PTSession[]>;         // dayKey-agnostic despite name
export async function saveSession(session: PTSession): Promise<void>;           // put-by-id upsert — accepts any session, edit preserves id
// NEEDED: export async function deleteSession(id: string): Promise<void>;       // additive in this plan
```

From src/services/steps.svc.ts (pre-existing — VERIFIED):
```typescript
export async function upsertSteps(dayKey: string, count: number): Promise<void>;  // accepts ANY dayKey
export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined>;
// NEEDED: export async function deleteSteps(dayKey: string): Promise<void>;       // additive in this plan
```

From src/services/lifts.svc.ts (pre-existing — VERIFIED):
```typescript
export async function toggleLift(dayKey: string): Promise<void>;   // accepts ANY dayKey
export async function setLiftNote(dayKey: string, note: string): Promise<void>;   // accepts ANY dayKey
export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined>;
// NEEDED: export async function deleteLift(dayKey: string): Promise<void>;        // additive in this plan
```

**Current (Phase 2) Props — must be extended:**

From src/features/steps/StepsInlineInput.tsx:18-23 (VERIFIED):
```typescript
interface Props {
  currentCount: number;
  onCommitted: () => void;
}
// body hardcodes: await upsertSteps(todayKey(), Math.floor(parsed));
```

From src/features/lifts/LiftToggle.tsx:18-22 (VERIFIED):
```typescript
interface Props {
  lifted: boolean;
}
// body hardcodes: void toggleLift(todayKey());
```

From src/features/lifts/LiftNoteInput.tsx:13-18 (VERIFIED):
```typescript
interface Props {
  currentNote: string;
  onCommitted: () => void;
}
// body hardcodes: await setLiftNote(todayKey(), value.trim());
```

From src/features/pt/PTSheet.tsx:19-21 (VERIFIED):
```typescript
interface PTSheetProps {
  onClose: () => void;
}
// body: list mode → session mode via state machine; no editSession path.
```

From src/features/pt/PTSessionForm.tsx:43-46 (VERIFIED):
```typescript
interface PTSessionFormProps {
  template: PTTemplate;
  onClose: () => void;
}
// body: hardcodes id = crypto.randomUUID(), dayKey = todayKey(), loggedAt = Date.now() on save.
```

**Today callers (verified via grep) — these keep working via default-prop backward compatibility:**

From src/features/steps/StepsSection.tsx:42:
```tsx
<StepsInlineInput currentCount={count} onCommitted={() => setEditing(false)} />
// No dayKey prop → defaults to todayKey() → SAME BEHAVIOR AS BEFORE.
```

From src/features/lifts/LiftSection.tsx:25, :30:
```tsx
<LiftToggle lifted={lifted} />
<LiftNoteInput currentNote={note ?? ''} onCommitted={...} />
// No dayKey prop → defaults to todayKey() → SAME BEHAVIOR AS BEFORE.
```

From src/features/pt/PTSection.tsx:50:
```tsx
<PTSheet onClose={() => setOpen(false)} />
// No editSession prop → list mode (new session path) → SAME BEHAVIOR AS BEFORE.
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

From Plan 03-01 (src/features/calendar/hooks.ts):
```typescript
export interface DayDetailData {
  sessions: PTSession[] | undefined;
  meals: MealEntry[] | undefined;
  steps: StepEntry | undefined;
  lift: LiftCheckin | undefined;
  totals: DailyTotals | undefined;
}
export function useDayDetail(dayKey: string): DayDetailData;
```

Lucide icon: `ChevronLeft` from `lucide-react` (already used by Plan 03-03 MonthHeader — pkg in package.json).

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
  <name>Task 1: Add additive delete functions to 3 services (pt.svc, steps.svc, lifts.svc)</name>
  <files>src/services/pt.svc.ts, src/services/steps.svc.ts, src/services/lifts.svc.ts</files>
  <read_first>
    - src/services/meals.svc.ts lines 63-65 (deleteMealEntry — the canonical 1-liner analog)
    - src/services/pt.svc.ts (full file — append at end; verify deleteSession does NOT already exist)
    - src/services/steps.svc.ts (full file — append at end; verify deleteSteps does NOT already exist)
    - src/services/lifts.svc.ts (full file — append at end; verify deleteLift does NOT already exist)
    - src/db/schema.ts (confirm `ptSessions` PK = `id`, `stepEntries` PK = `dayKey`, `liftCheckins` PK = `dayKey`)
    - src/db/db.ts lines 56-64 (schema declaration — primary key confirmation)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §6 lines 455-498 (day-detail service table + 3 additive delete sketches)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"Service delete additions" (lines 459-485)
  </read_first>
  <action>
**Service edits — append 1-line delete functions. Each change is ADDITIVE; do not modify existing functions.**

**File 1 — `src/services/pt.svc.ts`** — append after the last existing function (`formatRelativeDays`). Follow the header-comment convention (pitfall notes already in lines 1-3). Add:

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

Do NOT:
- Rename any existing service function.
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
    - `! grep -E "db\\.transaction" src/services/steps.svc.ts`
    - `! grep -E "db\\.transaction" src/services/lifts.svc.ts`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>3 delete functions added; all service file headers still cite Pitfall #4 / #1 correctly; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Extend StepsInlineInput, LiftToggle, LiftNoteInput to accept optional dayKey prop</name>
  <files>src/features/steps/StepsInlineInput.tsx, src/features/lifts/LiftToggle.tsx, src/features/lifts/LiftNoteInput.tsx</files>
  <read_first>
    - src/features/steps/StepsInlineInput.tsx (full file — current props and upsertSteps call site)
    - src/features/lifts/LiftToggle.tsx (full file — current props and toggleLift call site)
    - src/features/lifts/LiftNoteInput.tsx (full file — current props and setLiftNote call site)
    - src/features/steps/StepsSection.tsx (caller — confirms no dayKey prop currently passed, so default must preserve today behavior)
    - src/features/lifts/LiftSection.tsx (caller — confirms no dayKey prop currently passed)
    - src/lib/dayKey.ts (todayKey — used as the default-prop fallback)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 263-268 (past-day edit contract — locked)
  </read_first>
  <action>
**Surgical edits: each file gets ONE new prop (`dayKey?: string`) and ONE line change inside the commit/click handler to use the prop (falling back to `todayKey()` only when undefined). Today callers are unaffected.**

**File 1 — `src/features/steps/StepsInlineInput.tsx`** — make these 2 changes (do NOT rewrite the whole file):

1. Extend the `Props` interface (currently lines 18-21):
```typescript
interface Props {
  currentCount: number;
  onCommitted: () => void; // parent closes the reveal after commit or cancel
  dayKey?: string; // Phase 3: Day Detail passes dayKey; Today callers omit to default to todayKey().
}
```

2. Destructure `dayKey` in the function signature and USE it in `commit`:
```typescript
export function StepsInlineInput({ currentCount, onCommitted, dayKey }: Props) {
  // ... existing useState, useRef, useEffect unchanged ...

  const commit = async () => {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 999_999) {
      await upsertSteps(dayKey ?? todayKey(), Math.floor(parsed));
    }
    onCommitted();
  };

  // ... rest of function body unchanged ...
}
```

Keep the `import { todayKey } from '@/lib/dayKey';` — it's still used as the fallback. Do not change the aria-label ("Enter step count for today") — the input is still "for today" from the user's POV when no dayKey is passed; on Day Detail, the enclosing context (dated Day Detail header) provides the date context.

**File 2 — `src/features/lifts/LiftToggle.tsx`** — 2 changes:

1. Extend `Props` (currently lines 18-20):
```typescript
interface Props {
  lifted: boolean;
  dayKey?: string; // Phase 3: Day Detail passes dayKey; Today callers omit to default to todayKey().
}
```

2. Destructure and USE dayKey in onClick:
```typescript
export function LiftToggle({ lifted, dayKey }: Props) {
  return (
    <button
      type="button"
      aria-label={lifted ? "Undo lifted today" : "Mark lifted today"}
      aria-pressed={lifted}
      onClick={() => {
        void toggleLift(dayKey ?? todayKey());
      }}
      className="p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
    >
      <span
        className={cn('text-[32px] leading-none', lifted ? 'text-accent' : 'text-muted')}
        aria-hidden
      >
        {lifted ? '✓' : '☐'}
      </span>
    </button>
  );
}
```

Retain the `import { todayKey } from '@/lib/dayKey';` line.

**File 3 — `src/features/lifts/LiftNoteInput.tsx`** — 2 changes:

1. Extend `Props` (currently lines 13-16):
```typescript
interface Props {
  currentNote: string;
  onCommitted: () => void;
  dayKey?: string; // Phase 3: Day Detail passes dayKey; Today callers omit to default to todayKey().
}
```

2. Destructure and USE dayKey in commit:
```typescript
export function LiftNoteInput({ currentNote, onCommitted, dayKey }: Props) {
  // ... existing useState, useRef, useEffect unchanged ...

  const commit = async () => {
    await setLiftNote(dayKey ?? todayKey(), value.trim());
    onCommitted();
  };

  // ... rest of function body unchanged ...
}
```

Retain the `import { todayKey } from '@/lib/dayKey';` line.

**Today callers (StepsSection, LiftSection) — DO NOT MODIFY.** They already omit `dayKey`, which triggers the default-prop fallback, preserving Today's behavior byte-for-byte. Acceptance criteria explicitly verify this (no new imports needed in StepsSection.tsx / LiftSection.tsx).

Do NOT:
- Rename the `currentCount` / `lifted` / `currentNote` props.
- Change the `aria-label` copy for any of the three inputs (the existing copy is Phase 2-locked; changing it is a separate concern).
- Remove the `todayKey` import from any of the three files — it's still used as the fallback.
- Modify StepsSection.tsx or LiftSection.tsx (the Today callers — they keep working via the default prop).
- Add a `dayKey` prop to MealEntryRow (it already takes explicit `entry` + `food` props which have their own dayKey baked in — the past-day edit path just passes the entry prop; no component change needed).
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "dayKey?: string" src/features/steps/StepsInlineInput.tsx` is 1 (prop added)
    - `grep -c "dayKey?: string" src/features/lifts/LiftToggle.tsx` is 1
    - `grep -c "dayKey?: string" src/features/lifts/LiftNoteInput.tsx` is 1
    - `grep -cE "dayKey \\?\\?[[:space:]]*todayKey\\(\\)" src/features/steps/StepsInlineInput.tsx` is 1 (prop used with fallback)
    - `grep -cE "dayKey \\?\\?[[:space:]]*todayKey\\(\\)" src/features/lifts/LiftToggle.tsx` is 1
    - `grep -cE "dayKey \\?\\?[[:space:]]*todayKey\\(\\)" src/features/lifts/LiftNoteInput.tsx` is 1
    - `grep -c "upsertSteps(dayKey ?? todayKey()" src/features/steps/StepsInlineInput.tsx` is 1
    - `grep -c "toggleLift(dayKey ?? todayKey())" src/features/lifts/LiftToggle.tsx` is 1
    - `grep -c "setLiftNote(dayKey ?? todayKey()" src/features/lifts/LiftNoteInput.tsx` is 1
    - `grep -c "from '@/lib/dayKey'" src/features/steps/StepsInlineInput.tsx` is 1 (import retained)
    - `grep -c "from '@/lib/dayKey'" src/features/lifts/LiftToggle.tsx` is 1
    - `grep -c "from '@/lib/dayKey'" src/features/lifts/LiftNoteInput.tsx` is 1
    - Today callers unchanged — `git diff --quiet src/features/steps/StepsSection.tsx src/features/lifts/LiftSection.tsx` exits 0
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>Three Phase 2 input components now accept an optional dayKey prop that defaults to todayKey(); Today callers unchanged; all service writes route through the prop.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Extend PTSheet + PTSessionForm to accept optional editSession prop (UI-SPEC:246 PT edit-in-place wiring)</name>
  <files>src/features/pt/PTSheet.tsx, src/features/pt/PTSessionForm.tsx</files>
  <read_first>
    - src/features/pt/PTSheet.tsx (full file — current state machine: list ↔ session modes; template selection)
    - src/features/pt/PTSessionForm.tsx (full file — current save path: crypto.randomUUID + todayKey hardcoded on line 69-73)
    - src/features/pt/hooks.ts (useTemplates — needed by PTSheet to resolve editSession.templateId → PTTemplate)
    - src/db/schema.ts (PTSession shape — id, dayKey, templateId, loggedAt, exercises[], painRating, notes)
    - src/services/pt.svc.ts (saveSession is already put-by-id upsert — preserving id on edit causes update, not insert)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 246 + 266 (locked decision: tap = open PT Session sheet in edit mode, reuses saveSession)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md §D-11 (partial sessions are valid — no Zod validation required on edit either)
    - src/features/pt/PTSection.tsx (Today caller — confirms existing `<PTSheet onClose={...} />` usage stays compatible)
  </read_first>
  <action>
**Goal:** add an optional `editSession?: PTSession` prop to BOTH `PTSheet` and `PTSessionForm`. When PTSheet receives an editSession, it:
1. Resolves the session's templateId → PTTemplate from the already-mounted useTemplates() list
2. Skips list mode entirely — mounts PTSessionForm directly in session mode with the resolved template AND the editSession

When PTSessionForm receives an editSession, it:
1. Pre-fills `values:` with the session's exercise data, painRating, and notes
2. On submit, reuses `editSession.id`, `editSession.dayKey`, and `editSession.loggedAt` (so saveSession performs an update-by-id, not a new insert) — day placement in the grid is preserved

This is ADDITIVE. Today's new-session flow (no editSession) is byte-identical to Phase 2.

**File 1 — `src/features/pt/PTSheet.tsx`** — replace the whole file (it's 73 lines; easier to re-author than surgical micro-edits):

```tsx
// src/features/pt/PTSheet.tsx
//
// PT Sheet composer — switches between template-list mode and session-logging
// mode, and hosts the template editor as a nested Sheet (D-10). Radix Dialog
// manages stacking natively; the parent PT Sheet stays mounted while the
// nested editor is open.
//
// Phase 3 additive: optional `editSession` prop — when provided, skips list
// mode and mounts PTSessionForm in edit mode with the session's template
// pre-resolved. Honors UI-SPEC:246 (tap past-day PT row → open PTSheet in
// edit mode, reuses saveSession upsert-by-id).
//
// Loading contract per UI-SPEC §Loading States: while useTemplates returns
// undefined, render nothing (IndexedDB reads resolve in < 16ms — a spinner
// would flash and disappear faster than perception).

import { useState } from 'react';
import { useTemplates } from './hooks';
import { PTTemplateList } from './PTTemplateList';
import { PTSessionForm } from './PTSessionForm';
import { PTTemplateEditor } from './PTTemplateEditor';
import type { PTSession, PTTemplate } from '@/db/schema';

interface PTSheetProps {
  onClose: () => void;
  editSession?: PTSession;
}

export function PTSheet({ onClose, editSession }: PTSheetProps) {
  const templates = useTemplates();

  // When editing a past session, skip list mode — start directly in session mode
  // with the session's template. If editSession is undefined, preserve Phase 2
  // behavior: start in list mode, pick a template to begin a new session.
  const [mode, setMode] = useState<'list' | 'session'>(editSession ? 'session' : 'list');
  const [selectedTemplate, setSelectedTemplate] = useState<PTTemplate | undefined>(
    undefined,
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
  const [editingTemplate, setEditingTemplate] = useState<PTTemplate | undefined>(
    undefined,
  );

  if (templates === undefined) {
    // Silent loading — render an empty div so the Sheet slot still exists.
    return <div />;
  }

  // Resolve the template for edit mode AFTER templates load (so edit mode
  // doesn't silently fall through to undefined — a missing template means the
  // template was deleted after the session was logged; we gracefully fall back
  // to list mode, preserving the session read in DayDetail).
  const editTemplate = editSession
    ? templates.find((t) => t.id === editSession.templateId)
    : undefined;
  const effectiveMode: 'list' | 'session' =
    editSession && !editTemplate ? 'list' : mode;
  const effectiveTemplate =
    editSession && editTemplate ? editTemplate : selectedTemplate;

  return (
    <>
      {effectiveMode === 'list' && (
        <PTTemplateList
          templates={templates}
          onStartSession={(t) => {
            setSelectedTemplate(t);
            setMode('session');
          }}
          onEditTemplate={(t) => {
            setEditingTemplate(t);
            setEditorMode('edit');
            setEditorOpen(true);
          }}
          onNewTemplate={() => {
            setEditingTemplate(undefined);
            setEditorMode('new');
            setEditorOpen(true);
          }}
        />
      )}
      {effectiveMode === 'session' && effectiveTemplate && (
        <PTSessionForm
          template={effectiveTemplate}
          onClose={onClose}
          editSession={editSession}
        />
      )}
      <PTTemplateEditor
        open={editorOpen}
        mode={editorMode}
        template={editingTemplate}
        onClose={() => setEditorOpen(false)}
      />
    </>
  );
}
```

**File 2 — `src/features/pt/PTSessionForm.tsx`** — apply 3 surgical changes:

1. Extend the import of `@/db/schema` to include `PTSession` (already imported on line 26).

2. Extend `PTSessionFormProps` (currently lines 43-46):
```typescript
interface PTSessionFormProps {
  template: PTTemplate;
  onClose: () => void;
  editSession?: PTSession; // Phase 3: when present, form pre-fills + save preserves id/dayKey/loggedAt.
}
```

3. Destructure `editSession` + rewrite the `values:` init + `onSubmit` to respect edit mode. Replace the current `useForm({ values: {...} })` block (lines 51-64) and the current `onSubmit` block (lines 68-86) with:

```typescript
export function PTSessionForm({ template, onClose, editSession }: PTSessionFormProps) {
  const prevSession = useLastSessionForTemplate(template.id, editSession?.id);

  const { register, handleSubmit, watch, setValue } = useForm<SessionFormValues>({
    // D-19: form-local state. In edit mode, hydrate from editSession — matching
    // by exercise NAME (not position) in case template was re-ordered since the
    // session was logged. Missing exercises fall back to the template's default
    // blank row.
    values: {
      exercises: template.exercises.map((e) => {
        const prev = editSession?.exercises.find((pe) => pe.name === e.name);
        return {
          name: e.name,
          actualSets: prev?.actualSets,
          actualReps: prev?.actualReps,
          actualDurationSec: prev?.actualDurationSec,
          completed: prev?.completed ?? false,
        };
      }),
      painRating: editSession?.painRating,
      notes: editSession?.notes ?? '',
    },
  });

  const painValue = watch('painRating');

  const onSubmit = handleSubmit(async (data) => {
    const session: PTSession = {
      // Edit mode preserves id/dayKey/loggedAt so saveSession (put-by-id) performs
      // an UPDATE, not an INSERT — keeping the session pinned to its original day.
      id: editSession?.id ?? crypto.randomUUID(),
      dayKey: editSession?.dayKey ?? todayKey(),
      templateId: template.id,
      loggedAt: editSession?.loggedAt ?? Date.now(),
      exercises: data.exercises.map((e) => ({
        name: e.name,
        actualSets: e.actualSets,
        actualReps: e.actualReps,
        actualDurationSec: e.actualDurationSec,
        completed: !!e.completed,
      })),
      painRating: data.painRating,
      notes: data.notes?.trim() ? data.notes.trim() : undefined,
    };
    await saveSession(session);
    onClose();
  });

  // ... rest of function body (JSX return) unchanged ...
}
```

Note: `useLastSessionForTemplate(template.id, editSession?.id)` uses the existing `excludeSessionId` parameter so the previous-session hint doesn't show the session BEING edited. The function signature already supports this (verified in pt.svc.ts line 46).

4. The JSX body (lines 88-140) is unchanged. The form renders template.exercises.map; `register` binds the pre-filled values automatically via react-hook-form's `values:` prop.

5. The Save button label — Phase 2 reads `Save session`. Leave it as-is (UI-SPEC does not require a different copy for edit mode — this keeps Phase 2 button-contract stable). If the user later wants `Save changes` in edit mode, that's a Phase 4 polish.

Do NOT:
- Change `PTSession` shape or add new schema fields.
- Change `saveSession`'s signature (it's already put-by-id).
- Fire a separate `updateSession` function — `saveSession(sessionWithSameId)` IS the update path.
- Touch PTSection.tsx — its existing `<PTSheet onClose={() => setOpen(false)} />` call has no editSession prop, so PTSheet defaults to list mode = Phase 2 behavior.
- Add a delete button inside PTSessionForm — Day Detail renders its own Delete button on the PT row (Task 5); PTSessionForm is edit-only.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "editSession?: PTSession" src/features/pt/PTSheet.tsx` is 1 (prop declared)
    - `grep -c "editSession?: PTSession" src/features/pt/PTSessionForm.tsx` is 1 (prop declared)
    - `grep -c "editSession \\? 'session' : 'list'" src/features/pt/PTSheet.tsx` is 1 (initial mode gate)
    - `grep -c "editSession={editSession}" src/features/pt/PTSheet.tsx` is 1 (pass-through to PTSessionForm)
    - `grep -c "editSession?.id ?? crypto.randomUUID" src/features/pt/PTSessionForm.tsx` is 1 (id preserved on edit)
    - `grep -c "editSession?.dayKey ?? todayKey()" src/features/pt/PTSessionForm.tsx` is 1 (dayKey preserved on edit)
    - `grep -c "editSession?.loggedAt ?? Date.now()" src/features/pt/PTSessionForm.tsx` is 1 (loggedAt preserved on edit)
    - `grep -c "editSession?.exercises.find" src/features/pt/PTSessionForm.tsx` is 1 (pre-fill by exercise name)
    - `grep -c "useLastSessionForTemplate(template.id, editSession?.id)" src/features/pt/PTSessionForm.tsx` is 1 (exclude self from prev-hint)
    - Today PT caller unchanged — `git diff --quiet src/features/pt/PTSection.tsx` exits 0
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>PTSheet + PTSessionForm extended with optional editSession prop; new-session flow byte-identical to Phase 2; edit mode preserves id/dayKey/loggedAt for the saveSession upsert.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: Create DayDetailSection.tsx + DayDetailHeader.tsx</name>
  <files>src/features/calendar/DayDetailSection.tsx, src/features/calendar/DayDetailHeader.tsx</files>
  <read_first>
    - src/components/ui/card.tsx (full file — Card primitive export)
    - src/features/food/FoodSection.tsx lines 33-65 (Card usage analog for section title + subheader pattern)
    - src/lib/dayKey.ts (todayKey, keyToDate — for "(today)" suffix + date formatting)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 488-498 (DayDetailHeader contract: Back + date + empty right slot, not sticky)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §DayDetailHeader + §DayDetailSection (lines 324-389)
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

The `w-[56px]` spacer balances the left Back button's effective width so the centered date label stays visually centered. `navigate('/calendar')` — UI-SPEC:239 allows either `navigate(-1)` or `navigate('/calendar')`. Use explicit `/calendar` for determinism.

Do NOT:
- Use `toISOString().split('T')[0]` anywhere (Pitfall #4).
- Render year in the date label (UI-SPEC:240 — year is visible one tap back in calendar).
- Use `navigate(-1)` — explicit `/calendar` is the documented choice.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/DayDetailSection.tsx src/features/calendar/DayDetailHeader.tsx` exits 0
    - `grep -c "export function DayDetailSection" src/features/calendar/DayDetailSection.tsx` is 1
    - `grep -c "<Card" src/features/calendar/DayDetailSection.tsx` is 1 (uses shadcn Card primitive)
    - `grep -c "export function DayDetailHeader" src/features/calendar/DayDetailHeader.tsx` is 1
    - `grep -c "ChevronLeft" src/features/calendar/DayDetailHeader.tsx` is at least 2 (import + usage)
    - `grep -c "aria-label=\"Back to calendar\"" src/features/calendar/DayDetailHeader.tsx` is 1
    - `grep -c "(today)" src/features/calendar/DayDetailHeader.tsx` is 1
    - `! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" src/features/calendar/DayDetailSection.tsx src/features/calendar/DayDetailHeader.tsx`
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>2 files created; all header copy strings present; ChevronLeft wiring correct; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 5: Create DayDetail.tsx — composer with full past-day edit wiring</name>
  <files>src/features/calendar/DayDetail.tsx</files>
  <read_first>
    - src/features/calendar/hooks.ts (Plan 03-01 — useDayDetail, DayDetailData; DO NOT import from a dayDetailHooks.ts file — it is not created by this plan)
    - src/features/food/MealEntryRow.tsx (full file — already takes explicit `entry` + `food` props; reused verbatim, NO dayKey prop needed here)
    - src/features/steps/StepsInlineInput.tsx (AFTER Task 2 — now takes dayKey?: string)
    - src/features/lifts/LiftToggle.tsx (AFTER Task 2 — now takes dayKey?: string)
    - src/features/lifts/LiftNoteInput.tsx (AFTER Task 2 — now takes dayKey?: string)
    - src/features/pt/PTSheet.tsx (AFTER Task 3 — now takes editSession?: PTSession)
    - src/features/food/hooks.ts (useAllFoods — MealEntryRow requires `food: Food | undefined` prop; need to look up by foodId)
    - src/features/settings/hooks.ts (useGoals — for D-14 food totals subtitle)
    - src/components/ui/sheet.tsx (Sheet primitive — PTSection analog for the controlled PT edit sheet)
    - src/features/pt/PTSection.tsx lines 44-52 (canonical Sheet+SheetContent+SheetHeader+PTSheet mounting pattern — copy this structure for the PT edit sheet)
    - src/db/schema.ts (MealBucket enum; PTSession shape — for the editingSession state type)
    - src/lib/dayKey.ts (todayKey — for isToday checks)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 240-270 (all Day Detail copy verbatim; past-day edit contract locked)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 434-497 (layout contract)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §DayDetail (lines 324-389)
    - src/features/food/MealEntryRow.tsx lines 119-125 (the #ef4444 destructive color precedent — tokens.css NOT touched in Phase 3 per CONTEXT `<deferred>` + frontmatter destructive_color_policy note above)
  </read_first>
  <action>
Create the composer. This is a single file; below is the full authoritative source.

**`src/features/calendar/DayDetail.tsx`**:

```tsx
// src/features/calendar/DayDetail.tsx
// Per-day detail composer for /#/day/:dayKey. Past-day edit contract (UI-SPEC
// §263-268) fully wired:
//   - Meal edit/delete: reuses Phase 2 MealEntryRow (props take `entry` + `food`,
//     no dayKey needed — the entry.id drives updateMealEntry / deleteMealEntry).
//   - Steps edit: reuses StepsInlineInput with explicit dayKey={dayKey} prop
//     (extended in Task 2 to accept dayKey?: string; default preserves Today
//     behavior for Phase 2 callers).
//   - Lift edit: reuses LiftToggle + LiftNoteInput with explicit dayKey={dayKey}.
//   - PT edit: opens the PT Session Sheet via editSession prop (Task 3 extension).
//     saveSession (put-by-id upsert) preserves the session's dayKey + id, so
//     the record updates in place rather than duplicating.
//
// Destructive color hex carry-forward: the four Delete buttons use the Phase 2
// #ef4444 inline style precedent (see MealEntryRow.tsx:123). Phase 3 does not
// introduce a --destructive token in tokens.css (frontmatter policy note).
//
// D-14 (Phase 2 carry-forward): food totals compare against CURRENT goals —
// useGoals() reads the singleton, no per-day snapshot.
// UI-SPEC `<deferred>`: no backdated NEW-log adding here — edit/delete only.

import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DayDetailHeader } from './DayDetailHeader';
import { DayDetailSection } from './DayDetailSection';
import { useDayDetail } from './hooks';
import { useAllFoods } from '@/features/food/hooks';
import { useGoals } from '@/features/settings/hooks';
import { MealEntryRow } from '@/features/food/MealEntryRow';
import { StepsInlineInput } from '@/features/steps/StepsInlineInput';
import { LiftToggle } from '@/features/lifts/LiftToggle';
import { LiftNoteInput } from '@/features/lifts/LiftNoteInput';
import { PTSheet } from '@/features/pt/PTSheet';
import { deleteSession } from '@/services/pt.svc';
import { deleteSteps } from '@/services/steps.svc';
import { deleteLift } from '@/services/lifts.svc';
import type { Food, MealBucket, PTSession } from '@/db/schema';

interface DayDetailProps {
  dayKey: string;
}

const BUCKET_ORDER: MealBucket[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function DayDetail({ dayKey }: DayDetailProps) {
  const { sessions, meals, steps, lift, totals } = useDayDetail(dayKey);
  const allFoods = useAllFoods();
  const goals = useGoals();

  // Steps row local state: tap "Edit" to reveal StepsInlineInput; commit/cancel hides it.
  const [editingSteps, setEditingSteps] = useState(false);
  // Lift note row local state: mirrors Today's LiftSection pattern — tap "Edit note" to reveal input.
  const [editingLiftNote, setEditingLiftNote] = useState(false);
  // PT edit-sheet: tap a past session's row to open PTSheet in edit mode.
  const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);

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

      {/* ---------- PT ---------- */}
      <DayDetailSection title="PT">
        {(sessions?.length ?? 0) === 0 && (
          <p className="text-sm text-muted">No PT session logged on this day.</p>
        )}
        {(sessions ?? []).map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2">
            <button
              type="button"
              onClick={() => setEditingPTSession(s)}
              aria-label="Edit PT session"
              className="flex-1 text-left text-sm font-semibold text-text py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {`Session · ${s.exercises?.length ?? 0} exercises`}
            </button>
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

      {/* PT edit Sheet (controlled) — UI-SPEC:246 */}
      <Sheet
        open={editingPTSession !== undefined}
        onOpenChange={(open) => { if (!open) setEditingPTSession(undefined); }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
          {editingPTSession && (
            <PTSheet
              onClose={() => setEditingPTSession(undefined)}
              editSession={editingPTSession}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* ---------- Food ---------- */}
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

      {/* ---------- Steps ---------- */}
      <DayDetailSection title="Steps">
        {!steps ? (
          <p className="text-sm text-muted">No steps logged on this day.</p>
        ) : (
          <div className="flex items-center justify-between">
            {editingSteps ? (
              <StepsInlineInput
                dayKey={dayKey}
                currentCount={steps.count}
                onCommitted={() => setEditingSteps(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingSteps(true)}
                aria-label="Edit step count"
                className="text-sm font-semibold text-text py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {steps.count} steps
              </button>
            )}
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

      {/* ---------- Lift ---------- */}
      <DayDetailSection title="Lift">
        {!lift ? (
          <p className="text-sm text-muted">No lift check-in on this day.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <LiftToggle dayKey={dayKey} lifted={lift.lifted} />
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
            {editingLiftNote ? (
              <LiftNoteInput
                dayKey={dayKey}
                currentNote={lift.note ?? ''}
                onCommitted={() => setEditingLiftNote(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingLiftNote(true)}
                aria-label="Edit lift note"
                className="w-full text-left text-sm text-muted py-1 px-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                {lift.note ? lift.note : 'Add a note'}
              </button>
            )}
          </div>
        )}
      </DayDetailSection>
    </div>
  );
}
```

Implementation notes:
- **StepsInlineInput consumption**: reveal-on-tap pattern matches Today's `StepsSection.tsx` for UX consistency; `editingSteps` local state gates the reveal. The `dayKey={dayKey}` prop is the B-1 fix — past-day commit goes to the right day.
- **LiftToggle consumption**: `dayKey={dayKey} lifted={lift.lifted}` — the toggle now writes to the past day. On Today the existing caller passes only `lifted` and gets `todayKey()` fallback.
- **LiftNoteInput consumption**: mirror pattern — tap to reveal input, blur/enter commits to `setLiftNote(dayKey, ...)`.
- **PT edit flow**: tap row → setEditingPTSession(s) → Sheet opens with PTSheet({editSession: s}) → PTSheet resolves templateId → mounts PTSessionForm in edit mode. Save → saveSession upserts by id → useDayDetail re-fires → row re-renders with new exercise count / note.
- **Delete buttons**: 4 total (PT, Meal via MealEntryRow inline, Steps, Lift). MealEntryRow handles its own Delete inline; DayDetail renders Delete for the other 3. Hex `#ef4444` appears in DayDetail.tsx 3 times (PT + Steps + Lift); the Meal delete inside MealEntryRow is already shipped. Acceptance criteria cap at ≤4 (to catch accidental drift beyond the 3 locally rendered + the existing inside-MealEntryRow one — which is in a different file, so this file caps at 3-4 depending on exact rendering pattern).

Do NOT:
- Import from `./dayDetailHooks` — that file is NOT created by this plan. useDayDetail lives in `./hooks` per UI-SPEC:648 (Plan 03-01 authors it).
- Import `db` directly.
- Add a confirmation modal before delete (UI-SPEC:273-278 / Phase 2 D-04).
- Show a "Complete day" / "Finish" / "Confirm day" button (UI-SPEC:288).
- Use `toISOString().split('T')[0]`.
- Render year in the date label (DayDetailHeader owns date formatting).
- Use `navigate(-1)` — DayDetailHeader uses explicit `/calendar`.
- Introduce a custom delete color class — the #ef4444 inline style is the Phase 2 precedent.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/DayDetail.tsx` exits 0
    - `grep -c "export function DayDetail" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "useDayDetail(dayKey)" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "from './hooks'" src/features/calendar/DayDetail.tsx` is 1 (W-1: useDayDetail sourced from canonical hooks.ts)
    - `! grep -E "from './dayDetailHooks'" src/features/calendar/DayDetail.tsx` (no separate dayDetailHooks.ts import)
    - `! test -f src/features/calendar/dayDetailHooks.ts` (file not created)
    - `grep -c "<DayDetailSection title=\"PT\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Food\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Steps\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "<DayDetailSection title=\"Lift\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No PT session logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No meals logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No steps logged on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "No lift check-in on this day" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Edit PT session\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete PT session\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Edit step count\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete step entry\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Delete lift check-in\"" src/features/calendar/DayDetail.tsx` is 1
    - `grep -c "aria-label=\"Edit lift note\"" src/features/calendar/DayDetail.tsx` is 1
    - B-1/W-2: `grep -c "dayKey={dayKey}" src/features/calendar/DayDetail.tsx` is at least 3 (StepsInlineInput + LiftToggle + LiftNoteInput each receive explicit dayKey)
    - B-1: `grep -c "StepsInlineInput" src/features/calendar/DayDetail.tsx` is at least 2 (import + use)
    - B-1: `grep -c "LiftToggle" src/features/calendar/DayDetail.tsx` is at least 2 (import + use)
    - B-1: `grep -c "LiftNoteInput" src/features/calendar/DayDetail.tsx` is at least 2 (import + use)
    - B-2: `grep -c "editSession=" src/features/calendar/DayDetail.tsx` is 1 (PTSheet edit-mode pass-through)
    - B-2: `grep -c "setEditingPTSession" src/features/calendar/DayDetail.tsx` is at least 3 (declare + set + reset)
    - `grep -c "deleteSession\\|deleteSteps\\|deleteLift" src/features/calendar/DayDetail.tsx` is at least 3
    - `! grep -E "from '@/db/db'" src/features/calendar/DayDetail.tsx` (no direct db import)
    - `! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" src/features/calendar/DayDetail.tsx` (Pitfall #4)
    - `! grep -E "confirm\\(" src/features/calendar/DayDetail.tsx` (UI-SPEC:273 — no confirm modal)
    - `! grep -E "Complete day|Finish day|Confirm day" src/features/calendar/DayDetail.tsx` (UI-SPEC:288)
    - W-3: `grep -c "#ef4444" src/features/calendar/DayDetail.tsx` is between 1 and 4 (Phase 2 destructive-color carry-forward; ≤4 matches MealEntryRow precedent cap)
    - `grep -c "useGoals" src/features/calendar/DayDetail.tsx` is 1 (D-14 current-goals for food totals)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>DayDetail.tsx composes 4 section cards with full past-day edit wiring (PT Sheet in edit mode, Steps/Lift via extended dayKey props, Food via MealEntryRow); useDayDetail imported from canonical ./hooks; #ef4444 hex carry-forward capped; compiles.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 6: Create DayDetailScreen.tsx route shell + register /day/:dayKey in App.tsx</name>
  <files>src/routes/DayDetailScreen.tsx, src/App.tsx</files>
  <read_first>
    - src/App.tsx (full file — current Routes declaration; additive `<Route>` goes between `/calendar` and `/settings`)
    - src/routes/CalendarScreen.tsx (existing route-screen shell pattern)
    - src/routes/TodayScreen.tsx (existing route-screen shell pattern)
    - src/features/calendar/DayDetail.tsx (from Task 5 — DayDetailProps shape: `{ dayKey: string }`)
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

The outer `<div className="px-4 py-6">` applies the standard screen-body padding. `space-y-*` is managed by DayDetail itself (`space-y-6` wrapper set in Task 5).

***

**File 2 — Modify `src/App.tsx`** — add one `<Route>` and one import.

**Change 1 — add import after the `SettingsScreen` import (line 5):**
```tsx
import { DayDetailScreen } from './routes/DayDetailScreen';
```

**Change 2 — add a `<Route>` entry between the `/calendar` route and the `/settings` route:**
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
- Modify the HashRouter/AppShell/Routes scaffold beyond the two additive lines.
- Add a catch-all `<Route path="*" element={...} />` — invalid dayKey is already handled by the DayDetailScreen internal `<Navigate>` fall-through.
- Import `DayDetail` directly into App.tsx — App.tsx only sees `DayDetailScreen`.
  </action>
  <verify>
    <automated>npx tsc --noEmit &amp;&amp; npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/routes/DayDetailScreen.tsx` exits 0
    - `grep -c "export function DayDetailScreen" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "useParams" src/routes/DayDetailScreen.tsx` is 1
    - `grep -c "Navigate to=\"/calendar\" replace" src/routes/DayDetailScreen.tsx` is 1
    - `grep -cE "\\\\d\\{4\\}-\\\\d\\{2\\}-\\\\d\\{2\\}" src/routes/DayDetailScreen.tsx` is at least 1
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
  <name>Task 7: Human verify — Day Detail route renders + full edit/delete wiring works</name>
  <files>(none — human-verification checkpoint; no code files touched)</files>
  <action>Run the dev server (`npm run dev`) and walk through the verification steps below. The &lt;what-built&gt; block describes the surface under review; the &lt;how-to-verify&gt; block lists the concrete steps with expected outcomes. Respond via &lt;resume-signal&gt; after completing the walkthrough.</action>
  <what-built>
The Phase 3 Day Detail route is live with FULL past-day edit wiring:
- Tapping any current-month day cell in Calendar navigates to `/#/day/YYYY-MM-DD`
- The Day Detail screen shows header (Back + formatted date + (today) suffix when applicable), summary row ("N of 4 logged"), and 4 section cards (PT, Food, Steps, Lift) in that order
- PT row: tap opens PT Session Sheet in EDIT mode (pre-filled); save updates the same session in place (same dayKey, same id)
- Food rows: reuse Phase 2 MealEntryRow (inline edit servings/bucket; Delete)
- Steps row: tap "{N} steps" reveals StepsInlineInput bound to dayKey; blur commits upsertSteps(dayKey, count) — writing to the correct past day
- Lift row: tap "☐/✓" toggles lifted state for that dayKey (via LiftToggle({dayKey}), not today); tap note reveals LiftNoteInput bound to dayKey
- Delete buttons on each row remove the record immediately (no confirm)
- Invalid route like `/#/day/not-a-date` silently redirects to Calendar
- Today tab behavior is UNCHANGED (default-prop fallback preserves Phase 2 behavior byte-for-byte)
  </what-built>
  <how-to-verify>
1. Dev server running (`npm run dev`)
2. FIRST verify Today still works: Today tab, log something in each of PT/Food/Steps/Lift. Confirm all 4 cards still work exactly as before — that's the "default-prop fallback preserves Phase 2" guarantee.
3. Open Calendar tab — tap any current-month date cell that has at least one log
4. VERIFY URL hash changes to `/#/day/YYYY-MM-DD`
5. VERIFY header shows: `← Back    {Weekday}, {Month} {Day}   [empty]` — and `(today)` appears below the date if it's today
6. VERIFY summary row below header: "N of 4 logged" (or "no logs yet" / "all 4 logged")
7. VERIFY 4 section cards render in order: PT, Food, Steps, Lift
8. For each section: has logs → rows render with edit affordance + Delete button; no logs → `No X logged on this day.` empty copy
9. **PT EDIT (B-2)**: Tap a past PT session row → PT Session Sheet opens with EXISTING session data pre-filled (exercises, pain, notes) → edit some field → tap "Save session" → sheet closes → row re-renders (same session, not duplicated) → Calendar cell quadrant unchanged (still filled, since a session still exists on that day).
10. **FOOD EDIT**: Tap a meal entry → inline edit form appears → edit servings → Save → row updates.
11. **STEPS EDIT (B-1)**: Tap `{N} steps` → input appears with current value → type new value → blur → value commits. Go back to Calendar → tap same day → re-open Day Detail → VERIFY the new count persists (not 0, not today's steps count).
12. **LIFT EDIT (B-1)**: Tap `☐` or `✓` → state toggles for THAT day (not today). Tap note → input appears → type/change → blur commits for THAT day.
13. Tap Delete on any log → the row disappears (no confirm modal).
14. Tap Back → returns to `/#/calendar`.
15. Navigate directly to `/#/day/not-a-date` in the URL bar → silently redirects to `/#/calendar`.
16. Navigate directly to `/#/day/2099-12-31` → renders Day Detail with all sections showing their empty-state copy.
17. **REGRESSION CHECK**: go back to Today tab. Tap the Lift toggle, edit Steps, edit a meal. ALL must still work exactly as Phase 2 (default dayKey prop = todayKey).
18. VERIFY deleting a log on a past day then returning to Calendar reflects the change in the DayCell fill state (useLiveQuery reactivity across the 5 subscriptions in useDayDetail + the 4 in useMonthStreakData).
19. VERIFY no console errors throughout.

If ANY of 3-18 fails → describe the issue. The most important new assertions are steps 9 (PT edit), 11 (Steps past-day edit), 12 (Lift past-day edit) — these are the B-1/B-2 wiring.
  </how-to-verify>
  <acceptance_criteria>
    - Tapping a current-month DayCell navigates to `/#/day/YYYY-MM-DD`
    - Day Detail header + summary row + 4 sections all render
    - PT past-session tap opens PTSheet in edit mode; save updates in place (no duplicate)
    - Steps past-day edit commits to the correct dayKey (not today)
    - Lift past-day toggle / note commits to the correct dayKey (not today)
    - Delete on any row silently removes the record
    - Today tab still works identically to Phase 2 (regression check)
    - Invalid dayKey param redirects to /calendar
    - Valid-but-empty dayKey renders empty-state sections (no redirect)
    - Delete on past-day log updates the Calendar DayCell fill on back-navigation
    - No console errors
  </acceptance_criteria>
  <resume-signal>Type "approved" or describe issues (e.g. "PT save created a duplicate session on today", "steps edit wrote to today not the past day", "Today tab broke after the change", "invalid key doesn't redirect")</resume-signal>
  <verify>
    <automated>MANUAL — executor reports results to the user; the user signals approval via resume-signal. Any automated checks (npx tsc --noEmit, build, lint) run in the preceding implementation tasks before this checkpoint.</automated>
  </verify>
  <done>User responds "approved" (or equivalent) via resume-signal. Any described blockers are triaged into a follow-up plan before execution continues past this wave.</done>
</task>

</tasks>

<threat_model>
  <scope>Hash-route deep link `/#/day/:dayKey` — the ONLY user-influenced input surface in Phase 3. Day Detail aggregates 4 existing Phase 2 services + 3 additive 1-line deletes + 3 dayKey-prop extensions on leaf components + 2 edit-mode extensions on PT sheet/form.</scope>
  <inputs>
    - name: ":dayKey route parameter"
      validated_by: "src/routes/DayDetailScreen.tsx DAYKEY_RE regex `/^\\d{4}-\\d{2}-\\d{2}$/` BEFORE any downstream component sees it; invalid → `<Navigate to='/calendar' replace />`"
      severity_if_unvalidated: "medium — a pass-through of arbitrary strings could feed Dexie `.get(dayKey)` / `.where('dayKey').equals(dayKey)` calls; Dexie safely returns undefined/empty arrays for non-matching keys (no injection vector — IndexedDB string-key lookups are string-equality only), but regex guard at the route boundary keeps things explicit"
    - name: "editSession prop on PTSheet/PTSessionForm"
      validated_by: "internal: DayDetail passes an already-loaded PTSession from useDayDetail's Dexie read; the session's id/dayKey/loggedAt are trusted because they came from IDB"
      severity_if_unvalidated: "low"
  </inputs>
  <data_flow>URL hash → react-router useParams → DayDetailScreen regex validate → DayDetail → useDayDetail(dayKey) → 5 parallel useLiveQuery → service reads → Dexie. Edit actions: DayDetail button onClick → service call (with dayKey or session id) → Dexie put/delete. No network, no external data.</data_flow>
  <threats_considered>
    - Tampering (T): User hand-crafts `/#/day/../../../secret` → regex rejects, redirect to /calendar
    - Information disclosure (I): Valid-format future/ancient dayKey renders empty sections — no leak because there IS no data
    - Denial-of-service (D): Extreme past dayKey → Dexie string comparison is cheap; all 5 queries return empty
    - XSS: All rendered strings are React-escaped; no dangerouslySetInnerHTML anywhere
    - Destructive accidental-click on delete: UI-SPEC:273 inherits Phase 2 D-04 "no confirm" — accepted tradeoff; Phase 4 JSON export is the safety net
    - Session-update collision: PTSheet edit mode preserves session.id + dayKey + loggedAt → saveSession put-by-id updates the existing record rather than creating a duplicate. The session cannot be "moved" to a different day via this path.
  </threats_considered>
  <mitigations>
    - threat: "Malformed :dayKey"
      mitigation: "src/routes/DayDetailScreen.tsx:DAYKEY_RE regex at route boundary"
    - threat: "Steps/Lift past-day edit writing to today (the ORIGINAL B-1 bug)"
      mitigation: "Components extended to accept dayKey?: string; DayDetail explicitly passes dayKey={dayKey}; acceptance criteria grep-enforce at least 3 `dayKey={dayKey}` pass-throughs"
    - threat: "PT edit creating a duplicate session on today (B-2 regression risk)"
      mitigation: "PTSessionForm in edit mode preserves session.id + dayKey + loggedAt; saveSession is a put-by-id upsert (no INSERT path). Acceptance criteria grep for `editSession?.id ?? crypto.randomUUID` + `editSession?.dayKey ?? todayKey`. Human checkpoint explicitly verifies save-doesn't-duplicate."
    - threat: "Destructive delete misclick"
      mitigation: "Documented accepted risk per Phase 2 D-04 + Phase 4 JSON export is the recovery path"
    - threat: "Today regression from Phase 2 component changes"
      mitigation: "All prop extensions are OPTIONAL with defaults; acceptance criteria assert `git diff --quiet` on StepsSection.tsx, LiftSection.tsx, PTSection.tsx (no Today-caller changes). Human checkpoint step 17 regression-tests Today flows."
  </mitigations>
  <residual_risk>low — one regex-validated input is the ONLY user-controllable surface; Phase 4 JSON export mitigates accidental-delete catastrophe; Today callers protected by default-prop backward compatibility</residual_risk>
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0 (full bundle builds with new route)
- All 13 files in `files_modified` exist / contain the stated changes
- Route registration: `grep -E "path=\"/day/:dayKey\"" src/App.tsx` exactly one match
- Regex guard present: `grep -E "\\\\d\\{4\\}-\\\\d\\{2\\}-\\\\d\\{2\\}" src/routes/DayDetailScreen.tsx` at least one match
- Pitfall #4 guard across ALL new files:
  ```
  ! grep -rE "toISOString|\\.split\\('T'\\)|new Date\\([\"'][0-9]" \
      src/routes/DayDetailScreen.tsx \
      src/features/calendar/DayDetail.tsx \
      src/features/calendar/DayDetailSection.tsx \
      src/features/calendar/DayDetailHeader.tsx
  ```
- B-1 guard (DayDetail passes dayKey to the 3 extended Phase 2 components):
  ```
  grep -c "dayKey={dayKey}" src/features/calendar/DayDetail.tsx  # ≥ 3
  ```
- B-1 guard (Phase 2 components accept dayKey):
  ```
  grep -c "dayKey?: string" src/features/steps/StepsInlineInput.tsx  # == 1
  grep -c "dayKey?: string" src/features/lifts/LiftToggle.tsx        # == 1
  grep -c "dayKey?: string" src/features/lifts/LiftNoteInput.tsx     # == 1
  ```
- B-2 guard (PT edit-mode prop wired):
  ```
  grep -c "editSession?: PTSession" src/features/pt/PTSheet.tsx       # == 1
  grep -c "editSession?: PTSession" src/features/pt/PTSessionForm.tsx # == 1
  grep -c "editSession?.id ?? crypto.randomUUID" src/features/pt/PTSessionForm.tsx # == 1
  ```
- W-1 guard (no dayDetailHooks.ts file; useDayDetail sourced from ./hooks):
  ```
  ! test -f src/features/calendar/dayDetailHooks.ts
  grep -c "from './hooks'" src/features/calendar/DayDetail.tsx  # == 1
  ```
- W-3 guard (#ef4444 inline carry-forward capped):
  ```
  grep -c "#ef4444" src/features/calendar/DayDetail.tsx  # 1..4
  ```
- Today regression guard (callers unchanged — the default-prop fallback preserves Phase 2):
  ```
  git diff --quiet src/features/steps/StepsSection.tsx src/features/lifts/LiftSection.tsx src/features/pt/PTSection.tsx
  ```
- Human checkpoint (Task 7) validates full user flow including the critical B-1/B-2 assertions.
</verification>

<success_criteria>
- 13 files modified (6 new + 3 service 1-liners + 3 leaf component prop extensions + 2 PT sheet/form edit-mode extensions + 1 router) — see files_modified
- Zero npm installs, zero schema changes
- `/#/day/YYYY-MM-DD` renders Day Detail for any in-range dayKey
- `/#/day/garbage` silently redirects to `/#/calendar`
- All 4 sections (PT, Food, Steps, Lift) render with logs OR empty-state copy
- Past-day edits write to the correct dayKey (B-1 resolution)
- PT edit opens the Sheet in edit mode and saveSession preserves id/dayKey/loggedAt (B-2 resolution)
- Today callers unchanged (default-prop backward compatibility)
- Delete on any row removes the record and triggers useLiveQuery refresh on Calendar
- Human-verify checkpoint passes
- D-14 current-goals policy honored in food totals subtitle
</success_criteria>

<output>
After completion, create `.planning/phases/03-streak-loop/03-04-SUMMARY.md` documenting:
- All 13 modified/created files
- Explicit confirmation that all three Phase 2 leaf components (StepsInlineInput, LiftToggle, LiftNoteInput) now accept dayKey?: string with todayKey() fallback; today callers are unchanged
- Explicit confirmation that PTSheet + PTSessionForm now accept editSession?: PTSession; saveSession preserves id/dayKey/loggedAt in edit mode; new-session flow unchanged
- Confirmation that useDayDetail is imported from ./hooks (Plan 03-01 canonical placement; no dayDetailHooks.ts created)
- Confirmation of route regex validation
- Confirmation that Phase 2 D-04 (no confirm on delete) is honored
- #ef4444 inline hex-count in DayDetail.tsx (should be between 1 and 4)
- Any deviations from UI-SPEC (expected: none — this revision closes the previous iteration's prose-fallback gap)
- Note for Phase 4 planner: DayDetailHeader right slot is reserved empty; a future `--destructive` token could replace the inline hex if drift becomes a concern
</output>
</content>
</invoke>