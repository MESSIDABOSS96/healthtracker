# Project Research Summary

**Project:** HealthTracker
**Domain:** Fully-local offline-first PWA, single-user personal health tracker
**Researched:** 2026-04-19
**Confidence:** HIGH

## Executive Summary

HealthTracker is a single-user, fully-local PWA that unifies four daily tracking domains (PT/rehab exercises, food macros, manual steps, lift check-in) behind a 4-segment calendar streak loop. No comparable app combines these domains into a unified visual; the calendar is both the core differentiator and the primary retention mechanism. The correct build approach is a thin React SPA over Dexie-backed IndexedDB with a Workbox-managed service worker — no server, no auth, no cloud dependencies at any layer. Every technology choice should bias toward fast local writes, reactive UI from `useLiveQuery`, and zero-friction mobile logging.

The recommended stack is React 19 + Vite 7 + TypeScript + Dexie 4 + Tailwind CSS 4 + shadcn/ui + react-activity-calendar + Recharts + React Hook Form + Zod. All libraries are version-verified as of April 2026 and mutually compatible. One caveat: pin Vite to 7.x until vite-plugin-pwa 1.3 resolves its Vite 8 peer-dep gap. The entire stack is offline-capable with no runtime dependencies on external services.

The two existential risks are (1) iOS storage eviction silently wiping months of data for non-installed users, and (2) subtle date-key timezone bugs producing invisible data corruption. Both must be prevented at the data-layer foundation phase before any feature work begins. A third structural risk — all-or-nothing streak anxiety causing abandonment — must be addressed in the calendar UI design: partial segment fill must read as progress, never as failure.

---

## Key Findings

### Recommended Stack

One coherent stack covers all needs with no gaps. Use React 19 + Vite 7 as the SPA foundation; Dexie 4 + `useLiveQuery` as the reactive data layer; Tailwind CSS 4 + shadcn/ui for styling; react-activity-calendar for the month-grid heatmap; Recharts for macro progress bars; RHF + Zod for all forms; Zustand for ephemeral UI state only. vite-plugin-pwa with `injectManifest` strategy handles the service worker and PWA manifest.

**Core technologies:**
- **React 19 + Vite 7 + TypeScript:** SPA scaffold — largest ecosystem, React compiler automatic memoization, Vite sub-second HMR, TypeScript required for Dexie `EntityTable` safety
- **Dexie 4.4 + dexie-react-hooks:** IndexedDB ORM — `useLiveQuery` makes the DB reactive, eliminates manual subscription wiring, `EntityTable<T,PK>` gives full TypeScript inference
- **vite-plugin-pwa 1.2 (Workbox):** Service worker + offline — zero-config precaching, install prompt, SPA navigation fallback; pin Vite to 7.x for clean peer deps
- **Tailwind CSS 4.2 + shadcn/ui:** Styling — CSS-native variables, `.dark` class toggle, shadcn copies components into source tree (zero runtime, offline-safe)
- **react-activity-calendar 3.1:** Calendar heatmap — purpose-built GitHub-contribution-graph-style grid; custom `renderBlock` prop for the 4-segment `DayCell.tsx`
- **Recharts 3.8:** Charts — SVG-native, composable, works cleanly with Tailwind CSS custom properties for macro progress bars
- **React Hook Form 7.7 + Zod 3.25:** Forms + validation — uncontrolled inputs (zero keystroke re-renders), schemas double as TypeScript types, pair via `@hookform/resolvers/zod`
- **Zustand 5:** Ephemeral UI state only — selected date, modal flags, active tab; never used for data that belongs in Dexie

**Do not use:** Next.js (SSR adds zero value, complicates service worker), Redux (Dexie + Zustand covers all state needs), CRA (unmaintained), Firebase/Supabase (require network), RxDB (sync overhead not needed), React Context for data (causes subtree re-renders that `useLiveQuery` avoids).

### Expected Features

