---
phase: 01-foundation
plan: 02
subsystem: database
tags: [dexie, indexeddb, opfs, dayKey, photo-pipeline, data-layer, schema-versioning]

requires:
  - phase: 01-foundation-01
    provides: Vite 7 + React 19 + TypeScript scaffold with Dexie 4.4 and dexie-react-hooks installed; @/* path alias and strict TS already wired
provides:
  - Dexie HealthTrackerDB with version(1).stores({...}) declaring all 7 object stores
  - 7 TypeScript record interfaces (PTTemplate, PTSession, Food, MealEntry, StepEntry, LiftCheckin, Goals) + MealBucket union
  - Append-only schema-version policy documented in db.ts header (Pitfall #2 guard)
  - Non-IDB-await transaction rule documented in db.ts header with CORRECT/FORBIDDEN examples (Pitfall #1 guard)
  - dayKey utility — todayKey(), dateToKey(date), keyToDate(key) — local-time YYYY-MM-DD identity
  - Dev-only smoke module asserting the 11:30pm UTC-5 → '2026-04-19' regression case (Pitfall #4 tripwire)
  - OPFS photoStore — savePhoto / loadPhoto / deletePhoto / resizePhoto helpers with WebP@80% + 800px defaults, EXIF orientation handled
  - Generated photoKey filename pattern (food-<uuid>.webp)
affects: [01-03-pwa-startup-banners, phase-02-tracking-slices, phase-03-streak-loop]

tech-stack:
  added: []
  patterns:
    - "Dexie schema declared in single db.ts file; all version(N).stores() blocks live together with header-comment version history"
    - "Append-only migrations: future schema changes add version(N+1).stores().upgrade(), never edit a shipped block"
    - "dayKey is the SOLE source of day identity — local getters only, never the UTC ISO formatting path"
    - "Photos in OPFS keyed by generated UUID filename; Dexie records hold only the string reference (Pitfall #6)"
    - "Resize-before-save is invariant: callers MUST run savePhoto(await resizePhoto(file)); raw Files never reach savePhoto"
    - "Dev-only smoke modules: tree-shakeable assertion files that opt-in via initApp() under import.meta.env.DEV"

key-files:
  created:
    - src/db/schema.ts
    - src/db/db.ts
    - src/lib/dayKey.ts
    - src/lib/dayKey.smoke.ts
    - src/lib/photoStore.ts
  modified: []

key-decisions:
  - "Used quoted property names ('ptTemplates': ..., 'ptSessions': ...) in version(1).stores({...}) for explicit grep-ability and to satisfy plan acceptance criteria; semantically identical to bare-identifier form in JS object literals"
  - "Reworded dayKey.ts header comments to avoid the literal tokens 'toISOString' and 'new Date(key)' so the strict grep acceptance criteria pass (==0). Safety intent preserved — comments still document the failure mode and reference Pitfall #4"
  - "Dexie database opens lazily on first query (no eager open in module init); connection deferred until Plan 03 wires initApp() and the first useLiveQuery fires"
  - "console.assert smoke check chosen over Vitest framework (CONTEXT.md Claude's-discretion item) — RESEARCH.md §2 recommendation; Vitest is overkill for a 3-line utility"
  - "createImageBitmap uses imageOrientation: 'from-image' to honor EXIF (one-line safe-to-include modern-browser support per RESEARCH.md §3)"
  - "photoStore is intentionally NOT imported anywhere yet — stays tree-shakeable until Phase 2 Food UI consumes it"

patterns-established:
  - "Dexie stores() declaration cheat-sheet: bare property = primary key OR index; '&' unique; '*' multi-entry; '++' auto-increment; '[a+b]' compound. Phase 1 uses none of the special prefixes — all keys are manual UUID strings or natural dayKey strings"
  - "Natural-key stores: stepEntries and liftCheckins use dayKey as PK directly (one record per day, upsert via put())"
  - "Singleton store pattern: goals uses id=='singleton' literal as the only key"
  - "Denormalized totals: MealEntry stores computedCalories/Protein/Carbs/Fat at write time so day totals are a reduce, not a join (FOOD-06 prep for Phase 2)"

requirements-completed: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05]

duration: 5min
completed: 2026-04-21
---

# Phase 01 Plan 02: Data Layer Summary

**Dexie v1 schema (7 stores) + canonical local-time dayKey utility + OPFS WebP@80% photo pipeline — all four project-breaking pitfalls (#1, #2, #4, #5/6) codified at point-of-first-use with grep-verifiable header guards.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-21T03:18:25Z
- **Completed:** 2026-04-21T03:23:25Z
- **Tasks:** 3 (all atomic-committed)
- **Files modified:** 5 created, 0 pre-existing modified

## Accomplishments

- Phase 2 has a complete data foundation to build on: `db`, `todayKey`/`dateToKey`/`keyToDate`, and `savePhoto`/`loadPhoto`/`deletePhoto`/`resizePhoto` are importable by path with no further foundation work.
- All 7 stores declared with correct primary-key conventions (UUID PK for ptTemplates/ptSessions/foods/mealEntries; natural dayKey PK for stepEntries/liftCheckins; singleton id PK for goals).
- Pitfall #4 (UTC midnight bug) has an active per-launch tripwire ready for Plan 03 to wire — `dateToKey(2026-04-19 23:30 local) === '2026-04-19'` will console.assert on every dev launch.
- Photo pipeline locked to WebP@80% + 800px (D-07) with EXIF orientation handled — no future iPhone-portrait-rotated-sideways bug.
- `npm run typecheck` and `npm run build` exit 0 throughout; bundle size unchanged (256 KB / 82 KB gzip JS) because new modules are not yet imported (tree-shaken).

## Task Commits

Each task was committed atomically on `main`:

1. **Task 1: Dexie v1 schema with 7 stores + TypeScript interfaces + append-only migration guard comments** — `4d6108a` (feat)
2. **Task 2: Create dayKey utility with 11:30pm UTC-5 dev smoke assertion (Pitfall #4 guard)** — `03c03ef` (feat)
3. **Task 3: Build OPFS photoStore with WebP@80% resize pipeline (Pitfall #5, D-07, D-08, Rule #5/#6)** — `2d887eb` (feat)

## Exact `version(1).stores({...})` Declaration

For Phase 2 reviewers to double-check against ARCHITECTURE.md §"Object Store Schema":

```typescript
this.version(1).stores({
  'ptTemplates':  'id, name, createdAt',
  'ptSessions':   'id, dayKey, templateId, loggedAt',
  'foods':        'id, name, createdAt',
  'mealEntries':  'id, dayKey, foodId, loggedAt',
  'stepEntries':  'dayKey',
  'liftCheckins': 'dayKey',
  'goals':        'id',
});
```

This matches ARCHITECTURE.md §"Object Store Schema" verbatim (modulo single-quoted property names — see Key Decision above).

## Field-Type Deviations from ARCHITECTURE.md §"Object Store Schema"

The plan's task action listed a Phase-1-minimum shape that differs from ARCHITECTURE.md in a few cosmetic places. The plan explicitly authorized using its shape ("Phase 2 will extend as needed") so these are not deviations from the plan. Differences vs ARCHITECTURE.md, for the Phase 2 author's awareness:

| Field path | ARCHITECTURE.md | This plan's shape (used) | Note |
|------------|-----------------|--------------------------|------|
| `PTTemplate.targetSets/Reps` | flat number fields | nested `exercises[]` array of per-exercise targets | Plan-shape is richer — supports multi-exercise templates which Phase 2 will need for PT-02 |
| `PTTemplate.targetDurationSecs` | named `targetDurationSecs` | `targetDurationSec` (singular) inside `exercises[]` | Cosmetic naming difference; Phase 2 should standardize when it adds the form |
| `PTSession.exercises[]` | flat actualSets/Reps on the session | nested `exercises[]` mirroring template structure | Plan-shape is richer for the same reason |
| `PTSession.painRating` | NOT in ARCHITECTURE.md | added per PT-06 | Phase 2 PT requirement |
| `Food.brand` | present in ARCHITECTURE.md | omitted | Plan-shape minimum; Phase 2 should add when FoodForm needs it |
| `Food.calories/proteinG/...` | named `caloriesPerServing/proteinG/...` | `calories/proteinG/...` (no "PerServing" suffix) | Cosmetic — Phase 2 should standardize before food.svc.ts is written |
| `MealEntry.foodName` | denormalized snapshot present | omitted | Phase 2 must add for "log survives food rename" semantics; the plan's `computed*` fields cover macro denormalization but not the name snapshot |
| `MealEntry.bucket: MealBucket` | named `mealLabel: 'breakfast'\|...` (loose union) | strict `MealBucket` type | This plan's stricter shape is preferred — keep |
| `MealEntry.computed*` | named `caloriesTotal/proteinGTotal/...` | `computedCalories/computedProteinG/...` | Cosmetic; Phase 2 should standardize |
| `Goals.id` | typed as literal `'singleton'` | typed as `string` | This plan's shape is looser; could be tightened to `'singleton'` literal for type-safe singleton |

**Phase 2 PR reviewer recommendation:** Lock the canonical field names (especially `Food.calories` vs `caloriesPerServing` and `MealEntry.computedCalories` vs `caloriesTotal`) before food.svc.ts and meals.svc.ts are written. Renaming after the fact requires a Dexie v2 migration with `.upgrade(tx => ...)`.

## Smoke Module Wiring (Plan 03 Action Item)

`src/lib/dayKey.smoke.ts` exports `runDayKeySmoke()` but is **NOT yet imported anywhere**. This is intentional — it stays tree-shakable in production builds. **Plan 03 must wire it from `initApp()` under an `import.meta.env.DEV` guard** to activate the per-launch tripwire. Recommended call site:

```typescript
// In Plan 03's main.tsx / initApp():
if (import.meta.env.DEV) {
  const { runDayKeySmoke } = await import('./lib/dayKey.smoke');
  runDayKeySmoke();
}
```

## CLAUDE.md Rule #5 Update (Plan 03 Action Item)

CLAUDE.md still reads:

> "Resize photos to ≤800×800 @ ~70% JPEG before OPFS write — raw iPhone photos fill quota and crash the tab."

CONTEXT.md D-07 supersedes this with WebP@80%. **Plan 03 is responsible for editing CLAUDE.md** to:

> "Resize photos to ≤800×800 @ 80% WebP before OPFS write — raw iPhone photos fill quota and crash the tab."

`src/lib/photoStore.ts` header comment (lines 11-12) explicitly flags this for Plan 03.

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `src/db/schema.ts` | TypeScript interfaces for all 7 record types + MealBucket union | 84 |
| `src/db/db.ts` | HealthTrackerDB Dexie class with version(1).stores() + Pitfall #1/#2 header guards | 69 |
| `src/lib/dayKey.ts` | todayKey/dateToKey/keyToDate — local-time YYYY-MM-DD identity (Pitfall #4 guard) | 26 |
| `src/lib/dayKey.smoke.ts` | runDayKeySmoke() dev-mode console.assert tripwire (Apr 19 2026 23:30 → '2026-04-19') | 35 |
| `src/lib/photoStore.ts` | OPFS save/load/delete + resize (WebP@80%, max 800px, EXIF-aware) | 75 |

## Decisions Made

- **Quoted property names in stores() block:** `'ptTemplates': ...` instead of bare `ptTemplates: ...`. Semantically identical in JS object literals. Chosen so the plan's `grep -c "'ptTemplates'"` style acceptance criteria (which expect quoted literals) pass cleanly. The skeleton in the plan body used bare identifiers — this is a stylistic adjustment that better matches the verification harness.
- **Reworded dayKey.ts comments to avoid literal forbidden-API tokens:** The plan transcribed comments containing `toISOString` and `new Date(key)` as documentation of what NOT to use, but the same plan asserted those tokens must appear 0 times in the file. Resolved by paraphrasing: comments now describe "the UTC ISO-formatting path" and "direct ISO-date parsing" instead of the literal tokens. Safety intent preserved (still references Pitfall #4 + CLAUDE.md rule #3 + 23:30 UTC-5 example); strict grep counts pass.
- **No eager Dexie open:** db.ts only constructs the HealthTrackerDB instance — actual IDB connection opens lazily on first query (per RESEARCH.md §6 startup invariants). Avoids blocking render before initApp().
- **console.assert smoke (not Vitest):** RESEARCH.md §2 recommendation; CONTEXT.md explicitly listed Vitest as Claude's-discretion. Smoke module is tree-shakeable when not opt'd in.
- **EXIF orientation included in Phase 1:** RESEARCH.md §3 noted `imageOrientation: 'from-image'` is a one-line safe-to-include fix on all target browsers (Chrome 90+, Safari 15+, Firefox 103+). Including now avoids a known Phase 2 Food UI bug (iPhone portrait photos appearing sideways).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded `dayKey.ts` header comments to satisfy strict grep acceptance criteria**

- **Found during:** Task 2 (acceptance-criteria verification)
- **Issue:** The plan's `<action>` block for Task 2 instructed transcribing a header comment block that contained the literal tokens `toISOString` (line 7 of the skeleton: `// new Date().toISOString().split('T')[0] ...`) and `new Date(key)` (line 24: `// NOT \`new Date(key)\` which parses ISO-date as UTC midnight`). The same plan's acceptance criteria required `grep -c 'toISOString' src/lib/dayKey.ts == 0` and `grep -c "new Date(key)" src/lib/dayKey.ts == 0`. Verbatim transcription violated the grep checks; a strict reading of the criteria required removing the safety documentation.
- **Fix:** Reworded the header comment block to paraphrase the forbidden APIs ("the UTC ISO-formatting path", "direct ISO-date parsing") while still naming Pitfall #4, CLAUDE.md rule #3, and the 11:30pm UTC-5 failure mode. The didactic value is preserved; literal tokens that would falsely flag the file as USING the forbidden API are gone.
- **Files modified:** `src/lib/dayKey.ts` (header comment only)
- **Verification:** `grep -c 'toISOString' src/lib/dayKey.ts` → 0 ✓; `grep -c 'new Date(key)' src/lib/dayKey.ts` → 0 ✓; `grep -c 'getFullYear' src/lib/dayKey.ts` → 1 ✓; `grep -c 'Pitfall' src/lib/dayKey.ts` → 1 (still references the pitfall)
- **Committed in:** `03c03ef` (Task 2)

**2. [Rule 2 - Documentation Preserved] `Food.photoKey` comment causes `grep -c 'photoKey' src/db/schema.ts` to return 2, not the criterion's expected 1**

- **Found during:** Task 1 (acceptance-criteria verification)
- **Issue:** The acceptance criterion `grep -c 'photoKey' src/db/schema.ts returns 1` expects exactly one occurrence. The implementation has two: (a) the field declaration `photoKey?: string;` and (b) a header doc-comment that names `Food.photoKey` while explaining the Pitfall #6 invariant.
- **Fix:** Kept both occurrences. The intent of the criterion is clearly "the photoKey field exists" — both occurrences confirm that, and the doc comment is essential safety documentation for the project-breaking Pitfall #6 rule (CLAUDE.md rule #6: "Photos live in OPFS, not as Dexie blobs"). Removing the safety comment to satisfy a strict count would lower defense against future regressions.
- **Files modified:** None (kept existing safety comment)
- **Verification:** Field exists ✓; comment names it ✓; `grep -c 'photoKey: *Blob' src/db/schema.ts` → 0 ✓ (the actually-important Pitfall #6 check)
- **Committed in:** `4d6108a` (Task 1)

**Total deviations:** 2 (1 Rule 3 blocking, 1 Rule 2 essential-doc preservation). 0 Rule 1, 0 Rule 4. No scope creep, no architectural changes.

## TDD Gate Compliance

N/A — this plan has `type: execute`, not `type: tdd`. No RED/GREEN/REFACTOR gate sequence required.

## Issues Encountered

- **Plan acceptance criteria vs verbatim-transcribe instructions:** The plan instructed verbatim transcription of code skeletons that contained safety-documentation comments referencing forbidden APIs by name, but its grep acceptance criteria treated the presence of those API names as failure. Two minimal reword/keep decisions resolved this without changing semantics. Future plan authors should use grep patterns like `grep -E '^\s*[^/].*toISOString'` (excluding comments) or use AST checks if they want to assert "API not used in code" without forbidding documentation.
- **No runtime errors:** typecheck and build pass cleanly throughout. No iteration loops on any task.

## User Setup Required

None — no external services configured, no environment variables required, no DB needs to be created (Dexie does that lazily on first query in browser).

## Known Stubs

None. All five files contain complete, production-ready implementations. The OPFS photoStore is unimported (tree-shaken from current bundle) by intent — Plan 03's Phase 2 Food UI is the consumer.

## Threat Flags

None. The plan's `<threat_model>` enumerated 6 threats; all `mitigate`-disposition items are addressed:

- **T-01-06 (DoS via unresized photos):** mitigated by `resizePhoto()` defaults (≤800×800 @ WebP 0.8) + photoStore.ts header comment documenting the resize-before-save invariant.
- **T-01-07 (IDB transaction auto-commit):** mitigated by db.ts header CORRECT/FORBIDDEN examples for Pitfall #1. No transactions written in Phase 1; enforcement is at code-review time for Phase 2.
- **T-01-08 (mutating shipped v1 schema):** mitigated by db.ts APPEND-ONLY header rule.
- **T-01-09 (createImageBitmap exception leak):** accepted per plan; resizePhoto wraps decode errors in generic strings (`'2D canvas context unavailable'`, `'canvas.toBlob returned null'`).
- **T-01-10 (UTC day-key drift):** mitigated by dayKey.ts local-getters-only implementation + smoke module asserting the exact 23:30 UTC-5 case.
- **T-01-11 (photoKey collisions):** accepted per plan; crypto.randomUUID 122-bit entropy, single-user app.

No new security-relevant surfaces introduced beyond what the threat model already enumerated. No `## Threat Flags` table needed.

## Next Phase Readiness

- **Plan 01-03 (PWA + startup banners):** Can start immediately. Three concrete handoffs:
  1. Wire `runDayKeySmoke()` from `src/lib/dayKey.smoke.ts` into `initApp()` under `import.meta.env.DEV`.
  2. Update CLAUDE.md rule #5 from "JPEG @ 70%" to "WebP @ 80%" per CONTEXT.md D-07.
  3. The data layer is reachable but unused — `initApp()`'s startup sequence (apply `.dark`, read/write `lastOpenedAt`, call `navigator.storage.persist()`, render) does not depend on Dexie being open. Dexie opens lazily on first query in Phase 2.
- **Phase 2 (tracking slices):** All seven services (`pt.svc.ts`, `food.svc.ts`, `meals.svc.ts`, `steps.svc.ts`, `lifts.svc.ts`, `goals.svc.ts`, plus `streak.svc.ts` for Phase 3) can `import { db } from '@/db/db'` and `import { todayKey, dateToKey, keyToDate } from '@/lib/dayKey'` immediately. Food UI can `import { savePhoto, resizePhoto, loadPhoto, deletePhoto } from '@/lib/photoStore'`.
- **Phase 3 (streak loop):** No direct dependency on this plan beyond what Phase 2 produces. The dayKey utilities are ready for `keyToDate(key)` calendar-cell rendering.

## Self-Check: PASSED

All 5 created files verified present:
```
src/db/schema.ts            ✓
src/db/db.ts                ✓
src/lib/dayKey.ts           ✓
src/lib/dayKey.smoke.ts     ✓
src/lib/photoStore.ts       ✓
```

All 3 task commits verified in `git log`:
- `4d6108a` feat(01-02): add Dexie v1 schema with 7 stores + append-only migration guards
- `03c03ef` feat(01-02): add dayKey utility + dev-mode smoke for Pitfall #4
- `2d887eb` feat(01-02): add OPFS photoStore with WebP@80% resize pipeline

Final `npm run typecheck` exits 0 ✓; `npm run build` exits 0 (256 KB / 82 KB gzip JS, unchanged because new modules are tree-shaken until consumed).

---
*Phase: 01-foundation*
*Completed: 2026-04-21*
