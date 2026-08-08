---
phase: 03-streak-loop
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/calendar/DayCell.tsx
autonomous: true
requirements:
  - STREAK-02
  - STREAK-03
  - STREAK-04
must_haves:
  truths:
    - "DayCell is PURE — takes props, renders JSX. Zero IDB access, zero useLiveQuery, zero useEffect data fetches. Anti-Pattern 3 hard-fail guard."
    - "Quadrant glance-map LOCKED FOREVER (D-08): NW=PT, NE=Food, SW=Steps, SE=Lift. Rendered in this order via the 4 child divs."
    - "Alpha ramp is count-based (D-09): N filled quadrants → every filled quadrant renders at var(--accent-{25,50,75,100})[N]; unfilled quadrants render var(--surface). 4/4 is the ONLY state that hits --accent-100 saturation."
    - "Zero-log day (0/4) renders identically to never-logged-yet: 4 var(--surface) quadrants + muted date number. NEVER red, NEVER empty-shame (Pitfall #6)."
    - "4/4 complete day has NO extra chrome (D-12): no ring, no border, no glow, no emoji — just the solid --accent fill."
    - "Today gets a 1px var(--accent) outline sitting OUTSIDE the 2×2 grid (D-11) via CSS outline. Applies regardless of fill count."
    - "Current-month cells are <button type='button'>; padded (prev/next-month) cells are <button disabled aria-disabled='true'> and do NOT dispatch navigation. aria-label format matches UI-SPEC verbatim."
  artifacts:
    - path: "src/features/calendar/DayCell.tsx"
      provides: "<DayCell dayKey filled today inMonth /> — the 4-quadrant indicator primitive"
      exports: ["DayCell", "DayCellProps"]
  key_links:
    - from: "DayCell onClick"
      to: "react-router-dom useNavigate('/day/{dayKey}')"
      via: "useNavigate hook, called only when inMonth===true"
      pattern: "navigate\\(`/day/\\$\\{dayKey\\}`\\)"
    - from: "DayCell quadrant backgrounds"
      to: "src/styles/tokens.css --accent-25/50/75/100"
      via: "inline style backgroundColor via ALPHA_VARS indexed by count"
      pattern: "var\\(--accent-(25|50|75|100)\\)"
---

<objective>
Build the `<DayCell>` primitive — the load-bearing presentational unit of Phase 3's calendar. Pure component: takes `{dayKey, filled, today, inMonth}` props, renders a `<button>` containing a 2×2 CSS grid of quadrant divs (NW=PT, NE=Food, SW=Steps, SE=Lift per D-08 LOCKED FOREVER) + a centered date number + an optional 1px today-ring. Quadrant fill uses the count-based alpha ramp (D-09). Clicks navigate to `/day/{dayKey}` (only for in-month cells).

Purpose: This is the unit the whole month grid tiles 42 times. Its purity is a plan-checker guard: any `useLiveQuery`, `useEffect(async...)`, `fetch`, or `db.*` usage in this file is Anti-Pattern 3 (per-cell IDB) — an automatic HARD-FAIL. The plan is deliberately narrow (one file, one component) so this guard is unambiguous.

Output: 1 new file. Zero data access. Consumed by Plan 03-03's MonthGrid.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/03-streak-loop/03-CONTEXT.md
@.planning/phases/03-streak-loop/03-RESEARCH.md
@.planning/phases/03-streak-loop/03-PATTERNS.md
@.planning/phases/03-streak-loop/03-UI-SPEC.md
@.planning/research/PITFALLS.md
@CLAUDE.md
@src/lib/dayKey.ts
@src/styles/tokens.css
@src/features/food/MealEntryRow.tsx
@src/components/ui/button.tsx

<interfaces>
<!-- Key contracts the executor needs inline. -->

