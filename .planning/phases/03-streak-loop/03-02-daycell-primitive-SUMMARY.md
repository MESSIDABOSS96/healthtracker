---
phase: 03-streak-loop
plan: 02
subsystem: ui
tags: [react, react-router-dom, calendar, daycell, presentational, aria-grid, css-tokens]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: --accent-25/50/75/100 tokens in src/styles/tokens.css, lib/dayKey.ts:keyToDate, canonical focus-visible ring class stack in src/components/ui/button.tsx
  - phase: 02-tracking-slices
    provides: button-as-card tap pattern (src/features/food/MealEntryRow.tsx)
provides:
  - "<DayCell dayKey filled today inMonth /> — pure 2×2 quadrant cell primitive (src/features/calendar/DayCell.tsx)"
  - "DayCellProps interface: { dayKey: string; filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean }; today: boolean; inMonth: boolean }"
  - "Count-based alpha-ramp helper ALPHA_VARS[0..4] (first consumer of --accent-25/50/75/100 tokens)"
  - "NW→NE→SW→SE area-order list used for aria-label construction"
affects: [03-03-monthgrid, 03-05-integration, 04-backup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure presentational primitive — props in, JSX out, zero IDB / services / hooks besides navigation"
    - "Count-based alpha ramp via CSS vars (var(--accent-{25,50,75,100}))"
    - "today-ring rendered with CSS outline (lives outside grid, no box-model impact)"
    - "Padded-cell guard: <button disabled aria-disabled='true'> + defensive if(inMonth) in onClick"
    - "aria-label composed from keyToDate() — NEVER toISOString/UTC path (Pitfall #4)"

key-files:
  created:
    - "src/features/calendar/DayCell.tsx — the Phase 3 load-bearing primitive (131 lines)"
  modified: []

key-decisions:
  - "Followed plan's authoritative code sketch verbatim — zero deviations from UI-SPEC §DayCell + RESEARCH §4."
  - "Used CSS outline (not box-shadow/border) for today-ring per D-11 — keeps the ring outside the 2×2 grid without consuming box-model space."
  - "Kept date number at --muted across all 5 fill states (0..4), including 4/4 where contrast is 3.1:1 — accepted tradeoff per UI-SPEC:166-168 (the fill IS the message)."
  - "Skipped React.memo per RESEARCH §8 — 42 pure-JSX re-renders ≈ 15ms, acceptable. React 19 compiler may auto-memoize."
  - "toLocaleDateString used ONLY for human-readable weekday/month names in aria-label — day-key construction never touches this path (Pitfall #4 scope is YYYY-MM-DD construction only)."

patterns-established:
  - "Pure component template for feature files: imports limited to React Router nav + token helpers — no db, no services, no useEffect data fetch."
  - "aria-label builder pattern: date parts + count part + optional ', today' suffix. Reusable pattern for any future calendar/date cell."
  - "ALPHA_VARS indexed by count (not by area) — encodes D-09 verbatim at the type level; filled area never reaches into a per-area color choice."

requirements-completed: [STREAK-02, STREAK-03, STREAK-04]

# Metrics
duration: 2min
completed: 2026-04-21
---

# Phase 3 Plan 02: DayCell Primitive Summary

**Pure 2×2 quadrant presentational primitive with count-based alpha ramp, today-ring via CSS outline, and NW→NE→SW→SE glance-map locked per D-08.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T19:31:31Z
- **Completed:** 2026-04-21T19:33:13Z (approx)
- **Tasks:** 1
- **Files created:** 1
- **Files modified:** 0

## Accomplishments
- DayCell.tsx: pure React component — takes `{dayKey, filled, today, inMonth}` props, renders `<button role="gridcell">` containing a 2×2 CSS grid of quadrant divs + centered date number + optional 1px today-outline.
- Quadrant glance-map NW=PT, NE=Food, SW=Steps, SE=Lift rendered via 4 child divs in grid flow order (D-08 LOCKED FOREVER).
- Count-based alpha ramp wired: 1/4 → --accent-25, 2/4 → --accent-50, 3/4 → --accent-75, 4/4 → --accent-100. Unfilled quadrants always --surface. (D-09)
- 0/4 renders identically to never-logged (4× --surface + muted date number) — Pitfall #6: never red, never empty-shame.
- 4/4 gets NO extra chrome — solid fill IS the reward (D-12).
- Today ring rendered via CSS `outline` sitting outside the grid (D-11), composes cleanly with focus-visible ring.
- Padded cells (prev/next-month) use `<button disabled aria-disabled="true">` with defensive `if(inMonth)` guard on navigation.
- aria-label composed NW→NE→SW→SE ("PT, food, steps, lift") for partial days; "no logs" for 0/4; "all 4 logged" for 4/4; ", today" suffix when today.
- Full project type-checks green (`npx tsc --noEmit` → EXIT 0).

## Component API (for Plan 03-03 consumer)

```typescript
export interface DayCellProps {
  dayKey: string;
  filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean };
  today: boolean;
  inMonth: boolean;
}
export function DayCell(props: DayCellProps): JSX.Element;
```

**Consumer note for Plan 03-03 (MonthGrid):** `filled` prop should come from `streak.svc` Map via `map.get(dayKey) ?? { pt: false, food: false, steps: false, lift: false }` — the component assumes a fully-populated filled object (no Partial, no undefined).

## Purity Audit (executor self-verification)

- `grep -nE "^[^/]*useLiveQuery\\s*\\(" src/features/calendar/DayCell.tsx` → none (only comments mention it)
- `grep -nE "^[^/]*useEffect\\s*\\(" src/features/calendar/DayCell.tsx` → none
- `grep -nE "^import.*@/db/db" src/features/calendar/DayCell.tsx` → none
- `grep -nE "^import.*@/services" src/features/calendar/DayCell.tsx` → none
- Actual imports present: `useNavigate` from `react-router-dom`, `keyToDate` from `@/lib/dayKey` — nothing else.
- Anti-Pattern 3 (per-cell IDB) — **cleared**.

## D-08 Quadrant Order Audit (source-level)

`src/features/calendar/DayCell.tsx` lines 112-121:

```
112:      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
113:        {/* NW = PT (D-08 LOCKED) */}
114:        <div style={{ backgroundColor: quadFill(filled.pt, count) }} />
115:        {/* NE = Food */}
116:        <div style={{ backgroundColor: quadFill(filled.food, count) }} />
117:        {/* SW = Steps */}
118:        <div style={{ backgroundColor: quadFill(filled.steps, count) }} />
119:        {/* SE = Lift */}
120:        <div style={{ backgroundColor: quadFill(filled.lift, count) }} />
121:      </div>
```

CSS `grid-cols-2 grid-rows-2` flow order is left-to-right, top-to-bottom → NW, NE, SW, SE. The 4 children are keyed to `filled.pt`, `filled.food`, `filled.steps`, `filled.lift` in that order. Matches D-08 exactly.

aria-label AREA_ORDER (lines 49-54) uses the same NW→NE→SW→SE sequence → "PT, food, steps, lift".

## Task Commits

1. **Task 1: Create src/features/calendar/DayCell.tsx — pure quadrant primitive** — `7683014` (feat)

## Files Created/Modified
- `src/features/calendar/DayCell.tsx` — created, 131 lines. The 4-quadrant activity-cell primitive consumed by Plan 03-03's MonthGrid.

## Decisions Made
None beyond the plan. Followed the authoritative code sketch in `<action>` verbatim. All judgment calls the plan flagged ("do NOT re-open") were preserved:
- quadrant order literally in grid flow (no reorder)
- alpha by count, not by area
- CSS outline for today ring (not box-shadow, not border)
- focus-ring via Phase 1 canonical Tailwind stack
- no React.memo, no transitions, no hover
- no 4/4 chrome, no emoji
- `toLocaleDateString` for human-readable weekday/month names only

## Deviations from Plan

None — plan executed exactly as written.

**Total deviations:** 0
**Impact on plan:** None. Single-file additive plan, single task, zero auto-fixes, zero blockers.

## Issues Encountered

None. One minor note: `npx eslint` has no config file in this project (pre-existing, Phase 1/2 baseline). Out of scope for this plan — `npx tsc --noEmit` is the authoritative `<automated>` verification per the plan spec and it passed.

## Self-Check: PASSED

- File exists: `src/features/calendar/DayCell.tsx` — FOUND
- Commit exists: `7683014` — FOUND (`git log --oneline | grep 7683014` → `7683014 feat(03-02): add DayCell 2x2 quadrant primitive`)
- All 15 required-presence greps pass (exports, imports, token vars, grid class, role=gridcell, aria-disabled, focus ring, today outline, navigate call)
- All 8 HARD-FAIL guards pass (no useLiveQuery/useEffect hook calls, no @/db/db or @/services imports, no red/destructive, no toISOString, no React.memo, no transition-*, no celebration emoji)
- `npx tsc --noEmit` → EXIT 0

## Next Phase Readiness

- **Plan 03-03 (MonthGrid)**: DayCell API is frozen — MonthGrid can start by mapping its 42-cell window against the streak service Map and rendering `<DayCell dayKey={...} filled={...} today={...} inMonth={...} />` per cell.
- **Plan 03-04 (day detail route)**: DayCell fires `navigate('/day/{dayKey}')` on click — registering the `/day/:dayKey` route is the integration seam.
- **Open/remaining work in this phase**: StreakCount component, streak.svc.ts, MonthGrid + hooks.ts, CalendarScreen wiring, DayDetail route — all in later plans per ROADMAP.

---
*Phase: 03-streak-loop*
*Plan: 02-daycell-primitive*
*Completed: 2026-04-21*
