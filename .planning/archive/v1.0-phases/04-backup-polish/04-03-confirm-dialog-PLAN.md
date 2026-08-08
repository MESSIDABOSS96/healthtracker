---
phase: 04-backup-polish
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/confirm-dialog.tsx
  - src/features/calendar/DayDetail.tsx
autonomous: true
requirements: []
tags: [confirm, dialog, ui-primitive, polish, lift]

must_haves:
  truths:
    - "A mis-tap on the Lift row's Delete button no longer silently destroys the lift check-in and its note — the user sees a confirm dialog and can back out"
    - "User tapping the Lift 'Delete' button in DayDetail sees a ConfirmDialog BEFORE deleteLift is called — no silent data loss"
    - "Cancel button dismisses the dialog WITHOUT calling deleteLift"
    - "Remove button calls deleteLift(dayKey) and dismisses the dialog"
    - "Dialog is accessible — focus trap, ESC-to-close, click-outside-to-close, focus returns to trigger (all from Radix defaults)"
    - "ConfirmDialog is a generic primitive — controlled open/onOpenChange, destructive flag, title/body/confirmLabel/cancelLabel props — reusable by future destructive flows"
    - "Only the Lift row gets the confirm (per D-06) — PT and Steps delete buttons retain their Phase 3 no-confirm UX per D-08 hard scope ceiling"
  artifacts:
    - path: "src/components/ui/confirm-dialog.tsx"
      provides: "ConfirmDialog primitive on @radix-ui/react-dialog (via radix-ui metapackage, second consumer after Sheet)"
      exports: ["ConfirmDialog", "ConfirmDialogProps"]
      min_lines: 60
    - path: "src/features/calendar/DayDetail.tsx"
      provides: "Lift row delete now gated by ConfirmDialog; other rows unchanged"
      contains: "ConfirmDialog"
  key_links:
    - from: "src/features/calendar/DayDetail.tsx"
      to: "src/components/ui/confirm-dialog.tsx:ConfirmDialog"
      via: "Imperative render: <ConfirmDialog open={confirmDeleteLift} onOpenChange={setConfirmDeleteLift} ... />"
      pattern: "<ConfirmDialog"
    - from: "src/components/ui/confirm-dialog.tsx"
      to: "radix-ui"
      via: "import { Dialog as DialogPrimitive } from 'radix-ui' (metapackage — NOT scoped @radix-ui/react-dialog)"
      pattern: "Dialog as DialogPrimitive"
---

<objective>
Close Phase 3 review item WR-03 (no confirm on destructive Lift delete) by adding a generic `ConfirmDialog` primitive and gating the DayDetail Lift row's delete button through it. Per D-06, the dialog is intentionally scoped to the Lift row — PT and Steps delete buttons keep their Phase 3 no-confirm UX (D-08 hard scope ceiling).

Purpose: The Lift row's delete button erases both the `lifted` boolean AND the note (if any). Phase 3 accepted the no-confirm UX pending review; the review flagged data-loss risk. A single-use-site ConfirmDialog now adds the gate without introducing a Toast/Banner or touching unrelated destructive flows.
Output: One new UI primitive + one surgical edit to DayDetail.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-backup-polish/04-CONTEXT.md
@.planning/phases/04-backup-polish/04-RESEARCH.md
@.planning/phases/04-backup-polish/04-PATTERNS.md
@.planning/phases/03-streak-loop/03-REVIEW.md

<!-- Source files this plan READS or extends -->
@src/components/ui/sheet.tsx
@src/components/ui/button.tsx
@src/features/calendar/DayDetail.tsx
@src/services/lifts.svc.ts
@src/lib/utils.ts

<interfaces>
<!-- Contracts the executor needs -->

From src/components/ui/sheet.tsx (analog for radix-ui metapackage import pattern):
```typescript
import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
// Consumer pattern: controlled <Sheet open onOpenChange>...<SheetContent />...</Sheet>
```

From src/components/ui/button.tsx:
```typescript
export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
// Variants: default | outline | ghost
```

From src/services/lifts.svc.ts (the mutation the dialog gates):
```typescript
export async function deleteLift(dayKey: string): Promise<void>;
```

