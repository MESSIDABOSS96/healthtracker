---
phase: 03
plan: 04
subsystem: calendar / day-detail
tags: [streak-loop, day-detail, route, past-day-edit]
requires:
  - 03-01 (useDayDetail hook, canonical hooks.ts)
  - Phase 2 services (meals.svc, pt.svc, steps.svc, lifts.svc, goals.svc)
  - Phase 2 components (MealEntryRow, StepsInlineInput, LiftToggle, LiftNoteInput, PTSheet, PTSessionForm)
  - Phase 1 primitives (Card, Sheet, AppShell, HashRouter, lucide-react)
provides:
  - "Route /#/day/:dayKey (STREAK-06)"
  - "DayDetail composer with 4 section cards (PT/Food/Steps/Lift)"
  - "Past-day edit/delete wiring for all 4 areas via extended Phase 2 components"
  - "Three additive 1-line delete service fns: deleteSession, deleteSteps, deleteLift"
  - "Optional dayKey prop on 3 leaf input components (backward-compatible default)"
  - "Optional editSession prop on PTSheet + PTSessionForm (backward-compatible default)"
affects:
  - src/App.tsx (Route registration)
  - src/features/steps/StepsInlineInput.tsx (additive dayKey prop)
  - src/features/lifts/LiftToggle.tsx (additive dayKey prop)
  - src/features/lifts/LiftNoteInput.tsx (additive dayKey prop)
  - src/features/pt/PTSheet.tsx (additive editSession prop)
  - src/features/pt/PTSessionForm.tsx (additive editSession prop)
  - src/features/pt/hooks.ts (useLastSessionForTemplate excludeSessionId param)
  - src/services/pt.svc.ts (deleteSession)
  - src/services/steps.svc.ts (deleteSteps)
  - src/services/lifts.svc.ts (deleteLift)
tech-stack:
  added: []
  patterns:
    - "Additive optional-prop backward compatibility (dayKey?, editSession?)"
    - "Route-boundary regex validation for user-controllable URL params"
    - "saveSession as put-by-id upsert for edit-without-duplicate"
    - "Inline hex destructive color carry-forward (no new token)"
key-files:
  created:
    - src/features/calendar/DayDetail.tsx
    - src/features/calendar/DayDetailHeader.tsx
    - src/features/calendar/DayDetailSection.tsx
    - src/routes/DayDetailScreen.tsx
  modified:
    - src/App.tsx
    - src/services/pt.svc.ts
    - src/services/steps.svc.ts
    - src/services/lifts.svc.ts
    - src/features/steps/StepsInlineInput.tsx
    - src/features/lifts/LiftToggle.tsx
    - src/features/lifts/LiftNoteInput.tsx
    - src/features/pt/PTSheet.tsx
    - src/features/pt/PTSessionForm.tsx
    - src/features/pt/hooks.ts
decisions:
  - "useLastSessionForTemplate hook extended with optional excludeSessionId — needed to exclude the session being edited from its own prev-session hint (Rule 3 blocking-fix from Task 3)"
  - "Inline #ef4444 hex preserved over introducing --destructive token — explicit destructive_color_policy in plan frontmatter, capped at ≤4 hex occurrences in DayDetail.tsx"
  - "DayDetailHeader uses navigate('/calendar') explicitly (not navigate(-1)) for deterministic back-navigation"
  - "Route param validation at DayDetailScreen boundary; DayDetail receives only regex-validated dayKey"
metrics:
  duration: "~5 min"
  completed: 2026-04-21
---

# Phase 3 Plan 04: Day Detail Summary

Wired up the `/#/day/:dayKey` route destination that completes the calendar-tap-to-detail loop, including FULL past-day edit/delete wiring for PT sessions, meals, steps, and lift check-ins through additive, backward-compatible extensions of Phase 2 components.

## What changed

**New files (4):**
- `src/features/calendar/DayDetail.tsx` — composer rendering DayDetailHeader + summary row + 4 section cards (PT/Food/Steps/Lift) with full past-day edit/delete wiring.
- `src/features/calendar/DayDetailHeader.tsx` — Back button + formatted date label + `(today)` suffix + reserved empty right slot.
- `src/features/calendar/DayDetailSection.tsx` — generic Card-backed section wrapper with title + optional subtitle.
- `src/routes/DayDetailScreen.tsx` — thin route shell. Validates `:dayKey` via `/^\d{4}-\d{2}-\d{2}$/`; invalid keys redirect silently to `/calendar`.

**Service additions (3, each 1-line):**
- `src/services/pt.svc.ts` — `deleteSession(id)` — PK delete on `ptSessions`.
- `src/services/steps.svc.ts` — `deleteSteps(dayKey)` — natural-key delete on `stepEntries`.
- `src/services/lifts.svc.ts` — `deleteLift(dayKey)` — natural-key delete on `liftCheckins`.

