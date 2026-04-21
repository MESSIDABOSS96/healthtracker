# Phase 3: Streak Loop - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the core motivator: a month-at-a-time calendar where each day renders as a 4-segment indicator (NW=PT, NE=Food, SW=Steps, SE=Lift), partial fills read as positive progress, the current consecutive-complete-days streak count is displayed, and tapping a day opens its detail view. Covers **STREAK-01..07** and resolves both STATE.md open-ledger items: segment completion definition and DayCell geometry.

**Explicitly out of scope for Phase 3:**
- JSON export (Phase 4)
- Year-heatmap view (INSIGHT-03, v2)
- Streak freeze / grace day / badges / XP (REQUIREMENTS "Out of Scope")
- Per-quadrant color variants (Phase 1 D-17 rejected in favor of single-hue alpha ramp)
- Rest-day affordance / third-state lift check-in (deferred; see `<deferred>`)
- New schema migrations — Phase 3 is read-only over the v1 stores plus (optionally) edit/delete wrappers reusing the existing Phase 2 services

</domain>

<decisions>
## Implementation Decisions

### Segment completion rules (resolves STATE.md open item)

All four rules use "any log" semantics. STREAK-02's literal wording wins over the research-suggested "hit target" for food, because Core Value says logging should *feel like a win* — punishing partial-day or low-appetite days with a red/empty food quadrant would invert the motivator.

