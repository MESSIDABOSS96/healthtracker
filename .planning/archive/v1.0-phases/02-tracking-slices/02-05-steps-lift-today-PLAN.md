---
phase: 02-tracking-slices
plan: 05
type: execute
wave: 4
depends_on: [1, 2, 3, 4]
files_modified:
  - src/features/steps/hooks.ts
  - src/features/steps/StepsSection.tsx
  - src/features/steps/StepsInlineInput.tsx
  - src/features/lifts/hooks.ts
  - src/features/lifts/LiftSection.tsx
  - src/features/lifts/LiftToggle.tsx
  - src/features/lifts/LiftNoteInput.tsx
  - src/routes/TodayScreen.tsx
autonomous: true
requirements: [STEPS-01, STEPS-02, LIFT-01, LIFT-02]
requirements_addressed: [STEPS-01, STEPS-02, LIFT-01, LIFT-02]
must_haves:
  truths:
    - "Today screen renders 4 live feature components in order: PTSection, FoodSection, StepsSection, LiftSection (no hardcoded placeholders remain)"
    - "Steps card shows live `{count} / {target}` or zero-target variants per UI-SPEC; tapping status slot reveals an inline number input"
    - "Typing steps + blur OR Enter upserts via steps.svc.upsertSteps(todayKey(), count); Escape cancels"
    - "Steps progress bar below the card reflects stored count against goals.steps target (STEPS-02)"
    - "Lift card shows ☐ or ✓ glyph in status slot; tapping the glyph toggles stored `lifted` via lifts.svc.toggleLift (LIFT-01)"
    - "When lift is toggled on, an 'Add note' affordance appears; tapping reveals a single-line text input that blur-saves via setLiftNote (LIFT-02)"
    - "Lift toggle ✓ glyph is colored --accent; ☐ glyph is colored --muted (UI-SPEC)"
    - "No Sheet is used for Steps or Lift (D-02 inline-in-card)"
  artifacts:
    - path: "src/features/steps/hooks.ts"
      provides: "useStepsForDay wrapping steps.svc.getStepsForDay(todayKey())"
    - path: "src/features/steps/StepsSection.tsx"
      provides: "Today-card Steps; header + status + tap-to-reveal inline input + ProgressBar below"
    - path: "src/features/steps/StepsInlineInput.tsx"
      provides: "Controlled number input with blur/Enter commit + Escape cancel"
    - path: "src/features/lifts/hooks.ts"
      provides: "useLiftForDay wrapping lifts.svc.getLiftForDay(todayKey())"
    - path: "src/features/lifts/LiftSection.tsx"
      provides: "Today-card Lift; header + status + inline toggle + optional note input below"
    - path: "src/features/lifts/LiftToggle.tsx"
      provides: "Tappable ☐/✓ glyph button with accent/muted coloring + dynamic aria-label"
    - path: "src/features/lifts/LiftNoteInput.tsx"
      provides: "Blur-to-save single-line note input; shows only when lifted==true"
    - path: "src/routes/TodayScreen.tsx"
      provides: "Renders <PTSection/>, <FoodSection/>, <StepsSection/>, <LiftSection/> in order (replaces Phase 1 placeholder sections array)"
  key_links:
    - from: "src/routes/TodayScreen.tsx"
      to: "src/features/{pt,food,steps,lifts}/*Section.tsx"
      via: "4 component instantiations in order, inside px-4 py-6 space-y-4 wrapper"
      pattern: "<PTSection|<FoodSection|<StepsSection|<LiftSection"
    - from: "src/features/steps/StepsInlineInput.tsx"
      to: "src/services/steps.svc.ts:upsertSteps"
      via: "blur/Enter handler"
      pattern: "upsertSteps\\("
    - from: "src/features/lifts/LiftToggle.tsx"
      to: "src/services/lifts.svc.ts:toggleLift"
      via: "onClick handler"
      pattern: "toggleLift\\("
    - from: "src/features/lifts/LiftNoteInput.tsx"
      to: "src/services/lifts.svc.ts:setLiftNote"
      via: "blur handler"
      pattern: "setLiftNote\\("
