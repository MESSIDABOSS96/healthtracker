---
phase: 03-streak-loop
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - src/App.tsx
  - src/features/calendar/DayCell.tsx
  - src/features/calendar/DayDetail.tsx
  - src/features/calendar/DayDetailHeader.tsx
  - src/features/calendar/DayDetailSection.tsx
  - src/features/calendar/MonthGrid.tsx
  - src/features/calendar/MonthHeader.tsx
  - src/features/calendar/StreakCalendar.tsx
  - src/features/calendar/StreakCount.tsx
  - src/features/calendar/WeekdayHeader.tsx
  - src/features/calendar/hooks.ts
  - src/features/calendar/monthMath.ts
  - src/features/lifts/LiftNoteInput.tsx
  - src/features/lifts/LiftToggle.tsx
  - src/features/pt/PTSessionForm.tsx
  - src/features/pt/PTSheet.tsx
  - src/features/pt/hooks.ts
  - src/features/steps/StepsInlineInput.tsx
  - src/routes/CalendarScreen.tsx
  - src/routes/DayDetailScreen.tsx
  - src/services/lifts.svc.ts
  - src/services/pt.svc.ts
  - src/services/steps.svc.ts
  - src/services/streak.svc.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 25 (24 source + App.tsx route wiring)
**Status:** issues_found (0 critical, 3 warning, 5 info)

## Summary

Phase 3 implements the streak loop cleanly. The core architectural constraints hold:

- **Pitfall #1 (await non-IDB inside Dexie transaction):** No `db.transaction(...)` wrappers anywhere in the reviewed services. All writes/deletes are single-statement `put`/`delete` (auto-transactioned). `streak.svc.ts` reads are a bare `Promise.all` of 4 Dexie ops — no transaction wrapper, no non-IDB awaits. Clean.
- **Pitfall #3 (`toISOString().split('T')`):** Zero occurrences across the reviewed surface. `monthMath.ts` routes every `Date → string` through `dateToKey`. Clean.
- **Anti-Pattern 3 (per-cell IDB):** `MonthGrid` drives all 42 cells from one `useLiveQuery` subscription (`useMonthStreakData`). `DayCell` imports nothing from `@/db/*` and consumes props only. Clean.
- **Backward-compatible extensions:** `StepsInlineInput`, `LiftToggle`, `LiftNoteInput`, `PTSheet`, `PTSessionForm` all take new optional `dayKey` / `editSession` props that default to prior Phase 2 behavior when omitted.
- **Route param validation:** `DayDetailScreen` enforces `/^\d{4}-\d{2}-\d{2}$/` with silent `<Navigate to="/calendar" replace />` fallthrough. Correct per UI-SPEC.

Findings are concentrated around (1) midnight-transition staleness in two `useLiveQuery` subscriptions, (2) a minor deletion/integrity gap in `deleteLift`/`deleteSteps` (empty-string handling), and (3) cosmetic/consistency nits.

## Warnings

### WR-01: `useCurrentStreakCount` subscription never re-fires on midnight rollover

**File:** `src/features/calendar/hooks.ts:59` (and `src/services/streak.svc.ts:101`)

**Issue:** `useCurrentStreakCount` wraps `getCurrentStreakCount()` with `useLiveQuery(..., [])`. Internally, `getCurrentStreakCount` captures `todayKey()` at execution time. Dexie's observability middleware re-runs the query only when a **write** to an observed table occurs — wall-clock rollover past midnight is not an observable event. If the app is left open across midnight with no writes, the hero streak count continues to reflect the previous day's "today" until the user next logs anything. For a user who opens the app at 11:58 PM, completes their 4/4 at 11:59 PM, then sits on the Calendar screen: the correct streak count IS displayed (a write fired). But once it's 00:05 the next day and they have nothing logged yet, the count still shows the previous day's streak — even though by the new day's semantics, the new "today" is 0/4 and the anchor is now yesterday.