From src/styles/tokens.css (lines 17-21 — Phase 3 FIRST consumer of these vars):
```css
--accent-25:   rgba(34, 197, 94, 0.25);  /* 1/4 fill */
--accent-50:   rgba(34, 197, 94, 0.50);  /* 2/4 fill */
--accent-75:   rgba(34, 197, 94, 0.75);  /* 3/4 fill */
--accent-100:  #22c55e;                   /* 4/4 fill (= --accent) */
--surface:     #18181b;                   /* unfilled quadrant AND 0/4 fallback */
--muted:       #a1a1aa;                   /* current-month date number color */
--border:      #27272a;                   /* padded-cell date number color */
--accent:      #22c55e;                   /* today-ring outline */
```

From src/lib/dayKey.ts — day number extraction:
```typescript
export function keyToDate(key: string): Date;  // returns local Date; use .getDate() for day-of-month
```

From src/features/food/MealEntryRow.tsx:58-68 — button-as-card focus pattern analog:
```tsx
<button
  type="button"
  onClick={() => setEditing(true)}
  className="w-full flex items-center justify-between py-3 text-left hover:bg-border/20 px-2 rounded-md"
>
  ...
</button>
```

From src/components/ui/button.tsx:9-14 — canonical focus-visible ring stack (use verbatim):
```
'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg'
```

UI-SPEC aria-label format (Copywriting Contract §DayCell, lines 225-232):
- Current-month, N/4 (1..3):  `{Weekday}, {Month} {Day} — {N} of 4 logged: {areasFilledList}`
- Current-month, 0/4:          `{Weekday}, {Month} {Day} — no logs`
- Current-month, 4/4:          `{Weekday}, {Month} {Day} — all 4 logged`
- Append `, today` when today===true
- areasFilledList: lowercase CSV in NW→NE→SW→SE order = `PT, food, steps, lift`

Visual state matrix (UI-SPEC:424-430):
| count | quadrants                      | today            | padded             |
| 0     | 4× --surface                    | +1px accent ring | date color --border|
| 1     | only filled area uses --accent-25, others --surface | same | same |
| 2     | 2 filled areas --accent-50, others --surface        | same | same |
| 3     | 3 filled areas --accent-75, 1 unfilled --surface    | same | same |
| 4     | 4× --accent-100                                      | ring outside fill | n/a — padded can't be today |
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Create src/features/calendar/DayCell.tsx — pure quadrant primitive</name>
  <files>src/features/calendar/DayCell.tsx</files>
  <read_first>
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 393-432 (DayCell component contract, props, rendering approach, visual state matrix — the load-bearing spec)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 146-168 (DayCell color contracts, today+4/4 collision rules, contrast tradeoff at 4/4)
    - .planning/phases/03-streak-loop/03-UI-SPEC.md lines 225-232 (aria-label copy format)
    - .planning/phases/03-streak-loop/03-RESEARCH.md §4 lines 292-383 (authoritative DayCell code sketch + ARIA pattern + keyboard nav notes)
    - .planning/phases/03-streak-loop/03-PATTERNS.md §"src/features/calendar/DayCell.tsx" (lines 164-201 — button-with-focus-ring analog from MealEntryRow, alpha-ramp token usage, what NOT to copy)
    - .planning/phases/03-streak-loop/03-CONTEXT.md §D-07..D-12 (shape, quadrant mapping LOCKED FOREVER, alpha ramp, date number, today ring, 4/4 chrome rules)
    - src/styles/tokens.css (full file — CSS var declarations for --accent-25/50/75/100/--surface/--muted/--border/--accent)
    - src/lib/dayKey.ts (full file — to understand keyToDate for extracting day-of-month)
    - src/features/food/MealEntryRow.tsx lines 55-70 (analog: button-as-card w/ onClick and tap-feedback conventions)
    - src/components/ui/button.tsx (focus-visible ring class stack — copy verbatim)
    - .planning/research/PITFALLS.md §Pitfall 6 (never red, never empty-shame — drives the zero-log == never-logged rendering)
  </read_first>
  <action>
Create new file `src/features/calendar/DayCell.tsx`. Single default-export is forbidden (project uses named exports — see all Phase 1+2 files). Export both the component and the props interface.

