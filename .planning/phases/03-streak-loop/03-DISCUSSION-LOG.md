# Phase 3: Streak Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 03-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-streak-loop
**Areas discussed:** Segment completion rules, DayCell geometry

---

## Segment completion rules

### Food quadrant fill criterion

| Option | Description | Selected |
|--------|-------------|----------|
| Any meal entry exists | ≥1 MealEntry on that dayKey. Lowest friction. Matches STREAK-02 literal + Core Value. | ✓ |
| Hit calorie target | computedCalories for the day ≥ goals.calories. Meaningful signal but risks streak-shame on low-appetite days. | |
| Hit calorie AND protein target | Stricter: cals ≥ target AND protein ≥ target. Highest streak-shame risk. | |

**User's choice:** Any meal entry exists (Recommended)

### PT quadrant fill criterion

| Option | Description | Selected |
|--------|-------------|----------|
| Any PTSession exists on that day | ≥1 PTSession row regardless of completion checkboxes. Matches STREAK-02 + Phase 2 D-11 "partial sessions are valid." | ✓ |
| All template exercises marked completed | Session exists AND every row has completed=true. Conflicts with Phase 2 D-11. | |
| At least one exercise completed | Session exists AND ≥1 exercise.completed=true. Middle ground. | |

**User's choice:** Any PTSession exists on that day (Recommended)

### Steps quadrant fill criterion

| Option | Description | Selected |
|--------|-------------|----------|
| Any step count entered | StepEntry exists on that dayKey, count > 0. Manual entry is already friction; rewards the log. | ✓ |
| Hit daily steps goal | StepEntry.count ≥ goals.steps. Punishes rest/injury/travel days. Feels punitive for rehab user. | |

**User's choice:** Any step count entered (Recommended)

### Lift quadrant fill criterion

| Option | Description | Selected |
|--------|-------------|----------|
| LiftCheckin.lifted === true | Only explicit YES fills the quadrant. Rest days neutral. Matches STREAK-02 literal + Pitfall #6. | ✓ |
| Any LiftCheckin record (yes or no) | Fills on any check-in, even explicit 'no'. Risks gaming 4/4 by toggling 'no'. | |

**User's choice:** LiftCheckin.lifted === true (Recommended)

### Zero-count StepEntry edge case

| Option | Description | Selected |
|--------|-------------|----------|
| Only count > 0 fills | Zero-count record is 'not logged for streak purposes.' Prevents gaming. | ✓ |
| Any StepEntry fills, including 0 | Simpler rule, but 0 steps = 'logged but sedentary' still fills the segment. | |

**User's choice:** Only count > 0 fills (Recommended)

### Rest-day handling for lift

| Option | Description | Selected |
|--------|-------------|----------|
| Can never be 4/4 on rest day — that's OK | No special affordance. Partial fill = positive progress (Pitfall #6). Simplest rule, no schema change. | ✓ |
| Add 'N/A'/rest-day state to Lift check-in | Third state: yes / no / rest. Requires Phase 2 schema reinterpretation + new UI affordance. | |
| Defer to post-v1 | Ship with (a), revisit after daily use. | |

**User's choice:** Can never be 4/4 on rest day — that's OK (Recommended)

**Notes:** Accepted tradeoff; partial fill (3/4) reads as strong progress. Path to reintroduce is clean if daily use shows it feels punitive — schema can widen without migrating existing data.

---

## DayCell geometry

### Shape

| Option | Description | Selected |
|--------|-------------|----------|
| 2×2 square quadrants | 4 quadrants, stable grid, good tap target on phone. Simplest geometry. | ✓ |
| 4-arc donut ring | Circular ring split at 12/3/6/9. Needs SVG arc math; arcs thin on small cells. | |
| Horizontal 4-segment pill | Thin bar under date. Clean but less distinctive than 2×2. | |
| Single whole-cell fill with alpha only | No quadrants; cell fills by count-alpha. Loses per-area signal. | |

**User's choice:** 2×2 square quadrants (Recommended)

### Alpha ramp interpretation (under 2×2)

