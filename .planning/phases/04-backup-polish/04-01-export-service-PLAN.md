---
phase: 04-backup-polish
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/storageKeys.ts
  - src/services/export.svc.ts
  - src/features/settings/ExportCard.tsx
  - src/routes/SettingsScreen.tsx
autonomous: true
requirements: [BACK-01, BACK-02]
tags: [export, backup, pwa, settings]

must_haves:
  truths:
    - "User can tap an Export button in Settings and receive a downloadable healthtracker-YYYY-MM-DD.json file"
    - "Exported JSON parses into an object with shape { schemaVersion, exportedAt, appVersion, data: {7 tables}, photos: {key: dataURI} }"
    - "Filename uses LOCAL dayKey (never UTC-ISO) — an export at 23:30 PT on 2026-04-21 produces healthtracker-2026-04-21.json"
    - "Per-photo OPFS read failures skip-with-warning (console.warn + omit key from photos map), whole export never aborts on single bad photo"
    - "Total export failure surfaces as inline red-tinted text in the Card (never modal or banner), button re-enables"
    - "After successful export, localStorage holds LAST_EXPORTED_KEY = Date.now()"
    - "Settings Card renders 'Last exported: {relative time}' after first successful export, reactively re-renders when key is written"
    - "When lastExportedAt is absent OR > 14 days stale AND user has any data (>=1 row in logging tables), Card surfaces 'Back up your data' / 'Time to back up — last exported {N} days ago' inline"
    - "Button shows spinner + 'Exporting…' + disabled during run; swaps back to 'Export data' on completion"
    - "Export does NOT wrap Dexie reads OR OPFS reads in db.transaction() (Pitfall #1)"
  artifacts:
    - path: "src/lib/storageKeys.ts"
      provides: "Centralized localStorage keys (append LAST_EXPORTED_KEY)"
      contains: "LAST_EXPORTED_KEY"
    - path: "src/services/export.svc.ts"
      provides: "exportAll() service — multi-table Promise.all read + sequential OPFS photo loop + JSON envelope"
      exports: ["exportAll", "ExportResult"]
      min_lines: 70
    - path: "src/features/settings/ExportCard.tsx"
      provides: "Export Card UI — button, spinner, inline last-exported line, 14-day stale nudge, inline error state"
      exports: ["ExportCard"]
      min_lines: 80
    - path: "src/routes/SettingsScreen.tsx"
      provides: "Composition — <ExportCard /> inserted between <GoalsForm /> and flex-1 spacer"
  key_links:
    - from: "src/features/settings/ExportCard.tsx"
      to: "src/services/export.svc.ts:exportAll"
      via: "await exportAll() → triggerDownload → localStorage write"
      pattern: "exportAll\\(\\)"
    - from: "src/services/export.svc.ts"
      to: "src/db/db.ts"
      via: "db.verno + 7 x db.{table}.toArray()"
      pattern: "db\\.(ptTemplates|ptSessions|foods|mealEntries|stepEntries|liftCheckins|goals)\\.toArray"
    - from: "src/services/export.svc.ts"
      to: "src/lib/photoStore.ts:loadPhoto"
      via: "sequential for..of over foods[].photoKey"
      pattern: "loadPhoto\\("
    - from: "src/features/settings/ExportCard.tsx"
      to: "src/lib/dayKey.ts:todayKey"
      via: "filename = `healthtracker-${todayKey()}.json`"
      pattern: "todayKey\\(\\)"
---

<objective>
Ship Phase 4's primary deliverable: versioned JSON export of all user data, triggered from a new Settings Card, satisfying BACK-01 (envelope shape) and BACK-02 (iOS-compatible `<a download>` trigger). The Card additionally serves as the passive 14-day backup nudge surface per D-04, closing the data-safety story for v1.

Purpose: Without export, the user has no off-device copy of their logged health data — one browser eviction or device loss wipes months of input. Shipping this closes the v1 data-safety arc before any meaningful volume accumulates.
Output: A new service module, a new Settings Card feature component, an append to storageKeys.ts, and a 1-line insertion into SettingsScreen.tsx.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/04-backup-polish/04-CONTEXT.md
@.planning/phases/04-backup-polish/04-RESEARCH.md
@.planning/phases/04-backup-polish/04-PATTERNS.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@CLAUDE.md

<!-- Source files this plan READS or extends -->
@src/db/db.ts
@src/db/schema.ts
@src/lib/dayKey.ts
@src/lib/photoStore.ts
@src/lib/storageKeys.ts
@src/lib/version.ts
@src/services/streak.svc.ts
@src/services/lifts.svc.ts
@src/components/ui/card.tsx
@src/components/ui/button.tsx
@src/features/settings/GoalsForm.tsx
@src/routes/SettingsScreen.tsx
@src/components/EvictionBanner.tsx
@src/components/InstallBanner.tsx

