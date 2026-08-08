---
phase: 02-tracking-slices
plan: 04
type: execute
wave: 3
depends_on: [1, 2]
files_modified:
  - src/features/pt/hooks.ts
  - src/features/pt/PTSection.tsx
  - src/features/pt/PTSheet.tsx
  - src/features/pt/PTTemplateList.tsx
  - src/features/pt/PTTemplateEditor.tsx
  - src/features/pt/PTSessionForm.tsx
  - src/features/pt/PTExerciseRow.tsx
  - src/features/pt/PainRating.tsx
autonomous: true
requirements: [PT-01, PT-02, PT-03, PT-04, PT-05, PT-06, PT-07]
requirements_addressed: [PT-01, PT-02, PT-03, PT-04, PT-05, PT-06, PT-07]
must_haves:
  truths:
    - "Tapping the PT card on Today opens a bottom Sheet titled 'PT' with no slide animation"
    - "Sheet default view: 'Start session' header + list of existing templates + bottom 'New template' button"
    - "If no templates exist: empty-state copy 'No PT templates yet. Create one to start logging sessions.' + New template button"
    - "Tapping New template opens a NESTED Sheet titled 'New template' with name + ordered exercise rows + Add exercise + Save template"
    - "Template editor renders, per exercise: name, optional description, target sets/reps, optional duration (PT-01 full field set)"
    - "Tapping a template's ⋯ overflow opens a menu with 'Edit template' + 'Delete template' (destructive)"
    - "Tapping the template card body (not the overflow) closes the nested editor and opens the Session form pre-populated with the template's exercises (PT-03)"
    - "Session form renders one row per template exercise: name, target display, actual sets/reps/duration inputs, completed checkbox, muted previous-session hint under each row (PT-04, PT-07)"
    - "Pain rating 0–5 radiogroup + freeform notes textarea at the bottom (PT-05, PT-06)"
    - "All session fields live in React Hook Form state only until Save (D-19); no Dexie draft rows"
    - "Save session persists the full PTSession object with whatever fields the user filled in; Sheet closes immediately (D-04)"
  artifacts:
    - path: "src/features/pt/hooks.ts"
      provides: "useTemplates, useLastSessionForTemplate, useTodayPTSessions"
    - path: "src/features/pt/PTSection.tsx"
      provides: "Today-card wrapper; opens PT Sheet on tap; NO progress bar (UI-SPEC)"
    - path: "src/features/pt/PTSheet.tsx"
      provides: "Root Sheet content: template list OR session form (mode switched by internal state)"
    - path: "src/features/pt/PTTemplateList.tsx"
      provides: "Template cards with overflow menu; tap card → onStartSession; tap overflow → Edit/Delete"
    - path: "src/features/pt/PTTemplateEditor.tsx"
      provides: "Nested Sheet with RHF+Zod + useFieldArray for exercises (name, description, targetSets, targetReps, targetDurationSec)"
    - path: "src/features/pt/PTSessionForm.tsx"
      provides: "RHF (no Zod — D-19) + useFieldArray for exercise rows; pain rating; notes; Save session"
    - path: "src/features/pt/PTExerciseRow.tsx"
      provides: "Per-exercise row render with name, target, previous-session hint, actuals inputs, completed checkbox"
    - path: "src/features/pt/PainRating.tsx"
      provides: "0–5 radiogroup pill row"
  key_links:
    - from: "src/features/pt/PTSheet.tsx"
      to: "src/services/pt.svc.ts"
      via: "createTemplate, updateTemplate, deleteTemplate, saveSession (via PTTemplateEditor + PTSessionForm callbacks)"
      pattern: "createTemplate|updateTemplate|deleteTemplate|saveSession"
    - from: "src/features/pt/PTExerciseRow.tsx"
      to: "src/services/pt.svc.ts:getLastSessionForTemplate + formatRelativeDays"
      via: "Previous-session hint (D-12)"
      pattern: "getLastSessionForTemplate|formatRelativeDays"
    - from: "src/features/pt/PTSessionForm.tsx"
      to: "src/services/pt.svc.ts:saveSession"
      via: "onSubmit handler constructs full PTSession from form state + dayKey"
      pattern: "saveSession\\("
---

<objective>
Ship the PT tracking slice end-to-end: the Today-card PT section, the bottom PT Sheet with template-list → session-form flow, a nested template editor Sheet, per-exercise session rows with previous-session hints, a pain-rating radiogroup, and freeform notes. Delivers PT-01..PT-07.

Purpose: This is a complete independent vertical slice — it shares only the db/services layer with the Food slice and therefore runs parallel to Plan 02-03 in Wave 3. The nested-Sheet pattern (D-10) and the RHF-without-Zod session form (D-19) are the two novel patterns introduced here.

Output: A fully working PT feature reachable from Today: user can create a template with exercises, start a session from it, log actuals + completed + pain + notes, see the previous session's actuals under each row, and save.
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
@src/services/pt.svc.ts
@src/lib/dayKey.ts
@src/lib/utils.ts
@src/components/ui/sheet.tsx
@src/components/ui/card.tsx
@src/components/ui/button.tsx

<interfaces>
From Plan 02-01 (`src/services/pt.svc.ts`):
```typescript
export function getTemplates(): Promise<PTTemplate[]>;
export function createTemplate(input: Omit<PTTemplate,'id'|'createdAt'>): Promise<PTTemplate>;
export function updateTemplate(template: PTTemplate): Promise<void>;
export function deleteTemplate(id: string): Promise<void>;
export function saveSession(session: PTSession): Promise<void>;
export function getTodaySessions(dayKey: string): Promise<PTSession[]>;
export function getLastSessionForTemplate(templateId: string, excludeSessionId?: string): Promise<PTSession | undefined>;
export function formatRelativeDays(loggedAt: number): string;
```