**Must have for v1 (table stakes):**
- **PT templates + session log** — log actuals against prescribed sets/reps with notes; template must exist before session can be logged
- **Food library + meal log + macro progress bars** — custom food library (name, macros, optional photo); log to named meal buckets; daily cals/P/C/F progress bars with live-update after each entry; configurable daily targets in Settings
- **Step entry + goal progress indicator** — manual count per day, progress bar toward configurable step goal
- **Daily lift check-in** — yes/no + optional note; lowest-friction of the four domains
- **4-segment day indicator + calendar month view** — the streak loop; partial fill (1-4 segments) as visible progress; calendar depends on all four logging areas existing
- **Installable PWA + offline** — home-screen install is not optional UX; it is the iOS data-safety strategy
- **JSON export** — must ship before daily use begins; `schemaVersion` in envelope from day one

**Should have for v1.x:**
- Pain/difficulty rating (0-5) on PT sessions — HIGH value for rehab feedback, LOW complexity; single optional field
- Quick re-log / recent foods surface — most-recent and most-frequent foods one-tap on meal log screen; must ship alongside food logging or abandonment is likely
- Session history per exercise (see last actuals when logging current session)
- Streak count display alongside calendar
- JSON import (completes backup/restore loop)

**Defer to v2+:**
- Per-exercise history chart (needs enough historical data to be meaningful)
- Weekly macro summary view
- Year-view heatmap (wait until there is a full year of data)
- Meal templates / combo recall (v1.x after core loop is proven)

**Anti-features (never add):**
- Push notification reminders — notification fatigue is the #1 fitness app abandonment trigger
- Gamification layers (badges, XP, freeze tokens) — the 4-segment indicator is exactly enough gamification
- Adaptive macro targets — requires bodyweight data (explicitly out of scope)
- All-or-nothing streak resets — partial days must read as progress; never show red/empty states for partial fill

### Architecture Approach

Single Dexie instance (`db.ts`) with 7 object stores, a strict UI → services → db dependency direction, and `useLiveQuery` as the sole reactive bridge between the DB and React. Feature slices never import each other's internals; all cross-cutting reads go through `services/streak.svc.ts` which issues 4 range queries for the visible month and returns a keyed map — not 4N per-cell queries. Photos live in OPFS (not as IDB blobs), referenced by filename only in `foods.photoKey`.

**Major components and responsibilities:**
1. **`db/db.ts` + `schema.ts`** — single Dexie instance; all version declarations; TypeScript interfaces for all 7 stores; foundation everything else builds on
2. **`lib/dayKey.ts`** — canonical `todayKey()` / `dateToKey()` / `keyToDate()` using local date getters; the UTC date bug cannot occur if all code routes through this module
3. **`lib/photoStore.ts`** — OPFS read/write/delete for food photos; resize to 800×800px WebP before write; store only filename in IDB
4. **`services/*.svc.ts`** — typed Dexie query wrappers; feature components never call `db.table.where()` directly; `streak.svc.ts` aggregates all 4 stores for calendar range queries
5. **`features/` slices (pt, food, steps, lifts, calendar, settings)** — self-contained UI; consume only their own service + `lib/*` + `components/*`; calendar is the final slice built because it depends on all others
6. **`lib/exportImport.ts`** — JSON dump/restore; versioned `ExportEnvelope` with `schemaVersion`; photos embedded as base64 data URIs for self-contained backups
7. **Service worker (`src/sw.ts` via vite-plugin-pwa `injectManifest`)** — precaches app shell; `autoUpdate` + `skipWaiting` update prompt; `sw.js` must never be cached by itself