| Option | Description | Selected |
|--------|-------------|----------|
| Per count: each filled quadrant uses count-based alpha | 1/4=25% alpha on the one filled quadrant, 2/4=50% on both filled, 4/4=100%. Honors D-17 literally. | ✓ |
| Per quadrant: each filled is always 100% | Simpler; filled=full accent, count conveyed by number of filled rectangles. Loses D-17 ramp signal. | |

**User's choice:** Per count: each filled quadrant uses count-based alpha (Recommended)

**Notes:** 4/4 is the only state that hits full accent saturation — makes complete days visibly pop on the month grid.

### Quadrant-to-area mapping

| Option | Description | Selected |
|--------|-------------|----------|
| NW=PT, NE=Food, SW=Steps, SE=Lift | Matches Today screen section order; reading order (L→R, T→B). | ✓ |
| NW=Food, NE=PT, SW=Lift, SE=Steps | Groups 'input' (food/PT) vs 'activity' (lift/steps). Breaks Today order. | |
| You decide | Claude picks consistent with Today screen order. | |

**User's choice:** NW=PT, NE=Food, SW=Steps, SE=Lift (Recommended)

**Notes:** LOCKED permanently. User builds a glance-map within a few days of use; permuting later would break the mental model.

### Date number placement

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay center in --muted | Floats centered over quadrants. Maximizes cell-as-indicator real estate. | ✓ |
| Below the cell, tiny label | Cell stays pure; ~30% more vertical space per row. | |
| Top-right corner overlay, small | NE-corner badge. Competes with the NE (Food) quadrant when filled. | |

**User's choice:** Overlay center in --muted (Recommended)

### Today cell indicator

| Option | Description | Selected |
|--------|-------------|----------|
| 1px accent ring around the whole cell | Today gets a 1px --accent outline regardless of fill state. Ring outside the 2×2. | ✓ |
| Date number in --text instead of --muted | Today's date brighter/white; all other dates muted. Text-only signal. | |
| Both ring AND bright date | Belt-and-suspenders today marker. | |

**User's choice:** 1px accent ring around the whole cell (Recommended)

### 4/4 day chrome

| Option | Description | Selected |
|--------|-------------|----------|
| No extra — full accent is the reward | Calm/minimal. Anti-gamification. Solid green square IS the signal. | ✓ |
| Subtle 1px accent border around 4/4 cells | Soft emphasis without color/motion. Collides with Today-ring visually. | |
| You decide | Claude chooses subtler option after seeing calendar in context. | |

**User's choice:** No extra — full accent is the reward (Recommended)

---

## Claude's Discretion

- Calendar grid layout details (week-start day, prev/next-month padding, cell gap, sticky header)
- Month navigation bounds (recommend upper=current month, lower=earliest dayKey across all 4 stores)
- Streak count display (position, typography, "finish today's 4th" positive framing)
- Day detail view delivery mechanism (recommend route `/#/day/YYYY-MM-DD`, per Phase 1 D-03 precedent, over Sheet modal)
- Day detail editability — past-day edit/delete is carried forward from Phase 2 CONTEXT; backdated **adding** of new logs is Claude's call during planning
- `streak.svc.ts` internal shape (range-query count, caching, return type)
- SVG vs div-based DayCell rendering
- Library choice (custom vs `react-activity-calendar` — the latter is a year-heatmap, likely wrong fit)
- Exact divider width / corner radius / cell aspect ratio

## Deferred Ideas

- Third lift state ("rest day" N/A)
- Year-view heatmap (INSIGHT-03, v2)
- Streak freeze / grace day / streak-shield (permanent Out-of-Scope)
- Badges / XP / achievements (permanent Out-of-Scope)
- Future-month navigation
- Backdated adding of NEW logs from day detail (default: defer; Claude may scope in if cheap)
- Streak count notifications / coaching copy (no notifications per REQUIREMENTS)
- Per-quadrant color coding (rejected Phase 1 D-17)
- DayCell motion on fill state change (rejected Phase 1 UI-SPEC)