<interfaces>
<!-- Contracts the executor needs — do not re-derive from the codebase. -->

From src/db/db.ts:
```typescript
export class HealthTrackerDB extends Dexie {
  ptTemplates!: Table<PTTemplate, string>;
  ptSessions!: Table<PTSession, string>;
  foods!: Table<Food, string>;
  mealEntries!: Table<MealEntry, string>;
  stepEntries!: Table<StepEntry, string>;
  liftCheckins!: Table<LiftCheckin, string>;
  goals!: Table<Goals, string>;
}
export const db = new HealthTrackerDB();
// db.verno === 1 at runtime (read-only property from Dexie)
```

From src/db/schema.ts (7 record types used for ExportEnvelope.data typing):
```typescript
export type PTTemplate, PTSession, Food, MealEntry, StepEntry, LiftCheckin, Goals;
// Food has `photoKey?: string` — OPFS filename reference (NOT a Blob).
```

From src/lib/photoStore.ts:
```typescript
export async function loadPhoto(filename: string): Promise<Blob>;
```

From src/lib/dayKey.ts:
```typescript
export function todayKey(): string;          // returns 'YYYY-MM-DD' in LOCAL tz
export function dateToKey(date: Date): string;
```

From src/lib/version.ts:
```typescript
export const APP_VERSION: string;  // '0.1.0' or injected build value
```

From src/lib/storageKeys.ts (current — you will APPEND):
```typescript
export const LAST_OPENED_KEY       = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY       = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
```

From src/components/ui/button.tsx:
```typescript
// Button variants: default | outline | ghost
// Supports `disabled`, `onClick`, children (flex container with gap-2 so an icon + label lay out natively)
export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;
```

