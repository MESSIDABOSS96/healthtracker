# Phase 4: Backup & Polish - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 11 (3 NEW + 7 MODIFIED + 1 AUDIT)
**Analogs found:** 10 / 11 (icon audit has no code analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/export.svc.ts` (NEW) | service | batch / read-only aggregate | `src/services/streak.svc.ts` | exact (multi-table Promise.all, read-only, no tx) |
| `src/components/ui/confirm-dialog.tsx` (NEW) | ui-primitive | request-response (modal) | `src/components/ui/sheet.tsx` | exact (same Radix `Dialog` primitive, same controlled pattern) |
| `src/lib/useDayKey.ts` (NEW) | utility-hook | event-driven (timer) | `src/components/EvictionBanner.tsx` (useEffect + cleanup) / `src/features/food/FoodThumb.tsx` (useEffect w/ cleanup) | role-match (no existing setTimeout hook; closest useEffect+cleanup is FoodThumb) |
| `src/lib/storageKeys.ts` (MODIFIED) | utility | config constants | N/A (self-modification — append constant) | exact (append one line) |
| `src/routes/SettingsScreen.tsx` (MODIFIED) | route/screen | composition | self (Install Card already lives here) | exact — insertion site between `<GoalsForm />` and `<div className="flex-1" />` |
| `src/features/calendar/DayDetail.tsx` (MODIFIED) | feature/component | event-driven | self (3 existing delete buttons inline on lines 116-123, 190-198, 214-222) | exact — wraps existing Lift delete button onClick in ConfirmDialog gate |
| `src/features/calendar/hooks.ts` (MODIFIED) | feature/hooks | reactive subscription | self (existing `useCurrentStreakCount`, line 58) | exact — swap `[]` dep for `[useDayKey()]` |
| `src/features/calendar/StreakCount.tsx` (MODIFIED) | feature/component | reactive subscription | self (inline `useLiveQuery` on line 19-22) | exact — replace inline `todayKey()` + `useLiveQuery` with `useDayKey()` + new hook |
| `vite.config.ts` (MODIFIED) | build-config | config | self (existing `VitePWA({ manifest })` block, lines 41-56) | exact — add 2 keys to manifest object |
| `index.html` (MODIFIED) | build-config | config | self (3 apple-* tags already present, lines 9-11) | already-shipped; optional `mobile-web-app-capable` addition |
| `public/icon-maskable-512.png` (AUDIT) | static-asset | N/A | N/A | visual audit only |

---

## Pattern Assignments

### `src/services/export.svc.ts` (NEW — service, batch read-only aggregate)

**Primary analog:** `src/services/streak.svc.ts`
**Secondary analog:** `src/services/lifts.svc.ts` (for idiomatic `export async function` + db-direct style), `src/services/meals.svc.ts` (for read-only `toArray` + plain-object composition)

**Why these analogs:** `streak.svc.ts` is the ONLY existing service that does a **multi-table `Promise.all` over independent Dexie reads** (lines 42-47) with no transaction wrapper — exactly the shape `exportAll()` needs. `lifts.svc.ts` is included for its minimal single-concern service-file structure that `export.svc.ts` should imitate.

**Imports pattern** (from `src/services/streak.svc.ts` lines 12-13 + `src/services/meals.svc.ts` lines 6-7):

```typescript
import { db } from '@/db/db';
import { dateToKey, keyToDate, todayKey } from '@/lib/dayKey';
// For export.svc.ts specifically, ALSO:
import { loadPhoto } from '@/lib/photoStore';
import { APP_VERSION } from '@/lib/version';
import type {
  PTTemplate, PTSession, Food, MealEntry,
  StepEntry, LiftCheckin, Goals,
} from '@/db/schema';
```

**Core pattern — multi-table Promise.all read** (copy from `src/services/streak.svc.ts` lines 42-47):

```typescript
// .between(lo, hi, lowInclusive=true, highInclusive=true) — BOTH booleans MUST
// be present; omitting the second flips highInclusive to false and silently
// drops the last day of the range. See RESEARCH §3 + Dexie docs.
const [sessions, meals, steps, lifts] = await Promise.all([
  db.ptSessions  .where('dayKey').between(startKey, endKey, true, true).toArray(),
  db.mealEntries .where('dayKey').between(startKey, endKey, true, true).toArray(),
  db.stepEntries .where('dayKey').between(startKey, endKey, true, true).toArray(),
  db.liftCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
]);
```

**Apply to `exportAll()`:** same `Promise.all` shape, but each line is `db.{table}.toArray()` (bulk read, no range predicate). Seven tables instead of four. Enumerated form (not `db.tables.map`) preserves narrow typing per returned array.

**No-transaction discipline** (from `src/services/streak.svc.ts` lines 5-7 header comment, also `src/services/meals.svc.ts` line 3):

```typescript
// All dayKey values are passed in by callers (Pitfall #4). No writes, no
// transaction wrapper (Pitfall #1 not applicable — all awaits are Dexie reads).
```

**Apply to `exportAll()`:** No `db.transaction()` wrapper at all. The OPFS `loadPhoto` loop MUST run outside any transaction (Pitfall #1 — the auto-commit + silent-drop hazard applies anywhere a non-IDB await sits in a transaction). Because the export does not write, no transaction is needed at all.

**Database version introspection** (from `src/db/db.ts` lines 45-66 — DB class structure):

```typescript
// HealthTrackerDB extends Dexie
// this.version(1).stores({ ... 7 stores ... })
// db.verno === 1 at runtime
```

**Apply to envelope:** `envelope.schemaVersion = db.verno;` (Dexie-exposed current version, currently 1).

**OPFS read pattern** (from `src/lib/photoStore.ts` lines 32-36):

```typescript
/** Read a photo back as a Blob. Caller is responsible for object-URL lifecycle. */
export async function loadPhoto(filename: string): Promise<Blob> {
  const dir = await getDir();
  const fh = await dir.getFileHandle(filename);
  return await fh.getFile();
}
```

**Apply to `exportAll()`:** sequential `for…of foods` loop, `if (food.photoKey)` guard, `try/catch` around the `loadPhoto(key)` + `FileReader.readAsDataURL(blob)` pair. Skip-with-warning per D-10 — `console.warn` + push to `skippedPhotos[]`, never throw.

**Silent+console error pattern** (from `src/features/food/FoodThumb.tsx` lines 36-40):

```typescript
} catch {
  // Missing/corrupt photo — silently degrade to placeholder.
  if (!cancelled) setUrl(null);
}
```

**Apply to per-photo failure (D-10):** `console.warn` the photoKey + error; push key to `skippedPhotos`; continue the loop. Mirror the FoodThumb "silently degrade" philosophy — one bad photo never aborts the whole export.

---

### `src/components/ui/confirm-dialog.tsx` (NEW — ui-primitive, modal)

**Primary analog:** `src/components/ui/sheet.tsx`

**Why this analog:** Sheet is the ONLY existing consumer of `@radix-ui/react-dialog` (via the bundled `radix-ui` metapackage). ConfirmDialog is the second consumer — zero new deps, same primitive, same import style, same Tailwind visual language.

**Imports pattern** (copy verbatim from `src/components/ui/sheet.tsx` lines 1-5):

```typescript
import * as React from "react"
import { XIcon } from "lucide-react"          // optional; ConfirmDialog may omit
import { Dialog as SheetPrimitive } from "radix-ui"  // rename to DialogPrimitive

