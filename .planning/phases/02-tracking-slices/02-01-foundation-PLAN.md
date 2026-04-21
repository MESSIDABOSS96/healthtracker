---
phase: 02-tracking-slices
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - src/components/ui/sheet.tsx
  - src/components/ProgressBar.tsx
  - src/lib/dayKey.ts
  - src/services/goals.svc.ts
  - src/services/pt.svc.ts
  - src/services/food.svc.ts
  - src/services/meals.svc.ts
  - src/services/steps.svc.ts
  - src/services/lifts.svc.ts
  - src/features/pt/hooks.ts
  - src/features/food/hooks.ts
  - src/features/steps/hooks.ts
  - src/features/lifts/hooks.ts
  - src/features/settings/hooks.ts
  - src/main.tsx
autonomous: true
requirements: []
requirements_addressed: []
must_haves:
  truths:
    - "RHF + Zod + @hookform/resolvers are installed and importable"
    - "Sheet component is backed by @radix-ui/react-dialog (not the Phase 1 stub)"
    - "ProgressBar renders a 2px/8px track+fill, clamps >100% to 100%, and renders consumed-only when max===0"
    - "inferBucket() returns the right MealBucket for breakfast/lunch/dinner/snack windows"
    - "All 6 service files exist with typed function signatures and compile under tsc --noEmit"
    - "initApp() awaits seedGoalsIfAbsent() before render; on first launch goals singleton exists with D-13 defaults"
  artifacts:
    - path: "src/components/ui/sheet.tsx"
      provides: "Radix Dialog-backed Sheet primitive (SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, SheetDescription)"
    - path: "src/components/ProgressBar.tsx"
      provides: "ProgressBar({value,max,label,ariaLabel}) with D-16 zero-target sentinel"
    - path: "src/lib/dayKey.ts"
      provides: "inferBucket(date?: Date): MealBucket (appended; preserves existing todayKey/dateToKey/keyToDate)"
    - path: "src/services/goals.svc.ts"
      provides: "getGoals, saveGoals, seedGoalsIfAbsent (SINGLETON_ID, DEFAULTS)"
    - path: "src/services/pt.svc.ts"
      provides: "Typed stubs: getTemplates, createTemplate, updateTemplate, deleteTemplate, saveSession, getTodaySessions, getLastSessionForTemplate, formatRelativeDays"
    - path: "src/services/food.svc.ts"
      provides: "Typed stubs: createFood, deleteFood, searchFoods"
    - path: "src/services/meals.svc.ts"
      provides: "Typed stubs: logMeal, updateMealEntry, deleteMealEntry, getTodayEntries, getDailyTotals, getRecentFoods, getFrequentFoods, getLastServingsForFood"
    - path: "src/services/steps.svc.ts"
      provides: "Typed stubs: upsertSteps, getStepsForDay"
    - path: "src/services/lifts.svc.ts"
      provides: "Typed stubs: toggleLift, setLiftNote, getLiftForDay"
    - path: "src/features/{pt,food,steps,lifts,settings}/hooks.ts"
      provides: "Empty-file placeholders exporting nothing (stub); populated by downstream plans"
    - path: "src/main.tsx"
      provides: "initApp() step 6.5 calls seedGoalsIfAbsent() after dayKey smoke, before createRoot"
  key_links:
    - from: "src/main.tsx"
      to: "src/services/goals.svc.ts:seedGoalsIfAbsent"
      via: "await inside initApp() between dayKey smoke and createRoot"
      pattern: "seedGoalsIfAbsent\\(\\)"
    - from: "src/components/ProgressBar.tsx"
      to: "src/lib/utils.ts:cn"
      via: "className composition"
      pattern: "import.*cn.*from.*@/lib/utils"
    - from: "src/lib/dayKey.ts"
      to: "src/db/schema.ts:MealBucket"
      via: "type import for inferBucket return type"
      pattern: "import type \\{ MealBucket \\} from"
---

