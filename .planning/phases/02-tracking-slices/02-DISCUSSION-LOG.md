# Phase 2: Tracking Slices - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 02-tracking-slices
**Areas discussed:** Logging interaction pattern, Food logging flow, PT template & session UX, Goals defaults + historical-target policy

---

## Area Selection

| Gray area | Selected |
|-----------|----------|
| Logging interaction pattern | ✓ |
| Food logging flow | ✓ |
| PT template & session UX | ✓ |
| Goals defaults + historical-target policy | ✓ |

All 4 offered areas selected by user (multi-select).

---

## Logging interaction pattern

### Q1 — Primary entry pattern for multi-field sections (PT session, Food meal log)?

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom Sheet modal (Recommended) | Tap card → Radix Sheet slides up. Upgrades Phase 1 Sheet stub. Native iOS feel, preserves Today-as-hub. | ✓ |
| Dedicated hash route | Tap card → navigate to /#/today/pt. Deep-linkable; breaks single-hub feel. | |
| Inline expand-in-card | Card expands in place. Clutters Today; mobile keyboard conflicts. | |

**User's choice:** Bottom Sheet modal
**Notes:** Locks D-01; triggers Sheet stub → Radix upgrade as a Phase 2 foundation task.

### Q2 — Simple sections (Steps = one number, Lift = yes/no toggle) — same Sheet pattern or inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in card (Recommended) | Lift: tap ☐ to toggle. Steps: tap card to reveal number input inline. Fastest friction. | ✓ |
| Same Sheet pattern | Every section opens Sheet — consistency, extra tap. | |
| Mixed: Lift inline, Steps Sheet | Only pure toggle inline; Steps opens Sheet. | |

**User's choice:** Inline in card
**Notes:** Locks D-02. The ☐ glyph itself is the tappable affordance.

### Q3 — Multi-item sessions (PT session N exercises; food day N entries) — composition?

| Option | Description | Selected |
|--------|-------------|----------|
| One Sheet with internal list (Recommended) | PT Sheet stacks all template exercises with actuals + checkbox; Food Sheet = picker + today's entries below. | ✓ |
| List screen + per-item Sheet | Nav to list → tap item Sheet. Two-level nav. | |
| Multi-step Sheet (wizard) | Step-through one exercise at a time. Heavy for daily use. | |

**User's choice:** One Sheet with internal list
**Notes:** Locks D-03.

### Q4 — After save — Sheet behavior + populated card?

| Option | Description | Selected |
|--------|-------------|----------|
| Close on save + live card status (Recommended) | Save → Sheet closes → Today card re-renders via useLiveQuery. No extra animation. | ✓ |
| Stay open with success state | Sheet shows "Saved ✓", waits for dismiss. Extra tap. | |
| Toast + stay open | Needs new toast primitive. Not worth it for solo app. | |

**User's choice:** Close on save + live card status
**Notes:** Locks D-04. Matches UI-SPEC anti-motion policy.

---

## Food logging flow

### Q1 — Food card tap — Sheet opens to?

| Option | Description | Selected |
|--------|-------------|----------|
| Quick-log first (Recommended) | Macros top → Recent/Frequent chips → search → today's entries bottom. Optimized for Pitfall #7. | ✓ |
| Today's entries first | Opens to list; + button opens picker. One extra tap to quick-log. | |
| Tabbed: Log | Library | Two tabs, mixes concerns. | |

**User's choice:** Quick-log first
**Notes:** Locks D-05. Home path = one tap on Recent/Frequent chip.

### Q2 — New-food creation during log?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in the picker Sheet (Recommended) | Search "No match. Create '[query]'?" → form → Save adds to library AND logs to today. | ✓ |
| Separate Library screen | Go to Library first, then back to log. Higher friction. | |
| Both: inline-create AND separate Library | Both paths supported. | |

**User's choice:** Inline in the picker Sheet
**Notes:** Locks D-06. No separate Library screen in Phase 2.

### Q3 — Photo capture mode?

| Option | Description | Selected |
|--------|-------------|----------|
| capture="environment" (camera-first) (Recommended) | iOS opens rear camera directly. Falls back to file picker. | ✓ |
| File picker only (library) | "Take Photo or Choose from Library" dialog. 2 steps on iOS. | |
| Both: camera button + library button | Adds UI weight; iOS already offers both via native picker. | |

**User's choice:** capture="environment"
**Notes:** Locks D-07. Consumes existing `src/lib/photoStore.ts:savePhoto()`.

### Q4 — Recent + Frequent quick-access behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Recent: last 10 by loggedAt; Frequent: top 8 by count/30d; one-tap re-log with last servings (Recommended) | Bucket auto-inferred by time of day. Edit after via tap. | ✓ |
| Tap chip → confirm sheet with pre-filled servings | Two taps per re-log. Loses "one-tap win." | |
| Recent only (no Frequent) | Loses "favorite breakfast" recall. Violates FOOD-05. | |

**User's choice:** Recent + Frequent with one-tap re-log
**Notes:** Locks D-08. Bucket auto-inference: breakfast <11:00, lunch <15:00, dinner <21:00, snack else.

---

## PT template & session UX