import { cn } from "@/lib/utils"
```

**For ConfirmDialog, use:**

```typescript
import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

**Controlled-mode pattern** (from `src/components/ui/sheet.tsx` lines 7-9 + consumer site `src/features/calendar/DayDetail.tsx` lines 129-132):

```typescript
// Sheet primitive (sheet.tsx:7-9):
function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

// Controlled consumer (DayDetail.tsx:129-132):
<Sheet
  open={editingPTSession !== undefined}
  onOpenChange={(open) => { if (!open) setEditingPTSession(undefined); }}
>
```

**Apply to ConfirmDialog:** match the `open` / `onOpenChange` prop shape. Do NOT expose a `Trigger` — ConfirmDialog is always imperatively opened by a parent's state.

**Portal + Overlay + Content** (from `src/components/ui/sheet.tsx` lines 23-42, 55-83):

```typescript
function SheetPortal({ ...props }) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

// Content (key line from sheet.tsx:55-72):
<SheetPortal>
  <SheetOverlay />
  <SheetPrimitive.Content
    data-slot="sheet-content"
    className={cn(
      "fixed z-50 ...",
      className
    )}
    {...props}
  >
    {children}
  </SheetPrimitive.Content>
</SheetPortal>
```

**Apply to ConfirmDialog:** Same `Portal` → `Overlay` → `Content` structure. For Content, use RESEARCH Pattern 5 positioning (`left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm rounded-lg border border-border bg-surface p-4 shadow-lg`). Anti-motion per Phase 1 UI-SPEC — may add `data-[state=closed]:animate-none data-[state=open]:animate-none` matching DayDetail PTSheet precedent (lines 134-136).

