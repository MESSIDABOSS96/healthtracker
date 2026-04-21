# Phase 4: Backup & Polish — Research

**Researched:** 2026-04-21
**Domain:** Versioned JSON export for a fully-local IndexedDB+OPFS PWA; iOS/Android install-polish metadata; small Radix-Dialog confirm primitive; midnight-tick React hook
**Confidence:** HIGH

## Summary

Phase 4 has an unusually detailed CONTEXT.md — 16 locked decisions (D-01..D-16) covering every major wiring choice. Research confirms all 16 decisions are safe and current; none need reconsideration. The work is best understood as **five small, independent workstreams** (export service + export card, midnight-tick hook, confirm dialog, iOS meta tags, manifest hygiene + maskable audit) plus a one-line `storageKeys.ts` addition. All five can be planned as parallel-friendly tasks because they touch disjoint files.

Two pieces of research surfaced useful sharpening:

1. **`apple-mobile-web-app-capable` is officially "deprecated" (replaced by the standard `mobile-web-app-capable`), BUT Safari still requires it in practice** — removing it breaks splash-screen behavior on shipped iOS builds. Phase 4 should ship BOTH tags side-by-side. [CITED: Next.js issue #74524]
2. **`URL.revokeObjectURL` called synchronously after `a.click()` can cancel the download on Firefox/Chromium** — the correct pattern is to revoke inside a `setTimeout` (≥0, conventionally a few seconds). CONTEXT.md D-02's "revoke after a microtask" phrasing is imprecise; D-09 planning should use the setTimeout pattern. [CITED: Mozilla bugzilla 1282407, Chromium issue 41380177]

Everything else in CONTEXT.md stands verbatim.

**Primary recommendation:** Decompose Phase 4 into **5 parallelizable plans** (Export Service + Card UI; Midnight-Tick Hook; ConfirmDialog + Lift wire-up; iOS Meta + Manifest Hygiene; Maskable Icon Audit), each a small self-contained unit. Default to the patterns and code snippets below — no library additions, no architectural surprises.

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Export trigger + nudges (Settings surface)**
- **D-01** — Single export entry point in Settings, inside a new "Export data" Card sitting between `<GoalsForm />` and the `flex-1` spacer. No Today-screen surface. No day-detail cue.
- **D-02** — Filename: `healthtracker-YYYY-MM-DD.json`, date-only, LOCAL time via `lib/dayKey.ts:todayKey()` (Pitfall #4). Same-day duplicates get browser's `(1)`, `(2)`. Schema version lives in envelope, NOT filename.
- **D-03** — Post-save confirmation = inline "Last exported: {relative time}" line inside the Card. No toast, no modal, no banner, no new primitive. Empty/never-exported state shows nothing (or the D-04 hint).
- **D-04** — `lastExportedAt` tracked in `localStorage` under a new `LAST_EXPORTED_KEY` in `src/lib/storageKeys.ts` (e.g. `'ht.lastExportedAt'`). Set to `Date.now()` after each successful export. When `now - lastExportedAt > 14 * 86400_000` OR `lastExportedAt` absent AND user has any data (heuristic: ≥1 row across `ptSessions`, `mealEntries`, `stepEntries`, `liftCheckins`), surface a calm one-liner ("Time to back up — your last export was {N} days ago" / "Back up your data"). Inline text inside the Card, NOT a separate Banner.

**Polish scope (carry-forward from Phase 3 review — HARD SCOPE CEILING)**
- **D-05** — Fix WR-01/02. Add a reactive hook `useDayKey` (in `src/lib/useDayKey.ts` OR `src/features/calendar/hooks.ts`) that returns `todayKey()` and re-renders when local midnight passes (one setTimeout to next local midnight + chained reschedule on tick; cleanup timer on unmount). Wire into `useCurrentStreakCount` and StreakCount's inline today-quadrant subscription. All key construction goes through `lib/dayKey.ts`.
- **D-06** — Add a `ConfirmDialog` component on `@radix-ui/react-dialog` in `src/components/ui/confirm-dialog.tsx`. Intentionally generic. Copy: `Remove lift check-in for {date}? Note will be deleted too.` / `Cancel` / `Remove`. Wired into the DayDetail Lift row delete affordance.
- **D-07** — Day-detail "Export now" contextual cue: **SKIP**. Settings 14-day nudge covers motivation.
- **D-08** — **Hard scope ceiling.** Eviction-banner copy refinement, Goals-form validation polish, TodayScreen empty-state copy — all REJECTED. Planner MUST NOT add polish items beyond D-05/D-06.

**Export progress + failure UX**
- **D-09** — Run-state UX = `<Loader2 className="animate-spin" />` spinner + button disable. Button label flips to "Exporting…". No determinate progress bar. Re-enable + render "Last exported: just now" on success.
- **D-10** — Per-photo failure: skip-with-warning. Omit failed photoKey from `photos` map; `console.warn` the key; surface failed count as "Exported (N photo(s) couldn't be saved)" in the post-save inline line. `Food.photoKey` references stay in `data.foods` — v2 importer treats absent keys as "photo lost".
- **D-11** — Total failure: inline red-tinted text in the export Card. Copy: `Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding.` Console logs underlying error. Button re-enables.
- **D-12** — No pre-flight size estimate.

**Install / icon polish**
- **D-13** — **Skip iOS launch splash screens.** Per-device PNG variants are not worth the maintenance; dark-on-dark flash is invisible.
- **D-14** — Add 3 Apple meta tags in `index.html` (5-min change, no assets): `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style=black-translucent`, `apple-mobile-web-app-title=HealthTracker`.
- **D-15** — Manifest hygiene in `vite.config.ts` `VitePWA({ manifest })`: add `id: '/'`, `categories: ['health', 'fitness', 'productivity']`. Audit existing `description`.
- **D-16** — Maskable icon visual audit via https://maskable.app/editor. Regenerate only if safe-zone violated.

### Claude's Discretion

- `export.svc.ts` decomposition — recommended: single service file matching ARCHITECTURE.md, NO `src/lib/export/` split.
- Download trigger — pick exact wiring (object URL + hidden `<a download>` + programmatic click + revoke).
- OPFS-read concurrency — sequential `for…of` recommended over `Promise.all` (iOS Safari OPFS parallel-read flakiness).
- `useDayKey` location — recommend `src/lib/useDayKey.ts` (lib-level).
- `ConfirmDialog` API — recommend controlled `open`/`onOpenChange` pattern matching Sheet.
- Stale-nudge data heuristic — `Promise.all([4 counts]) + sum > 0`, OR `useLiveQuery` wrapper.
- Inline nudge / "Last exported" copy — refine if starting points feel off.
- Card visual treatment — reuse `Card` primitive matching the Install card.
- Filename timestamp source — MUST use `lib/dayKey.ts:todayKey()` / `dateToKey(new Date())`.

### Deferred Ideas (OUT OF SCOPE)

- Import / restore (BACK-03) — hard v2.
- Weekly auto-export prompt / notification (BACK-04) — v2.
- Day-detail "Export now" contextual cue (D-07).
- Toast / snackbar primitive.
- Eviction-banner refinement (4-day trigger, copy).
- Goals-form validation polish (zero-as-sentinel UX).
- TodayScreen empty-state copy.
- iOS launch splash screens (D-13).
- Manifest `screenshots` array.
- Determinate progress bar during export.
- Pre-flight envelope size estimate.
- Encrypting export JSON.
- Cloud-backup hooks.
- Streak-related polish beyond WR-01/02.
- "Undo" affordance for destructive day-detail actions.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BACK-01 | User can export all data as a single JSON file (envelope with `schemaVersion`, `exportedAt`, `appVersion`, `data`, base64 `photos` map) via a Settings button | §"Export Envelope Shape" + §"Export Procedure" below; ARCHITECTURE.md §"Export / Import JSON Format" is the authoritative spec; FileReader.readAsDataURL pattern verified for Blob→base64 |
| BACK-02 | Export flow uses `<a download>` to work on iOS home-screen PWAs (no `showSaveFilePicker` dependency) | §"Download Trigger Pattern" below — object URL + hidden anchor + programmatic click + setTimeout-delayed revoke |

## Project Constraints (from CLAUDE.md)

**Project-breaking rules directly relevant to Phase 4:**

1. **Rule #1 (IDB auto-commit):** The export's OPFS reads MUST run OUTSIDE any `db.transaction()` block. The safest pattern is no transaction wrapper at all — export is read-only, and a personal single-user tool doesn't need snapshot isolation. ([Pitfall #1])
2. **Rule #3 (dayKey UTC bug):** D-02 filename construction and D-04 staleness math MUST go through `src/lib/dayKey.ts`. Never `toISOString().split('T')[0]`. ([Pitfall #4])
3. **Rule #4 (`navigator.storage.persist()`):** Already called in Phase 1 `initApp()`. Phase 4 does NOT need to re-call it. Persistent storage covers localStorage alongside IDB/Cache/SW registration ([CITED: webkit.org/blog/14403]) — `LAST_EXPORTED_KEY` is protected by the existing Phase 1 persist grant.
4. **Rule #5 (WebP resize):** Not touched by Phase 4. The existing OPFS-stored `.webp` blobs just get read and base64-encoded.
5. **Rule #6 (photos in OPFS, not Dexie):** Phase 4 reads via `photoStore.loadPhoto(key)` only. No raw Dexie-blob reads.

**Locked stack:**
- React 19.x, Vite 7.x, TypeScript 5.6.x
- Dexie 4.0.11 installed (registry current: 4.4.2 — PATCH/MINOR behind; no API breaks; acceptable) [VERIFIED: `npm view dexie version` → 4.4.2]
- `radix-ui` 1.4.3 (metapackage — Sheet and ConfirmDialog both consume the bundled `Dialog` primitive) [VERIFIED: `npm view radix-ui version` → 1.4.3]
- `lucide-react` 0.468.0 installed (registry current: 1.8.0 — significantly behind; but all icons we need exist at both versions; no upgrade needed for Phase 4) [VERIFIED: `npm view lucide-react version` → 1.8.0]
- `vite-plugin-pwa` 1.2.0 installed (registry current: 1.2.0 — matches) [VERIFIED: `npm view vite-plugin-pwa version` → 1.2.0]

**No new dependencies required for Phase 4.**

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Envelope construction (Dexie bulk read + OPFS photo loop + base64 encode + JSON.stringify) | Service layer (`services/export.svc.ts`) | DB layer (read-only `table.toArray()` + OPFS via `photoStore.loadPhoto`) | UI → services → db rule. Export aggregates across all 7 stores, so it belongs at the service level; `export.svc.ts` is already the ARCHITECTURE.md-prescribed home. |
| Download trigger (object URL + anchor click + revoke) | UI handler (inline in `SettingsScreen.tsx`'s export Card) | Lib helper (optional `triggerDownload` in `src/lib/` — Claude's Discretion) | DOM APIs (`URL.createObjectURL`, `document.createElement('a')`) are UI-side. Keep the DOM manipulation out of the service so `export.svc.ts` stays pure and testable (returns a `{ json, warnings }` pair; caller handles the browser trigger). |
| `lastExportedAt` read/write | `localStorage` (via `LAST_EXPORTED_KEY` constant) | UI (SettingsScreen reads for the inline "Last exported" line) + service (writes on successful export) | Matches Phase 1 `PREV_OPENED_KEY` pattern. Service writes on success; component reads via `useState` + mount-time read + success callback. |
| Midnight rollover tick | Lib hook (`useDayKey` — Claude's Discretion on exact file) | Feature hooks (`useCurrentStreakCount`, `useTodayQuadrantState`) | Lib-level because any "what day is it" consumer benefits (not just calendar). The hook itself is a pure React thing (`useState` + `useEffect` + `setTimeout`). |
| Destructive confirm (lift delete) | UI primitive (`src/components/ui/confirm-dialog.tsx`) | Consumer (DayDetail Lift row) | Pure presentation component wrapping Radix `Dialog.Root` / `Dialog.Portal` / `Dialog.Content`. The mutation (`deleteLift`) stays in the service and is called inside the consumer's confirm handler. |
| PWA identity metadata | Build-time config (`vite.config.ts`'s `VitePWA({ manifest })`) | HTML meta tags (`index.html` for iOS-specific `apple-*` tags) | Manifest fields are browser-standard and live in the generated manifest. Apple tags are Apple-specific, read directly from HTML head by iOS Safari, not from the manifest — must live in `index.html`. |
| Maskable icon | Static asset (`public/icon-maskable-512.png`) | Manifest entry (already in place, `purpose: 'maskable'`) | Visual audit only; regenerate the PNG if the safe-zone is violated. No code change. |

## Standard Stack

### Core (already installed — no new deps)

| Library | Version (installed → current) | Purpose | Why Standard |
|---------|-------------------------------|---------|--------------|
| `dexie` | 4.0.11 → 4.4.2 | Bulk `table.toArray()` across all 7 stores for export | Locked by Phase 1; `db.tables` is an enumerable `Array<Table>` [CITED: dexie.org/docs/Dexie/Dexie.tables] |
| `radix-ui` (bundled `Dialog` primitive) | 1.4.3 | ConfirmDialog primitive | Already used by Phase 2 Sheet; second consumer adds zero deps |
| `lucide-react` | 0.468.0 → 1.8.0 | `<Loader2>` spinner icon for D-09 | Already in deps; `Loader2` exists at 0.468 [VERIFIED: used elsewhere] |
| `vite-plugin-pwa` | 1.2.0 | `manifest.id`, `manifest.categories` additions for D-15 | Already in Phase 1 wiring; no version bump needed |

### Supporting (internal — no new imports needed beyond these)

| Module | Purpose | Used by Phase 4 |
|--------|---------|-----------------|
| `src/db/db.ts` | `db`, `db.verno`, `db.tables` | `export.svc.ts` reads all 7 tables; envelope uses `db.verno` for `schemaVersion` |
| `src/db/schema.ts` | 7 record interfaces | Typed contract for `ExportEnvelope.data` |
| `src/lib/dayKey.ts` | `todayKey()`, `dateToKey()` | Filename construction + D-04 staleness math |
| `src/lib/photoStore.ts` | `loadPhoto(key) → Blob` | Per-food photo OPFS reads |
| `src/lib/storageKeys.ts` | Pattern for `LAST_EXPORTED_KEY` | New constant added here |
| `src/lib/version.ts` | `APP_VERSION` | Envelope `appVersion` field |
| `src/components/ui/card.tsx` | `Card`, `CardContent` | Export entry visual container |
| `src/components/ui/button.tsx` | `Button` | Export button (variant=default, spinner inside) |
| `src/components/ui/sheet.tsx` | Confirms `Dialog` primitive available via `radix-ui` metapackage | Pattern reference for ConfirmDialog |

### Alternatives Considered (all rejected — documented for completeness)

| Instead of | Could Use | Why Rejected |
|------------|-----------|--------------|
| Custom `exportAll()` in `src/services/export.svc.ts` | `dexie-export-import` npm package | New dep, chunked streaming format; our envelope is custom (`schemaVersion` + `appVersion` + base64 photos map) and doesn't match the addon's JSON shape; addon adds complexity for no benefit at our data scale (<20MB) [CITED: dexie.org/docs/ExportImport/dexie-export-import] |
| `FileReader.readAsDataURL` for Blob→base64 | `blob.arrayBuffer() + btoa(String.fromCharCode(...chunked))` | FileReader is purpose-built, event-based, async-native; manual ArrayBuffer→btoa requires chunked `String.fromCharCode` to avoid stack overflow on large photos. Complexity with no upside at ≤800×800 WebP sizes (~50-150KB each). CONTEXT.md's implicit FileReader pattern is correct. |
| `<a download>` + object URL | `showSaveFilePicker()` (File System Access API) | Not supported on iOS Safari; BACK-02 explicitly forbids it. |
| Radix `Alert Dialog` primitive for D-06 | Radix `Dialog` primitive (already wired by Sheet) | `Alert Dialog` IS semantically correct for destructive confirms ([CITED: radix-ui.com/primitives/docs/components/alert-dialog]) — it sets `role="alertdialog"`. However, the project already ships `Dialog` via Sheet; adding `Alert Dialog` means a second primitive import. For one use-site (lift-delete), the accessibility gain is marginal; the `Dialog` primitive + strong `aria-labelledby`/`aria-describedby` is sufficient. **Recommend `Dialog`** for Phase 4 parity; migrate to `AlertDialog` if more destructive confirms land post-v1. |
| Web Worker for midnight tick | Main-thread `setTimeout` with chained reschedule | Workers aren't throttled when the tab is backgrounded ([CITED: MDN Window.setTimeout]), but the hook is fine with main-thread throttling — when the tab re-foregrounds, the first render after resumption calls `todayKey()` again via the rescheduled timer fire, correcting any drift. Worker adds infrastructure for zero user-visible benefit. |

**Installation:** No `npm install` required for Phase 4.

## Architecture Patterns

### System Architecture Diagram — Export Flow

```
                        ┌──────────────────────┐
    User taps Export → │ SettingsScreen       │
                        │ (Export card)        │
                        └──────────┬───────────┘
                                   │
                                   │ (1) disable button, setState 'exporting'
                                   │ (2) await exportAll()
                                   ▼
                    ┌───────────────────────────────┐
                    │ services/export.svc.ts        │
                    │   exportAll()                 │
                    │                               │
                    │ ┌─ Promise.all 7 × toArray ─┐ │
                    │ │ ptTemplates  ptSessions   │ │
                    │ │ foods        mealEntries  │ │
                    │ │ stepEntries  liftCheckins │ │
                    │ │ goals                     │ │
                    │ └───────────────────────────┘ │
                    │              │                │
                    │ ┌─ for..of foods ───────────┐ │
                    │ │ if photoKey:              │ │
                    │ │   loadPhoto(k) → Blob     │ │
                    │ │   FileReader → base64     │ │
                    │ │   on error:               │ │
                    │ │     warn + skip + track   │ │
                    │ └───────────────────────────┘ │
                    │              │                │
                    │ ┌─ envelope ────────────────┐ │
                    │ │ schemaVersion = db.verno  │ │
                    │ │ exportedAt (ISO UTC)      │ │
                    │ │ appVersion = APP_VERSION  │ │
                    │ │ data: {...tables}         │ │
                    │ │ photos: {key: base64}     │ │
                    │ └───────────────────────────┘ │
                    └──────────────┬────────────────┘
                                   │ returns { json, warnings: { skippedPhotos[] } }
                                   ▼
                   ┌─────────────────────────────────┐
                   │ SettingsScreen export handler  │
                   │                                 │
                   │ (3) Blob([json], JSON MIME)    │
                   │ (4) URL.createObjectURL(blob)  │
                   │ (5) <a download=filename>.click() │
                   │ (6) setTimeout → revokeObjectURL │
                   │ (7) localStorage.setItem(       │
                   │       LAST_EXPORTED_KEY, now)  │
                   │ (8) setState 'idle' + warnings │
                   └─────────────────────────────────┘
                                   │
                                   ▼
                           Browser downloads →
                           iOS share sheet /
                           Android Downloads
```

**Critical:** the OPFS loop and the Dexie reads happen back-to-back as separate steps. No `db.transaction()` wrapping anything. Reading OPFS inside a Dexie transaction triggers Pitfall #1 (auto-commit + silent data loss — only matters on writes, but the habit is worth breaking anywhere transactions would sit around a non-IDB await).

### Recommended File Layout (delta from current tree)

```
src/
├── services/
│   └── export.svc.ts               # NEW — exportAll() + blobToBase64 helper
├── components/ui/
│   └── confirm-dialog.tsx          # NEW — ConfirmDialog primitive
├── lib/
│   ├── useDayKey.ts                # NEW — midnight-tick hook (recommended location)
│   └── storageKeys.ts              # MODIFIED — add LAST_EXPORTED_KEY
├── routes/
│   └── SettingsScreen.tsx          # MODIFIED — add <ExportCard /> or inlined JSX
├── features/calendar/
│   ├── hooks.ts                    # MODIFIED — use useDayKey in useCurrentStreakCount; new useTodayQuadrantState
│   ├── StreakCount.tsx             # MODIFIED — consume useTodayQuadrantState instead of inline useLiveQuery
│   └── DayDetail.tsx               # MODIFIED — wrap deleteLift in ConfirmDialog
vite.config.ts                      # MODIFIED — manifest.id, manifest.categories
index.html                          # MODIFIED — 3 apple-* meta tags
public/
└── icon-maskable-512.png           # AUDIT (regenerate only if safe-zone violated)
```

Claude's Discretion placement options — either is fine:
- `ExportCard` as a separate `src/features/settings/ExportCard.tsx` vs inlined JSX in `SettingsScreen.tsx`. **Recommend separate file** — matches `GoalsForm.tsx` sibling pattern; SettingsScreen stays short.
- `useDayKey` in `src/lib/useDayKey.ts` (recommended, lib-level) vs `src/features/calendar/hooks.ts` (co-located). **Recommend lib-level** — not calendar-specific.

### Pattern 1: Export Envelope Shape (from ARCHITECTURE.md — authoritative)

```typescript
// Source: ARCHITECTURE.md §"Export / Import JSON Format" (matches verbatim)
interface ExportEnvelope {
  schemaVersion: number;       // db.verno at export time (currently 1)
  exportedAt: string;          // new Date().toISOString() — UTC ISO is correct here (metadata, not a day key)
  appVersion: string;          // APP_VERSION from src/lib/version.ts
  data: {
    ptTemplates: PTTemplate[];
    ptSessions: PTSession[];
    foods: Food[];
    mealEntries: MealEntry[];
    stepEntries: StepEntry[];
    liftCheckins: LiftCheckin[];
    goals: Goals[];
  };
  photos: Record<string, string>;   // { [photoKey]: 'data:image/webp;base64,...' }
}
```

**When to use:** Single source of truth for Phase 4's export write shape AND the v2 importer's read shape. Do not drift. `schemaVersion` is read from `db.verno` (Dexie exposes the current version) [VERIFIED: `src/db/db.ts` uses `this.version(1)` → `db.verno === 1`].

### Pattern 2: `exportAll()` Service Procedure

```typescript
// src/services/export.svc.ts
// Source: ARCHITECTURE.md §"Export / Import JSON Format" + Phase 4 CONTEXT D-09/D-10.
// Read-only; NO db.transaction() wrapper (Pitfall #1 + read-only, personal-tool).
// [CITED: dexie.org/docs/Dexie/Dexie.tables — db.tables is Array<Table> enumerable]

import { db } from '@/db/db';
import { loadPhoto } from '@/lib/photoStore';
import { APP_VERSION } from '@/lib/version';
import type {
  PTTemplate, PTSession, Food, MealEntry,
  StepEntry, LiftCheckin, Goals,
} from '@/db/schema';

interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    ptTemplates: PTTemplate[];
    ptSessions: PTSession[];
    foods: Food[];
    mealEntries: MealEntry[];
    stepEntries: StepEntry[];
    liftCheckins: LiftCheckin[];
    goals: Goals[];
  };
  photos: Record<string, string>;
}

export interface ExportResult {
  json: string;
  warnings: { skippedPhotos: string[] };
}

async function blobToBase64(blob: Blob): Promise<string> {
  // FileReader.readAsDataURL returns a data URI:
  //   data:image/webp;base64,AAAA....
  // Caller stores the WHOLE data URI (envelope consumers can feed it back to
  // fetch() or <img src>). If you only want the base64 payload, strip the prefix.
  // [CITED: MDN FileReader.readAsDataURL]
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function exportAll(): Promise<ExportResult> {
  // Step 1 — Bulk Dexie read. Plain Promise.all (no transaction wrapper).
  // Each toArray() returns plain objects (records), safe for JSON.stringify.
  // Our records contain only strings / numbers / booleans / simple arrays of same;
  // no Dates, no Blobs, no Maps. JSON.stringify will not lose anything.
  const [
    ptTemplates, ptSessions, foods, mealEntries,
    stepEntries, liftCheckins, goals,
  ] = await Promise.all([
    db.ptTemplates.toArray(),
    db.ptSessions.toArray(),
    db.foods.toArray(),
    db.mealEntries.toArray(),
    db.stepEntries.toArray(),
    db.liftCheckins.toArray(),
    db.goals.toArray(),
  ]);

  // Step 2 — OPFS photo read loop. SEQUENTIAL (iOS Safari OPFS parallelism is
  // historically flaky; expected <50 photos; this is not a hot path).
  // Per-photo failure = skip + warn (D-10). Never aborts the whole export.
  const photos: Record<string, string> = {};
  const skippedPhotos: string[] = [];

  for (const food of foods) {
    if (!food.photoKey) continue;
    try {
      const blob = await loadPhoto(food.photoKey);
      photos[food.photoKey] = await blobToBase64(blob);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[export] skipping photo ${food.photoKey}:`, err);
      skippedPhotos.push(food.photoKey);
    }
  }

  // Step 3 — Build envelope.
  const envelope: ExportEnvelope = {
    schemaVersion: db.verno,          // currently 1; reflects db version block
    exportedAt: new Date().toISOString(),   // UTC ISO is correct for metadata
    appVersion: APP_VERSION,
    data: { ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals },
    photos,
  };

  // Step 4 — JSON.stringify. No indentation (smaller files; non-human-readable
  // is acceptable since this is a machine-restored backup). Caller blobs it.
  return {
    json: JSON.stringify(envelope),
    warnings: { skippedPhotos },
  };
}
```

**Key asserts:**
- `db.tables.map(t => t.toArray())` in ARCHITECTURE.md and the long-form enumerated `Promise.all` above are equivalent. Either is fine. **Recommend the enumerated form** above for TypeScript type-inference clarity (each returned array gets its narrow type).
- No Date, Blob, ArrayBuffer, Map, or Set inside any record — confirmed by scanning `src/db/schema.ts`. JSON.stringify is lossless for our schema. [CITED: dexie.org/docs/ExportImport/dexie-export-import documents "exotic types won't be supported" — we have none]
- `db.verno` is Dexie's runtime version-number property. At the moment `db.verno === 1`.

### Pattern 3: Download Trigger (UI-side)

```typescript
// In SettingsScreen.tsx (or src/features/settings/ExportCard.tsx)
// Source: MDN URL.createObjectURL_static + MDN URL.revokeObjectURL_static
// CRITICAL: revokeObjectURL MUST be delayed — calling it synchronously after
// .click() cancels the download in Firefox and some Chromium versions.
// [CITED: Mozilla bugzilla 1282407 "revokeObjectURL breaks blob download with download attribute"]
// [CITED: Chromium issue 41380177]
import { todayKey } from '@/lib/dayKey';