File structure (authoritative — values below from UI-SPEC + RESEARCH §4):

```tsx
// src/features/calendar/DayCell.tsx
// Pure presentational primitive — the 4-quadrant activity cell of the month
// grid (42 instances per month). Takes {dayKey, filled, today, inMonth} props
// and renders a <button> containing a 2×2 CSS grid of colored quadrant divs.
//
// D-08 quadrant glance-map is LOCKED FOREVER:
//   NW = PT, NE = Food, SW = Steps, SE = Lift
// The order of the 4 child divs in grid-cols-2 grid-rows-2 flow (left-to-right,
// top-to-bottom) IS this map. DO NOT permute without a new CONTEXT decision.
//
// D-09 alpha ramp: a filled quadrant's alpha depends on the TOTAL count of
// filled quadrants that day (not which quadrant it is). 4/4 is the only state
// that hits --accent-100 saturation. 0/4 is all --surface — identical to the
// never-logged state (Pitfall #6: never red, never empty-shame).
//
// D-11 today-ring sits OUTSIDE the 2×2 grid via CSS outline — does not clip
// into quadrant fills. D-12: 4/4 gets NO extra chrome — solid fill IS the reward.
//
// This file MUST NOT import { db } from '@/db/db', MUST NOT call useLiveQuery,
// MUST NOT call useEffect for data fetch. All data arrives via props from
// MonthGrid's single useLiveQuery subscription (see hooks.ts + streak.svc.ts).
// Anti-Pattern 3 — per-cell IDB — is an auto-fail at plan-check.

import { useNavigate } from 'react-router-dom';
import { keyToDate } from '@/lib/dayKey';

export interface DayCellProps {
  dayKey: string;
  filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean };
  today: boolean;
  inMonth: boolean;
}

// Indexed by count (0..4). Unfilled quadrants always use --surface regardless
// of count; this array is consulted ONLY for filled quadrants. Index 0 is a
// placeholder (never read since a 0/4 day has no filled quadrants).
const ALPHA_VARS = [
  'var(--surface)',     // 0 — placeholder (never accessed for filled quadrant)
  'var(--accent-25)',   // 1/4
  'var(--accent-50)',   // 2/4
  'var(--accent-75)',   // 3/4
  'var(--accent-100)',  // 4/4
] as const;

function quadFill(filledFlag: boolean, count: number): string {
  return filledFlag ? ALPHA_VARS[count] : 'var(--surface)';
}

// D-08 NW→NE→SW→SE order for the areasFilledList in aria-label.
const AREA_ORDER: Array<{ key: keyof DayCellProps['filled']; label: string }> = [
  { key: 'pt',    label: 'PT' },
  { key: 'food',  label: 'food' },
  { key: 'steps', label: 'steps' },
  { key: 'lift',  label: 'lift' },
];

function buildAriaLabel(props: DayCellProps, count: number): string {
  const d = keyToDate(props.dayKey);
  const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
  const month = d.toLocaleDateString(undefined, { month: 'long' });
  const day = d.getDate();
  const datePart = `${weekday}, ${month} ${day}`;

  let countPart: string;
  if (count === 0) {
    countPart = 'no logs';
  } else if (count === 4) {
    countPart = 'all 4 logged';
  } else {
    const filledAreas = AREA_ORDER.filter(a => props.filled[a.key]).map(a => a.label).join(', ');
    countPart = `${count} of 4 logged: ${filledAreas}`;
  }

  const base = `${datePart} — ${countPart}`;
  return props.today ? `${base}, today` : base;
}

export function DayCell(props: DayCellProps) {
  const { dayKey, filled, today, inMonth } = props;
  const navigate = useNavigate();

  const count =
    Number(filled.pt) + Number(filled.food) + Number(filled.steps) + Number(filled.lift);

  const dayOfMonth = keyToDate(dayKey).getDate();
  const ariaLabel = buildAriaLabel(props, count);

  const handleClick = () => {
    if (inMonth) navigate(`/day/${dayKey}`);
  };

  // D-11 today ring: CSS outline sits outside the box and does not push content.
  // Focus-visible ring (Phase 1 token stack) uses ring-2 at offset-2 — when
  // focused, the 2px ring visually supersedes the 1px today outline cleanly.
  const outlineStyle = today ? { outline: '1px solid var(--accent)', outlineOffset: '0px' } : undefined;

  return (
    <button
      type="button"
      role="gridcell"
      disabled={!inMonth}
      aria-disabled={!inMonth}
      aria-label={ariaLabel}
      onClick={handleClick}
      style={outlineStyle}
      className={
        'relative aspect-square ' +
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
        'active:brightness-90 ' +
        'disabled:cursor-default'
      }
    >
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full">
        {/* NW = PT (D-08 LOCKED) */}
        <div style={{ backgroundColor: quadFill(filled.pt, count) }} />
        {/* NE = Food */}
        <div style={{ backgroundColor: quadFill(filled.food, count) }} />
        {/* SW = Steps */}
        <div style={{ backgroundColor: quadFill(filled.steps, count) }} />
        {/* SE = Lift */}
        <div style={{ backgroundColor: quadFill(filled.lift, count) }} />
      </div>
      <span
        className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs tabular-nums"
        style={{ color: inMonth ? 'var(--muted)' : 'var(--border)' }}
      >
        {dayOfMonth}
      </span>
    </button>
  );
}
```

