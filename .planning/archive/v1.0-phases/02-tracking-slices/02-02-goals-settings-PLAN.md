---
phase: 02-tracking-slices
plan: 02
type: execute
wave: 2
depends_on: [1]
files_modified:
  - src/features/settings/GoalsForm.tsx
  - src/features/settings/hooks.ts
  - src/routes/SettingsScreen.tsx
autonomous: true
requirements: [SET-01, SET-02, SET-03]
requirements_addressed: [SET-01, SET-02, SET-03]
must_haves:
  truths:
    - "User sees a 'Daily goals' form in Settings with 5 pre-populated fields (calories, protein, carbs, fat, steps)"
    - "Fields are pre-filled from the current Goals singleton (D-13 seed on first launch)"
    - "Tapping Save goals persists all 5 fields atomically via goals.svc.saveGoals"
    - "After save, any component subscribing via useLiveQuery re-renders with the new targets (SET-02 reactivity)"
    - "Saving 0 in any field succeeds (D-16 zero-target sentinel is permitted)"
    - "Negative or non-integer values surface an inline Zod error below the affected input"
    - "Saved goal changes are non-destructive — no goal-per-day snapshot store exists; historical rendering (Phase 3) will use current values (D-14 locked)"
  artifacts:
    - path: "src/features/settings/GoalsForm.tsx"
      provides: "React Hook Form + Zod form with 5 fields + Save goals button; reads via useLiveQuery; writes via goals.svc.saveGoals"
      min_lines: 80
    - path: "src/features/settings/hooks.ts"
      provides: "useGoals() useLiveQuery wrapper"
    - path: "src/routes/SettingsScreen.tsx"
      provides: "Injects <GoalsForm /> between the Install card and the flex-1 spacer"
  key_links:
    - from: "src/features/settings/GoalsForm.tsx"
      to: "src/services/goals.svc.ts:saveGoals"
      via: "onSubmit handler calls saveGoals"
      pattern: "saveGoals\\("
    - from: "src/features/settings/GoalsForm.tsx"
      to: "src/features/settings/hooks.ts:useGoals"
      via: "reactive read for values prop"
      pattern: "useGoals\\(\\)"
    - from: "src/routes/SettingsScreen.tsx"
      to: "src/features/settings/GoalsForm.tsx"
      via: "<GoalsForm /> inserted between Install card and flex-1 spacer"
      pattern: "<GoalsForm"
---

<objective>
Build the Goals form in Settings. The form is the only user-facing way to set daily targets (calories / protein / carbs / fat / steps) and is a prerequisite for every progress bar built in P3 (Food macro bars) and P5 (Steps bar + Today macro bars). P1 already seeded the `goals` singleton at first launch, so the form is pre-populated from day one — no empty state.

Purpose: Deliver the reactive edge of SET-02 (targets propagate via `useLiveQuery` without reload) and the contract surface of SET-01 + SET-03. Downstream plans can then consume `useGoals()` from `src/features/settings/hooks.ts` without caring about the form's existence.

Output: A visible `Daily goals` card in `/settings` between the Install card and the version line. Five pre-filled integer inputs + a `Save goals` button. Saving persists all 5 fields atomically; any Dexie-reactive consumer re-renders automatically on save.
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
@CLAUDE.md
@src/db/schema.ts
@src/services/goals.svc.ts
@src/routes/SettingsScreen.tsx
@src/components/ui/card.tsx
@src/components/ui/button.tsx
@src/lib/utils.ts

<interfaces>
From src/services/goals.svc.ts (created by Plan 02-01):
```typescript
export const SINGLETON_ID: 'singleton';
export function seedGoalsIfAbsent(): Promise<void>;
export function getGoals(): Promise<Goals | undefined>;
export function saveGoals(input: Omit<Goals,'id'|'updatedAt'>): Promise<void>;
```

From src/db/schema.ts:
```typescript
export interface Goals { id: string; calories: number; proteinG: number; carbsG: number; fatG: number; steps: number; updatedAt: number; }
```