From src/features/calendar/DayDetail.tsx (CURRENT shape — you modify):
```typescript
// Existing useState hooks at lines 51-55:
const [editingSteps, setEditingSteps] = useState(false);
const [editingLiftNote, setEditingLiftNote] = useState(false);
const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);
// Lift delete button currently at lines 214-222 — onClick calls deleteLift(dayKey) directly.
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/components/ui/confirm-dialog.tsx</name>
  <files>
    - src/components/ui/confirm-dialog.tsx (NEW)
  </files>
  <read_first>
    - src/components/ui/sheet.tsx (PRIMARY ANALOG — radix-ui metapackage import pattern on line 3, Portal+Overlay+Content structure on lines 23-83, Title+Description a11y on lines 106-130)
    - src/components/ui/button.tsx (Button variants — `default` vs `outline`)
    - src/lib/utils.ts (cn helper — confirm signature)
    - src/index.css (PRE-FLIGHT TOKEN CHECK — grep for `--bg-surface`, `--border-border`, and related CSS custom properties to confirm the Tailwind tokens `bg-surface` and `border-border` resolve to real values before the component body relies on them; if either token is missing, raise early and do NOT author a 180-line component body that will look broken)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 5 (VERBATIM source for ConfirmDialog body)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/components/ui/confirm-dialog.tsx" for analog mapping
    - src/features/calendar/DayDetail.tsx line 119 (destructive inline-hex precedent: `style={{ color: '#ef4444' }}`)
    - src/features/settings/GoalsForm.tsx line 106 (same hex for error text — confirms #ef4444 is the project convention NOT a tailwind token)
  </read_first>
  <behavior>
    - Controlled: consumer passes `open` (boolean) + `onOpenChange` (handler); primitive does NOT manage its own open state
    - Tapping the Cancel button calls `onOpenChange(false)` — dialog closes, onConfirm is NOT called
    - Tapping the Confirm button calls `onConfirm()` THEN `onOpenChange(false)` — mutation fires, then dialog closes
    - ESC key closes the dialog (Radix default)
    - Click outside the dialog closes it (Radix default)
    - Focus is trapped inside the dialog while open (Radix default)
    - Focus returns to the trigger element on close (Radix default)
    - When `destructive={true}`, the Confirm button gets inline `#ef4444` background + `#fafafa` foreground; when false, default Button styling
    - `confirmLabel` defaults to 'Confirm', `cancelLabel` defaults to 'Cancel' — consumers can override
    - Title renders inside `DialogPrimitive.Title` (a11y-linked via aria-labelledby)
    - Body renders inside `DialogPrimitive.Description` (a11y-linked via aria-describedby)
    - Component uses project token classes `text-text`, `text-muted`, `border-border`, `bg-surface` (NOT shadcn's `text-foreground` / `text-muted-foreground` — those do not exist in this project's Tailwind token set)
  </behavior>
  <action>
Create NEW file `src/components/ui/confirm-dialog.tsx` with EXACTLY this content. The inline `#ef4444` / `#fafafa` hex is intentional per PATTERNS.md — matches 4+ existing call sites (DayDetail:119/194/218, MealEntryRow:123, GoalsForm errors). A future `--destructive` token migration is tracked as Phase 2 IN-05 and is OUT OF Phase 4 scope per D-08.

