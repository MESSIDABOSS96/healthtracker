# Project Research Summary

**Project:** HealthTracker — v2.0 Duo Redesign
**Domain:** Fully-local, offline-first PWA — AI-assisted personal health/fitness tracking (food macros, lift/cardio check-offs, weight) for two independent local users, no backend
**Researched:** 2026-08-08
**Confidence:** MEDIUM-HIGH

## Executive Summary

HealthTracker v2.0 is not a new product — it's a schema-and-UI rebuild layered onto an already-shipped, working v1 codebase (React 19 + Vite 7 + Dexie 4 + Tailwind 4, unchanged). The new surface area is: browser-direct AI food parsing (Claude Haiku via a hand-rolled `fetch`, BYOK), a self-building food library, generalized lift+cardio check-offs, weight tracking with EMA-smoothed trend charts, an Apple-Fitness-style daily "closure ring" replacing the v1 quadrant calendar, and a new Dashboard tab. Every research file agrees on the shape of the solution: keep the existing Dexie/OPFS/service-layer conventions exactly as they are, add new stores via an **appended** `db.version(2)` block, and treat AI parsing as one interchangeable provider behind a `parse.svc.ts` orchestrator with a local, network-free fallback that is always fully first-class (not a degraded backup).

The recommended approach is deliberately lean: no `@anthropic-ai/sdk` (bundle-size discipline — hand-rolled `fetch` + one required CORS header instead), no new charting library (Recharts already covers every Dashboard visualization), no fuzzy-matching or nutrition-database dependency (exact-normalized-match dedupe is sufficient at this data scale), and one new animation library (`motion`) for the ring's spring/bounce close. The single highest-leverage design decision — what "closes" the food segment of the ring — is resolved by research as a **hybrid**: any-log presence closes the ring (protects the low-friction daily win), while a secondary visual cue and the Dashboard's adherence score carry the "was it actually on-target" precision. This should be locked as a decision before ring UI implementation, exactly as flagged in PROJECT.md.

The dominant risk cluster is **silent correctness failures**, not missing features: (1) LLM unit-confusion hallucinations quietly corrupting logged macros unless every parse goes through a mandatory confirm-and-edit screen with an arithmetic-consistency check; (2) Web Speech API silently doing nothing once the PWA is installed to an iOS home screen — the exact install mode the app needs for storage durability — meaning voice must be a nice-to-have layered on a typing flow that is always fully capable, never a fallback; (3) violating the append-only Dexie migration rule while removing PT/steps and adding new stores in the same release, which is the highest-stakes migration this app will ever run since it touches real historical data unattended; and (4) reintroducing the already-known "async await inside a Dexie transaction auto-commits silently" bug via the new fetch-then-save AI parsing flow. All four are well-understood and fully preventable with patterns spelled out in ARCHITECTURE.md and PITFALLS.md — the risk is process discipline (build fallback alongside AI, never combine store deletion with other schema changes), not unknown unknowns.

## Key Findings

### Recommended Stack

The existing v1 stack (React 19, Vite 7, TypeScript, Dexie 4 + `useLiveQuery`, Tailwind 4, shadcn/ui, React Hook Form + Zod, Recharts) is unchanged and re-validated for v2's new features. Four new packages cover 100% of new v2 UI/AI needs; no chart, fuzzy-match, stats, or speech-recognition-wrapper library is needed.