Implementation notes (judgment calls the executor must NOT re-open):
- **quadrant order** = 4 child divs literally in grid flow order `grid-cols-2 grid-rows-2` = reading NW→NE→SW→SE. Matches D-08. Comments on each div identify the area to prevent accidental reordering during future refactors.
- **alpha by count, not by area** — `quadFill(filled, count)` returns `ALPHA_VARS[count]` for filled, `var(--surface)` for unfilled. A 3/4 day where PT is filled renders PT at `--accent-75` — NOT `--accent-25`. This is D-09 verbatim.
- **today ring** uses CSS `outline` (not `box-shadow`, not `border`) so it sits outside the grid without consuming box-model space and without pushing date number or quadrant fills. `outlineOffset: 0` keeps it flush to the cell edge.
- **focus ring** uses the Phase 1+2 canonical Tailwind stack `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg` — copy verbatim from `src/components/ui/button.tsx`. Because outline-none is set, the today-outline is NOT suppressed by focus (they compose: today always has 1px outline; focus adds the 2px ring on top). That's intentional per UI-SPEC:412.
- **padded cells** (`inMonth===false`) render as `<button disabled aria-disabled="true">` — `disabled` blocks the click, `aria-disabled` backs it up for screen readers (UI-SPEC:547). `handleClick` also checks `inMonth` defensively — no navigation on padded cells even if `disabled` is bypassed.
- **role="gridcell"** is set on the `<button>` so MonthGrid's `role="grid"` wrapper (Plan 03-03) creates a valid ARIA grid structure. UI-SPEC:545.
- **no React.memo** — RESEARCH §8 says 42 pure-JSX re-renders is ~15ms, acceptable. Skip memoization initially; can add later if measured regression. React 19 compiler may auto-memoize anyway.
- **no transitions** — zero CSS `transition:` properties. Alpha swaps are instant. Anti-motion policy (UI-SPEC:509).
- **`toLocaleDateString` for weekday/month names** is acceptable — it's NOT a day-key construction (Pitfall #4 scope is ONLY YYYY-MM-DD, not human-readable labels). Using `toLocaleDateString` keeps user-locale month names for the screen-reader label. If the project wants strict US English, this can later swap to a hardcoded array — NOT a current concern.