**Non-negotiable architecture decisions:**
1. **Object store layout per ARCHITECTURE.md** — 7 stores, single Dexie instance, service-layer encapsulation; cross-store transactions (export/import) require one DB
2. **`dayKey` always from local date getters** — `YYYY-MM-DD` via `getFullYear()`/`getMonth()`/`getDate()`; never from `toISOString()`; lexicographic sort equals chronological sort, enabling IDB range queries
3. **OPFS for photo storage** — `foods.photoKey` is a filename string only; resize to 800×800px WebP at 70-80% quality before write; `createObjectURL` on demand, revoke after render
4. **Dexie `liveQuery` as the only reactive layer** — components use `useLiveQuery`; no Zustand or React Context for persisted data; Zustand only for transient UI state

### Critical Pitfalls

**Top 5 that must be prevented from Phase 1:**

1. **Dexie async-in-transaction (project-breaking, silent data loss)** — Never `await` a non-Dexie promise inside `db.transaction()`. Fetch all inputs before entering the transaction; pass results in. Any macro-task yield (setTimeout, fetch, `storage.estimate()`) commits the IDB transaction and makes subsequent writes no-ops. No error is thrown; data simply disappears.

2. **iOS 7-day storage eviction (project-breaking for non-installed users)** — Safari wipes all script-writable storage for any origin inactive for 7 days of Safari use. Exception: home-screen installed PWAs are exempt. Strategy: call `navigator.storage.persist()` on launch; surface install prompt with data-safety framing; show a warning banner after 4+ days of inactivity in Safari tab.

3. **Schema migration append-only rule (project-breaking if violated)** — Every `db.version(N)` block is immutable once shipped. Never edit past versions; always add `db.version(N+1)` with `.upgrade()` handler. Document version history in `db.ts` comments. Test migrations against a real v1 DB snapshot, not a fresh install.

4. **UTC midnight date bug (high severity, invisible corruption)** — `new Date().toISOString().split('T')[0]` returns the UTC date; after 7pm in UTC-5, "today" UTC is already tomorrow local. Use `lib/dayKey.ts:todayKey()` exclusively. Unit-test at 11:30pm in a UTC-5 context before any feature ships.

5. **Photo resize before write (moderate-to-high, crashes mobile)** — Raw iPhone photos are 3-12 MB. 50 food photos without resizing equals 250 MB+ of IDB bloat; the food library crashes on low-end phones. Resize to 800×800px WebP at 70-80% quality client-side (canvas) before calling `savePhoto()`.

---

## Open Decisions That Affect Roadmap and Requirements

These are unresolved by research and must be decided before or during requirements:

1. **Segment completion definition — "any log" vs "hit target"**
   - PT segment: any session logged today, or must complete all template exercises?
   - Food segment: any meal entry logged, or must hit calorie/protein targets?
   - Steps segment: any count entered, or must reach step goal?
   - Recommendation: "any log" for PT and steps (rehab context; rest days are medically valid); "hit calorie target" for food (macros are the cut signal). Needs explicit decision before `streak.svc.ts` is written.

2. **Calendar view — month-at-a-time vs rolling 28/30 days**
   - Month-at-a-time aligns with react-activity-calendar defaults and natural mental model.
   - Recommendation: month-at-a-time for v1; rolling view is a v1.x option.

3. **Pain rating in v1 or v1.x**
   - Research rates it HIGH value, LOW complexity (single optional integer field on `ptSessions`).
   - Recommendation: add to v1 scope; the schema cost is one optional field and it closes the rehab feedback loop immediately.

---

## Implications for Roadmap

### Suggested Phase Structure

#### Phase 1: Data Layer Foundation
**Rationale:** Every feature depends on the DB schema, dayKey utility, and schema versioning convention. These must be locked before any feature code is written.
**Delivers:** `db/db.ts` (all 7 stores, version 1), `schema.ts`, `lib/dayKey.ts`, `lib/photoStore.ts`, migration convention documented in code
**Avoids:** UTC date bug, schema migration pitfall, async-in-transaction (establish transaction pattern as convention)
**Research flag:** No deeper research needed — Dexie patterns are well-established