function triggerDownload(json: string, dayKey: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `healthtracker-${dayKey}.json`;
  // a.style.display = 'none';  // Not strictly needed — anchor never attached to DOM.
  a.click();
  // Delay revoke so the browser has time to initiate the download before the
  // URL becomes invalid. 30s is the idiomatic conservative choice; any
  // positive setTimeout delay works in practice.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

// Usage:
async function onExport() {
  setState('exporting');
  try {
    const result = await exportAll();
    triggerDownload(result.json, todayKey());
    localStorage.setItem(LAST_EXPORTED_KEY, String(Date.now()));
    setLastExportedAt(Date.now());
    setSkippedCount(result.warnings.skippedPhotos.length);
    setState('idle');
  } catch (err) {
    console.error('[export] total failure:', err);
    setState('error');
  }
}
```

### Pattern 4: `useDayKey` Midnight-Tick Hook

```typescript
// src/lib/useDayKey.ts
// Closes WR-01 and WR-02 from Phase 3 review. Returns today's dayKey and
// re-renders consumers at local midnight. Lib-level because any "what day is
// it" consumer benefits (not just calendar).
// Uses setTimeout (not setInterval) + chained reschedule per WR-01 suggested
// shape. 5-second grace past midnight to absorb any sub-second timer drift.
// [CITED: MDN Window.setTimeout — mobile Safari throttles backgrounded tabs
//  to ~1s minimum but the tick fires when the tab returns to foreground,
//  which is when the user would actually see an out-of-date streak count]

import { useEffect, useState } from 'react';
import { todayKey } from '@/lib/dayKey';

function msUntilMidnight(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 5, 0);  // tomorrow 00:00:05 local (5s grace)
  return next.getTime() - now.getTime();
}