---

<objective>
Finalize the Today screen integration by shipping the two simplest slices (Steps, Lift) inline per D-02 (no Sheets), then swap `src/routes/TodayScreen.tsx`'s Phase 1 placeholder array for the four live feature components.

Purpose: Completes Phase 2's stated goal — "All four daily tracking areas are fully usable." After this plan, the Phase 2 roadmap success criteria #3, #4, #5 are observably satisfied (live macro bars, live steps bar, working Lift toggle). The minor final wiring work leaves Phase 2 verification and UAT as clean as possible.

Output: Today screen renders PT + Food + Steps + Lift live components; no hardcoded section strings remain; STEPS-01/02 and LIFT-01/02 are fully observable end-to-end.
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
@src/services/steps.svc.ts
@src/services/lifts.svc.ts
@src/services/goals.svc.ts
@src/lib/dayKey.ts
@src/lib/utils.ts
@src/components/ProgressBar.tsx
@src/components/ui/card.tsx
@src/routes/TodayScreen.tsx
@src/features/settings/hooks.ts

<interfaces>
From Plan 02-01:
```typescript
// steps.svc.ts
export function upsertSteps(dayKey: string, count: number): Promise<void>;
export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined>;

// lifts.svc.ts
export function toggleLift(dayKey: string): Promise<void>;
export function setLiftNote(dayKey: string, note: string): Promise<void>;
export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined>;
```

From Plan 02-02:
```typescript
export function useGoals(): Goals | undefined;
```

From Plan 02-03 + 02-04 (available since this plan is Wave 4):
```typescript
export function PTSection(): JSX.Element;
export function FoodSection(): JSX.Element;
```

From src/db/schema.ts:
```typescript
export interface StepEntry { dayKey: string; count: number; loggedAt: number; }
export interface LiftCheckin { dayKey: string; lifted: boolean; note?: string; loggedAt: number; }
```

This plan creates:
```typescript
// steps/hooks.ts
export function useStepsForDay(): StepEntry | undefined;

// lifts/hooks.ts
export function useLiftForDay(): LiftCheckin | undefined;

// Components: StepsSection, StepsInlineInput, LiftSection, LiftToggle, LiftNoteInput
```
</interfaces>
</context>