<objective>
Install Phase 2's four new dependencies, upgrade the Phase 1 Sheet stub to the real Radix-backed shadcn component, create the `ProgressBar` shared primitive, add the `inferBucket` helper to `lib/dayKey.ts`, stub out all six service files with typed function signatures, create empty feature `hooks.ts` placeholder files, and wire `seedGoalsIfAbsent()` into `initApp()` so D-13 defaults exist before first render.

Purpose: Nothing else in Phase 2 can be built without these foundations. Every downstream plan (P2 Goals, P3 Food, P4 PT, P5 Steps+Lift+Today) imports from these files — they must exist with correct shapes first. This is a pure-foundation plan with no feature behavior.

Output: A codebase where `npm run build` + `npx tsc --noEmit` both pass; the Today screen visually unchanged; a fresh IndexedDB on first run has a `goals` singleton populated with D-13 defaults.
</objective>

<execution_context>
@.claude/skills/get-shit-done/workflows/execute-plan.md
@.claude/skills/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/02-tracking-slices/02-CONTEXT.md
@.planning/phases/02-tracking-slices/02-RESEARCH.md
@.planning/phases/02-tracking-slices/02-PATTERNS.md
@.planning/phases/02-tracking-slices/02-UI-SPEC.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@src/db/schema.ts
@src/db/db.ts
@src/lib/dayKey.ts
@src/lib/photoStore.ts
@src/lib/utils.ts
@src/components/ui/sheet.tsx
@src/components/ui/card.tsx
@src/components/ui/button.tsx
@src/main.tsx
@components.json

<interfaces>
<!-- Contracts downstream plans (P2–P5) will import against. Defined here in Wave 1. -->

From src/db/schema.ts (existing, DO NOT MODIFY — referenced here for signature shaping):
```typescript
export interface PTTemplate { id: string; name: string; exercises: Array<{name:string; targetSets?:number; targetReps?:number; targetDurationSec?:number; description?:string}>; createdAt: number; }
export interface PTSession  { id: string; dayKey: string; templateId: string; loggedAt: number; exercises: Array<{name:string; actualSets?:number; actualReps?:number; actualDurationSec?:number; completed:boolean}>; painRating?: number; notes?: string; }
export interface Food { id: string; name: string; calories: number; proteinG: number; carbsG: number; fatG: number; servingLabel: string; photoKey?: string; createdAt: number; }
export type MealBucket = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface MealEntry { id: string; dayKey: string; foodId: string; servings: number; bucket: MealBucket; loggedAt: number; computedCalories: number; computedProteinG: number; computedCarbsG: number; computedFatG: number; }
export interface StepEntry { dayKey: string; count: number; loggedAt: number; }
export interface LiftCheckin { dayKey: string; lifted: boolean; note?: string; loggedAt: number; }
export interface Goals { id: string; calories: number; proteinG: number; carbsG: number; fatG: number; steps: number; updatedAt: number; }
```