#### Phase 2: PWA Shell + Settings
**Rationale:** The PWA manifest, service worker, and iOS storage-persistence call must exist before any data is logged. A user who starts logging before the PWA is installed faces immediate eviction risk.
**Delivers:** Installable PWA (manifest, icons, service worker with `skipWaiting` update prompt), `navigator.storage.persist()` on launch, install prompt with data-safety framing, Goals/Settings form (daily targets for cals/P/C/F/steps)
**Avoids:** iOS 7-day eviction, stale service worker
**Research flag:** No deeper research needed — vite-plugin-pwa injectManifest is documented

#### Phase 3: Food Library + Meal Log
**Rationale:** Food logging is the highest-friction domain and the dependency root for macro progress bars. Build the library (create food, photo resize/OPFS, name search) and the log (add food to day, live macro totals update) together.
**Delivers:** Food library CRUD with optional photo, meal log with recent/frequent foods quick-add, live macro progress bars, daily targets wired from Settings
**Avoids:** Photo blob pitfall (resize pipeline), food logging friction pitfall (quick re-log surface must ship here, not later)
**Research flag:** No deeper research needed — Dexie OPFS patterns are documented

#### Phase 4: PT Templates + Session Log
**Rationale:** Self-contained domain; depends only on `db.ts` and `dayKey`. PT is the most medically meaningful domain for this user. Templates-first, then session log against template.
**Delivers:** PT template CRUD (exercise name, target sets/reps, notes), session logging (actuals + notes, optional pain rating if accepted into scope), template-vs-actual diff on completion screen
**Research flag:** No deeper research needed

#### Phase 5: Steps + Lift Check-in
**Rationale:** Both are trivially simple (single integer or boolean per day, natural `dayKey` primary key). Build together since they share the same data pattern.
**Delivers:** Step entry with goal progress bar, lift yes/no check-in with optional note
**Research flag:** No deeper research needed

#### Phase 6: Calendar + Streak View (Capstone)
**Rationale:** The calendar reads from all four domains and cannot be built before they all exist. This is the feature that closes the motivational loop — it is both last by dependency graph and highest by product value.
**Delivers:** Month-grid calendar (react-activity-calendar + custom `DayCell.tsx` with 4 SVG arc segments), `streak.svc.ts` range-query aggregation (4 queries for full month, not 4N per-cell), partial-fill states visually positive for all non-zero values, streak count display
**Avoids:** Streak anxiety pitfall (no red/empty states for partial days), N×4 query anti-pattern
**Research flag:** DayCell SVG arc design and dark-mode color palette for 0/1/2/3/4 segment states need explicit design decisions before implementation

#### Phase 7: JSON Export + Backup UX
**Rationale:** Must exist before the user has data worth losing, but after data models are stable. Export after all four domains ship to avoid schema-drift import failures.
**Delivers:** JSON export with versioned `ExportEnvelope`, photos as base64 data URIs, export in Settings, first-use data-safety banner, monthly backup reminder
**Research flag:** No deeper research needed — export format is fully specified in ARCHITECTURE.md

### Phase Ordering Rationale

- Data layer (Phase 1) and PWA shell (Phase 2) are prerequisites for everything; neither can be deferred
- Food library (Phase 3) ships before PT (Phase 4) because food logging is the highest daily friction and most likely early abandonment risk
- Steps + lifts (Phase 5) are trivial in isolation but their data is required before the calendar capstone
- Calendar (Phase 6) is last by hard dependency — it reads from all 4 domain stores
- Export (Phase 7) ships after the data model is stable to avoid schema-drift import failures

### Research Flags

**Needs deeper design work during planning:**
- **Phase 6 (Calendar):** DayCell SVG segment design for the 4-arc partial-fill indicator; dark-mode color palette for 0/1/2/3/4 states; interaction design for quick lift check-in from the calendar cell