```tsx
// src/components/ui/confirm-dialog.tsx
// Generic destructive-confirm primitive. Second consumer of @radix-ui/react-dialog
// (via the bundled `radix-ui` metapackage — same primitive Sheet uses).
//
// Phase 4 D-06: Wired into DayDetail Lift row delete, closing Phase 3 WR-03.
// The primitive is intentionally generic — future destructive flows post-v1
// (meal-entry bulk delete, food-library delete, etc.) can reuse it without
// edits here.
//
// API surface (per RESEARCH Open Q #2 recommendation): controlled
// open/onOpenChange matching Sheet. Parent state owns open; no imperative
// confirm() Promise wrapper.
//
// Accessibility: Radix Dialog handles focus trap, ESC-to-close, click-outside,
// focus-return, aria-modal, aria-labelledby (via Title), aria-describedby (via
// Description). No manual ARIA needed. [CITED: radix-ui.com/primitives/docs/components/dialog]
//
// Radix AlertDialog vs Dialog: AlertDialog is the semantic match for destructive
// confirms (role="alertdialog", disables click-outside-close). We use Dialog for
// Phase 4 parity with Sheet (single-use-site, zero new imports). Migrate to
// AlertDialog post-v1 if 2+ destructive-confirm sites appear (RESEARCH Open Q #2).
//
// Destructive styling: inline #ef4444 / #fafafa hex — matches 4+ existing call
// sites (DayDetail.tsx delete buttons, MealEntryRow.tsx, GoalsForm.tsx errors).
// A future `--destructive` token migration is tracked in Phase 2 IN-05; out of
// Phase 4 scope per CONTEXT.md D-08 hard scope ceiling.

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-surface p-4 shadow-lg',
            'focus:outline-none',
          )}
        >
          <DialogPrimitive.Title className="text-base font-semibold text-text">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted">
            {body}
          </DialogPrimitive.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              style={destructive ? { backgroundColor: '#ef4444', color: '#fafafa' } : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```
  </action>
  <verify>
    <automated>
      test -f src/components/ui/confirm-dialog.tsx \
      && grep -q "export function ConfirmDialog" src/components/ui/confirm-dialog.tsx \
      && grep -q "export interface ConfirmDialogProps" src/components/ui/confirm-dialog.tsx \
      && grep -q "import { Dialog as DialogPrimitive } from 'radix-ui'" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Root" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Portal" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Overlay" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Content" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Title" src/components/ui/confirm-dialog.tsx \
      && grep -q "DialogPrimitive.Description" src/components/ui/confirm-dialog.tsx \
      && grep -q "onOpenChange" src/components/ui/confirm-dialog.tsx \
      && grep -q "onConfirm" src/components/ui/confirm-dialog.tsx \
      && grep -q "#ef4444" src/components/ui/confirm-dialog.tsx \
      && grep -q "#fafafa" src/components/ui/confirm-dialog.tsx \
      && grep -q "destructive" src/components/ui/confirm-dialog.tsx \
      && ! grep -q "text-foreground" src/components/ui/confirm-dialog.tsx \
      && ! grep -q "text-muted-foreground" src/components/ui/confirm-dialog.tsx \
      && ! grep -q "@radix-ui/react-dialog" src/components/ui/confirm-dialog.tsx \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/components/ui/confirm-dialog.tsx` exists
    - File exports `ConfirmDialog` as a named function
    - File exports `ConfirmDialogProps` as a named interface
    - File imports from the `radix-ui` metapackage (matches Sheet pattern), NOT the scoped `@radix-ui/react-dialog` package — regex check confirms absence of scoped import
    - File uses `DialogPrimitive.Root`, `DialogPrimitive.Portal`, `DialogPrimitive.Overlay`, `DialogPrimitive.Content`, `DialogPrimitive.Title`, `DialogPrimitive.Description` (full set)
    - Props interface includes: `open`, `onOpenChange`, `title`, `body`, `confirmLabel?`, `cancelLabel?`, `destructive?`, `onConfirm` (exactly these fields)
    - Defaults in destructuring: `confirmLabel = 'Confirm'`, `cancelLabel = 'Cancel'`, `destructive = false`
    - Destructive styling uses inline `style={{ backgroundColor: '#ef4444', color: '#fafafa' }}` (matches 4+ call-site convention)
    - Cancel Button has `variant="outline"` — Confirm Button has `variant="default"`
    - Content uses project tokens (`text-text`, `text-muted`, `border-border`, `bg-surface`) — does NOT use shadcn's `text-foreground` / `text-muted-foreground` (those don't exist in this project)
    - Confirm button handler calls `onConfirm()` BEFORE `onOpenChange(false)` (order matters — mutation must fire with dialog still open semantically)
    - Cancel button handler calls ONLY `onOpenChange(false)` — never `onConfirm`
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    ConfirmDialog primitive ships as a generic, reusable, accessibility-default-compliant Radix Dialog wrapper with destructive variant. Compiles cleanly. No new deps.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Gate DayDetail Lift delete through ConfirmDialog</name>
  <files>
    - src/features/calendar/DayDetail.tsx (MODIFIED — add useState + mount ConfirmDialog + swap one onClick)
  </files>
  <read_first>
    - src/features/calendar/DayDetail.tsx (current full file — verify lines 51-55 for existing useState block and lines 211-223 for the Lift delete button markup)
    - src/components/ui/confirm-dialog.tsx (the primitive from Task 1 — confirm named export)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 5 consumer section (verbatim diff)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/features/calendar/DayDetail.tsx" for surgical-change guidance (and D-08 scope guard: ONLY Lift row, NOT PT or Steps)
  </read_first>
  <behavior>
    - Tapping the Lift row's "Delete" button sets `confirmDeleteLift` state to `true` — dialog opens
    - Dialog body reads: `Remove lift check-in for ${dayKey}? Note will be deleted too.` (dynamic dayKey interpolation)
    - Dialog title reads: `Remove lift check-in?`
    - Cancel button closes dialog WITHOUT firing `deleteLift` — the lift record persists
    - Remove button calls `deleteLift(dayKey)` and closes dialog — the lift record is deleted (existing Phase 3 service behavior unchanged)
    - The DayDetail PT row's "Delete" button (lines 115-123) is UNTOUCHED — still calls `deleteSession(s.id)` directly (D-08 scope ceiling)
    - The DayDetail Steps row's "Delete" button (lines 190-198) is UNTOUCHED — still calls `deleteSteps(dayKey)` directly (D-08 scope ceiling)
    - Existing `aria-label="Delete lift check-in"`, `style={{ color: '#ef4444' }}`, className (full `focus-visible:ring-*` string), and button type remain exactly as they are — ONLY the `onClick` handler changes
  </behavior>
  <action>
Make THREE surgical edits to `src/features/calendar/DayDetail.tsx`:

STEP 1 — Add the ConfirmDialog import near the top, alongside existing shadcn imports (insert after the Sheet import line):

```typescript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';  // NEW — D-06
```

STEP 2 — Add a new useState line at the end of the existing useState block (currently lines 51-55). Insert as the LAST useState declaration (so the diff is a single-line addition, not a reformat):

Before:
```tsx
const [editingSteps, setEditingSteps] = useState(false);
const [editingLiftNote, setEditingLiftNote] = useState(false);
const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);
```

After:
```tsx
const [editingSteps, setEditingSteps] = useState(false);
const [editingLiftNote, setEditingLiftNote] = useState(false);
const [editingPTSession, setEditingPTSession] = useState<PTSession | undefined>(undefined);
const [confirmDeleteLift, setConfirmDeleteLift] = useState(false);   // Phase 4 D-06
```

STEP 3 — Change the Lift row's Delete button `onClick` handler from direct-mutation to open-confirm-dialog. Currently at approximately lines 214-222 in the Lift section of the component:

Before:
```tsx
<button
  type="button"
  aria-label="Delete lift check-in"
  onClick={() => deleteLift(dayKey)}
  style={{ color: '#ef4444' }}
  className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
