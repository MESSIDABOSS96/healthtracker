# HealthTracker

## What This Is

A fully-local PWA health tracker used independently by two friends (Anirudh + one friend), each on their own phone with their own data — no backend, no sync, no accounts. v2 centers on three things: calorie/macro tracking with AI-parsed freeform entry and a self-building food library, one-tap lift and cardio check-offs, and body-weight tracking over time. The central motivator is an Apple-Fitness-style daily closure loop — a day "closes" when food is logged and lift/cardio are checked off — plus a Dashboard that visualizes weight, eating, and training consistency over weeks and months.

## Core Value

**Consistency through satisfying daily closure and visible long-term progress.** If closing the day reliably motivates both users to log food, train, and weigh in — and the Dashboard makes progress feel real over time — the product is succeeding. Every UX tradeoff biases toward **low-friction entry** (speak/type and done) and **clean, sleek visual feedback**.

## Requirements

### Validated (carried from v1.0)

- [x] Installable PWA with offline support (IndexedDB storage, no server) — Phase 1
- [x] Dark mode, minimal/calm visual aesthetic — Phase 1 (v2 rework: cleaner, Apple-design-informed)
- [x] Macro entry with daily target tracking (calories, protein, carbs, fat) — Phase 2 (v2 rework: AI-parsed entry)
- [x] Daily lift check-in (one-tap) — Phase 2 (v2: joined by cardio check-off)
- [x] Calendar streak history view — Phase 3 (v2 rework: ring-closure model)
- [x] Configurable daily targets — Phase 2
- [x] Manual JSON export — Phase 4

### Active (v2.0)

- [ ] AI-parsed food entry — speak or type freeform ("200g chicken, 31g protein per 100g") and Claude computes calories + macros; structured local parser as offline fallback
- [ ] Smart auto-library — every parsed item is saved automatically; repeat items (eggs, snacks) re-log with one tap; no manual food creation flow
- [ ] One-tap lift check-off and one-tap cardio check-off per day (Hevy auto-sync accommodated in the data model for later)
- [ ] Daily weight entry with long-term trend visualization
- [ ] Daily closure loop — a day "closes" when calories/macros are logged + lift + cardio are addressed (Apple ring concept; exact visual TBD in design)
- [ ] Daily tab — today's closure state + all logging entry points
- [ ] Dashboard tab — weight trend, eating adherence, and lift/cardio consistency over weeks/months
- [ ] JSON export/import covering all v2 data

### Out of Scope

- PT rehab tracking — v1 feature, dropped in v2: no longer a daily tracking need; ~940 LOC removed
- Steps tracking — dropped in v2: cardio check-off replaces it as the movement signal
- Shared data / seeing each other's progress — deliberately deferred; each user runs their own local install
- Backend, auth, cloud sync — two independent local installs; no server
- Hevy API auto-sync — requires Hevy Pro (neither user has it); data model must accommodate it later
- Barcode scanning / third-party nutrition DBs — AI parsing + auto-library covers entry friction
- Full lift tracking (sets/reps/weight) — tracked in Hevy
- Social features, notifications, streak freezes, hydration/sleep/mood — scope discipline

## Context

- **Users**: Two friends, both consistent lifters, both cutting/tracking macros. Each installs the PWA on their own phone. Both use Hevy (free tier) for detailed lift tracking.
- **Motivation problem**: Staying consistent with calorie/macro logging and training. The Apple Fitness ring-closing pattern is the explicit inspiration — daily closure + long-term visual progress to gamify consistency.
- **AI parsing**: Anthropic API (Claude Haiku) called directly from the client with a user-supplied API key stored on-device. ~$0.001/parse; only new items need parsing (auto-library covers repeats). Users buy $5 minimum API credit that lasts years.
- **Design direction**: Clean, sleek, Apple-design-informed. Emil Kowalski skills installed at `.agents/skills/` (apple-design, pick-ui-library, improve-animations) — consult during UI phases.
- **v1 carry-forward**: Dexie schema (append-only versioning), dayKey utilities, OPFS photo store, PWA shell, services layer are reusable; most of the presentation layer (~3,500 LOC) gets rebuilt.