export function useDayKey(): string {
  const [key, setKey] = useState<string>(() => todayKey());

  useEffect(() => {
    const timer = setTimeout(() => {
      setKey(todayKey());
    }, msUntilMidnight());
    return () => clearTimeout(timer);
  }, [key]);  // re-runs after each tick; new timer → next midnight

  return key;
}
```

**Wiring into Phase 3 hooks:**

```typescript
// src/features/calendar/hooks.ts — delta
import { useDayKey } from '@/lib/useDayKey';
import type { QuadrantState } from '@/services/streak.svc';

export function useCurrentStreakCount(): number | undefined {
  const today = useDayKey();   // re-subscribes on midnight rollover
  return useLiveQuery(() => getCurrentStreakCount(), [today]);
}

// New hook — replaces the inline useLiveQuery in StreakCount.tsx (WR-02)
export function useTodayQuadrantState(): QuadrantState | undefined {
  const today = useDayKey();
  const row = useLiveQuery(
    () => getStreakDataForRange(today, today),
    [today],
  );
  return row?.get(today);
}
```

```typescript
// src/features/calendar/StreakCount.tsx — delta
import { useCurrentStreakCount, useTodayQuadrantState } from './hooks';

export function StreakCount() {
  const count = useCurrentStreakCount() ?? 0;
  const todayState = useTodayQuadrantState();
  const todayIsComplete =
    !!todayState && todayState.pt && todayState.food && todayState.steps && todayState.lift;
  // ...rest unchanged
}
```

**Edge cases handled:**
- Tab backgrounded across midnight → timer coalesced to 1s minimum; fires a few seconds after tab foreground → re-query fires → count refreshes. User never sees stale count in an active tab.
- DST transition → `setHours(24, 0, 5, 0)` on the local Date correctly computes "next local midnight" (JS Date accounts for DST when setting hours on a local-tz Date).
- Device clock change mid-session → fires on the OLD schedule (Date was captured on mount); after fire, `todayKey()` uses the NEW clock → correct. One tick may fire early or late, but the state is eventually correct.
- Cleanup timer on unmount: `clearTimeout(timer)` in the effect's return ✓.

**What we're NOT handling (intentionally):**
- User's phone was in sleep mode from 11:55pm to 6am → the timer doesn't fire during system sleep; on wake, the browser may or may not catch the missed fire. If the tab is backgrounded through the sleep, the first render after wake calls `todayKey()` fresh anyway (via any write-driven re-query). If the tab is foregrounded through the sleep and no writes fire, `useCurrentStreakCount` could report stale until any DB write. **This is acceptable** — same failure mode as the WR-01 bug today; our fix strictly improves it.

### Pattern 5: ConfirmDialog Primitive

```typescript
// src/components/ui/confirm-dialog.tsx
// Radix Dialog-based confirm primitive. Controlled (open / onOpenChange).
// Matches shadcn/ui visual conventions + the Sheet component's Tailwind
// patterns. Accessibility is Radix's default (focus trap, ESC to close,
// click-outside to close, focus returns to trigger).
// [CITED: radix-ui.com/primitives/docs/components/dialog]
import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel?: string;   // default 'Confirm'
  cancelLabel?: string;    // default 'Cancel'
  destructive?: boolean;   // confirm button gets red styling
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/50"
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
            'rounded-lg border border-border bg-surface p-4 shadow-lg',
            'focus:outline-none',
          )}
        >
          <DialogPrimitive.Title className="text-base font-semibold text-text">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted">
            {body}
          </DialogPrimitive.Description>
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              // Destructive styling: matches Phase 2/3 precedent of inline
              // #ef4444 hex (see DayDetail.tsx:119, 194, 218; MealEntryRow.tsx:123).
              // IN-05 flagged this as a future `--destructive` token migration
              // target; out of Phase 4 scope per D-08.
              style={destructive ? { backgroundColor: '#ef4444', color: '#fafafa' } : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

**Consumer (DayDetail Lift row):**

```tsx
// src/features/calendar/DayDetail.tsx — delta
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
// ...
const [confirmDeleteLift, setConfirmDeleteLift] = useState(false);

// Replace the existing lift Delete button onClick:
<button
  type="button"
  aria-label="Delete lift check-in"
  onClick={() => setConfirmDeleteLift(true)}   // was: onClick={() => deleteLift(dayKey)}
  style={{ color: '#ef4444' }}
  className="..."
>
  Delete
</button>

// Near the bottom of DayDetail's JSX:
<ConfirmDialog
  open={confirmDeleteLift}
  onOpenChange={setConfirmDeleteLift}
  title="Remove lift check-in?"
  body={`Remove lift check-in for ${dayKey}? Note will be deleted too.`}
  confirmLabel="Remove"
  cancelLabel="Cancel"
  destructive
  onConfirm={() => deleteLift(dayKey)}
/>
```

**Accessibility:** Radix Dialog handles everything — focus trap, ESC-to-close, click-outside-to-close, focus-return on close, `aria-modal="true"`, `aria-labelledby` wired to `DialogPrimitive.Title`, `aria-describedby` wired to `DialogPrimitive.Description`. No manual ARIA needed.

**Note on Radix Alert-Dialog vs Dialog:** Radix has a separate `AlertDialog` primitive specifically for destructive confirms — it renders `role="alertdialog"` instead of `role="dialog"` and disables click-outside-to-close [CITED: radix-ui.com/primitives/docs/components/alert-dialog]. For Phase 4's one-use-site, `Dialog` is sufficient and matches the Sheet import pattern already in place. If more destructive flows appear post-v1, migrate to `AlertDialog`.

### Anti-Patterns to Avoid

- **Wrapping the export in `db.transaction()`.** Pitfall #1 risk + no snapshot-isolation benefit for a single-user read-only export. Just do `Promise.all(...)` at the top level of `exportAll()`.
- **Revoking the object URL synchronously after `a.click()`.** Firefox and some Chromium versions cancel the download. Use `setTimeout(revoke, 30000)`. [CITED: Mozilla bugzilla 1282407]
- **Constructing the filename via `toISOString().split('T')[0]`.** Pitfall #4 — UTC-drift on western timezones. Always `todayKey()`.
- **Using `readAsBinaryString` instead of `readAsDataURL`.** `readAsBinaryString` is deprecated; `readAsDataURL` is the supported path. [CITED: MDN FileReader.readAsDataURL]
- **Using `btoa(String.fromCharCode(...new Uint8Array(buffer)))` to base64-encode.** Stack-overflow risk on large photos (arg list > ~65k entries triggers it in some engines); FileReader handles arbitrary size internally.
- **Parallel `Promise.all` OPFS photo reads.** iOS Safari's OPFS parallel-read path has been historically flaky (per CONTEXT.md Claude's Discretion note); sequential for..of is safer and our volume is <50 photos.
- **Re-deriving today's date inside `getCurrentStreakCount()` and expecting the hook to re-fire on rollover.** The hook must be told to re-subscribe via a dep array that changes on midnight; that's what `useDayKey()` provides.
- **Adding a separate "DestructiveConfirm" variant in `Banner.tsx`.** The Banner primitive is for persistent, dismissable site-wide notices. Confirms are transient, modal, and blocking — ConfirmDialog is the right primitive. Banner stays untouched.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blob→base64 encoding | Manual `btoa(String.fromCharCode(...Uint8Array))` chunked loop | `FileReader.readAsDataURL(blob)` — await via Promise wrapper | Native async, no stack-depth limits, universally supported. [CITED: MDN] |
| JSON file download trigger | `showSaveFilePicker()` or `window.open('data:...')` or `location.href=` | `URL.createObjectURL(blob)` + hidden `<a download>` + `a.click()` + `setTimeout(URL.revokeObjectURL, 30000)` | iOS Safari doesn't support File System Access API; BACK-02 mandates `<a download>`. Data-URL approach blows up on ~20MB payloads. |
| Confirm dialog | Custom `window.confirm()` or a from-scratch modal | Radix `Dialog` via ConfirmDialog wrapper | Window.confirm blocks the main thread and is iOS-unfriendly. Radix handles focus trap, ARIA, portal, overlay, ESC, click-outside for free. [CITED: radix-ui.com] |
| Midnight rollover detection | `setInterval(…, 60_000)` polling `todayKey()` | `setTimeout(tick, msUntilMidnight())` + chained reschedule | Polling every minute wakes the main thread 1440 times/day for one transition. Targeted setTimeout fires exactly once per day. |
| Manifest `id` derivation | Rely on `start_url` + `scope` | Explicit `id: '/'` in manifest | W3C spec allows `start_url`/`scope` to change if `id` is explicit. Without `id`, changing either silently creates a "new" PWA and orphans the install. [CITED: developer.chrome.com/docs/capabilities/pwa-manifest-id] |
| Relative-time formatting for "Last exported: N days ago" | Hand-rolled `if…else if…` ladder | Inline computation from `now - lastExportedAt` ms with a ≤30-line formatter | `Intl.RelativeTimeFormat` exists and works on iOS 14+ but adds code surface for 3 buckets. A 20-line `if` ladder ("just now" / "{N} hour(s) ago" / "{N} day(s) ago") is fine and matches the project's "minimal, no Intl deps" rhythm. **Claude's Discretion** — either is acceptable. |

