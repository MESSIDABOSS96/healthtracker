---
phase: "04-backup-polish"
plan: "03"
subsystem: "ui-primitives / calendar"
tags: [confirm, dialog, ui-primitive, polish, lift, radix]

dependency_graph:
  requires:
    - "src/components/ui/sheet.tsx (radix-ui metapackage pattern)"
    - "src/services/lifts.svc.ts:deleteLift"
    - "radix-ui metapackage (already installed)"
  provides:
    - "ConfirmDialog — generic destructive-confirm Radix Dialog primitive"
    - "ConfirmDialogProps — exported interface for consumer typing"
    - "DayDetail Lift row gated through ConfirmDialog (WR-03 closed)"
  affects:
    - "src/components/ui/"
    - "src/features/calendar/DayDetail.tsx"

tech_stack:
  added: []
  patterns:
    - "Radix Dialog metapackage second-consumer pattern (ConfirmDialog follows Sheet's import style)"
    - "Controlled open/onOpenChange API — parent state owns open, no imperative Promise wrapper"
    - "Inline destructive styling (#ef4444/#fafafa) per project convention (4+ existing call sites)"

key_files:
  created:
    - path: "src/components/ui/confirm-dialog.tsx"
      description: "Generic ConfirmDialog primitive — controlled, Radix Dialog, destructive variant"
  modified:
    - path: "src/features/calendar/DayDetail.tsx"
      description: "Lift delete button gated through ConfirmDialog; PT and Steps delete untouched"

decisions:
  - "D-06 closed: ConfirmDialog wired into DayDetail Lift row delete, closing Phase 3 WR-03"
  - "D-08 hard scope ceiling respected: PT delete and Steps delete buttons untouched"
  - "Open Q #4 resolved: controlled open/onOpenChange API chosen over imperative confirm() Promise wrapper (matches Sheet convention)"
  - "Imported from radix-ui metapackage (not scoped @radix-ui/react-dialog) — zero new dependencies"
  - "Used Dialog primitive (not AlertDialog) for Phase 4 parity with Sheet; AlertDialog migration deferred post-v1 if 2+ confirm sites needed"

metrics:
  duration: "~8 min"
  completed: "2026-04-22"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 03: Confirm Dialog Summary

**One-liner:** Generic Radix Dialog `ConfirmDialog` primitive added; DayDetail Lift delete gated through it, closing Phase 3 WR-03 with zero new dependencies.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create ConfirmDialog primitive | `09feabe` | `src/components/ui/confirm-dialog.tsx` (new) |
| 2 | Gate DayDetail Lift delete through ConfirmDialog | `6fb0523` | `src/features/calendar/DayDetail.tsx` (modified) |

## What Was Built

**ConfirmDialog (`src/components/ui/confirm-dialog.tsx`):** A controlled, generic destructive-confirm primitive built on the `radix-ui` metapackage's `Dialog` — the same primitive that `Sheet` uses, meaning zero new dependencies. Props: `open`, `onOpenChange`, `title`, `body`, `confirmLabel` (default: 'Confirm'), `cancelLabel` (default: 'Cancel'), `destructive` (default: false), `onConfirm`. Accessibility (focus trap, ESC-to-close, click-outside, focus-return, aria-modal, aria-labelledby, aria-describedby) is provided entirely by Radix defaults.

**DayDetail Lift row (surgical edit):** Three targeted changes: (1) import added, (2) `confirmDeleteLift` useState added, (3) Lift delete button `onClick` changed from `() => deleteLift(dayKey)` to `() => setConfirmDeleteLift(true)`, (4) `<ConfirmDialog>` mounted at bottom of JSX with `onConfirm={() => deleteLift(dayKey)}`. The PT and Steps delete buttons are completely untouched per D-08 hard scope ceiling.

## Decisions Made

- **D-06 closed:** ConfirmDialog wired into Lift row delete — Phase 3 WR-03 architecturally closed
- **D-08 respected:** PT delete (`deleteSession(s.id)`) and Steps delete (`deleteSteps(dayKey)`) retain their Phase 3 no-confirm UX
- **Open Q #4 resolved:** Controlled `open`/`onOpenChange` API chosen — matches Sheet convention, no imperative `confirm()` Promise wrapper needed
- **Dialog vs AlertDialog:** Used `Dialog` primitive for Phase 4 parity with Sheet (single consumer, zero extra imports). AlertDialog (role="alertdialog", disables click-outside) is the semantic preference for destructive confirms; migrate post-v1 if 2+ sites arise
- **Metapackage import:** `import { Dialog as DialogPrimitive } from 'radix-ui'` — same pattern as Sheet, confirmed zero new deps

## Deviations from Plan

**1. [Rule 1 - Bug] Removed unused `import * as React from 'react'`**
- **Found during:** Task 1, first build attempt
- **Issue:** TypeScript strict mode (`TS6133`) flagged `React` as declared but never read — the component uses JSX transform, not the classic React import
- **Fix:** Removed the `import * as React` line; file uses JSX transform already configured in tsconfig
- **Files modified:** `src/components/ui/confirm-dialog.tsx`
- **Commit:** `09feabe` (fix applied before commit)

**2. [Verification note] Plan's automated verify grep for `@radix-ui/react-dialog` absence**
- The plan's `test` command used `! grep -q "@radix-ui/react-dialog"` which would have failed because the comment block mentions `@radix-ui/react-dialog` for documentation purposes
- The actual import line correctly uses `radix-ui` (metapackage, no scoped import)
- Verification was manually confirmed with `grep -E "^import.*@radix-ui/react-dialog"` (import-line only) — passes correctly

## Known Stubs

None. Both deliverables are fully wired: ConfirmDialog is a complete primitive (no placeholder data), and DayDetail's Lift delete is fully gated (deleteLift fires only through onConfirm).

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The ConfirmDialog operates entirely in-memory (React state + Radix Portal rendering). The dayKey interpolation in the dialog body is safe: dayKey is always `YYYY-MM-DD` format from `lib/dayKey.ts`, and Radix Description renders as `textContent` (not `innerHTML`) — no XSS vector (T-04-11 accepted per plan threat model).

## Self-Check: PASSED

- `src/components/ui/confirm-dialog.tsx` — FOUND
- `.planning/phases/04-backup-polish/04-03-SUMMARY.md` — FOUND
- Commit `09feabe` (Task 1: ConfirmDialog primitive) — FOUND
- Commit `6fb0523` (Task 2: DayDetail Lift gate) — FOUND