## Constraints

- **Tech stack**: Keep React 19 + Vite 7 + TS + Dexie 4 + Tailwind 4 stack. Schema changes via appended `db.version(N)` blocks only.
- **Storage**: IndexedDB (Dexie) on-device; OPFS for photos. No server.
- **AI calls**: Anthropic API direct-from-browser with user's own key; must degrade gracefully offline (structured local parser fallback + auto-library one-tap re-logs work offline).
- **Entry friction**: Speak/type-and-done is the bar for food; one tap for lift/cardio; one number for weight.
- **Data durability**: Manual JSON export/import remains the backup story; make it obvious.
- **Two-person usability**: Everything must make sense to a second user who didn't build it — sensible empty states, no Anirudh-specific assumptions.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fully-local PWA, IndexedDB only | Solo use + ship-fast priority; server unnecessary | ✓ Validated v1; retained for v2 (separate installs per user) |
| Tech stack: React 19 + Vite 7 + TS + Dexie 4 + Tailwind 4 | Locked in v1 Phase 1 research | ✓ Locked; carried to v2 |
| Photos: WebP@80% ≤800×800 in OPFS, photoKey in Dexie | Quota safety | ✓ Validated v1 |
| v2: two independent local installs, no shared data | Users chose individual use over accountability view; keeps zero-backend architecture | ✓ Locked 2026-08-08 |
| v2: AI food parsing via Claude Haiku + local structured fallback | ~$0.001/parse, freeform speak/type entry; offline fallback keeps PWA functional | ✓ Locked 2026-08-08 |
| v2: smart auto-library replaces manual food creation | Parsed items auto-saved and deduped; removes v1's manual food-entry friction | ✓ Locked 2026-08-08 |
| v2: manual one-tap lift + cardio check-offs; Hevy sync deferred | Hevy API requires Pro (neither user has it); model check-offs so a sync source can set them later | ✓ Locked 2026-08-08 |
| v2: drop PT and steps tracking | New goals are food/lift/cardio/weight; PT rehab no longer tracked; cardio replaces steps | ✓ Locked 2026-08-08 |
| v2: day closure = food logged + lift + cardio addressed | Apple-ring-style closure is the core motivator; exact completion semantics locked in design phase | ✓ Locked 2026-08-08 |
| v2: Daily + Dashboard two-tab IA | Daily = today's closure + logging; Dashboard = long-term weight/eating/training trends | ✓ Locked 2026-08-08 |

## Current Milestone: v2.0 Duo Redesign

**Goal:** Redesign HealthTracker so two friends can each use it daily for calorie/macro tracking (AI-parsed entry + smart auto-library), lift/cardio check-offs, and weight tracking — motivated by an Apple-Fitness-style daily closure loop and a long-term progress Dashboard, in a clean, sleek, animation-polished UI.

**Target features:**
- AI-parsed freeform food entry (speak/type) with local structured fallback + on-device API key settings
- Smart auto-library with one-tap re-logging of repeat items (replaces manual food library)
- One-tap lift and cardio daily check-offs (Hevy-sync-ready data model)
- Daily weight logging + long-term trend chart
- Daily closure loop (ring-style concept) replacing the 4-quadrant streak calendar
- Two-tab IA: Daily (today) + Dashboard (weight / eating / training over time)
- Removal of PT and steps features; JSON export/import updated for v2 schema
- Clean, sleek redesign guided by apple-design / pick-ui-library / improve-animations skills

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

**v1.0 closed 2026-08-08** (see MILESTONES.md) — solo tracker shipped through Phase 4 wave 1. **v2.0 Duo Redesign started 2026-08-08**: defining requirements.

---
*Last updated: 2026-08-08 — v2.0 Duo Redesign milestone started*
