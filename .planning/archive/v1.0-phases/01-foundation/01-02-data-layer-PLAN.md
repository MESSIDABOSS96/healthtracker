---
phase: 01-foundation
plan: 02
type: execute
wave: 2
depends_on: ["01-foundation-01"]
files_modified:
  - src/db/schema.ts
  - src/db/db.ts
  - src/lib/dayKey.ts
  - src/lib/dayKey.smoke.ts
  - src/lib/photoStore.ts
autonomous: true
requirements: [DATA-01, DATA-02, DATA-03, DATA-04, DATA-05]
tags: [dexie, indexeddb, opfs, dayKey, photo-pipeline, data-layer]

must_haves:
  truths:
    - "Opening the app in a browser creates an IndexedDB database named 'HealthTrackerDB' at version 1 with exactly 7 object stores"
    - "todayKey() returns the local-wall-clock date in YYYY-MM-DD format — never a UTC-shifted date"
    - "Calling savePhoto(blob) writes a WebP file to OPFS under directory 'food-photos' and returns a 'food-<uuid>.webp' filename"
    - "resizePhoto(file) produces a Blob with both dimensions ≤ 800px encoded as image/webp"
    - "db.ts header comment documents the append-only migration rule (Pitfall #2)"
    - "db.ts contains a Dexie-transaction example annotated 'non-IDB await inside transaction is forbidden' (Pitfall #1 guard for future phases)"
  artifacts:
    - path: "src/db/schema.ts"
      provides: "TypeScript interfaces for all 7 record types"
      contains: "PTTemplate"
    - path: "src/db/db.ts"
      provides: "HealthTrackerDB class with v1 stores and append-only migration policy comment"
      contains: "this.version(1).stores"
    - path: "src/lib/dayKey.ts"
      provides: "todayKey(), dateToKey(), keyToDate() — local-time day identity"
      exports: ["todayKey", "dateToKey", "keyToDate"]
    - path: "src/lib/dayKey.smoke.ts"
      provides: "Dev-mode smoke assertion for the 11:30pm UTC-5 edge case"
      contains: "2026-04-19"
    - path: "src/lib/photoStore.ts"
      provides: "OPFS photo CRUD + resize pipeline (WebP @ 0.8, max 800px)"
      exports: ["savePhoto", "loadPhoto", "deletePhoto", "resizePhoto"]
  key_links:
    - from: "src/db/db.ts"
      to: "src/db/schema.ts"
      via: "TypeScript type imports"
      pattern: "from './schema'"
    - from: "src/lib/photoStore.ts"
      to: "navigator.storage.getDirectory"
      via: "OPFS root access"
      pattern: "navigator\\.storage\\.getDirectory"
    - from: "src/db/db.ts"
      to: "Dexie version(1) constructor"
      via: "schema declaration"
      pattern: "version\\(1\\)\\.stores"
---

<objective>
Build the data-layer foundation: Dexie v1 schema with all 7 object stores, the canonical `dayKey` utility with a dev-mode smoke assertion for the 11:30pm UTC-5 edge case, and the OPFS-backed photo pipeline (WebP @ 80%, max 800×800). Codifies project-breaking rules #1 (IDB transaction auto-commit), #2 (append-only migrations), #4 (UTC date bug), and #5/#6 (photo resize + OPFS-only photos) at the point of first use so every downstream phase inherits the guards.

Purpose: Every Phase 2 feature writes through this layer. Getting it wrong silently breaks dayKey (wrong-day logs), silently drops writes (transaction auto-commit), or fills storage and crashes the tab (unresized photos). This plan closes those failure modes before any feature code exists to trip them.
Output: Importable `db`, `dayKey` helpers, and `photoStore` helpers with header-comment guards documenting the pitfalls.
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
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@CLAUDE.md

<interfaces>
<!-- Contracts this plan establishes that Plan 03 and Phase 2 will consume. -->