From src/db/schema.ts (NOTE: `description?: string` already exists on exercises per Plan 02-01):
```typescript
export interface PTTemplate { id: string; name: string; exercises: Array<{name:string; targetSets?:number; targetReps?:number; targetDurationSec?:number; description?:string}>; createdAt: number; }
export interface PTSession { id: string; dayKey: string; templateId: string; loggedAt: number; exercises: Array<{name:string; actualSets?:number; actualReps?:number; actualDurationSec?:number; completed:boolean}>; painRating?: number; notes?: string; }
```

This plan creates (hooks API Plan 02-05 consumes for the Today PT card):
```typescript
// src/features/pt/hooks.ts
export function useTemplates(): PTTemplate[] | undefined;
export function useLastSessionForTemplate(templateId: string): PTSession | undefined;
export function useTodayPTSessions(): PTSession[] | undefined;
```
</interfaces>
</context>

<threat_model>
Per RESEARCH.md §Security Domain: no new trust boundary in Phase 2. Plan-specific mitigations:
- **Integer overflow on target sets/reps/duration**: Zod `.int().min(0).max(999)` on template editor (999 is generous for any realistic rehab protocol and prevents pasted garbage). Session form is schema-less per D-19, but the same `.int()` / `.min(0)` is enforced at render time via HTML `min="0" step="1"` attributes — not a hard validation but a keyboard-level guard.
- **Freeform notes + description fields (XSS)**: React auto-escapes — rendered as `{session.notes}` / `{exercise.description}` text children. No `dangerouslySetInnerHTML`.
- **No network / auth / CSRF surface.**
</threat_model>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: PT hooks + PainRating + PTSection (Today card wrapper) + PTExerciseRow</name>
  <files>src/features/pt/hooks.ts, src/features/pt/PainRating.tsx, src/features/pt/PTExerciseRow.tsx, src/features/pt/PTSection.tsx</files>
  <read_first>
    - src/services/pt.svc.ts (getTemplates + getLastSessionForTemplate + formatRelativeDays signatures + query patterns)
    - src/features/pt/hooks.ts (placeholder from P1)
    - src/features/food/hooks.ts (analogous shape — feature-hooks pattern)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/pt/PainRating.tsx (component — controlled radio-group)" lines 143–145 + UI-SPEC §"Pain rating" lines 533–543
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"Today-card frame components" lines 636–691 (PTSection pattern — copy verbatim, this is THE analog)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"PT / Rehab-Specific Features" — RESEARCH Example A has the PTSection full code
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card populated-status copy patterns" PT rows (lines 192–193: `PT — Upper Body · 4/6 ex` when populated; `PT — not logged yet` when zero)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Today-card status slot (live layout)" PT row (line 566: Heading left + status string right ONLY; NO progress bar)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"PT exercise row (Session sheet)" lines 520–529
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"PT Sheet copy" lines 249–285 (copy strings)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md D-12 (previous-session hint content)
  </read_first>
  <action>
    File 1 — `src/features/pt/hooks.ts` (REPLACE placeholder).

    ```typescript
    import { useLiveQuery } from 'dexie-react-hooks';
    import { getTemplates, getLastSessionForTemplate, getTodaySessions } from '@/services/pt.svc';
    import { todayKey } from '@/lib/dayKey';

    export function useTemplates() {
      return useLiveQuery(() => getTemplates(), []);
    }

    export function useLastSessionForTemplate(templateId: string) {
      return useLiveQuery(() => getLastSessionForTemplate(templateId), [templateId]);
    }

    export function useTodayPTSessions() {
      return useLiveQuery(() => getTodaySessions(todayKey()), []);
    }
    ```

    File 2 — `src/features/pt/PainRating.tsx` (NEW). Per UI-SPEC §"Pain rating" lines 533–543:

    ```tsx
    import { cn } from '@/lib/utils';

    interface PainRatingProps {
      value: number | undefined;
      onChange: (n: number | undefined) => void;
    }

    export function PainRating({ value, onChange }: PainRatingProps) {
      return (
        <div className="space-y-2">
          <div className="text-xs text-muted">Pain</div>
          <div role="radiogroup" aria-label="Pain rating" className="flex gap-2">
            {[0, 1, 2, 3, 4, 5].map(n => {
              const selected = value === n;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={String(n)}
                  onClick={() => onChange(selected ? undefined : n)}
                  className={cn(
                    'h-10 w-10 rounded-full border bg-surface text-sm',
                    selected ? 'border-accent text-accent' : 'border-border text-text',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    ```

    Note tap-to-deselect: tapping the selected value clears it (sets undefined). This is explicit per UI-SPEC §"Pain rating" "Unselected behavior — if user leaves blank, painRating saves as null / omitted".

    File 3 — `src/features/pt/PTExerciseRow.tsx` (NEW). This is the per-exercise render inside PTSessionForm. It receives:
    - `template: { name; targetSets?; targetReps?; targetDurationSec?; description? }` — the template's exercise definition (read-only target display + optional description)
    - `index: number` — useFieldArray index so register() paths resolve correctly
    - `register` — from parent's RHF useForm
    - `previousHint?: string` — pre-formatted hint string passed in by parent (parent calls formatRelativeDays + composes)

    Render per UI-SPEC §"PT exercise row" layout:
    - Row 1 (header): `<div className="flex items-baseline justify-between"><span className="text-sm font-semibold text-text">{template.name}</span><span className="text-xs text-muted">Target: {targetSets}×{targetReps}</span></div>` (if duration targeted, format accordingly)
    - Row 2 (prev hint, D-12): `{previousHint && <div className="text-xs text-muted">{previousHint}</div>}`
    - Row 3 (actuals inputs): 3 inputs in a horizontal row (Sets / Reps / Sec). Each: `<div className="flex flex-col"><label className="text-xs text-muted" htmlFor={`ex-${index}-sets`}>Sets</label><input id={...} type="number" inputMode="numeric" min="0" className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums" {...register(`exercises.${index}.actualSets`, { valueAsNumber: true })} /></div>`. Hide the Sec input when `template.targetDurationSec` is falsy AND template has no reps either (UI-SPEC §"PT exercise row" Row 3 note).
    - Row 4 (completed checkbox + Done label): `<div className="flex items-center gap-2"><input type="checkbox" id={`ex-${index}-done`} className="accent-accent" {...register(`exercises.${index}.completed`)} /><label htmlFor={`ex-${index}-done`} className="text-sm text-text">Done</label></div>`
    - Bottom border: `<div className="border-b border-border pb-4" />` (UI-SPEC §"Row separator")

    Full structure: `<div className="space-y-2 pb-4 border-b border-border last:border-b-0">{row1}{row2}{row3}{row4}</div>`

    File 4 — `src/features/pt/PTSection.tsx` (NEW). Today card wrapper. Copy 02-PATTERNS.md lines 650–686 (PT analog — already the template for this pattern):

    ```tsx
    import { useState } from 'react';
    import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
    import { Card } from '@/components/ui/card';
    import { PTSheet } from './PTSheet';
    import { useTodayPTSessions, useTemplates } from './hooks';

    export function PTSection() {
      const [open, setOpen] = useState(false);
      const todaySessions = useTodayPTSessions();
      const templates = useTemplates();

      // UI-SPEC Today-card populated-status PT row:
      let statusText: string;
      if (!todaySessions || todaySessions.length === 0) {
        statusText = 'not logged yet';
      } else {
        // Most-recent session wins (UI-SPEC "Any session exists for today; most-recent session wins")
        const latest = [...todaySessions].sort((a, b) => b.loggedAt - a.loggedAt)[0];
        const templateName = templates?.find(t => t.id === latest.templateId)?.name ?? 'Session';
        const done = latest.exercises.filter(e => e.completed).length;
        const total = latest.exercises.length;
        statusText = `${templateName} · ${done}/${total} ex`;
      }

      return (
        <>
          <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
            <Card className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-text">PT</h2>
                <span className="text-sm text-muted">{statusText}</span>
              </div>
            </Card>
          </button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
            >
              <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
              <PTSheet onClose={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </>
      );
    }
    ```

    PTSheet doesn't exist yet (Task 2 creates it). Executor may stub `export function PTSheet() { return null; }` temporarily.
  </action>
  <acceptance_criteria>
    - `test -f src/features/pt/hooks.ts` && `grep -q 'export function useTemplates' src/features/pt/hooks.ts`
    - `grep -q 'export function useLastSessionForTemplate' src/features/pt/hooks.ts`
    - `grep -q 'export function useTodayPTSessions' src/features/pt/hooks.ts`
    - `grep -q 'useLiveQuery' src/features/pt/hooks.ts`
    - `test -f src/features/pt/PainRating.tsx` && `grep -q 'export function PainRating' src/features/pt/PainRating.tsx`
    - `grep -q 'role="radiogroup"' src/features/pt/PainRating.tsx`
    - `grep -q 'role="radio"' src/features/pt/PainRating.tsx`
    - `grep -q 'aria-checked' src/features/pt/PainRating.tsx`
    - `grep -q 'h-10 w-10' src/features/pt/PainRating.tsx` (40×40 per UI-SPEC §"Pain rating")
    - `grep -q 'rounded-full' src/features/pt/PainRating.tsx`
    - `grep -q 'border-accent text-accent' src/features/pt/PainRating.tsx` (selected state per UI-SPEC)
    - `grep -q '>Pain<' src/features/pt/PainRating.tsx` (UI-SPEC label)
    - `test -f src/features/pt/PTExerciseRow.tsx` && `grep -q 'export function PTExerciseRow' src/features/pt/PTExerciseRow.tsx`
    - `grep -q '>Sets<' src/features/pt/PTExerciseRow.tsx` (UI-SPEC label)
    - `grep -q '>Reps<' src/features/pt/PTExerciseRow.tsx`
    - `grep -q '>Sec<' src/features/pt/PTExerciseRow.tsx`
    - `grep -q '>Done<' src/features/pt/PTExerciseRow.tsx`
    - `grep -q 'type="checkbox"' src/features/pt/PTExerciseRow.tsx`
    - `grep -q 'accent-accent' src/features/pt/PTExerciseRow.tsx` (UI-SPEC native checkbox styling)
    - `grep -q 'actualSets' src/features/pt/PTExerciseRow.tsx` (matches schema field)
    - `grep -q 'actualReps' src/features/pt/PTExerciseRow.tsx`
    - `grep -q 'valueAsNumber: true' src/features/pt/PTExerciseRow.tsx` (RHF rule)
    - `test -f src/features/pt/PTSection.tsx` && `grep -q 'export function PTSection' src/features/pt/PTSection.tsx`
    - `grep -q 'data-\[state=open\]:animate-none' src/features/pt/PTSection.tsx` (anti-motion)
    - `grep -q 'data-\[state=closed\]:animate-none' src/features/pt/PTSection.tsx`
    - `grep -q '>PT<' src/features/pt/PTSection.tsx` (card title AND sheet title)
    - `grep -q 'not logged yet' src/features/pt/PTSection.tsx` (UI-SPEC zero-state copy)
    - `grep -q 'ex' src/features/pt/PTSection.tsx` (populated-state copy template: `Upper Body · 4/6 ex`)
    - `! grep -q 'ProgressBar' src/features/pt/PTSection.tsx` (UI-SPEC: NO progress bar on PT card)
    - `! grep -q "toISOString().split" src/features/pt/*.tsx src/features/pt/hooks.ts` (Pitfall #4 guard)
  </acceptance_criteria>
  <done>PT reactive hooks exist; PainRating radiogroup + PTExerciseRow match UI-SPEC contract; PTSection wrapper shows correct status copy and opens Sheet with anti-motion override.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: PTTemplateList + PTTemplateEditor (nested Sheet, RHF+Zod+useFieldArray) — includes optional description per exercise (PT-01)</name>
  <files>src/features/pt/PTTemplateList.tsx, src/features/pt/PTTemplateEditor.tsx</files>
  <behavior>
    - PTTemplateList shows one Card per template. Tapping the card body fires `onStartSession(template)` (consumed by PTSheet in Task 3 to switch into session mode)
    - Each card has a ⋯ overflow button (aria-label="More") in the top-right corner. Tapping it opens a small menu with "Edit template" + "Delete template" (destructive color)
    - Edit template → opens PTTemplateEditor as a NESTED Sheet (inside PT Sheet)
    - Delete template → immediately calls `deleteTemplate(id)`; list re-renders via useLiveQuery (no confirm per UI-SPEC §"Destructive confirmations: NONE")
    - Empty state: `No PT templates yet. Create one to start logging sessions.` + a `New template` primary button
    - Bottom of list (when not empty): `+ New template` button
    - PTTemplateEditor is a Radix nested Sheet
    - RHF + Zod with useFieldArray for exercises
    - **Schema (PT-01 full field set):** `{name: string.min(1), exercises: array(min(1)) of {name: string.min(1), description?: string.trim (optional), targetSets?: int.min(0).max(999), targetReps?: int.min(0).max(999), targetDurationSec?: int.min(0).max(99999)}}`
    - "Add exercise" button appends `{name: '', description: '', targetSets: 0, targetReps: 0}` to the array
    - Each exercise row has a trailing `X` (aria-label="Remove exercise") that removes that row
    - Description renders as a small muted text input below the name row (`placeholder="Description (optional)"`, `text-sm text-muted`); empty descriptions collapse visually via `placeholder` + neutral border (no added vertical padding when unused)
    - Save template → `createTemplate` (new) or `updateTemplate` (edit); Sheet closes
  </behavior>
  <read_first>
    - src/services/pt.svc.ts (createTemplate + updateTemplate + deleteTemplate)
    - src/db/schema.ts lines 114 (PTTemplate.exercises[].description already typed as optional string — schema support already exists from Plan 02-01)
    - .planning/REQUIREMENTS.md PT-01 (exact wording: "name, optional description, default target sets/reps or duration")
    - src/features/settings/GoalsForm.tsx (RHF+Zod analog — same four rules apply here: valueAsNumber, values not defaultValues, lazy errors, spread register)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"Cross-cutting: RHF + Zod form pattern" lines 916–941
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/pt/PTTemplateEditor.tsx" lines 140–141 (form nested Sheet — RESEARCH driven)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Nested Sheet stacking (D-10)" lines 411–419
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"PT Sheet copy" lines 251–272 (exact template-list + editor copy strings)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Form Validation Patterns" PT template editor schema (line 723)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md D-09 (exercises embedded in PTTemplate.exercises[]) + D-10 (nested Sheet)
    - react-hook-form useFieldArray docs: https://react-hook-form.com/docs/usefieldarray (read if unfamiliar)
  </read_first>
  <action>
    File 1 — `src/features/pt/PTTemplateList.tsx` (NEW).

    Props: `{ templates: PTTemplate[]; onStartSession: (t: PTTemplate) => void; onEditTemplate: (t: PTTemplate) => void; onNewTemplate: () => void }`.

    If `templates.length === 0`, render empty state:
    ```tsx
    <div className="px-4 py-6 space-y-4">
      <p className="text-sm text-muted">No PT templates yet. Create one to start logging sessions.</p>
      <Button variant="default" onClick={onNewTemplate} className="w-full">
        <Plus className="w-4 h-4 mr-2" aria-hidden />
        New template
      </Button>
    </div>
    ```

    Otherwise:
    ```tsx
    <div className="px-4 py-4 space-y-4">
      <div className="text-xs text-muted uppercase tracking-wide">Start session</div>
      <ul className="space-y-2">
        {templates.map(t => (
          <li key={t.id}>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => onStartSession(t)} className="flex-1 text-left">
                <Card className="p-4">
                  <div className="text-sm text-text">{t.name}</div>
                  <div className="text-xs text-muted">{t.exercises.length} exercises</div>
                </Card>
              </button>
              <TemplateOverflowMenu template={t} onEdit={() => onEditTemplate(t)} onDelete={async () => { await deleteTemplate(t.id); }} />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="default" onClick={onNewTemplate} className="w-full">
        <Plus className="w-4 h-4 mr-2" aria-hidden />
        New template
      </Button>
    </div>
    ```

    Inline subcomponent `TemplateOverflowMenu` uses local `<details>`/`<summary>` or a simple `useState`-toggled div — the UI-SPEC doesn't require Radix DropdownMenu, and we haven't added that shadcn component. Simplest working implementation:

    ```tsx
    function TemplateOverflowMenu({ template, onEdit, onDelete }: { template: PTTemplate; onEdit: () => void; onDelete: () => void }) {
      const [open, setOpen] = useState(false);
      return (
        <div className="relative">
          <button type="button" aria-label="More" onClick={() => setOpen(o => !o)} className="h-11 w-11 flex items-center justify-center text-muted">
            <MoreHorizontal className="w-5 h-5" aria-hidden />
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full z-20 bg-surface border border-border rounded-md shadow-lg overflow-hidden min-w-[160px]">
                <button type="button" onClick={() => { setOpen(false); onEdit(); }} className="block w-full text-left px-3 py-2 text-sm text-text hover:bg-border/40">
                  Edit template
                </button>
                <button type="button" onClick={() => { setOpen(false); onDelete(); }} className="block w-full text-left px-3 py-2 text-sm hover:bg-border/40" style={{ color: '#ef4444' }}>
                  Delete template
                </button>
              </div>
            </>
          )}
        </div>
      );
    }
    ```

    File 2 — `src/features/pt/PTTemplateEditor.tsx` (NEW). This is a NESTED Sheet that opens inside PT Sheet (D-10).

    Props: `{ open: boolean; mode: 'new' | 'edit'; template?: PTTemplate; onClose: () => void }`.

    The sheet title is `New template` when mode is 'new', `Edit template` when mode is 'edit' (UI-SPEC "Template editor sheet title: `{mode} template`").

    Schema (PT-01 explicitly requires name + OPTIONAL description + targets):
    ```typescript
    const exerciseSchema = z.object({
      name: z.string().trim().min(1, 'Required'),
      description: z.string().trim().optional(),        // PT-01: "optional description"
      targetSets: z.number({ message: 'Required' }).int('Whole number only').min(0, 'Must be 0 or higher').max(999, 'Too large').optional(),
      targetReps: z.number({ message: 'Required' }).int('Whole number only').min(0, 'Must be 0 or higher').max(999, 'Too large').optional(),
      targetDurationSec: z.number().int('Whole number only').min(0, 'Must be 0 or higher').max(99999, 'Too large').optional(),
    });
    const templateSchema = z.object({
      name: z.string().trim().min(1, 'Required'),
      exercises: z.array(exerciseSchema).min(1, 'At least one exercise'),
    });
    type TemplateInput = z.infer<typeof templateSchema>;
    ```

    On Save, if `description` is an empty string after trim, OMIT it from the exercise object (do not persist empty strings — Dexie stores `undefined` for absent optional fields). Pattern:

    ```typescript
    const cleanedExercises = data.exercises.map(e => ({
      name: e.name,
      ...(e.description && e.description.trim() ? { description: e.description.trim() } : {}),
      ...(e.targetSets !== undefined ? { targetSets: e.targetSets } : {}),
      ...(e.targetReps !== undefined ? { targetReps: e.targetReps } : {}),
      ...(e.targetDurationSec !== undefined ? { targetDurationSec: e.targetDurationSec } : {}),
    }));
    ```

    Body:
    ```tsx
    export function PTTemplateEditor({ open, mode, template, onClose }: PTTemplateEditorProps) {
      const { register, handleSubmit, control, formState: { errors } } = useForm<TemplateInput>({
        resolver: zodResolver(templateSchema),
        values: template
          ? { name: template.name, exercises: template.exercises.map(e => ({ ...e, description: e.description ?? '' })) }
          : { name: '', exercises: [{ name: '', description: '', targetSets: 0, targetReps: 0 }] },
      });
      const { fields, append, remove } = useFieldArray({ control, name: 'exercises' });

      const onSubmit = handleSubmit(async (data) => {
        const cleanedExercises = data.exercises.map(e => ({
          name: e.name,
          ...(e.description && e.description.trim() ? { description: e.description.trim() } : {}),
          ...(e.targetSets !== undefined ? { targetSets: e.targetSets } : {}),
          ...(e.targetReps !== undefined ? { targetReps: e.targetReps } : {}),
          ...(e.targetDurationSec !== undefined ? { targetDurationSec: e.targetDurationSec } : {}),
        }));
        if (mode === 'edit' && template) {
          await updateTemplate({ ...template, name: data.name, exercises: cleanedExercises });
        } else {
          await createTemplate({ name: data.name, exercises: cleanedExercises });
        }
        onClose();
      });

      return (
        <Sheet open={open} onOpenChange={o => !o && onClose()}>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
          >
            <SheetHeader><SheetTitle>{mode === 'new' ? 'New template' : 'Edit template'}</SheetTitle></SheetHeader>
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
              {/* Name */}
              <div className="space-y-1">
                <label htmlFor="tmpl-name" className="block text-xs text-muted">Name</label>
                <input id="tmpl-name" type="text" placeholder="e.g. Upper Body" className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text" {...register('name')} aria-invalid={!!errors.name} />
                {errors.name && <p className="text-xs" style={{color:'#ef4444'}}>{errors.name.message}</p>}
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                <div className="text-xs text-muted uppercase tracking-wide">Exercises</div>
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-1 pb-3 border-b border-border last:border-b-0">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <label htmlFor={`ex-${index}-name`} className="block text-xs text-muted">Name</label>
                        <input id={`ex-${index}-name`} type="text" className="h-11 w-full px-3 rounded-md bg-bg border border-border text-text" {...register(`exercises.${index}.name`)} />
                      </div>
                      <button type="button" aria-label="Remove exercise" onClick={() => remove(index)} className="h-11 w-11 flex items-center justify-center text-muted">
                        <X className="w-4 h-4" aria-hidden />
                      </button>
                    </div>
                    {/* PT-01 — optional description, compact inline row below name. */}
                    <div>
                      <input
                        id={`ex-${index}-description`}
                        type="text"
                        placeholder="Description (optional)"
                        aria-label="Description"
                        className="h-9 w-full px-3 text-sm text-muted rounded-md bg-bg border border-border"
                        {...register(`exercises.${index}.description`)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="space-y-1">
                        <label className="block text-xs text-muted">Sets</label>
                        <input type="number" inputMode="numeric" min="0" className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums" {...register(`exercises.${index}.targetSets`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs text-muted">Reps</label>
                        <input type="number" inputMode="numeric" min="0" className="h-11 w-16 px-2 rounded-md bg-bg border border-border text-text tabular-nums" {...register(`exercises.${index}.targetReps`, { valueAsNumber: true })} />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs text-muted">Duration (sec)</label>
                        <input type="number" inputMode="numeric" min="0" className="h-11 w-20 px-2 rounded-md bg-bg border border-border text-text tabular-nums" {...register(`exercises.${index}.targetDurationSec`, { valueAsNumber: true })} />
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ name: '', description: '', targetSets: 0, targetReps: 0 })} className="w-full">
                  <Plus className="w-4 h-4 mr-2" aria-hidden />
                  Add exercise
                </Button>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" variant="default">Save template</Button>
              </div>
            </form>
          </SheetContent>
        </Sheet>
      );
    }
    ```

    NESTED Sheet note: per UI-SPEC §"Nested Sheet stacking" the child Sheet is a separate Radix Dialog root with its own overlay — which the default shadcn Sheet from Radix Dialog already provides. No special stacking code required beyond rendering this component inside the parent PT Sheet. The Radix Dialog API handles focus, scrim, and close behavior stacking natively.
  </action>
  <acceptance_criteria>
    - `test -f src/features/pt/PTTemplateList.tsx`
    - `grep -q 'No PT templates yet. Create one to start logging sessions.' src/features/pt/PTTemplateList.tsx` (UI-SPEC empty state copy)
    - `grep -q '>New template<' src/features/pt/PTTemplateList.tsx` (UI-SPEC primary CTA)
    - `grep -q '>Start session<' src/features/pt/PTTemplateList.tsx` (UI-SPEC list header)
    - `grep -q 'aria-label="More"' src/features/pt/PTTemplateList.tsx` (UI-SPEC overflow menu)
    - `grep -q '>Edit template<' src/features/pt/PTTemplateList.tsx`
    - `grep -q '>Delete template<' src/features/pt/PTTemplateList.tsx`
    - `grep -q '#ef4444' src/features/pt/PTTemplateList.tsx` (destructive color on Delete)
    - `grep -q 'MoreHorizontal' src/features/pt/PTTemplateList.tsx` (Lucide icon per UI-SPEC)
    - `grep -q 'Plus' src/features/pt/PTTemplateList.tsx`
    - `grep -q 'deleteTemplate' src/features/pt/PTTemplateList.tsx`
    - `test -f src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'useFieldArray' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'zodResolver' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'templateSchema' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'description' src/features/pt/PTTemplateEditor.tsx` (W-02 fix: PT-01 "optional description" field present)
    - `grep -q "description: z.string()" src/features/pt/PTTemplateEditor.tsx` (schema includes description as Zod optional string)
    - `grep -q "Description (optional)" src/features/pt/PTTemplateEditor.tsx` (placeholder copy for the description input)
    - `grep -qE '\.int\(' src/features/pt/PTTemplateEditor.tsx` (UI-SPEC schema convention)
    - `grep -c 'valueAsNumber: true' src/features/pt/PTTemplateEditor.tsx` is >= 3 (targetSets + targetReps + targetDurationSec)
    - `grep -q 'values:' src/features/pt/PTTemplateEditor.tsx` (NOT defaultValues)
    - `! grep -q 'defaultValues:' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q '>Save template<' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q '>Cancel<' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q '>Add exercise<' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'aria-label="Remove exercise"' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'e.g. Upper Body' src/features/pt/PTTemplateEditor.tsx` (UI-SPEC placeholder)
    - `grep -q 'createTemplate' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'updateTemplate' src/features/pt/PTTemplateEditor.tsx`
    - `grep -q 'data-\[state=open\]:animate-none' src/features/pt/PTTemplateEditor.tsx` (nested Sheet anti-motion)
    - `! grep -q 'db.transaction' src/features/pt/*.tsx` (Pitfall #1 guard)
    - `! grep -q "toISOString().split" src/features/pt/*.tsx` (Pitfall #4 guard)
  </acceptance_criteria>
  <done>PTTemplateList renders empty + populated states with correct copy; overflow menu shows Edit/Delete with silent delete; PTTemplateEditor uses nested Sheet + RHF+Zod+useFieldArray for create and edit flows with full PT-01 field set (name + optional description + targets); both Sheet consumers apply anti-motion override.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: PTSessionForm (RHF, no Zod per D-19) + PTSheet composition</name>
  <files>src/features/pt/PTSessionForm.tsx, src/features/pt/PTSheet.tsx</files>
  <behavior>
    - PTSessionForm receives a PTTemplate, pre-populates one row per template exercise with actuals blank and `completed: false` (PT-03)
    - All fields live in RHF state only — no Dexie draft writes (D-19)
    - Each exercise row uses PTExerciseRow; previous-session hint is fetched per-row via useLastSessionForTemplate + formatRelativeDays (D-12 copy)
    - At bottom: PainRating (0–5, optional) + Notes textarea (freeform, optional) + Save session button
    - On Save: construct a PTSession with id=uuid, dayKey=todayKey(), templateId, loggedAt=Date.now(), exercises=form state, painRating, notes. Call saveSession. onClose.
    - PTSheet is the root; it internally manages mode: 'list' | 'session' | (editor handled by PTTemplateEditor nested Sheet)
    - Default mode: list. Tapping a template card → mode becomes 'session' with that template selected
    - PTTemplateEditor sits alongside as a nested Sheet controlled by PTSheet's local state (open flag + mode 'new' | 'edit' + optional template prop)
  </behavior>
  <read_first>
    - src/services/pt.svc.ts (saveSession signature; getLastSessionForTemplate + formatRelativeDays for D-12 hint)
    - src/db/schema.ts (PTSession shape — exact field names to satisfy)
    - src/lib/dayKey.ts (todayKey)
    - src/features/pt/PTExerciseRow.tsx (from Task 1 — consumed here)
    - src/features/pt/PainRating.tsx (from Task 1 — consumed here)
    - src/features/pt/PTTemplateList.tsx + PTTemplateEditor.tsx (from Task 2)
    - src/features/pt/hooks.ts (useTemplates, useLastSessionForTemplate)
    - .planning/phases/02-tracking-slices/02-PATTERNS.md §"src/features/pt/PTSessionForm.tsx (form — RHF useFieldArray, no Zod)" lines 787–801 (key deviation: no Zod, values not defaultValues)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Session sheet" copy table lines 273–285 (all session-form strings)
    - .planning/phases/02-tracking-slices/02-UI-SPEC.md §"Session — Previous-session hint" lines 278–280 (exact D-12 format strings)
    - .planning/phases/02-tracking-slices/02-CONTEXT.md D-11 (completed independent of actuals; partial sessions valid) + D-19 (form-local until Save, no Dexie drafts)
  </read_first>
  <action>
    File 1 — `src/features/pt/PTSessionForm.tsx` (NEW).

    Props: `{ template: PTTemplate; onClose: () => void }`.

    Form values type:
    ```typescript
    type SessionFormValues = {
      exercises: Array<{
        name: string;
        actualSets?: number;
        actualReps?: number;
        actualDurationSec?: number;
        completed: boolean;
      }>;
      painRating?: number;
      notes?: string;
    };
    ```

    Body:
    ```tsx
    export function PTSessionForm({ template, onClose }: { template: PTTemplate; onClose: () => void }) {
      // Previous session for the whole template (covers D-12 hint per row — look up exercise by name inside prev.exercises)
      const prevSession = useLastSessionForTemplate(template.id);

      const { register, handleSubmit, control, watch, setValue } = useForm<SessionFormValues>({
        // D-19: form-local until Save. values ensures form re-syncs if template changes.
        values: {
          exercises: template.exercises.map(e => ({
            name: e.name,
            actualSets: undefined,
            actualReps: undefined,
            actualDurationSec: undefined,
            completed: false,
          })),
          painRating: undefined,
          notes: '',
        },
      });

      const painValue = watch('painRating');

      const onSubmit = handleSubmit(async (data) => {
        const session: PTSession = {
          id: crypto.randomUUID(),
          dayKey: todayKey(),
          templateId: template.id,
          loggedAt: Date.now(),
          exercises: data.exercises.map(e => ({
            name: e.name,
            actualSets: e.actualSets,
            actualReps: e.actualReps,
            actualDurationSec: e.actualDurationSec,
            completed: !!e.completed,
          })),
          painRating: data.painRating,
          notes: data.notes?.trim() || undefined,
        };
        await saveSession(session);
        onClose();  // D-04: Sheet closes immediately
      });

      return (
        <form onSubmit={onSubmit} className="space-y-4 px-4 pt-4">
          <div className="space-y-4">
            {template.exercises.map((ex, index) => {
              const prev = prevSession?.exercises.find(p => p.name === ex.name);
              const hint = prev
                ? (prev.actualSets !== undefined || prev.actualReps !== undefined
                    ? `Last: ${prev.actualSets ?? '–'}×${prev.actualReps ?? '–'}${prevSession?.painRating !== undefined ? ` · pain ${prevSession.painRating}/5` : ''} · ${formatRelativeDays(prevSession.loggedAt)}`
                    : `Last: (not completed) · ${formatRelativeDays(prevSession?.loggedAt ?? Date.now())}`)
                : undefined;
              return (
                <PTExerciseRow key={index} index={index} template={ex} register={register} previousHint={hint} />
              );
            })}
          </div>

          <PainRating value={painValue} onChange={n => setValue('painRating', n)} />

          <div className="space-y-1">
            <label htmlFor="session-notes" className="block text-xs text-muted">Notes</label>
            <textarea id="session-notes" placeholder="How did it feel?" className="w-full min-h-[80px] px-3 py-2 rounded-md bg-bg border border-border text-text" {...register('notes')} />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="default">Save session</Button>
          </div>
        </form>
      );
    }
    ```

    File 2 — `src/features/pt/PTSheet.tsx` (NEW OR OVERWRITE Task 1 stub).

    Props: `{ onClose: () => void }`.

    Internal state: `const [mode, setMode] = useState<'list' | 'session'>('list'); const [selectedTemplate, setSelectedTemplate] = useState<PTTemplate | undefined>(undefined); const [editorOpen, setEditorOpen] = useState(false); const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new'); const [editingTemplate, setEditingTemplate] = useState<PTTemplate | undefined>(undefined);`

    Body:
    ```tsx
    export function PTSheet({ onClose }: { onClose: () => void }) {
      const templates = useTemplates();
      const [mode, setMode] = useState<'list' | 'session'>('list');
      const [selectedTemplate, setSelectedTemplate] = useState<PTTemplate | undefined>(undefined);
      const [editorOpen, setEditorOpen] = useState(false);
      const [editorMode, setEditorMode] = useState<'new' | 'edit'>('new');
      const [editingTemplate, setEditingTemplate] = useState<PTTemplate | undefined>(undefined);

      if (templates === undefined) {
        // Brief loading tick — render nothing per UI-SPEC Loading States.
        return <div />;
      }

      return (
        <>
          {mode === 'list' && (
            <PTTemplateList
              templates={templates}
              onStartSession={(t) => { setSelectedTemplate(t); setMode('session'); }}
              onEditTemplate={(t) => { setEditingTemplate(t); setEditorMode('edit'); setEditorOpen(true); }}
              onNewTemplate={() => { setEditingTemplate(undefined); setEditorMode('new'); setEditorOpen(true); }}
            />
          )}
          {mode === 'session' && selectedTemplate && (
            <PTSessionForm template={selectedTemplate} onClose={onClose} />
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

    The PTTemplateEditor renders as a sibling — Radix Dialog manages stacking natively.
  </action>
  <acceptance_criteria>
    - `test -f src/features/pt/PTSessionForm.tsx`
    - `grep -q 'useForm' src/features/pt/PTSessionForm.tsx`
    - `! grep -q 'zodResolver' src/features/pt/PTSessionForm.tsx` (D-19: no Zod on session form)
    - `grep -q 'values:' src/features/pt/PTSessionForm.tsx`
    - `! grep -q 'defaultValues:' src/features/pt/PTSessionForm.tsx`
    - `grep -q 'saveSession(' src/features/pt/PTSessionForm.tsx`
    - `grep -q 'todayKey()' src/features/pt/PTSessionForm.tsx`
    - `grep -q 'crypto.randomUUID()' src/features/pt/PTSessionForm.tsx` (session id generation per PATTERNS convention)
    - `grep -q 'Date.now()' src/features/pt/PTSessionForm.tsx` (loggedAt)
    - `grep -q 'formatRelativeDays' src/features/pt/PTSessionForm.tsx` (D-12 hint formatting)
    - `grep -q 'useLastSessionForTemplate' src/features/pt/PTSessionForm.tsx` (D-12 hint source)
    - `grep -qE 'Last: [^)]*pain' src/features/pt/PTSessionForm.tsx` (D-12 hint format: `Last: Nx〇 · pain N/5 · …`)
    - `grep -q 'PainRating' src/features/pt/PTSessionForm.tsx`
    - `grep -q 'PTExerciseRow' src/features/pt/PTSessionForm.tsx`
    - `grep -q '>Notes<' src/features/pt/PTSessionForm.tsx` (UI-SPEC label)
    - `grep -q '"How did it feel?"' src/features/pt/PTSessionForm.tsx` (UI-SPEC placeholder)
    - `grep -q '>Save session<' src/features/pt/PTSessionForm.tsx` (UI-SPEC CTA)
    - `grep -q '>Cancel<' src/features/pt/PTSessionForm.tsx`
    - `test -f src/features/pt/PTSheet.tsx`
    - `grep -q 'export function PTSheet' src/features/pt/PTSheet.tsx`
    - `grep -q 'PTTemplateList' src/features/pt/PTSheet.tsx`
    - `grep -q 'PTSessionForm' src/features/pt/PTSheet.tsx`
    - `grep -q 'PTTemplateEditor' src/features/pt/PTSheet.tsx`
    - `grep -q 'useTemplates' src/features/pt/PTSheet.tsx`
    - `! grep -q 'db.transaction' src/features/pt/*.tsx` (Pitfall #1 guard)
    - `! grep -q "toISOString().split" src/features/pt/*.tsx` (Pitfall #4 guard)
    - `! grep -qE 'accent-(25|50|75|100)' src/features/pt/*.tsx` (Phase 3 alpha reserve)
    - `npx tsc --noEmit` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>PTSessionForm is schema-less per D-19, form-local until Save; previous-session hint formatting matches UI-SPEC D-12 exactly; PTSheet composes list ⇄ session modes and hosts PTTemplateEditor as a nested Sheet; all acceptance grep-guards pass.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` exits 0; `npm run build` exits 0.
- Manual: from Today, tap PT card. Sheet titled `PT` appears instantly (no slide).
- Manual: on fresh profile, see empty state copy + New template button.
- Manual: tap New template → nested Sheet opens titled `New template`. Fill name "Upper Body", exercise 1 "Pull-up" (3/8) with description "Dead hang, chin over bar", add exercise "Row" (3/12), Save template. Nested Sheet closes; template list shows 1 card with "2 exercises".
- Manual: tap the template card. Mode switches to session form. See 2 exercise rows (Pull-up, Row) each with empty actuals + unchecked Done. Previous-session hint row is hidden (no prior session yet).
- Manual: Fill Pull-up to 3/8, check Done. Leave Row blank and unchecked. Tap a pain pill `2`. Type "left shoulder still tender" in Notes. Tap Save session. Sheet closes.
- Manual: Today PT card now shows `PT — Upper Body · 1/2 ex`.
- Manual: re-open PT Sheet → tap Upper Body template again. Session form now shows previous-session hint under Pull-up: `Last: 3×8 · pain 2/5 · today`. Under Row: `Last: (not completed) · today`.
- Manual: tap ⋯ on the template card → Edit template. Nested Sheet opens with fields pre-filled (including description for Pull-up). Edit "Row" to 3/15. Save template. Row target display updates. Verify Pull-up description persists.
- Manual: tap ⋯ → Delete template. Card disappears instantly (no confirm modal).
- DevTools → IndexedDB → `ptTemplates` and `ptSessions` have the expected records with correct shapes (description field present on exercises that received one; absent otherwise).
- Grep: `! grep -rn "toISOString().split" src/features/pt/` && `! grep -rn "db.transaction" src/features/pt/`.
</verification>

<success_criteria>
- [ ] PT-01 satisfied — template editor supports add/edit/remove of exercise rows inline with name, OPTIONAL description, and target sets/reps/duration (D-09 embedded-in-template model; full PT-01 field set)
- [ ] PT-02 satisfied — templates can be created, edited, and deleted
- [ ] PT-03 satisfied — tapping a template card starts a session pre-populated with that template's exercises
- [ ] PT-04 satisfied — session rows allow actual sets/reps/duration + Done checkbox independently (D-11)
- [ ] PT-05 satisfied — session notes textarea at bottom
- [ ] PT-06 satisfied — 0–5 pain rating radiogroup
- [ ] PT-07 satisfied — previous-session hint visible under each exercise row with D-12 format
- [ ] D-09 embedded exercises (no schema migration — `grep -c 'db.version(' src/db/db.ts` still equals 1)
- [ ] D-10 nested Sheet for template editor; parent PT Sheet stays open
- [ ] D-12 hint copy: `Last: {sets}×{reps} · pain {rating}/5 · {relativeTime}` OR `Last: (not completed) · {relativeTime}`
- [ ] D-19 PTSessionForm has NO Zod resolver; fields live in RHF state until Save
- [ ] UI-SPEC copy strings all present verbatim (grep-verified)
- [ ] Pitfall #1 (no db.transaction in feature layer) + Pitfall #4 (no toISOString.split) guards pass
- [ ] `npx tsc --noEmit` + `npm run build` both pass
- [ ] Phase 3 alpha-ramp reserve untouched
</success_criteria>

<output>
After completion, create `.planning/phases/02-tracking-slices/02-04-SUMMARY.md` with:
- Whether the overflow-menu implementation chose `<details>` or a custom useState-toggle div
- Any deviations from UI-SPEC copy
- Confirmation the nested Sheet opens AND closes properly while parent PT Sheet stays open
- Whether the previous-session-hint format exactly matches UI-SPEC in all 3 cases (completed / not-completed / no-prior)
- Confirmation that the optional description field persists through create + edit cycles and is absent (undefined) when empty
</output>
