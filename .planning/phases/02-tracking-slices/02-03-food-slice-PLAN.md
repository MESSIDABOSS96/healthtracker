---
phase: 02-tracking-slices
plan: 03
type: execute
wave: 3
depends_on: [1, 2]
files_modified:
  - src/features/food/hooks.ts
  - src/features/food/FoodSection.tsx
  - src/features/food/FoodSheet.tsx
  - src/features/food/MacroTotalsBar.tsx
  - src/features/food/QuickLogChip.tsx
  - src/features/food/QuickLogChipRow.tsx
  - src/features/food/FoodPicker.tsx
  - src/features/food/FoodCreateForm.tsx
  - src/features/food/TodayMealList.tsx
  - src/features/food/MealEntryRow.tsx
  - src/features/food/FoodThumb.tsx
autonomous: true
requirements: [FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05, FOOD-06, FOOD-07, FOOD-08]
requirements_addressed: [FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05, FOOD-06, FOOD-07, FOOD-08]
must_haves:
  truths:
    - "Tapping the Food card on Today opens a bottom Sheet titled 'Log food' with no slide animation"
    - "Inside the Sheet: sticky macro totals bar is pinned at top; below it in order: Recent chips, Frequent chips, search input, today's meals section"
    - "Recent chips list the last 10 deduped foods; Frequent chips list top-8 in last 30 days"
    - "Tapping a chip immediately logs a meal with last-used servings and auto-inferred bucket (FOOD-03, FOOD-04, FOOD-05)"
    - "Typing in search produces interactive filter rows: tap the row body to log that food with last-used servings + auto bucket; tap the row's overflow menu to delete the food"
    - "Typing in search with no matches surfaces 'Create \"{query}\"' row; tapping it opens the inline create-food form"
    - "Saving the create-food form with valid inputs writes the Food to the library AND creates a MealEntry for today with the just-created food (D-06)"
    - "Photo capture uses <input capture=environment>; on save the photo is resized via photoStore.resizePhoto BEFORE any Dexie write (Pitfall #1/#8)"
    - "Today's meals list groups entries into 4 fixed sections (Breakfast / Lunch / Dinner / Snack) per D-18; empty sections show em-dash"
    - "Tapping a meal row expands inline-edit mode; only servings + bucket are editable (D-20); foodId immutable"
    - "Delete button on the inline-edit row immediately removes the entry (no confirm modal)"
    - "Food Sheet's macro totals bar updates live as meals are logged/edited/deleted (FOOD-07 reactivity)"
    - "Delete entry in picker search-row overflow menu removes the Food AND its OPFS photo (FOOD-02 scope: create + delete only per D-17) — guarded by a single window.confirm('Delete {name}? …') call, no shadcn AlertDialog"
  artifacts:
    - path: "src/features/food/hooks.ts"
      provides: "useTodayEntries, useDailyTotals, useRecentFoods, useFrequentFoods, useAllFoods, useLastServingsForFood"
    - path: "src/features/food/FoodSection.tsx"
      provides: "Today-card wrapper that opens the Food Sheet; renders 4 macro ProgressBars below card (UI-SPEC exception for Food)"
    - path: "src/features/food/FoodSheet.tsx"
      provides: "Top-level Sheet with D-05 vertical order: MacroTotalsBar → QuickLogChipRow(Recent) → QuickLogChipRow(Frequent) → FoodPicker → TodayMealList. Stubbed as REQUIRED artifact in Task 1; full implementation in Task 3."
    - path: "src/features/food/MacroTotalsBar.tsx"
      provides: "Sticky 56px bar with 4 columns (cal/P/C/F), 4px inline thin-bars (bg-white/[0.08] + bg-accent, rendered inline — ProgressBar NOT reused here), divide-x border"
    - path: "src/features/food/QuickLogChip.tsx"
      provides: "40px pill button with optional 20px photo thumb leading; one-tap log"
    - path: "src/features/food/QuickLogChipRow.tsx"
      provides: "Horizontal-scroll chip container with section label + empty-state handling"
    - path: "src/features/food/FoodPicker.tsx"
      provides: "Search input + interactive filter-result rows (tap-to-log via onLog prop; ⋯ overflow with Delete) + 'Create {query}' inline-create trigger (FOOD-02 delete affordance lives here per D-17)"
    - path: "src/features/food/FoodCreateForm.tsx"
      provides: "RHF+Zod form with name/macros/servingLabel/photoFile fields; onSubmit calls createFood then logMeal (D-06)"
    - path: "src/features/food/TodayMealList.tsx"
      provides: "Section-grouped today's meals per D-18 (4 bucket sections always rendered)"
    - path: "src/features/food/MealEntryRow.tsx"
      provides: "Resting + inline-edit expand; servings + bucket editable; Delete inline"
    - path: "src/features/food/FoodThumb.tsx"
      provides: "OPFS Object URL lifecycle wrapper (create in useEffect, revoke in cleanup)"
  key_links:
    - from: "src/features/food/FoodSheet.tsx"
      to: "src/services/meals.svc.ts"
      via: "useDailyTotals + useTodayEntries + useRecentFoods + useFrequentFoods"
      pattern: "useDailyTotals|useTodayEntries|useRecentFoods|useFrequentFoods"
    - from: "src/features/food/FoodCreateForm.tsx"
      to: "src/services/food.svc.ts:createFood"
      via: "onSubmit handler; photo resize happens inside createFood BEFORE Dexie write"
      pattern: "createFood\\("
    - from: "src/features/food/FoodCreateForm.tsx"
      to: "src/services/meals.svc.ts:logMeal"
      via: "D-06: save-and-log in a single action after createFood returns"
      pattern: "logMeal\\("
    - from: "src/features/food/QuickLogChip.tsx"
      to: "src/services/meals.svc.ts:logMeal"
      via: "onClick calls logMeal with inferBucket()"
      pattern: "logMeal\\("
    - from: "src/features/food/FoodPicker.tsx"
      to: "src/services/food.svc.ts:deleteFood"
      via: "search-row overflow → Delete handler (D-17 FOOD-02 delete scope)"
      pattern: "deleteFood\\("
    - from: "src/features/food/FoodPicker.tsx"
      to: "onLog callback (prop)"
      via: "search-row body onClick → parent handleChipLog (shared with chip rows; FoodSheet owns the handler in Task 3)"
      pattern: "onClick=\\{.*onLog\\("
    - from: "src/features/food/MealEntryRow.tsx"
      to: "src/services/meals.svc.ts:updateMealEntry + deleteMealEntry"
      via: "inline-edit Save / Delete handlers"
      pattern: "updateMealEntry|deleteMealEntry"
---