From src/lib/dayKey.ts (Plan 03 consumes for smoke assert wiring; Phase 2 uses everywhere):
```typescript
export function todayKey(): string;                 // local YYYY-MM-DD for `new Date()`
export function dateToKey(date: Date): string;      // local YYYY-MM-DD for any Date
export function keyToDate(key: string): Date;       // parses YYYY-MM-DD as LOCAL midnight (not UTC)
```

From src/db/db.ts (Phase 2 consumes for all CRUD):
```typescript
export class HealthTrackerDB extends Dexie {
  ptTemplates: Table<PTTemplate, string>;
  ptSessions: Table<PTSession, string>;
  foods: Table<Food, string>;
  mealEntries: Table<MealEntry, string>;
  stepEntries: Table<StepEntry, string>;    // PK = dayKey
  liftCheckins: Table<LiftCheckin, string>; // PK = dayKey
  goals: Table<Goals, string>;              // singleton: id === 'singleton'
}
export const db: HealthTrackerDB;
```

From src/lib/photoStore.ts (Phase 2 Food UI consumes):
```typescript
export async function savePhoto(blob: Blob): Promise<string>; // returns photoKey (food-<uuid>.webp)
export async function loadPhoto(filename: string): Promise<Blob>;
export async function deletePhoto(filename: string): Promise<void>;
export async function resizePhoto(file: File, maxDim?: number, quality?: number): Promise<Blob>;
```

