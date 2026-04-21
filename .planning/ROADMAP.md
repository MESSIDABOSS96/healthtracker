# Roadmap: HealthTracker

## Overview

Four phases deliver a fully-local offline-first PWA from a bare directory to a working streak calendar loop. Phase 1 locks in the data-layer foundations (Dexie schema, dayKey, OPFS, PWA shell) that everything else builds on. Phase 2 delivers all four tracking slices in parallel-friendly plans — PT, food/macros, steps, and lifts — plus the goals settings screen. Phase 3 closes the motivational loop with the 4-segment calendar and streak count. Phase 4 adds JSON export and any remaining PWA polish, completing the data-safety story.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Scaffold + Dexie schema + dayKey + OPFS + PWA shell + dark theme
- [ ] **Phase 2: Tracking Slices** - PT templates/sessions, food library/macros, steps, lift check-in, goals settings
- [ ] **Phase 3: Streak Loop** - 4-segment DayCell, calendar month grid, day detail view, streak count
- [ ] **Phase 4: Backup & Polish** - JSON export, PWA install/icon polish, data-safety UX

## Phase Details

### Phase 1: Foundation
**Goal**: The app's non-negotiable infrastructure exists and is correct — safe local storage, correct date math, offline delivery, and dark base layout. No feature can be built without this being solid.
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, SETUP-05, DATA-01, DATA-02, DATA-03, DATA-04, DATA-05
**Success Criteria** (what must be TRUE):
  1. App installs to iOS and Android home screen from the browser and launches in standalone mode with no network connection after first load
  2. All 7 Dexie object stores (`ptTemplates`, `ptSessions`, `foods`, `mealEntries`, `stepEntries`, `liftCheckins`, `goals`) exist in IndexedDB, versioned at v1, with the append-only migration convention documented in `db.ts` comments
  3. `lib/dayKey.ts:todayKey()` returns the correct local `YYYY-MM-DD` string when called at 11:30pm in a UTC-5 context (verified by a unit test or console check)
  4. Food photos can be saved to OPFS as resized ≤800×800 WebP blobs; `foods` records hold only the `photoKey` filename reference
  5. App renders in dark mode with the base layout shell (top nav, bottom tab bar or equivalent) loading in under 1s from a warm service-worker cache
**Plans**: 3 plans
  - [x] 01-01-scaffold-shell-PLAN.md — Scaffold Vite 7 + React 19 + TS, Tailwind v4 tokens, shadcn/ui, hash routing, AppShell with bottom tab bar, Today/Calendar/Settings stubs per D-05
  - [x] 01-02-data-layer-PLAN.md — Dexie v1 with 7 stores + append-only migration comment, dayKey.ts with 11:30pm UTC-5 smoke assertion, OPFS photoStore with WebP@80% resize pipeline
  - [x] 01-03-pwa-startup-banners-PLAN.md — vite-plugin-pwa (generateSW + autoUpdate), manifest + icons + apple-touch-icon, initApp() startup (persist, lastOpenedAt, SW register), Install + Eviction banners, Settings version line, CLAUDE.md rule #5 update (JPEG→WebP)
**UI hint**: yes

### Phase 2: Tracking Slices
**Goal**: All four daily tracking areas are fully usable — user can log PT sessions against templates, log meals with macro totals, enter steps, and do a lift check-in. Goals/targets are configurable. Parallelism: PT plans and Food+Steps+Lifts+Goals plans can be developed concurrently since they share only the db layer.
**Depends on**: Phase 1
**Requirements**: PT-01, PT-02, PT-03, PT-04, PT-05, PT-06, PT-07, FOOD-01, FOOD-02, FOOD-03, FOOD-04, FOOD-05, FOOD-06, FOOD-07, FOOD-08, STEPS-01, STEPS-02, LIFT-01, LIFT-02, SET-01, SET-02, SET-03
**Success Criteria** (what must be TRUE):
  1. User can create a PT template (exercise name, target sets/reps), start a session from it, tick off exercises with actual sets/reps, add a pain rating and notes, and save — with the previous session's actuals visible during logging
  2. User can add a food to the library (name, macros, optional resized photo), then log it to today's meal log by selecting it from the Recent or Frequent quick-access list with serving size pre-filled
  3. After logging a meal, the calories/protein/carbs/fat progress bars update immediately without a page reload, showing progress against the configured daily targets
  4. User can enter today's step count and see a progress bar update toward the configured step goal
  5. User can tap a single "Lifted today" toggle and optionally add a short note; the lift check-in is stored under today's dayKey
**Plans**: TBD
**UI hint**: yes

### Phase 3: Streak Loop
**Goal**: The core motivator is live — a 4-segment calendar renders the current month showing each day's per-area completion state. Tapping a day opens that day's full detail view. The streak count is displayed. Partial fills read as positive progress, never as failure.
**Depends on**: Phase 2
**Requirements**: STREAK-01, STREAK-02, STREAK-03, STREAK-04, STREAK-05, STREAK-06, STREAK-07
**Success Criteria** (what must be TRUE):
  1. The calendar renders the current month in a month-at-a-time grid; each day shows a 4-segment indicator (PT / meals / steps / lift) that fills its segment when any log exists for that area on that day
  2. A day with 1, 2, or 3 of 4 segments logged shows a visually distinct, positive partial-fill state — no red or empty states for non-zero days
  3. A day with all 4 segments logged renders as a visually "complete" full-fill state distinct from partial days
  4. Tapping any calendar day opens a day detail view showing all four areas' logs and totals for that day
  5. The calendar screen displays the current consecutive-complete-days streak count alongside the month grid, and prev/next month navigation works
**Plans**: TBD
**UI hint**: yes

### Phase 4: Backup & Polish
**Goal**: User can export all data as a versioned JSON file from the Settings screen, and the PWA install experience is complete with proper icons and a data-safety framing for the install prompt. The data-safety story is closed before any meaningful volume of data accumulates.
**Depends on**: Phase 3
**Requirements**: BACK-01, BACK-02
**Success Criteria** (what must be TRUE):
  1. User can tap "Export" in Settings and receive a downloadable JSON file containing the versioned `ExportEnvelope` (`schemaVersion`, `exportedAt`, `appVersion`, `data`, `photos` as base64) — the download works on iOS home-screen PWA using `<a download>` without `showSaveFilePicker`
  2. The PWA install prompt is visible with data-safety framing ("install to protect your data from browser eviction") and the app has valid home-screen icons (192px and 512px) and splash configuration on both iOS and Android
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/3 | In progress | - |
| 2. Tracking Slices | 0/TBD | Not started | - |
| 3. Streak Loop | 0/TBD | Not started | - |
| 4. Backup & Polish | 0/TBD | Not started | - |