- **D-01** — **Food quadrant fills iff** `count(MealEntry where dayKey=D) >= 1`. No calorie/macro threshold. A single banana entry at 10am already lights the quadrant. Honors STREAK-02 literal + Pitfall #6 (partial = positive).
- **D-02** — **PT quadrant fills iff** `count(PTSession where dayKey=D) >= 1`. Completion checkboxes, exercise count, and pain rating do *not* gate. A saved session is a win regardless of how many template exercises were completed — consistent with Phase 2 D-11 ("Partial sessions are valid").
- **D-03** — **Steps quadrant fills iff** `StepEntry(dayKey=D) exists AND count > 0`. A zero-count StepEntry (accidental save, or truly sedentary day) does *not* fill — the record existing ≠ activity happened. Guards against gaming a 4/4 by tapping Save on an empty step input.
- **D-04** — **Lift quadrant fills iff** `LiftCheckin(dayKey=D) exists AND lifted === true`. An explicit `lifted: false` check-in leaves the quadrant unfilled. Matches STREAK-02 literal and prevents "gamed rest day" 4/4s.
- **D-05** — A day is rendered as **complete (4/4)** iff D-01 ∧ D-02 ∧ D-03 ∧ D-04 all hold. No partial credit; complete is binary.
- **D-06** — **Rest days cap at 3/4 — no special affordance.** A genuine lift rest day can never be complete. Partial fills are positive (Pitfall #6); 3/4 still reads as strong progress. No third `LiftCheckin` state, no schema change. Revisit post-v1 if daily use shows rest days feel punitive.

### DayCell geometry (resolves STATE.md open item; consumes Phase 1 D-17)

- **D-07** — **Shape: 2×2 square quadrants.** Each cell is a square SVG/div with four equal-area quadrants. Stable grid layout, good tap target on phone, simplest geometry, distinct per-area signal (vs. donut arcs which go thin at small cell sizes).
- **D-08** — **Quadrant-to-area mapping (LOCKED FOREVER — user builds a glance-map):**
  - NW (top-left) = PT
  - NE (top-right) = Food
  - SW (bottom-left) = Steps
  - SE (bottom-right) = Lift
  Matches Today screen section order (PT → Food → Steps → Lift), reading left-to-right, top-to-bottom. Never permuted without a new CONTEXT decision.
- **D-09** — **Per-count alpha ramp (honors Phase 1 D-17 literally).** Filled quadrants use the count-based alpha: if `N = count of filled quadrants for the day`, each filled quadrant renders at `--accent` with alpha `{1: 0.25, 2: 0.50, 3: 0.75, 4: 1.00}[N]` via the existing `--accent-25/50/75/100` tokens in `src/styles/tokens.css`. **4/4 is the only state that hits full accent saturation** — so complete days visibly pop on the month grid. Unfilled quadrants stay `--surface`. Never red, never empty-shame (Pitfall #6).
- **D-10** — **Date number**: overlaid in the geometric center of the cell in `--muted` color, on top of whatever quadrant fills are behind it. Single label regardless of fill state. Maximizes cell-as-indicator real estate on small phones. Legibility: `--muted` (#a1a1aa) on `--surface` passes AA; against filled accent @ various alphas, the contrast holds for label-size text (~12–14px on mobile).
- **D-11** — **Today indicator**: a 1px `--accent` ring around the entire cell (outside the 2×2 grid, does not interfere with quadrant fills). Applied only to today's cell regardless of its fill state — an empty today cell is still marked. No motion, no pulse.
- **D-12** — **4/4 day chrome**: **none.** The solid `--accent` fill IS the reward. No ring, no border, no glow, no emoji. Stays true to PROJECT.md "calm, minimal, low-noise" and REQUIREMENTS "no badges / no XP / no gamification." Complete cells collide cleanly with the D-11 today-ring when today happens to be 4/4 (ring sits outside, fill sits inside — no visual conflict).

### Claude's Discretion

The following are not locked — implementer picks during planning/execution unless they become blocking questions:

- **Calendar grid layout details.** Week-start day (recommend Sunday for US locale; user can override), how prev/next-month padding renders (muted dates? blank cells? recommend: muted `--muted` dates with zero fill so the grid stays 6×7), cell aspect (square preferred to match D-07), column gap / row gap, sticky month header. All derivable from tokens + UI-SPEC.
- **Month navigation bounds.** Recommend: clamp upper bound to current month (no future navigation since future days can't have logs); lower bound is the earliest `dayKey` across all 4 stores (show "◀ no earlier data" disabled state past that).
- **Streak count display.** Position (above the month grid, beside month title, or as a small pill) and typography. Semantics: count of consecutive complete days counting backward from the most recent complete day. Today is only counted when today is already 4/4; otherwise display uses the count up through yesterday without presenting today as a "broken" day ("5 days" with a subtle hint like "finish today's 4th to extend" is positive framing — anti-Pitfall #6). Claude can refine copy.
- **Day detail view delivery mechanism.** Route (`/#/day/YYYY-MM-DD` deep-link, honoring Phase 1 D-03 hash routing precedent) vs. bottom Sheet modal (Phase 2 D-01 pattern). Recommend **route** for day detail — it's a navigation destination (shareable URL, back-button friendly), not a quick-edit overlay. Sheets already own the logging surface in Phase 2.
- **Day detail view content & editability.** Must render all four areas' logs + totals for the selected day (STREAK-06). Edit/delete for past-day entries is **carried forward from Phase 2 CONTEXT D-20 and `<deferred>`** ("route to Phase 3's day-detail view"). Recommend: edit + delete past-day entries reuse existing Phase 2 services (`updateMealEntry`, `deleteMealEntry`, equivalents for steps/lifts/PT). Adding *new* logs for a past day (backdated meal, step count, lift check-in) is secondary — Claude decides whether to scope in based on effort; if deferred, add to `<deferred>`.
- **Streak service shape.** Follow `research/ARCHITECTURE.md` §"Pattern for the streak calendar" — one `streak.svc.ts` that issues **one range query per table** (4 range queries total, `Promise.all`) for the visible month ± padding, returns `Map<dayKey, {pt:boolean, food:boolean, steps:boolean, lift:boolean}>`. Wrap in `useLiveQuery` so any write to any of the 4 source tables refreshes the whole month. Anti-Pattern 3 (per-cell queries) is an automatic fail — 30 cells × 4 tables would be 120 IDB reads per render.
- **SVG vs div-based quadrants.** Either works. Div+CSS grid is simpler and adequately performant for ~42 cells per month. SVG gives sub-pixel crispness and easier future arc variants. Pick whichever keeps the first render under ~30ms.
- **Library choice for the grid.** `react-activity-calendar` (referenced in CLAUDE.md stack note) is a year-heatmap library — not a month-grid 4-segment primitive. Building the month grid + DayCell directly is almost certainly cleaner than bending the library to this shape. Claude decides; document the call in the plan if non-obvious.

### Folded Todos

None — `gsd-sdk query todo.match-phase 3` returned zero matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core Value ("logging feels like a win"), anti-gamification stance, Current State block noting Phase 2 complete
- `.planning/REQUIREMENTS.md` — Phase 3 covers STREAK-01..07 (7 requirements); Out-of-Scope table forbids streak freeze / badges / punitive red cells
- `.planning/ROADMAP.md` §"Phase 3: Streak Loop" — Goal + 5 success criteria
- `.planning/STATE.md` — Open decisions ledger (this CONTEXT resolves both "Segment completion definition" and "DayCell SVG geometry / color palette")
- `CLAUDE.md` — Project-breaking pitfalls (esp. #1 IDB-transaction auto-commit, #4 dayKey UTC bug — `lib/dayKey.ts` is the only key constructor)

### Phase 1 carry-forward (LOCKED, directly consumed in Phase 3)
- `.planning/phases/01-foundation/01-CONTEXT.md` §D-17 — **Alpha ramp source of truth** (0→--surface, 1/2/3/4→25/50/75/100% accent). This CONTEXT D-09 is the literal implementation of D-17 under the 2×2 quadrant shape.
- `.planning/phases/01-foundation/01-CONTEXT.md` §D-15/D-16 — Color tokens (`--surface`, `--accent`, `--muted`) consumed by DayCell
- `.planning/phases/01-foundation/01-CONTEXT.md` §D-03 — Hash routing precedent for `/#/day/YYYY-MM-DD` deep links
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Typography roles, spacing scale, anti-motion policy (no pulse/glow on DayCell), accessibility baselines

### Phase 2 carry-forward (LOCKED)
- `.planning/phases/02-tracking-slices/02-CONTEXT.md` §D-14 — SET-03 policy: day detail view renders logs against **current** goals, never per-day snapshot. Phase 3 day-detail totals display must follow this.
- `.planning/phases/02-tracking-slices/02-CONTEXT.md` §D-20 + `<deferred>` "Edit/delete for past-day entries" — carried forward: day-detail view is where past-day edit/delete lands
- `.planning/phases/02-tracking-slices/02-UI-SPEC.md` — Sheet primary-action pattern (applies if day detail is delivered as Sheet rather than route)

### Architecture + features (research)
- `.planning/research/ARCHITECTURE.md` §"Component / Module Boundaries" — UI → services → db dependency rule; `streak.svc.ts` is the new Phase 3 service module
- `.planning/research/ARCHITECTURE.md` §"State Management Pattern" → "Pattern for the streak calendar" — 4 `Promise.all` range queries, returns keyed map
- `.planning/research/ARCHITECTURE.md` §"Anti-Pattern 3: Deriving Streak State in Every Component" — **hard-fail rule** for Phase 3 (no per-cell IDB queries)
- `.planning/research/PITFALLS.md` §"Pitfall 6" (streak anxiety) — drives D-06 rest-day policy + D-09 alpha-ramp choice (never red, never empty)
- `.planning/research/FEATURES.md` §"Calendar / Streak Loop" — motivation feature rationale (if present; check file)

### Existing code (Phase 1 + 2 outputs)
- `src/styles/tokens.css` — `--accent-25/50/75/100` tokens already declared (Phase 1), Phase 3 is the first consumer
- `src/routes/CalendarScreen.tsx` — Phase 1 stub ("Coming in Phase 3"); Phase 3 replaces the body
- `src/db/schema.ts` — `MealEntry.dayKey`, `PTSession.dayKey`, `StepEntry.dayKey` (primary key), `LiftCheckin.dayKey` (primary key), `LiftCheckin.lifted: boolean`. All 4 streak-relevant fields indexed.
- `src/lib/dayKey.ts` — `todayKey()`, `dateToKey()`, `keyToDate()` — **every** day-key construction in `streak.svc.ts`, month-grid, and day-detail routing must go through these (Pitfall #4)
- `src/services/meals.svc.ts`, `pt.svc.ts`, `steps.svc.ts`, `lifts.svc.ts`, `goals.svc.ts` — existing Phase 2 services. Day-detail edit/delete reuses `updateMealEntry` / `deleteMealEntry` / equivalents; day-detail totals reuse `getDailyTotals(dayKey)`.
- `src/components/ui/` (`button.tsx`, `card.tsx`, `sheet.tsx`) — reusable primitives; Sheet available if day-detail lands as modal instead of route

### External library docs (fetch during research/planning if needed)
- Dexie range query `.between('2026-04-01', '2026-04-30', true, true)` — https://dexie.org/docs/Collection/Collection.between()
- Dexie `useLiveQuery` — re-runs on any table write; wrapping the 4-table streak query means one hook refreshes the whole month

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Alpha-ramp tokens already live:** `src/styles/tokens.css` has `--accent-25/50/75/100` — Phase 1 pre-declared them "for Phase 3 consumption." Phase 3 is the first consumer; no new CSS variable work needed for DayCell fill states.
- **All 4 `dayKey` sources exist and are indexed.** `MealEntry.dayKey` + `PTSession.dayKey` are secondary indexes; `StepEntry.dayKey` + `LiftCheckin.dayKey` are primary keys. Range-query cost is identical across all 4 — one compound `Promise.all` is safe.
- **Day-total aggregation exists** for food: `meals.svc.ts:getDailyTotals(dayKey)` returns the 4-macro reduce. Day detail reuses this directly; no duplication.
- **Phase 2 services expose edit/delete per domain** (`updateMealEntry`, `deleteMealEntry`, `upsertSteps`, `setLift`, etc.). Day-detail past-day edit/delete wires existing functions — no new service surface for that path.
- **Hash-routing precedent** set in Phase 1: `/#/today`, `/#/calendar`, `/#/settings`. Extending to `/#/day/YYYY-MM-DD` is additive — react-router-dom already installed.

### Established Patterns
- **UI → services → db dependency direction.** `streak.svc.ts` is the new service module; feature components in `src/features/calendar/` consume via `useLiveQuery` wrappers in `hooks.ts`. Never `import { db }` directly from a component.
- **One `Promise.all` range query over 4 tables** is the ARCHITECTURE.md-prescribed streak pattern. Anti-Pattern 3 ("per-cell IDB query") is an automatic code-review fail.
- **`useLiveQuery` for reactivity.** Logging a new meal in the Food Sheet on Today automatically refreshes the calendar if open — no manual invalidation, no Zustand.
- **Denormalized day totals on `MealEntry`** (Phase 2 D-06). Day detail's food macro row reduces over an already-hydrated array; no join to the `foods` store needed.
- **Anti-motion policy** (Phase 1 UI-SPEC). DayCell fill transitions should be instant — no CSS transition on alpha changes, no pulse on today cell, no celebrate-animation on 4/4.

### Integration Points
- **`src/routes/CalendarScreen.tsx`** — Phase 3 replaces the stub body with the month grid + streak count + month-nav controls. Outer shell (tab-bar layout, safe-area insets from Phase 1) unchanged.
- **New route `/#/day/YYYY-MM-DD`** — register in the top-level router (wherever tabs are declared). Deep links from DayCell tap.
- **New directory `src/features/calendar/`** — `StreakCalendar.tsx`, `DayCell.tsx`, `MonthGrid.tsx`, `StreakCount.tsx`, `DayDetail.tsx` (+ `hooks.ts`). Planner picks exact decomposition.
- **New service `src/services/streak.svc.ts`** — the only code that reads multiple tables at once. Returns a `Map<dayKey, QuadrantState>` per-range query; one `useLiveQuery` in the CalendarScreen hook subscribes.
- **Phase 4 hooks into:** day-detail's past-day edit flow signals the user that backup is worth doing (possible "Export now" cue in day detail — not Phase 3 scope; flagged for Phase 4 planner).

</code_context>

<specifics>
## Specific Ideas

- **"Visual consistency feedback that makes logging feel like a win"** (Core Value) is the single tiebreaker for Phase 3. When an edge case ambiguity arises ("should we gate the food quadrant on hitting calorie target?"), the answer always runs toward *reward the log, not the outcome*. That's D-01 through D-04.
- **Rest-day cap at 3/4 is an accepted tradeoff.** User sees 3/4 as strong progress, not failure. If daily use reveals it feels punitive, post-v1 revisit can add a third lift state or a rest-day flag — schema stays compatible either way.
- **Per-count alpha ramp (D-09) means 4/4 is the only state that visibly pops.** 1/4, 2/4, 3/4 days are progressively brighter but still muted; only a complete day hits full accent saturation. This creates the visual pull-toward-completion the streak loop is designed for.
- **Glance-map is permanent (D-08).** NW=PT, NE=Food, SW=Steps, SE=Lift. User will learn the map within a few days of use; permuting it later would break the mental model. Lock is strict.
- **Never red, never empty-shame.** Zero-log days render as a plain `--surface` square with the date number — identical to the "not yet" state. There is no "broken streak" cell. (Pitfall #6; Phase 1 D-17 foundation.)
- **Anti-gamification is load-bearing.** 4/4 gets no chrome (D-12). No badges, no confetti, no sound, no toast. The solid green square IS the reward. REQUIREMENTS Out-of-Scope: badges / XP / streak-freeze.

</specifics>

<deferred>
## Deferred Ideas

- **Third lift check-in state (rest-day "N/A").** Considered under D-06; rejected for v1 in favor of "3/4 is strong progress." Revisit post-v1 if rest days genuinely feel punitive in daily use. Would require schema interpretation change, not a migration (`LiftCheckin.lifted: boolean` could widen to `'yes' | 'no' | 'rest'` as a secondary field, or separate `LiftCheckin.restDay?: boolean`).
- **Year-view heatmap.** INSIGHT-03 (v2). Month-at-a-time is enough for Phase 3's motivation loop. Year heatmap is additive and requires a full year of data to be meaningful.
- **Streak freeze / grace day / streak-shield mechanics.** Hard out-of-scope per REQUIREMENTS Out-of-Scope table. Research-backed anti-pattern for rehab-serious trackers. Never add.
- **Badges / XP / achievements.** Hard out-of-scope per REQUIREMENTS Out-of-Scope. PROJECT.md "calm, minimal, low-noise" rejects this class.
- **Future-month navigation on the calendar.** Recommend clamping upper bound to current month in implementation (Claude's Discretion note) — future cells cannot have logs, so navigating to May when it's April shows all-empty days which adds no value and invites confusion.
- **Backdated adding of NEW logs from day detail** (e.g., "I forgot to log Tuesday's meal, add it now"). Phase 2 CONTEXT carried forward edit+delete of past-day entries only; adding new past-day logs is additive. Claude's Discretion during planning whether to scope in or defer; default: defer and keep day detail as edit/delete-only.
- **Streak count "on a roll" copy / notification.** No notifications (REQUIREMENTS Out-of-Scope). Streak count number stands on its own; no coaching copy needed.
- **Per-quadrant color coding.** Rejected in Phase 1 D-17 — single-hue accent is intentional. Don't revisit.
- **DayCell animation / motion on fill state change.** Rejected by Phase 1 UI-SPEC anti-motion policy. Instant fill transitions only.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 3 scope (`gsd-sdk query todo.match-phase 3` returned zero).

</deferred>

---

*Phase: 03-streak-loop*
*Context gathered: 2026-04-21*