<objective>
Ship the Food tracking slice end-to-end: the Today-card Food section, the bottom Food Sheet with its 4-tier layout (macro bar / Recent / Frequent / search+create / today's meals grouped by bucket), inline create-food with photo, inline-edit meal rows, and per-food delete from the picker overflow. This is the most complex slice in Phase 2 and is intentionally carved into 3 tasks along natural boundaries: (1) hooks + primitives + section wrapper + REQUIRED FoodSheet stub, (2) picker (with tap-to-log via onLog + delete overflow) + create-form + photo, (3) today's meals list + inline-edit + final FoodSheet composition.

Purpose: Directly delivers FOOD-01..FOOD-08. D-05/D-06/D-07/D-08/D-17/D-18/D-20 all manifest here. Pitfall #1 (Dexie transaction safety) and Pitfall #8 (photo resize) are load-bearing.

Output: A fully working Food feature reachable from Today: user can tap the Food card, see live totals, re-log via chip, create a new food with photo, edit/delete today's meals, and delete foods from the library.
</objective>

<execution_context>
@.claude/skills/get-shit-done/workflows/execute-plan.md
@.claude/skills/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/02-tracking-slices/02-CONTEXT.md
@.planning/phases/02-tracking-slices/02-RESEARCH.md
@.planning/phases/02-tracking-slices/02-PATTERNS.md
@.planning/phases/02-tracking-slices/02-UI-SPEC.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@src/db/schema.ts
@src/services/food.svc.ts
@src/services/meals.svc.ts
@src/services/goals.svc.ts
@src/lib/dayKey.ts
@src/lib/photoStore.ts
@src/lib/utils.ts
@src/components/ProgressBar.tsx
@src/components/ui/sheet.tsx
@src/components/ui/card.tsx
@src/components/ui/button.tsx
@src/features/settings/hooks.ts

<interfaces>
From Plan 02-01 services (available):
```typescript
// food.svc.ts
export function createFood(params: {name; calories; proteinG; carbsG; fatG; servingLabel; photoFile?: File|null}): Promise<Food>;
export function deleteFood(id: string): Promise<void>;
export function searchFoods(query: string): Promise<Food[]>;

// meals.svc.ts
export function logMeal(params: {food: Food; servings: number; bucket: MealBucket; dayKey: string}): Promise<void>;
export function updateMealEntry(id: string, patch: {servings: number; bucket: MealBucket}): Promise<void>;
export function deleteMealEntry(id: string): Promise<void>;
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;
export function getDailyTotals(dayKey: string): Promise<DailyTotals>;
export function getRecentFoods(limit?: number): Promise<Food[]>;
export function getFrequentFoods(limit?: number): Promise<Food[]>;
export function getLastServingsForFood(foodId: string): Promise<number | undefined>;
```

From Plan 02-02:
```typescript
export function useGoals(): Goals | undefined;  // used by MacroTotalsBar + FoodSection progress bars
```

From Plan 02-01 primitives:
```typescript
// ProgressBar consumed on Today card only (4× in FoodSection). MacroTotalsBar renders inline 4px thin-bars, NOT ProgressBar.
// inferBucket(date?) → MealBucket for auto-inference
```

From src/lib/photoStore.ts (existing):
```typescript
export function savePhoto(blob: Blob): Promise<string>;       // returns photoKey filename
export function loadPhoto(photoKey: string): Promise<Blob | null>;
export function deletePhoto(photoKey: string): Promise<void>;
export function resizePhoto(file: File): Promise<Blob>;       // WebP@80%, 800×800
```

From src/db/schema.ts:
```typescript
export interface Food { id: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; servingLabel: string; photoKey?: string; createdAt: number; }
export type MealBucket = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface MealEntry { id: string; dayKey: string; foodId: string; servings: number; bucket: MealBucket; loggedAt: number; computedCalories: number; computedProteinG: number; computedCarbsG: number; computedFatG: number; }
```

This plan creates (hooks API that Plan 02-05 consumes for the Today Food card):
```typescript
// src/features/food/hooks.ts
export function useTodayEntries(): MealEntry[] | undefined;
export function useDailyTotals(): DailyTotals | undefined;
export function useRecentFoods(): Food[] | undefined;
export function useFrequentFoods(): Food[] | undefined;
export function useAllFoods(): Food[] | undefined;                 // for FoodPicker search base
export function useLastServingsForFood(foodId: string): number | undefined;
```

This plan creates (FoodPicker public API consumed by FoodSheet in Task 3):
```typescript
// src/features/food/FoodPicker.tsx
export interface FoodPickerProps {
  onLog: (food: Food) => void;   // REQUIRED — fires when user taps a search-result row
  onLogged: () => void;          // fires after create-and-log completes; parent closes Sheet
}
```
</interfaces>
</context>

<threat_model>
Per RESEARCH.md §Security Domain: no new trust boundary in Phase 2. Plan-specific mitigations:
- **Untrusted photo file upload**: `photoStore.resizePhoto()` (Phase 1) calls `createImageBitmap(file)` which throws on non-image inputs; `createFood()` try/catches this and sets `photoKey: undefined`, degrading gracefully (no food-without-food written). Mitigation is inherited from Phase 1 — this plan does not bypass it.
- **Long search-query DoS** via `.toLowerCase().includes()`: bounded to library size O(n) with n <~500 expected (solo user); substring filter is in-memory after one `.orderBy('name').toArray()`; acceptable at this scale.
- **Accidental food deletion**: picker overflow Delete is guarded by a single `window.confirm(…)` call (explicit D-17 carveout — this is the ONE place in Phase 2 where a native confirm fires, because photo-cascade-delete is irreversible and destroys OPFS state). Meal entry deletion remains silent (no confirm) per UI-SPEC §"Destructive confirmations: NONE" (meal entries are per-day ephemera — trivial to re-log).
- **Integer overflow on macros**: Zod `.int().min(0).max(10_000)` per-field on the create-food form prevents pasted absurd values from corrupting `computedCalories` = `calories * servings`.
- **No `dangerouslySetInnerHTML` anywhere.** All user-supplied `food.name`, `food.servingLabel`, `mealEntry.notes` rendered as React text children (auto-escaped).
- **Object URL leak** (would exhaust memory over time): `FoodThumb.tsx` mandates `URL.createObjectURL` inside `useEffect`, `URL.revokeObjectURL` in cleanup — covered by RESEARCH.md Pattern 6 and acceptance criterion in Task 3 below.
</threat_model>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Food hooks + shared primitives + Food Section (Today card wrapper) + REQUIRED FoodSheet stub</name>
  <files>src/features/food/hooks.ts, src/features/food/FoodThumb.tsx, src/features/food/QuickLogChip.tsx, src/features/food/QuickLogChipRow.tsx, src/features/food/MacroTotalsBar.tsx, src/features/food/FoodSection.tsx, src/features/food/FoodSheet.tsx</files>
  <read_first>
    - src/services/meals.svc.ts (all the functions this plan's hooks wrap)
    - src/services/food.svc.ts
    - src/features/settings/hooks.ts (useGoals — pattern analog and consumed by MacroTotalsBar)
    - src/features/food/hooks.ts (placeholder from P1; `export {};`)
    - src/components/ProgressBar.tsx (primitive consumed 4× in FoodSection ONLY; NOT in MacroTotalsBar — W-03 mandate: MacroTotalsBar renders a dedicated thin inline bar, do not modify ProgressBar)
    - src/lib/photoStore.ts (loadPhoto signature for FoodThumb)
    - src/lib/utils.ts (cn helper)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/<domain>/hooks.ts" lines 695–726 (canonical shape)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/food/FoodThumb.tsx" lines 780–785 (Pitfall #3 Object URL lifecycle)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md Pattern 6 lines 613–645 (FoodThumb full code)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"Today-card frame components" lines 636–691 (FoodSection pattern — exact Card + Sheet wrapper to copy)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card status slot (live layout)" lines 560–571 (Food card gets 4 ProgressBars under it — only card in Phase 2 with a bar stack)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card populated-status copy patterns" lines 184–205 (exact Food status string formats + D-16 sentinel variants + `Math.round` note)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Sticky macro totals bar (Food Sheet only)" lines 461–473 (layout: sticky top-0, 56px, flex-1 × 4, divide-x, 4px thin-bar per column — `h-1`)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Quick-log chip" lines 476–495 + §"Quick-log chip row" lines 498–504
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Food Sheet copy" lines 212–246 (exact label strings)
  </read_first>
  <action>
    File 1 — `src/features/food/hooks.ts` (REPLACE placeholder).
    Implement 6 useLiveQuery wrappers exactly matching the `<interfaces>` block above. Canonical pattern from 02-PATTERNS.md lines 701–721:

    ```typescript
    import { useLiveQuery } from 'dexie-react-hooks';
    import { getTodayEntries, getDailyTotals, getRecentFoods, getFrequentFoods, getLastServingsForFood } from '@/services/meals.svc';
    import { db } from '@/db/db';
    import { todayKey } from '@/lib/dayKey';

    export function useTodayEntries() {
      return useLiveQuery(() => getTodayEntries(todayKey()), []);
    }
    export function useDailyTotals() {
      return useLiveQuery(() => getDailyTotals(todayKey()), []);
    }
    export function useRecentFoods() {
      return useLiveQuery(() => getRecentFoods(10), []);
    }
    export function useFrequentFoods() {
      return useLiveQuery(() => getFrequentFoods(8), []);
    }
    export function useAllFoods() {
      return useLiveQuery(() => db.foods.orderBy('name').toArray(), []);
    }
    export function useLastServingsForFood(foodId: string) {
      return useLiveQuery(() => getLastServingsForFood(foodId), [foodId]);
    }
    ```

    NOTE: `useAllFoods` is the ONE place in the feature layer that imports `db` directly (for orderBy queries the meals service doesn't expose). This is acceptable because a hooks.ts file is already a reactive-read layer, not a UI component. Other features will not replicate this pattern.

    File 2 — `src/features/food/FoodThumb.tsx` (NEW). Copy 02-RESEARCH.md Pattern 6 lines 613–645 verbatim. The component takes `photoKey: string | undefined` and optional `size: number = 20` (chip thumbs) or `40` (meal row thumbs). It MUST:
    - In `useEffect([photoKey])`: call `loadPhoto(photoKey)` → `URL.createObjectURL(blob)` → setState
    - In cleanup: `URL.revokeObjectURL(url)` if url exists
    - Render `<img src={url} alt="" className={cn('rounded-full object-cover', `w-[${size}px]`, `h-[${size}px]`)} />` when url exists
    - Render a muted placeholder `<div className="rounded-full bg-surface border border-border" style={{width:size,height:size}} />` when photoKey is undefined OR url hasn't resolved yet
    - NEVER inline `URL.createObjectURL()` in JSX (memory leak — Pitfall #3 / RESEARCH.md Pitfall 6)

    File 3 — `src/features/food/QuickLogChip.tsx` (NEW). `forwardRef<HTMLButtonElement>`. Props: `{ food: Food; onLog: (food: Food) => void; className?: string }`. Layout per UI-SPEC §"Quick-log chip":
    - `<button type="button" onClick={() => onLog(food)} ref={ref} className={cn('h-10 px-3 inline-flex items-center gap-2 rounded-full bg-surface border border-border text-text text-sm whitespace-nowrap hover:bg-border/40 active:bg-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg', className)} aria-label={`Log ${food.name}`}>`
    - If `food.photoKey`: leading `<FoodThumb photoKey={food.photoKey} size={20} />`
    - Label: `<span>{food.name}</span>`
    - `displayName = 'QuickLogChip'`
    - Do NOT use `cva` variants (only one visual state per UI-SPEC §"Quick-log chip").

    File 4 — `src/features/food/QuickLogChipRow.tsx` (NEW). Props: `{ label: string; foods: Food[] | undefined; emptyCopy?: string; onLog: (food: Food) => void }`. Per UI-SPEC §"Quick-log chip row":
    - Renders a section label (Label role, uppercase tracking-wide `text-xs text-muted uppercase tracking-wide px-4`)
    - If `foods` is undefined → render nothing (loading)
    - If `foods.length === 0` and `emptyCopy` provided → render emptyCopy as `<p className="px-4 text-sm text-muted">{emptyCopy}</p>`
    - If `foods.length === 0` and no emptyCopy (Frequent case) → render nothing (row hidden entirely per UI-SPEC)
    - Otherwise: `<div className="flex overflow-x-auto gap-2 px-4 py-1">{foods.map(f => <QuickLogChip key={f.id} food={f} onLog={onLog} />)}</div>`
    - The `mask-image` fade is OPTIONAL per UI-SPEC; skip if it complicates rendering.

    File 5 — `src/features/food/MacroTotalsBar.tsx` (NEW).

    **W-03 MANDATE — inline thin-bar, DO NOT modify ProgressBar.** MacroTotalsBar renders its own dedicated 4px thin bar per column inline, using Tailwind utilities only. It MUST NOT import `ProgressBar` from `@/components/ProgressBar`. This keeps the shared ProgressBar primitive at its 8px geometry for its other 4 consumers (FoodSection card) and guarantees the Food Sheet's 4px column bars stay decoupled.

    Per UI-SPEC §"Sticky macro totals bar":
    - Imports `useDailyTotals` from `./hooks` and `useGoals` from `@/features/settings/hooks`
    - Container: `<div className="sticky top-0 z-10 h-14 bg-surface border-b border-border flex divide-x divide-border">` (z-10 so it sits above scrolling content but below the Sheet header)
    - Four equal-width columns — one per macro. Each column:

      ```tsx
      <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-1">
        <span className="text-base font-semibold text-text tabular-nums">{Math.round(consumed)}</span>
        <span className="text-xs text-muted">{unitLabel}</span>
        {/* 4px inline thin-bar — W-03: do NOT use ProgressBar here. */}
        {target > 0 ? (
          <div className="w-full h-1 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.min(100, (consumed / target) * 100)}%` }}
            />
          </div>
        ) : null /* D-16 zero-target sentinel: consumed-only, no bar */}
      </div>
      ```

    - Exact unit labels per UI-SPEC §"Food Sheet copy" table: `cal` / `P` / `C` / `F`
    - Map macros: `consumed` from `useDailyTotals()?.calories/proteinG/carbsG/fatG`; `target` from `useGoals()?.calories/proteinG/carbsG/fatG` (default 0 if undefined — triggers D-16 sentinel: bar omitted entirely)
    - DO NOT render `<ProgressBar>` anywhere in this file. DO NOT modify `src/components/ProgressBar.tsx` from this task (or any task in this plan).

    File 6 — `src/features/food/FoodSection.tsx` (NEW). Today-card wrapper that opens Food Sheet. Pattern copied from 02-PATTERNS.md lines 650–686 (PT analog — substitute Food):

    ```tsx
    import { useState } from 'react';
    import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
    import { Card } from '@/components/ui/card';
    import { ProgressBar } from '@/components/ProgressBar';
    import { FoodSheet } from './FoodSheet';
    import { useDailyTotals } from './hooks';
    import { useGoals } from '@/features/settings/hooks';

    export function FoodSection() {
      const [open, setOpen] = useState(false);
      const totals = useDailyTotals();
      const goals = useGoals();

      const calsConsumed = Math.round(totals?.calories ?? 0);
      const calsTarget = goals?.calories ?? 0;

      // UI-SPEC Today-card populated-status Food table:
      const statusText =
        calsTarget === 0 && calsConsumed > 0 ? `${calsConsumed} cal` :
        calsTarget === 0 && calsConsumed === 0 ? '—' :
        `${calsConsumed} / ${calsTarget} cal`;

      return (
        <>
          <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
            <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-text">Food</h2>
                <span className="text-sm text-muted">{statusText}</span>
              </div>
              {/* UI-SPEC Food card exception: 4 macro ProgressBars stacked below card header */}
              <div className="space-y-2">
                <ProgressBar value={Math.round(totals?.calories ?? 0)} max={goals?.calories ?? 0} label="Cal" />
                <ProgressBar value={Math.round(totals?.proteinG ?? 0)} max={goals?.proteinG ?? 0} label="P" />
                <ProgressBar value={Math.round(totals?.carbsG ?? 0)} max={goals?.carbsG ?? 0} label="C" />
                <ProgressBar value={Math.round(totals?.fatG ?? 0)} max={goals?.fatG ?? 0} label="F" />
              </div>
            </Card>
          </button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
            >
              <SheetHeader><SheetTitle>Log food</SheetTitle></SheetHeader>
              <FoodSheet onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      );
    }
    ```

    File 7 — `src/features/food/FoodSheet.tsx` (REQUIRED STUB — W-04 mandate). Create this stub so the module tree compiles at the end of Task 1 (FoodSection imports FoodSheet). Task 3 overwrites this file with the full composition.

    ```typescript
    // src/features/food/FoodSheet.tsx
    // Stub — Task 3 overwrites with the full D-05 vertical composition
    // (MacroTotalsBar → Recent chips → Frequent chips → FoodPicker → TodayMealList).
    // Intentionally renders nothing so Task 1 leaves the tree in a compilable state.
    export function FoodSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
      // `open` / `onOpenChange` in the stub signature match the real props shape Task 3 may expose;
      // FoodSection currently passes `onClose={…}`, so Task 3 can converge on `{ onClose: () => void }`.
      // Either signature compiles against this `null` return while stubbed.
      void open; void onOpenChange;
      return null;
    }
    ```

    NOTE: Task 3 will REPLACE this stub wholesale with the real component signature (`{ onClose }`). Having the file present and exporting `FoodSheet` at Task 1 end means `npx tsc --noEmit` passes after Task 1, satisfying the end-of-task build gate and removing the "tree broken between tasks" risk W-04 flagged.
  </action>
  <acceptance_criteria>
    - `test -f src/features/food/hooks.ts` && `grep -q 'export function useTodayEntries' src/features/food/hooks.ts`
    - `grep -q 'export function useDailyTotals' src/features/food/hooks.ts`
    - `grep -q 'export function useRecentFoods' src/features/food/hooks.ts`
    - `grep -q 'export function useFrequentFoods' src/features/food/hooks.ts`
    - `grep -q 'export function useAllFoods' src/features/food/hooks.ts`
    - `grep -q 'useLiveQuery' src/features/food/hooks.ts`
    - `test -f src/features/food/FoodThumb.tsx` && `grep -q 'URL.createObjectURL' src/features/food/FoodThumb.tsx`
    - `grep -q 'URL.revokeObjectURL' src/features/food/FoodThumb.tsx` (Pitfall #3 memory-leak guard)
    - `grep -q 'useEffect' src/features/food/FoodThumb.tsx` (Object URL NOT inline in JSX)
    - `test -f src/features/food/QuickLogChip.tsx` && `grep -q 'forwardRef' src/features/food/QuickLogChip.tsx`
    - `grep -q 'h-10' src/features/food/QuickLogChip.tsx` (40px chip height per UI-SPEC)
    - `grep -q 'rounded-full' src/features/food/QuickLogChip.tsx`
    - `grep -q 'border-border' src/features/food/QuickLogChip.tsx`
    - `grep -q 'aria-label={`Log' src/features/food/QuickLogChip.tsx` (A11y per UI-SPEC)
    - `test -f src/features/food/QuickLogChipRow.tsx` && `grep -q 'overflow-x-auto' src/features/food/QuickLogChipRow.tsx`
    - `grep -q 'gap-2' src/features/food/QuickLogChipRow.tsx`
    - `test -f src/features/food/MacroTotalsBar.tsx` && `grep -q 'sticky top-0' src/features/food/MacroTotalsBar.tsx`
    - `grep -q 'divide-x divide-border' src/features/food/MacroTotalsBar.tsx`
    - `grep -q 'useDailyTotals' src/features/food/MacroTotalsBar.tsx`
    - `grep -q 'useGoals' src/features/food/MacroTotalsBar.tsx`
    - `grep -q '>cal<' src/features/food/MacroTotalsBar.tsx` (UI-SPEC copy: cal/P/C/F)
    - `grep -q '>P<' src/features/food/MacroTotalsBar.tsx`
    - `grep -q '>C<' src/features/food/MacroTotalsBar.tsx`
    - `grep -q '>F<' src/features/food/MacroTotalsBar.tsx`
    - `grep -q 'h-1' src/features/food/MacroTotalsBar.tsx` (W-03: 4px inline thin-bar geometry)
    - `grep -q 'bg-white/\[0.08\]' src/features/food/MacroTotalsBar.tsx` (W-03: track color on inline bar)
    - `grep -q 'bg-accent' src/features/food/MacroTotalsBar.tsx` (W-03: fill color on inline bar)
    - `! grep -q "from '@/components/ProgressBar'" src/features/food/MacroTotalsBar.tsx` (W-03: ProgressBar MUST NOT be imported here)
    - `! grep -q 'ProgressBar' src/features/food/MacroTotalsBar.tsx` (W-03: zero ProgressBar references)
    - `! grep -q 'h-1' src/components/ProgressBar.tsx` (W-03: shared primitive UNCHANGED — still 8px h-2, not h-1)
    - `grep -q 'h-2' src/components/ProgressBar.tsx` (W-03 sanity: shared primitive retains its 8px geometry)
    - `test -f src/features/food/FoodSection.tsx` && `grep -q 'data-\[state=open\]:animate-none' src/features/food/FoodSection.tsx` (UI-SPEC anti-motion override — §Sheet Open animation disabled)
    - `grep -q 'data-\[state=closed\]:animate-none' src/features/food/FoodSection.tsx`
    - `grep -q '>Log food<' src/features/food/FoodSection.tsx` (UI-SPEC Sheet title copy)
    - `grep -q '>Food<' src/features/food/FoodSection.tsx` (card title)
    - `grep -c 'ProgressBar' src/features/food/FoodSection.tsx` is >= 4 (4 macro bars per UI-SPEC Food card layout exception)
    - `grep -qE 'label="Cal"|label=.Cal.' src/features/food/FoodSection.tsx`
    - `grep -qE 'label="P"|label=.P.' src/features/food/FoodSection.tsx`
    - `grep -qE 'label="C"|label=.C.' src/features/food/FoodSection.tsx`
    - `grep -qE 'label="F"|label=.F.' src/features/food/FoodSection.tsx`
    - `grep -q 'Math.round' src/features/food/FoodSection.tsx` (UI-SPEC rounding rule for card status numbers)
    - `test -f src/features/food/FoodSheet.tsx` (W-04: REQUIRED stub exists at end of Task 1)
    - `grep -q 'export function FoodSheet' src/features/food/FoodSheet.tsx` (W-04: stub exports the name)
    - `! grep -q "toISOString().split" src/features/food/*.tsx src/features/food/hooks.ts` (Pitfall #4 guard)
    - `! grep -qE 'accent-(25|50|75|100)' src/features/food/*.tsx` (Phase 3 reserve untouched)
    - `npx tsc --noEmit` exits 0 (tree compiles at end of Task 1 per W-04)
  </acceptance_criteria>
  <done>6 real files + 1 required stub created with reactive hooks, chip primitives, MacroTotalsBar with inline 4px thin-bar (W-03), FoodSection Today-card wrapper, and FoodSheet stub (W-04); UI-SPEC anti-motion + copy contracts honored; ProgressBar primitive unmodified; tree compiles.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Food picker — search + tap-to-log (onLog) + per-row Delete overflow (FOOD-02) + inline Create-Food form with photo pipeline</name>
  <files>src/features/food/FoodPicker.tsx, src/features/food/FoodCreateForm.tsx</files>
  <behavior>
    - FoodPicker renders a search input labeled "Search your foods"
    - Typing filters useAllFoods() by case-insensitive substring (Claude's Discretion — D-05)
    - **Each filter-result row is an interactive <li> with TWO tappable affordances (B-02 fix — Task 2 owns both):**
      1. **Row body** (left side) — a `<button>` whose onClick calls `onLog(food)` (shared chip/row log handler passed by FoodSheet parent in Task 3). Fires the same last-servings + auto-bucket log path chips use.
      2. **Trailing ⋯ overflow button** (right side, `aria-label="More"`) — opens a small menu with a single `Delete food` item (destructive color `#ef4444`). Tapping it calls `window.confirm("Delete {food.name}? This will remove its photo permanently.")`; on confirm, calls `deleteFood(food.id)` (B-01 fix — FOOD-02 delete affordance; per D-17 edit is deferred to v2). No Edit affordance in the menu. After deletion, useLiveQuery refiles useAllFoods so the row disappears naturally.
    - When filter results are empty AND query.trim() is non-empty, show a Create row: leading `+` icon + `Create "{query}"` (exact UI-SPEC copy)
    - Tapping Create row opens the inline FoodCreateForm pre-populated with `name = query`
    - FoodCreateForm renders Zod-validated fields: Name, Calories, Protein (g), Carbs (g), Fat (g), Serving, optional photo
    - Photo affordance: `<input type="file" accept="image/*" capture="environment" />` triggered by an "Add photo" button; after selection, button text becomes "Change photo" with 24px thumbnail
    - On Save and log: (1) resizePhoto runs inside createFood BEFORE Dexie write (Pitfall #1/#8), (2) createFood returns the saved Food, (3) logMeal is called with `{food, servings: 1, bucket: inferBucket(), dayKey: todayKey()}` per D-06 save-and-log contract, (4) onClose() is called, (5) Sheet closes
    - Cancel button discards selection silently
    - Zod errors render inline with destructive color `#ef4444`
    - If photo save fails: `photoKey` saves undefined, food + meal still log (per UI-SPEC §Error States)
  </behavior>
  <read_first>
    - src/services/food.svc.ts (createFood signature + photo-before-Dexie ordering — read lines 310–333 of 02-PATTERNS.md to understand the contract; deleteFood signature for B-01 delete wiring)
    - src/services/meals.svc.ts (logMeal signature)
    - src/lib/dayKey.ts (todayKey + inferBucket imports)
    - src/features/settings/GoalsForm.tsx (RHF+Zod form pattern analog — follow the same structure)
    - src/features/pt/PTTemplateList.tsx (UPCOMING from Plan 02-04 — overflow-menu UX analog; this plan executes in parallel so the file may not be present. Use the inline-overflow pattern described in action below.)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/food/FoodCreateForm.tsx" lines 756–776 (onSubmit ordering + photo input element)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"Cross-cutting: RHF + Zod form pattern" lines 916–941
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Food Sheet copy" lines 223–247 (all picker + create-form copy strings)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Photo capture affordance (Food create form)" lines 574–583
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Form Validation Patterns" lines 718–740 (food schema convention)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md §"Food logging flow" D-05/D-06/D-07 (behavioral contract)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md D-17 (FOOD-02 scope: create + delete only; no Edit)
    - CLAUDE.md rules #1 + #5 (no non-IDB await in txn; photo resize ≤800×800 @ 80% WebP — resizePhoto from photoStore already enforces this)
  </read_first>
  <action>
    File 1 — `src/features/food/FoodPicker.tsx` (NEW).

    **Props (B-02 fix — FoodPicker is the owner of both filter-row onClick AND onLog prop declaration):**

    ```typescript
    export interface FoodPickerProps {
      onLog: (food: Food) => void;   // REQUIRED — parent (FoodSheet in Task 3) passes handleChipLog
      onLogged: () => void;          // fires after create-and-log completes; parent closes Sheet
    }
    ```

    Internal state: `const [query, setQuery] = useState('');` + `const [showCreate, setShowCreate] = useState(false);`

    Structure (top-down):
    ```tsx
    import { useState, useMemo } from 'react';
    import { Plus, MoreHorizontal } from 'lucide-react';
    import { useAllFoods } from './hooks';
    import { FoodCreateForm } from './FoodCreateForm';
    import { deleteFood } from '@/services/food.svc';
    import type { Food } from '@/db/schema';

    // D-17 — FOOD-02 scope note: create + delete only; edit deferred to v2.
    // The overflow menu on each search row intentionally exposes ONLY "Delete food".

    export function FoodPicker({ onLog, onLogged }: FoodPickerProps) {
      const [query, setQuery] = useState('');
      const [showCreate, setShowCreate] = useState(false);
      const allFoods = useAllFoods();

      const filtered = useMemo(() => {
        if (!allFoods) return [];
        const q = query.trim().toLowerCase();
        if (!q) return [];  // show no filter results until user types; relies on Recent/Frequent rows above
        return allFoods.filter(f => f.name.toLowerCase().includes(q));
      }, [allFoods, query]);

      const canCreate = query.trim().length > 0 && filtered.length === 0;

      if (showCreate) {
        return (
          <FoodCreateForm
            initialName={query}
            onSaved={() => { setShowCreate(false); setQuery(''); onLogged(); }}
            onCancel={() => setShowCreate(false)}
          />
        );
      }

      return (
        <div className="space-y-2 px-4">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search your foods"
            aria-label="Search your foods"
            className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          />
          {/* Interactive filter-result rows — Task 2 owns both onLog (body) + delete (overflow). */}
          {query.trim() && filtered.length > 0 && (
            <ul className="divide-y divide-border">
              {filtered.map(f => (
                <li key={f.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onLog(f)}
                    className="flex-1 text-left py-3 text-sm text-text hover:bg-border/40 rounded-md px-2"
                    aria-label={`Log ${f.name}`}
                  >
                    {f.name}
                  </button>
                  <FoodRowOverflowMenu food={f} />
                </li>
              ))}
            </ul>
          )}
          {canCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 w-full py-3 text-sm text-text hover:bg-border/40 px-2 rounded-md"
            >
              <Plus className="w-4 h-4" aria-hidden />
              <span>Create "{query.trim()}"</span>
            </button>
          )}
        </div>
      );
    }

    // B-01 fix — FOOD-02 delete affordance lives on the search row (D-17 scope: create + delete only).
    // Inline useState-toggle menu, matching the PTTemplateList overflow pattern (no shadcn DropdownMenu).
    function FoodRowOverflowMenu({ food }: { food: Food }) {
      const [open, setOpen] = useState(false);
      const handleDelete = async () => {
        setOpen(false);
        if (window.confirm(`Delete ${food.name}? This will remove its photo permanently.`)) {
          await deleteFood(food.id);
        }
      };
      return (
        <div className="relative">
          <button
            type="button"
            aria-label="More"
            onClick={() => setOpen(o => !o)}
            className="h-11 w-11 flex items-center justify-center text-muted"
          >
            <MoreHorizontal className="w-5 h-5" aria-hidden />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full z-20 bg-surface border border-border rounded-md shadow-lg overflow-hidden min-w-[160px]">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-border/40"
                  style={{ color: '#ef4444' }}
                >
                  Delete food
                </button>
              </div>
            </>
          )}
        </div>
      );
    }
    ```

    File 2 — `src/features/food/FoodCreateForm.tsx` (NEW).

    Props: `{ initialName: string; onSaved: () => void; onCancel: () => void }`.

    Zod schema (inline at top of module):
    ```typescript
    import { z } from 'zod';

    const foodCreateSchema = z.object({
      name: z.string().trim().min(1, 'Required'),
      calories: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
      proteinG: z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
      carbsG:   z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
      fatG:     z.number({ message: 'Required' }).min(0, 'Must be 0 or higher').max(10_000, 'Too large'),
      servingLabel: z.string().trim().min(1, 'Required'),
      photoFile: z.any().optional(),  // FileList from register; validated at runtime
    });
    type FoodCreateInput = z.infer<typeof foodCreateSchema>;
    ```

    Component body:
    - `const { register, handleSubmit, watch, formState: { errors } } = useForm<FoodCreateInput>({ resolver: zodResolver(foodCreateSchema), values: { name: initialName, calories: 0, proteinG: 0, carbsG: 0, fatG: 0, servingLabel: '', photoFile: undefined } });`
    - `const photoFile = watch('photoFile');` — used to show "Change photo" label after a file is picked
    - onSubmit:

    ```typescript
    const onSubmit = handleSubmit(async (data) => {
      const fileList = data.photoFile as FileList | undefined;
      const photoFile = fileList && fileList.length > 0 ? fileList[0] : null;
      // Pitfall #1 + #8: resize+save happens INSIDE createFood, BEFORE any Dexie txn.
      // Do NOT open a db.transaction() here.
      const food = await createFood({
        name: data.name.trim(),
        calories: data.calories,
        proteinG: data.proteinG,
        carbsG: data.carbsG,
        fatG: data.fatG,
        servingLabel: data.servingLabel.trim(),
        photoFile,
      });
      // D-06: save-and-log — create AND log for today in a single action.
      await logMeal({
        food,
        servings: 1,
        bucket: inferBucket(),
        dayKey: todayKey(),
      });
      onSaved();
    });
    ```

    Render: heading "Add food" (Heading role), then `<form onSubmit={onSubmit} className="space-y-4 px-4">` with these fields in order (UI-SPEC §Food Sheet copy):
    - Name: label "Name", placeholder "e.g. Ground beef", `type="text"`, uses RHF register with trim
    - Calories: label "Calories", `type="number" inputMode="numeric"`, `register('calories', { valueAsNumber: true })`
    - Protein (g): label "Protein (g)", same pattern
    - Carbs (g): label "Carbs (g)"
    - Fat (g): label "Fat (g)"
    - Serving: label "Serving", placeholder "e.g. 100 g", text input
    - Photo button: a hidden `<input type="file" accept="image/*" capture="environment" id="food-photo" className="hidden" {...register('photoFile')} />` + a visible `<label htmlFor="food-photo"><Button variant="outline" asChild={false} className="..."><Camera className="w-4 h-4 mr-2" aria-hidden />{photoFile && photoFile.length > 0 ? 'Change photo' : 'Add photo'}</Button></label>` — wrapping a Button in a label is slightly unusual; acceptable alternative is a plain styled `<label>` that visually matches Button. Executor chooses — the UI-SPEC contract is the text and the Camera icon.

    Field validation error rendering: below each input, `{errors.fieldName && <p className="text-xs" style={{color:'#ef4444'}}>{errors.fieldName.message}</p>}`

    Footer: `<div className="flex gap-2 justify-end pt-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" variant="default">Save and log</Button></div>`

    CRITICAL — photo pipeline ordering:
    - `resizePhoto` is called INSIDE `food.svc.createFood` (not in this component) — this was guaranteed by Task 3 of Plan 02-01. This task MUST NOT directly call `savePhoto` or open a `db.transaction(...)` in the component.
    - The FormCreateForm's `onSubmit` does `await createFood(...)` then `await logMeal(...)`. These are two sequential top-level awaits — NO `db.transaction(...)` wrapping. This satisfies Pitfall #1.
  </behavior>
  <action>
    Implement File 1 and File 2 per the structures specified in the `<behavior>` block above. Task 2 is the SOLE owner of FoodPicker.tsx — no later task re-edits this file. Copy the Zod schema + onSubmit verbatim — do not restructure the schema or combine the two awaits into one txn. The inline `FoodRowOverflowMenu` subcomponent stays in FoodPicker.tsx (same module, local scope); it is not a reusable export.
  </action>
  <acceptance_criteria>
    - `test -f src/features/food/FoodPicker.tsx` && `grep -q 'export function FoodPicker' src/features/food/FoodPicker.tsx`
    - `grep -q '"Search your foods"' src/features/food/FoodPicker.tsx` (UI-SPEC placeholder)
    - `grep -q 'Create "' src/features/food/FoodPicker.tsx` (UI-SPEC inline-create row copy)
    - `grep -q 'import.*Plus.*lucide-react' src/features/food/FoodPicker.tsx` (UI-SPEC leading `+` icon)
    - `grep -q 'MoreHorizontal' src/features/food/FoodPicker.tsx` (B-01: overflow-menu icon)
    - `grep -q 'useAllFoods' src/features/food/FoodPicker.tsx`
    - `grep -q 'onLog:' src/features/food/FoodPicker.tsx` (B-02: onLog prop declared on FoodPicker)
    - `grep -qE 'onClick=\{\(\) => onLog\(' src/features/food/FoodPicker.tsx` (B-02: filter-result row body fires onLog — search rows are interactive, not static spans)
    - `grep -q 'aria-label={`Log' src/features/food/FoodPicker.tsx` (a11y on filter row body button)
    - `grep -q 'deleteFood(' src/features/food/FoodPicker.tsx` (B-01: FOOD-02 delete scope wired)
    - `grep -q 'window.confirm(' src/features/food/FoodPicker.tsx` (B-01: confirm guard before destructive photo+food delete)
    - `grep -qE 'Delete .*\$\{food\.name\}|Delete \$\{food.name\}|Delete \${food.name}' src/features/food/FoodPicker.tsx` (confirm copy references food name)
    - `grep -q '>Delete food<' src/features/food/FoodPicker.tsx` (overflow menu item copy)
    - `grep -q '#ef4444' src/features/food/FoodPicker.tsx` (destructive color on Delete food)
    - `grep -q 'aria-label="More"' src/features/food/FoodPicker.tsx` (overflow button a11y)
    - `! grep -q '>Edit' src/features/food/FoodPicker.tsx` (D-17 scope: no Edit affordance)
    - `test -f src/features/food/FoodCreateForm.tsx` && `grep -q 'export function FoodCreateForm' src/features/food/FoodCreateForm.tsx`
    - `grep -q 'zodResolver' src/features/food/FoodCreateForm.tsx`
    - `grep -q "import.*from '@hookform/resolvers/zod'" src/features/food/FoodCreateForm.tsx`
    - `grep -c 'valueAsNumber: true' src/features/food/FoodCreateForm.tsx` is >= 4 (4 macro fields; calories+proteinG+carbsG+fatG)
    - `grep -q 'createFood(' src/features/food/FoodCreateForm.tsx`
    - `grep -q 'logMeal(' src/features/food/FoodCreateForm.tsx`
    - `grep -q 'inferBucket()' src/features/food/FoodCreateForm.tsx` (D-08 auto-bucket)
    - `grep -q 'todayKey()' src/features/food/FoodCreateForm.tsx`
    - `awk '/createFood\(/{c=NR} /logMeal\(/{m=NR} END{exit !(c && m && c < m)}' src/features/food/FoodCreateForm.tsx` exits 0 (createFood awaited BEFORE logMeal — D-06 save-and-log ordering)
    - `! grep -q 'db.transaction' src/features/food/FoodCreateForm.tsx` (Pitfall #1 guard: no txn wrapper in component)
    - `! grep -q 'resizePhoto' src/features/food/FoodCreateForm.tsx` (photo resize stays in food.svc.ts; component just passes the File)
    - `grep -q 'accept="image/\*"' src/features/food/FoodCreateForm.tsx` (D-07 photo capture)
    - `grep -q 'capture="environment"' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Add food<' src/features/food/FoodCreateForm.tsx` (UI-SPEC heading)
    - `grep -q '>Name<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Calories<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Protein (g)<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Carbs (g)<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Fat (g)<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Serving<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '"e.g. Ground beef"' src/features/food/FoodCreateForm.tsx` (UI-SPEC placeholder)
    - `grep -q '"e.g. 100 g"' src/features/food/FoodCreateForm.tsx`
    - `grep -q '>Save and log<' src/features/food/FoodCreateForm.tsx` (UI-SPEC primary CTA)
    - `grep -q '>Cancel<' src/features/food/FoodCreateForm.tsx`
    - `grep -q '#ef4444' src/features/food/FoodCreateForm.tsx` (destructive color for error messages)
    - `grep -q 'Camera' src/features/food/FoodCreateForm.tsx` (Lucide icon per UI-SPEC)
    - `grep -q 'Add photo\|Change photo' src/features/food/FoodCreateForm.tsx` (UI-SPEC photo button copy)
    - `! grep -q "toISOString().split" src/features/food/FoodCreateForm.tsx src/features/food/FoodPicker.tsx` (Pitfall #4 guard)
  </acceptance_criteria>
  <done>FoodPicker owns onLog prop + filter-row onClick wiring + per-row Delete overflow (B-01, B-02, D-17); FoodCreateForm exists and satisfies D-06; Pitfall #1 photo-before-Dexie ordering is preserved by delegating to `food.svc.createFood`; Zod validates all fields; UI-SPEC copy + photo affordance honored.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Today's meals list (section-grouped per D-18) + inline-edit rows + compose FoodSheet (overwrite Task 1 stub)</name>
  <files>src/features/food/TodayMealList.tsx, src/features/food/MealEntryRow.tsx, src/features/food/FoodSheet.tsx</files>
  <behavior>
    - TodayMealList renders exactly 4 bucket sections in fixed order: Breakfast / Lunch / Dinner / Snack (D-18)
    - Each section shows entries for that bucket, or an em-dash when empty (D-18)
    - Each meal row shows: `{foodName} · {servings}× {servingLabel}` (left) + bucket badge (right, muted lowercase)
    - Tapping a meal row expands inline-edit mode: Servings number input + 4-button segmented Meal picker + footer buttons (Delete / Cancel / Save)
    - Only `servings` and `bucket` are editable (D-20); `foodId` is immutable; switching food requires delete+re-log
    - Save calls `updateMealEntry(id, {servings, bucket})` then collapses the row
    - Delete immediately removes the entry (no confirm modal — UI-SPEC Destructive confirmations NONE for meal entries)
    - Cancel collapses without commit
    - Escape key in edit mode collapses without commit; Enter in servings input commits Save
    - FoodSheet composes: MacroTotalsBar (sticky top) → Recent chips row → Frequent chips row → FoodPicker → TodayMealList (all scroll-beneath the sticky macro bar)
    - QuickLogChip tap + FoodPicker search-row tap both call the SAME `handleChipLog(food)` with `{food, servings: lastServings ?? 1, bucket: inferBucket(), dayKey: todayKey()}` (FOOD-04 pre-fill last servings; B-02 — shared handler)
    - On any successful log (chip, search-row, or create+log), onClose fires and the Sheet closes (D-04)
    - **B-02 invariant: This task MUST NOT edit `src/features/food/FoodPicker.tsx`.** Wiring flows strictly downward: FoodSheet declares `handleChipLog` and passes it to both `QuickLogChipRow`s AND to `FoodPicker` as the `onLog` prop.
  </behavior>
  <read_first>
    - src/db/schema.ts (MealEntry + MealBucket + Food)
    - src/services/meals.svc.ts (updateMealEntry + deleteMealEntry + getLastServingsForFood signatures)
    - src/lib/dayKey.ts (todayKey, inferBucket)
    - src/features/food/hooks.ts (all 6 hooks created in Task 1)
    - src/features/food/FoodSection.tsx (how FoodSheet is instantiated — side="bottom", 85vh, anti-motion className)
    - src/features/food/MacroTotalsBar.tsx (consumed by FoodSheet)
    - src/features/food/QuickLogChip.tsx + QuickLogChipRow.tsx
    - src/features/food/FoodPicker.tsx (consumed — its public API is `{ onLog, onLogged }`; Task 3 passes both but MUST NOT re-edit this file)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/meals.svc.ts" lines 450–473 (updateMealEntry recomputes denormalized totals — so changing servings reflects immediately in useDailyTotals via useLiveQuery)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Inline-edit meal row" lines 507–519 (layout + keyboard contracts)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Food Sheet copy" lines 227–234 (meal row + inline-edit copy strings)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Sheet internal layout" lines 423–440 (vertical composition order)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md §"answered_during_planning" D-18 + D-20 (section-grouped + servings+bucket only)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md §"Food logging flow" D-05 (Sheet vertical order)
  </read_first>
  <action>
    File 1 — `src/features/food/MealEntryRow.tsx` (NEW).

    Props: `{ entry: MealEntry; food: Food | undefined }` — consumer passes the associated Food (already fetched in TodayMealList via bulk lookup).

    State: `const [editing, setEditing] = useState(false);` + local edit state for servings + bucket.

    Resting render (non-editing):
    ```tsx
    <li>
      <button type="button" onClick={() => setEditing(true)} className="w-full flex items-center justify-between py-3 text-left hover:bg-border/20">
        <span className="text-sm text-text">
          {food?.name ?? '—'} · {entry.servings}× {food?.servingLabel ?? ''}
        </span>
        <span className="text-xs text-muted lowercase">{entry.bucket}</span>
      </button>
    </li>
    ```

    Editing render:
    - Servings input: `<input type="number" inputMode="decimal" step="0.1" value={servings} onChange={e => setServings(parseFloat(e.target.value) || 0)} onKeyDown={e => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter') handleSave(); }} aria-label="Servings" className="w-20 h-11 px-3 rounded-md bg-bg border border-border text-text tabular-nums" />` — note `inputMode="decimal"` here (UI-SPEC Claude's Discretion: decimals on servings since `1.5` is common)
    - Label "Servings" above it
    - 4-button segmented bucket picker with `role="radiogroup"` and 4 children `role="radio" aria-checked={bucket===opt}`. Each pill: `h-11 flex-1 bg-bg border border-border text-sm capitalize`; selected has `border-accent text-accent` (UI-SPEC §Pain rating analog for selection styling).
    - Label "Meal" above it
    - Footer: Delete (destructive color `#ef4444`, ghost variant) / Cancel (ghost) / Save (default)

    Handlers:
    ```typescript
    const handleSave = async () => {
      if (servings > 0) {
        await updateMealEntry(entry.id, { servings, bucket });
        setEditing(false);
      }
    };
    const handleDelete = async () => {
      await deleteMealEntry(entry.id);
      // Row disappears via useLiveQuery re-fire; no setEditing needed (component unmounts).
    };
    ```

    File 2 — `src/features/food/TodayMealList.tsx` (NEW).

    Imports: `useTodayEntries, useAllFoods` from './hooks'.

    Per D-18: always render 4 sections in this order: Breakfast / Lunch / Dinner / Snack. Each section:
    - Header: `<h3 className="text-xs text-muted uppercase tracking-wide px-0 pt-3 pb-1 border-t border-border first:border-t-0 capitalize">{bucketDisplay}</h3>` — `bucketDisplay` = `Breakfast`/`Lunch`/etc (Title case; the schema stores lowercase).
    - Body: entries for that bucket rendered as `<ul className="divide-y divide-border">{entries.map(e => <MealEntryRow key={e.id} entry={e} food={foodById.get(e.foodId)} />)}</ul>`
    - Empty state for a bucket: `<p className="text-sm text-muted py-3">—</p>` (em-dash per D-18)

    Derive `foodById`:
    ```tsx
    const entries = useTodayEntries();
    const allFoods = useAllFoods();
    const foodById = useMemo(() => {
      const m = new Map<string, Food>();
      (allFoods ?? []).forEach(f => m.set(f.id, f));
      return m;
    }, [allFoods]);

    const byBucket: Record<MealBucket, MealEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    (entries ?? []).forEach(e => byBucket[e.bucket].push(e));
    ```

    Top-of-component section label: `<h2 className="text-xs text-muted uppercase tracking-wide px-4 mt-4">Today</h2>` (UI-SPEC §"Food Sheet copy": `Today's meals section label: Today`).

    If `entries === undefined`: render nothing (still loading). If `entries.length === 0` in ALL buckets: per UI-SPEC "Today's meals empty state: `No meals logged yet today.`" — render ONE paragraph: `<p className="text-sm text-muted px-4 py-2">No meals logged yet today.</p>` IN PLACE OF the 4 sections. (Choose this interpretation: if totally empty, single-line message; if any bucket has entries, show all 4 sections with em-dash for empties per D-18. This is the most restrained reading that honors both UI-SPEC and D-18.)

    File 3 — `src/features/food/FoodSheet.tsx` (OVERWRITE Task 1 stub with the real composition).

    Props: `{ onClose: () => void }`.

    Imports: all 6 local components + `logMeal` from meals.svc + `inferBucket` + `todayKey` + `getLastServingsForFood` from meals.svc (called as a plain function, not a hook — one-time lookup per log).

    Layout per UI-SPEC §"Sheet internal layout" + D-05 vertical order:

    ```tsx
    import { MacroTotalsBar } from './MacroTotalsBar';
    import { QuickLogChipRow } from './QuickLogChipRow';
    import { FoodPicker } from './FoodPicker';
    import { TodayMealList } from './TodayMealList';
    import { useRecentFoods, useFrequentFoods } from './hooks';
    import { logMeal, getLastServingsForFood } from '@/services/meals.svc';
    import { inferBucket, todayKey } from '@/lib/dayKey';
    import type { Food } from '@/db/schema';

    export function FoodSheet({ onClose }: { onClose: () => void }) {
      const recent = useRecentFoods();
      const frequent = useFrequentFoods();

      // B-02 — this handler is shared between QuickLogChip rows AND FoodPicker's filter-result rows.
      // FoodPicker declares `onLog` in its API (Task 2); FoodSheet passes handleChipLog into it here.
      const handleChipLog = async (food: Food) => {
        const last = await getLastServingsForFood(food.id);
        await logMeal({
          food,
          servings: last ?? 1,           // FOOD-04: pre-fill last-used servings
          bucket: inferBucket(),         // D-08: auto-inferred from local time
          dayKey: todayKey(),
        });
        onClose();                        // D-04: close immediately on log
      };

      return (
        <div className="flex flex-col h-full max-h-[85vh]">
          <MacroTotalsBar />
          <div className="flex-1 overflow-y-auto space-y-4 pt-2">
            <QuickLogChipRow label="Recent" foods={recent} emptyCopy="No recent foods yet — search or add below." onLog={handleChipLog} />
            <QuickLogChipRow label="Frequent" foods={frequent} onLog={handleChipLog} />
            <FoodPicker onLog={handleChipLog} onLogged={onClose} />
            <TodayMealList />
          </div>
        </div>
      );
    }
    ```

    **Task 3 is OVERWRITING a stub, not editing Task 2 files.** FoodPicker.tsx and FoodCreateForm.tsx stay byte-identical to Task 2's output. If TypeScript flags a prop mismatch between the Task 1 stub signature `{open, onOpenChange}` and this task's `{onClose}` prop, the overwrite resolves it — FoodSection.tsx already passes `onClose` (verified in Task 1's action), so the final converged signature is `{onClose}`.
  </action>
  <acceptance_criteria>
    - `test -f src/features/food/MealEntryRow.tsx` && `grep -q 'export function MealEntryRow' src/features/food/MealEntryRow.tsx`
    - `grep -q 'updateMealEntry' src/features/food/MealEntryRow.tsx`
    - `grep -q 'deleteMealEntry' src/features/food/MealEntryRow.tsx`
    - `grep -q 'role="radiogroup"' src/features/food/MealEntryRow.tsx` (bucket segmented control A11y)
    - `grep -q 'role="radio"' src/features/food/MealEntryRow.tsx`
    - `grep -q 'Escape' src/features/food/MealEntryRow.tsx` (kbd handling per UI-SPEC)
    - `grep -q 'Enter' src/features/food/MealEntryRow.tsx`
    - `grep -q '#ef4444' src/features/food/MealEntryRow.tsx` (destructive color on Delete)
    - `grep -q '>Delete<' src/features/food/MealEntryRow.tsx`
    - `grep -q '>Cancel<' src/features/food/MealEntryRow.tsx`
    - `grep -q '>Save<' src/features/food/MealEntryRow.tsx`
    - `grep -q 'inputMode="decimal"' src/features/food/MealEntryRow.tsx` (servings accepts fractional)
    - `test -f src/features/food/TodayMealList.tsx` && `grep -q 'export function TodayMealList' src/features/food/TodayMealList.tsx`
    - `grep -qE 'breakfast.*lunch.*dinner.*snack' src/features/food/TodayMealList.tsx` (4-section fixed order per D-18 — single-line-with-dotall or on adjacent lines)
    - `grep -q 'No meals logged yet today.' src/features/food/TodayMealList.tsx` (UI-SPEC empty state copy)
    - `grep -q '>Today<' src/features/food/TodayMealList.tsx` (UI-SPEC §"Today's meals section label: Today")
    - `grep -q 'MealEntryRow' src/features/food/TodayMealList.tsx`
    - `test -f src/features/food/FoodSheet.tsx` && `grep -q 'export function FoodSheet' src/features/food/FoodSheet.tsx`
    - `grep -q 'MacroTotalsBar' src/features/food/FoodSheet.tsx`
    - `grep -q 'QuickLogChipRow' src/features/food/FoodSheet.tsx`
    - `grep -q 'FoodPicker' src/features/food/FoodSheet.tsx`
    - `grep -q 'TodayMealList' src/features/food/FoodSheet.tsx`
    - `grep -qE '<FoodPicker[^>]*onLog=' src/features/food/FoodSheet.tsx` (B-02: FoodSheet passes onLog to FoodPicker)
    - `grep -q 'handleChipLog' src/features/food/FoodSheet.tsx` (B-02: shared handler declared in FoodSheet)
    - `awk '/MacroTotalsBar/{m=NR} /Recent/{r=NR} /Frequent/{f=NR} /FoodPicker/{p=NR} /TodayMealList/{t=NR} END{exit !(m && r && f && p && t && m < r && r < f && f < p && p < t)}' src/features/food/FoodSheet.tsx` exits 0 (D-05 vertical order enforced: MacroTotalsBar → Recent → Frequent → FoodPicker → TodayMealList)
    - `grep -q 'getLastServingsForFood' src/features/food/FoodSheet.tsx` (FOOD-04 last-servings pre-fill)
    - `grep -q 'inferBucket()' src/features/food/FoodSheet.tsx` (D-08 auto-bucket for chip logs)
    - `grep -q '"No recent foods yet — search or add below."' src/features/food/FoodSheet.tsx` (UI-SPEC Recent empty state)
    - `grep -q 'onClose()' src/features/food/FoodSheet.tsx` (D-04 close immediately on log)
    - `! grep -q "toISOString().split" src/features/food/*.tsx` (Pitfall #4 guard across whole plan)
    - `! grep -q 'db.transaction' src/features/food/*.tsx` (Pitfall #1: no txn wrappers in components)
    - `! grep -qE 'accent-(25|50|75|100)' src/features/food/*.tsx` (Phase 3 alpha-ramp reserve untouched across entire food feature)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>TodayMealList renders 4 bucket sections per D-18; MealEntryRow supports servings+bucket inline-edit + silent delete per D-20 + UI-SPEC; FoodSheet composes the full D-05 vertical order and passes shared handleChipLog to both chip rows AND FoodPicker's onLog prop (B-02); chip + search-row taps log with last-used servings + auto bucket; Sheet closes on any successful log per D-04; FoodPicker.tsx byte-unchanged from Task 2.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0; `npm run build` exits 0.
- Manual: from Today, tap Food card. A bottom Sheet titled "Log food" appears instantly (no slide animation visible).
- Manual: sticky macro bar at top shows `0 / 2000` cal, `0 / 180` P, etc. (defaults from seeded goals); each column has a visible 4px thin bar beneath its number.
- Manual: search "beef", no match, tap `Create "beef"`, fill form (200 cal / 30 P / 0 C / 10 F / "100 g"), take a photo, tap Save and log. Sheet closes. Today Food card macro bars fill accordingly; `1420 / 2000 cal` becomes `200 / 2000 cal`.
- Manual: re-open Food Sheet. "beef" appears in Recent row as a chip (with photo thumbnail). Tap it. Sheet closes. Today macro bars update again (400 cal total now).
- Manual: re-open Food Sheet. Type "bee" in search. A filter-result row appears with food name on the left and a ⋯ button on the right. Tap the row body — sheet closes and a log is created (FOOD-04 last-servings). Re-open Food Sheet, type "bee" again, tap the ⋯ → Delete food → accept the native confirm prompt. The row disappears; the Food is gone from the library; the OPFS photo is deleted.
- Manual: re-open Food Sheet. Scroll to "Today" section. See 4 bucket sections (Breakfast / Lunch / Dinner / Snack); whichever bucket(s) got the logs contain the entries; others show em-dash.
- Manual: tap an entry, change servings to 0.5, tap Save. Row collapses; macro bars reflect new totals.
- Manual: tap an entry, tap Delete. Row disappears immediately (no confirm).
- DevTools → IndexedDB → `foods` / `mealEntries` / OPFS (Origin Private File System) verify: `foods` has the beef row with `photoKey: 'food-<uuid>.webp'`; OPFS has that file; `mealEntries` has the denormalized `computedCalories` etc. All `dayKey` strings are local-today. After delete-food flow: food row gone, OPFS file gone, any historical mealEntries remain (foodId dangles — expected per services layer design).
- Grep: `! grep -rn "toISOString().split" src/features/food/` (global Pitfall #4 guard).
- Grep: `grep -rn "db.transaction" src/features/food/ src/services/food.svc.ts src/services/meals.svc.ts` returns empty (Pitfall #1).
- Grep: `! grep -n 'ProgressBar' src/features/food/MacroTotalsBar.tsx` (W-03 post-impl sanity).
- Grep: `grep -n 'h-2' src/components/ProgressBar.tsx` returns a hit (W-03: shared primitive unchanged at 8px).
</verification>

<success_criteria>
- [ ] FOOD-01 satisfied — add food via FoodCreateForm with name, macros, servingLabel, optional photo
- [ ] FOOD-02 satisfied — delete food via picker search-row overflow menu (D-17 scope: create+delete only; edit deferred to v2, documented here and in summary)
- [ ] FOOD-03 satisfied — log meal with servings + bucket (auto-inferred) + today's dayKey
- [ ] FOOD-04 satisfied — Recent chip row + search-row taps both use one-tap log with last-used servings (shared handleChipLog)
- [ ] FOOD-05 satisfied — Frequent chip row (top-8 in 30d)
- [ ] FOOD-06 satisfied — `logMeal` writes denormalized `computed*` fields at insert (implemented in P1 meals.svc; consumed here)
- [ ] FOOD-07 satisfied — Today Food card shows 4 live macro progress bars against goal targets
- [ ] FOOD-08 satisfied — MealEntryRow supports inline edit (servings + bucket only per D-20) + silent delete
- [ ] D-05 vertical Sheet order enforced (grep-verified)
- [ ] D-06 save-and-log enforced (createFood → logMeal both awaited in sequence)
- [ ] D-07 photo capture input uses `accept="image/*"` + `capture="environment"`
- [ ] D-08 auto-bucket via inferBucket + last-servings pre-fill via getLastServingsForFood
- [ ] D-17 picker overflow shows ONLY "Delete food" — no Edit affordance anywhere
- [ ] D-18 4 fixed-order bucket sections in today's meals
- [ ] D-20 only servings + bucket editable on meal entry
- [ ] W-03 MacroTotalsBar is the inline-thin-bar implementation (h-1, bg-white/[0.08], bg-accent); `src/components/ProgressBar.tsx` is UNCHANGED from Plan 02-01 (still h-2, 8px)
- [ ] W-04 FoodSheet.tsx is a REQUIRED artifact at end of Task 1 (stub), overwritten to full composition in Task 3; tree compiles after every task
- [ ] B-01 FOOD-02 delete wired in FoodPicker search-row overflow with window.confirm guard; deleteFood cascades OPFS photo removal via food.svc (Phase 1 behavior)
- [ ] B-02 onLog prop + filter-row onClick handler both declared in FoodPicker (Task 2); Task 3 only passes the handler down, never re-edits FoodPicker
- [ ] Pitfall #1 guard: no `db.transaction(...)` anywhere in `src/features/food/` or in the two services
- [ ] Pitfall #4 guard: no `toISOString().split` anywhere in `src/features/food/`
- [ ] Pitfall #8: `resizePhoto` called BEFORE Dexie write (enforced in `food.svc.createFood` from P1; this plan doesn't violate)
- [ ] UI-SPEC anti-motion override present on the Food Sheet (grep: `data-[state=open]:animate-none` in FoodSection.tsx)
- [ ] Phase 3 alpha-ramp reserve untouched (`--accent-25/50/75/100` absent from `src/features/food/`)
- [ ] `npx tsc --noEmit` + `npm run build` both pass
</success_criteria>

<output>
After completion, create `.planning/phases/02-tracking-slices/02-03-SUMMARY.md` with:
- Confirmation that Task 2 is the sole owner of FoodPicker.tsx (B-02 invariant held — git blame shows no Task 3 edits)
- Confirmation that MacroTotalsBar renders an inline 4px thin-bar and ProgressBar.tsx was NOT modified (W-03)
- Confirmation that FoodSheet.tsx stub was created in Task 1 and overwritten in Task 3 (W-04)
- Whether the FOOD-02 delete overflow-menu chose inline useState-toggle or `<details>`; confirmation that only `Delete food` (no Edit) is exposed per D-17
- Whether the window.confirm prompt fires before deleteFood (B-01 invariant)
- Line counts per file
- Any Pitfall-#1 audit notes
</output>

**FOOD-02 scope note:** Per D-17 (locked 2026-04-20), Phase 2 ships create + delete only. Edit deferred to v2. This plan satisfies FOOD-02's v1 scope in full via the picker search-row overflow menu (B-01 fix). Do not add an Edit affordance in the picker overflow even if it feels ergonomic — the decision is locked. Reference D-17 in code comments at the delete-affordance site for traceability.