The math happens to produce the same numeric value in most cases (because the previous day's count already counts yesterday), but subtle correctness issues exist:
- If the streak is non-zero because yesterday was 4/4 and today was 4/4 (anchor=today), after midnight rollover without logs, the hook still reports anchor=today-was-complete which now refers to the **wrong** dayKey.
- `StreakCount`'s sibling subscription (WR-02) has the same bug for `todayIsComplete`.

**Fix:** Either (a) add a day-rollover "tick" by subscribing to a lightweight interval that invalidates on midnight, or (b) accept the stale reading and document it as UI-SPEC behavior. Option (a):

```ts
// hooks.ts — inject a day-key dep so useLiveQuery re-subscribes on rollover
export function useCurrentStreakCount(): number | undefined {
  const key = useLiveToday(); // small hook that ticks on midnight
  return useLiveQuery(() => getCurrentStreakCount(), [key]);
}

// lib/useLiveToday.ts
export function useLiveToday(): string {
  const [key, setKey] = useState(todayKey());
  useEffect(() => {
    const tick = () => setKey(todayKey());
    const msToMidnight = (() => {
      const n = new Date(); const t = new Date(n);
      t.setHours(24, 0, 5, 0); // 5s grace
      return t.getTime() - n.getTime();
    })();
    const timeout = setTimeout(tick, msToMidnight);
    return () => clearTimeout(timeout);
  }, [key]);
  return key;
}
```

If Phase 3 scope defers this, note it in STATE.md as a known limitation — the streak is the product's core motivator and "streak silently wrong at 12:05 AM" is a visible correctness gap.

---

### WR-02: `StreakCount` inline `useLiveQuery` bypasses the hooks.ts pattern and has the same midnight bug

**File:** `src/features/calendar/StreakCount.tsx:19-26`

**Issue:** `StreakCount` imports `useLiveQuery` directly and writes an inline subscription with empty deps:

```ts
const todaysRow = useLiveQuery(() => {
  const k = todayKey();
  return getStreakDataForRange(k, k);
}, []);
const today = todayKey();
```

Two problems:
1. The hooks.ts header comment locks the calendar-feature hooks to `hooks.ts` ("Canonical calendar-feature hook module… UI-SPEC:646-648"). An inline `useLiveQuery` in the view component breaks this locus.
2. Empty `[]` + `todayKey()` captured in closure reproduces WR-01: after midnight rollover with no writes, `todaysRow` still reflects the previous day's completion state, so `todayIsComplete` is for the wrong day. The subtitle ("finish today's 4th to extend") can display incorrect copy.

**Fix:** Move into `hooks.ts` and share the day-key tick from WR-01:

```ts
// hooks.ts
export function useTodayQuadrantState(): QuadrantState | undefined {
  const key = useLiveToday();
  const row = useLiveQuery(() => getStreakDataForRange(key, key), [key]);
  return row?.get(key);
}

// StreakCount.tsx
const todayState = useTodayQuadrantState();
const todayIsComplete =
  !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;
```

---

### WR-03: `deleteLift` wipes note + lift flag together — no way to undo accidental toggle without losing note

**File:** `src/services/lifts.svc.ts:37-39` / `src/features/calendar/DayDetail.tsx:214-222`

**Issue:** The Lift section's Delete button calls `deleteLift(dayKey)`, which does `db.liftCheckins.delete(dayKey)`. This removes both `lifted` and `note`. There is no confirmation (per UI-SPEC §Destructive confirmations: NONE) and no undo. For a user who wrote a two-line note then mis-taps Delete instead of the lift toggle, the note is irrecoverable. The lift/note pair is the only past-day destructive op that touches two orthogonal user-entered fields with one action.

Steps and PT don't have this shape (steps is a single number; a PT session is a single logged event). Food delete (`deleteMealEntry`) only removes one entry out of many. Lift's `deleteLift` is the one place in Phase 3 where one tap destroys independent data.

**Fix:** Either split the affordance or make Delete only reset `lifted` without wiping the note. Minimal option — scope Delete to "clear the check-in status" but keep the note if present:

```ts
// lifts.svc.ts
export async function deleteLift(dayKey: string): Promise<void> {
  const existing = await db.liftCheckins.get(dayKey);
  if (existing?.note) {
    // Preserve note — clear only the lifted flag.
    await db.liftCheckins.put({
      dayKey,
      lifted: false,
      note: existing.note,
      loggedAt: Date.now(),
    });
  } else {
    await db.liftCheckins.delete(dayKey);
  }
}
```

Alternatively, the DayDetail Lift section could offer a separate "Clear note" affordance next to the note input, and Delete's semantics stay "remove the entire day's lift record." Choose whichever matches UI-SPEC intent; the current code path silently destroys user text.

## Info

### IN-01: `DayDetail.tsx:76` comment references D-14 goal comparison, but no goal-coloring is applied in the Food subtitle

**File:** `src/features/calendar/DayDetail.tsx:76-83`

**Issue:** The comment at line 76 says "D-14 (Phase 2 carry-forward): food totals compare against CURRENT goals — useGoals() reads the singleton, no per-day snapshot." The code below builds `foodSubtitle` as plain cal/P/C/F totals with no goal comparison or coloring. `goals` is consumed only by the Steps section (line 202). Either the comment overpromises relative to the implementation, or goal-relative coloring was dropped. Not a bug — but the misleading comment will confuse future readers.

**Fix:** Trim the comment to match:

```ts
// Food macros subtitle — totals only; goal-relative coloring deferred to
// the Today FoodSection component (DayDetail shows raw totals per UI-SPEC).
```

---

### IN-02: `getCurrentStreakCount` silently underreports streaks longer than 730 days

**File:** `src/services/streak.svc.ts:90, 125, 137`

**Issue:** `MAX_SCAN_DAYS = 730` bounds the backward walk. A streak that exceeds 730 consecutive days will be reported as exactly 730 (the `key < scanStartKey` break fires before `isComplete` fails). The comment calls out this choice ("RESEARCH §7 + Assumptions Log A1 — planner-approved default"), so this is intentional. Still worth surfacing in review since the cap is silent — there is no log or UI indication that the streak was clamped.

**Fix:** None required (planner-approved). Consider a `// TODO: Phase 4+ — surface "730+" instead of exact clamp` comment at line 137 if UX feedback surfaces it.

---

### IN-03: `StreakCalendar.shiftMonth` reuses an interim Date and returns `{year, month0}` correctly, but the comment could be clearer about DST safety

**File:** `src/features/calendar/StreakCalendar.tsx:30-34`

**Issue:** `shiftMonth` does `new Date(v.year, v.month0 + delta, 1)` then reads `getFullYear() / getMonth()`. Correct — the Date constructor normalizes month overflow (`month0 = 12 → next year Jan`). The inline comment says "Use Date math so December→January and year-boundaries work correctly." Fine, but doesn't mention that using day=1 avoids DST hour-rollover issues. `monthMath.ts:14` explicitly documents the equivalent safety for `lastOfMonth`. Consistency nit.

**Fix:** Optional — add a phrase like "day=1 avoids any DST hour wrap". Not blocking.

---

### IN-04: `PTSheet` silently falls back to list mode when editing a session whose template is deleted

**File:** `src/features/pt/PTSheet.tsx:54-60`

**Issue:** `effectiveMode = editSession && !editTemplate ? 'list' : mode` — if the user taps a past PT session whose template has since been deleted, the Sheet opens in the template list instead of an edit form, with no explanation. The inline comment documents this ("we gracefully fall back to list mode, preserving the session read in DayDetail"), which is defensible, but from the user's perspective it looks like the Sheet opened the wrong screen.

**Fix:** Either (a) render a lightweight inline message ("Template deleted — cannot edit this session. [Start a new session]") in place of the list, or (b) accept the current behavior and document it in UI-SPEC. Not blocking — the current path is safe and non-destructive.

---

### IN-05: `DayDetail.tsx` uses hex `#ef4444` inline styles instead of a `--destructive` token

**File:** `src/features/calendar/DayDetail.tsx:119, 194, 218`

**Issue:** Four Delete buttons use `style={{ color: '#ef4444' }}`. The frontmatter comment at lines 15-17 explicitly notes this is a carry-forward from Phase 2's `MealEntryRow.tsx:123` and that "Phase 3 does not introduce a `--destructive` token in tokens.css (frontmatter policy note)." So this is a deliberate policy choice, not a bug. The hex shows up in 5 locations across the codebase (4 in DayDetail + 1 in MealEntryRow). Worth flagging so Phase 4 polish knows to consider a token migration.

**Fix:** Defer to Phase 4 design-polish pass. When the token is added, a single grep-and-replace consolidates all 5 uses. No action required now.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