All are single-statement Dexie deletes; no `db.transaction` wrapper needed (Pitfall #1 not applicable). `deleteMealEntry` already exists in `meals.svc.ts` (reused).

**Phase 2 prop extensions (all additive, all backward-compatible via default values — today callers unchanged byte-for-byte):**

- `StepsInlineInput` — added `dayKey?: string`. Commit now calls `upsertSteps(dayKey ?? todayKey(), …)`.
- `LiftToggle` — added `dayKey?: string`. Click calls `toggleLift(dayKey ?? todayKey())`.
- `LiftNoteInput` — added `dayKey?: string`. Commit calls `setLiftNote(dayKey ?? todayKey(), …)`.
- `PTSheet` — added `editSession?: PTSession`. When provided, skips list mode and mounts PTSessionForm with the session's resolved template + editSession prop. Gracefully falls back to list mode if the template was deleted after the session was logged.
- `PTSessionForm` — added `editSession?: PTSession`. Hydrates `values:` from editSession (exercise data, pain, notes) by matching on exercise NAME (not position). On save, preserves `editSession.id`, `editSession.dayKey`, and `editSession.loggedAt` so `saveSession` (put-by-id) performs an UPDATE, not an INSERT. `useLastSessionForTemplate` called with `editSession?.id` so the prev-session hint excludes the session being edited.

**Hook extension (Rule 3 — blocking fix):**
- `src/features/pt/hooks.ts` — `useLastSessionForTemplate` extended to accept optional `excludeSessionId` param (the underlying service fn already supported it; hook wrapper did not). Required by PTSessionForm edit-mode prev-hint suppression.

**Route registration:**
- `src/App.tsx` — added `<Route path="/day/:dayKey" element={<DayDetailScreen />} />` between `/calendar` and `/settings`.

## Verification

- `npx tsc --noEmit` — exit 0
- `npm run build` — exit 0 (1853 modules transformed; full PWA bundle built)
- All grep-based acceptance criteria per plan passed (verified inline per task):
  - 3 service delete fns present, none wrapped in `db.transaction`
  - 3 leaf components each have exactly one `dayKey?: string` + one `dayKey ?? todayKey()` usage
  - PTSheet/PTSessionForm each have `editSession?: PTSession`; PTSessionForm preserves `id/dayKey/loggedAt` on edit
  - Today callers unchanged: `git diff --quiet src/features/steps/StepsSection.tsx src/features/lifts/LiftSection.tsx src/features/pt/PTSection.tsx` = 0
  - DayDetail.tsx: 6 `dayKey={dayKey}` pass-throughs (≥3 required), 4 `#ef4444` occurrences (within 1-4 cap)
  - `src/features/calendar/dayDetailHooks.ts` does NOT exist (W-1 guard)
  - Route order preserved: today → calendar → day/:dayKey → settings
  - No `toISOString`, no `.split('T')`, no direct `db` imports in new files (Pitfall #4 + layering policy)
  - No `confirm(...)` in DayDetail (Phase 2 D-04 "no confirm on delete" honored)
  - No "Complete day" / "Finish" / "Confirm day" copy (anti-gamification UI-SPEC:288 honored)

## Explicit confirmations (per plan `<output>` checklist)

- **All three Phase 2 leaf components now accept `dayKey?: string` with `todayKey()` fallback; Today callers are unchanged.** Verified via `git diff --quiet` on StepsSection.tsx and LiftSection.tsx (exit 0).
- **PTSheet + PTSessionForm now accept `editSession?: PTSession`; `saveSession` preserves `id/dayKey/loggedAt` in edit mode; new-session flow unchanged.** Verified via `git diff --quiet` on PTSection.tsx (exit 0).
- **`useDayDetail` is imported from `./hooks` (Plan 03-01 canonical placement; no dayDetailHooks.ts created).** Verified: `grep -c "from './hooks'" src/features/calendar/DayDetail.tsx` = 1; `test -f src/features/calendar/dayDetailHooks.ts` = 1 (non-existent).
- **Route regex validation confirmed.** `src/routes/DayDetailScreen.tsx:15` defines `const DAYKEY_RE = /^\d{4}-\d{2}-\d{2}$/` and tests it before returning `<DayDetail>`.
- **Phase 2 D-04 (no confirm on delete) honored.** No `confirm(` call in DayDetail.tsx; all 3 locally rendered delete buttons (PT, Steps, Lift) are immediate onClick. MealEntryRow (reused) is already D-04 compliant from Phase 2.
- **#ef4444 inline hex count in DayDetail.tsx = 4** (within the 1–4 cap). Matches the Phase 2 MealEntryRow precedent; no new `--destructive` token introduced (plan frontmatter policy).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Extended `useLastSessionForTemplate` hook with optional `excludeSessionId`**

- **Found during:** Task 3
- **Issue:** The plan's Task 3 action calls `useLastSessionForTemplate(template.id, editSession?.id)` in PTSessionForm, relying on an `excludeSessionId` parameter. The underlying service fn `getLastSessionForTemplate` in `pt.svc.ts` already accepts this 2nd arg (the plan `<interfaces>` block notes this), but the React hook wrapper in `src/features/pt/hooks.ts` was defined as `useLastSessionForTemplate(templateId: string)` — no exclude param. Without extending the hook, Task 3 would fail to typecheck.
- **Fix:** Added an optional `excludeSessionId?: string` parameter to the hook, forwarded it to the service call, and included it in the `useLiveQuery` dep array so re-subscription is correct when the excluded id changes.
- **Files modified:** `src/features/pt/hooks.ts`
- **Commit:** `c480a0e` (folded into Task 3 commit alongside PTSheet/PTSessionForm edits — semantically a single unit of work)
- **Backward compatibility:** `excludeSessionId` defaults to `undefined`, and the existing `getLastSessionForTemplate` call with undefined exclude behaves identically to before. Today's `PTSection` → `PTSheet` (no editSession) → `PTSessionForm` (no editSession) → `useLastSessionForTemplate(template.id)` path is unchanged.

No other deviations. All UI-SPEC locked copy strings used verbatim. No architectural changes. No prose "compat fallbacks" — UI-SPEC:246 + UI-SPEC:263-268 implemented in full.

## Commits (6 per-task + this SUMMARY)

| # | Task | Hash | Message |
|---|------|------|---------|
| 1 | Service deletes | `8f50692` | feat(03-04): add deleteSession/deleteSteps/deleteLift service fns |
| 2 | Leaf component dayKey props | `19c806a` | feat(03-04): add optional dayKey prop to leaf input components |
| 3 | PTSheet + PTSessionForm edit mode | `c480a0e` | feat(03-04): extend PTSheet + PTSessionForm with editSession prop |
| 4 | DayDetailSection + Header | `e5d6b53` | feat(03-04): add DayDetailSection + DayDetailHeader components |
| 5 | DayDetail composer | `a5f3012` | feat(03-04): add DayDetail composer with past-day edit/delete wiring |
| 6 | Route + DayDetailScreen | `8956f7c` | feat(03-04): register /day/:dayKey route + DayDetailScreen shell |

## TDD Gate Compliance

N/A — plan `type: execute`, not `type: tdd`. No test commits required.

## Known Stubs

None. All sections render real data from useDayDetail's 5 parameterized live subscriptions. Empty states render documented "No X logged on this day." copy per UI-SPEC:246, 249, 253, 257.

## Note for Phase 4 planner

- **DayDetailHeader right slot is reserved empty.** UI-SPEC:242 + code comment in DayDetailHeader.tsx both flag this for Phase 4 "Export day" action.
- **Destructive `#ef4444` hex-count drift:** if additional files adopt the inline-hex pattern, consider introducing a `--destructive` token in `src/styles/tokens.css` as a Phase 4 polish task. Current occurrences: MealEntryRow.tsx (1) + DayDetail.tsx (4) = 5 project-wide.
- **Checkpoint Task 7 (human verify) was auto-approved** under CLAUDE.md YOLO mode policy. All automated acceptance criteria passed; manual browser walkthrough of the full flow (tap Calendar cell → Day Detail → past-day edit PT/Food/Steps/Lift → Delete → regression-check Today tab) is deferred for the next interactive session. The underlying wiring is grep- and tsc-verified.

## Self-Check: PASSED

**Files created (verified exist):**
- `src/features/calendar/DayDetail.tsx` — FOUND
- `src/features/calendar/DayDetailHeader.tsx` — FOUND
- `src/features/calendar/DayDetailSection.tsx` — FOUND
- `src/routes/DayDetailScreen.tsx` — FOUND

**Files modified (verified by grep of key signatures):**
- `src/App.tsx` — contains `path="/day/:dayKey"` — FOUND
- `src/services/pt.svc.ts` — contains `export async function deleteSession` — FOUND
- `src/services/steps.svc.ts` — contains `export async function deleteSteps` — FOUND
- `src/services/lifts.svc.ts` — contains `export async function deleteLift` — FOUND
- `src/features/steps/StepsInlineInput.tsx` — contains `dayKey?: string` — FOUND
- `src/features/lifts/LiftToggle.tsx` — contains `dayKey?: string` — FOUND
- `src/features/lifts/LiftNoteInput.tsx` — contains `dayKey?: string` — FOUND
- `src/features/pt/PTSheet.tsx` — contains `editSession?: PTSession` — FOUND
- `src/features/pt/PTSessionForm.tsx` — contains `editSession?: PTSession` — FOUND
- `src/features/pt/hooks.ts` — contains `excludeSessionId` — FOUND

**Commits (verified in git log):**
- `8f50692` — FOUND
- `19c806a` — FOUND
- `c480a0e` — FOUND
- `e5d6b53` — FOUND
- `a5f3012` — FOUND
- `8956f7c` — FOUND
