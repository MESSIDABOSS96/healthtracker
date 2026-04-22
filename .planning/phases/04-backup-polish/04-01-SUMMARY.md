---
phase: 04-backup-polish
plan: "01"
subsystem: export-service
tags: [export, backup, pwa, settings, dexie, opfs]
dependency_graph:
  requires:
    - src/db/db.ts
    - src/db/schema.ts
    - src/lib/dayKey.ts
    - src/lib/photoStore.ts
    - src/lib/storageKeys.ts
    - src/lib/version.ts
    - src/components/ui/card.tsx
    - src/components/ui/button.tsx
    - src/features/settings/GoalsForm.tsx
    - src/routes/SettingsScreen.tsx
  provides:
    - exportAll()
    - ExportCard
    - LAST_EXPORTED_KEY
  affects:
    - src/routes/SettingsScreen.tsx
tech_stack:
  added: []
  patterns:
    - "service-layer multi-table Promise.all export pattern (7 Dexie reads, no transaction wrapper)"
    - "Sequential OPFS read loop (iOS Safari parallel-read flakiness guard)"
    - "setTimeout(URL.revokeObjectURL, 30_000) discipline for blob URL lifecycle"
    - "FileReader.readAsDataURL for Blob-to-base64 (no btoa stack-overflow risk)"
    - "useLiveQuery 4-count heuristic for data-exists detection"
key_files:
  created:
    - src/services/export.svc.ts
    - src/features/settings/ExportCard.tsx
  modified:
    - src/lib/storageKeys.ts
    - src/routes/SettingsScreen.tsx
decisions:
  - "D-01 closed: ExportCard placed between GoalsForm and flex-1 spacer in SettingsScreen"
  - "D-02 closed: filename uses todayKey() (local day) — never UTC ISO split"
  - "D-03 closed: post-save confirmation as inline 'Last exported: {relative time}' text"
  - "D-04 closed: LAST_EXPORTED_KEY in localStorage, 14-day stale nudge, useLiveQuery data-exists heuristic"
  - "D-09 closed: Loader2 spinner + disabled button during export run"
  - "D-10 closed: per-photo skip-with-warn, skippedCount surfaced in post-save line"
  - "D-11 closed: total failure = inline red-tinted error text, button re-enables"
  - "D-12 closed: no pre-flight size estimate"
  - "LAST_EXPORTED_KEY uses 'healthtracker:lastExportedAt' prefix (matches PREV_OPENED_KEY convention, not 'ht.' prefix from illustrative example in CONTEXT.md D-04)"
  - "blobToBase64 inlined in export.svc.ts (single consumer; extract only when second caller appears)"
  - "OPFS photo loop is sequential, not Promise.all (iOS Safari parallel OPFS flakiness)"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-22"
  tasks_completed: 3
  files_changed: 4
---

# Phase 04 Plan 01: Export Service Summary

**One-liner:** Versioned JSON export of all 7 Dexie tables + OPFS photos via a new Settings Card, satisfying BACK-01 (envelope shape) and BACK-02 (iOS-compatible `<a download>` trigger).

## What Was Built

Three files created/modified to close the v1 data-safety arc:

1. **`src/lib/storageKeys.ts`** — Appended `LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt'` following the existing `healthtracker:` prefix convention.

2. **`src/services/export.svc.ts`** — New export service exporting `exportAll(): Promise<ExportResult>` and `ExportResult` interface. Reads 7 Dexie tables in a single `Promise.all` (no transaction wrapper per Pitfall #1), then sequentially reads OPFS photos via `loadPhoto()`, converts each to base64 via `FileReader.readAsDataURL`. Per-photo failures skip-with-`console.warn` and accumulate in `skippedPhotos`. Builds BACK-01 envelope: `{ schemaVersion, exportedAt, appVersion, data: {7 tables}, photos }`.

3. **`src/features/settings/ExportCard.tsx`** — New feature component consuming `exportAll()`. Implements: `useLiveQuery` 4-count data-exists heuristic (D-04), localStorage-backed last-exported state with cross-tab `storage` event sync, 14-day stale nudge copy, Loader2 spinner + disabled-button run state (D-09), per-photo skip count surfacing (D-10), inline red-tinted total-failure copy (D-11). Download trigger uses `URL.createObjectURL` + hidden `<a download>` + programmatic click + `setTimeout(revoke, 30_000)` (BACK-02).

4. **`src/routes/SettingsScreen.tsx`** — Added `ExportCard` import and `<ExportCard />` element between `<GoalsForm />` and `<div className="flex-1" />` (D-01).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 191a96b | feat(04-01): add LAST_EXPORTED_KEY + create export.svc.ts |
| Task 2 | 176c4ed | feat(04-01): build ExportCard feature component |
| Task 3 | ea25bcd | feat(04-01): insert ExportCard into SettingsScreen |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Comment text contained forbidden grep-detectable substring**
- **Found during:** Task 1 verification (export.svc.ts) and Task 2 verification (ExportCard.tsx)
- **Issue:** The plan's provided code comments contained `db.transaction(` and `toISOString().split` as illustrative text in pitfall-guard comment headers. The acceptance criteria grep checks match literal substrings anywhere in the file, including comments, causing false failures.
- **Fix:** Rephrased both comments to preserve the pitfall-guard intent without the literal forbidden substring: `"NO transaction wrapper"` instead of `"NO db.transaction() wrapper"`, and `"NEVER use the UTC-date split pattern"` instead of `"NEVER toISOString().split"`.
- **Files modified:** `src/services/export.svc.ts`, `src/features/settings/ExportCard.tsx`
- **Commits:** 191a96b, 176c4ed (inline during task execution)

**2. [Rule 1 - Clarification] LAST_EXPORTED_KEY prefix resolution**
- **Found during:** Task 1 implementation
- **Issue:** CONTEXT.md D-04 line 31 uses `'ht.lastExportedAt'` (illustrative, marked with "e.g."), while CONTEXT.md code_context line 180 also says `'ht.lastExportedAt'`. However, the plan's STEP 1 action explicitly resolves this contradiction toward `'healthtracker:lastExportedAt'` to match the existing 3-key `healthtracker:` convention in storageKeys.ts.
- **Fix:** Used `'healthtracker:lastExportedAt'` as directed by the plan's rationale (b) — matches PREV_OPENED_KEY style, consistent with the file's established pattern.
- **Files modified:** `src/lib/storageKeys.ts`

## Known Stubs

None — all data is wired live from Dexie and OPFS.

## Threat Flags

None — all threat surfaces introduced by this plan (blob URL lifecycle, localStorage key, OPFS reads) are covered by the plan's threat model (T-04-01 through T-04-07) and mitigations are implemented (D-10, D-11, setTimeout revoke).

## Self-Check: PASSED

All files exist and all commits are confirmed in git log.