>
  Delete
</button>
```

After — change ONLY the `onClick` line, keep everything else identical:
```tsx
<button
  type="button"
  aria-label="Delete lift check-in"
  onClick={() => setConfirmDeleteLift(true)}
  style={{ color: '#ef4444' }}
  className="text-sm px-2 py-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
>
  Delete
</button>
```

STEP 4 — Mount the ConfirmDialog at the END of the return JSX, AFTER the closing `</div>` of the `<Lift>` section but still inside the outer `<div className="space-y-6">` wrapper. The existing PT `<Sheet>` is mounted at the component's mid-section (lines 129-145) — the ConfirmDialog follows the same controlled-primitive convention but is placed at the bottom to match its Lift-section semantic ownership.

Concretely: find the closing `</DayDetailSection>` for Lift (around line 242) and the outer wrapper's closing `</div>` (around line 243). Insert the ConfirmDialog BEFORE the outer `</div>`:

```tsx
      {/* ---------- Lift ---------- */}
      <DayDetailSection title="Lift">
        {/* ... existing Lift section body unchanged ... */}
      </DayDetailSection>

      {/* Phase 4 D-06 — destructive confirm for Lift delete (WR-03 closure) */}
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
    </div>
  );
}
```

STEP 5 — Verify by inspection:
- The PT row's Delete button at lines ~115-123 still has `onClick={() => deleteSession(s.id)}` — UNCHANGED (D-08 scope guard)
- The Steps row's Delete button at lines ~190-198 still has `onClick={() => deleteSteps(dayKey)}` — UNCHANGED (D-08 scope guard)
- Only the Lift row's Delete button handler changed
  </action>
  <verify>
    <automated>
      grep -q "import { ConfirmDialog } from '@/components/ui/confirm-dialog'" src/features/calendar/DayDetail.tsx \
      && grep -q "const \\[confirmDeleteLift, setConfirmDeleteLift\\] = useState(false)" src/features/calendar/DayDetail.tsx \
      && grep -q "onClick={() => setConfirmDeleteLift(true)}" src/features/calendar/DayDetail.tsx \
      && grep -q "<ConfirmDialog" src/features/calendar/DayDetail.tsx \
      && grep -q "title=\"Remove lift check-in?\"" src/features/calendar/DayDetail.tsx \
      && grep -q "body={\`Remove lift check-in for \${dayKey}? Note will be deleted too.\`}" src/features/calendar/DayDetail.tsx \
      && grep -q "confirmLabel=\"Remove\"" src/features/calendar/DayDetail.tsx \
      && grep -q "onConfirm={() => deleteLift(dayKey)}" src/features/calendar/DayDetail.tsx \
      && grep -q "onClick={() => deleteSession(s.id)}" src/features/calendar/DayDetail.tsx \
      && grep -q "onClick={() => deleteSteps(dayKey)}" src/features/calendar/DayDetail.tsx \
      && test "$(grep -c 'deleteLift(dayKey)' src/features/calendar/DayDetail.tsx)" = "1" \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/features/calendar/DayDetail.tsx` contains `import { ConfirmDialog } from '@/components/ui/confirm-dialog';`
    - File contains the exact state hook: `const [confirmDeleteLift, setConfirmDeleteLift] = useState(false);`
    - File contains the Lift delete button's NEW handler: `onClick={() => setConfirmDeleteLift(true)}`
    - File contains a `<ConfirmDialog` element (mounted in the return JSX)
    - File contains `title="Remove lift check-in?"` (exact match including question mark)
    - File contains the body template literal `body={`Remove lift check-in for ${dayKey}? Note will be deleted too.`}` (dayKey interpolation)
    - File contains `confirmLabel="Remove"` and `cancelLabel="Cancel"` (match D-06 copy)
    - File contains `destructive` as a bare prop (shorthand true) on the ConfirmDialog
    - File contains `onConfirm={() => deleteLift(dayKey)}`
    - File STILL contains `onClick={() => deleteSession(s.id)}` (PT delete — UNCHANGED per D-08)
    - File STILL contains `onClick={() => deleteSteps(dayKey)}` (Steps delete — UNCHANGED per D-08)
    - `deleteLift(dayKey)` appears EXACTLY ONCE in the file — inside the ConfirmDialog's `onConfirm`, NOT in the button's onClick (proves the button no longer bypasses the gate)
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    Lift delete is gated through ConfirmDialog. PT and Steps deletes are untouched. deleteLift can only fire via the dialog's onConfirm. Build passes.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User intent ↔ destructive action | Confirm dialog interposes between user's Delete tap and the actual `deleteLift` service call. Mitigates mis-tap data loss. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-10 | Tampering (accidental, self-inflicted) | User mis-taps Delete and loses lift + note data | mitigate | ConfirmDialog gate requires explicit "Remove" confirmation after dialog renders. Cancel path proves non-firing of deleteLift. |
| T-04-11 | Spoofing | Dialog body text XSS via dayKey interpolation | accept | dayKey is constructed by lib/dayKey.ts:dateToKey which always returns `YYYY-MM-DD` format via zero-padded numeric getters (no user-input chars). Radix Description renders text as textContent, not innerHTML. No injection vector. |
| T-04-12 | Information Disclosure | ConfirmDialog body leaks cross-tab | accept | Radix Portal renders into `document.body` — same-origin-only. No cross-tab exposure. |