**Standard patterns, skip research phase:**
- Phases 1, 2, 3, 4, 5, 7: all patterns are documented in STACK.md, ARCHITECTURE.md, and PITFALLS.md

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry as of April 2026; all compatibility pairs confirmed |
| Features | HIGH (core), MEDIUM (PT-specific) | Core patterns verified across competitor apps; PT rehab priorities from clinical literature; user validation still needed for pain rating |
| Architecture | HIGH | Dexie/IndexedDB/OPFS patterns verified via official docs; export format is original design based on established patterns |
| Pitfalls | HIGH | iOS eviction confirmed via WebKit blog + Apple Developer Forums; transaction auto-commit via IDB spec + Dexie docs; all top pitfalls have official source backing |

**Overall confidence:** HIGH

### Gaps to Address

- **Segment completion definition** ("any log" vs "hit target"): Must be resolved before `streak.svc.ts` is designed. Recommend logging the decision in PROJECT.md Key Decisions before Phase 1 starts.
- **Pain rating field scope**: Research recommends v1 inclusion as a single optional integer on `ptSessions`. Needs owner decision before Phase 4.
- **Calendar view style** (month-at-a-time vs rolling): Recommend month-at-a-time for v1; log decision in PROJECT.md before Phase 6.
- **Rest day affordance for PT**: Required to prevent streak anxiety in a rehab context. Needs a data model decision: does a rest day create a `ptSessions` record with an `isRestDay` flag, or is it tracked separately?
- **Install prompt trigger timing**: First launch vs. after first log entry vs. after N days. Needs UX decision before Phase 2.

---

## Build Order Implications

The dependency graph is unambiguous:

```
Data layer + dayKey     must come first — everything reads/writes through these
  |
  v
PWA shell               must come before any data is logged — iOS eviction risk
  |
  v
Food library + log      highest-friction domain; builds food data model; Settings needed here
PT templates + log      self-contained; depends only on db + dayKey
Steps + lift check-in   trivial; same data pattern; can parallel PT if bandwidth allows
  |
  v
Calendar / streak       last — reads all 4 domain stores; cannot build before they exist
  |
  v
JSON export             after data model is stable — schema drift breaks import compatibility
```

The calendar is both the product's core value and the last piece of code written. Every earlier phase is building toward it. If the calendar is deprioritized or delayed, the core motivational loop never closes.

---

## Sources

### Primary (HIGH confidence)
- Dexie.js official docs — schema versioning, `useLiveQuery`, OPFS comparison, blob indexing warning
- MDN — IDBTransaction auto-commit, OPFS API, Storage quotas and eviction criteria
- WebKit Blog: Updates to Storage Policy (Safari 17) — iOS 7-day eviction, persistent storage
- vite-pwa/vite-plugin-pwa docs — injectManifest strategy, precaching, service worker registration
- Tailwind CSS v4.2 release (InfoQ, April 2026) — CSS-native variables, `@tailwindcss/vite`
- npm registry — versions verified: React 19.2.5, Dexie 4.4.2, Tailwind 4.2.2, react-activity-calendar 3.1.1, Recharts 3.8.1, RHF 7.72.1, Zustand 5.0.12 (pin Vite to 7.x)
- Frontiers in Psychology (2025) — gamification S-curve and badge burnout research

### Secondary (MEDIUM confidence)
- Apple Developer Forums — PWA home-screen data persistence beyond 7 days
- vite-plugin-pwa GitHub issue #918 — Vite 8 peer-dep gap; works in practice but unresolved officially
- Smashing Magazine (Feb 2026) — streak system UX psychology
- MacroFactor, Cronometer, MFP, Strong/Hevy — competitor feature analysis

### Tertiary (LOW confidence — needs validation during build)
- PT pain rating value for this user — assumed HIGH based on clinical rehab literature; needs user confirmation
- Segment completion definition — no prior user data; needs explicit decision by owner

---

*Research completed: 2026-04-19*
*Ready for roadmap: yes*