**Key insight:** Phase 4 is primarily *plumbing* — connect existing primitives (Dexie `toArray`, OPFS `loadPhoto`, FileReader, Radix Dialog, VitePWA manifest) through a few small new modules. No novel algorithms.

## Runtime State Inventory

**Not applicable.** Phase 4 is not a rename, refactor, or migration phase. It is purely additive:

- New files: `src/services/export.svc.ts`, `src/lib/useDayKey.ts`, `src/components/ui/confirm-dialog.tsx`, optionally `src/features/settings/ExportCard.tsx`.
- New constant: `LAST_EXPORTED_KEY` in `src/lib/storageKeys.ts`.
- Modified files: `src/routes/SettingsScreen.tsx`, `src/features/calendar/hooks.ts`, `src/features/calendar/StreakCount.tsx`, `src/features/calendar/DayDetail.tsx`, `vite.config.ts`, `index.html`.
- Possibly regenerated asset: `public/icon-maskable-512.png`.

No stored data shape changes. No Dexie version bump. No environment/config/secret renames. No OS-registered state to update.

## Common Pitfalls

### Pitfall 1: Object URL Revoked Too Early Cancels Download

**What goes wrong:** `URL.revokeObjectURL(url)` called synchronously after `a.click()` cancels the download in Firefox and some Chromium versions. Download silently fails or produces a 0-byte file.