**ASVS L1 applicable controls:** V5 (input validation — dayKey format guaranteed by upstream lib), V7 (error handling — Cancel path is a no-op; no silent swallowing).
</threat_model>

<verification>
1. `npm run build` exits 0
2. Grep confirms:
   - `confirm-dialog.tsx` exists with full Radix primitive structure
   - `DayDetail.tsx` imports ConfirmDialog, declares the state, swaps the onClick, mounts the dialog
   - PT and Steps delete buttons are UNCHANGED (grep finds them intact)
   - `deleteLift(dayKey)` appears exactly once — in the dialog's onConfirm (proves no bypass path)
3. Manual sanity (Phase-end UAT, NOT this plan's gate):
   - Navigate to /#/day/2026-04-21 on a day with a lift check-in
   - Tap Lift row's Delete button → dialog opens with "Remove lift check-in?" title
   - Tap Cancel → dialog closes, lift row still shows the check-in
   - Tap Delete again → Remove → lift row now shows "No lift check-in on this day."
</verification>

<success_criteria>
**D-06 closed:** ConfirmDialog primitive exists at `src/components/ui/confirm-dialog.tsx`, reuses the same Radix Dialog primitive as Sheet (zero new deps), and the DayDetail Lift row's delete is gated through it. Phase 3 WR-03 architecturally closed.

**D-08 hard scope ceiling respected:** PT delete and Steps delete are UNTOUCHED — no scope creep into additional confirm flows. Only the Lift row, only in DayDetail.

**Accessibility:** Radix defaults (focus trap, ESC, click-outside, focus-return, aria-modal, aria-labelledby via Title, aria-describedby via Description) are inherited — no manual ARIA needed.
</success_criteria>

<output>
After completion, create `.planning/phases/04-backup-polish/04-03-SUMMARY.md` using `$HOME/.claude/get-shit-done/templates/summary.md`. Capture:
- Decisions: D-06 closed, WR-03 closed; open Q #4 resolved (controlled open/onOpenChange API)
- Patterns established: "Radix Dialog metapackage second-consumer pattern (ConfirmDialog follows Sheet's import style)"
- Affects: `src/components/ui/`, `src/features/calendar/DayDetail.tsx`
- Provides: `ConfirmDialog`, `ConfirmDialogProps`
</output>