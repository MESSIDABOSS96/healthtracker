# Requirements — Milestone v2.0 Duo Redesign

Defined 2026-08-08. v1.0 requirements (SETUP, DATA, PT, FOOD-01..10, STEPS, LIFT, SET-01..03, STREAK, BACK-01..02) are archived in MILESTONES.md; PT and STEPS are retired in v2.

## v2 Requirements

### Data Migration & Feature Removal (MIGR)

- [ ] **MIGR-01**: Existing v1 data (foods, meal entries, lift check-ins, goals) carries into the v2 schema with no data loss (Dexie `version(2)` append-only migration; lift check-ins migrate into the generalized daily check-in store)
- [ ] **MIGR-02**: PT and steps features are fully removed from the UI and services; their v1 stores remain declared and untouched (orphaned, per Dexie safety guidance)
- [ ] **MIGR-03**: The `foods` store gains auto-library fields (`normalizedName`, `usageCount`, `lastUsedAt`, serving qty/unit, parse source) backfilled from existing meal history so the library is warm on day one

### AI Food Entry (FOOD — continues v1 numbering)

- [ ] **FOOD-11**: User can type a freeform food description (item, quantity, and any nutrition facts they know, e.g. "200g chicken, 31g protein per 100g") and have calories + macros computed by AI (Claude Haiku, browser-direct with on-device API key, structured JSON output)
- [ ] **FOOD-12**: User can dictate the same description by voice where the platform supports it (Web Speech API, feature-detected and hidden in installed iOS PWAs; typing is first-class, never a degraded path)
- [ ] **FOOD-13**: Parsed results always land in an editable confirm form (name, qty, unit, calories, macros) — nothing is saved without an explicit confirm tap; an arithmetic-consistency check flags suspicious macro math
- [ ] **FOOD-14**: When offline or no API key is set, a structured local entry format (e.g. "150g @ 31p 0c 4f /100g") computes macros deterministically on-device through the same confirm form
- [ ] **FOOD-15**: Every confirmed item is saved to the library automatically (deduped by normalized name, exact-match only) — there is no manual "create food" flow
- [ ] **FOOD-16**: User can re-log a repeat item with one tap (recent + frequent surfacing, last-used serving prefilled), guarded against accidental double-logging
- [ ] **FOOD-17**: Daily tab shows live calorie + macro totals against targets

### Training Check-offs (TRAIN)

- [ ] **TRAIN-01**: User can check off "lifted" for the day with one tap (toggleable off)
- [ ] **TRAIN-02**: User can check off "did cardio" for the day with one tap (toggleable off)
- [ ] **TRAIN-03**: Check-off records carry a `source` field (`manual` now, `hevy` later) so future Hevy API sync can set them without schema change

### Weight Tracking (WEIGHT)

- [ ] **WEIGHT-01**: User can log body weight for a day (single number, editable, one entry per dayKey)
- [ ] **WEIGHT-02**: Weight history renders as a chart with raw entries plus an EMA-smoothed trend line

### Daily Closure Loop (CLOSE)

- [ ] **CLOSE-01**: A day "closes" when food is logged (any entry) AND lift AND cardio are addressed for that day — computed by a closure service replacing v1's streak service
- [ ] **CLOSE-02**: The Daily tab shows today's closure state as a ring-style visual that fills per component and celebrates with a satisfying animation when the day closes (reduced-motion respected)
- [ ] **CLOSE-03**: User can see closure history at a glance (month/heatmap view) and a current closure streak count

### Dashboard (DASH)