This plan creates:
```typescript
// src/features/settings/hooks.ts
export function useGoals(): Goals | undefined;   // undefined while loading; after P1's seed, this resolves on first tick with seeded values

// src/features/settings/GoalsForm.tsx
export function GoalsForm(): JSX.Element;
```
</interfaces>
</context>

<threat_model>
Per RESEARCH.md §Security Domain: no new trust boundary. This plan's form-specific threats:
- **Integer overflow / resource exhaustion:** a user pasting a huge number (e.g. `9999999999`) could in theory cause ProgressBar math to produce Infinity. Mitigated by Zod `.int().min(0)` plus a sanity upper bound `.max(1_000_000)` (wide enough for any realistic calorie/step target — prevents accidental absurd values without being annoying).
- **NaN injection via empty numeric input:** mitigated by RHF `{ valueAsNumber: true }` + Zod `.number({message:'Required'})` which rejects NaN.
- **No network / auth / CSRF surface.**
</threat_model>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create useGoals hook</name>
  <files>src/features/settings/hooks.ts</files>
  <read_first>
    - src/features/settings/hooks.ts (placeholder created in Plan 02-01 — contains only `export {};`)
    - src/services/goals.svc.ts (getGoals signature)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/<domain>/hooks.ts (NEW — useLiveQuery wrappers)" lines 695–726 (canonical shape; copy applied to settings)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md Pattern 1 lines 375–387 (useLiveQuery wrapper pattern)
    - CLAUDE.md rule #1 (services own all Dexie access — hooks re-expose via useLiveQuery)
  </read_first>
  <action>
    Replace the placeholder contents of `src/features/settings/hooks.ts` with:

    ```typescript
    // src/features/settings/hooks.ts
    // Reactive wrapper around goals.svc.getGoals(). useLiveQuery re-fires whenever
    // any row in the `goals` store is put/deleted — so any consumer (GoalsForm for
    // pre-populating field values, and all future macro / step ProgressBars in P3/P5)
    // re-renders automatically when Save goals is tapped. This is the mechanism
    // behind SET-02.

    import { useLiveQuery } from 'dexie-react-hooks';
    import { getGoals } from '@/services/goals.svc';

    export function useGoals() {
      return useLiveQuery(() => getGoals(), []);
      // Returns `Goals | undefined`. `undefined` means the query is still loading
      // (extremely rare — P1 seeded defaults in initApp() before render). Consumers
      // should treat `undefined` as "render empty state", not as "goals not yet set".
    }
    ```

    DO NOT add additional hooks to this file. DO NOT add other exports. This file covers the Settings feature's reactive reads; other features have their own `hooks.ts`.
  </action>
  <acceptance_criteria>
    - `grep -q 'useLiveQuery' src/features/settings/hooks.ts`
    - `grep -q "from 'dexie-react-hooks'" src/features/settings/hooks.ts`
    - `grep -q 'export function useGoals' src/features/settings/hooks.ts`
    - `grep -q "from '@/services/goals.svc'" src/features/settings/hooks.ts`
    - `! grep -q 'export {};' src/features/settings/hooks.ts` (placeholder replaced)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>`useGoals()` hook exists and re-fires on any `goals` store change.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build GoalsForm (RHF + Zod) and inject into Settings</name>
  <files>src/features/settings/GoalsForm.tsx, src/routes/SettingsScreen.tsx</files>
  <behavior>
    - When `useGoals()` returns a singleton, the form pre-populates all 5 inputs with those exact values
    - While `useGoals()` is undefined (pre-seed tick, effectively never after P1), the form renders with no values — Save is inert
    - Empty input → "Required" error text (Label role, destructive color `#ef4444`) directly below that input
    - Negative input (e.g. `-1`) → "Must be 0 or higher" error text
    - Non-integer input (e.g. `100.5`) → "Whole number only" error text
    - Value of `0` → no error; Save succeeds; subsequent useGoals() returns `0` for that field (D-16 sentinel permitted)
    - Tapping Save goals with valid values calls `goals.svc.saveGoals` exactly once with `{calories, proteinG, carbsG, fatG, steps}` (no id, no updatedAt — service adds those)
    - Save button stays enabled with errors; clicking with errors triggers re-validation and scroll-to-first-error
    - No success toast, no spinner, no modal — after save the button stays enabled and any useLiveQuery-subscribed progress bar elsewhere re-renders via Dexie
  </behavior>
  <read_first>
    - src/routes/SettingsScreen.tsx (FULL current file; injection point is between `</Card>` at line 50 and `<div className="flex-1" />` at line 52)
    - src/components/ui/card.tsx (Card component — GoalsForm wraps in Card for visual parity with Install card)
    - src/components/ui/button.tsx (Button variant="default" for Save goals)
    - src/features/settings/hooks.ts (useGoals — created in Task 1)
    - src/services/goals.svc.ts (saveGoals signature)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/settings/GoalsForm.tsx (form — RHF + Zod)" lines 729–753 (key RHF rules + schema)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"Cross-cutting: RHF + Zod form pattern" lines 916–941 (four rules: valueAsNumber, values not defaultValues, lazy errors, spread register)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md Pattern 2 (the full Goals example — includes zodResolver wiring)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Goals form (Settings)" lines 544–558 (layout contract)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Goals form (Settings)" copy table lines 310–325 (exact label + error strings)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Destructive color (Phase 2 FIRST-USE declaration)" lines 157–170 (#ef4444 via inline style)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Form Validation Patterns" lines 708–740 (schema conventions, error display, timing)
  </read_first>
  <action>
    File 1 — `src/features/settings/GoalsForm.tsx` (CREATE). Implement the RHF+Zod form. The exact schema and copy strings are prescribed below — do not paraphrase.

    Component structure (top-down):
    1. Imports: React, `useForm` from 'react-hook-form', `zodResolver` from '@hookform/resolvers/zod', `z` from 'zod', `Card` from '@/components/ui/card', `Button` from '@/components/ui/button', `useGoals` from './hooks', `saveGoals` from '@/services/goals.svc'.
    2. Zod schema (inline at top of module, above the component):

    ```typescript
    const goalsSchema = z.object({
      calories: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher').max(1_000_000, 'Too large'),
      proteinG: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher').max(1_000_000, 'Too large'),
      carbsG:   z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher').max(1_000_000, 'Too large'),
      fatG:     z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher').max(1_000_000, 'Too large'),
      steps:    z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher').max(1_000_000, 'Too large'),
    });
    type GoalsInput = z.infer<typeof goalsSchema>;
    ```

    3. Component body:
       - Call `const current = useGoals();`
       - Call `const { register, handleSubmit, formState: { errors } } = useForm<GoalsInput>({ resolver: zodResolver(goalsSchema), values: current ? { calories: current.calories, proteinG: current.proteinG, carbsG: current.carbsG, fatG: current.fatG, steps: current.steps } : undefined });`
         — MUST use `values:` (not `defaultValues:`) so the form re-syncs when useLiveQuery resolves (02-PATTERNS.md rule #2 for forms).
       - `onSubmit = handleSubmit(async (data) => { await saveGoals(data); });` — no success handling beyond the awaited save. Per D-04 / UI-SPEC: no toast, no state change, no spinner; useLiveQuery reactivity is the signal.
       - Render inside a `<Card className="bg-surface border border-border rounded-lg p-4 space-y-4">`:
         - Heading row: `<h2 className="text-base font-semibold text-text">Daily goals</h2>`
         - A `<form onSubmit={onSubmit} className="space-y-4">` containing 5 field blocks. Each field block follows this exact pattern (example for calories):

       ```tsx
       <div className="space-y-1">
         <label htmlFor="goals-calories" className="block text-xs text-muted">Calories</label>
         <input
           id="goals-calories"
           type="number"
           inputMode="numeric"
           aria-invalid={!!errors.calories}
           aria-describedby={errors.calories ? 'goals-calories-error' : undefined}
           className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
           {...register('calories', { valueAsNumber: true })}
         />
         {errors.calories && (
           <p id="goals-calories-error" className="text-xs" style={{ color: '#ef4444' }}>
             {errors.calories.message}
           </p>
         )}
       </div>
       ```

       Replicate for `proteinG` (label "Protein (g)"), `carbsG` ("Carbs (g)"), `fatG` ("Fat (g)"), `steps` ("Steps"). Labels and error strings MUST match UI-SPEC §"Goals form (Settings)" and §"Validation error" tables verbatim — no paraphrasing.

       - Bottom row: `<Button type="submit" variant="default" className="w-full">Save goals</Button>`

    CRITICAL RHF rules from 02-PATTERNS.md lines 920–941:
    - Every numeric `register()` MUST pass `{ valueAsNumber: true }` (rule #1). Without it, HTML number inputs submit strings and Zod's `.number()` rejects them — silent validation failure.
    - Use `values:` not `defaultValues:` (rule #2). Our `current` arrives reactively.
    - Only destructure `errors` from formState; this is lazy-subscribed (rule #3) — do NOT destructure `isSubmitting`, `isDirty`, etc., as they force extra re-renders for no benefit.
    - Input binding uses `{...register('name', opts)}` spread (rule #4) — no `value={}` / `onChange={}` control.

    File 2 — `src/routes/SettingsScreen.tsx` (MODIFY).
    - Add import: `import { GoalsForm } from '@/features/settings/GoalsForm';` (place in the Phase 1 import block order; after existing imports from `@/lib/*`).
    - Insert `<GoalsForm />` on its own line BETWEEN the closing `{!installed && ( ... )}` block (currently ends at line 50 with `)}`) and the existing `<div className="flex-1" />` (currently line 52). The insertion becomes the new line 51.
    - Do NOT modify the Install card, the version line, the heading, the outer wrapper className, or the `min-h-[calc(100dvh-112px)]` sizing.
  </action>
  <acceptance_criteria>
    - `test -f src/features/settings/GoalsForm.tsx`
    - `grep -q 'export function GoalsForm' src/features/settings/GoalsForm.tsx`
    - `grep -q 'zodResolver(goalsSchema)' src/features/settings/GoalsForm.tsx` (Zod resolver wired)
    - `grep -q "import { z } from 'zod'" src/features/settings/GoalsForm.tsx`
    - `grep -q "import { useForm } from 'react-hook-form'" src/features/settings/GoalsForm.tsx`
    - `grep -qE '\.int\(' src/features/settings/GoalsForm.tsx` (integer constraint per D-15 + UI-SPEC validation table)
    - `grep -qE '\.min\(0' src/features/settings/GoalsForm.tsx` (non-negative — permits D-16 zero)
    - `grep -qE '\.max\(' src/features/settings/GoalsForm.tsx` (sanity upper bound for integer overflow mitigation)
    - `grep -c 'valueAsNumber: true' src/features/settings/GoalsForm.tsx` returns exactly `5` (one per numeric field)
    - `grep -q 'values:' src/features/settings/GoalsForm.tsx` (NOT defaultValues — rule #2)
    - `! grep -q 'defaultValues:' src/features/settings/GoalsForm.tsx`
    - `grep -q 'saveGoals(' src/features/settings/GoalsForm.tsx` (write path wired)
    - `grep -q 'useGoals()' src/features/settings/GoalsForm.tsx` (read path wired)
    - `grep -q "Daily goals" src/features/settings/GoalsForm.tsx` (UI-SPEC heading copy)
    - `grep -q ">Calories<" src/features/settings/GoalsForm.tsx` (UI-SPEC label copy)
    - `grep -q ">Protein (g)<" src/features/settings/GoalsForm.tsx`
    - `grep -q ">Carbs (g)<" src/features/settings/GoalsForm.tsx`
    - `grep -q ">Fat (g)<" src/features/settings/GoalsForm.tsx`
    - `grep -q ">Steps<" src/features/settings/GoalsForm.tsx`
    - `grep -q ">Save goals<" src/features/settings/GoalsForm.tsx`
    - `grep -q "#ef4444" src/features/settings/GoalsForm.tsx` (destructive color declared inline per UI-SPEC §"Destructive color" first-use)
    - `grep -q 'inputMode="numeric"' src/features/settings/GoalsForm.tsx` (UI-SPEC keyboard policy)
    - `grep -q 'aria-invalid' src/features/settings/GoalsForm.tsx` (A11y)
    - `grep -q 'type="number"' src/features/settings/GoalsForm.tsx`
    - `grep -q '<GoalsForm' src/routes/SettingsScreen.tsx` (injected into Settings)
    - `awk '/<\/Card>/{c=NR} /<GoalsForm/{g=NR} /flex-1/{f=NR} END{exit !(c && g && f && c < g && g < f)}' src/routes/SettingsScreen.tsx` exits 0 (GoalsForm placed AFTER Install Card close AND BEFORE flex-1 spacer)
    - `! grep -q "toISOString().split" src/features/settings/GoalsForm.tsx` (Pitfall #4 guard — should be trivially true since this file does no date work, but enforced)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>GoalsForm renders in Settings between the Install card and version line; pre-populates from the seeded singleton; saves all 5 fields atomically via goals.svc.saveGoals; shows Zod validation errors inline with destructive color.</done>
</task>

</tasks>

<verification>
- `npm run build` exits 0; bundle grows by a reasonable delta (RHF+Zod add ~15 KB gzip).
- Manual: open `/settings`, see `Daily goals` card below Install card with all 5 fields pre-filled (2000 / 180 / 180 / 65 / 8000 on a fresh profile).
- Manual: edit calories to `2200`, tap Save goals, reload — field re-renders with 2200 (persistence confirmed).
- Manual: edit calories to `-5`, tap Save goals — inline red error "Must be 0 or higher" appears; no Dexie write occurs (DevTools → IndexedDB → goals still shows prior value).
- Manual: edit calories to `100.5`, tap Save goals — inline red error "Whole number only"; no Dexie write.
- Manual: clear the calories input entirely, tap Save goals — inline red error "Required"; no Dexie write.
- Manual: set all 5 fields to `0`, tap Save goals — write succeeds; useGoals() returns zeros (D-16 sentinel permitted).
- `grep -rn '--accent-25\|--accent-50\|--accent-75\|--accent-100' src/features/settings/` returns empty (Phase 3 reserve untouched).
</verification>

<success_criteria>
- [ ] `useGoals()` hook exists and is reactive
- [ ] GoalsForm renders in Settings between Install card and version line
- [ ] All 5 fields pre-populate from the seeded D-13 singleton on first launch
- [ ] Save goals persists all 5 fields atomically via `saveGoals()`
- [ ] `valueAsNumber: true` on every numeric register (5 occurrences)
- [ ] `values:` is used (not `defaultValues:`)
- [ ] Zod schema enforces int + min(0) + max(1_000_000)
- [ ] Inline Zod errors render with destructive color `#ef4444`
- [ ] Input `aria-invalid` is set when a field has an error
- [ ] No success toast / spinner / modal on save (D-04)
- [ ] SET-01 + SET-02 + SET-03 all verifiable via the manual verification steps
- [ ] `npx tsc --noEmit` exits 0, `npm run build` exits 0
</success_criteria>

<output>
After completion, create `.planning/phases/02-tracking-slices/02-02-SUMMARY.md` with:
- Any deviations from the prescribed schema / copy strings (should be zero)
- Bundle size delta from adding RHF + Zod + GoalsForm
- Whether SET-02 reactivity is visually provable (reload after Save shows new values — the full cross-component reactivity demo is P3/P5's responsibility once macro bars exist)
</output>
