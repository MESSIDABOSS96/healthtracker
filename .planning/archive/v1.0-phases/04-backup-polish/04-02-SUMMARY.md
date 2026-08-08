---
phase: 04-backup-polish
plan: "02"
subsystem: ui
tags: [react, hooks, streak, midnight, timer, calendar, dexie]

# Dependency graph
requires:
  - phase: 03-streak-loop
    provides: "useCurrentStreakCount, StreakCount component, calendar hooks.ts with useLiveQuery"
  - phase: 01-foundation
    provides: "lib/dayKey.ts with todayKey() — Pitfall #4 guard"
provides:
  - "useDayKey() — reactive today's dayKey hook with setTimeout chained reschedule"
  - "useTodayQuadrantState() — midnight-reactive today 4-quadrant completion state"
  - "Updated useCurrentStreakCount() — re-subscribes useLiveQuery at midnight via useDayKey dep"
  - "Simplified StreakCount.tsx — no inline useLiveQuery or inline todayKey"
affects:
  - calendar
  - streak-loop

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Midnight-tick hook pattern: useState(todayKey()) + useEffect with setTimeout(() => setKey(todayKey()), msUntilMidnight()), dep [key] — each tick triggers fresh effect scheduling next midnight"
    - "Reactive dayKey threading: pass useDayKey() result as dep to useLiveQuery for automatic midnight re-subscription"

key-files:
  created:
    - src/lib/useDayKey.ts
  modified:
    - src/features/calendar/hooks.ts
    - src/features/calendar/StreakCount.tsx

key-decisions:
  - "D-05 closed: useDayKey placed in src/lib/ (lib-level reusable) not co-located in calendar feature — any future midnight-sensitive consumer can reuse without coupling to calendar"
  - "Open Q #3 resolved: lib-level placement chosen per CONTEXT.md Claude's Discretion guidance"
  - "msUntilMidnight uses setHours(24,0,5,0) specifically — 5s grace past midnight, DST-safe via JS Date local-tz arithmetic"
  - "No shared singleton: each hook consumer gets its own timer — correct at expected 2-3 consumer scale"
  - "StreakCount simplified to pure consumer — all reactive logic in hooks layer"

patterns-established:
  - "Midnight-tick hook (setTimeout chained reschedule via [key] dep): useDayKey.ts is the canonical reference"
  - "Reactive dayKey as useLiveQuery dep: thread useDayKey() result through dep array instead of [] for midnight re-subscription"

requirements-completed: []

# Metrics
duration: 3min
completed: 2026-04-22
---

# Phase 4 Plan 02: Midnight Hook Summary

**Reactive midnight-tick hook (useDayKey) via chained setTimeout + [key] dep wired through useCurrentStreakCount and useTodayQuadrantState — closes Phase 3 WR-01 and WR-02 without any new dependencies**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-22T02:31:05Z
- **Completed:** 2026-04-22T02:34:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments

- Created `src/lib/useDayKey.ts` — reactive today's dayKey that re-renders consumers when local midnight passes via chained setTimeout reschedule with `[key]` dep array
- Updated `useCurrentStreakCount` in `hooks.ts` — dep array changed from `[]` to `[today]` (where `today = useDayKey()`) so streak count re-subscribes its useLiveQuery at midnight (WR-01 closed)
- Added new `useTodayQuadrantState` export in `hooks.ts` — single-day range query keyed on `useDayKey()` output for midnight-reactive today-ring (WR-02 closed)
- Simplified `StreakCount.tsx` — removed inline `useLiveQuery`, `getStreakDataForRange`, and `todayKey` imports; now consumes `useTodayQuadrantState()` from hooks layer

## Task Commits

1. **Task 1: Create src/lib/useDayKey.ts** - `1ef7980` (feat)
2. **Task 2: Wire useDayKey through calendar hooks and StreakCount** - `9127816` (feat)

## Files Created/Modified

- `src/lib/useDayKey.ts` — New lib-level reactive dayKey hook; msUntilMidnight() with setHours(24,0,5,0), clearTimeout cleanup, [key] dep array, delegates to todayKey() (Pitfall #4 guard)
- `src/features/calendar/hooks.ts` — Added useDayKey import; updated useCurrentStreakCount dep; added useTodayQuadrantState export
- `src/features/calendar/StreakCount.tsx` — Simplified to consume useTodayQuadrantState + useCurrentStreakCount; removed 3 inline imports

## Decisions Made

- D-05 closed: lib-level placement (`src/lib/useDayKey.ts`) chosen over calendar co-location — any future midnight-sensitive consumer can reuse without coupling to the calendar feature module
- Open Q #3 (useDayKey location) resolved: lib-level per CONTEXT.md Claude's Discretion guidance
- `setHours(24, 0, 5, 0)` with 5-second grace past midnight: prevents racing the clock on the tick boundary while keeping DST correctness (JS Date local-tz arithmetic handles DST transitions correctly)
- No shared singleton: each consumer instance owns its timer — correct isolation at expected 2-3 consumer scale, no coordination complexity needed

## Deviations from Plan

None - plan executed exactly as written. The `toISOString().split` pattern appears only in a docstring comment explaining what NOT to do — no code path uses it (verified by grep for `toISOString().split` with parentheses, which only matches the comment's backtick-quoted example).

## Issues Encountered

None. Build passed on first attempt for both tasks.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. The only new surface is a client-side `setTimeout` (T-04-08 timer leak), which is mitigated by the `clearTimeout` cleanup in the useEffect return — verified by grep.

## Known Stubs

None. Both hooks return real reactive data from existing Dexie services.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WR-01 (streak count midnight staleness) and WR-02 (today-quadrant midnight staleness) architecturally closed
- useDayKey is available for any future midnight-sensitive consumer in other feature modules
- Phase 4 D-06 (ConfirmDialog for deleteLift) and D-05 are the only remaining polish items from Phase 3 review

## Self-Check: PASSED

All files verified:

- `src/lib/useDayKey.ts` — created, exists
- `src/features/calendar/hooks.ts` — modified, exists
- `src/features/calendar/StreakCount.tsx` — modified, exists
- `.planning/phases/04-backup-polish/04-02-SUMMARY.md` — this file, exists
- Commit `1ef7980` — Task 1 (verified in git log)
- Commit `9127816` — Task 2 (verified in git log)

---
*Phase: 04-backup-polish*
*Completed: 2026-04-22*