<threat_model>
Per RESEARCH.md §Security Domain: no new trust boundary. Plan-specific mitigations:
- **Integer overflow on step count**: HTML input `type="number" min="0" max="999999"` plus a runtime `Math.floor(parseInt(...))` guard + `Number.isFinite` check in the commit path. 999_999 is wide enough for any realistic daily step count.
- **Lift note XSS**: rendered as `{note}` text child in React — auto-escaped.
- **No network / auth / CSRF surface.**
</threat_model>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Steps slice (hook + inline input + section)</name>
  <files>src/features/steps/hooks.ts, src/features/steps/StepsInlineInput.tsx, src/features/steps/StepsSection.tsx</files>
  <read_first>
    - src/services/steps.svc.ts (upsertSteps + getStepsForDay signatures)
    - src/features/steps/hooks.ts (placeholder from P1)
    - src/lib/dayKey.ts
    - src/features/settings/hooks.ts (useGoals)
    - src/components/ProgressBar.tsx
    - src/components/ui/card.tsx
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/steps/StepsInlineInput.tsx (component — blur-to-save)" lines 804–806 (RESEARCH Example E reference — full code is in RESEARCH)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md Example E lines 1212–1260 (the full StepsInlineInput implementation — copy verbatim)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Steps card (inline, D-02)" lines 287–296
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card populated-status copy patterns" Steps rows (lines 198–201)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card status slot (live layout)" Steps row (line 568: Heading left + status string right + 1 ProgressBar below, NO leading label)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Spacing Scale" Steps inline input width (line 79: `w-24` / 96px)
  </read_first>
  <action>
    File 1 — `src/features/steps/hooks.ts` (REPLACE placeholder):

    ```typescript
    import { useLiveQuery } from 'dexie-react-hooks';
    import { getStepsForDay } from '@/services/steps.svc';
    import { todayKey } from '@/lib/dayKey';

    export function useStepsForDay() {
      return useLiveQuery(() => getStepsForDay(todayKey()), []);
    }
    ```

    File 2 — `src/features/steps/StepsInlineInput.tsx` (NEW). Copy RESEARCH.md Example E lines 1212–1260 verbatim. The core contract:

    ```tsx
    import { useState, useRef, useEffect } from 'react';
    import { upsertSteps } from '@/services/steps.svc';
    import { todayKey } from '@/lib/dayKey';

    interface Props {
      currentCount: number;
      onCommitted: () => void;     // parent closes the reveal after commit or cancel
    }

    export function StepsInlineInput({ currentCount, onCommitted }: Props) {
      const [value, setValue] = useState(String(currentCount || ''));
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        // queueMicrotask so the reveal finishes first, then focus lands without flicker.
        queueMicrotask(() => inputRef.current?.focus());
      }, []);

      const commit = async () => {
        const parsed = parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 999_999) {
          await upsertSteps(todayKey(), Math.floor(parsed));
        }
        onCommitted();
      };

      return (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min="0"
          max="999999"
          placeholder="0"
          aria-label="Enter step count for today"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.currentTarget.blur(); /* triggers commit via onBlur */ }
            if (e.key === 'Escape') { setValue(String(currentCount || '')); onCommitted(); }
          }}
          className="h-11 w-24 px-3 rounded-md bg-bg border border-border text-text tabular-nums text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
      );
    }
    ```

    Note: `Enter` blurs the input — the blur handler commits. This avoids double-fire. Escape reverts value and commits `onCommitted` without a write.

    File 3 — `src/features/steps/StepsSection.tsx` (NEW). Per UI-SPEC §"Steps card (inline, D-02)" + §"Today-card status slot (live layout)" Steps row:

    ```tsx
    import { useState } from 'react';
    import { Card } from '@/components/ui/card';
    import { ProgressBar } from '@/components/ProgressBar';
    import { StepsInlineInput } from './StepsInlineInput';
    import { useStepsForDay } from './hooks';
    import { useGoals } from '@/features/settings/hooks';

    export function StepsSection() {
      const steps = useStepsForDay();
      const goals = useGoals();
      const [editing, setEditing] = useState(false);

      const count = steps?.count ?? 0;
      const target = goals?.steps ?? 0;

      // UI-SPEC Today-card populated-status Steps table:
      const statusText =
        steps && target > 0 ? `${count} / ${target}` :
        steps && target === 0 ? `${count}` :
        !steps && target > 0 ? `0 / ${target}` :
        '—';

      return (
        <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">Steps</h2>
            {editing ? (
              <StepsInlineInput currentCount={count} onCommitted={() => setEditing(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Enter step count for today"
                className="text-sm text-muted text-right"
              >
                {statusText}
              </button>
            )}
          </div>
          <ProgressBar value={count} max={target} ariaLabel="Steps progress" />
        </Card>
      );
    }
    ```

    NOTE per UI-SPEC §"Today-card status slot (live layout)": Steps card gets ONE ProgressBar below the header with NO leading label (unlike Food which has 4 bars with Cal/P/C/F labels). Pass `label` undefined to ProgressBar.
  </action>
  <acceptance_criteria>
    - `test -f src/features/steps/hooks.ts` && `grep -q 'useStepsForDay' src/features/steps/hooks.ts`
    - `grep -q 'useLiveQuery' src/features/steps/hooks.ts`
    - `test -f src/features/steps/StepsInlineInput.tsx`
    - `grep -q 'upsertSteps' src/features/steps/StepsInlineInput.tsx`
    - `grep -q 'todayKey()' src/features/steps/StepsInlineInput.tsx`
    - `grep -q 'onBlur' src/features/steps/StepsInlineInput.tsx` (blur-to-save)
    - `grep -q 'Escape' src/features/steps/StepsInlineInput.tsx` (Escape-cancels per UI-SPEC)
    - `grep -q 'Enter' src/features/steps/StepsInlineInput.tsx` (Enter-commits per UI-SPEC)
    - `grep -q 'inputMode="numeric"' src/features/steps/StepsInlineInput.tsx`
    - `grep -q '"Enter step count for today"' src/features/steps/StepsInlineInput.tsx` (UI-SPEC aria-label)
    - `grep -q 'w-24' src/features/steps/StepsInlineInput.tsx` (UI-SPEC 96px width)
    - `grep -q 'placeholder="0"' src/features/steps/StepsInlineInput.tsx` (UI-SPEC)
    - `grep -q 'queueMicrotask' src/features/steps/StepsInlineInput.tsx` (focus-flicker guard per RESEARCH Example E)
    - `grep -q '999' src/features/steps/StepsInlineInput.tsx` (integer-overflow bound: 999_999)
    - `test -f src/features/steps/StepsSection.tsx`
    - `grep -q 'export function StepsSection' src/features/steps/StepsSection.tsx`
    - `grep -q '>Steps<' src/features/steps/StepsSection.tsx` (UI-SPEC card title)
    - `grep -q 'StepsInlineInput' src/features/steps/StepsSection.tsx`
    - `grep -q 'ProgressBar' src/features/steps/StepsSection.tsx`
    - `grep -q 'useStepsForDay' src/features/steps/StepsSection.tsx`
    - `grep -q 'useGoals' src/features/steps/StepsSection.tsx`
    - `! grep -q "toISOString().split" src/features/steps/*.tsx src/features/steps/hooks.ts` (Pitfall #4 guard)
    - `! grep -q 'db.transaction' src/features/steps/*.tsx` (Pitfall #1 guard)
  </acceptance_criteria>
  <done>Steps slice fully inline per D-02; tap-to-reveal number input commits on blur/Enter, cancels on Escape; ProgressBar reflects count against goal.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Lift slice (hook + toggle + note input + section)</name>
  <files>src/features/lifts/hooks.ts, src/features/lifts/LiftToggle.tsx, src/features/lifts/LiftNoteInput.tsx, src/features/lifts/LiftSection.tsx</files>
  <read_first>
    - src/services/lifts.svc.ts (toggleLift + setLiftNote + getLiftForDay signatures; schema field is `lifted` not `didLift` — 02-PATTERNS.md line 499)
    - src/features/lifts/hooks.ts (placeholder from P1)
    - src/features/steps/StepsInlineInput.tsx (blur-to-save pattern — LiftNoteInput mirrors this)
    - src/lib/dayKey.ts
    - src/components/ui/card.tsx
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Lift card (inline, D-02)" lines 298–308
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card populated-status copy patterns" Lift rows (lines 202–203)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card status slot (live layout)" Lift row (line 569: Heading left + glyph right ONLY; NO progress bar)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Spacing Scale" Lift toggle glyph size (line 78: 32px font-size, 44×44 hit area via p-1.5 on parent button)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §Accent reserved for #4 (line 135: ✓ glyph colored --accent, ☐ colored --muted)
    - .planning/phases/02-tracking-slices/02-RESEARCH.md §Phase Requirements LIFT-01 (line 93: schema field is `lifted`)
  </read_first>
  <action>
    File 1 — `src/features/lifts/hooks.ts` (REPLACE placeholder):

    ```typescript
    import { useLiveQuery } from 'dexie-react-hooks';
    import { getLiftForDay } from '@/services/lifts.svc';
    import { todayKey } from '@/lib/dayKey';

    export function useLiftForDay() {
      return useLiveQuery(() => getLiftForDay(todayKey()), []);
    }
    ```

    File 2 — `src/features/lifts/LiftToggle.tsx` (NEW). Per UI-SPEC §"Lift card" lines 298–308:

    ```tsx
    import { toggleLift } from '@/services/lifts.svc';
    import { todayKey } from '@/lib/dayKey';
    import { cn } from '@/lib/utils';

    interface Props {
      lifted: boolean;
    }

    export function LiftToggle({ lifted }: Props) {
      return (
        <button
          type="button"
          aria-label={lifted ? 'Undo lifted today' : 'Mark lifted today'}
          aria-pressed={lifted}
          onClick={() => { void toggleLift(todayKey()); }}
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

    The 32px font-size is specified directly (`text-[32px]`) per UI-SPEC; `p-1.5` on the button gives ~6px padding each side → ~44px hit area.

    File 3 — `src/features/lifts/LiftNoteInput.tsx` (NEW). Mirror of StepsInlineInput but for text:

    ```tsx
    import { useState, useRef, useEffect } from 'react';
    import { setLiftNote } from '@/services/lifts.svc';
    import { todayKey } from '@/lib/dayKey';

    interface Props {
      currentNote: string;
      onCommitted: () => void;
    }

    export function LiftNoteInput({ currentNote, onCommitted }: Props) {
      const [value, setValue] = useState(currentNote);
      const inputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        queueMicrotask(() => inputRef.current?.focus());
      }, []);

      const commit = async () => {
        await setLiftNote(todayKey(), value.trim());
        onCommitted();
      };

      return (
        <input
          ref={inputRef}
          type="text"
          placeholder="Optional note"
          aria-label="Lift note"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.currentTarget.blur(); }
            if (e.key === 'Escape') { setValue(currentNote); onCommitted(); }
          }}
          className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        />
      );
    }
    ```

    File 4 — `src/features/lifts/LiftSection.tsx` (NEW):

    ```tsx
    import { useState } from 'react';
    import { Card } from '@/components/ui/card';
    import { LiftToggle } from './LiftToggle';
    import { LiftNoteInput } from './LiftNoteInput';
    import { useLiftForDay } from './hooks';

    export function LiftSection() {
      const lift = useLiftForDay();
      const lifted = !!lift?.lifted;
      const note = lift?.note ?? '';
      const [editingNote, setEditingNote] = useState(false);

      return (
        <Card className="bg-surface border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">Lift</h2>
            <LiftToggle lifted={lifted} />
          </div>
          {lifted && (
            <div className="pt-2">
              {editingNote ? (
                <LiftNoteInput currentNote={note} onCommitted={() => setEditingNote(false)} />
              ) : note ? (
                <button type="button" onClick={() => setEditingNote(true)} className="text-sm text-text text-left w-full">
                  {note}
                </button>
              ) : (
                <button type="button" onClick={() => setEditingNote(true)} className="text-sm text-muted text-left w-full">
                  Add note
                </button>
              )}
            </div>
          )}
        </Card>
      );
    }
    ```

    Note: the "Add note" affordance per UI-SPEC §"Lift card" line 305 appears ONLY after the lift is toggled on — hence the `{lifted && (...)}` wrapper.
  </action>
  <acceptance_criteria>
    - `test -f src/features/lifts/hooks.ts` && `grep -q 'useLiftForDay' src/features/lifts/hooks.ts`
    - `test -f src/features/lifts/LiftToggle.tsx`
    - `grep -q 'toggleLift' src/features/lifts/LiftToggle.tsx`
    - `grep -q 'todayKey()' src/features/lifts/LiftToggle.tsx`
    - `grep -q '"Undo lifted today"' src/features/lifts/LiftToggle.tsx` (UI-SPEC dynamic aria-label — toggled)
    - `grep -q '"Mark lifted today"' src/features/lifts/LiftToggle.tsx` (UI-SPEC dynamic aria-label — untoggled)
    - `grep -q 'aria-pressed' src/features/lifts/LiftToggle.tsx` (UI-SPEC A11y)
    - `grep -q 'text-accent' src/features/lifts/LiftToggle.tsx` (✓ glyph accent color per UI-SPEC)
    - `grep -q 'text-muted' src/features/lifts/LiftToggle.tsx` (☐ glyph muted color)
    - `grep -qE "'✓'|\"✓\"" src/features/lifts/LiftToggle.tsx` (UI-SPEC ✓ glyph)
    - `grep -qE "'☐'|\"☐\"" src/features/lifts/LiftToggle.tsx` (UI-SPEC ☐ glyph)
    - `test -f src/features/lifts/LiftNoteInput.tsx`
    - `grep -q 'setLiftNote' src/features/lifts/LiftNoteInput.tsx`
    - `grep -q 'onBlur' src/features/lifts/LiftNoteInput.tsx`
    - `grep -q 'Escape' src/features/lifts/LiftNoteInput.tsx`
    - `grep -q '"Optional note"' src/features/lifts/LiftNoteInput.tsx` (UI-SPEC placeholder)
    - `grep -q 'queueMicrotask' src/features/lifts/LiftNoteInput.tsx`
    - `test -f src/features/lifts/LiftSection.tsx`
    - `grep -q 'export function LiftSection' src/features/lifts/LiftSection.tsx`
    - `grep -q '>Lift<' src/features/lifts/LiftSection.tsx` (UI-SPEC card title)
    - `grep -q 'LiftToggle' src/features/lifts/LiftSection.tsx`
    - `grep -q 'LiftNoteInput' src/features/lifts/LiftSection.tsx`
    - `grep -q '>Add note<' src/features/lifts/LiftSection.tsx` (UI-SPEC affordance copy)
    - `! grep -q 'ProgressBar' src/features/lifts/LiftSection.tsx` (UI-SPEC: Lift card has NO progress bar)
    - `! grep -q "toISOString().split" src/features/lifts/*.tsx src/features/lifts/hooks.ts` (Pitfall #4 guard)
    - `! grep -q 'db.transaction' src/features/lifts/*.tsx` (Pitfall #1 guard)
  </acceptance_criteria>
  <done>Lift slice fully inline per D-02; toggle swaps glyph + color instantly; note input appears only after toggle-on, blur-saves via setLiftNote.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Wire 4 feature sections into TodayScreen</name>
  <files>src/routes/TodayScreen.tsx</files>
  <read_first>
    - src/routes/TodayScreen.tsx (current file — lines 1–33; Phase 1 placeholder)
    - src/features/pt/PTSection.tsx (Plan 02-04 output)
    - src/features/food/FoodSection.tsx (Plan 02-03 output)
    - src/features/steps/StepsSection.tsx (Task 1 of this plan)
    - src/features/lifts/LiftSection.tsx (Task 2 of this plan)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/routes/TodayScreen.tsx (MODIFY — replace sections)" lines 810–838 (exact replacement code)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md D-05 (Today screen frame preserved; card layout identical to Phase 1)
  </read_first>
  <action>
    REPLACE the full contents of `src/routes/TodayScreen.tsx` with the version from 02-PATTERNS.md lines 822–838:

    ```tsx
    import { PTSection } from '@/features/pt/PTSection';
    import { FoodSection } from '@/features/food/FoodSection';
    import { StepsSection } from '@/features/steps/StepsSection';
    import { LiftSection } from '@/features/lifts/LiftSection';

    /**
     * Today screen — Phase 2 live-data layout.
     *
     * Phase 1's placeholder `sections` array is replaced by 4 feature components.
     * Each section keeps the Phase 1 card frame (Heading + status row) verbatim;
     * only the status slot goes dynamic per D-05. PT + Food open bottom Sheets on tap (D-01);
     * Steps + Lift stay inline in their cards (D-02).
     */
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

    No other changes. The outer `<div>` className (`px-4 py-6 space-y-4`) matches Phase 1 exactly.
  </action>
  <acceptance_criteria>
    - `grep -q 'PTSection' src/routes/TodayScreen.tsx`
    - `grep -q 'FoodSection' src/routes/TodayScreen.tsx`
    - `grep -q 'StepsSection' src/routes/TodayScreen.tsx`
    - `grep -q 'LiftSection' src/routes/TodayScreen.tsx`
    - `awk '/<PTSection/{pt=NR} /<FoodSection/{f=NR} /<StepsSection/{s=NR} /<LiftSection/{l=NR} END{exit !(pt && f && s && l && pt < f && f < s && s < l)}' src/routes/TodayScreen.tsx` exits 0 (render order PT → Food → Steps → Lift)
    - `! grep -q "const sections =" src/routes/TodayScreen.tsx` (Phase 1 placeholder array removed)
    - `! grep -q "'not logged yet'" src/routes/TodayScreen.tsx` (hardcoded status copy removed — now lives in each *Section)
    - `grep -q 'px-4 py-6 space-y-4' src/routes/TodayScreen.tsx` (Phase 1 wrapper frame preserved)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>TodayScreen is now a thin composition of 4 feature components; Phase 1 placeholder array is gone; all section-level status copy comes from the feature components themselves.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` + `npm run build` both exit 0.
- Manual (full Phase 2 smoke test on a fresh profile): open app → Today. See 4 cards: PT, Food, Steps, Lift. All in zero-state copy.
- Manual: tap PT → create template → start session → save. PT card updates via useLiveQuery to `Upper Body · N/M ex`.
- Manual: tap Food → create a food + log → Sheet closes. Food card status shows `200 / 2000 cal`; 4 macro progress bars under it fill partially.
- Manual: tap the Steps status area ("0 / 8000"). Inline number input appears where the status was. Type `6400`, press Enter. Input disappears; status now shows `6400 / 8000` and the progress bar under the card fills ~80%.
- Manual: tap the ☐ glyph on Lift card. Glyph swaps to ✓ in accent green. Below, an `Add note` affordance appears. Tap it → input appears. Type "light back session", blur the input. Input disappears; note "light back session" shown as a tap-to-edit row below the glyph.
- Manual: reload the page. All 4 cards render their populated states from IndexedDB (confirms useLiveQuery + persistence).
- Manual: go to Settings → change calories to `2200`, save goals. Return to Today. Food card `200 / 2200 cal`; progress bar reflects new target. (Confirms SET-02 cross-screen reactivity.)
- DevTools → IndexedDB: `stepEntries` has one record for today (dayKey === localTodayKey); `liftCheckins` has one record with `lifted: true` + the note.
- Grep: `! grep -rn "toISOString().split" src/features/` (Pitfall #4 guard across ALL Phase 2 features).
- Grep: `! grep -rn "db.transaction" src/features/ src/services/` (Pitfall #1 guard across entire Phase 2 surface).
- `grep -c "db.version(" src/db/db.ts` equals `1` (no schema migration across Phase 2).
</verification>

<success_criteria>
- [ ] STEPS-01 satisfied — tap-to-reveal inline input + blur/Enter commit via upsertSteps, one record per day
- [ ] STEPS-02 satisfied — ProgressBar below Steps card reflects count / goals.steps
- [ ] LIFT-01 satisfied — single-tap toggle on ☐/✓ glyph persists `{dayKey, lifted}`
- [ ] LIFT-02 satisfied — Add note affordance appears only when lifted; inline input blur-saves the note
- [ ] D-02 inline (no Sheet) for both Steps and Lift
- [ ] UI-SPEC copy strings all present verbatim (grep-verified)
- [ ] UI-SPEC ✓ glyph colored --accent, ☐ colored --muted
- [ ] Today screen renders exactly 4 components in order: PT, Food, Steps, Lift
- [ ] Phase 1 placeholder `sections` array is removed from TodayScreen
- [ ] Pitfall #1 + Pitfall #4 guards pass across `src/features/steps/`, `src/features/lifts/`, `src/routes/TodayScreen.tsx`
- [ ] `npx tsc --noEmit` + `npm run build` both pass
- [ ] All 5 Phase 2 Success Criteria from ROADMAP.md are manually verifiable end-to-end
</success_criteria>

<output>
After completion, create `.planning/phases/02-tracking-slices/02-05-SUMMARY.md` with:
- Confirmation all 4 Today sections render live data on load
- Manual-verification notes for the 5 roadmap success criteria
- Any last-minute integration issues with the P3/P4 components
- Cross-plan Pitfall audit summary
</output>