Do NOT:
- Add `useLiveQuery` / `useEffect` / `db.*` imports — Anti-Pattern 3 hard-fail.
- Convert to SVG — UI-SPEC:402 locks div+CSS grid.
- Add hover highlight — DayCells are status displays, not hover-interactive (UI-SPEC:413).
- Add a 4/4 badge / emoji / glow — D-12 forbids any 4/4 chrome.
- Color the date number differently at 4/4 — UI-SPEC:166-168 explicitly accepts the 3.1:1 contrast as intentional.
- Use any red / destructive color anywhere — Pitfall #6 forbids it in the grid.
- Add `React.memo` — skip per RESEARCH §8.
  </action>
  <verify>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <acceptance_criteria>
    - `test -f src/features/calendar/DayCell.tsx` exits 0
    - `grep -c "export interface DayCellProps" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "export function DayCell" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "from 'react-router-dom'" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "from '@/lib/dayKey'" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "var(--accent-25)" src/features/calendar/DayCell.tsx` is at least 1
    - `grep -c "var(--accent-50)" src/features/calendar/DayCell.tsx` is at least 1
    - `grep -c "var(--accent-75)" src/features/calendar/DayCell.tsx` is at least 1
    - `grep -c "var(--accent-100)" src/features/calendar/DayCell.tsx` is at least 1
    - `grep -c "var(--surface)" src/features/calendar/DayCell.tsx` is at least 2 (quadFill fallback + unfilled case)
    - `grep -c "grid grid-cols-2 grid-rows-2" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "role=\"gridcell\"" src/features/calendar/DayCell.tsx` is 1
    - `grep -c "aria-disabled" src/features/calendar/DayCell.tsx` is at least 1
    - `grep -c "focus-visible:ring-accent" src/features/calendar/DayCell.tsx` is 1
    - `grep -cE "outline.*solid var\(--accent\)" src/features/calendar/DayCell.tsx` is 1 (today ring)
    - `! grep -E "useLiveQuery|useEffect" src/features/calendar/DayCell.tsx` (Anti-Pattern 3 guard — HARD-FAIL if present)
    - `! grep -E "from '@/db/db'" src/features/calendar/DayCell.tsx` (component must not touch db)
    - `! grep -E "from '@/services/" src/features/calendar/DayCell.tsx` (component must not import services — data arrives via props)
    - `! grep -E "#ef4444|destructive|red-|text-red" src/features/calendar/DayCell.tsx` (Pitfall #6 — no red in grid)
    - `! grep -E "toISOString|\.split\('T'\)|new Date\([\"'][0-9]" src/features/calendar/DayCell.tsx` (Pitfall #4)
    - `! grep -E "React\.memo|React.memo" src/features/calendar/DayCell.tsx` (per RESEARCH §8 — skip memo initially)
    - `! grep -E "transition-" src/features/calendar/DayCell.tsx` (anti-motion policy — no Tailwind transition utilities on the cell)
    - `! grep -E "🔥|🎉|✨" src/features/calendar/DayCell.tsx` (D-12 — no celebration chrome)
    - `grep -c "navigate(\`/day/" src/features/calendar/DayCell.tsx` is 1 (route navigation exists exactly once)
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>
  <done>DayCell.tsx exports named DayCell + DayCellProps; renders 2×2 CSS grid of quadrants with count-based alpha fill; today ring via outline; date number centered; no IDB access; no red; compiles.</done>
</task>

</tasks>

<threat_model>
  <scope>Presentational component rendering user-visible calendar cells. No network, no IDB (data arrives via props from upstream hook).</scope>
  <inputs>
    - name: "dayKey prop"
      validated_by: "upstream producer (monthMath.ts:dateToKey) — always YYYY-MM-DD"
      severity_if_unvalidated: "low"
    - name: "filled, today, inMonth props"
      validated_by: "TypeScript at compile time; upstream producer (streak.svc) guarantees shape"
      severity_if_unvalidated: "low"
  </inputs>
  <data_flow>Plan 03-03 MonthGrid maps streak.svc Map → 42 DayCell props. DayCell renders divs with token-CSS backgrounds + text. No dangerouslySetInnerHTML, no HTML injection paths, no eval.</data_flow>
  <threats_considered>
    - XSS (Cross-Site Scripting): None — all rendered strings (day-of-month number, aria-label) are React-escaped by default
    - S/T/R/I/D/E: Information disclosure via aria-label — labels reveal what areas are logged; acceptable (this is the purpose)
    - Clickjacking on padded cells: `disabled` attribute + defensive `if (inMonth)` guard in handleClick = two layers preventing navigation on padded cells
  </threats_considered>
  <mitigations>
    - threat: "Navigation on invalid dayKey"
      mitigation: "Defense in depth — dayKey prop comes from monthMath dateToKey which always outputs valid YYYY-MM-DD; Plan 03-04's route validates `/^\\d{4}-\\d{2}-\\d{2}$/` before rendering DayDetail; invalid param silently redirects to /calendar"
    - threat: "Per-cell IDB amplification"
      mitigation: "Architectural — DayCell takes `filled` as a prop; cannot fetch its own data. Acceptance criteria grep asserts no useLiveQuery/useEffect/db imports."
    - threat: "Streak-anxiety UI regressions"
      mitigation: "Pitfall #6 guard — zero-log day uses only --surface; acceptance criteria forbid red/#ef4444/destructive classes."
  </mitigations>
  <residual_risk>none — read-only render of locked CSS tokens; all user inputs (if any) validated upstream</residual_risk>
</threat_model>

<verification>
- `npx tsc --noEmit` exits 0
- `npx eslint src/features/calendar/DayCell.tsx` matches Phase 1/2 baseline
- Visual sanity — NOT in this plan; Plan 03-03 wires DayCell into MonthGrid and the user sees it live after that
- Purity guard passes: `grep -E "useLiveQuery|useEffect|from '@/db/db'|from '@/services/'" src/features/calendar/DayCell.tsx` returns EMPTY
- Anti-streak-anxiety guard passes: `grep -E "#ef4444|destructive|text-red|bg-red" src/features/calendar/DayCell.tsx` returns EMPTY
- Anti-chrome guard passes: `grep -E "emoji|🔥|🎉|✨|pulse|glow" src/features/calendar/DayCell.tsx` returns EMPTY
- D-08 glance-map preserved: 4 quadrant divs appear in source in order NW(pt) → NE(food) → SW(steps) → SE(lift). A visual grep:
  ```
  grep -A 1 "grid grid-cols-2 grid-rows-2" src/features/calendar/DayCell.tsx | head -20
  ```
  Confirm comments identify each div in NW,NE,SW,SE order and the `filled.X` keys used match that sequence.
</verification>

<success_criteria>
- 1 new file exists: `src/features/calendar/DayCell.tsx`
- Zero files modified outside the new file
- Zero imports of `@/db/db`, `@/services/*`, `useLiveQuery`, `useEffect`
- Quadrant order (NW→NE→SW→SE) maps to (PT, Food, Steps, Lift) in source code
- Count-based alpha ramp uses all 4 tokens `var(--accent-25/50/75/100)` at least once each
- Today-ring uses CSS `outline` (not box-shadow, not border)
- Padded cells are `<button disabled aria-disabled="true">` + no-op navigation
- aria-label builds NW→NE→SW→SE CSV ("PT, food, steps, lift") for partial days; "no logs" for 0; "all 4 logged" for 4; ", today" suffix when today
- Whole project still type-checks
- Consumer contract for Plan 03-03 is clear: pass `{dayKey, filled, today, inMonth}` — nothing else
</success_criteria>

<output>
After completion, create `.planning/phases/03-streak-loop/03-02-SUMMARY.md` documenting:
- Exact component API (DayCellProps shape, DayCell signature)
- Confirmation: NO useLiveQuery, NO useEffect data fetches, NO db imports, NO service imports
- Confirmation: quadrant order matches D-08 LOCKED FOREVER (cite line numbers in final file)
- Any deviation from RESEARCH §4 sketch (expected: none)
- Note for Plan 03-03 consumer: `filled` prop comes from `map.get(dayKey) ?? { pt: false, food: false, steps: false, lift: false }` when data is undefined
</output>