**Title + Description bindings for a11y** (from `src/components/ui/sheet.tsx` lines 106-130):

```typescript
function SheetTitle({ className, ...props }) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  )
}

function SheetDescription({ className, ...props }) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}
```

**Apply to ConfirmDialog:** use `DialogPrimitive.Title` + `DialogPrimitive.Description` directly (no per-subcomponent wrapper needed for a single-purpose primitive). Tailwind classes match Phase 1 Card tokens (`text-text` for title, `text-muted` for body) — NOT shadcn's `text-foreground`/`text-muted-foreground`, which don't exist in this project's token set.

**Destructive button styling precedent** (from `src/features/calendar/DayDetail.tsx` line 119 and `src/features/settings/GoalsForm.tsx` lines 106-107):

```typescript
// DayDetail.tsx:119 — destructive inline hex
style={{ color: '#ef4444' }}

// GoalsForm.tsx:106-107 — same hex for error text
<p id="goals-calories-error" className="text-xs" style={{ color: '#ef4444' }}>
```

**Apply to ConfirmDialog:** when `destructive` prop is true, `style={{ backgroundColor: '#ef4444', color: '#fafafa' }}` on the confirm `<Button>`. Matches 4 existing inline `#ef4444` usages in DayDetail + MealEntryRow. A future `--destructive` token migration is tracked in Phase 2 IN-05 and out of Phase 4 scope per D-08.

---

### `src/lib/useDayKey.ts` (NEW — utility-hook, event-driven timer)

**Primary analog:** No existing `setTimeout`-driven hook in the codebase. Closest structural analog: `src/features/food/FoodThumb.tsx` (useEffect + cleanup). Secondary structural reference: `src/components/InstallBanner.tsx` lines 45-49 (addEventListener + cleanup).

**Why these analogs:** The codebase has zero existing timer-based hooks. FoodThumb's useEffect with closure + cleanup is the closest structural pattern; InstallBanner shows the idiomatic cleanup-on-unmount shape.

**Imports pattern** (inferred from `src/features/calendar/hooks.ts` line 20 + `src/lib/dayKey.ts` line 12):

```typescript
import { useEffect, useState } from 'react';
import { todayKey } from '@/lib/dayKey';
```

**Cleanup-on-unmount pattern** (from `src/features/food/FoodThumb.tsx` lines 21-46):

```typescript
export function FoodThumb({ photoKey, size = 20, className }: FoodThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    // ... async work ...

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [photoKey]);
```

**Apply to `useDayKey`:** `useState<string>(() => todayKey())` for initial render; `useEffect(() => { const timer = setTimeout(..., msUntilMidnight()); return () => clearTimeout(timer); }, [key])` — deps are `[key]` (not `[]`) so each tick triggers a fresh reschedule (Pitfall 3 in RESEARCH.md). `msUntilMidnight()` helper uses `next.setHours(24, 0, 5, 0)` for 5-second grace past local midnight (DST-safe per RESEARCH).

**Event-listener cleanup precedent** (from `src/components/InstallBanner.tsx` lines 45-49):

```typescript
useEffect(() => {
  const handler = () => setTick((t) => t + 1);
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);
```

**Apply to `useDayKey`:** same `return () => clearTimeout(timer)` cleanup discipline. Must NOT leak the timer across unmount — Settings/Calendar/Today can all unmount independently.

**dayKey construction via lib** (from `src/lib/dayKey.ts` lines 12-21):

```typescript
export function todayKey(): string {
  return dateToKey(new Date());
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
```