From src/components/ui/card.tsx:
```typescript
// <Card className="..."> wraps content in a styled surface — reuse the same className pattern as the Install Card in SettingsScreen.tsx
export function Card(props: React.HTMLAttributes<HTMLDivElement>): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Append LAST_EXPORTED_KEY + create export.svc.ts</name>
  <files>
    - src/lib/storageKeys.ts (MODIFIED — append one line)
    - src/services/export.svc.ts (NEW)
  </files>
  <read_first>
    - src/lib/storageKeys.ts (current state — verify the existing 3-key pattern before appending)
    - src/services/streak.svc.ts (PRIMARY ANALOG — header comment + multi-table Promise.all shape; lines 1-47)
    - src/services/lifts.svc.ts (SECONDARY ANALOG — minimal single-concern service structure; lines 1-40)
    - src/db/db.ts (read full — verify db.verno source, schema.stores() list, transaction rule comment)
    - src/db/schema.ts (extract the 7 record interfaces for typed imports)
    - src/lib/photoStore.ts (extract loadPhoto signature)
    - src/lib/version.ts (extract APP_VERSION)
    - .planning/research/ARCHITECTURE.md §"Export / Import JSON Format" (authoritative envelope shape)
    - .planning/research/PITFALLS.md §"Pitfall 1" (NO db.transaction wrapper) and §"Pitfall 4" (never toISOString().split)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 2 — exactBaseline for exportAll()
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/services/export.svc.ts" for analog mappings
  </read_first>
  <behavior>
    Behavior-level expectations for export.svc.ts (test-equivalent — no test file required; verified by integration in Task 2):
    - exportAll() returns `{ json: string, warnings: { skippedPhotos: string[] } }`
    - `JSON.parse(json)` produces an object with exactly these top-level keys: `schemaVersion`, `exportedAt`, `appVersion`, `data`, `photos`
    - `parsed.schemaVersion === db.verno` (currently 1)
    - `parsed.data` has all 7 table-name keys, each an Array
    - `parsed.data.foods[i]` has same shape as the Dexie Food record (plain JSON, no proxies)
    - `parsed.exportedAt` is a valid ISO-8601 UTC timestamp (new Date().toISOString())
    - `parsed.appVersion` equals APP_VERSION from src/lib/version.ts
    - For every food with `photoKey` defined, either `parsed.photos[photoKey]` starts with `'data:image/webp;base64,'` OR `photoKey` appears in `warnings.skippedPhotos`
    - If loadPhoto throws mid-loop, console.warn fires with prefix `[export]`, loop continues, envelope still builds
    - NO `db.transaction(` substring in the file (Pitfall #1)
    - NO `toISOString().split(` substring in the file (Pitfall #4)
    - Service imports `db` from `@/db/db` — UI layer does NOT import db directly (enforced at Task 2)
  </behavior>
  <action>
STEP 1 — Modify `src/lib/storageKeys.ts`. Append exactly one line at the end of the file, matching the existing `'healthtracker:<camelCase>'` prefix convention (NOT the inline `'ht.*'` used elsewhere — this file is the centralized-constant home). Resolved per planner open-question #2: use `'healthtracker:lastExportedAt'`.

```typescript
export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';
```

Result file state (add blank line between existing constants and new one optional — match existing file's compactness):
```typescript
// src/lib/storageKeys.ts
// Centralized localStorage keys. No side effects — safe to import from anywhere.
// ... (existing header comment untouched)
export const LAST_OPENED_KEY = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';
```

STEP 2 — Create NEW file `src/services/export.svc.ts` using the EXACT content below. This is Pattern 2 from RESEARCH.md with the Pitfall-guard header prepended per PATTERNS.md "Pitfall-guard comment headers" shared pattern. Do NOT alter import paths, function names, or error messages — consumers downstream depend on these.

```typescript
// src/services/export.svc.ts
// Phase 4 data-export service. BACK-01 envelope shape + BACK-02 `<a download>` consumer.
// Read-only aggregate across all 7 Dexie stores + OPFS photo loop.
//
// Pitfall guards:
//   #1 (IDB auto-commit): NO db.transaction() wrapper — all awaits are Dexie reads,
//      AND the OPFS loop does a non-IDB await that would trigger auto-commit inside
//      a transaction. Export is strictly read-only; a personal single-user backup
//      has no snapshot-isolation requirement.
//   #4 (UTC dayKey bug): Caller (SettingsScreen/ExportCard) constructs the filename
//      via lib/dayKey.ts:todayKey(). This service exposes no dayKey derivation.
//   #6 (photos in OPFS): photoStore.loadPhoto() is the canonical OPFS read. Never
//      read raw Dexie blobs.
//
// Assumption (RESEARCH §Assumptions A1, A2): records contain only strings/numbers/
// booleans/simple arrays of same — JSON.stringify is lossless. Expected library
// size <100 photos × ~100KB = ~10MB envelope; fits in-memory on all target
// iOS 18+ / Android devices.

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

// Blob → `data:image/webp;base64,...` dataURI. Inline per RESEARCH Open Q #3
// (8 lines, single consumer — don't extract until a second caller appears).
// readAsDataURL over manual btoa+String.fromCharCode — no stack-overflow risk
// at arbitrary blob size. [CITED: MDN FileReader.readAsDataURL]
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function exportAll(): Promise<ExportResult> {
  // Step 1 — Bulk Dexie read. Parallel, no transaction wrapper (Pitfall #1 guard).
  // Enumerated form (not db.tables.map) so each array keeps its narrow type.
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

  // Step 2 — OPFS photo read loop. SEQUENTIAL (iOS Safari OPFS parallel-read
  // flakiness per CONTEXT Claude's Discretion). Expected <50 photos; this is
  // not a hot path. Per-photo failure = skip + console.warn (D-10). Never
  // aborts the whole export.
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

  // Step 3 — Build envelope. exportedAt is UTC ISO (metadata, not a dayKey).
  const envelope: ExportEnvelope = {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: { ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals },
    photos,
  };

  return {
    json: JSON.stringify(envelope),
    warnings: { skippedPhotos },
  };
}
```
  </action>
  <verify>
    <automated>
      grep -q "LAST_EXPORTED_KEY" src/lib/storageKeys.ts \
      && grep -q "'healthtracker:lastExportedAt'" src/lib/storageKeys.ts \
      && test -f src/services/export.svc.ts \
      && grep -q "export async function exportAll" src/services/export.svc.ts \
      && grep -q "db.ptTemplates.toArray()" src/services/export.svc.ts \
      && grep -q "db.goals.toArray()" src/services/export.svc.ts \
      && grep -q "db.verno" src/services/export.svc.ts \
      && grep -q "loadPhoto(food.photoKey)" src/services/export.svc.ts \
      && grep -q "skippedPhotos" src/services/export.svc.ts \
      && grep -q "new Date().toISOString()" src/services/export.svc.ts \
      && ! grep -q "db.transaction(" src/services/export.svc.ts \
      && ! grep -qE "toISOString\\(\\)\\.split" src/services/export.svc.ts \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/lib/storageKeys.ts` contains the exact line `export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';`
    - File `src/lib/storageKeys.ts` still contains all 3 original constants (`LAST_OPENED_KEY`, `PREV_OPENED_KEY`, `INSTALL_DISMISSED_KEY`)
    - File `src/services/export.svc.ts` exists
    - File contains `export async function exportAll(`
    - File contains `export interface ExportResult`
    - File contains all 7 enumerated calls: `db.ptTemplates.toArray()`, `db.ptSessions.toArray()`, `db.foods.toArray()`, `db.mealEntries.toArray()`, `db.stepEntries.toArray()`, `db.liftCheckins.toArray()`, `db.goals.toArray()`
    - File contains `db.verno` (for schemaVersion source)
    - File contains `loadPhoto(food.photoKey)`
    - File contains `readAsDataURL` (Blob→base64 encoder)
    - File contains `console.warn(` with `[export]` string literal in the warning
    - File contains `skippedPhotos` array accumulator
    - File contains `new Date().toISOString()` (for exportedAt metadata — different from forbidden dayKey usage)
    - File does NOT contain the substring `db.transaction(` (Pitfall #1 — NO transaction wrapper)
    - File does NOT contain regex match `toISOString\(\)\.split` (Pitfall #4 — never split-to-date)
    - File does NOT import anything from `@/components` or `@/routes` (service layer cleanliness)
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    storageKeys.ts exposes LAST_EXPORTED_KEY. export.svc.ts exports exportAll() returning a BACK-01-shaped envelope as a JSON string plus a warnings bag. TypeScript compiles. No transaction wrapper, no UTC-dayKey trap.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Build ExportCard feature component</name>
  <files>
    - src/features/settings/ExportCard.tsx (NEW)
  </files>
  <read_first>
    - src/services/export.svc.ts (the module created in Task 1 — this consumer reads its exports)
    - src/lib/storageKeys.ts (verify LAST_EXPORTED_KEY is in place)
    - src/lib/dayKey.ts (todayKey() — required for filename construction; NEVER toISOString().split)
    - src/components/ui/card.tsx + src/components/ui/button.tsx (primitives this component uses)
    - src/routes/SettingsScreen.tsx (READ the Install Card JSX at lines 31-51 — ExportCard matches this rhythm verbatim)
    - src/features/settings/GoalsForm.tsx lines 105-109 (inline error text pattern — `style={{ color: '#ef4444' }}` inline hex, NOT a `--destructive` token)
    - src/components/EvictionBanner.tsx + src/components/InstallBanner.tsx (localStorage read/write patterns — useEffect mount-read, Number(raw ?? '0'), setItem(String(Date.now())))
    - src/db/db.ts (for the 4-count useLiveQuery — ptSessions, mealEntries, stepEntries, liftCheckins)
    - .planning/phases/04-backup-polish/04-RESEARCH.md Pattern 3 (triggerDownload helper with setTimeout revoke — verbatim)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §Pitfall 5 (lastExportedAt fires on serialize-success, not on browser save — document the quirk)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"src/routes/SettingsScreen.tsx" for Install Card analog structure
  </read_first>
  <behavior>
    - Initial mount with `LAST_EXPORTED_KEY` absent and 0 total rows → Card renders title + helper + button only (no nudge, no "last exported" line)
    - Initial mount with `LAST_EXPORTED_KEY` absent and >=1 row in any logging table → Card renders "Back up your data" calm nudge line under helper
    - Initial mount with `LAST_EXPORTED_KEY` set to Date.now() - 86_400_000 (1 day ago) → Card renders "Last exported: 1 day ago"
    - Initial mount with `LAST_EXPORTED_KEY` set to Date.now() - 15*86_400_000 → Card renders BOTH the last-exported line AND "Time to back up — last exported 15 days ago" nudge
    - Tap button: state flips to 'exporting' → button `disabled`, shows `<Loader2 animate-spin />` + "Exporting…" text
    - On successful exportAll() resolve: triggerDownload runs → localStorage.setItem fires → lastExportedAt state updates → "Last exported: just now" renders → state back to 'idle'
    - On exportAll() reject OR triggerDownload throw: state flips to 'error' → inline red-tinted `<p>` renders "Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding." → button re-enables
    - With `warnings.skippedPhotos.length > 0`: last-exported line reads "Exported (N photo(s) couldn't be saved)" instead of "Last exported: just now"
    - `useLiveQuery` of `[ptSessions, mealEntries, stepEntries, liftCheckins].count()` causes the nudge to appear mid-session after first log on a fresh install (per CONTEXT Claude's Discretion + RESEARCH Open Q #4)
    - Filename is literally `healthtracker-${todayKey()}.json` — verify by inspecting downloaded file in test
    - `URL.revokeObjectURL(url)` is wrapped in `setTimeout(..., 30_000)` per RESEARCH Pitfall 1
  </behavior>
  <action>
Create NEW file `src/features/settings/ExportCard.tsx`. This is a self-contained feature component (matching the `GoalsForm.tsx` sibling pattern) that consumes `exportAll()` from Task 1. Copy the content below EXACTLY — the copy strings, inline-hex color, setTimeout delay, and localStorage key names are all load-bearing.

```tsx
// src/features/settings/ExportCard.tsx
// Phase 4 export entry point (D-01 — Settings, between <GoalsForm /> and flex-1 spacer).
// Wires exportAll() to the browser download machinery + localStorage lastExportedAt.
//
// UX decisions (all locked in CONTEXT.md):
//   D-01 — Single entry point in Settings (Card visual match to Install Card).
//   D-02 — Filename `healthtracker-${todayKey()}.json` — LOCAL day via lib/dayKey.ts.
//          NEVER toISOString().split (Pitfall #4).
//   D-03 — Post-save confirmation = inline "Last exported: {relative time}" line.
//          No toast, no modal, no Banner — just text inside the Card.
//   D-04 — localStorage `LAST_EXPORTED_KEY` + 14-day stale nudge inline when:
//          (a) never exported AND >=1 row across logging tables, OR
//          (b) lastExportedAt exists AND (now - lastExportedAt) > 14 * 86_400_000.
//   D-09 — Run-state UX = <Loader2 animate-spin /> + "Exporting…" + disabled button.
//   D-10 — Per-photo failure: skip-with-warning. Surface as
//          "Exported (N photo(s) couldn't be saved)" when warnings.skippedPhotos.length > 0.
//   D-11 — Total failure: inline red-tinted text. Button re-enables.
//
// Pitfall 5 (documented in code comment below): lastExportedAt is set after
// exportAll() serializes successfully, NOT after the user confirms the OS save
// dialog. If the user cancels the system download, the Card will still say
// "Last exported: just now" — acceptable quirk, user can re-tap Export.
//
// Pitfall 1 (RESEARCH): setTimeout(revokeObjectURL, 30_000) — synchronous revoke
// after a.click() cancels the download in Firefox / some Chromium versions.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { todayKey } from '@/lib/dayKey';
import { LAST_EXPORTED_KEY } from '@/lib/storageKeys';
import { exportAll } from '@/services/export.svc';

type ExportState = 'idle' | 'exporting' | 'error';
const STALE_MS = 14 * 86_400_000; // 14 days

/** Relative-time formatter — minimal inline ladder, no Intl dep. */
function formatRelative(ms: number): string {
  const elapsed = Date.now() - ms;
  if (elapsed < 60_000) return 'just now';
  if (elapsed < 3_600_000) {
    const m = Math.round(elapsed / 60_000);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (elapsed < 86_400_000) {
    const h = Math.round(elapsed / 3_600_000);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const d = Math.round(elapsed / 86_400_000);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function triggerDownload(json: string, dayKey: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `healthtracker-${dayKey}.json`;
  a.click();
  // 30s delay per RESEARCH Pitfall 1 — Mozilla bugzilla 1282407 + Chromium 41380177.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ExportCard() {
  const [state, setState] = useState<ExportState>('idle');
  const [lastExportedAt, setLastExportedAt] = useState<number | null>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LAST_EXPORTED_KEY) : null;
    return raw ? Number(raw) : null;
  });
  const [skippedCount, setSkippedCount] = useState<number>(0);

  // D-04 data-exists heuristic — useLiveQuery so nudge appears mid-session after
  // the first log on a fresh install. Four subscriptions on Settings mount is
  // negligible (per RESEARCH Open Q #4). Sum of counts — any nonzero means
  // "user has data worth backing up".
  const rowCount = useLiveQuery(async () => {
    const [a, b, c, d] = await Promise.all([
      db.ptSessions.count(),
      db.mealEntries.count(),
      db.stepEntries.count(),
      db.liftCheckins.count(),
    ]);
    return a + b + c + d;
  }, []);

  // Re-sync lastExportedAt from localStorage after every successful export
  // (handled in onExport); this useEffect ensures a cross-tab update also
  // triggers a refresh — cheap belt-and-suspenders.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_EXPORTED_KEY && e.newValue) {
        setLastExportedAt(Number(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hasData = (rowCount ?? 0) > 0;
  const isStale =
    lastExportedAt !== null && Date.now() - lastExportedAt > STALE_MS;
  const showNeverExportedNudge = lastExportedAt === null && hasData;
  const showStaleNudge = isStale;

  let lastExportedLine: string | null = null;
  if (lastExportedAt !== null) {
    if (skippedCount > 0 && Date.now() - lastExportedAt < 60_000) {
      lastExportedLine = `Exported (${skippedCount} photo${skippedCount === 1 ? '' : 's'} couldn't be saved)`;
    } else {
      lastExportedLine = `Last exported: ${formatRelative(lastExportedAt)}`;
    }
  }

  let nudgeLine: string | null = null;
  if (showNeverExportedNudge) {
    nudgeLine = 'Back up your data';
  } else if (showStaleNudge && lastExportedAt !== null) {
    const days = Math.round((Date.now() - lastExportedAt) / 86_400_000);
    nudgeLine = `Time to back up — last exported ${days} days ago`;
  }

  async function onExport() {
    setState('exporting');
    setSkippedCount(0);
    try {
      const result = await exportAll();
      triggerDownload(result.json, todayKey());
      // Pitfall 5: lastExportedAt reflects "envelope serialized successfully",
      // NOT "user confirmed OS save dialog" — no browser callback exists for
      // the latter. Acceptable quirk; user can re-tap if save was cancelled.
      const now = Date.now();
      localStorage.setItem(LAST_EXPORTED_KEY, String(now));
      setLastExportedAt(now);
      setSkippedCount(result.warnings.skippedPhotos.length);
      setState('idle');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[export] total failure:', err);
      setState('error');
    }
  }

  return (
    <Card className="bg-surface border border-border rounded-lg p-4">
      <h2 className="text-base font-semibold text-text">Export data</h2>
      <p className="text-sm text-muted mt-1">
        Download all your logs as a single JSON file. Keep it somewhere safe — this is your backup.
      </p>
      {lastExportedLine && (
        <p className="text-xs text-muted mt-2">{lastExportedLine}</p>
      )}
      {nudgeLine && (
        <p className="text-xs text-muted mt-1">{nudgeLine}</p>
      )}
      <div className="mt-3">
        <Button
          variant="default"
          disabled={state === 'exporting'}
          onClick={() => {
            void onExport();
          }}
        >
          {state === 'exporting' && <Loader2 className="size-4 animate-spin" />}
          {state === 'exporting' ? 'Exporting…' : 'Export data'}
        </Button>
      </div>
      {state === 'error' && (
        <p className="text-xs mt-2" style={{ color: '#ef4444' }}>
          Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding.
        </p>
      )}
    </Card>
  );
}
```
  </action>
  <verify>
    <automated>
      test -f src/features/settings/ExportCard.tsx \
      && grep -q "export function ExportCard" src/features/settings/ExportCard.tsx \
      && grep -q "exportAll()" src/features/settings/ExportCard.tsx \
      && grep -q "todayKey()" src/features/settings/ExportCard.tsx \
      && grep -q "LAST_EXPORTED_KEY" src/features/settings/ExportCard.tsx \
      && grep -q "healthtracker-\${dayKey}.json" src/features/settings/ExportCard.tsx \
      && grep -q "setTimeout(() => URL.revokeObjectURL" src/features/settings/ExportCard.tsx \
      && grep -q "30_000" src/features/settings/ExportCard.tsx \
      && grep -q "Loader2" src/features/settings/ExportCard.tsx \
      && grep -q "Exporting…" src/features/settings/ExportCard.tsx \
      && grep -q "Last exported:" src/features/settings/ExportCard.tsx \
      && grep -q "Back up your data" src/features/settings/ExportCard.tsx \
      && grep -q "Time to back up" src/features/settings/ExportCard.tsx \
      && grep -q "Export failed — try again." src/features/settings/ExportCard.tsx \
      && grep -q "#ef4444" src/features/settings/ExportCard.tsx \
      && grep -q "useLiveQuery" src/features/settings/ExportCard.tsx \
      && ! grep -qE "toISOString\\(\\)\\.split" src/features/settings/ExportCard.tsx \
      && ! grep -q "from '@/db/db'" src/features/settings/ExportCard.tsx || grep -q "db.ptSessions.count" src/features/settings/ExportCard.tsx \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/features/settings/ExportCard.tsx` exists
    - File exports `ExportCard` as a named export (via `export function ExportCard`)
    - File imports `exportAll` from `@/services/export.svc`
    - File imports `LAST_EXPORTED_KEY` from `@/lib/storageKeys`
    - File imports `todayKey` from `@/lib/dayKey`
    - File imports `Loader2` from `lucide-react`
    - File imports `useLiveQuery` from `dexie-react-hooks`
    - File uses `useLiveQuery` with 4 counts: `db.ptSessions.count()`, `db.mealEntries.count()`, `db.stepEntries.count()`, `db.liftCheckins.count()` (D-04 heuristic)
    - File contains the literal filename template `` `healthtracker-${dayKey}.json` ``
    - File contains `setTimeout(() => URL.revokeObjectURL` with `30_000` as the delay (Pitfall 1)
    - File does NOT contain `toISOString().split` (Pitfall 4)
    - File contains the 3 user-facing copy strings: `"Last exported:"`, `"Back up your data"`, `"Time to back up — last exported"`, `"Export data"` (button label)
    - File contains the D-11 error copy verbatim: `"Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding."`
    - File contains `"Exporting…"` (the ellipsis character U+2026 — match literal)
    - File uses inline `style={{ color: '#ef4444' }}` on the D-11 error `<p>` (precedent: GoalsForm.tsx:106)
    - File disables the button when `state === 'exporting'`
    - File calls `localStorage.setItem(LAST_EXPORTED_KEY, String(Date.now()))` on success path
    - File calls `console.error` (NOT `console.warn`) on total failure with prefix `[export]`
    - Card matches Install-Card visual rhythm: `className="bg-surface border border-border rounded-lg p-4"` outer; `<h2 className="text-base font-semibold text-text">`; `<p className="text-sm text-muted mt-1">` for helper
    - `npm run build` exits 0 with no TypeScript errors
  </acceptance_criteria>
  <done>
    ExportCard renders the title, helper text, conditional last-exported line, conditional 14-day nudge, button (with spinner state), and conditional red-tinted D-11 error. TypeScript compiles with the new component.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Insert ExportCard into SettingsScreen + verify BACK-01/02 end-to-end</name>
  <files>
    - src/routes/SettingsScreen.tsx (MODIFIED — insert import + <ExportCard />)
  </files>
  <read_first>
    - src/routes/SettingsScreen.tsx (current full file — verify the insertion site is still the gap between <GoalsForm /> and <div className="flex-1" />; layout may have drifted since PATTERNS.md was written)
    - src/features/settings/ExportCard.tsx (the component from Task 2 — verify named export)
    - src/features/settings/GoalsForm.tsx (no read needed unless the file has moved)
    - .planning/phases/04-backup-polish/04-CONTEXT.md §D-01 (insertion-site constraint verbatim)
  </read_first>
  <behavior>
    - After the edit, `/settings` route renders in this vertical order (top to bottom):
      1. `<h1>Settings</h1>`
      2. Install Card (conditional — only when !isStandalone)
      3. `<GoalsForm />`
      4. `<ExportCard />` ← NEW
      5. `<div className="flex-1" />`
      6. Version line (`v{APP_VERSION} (build {BUILD_HASH})`)
    - Clicking the ExportCard's "Export data" button triggers the full export flow and produces a downloadable file named `healthtracker-YYYY-MM-DD.json` with today's local dayKey
    - No other SettingsScreen layout changes (outer `px-4 py-6 space-y-4 flex flex-col min-h-[calc(100dvh-112px)]` wrapper untouched)
  </behavior>
  <action>
STEP 1 — Modify `src/routes/SettingsScreen.tsx`. Two edits only:

(a) Add the import at the top of the file, alongside the existing `GoalsForm` import:

```typescript
import { GoalsForm } from '@/features/settings/GoalsForm';
import { ExportCard } from '@/features/settings/ExportCard';  // NEW
```

(b) Insert the `<ExportCard />` element between `<GoalsForm />` and `<div className="flex-1" />` in the return JSX. The inserted line is ONLY `<ExportCard />` on its own line — do NOT wrap it in another Card or Fragment. The parent `space-y-4` handles vertical rhythm.

Before:
```tsx
      <GoalsForm />

      <div className="flex-1" />
```

After:
```tsx
      <GoalsForm />

      <ExportCard />

      <div className="flex-1" />
```

STEP 2 — After edits, confirm with `npm run build` that the bundle compiles and no type errors surface.

STEP 3 — Perform an end-to-end spot check (automated — no human UI gate needed in this plan; visual UAT happens at Phase-end review):

```bash
# The executor should also run: the file contents round-trip through JSON.parse,
# and the envelope has all 7 table keys. This is a dev-time smoke — add to the
# verify block if a scratch node script is appropriate, or rely on npm run build
# as the primary gate.
npm run build
```
  </action>
  <verify>
    <automated>
      grep -q "import { ExportCard } from '@/features/settings/ExportCard'" src/routes/SettingsScreen.tsx \
      && grep -q "<ExportCard />" src/routes/SettingsScreen.tsx \
      && grep -q "<GoalsForm />" src/routes/SettingsScreen.tsx \
      && grep -q "flex-1" src/routes/SettingsScreen.tsx \
      && awk '/<GoalsForm \/>/{g=NR} /<ExportCard \/>/{e=NR} /<div className="flex-1"/{s=NR} END{exit !(g>0 && e>g && s>e)}' src/routes/SettingsScreen.tsx \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `src/routes/SettingsScreen.tsx` contains the exact import line: `import { ExportCard } from '@/features/settings/ExportCard';`
    - File contains `<ExportCard />` (self-closing, no props)
    - The `<ExportCard />` appears textually AFTER `<GoalsForm />` AND BEFORE `<div className="flex-1" />` (line-order check enforced by the awk command in verify)
    - File still contains `<GoalsForm />` (unchanged; did not replace it)
    - File still contains the `flex-1` spacer `<div>`
    - File still contains the version line `v{APP_VERSION}`
    - `npm run build` exits 0 with no TypeScript errors
    - Bundle size has not regressed by >50 KB (Phase 4 is additive; if build output is much larger, something was imported wrong)
  </acceptance_criteria>
  <done>
    SettingsScreen renders ExportCard between GoalsForm and the spacer. Build passes. BACK-01 (envelope generation via exportAll in Task 1) and BACK-02 (<a download> mechanism in Task 2's triggerDownload) are wired end-to-end.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| App ↔ OS download | `<a download>` handoff — blob URL → browser shell → iOS share sheet / Android Downloads. Content is user's own logged data; no third-party injection point. |
| App ↔ localStorage | `LAST_EXPORTED_KEY` is an opaque timestamp. No PII, no secret. |
| App ↔ OPFS | Photo reads via `loadPhoto()`. Existing Phase 1 pipeline — Phase 4 adds no new OPFS surface. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Information Disclosure | Exported JSON contains all user health data in plaintext | accept | User is sole device owner; encryption explicitly deferred (CONTEXT.md `<deferred>`). No network exfiltration — export is entirely client-side. File goes to user-chosen OS location. |
| T-04-02 | Tampering | User imports a malicious JSON file (attack surface) | accept | OUT OF SCOPE for Phase 4 — BACK-03 (importer) is v2. Export-only phase has no tampering vector. v2 importer will validate `schemaVersion <= db.verno` + record shapes + require explicit destructive-confirm before replacing data. |
| T-04-03 | Denial of Service | JSON.stringify throws on a huge library, crashing the tab | mitigate | D-11 total-failure path catches the throw, logs to console.error, surfaces inline red-tinted error copy, re-enables the button. Expected library <20MB fits comfortably in memory per RESEARCH §A1. |
| T-04-04 | Denial of Service | Single corrupt photo blocks backup indefinitely | mitigate | D-10 per-photo skip-with-warning: catch inside the for..of loop, console.warn the key, push to skippedPhotos, continue. One bad photo never aborts the export. |
| T-04-05 | Information Disclosure | Object URL stays alive after click → potentially readable by malicious page | mitigate | `setTimeout(URL.revokeObjectURL(url), 30_000)` — URL is invalidated 30s after click, well before any realistic exfiltration window. Origin of blob URL is same-origin-only anyway. |
| T-04-06 | Spoofing | Filename in `<a download>` attribute could mimic a system file | accept | Filename is fully controlled by this code (`healthtracker-YYYY-MM-DD.json`), not user input. No path traversal vector because download attr strips slashes in all modern browsers. |
| T-04-07 | Repudiation | User claims they backed up but `lastExportedAt` disagrees | accept | `lastExportedAt` is a best-effort local signal, not a legal record. Quirk documented in code (Pitfall 5) — click-triggered `<a download>` has no browser callback for save-confirmation. Single-user local tool; no audit requirements. |

**ASVS L1 applicable controls:** V7 (error handling — D-10 console.warn, D-11 console.error + user-visible inline error), V8 (data protection — export is user-initiated, no exfil), V14 (config — no secrets in envelope).
</threat_model>

<verification>
Overall plan verifications (run after all 3 tasks complete):
1. `npm run build` exits 0
2. Manual sanity (NOT gated in this plan — Phase-end UAT handles visual review):
   - Open the app in a fresh localhost, log a few items
   - Navigate to /#/settings
   - ExportCard renders between GoalsForm and the spacer with "Back up your data" nudge
   - Tap "Export data" → spinner appears briefly → file downloads as `healthtracker-YYYY-MM-DD.json`
   - Card now shows "Last exported: just now"
   - Open the downloaded file → valid JSON parsing → has all 7 table keys + photos map
3. Grep confirmations (covered in per-task verify blocks).
</verification>

<success_criteria>
**BACK-01 closed:** A Settings-Card Export button produces a JSON envelope matching ARCHITECTURE.md §"Export / Import JSON Format" verbatim — `schemaVersion`, `exportedAt`, `appVersion`, `data` (7 tables), `photos` (base64 dataURIs). Per-photo failures skip-with-warning. Total failure surfaces as inline red-tinted copy.

**BACK-02 closed:** Download trigger uses `URL.createObjectURL` + hidden `<a download>` + programmatic click + `setTimeout(revoke, 30_000)`. NO `showSaveFilePicker`. Works on iOS standalone PWAs.

**D-01..D-04, D-09..D-12 closed:** Card location (between GoalsForm and spacer), filename format (local dayKey), inline post-save confirmation, localStorage-backed last-exported + 14-day stale nudge, spinner-based run state, skip-with-warning, inline error, no pre-flight estimate — all implemented per CONTEXT.md locked decisions.

**No Pitfall violations:** Grep confirms no `db.transaction(` in export.svc.ts; no `toISOString().split(` anywhere introduced by this plan; photos read via `loadPhoto()` (never raw Dexie blobs); `setTimeout(..., 30_000)` around `revokeObjectURL`.
</success_criteria>

<output>
After completion, create `.planning/phases/04-backup-polish/04-01-SUMMARY.md` using `$HOME/.claude/get-shit-done/templates/summary.md`. Capture:
- Tech-stack: no new deps (all existing)
- Decisions: D-01 D-02 D-03 D-04 D-09 D-10 D-11 D-12 closed; open Q #2/#3/#4/#6/#7 resolved in-plan
- Patterns established: "service-layer multi-table Promise.all export pattern", "`setTimeout(revoke, 30_000)` discipline"
- Affects: `src/lib/storageKeys.ts`, `src/services/`, `src/features/settings/`, `src/routes/SettingsScreen.tsx`
- Provides: `exportAll()`, `ExportCard`, `LAST_EXPORTED_KEY`
</output>