- [ ] **DASH-01**: Dashboard shows weight progress over time (chart from WEIGHT-02, with range selection weeks/months)
- [ ] **DASH-02**: Dashboard shows eating trends over time — daily calories vs target and adherence (on-target days) across weeks
- [ ] **DASH-03**: Dashboard shows training consistency over time — lift and cardio frequency per week/month
- [ ] **DASH-04**: App is reorganized into a two-tab IA: Daily (today's closure + all logging) and Dashboard (long-term trends), with Settings accessible

### Settings (SET — continues v1 numbering)

- [ ] **SET-04**: User can paste and store their Anthropic API key on-device (localStorage, never in Dexie), with a clear no-key state that still lets the app work via the local parser
- [ ] **SET-05**: Daily calorie/macro targets remain configurable (carried from v1, restyled)

### Backup (BACK — continues v1 numbering)

- [ ] **BACK-03**: User can import a previously exported JSON backup to restore data (current schemaVersion only; old files rejected with a clear message)
- [ ] **BACK-05**: JSON export covers all v2 stores (weight, check-ins, library) and never includes the API key

### Visual Redesign (UI)

- [ ] **UI-01**: All screens rebuilt to a clean, sleek, Apple-design-informed system (per `.agents/skills/apple-design`), coherent across Daily, Dashboard, and Settings
- [ ] **UI-02**: Motion polish throughout (ring closure, micro-interactions, sheet transitions) per `improve-animations` guidance, performant on mid-range phones and respecting `prefers-reduced-motion`

## Future Requirements (deferred)

| ID | Requirement | Why deferred |
|----|-------------|--------------|
| TRAIN-04 | Hevy API auto-sync marks lift/cardio automatically | Requires Hevy Pro (neither user has it); TRAIN-03 keeps the door open |
| FOOD-18 | Multi-item freeform parse ("chicken and rice with veggies") | v2.x refinement; single-item parse first |
| DASH-05 | Adherence-band tuning / on-target indicators beyond defaults | Tune after real usage data exists |
| BACK-04 | Weekly export auto-prompt | Carried from v1 deferral |

## Out of Scope

| Item | Reasoning |
|------|-----------|
| Shared data / seeing each other's rings | Users explicitly chose individual installs; keeps zero-backend architecture |
| Backend, auth, cloud sync | Two independent local installs |
| Nutrition database / barcode search | AI parse + auto-library covers entry friction without external DB dependency |
| Photo-based food recognition | Anti-feature per research; high complexity, low reliability |
| Fuzzy/semantic library auto-merge | False-positive risk corrupts the library; exact normalized match only |
| Full lift tracking (sets/reps/weight) | Tracked in Hevy |
| PT rehab tracking, steps tracking | Retired v1 features |
| Notifications, streak freezes, social | Scope discipline; closure loop is the motivator |
| Weight goal projections / configurable smoothing | Anti-feature for a 2-user app; single EMA default |

## Traceability

| REQ-ID | Phase |
|--------|-------|
| MIGR-01 | Phase 5 - Data Layer Migration |
| MIGR-02 | Phase 5 - Data Layer Migration |
| MIGR-03 | Phase 5 - Data Layer Migration |
| TRAIN-01 | Phase 6 - Check-offs, Weight & Targets |
| TRAIN-02 | Phase 6 - Check-offs, Weight & Targets |
| TRAIN-03 | Phase 6 - Check-offs, Weight & Targets |
| WEIGHT-01 | Phase 6 - Check-offs, Weight & Targets |
| WEIGHT-02 | Phase 6 - Check-offs, Weight & Targets |
| SET-05 | Phase 6 - Check-offs, Weight & Targets |
| FOOD-11 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-12 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-13 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-14 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-15 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-16 | Phase 7 - AI Food Parsing & Auto-Library |
| FOOD-17 | Phase 7 - AI Food Parsing & Auto-Library |
| SET-04 | Phase 7 - AI Food Parsing & Auto-Library |
| CLOSE-01 | Phase 8 - Closure Loop, Dashboard & Redesign |
| CLOSE-02 | Phase 8 - Closure Loop, Dashboard & Redesign |
| CLOSE-03 | Phase 8 - Closure Loop, Dashboard & Redesign |
| DASH-01 | Phase 8 - Closure Loop, Dashboard & Redesign |
| DASH-02 | Phase 8 - Closure Loop, Dashboard & Redesign |
| DASH-03 | Phase 8 - Closure Loop, Dashboard & Redesign |
| DASH-04 | Phase 8 - Closure Loop, Dashboard & Redesign |
| UI-01 | Phase 8 - Closure Loop, Dashboard & Redesign |
| UI-02 | Phase 8 - Closure Loop, Dashboard & Redesign |
| BACK-03 | Phase 9 - Backup & Release Verification |
| BACK-05 | Phase 9 - Backup & Release Verification |