**Apply to `useDayKey`:** MUST call `todayKey()` (never `new Date().toISOString().split('T')[0]` — Pitfall #4 / CLAUDE.md rule #3). The hook returns the same string shape as `todayKey()` so it is a drop-in replacement at call sites.

---

### `src/lib/storageKeys.ts` (MODIFIED — append constant)

**Self-analog** (current state, `src/lib/storageKeys.ts` lines 1-8):

```typescript
// src/lib/storageKeys.ts
// Centralized localStorage keys. No side effects — safe to import from anywhere.
// Prevents circular imports through @/main.tsx (which has module-load side effects:
// initApp() runs on import → renders App → mounts AppShell → mounts EvictionBanner →
// importing keys from main.tsx would create a cycle on the React-component side of the graph).
export const LAST_OPENED_KEY = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
```

**Insertion:** append a single new export. The existing keys use `'healthtracker:<camelCase>'`. CONTEXT.md D-04 suggests `'ht.lastExportedAt'` — **discrepancy**: project convention is `healthtracker:` prefix, not `ht.` prefix. Planner should match the existing convention:

```typescript
export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';
```

**Alternative:** if CONTEXT.md's `'ht.lastExportedAt'` is intentional (matches the inline convention used by `ht.installBannerDismissedAt` in `InstallBanner.tsx:8` and `ht.evictionBannerDismissedAt` in `EvictionBanner.tsx:6`), the value is a judgment call. Note both key-families coexist today:
- `healthtracker:*` in `storageKeys.ts` (3 keys)
- `ht.*` in banner components (2 local-only keys)

Planner should pick one and document. Recommend `'healthtracker:lastExportedAt'` for storageKeys.ts-centralized reuse consistency.

---

### `src/routes/SettingsScreen.tsx` (MODIFIED — insert ExportCard)

**Self-analog** (current state, `src/routes/SettingsScreen.tsx` lines 26-62):

```typescript
return (
  <div className="px-4 py-6 space-y-4 flex flex-col min-h-[calc(100dvh-112px)]">
    <h1 className="text-xl font-semibold">Settings</h1>

    {!installed && (
      <Card className="bg-surface border border-border rounded-lg p-4">
        <h2 className="text-base font-semibold text-text">{'Install HealthTracker'}</h2>
        <p className="text-sm text-muted mt-1">
          {canInstall
            ? "Install HealthTracker to your home screen so your data isn't cleared."
            : 'Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.'}
        </p>
        {canInstall && (
          <div className="mt-3">
            <Button
              variant="default"
              onClick={() => {
                void triggerInstallPrompt();
              }}
            >
              Install
            </Button>
          </div>
        )}
      </Card>
    )}

    <GoalsForm />

    <div className="flex-1" />

    <p className="text-xs text-muted text-center">
      v{APP_VERSION} (build {BUILD_HASH})
    </p>
  </div>
);
```

**Insertion point** (per CONTEXT.md D-01): new `<ExportCard />` sits between `<GoalsForm />` (line 53) and `<div className="flex-1" />` (line 55). No other layout changes.

**Card visual rhythm to match — the Install Card** (SettingsScreen.tsx lines 31-51):

- Outer: `<Card className="bg-surface border border-border rounded-lg p-4">`
- Title: `<h2 className="text-base font-semibold text-text">…</h2>`
- Helper text: `<p className="text-sm text-muted mt-1">…</p>`
- Action row: `<div className="mt-3"><Button variant="default" …>…</Button></div>`

**Apply to ExportCard:** the same 4-element structure (Card → h2 → p → Button-row). Helper text slot additionally carries the D-03 "Last exported: {relative time}" inline line and the D-04 14-day stale nudge. All text, no new Banner primitive (per CONTEXT.md anti-Banner rule).

**Button spinner pattern** (from `@/components/ui/button.tsx` lines 9-15 + `@/lib/installMode.ts` usage) — `lucide-react` icon child wraps inside Button:

```typescript
// The Button primitive (button.tsx:9-15) has:
// 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md'
// The `gap-2` supports an icon+text arrangement natively.

// Apply to D-09 spinner inside the export button:
<Button variant="default" disabled={state === 'exporting'} onClick={onExport}>
  {state === 'exporting' && <Loader2 className="size-4 animate-spin" />}
  {state === 'exporting' ? 'Exporting…' : 'Export data'}
</Button>
```

Precedent for `size-4` + lucide-react icon inside a button is in `src/components/Banner.tsx` line 61 (`<X size={20} />`) and `src/components/ui/sheet.tsx` line 77 (`<XIcon className="size-4" />`).

**Inline error text pattern for D-11 total-failure** (from `src/features/settings/GoalsForm.tsx` lines 105-109):

```typescript
{errors.calories && (
  <p id="goals-calories-error" className="text-xs" style={{ color: '#ef4444' }}>
    {errors.calories.message}
  </p>
)}
```

**Apply to D-11:** a `<p className="text-xs mt-2" style={{ color: '#ef4444' }}>Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding.</p>` rendered conditionally below the Button. NOT a Banner — inline text inside the Card.

---

### `src/features/calendar/DayDetail.tsx` (MODIFIED — wrap Lift delete in ConfirmDialog)

**Self-analog — current destructive button** (`src/features/calendar/DayDetail.tsx` lines 211-223):

```tsx
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
```

**Surgical change** (per D-06): swap `onClick={() => deleteLift(dayKey)}` → `onClick={() => setConfirmDeleteLift(true)}`. Leave the rest of the button untouched (aria-label, className, `#ef4444` styling all retained). Add `useState` hook at top of component (alongside existing `editingSteps`, `editingLiftNote`, `editingPTSession` — lines 51-55):

```tsx
const [editingSteps, setEditingSteps] = useState(false);
const [editingLiftNote, setEditingLiftNote] = useState(false);
const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);
const [confirmDeleteLift, setConfirmDeleteLift] = useState(false);   // NEW
```

**Dialog mount site** (pattern from DayDetail's existing PTSheet mount, lines 128-145 — controlled `open`/`onOpenChange`, placed AFTER the section it serves):

```tsx
<Sheet
  open={editingPTSession !== undefined}
  onOpenChange={(open) => { if (!open) setEditingPTSession(undefined); }}
>
  <SheetContent side="bottom" className="…">
    …
  </SheetContent>
</Sheet>
```

**Apply to ConfirmDialog:** mount at the bottom of the Lift section (or end of the return body, matching PTSheet's placement convention). Structure per RESEARCH Pattern 5:

```tsx
<ConfirmDialog
  open={confirmDeleteLift}
  onOpenChange={setConfirmDeleteLift}
  title="Remove lift check-in?"
  body={`Remove lift check-in for ${dayKey}? Note will be deleted too.`}
  confirmLabel="Remove"
  cancelLabel="Cancel"
  destructive
  onConfirm={() => deleteLift(dayKey)}
/>
```

**Scope guard (D-08):** PT delete button (lines 115-123) and Steps delete button (lines 190-198) are **NOT** wrapped — D-06 explicitly scopes the confirm to Lift only. Phase 3 UI-SPEC intentionally accepts no-confirm UX for PT/Steps.

---

### `src/features/calendar/hooks.ts` (MODIFIED — wire useDayKey through useCurrentStreakCount)

**Self-analog — current hook** (`src/features/calendar/hooks.ts` lines 57-65):

```typescript
/** Reactive streak count. Undefined on first paint; caller coalesces to 0. */
export function useCurrentStreakCount(): number | undefined {
  return useLiveQuery(() => getCurrentStreakCount(), []);
}

/** Reactive earliest-data dayKey for prev-month nav clamp. */
export function useEarliestDayKey(): string | null | undefined {
  return useLiveQuery(() => getEarliestDayKey(), []);
}
```

**Surgical change** (per D-05): insert `useDayKey()` import and pass it as a dep so the live-query re-subscribes when midnight rolls over.

```typescript
import { useDayKey } from '@/lib/useDayKey';

export function useCurrentStreakCount(): number | undefined {
  const today = useDayKey();   // NEW — re-renders + re-subscribes on midnight rollover
  return useLiveQuery(() => getCurrentStreakCount(), [today]);
}
```

**New hook — `useTodayQuadrantState`** (closes WR-02, replaces inline `useLiveQuery` in `StreakCount.tsx` lines 19-26). Pattern from existing `useMonthStreakData` (lines 48-55):

```typescript
// Existing pattern (hooks.ts:48-55):
export function useMonthStreakData(year: number, month0: number): MonthStreakData {
  const { startKey, endKey, cells } = monthRangeKeys(year, month0);
  const data = useLiveQuery(
    () => getStreakDataForRange(startKey, endKey),
    [startKey, endKey],
  );
  return { data, cells, startKey, endKey };
}
```

**Apply to new hook:**

```typescript
export function useTodayQuadrantState(): QuadrantState | undefined {
  const today = useDayKey();
  const row = useLiveQuery(
    () => getStreakDataForRange(today, today),
    [today],
  );
  return row?.get(today);
}
```

---

### `src/features/calendar/StreakCount.tsx` (MODIFIED — consume new hook)

**Self-analog — current inline subscription** (`src/features/calendar/StreakCount.tsx` lines 14-27):

```typescript
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
```

**Surgical change** (per D-05 + RESEARCH Pattern 4 wiring): replace the inline `useLiveQuery` + `todayKey()` pair with the new `useTodayQuadrantState()` hook from `./hooks`. Drops 3 imports (`useLiveQuery`, `getStreakDataForRange`, `todayKey`) from this file if no other callsite uses them here.

```typescript
import { useCurrentStreakCount, useTodayQuadrantState } from './hooks';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;
  const todayState = useTodayQuadrantState();
  const todayIsComplete =
    !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;
  // ...rest unchanged (count === 0 subtitle logic, aria-label, render)
```

---

### `vite.config.ts` (MODIFIED — manifest hygiene)

**Self-analog — current manifest block** (`vite.config.ts` lines 41-56):

```typescript
manifest: {
  name: 'HealthTracker',
  short_name: 'HealthTracker',
  description: 'Personal daily tracker for PT, food, steps, and lifts.',
  theme_color: '#09090b',
  background_color: '#09090b',
  display: 'standalone',
  start_url: '.',
  scope: '.',
  orientation: 'portrait',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
},
```

**Surgical change** (per D-15): add 2 keys. Recommended location: right after `description` (semantic grouping: identity + category hints together), or end of object before `icons`:

```typescript
manifest: {
  name: 'HealthTracker',
  short_name: 'HealthTracker',
  description: 'Personal daily tracker for PT, food, steps, and lifts.',
  id: '/',                                            // NEW (D-15)
  categories: ['health', 'fitness', 'productivity'],  // NEW (D-15)
  theme_color: '#09090b',
  background_color: '#09090b',
  // … rest unchanged
}
```

**Description audit (D-15 sub-item):** current `'Personal daily tracker for PT, food, steps, and lifts.'` is clear and matches PROJECT.md's "daily tracker" framing. **Keep as-is** unless planner identifies staleness.

---

### `index.html` (MODIFIED / ALREADY-SHIPPED audit)

**Self-analog — current state** (`index.html` lines 1-19):

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#09090b" />
    <!-- iOS home-screen install support (vite-plugin-pwa does NOT inject these — iOS Safari reads them from HTML, not the manifest). -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HealthTracker" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <title>HealthTracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Finding:** The 3 D-14 apple-* meta tags **already ship from Phase 1** (lines 9-11 — verbatim match). D-14 as written in CONTEXT.md is effectively **already closed**.

**Research-suggested refinement (RESEARCH.md Pitfall 2 + Open Question 1):** optionally add a standardized `mobile-web-app-capable` tag alongside the apple-prefixed one:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />   <!-- RESEARCH-suggested: Android install correctness -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="HealthTracker" />
```

**Planner decision:** Treat D-14 as "audit + confirm" (already-shipped status quo), OR add the one-line `mobile-web-app-capable` for forward compatibility. Either is defensible.

---

### `public/icon-maskable-512.png` (AUDIT — D-16)

**No code analog** — pure visual check. Existing file at `/Users/anirudhchatterjee/dev/healthtracker/public/icon-maskable-512.png` is already wired into `vite.config.ts` manifest (line 54, `purpose: 'maskable'`).

**Action:** open in https://maskable.app/editor, verify the glyph lives within the inner 60% safe zone + 20% outer margin. Regenerate only if violated. No build wiring change either way.

---

## Shared Patterns

### Service-layer discipline (UI → service → db)

**Source:** `src/services/streak.svc.ts` lines 1-13 (header), `src/services/meals.svc.ts` lines 1-7 (header), `src/services/lifts.svc.ts` lines 1-7 (header)

**Apply to:** `export.svc.ts` — UI (`SettingsScreen`/`ExportCard`) MUST NOT import `db` directly. Only the service imports `@/db/db`. The service returns `{ json, warnings }`; the caller does the DOM-side download trigger.

**Example excerpt — pure service import discipline** (`src/services/lifts.svc.ts` lines 6-7):

```typescript
import { db } from '@/db/db';
import type { LiftCheckin } from '@/db/schema';
```

---

### Pitfall-guard comment headers

**Source:** every service file opens with a header comment naming the Pitfalls it must respect.

**Examples:**

- `src/services/streak.svc.ts:5-6` — "All dayKey values are passed in by callers (Pitfall #4). No writes, no transaction wrapper (Pitfall #1 not applicable…)."
- `src/services/meals.svc.ts:3-4` — "All dayKey values are passed in by callers — services never call new Date() to derive dayKey (Pitfall #4). Single-statement Dexie puts auto-transaction; no explicit wrapper needed (Pitfall #1)."
- `src/services/lifts.svc.ts:1-4` — "Natural-key upsert into liftCheckins (dayKey is PK — one record per day). Schema field is `lifted: boolean` (NOT `didLift`) — see schema.ts. dayKey is passed by callers (Pitfall #4)."

**Apply to `export.svc.ts`:** open with a header naming Pitfall #1 (no transaction around non-IDB awaits — the OPFS loop), Pitfall #4 (filename uses `todayKey()` not UTC-ISO), Pitfall #6 (photos via `loadPhoto`, never raw Dexie blobs). RESEARCH Assumption A2 (no exotic JSON.stringify types) can also go here.

---

### Card + helper-text + Button row (Settings Card rhythm)

**Source:** `src/routes/SettingsScreen.tsx` lines 31-51 (Install Card) is the visual template.

**Structure:**

```typescript
<Card className="bg-surface border border-border rounded-lg p-4">
  <h2 className="text-base font-semibold text-text">{title}</h2>
  <p className="text-sm text-muted mt-1">{helperText}</p>
  {optionalAction && (
    <div className="mt-3">
      <Button variant="default" onClick={…}>{…}</Button>
    </div>
  )}
</Card>
```

**Apply to:** ExportCard (new inline or extracted) — **must match this rhythm** so Settings reads as a single visual family. The GoalsForm Card (`src/features/settings/GoalsForm.tsx` line 91) uses a slightly richer `space-y-4` variant for form-internal spacing — ExportCard is closer to the Install Card shape (one helper paragraph + one action button).

---

### `radix-ui` metapackage import pattern

**Source:** `src/components/ui/sheet.tsx` line 3 is the ONLY current consumer.

```typescript
import { Dialog as SheetPrimitive } from "radix-ui"
```

**Apply to:** `confirm-dialog.tsx` — same metapackage, renamed local alias. Do NOT import the `@radix-ui/react-dialog` scoped package directly (the project uses the bundled metapackage for dedup).

```typescript
import { Dialog as DialogPrimitive } from 'radix-ui';
```

---

### localStorage-as-ephemeral-state reads + writes

**Source:** `src/components/EvictionBanner.tsx` lines 40-56 (`localStorage.getItem(KEY) ?? '0'` + `Number(...)` pattern), `src/components/InstallBanner.tsx` lines 35-41 (same pattern), and writes in `EvictionBanner.tsx:76` + `InstallBanner.tsx:75`:

```typescript
// Read:
const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
if (dismissed && Date.now() - dismissed < DISMISS_WINDOW_MS) { … }

// Write:
localStorage.setItem(DISMISS_KEY, String(Date.now()));
```

**Apply to:** `LAST_EXPORTED_KEY` read/write in ExportCard and export.svc.ts onSuccess callback:

```typescript
// Read (mount-time useEffect in ExportCard):
const raw = localStorage.getItem(LAST_EXPORTED_KEY);
const lastExportedAt = raw ? Number(raw) : null;

// Write (after successful export):
localStorage.setItem(LAST_EXPORTED_KEY, String(Date.now()));
```

---

### Destructive-intent styling (`#ef4444` inline hex)

**Source:** four existing call sites:
- `src/features/calendar/DayDetail.tsx:119` (PT delete)
- `src/features/calendar/DayDetail.tsx:194` (Steps delete)
- `src/features/calendar/DayDetail.tsx:218` (Lift delete)
- `src/features/food/MealEntryRow.tsx:123` (meal delete — per IN-05 comment in RESEARCH Pattern 5)
- `src/features/settings/GoalsForm.tsx:106, 124, 142, 160, 178` (validation-error text)

**Pattern:** `style={{ color: '#ef4444' }}` (text) or `style={{ backgroundColor: '#ef4444', color: '#fafafa' }}` (button background — new in ConfirmDialog).

**Apply to:** ConfirmDialog `destructive` prop; D-11 inline error text in ExportCard. A `--destructive` token migration is tracked in Phase 2 IN-05 and out of Phase 4 scope per D-08.

---

### Silent + console.warn pattern for non-critical errors

**Source:** `src/features/food/FoodThumb.tsx` lines 36-40, `src/db/db.ts` transaction rule comment, and Phase 1 `initApp()` precedent.

```typescript
} catch {
  // Missing/corrupt photo — silently degrade to placeholder.
  if (!cancelled) setUrl(null);
}
```

**Apply to:** per-photo failure in `exportAll()` (D-10) — `console.warn('[export] skipping photo', key, err)` + push key to `skippedPhotos[]`. Never abort the loop. Mirrors FoodThumb's philosophy.

---

### Controlled-mode Radix primitives (`open` / `onOpenChange`)

**Source:** `src/features/calendar/DayDetail.tsx` lines 129-145 (PTSheet mount — the sole existing controlled Radix consumer):

```typescript
<Sheet
  open={editingPTSession !== undefined}
  onOpenChange={(open) => { if (!open) setEditingPTSession(undefined); }}
>
  <SheetContent side="bottom" className="…">
    <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
    {editingPTSession && (
      <PTSheet
        onClose={() => setEditingPTSession(undefined)}
        editSession={editingPTSession}
      />
    )}
  </SheetContent>
</Sheet>
```

**Apply to:** ConfirmDialog consumer site in DayDetail — same `open` / `onOpenChange` controlled pattern. State lives in the parent (`confirmDeleteLift` boolean), not the primitive.

---

## No Analog Found

| File | Role | Data Flow | Reason / Fallback |
|------|------|-----------|-------------------|
| `src/lib/useDayKey.ts` (timer internals) | utility-hook | event-driven (setTimeout) | No existing `setTimeout`-driven hook in the codebase. Structural cleanup-on-unmount analog is `src/features/food/FoodThumb.tsx` (different data flow — OPFS read, not timer — but identical useEffect-with-cleanup structure). **Use RESEARCH.md Pattern 4** as the verbatim reference for the timer internals. |
| `public/icon-maskable-512.png` | static-asset | N/A | Visual audit only — no code to model. Use https://maskable.app/editor for the check (per D-16). |

Everything else has an exact or role-match analog in the existing codebase.

---

## Metadata

**Analog search scope:** `src/services/`, `src/components/ui/`, `src/components/`, `src/lib/`, `src/features/calendar/`, `src/features/settings/`, `src/features/food/`, `src/features/steps/`, `src/features/lifts/`, `src/routes/`, `src/db/`, root config files.

**Files scanned (read):** 18 (streak.svc.ts, lifts.svc.ts, meals.svc.ts, sheet.tsx, card.tsx, button.tsx, storageKeys.ts, photoStore.ts, dayKey.ts, version.ts, SettingsScreen.tsx, DayDetail.tsx, calendar/hooks.ts, StreakCount.tsx, EvictionBanner.tsx, InstallBanner.tsx, Banner.tsx, GoalsForm.tsx, db.ts, schema.ts, StepsInlineInput.tsx, FoodThumb.tsx, installMode.ts, vite.config.ts, index.html).

**Pattern extraction date:** 2026-04-21.

## PATTERN MAPPING COMPLETE
