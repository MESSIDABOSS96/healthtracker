# HealthTracker

## What This Is

A fully-local PWA health tracker for a single user (Anirudh) covering four daily tracking areas: PT exercises (for tendonitis/tennis elbow recovery), food and macros (for an active cut), manual activity/steps, and a lightweight daily check-in for lifts (which are tracked in detail elsewhere). The central motivator is a calendar view where each day is a 4-segment indicator that fills progressively as each tracking area gets logged — whole-day "complete" cells only appear when all four areas are logged that day.

## Core Value

**Visual consistency feedback that makes logging feel like a win.** If the app fails to track anything else but the streak/calendar loop reliably motivates daily logging, it has done its job. Every UX tradeoff should bias toward low-friction entry and satisfying visual feedback.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Daily 4-segment streak indicator (PT / meals / steps / lifts) — partial-fill by area, full when all four logged
- [ ] Calendar/month view showing streak history at a glance
- [ ] PT routine management — define reusable templates (exercise + target sets/reps), log sessions against templates with actuals + notes
- [ ] Food logging via a personal food library that grows over time — add a food once (incl. optional photo) and quickly re-log it later
- [ ] Per-meal macro entry (calories, protein, carbs, fat) with daily target tracking and progress bars
- [ ] Manual step entry per day with a configurable daily step goal
- [ ] Daily lift check-in (yes/no + optional short note) — no sets/reps in this app
- [ ] Configurable daily targets for calories, protein, carbs, fat, and steps
- [ ] Manual JSON export/import for backup and device migration
- [ ] Installable PWA with offline support (IndexedDB storage, no server)
- [ ] Dark mode, minimal/calm visual aesthetic throughout

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Full lift tracking (sets/reps/weight) — user has another platform for this; avoiding duplicate entry
- User accounts, authentication, and multi-user support — this is a personal tool; auth adds friction with no payoff
- Cloud sync or a hosted backend — fully-local IndexedDB is simpler and sufficient given manual backup
- Apple Health / Google Fit integration — manual entry is fine for v1 and avoids platform-specific complexity
- Barcode scanning and third-party nutrition API lookups — custom food library with recall is lighter and was the user's explicit preference
- Social features, sharing, leaderboards — solo motivation tool, not a social product
- Bodyweight / measurements tracking — not mentioned as a motivator; can be revisited post-v1 if it aids the cut
- Hydration, sleep, mood tracking — scope creep risk; add only if the streak loop demands it

## Context

- **User profile**: Consistent lifter (years of experience). Developed tendonitis in knees and tennis elbow, now required to do PT for recovery. Simultaneously attempting a cut (active calorie deficit).
- **Primary motivation problem**: Staying consistent with PT and cut logging. Has tried existing free tracking apps and found them unengaging. Reports that visual calendar streaks on his current lift-tracking platform meaningfully drive his consistency — this is the feature pattern to replicate.
- **Usage context**: Will use on phone primarily (mid-day meal logging, post-session PT logging) and occasionally on laptop. PWA with home-screen install is the target delivery format.
- **Technical environment**: Greenfield project in `/Users/anirudhchatterjee/dev/healthtracker`. No existing code, no stack decisions pre-made. Tech stack recommendation deferred to research phase.
- **Philosophy**: "Functionality tool for me" — user prioritizes shipping and using the thing over polish. Iterate based on real daily use, not upfront design.

## Constraints

- **Tech stack**: PWA delivery required — must be installable to phone home screen and work offline. Stack choice open, picked in research phase.
- **Storage**: IndexedDB only (via a library like Dexie or equivalent). No server, no external DB. All data lives on-device.
- **Auth**: None. Single-user personal app; auth is explicitly out of scope.
- **Timeline**: Fast MVP — user wants to be using it ASAP. Favor "working and simple" over "polished and complete."
- **Design**: Dark mode, minimal and calm. Low visual noise. Motivation comes from the streak loop, not loud UI.
- **Entry friction**: Every logging interaction must be low-friction. Food library recall, PT templates, and one-tap daily lift check-in all exist to serve this constraint.
- **Data durability**: Fully-local storage means device loss = data loss unless the user manually exports. UX must make the export/backup flow obvious and painless.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fully-local PWA, IndexedDB only | Solo use + ship-fast priority + no auth needed; server is unnecessary complexity | — Pending |
| Custom food library (no third-party nutrition API) | User explicitly prefers adding his own foods; he eats repeat meals ("4 servings of the same ground beef I always use"); no external dependency risk | — Pending |
| Templates-combo PT model | Balances structure (track progress numerically) with low friction (tick-off + actuals); user has recurring prescribed exercises | — Pending |
| Lifts are daily check-in only | User tracks lifts in detail on another platform; re-tracking would add friction without value | — Pending |
| Manual JSON export/import for backup | Simplest backup model that gives user control; auto-sync would require a backend | — Pending |
| Dark mode + minimal aesthetic | User-stated preference; aligns with "calm and low cognitive load" design philosophy | — Pending |
| Tech stack deferred to research | User has no preference; research phase will evaluate modern PWA stacks against fast-MVP + solo-dev constraints | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-19 after initialization*
