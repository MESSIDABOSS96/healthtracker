# Phase 2: Tracking Slices - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 makes all four Today sections (PT, Food, Steps, Lift) actually usable end-to-end, plus the Goals/Settings configuration they depend on. After Phase 2: user can create PT templates and log sessions against them, add foods and log meals with live macro totals, enter daily steps, do the one-tap lift check-in, and configure daily targets. The Today screen frame (from Phase 1 D-05) is unchanged — each card's status slot swaps to live data while the card layout stays identical.

**Explicitly out of scope for Phase 2:** the 4-segment DayCell, the month calendar grid, streak count, day-detail view (all Phase 3), JSON export (Phase 4), and any data/logs from days other than today (edits to past days belong in Phase 3's day-detail screen).

</domain>

<decisions>
## Implementation Decisions

### Logging interaction pattern

- **D-01:** Multi-field sections (PT, Food) open a **bottom Sheet modal** on card tap. Phase 2 upgrades the Phase 1 `Sheet` component stub to the real Radix Dialog-backed shadcn Sheet (first consumer — install `@radix-ui/react-dialog` via `npx shadcn@latest add sheet` re-install).
- **D-02:** Simple sections stay **inline in the card** — no Sheet. Lift: tap `☐` glyph in the card to toggle `☐ ↔ ✓` (persists `LiftCheckin{ dayKey, lifted }` immediately). Steps: tap the card status area to reveal a single `<input type="number" inputmode="numeric">` inline; blur or Enter saves (upsert on `dayKey`).
- **D-03:** Multi-item composition uses **one Sheet with internal stacked list**. PT Sheet renders each template exercise as a row with its own actuals inputs + checkbox (D-11); Food Sheet renders picker + today's meal entries below. No nested/multi-step wizards.
- **D-04:** Post-save behavior: Sheet closes immediately on Save → Today card re-renders via `useLiveQuery` with populated status. No success toast, no stay-open state. Matches Phase 1 UI-SPEC anti-motion policy.

### Food logging flow

- **D-05:** Food Sheet opens **quick-log first**. Vertical order inside the Sheet: (1) daily macro totals bar at top [sticky], (2) Recent chips row, (3) Frequent chips row, (4) search input, (5) today's already-logged meal entries grouped by bucket. The home path for a repeat meal is one tap on a Recent/Frequent chip.
- **D-06:** New-food creation is **inline inside the picker Sheet**. If search returns no results, show a "Create '[query]'?" row → opens a create-form (name, macros fields, servingLabel, optional photo). Save both writes to `foods` store AND creates a `MealEntry` for today using the just-created food. Single action, zero trip to a separate Library screen.
- **D-07:** Photo capture uses `<input type="file" accept="image/*" capture="environment">`. On iOS this opens the rear camera directly; falls back to file picker where unsupported. Captured file flows through `src/lib/photoStore.ts:savePhoto()` (existing Phase 1 helper — WebP@80%, max 800×800, OPFS).
- **D-08:** Quick-access definitions: **Recent** = last 10 foods by `MealEntry.loggedAt` (deduped by `foodId`, keep newest). **Frequent** = top 8 foods by `MealEntry` count where `loggedAt >= now - 30*86400_000`. One-tap chip re-logs with the user's last-used `servings` for that food; `bucket` is auto-inferred from local time of day: `breakfast` <11:00, `lunch` <15:00, `dinner` <21:00, `snack` else. Tapping a just-logged entry in the "today's entries" list opens an inline edit row (change `servings`, `bucket`, or delete).

### PT template & session UX

- **D-09:** Exercises are **embedded inside `PTTemplate.exercises[]`** (current schema — no separate exercises store). PT-01 is satisfied by the template editor supporting add/edit/remove of exercise rows inline. No schema migration; `db.version(1)` stays intact. PT-02 = create/edit/delete the whole template record.
- **D-10:** Template management lives **inside the PT Sheet, above session-start**. Sheet layout: "Start session:" header → list of template cards (tap a template = start session from it) → `+ New template` button at the bottom → `⋯` overflow menu on each template card = Edit/Delete. Template editor opens as a **nested Sheet** (Radix supports stacking) with name + ordered exercise rows + add-exercise button.
- **D-11:** Session pre-populates all template exercises as rows. Each row contains: exercise name, target display (read-only, e.g. "Target: 3×15"), `actualSets`/`actualReps`/`actualDurationSec` inputs (optional depending on exercise), and an explicit `completed` checkbox. The checkbox is **independent of the actuals fields** — a row can be marked completed with 0 actuals (attempted but no reps) or have actuals filled but completed=false. Partial sessions are valid. Session-level `painRating` (0–5, optional) and `notes` (freeform) render at the bottom of the Sheet.
- **D-12:** PT-07 previous-session actuals render as **muted hint text directly under each exercise row**, e.g. `Last: 3×12 · pain 2/5 · 5 days ago`. Null/empty when no prior session exists for that exercise in the template's history. Uses the `--muted` color token (Phase 1 D-15) for visual recede. One-glance signal, no navigation.

### Goals defaults + historical-target policy

- **D-13:** On first app open, seed `goals` singleton with cut-biased defaults: `calories: 2000`, `proteinG: 180`, `carbsG: 180`, `fatG: 65`, `steps: 8000`. Seed runs inside `initApp()` (main.tsx) as a `goals.get('singleton')` → if absent → `put({ id: 'singleton', ...defaults, updatedAt: Date.now() })` block. User edits in Settings when their coach hands them real numbers. Day-1 Today cards show real progress bars immediately — no empty state.
- **D-14:** **SET-03 LOCKED (IRREVERSIBLE).** Progress bars and the future Phase 3 day-detail view always compare logs against the **current** `goals.get('singleton')` — no per-day snapshot store, no effective-dated ranges. If user changes targets, historical days re-render against the new target values. Rationale: single-user cut journey is continuous; current targets are the reference point; no migration complexity. No schema changes to support this decision.
- **D-15:** Goals form in Settings is **one form, one Save button, all 5 fields saved atomically**. Implementation: React Hook Form + Zod (install `react-hook-form`, `zod`, `@hookform/resolvers` during Phase 2). Zod schema: all 5 fields are `z.number().int().min(0)`. Form renders below the Install card and above the version line.
- **D-16:** Zero target = **"not set" sentinel**. If any goal field = 0, the corresponding progress bar shows the consumed amount only (e.g. "1420 cal") with no fill progress and no "/ target" denominator. Division-by-zero safe. Defaults from D-13 prevent this in practice but it's a defensive contract.

### Claude's Discretion

- Exact populated-card status copy formats (e.g. "Food — 1420 / 2000 cal", "PT — Upper Body · 4/6 ex", "Steps — 6400 / 8000", "Lift — ✓"). Pattern intent: title + em-dash + live status (matches Phase 1 placeholder pattern).
- Sheet open/close animation — inherit Radix Dialog default slide unless it conflicts with UI-SPEC anti-motion rule. If it feels wrong, disable and go instant.
- Food picker search mode — prefix vs substring (ARCHITECTURE.md suggests prefix via `.where('name').startsWith(query)`; substring via in-memory filter after initial fetch is acceptable for solo-user library size). Whichever feels snappiest on device.
- PT template exercise display ordering (insertion order vs explicit `order` field). Current schema has no order field — default to array index.
- Error handling for DB write failures: follow Phase 1 silent+console pattern. User-facing error toasts not in Phase 2 scope unless a write genuinely corrupts state.
- Keyboard-appearance tuning for number inputs (`inputmode="numeric"` vs `inputmode="decimal"` vs `pattern`).
- Whether to break Phase 2 into 2 plans per STATE.md hint (PT independent of Food+Steps+Lifts+Goals) or 3–4 smaller plans. Planner decides; gate is that Sheet upgrade is a shared prerequisite so either (a) first plan to execute does the Sheet upgrade and later plans consume it, or (b) a small shared "Phase 2 foundation" plan does Sheet + RHF/Zod install + goals seed before slice plans.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core value, "ship-fast working + simple" philosophy, cut context for D-13 defaults
- `.planning/REQUIREMENTS.md` — Phase 2 covers PT-01..07, FOOD-01..08, STEPS-01..02, LIFT-01..02, SET-01..03 (22 requirements)
- `.planning/ROADMAP.md` §"Phase 2: Tracking Slices" — Goal + 5 success criteria + parallelism guidance
- `.planning/STATE.md` — Open decisions ledger; notes Phase 2 parallel-plan structure + still-open segment-completion definition (for Phase 3)
- `CLAUDE.md` — Project-breaking pitfalls (esp. #1 IDB-transaction auto-commit, #3 eviction, #4 dayKey UTC bug, #5 photo resize)

### Phase 1 carry-forward (LOCKED design + code contracts)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-05 (Today screen frame), D-07/D-08 (photo pipeline), D-15/D-16 (palette + accent), D-19 (dark only), component contracts
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Typography roles, spacing scale, anti-motion policy, accessibility baselines, Sheet component reservation
- `.planning/phases/01-foundation/01-VERIFICATION.md` — Verified foundation state: 23 src/ files, 7 stores live, all 4 icons, bundle 264 KB / 85 KB gzip

### Architecture + features (research)
- `.planning/research/ARCHITECTURE.md` §"Component / Module Boundaries" — UI → services → db dependency rule; all Dexie queries behind `services/*.svc.ts`
- `.planning/research/ARCHITECTURE.md` §"State Management Pattern" — `useLiveQuery` is the reactive layer; no Zustand/Redux
- `.planning/research/ARCHITECTURE.md` §"Object Store Schema" — matches `src/db/schema.ts`; confirms index set for range queries
- `.planning/research/ARCHITECTURE.md` §"Pattern 2: Denormalize Computed Totals" — FOOD-06 intent; `MealEntry.computed*` fields written at log time
- `.planning/research/FEATURES.md` §"Table Stakes" + §"Differentiators" — Recent/Frequent surfacing rationale, inline new-food, one-tap re-log
- `.planning/research/FEATURES.md` §"PT / Rehab-Specific Features" — template vs actuals, pain rating, per-session notes, previous-session hint
- `.planning/research/PITFALLS.md` §"Pitfall 1" — MUST NOT `await` non-IDB in Dexie transactions (see CLAUDE.md rule)
- `.planning/research/PITFALLS.md` §"Pitfall 7: Food Logging Friction" — drives D-05 + D-08 quick-log design
- `.planning/research/PITFALLS.md` §"Pitfall 8: Photo resize" — already guarded by Phase 1 `photoStore.ts`; D-07 consumer only

### Existing code (Phase 1 outputs)
- `src/db/schema.ts` — LOCKED data model (all 7 record interfaces). `MealBucket` union for D-08 auto-inference. `PTTemplate.exercises[]` confirms D-09 embedded model. `PTSession.painRating`, `PTSession.notes`, per-exercise `completed` already in schema.
- `src/db/db.ts` — Dexie v1 with all 7 stores; APPEND-ONLY comments. Pitfall #1 rule documented.
- `src/lib/dayKey.ts` — `todayKey()`, `dateToKey()`, `keyToDate()` for all `dayKey` writes (Pitfall #4 guarded)
- `src/lib/photoStore.ts` — `savePhoto`, `loadPhoto`, `deletePhoto`, `resizePhoto` (WebP@80%, 800×800, OPFS)
- `src/lib/installMode.ts`, `src/lib/storageKeys.ts`, `src/lib/version.ts` — keep untouched in Phase 2
- `src/components/AppShell.tsx`, `src/components/TabBar.tsx`, `src/components/Banner.tsx` — Phase 1 shell; do not modify in Phase 2
- `src/components/ui/sheet.tsx` — **Phase 1 stub; Phase 2 first consumer upgrades to Radix** (per Plan 01-01 SUMMARY note)
- `src/components/ui/button.tsx`, `src/components/ui/card.tsx` — ready for reuse
- `src/routes/TodayScreen.tsx` — Phase 2 replaces 4-section placeholder `sections[]` with live-data components; outer frame stays
- `src/routes/SettingsScreen.tsx` — Phase 2 inserts Goals form between Install card and version line
- `src/main.tsx` — Phase 2 adds goals-seed step to `initApp()` for D-13 (after Dexie opens, before render)

### External library docs (fetch during planning if unfamiliar)
- Dexie `useLiveQuery` + `liveQuery` — https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
- Dexie query API (`where`, `orderBy`, `between`, `startsWith`) — https://dexie.org/docs/Dexie/Dexie
- Radix Dialog (shadcn Sheet backing) — https://www.radix-ui.com/primitives/docs/components/dialog
- shadcn Sheet component — https://ui.shadcn.com/docs/components/sheet
- React Hook Form — https://react-hook-form.com/get-started
- Zod — https://zod.dev
- `@hookform/resolvers` (Zod adapter) — https://github.com/react-hook-form/resolvers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (from Phase 1)
- **Dexie instance + schema:** `src/db/db.ts` + `src/db/schema.ts` — all 7 stores live at v1. Phase 2 services import `db` from here.
- **Day key utilities:** `src/lib/dayKey.ts:todayKey()` / `dateToKey()` / `keyToDate()` — ALL `dayKey` writes and all `bucket` time-of-day inference (D-08) must go through these.
- **OPFS photo helpers:** `src/lib/photoStore.ts:savePhoto/loadPhoto/deletePhoto` — D-07 consumer. Already WebP@80%, 800×800, EXIF-normalized.
- **Tokens:** `src/styles/tokens.css` — `--bg`, `--surface`, `--border`, `--muted`, `--text`, `--accent`, `--accent-25/50/75/100`. Progress bars should use `--accent` with alpha ramp sparingly; Phase 3 reserves alpha ramp for DayCell.
- **Shell components:** `AppShell`, `TabBar`, `Banner`, `Card`, `Button` — reuse unchanged.
- **Sheet stub:** `src/components/ui/sheet.tsx` — **first Phase 2 consumer upgrades to real Radix.** Re-run `npx shadcn@latest add sheet` and wire `@radix-ui/react-dialog`.

### Established Patterns
- **UI → services → db** dependency direction (ARCHITECTURE.md). Feature components never import `db` directly; always go through `src/services/*.svc.ts`. Phase 2 creates: `pt.svc.ts`, `food.svc.ts`, `meals.svc.ts`, `steps.svc.ts`, `lifts.svc.ts`, `goals.svc.ts`.
- **`useLiveQuery` for reactivity** — no Zustand/Redux/Jotai. Today cards subscribe via `useLiveQuery(() => svc.fn(todayKey()))` and re-render automatically on any write to relevant stores.
- **Denormalize totals at write** — `MealEntry.computed*` fields populated by `meals.svc.ts` at insert time; day totals are a reduce over already-fetched entries, no runtime join.
- **Silent + console pattern for non-critical errors** — Phase 1 `initApp()` try/catch pattern; carry into Phase 2 writes.
- **Feature folder layout** — `src/features/{pt,food,steps,lifts,settings}/` with `hooks.ts` per feature (useLiveQuery wrappers) + components.

### Integration Points
- **Today screen slots** (`src/routes/TodayScreen.tsx`): replace `sections` array with 4 feature components (`<PTSection />`, `<FoodSection />`, `<StepsSection />`, `<LiftSection />`). Each component keeps the card frame (Heading + status row) identical to Phase 1 placeholders — only the status slot goes dynamic.
- **Settings screen** (`src/routes/SettingsScreen.tsx`): inject `<GoalsForm />` between the Install card and the version line. Flex spacer (`<div className="flex-1" />`) stays.
- **main.tsx initApp:** add `seedGoalsIfAbsent()` call after Dexie opens, before render (D-13). Goals seed must tolerate repeat startup without overwriting.
- **Routing:** no new routes; all entry UI lives in Today-Sheet + Settings-inline per D-01..D-04.
- **package.json adds:** `@radix-ui/react-dialog` (via shadcn Sheet), `react-hook-form`, `zod`, `@hookform/resolvers`. All four are locked-in-stack per CLAUDE.md — no new stack decisions required.

</code_context>

<specifics>
## Specific Ideas

- **"Logging feels like a win"** (Core Value per PROJECT.md): every Save must feel immediate. Sheet closes, Today card updates live, no extra confirmation. D-04 enforces this.
- **Pitfall #7 (Food Logging Friction)** shapes the Food Sheet order: macro totals first, Recent chips above search, one-tap re-log with inferred bucket. Every extra tap is a retention risk.
- **Previous session hint (D-12)** is the rehab feature Anirudh specifically needs — tendonitis progression decisions happen in-app without a chart. Muted one-liner under each row is enough signal.
- **Cut-biased goal defaults (D-13):** 2000/180/180/65/8000 aren't personalized but they're in-range for an active-cut lifter and prevent the Day-1 empty-state feeling. User overrides immediately via Settings when coach gives real numbers.
- **Irreversible SET-03 lock (D-14):** explicitly accepting that historical days will "look different" if targets change later. PROJECT.md philosophy ("simple > complete") drove this pick over the snapshot-per-day model.
- **Inline-in-card for Lift + Steps (D-02):** even a Sheet for "tap ☐ → ✓" is too much ceremony. The `☐` glyph itself is the tappable affordance.

</specifics>

<deferred>
## Deferred Ideas

- **Segment completion definition** ("any log" vs "hit target for food") — Phase 3 lock before `streak.svc.ts` is written (noted in STATE.md).
- **PT rest-day affordance** — not in v1 REQs. Phase 3 or post-v1. Research calls it out; scope guardrail holds.
- **Meal templates / combos** (FOOD-09, FOOD-10) — v2. Inline new-food already addresses the "add once, log repeatedly" path; combos are additional.
- **Edit/delete for past-day entries** (older than today) — route to Phase 3's day-detail view. Phase 2 supports edit/delete of today's entries only (via tap-to-edit on the today list in the Food Sheet).
- **PT session history chart** (INSIGHT-01) — v2.
- **Weekly macro summary** (INSIGHT-02) — v2.
- **Toast primitive + error-toast UX** — deferred; Phase 2 follows Phase 1's silent+console pattern for non-fatal writes.
- **Today-card populated-status exact copy** — Claude's Discretion during planning; pattern intent fixed (title + em-dash + live status).

</deferred>

---

*Phase: 02-tracking-slices*
*Context gathered: 2026-04-20*