Callers MUST resize before save: `savePhoto(await resizePhoto(file))`. Raw Files must never reach `savePhoto` (Pitfall #8 / CLAUDE.md rule #5).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dexie v1 schema with 7 stores + TypeScript interfaces + append-only migration guard comments</name>
  <files>src/db/schema.ts, src/db/db.ts</files>
  <read_first>
    - .planning/research/ARCHITECTURE.md §"Object Store Schema" (authoritative 7-store definitions and field types)
    - .planning/research/ARCHITECTURE.md §"Schema Versioning Strategy" (append-only rule)
    - .planning/research/PITFALLS.md §"Pitfall 1" (IDB transaction auto-commit — document the rule in db.ts header)
    - .planning/research/PITFALLS.md §"Pitfall 2" (append-only migrations — document the rule in db.ts header)
    - .planning/phases/01-foundation/01-RESEARCH.md §1 (complete db.ts code skeleton to transcribe)
    - src/db/schema.ts (will not exist; create)
    - src/db/db.ts (will not exist; create)
  </read_first>
  <action>
    1. Create `src/db/schema.ts` with TypeScript interfaces for all 7 record types. Field names/types come from `.planning/research/ARCHITECTURE.md` §"Object Store Schema" — transcribe verbatim. If ARCHITECTURE.md leaves a type implicit, use the following Phase-1-minimum shape (Phase 2 will extend as needed; this plan only needs enough for Dexie to open the DB with correct primary keys and indexes):

       ```typescript
       // src/db/schema.ts

       export interface PTTemplate {
         id: string;             // uuid
         name: string;
         exercises: Array<{
           name: string;
           targetSets?: number;
           targetReps?: number;
           targetDurationSec?: number;
           description?: string;
         }>;
         createdAt: number;      // epoch ms
       }

       export interface PTSession {
         id: string;              // uuid
         dayKey: string;          // YYYY-MM-DD (local) — MUST come from lib/dayKey.ts
         templateId: string;      // FK → PTTemplate.id
         loggedAt: number;        // epoch ms
         exercises: Array<{
           name: string;
           actualSets?: number;
           actualReps?: number;
           actualDurationSec?: number;
           completed: boolean;
         }>;
         painRating?: number;     // 0..5
         notes?: string;
       }

       export interface Food {
         id: string;              // uuid
         name: string;
         calories: number;
         proteinG: number;
         carbsG: number;
         fatG: number;
         servingLabel: string;    // e.g. "1 cup", "100g"
         photoKey?: string;       // filename in OPFS (food-<uuid>.webp) — NEVER a blob (Pitfall #6)
         createdAt: number;
       }

       export type MealBucket = 'breakfast' | 'lunch' | 'dinner' | 'snack';

       export interface MealEntry {
         id: string;              // uuid
         dayKey: string;          // YYYY-MM-DD (local)
         foodId: string;          // FK → Food.id
         servings: number;
         bucket: MealBucket;
         loggedAt: number;
         // Denormalized totals (FOOD-06 — no runtime joins for day totals)
         computedCalories: number;
         computedProteinG: number;
         computedCarbsG: number;
         computedFatG: number;
       }

       export interface StepEntry {
         dayKey: string;          // primary key — one record per day
         count: number;
         loggedAt: number;
       }

       export interface LiftCheckin {
         dayKey: string;          // primary key — one record per day
         lifted: boolean;
         note?: string;
         loggedAt: number;
       }

       export interface Goals {
         id: string;              // 'singleton'
         calories: number;
         proteinG: number;
         carbsG: number;
         fatG: number;
         steps: number;
         updatedAt: number;
       }
       ```

    2. Create `src/db/db.ts` with the HealthTrackerDB class. The header comment block MUST document: (a) the append-only migration rule (Pitfall #2), (b) the non-IDB-await-inside-transaction rule (Pitfall #1). Copy the skeleton from `.planning/phases/01-foundation/01-RESEARCH.md` §1 verbatim for the class + `version(1).stores({...})` block:

       ```typescript
       // src/db/db.ts
       import Dexie, { type Table } from 'dexie';
       import type {
         PTTemplate, PTSession, Food, MealEntry,
         StepEntry, LiftCheckin, Goals,
       } from './schema';

       /* =========================================================================
        * SCHEMA VERSION HISTORY — APPEND-ONLY. NEVER EDIT A SHIPPED VERSION BLOCK.
        * =========================================================================
        *   v1 (2026-04): Initial schema — 7 stores.
        *     ptTemplates  (id PK, name idx, createdAt idx)
        *     ptSessions   (id PK, dayKey idx, templateId idx, loggedAt idx)
        *     foods        (id PK, name idx, createdAt idx)
        *     mealEntries  (id PK, dayKey idx, foodId idx, loggedAt idx)
        *     stepEntries  (dayKey PK — natural key, one record per day)
        *     liftCheckins (dayKey PK — natural key, one record per day)
        *     goals        (id PK — singleton: id === 'singleton')
        *
        * Future migrations MUST add this.version(N+1).stores({...}).upgrade(tx => {...})
        * — never mutate an earlier version block. See .planning/research/PITFALLS.md
        * §Pitfall 2 for the rationale and failure mode.
        * =========================================================================
        *
        * TRANSACTION RULE (Pitfall #1): Inside db.transaction('rw', tables, async () => {...})
        * every `await` must be a Dexie call. A non-IDB await (fetch, setTimeout, IndexedDB
        * OPFS call, etc.) causes IDB to auto-commit and drop subsequent writes silently.
        * CORRECT:
        *   await db.transaction('rw', db.foods, async () => {
        *     const f = await db.foods.get(id);           // Dexie — OK
        *     await db.foods.put({ ...f, name: 'new' });  // Dexie — OK
        *   });
        * FORBIDDEN (silent data loss):
        *   await db.transaction('rw', db.foods, async () => {
        *     const resp = await fetch('/x');             // ← non-IDB — txn auto-commits here
        *     await db.foods.put(...);                    // ← throws or no-ops
        *   });
        * ========================================================================= */

       export class HealthTrackerDB extends Dexie {
         ptTemplates!: Table<PTTemplate, string>;
         ptSessions!: Table<PTSession, string>;
         foods!: Table<Food, string>;
         mealEntries!: Table<MealEntry, string>;
         stepEntries!: Table<StepEntry, string>;
         liftCheckins!: Table<LiftCheckin, string>;
         goals!: Table<Goals, string>;

         constructor() {
           super('HealthTrackerDB');
           this.version(1).stores({
             ptTemplates:  'id, name, createdAt',
             ptSessions:   'id, dayKey, templateId, loggedAt',
             foods:        'id, name, createdAt',
             mealEntries:  'id, dayKey, foodId, loggedAt',
             stepEntries:  'dayKey',
             liftCheckins: 'dayKey',
             goals:        'id',
           });
         }
       }

       export const db = new HealthTrackerDB();
       ```

    3. Verify TS compiles (`npm run typecheck`). DO NOT open the DB at module-import time beyond the Dexie constructor's default behavior — actual connection opens lazily on first query (RESEARCH.md §6 startup invariants).
  </action>
  <acceptance_criteria>
    - `src/db/schema.ts` exists and exports all 7 interfaces. Verify: `grep -E "^export (interface|type) (PTTemplate|PTSession|Food|MealEntry|StepEntry|LiftCheckin|Goals|MealBucket)" src/db/schema.ts` returns 8 matches.
    - `src/db/db.ts` exists and `grep -c "this.version(1).stores" src/db/db.ts` returns `1`.
    - `grep -c "'ptTemplates'" src/db/db.ts` returns `1`. Repeat for each of the 7 store names: `ptSessions`, `foods`, `mealEntries`, `stepEntries`, `liftCheckins`, `goals`. Each must appear in the stores() block.
    - `grep -c 'APPEND-ONLY' src/db/db.ts` returns at least `1` (Pitfall #2 documented in header).
    - `grep -c 'Pitfall #1' src/db/db.ts` returns at least `1` (non-IDB-await rule documented).
    - `grep -c 'stepEntries:  *.dayKey' src/db/db.ts` returns `1` (dayKey as natural PK for step entries).
    - `grep -c 'liftCheckins: *.dayKey' src/db/db.ts` returns `1` (dayKey as natural PK for lift check-ins).
    - `grep -c 'photoKey' src/db/schema.ts` returns `1` (Food has the filename reference field).
    - `grep -c 'computedCalories' src/db/schema.ts` returns `1` (MealEntry denormalizes — FOOD-06 for Phase 2).
    - `npm run typecheck` exits 0.
    - `npm run build` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && for store in ptTemplates ptSessions foods mealEntries stepEntries liftCheckins goals; do grep -q "'$store'" src/db/db.ts || (echo "missing store: $store" && exit 1); done && grep -q 'APPEND-ONLY' src/db/db.ts && grep -q 'Pitfall #1' src/db/db.ts</automated>
  </verify>
  <done>Dexie class declares all 7 stores with correct primary-key conventions; header comment documents the append-only rule (Pitfall #2) and non-IDB-await transaction rule (Pitfall #1); TypeScript types cover all record shapes Phase 2 will use.</done>
</task>

<task type="auto">
  <name>Task 2: Create dayKey utility with 11:30pm UTC-5 dev smoke assertion (Pitfall #4 guard)</name>
  <files>src/lib/dayKey.ts, src/lib/dayKey.smoke.ts</files>
  <read_first>
    - .planning/research/ARCHITECTURE.md §"Day Key Format Decision" (local-getter algorithm)
    - .planning/research/PITFALLS.md §"Pitfall 4" (UTC midnight bug — the exact failure mode)
    - .planning/phases/01-foundation/01-RESEARCH.md §2 (complete code + edge-case table + smoke-check pattern)
    - CLAUDE.md (Project-breaking rule #3: never toISOString().split('T')[0])
    - src/lib/dayKey.ts (will not exist; create)
  </read_first>
  <action>
    1. Create `src/lib/dayKey.ts` with exactly three exports: `todayKey()`, `dateToKey(date)`, `keyToDate(key)`. Transcribe from RESEARCH.md §2:

       ```typescript
       // src/lib/dayKey.ts
       // Single source of truth for day-identity across all stores.
       // MUST use local getters — never toISOString() — to avoid UTC-drift
       // (see .planning/research/PITFALLS.md §Pitfall 4 and CLAUDE.md rule #3).
       //
       // FORBIDDEN:
       //   new Date().toISOString().split('T')[0]   // returns UTC day, shifts for western TZ at night
       //
       // CORRECT:
       //   Use getFullYear/Month/Date as below.

       export function todayKey(): string {
         return dateToKey(new Date());
       }

       export function dateToKey(date: Date): string {
         const y = date.getFullYear();
         const m = String(date.getMonth() + 1).padStart(2, '0');
         const d = String(date.getDate()).padStart(2, '0');
         return `${y}-${m}-${d}`;
       }

       export function keyToDate(key: string): Date {
         // Parse components as local — NOT `new Date(key)` which parses ISO-date as UTC midnight.
         const [y, m, d] = key.split('-').map(Number);
         return new Date(y, m - 1, d);
       }
       ```

    2. Create `src/lib/dayKey.smoke.ts` — a dev-only self-testing module that Plan 03's `initApp()` will import. This gives a per-launch regression trap for Pitfall #4. Per CONTEXT.md "Claude's Discretion" the Vitest alternative is allowed; we choose the console.assert path (RESEARCH.md §2 recommendation — lighter than a test framework for a 3-line utility):

       ```typescript
       // src/lib/dayKey.smoke.ts
       // Dev-only smoke assertions. Plan 03 imports this once from initApp() under import.meta.env.DEV.
       // These are not unit tests — they're an in-process tripwire for Pitfall #4.
       import { dateToKey, keyToDate, todayKey } from './dayKey';

       export function runDayKeySmoke(): void {
         // === THE CRITICAL CASE ===
         // 11:30pm local time in a western timezone — UTC-based formatting would shift the day forward.
         // This case is ROADMAP.md Phase 1 success criterion #3 explicitly.
         const localApr19_2330 = new Date(2026, 3, 19, 23, 30); // JS months 0-indexed; Apr = 3
         console.assert(
           dateToKey(localApr19_2330) === '2026-04-19',
           `dayKey regression (Pitfall #4): dateToKey(Apr 19 2026 23:30 local) returned ${dateToKey(localApr19_2330)} — expected 2026-04-19`
         );

         // === ADDITIONAL GUARDS ===
         // Key shape is always zero-padded
         const singleDigit = new Date(2026, 0, 5, 12, 0); // Jan 5, noon local
         console.assert(dateToKey(singleDigit) === '2026-01-05', `zero-pad regression: ${dateToKey(singleDigit)}`);

         // keyToDate round-trips as local midnight (not UTC midnight)
         const roundTrip = keyToDate('2026-04-19');
         console.assert(
           roundTrip.getFullYear() === 2026 && roundTrip.getMonth() === 3 && roundTrip.getDate() === 19,
           `keyToDate local-midnight regression: got ${roundTrip.toString()}`
         );

         // todayKey() is defined and shaped YYYY-MM-DD
         console.assert(/^\d{4}-\d{2}-\d{2}$/.test(todayKey()), `todayKey shape: ${todayKey()}`);
       }
       ```

    3. Run `npm run typecheck` to confirm TS compiles. DO NOT wire the smoke module into `main.tsx` yet — Plan 03's `initApp()` owns that call-site. Leaving it unimported means tree-shake drops it from production builds automatically.
  </action>
  <acceptance_criteria>
    - `src/lib/dayKey.ts` exists with exactly three exports. Verify: `grep -cE '^export function (todayKey|dateToKey|keyToDate)' src/lib/dayKey.ts` returns `3`.
    - `grep -c 'toISOString' src/lib/dayKey.ts` returns `0` (Pitfall #4 — forbidden API is NOT used).
    - `grep -c 'getFullYear' src/lib/dayKey.ts` returns `1` (local getter used).
    - `grep -c 'getMonth' src/lib/dayKey.ts` returns `1`.
    - `grep -c 'getDate' src/lib/dayKey.ts` returns `1`.
    - `grep -c "new Date(y, m - 1, d)" src/lib/dayKey.ts` returns `1` (local-midnight parsing in keyToDate).
    - `grep -c "new Date(key)" src/lib/dayKey.ts` returns `0` (the UTC-parsing form is NOT used).
    - `src/lib/dayKey.smoke.ts` exists and `grep -c '2026-04-19' src/lib/dayKey.smoke.ts` returns at least `2` (expected value literal appears in the assertion and the message).
    - `grep -c 'new Date(2026, 3, 19, 23, 30)' src/lib/dayKey.smoke.ts` returns `1` (the exact 11:30pm April 19 2026 case from ROADMAP.md success criterion #3).
    - `grep -c 'Pitfall #4' src/lib/dayKey.smoke.ts` returns at least `1` (documents the failure mode being guarded).
    - `npm run typecheck` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && grep -q 'getFullYear' src/lib/dayKey.ts && ! grep -q 'toISOString' src/lib/dayKey.ts && grep -q 'new Date(2026, 3, 19, 23, 30)' src/lib/dayKey.smoke.ts</automated>
  </verify>
  <done>dayKey.ts uses local getters only (Pitfall #4 guarded); three exports present; smoke module asserts ROADMAP success criterion #3 exactly (dateToKey(Apr 19 2026 23:30 local) === '2026-04-19') and stays tree-shakeable by being an unimported module until Plan 03 opts in.</done>
</task>

<task type="auto">
  <name>Task 3: Build OPFS photoStore with WebP@80% resize pipeline (Pitfall #5, D-07, D-08, Rule #5/#6)</name>
  <files>src/lib/photoStore.ts</files>
  <read_first>
    - .planning/research/ARCHITECTURE.md §"Photo Storage Implementation" (OPFS pattern)
    - .planning/research/PITFALLS.md §"Pitfall 8" (unresized photos crash tab)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-07: WebP@80%, max 800; D-08: canvas.toBlob; filenames 'food-<uuid>.webp')
    - .planning/phases/01-foundation/01-RESEARCH.md §3 (complete photoStore skeleton + EXIF orientation note)
    - CLAUDE.md (Project-breaking rules #5 and #6 — MUST read before implementing)
    - src/lib/photoStore.ts (will not exist; create)
  </read_first>
  <action>
    1. Create `src/lib/photoStore.ts` with exactly four exports: `savePhoto`, `loadPhoto`, `deletePhoto`, `resizePhoto`. Transcribe from RESEARCH.md §3, including the `imageOrientation: 'from-image'` EXIF fix (one-line safe-to-include):

       ```typescript
       // src/lib/photoStore.ts
       //
       // OPFS-backed photo store for food library entries.
       // Invariants (see CLAUDE.md rules #5 and #6 + .planning/research/PITFALLS.md §Pitfall 8):
       //   1. Photos live in OPFS — NEVER as Dexie blobs. Dexie records store only the filename (photoKey).
       //   2. Photos MUST be resized (≤800×800 at WebP quality 0.8) BEFORE savePhoto() is called.
       //      Raw iPhone photos (~4-5MB) will fill quota and crash the tab.
       //   3. Filenames are generated by savePhoto() as `food-<uuid>.webp`. Callers never construct them.
       //
       // Locked by CONTEXT.md D-07: WebP @ 0.8 (NOT JPEG @ 0.7 — CLAUDE.md rule #5 must be updated
       // by Plan 03 to match this decision).

       const PHOTO_DIR = 'food-photos';

       async function getDir(): Promise<FileSystemDirectoryHandle> {
         const root = await navigator.storage.getDirectory();
         return root.getDirectoryHandle(PHOTO_DIR, { create: true });
       }

       /** Save a resized blob to OPFS and return the generated filename (photoKey). */
       export async function savePhoto(blob: Blob): Promise<string> {
         const key = `food-${crypto.randomUUID()}.webp`;
         const dir = await getDir();
         const fh = await dir.getFileHandle(key, { create: true });
         const writable = await fh.createWritable();
         await writable.write(blob);
         await writable.close();
         return key;
       }

       /** Read a photo back as a Blob. Caller is responsible for object-URL lifecycle. */
       export async function loadPhoto(filename: string): Promise<Blob> {
         const dir = await getDir();
         const fh = await dir.getFileHandle(filename);
         return await fh.getFile();
       }

       export async function deletePhoto(filename: string): Promise<void> {
         const dir = await getDir();
         await dir.removeEntry(filename);
       }

       /**
        * Resize a user-picked File to ≤ maxDim (default 800px) on its longest edge,
        * encoded as WebP at quality 0.8 (per CONTEXT.md D-07).
        *
        * EXIF orientation is handled by createImageBitmap's imageOrientation option —
        * supported on Chrome 90+, Safari 15+, Firefox 103+ (all target browsers for
        * iOS/Android home-screen PWAs in 2026).
        */
       export async function resizePhoto(
         file: File,
         maxDim = 800,
         quality = 0.8,
       ): Promise<Blob> {
         const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
         const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
         const w = Math.round(bitmap.width * scale);
         const h = Math.round(bitmap.height * scale);

         const canvas = document.createElement('canvas');
         canvas.width = w;
         canvas.height = h;
         const ctx = canvas.getContext('2d');
         if (!ctx) throw new Error('2D canvas context unavailable');
         ctx.drawImage(bitmap, 0, 0, w, h);

         return await new Promise<Blob>((resolve, reject) => {
           canvas.toBlob(
             (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob returned null'))),
             'image/webp',
             quality,
           );
         });
       }
       ```

    2. Confirm `npm run typecheck` and `npm run build` pass. Do NOT call the exports from any other file in this plan — Plan 03 (Food UI is Phase 2) does not consume them yet. Leaving them unimported keeps them tree-shakable if the plan lands but the consumer is delayed.

    3. Per CLAUDE.md rule #5 currently reading "JPEG @ 70%", this file's header comment explicitly flags that CONTEXT.md D-07 supersedes it and that Plan 03 is responsible for editing CLAUDE.md to "WebP @ 80%".
  </action>
  <acceptance_criteria>
    - `src/lib/photoStore.ts` exists. `grep -cE "^export async function (savePhoto|loadPhoto|deletePhoto|resizePhoto)" src/lib/photoStore.ts` returns `4`.
    - `grep -c "'image/webp'" src/lib/photoStore.ts` returns `1` (D-07: WebP encoding).
    - `grep -c "quality = 0.8" src/lib/photoStore.ts` returns `1` (D-07: 80% quality default).
    - `grep -c "maxDim = 800" src/lib/photoStore.ts` returns `1` (D-05/D-07: 800px max dimension).
    - `grep -c "'image/jpeg'" src/lib/photoStore.ts` returns `0` (JPEG path NOT present — superseded by D-07).
    - `grep -c "'food-\${crypto.randomUUID()}.webp'" src/lib/photoStore.ts` returns `0` (template literal uses backticks; count actual pattern):
      - Instead verify: `grep -c 'food-' src/lib/photoStore.ts` returns at least `1` and `grep -c 'crypto.randomUUID' src/lib/photoStore.ts` returns `1`.
    - `grep -c "navigator.storage.getDirectory" src/lib/photoStore.ts` returns `1` (OPFS root access).
    - `grep -c "imageOrientation: 'from-image'" src/lib/photoStore.ts` returns `1` (EXIF orientation fix).
    - `grep -c 'PHOTO_DIR' src/lib/photoStore.ts` returns at least `1` (directory constant defined).
    - `grep -c "'food-photos'" src/lib/photoStore.ts` returns `1` (directory name literal matches D-07 convention).
    - Pitfall #6 (no blobs in Dexie) is preserved because `Food.photoKey` is `string`, not `Blob` — confirm: `grep -c 'photoKey: *Blob' src/db/schema.ts` returns `0`.
    - `npm run typecheck` exits 0.
    - `npm run build` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "'image/webp'" src/lib/photoStore.ts && grep -q "quality = 0.8" src/lib/photoStore.ts && grep -q "maxDim = 800" src/lib/photoStore.ts && ! grep -q "'image/jpeg'" src/lib/photoStore.ts && grep -q "imageOrientation: 'from-image'" src/lib/photoStore.ts && ! grep -q 'photoKey: *Blob' src/db/schema.ts</automated>
  </verify>
  <done>photoStore exports the four helpers; WebP@80% + 800px defaults locked per D-07; EXIF orientation handled via createImageBitmap; Dexie schema has no Blob-typed photo fields (Pitfall #6 guarded); file builds cleanly.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| User-picked File → resizePhoto() | File content is unvetted; image decoder + canvas must handle malformed inputs without crashing the tab |
| IDB write → disk | IDB can silently drop writes during transaction auto-commit (Pitfall #1) |
| OPFS → disk | OPFS quota exhaustion is a DoS surface if photos aren't resized |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-06 | Denial of Service | OPFS quota exhaustion via unresized photos (Pitfall #8) | mitigate | resizePhoto() enforces ≤800×800 @ WebP 0.8 defaults; savePhoto callers in Phase 2 MUST call resizePhoto first. Header comment in photoStore.ts documents this invariant |
| T-01-07 | Tampering | Dexie transaction auto-commit dropping writes silently (Pitfall #1) | mitigate | Header comment in db.ts documents the non-IDB-await rule with CORRECT/FORBIDDEN examples. No transactions written in Phase 1 — enforcement is at code-review time for Phase 2 |
| T-01-08 | Tampering | Schema migration mutating a shipped v1 block (Pitfall #2) | mitigate | db.ts header comment explicitly forbids editing a shipped version(N) block; future migrations use version(N+1).upgrade() only |
| T-01-09 | Information Disclosure | Malformed image file leaks memory via createImageBitmap exception stack traces | accept | resizePhoto wraps decode errors in a generic `Error('2D canvas context unavailable' / 'toBlob returned null')`. createImageBitmap throws a DOMException that React surfaces only in dev overlays; production logs do not surface to any remote endpoint (local-only app) |
| T-01-10 | Tampering | UTC-based day keys silently shift log dates (Pitfall #4) | mitigate | dayKey.ts uses local getters only; toISOString is forbidden (grep-verified); smoke module asserts ROADMAP success criterion #3 exactly on every dev launch once Plan 03 wires it in |
| T-01-11 | Information Disclosure | photoKey collisions revealing other foods' photos | accept | crypto.randomUUID() collision probability is negligible (2^122 entropy); single-user app; no cross-user data to protect |
</threat_model>

<verification>
- `npm run typecheck` exits 0.
- `npm run build` exits 0.
- All 7 store names present in db.ts: ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals.
- dayKey.ts uses only local getters (getFullYear/Month/Date) — no toISOString.
- photoStore.ts uses WebP @ 0.8, max 800px, `imageOrientation: 'from-image'`.
- smoke module asserts dateToKey(2026-04-19 23:30 local) === '2026-04-19'.
- db.ts header comment documents Pitfall #1 (non-IDB awaits) and Pitfall #2 (append-only migrations).
</verification>

<success_criteria>
1. Phase 2 can import `db`, `todayKey`/`dateToKey`/`keyToDate`, and `savePhoto`/`loadPhoto`/`deletePhoto`/`resizePhoto` by path without any further foundation work.
2. Opening the app once (after Plan 03 wires the smoke assert into initApp) triggers the 11:30pm UTC-5 console.assert without firing — the dayKey regression is actively guarded every dev run.
3. ROADMAP.md Phase 1 success criteria #2 (7 stores at v1), #3 (dayKey at 11:30pm UTC-5), #4 (OPFS + photoKey reference) are all mechanically satisfied by files created in this plan.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-02-SUMMARY.md` with:
- Exact store-definition string(s) used in db.ts `version(1).stores({...})` — for Phase 2 reviewers to double-check against ARCHITECTURE.md
- Any field-type deviations from ARCHITECTURE.md §"Object Store Schema" (and why)
- Confirmation that dayKey.smoke.ts is NOT yet imported (so Plan 03 knows it needs to wire it)
- Note that CLAUDE.md rule #5 still reads "JPEG @ 70%" and is Plan 03's responsibility to update to "WebP @ 80%"
</output>
