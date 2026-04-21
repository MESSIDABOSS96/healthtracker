# HealthTracker

## What This Is

A fully-local PWA health tracker for a single user (Anirudh) covering four daily tracking areas: PT exercises (for tendonitis/tennis elbow recovery), food and macros (for an active cut), manual activity/steps, and a lightweight daily check-in for lifts (which are tracked in detail elsewhere). The central motivator is a calendar view where each day is a 4-segment indicator that fills progressively as each tracking area gets logged — whole-day "complete" cells only appear when all four areas are logged that day.

## Core Value

**Visual consistency feedback that makes logging feel like a win.** If the app fails to track anything else but the streak/calendar loop reliably motivates daily logging, it has done its job. Every UX tradeoff should bias toward low-friction entry and satisfying visual feedback.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- [x] Installable PWA with offline support (IndexedDB storage, no server) — Validated in Phase 1: Foundation (carry-forward HUMAN-UAT for on-device install confirmation, see `01-HUMAN-UAT.md`)
- [x] Dark mode, minimal/calm visual aesthetic throughout — Validated in Phase 1: Foundation (Tailwind v4 tokens locked, dark class belt-and-suspenders in index.html + main.tsx)

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
| Tech stack deferred to research | User has no preference; research phase will evaluate modern PWA stacks against fast-MVP + solo-dev constraints | ✓ Locked in Phase 1: React 19 + Vite 7 + TypeScript + Dexie 4 + Tailwind v4 + shadcn/ui (see research/STACK.md) |
| Photos: WebP @ 80%, ≤800×800, OPFS-stored, photoKey reference in Dexie | Raw iPhone photos fill quota and crash tab; OPFS keeps Dexie row size flat; WebP@80% beats JPEG@70% on visual quality at lower bytes (CONTEXT.md D-07) | ✓ Validated in Phase 1: Foundation — photoStore.ts ships; CLAUDE.md rule #5 corrected from JPEG@70% |
| three-layer iOS eviction defense (persist + install banner + eviction banner) | Pitfall #3: iOS Safari evicts IndexedDB after 7 days inactivity; persist() alone insufficient because iOS still drops if user dismisses or uses Safari rarely | ✓ Validated in Phase 1: Foundation (on-device install confirmation carry-forward in 01-HUMAN-UAT.md) |

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

## Current State

**Phase 1: Foundation — Complete (2026-04-21).** Installable PWA shell ships: Vite 7 + React 19 + TS scaffold, Dexie v1 (7 stores), dayKey utility (Pitfall #4 guarded with dev-only smoke), OPFS photoStore (WebP@80%), navigator.storage.persist() on every startup, vite-plugin-pwa generateSW + autoUpdate, Install + Eviction banners, Settings version line. Dark base layout per UI-SPEC. Carry-forward: on-device install/offline confirmation (01-HUMAN-UAT.md, 4 items).

**Phase 2: Tracking Slices — Complete (2026-04-21).** All four daily tracking areas usable: PT (templates → sessions with previous-session hint, pain rating, notes), Food (create with OPFS photo, tap-to-log via Recent/Frequent chips, inline-edit, bucketed today list, live macro bars), Steps (inline input + bar), Lift (toggle + conditional note). Goals form in Settings with RHF+Zod validation and pre-seeded D-13 defaults. TodayScreen renders 4 live sections. 22 REQs architecturally verified (PT-01..07, FOOD-01..08, STEPS-01..02, LIFT-01..02, SET-01..03); FOOD-02 locked to create+delete for v1 per D-17 (edit deferred). Code review: 0 critical / 6 warning / 8 info — no PITFALLS violations. Carry-forward: 9 UI-behavioral UAT items (02-HUMAN-UAT.md) pending live-browser verification.

**Phase 3: Streak Loop — Complete (2026-04-21).** The core motivator is live. `streak.svc.ts` issues one `Promise.all` over 4 Dexie range queries (Anti-Pattern 3 cleared); `monthMath.ts` builds 42-cell grids via `dayKey` utilities (Pitfall #3 clean); `hooks.ts` houses canonical `useLiveQuery` wrappers including `useDayDetail`. `DayCell.tsx` is a pure 2×2 quadrant primitive locking D-08 (NW=PT/NE=Food/SW=Steps/SE=Lift) and D-09 (count-based alpha ramp). Calendar assembly: `MonthHeader` + `WeekdayHeader` + `MonthGrid` (42 cells, single `useLiveQuery` subscription) + `StreakCount` hero + `StreakCalendar` composer; CalendarScreen replaces Phase 1 stub. Day Detail: new `/#/day/:dayKey` hash route with regex guard and silent redirect on invalid keys; reuses Phase 2 leaf components via additive optional `dayKey` and `editSession` props (Phase 2 callers compile unchanged, tsc -b 0). PT edit preserves id+dayKey+loggedAt (no duplicate-on-today). Code review: 0 critical / 3 warning / 5 info — known: WR-01/02 midnight-staleness on `useCurrentStreakCount`/StreakCount subtitle (low real-world impact, candidate for Phase 4 polish), WR-03 `deleteLift` clears note alongside flag (consider undo/confirm). 7 STREAK REQs architecturally verified (STREAK-01..07). Carry-forward: 8 UI-behavioral UAT items (03-HUMAN-UAT.md), 7 of 8 pre-approved at Wave 2 checkpoint, 1 pending formal walkthrough (Today-tab regression check).

**Next:** Phase 4 — Backup & Polish (JSON export, PWA install/icon polish, data-safety UX).

---
*Last updated: 2026-04-21 after Phase 3 completion*
