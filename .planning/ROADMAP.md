# Roadmap: HealthTracker

## v1.0 — Solo Tracker (Closed 2026-08-08)

Phases 1–4 shipped the local-first foundation (Dexie/OPFS/PWA shell), all four v1 tracking slices, the 4-segment streak calendar, and JSON export. Full detail archived in `.planning/MILESTONES.md`. v2.0 reuses the data-layer conventions and rebuilds most of the presentation layer.

## v2.0 — Duo Redesign

### Overview

Five phases take HealthTracker from a solo PT/food/steps/lift tracker to a two-person food+training+weight tracker with AI-parsed entry and an Apple-ring-style closure loop. Phase 5 is the highest-stakes step — an append-only schema migration that must preserve all v1 history while retiring PT/steps. Phases 6 and 7 build the two new logging surfaces (check-offs/weight, then AI food parsing) low-risk-before-high-risk. Phase 8 is the payoff: the closure ring, the Dashboard, and the full visual redesign, once real data exists to visualize. Phase 9 closes the data-safety story (export/import) and verifies the schema-breaking upgrade end-to-end on both users' installed apps.

### Phase Numbering

**Integer phases (5, 6, 7...):** Continue numbering from v1.0's Phase 1–4; v2.0 starts at Phase 5.
**Decimal phases (5.1, 5.2):** Urgent insertions (marked with INSERTED). Decimal phases appear between their surrounding integers in numeric order.

## Phases

- [ ] **Phase 5: Data Layer Migration** - Schema v2 (`dailyCheckins`, `weightEntries`, evolved `foods`), lift-check-in migration, library backfill, PT/steps removed from UI
- [ ] **Phase 6: Check-offs, Weight & Targets** - One-tap lift/cardio check-offs, daily weight entry + trend chart, configurable calorie/macro targets
- [ ] **Phase 7: AI Food Parsing & Auto-Library** - Freeform type/voice food entry, AI + local-fallback parsing, confirm-before-save, self-building library with one-tap re-log
- [ ] **Phase 8: Closure Loop, Dashboard & Redesign** - Ring-style daily closure with animation, closure history/streak, Dashboard trends, two-tab IA, full Apple-design-informed visual rebuild
- [ ] **Phase 9: Backup & Release Verification** - JSON export/import for v2 schema, no API-key leakage, end-to-end upgrade verification on both installed apps

## Phase Details

### Phase 5: Data Layer Migration
**Goal**: The v2 schema exists with all v1 history preserved and PT/steps fully removed from the user-facing app, so every later phase builds on a stable, correct data layer.
**Depends on**: Nothing new (builds on v1.0 Phase 1 foundation — Dexie schema, dayKey, OPFS, PWA shell)
**Requirements**: MIGR-01, MIGR-02, MIGR-03
**Success Criteria** (what must be TRUE):
  1. Opening the app after the upgrade shows all pre-existing food logs, meals, and lift check-ins intact — lift check-ins now appear as generalized daily check-in records with no history gap.
  2. PT and Steps no longer appear anywhere in the navigation, tabs, or logging flows — no path in the UI reaches them.
  3. The food library shows correct usage counts and last-used dates for every pre-existing food item immediately after the upgrade runs, with no cold-start/empty library.
  4. The schema upgrade completes without data loss or corruption when run against a device carrying real v1 history (verified by comparing exported row counts before and after).
**Plans**: TBD

### Phase 6: Check-offs, Weight & Targets
**Goal**: Users can record lift/cardio check-offs and daily weight with minimal friction, and configure the calorie/macro targets that later phases will measure against.
**Depends on**: Phase 5
**Requirements**: TRAIN-01, TRAIN-02, TRAIN-03, WEIGHT-01, WEIGHT-02, SET-05
**Success Criteria** (what must be TRUE):
  1. User can tap once to mark "lifted" for today and tap again to undo it, with the state persisted under today's dayKey.
  2. User can tap once to mark "did cardio" for today and tap again to undo it, independently of the lift check-off.
  3. User can enter today's body weight as a single number, edit it, and never end up with more than one weight entry for the same day.
  4. User can view a weight chart showing raw daily entries plus a smoothed (EMA) trend line across weeks.
  5. User can open Settings and edit daily calorie/protein/carb/fat targets, and the new values persist and are used elsewhere in the app.
**Plans**: TBD