### Q1 — Exercise model — embedded in template vs separate store?

| Option | Description | Selected |
|--------|-------------|----------|
| Embedded in template (current schema) (Recommended) | PT-01 = add/edit/remove exercise rows inside template. No schema migration. | ✓ |
| Separate exercises store + templates reference by ID | New Dexie store, db.version(2) migration. Stricter model. | |
| Both: inline + "save as reusable" | Most flexibility, most UI weight. | |

**User's choice:** Embedded in template
**Notes:** Locks D-09. No schema migration — Dexie stays at v1.

### Q2 — Template management location?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside the PT Sheet, above session-start (Recommended) | "Start session:" → template cards → + New template → ⋯ overflow = edit/delete. All in PT Sheet. | ✓ |
| Dedicated "Manage templates" row in Settings | Requires leaving Today to create first template. | |
| Tab inside PT Sheet (Sessions | Templates) | Heavier UI. | |

**User's choice:** Inside the PT Sheet
**Notes:** Locks D-10. Template editor = nested Sheet (Radix supports stacking).

### Q3 — Session pre-populate + completion semantics?

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-populate rows; completed = explicit checkbox (Recommended) | Checkbox independent of actuals. Allows "attempted 0 reps due to pain" signal. | ✓ |
| Auto-populate; completed = auto-on when actuals filled | Fewer taps; loses pain-day signal. | |
| Start empty; user adds each from template | More intentional; more taps. | |

**User's choice:** Auto-populate + explicit checkbox
**Notes:** Locks D-11. Partial sessions are valid.

### Q4 — PT-07 previous-session display?

| Option | Description | Selected |
|--------|-------------|----------|
| Muted hint text under each exercise row (Recommended) | "Last: 3×12 · pain 2/5 · 5 days ago". Null if no prior. | ✓ |
| Tap row to expand history panel | Show last 3-5 sessions. Extra interaction per exercise. | |
| Separate "Previous session" summary at top | One block; doesn't show per-exercise progression. | |

**User's choice:** Muted hint text under each exercise row
**Notes:** Locks D-12. Uses --muted color token.

---

## Goals defaults + historical-target policy

### Q1 — First-run default values?

| Option | Description | Selected |
|--------|-------------|----------|
| Seeded sensible cut defaults (Recommended) | 2000/180/180/65/8000. Day-1 cards show live progress immediately. | ✓ |
| Empty until user saves | No record; progress bars show "Set a goal" until configured. Day-0 friction. | |
| Prompt on first Food log | Defers friction; risks interrupting first logging moment. | |

**User's choice:** Seeded cut defaults
**Notes:** Locks D-13. Seed runs in initApp() after Dexie opens.

### Q2 — SET-03 lock (IRREVERSIBLE)?

| Option | Description | Selected |
|--------|-------------|----------|
| Always current targets (Recommended) | Progress bars always compare to goals.get('singleton') as-is. No snapshot. No migration. | ✓ |
| Snapshot per day (then-current) | New store + migration + write-on-first-log-each-day. Faithful but heavy. | |
| Snapshot on goals change (effective-dated ranges) | Most flexible; overkill for solo app. | |

**User's choice:** Always current targets
**Notes:** Locks D-14. Explicitly accepts that historical days re-render against new targets when changed. PROJECT.md "simple > complete" philosophy drove the pick.

### Q3 — Goals form UX?

| Option | Description | Selected |
|--------|-------------|----------|
| One form, Save button, all 5 fields atomically (Recommended) | RHF + Zod. Non-negative integers. | ✓ |
| Per-field inline save (auto-save on blur) | No Save button; risks intermediate state. | |
| Each field in its own sub-sheet | iOS-native feel; 5 interactions to change multiple. | |

**User's choice:** One form, Save button, all 5 fields
**Notes:** Locks D-15. Installs react-hook-form, zod, @hookform/resolvers.

### Q4 — Zero/missing target meaning?

| Option | Description | Selected |
|--------|-------------|----------|
| Zero = "not set"; bar shows neutral N/A (Recommended) | Division-by-zero safe. Defensive contract. | ✓ |
| Zero = literal zero (always over) | Math correct; looks broken. | |
| Disallow zero in validation | Rejects temporary disable use case. | |

**User's choice:** Zero = "not set"
**Notes:** Locks D-16.

---

## Claude's Discretion

- Exact populated-card status copy formats (title + em-dash + live status pattern — Phase 1 convention carries)
- Sheet open/close animation — Radix default unless it conflicts with anti-motion UI-SPEC
- Food picker search mode (prefix vs substring)
- PT template exercise display ordering
- Number-input `inputmode` tuning
- Plan split granularity (2 vs 3–4 plans) — planner decides; Sheet upgrade + RHF/Zod install + goals seed are shared prerequisites

## Deferred Ideas

- Segment completion definition ("any log" vs "hit target") — Phase 3 lock
- PT rest-day affordance — not in v1 REQs
- Meal templates / combos — v2
- Edit/delete for past-day entries (older than today) — Phase 3 day-detail
- PT session history chart — v2
- Weekly macro summary — v2
- Toast primitive + error-toast UX — deferred
- Today-card populated-status exact copy — Claude's Discretion during planning
