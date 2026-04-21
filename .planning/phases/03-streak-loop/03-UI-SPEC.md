---
phase: 3
slug: streak-loop
status: draft
shadcn_initialized: true
preset: shadcn zinc (new-york, cssVariables, baseColor zinc, lucide) — inherited from Phase 1 components.json
created: 2026-04-21
---

# Phase 3 — UI Design Contract

> Streak-loop design contract: the 4-segment month calendar, DayCell visual + interaction, streak-count component, day-detail screen, and the route-based navigation that connects them. **Extends** Phase 1 (`01-UI-SPEC.md`) and Phase 2 (`02-UI-SPEC.md`). Does NOT re-declare tokens, typography, spacing scale, color palette, anti-motion policy, accessibility baselines, responsive scope, or the Sheet pattern — those remain authoritative per Phases 1+2.

**Inheritance rule:** if a prior Phase UI-SPEC declared a value, Phase 3 uses it verbatim. Phase 3 only specifies NEW design contracts that arise from the month grid + DayCell + day detail + streak count. Any conflict is a bug — earlier phases win.

**Scope narrowness:** this spec covers the CalendarScreen layout (month header + streak count + month grid), the DayCell visual + interaction contract, the new DayDetail route (`/#/day/YYYY-MM-DD`), the StreakCount component, past-day edit/delete affordances (reusing Phase 2 services), and keyboard/screen-reader contracts for calendar navigation. JSON export, year-heatmap, streak freeze/badges, per-quadrant color variants, and any motion are explicitly out of scope (see CONTEXT.md `<deferred>`).

---

## Design System

Inherits from Phase 1 + 2 `components.json` — no changes.

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn (initialized Phase 1) | `components.json` |
| Preset | zinc / new-york / `cssVariables: true` / `iconLibrary: lucide` | Phase 1 D-15 + `components.json` |
| Component library | Radix (via shadcn/ui) | Phase 1 |
| Icon library | `lucide-react` | Phase 1 |
| Font | System stack | Phase 1 `index.css` |
| Theme | Dark only (`.dark` on `<html>`) | Phase 1 D-19 |
| Tokens | `src/styles/tokens.css` → Tailwind v4 `@theme` | Phase 1 D-18 |

### shadcn adds for Phase 3