Service API contracts this plan creates (stub today, implement in later plans — but full signatures ship in Wave 1 so P2–P5 can compile-check against them):
```typescript
// goals.svc.ts (FULL IMPLEMENTATION in this plan)
export const SINGLETON_ID: 'singleton';
export function seedGoalsIfAbsent(): Promise<void>;
export function getGoals(): Promise<Goals | undefined>;
export function saveGoals(input: Omit<Goals,'id'|'updatedAt'>): Promise<void>;

// pt.svc.ts (STUB — signatures only; throw new Error('not implemented') in body)
export function getTemplates(): Promise<PTTemplate[]>;
export function createTemplate(input: Omit<PTTemplate,'id'|'createdAt'>): Promise<PTTemplate>;
export function updateTemplate(template: PTTemplate): Promise<void>;
export function deleteTemplate(id: string): Promise<void>;
export function saveSession(session: PTSession): Promise<void>;
export function getTodaySessions(dayKey: string): Promise<PTSession[]>;
export function getLastSessionForTemplate(templateId: string, excludeSessionId?: string): Promise<PTSession | undefined>;
export function formatRelativeDays(loggedAt: number): string;

// food.svc.ts (STUB)
export function createFood(params: {name:string; calories:number; proteinG:number; carbsG:number; fatG:number; servingLabel:string; photoFile?:File|null}): Promise<Food>;
export function deleteFood(id: string): Promise<void>;
export function searchFoods(query: string): Promise<Food[]>;

// meals.svc.ts (STUB)
export interface DailyTotals { calories: number; proteinG: number; carbsG: number; fatG: number; }
export function logMeal(params: {food: Food; servings: number; bucket: MealBucket; dayKey: string}): Promise<void>;
export function updateMealEntry(id: string, patch: {servings: number; bucket: MealBucket}): Promise<void>;
export function deleteMealEntry(id: string): Promise<void>;
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;
export function getDailyTotals(dayKey: string): Promise<DailyTotals>;
export function getRecentFoods(limit?: number): Promise<Food[]>;
export function getFrequentFoods(limit?: number): Promise<Food[]>;
export function getLastServingsForFood(foodId: string): Promise<number | undefined>;

// steps.svc.ts (STUB)
export function upsertSteps(dayKey: string, count: number): Promise<void>;
export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined>;

// lifts.svc.ts (STUB)
export function toggleLift(dayKey: string): Promise<void>;
export function setLiftNote(dayKey: string, note: string): Promise<void>;
export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined>;
```

From src/lib/utils.ts (existing):
```typescript
export function cn(...inputs: ClassValue[]): string;
```