**Core additions:**
- Hand-rolled `fetch()` against `api.anthropic.com/v1/messages` (no SDK) — sends `anthropic-dangerous-direct-browser-access: true` alongside `x-api-key`/`anthropic-version`; this is a confirmed, intentional Anthropic BYOK feature, not a hack. Avoids the Node-oriented `@anthropic-ai/sdk` bundle weight for a single non-streaming JSON call.
- `claude-haiku-4-5-20251001` with `output_config.format` (JSON Schema structured outputs) — guarantees valid macro JSON instead of prose-wrapped JSON; confirmed supported on this specific model snapshot.
- Native `SpeechRecognition`/`webkitSpeechRecognition` behind a hand-written ~60-80 line hook (no `react-speech-recognition` package — unmaintained, wrong abstraction shape for the iOS-standalone detection this project specifically needs) + `@types/dom-speech-recognition` as a dev dependency for types.
- `motion` (13.0.0, import from `motion/react`) for the ring-closure spring/bounce animation — full React 19 concurrent-render support.
- `sonner` (2.0.7) for toasts (parse success/failure, offline-fallback notices) and `@number-flow/react` (0.6.2) for animated macro counters.
- Existing Zod, Recharts, and `react-activity-calendar` are reused as-is (Zod validates both the AI and local-parser output through one shared schema; Recharts covers every new Dashboard chart type; `react-activity-calendar` may still be useful for a Dashboard consistency heatmap — confirm during Dashboard UI design, don't discard reflexively).

### Expected Features

**Must have (table stakes) — matches PROJECT.md's Active requirements list:**
- Freeform text entry for food with a real parser + offline fallback
- Editable confirm-before-log screen — never auto-commit an AI guess
- One-tap re-log of previously-logged/frequent items (the "auto-library" payoff)
- Binary one-tap check-off for lift and cardio (no sets/reps/duration)
- Single-field, single-tap daily weight entry (no time-of-day discipline enforced)
- A visible daily completion state that updates live and optimistically
- Long-term smoothed weight trend chart (raw dots + EMA line, not raw scatter alone)
- A weeks/months consistency/adherence view (the Dashboard's core job)
- Manual on-device API key entry with a clear "AI degraded/unavailable" indicator

**Should have (differentiators):**
- Zero-database, parse-only food entry (no search UI at all — simpler than any competitor)
- Auto-building library with zero manual "create food" step
- Apple-ring closure applied to food+lift+cardio (a genuine cross-domain synthesis, not copied)
- Dashboard combining weight + eating adherence + training consistency in one glanceable view
- `source: 'manual' | 'hevy'` field on check-off records now, at near-zero cost, to avoid an expensive retrofit later

**Defer / anti-features (explicitly avoid):**
- Full nutrition database search/browse, photo-based AI food recognition, fuzzy/semantic library dedupe, streak freezes/gamification, push notifications, weight-goal/days-to-goal projections, configurable smoothing-algorithm choice — all explicitly out of scope per PROJECT.md and/or flagged as over-engineering for a 2-user app.

### Architecture Approach

The existing layering (UI → feature `hooks.ts` → `*.svc.ts` → `db.ts`, with `useLiveQuery` for reactivity) is preserved unchanged; v2 adds new services (`checkins.svc.ts`, `weight.svc.ts`, `closure.svc.ts`, `parse.svc.ts` + a `parseProviders/` boundary, `import.svc.ts`) alongside modified ones (`food.svc.ts` gains dedupe/usage tracking, `export.svc.ts` gains a v2 envelope) and one new non-Dexie persistence helper (`lib/apiKeyStore.ts`, deliberately in `localStorage`, not Dexie, so it is *structurally* excluded from JSON export rather than relying on a filter someone has to remember).

**Major components:**
1. **`db/db.ts` `version(2)` block** — additive-only: new `dailyCheckins` (compound key `[dayKey+kind]` + a required secondary `dayKey` index for range queries) and `weightEntries` stores; `foods` gains `normalizedName`/`usageCount`/`lastUsedAt`/`servingQty`/`servingUnit`/`parseSource`. The `upgrade()` callback migrates real `liftCheckins` history into `dailyCheckins` and backfills `foods` usage stats from `mealEntries` — every `await` inside must be a `tx.table(...)` call, nothing else.
2. **`parse.svc.ts` + provider boundary** — orchestrates Anthropic vs. local parsing behind one interface; the Anthropic provider is dynamically imported (code-split, never loads for offline/no-key users); the local provider is a calculator over the user's own stated quantities, never a bundled nutrition database, and never fabricates macros for ambiguous input.
3. **`closure.svc.ts`** — replaces `streak.svc.ts`, reusing its exact range-aggregation (`Promise.all` per visible range, never per-cell) and streak-count-scan patterns against `mealEntries` + `dailyCheckins` instead of the old 4 stores.
4. **Orphaned v1 data handling** — `ptTemplates`/`ptSessions`/`stepEntries` are left declared-but-unused (Option A: omit from `version(2).stores()`, Dexie carries them forward inert); store *deletion* (`: null`) must happen only in a later, fully isolated version bump per Dexie's documented deletion-plus-other-changes bug.
5. **Route/IA change** — `/today`→`/daily` (closure state + all entry points), `/calendar`→`/dashboard` (Recharts trend/adherence views), `/day/:dayKey` and HashRouter unchanged.

### Critical Pitfalls

1. **API key leaks via JSON export/logs** — the key must live in its own record (or `localStorage`, per architecture recommendation) excluded from the export **allowlist by construction**, never included via a naive `...settings` spread; mask the key in the UI and never log request/response bodies.
2. **Web Speech API silently breaks once installed to the iOS home screen** — the exact install mode the app needs for `navigator.storage.persist()` durability. Voice must be a nice-to-have layered on typing; detect standalone mode + feature presence and hide/relabel the mic rather than leaving a silently-dead button.
3. **LLM macro hallucination (unit confusion, inconsistent arithmetic)** — mandatory confirm-before-save screen showing the model's *interpreted quantity/unit*, plus a Zod-validated arithmetic-consistency check (`calories ≈ protein*4 + carbs*4 + fat*9`) that flags rather than silently trusts suspect parses. Never auto-commit an AI guess.
4. **Removing PT/steps by editing `version(1)` (violates append-only rule)** — must be a *new* version block with `{ table: null }`, never a bundled deletion alongside other structural changes in the same version, per Dexie's own documented bug in combining deletion with other upgrade work.
5. **Reintroducing the "await non-IDB promise inside a Dexie transaction" bug via the new fetch-then-save AI flow** — resolve the Claude call to a plain object *before* opening any `db.transaction()`; the transaction body must only ever await other Dexie calls. This is the single most likely place in v2 to reintroduce a known, project-breaking v1 bug because "fetch, then save" is the natural code shape.

Additional moderate pitfalls worth carrying into planning: weight dayKey collision policy (last-write-wins with visible feedback) + mandatory EMA trend line (raw daily weight is noise-dominated); `schemaVersion` bump discipline for export/import after feature removal (must produce a clear "X items not imported" summary, not a crash or silent drop); `useLiveQuery` subscription explosion on the Dashboard (one query per chart/date-range, not per cell/data-point); ring-closure animation jank on budget Android (prefer `transform`/`opacity`-driven, GPU-compositable animation over raw `stroke-dashoffset`/gradient recalculation, and test on the lower-spec of the two users' real phones); and re-verifying the service-worker update-prompt flow end-to-end given this is the single riskiest schema-plus-UI release the app will ever ship.

## Implications for Roadmap

ARCHITECTURE.md's researched build order is the strongest available signal for phase sequencing — it is derived directly from dependency analysis of the target system, not just feature grouping. FEATURES.md's dependency graph and PITFALLS.md's phase mapping both corroborate the same order independently. Given this project's config (coarse granularity, 4 phases target), the 5 architecture-suggested steps compress naturally into ~4 phases by merging steps 1 and the start of 2, or keeping 5 phases if the roadmapper judges phase 1 (schema) too foundational/risky to combine with anything else.

### Phase 1: Data Layer Migration (Schema v2 + Feature Removal)
**Rationale:** Every other new feature (check-offs, weight, parsing, closure) depends on the new `dailyCheckins`/`weightEntries` stores and evolved `foods` shape existing first. This is also where the project's single highest-stakes migration risk lives (append-only rule, real historical data, unattended `upgrade()` callback) — get the pattern right before any UI touches it.
**Delivers:** `db.version(2)` block (additive `dailyCheckins`, `weightEntries`, evolved `foods`), `liftCheckins`→`dailyCheckins` data migration, `foods` usage-count backfill, PT/steps code deletion (stores left orphaned-but-declared per Option A, no deletion this release).
**Addresses:** Hevy-sync-ready `source` field (FEATURES.md), schema prerequisites for all Active requirements.
**Avoids:** Pitfall 4 (append-only violation), Pitfall 5 groundwork (transaction discipline established here), Pitfall 9 (export/import schemaVersion mismatch after removal).

### Phase 2: Check-offs, Weight, and Local-Only Logging
**Rationale:** Straightforward CRUD against the Phase 1 schema with no AI/network dependency — lowest risk, validates the new data layer end-to-end before the highest-uncertainty piece (AI parsing) is attempted.
**Delivers:** `checkins.svc.ts` (lift + cardio one-tap tiles), `weight.svc.ts` (single-entry-per-day CRUD), minimal UI for both.
**Uses:** Existing Dexie/`useLiveQuery` conventions; no new stack dependencies.
**Implements:** `checkins.svc.ts`, `weight.svc.ts` from ARCHITECTURE.md.
**Avoids:** Pitfall 8 (weight dayKey collision policy must be decided and tested here, before Dashboard consumes it).

### Phase 3: AI Food Parsing + Auto-Library
**Rationale:** The single highest-uncertainty piece (external API, structured-output reliability, offline fallback UX, voice-input platform limitation) — build once the data layer beneath it (Phase 1) is stable, so parsed items land somewhere correct.
**Delivers:** `parse.svc.ts` orchestrator + `anthropic.provider.ts`/`local.provider.ts`, `apiKeyStore.ts` (localStorage, excluded from export by construction), `food.svc.ts` dedupe/usage-tracking evolution, freeform entry UI with mandatory confirm-before-save screen, recent/frequent one-tap re-log list, voice-input hook with standalone-PWA detection and graceful text-first fallback.
**Addresses:** AI-parsed food entry, smart auto-library, one-tap re-log (all P1 in FEATURES.md's prioritization matrix).
**Avoids:** Pitfall 1 (API key leakage), Pitfall 2 (voice silently breaking on iOS standalone), Pitfall 3 (LLM hallucination — confirm screen + arithmetic-consistency check), Pitfall 5 (transaction/fetch ordering), Pitfall 7 (double-log race conditions on one-tap re-log).

### Phase 4: Closure Loop + Dashboard
**Rationale:** Depends on Phases 2 and 3 producing real `mealEntries`/`dailyCheckins`/`weightEntries` data to visualize meaningfully; this is also where the outstanding "food closure semantics" design decision (hybrid any-log + secondary on-target indicator, per FEATURES.md's Option C recommendation) must be locked before implementation, mirroring how v1 locked its equivalent decision before Phase 3.
**Delivers:** `closure.svc.ts` (replaces `streak.svc.ts`), ring-closure UI (`motion`-driven spring/bounce), `/daily` route (today's ring + all entry points), `/dashboard` route (Recharts weight trend + eating-adherence + training-consistency views), `NumberFlow` animated counters.
**Addresses:** Daily closure loop, Daily tab, Dashboard tab (all P1 in FEATURES.md).
**Avoids:** Pitfall 10 (`useLiveQuery` subscription explosion — one query per chart/date-range), Pitfall 11 (ring animation jank on budget Android — `transform`/`opacity`-driven, tested on real low-end hardware).

*(If the roadmapper prefers a 5th phase rather than compressing, Export/Import v2 + final PWA/rollout verification can be split out as its own phase — it depends on every prior store shape being final, and is where the service-worker update-prompt flow for this schema-breaking release must be verified end-to-end on both users' installed apps before calling v2 complete. See ARCHITECTURE.md's build-order step 5 and PITFALLS.md's Pitfall 12.)*

### Phase Ordering Rationale

- **Schema-first is non-negotiable:** every other phase's services and UI read/write the Phase 1 stores; sequencing anything AI- or UI-related before the schema is stable would mean building against a moving target.
- **Low-risk-before-high-risk:** check-offs/weight (Phase 2) have no external dependencies and validate the data layer cheaply; AI parsing (Phase 3) is deliberately sequenced after, so its own risk (external API reliability, voice platform gaps) doesn't compound with schema risk simultaneously.
- **Closure/Dashboard last because it's a consumer, not a producer:** FEATURES.md's dependency graph is explicit that "Dashboard requires closure history to already be capturable" — building it earlier would mean visualizing empty/fake data.
- **The two hardest open design decisions (ring closure semantics, ring visual geometry) are placed at the start of Phase 4, not earlier** — they only need to be locked immediately before the phase that implements them, matching v1's own precedent of locking the equivalent decision right before Phase 3 there.

### Research Flags

Phases likely needing deeper research during planning (`/gsd-research-phase`):
- **Phase 3 (AI Parsing + Auto-Library):** Highest uncertainty in the whole milestone — structured-output reliability on the exact model slug at implementation time (model names iterate on a 6-12 month cadence), Web Speech API behavior may have shifted since this research (re-verify against current WebKit release notes), and the "hybrid" auto-library dedupe UX has no directly comparable shipped competitor pattern (LOW-MEDIUM confidence in FEATURES.md).
- **Phase 4 (Closure Loop + Dashboard):** The ring-closure completion semantics decision (Option C hybrid) is a synthesized recommendation, not observed in a shipped competitor product (MEDIUM confidence) — worth a focused design pass before locking; ring animation performance on the specific lower-spec device in use should be spiked early in this phase, not assumed from research alone.

Phases with standard, well-documented patterns (research-phase optional):
- **Phase 1 (Data Layer Migration):** Dexie versioning/migration mechanics are HIGH confidence, directly sourced from official docs and the existing codebase's own established conventions.
- **Phase 2 (Check-offs + Weight):** Pure CRUD against a settled schema, directly analogous to v1's already-shipped `liftCheckins` pattern — no new technical territory.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Anthropic docs and npm versions fetched/verified live on the research date; only the exact Haiku model slug and Chrome on-device speech reliability are flagged as needing re-verification at implementation time (models iterate on a 6-12 month cadence). |
| Features | MEDIUM | HIGH on Apple ring semantics and weight-smoothing math (well-documented, corroborated); MEDIUM on AI-parse confirm/edit UX (sourced from MacroFactor's public beta docs, not hands-on trial); LOW-MEDIUM on the auto-library dedupe UX specifically — no mainstream app publishes an equivalent "zero manual creation" pattern to compare against, this is a synthesized recommendation. |
| Architecture | HIGH for Dexie migration mechanics, layering, and OPFS/SW strategy (read directly from the existing shipped codebase); MEDIUM for the Anthropic browser-direct call pattern and exact model id (server-side capability, not a frontend concern, but still worth reconfirming); explicitly LOW/flagged for the exact closure/ring completion semantics — an open decision by design, not a research gap. |
| Pitfalls | HIGH for Dexie/IndexedDB and iOS PWA storage-eviction mechanics (official docs, WebKit bug tracker, Dexie maintainer sources); MEDIUM for LLM-parsing hallucination patterns and Web-Speech-in-standalone-PWA specifics (community reports and benchmark papers, no single authoritative source covers this exact combination — recommend re-verifying voice-input behavior on both users' actual installed devices before committing to voice-first UX). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Ring-closure completion semantics (food segment: any-log vs. hit-target vs. hybrid)** — FEATURES.md and ARCHITECTURE.md both independently flag this as unresolved by research alone and recommend the Option C hybrid, but it is a design decision, not a fact to look up. Lock explicitly before Phase 4 implementation, per PROJECT.md's own note.
- **Ring visual geometry/animation feel (segment count, bounce intensity, color palette)** — inherited as an open decision from v1's equivalent "DayCell SVG geometry" question; needs a dedicated design pass consulting the installed `apple-design`/`improve-animations` skills, not resolvable from research.
- **Exact Claude model slug and structured-outputs parameter shape at implementation time** — verify `claude-haiku-4-5-20251001` (or whatever current dated snapshot exists) and `output_config.format` against `platform.claude.com/docs` immediately before building `anthropic.provider.ts`, since this research is time-boxed to 2026-08-08 and Anthropic iterates model names/API surface on a routine cadence.
- **Web Speech API standalone-PWA behavior on both users' actual phones** — research relies on community/forum reports (MEDIUM-HIGH confidence but not first-party Apple documentation); must be verified on-device before voice input is presented as anything more than a best-effort enhancement.
- **EMA alpha value and adherence-band thresholds for the food segment's secondary on-target indicator** — reasonable defaults are proposed (alpha ≈ 0.1-0.15; ±10% calorie band) but both are explicitly flagged as needing a spot-check against a few real weeks of both users' data, not treated as final.

## Sources

### Primary (HIGH confidence)
- Claude Platform Docs — TypeScript SDK & Structured Outputs (fetched live 2026-08-08): browser-direct call pattern, `output_config.format`, model support for `claude-haiku-4-5-20251001`
- Simon Willison — Claude's API CORS support (anthropic-dangerous-direct-browser-access origin and intent)
- Existing HealthTracker codebase (`src/db/db.ts`, `src/services/*.svc.ts`, `src/lib/photoStore.ts`, `src/main.tsx`) — ground truth for v1-as-shipped architecture
- Dexie.js official docs — `Dexie.version()`, compound indexes, `useLiveQuery()`
- Apple — "Close Your Rings" / Apple Support ring-goal documentation
- npm registry live version checks (2026-08-08) for all new packages

### Secondary (MEDIUM confidence)
- MacroFactor product page + Help Center — AI food-logging confirm/edit UX pattern
- MyFitnessPal Blog/Support — recent/quick-add/copy-meal patterns
- Happy Scale support docs — weight-smoothing algorithm tradeoffs
- Apple Developer Forums (multiple threads) — standalone-PWA `SpeechRecognition` failure reports
- WebKit Bug #239816, WebKit Blog (Safari 26 release notes) — Web Speech / secure-context standalone gaps
- arXiv NutriBench, ScienceDirect ChatDiet — LLM nutrition-estimation hallucination research
- Dexie.js GitHub Issues #275, #742, #889, #276 — store-deletion-during-upgrade bugs

### Tertiary (LOW confidence, flagged for validation)
- General fuzzy-matching literature (DataLadder, WinPure) — used only to justify avoiding fuzzy dedupe, not to source an implementation
- Medium/bagrounds.org — Chrome on-device speech reliability (inconsistent, single-source-ish reports)
- Trophy.so — Apple ring psychology framing (third-party analysis, not primary source)

---
*Research completed: 2026-08-08*
*Ready for roadmap: yes*