**Why it happens:** The browser needs the blob URL to be resolvable long enough to start the HTTP-level "download" handoff to the OS shell / iOS share sheet. Revoking immediately invalidates the URL before the download begins.

**How to avoid:** Wrap revoke in `setTimeout(() => URL.revokeObjectURL(url), 30_000)`. Thirty seconds is the conventional conservative delay; any positive delay works in practice, but a large delay guards against slow devices.

**Warning signs:** User taps Export, nothing downloads (or a 0-byte file appears); works in Safari but not Firefox.

**Source:** [CITED: Mozilla bugzilla 1282407], [CITED: Chromium issue 41380177], [CITED: MDN URL.revokeObjectURL]

### Pitfall 2: Apple Meta Tag "Deprecated" — But Removing It Breaks iOS

**What goes wrong:** `apple-mobile-web-app-capable` is marked deprecated in many linters (replaced by the standardized `mobile-web-app-capable`). Developers remove it. iOS Safari standalone mode stops working correctly — splash screen disappears, browser chrome bleeds, `display: standalone` is ignored.

**Why it happens:** Safari still reads the Apple-prefixed tag even though Apple's developer docs technically recommend the standard one. The "deprecation" is aspirational, not enforced.

**How to avoid:** Keep `apple-mobile-web-app-capable` AND add `mobile-web-app-capable` alongside it. Both should be present. [CITED: Next.js issue #74524]

**Phase 4 action:** D-14 ships `apple-mobile-web-app-capable=yes`. **Research recommends also adding `<meta name="mobile-web-app-capable" content="yes">`** for forward compatibility. This is a cheap addition (1 line) and reduces future debt. Flag this to the planner as a possible D-14 refinement.

### Pitfall 3: Midnight Hook Re-Schedules on a Stale `key` Closure

**What goes wrong:** The `useEffect` captures `todayKey()` in its scheduler. If the hook is implemented naively with `[]` deps, the timer is set once at mount with `msUntilMidnight()` relative to mount time, and the next reschedule uses a closure-captured old key.

**Why it happens:** `useEffect(..., [])` fires once. To re-schedule on each tick, we need `[key]` as the dep; each `setKey(newKey)` triggers effect cleanup + re-run, computing a fresh `msUntilMidnight()` and setting a new timer.

**How to avoid:** Use the Pattern 4 snippet above — the effect's dep array is `[key]`, not `[]`. Each tick → state update → effect re-runs → new timer for the next midnight.

**Warning signs:** Streak count correctly updates at the first midnight but fails at subsequent midnights.

### Pitfall 4: JSON.stringify Serializes BigInt → Throws

**What goes wrong:** If any record accidentally holds a `BigInt`, `JSON.stringify` throws `TypeError: Do not know how to serialize a BigInt`.

**Why it happens:** Not applicable to our schema (all numbers are regular `number`), but worth noting if schema evolves.

**How to avoid:** Schema stays all `number` for counters. If BigInt ever enters, handle with a replacer function.

**Phase 4 action:** None — current schema is safe.

### Pitfall 5: `lastExportedAt` Written Before Download Completes

**What goes wrong:** `localStorage.setItem(LAST_EXPORTED_KEY, now)` fires synchronously after `triggerDownload()`. The anchor click synchronously dispatches to the browser's download machinery, but the download can still fail at the OS layer (user cancels save dialog, disk full). `lastExportedAt` is still set to "now", so the user's "Last exported: just now" reading is wrong.

**Why it happens:** There is no browser callback for "the user saved the file successfully" from a click-triggered `<a download>`. Chrome and Safari don't fire a `download` success event.

**How to avoid:** Accept that `lastExportedAt` = "last attempted export that successfully serialized the envelope, regardless of whether the user saved the file." This is the idiomatic best effort. If the user cancels the save dialog, the Card still says "Last exported: just now" — this is a known quirk, and the user can just re-tap Export.

**Phase 4 action:** Document this quirk in a code comment in `onExport`. Do NOT over-engineer a download-detection hack.

### Pitfall 6: Reading `db.verno` Before Dexie Opens the DB

**What goes wrong:** `db.verno` returns the LATEST declared version on the class, which in our case is 1. But if Dexie hasn't opened the DB yet, and the DB's on-disk version is somehow older (e.g. schema migration partial state), `db.verno` may not equal the actual IDB version.

**Why it happens:** Edge case that doesn't apply in practice for v1. Phase 4 is v1; both code and data are at version 1.

**How to avoid:** For v2+ migrations, use `db.open()` first then read `db.verno`. For Phase 4, current Dexie instance is already open by Phase 1's `initApp()`. No action.

## Code Examples

See Pattern 2 (`exportAll()`), Pattern 3 (download trigger), Pattern 4 (`useDayKey`), and Pattern 5 (ConfirmDialog) above. All snippets are drop-in ready for the planner.

### Additional — manifest and meta tags

```typescript
// vite.config.ts — delta inside VitePWA({ manifest })
// [CITED: developer.chrome.com/docs/capabilities/pwa-manifest-id]
// [CITED: developer.mozilla.org/en-US/docs/Web/Manifest/Reference/categories]
manifest: {
  name: 'HealthTracker',
  short_name: 'HealthTracker',
  description: 'Personal daily tracker for PT, food, steps, and lifts.',
  id: '/',                                            // D-15: explicit identity pin
  categories: ['health', 'fitness', 'productivity'],  // D-15: app-store hint
  theme_color: '#09090b',
  background_color: '#09090b',
  display: 'standalone',
  start_url: '.',
  scope: '.',
  orientation: 'portrait',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
```

```html
<!-- index.html — already contains all 3 D-14 tags (verified by Read).
     NOTE: the existing index.html ALREADY has the D-14 tags in place. See
     lines 9-11. Planner should verify and treat D-14 as "audit current state
     and confirm no regression" rather than "add three new tags".
     Research recommends ALSO adding the standardized `mobile-web-app-capable`:
-->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="mobile-web-app-capable" content="yes" />  <!-- RESEARCH-suggested addition -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="HealthTracker" />
```

**IMPORTANT FINDING:** the 3 D-14 tags are ALREADY in `index.html` (shipped from Phase 1, verified in Read). D-14 as written in CONTEXT.md says "Add the 3 standard Apple meta tags in `index.html`" — this is a no-op if already present. The planner should:
1. Verify current state ([VERIFIED: lines 9-11 of index.html at time of research]).
2. Decide whether to consider D-14 "closed by Phase 1" or to add `<meta name="mobile-web-app-capable" content="yes">` as a research-suggested refinement.
3. Either interpretation is defensible. If closed-by-Phase-1, update CONTEXT.md's traceability to reflect this.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `readAsBinaryString` → `btoa` | `readAsDataURL` → strip data-URI prefix if needed | ~2018 deprecation | Current: use `readAsDataURL`; base64 is native. |
| `showSaveFilePicker()` for downloads | `<a download>` + `createObjectURL` for cross-browser (iOS-compatible) | File System Access API never shipped in iOS Safari | BACK-02 mandates the `<a download>` path — still correct as of 2026. |
| Single `apple-mobile-web-app-capable` tag | Dual `apple-mobile-web-app-capable` + `mobile-web-app-capable` tags during the deprecation-lint-warning transition period | Tag flagged "deprecated" in modern validators ~2023 but still required by iOS Safari | Keep both for compatibility. [CITED: Next.js #74524] |
| No `manifest.id` | Explicit `manifest.id` per W3C spec | ~2022 spec addition | Without `id`, `start_url` changes orphan installs. [CITED: developer.chrome.com] |
| `dexie-export-import` mandatory for exports | Optional — custom Promise.all+toArray fine for small-scale exports | N/A — both valid | Custom is simpler for <20MB and a fixed schema. |
| Base64 photos inline in JSON export | Still the standard for self-contained envelopes; alternatives (separate zip, multi-part) add complexity | N/A | Self-contained JSON is still best for personal-scale backups. |

**Deprecated/outdated:**
- `showSaveFilePicker` on iOS — never supported; avoided by BACK-02.
- `apple-mobile-web-app-capable` as sole meta — add `mobile-web-app-capable` alongside.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | iOS Safari 18.x (2026 baseline) `FileReader.readAsDataURL` handles ~50-150KB WebP blobs without memory pressure. Our expected <100 photos × ~100KB = ~10MB envelope fits comfortably in a single `JSON.stringify` call. | Pattern 2 | If memory pressure does occur, D-11's inline error catches it and the user sees the actionable error message. Low risk. |
| A2 | `db.tables.map(t => t.toArray())` returns plain JS objects with no hidden Dexie proxies that would break `JSON.stringify`. Dexie docs state "If using JSON.stringify()...exotic types won't be supported" but our schema has no exotic types — only strings, numbers, booleans, simple arrays. | Pattern 2 | If a proxy exists, stringify would return an incomplete object. Mitigation: during implementation, add a dev-time smoke check that round-trips `JSON.parse(JSON.stringify(data))` equals the source. |
| A3 | Tab backgrounded across midnight → when foregrounded, the first render will either (a) fire the throttled timer and update within a second, or (b) on the first DB write re-run the live-query and refresh. Neither path leaves the streak stale long enough for the user to notice. | Pattern 4 | If the tab stays foregrounded all night AND no writes happen, the timer could be late by the backgrounding throttle. Strictly better than current Phase 3 behavior (stale until any write). |
| A4 | The DayDetail Lift row is the ONLY destructive past-day action that needs a ConfirmDialog gate (per D-06 + WR-03). Steps delete and PT session delete keep their current no-confirm UX per Phase 3 UI-SPEC. | Pattern 5 | If WR-03's reasoning (lift note preservation) also applies to other rows, users could still lose data from mis-taps. CONTEXT.md explicitly scoped D-06 to lift only; accept. |
| A5 | `public/icon-maskable-512.png` already passes the safe-zone check (60% inner glyph, 20% margin). D-16 is "audit and regenerate only if needed." | D-16 | Low risk — if audit fails, regen is a 5-minute task. |

**If this table turned out empty:** All claims would be verified. They are not empty — flag to planner and discuss-phase.

## Open Questions

1. **D-14 tag-already-present.** The 3 D-14 tags already exist in `index.html` (Phase 1 shipped them). Planner decision: treat as closed-by-Phase-1 vs. add `mobile-web-app-capable` as a research-suggested fourth tag.
   - What we know: tags at index.html:9-11 match D-14 verbatim.
   - What's unclear: whether CONTEXT.md author intended "audit + confirm" or "add new".
   - Recommendation: close D-14 as "already shipped by Phase 1; add `mobile-web-app-capable` as a one-line research refinement for Android install UI correctness."

2. **Radix `Dialog` vs `AlertDialog` for ConfirmDialog.** Semantically, destructive confirms should use `AlertDialog` (sets `role="alertdialog"`, disables click-outside-to-close — enforces an intentional user decision). Practically, `Dialog` is already wired and adds zero deps.
   - What we know: both primitives ship via `radix-ui` metapackage v1.4.3; Sheet uses `Dialog`.
   - What's unclear: whether project style prefers exact Radix semantic match vs. primitive-reuse consistency.
   - Recommendation: use `Dialog` for Phase 4 (consistency with Sheet; single-use-site). Migrate to `AlertDialog` if 2+ destructive-confirm use-sites appear post-v1.

3. **`export.svc.ts` placement of `blobToBase64`.** Inline helper in `export.svc.ts` vs. move to `src/lib/photoStore.ts` or a new `src/lib/blob.ts`.
   - What we know: only export consumes it today; photoStore is OPFS-specific.
   - What's unclear: whether a future feature will need blob-to-base64 elsewhere.
   - Recommendation: keep it inline in `export.svc.ts` for now. It's 8 lines. If a second consumer appears, refactor then.

4. **D-04 data-heuristic implementation.** `useLiveQuery` vs. one-shot `Promise.all` of 4 counts.
   - What we know: CONTEXT.md Claude's Discretion flags both as acceptable.
   - Recommendation: use `useLiveQuery` so the nudge appears mid-session after the user's first log on a fresh install. Cost is 4 live-query subscriptions on Settings mount; negligible.

## Environment Availability

Phase 4 is pure code + markup. No new external dependencies, no new CLIs, no runtime services.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `dexie` | `export.svc.ts` | ✓ (Phase 1) | 4.0.11 | — |
| `radix-ui` (Dialog) | `ConfirmDialog` | ✓ (Phase 2) | 1.4.3 | — |
| `lucide-react` (`Loader2`) | D-09 spinner | ✓ (Phase 1) | 0.468.0 | — |
| `vite-plugin-pwa` | D-15 manifest tweaks | ✓ (Phase 1) | 1.2.0 | — |
| FileReader (browser API) | Blob→base64 | ✓ (iOS 14+, universal) | native | — |
| OPFS (`navigator.storage.getDirectory`) | Photo reads | ✓ (Phase 1 — resize pipeline already uses it) | native | — |
| `URL.createObjectURL` / `URL.revokeObjectURL` | Download trigger | ✓ (universal) | native | — |
| maskable.app/editor (for D-16 audit) | One-time visual check | ✓ (web-based, no CLI needed) | — | Manual inspection in GIMP/Preview |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Security Domain

`security_enforcement` is not explicitly set in `.planning/config.json` — treated as enabled per convention.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth in the app (single-user local-only) |
| V3 Session Management | no | No sessions |
| V4 Access Control | no | No roles; single user |
| V5 Input Validation | partial | Export takes no user input beyond the tap. Import (v2) will need schema-version validation — out of scope here. |
| V6 Cryptography | no | No encryption of the export (explicitly deferred per CONTEXT.md Deferred — personal data, single device) |
| V7 Error Handling & Logging | yes | D-10 (photo failures logged via `console.warn`) + D-11 (total failure logged via `console.error` + user-visible inline error). Matches project silent+console pattern. |
| V8 Data Protection | yes | Export is written to user-chosen location via OS share/download. App does not exfiltrate data — no network calls in the export path. |
| V14 Configuration | yes | No secrets in the export payload; no API keys; no auth tokens. Envelope is pure user log data. |

### Known Threat Patterns for `fully-local PWA export`

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Exported file leaks sensitive user data | Information Disclosure | User is the sole controller of the export file (save to device-local storage via OS share). Envelope contains only the user's own health logs — no auth tokens, no PII beyond what the user already entered. No network exfiltration — export is entirely browser-side. ✓ |
| Malicious import (v2) overwrites data with attacker payload | Tampering | OUT OF SCOPE — BACK-03 import is v2. When built, must validate `schemaVersion ≤ db.verno`, validate record shapes, and require explicit user confirmation before destructive replace. |
| Object URL is phishing vector | Spoofing | Object URLs created via `URL.createObjectURL` are local-origin (`blob:https://...`). They are not user-visible; the `download` attribute dictates the saved filename. No spoofing risk. |
| Export fills disk / DoS | Denial of Service | Not a security concern for a single-user local tool. D-12 explicitly accepts no pre-flight size estimate. |
| Base64-encoded photo dataURIs trigger XSS on re-render | XSS | The envelope is a JSON file the user downloads — it is NEVER re-rendered by Phase 4's app. The v2 importer would need to re-materialize blobs from the data URIs via `fetch(dataURI)` — same as Phase 1's current photo display path. No innerHTML/eval anywhere. ✓ |

**Phase 4 has no new attack surface.** Export is read-only, local-only, user-initiated, and touches no network. `LAST_EXPORTED_KEY` in localStorage is an opaque timestamp — no secret.

## Sources

### Primary (HIGH confidence)
- [Dexie.js — Dexie.tables documentation](https://dexie.org/docs/Dexie/Dexie.tables) — `db.tables` is `Array<Table>`; enumerable
- [Dexie.js — dexie-export-import docs](https://dexie.org/docs/ExportImport/dexie-export-import) — confirms Promise.all + toArray pattern for simple exports; JSON.stringify limitations with exotic types (we have none)
- [MDN — FileReader.readAsDataURL](https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL) — returns data URI with base64 payload; caller strips prefix if wanted
- [MDN — URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static) — blob URL lifecycle
- [MDN — URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static) — revoke timing
- [Mozilla bugzilla 1282407 — revokeObjectURL breaks blob download with download attribute](https://bugzilla.mozilla.org/show_bug.cgi?id=1282407) — setTimeout-delay requirement
- [Chromium issue 41380177 — revokeObjectURL revokes blob too early](https://issues.chromium.org/issues/41380177) — confirms same issue cross-browser
- [Chrome developers — PWA manifest id property](https://developer.chrome.com/docs/capabilities/pwa-manifest-id) — `id` semantics, identity drift without it
- [MDN — categories manifest member](https://developer.mozilla.org/en-US/docs/Web/Manifest/Reference/categories) — standard categories list; app-store consumption
- [W3C — Web Application Manifest spec](https://www.w3.org/TR/appmanifest/) — normative source for `id`, `categories`, `description`
- [Radix Primitives — Dialog docs](https://www.radix-ui.com/primitives/docs/components/dialog) — controlled open/onOpenChange, accessibility defaults
- [Radix Primitives — AlertDialog docs](https://www.radix-ui.com/primitives/docs/components/alert-dialog) — destructive-confirm semantics
- [WebKit Storage Policy updates](https://webkit.org/blog/14403/updates-to-storage-policy/) — standalone PWA same quota as browser; persist() excludes from eviction; localStorage covered alongside IDB
- [MDN — Window.setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) — background-tab throttling (1s minimum in mobile Safari)

### Secondary (MEDIUM confidence)
- [Next.js issue #74524 — removal of apple-mobile-web-app-capable breaks splash screens](https://github.com/vercel/next.js/issues/74524) — empirical confirmation Safari still requires the Apple-prefixed tag
- [Next.js issue #70272 — Deprecated meta tag "apple-mobile-web-app-capable"](https://github.com/vercel/next.js/issues/70272) — deprecation context
- [Brainhub — PWA on iOS Current Status & Limitations 2025](https://brainhub.eu/library/pwa-on-ios) — `<a download>` + createObjectURL pattern for iOS standalone PWAs
- [Vinova — Navigating Safari/iOS PWA Limitations 2025](https://vinova.sg/2025/04/28/navigating-safari-ios-pwa-limitations/) — persist() does apply to standalone PWAs
- [MagicBell — PWA iOS Limitations and Safari Support 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS 17+ storage quota behavior for standalone web apps
- [Progressier — Complete guide to customizing the mobile status bar](https://intercom.help/progressier/en/articles/10574799-complete-guide-to-customizing-the-mobile-status-bar-in-a-website-or-pwa) — `black-translucent` + safe-area-inset pattern

### Tertiary (LOW confidence — flagged for validation if contested)
- [shadcn/ui Discussion #1694 — Loading spinner component](https://github.com/shadcn-ui/ui/discussions/1694) — community convention for `Loader2` + `animate-spin` (corroborates D-09)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already installed; no new registrations; versions verified via `npm view`
- Architecture: HIGH — ARCHITECTURE.md §"Export / Import JSON Format" is authoritative and CONTEXT.md D-01..D-16 map directly to a clean component diagram
- Pitfalls: HIGH — all 6 documented pitfalls cross-verified against MDN / Mozilla bugzilla / Chromium issue tracker
- Runtime state inventory: N/A (additive phase, not a rename/refactor)
- Security: HIGH — no new attack surface; export is local-only user-initiated read

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (30 days — stable ecosystem; Radix, Dexie, VitePWA APIs are multi-year-stable; iOS Safari meta-tag behavior changes rarely)

---

## RESEARCH COMPLETE