**None.** Phase 3 ships no new shadcn components. The DayCell is a custom div/CSS primitive; StreakCount is typography on an existing layout; DayDetail reuses Phase 1 `<Card>` and Phase 2 `<MealEntryRow>` / edit affordances. The `react-activity-calendar` package installed in stack research is **not consumed** (Claude's Discretion decision below).

### npm adds for Phase 3

**None required.** Phase 3 introduces no new runtime dependencies. Dexie `.between()` + `useLiveQuery` (already installed) power the streak-range service.

### Library choice: why not react-activity-calendar

`react-activity-calendar` is a year-heatmap primitive (single-color intensity per cell, 52-week layout). Phase 3 needs a month-at-a-time grid with a 4-segment indicator per cell — an orthogonal shape. Bending the library into a 2×2 quadrant renderer would cost more than writing the grid directly (~150 LOC). **Decision: build `<MonthGrid>` + `<DayCell>` from scratch** in `src/features/calendar/`. Documented for planner.

---

## Spacing Scale

**Inherits Phase 1 UI-SPEC §Spacing Scale verbatim.** 8-point grid: 4 / 8 / 16 / 24 / 32 / 48 / 64, with 44×44 touch-target exception and 56px header exception (Phase 1).

### Phase 3 NEW fixed dimensions

| Element | Value | Rationale |
|---------|-------|-----------|
| Calendar screen horizontal padding | 16px (`px-4`) | Matches Today / Settings screen rhythm from Phase 1 |
| Month header height | 48px (`h-12`) | Single line: prev chevron · month label · next chevron — between 44-target and 56-header |
| Month-nav chevron tap target | 44×44 (`h-11 w-11`) | Accessibility minimum; 16px chevron glyph centered in 44-square |
| Streak count block vertical padding | 24px top, 16px bottom | Breathing room above grid; reads as hero above the month label |
| Grid container horizontal inset | 0px (chips run edge-to-edge of `max-w-md` column) | Maximizes cell area on iPhone 390 width |
| Grid column gap | 4px (`gap-1`) | Tight — cells must read as a unified surface, not a list |
| Grid row gap | 4px (`gap-1`) | Symmetric with column gap |
| Weekday-header row height | 32px (`h-8`) | Single line of 12px labels (`Sun` … `Sat`), center-aligned |
| Weekday-header bottom margin | 8px (`mb-2`) | Separates weekday labels from the first week row |
| DayCell aspect ratio | 1:1 (square) | Locked by D-07; stable across widths |
| DayCell today-ring width | 1px | Hairline; does not eat into cell area |
| DayCell today-ring offset | Outside cell (no inset) | D-11 — ring does not collide with quadrant fills |
| Day Detail header height | 56px (`h-14`) | Matches AppShell header; back affordance + date label + edit affordance |
| Day Detail section gap | 24px (`space-y-6`) | Four area sections (PT/Food/Steps/Lift) stacked with strong visual separation |
| Day Detail section card padding | 16px (`p-4`) | Inherits Phase 1 Card rhythm |
| Day Detail meal/exercise row min height | 48px | Reuses Phase 2 `MealEntryRow` default |

**DayCell size:** computed from the 7-column grid inside `max-w-md` (448px) minus `px-4` (32px) minus 6 gaps × 4px (24px) = `(448 − 32 − 24) / 7 ≈ 56px` per cell on tablet+. On iPhone 390 screen: `(390 − 32 − 24) / 7 ≈ 47.7px`. Both exceed the 44×44 touch-target minimum. **DayCell is always a square** — `aspect-square` on each grid item.

**Exceptions:** 44×44 chevron targets and the 1px today-ring hairline override the 4-multiple rule. No other exceptions.

---

## Typography

**Inherits Phase 1 UI-SPEC §Typography verbatim.** Display 20/600, Heading 16/600, Body 14/400, Label 12/400 — plus the Phase 2 Body-semibold 14/600 exception (PT exercise name; carries forward into Day Detail where it reuses the same PT exercise row).

### Phase 3 role assignments (NEW consumers)

| Surface | Role | Size / weight / color | Rationale |
|---|---|---|---|
| Streak count number | Display (20/600/`--text`) | e.g. "12" | Hero numeric — the motivator; sits above everything else on CalendarScreen |
| Streak count noun suffix | Body (14/400/`--muted`) | "day" / "days" | Recedes so the number pops; never accent-colored — per D-12 anti-chrome |
| Streak count subtitle (today-not-yet-complete) | Label (12/400/`--muted`) | "finish today's 4th to extend" | Non-punitive, forward-looking; never blocks the count itself |
| Month label | Heading (16/600/`--text`) | "April 2026" | Matches card-title role from Phase 1; month + year, no abbreviation |
| Month-nav chevron | (icon only) | Lucide `ChevronLeft` / `ChevronRight` 20px, `--muted` (active) or `--border` (disabled-clamped) | No text label; `aria-label` required |
| Weekday header | Label (12/400/`--muted`) uppercase via `uppercase tracking-wide` | `Sun` `Mon` `Tue` `Wed` `Thu` `Fri` `Sat` | Classifier row; matches Phase 2 section-label treatment |
| DayCell date number | Label (12/400/`--muted`) | `1` … `31` | Overlaid geometric center (D-10) on top of whatever quadrant fill sits behind |
| DayCell date number (padded prev/next-month) | Label (12/400/`--border`) | `30` `31` `1` `2` | One shade dimmer than current-month date to signal "not in this month" |
| Day Detail screen date label | Heading (16/600/`--text`) | e.g. "Tuesday, April 21" | Positioned center of Day Detail header between back + edit slots |
| Day Detail section title | Heading (16/600/`--text`) | `PT` / `Food` / `Steps` / `Lift` | Matches Today-card titles verbatim (no "logged", no "history" suffix) |
| Day Detail "no logs" row | Body (14/400/`--muted`) | "No PT logged on this day." | Positive-framed per area; see Copywriting Contract |
| Day Detail edit/delete action | Body (14/400/`--muted`) for Edit; Body (14/400/`#ef4444`) for Delete | Inline actions within each log row | Inherits Phase 2 destructive-color convention |

**No new font sizes or weights declared.** The Phase 1 4-role / 2-weight rule + Phase 2 Body-semibold exception are the entire typography surface for Phase 3.

---

## Color

**Inherits Phase 1 + 2 UI-SPEC §Color verbatim.** Zinc dark palette (`--bg` `#09090b`, `--surface` `#18181b`, `--border` `#27272a`, `--muted` `#a1a1aa`, `--text` `#fafafa`) + accent `#22c55e` + destructive `#ef4444`.

### Phase 3 60 / 30 / 10 audit

| Role | Value | Phase 3 usage (additions on top of Phase 1+2 usage) |
|------|-------|----------------------------------------------------|
| Dominant (60%) | `--bg` `#09090b` | CalendarScreen body background, DayCell unfilled quadrants fall back to `--surface`; `--bg` shows in grid gaps (4px gutters between cells read as background) |
| Secondary (30%) | `--surface` `#18181b` | **DayCell unfilled quadrant background**, DayCell base color when 0/4, Day Detail card backgrounds, month header background (continuous with page bg, no separate fill), DayDetail sticky header background |
| Border | `--border` `#27272a` | Day Detail card outlines, PT/Food/Steps/Lift section separators on Day Detail, DayCell padded (prev/next-month) date number color |
| Muted text | `--muted` `#a1a1aa` | DayCell current-month date number (D-10), weekday headers, month-nav chevrons, streak-count noun suffix, streak-count subtitle, "No X logged" empty copy, Day Detail back/edit labels |
| Primary text | `--text` `#fafafa` | Streak-count number, month label, Day Detail section titles, Day Detail log row content |
| Accent (10%) | `--accent` `#22c55e` | See reserved-for list below |

### Accent reserved for (Phase 3 — ADDITIVE to Phase 1+2)

Phase 1 reserved accent for: active tab indicator, Install-banner button, focus ring.
Phase 2 added: progress-bar fill, Sheet footer primary button, checkbox checked state.

Phase 3 adds these ONLY:

1. **DayCell quadrant fill via alpha ramp (D-09 LITERAL):** filled quadrants render at `--accent` with alpha count-based, via tokens already declared in `src/styles/tokens.css`:
   - 1/4 segments filled that day → every filled quadrant uses `--accent-25` (`rgba(34,197,94,0.25)`)
   - 2/4 → `--accent-50`
   - 3/4 → `--accent-75`
   - 4/4 → `--accent-100` (= `--accent`, solid)
   - 0/4 → no quadrant rendered with accent; all four read `--surface`
2. **Today-cell ring (D-11):** 1px outer ring at `--accent`. Applied on today's cell regardless of fill count (including 0/4). Never animated.

Accent is NOT used in Phase 3 for:
- Streak count number (stays `--text` per anti-chrome stance — D-12)
- Streak count subtitle or noun
- Month-nav chevrons (stay `--muted` active / `--border` disabled)
- DayCell date number (stays `--muted` always, even inside a 4/4 fill — contrast check below)
- Day Detail header date label or section titles
- Day Detail edit affordance
- Weekday header labels
- Month label
- Any background fill outside the DayCell quadrant system

### DayCell-specific color contracts

**Unfilled quadrant color:** `--surface` (`#18181b`), NOT `--bg`. Quadrants must stand against the `--bg` grid gutters so the cell reads as a single unit. The 4px gap between cells uses `--bg` as the gutter color (no explicit fill).

**4/4 day chrome (D-12 LOCKED):** **none.** The solid `--accent` fill IS the reward. No border, no ring (except the today-ring when today==4/4), no glow, no emoji, no badge. A 4/4 day is simply a solid green square with the date number overlaid in `--muted`.

**Today + 4/4 collision:** the 1px `--accent` ring sits OUTSIDE the 2×2 grid (CSS `box-shadow: 0 0 0 1px var(--accent)` or `outline: 1px solid var(--accent); outline-offset: 0`). The ring does not share pixels with any quadrant fill. When today IS 4/4, the ring appears as a hairline accent outline around a solid accent square — visually it disappears into the fill, which is correct: the fill already signals "you did it today." No special-case logic required.

**Never-red rule (Pitfall #6 LOCKED):** zero-log days render as four `--surface` quadrants with the date number in `--muted` — **identical** to any not-yet-completed state. There is no "broken streak" cell. Red (`#ef4444`) is reserved for destructive actions on Day Detail only; it never appears in the calendar grid.

**Prev/next-month padded cells:** a calendar row at the start/end of the month includes up to 6 cells from the adjacent months. These render as `--surface` four-quadrant background (same as any 0/4 day) with the date number at `--border` color (one shade dimmer than `--muted`). They are NOT clickable — tapping them is a no-op (no route change). Rationale: the month-grid is 6 rows × 7 cols = 42 cells for layout stability across months; greying out keeps the rhythm without triggering confusion about which month owns that date.

### Contrast spot-checks (Phase 3 NEW pairs)

All text-on-fill combinations must keep the date number legible at 12/400 size:

- Date number `--muted` (`#a1a1aa`) on `--surface` (`#18181b`): 8.4:1 (AAA) — inherited from Phase 1
- Date number `--muted` on `--accent-25` (`rgba(34,197,94,0.25)` over `#18181b`, effective composite `~#222722`): ~7.9:1 (AAA)
- Date number `--muted` on `--accent-50` (composite `~#1e4221`): ~6.1:1 (AA)
- Date number `--muted` on `--accent-75` (composite `~#206935`): ~4.2:1 (AA large-text; 12px is below AA for small-text 4.5:1)
- Date number `--muted` on `--accent-100` (`#22c55e`): 3.1:1 (**FAIL AA for normal text 4.5:1**) — but: at 4/4 the visual reward is the green fill, not the date number; the number becomes a subordinate location label on a highly-saturated surface. **Accepted tradeoff** per the anti-chrome stance (D-12: fill IS the reward). The date number stays `--muted` for visual consistency across all 5 fill states rather than special-casing 4/4 to a different text color. Alternative considered: darken date number to `--bg` at 4/4 for 10:1 contrast — rejected because it introduces a color-swap on the single state that's supposed to read "silent win," which would feel like chrome.
- Date number against prev/next-month padded cell color (`--border` `#27272a` on `--surface` `#18181b`): not a text-on-fill case; `--border` text serves as a visible-but-recessed date indicator. Contrast `--border` on `--surface`: ~1.4:1. **Intentionally low** — these cells are navigational padding; the date number is a spatial cue, not readable content. Screen readers announce them via aria-label regardless.

**Decision:** leave the date number at `--muted` across all 5 fill states (0 through 4). Accept the 3.1:1 contrast on 4/4 as an intentional design choice reinforcing "the fill is the message." Document in checker sign-off.

### Destructive color

Phase 3 reuses Phase 2's destructive `#ef4444` ONLY for:
- Day Detail `Delete` inline action on past-day meal/PT/step/lift row edits
- No other Phase 3 surface

No red in the calendar grid. No red on streak count regardless of state.

---

## Copywriting Contract

Phase 3 is mostly visual, but locked copy exists for streak count, month navigation, and Day Detail surfaces. Executor must use these exact strings.

### Streak count component

| State | Number | Suffix | Subtitle | Example render |
|-------|--------|--------|----------|----------------|
| 0 consecutive complete days (no 4/4 ever, or streak broken at yesterday) | `0` | `days` | `log all 4 areas today to start a streak` | `0 days` + subtitle |
| 1 consecutive complete day (today is 4/4 and yesterday was not, OR yesterday was 4/4 and today is still partial) | `1` | `day` | (hidden when today is 4/4) OR `finish today's 4th to extend` (when today is partial and streak counts yesterday only) | `1 day` |
| N consecutive complete days (N ≥ 2), today is 4/4 | `{N}` | `days` | (hidden — today is complete, nothing to prompt) | `12 days` |
| N consecutive complete days (N ≥ 2), today is NOT 4/4 yet | `{N}` | `days` | `finish today's 4th to extend` | `12 days` + subtitle |
| Today is 4/4 AND is the most-recent complete day (streak semantics: count backwards from today inclusive) | `{N}` | `days` if N≠1 else `day` | hidden | `1 day` or `{N} days` |

**Streak semantics (LOCKED):**
- Count = consecutive 4/4 days ending at the most-recent 4/4 day.
- If today is 4/4, today is the endpoint and is included in the count.
- If today is NOT 4/4 (i.e. 0/4, 1/4, 2/4, or 3/4), the endpoint is yesterday; today is NOT counted. The subtitle "finish today's 4th to extend" encourages completion without presenting today as a broken-day (positive framing, anti-Pitfall #6).
- If the most-recent 4/4 day is more than 1 day before today (streak genuinely broken), count = 0 and subtitle = "log all 4 areas today to start a streak".

**Banned streak phrasings** (all of these would violate anti-gamification / anti-streak-anxiety):
- "Streak lost" / "Streak broken" / "Streak ended" — NEVER.
- "You missed a day" — NEVER.
- Flame emoji 🔥, fire, rocket, or any emoji — NEVER (matches D-12 anti-chrome).
- "Don't break the chain" — NEVER.
- "N-day streak!" with exclamation — use plain `N days` without punctuation.
- Color-highlighting the number red or orange on low values — NEVER (all states use `--text`).

### Month navigation

| Element | Copy |
|---------|------|
| Prev-month button `aria-label` | `Previous month` |
| Next-month button `aria-label` | `Next month` |
| Next-month button when clamped at current month | still `Next month` but `aria-disabled="true"` + visually `--border` color + non-clickable |
| Prev-month button when clamped at earliest-data month | `Previous month` + `aria-disabled="true"` + `--border` color + non-clickable |
| Month label format | `{MonthName} {YYYY}` — e.g. `April 2026` (no abbreviation, full year always) |
| Screen-reader month-change announcement | On month change, the month label is the heading-of-section, so screen readers announce on focus. No explicit live-region announcement needed. |

**Navigation clamps:**
- Upper bound: the month containing today. Future-month navigation is blocked. Rationale: future cells can't have logs and render as an empty 42-cell grid, which adds no value.
- Lower bound: the month containing the earliest `dayKey` present across `ptSessions`, `mealEntries`, `stepEntries`, `liftCheckins`. If no logs exist anywhere, lower bound equals upper bound (only current month navigable). Implementation: `streak.svc.ts:getEarliestDayKey()` returns `min()` across 4 tables; `MonthGrid` hides prev-chevron when current view equals this month.

### DayCell

| Element | Copy |
|---------|------|
| DayCell `aria-label` (current-month cell) | `{Weekday}, {Month} {Day} — {filledCount} of 4 logged: {areasFilledList}` — e.g. `Tuesday, April 21 — 3 of 4 logged: PT, food, steps` |
| DayCell `aria-label` (0 of 4) | `{Weekday}, {Month} {Day} — no logs` |
| DayCell `aria-label` (4 of 4) | `{Weekday}, {Month} {Day} — all 4 logged` |
| DayCell `aria-label` (today suffix) | append `, today` at end of any of the above: e.g. `Tuesday, April 21 — 3 of 4 logged: PT, food, steps, today` |
| DayCell `aria-label` (prev/next-month padded cell) | same format but prefixed with the correct month — clickable=false implies screen reader announces it but tapping is a no-op; we still render the label so spatial navigation with a screen reader is coherent. Padded cells use `aria-disabled="true"`. |
| `areasFilledList` vocabulary | lowercase comma-separated list from the set `{PT, food, steps, lift}`. Never pluralize. Never add emojis. Order: always NW→NE→SW→SE (PT, food, steps, lift) matching D-08 quadrant mapping for mental-model consistency. |

### Day Detail screen (`/#/day/YYYY-MM-DD`)

| Element | Copy |
|---------|------|
| Route | `/#/day/YYYY-MM-DD` — e.g. `/#/day/2026-04-21` |
| Back affordance (top-left header slot) | Lucide `ChevronLeft` icon 20px `--muted` + text `Back` (Body role). `aria-label="Back to calendar"`. `onClick` = `navigate(-1)` OR `navigate('/calendar')` if no history. |
| Date label (header center) | `{Weekday}, {Month} {Day}` — e.g. `Tuesday, April 21` (no year; year is visible in calendar month header one tap back). Heading role. |
| "Today" suffix (when the detail is today's) | append ` (today)` in `--muted` Label role after the date — e.g. `Tuesday, April 21 (today)` |
| Right-side header slot | **empty in Phase 3.** No "Edit" top-level button; edit affordances live inline on each log row. Reserved for Phase 4 (possible "Export day" link). |
| Summary row below header | `{filledCount} of 4 logged` — Body role, `--muted`, centered below date label. For 0 days: `no logs yet`. For 4: `all 4 logged` |
| PT section title | `PT` (Heading role) |
| PT "no logs" copy | `No PT session logged on this day.` (Body/`--muted`) |
| PT session row | Reuses Phase 2 PT row layout: template name (Body-semibold) · session count "N exercises" (Label/`--muted`). Tap = open PT Session sheet in edit mode (reuses Phase 2 PTSessionForm + `updateSession` via `saveSession` — existing service). |
| PT session row delete | trailing `Delete` text action (destructive color, Body role) — immediate delete, no confirm (inherits Phase 2 D-04 convention). `aria-label="Delete PT session"`. |
| Food section title | `Food` (Heading role) |
| Food "no logs" copy | `No meals logged on this day.` |
| Food section subhead (macro totals) | `{cals} cal · {p}g P · {c}g C · {f}g F` — Body role, `--muted`, one line. Computed against CURRENT goals per Phase 2 D-14. Example: `1420 cal · 102g P · 148g C · 52g F`. Omit the totals row if zero entries. |
| Food meal entries | Grouped by bucket (`Breakfast`, `Lunch`, `Dinner`, `Snack`) — reuses Phase 2 D-18 section-grouped layout. Each row reuses Phase 2 `MealEntryRow` with inline-edit + delete (existing `updateMealEntry` / `deleteMealEntry` services). |
| Steps section title | `Steps` (Heading role) |
| Steps "no entry" copy | `No steps logged on this day.` |
| Steps entry row | `{count} steps` (Body role) + inline edit affordance (tap to reveal number input — same pattern as Phase 2 `StepsInlineInput`). Goal comparison NOT shown on past days (Phase 2 progress-bar logic applies only to today; Day Detail shows raw count + optional muted `against {stepsTarget}-step goal` suffix when target > 0, per D-14 current-goals policy). |
| Steps entry delete | trailing `Delete` text action — destructive color. Deletes the `stepEntries` record for that `dayKey`. `aria-label="Delete step entry"`. |
| Lift section title | `Lift` (Heading role) |
| Lift "no entry" copy | `No lift check-in on this day.` |
| Lift entry row (lifted=true) | `✓ Lifted` in accent-colored glyph + `--text` label. If note present, second line: `{note}` in Body/`--muted`. |
| Lift entry row (lifted=false explicit) | `☐ Rest day` in `--muted` glyph + `--muted` label (explicit non-lifted record). Never "missed" — wording stays neutral. |
| Lift entry edit | tap the row to toggle lifted OR open note editor — reuses Phase 2 `LiftToggle` + `LiftNoteInput` components inline. |
| Lift entry delete | trailing `Delete` — removes the `liftCheckins` record entirely for that `dayKey`. `aria-label="Delete lift check-in"`. |

### Past-day edit + delete scope (inherits Phase 2 D-20 `<deferred>`)

- **Meal entries:** edit servings + bucket only (Phase 2 D-20 immutable `foodId`). Delete removes the record. Reuses `updateMealEntry` / `deleteMealEntry`.
- **PT sessions:** tap to open PT Session Sheet in edit mode — full edit surface (actuals, pain, notes). Delete removes the session. Reuses `saveSession` (upsert by id).
- **Step entries:** inline number input (same as Today). Delete removes the record. Uses `upsertSteps` for edit; new service function `deleteSteps(dayKey)` needed — additive 1-line service.
- **Lift check-ins:** toggle + note — same affordances as Today's card. Delete removes the record. New service function `deleteLift(dayKey)` needed — additive 1-line service.

**Adding NEW past-day logs (backdated)** — **DEFERRED per CONTEXT.md `<deferred>`.** Day Detail is edit/delete-only in Phase 3. Rationale: keeps the surface focused, reduces planner scope, and defers a design question (how to surface "add new" affordance on a day that already has some logs but not others). Not in Phase 3; re-evaluate post-v1.

### Destructive confirmations

**NONE — inherits Phase 2 D-04 stance.** Delete on Day Detail is immediate, no modal. Rationale carries from Phase 2:
1. Every modal adds friction.
2. No undo primitive ships until the day it's actually needed.
3. Per-log deletion is low-stakes (user can re-log).
4. Phase 4 JSON export is the safety net for catastrophic loss.

### Primary CTAs in Phase 3

Phase 3 has NO new primary CTAs — the interface is navigational (tap a DayCell, navigate to a day, edit/delete inline). Locked verbs inherited:
- `Back` (Day Detail header)
- `Save` / `Save session` / `Save goals` etc. (inherited from Phase 2 when an edit Sheet opens from Day Detail)
- `Delete` (destructive inline)
- `Cancel` (ghost)

**Banned in Phase 3:** `Complete`, `Finish`, `Done day`, `Confirm day`, `Celebrate`, `Share` — nothing implies celebration or social output.

### Empty states

| Surface | Copy |
|---|---|
| Calendar — no logs ever (month grid renders but all cells 0/4) | Streak count shows `0 days` + subtitle `log all 4 areas today to start a streak`. No separate empty-state banner on the grid. The grid itself showing all-`--surface` cells IS the empty state. |
| Day Detail — no logs that day | Each section shows its "No X logged on this day." line (see Copywriting table above). No illustrations, no graphics. |
| Month nav — earliest data is current month | Prev-chevron shows disabled (`--border` color + `aria-disabled`). No error copy. |

### Error states

| Source | Behavior |
|--------|----------|
| Dexie range-query failure | Silent + `console.error` (inherits Phase 1+2 pattern). Calendar grid renders as if no logs exist for the month; user can pull to refresh (i.e., navigate away + back). No toast. |
| Invalid `/#/day/{badkey}` route | Redirect to `/#/calendar` silently. Or render Day Detail with "No logs on this day." — both acceptable; planner picks based on simplicity. Recommended: redirect if date doesn't parse as a valid `YYYY-MM-DD`; render empty-state if it does parse (even for future or very-old dates — user may have pasted a URL). |
| Delete fails mid-op | Silent + console; row stays in DOM. User can retry. |

---

## Layout & Component Contracts

### CalendarScreen layout

Structure (top → bottom), inside AppShell `max-w-md` column at `px-4`:

```
┌──────────────────────────────┐
│                              │  (safe-area-top via AppShell header — already handled)
│  StreakCount                 │  pt-6 pb-4 — 24px top, 16px bottom
│     12                       │  Display role (20/600)
│     days                     │  Body role (14/400/muted)
│     finish today's 4th...    │  Label role (12/400/muted) — conditional subtitle
│                              │
├──────────────────────────────┤
│ ◀    April 2026         ▶   │  Month header, h-12, border-b (border)
├──────────────────────────────┤
│ SUN MON TUE WED THU FRI SAT │  Weekday headers, h-8, 12px uppercase muted
│                              │
│  .  .  .  1  2  3  4         │  Week 1 (prev-month padding in .)
│  5  6  7  8  9  10 11        │  Week 2
│  12 13 14 15 16 17 18        │  Week 3
│  19 20 21 22 23 24 25        │  Week 4 — cell 21 has today-ring if today
│  26 27 28 29 30  .  .        │  Week 5 (next-month padding)
│  .  .  .  .  .  .  .         │  Week 6 (all-padding, renders only if needed)
│                              │
│                              │  grid-gap 4px, aspect-square cells
└──────────────────────────────┘
```

- Root: `<div className="px-4">` inside AppShell's `max-w-md` column.
- Week-start: **Sunday** (US convention, user is US-based per CLAUDE.md — Anirudh primary device iPhone US locale). Hardcoded; no locale resolution in Phase 3.
- Grid is always 6 rows × 7 cols = 42 cells to keep layout stable across months. Shorter months render the final row(s) as padding/next-month cells.
- Padding cells (prev/next-month) ARE rendered (muted date number, `--border` color), NOT blank — Claude's Discretion resolution: rendered padded cells keep the 7-column visual rhythm and help with spatial/keyboard nav.
- Month header is NOT sticky — scrolls with the grid. CalendarScreen is a single non-scrolling viewport on most phones (streak count + header + 6 rows × ~48px = ~420px, fits within `100dvh - AppShell header - TabBar`). If overflow occurs on very small devices, the screen scrolls as a unit.

### StreakCount component

| Property | Value |
|---|---|
| Component | `<StreakCount />` custom (`src/features/calendar/StreakCount.tsx`) |
| Data source | `useStreakCount()` hook (wraps `streak.svc.ts:getCurrentStreakCount()`) via `useLiveQuery` |
| Layout | Centered block: number on its own line (large), noun on its own line right below (small), optional subtitle below noun |
| Number typography | Display 20px / 600 / `--text` (reused from Phase 1) — NOT scaled up to 48px or similar hero-size, per anti-chrome stance. Calm, reads as "12 days" not "**12 DAYS!**" |
| Number alignment | Center-aligned horizontally within the column |
| Tabular-nums | Yes (`tabular-nums` class) — number should not jiggle when count changes digit-width |
| Loading state | While `useLiveQuery` returns `undefined`, render `0 days` + subtitle as zero-state. Same as D-13 no-data (Phase 2 initApp pattern). No spinner. |
| Transition on count change | **None.** Instant text swap. Per anti-motion policy. |
| ARIA | `role="status" aria-live="polite"` so screen readers announce updates to the count when the user logs a 4/4 completing meal from elsewhere in the app. `aria-label` on wrapper: `Streak: {N} {day|days}` |

### MonthHeader component

| Property | Value |
|---|---|
| Component | `<MonthHeader month year onPrev onNext prevDisabled nextDisabled />` |
| Layout | `flex items-center justify-between h-12 border-b border-border` |
| Left chevron button | 44×44 tap area; Lucide `ChevronLeft` 20px; `--muted` active / `--border` disabled |
| Month label | Heading role, centered in the flex row |
| Right chevron button | symmetric to left |
| Focus state | Phase 1 `focus-visible:ring-2 focus-visible:ring-accent` on each chevron |
| Keyboard | Left chevron focused + Enter = prev month; Right chevron + Enter = next month. Additional grid-level keys below. |

### WeekdayHeader component

| Property | Value |
|---|---|
| Layout | 7-column grid matching the day grid below: `grid grid-cols-7 gap-1` |
| Row height | 32px (`h-8`) |
| Bottom margin | 8px (`mb-2`) |
| Cell content | `Sun` `Mon` `Tue` `Wed` `Thu` `Fri` `Sat` — 12px uppercase tracking-wide, `--muted` |
| Cell alignment | `flex items-center justify-center` |
| ARIA | `aria-hidden="true"` on the whole row — decorative; DayCell aria-labels include the weekday name so screen readers don't need this redundantly |

### MonthGrid component

| Property | Value |
|---|---|
| Layout | `grid grid-cols-7 gap-1` |
| Rows | 6 rows always (42 cells), auto-layout via `grid-template-rows: repeat(6, 1fr)` with `aspect-square` on cells |
| Data source | `useMonthStreakData(year, month)` hook — calls `streak.svc.ts:getStreakDataForRange(startKey, endKey)` with a range covering the 42-cell window (grid start = the Sunday on or before the 1st of the month; grid end = the Saturday on or after the last day of the month). One `useLiveQuery` subscription refreshes the whole month when any of the 4 source tables changes. |
| Loading state | While data is `undefined`, render 42 cells all as 0/4 `--surface` (same as empty-state). No skeleton, no spinner. First render is < 30ms on local IDB. |
| ARIA | wrapper `role="grid" aria-label="April 2026 activity calendar"`; each cell `role="gridcell"` |
| Keyboard navigation | Arrow keys move focus within the grid (Up/Down = ±7 cells, Left/Right = ±1 cell). Enter/Space on a focused current-month cell navigates to `/#/day/{cellDayKey}`. On padded cells (prev/next-month), Enter is a no-op. Moving focus past the current-month boundary into a padded cell is allowed; moving further (arrow out of the 42-cell grid) moves focus to the month-header chevrons (prev-chevron on left/up exit from week 1 col 0; next-chevron on right/down exit from week 6 col 6). |
| Focus management | Single tab-stop into the grid (roving tabindex): on initial mount, focus target is today's cell if it's in view, else the 1st-of-month cell. |

### DayCell component (the load-bearing Phase 3 primitive)

This is the one component the whole phase hinges on. Spec is prescriptive.

| Property | Value |
|---|---|
| Component | `<DayCell dayKey filled today inMonth />` in `src/features/calendar/DayCell.tsx` |
| Props | `dayKey: string` (the YYYY-MM-DD this cell represents); `filled: { pt: boolean; food: boolean; steps: boolean; lift: boolean }` (from streak service); `today: boolean`; `inMonth: boolean` (false = prev/next-month padded) |
| Root element | `<button type="button">` — HTML button semantics for keyboard + screen reader affordance. Current-month cells have `onClick={() => navigate(\`/day/${dayKey}\`)}`. Padded cells use `disabled` + `aria-disabled="true"` + `onClick` no-op. |
| Rendering approach | **Div + CSS grid** (not SVG). Rationale: 42 cells × 4 quadrants rendered as nested divs with background-color is simpler, performs fine, supports future quadrant-hover states without SVG event plumbing. Decision documented for planner. SVG would also work; planner may swap if measuring a perf regression. |
| Root styles | `aspect-square relative` — square, positioning context for today-ring + date-number overlay |
| Quadrant layout | Inner `<div className="grid grid-cols-2 grid-rows-2 h-full w-full">` with 4 child divs (no gap). Each child div is one quadrant. |
| Quadrant NW | PT quadrant. CSS `background-color: {filled.pt ? getAccentAlpha(filledCount) : 'var(--surface)'}` |
| Quadrant NE | Food quadrant |
| Quadrant SW | Steps quadrant |
| Quadrant SE | Lift quadrant |
| `getAccentAlpha(n)` | JS helper returning `var(--accent-25)` / `var(--accent-50)` / `var(--accent-75)` / `var(--accent-100)` for `n={1,2,3,4}`. For `n=0`, returns `var(--surface)` (no accent). |
| Date-number overlay | Absolutely positioned at geometric center: `absolute inset-0 flex items-center justify-center pointer-events-none`. Text: `{day-of-month number}`. Color: `--muted` for current-month, `--border` for padded. Size: 12/400 (Label role). `tabular-nums` so 1-digit vs 2-digit don't jiggle. |
| Today ring | When `today === true`, add `outline: 1px solid var(--accent); outline-offset: 0` to the root button. `outline` (not `box-shadow` or `border`) keeps the ring outside the 2×2 grid and doesn't offset children. |
| Focus state | `focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2` — stronger than the today-ring (2px vs 1px, offset by 2px) so it's distinguishable. When today-cell is focused, the focus ring replaces the today-ring visually (CSS handles this via outline precedence — focus-visible overrides default outline). Acceptable because both use `--accent`. |
| Hover state (desktop only) | None — no hover highlight. Rationale: DayCells are status displays, not interactive buttons that invite hover. Tap feedback via `active:` only. |
| Active (pressed) state | `active:brightness-90` — very subtle 10% darken during press, no transition. Applies to current-month cells only; padded cells are `disabled` and don't get press feedback. |
| Transition | **None.** No CSS transition on any property. Alpha-ramp changes are instant. Per anti-motion policy (Phase 1) + strict Phase 3 anti-gamification stance. |
| `aria-label` | See Copywriting Contract §DayCell row for exact format |
| `aria-disabled` on padded | `aria-disabled="true"` on prev/next-month cells (do not render as `<button disabled>` alone — screen readers benefit from explicit aria too) |
| `tabIndex` | roving tabindex managed by MonthGrid parent (see Keyboard section above) |
| Touch target | cell is already ≥ 47px square on iPhone 390 (computed above); meets 44×44 minimum |
| Visual state table | 5 states × today-variant × padded-variant |

#### DayCell visual state matrix (for executor + checker reference)

| filledCount | Quadrant fills (NW/NE/SW/SE) | Today variant | Padded variant |
|---|---|---|---|
| 0/4 | all 4 quadrants `--surface` | adds 1px accent ring outside | date number color `--border` instead of `--muted`; no today variant (padded cells are never today; today is always in-month) |
| 1/4 | only filled area's quadrant uses `--accent-25`; other 3 `--surface` | adds 1px ring | same |
| 2/4 | both filled areas' quadrants use `--accent-50`; other 2 `--surface` | adds 1px ring | same |
| 3/4 | three filled areas' quadrants use `--accent-75`; one `--surface` | adds 1px ring | same |
| 4/4 | all 4 quadrants `--accent-100` (= solid `#22c55e`) | 1px ring sits outside the solid fill — visually a hairline accent outline on accent. No other chrome. | same |

**Critical invariant:** a quadrant's ALPHA depends on the TOTAL filled count for that day, not which quadrant it is. A 3/4 day where PT is filled shows PT at `--accent-75`; a 1/4 day where only PT is filled shows PT at `--accent-25`. This is D-09 verbatim.

### DayDetail route layout

Route: `/#/day/YYYY-MM-DD` (register in `App.tsx` Routes). Rendered as a standalone screen inside AppShell (shares header, banners, tab bar — but tab bar is NOT hidden; user can navigate away to Today/Settings from a Day Detail view. Calendar tab stays highlighted as the active tab since Day Detail is a child of Calendar in the navigation tree).

Structure (top → bottom), inside AppShell `max-w-md` column at `px-4 py-6`:

```
┌──────────────────────────────┐
│ ← Back  Tuesday, April 21    │  Day Detail header, h-14, border-b
│         (today)              │  (subtitle, optional)
├──────────────────────────────┤
│                              │
│      3 of 4 logged           │  Summary row, py-4, --muted Body
│                              │
│  ┌────────────────────────┐  │
│  │ PT                     │  │  Section card (Phase 1 Card), p-4
│  │                        │  │
│  │ Upper Body · 5 exercises│  │  PT session row (Body-semibold name)
│  │ [tap to edit] [Delete] │  │  inline edit affordance
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Food                   │  │
│  │ 1420 cal · 102g P · …  │  │  Totals subhead (Body/muted)
│  │                        │  │
│  │ Breakfast              │  │  Bucket subgroup (Label role, uppercase)
│  │ Eggs · 2× 1 egg        │  │  Reuses Phase 2 MealEntryRow
│  │ …                      │  │
│  │ Lunch  (em-dash if empty)│  │
│  │ …                      │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Steps                  │  │
│  │ 6400 steps             │  │  or "No steps logged…"
│  │ against 8000-step goal │  │  optional muted suffix (D-14)
│  │ [tap to edit] [Delete] │  │
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │ Lift                   │  │
│  │ ✓ Lifted               │  │  or "☐ Rest day" or "No lift check-in…"
│  │ {note if present}      │  │
│  │ [tap to edit]          │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

- Screen is `overflow-y-auto` inside AppShell's main; long days scroll.
- Section order fixed: **PT, Food, Steps, Lift** — matches Today screen order + DayCell quadrant order (D-08).
- Each section is a Phase 1 `<Card>` (`bg-surface border border-border rounded-lg p-4`), with section title at top.
- Sections render even when empty (show "No X logged on this day." body). Rationale: the 4-section structure should be predictable/scannable — hiding sections based on data would break the mental model mirror with the DayCell quadrants.

### DayDetailHeader component

| Property | Value |
|---|---|
| Layout | `flex items-center justify-between h-14 border-b border-border px-0` |
| Left slot | Back affordance: icon + `Back` label (Body role). `-ml-2` to optically align chevron with screen edge. 44×44 tap target via `p-2`. |
| Center slot | Date label (Heading role) + optional `(today)` Label suffix stacked tightly |
| Right slot | EMPTY in Phase 3. (Keeps layout symmetric; Phase 4 may add an "Export day" action here.) |
| Sticky | No — scrolls with content |
| Background | `--bg` (continuous with page bg, no separate surface) |

---

## Interaction & Motion

**Inherits Phase 1 + 2 anti-motion policy verbatim.** No animations on route changes, DayCell fills, streak count updates, month transitions, or Day Detail loads.

### Phase 3 specific motion bans (explicit, additive)

| Interaction | Motion contract |
|---|---|
| DayCell fill update (useLiveQuery refreshes after a new log elsewhere) | **Instant color swap** on all 4 quadrants. No CSS transition. No fade. No "pulse to celebrate 4/4." |
| Today-ring render | **Instant.** No pulse, no breathing, no glow. 1px static outline. |
| Streak count number change (e.g. "11 days" → "12 days" after completing today) | **Instant text swap.** No count-up animation, no digit-flip. |
| Month navigation (prev/next chevron tap) | **Instant grid replacement.** No horizontal slide, no fade. The `MonthGrid` unmounts and remounts with new month's data. |
| Day Detail enter/exit | **Instant route change.** No slide-in from right, no fade. Inherits Phase 1 route-change policy. |
| DayCell press | Native + `active:brightness-90` only. No ripple, no scale-down, no shadow. |
| Padded-cell tap (prev/next-month) | No visual feedback whatsoever — they are `disabled`. |
| 4/4 completion "celebration" | **NONE.** Per D-12, there is no completion indicator beyond the solid fill. No confetti, no sound, no haptic, no toast. The solid accent square appearing IS the reward. |
| `prefers-reduced-motion` | Since Phase 3 ships zero motion, no media-query logic required. Document in code comments that the anti-motion stance makes this a no-op, so a future developer who adds a transition knows the ground rules. |

### Tap feedback

- Current-month DayCell: `active:brightness-90` (subtle 10% darken on press), no transition duration.
- Padded DayCell: no feedback (`disabled`).
- Month chevron: Phase 1 focus-ring on keyboard; `active:bg-border/40` on press (matches Phase 2 chip convention).
- Day Detail back button: Phase 1 button press convention.
- Day Detail Delete action: no custom feedback beyond the row disappearing from DOM.

### Scroll behavior

- CalendarScreen: single-column scroll; month grid fits on screen for most iPhone sizes so typically no scroll.
- Day Detail: vertical scroll inside main area. No sticky sub-headers within Day Detail (keeps it simple). AppShell header stays sticky.

---

## Accessibility

**Inherits Phase 1 + 2 UI-SPEC §Accessibility verbatim.** Touch targets ≥ 44×44, AA contrast (most AAA), focus-visible rings, aria-labels on icon-only controls, landmark roles.

### Phase 3 NEW accessibility contracts

| Surface | Requirement | How it's met |
|---|---|---|
| CalendarScreen wrapper | `role="main"` | Inherited from AppShell `<main>` |
| MonthGrid | `role="grid" aria-label="{MonthName} {Year} activity calendar"` | Explicit on wrapper |
| MonthGrid keyboard nav | Arrow keys move focus; Enter on current-month cell navigates; roving tabindex | Explicit implementation |
| DayCell | `role="gridcell"` + dynamic `aria-label` per §Copywriting; `aria-disabled` on padded | Explicit |
| DayCell current-month as button | `<button type="button">` with `onClick` handler; focusable | Native semantics |
| DayCell padded | `<button type="button" disabled aria-disabled="true">` OR `<div role="gridcell" aria-disabled="true" tabindex="-1">`. Planner picks — button-disabled is simpler; div+role+tabindex gives more control. Both meet the contract. |
| Today cell | No special ARIA flag (the `aria-label` includes `today` text); avoids a second signal that could conflict with standard grid semantics |
| Month-nav chevrons | `<button aria-label="Previous month">` / `"Next month"`; `aria-disabled` when clamped | Explicit |
| StreakCount | `role="status" aria-live="polite"` on wrapper; wrapper `aria-label="Streak: {N} {day|days}"` | Explicit so logging elsewhere announces count change |
| Weekday headers | `aria-hidden="true"` on row — the date `aria-label` contains weekday name so headers are decorative | Explicit |
| Day Detail back button | `aria-label="Back to calendar"` on icon-only affordance; or visible `Back` label makes it self-labeling | Native |
| Day Detail date heading | `<h1>` or `<h2>` (planner picks based on outer heading level); conveys page context to screen readers | Native |
| Day Detail section titles | `<h2>` (or `<h3>` if page heading is `<h2>`) — hierarchical | Native |
| Day Detail empty-section copy | Inside the section; announced naturally when section is focused/reached | Native |
| Delete inline actions | `<button aria-label="Delete {X}">` — X specifies what's being deleted | Explicit |
| Past-day edit affordances | Reuse Phase 2 ARIA — `MealEntryRow`, `LiftToggle`, `LiftNoteInput`, `StepsInlineInput`, PT Session Sheet all have Phase 2 contracts | Inherited |
| Focus management on route change | When navigating from DayCell → DayDetail, focus moves to the Day Detail back button (or the date heading) so screen readers announce the new context. When navigating back, focus returns to the originating DayCell. Implementation: useEffect focus setter on mount; DayCell remembers last-focused dayKey via a ref or URL-derived lookup. |
| Contrast | Most pairs AAA; DayCell date number on `--accent-100` 4/4 fill is 3.1:1 (intentional; see Color §Contrast notes) | Documented |

### Contrast re-check summary

- Streak count number `--text` on `--bg`: 20.5:1 (AAA) — inherits Phase 1
- Month label `--text` on `--bg`: 20.5:1 (AAA)
- Weekday headers `--muted` on `--bg`: 8.4:1 (AAA)
- DayCell date number `--muted` on fill states: documented in Color section; ≥ AA for 0/4, 1/4, 2/4; AA large-text only for 3/4; sub-AA (3.1:1) for 4/4 — **accepted tradeoff**, documented.
- Padded-cell date `--border` on `--surface`: ~1.4:1 (intentionally low; spatial cue, not readable content; screen readers use `aria-label`)

### prefers-reduced-motion

N/A — Phase 3 ships zero animations. No media query needed. Documented in code comments.

### Keyboard navigation summary

- Tab into the calendar: focus lands on prev-chevron → next-chevron → first DayCell (single tab-stop into the grid).
- Inside the grid: arrow keys move focus; Enter/Space activates.
- Arrow from edge of grid escapes back to chevrons.
- From DayCell, Enter navigates to Day Detail.
- Inside Day Detail: tab through edit/delete actions per row; Escape anywhere returns to Calendar (via browser back button — react-router-dom HashRouter respects this).

---

## Responsive Scope

**Inherits Phase 1 UI-SPEC §Responsive Scope verbatim.** iPhone-first, `max-w-md` content column, no desktop redesign.

### Phase 3 iPhone-first notes

- MonthGrid occupies the full `max-w-md` column minus `px-4` padding. Cells auto-size via `aspect-square` + `grid-cols-7` + `gap-1`.
- On iPhone SE (320px): cells compute to `(320 − 32 − 24) / 7 ≈ 37.7px`. **Below 44×44 minimum.** Mitigation: `max-w-md` column applies at 768px+; on phones < 360px, the grid cells WILL be under 44px. This violates touch target.
  - **Decision:** below 360px viewport width, apply `gap-0.5` (2px) instead of `gap-1` (4px). Recomputes: `(320 − 32 − 12) / 7 ≈ 39.4px`. Still under 44 on iPhone SE but closer; acceptable tradeoff since iPhone SE is not the primary device (per CLAUDE.md: iPhone 13/14/15 at 390px).
  - **Accepted risk on iPhone SE (320px):** cells are 37–40px. Phase 3 baseline is iPhone 13/14/15 at 390px where cells are ~47px (passes 44). Post-v1 can revisit with horizontal scroll or smaller month-at-a-glance variant if iPhone SE becomes a real target.
- Tablet+ (≥ 768px): `max-w-md` caps column at 448px; cells compute to ~56px. Extra width is unused. This is intentional — the design target is phone.
- Day Detail: inherits `max-w-md mx-auto` column; sections stack vertically; comfortable on phone and tablet.

---

## Component Inventory (Phase 3)

For the planner/executor to wire up file creation and imports.

### shadcn re-install / upgrades

| Component | Action | Rationale |
|---|---|---|
| (none) | No shadcn additions this phase | DayCell + StreakCount are custom div/button primitives; Day Detail reuses Phase 1 Card + Phase 2 row components |

### Phase 1 + 2 components REUSED as-is

| Component | Phase 3 usage |
|---|---|
| `<Card>` (shadcn) | Day Detail section wrappers (PT/Food/Steps/Lift sections) |
| `<Button>` (shadcn) | Nested Sheets opened from Day Detail edit actions (inherits Phase 2) |
| `<Sheet>` (shadcn) | PT Session Sheet opens from Day Detail PT row edit (inherits Phase 2) |
| `<MealEntryRow>` (Phase 2) | Day Detail Food section rows |
| `<LiftToggle>` / `<LiftNoteInput>` (Phase 2) | Day Detail Lift section edit affordance |
| `<StepsInlineInput>` (Phase 2) | Day Detail Steps section edit affordance |
| `<PTSessionForm>` (Phase 2) | Day Detail PT session edit Sheet content |
| `<AppShell>` / `<TabBar>` (Phase 1) | Unchanged |
| Lucide icons: `ChevronLeft`, `ChevronRight` | Month nav chevrons, Day Detail back affordance |

### Phase 3 NEW Lucide icons

| Icon | Usage |
|---|---|
| `ChevronLeft` | Month-nav prev + Day Detail back |
| `ChevronRight` | Month-nav next |

(Both may already be implicitly available from Phase 2 — but Phase 1+2 didn't declare them. This phase locks them in.)

### Phase 3 NEW custom components (feature-owned)

All in a new directory `src/features/calendar/`:

| Component | Source | Used for |
|---|---|---|
| `<StreakCalendar />` | `src/features/calendar/StreakCalendar.tsx` | Top-level CalendarScreen container orchestrating StreakCount + MonthHeader + WeekdayHeader + MonthGrid |
| `<StreakCount />` | `src/features/calendar/StreakCount.tsx` | Hero streak number + noun + subtitle |
| `<MonthHeader />` | `src/features/calendar/MonthHeader.tsx` | Month label + prev/next chevrons + clamp logic |
| `<WeekdayHeader />` | `src/features/calendar/WeekdayHeader.tsx` | 7-column static weekday labels |
| `<MonthGrid />` | `src/features/calendar/MonthGrid.tsx` | 42-cell grid + keyboard nav + roving tabindex |
| `<DayCell />` | `src/features/calendar/DayCell.tsx` | The 4-quadrant indicator + date number + today ring |
| `<DayDetail />` | `src/features/calendar/DayDetail.tsx` | The `/#/day/YYYY-MM-DD` route component |
| `<DayDetailHeader />` | `src/features/calendar/DayDetailHeader.tsx` | Back + date + (empty right slot) |
| `<DayDetailSection />` | `src/features/calendar/DayDetailSection.tsx` | Generic 4-per-day section card with title + body/empty-state slot |
| `useMonthStreakData(year, month)` | `src/features/calendar/hooks.ts` | useLiveQuery wrapper around `streak.svc.ts:getStreakDataForRange` |
| `useCurrentStreakCount()` | `src/features/calendar/hooks.ts` | useLiveQuery wrapper around `streak.svc.ts:getCurrentStreakCount` |
| `useDayDetail(dayKey)` | `src/features/calendar/hooks.ts` | Composite hook pulling PT sessions + meal entries + step entry + lift checkin for one dayKey (4 `useLiveQuery` subscriptions) |

### Phase 3 NEW service module

| Service | File | Purpose |
|---|---|---|
| `streak.svc.ts` | `src/services/streak.svc.ts` | The ONLY new service. Functions: `getStreakDataForRange(startKey, endKey)` returning `Map<dayKey, {pt, food, steps, lift}>`; `getCurrentStreakCount()` returning `number`; `getEarliestDayKey()` returning `string | null` for lower-bound month clamp. Uses single `Promise.all` range query across 4 tables (per ARCHITECTURE.md §"Pattern for the streak calendar"). Anti-Pattern 3 hard-fail: no per-cell queries. |

### Phase 3 NEW service additions (additive, 1-line each)

| Service | File | Addition |
|---|---|---|
| `steps.svc.ts` | existing | `export async function deleteSteps(dayKey: string): Promise<void> { await db.stepEntries.delete(dayKey); }` |
| `lifts.svc.ts` | existing | `export async function deleteLift(dayKey: string): Promise<void> { await db.liftCheckins.delete(dayKey); }` |
| `pt.svc.ts` | existing | `export async function deleteSession(id: string): Promise<void> { await db.ptSessions.delete(id); }` (may already exist; planner checks) |

### Phase 3 NEW route

Register in `src/App.tsx`:

```tsx
<Route path="/day/:dayKey" element={<DayDetail />} />
```

The `:dayKey` param parses as `YYYY-MM-DD`. Invalid keys redirect to `/calendar` (see Error States).

---

## Form Validation Patterns

**Inherits Phase 2 UI-SPEC §Form Validation Patterns verbatim.** Phase 3's only form surfaces are the nested edit Sheets (PT Session edit, meal entry inline-edit, steps inline input, lift note input) — all reuse Phase 2 RHF+Zod schemas.

No new schemas declared in Phase 3.

---

## Loading States

**Inherits Phase 1 + 2 silent-loading stance.** IndexedDB reads are sub-16ms locally; no skeletons, no spinners.

| Surface | Loading contract |
|---|---|
| CalendarScreen first render | Renders zero-state: StreakCount shows `0 days` + subtitle; MonthGrid shows 42 cells all as 0/4 `--surface`. As `useLiveQuery` resolves (same tick or microtask), cells and count populate. No skeleton. |
| Month navigation (prev/next tap) | New MonthGrid mounts with `undefined` data for one microtask; renders as 42 `--surface` cells until the new month's range query resolves. Visually: brief flash of all-unfilled cells, then fills populate. Acceptable — alternative (hold prev month's fills during load) is more complex and the flash is imperceptible on local IDB. |
| Day Detail open | Each of 4 sections renders "No X logged…" while its `useLiveQuery` returns `undefined`, then populates. Same pattern as Today cards. |
| Streak count after a log elsewhere | Updates instantly on `useLiveQuery` refresh (sub-16ms). No loading state needed. |

**No skeletons ship in Phase 3.** No `<Loading />` primitive. Reject any planner/executor addition.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Re-uses `button`, `card`, `sheet` from Phase 1+2; no new adds | not required — first-party |
| (none — no third-party registries declared) | — | — |

**Third-party registry count: 0.** Safety vetting gate not triggered. All Phase 3 custom components (StreakCalendar, StreakCount, MonthHeader, WeekdayHeader, MonthGrid, DayCell, DayDetail, DayDetailHeader, DayDetailSection) are built in-repo from Tailwind utilities on Phase 1+2 primitives.

---

## Assets / Iconography

Phase 3 requires NO new image assets. Per the anti-chrome stance (D-12):
- No completion badges, no medals, no 4/4 graphics
- No illustrated empty states (text-only empty copy)
- No custom quadrant icons (quadrants are color alone, per D-09)
- No favicon or PWA-icon changes (Phase 1 owns those; Phase 4 may polish)

Lucide icons used (already available): `ChevronLeft`, `ChevronRight`. No SVG assets shipped.

---

## Traceability: UI contract → Phase 3 CONTEXT.md decisions

| UI contract | Source D-code |
|---|---|
| Food quadrant fills iff ≥1 MealEntry (no macro threshold) | D-01 |
| PT quadrant fills iff ≥1 PTSession (any session counts) | D-02 |
| Steps quadrant fills iff StepEntry AND count > 0 | D-03 |
| Lift quadrant fills iff LiftCheckin AND lifted === true | D-04 |
| 4/4 binary — no partial credit | D-05 |
| Rest day caps at 3/4; no special affordance | D-06 |
| 2×2 square quadrants | D-07 |
| NW=PT, NE=Food, SW=Steps, SE=Lift — LOCKED FOREVER | D-08 |
| Per-count alpha ramp via --accent-25/50/75/100 tokens | D-09 |
| Date number `--muted`, geometric center, overlaid on fills | D-10 |
| Today ring: 1px `--accent` outside the 2×2 grid | D-11 |
| 4/4 day chrome: none — solid fill IS the reward | D-12 |

## Traceability: UI contract → Claude's Discretion resolutions

| UI contract | Resolution |
|---|---|
| Week-start Sunday (US locale) | Locked; hardcoded |
| Prev/next-month padded cells rendered muted, not blank | Locked; keeps 6×7 grid rhythm and supports keyboard nav |
| Cell aspect square, 4px gap | Locked |
| Month header not sticky | Locked; CalendarScreen fits viewport |
| Upper nav bound = current month (no future) | Locked |
| Lower nav bound = earliest dayKey across 4 tables | Locked via `streak.svc.ts:getEarliestDayKey()` |
| Streak count semantics: consecutive 4/4 ending at most-recent 4/4; today counted only if 4/4 | Locked |
| Streak count positive framing: `finish today's 4th to extend` subtitle | Locked; never "broken" wording |
| Day detail via route `/#/day/YYYY-MM-DD`, not Sheet | Locked; Sheets own Phase 2 logging surface, route owns Phase 3 navigation destination |
| Past-day edit/delete via Phase 2 service reuse | Locked |
| Adding NEW past-day logs from Day Detail | Deferred; edit/delete-only in Phase 3 |
| Div-based DayCell (not SVG) | Locked; planner may swap if perf measures show regression |
| Don't use `react-activity-calendar` | Locked with rationale |

## Traceability: UI contract → Phase 1 + 2 inheritance

| Phase 1/2 section | How Phase 3 inherits |
|---|---|
| Design System (shadcn zinc, new-york, Lucide, system font) | Inherited; no `components.json` change |
| Spacing Scale | Inherited verbatim; Phase 3 adds DayCell + grid-specific dimensions |
| Typography | Inherited verbatim; no new sizes or weights |
| Color palette + accent reservation | Inherited verbatim; Phase 3 ADDS DayCell alpha-ramp + today-ring to accent-reserved list |
| DayCell alpha-ramp tokens (`--accent-25/50/75/100`) | Declared in Phase 1 D-17, first consumed in Phase 3 per D-09 |
| Destructive color `#ef4444` | Inherited from Phase 2; reused on Day Detail Delete inline actions |
| Anti-motion policy | Inherited verbatim; Phase 3 extends to DayCell fill transitions, today-ring, streak count, month nav |
| Accessibility baselines | Inherited; Phase 3 adds grid role + roving tabindex + live region for streak count |
| Responsive Scope | Inherited; Phase 3 documents iPhone SE caveat |
| Hash routing precedent | Inherited from Phase 1 D-03; Phase 3 adds `/#/day/:dayKey` |
| Sheet primary-action pattern | Inherited from Phase 2 D-01; reused for edit Sheets opened from Day Detail |
| SET-03 current-goals policy | Inherited from Phase 2 D-14; Day Detail totals compare against current goals, never per-day snapshot |

---

## Traceability: UI contract → STREAK-01..07 requirements

| REQ-ID | UI contract satisfying it |
|---|---|
| STREAK-01 (day = 4-segment indicator, quadrants PT/meals/steps/lift) | DayCell spec + D-08 quadrant map |
| STREAK-02 (quadrant fills when any log exists for that area) | D-01..D-04 completion rules + DayCell alpha-ramp |
| STREAK-03 (4/4 = complete, distinct state) | D-09 alpha-ramp — 4/4 is the only state hitting `--accent-100` saturation |
| STREAK-04 (month-at-a-time grid with prev/next nav) | MonthGrid + MonthHeader + navigation clamps |
| STREAK-05 (cells neutral for zero-log, partial positive) | D-09 alpha-ramp + never-red rule + Pitfall #6 compliance |
| STREAK-06 (tap day opens detail) | DayCell `<button>` + `/#/day/:dayKey` route + DayDetail |
| STREAK-07 (current streak count displayed) | StreakCount component + semantics |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS (with documented 4/4 date-number contrast tradeoff)
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS (with documented iPhone SE touch-target caveat)
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