From src/lib/dayKey.ts (existing + this plan's addition):
```typescript
export function todayKey(): string;           // existing
export function dateToKey(d: Date): string;   // existing
export function keyToDate(key: string): Date; // existing
export function inferBucket(date?: Date): MealBucket;  // NEW in this plan
```
</interfaces>
</context>

<threat_model>
Per RESEARCH.md §Security Domain: Phase 2 introduces no new trust boundary — all state is origin-scoped Dexie + OPFS, no network, no auth, no XSS surface (React auto-escapes all user strings). This plan specifically:
- Installs 4 npm packages (supply-chain surface): mitigated by pinning versions per RESEARCH table (`react-hook-form@^7.73.1`, `zod@^4.3.6`, `@hookform/resolvers@^5.2.2`, `@radix-ui/react-dialog` transitively via shadcn).
- Adds no `dangerouslySetInnerHTML`, no `eval`, no dynamic `Function()`.
- `ProgressBar` renders numeric values only via `tabular-nums` spans — no string injection.
No threats require mitigation in this plan beyond those already in place from Phase 1.
</threat_model>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install Phase 2 dependencies + upgrade Sheet primitive</name>
  <files>package.json, package-lock.json, src/components/ui/sheet.tsx</files>
  <read_first>
    - package.json (current Phase 1 dependency set)
    - components.json (confirms shadcn style: new-york, cssVariables, baseColor zinc, alias @/components/ui)
    - src/components/ui/sheet.tsx (Phase 1 stub — lines 1–53, API surface MUST survive)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/components/ui/sheet.tsx (UPGRADE — overwritten by shadcn)" (exact command + post-install modification contract)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Sheet (upgraded from Phase 1 stub)" (anti-motion override, safe-area, z-index)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md lines 134–170 (verified package versions + install command)
    - CLAUDE.md §"Project-Breaking Rules" (background)
  </read_first>
  <action>
    Run, from repo root (absolute: /Users/anirudhchatterjee/dev/healthtracker):

    1) `npm install react-hook-form@^7.73.1 zod@^4.3.6 @hookform/resolvers@^5.2.2`
       — these exact versions per RESEARCH.md lines 142–147 (Zod 4 requires resolvers 5.x).

    2) **NON-INTERACTIVE shadcn add** (W-01 fix — YOLO mode cannot answer TTY prompts):

       ```bash
       yes | npx shadcn@latest add sheet --overwrite --yes
       ```

       — `--overwrite` skips the "overwrite existing?" prompt (shadcn 2.x accepts this flag as of 2026-04).
       — `--yes` skips the dependency-install confirmation prompt.
       — The leading `yes |` is a defensive belt-and-suspenders piping "y\n" to stdin in case either flag is ignored by a patch release.
       — This command OVERWRITES `src/components/ui/sheet.tsx` with the Radix-Dialog-backed implementation and pulls `@radix-ui/react-dialog` transitively into package.json.
       — `components.json` already exists (Phase 1); the command reads it; DO NOT pass flags that would modify `components.json`.
       — Execute verbatim as shown above. Do not substitute a different flag combination.

    3) Verify `git status` diff is LIMITED to: `package.json`, `package-lock.json`, `src/components/ui/sheet.tsx`. If `components.json` or any unrelated UI file changed, STOP and revert per Pitfall #11 guard (02-PATTERNS.md line 577).

    4) The post-shadcn `sheet.tsx` file may export additional names (`SheetHeader`, `SheetFooter`, `SheetDescription`, `SheetClose`). Leave them. DO NOT delete them. DO NOT add custom logic. DO NOT add animation overrides inside sheet.tsx itself — the `data-[state=open]:animate-none data-[state=closed]:animate-none` override is applied PER-CONSUMER via the `className` prop (downstream plans do this), so this file stays shadcn-canonical.

    DO NOT run `npx shadcn add` for button/card/any other component — Phase 1 hand-ported Button and Card are deliberately preserved per UI-SPEC.
  </action>
  <acceptance_criteria>
    - `grep -q '"react-hook-form"' package.json` (exits 0)
    - `grep -q '"zod"' package.json` (exits 0)
    - `grep -q '"@hookform/resolvers"' package.json` (exits 0)
    - `grep -q '"@radix-ui/react-dialog"' package.json` (exits 0 — transitively installed)
    - `grep -q "@radix-ui/react-dialog" src/components/ui/sheet.tsx` (exits 0 — file was overwritten by shadcn, not still the stub)
    - `grep -q "export.*Sheet\b" src/components/ui/sheet.tsx` (API exports preserved)
    - `grep -q "export.*SheetContent\b" src/components/ui/sheet.tsx`
    - `grep -q "export.*SheetTitle\b" src/components/ui/sheet.tsx`
    - `git status --porcelain` lists ONLY `package.json`, `package-lock.json`, `src/components/ui/sheet.tsx` (other than planner-added files) — no spurious `components.json` change
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>Sheet primitive is Radix-Dialog-backed; all 4 new npm deps are in package.json; no unrelated files were modified by the shadcn command; build + typecheck both pass.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Create ProgressBar primitive + inferBucket helper</name>
  <files>src/components/ProgressBar.tsx, src/lib/dayKey.ts</files>
  <read_first>
    - src/lib/dayKey.ts (existing — lines 1–26; inferBucket appends at bottom without touching existing exports)
    - src/db/schema.ts lines 52 (MealBucket union — the type inferBucket returns)
    - src/components/ui/card.tsx lines 1–43 (forwardRef + cn() pattern for ProgressBar structural analog)
    - src/lib/utils.ts lines 1–7 (cn helper signature)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/components/ProgressBar.tsx (NEW — shared primitive)" lines 582–633 (exact implementation to copy)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/lib/dayKey.ts (MODIFY — append inferBucket)" lines 533–557 (exact implementation to append)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Progress bar component (NEW — built inline, no shadcn)" lines 444–460 (geometry contract: 8px height, accent on white/[0.08], no transition)
    - CLAUDE.md rule #3 (dayKey always local getters — inferBucket uses getHours() not getUTCHours())
  </read_first>
  <action>
    File 1 — `src/components/ProgressBar.tsx` (CREATE). Copy the implementation verbatim from 02-PATTERNS.md lines 594–629:

    ```typescript
    // src/components/ProgressBar.tsx
    // UI-SPEC §"Progress bar component": 8px height, rounded-full, bg-white/[0.08] track, bg-accent fill.
    // D-16 zero-target sentinel: when max === 0, render consumed-only, no bar in DOM.
    // No transition on fill width (anti-motion policy — UI-SPEC §"Interaction & Motion").

    import { cn } from '@/lib/utils';

    interface ProgressBarProps {
      value: number;
      max: number;
      label?: string;
      ariaLabel?: string;
      className?: string;
    }

    export function ProgressBar({ value, max, label, ariaLabel, className }: ProgressBarProps) {
      // D-16 zero-target sentinel.
      if (max === 0) {
        return (
          <div className={cn('flex items-baseline gap-2', className)}>
            {label && <span className="text-xs text-muted w-6">{label}</span>}
            <span className="text-sm text-text tabular-nums">{value}</span>
          </div>
        );
      }

      const percent = Math.min(100, (value / max) * 100);

      return (
        <div className={cn('flex items-center gap-2', className)}>
          {label && <span className="text-xs text-muted w-6">{label}</span>}
          <div
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={ariaLabel ?? `${label ?? ''} progress`.trim()}
            className="relative h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
          </div>
        </div>
      );
    }
    ```

    File 2 — `src/lib/dayKey.ts` (MODIFY — APPEND ONLY; do not touch existing lines).
    Add at TOP of file (after existing imports if any, else at line 1): `import type { MealBucket } from '@/db/schema';`
    Append at END of file:

    ```typescript
    /**
     * Infer meal bucket from local time per CONTEXT.md D-08.
     * breakfast < 11:00, lunch < 15:00, dinner < 21:00, snack otherwise.
     * Uses getHours() (local) — never getUTCHours() — same reason dayKey uses local getters (Pitfall #4).
     */
    export function inferBucket(date: Date = new Date()): MealBucket {
      const h = date.getHours();
      if (h < 11) return 'breakfast';
      if (h < 15) return 'lunch';
      if (h < 21) return 'dinner';
      return 'snack';
    }
    ```

    DO NOT modify existing `todayKey`, `dateToKey`, `keyToDate`. DO NOT add a `transition` CSS property to ProgressBar. DO NOT use `--accent-25/50/75/100` tokens — those are reserved for Phase 3 DayCell per UI-SPEC §"Progress-bar track color".
  </action>
  <acceptance_criteria>
    - `test -f src/components/ProgressBar.tsx` (exits 0)
    - `grep -q 'bg-white/\[0.08\]' src/components/ProgressBar.tsx` (Tailwind arbitrary-alpha track color per UI-SPEC)
    - `grep -q 'bg-accent' src/components/ProgressBar.tsx` (fill color)
    - `grep -q 'if (max === 0)' src/components/ProgressBar.tsx` (D-16 sentinel branch)
    - `grep -q 'Math.min(100' src/components/ProgressBar.tsx` (over-target clamp)
    - `grep -q 'role="progressbar"' src/components/ProgressBar.tsx` (ARIA)
    - `! grep -q 'transition' src/components/ProgressBar.tsx` (anti-motion — no CSS transition property)
    - `! grep -qE 'accent-(25|50|75|100)' src/components/ProgressBar.tsx` (no alpha-ramp leak from Phase 3 reserve)
    - `grep -q 'export function inferBucket' src/lib/dayKey.ts`
    - `grep -q 'getHours()' src/lib/dayKey.ts` (local-time, not getUTCHours)
    - `! grep -q 'getUTCHours' src/lib/dayKey.ts` (Pitfall #4 guard)
    - `grep -q 'export function todayKey' src/lib/dayKey.ts` (existing export preserved)
    - `grep -q 'export function dateToKey' src/lib/dayKey.ts` (existing export preserved)
    - `grep -q 'export function keyToDate' src/lib/dayKey.ts` (existing export preserved)
    - `! grep -q "toISOString().split" src/lib/dayKey.ts` (CLAUDE.md rule #3)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>ProgressBar primitive renders a 2px/8px track+fill with D-16 zero-target sentinel and over-target clamp; `inferBucket()` is exported from dayKey.ts alongside preserved existing exports.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Service skeletons + feature hooks placeholders + goals seed in initApp</name>
  <files>src/services/goals.svc.ts, src/services/pt.svc.ts, src/services/food.svc.ts, src/services/meals.svc.ts, src/services/steps.svc.ts, src/services/lifts.svc.ts, src/features/pt/hooks.ts, src/features/food/hooks.ts, src/features/steps/hooks.ts, src/features/lifts/hooks.ts, src/features/settings/hooks.ts, src/main.tsx</files>
  <read_first>
    - src/db/schema.ts (all 7 record interfaces — types used in service signatures)
    - src/db/db.ts (how services import the db singleton; header comment on Pitfall #1)
    - src/lib/photoStore.ts (signature of resizePhoto/savePhoto/deletePhoto — imports referenced in food.svc.ts stub)
    - src/main.tsx (lines 33–66 — existing initApp sequence; injection point for goals seed is AFTER dev-only smoke dynamic import, BEFORE createRoot)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/goals.svc.ts" lines 182–216 (FULL implementation — copy verbatim)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/pt.svc.ts" lines 218–288 (full code — copy as implementation; later plans use it)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/food.svc.ts" lines 290–352 (full code — copy as implementation)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/meals.svc.ts" lines 354–474 (full code — copy as implementation)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/steps.svc.ts" lines 476–493 (full code)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/services/lifts.svc.ts" lines 495–530 (full code)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/main.tsx (MODIFY — add goals seed)" lines 862–887 (exact injection point)
    - CLAUDE.md rules #1 + #3 (no non-IDB await in txn; no toISOString().split)
  </read_first>
  <action>
    Create ALL SIX service files in `src/services/` with full working implementations (not one-line throws — the working code exists already in 02-PATTERNS.md). Copy verbatim:

    - `src/services/goals.svc.ts` — from 02-PATTERNS.md lines 186–213.
    - `src/services/pt.svc.ts` — from 02-PATTERNS.md lines 224–287 (imports + getLastSessionForTemplate + CRUD + saveSession + getTodaySessions + formatRelativeDays).
    - `src/services/food.svc.ts` — from 02-PATTERNS.md lines 296–351 (imports + createFood with photo pipeline BEFORE Dexie + deleteFood with cascade + searchFoods).
    - `src/services/meals.svc.ts` — from 02-PATTERNS.md lines 360–473 (DailyTotals type + logMeal + getTodayEntries + getDailyTotals + getRecentFoods + getFrequentFoods + getLastServingsForFood + updateMealEntry + deleteMealEntry).
    - `src/services/steps.svc.ts` — from 02-PATTERNS.md lines 483–493.
    - `src/services/lifts.svc.ts` — from 02-PATTERNS.md lines 502–530.

    Every service uses `import { db } from '@/db/db';` and `import type { ... } from '@/db/schema';` (cross-reference 02-PATTERNS.md §"Imports block ordering").

    **CRITICAL Pitfall #1 discipline in food.svc.ts:** `createFood()` calls `resizePhoto(photoFile)` and `savePhoto(resized)` BEFORE `db.foods.put(food)`. NEVER open a `db.transaction(...)` that `await`s non-IDB work. The code in 02-PATTERNS.md lines 310–333 already enforces this — copy verbatim and do not restructure.

    **CRITICAL Pitfall #4 discipline:** No service calls `new Date()` to derive a dayKey internally. `dayKey: string` is always a parameter (02-PATTERNS.md §"Service function signature shape"). `Date.now()` for epoch-ms timestamps is permitted.

    Create FIVE empty feature hooks.ts placeholder files with an intentional "populated by downstream plan" comment. Each file content identical except for the domain name:

    ```typescript
    // src/features/<domain>/hooks.ts
    // Populated by Plan 02-02 (settings), 02-03 (food), 02-04 (pt), 02-05 (steps/lifts).
    // This placeholder file exists so downstream plans have a stable import path.
    export {};
    ```

    Paths: `src/features/pt/hooks.ts`, `src/features/food/hooks.ts`, `src/features/steps/hooks.ts`, `src/features/lifts/hooks.ts`, `src/features/settings/hooks.ts`. (Create parent directories as needed.)

    MODIFY `src/main.tsx` — injection per 02-PATTERNS.md lines 870–882. Specifically:
    1. Add to imports at top (group 5 per 02-PATTERNS.md §"Imports block ordering"):
       `import { seedGoalsIfAbsent } from '@/services/goals.svc';`
       NOTE: the existing main.tsx uses RELATIVE imports (`'./App'`, `'./lib/installMode'`); to be consistent with that file's convention, alternatively use `import { seedGoalsIfAbsent } from './services/goals.svc';` — EITHER form is acceptable. Pick the one that matches existing imports in main.tsx.
    2. Between the existing Step 6 `if (import.meta.env.DEV)` block (currently lines 51–53) and the existing Step 7 `createRoot(...)` block (currently lines 57–61), insert a NEW step 6.5:

    ```typescript
    // Step 6.5 — D-13: ensure goals singleton exists before render.
    // Dexie opens lazily here on first goals.get(); awaited so useLiveQuery fires with data on first paint.
    try {
      await seedGoalsIfAbsent();
    } catch (err) {
      console.error('[initApp] goals seed failed', err);
    }
    ```

    The existing function is already declared `async function initApp()` (line 21) so `await` is valid. DO NOT convert to sync. DO NOT change the order of steps 1–6 or step 8.
  </action>
  <acceptance_criteria>
    - `test -f src/services/goals.svc.ts` (and all 5 other service files)
    - `grep -q 'export async function seedGoalsIfAbsent' src/services/goals.svc.ts`
    - `grep -q "SINGLETON_ID = 'singleton'" src/services/goals.svc.ts`
    - `grep -q 'calories: 2000' src/services/goals.svc.ts` (D-13 defaults)
    - `grep -q 'proteinG: 180' src/services/goals.svc.ts`
    - `grep -q 'steps: 8000' src/services/goals.svc.ts`
    - `grep -q 'export async function createTemplate' src/services/pt.svc.ts`
    - `grep -q 'export async function getLastSessionForTemplate' src/services/pt.svc.ts`
    - `grep -q "where('templateId').equals" src/services/pt.svc.ts` (indexed reverse query pattern)
    - `grep -q 'export async function createFood' src/services/food.svc.ts`
    - `grep -c 'resizePhoto' src/services/food.svc.ts` equals `1` (photo resize called exactly once)
    - `awk '/export async function createFood/,/^}/' src/services/food.svc.ts | awk '/resizePhoto/{r=NR} /db\.foods\.put/{p=NR} END{exit !(r && p && r < p)}'` exits 0 (resizePhoto call precedes db.foods.put — Pitfall #1 + Pitfall #8 guard)
    - `grep -q 'export async function logMeal' src/services/meals.svc.ts`
    - `grep -q 'computedCalories: food.calories \* servings' src/services/meals.svc.ts` (FOOD-06 denormalization)
    - `grep -q 'export async function upsertSteps' src/services/steps.svc.ts`
    - `grep -q 'export async function toggleLift' src/services/lifts.svc.ts`
    - `! grep -q "toISOString().split" src/services/*.ts` (Pitfall #4 guard across services)
    - `! grep -nE "^\s*await\s+(?!db\.)(?!resizePhoto)(?!savePhoto)(?!deletePhoto)(?!seedGoalsIfAbsent)" src/services/*.ts` returns only allow-listed awaits (manual Pitfall #1 compliance: no random non-IDB awaits — the allowed set is db.*, photoStore helpers, and internal service calls; the guard above is advisory not strictly automated — executor reads each `await` in each service and confirms each awaits either `db.*` or a documented non-txn pre-step)
    - `! grep -rn 'db\.transaction(' src/services/` returns nothing (no explicit transactions in Phase 2 — Dexie single-put auto-transactions handle our writes; this guards against accidentally wrapping photo work in a txn — Pitfall #1)
    - `test -f src/features/pt/hooks.ts` && `test -f src/features/food/hooks.ts` && `test -f src/features/steps/hooks.ts` && `test -f src/features/lifts/hooks.ts` && `test -f src/features/settings/hooks.ts`
    - `grep -q 'seedGoalsIfAbsent' src/main.tsx` (import + call present)
    - `awk '/registerSW/{r=NR} /seedGoalsIfAbsent\(\)/{s=NR} /createRoot/{c=NR} END{exit !(s && c && s < c && (r==0 || s < r))}' src/main.tsx` exits 0 (seedGoalsIfAbsent called BEFORE createRoot and BEFORE registerSW step 8)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>All 6 service files exist with full implementations from 02-PATTERNS.md; 5 feature hooks.ts placeholders exist; `initApp()` awaits `seedGoalsIfAbsent()` between dayKey smoke and createRoot; `npm run build` passes; Pitfall #1/#4/#8 grep-guards all pass.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0 from repo root.
- `npm run build` exits 0 from repo root.
- Manual spot: start dev server (`npm run dev`), open `/settings` — page still renders Install card + version line (Phase 1 behavior unchanged, no GoalsForm yet — that's P2).
- Open browser DevTools → Application → IndexedDB → `healthtracker` → `goals` store. On first run (fresh profile): exactly one record with `id: 'singleton'`, `calories: 2000`, `proteinG: 180`, `carbsG: 180`, `fatG: 65`, `steps: 8000`, `updatedAt: <some epoch ms>`.
- On SECOND run (same profile): no duplicate record; same singleton with same values (idempotent seed).
- `grep -c "db.version(" src/db/db.ts` equals `1` (no schema migration introduced in Phase 2).
</verification>

<success_criteria>
Plan complete when:
- [ ] All 4 new npm packages are in package.json at the pinned versions
- [ ] `src/components/ui/sheet.tsx` is Radix-backed (grep for `@radix-ui/react-dialog` finds import)
- [ ] `src/components/ProgressBar.tsx` exists, renders zero-target sentinel and over-target clamp, has no CSS transition
- [ ] `src/lib/dayKey.ts` exports `inferBucket` and still exports `todayKey`, `dateToKey`, `keyToDate`
- [ ] All 6 service files exist in `src/services/` with functions matching the interface contracts in this plan
- [ ] `food.svc.ts:createFood` calls `resizePhoto` + `savePhoto` BEFORE `db.foods.put` (Pitfall #1)
- [ ] `meals.svc.ts:logMeal` writes denormalized `computed*` fields (FOOD-06 groundwork)
- [ ] 5 empty `hooks.ts` placeholders exist in each `src/features/<domain>/`
- [ ] `src/main.tsx:initApp()` awaits `seedGoalsIfAbsent()` between dayKey smoke and createRoot
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm run build` exits 0
- [ ] Fresh-profile first launch creates `goals` singleton with D-13 defaults; subsequent launches do not overwrite
- [ ] No Pitfall #1/#4/#8 grep-guard violations anywhere in `src/services/` or `src/lib/dayKey.ts`
- [ ] No `db.version()` bump in `src/db/db.ts`
</success_criteria>

<output>
After completion, create `.planning/phases/02-tracking-slices/02-01-SUMMARY.md` summarizing:
- Dependencies installed + their final versions
- Whether `shadcn add sheet` surfaced any unexpected file diffs
- Service file line counts
- Any Pitfall #1 audits performed + results
- Confirmation that initApp's goals seed executes idempotently
</output>

**Requirement satisfaction note:** This is a foundation plan — no phase REQ-IDs are satisfied here directly. All 22 Phase 2 REQs are satisfied by P2 (SET-01..03), P3 (FOOD-01..08), P4 (PT-01..07), P5 (STEPS-01..02 + LIFT-01..02). This plan's `requirements` and `requirements_addressed` frontmatter arrays are intentionally empty. If the coverage audit tool flags this as a gap, reference this note — the plan's role is strictly foundation-establishing and every downstream plan depends on it.
</output>