### Phase 7: AI Food Parsing & Auto-Library
**Goal**: Users can log food in seconds by typing (or speaking) a freeform description, review AI- or locally-computed macros before saving, and re-log repeat items with one tap — with no manual food-creation step ever required.
**Depends on**: Phase 5, Phase 6 (targets from SET-05 are needed for the live totals-vs-target display)
**Requirements**: FOOD-11, FOOD-12, FOOD-13, FOOD-14, FOOD-15, FOOD-16, FOOD-17, SET-04
**Success Criteria** (what must be TRUE):
  1. User can paste an Anthropic API key in Settings and see a clear "AI ready" vs. "no key set — local parser only" state; the app remains fully usable with no key.
  2. User can type a freeform food description and see AI-computed calories and macros appear in an editable confirm form before anything is saved to the log or library.
  3. On platforms that support it, user can dictate the same description by voice; on an installed iOS PWA where voice is unsupported, the mic control is hidden or relabeled rather than doing nothing when tapped.
  4. With no API key set or while offline, user can enter a structured shorthand description and get deterministic macros computed on-device through the same confirm form.
  5. After confirming an item once, it is saved to the library automatically (deduped by normalized name) and appears in a one-tap recent/frequent re-log list with last-used serving prefilled — no manual "create food" flow exists anywhere.
  6. The Daily tab shows live running totals of calories and macros against the configured targets as items are logged, updating without a page reload.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Closure Loop, Dashboard & Redesign
**Goal**: Users experience a satisfying ring-style daily closure that celebrates finishing food+lift+cardio, can see their closure history and streak at a glance, and can view long-term weight/eating/training trends — all inside a coherent, clean, Apple-design-informed two-tab app.
**Depends on**: Phase 6, Phase 7 (Dashboard and closure need real check-in, weight, and food data to visualize meaningfully)
**Requirements**: CLOSE-01, CLOSE-02, CLOSE-03, DASH-01, DASH-02, DASH-03, DASH-04, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. The Daily tab shows a ring that fills per component (food / lift / cardio) live as the user logs, computed by a closure service, and plays a satisfying close animation when all three are addressed — respecting `prefers-reduced-motion`.
  2. User can view a month/heatmap history of closed days and see their current closure streak count at a glance.
  3. The Dashboard tab shows a weight trend chart with weeks/months range selection, an eating-adherence view (daily calories vs. target across weeks), and a lift/cardio frequency view per week/month.
  4. The app exposes exactly two primary tabs — Daily and Dashboard — with Settings reachable from either, and no leftover v1 navigation remains.
  5. Daily, Dashboard, and Settings share one coherent clean/sleek visual system with polished, performant micro-interactions and transitions, verified on a mid-range phone.
**Plans**: TBD
**UI hint**: yes

### Phase 9: Backup & Release Verification
**Goal**: Users can fully export and restore their v2 data as JSON without ever leaking the API key, and the schema-breaking v1→v2 upgrade is verified end-to-end on both users' installed apps before v2.0 is called done.
**Depends on**: Phase 5 (final schema), Phase 8 (all stores and UI in their final v2 shape)
**Requirements**: BACK-03, BACK-05
**Success Criteria** (what must be TRUE):
  1. User can export a JSON backup that includes weight entries, check-ins, and the food library, and the exported file never contains the Anthropic API key.
  2. User can import a previously exported, current-schema JSON file and see all their data restored correctly.
  3. Importing an old or incompatible-schema JSON file is rejected with a clear message rather than crashing or partially importing.
  4. Both users' installed PWAs update cleanly through the v1→v2 schema change with no data loss and no stuck/stale service worker.
**Plans**: TBD

## Progress

**Execution Order:**
v1.0 phases 1-4 are closed. v2.0 phases execute in numeric order: 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation (v1.0) | 3/3 | Complete | 2026-08-08 |
| 2. Tracking Slices (v1.0) | 5/5 | Complete | 2026-08-08 |
| 3. Streak Loop (v1.0) | 4/4 | Complete | 2026-08-08 |
| 4. Backup & Polish (v1.0) | 5/5 | Complete (94%, UAT partial) | 2026-08-08 |
| 5. Data Layer Migration | 0/TBD | Not started | - |
| 6. Check-offs, Weight & Targets | 0/TBD | Not started | - |
| 7. AI Food Parsing & Auto-Library | 0/TBD | Not started | - |
| 8. Closure Loop, Dashboard & Redesign | 0/TBD | Not started | - |
| 9. Backup & Release Verification | 0/TBD | Not started | - |
