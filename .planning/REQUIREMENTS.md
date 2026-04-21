# Requirements: HealthTracker

**Defined:** 2026-04-19
**Core Value:** Visual consistency feedback that makes logging feel like a win — the 4-segment day indicator and calendar streak loop drive daily return.

## v1 Requirements

Requirements for initial release. Each maps to exactly one roadmap phase.

### Setup & Shell

- [ ] **SETUP-01**: App installs as a PWA to iOS and Android home screens (manifest, icons, theme color)
- [ ] **SETUP-02**: App functions fully offline after first load (service worker precaches app shell via Workbox)
- [ ] **SETUP-03**: App calls `navigator.storage.persist()` at startup so iOS doesn't evict data after 7 days of inactivity
- [x] **SETUP-04
**: App renders in a dark, minimal, low-noise visual style as the default (and only) theme
- [ ] **SETUP-05**: App loads to a useful landing screen (today's summary + calendar) in under 1s on a warm cache

### Data Layer

- [x] **DATA-01
**: IndexedDB schema is versioned from day one via Dexie `db.version(1).stores(...)` with an append-only migration policy
- [x] **DATA-02
**: A single `dayKey` utility (`YYYY-MM-DD` in local time, built from `getFullYear/Month/Date`) is the sole source for day identity across all stores
- [x] **DATA-03
**: Object stores exist for: `foods`, `mealEntries`, `ptTemplates`, `ptSessions`, `stepEntries`, `liftCheckins`, `goals` (singleton)
- [x] **DATA-04
**: Food photos are stored in OPFS (not as blobs indexed inside IndexedDB); `foods` records hold a `photoKey` filename reference only
- [x] **DATA-05
**: Before writing to OPFS, each uploaded photo is resized client-side to ≤800×800 at ~70% JPEG quality

### PT (Physical Therapy)

- [ ] **PT-01**: User can create, edit, and delete PT exercise definitions (name, optional description, default target sets/reps or duration)
- [ ] **PT-02**: User can create, edit, and delete PT routine templates — a named list of exercises with target sets/reps per exercise
- [ ] **PT-03**: User can start a PT session from a template, which pre-populates the session with the template's exercises
- [ ] **PT-04**: User can log actual sets/reps (or duration) per exercise in a session, tick each exercise off as complete, and save
- [ ] **PT-05**: User can add a freeform notes field to each PT session (how it felt, what hurt, etc.)
- [ ] **PT-06**: User can record an optional 0–5 pain/difficulty rating on each PT session
- [ ] **PT-07**: When logging a session, the previous session's actuals for each exercise are visible for reference

### Food & Macros

- [ ] **FOOD-01**: User can add a new food to the library: name, calories, protein (g), carbs (g), fat (g), serving size label, optional photo
- [ ] **FOOD-02**: User can edit and delete foods in the library
- [ ] **FOOD-03**: User can log a meal entry: pick a food from the library, enter number of servings, assign to a meal bucket (Breakfast/Lunch/Dinner/Snack), tied to today's dayKey by default
- [ ] **FOOD-04**: The meal-log screen shows a "Recent" section surfacing the most recently logged foods for one-tap re-log with previous serving size pre-filled
- [ ] **FOOD-05**: The meal-log screen shows a "Frequent" section surfacing foods logged most often
- [ ] **FOOD-06**: Each meal entry denormalizes computed macro totals at write time (no runtime joins for day totals)
- [ ] **FOOD-07**: The day view shows live-updating progress bars for calories, protein, carbs, and fat against configured daily targets
- [ ] **FOOD-08**: User can edit and delete meal entries

### Steps

- [ ] **STEPS-01**: User can enter a step count for a given day (default: today) — one record per day, upsert semantics
- [ ] **STEPS-02**: The day view shows a progress bar for steps toward the configured daily step goal

### Lifts (Check-In Only)

- [ ] **LIFT-01**: User can tap a single "Lifted today" toggle on the day view (stores dayKey + boolean)
- [ ] **LIFT-02**: User can add an optional short note alongside the lift check-in

### Streak Calendar (Core Motivator)

- [ ] **STREAK-01**: Each day is rendered as a 4-segment indicator (quadrants: PT / meals / steps / lift)
- [ ] **STREAK-02**: A quadrant fills when any log exists for that day in its area (≥1 PT session, ≥1 meal entry, any step record, lift check-in = yes)
- [ ] **STREAK-03**: A day is rendered as "complete" (all 4 filled) only when all four quadrant conditions are met
- [ ] **STREAK-04**: The calendar renders the current month in a month-at-a-time grid with prev/next month navigation
- [ ] **STREAK-05**: Calendar cells are neutral (not red/punitive) for days with zero logs; partial fills read as positive progress
- [ ] **STREAK-06**: Tapping a calendar day opens that day's detail view (all four areas + logs + totals)
- [ ] **STREAK-07**: The calendar screen displays current streak count (consecutive "complete" days) alongside the grid

### Settings (Goals)

- [ ] **SET-01**: User can set daily targets for calories, protein, carbs, fat, and steps in a Settings screen
- [ ] **SET-02**: Target changes take effect immediately across progress bars and day views (no reload)
- [ ] **SET-03**: Goal changes are non-destructive to historical logs (historical days use their then-current targets or display against current targets consistently per decision made at build time — locked once chosen)

### Backup

- [ ] **BACK-01**: User can export all data as a single JSON file (envelope with `schemaVersion`, `exportedAt`, `appVersion`, `data`, and base64-encoded `photos` map) via a Settings button
- [ ] **BACK-02**: The export flow uses `<a download>` to work on iOS home-screen PWAs (no `showSaveFilePicker` dependency)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Backup (Restore Half)

- **BACK-03**: User can import a previously exported JSON backup; import validates `schemaVersion` and rejects files from newer schemas; import is destructive-replace with an explicit confirmation step

### History & Insights

- **INSIGHT-01**: Per-exercise PT history chart (actuals over time) once enough sessions exist
- **INSIGHT-02**: Weekly macro summary view
- **INSIGHT-03**: Year-view heatmap (once a full year of data exists)
- **INSIGHT-04**: Pain/difficulty trend chart over time

### Food Power-User

- **FOOD-09**: Meal templates / combos (e.g., "my usual breakfast") with one-tap re-log
- **FOOD-10**: Copy meals from a prior day to today

### Misc

- **SETUP-06**: In-app service-worker update prompt ("new version available — reload")
- **BACK-04**: Auto-prompt weekly for export if no export has happened recently

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Full lift tracking (sets/reps/weight) | User has another platform for this; duplicate entry defeats the purpose |
| User accounts / authentication | Solo personal tool; auth adds friction with no payoff |
| Cloud sync / hosted backend | Fully-local IndexedDB is sufficient; backend breaks offline-first philosophy |
| Apple Health / Google Fit integration | Manual entry is acceptable for v1 and avoids platform-specific plumbing |
| Barcode scanning | User explicitly preferred custom-library model; barcode adds camera + lookup API complexity |
| Third-party nutrition API (USDA / Nutritionix) | User explicitly preferred self-added foods; external dependency breaks offline-only philosophy |
| Social / sharing / leaderboards | Solo motivation tool, not a social product |
| Hydration / sleep / mood tracking | Scope-creep risk; only add if the streak loop demands more segments |
| Bodyweight / measurements | Not a stated motivator; can be revisited post-v1 if it aids the cut |
| Notification reminders | Research flagged notification spam as a top abandon trigger; rely on home-screen visibility instead |
| Streak freeze / grace-day / punitive "streak broken" UI | Research-backed anti-pattern for injury-recovery users; missed days are neutral, not punished |
| Badges / achievements / XP | Gamification overload is a documented abandon trigger for serious trackers |
| SSR / Next.js | SPA is sufficient; SSR complicates service worker lifecycle |

## Traceability

Which phases cover which requirements. Populated by the roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| SETUP-05 | Phase 1 | Pending |
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| PT-01 | Phase 2 | Pending |
| PT-02 | Phase 2 | Pending |
| PT-03 | Phase 2 | Pending |
| PT-04 | Phase 2 | Pending |
| PT-05 | Phase 2 | Pending |
| PT-06 | Phase 2 | Pending |
| PT-07 | Phase 2 | Pending |
| FOOD-01 | Phase 2 | Pending |
| FOOD-02 | Phase 2 | Pending |
| FOOD-03 | Phase 2 | Pending |
| FOOD-04 | Phase 2 | Pending |
| FOOD-05 | Phase 2 | Pending |
| FOOD-06 | Phase 2 | Pending |
| FOOD-07 | Phase 2 | Pending |
| FOOD-08 | Phase 2 | Pending |
| STEPS-01 | Phase 2 | Pending |
| STEPS-02 | Phase 2 | Pending |
| LIFT-01 | Phase 2 | Pending |
| LIFT-02 | Phase 2 | Pending |
| STREAK-01 | Phase 3 | Pending |
| STREAK-02 | Phase 3 | Pending |
| STREAK-03 | Phase 3 | Pending |
| STREAK-04 | Phase 3 | Pending |
| STREAK-05 | Phase 3 | Pending |
| STREAK-06 | Phase 3 | Pending |
| STREAK-07 | Phase 3 | Pending |
| SET-01 | Phase 2 | Pending |
| SET-02 | Phase 2 | Pending |
| SET-03 | Phase 2 | Pending |
| BACK-01 | Phase 4 | Pending |
| BACK-02 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-19*
*Last updated: 2026-04-19 after roadmap creation*
