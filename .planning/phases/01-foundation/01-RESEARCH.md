# Phase 1: Foundation — Research

**Phase:** 01-foundation
**Researched:** 2026-04-20
**Domain:** Vite + React 19 + Dexie 4 + OPFS + vite-plugin-pwa + Tailwind v4 app scaffold
**Confidence:** HIGH (stack and architecture are locked; this research focuses on concrete code skeletons the planner can reference)
**Status:** Ready for planning

---

<user_constraints>
## User Constraints (from 01-CONTEXT.md)

### Locked Decisions
- **D-01/D-02:** Bottom tab bar with three tabs — **Today**, **Calendar**, **Settings**. Today hosts all four tracking sections on one screen.
- **D-03:** `react-router-dom` with **hash routes** (`/#/today`, `/#/calendar`, `/#/settings`).
- **D-04:** Safe-area insets via `env(safe-area-inset-*)` on bottom tab bar + top header.
- **D-05:** Today screen ships in Phase 1 as the **real layout shell with labeled placeholder sections**: `PT — not logged yet`, `Food — 0 / target cals`, `Steps — —`, `Lift — ☐`.
- **D-06:** Calendar + Settings tabs are stubs in Phase 1; Settings gets the install-instructions card.
- **D-07:** Photos are **WebP @ 80% quality**, max 800×800, OPFS. Filenames `food-<uuid>.webp`. CLAUDE.md rule #5 must be updated Phase 1 (JPEG→WebP).
- **D-08:** Resize via `<canvas>` + `canvas.toBlob('image/webp', 0.8)`. `foods.photoKey` = filename only.
- **D-09/D-10:** `vite-plugin-pwa` with `registerType: 'autoUpdate'`. No in-app update banner (SETUP-06 is v2). Build hash shown in Settings.
- **D-11/D-12/D-13:** First-launch install banner (data-safety framing) if not standalone; persistent Install card in Settings; Android `beforeinstallprompt` wired to same banner button.
- **D-14:** Eviction-warning banner ships in Phase 1 — check `lastOpenedAt` in localStorage, warn if gap > 4 days and not standalone.
- **D-15/D-16/D-17:** Dark tokens locked — `--bg:#09090b`, `--surface:#18181b`, `--border:#27272a`, `--muted:#a1a1aa`, `--text:#fafafa`, accent `#22c55e`. Partial-fill is single-hue alpha ramp (25/50/75/100%).
- **D-18:** Tokens in `src/styles/tokens.css`; Tailwind v4 `@theme` references them.
- **D-19:** `.dark` class on `<html>`; light mode out of scope.

### Claude's Discretion
- App-shell component names, icon choice (Lucide recommended), banner copy/persistence keys, EXIF orientation handling, dev tooling (ESLint/Prettier, npm default), goals seeding strategy, Vitest vs `console.assert` for dayKey.

### Deferred Ideas (OUT OF SCOPE for Phase 1)
- SETUP-06 update banner (v2).
- Light mode.
- Custom warm-neutral palette.
- Per-segment colored DayCell quadrants.
- Vitest framework install (only if chosen during planning; scope = dayKey test).
- Goals default seeding (Phase 2 concern).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SETUP-01 | PWA installs to iOS + Android home screens (manifest, icons, theme color) | §4 vite-plugin-pwa manifest excerpt |
| SETUP-02 | App functions fully offline after first load | §4 `generateSW` strategy + workbox precache |
| SETUP-03 | `navigator.storage.persist()` called at startup | §6 Startup invariants |
| SETUP-04 | Dark, minimal visual style as only theme | §5 tokens.css + Tailwind v4 `@theme` |
| SETUP-05 | Landing screen loads < 1s on warm cache | §6 lazy-open Dexie; precached app shell |
| DATA-01 | Dexie `db.version(1).stores(...)` with append-only migration policy | §1 schema declaration + migration rule |
| DATA-02 | Single `dayKey` utility, local-time YYYY-MM-DD | §2 dayKey.ts implementation |
| DATA-03 | 7 stores: foods, mealEntries, ptTemplates, ptSessions, stepEntries, liftCheckins, goals | §1 stores() string |
| DATA-04 | Food photos in OPFS; `foods.photoKey` = filename reference | §3 photoStore.ts skeleton |
| DATA-05 | Photos resized ≤800×800 before OPFS write (locked to WebP@80% per D-07) | §3 resizePhoto() |
</phase_requirements>

## Canonical references (don't re-research)

Already-authoritative docs — the planner should cite these by path, not duplicate their content:

- `.planning/research/STACK.md` — locked versions (React 19, Vite 7, Dexie 4.4, Tailwind 4.2, vite-plugin-pwa 1.2, shadcn/ui, react-router-dom)
- `.planning/research/ARCHITECTURE.md` — **source of truth for schemas, dayKey logic, OPFS pattern, SW strategy, folder layout** (§"Object Store Schema", §"Day Key Format Decision", §"Photo / Blob Storage", §"Service Worker / Offline Strategy")
- `.planning/research/PITFALLS.md` — 11 numbered pitfalls; Phase 1 must guard #1, #2, #3 (eviction), #4 (UTC date bug), #5 (SW), #8 (photo resize)
- `.planning/research/SUMMARY.md` — build-order recommendations
- `CLAUDE.md` — project-breaking rules (note: rule #5 says JPEG; **Phase 1 must update to WebP @ 80% per D-07**)

## Executive Summary

- The stack, schemas, and pitfalls are all locked in `.planning/research/*.md`. This research is **concrete-code-oriented**: six focused skeletons the planner can hand to tasks verbatim.
- **Dexie v1 schema** exactly matches `ARCHITECTURE.md` §"Object Store Schema". 7 stores, primary keys + indexes already specified there. Just transcribe.
- **`lib/dayKey.ts`** uses local getters per `ARCHITECTURE.md` §"Day Key Format Decision". Three exports: `todayKey()`, `dateToKey()`, `keyToDate()`.
- **OPFS photoStore** follows `ARCHITECTURE.md` §"Photo Storage Implementation" but **swaps JPEG for WebP @ 80%** per D-07. CLAUDE.md rule #5 needs the same edit.
- **vite-plugin-pwa:** Recommend **`generateSW` strategy** (simpler, sufficient for Phase 1's precache-only needs) over `injectManifest` from ARCHITECTURE.md. Rationale: no custom runtime routes are needed in Phase 1 — app shell precache is all. `injectManifest` can be adopted later if runtime rules are added.
- **Tailwind v4 + tokens.css** — Tailwind v4 uses `@theme` directive to map CSS vars to utility classes. One file declares `--bg`/`--surface`/etc., the global stylesheet's `@theme` block exposes them to Tailwind.
- **Startup invariants** (in `main.tsx` or `initApp()`): apply `.dark` class → request `navigator.storage.persist()` → stamp `lastOpenedAt` → let Dexie lazy-open on first query → register SW (auto via vite-plugin-pwa virtual module). Ordering matters: `.dark` before first paint; `persist()` before any DB write; `lastOpenedAt` read before write (to trigger D-14 eviction banner).

**Primary recommendation:** Use `ARCHITECTURE.md` + this doc as the implementation spec. The planner can carve Phase 1 into ~5 plans: (A) scaffold + tooling, (B) tokens + app shell, (C) Dexie + dayKey + OPFS, (D) PWA manifest + SW, (E) startup + banners.

---

## 1. Dexie v4 Schema (concrete code)

**Source of truth:** `.planning/research/ARCHITECTURE.md` §"Object Store Schema" and §"Schema Versioning Strategy". Transcribe directly.

### `src/db/schema.ts`

Define TS interfaces for all 7 records (already specified in ARCHITECTURE.md — copy verbatim). Key interfaces: `PTTemplate`, `PTSession`, `Food`, `MealEntry`, `StepEntry`, `LiftCheckin`, `Goals`.

### `src/db/db.ts`

```typescript
import Dexie, { type Table } from 'dexie';
import type {
  PTTemplate, PTSession, Food, MealEntry,
  StepEntry, LiftCheckin, Goals,
} from './schema';

// ==============================================================
// Schema version history (APPEND-ONLY — never edit past versions).
//   v1 (2026-04): Initial schema — 7 stores.
// Future: add this.version(2).stores({ ... }).upgrade(tx => {...});
// Never mutate v1 once shipped. See PITFALLS.md §Pitfall 2.
// ==============================================================

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
      stepEntries:  'dayKey',       // natural key — one record per day
      liftCheckins: 'dayKey',       // natural key — one record per day
      goals:        'id',           // singleton: id === 'singleton'
    });
  }
}

export const db = new HealthTrackerDB();
```

### Dexie index notation cheat-sheet

| Prefix | Meaning | Example |
|--------|---------|---------|
| (none) | Primary key OR regular index | `'id, name'` → `id` is PK, `name` is index |
| `&` | Unique index | `'&email'` |
| `*` | Multi-entry index (array fields) | `'*tags'` |
| `++` | Auto-increment PK | `'++id'` |
| `[a+b]` | Compound index | `'[dayKey+foodId]'` |

**Phase 1 uses none of the special prefixes.** All keys are manual UUID strings or `dayKey` strings; no compound or multi-entry indexes needed.

### Transaction pattern (Pitfall #1 guard)

**CORRECT:**

```typescript
// All awaits inside are Dexie calls — stays in the Dexie zone, transaction stays live.
await db.transaction('rw', [db.foods, db.mealEntries], async () => {
  const food = await db.foods.get(foodId);
  if (!food) throw new Error('food missing');
  await db.mealEntries.add({ /* ... */ });
});
```

**ANTI-EXAMPLE (trips Pitfall #1 — silent data loss):**

```typescript
// BAD — fetch() is a non-IDB promise. IDB auto-commits the transaction
// while we await the fetch; the subsequent db.foods.put() throws
// TransactionInactiveError (or worse, silently no-ops).
await db.transaction('rw', db.foods, async () => {
  const resp = await fetch('/api/something');   // ← non-IDB await
  const data = await resp.json();
  await db.foods.put({ /* ... */ });             // ← transaction already gone
});

// FIX: do the fetch BEFORE opening the transaction.
const resp = await fetch('/api/something');
const data = await resp.json();
await db.transaction('rw', db.foods, async () => {
  await db.foods.put({ /* ... */ });
});
```

**Migration rule (Pitfall #2):** Never edit an existing `this.version(N)` declaration after shipping. For any schema change, add `this.version(N+1).stores({...}).upgrade(tx => {...})`. Document each version in the header comment block (version, date, what changed).

---

## 2. `lib/dayKey.ts` (concrete code)

**Source of truth:** `ARCHITECTURE.md` §"Day Key Format Decision".

### Full implementation

```typescript
// src/lib/dayKey.ts
// Single source of truth for day-identity across all stores.
// MUST use local getters — never toISOString() — to avoid UTC-drift (PITFALLS.md §Pitfall 4).

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

### Edge-case verification table

| Local wall-clock time | Timezone | UTC instant | `todayKey()` must return |
|-----------------------|----------|-------------|--------------------------|
| 2026-04-19 23:30 | UTC-5 (EST) | 2026-04-20 04:30 UTC | `2026-04-19` ← local, not `2026-04-20` |
| 2026-04-20 00:30 | UTC+9 (JST) | 2026-04-19 15:30 UTC | `2026-04-20` ← local, not `2026-04-19` |
| 2026-04-20 12:00 | UTC | 2026-04-20 12:00 UTC | `2026-04-20` |

If `todayKey()` ever used `new Date().toISOString().split('T')[0]`, rows 1 and 2 would flip and produce silent wrong-day bugs.

### Validation recommendation

**Recommend: `console.assert` smoke check in `main.tsx` during dev mode** (not Vitest for Phase 1).

Rationale: (a) Adding Vitest = new dev dependency, new config file, new test command in package.json, new CI concern — overkill for a 3-line utility. (b) A `console.assert` in dev mode catches the regression without adding framework weight. (c) CONTEXT.md explicitly lists Vitest as Claude's-discretion/deferred; prefer the lighter option unless the planner chooses otherwise.

```typescript
// dev-only smoke check, in main.tsx or an init file
if (import.meta.env.DEV) {
  const d = new Date(2026, 3, 19, 23, 30);   // local Apr 19, 11:30pm
  console.assert(dateToKey(d) === '2026-04-19', 'dayKey local-time regression');
}
```

**If the planner chooses Vitest:** Install `vitest` + `@vitest/ui`, add `test` script, write `tests/dayKey.test.ts` with 2-3 cases. Scope stays single-file.

---

## 3. OPFS Photo Pipeline (concrete code skeleton)

**Source of truth:** `ARCHITECTURE.md` §"Photo Storage Implementation" — but **with WebP @ 80% per D-07** (not JPEG). This updates `CLAUDE.md` rule #5 (which still says JPEG@70%) as part of Phase 1 execution.

### `src/lib/photoStore.ts`

```typescript
// src/lib/photoStore.ts
// OPFS-backed photo store. Never embed blobs in Dexie; store only photoKey filename.

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

/** Read a photo back as a Blob (caller creates/revokes object URL). */
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
 * Resize a user-picked File to ≤ maxDim on its longest edge and encode as WebP.
 * Quality defaults to 0.8 per D-07. Returns a Blob suitable for savePhoto().
 * NOTE: EXIF orientation is intentionally ignored in Phase 1 — flag-and-defer.
 */
export async function resizePhoto(
  file: File,
  maxDim = 800,
  quality = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/webp',
      quality,
    );
  });
}
```

### EXIF orientation — flag-and-defer

iPhone photos commonly arrive with EXIF Orientation 6 (rotated 90°). Without handling, a portrait photo appears sideways after resize. `createImageBitmap(file, { imageOrientation: 'from-image' })` honors EXIF automatically **on all modern browsers (Chrome 90+, Safari 15+, Firefox 103+)** — use that option.

**Recommended updated line:**

```typescript
const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
```

This is a one-word change that resolves orientation correctly with no canvas math. Safe to include in Phase 1.

### `CLAUDE.md` rule #5 update

Current text: *"Resize photos to ≤800×800 @ ~70% JPEG before OPFS write"*
Updated (per D-07): *"Resize photos to ≤800×800 @ 80% WebP before OPFS write"*

This edit is a Phase 1 task (not research's responsibility to apply, but must be surfaced to the planner).

---

## 4. vite-plugin-pwa Config (concrete code)

**Strategy recommendation: `generateSW` (Workbox-generated SW) for Phase 1.**

ARCHITECTURE.md suggested `injectManifest` (custom `sw.ts`). **Override for Phase 1:** use `generateSW` instead.

Rationale: (a) Phase 1 needs only app-shell precache + SPA navigation fallback — both default-on in `generateSW`. (b) `injectManifest` requires maintaining a hand-written `src/sw.ts` and its Workbox dependencies. (c) If runtime caching rules (e.g., Google Fonts) are added later, `generateSW` supports `runtimeCaching` entries; migration to `injectManifest` is only needed if custom message handlers (e.g., SKIP_WAITING) are required — which per D-09 they are not. (d) Less surface area = less to break.

### `vite.config.ts` (relevant excerpt)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',         // D-09: silent update on next reload
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
      ],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',   // SPA routing works offline
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'HealthTracker',
        short_name: 'HealthTracker',
        description: 'Personal daily tracker for PT, food, steps, and lifts.',
        theme_color: '#09090b',           // D-15 --bg
        background_color: '#09090b',      // D-15 --bg
        display: 'standalone',
        start_url: '.',
        scope: '.',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
```

### iOS-installability manifest checklist

For the home-screen install flow on iOS Safari to work (SETUP-01):

| Field | Required? | Value used |
|-------|-----------|-----------|
| `name` + `short_name` | Yes | HealthTracker |
| `display: 'standalone'` | Yes (standalone launch) | standalone |
| `start_url` | Yes | `.` (relative — plays well with hash routes) |
| `theme_color` | Recommended (status bar tint when installed) | `#09090b` |
| `background_color` | Recommended (splash) | `#09090b` |
| `icons` 192 + 512 | Required | both PNG |
| `icons` with `purpose: 'maskable'` 512 | Recommended for Android adaptive icons | included |
| `apple-touch-icon` in index.html `<head>` | **Required for iOS** — vite-plugin-pwa does NOT auto-inject this | must add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` manually |
| `orientation` | Optional | portrait |

**⚠ iOS gotcha:** iOS Safari reads `<link rel="apple-touch-icon">` from the HTML `<head>`, NOT from the manifest. Vite-plugin-pwa does not inject this. The `index.html` template must include it explicitly.

### Vite pinning note (from CLAUDE.md)

Pin `vite` to `^7.0.0` (not `^8`) until `vite-plugin-pwa` 1.3 resolves the Vite 8 peer-dep warnings. Phase 1 scaffolding should set `"vite": "^7"` explicitly in `package.json` devDependencies.

---

## 5. Tailwind v4 `@theme` + tokens.css Wiring

**Source of truth:** CONTEXT.md D-15 through D-19.

### `src/styles/tokens.css`

```css
/* src/styles/tokens.css
   Locked dark-mode design tokens (D-15, D-16, D-17).
   Imported once by main.tsx. */

:root {
  /* Base palette — shadcn zinc (D-15) */
  --bg:      #09090b;
  --surface: #18181b;
  --border:  #27272a;
  --muted:   #a1a1aa;
  --text:    #fafafa;

  /* Accent — soft green (D-16) */
  --accent:       #22c55e;
  --accent-25:    rgba(34, 197, 94, 0.25);   /* D-17 partial fill: 1/4 */
  --accent-50:    rgba(34, 197, 94, 0.50);   /* D-17 partial fill: 2/4 */
  --accent-75:    rgba(34, 197, 94, 0.75);   /* D-17 partial fill: 3/4 */
  --accent-100:   #22c55e;                   /* D-17 partial fill: 4/4 (complete) */
}
```

### Tailwind v4 global stylesheet (`src/styles/index.css`)

Tailwind v4 deprecates `tailwind.config.js` and uses the **`@theme` CSS directive** for design-token mapping. `@theme` values become Tailwind utility class names (e.g., `bg-surface`, `text-muted`).

```css
/* src/styles/index.css */
@import './tokens.css';
@import 'tailwindcss';

@theme {
  --color-bg:      var(--bg);
  --color-surface: var(--surface);
  --color-border:  var(--border);
  --color-muted:   var(--muted);
  --color-text:    var(--text);
  --color-accent:  var(--accent);
}

/* Base body defaults */
html { background-color: var(--bg); color: var(--text); }
body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
```

Result: `bg-bg`, `bg-surface`, `text-muted`, `border-border`, `text-accent`, etc. all resolve correctly as Tailwind utilities.

### `.dark` class application

Per D-19, add `.dark` to `<html>` on mount:

```typescript
// in main.tsx, before render
document.documentElement.classList.add('dark');
```

There is only one theme; the class is applied once for future-proofing (shadcn components check for `.dark`).

### shadcn/ui compatibility note

shadcn/ui init supports Tailwind v4 as of late 2025. During scaffold, run `npx shadcn@latest init` and choose "new-york" or "default" style. For Phase 1, scaffold these components only: **Button, Card, Sheet** (for banners/dialogs). Dialog can wait until Phase 2. Keep the surface area minimal.

---

## 6. Startup Invariants

Ordering matters. Required sequence in `main.tsx` (or an `initApp()` helper called from it):

| # | Step | Why it's in this order |
|---|------|------------------------|
| 1 | Apply `.dark` to `<html>` | Before first paint — prevents flash of unstyled/light content. |
| 2 | Read `lastOpenedAt` from localStorage (for D-14 eviction banner trigger) | Must read BEFORE step 3 overwrites it — banner decision needs the previous value. |
| 3 | Write new `lastOpenedAt` = `Date.now()` to localStorage | Updates the "last seen" timestamp for next launch. |
| 4 | `await navigator.storage.persist()` | Pitfall #3 guard. Capture the returned boolean for display in Settings later. |
| 5 | Render React app (lazy-opens Dexie on first query via useLiveQuery) | Do NOT pre-open Dexie — let it open lazily so render is not blocked. |
| 6 | Register SW — handled automatically by `vite-plugin-pwa`'s `virtual:pwa-register` import | With `registerType: 'autoUpdate'` this is fire-and-forget. |

### Code skeleton (`src/main.tsx`)

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/index.css';

async function initApp(): Promise<void> {
  // 1. Theme
  document.documentElement.classList.add('dark');

  // 2-3. Eviction banner state (D-14): read previous, then overwrite.
  const LAST_OPENED_KEY = 'ht.lastOpenedAt';
  const prev = localStorage.getItem(LAST_OPENED_KEY);
  const prevOpenedAt = prev ? Number(prev) : null;
  localStorage.setItem(LAST_OPENED_KEY, String(Date.now()));
  // Expose prevOpenedAt to a React context or Zustand store for the banner to read.
  (window as any).__ht_prevOpenedAt = prevOpenedAt;

  // 4. Request persistent storage (SETUP-03 + Pitfall #3). Best-effort; do not block.
  let persisted = false;
  if (navigator.storage?.persist) {
    try { persisted = await navigator.storage.persist(); } catch { /* ignore */ }
  }
  (window as any).__ht_storagePersisted = persisted;

  // 5. Render — Dexie opens lazily on first useLiveQuery.
  createRoot(document.getElementById('root')!).render(
    <StrictMode><App /></StrictMode>
  );

  // 6. SW registration (autoUpdate — no user prompt).
  registerSW({ immediate: true });
}

// Dev-mode dayKey smoke check
if (import.meta.env.DEV) {
  import('./lib/dayKey').then(({ dateToKey }) => {
    const d = new Date(2026, 3, 19, 23, 30);
    console.assert(dateToKey(d) === '2026-04-19', 'dayKey regression');
  });
}

initApp();
```

### Install-mode detection (one-liner)

```typescript
// Use in the install-banner component to decide whether to show the banner (D-11).
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  // iOS Safari quirk — pre-iOS 17 exposes navigator.standalone, not display-mode
  (navigator as any).standalone === true;
```

### `beforeinstallprompt` (Android-only — reaffirm D-13)

`beforeinstallprompt` **does not fire on iOS Safari** — iOS installs are manual via the share sheet. Only wire the Android flow:

```typescript
// Somewhere at app top-level (useEffect in a provider).
let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});
// InstallBanner primary-button click handler:
//   if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
//   else { /* show iOS share-sheet instructions */ }
```

---

## Pitfall Cross-Reference

| Pitfall | Guard lives in | Verification for Phase 1 |
|---------|---------------|--------------------------|
| #1 IDB txn auto-commit | `db/db.ts` transaction pattern docs; code review for any `await fetch(...)` or non-Dexie awaits inside `db.transaction()` | None in Phase 1 (no transactions yet); document the convention in `db.ts` comment header |
| #2 Schema migration rules | Header comment in `db/db.ts`; append-only rule documented | No migration in Phase 1; rule must be documented for future phases |
| #3 iOS 7-day eviction | `main.tsx` → `navigator.storage.persist()` + D-11 install banner + D-14 eviction banner | Manually verify `persist()` is called on load; check Settings shows persistence status |
| #4 UTC midnight bug | `lib/dayKey.ts` (local getters only) | `console.assert` smoke in dev for 11:30pm UTC-5 case |
| #5 (CLAUDE.md) Photo resize pipeline — **now WebP@80% per D-07** | `lib/photoStore.ts:resizePhoto()` | Resize a 4000×3000 test image → blob < 200 KB; CLAUDE.md rule #5 updated JPEG→WebP |
| #5 (research) SW stuck-in-cache | `vite-plugin-pwa` `registerType: 'autoUpdate'` + `cleanupOutdatedCaches: true` | Deploy, reload, confirm new build hash shown in Settings |
| #8 Unresized photos | `lib/photoStore.ts:resizePhoto()` enforced at call site — never call `savePhoto` with a raw File | Storage-usage check after uploading N photos |

## Recommended Build Order

Plannable as 5 plans (the planner can further split or merge):

1. **Scaffold + tooling** — `npm create vite@latest` (React+TS), pin Vite to `^7`, install deps (react, react-dom@19, react-router-dom, dexie, dexie-react-hooks, tailwindcss@4, vite-plugin-pwa, shadcn/ui components: Button/Card/Sheet, lucide-react). Configure ESLint + Prettier (Claude's discretion).
2. **Design tokens + base styles** — Create `src/styles/tokens.css` + `src/styles/index.css` with `@theme` block. Import once in `main.tsx`. Apply `.dark` class.
3. **Data layer** — `src/db/schema.ts` (interfaces) + `src/db/db.ts` (HealthTrackerDB class with v1 stores + migration header comment). `src/lib/dayKey.ts` + dev-mode smoke check. `src/lib/photoStore.ts` (savePhoto, loadPhoto, deletePhoto, resizePhoto).
4. **App shell + routing** — `AppShell`/`Layout` with hash router (3 routes: `/#/today`, `/#/calendar`, `/#/settings`). Bottom tab bar + top header with safe-area insets. Today screen with 4 labeled placeholder sections (per D-05). Calendar + Settings stubs.
5. **PWA manifest + SW + startup + banners** — `vite.config.ts` VitePWA block, icon assets (192, 512, maskable 512, apple-touch-icon), `apple-touch-icon` link in `index.html`, `initApp()` sequence (persist + lastOpenedAt), Install banner (D-11/D-12/D-13), Eviction-warning banner (D-14), build-hash line in Settings (D-10). Update CLAUDE.md rule #5 (JPEG → WebP).

**Parallelism opportunities:** Plans 2, 3, and 4 can be developed concurrently after Plan 1 scaffolds exist — they share only the Vite project root. Plan 5 depends on Plans 2 + 4 being in place (it wires the banner UI into the shell and uses the tokens for styling).

## Open Questions

None. All Phase 1 decisions are locked in CONTEXT.md. Any ambiguities (EXIF orientation, Vitest vs console.assert, icon-asset creation) are explicitly flagged as Claude's discretion.

---

## Sources

### Primary (HIGH confidence)
- `.planning/research/ARCHITECTURE.md` — object store schema, dayKey algorithm, OPFS pattern, SW strategy (verified 2026-04-19)
- `.planning/research/PITFALLS.md` — all 11 pitfalls (verified 2026-04-19)
- `.planning/research/STACK.md` — version pins (React 19, Vite 7, Dexie 4.4, Tailwind 4.2, vite-plugin-pwa 1.2)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-01 through D-19 locked decisions
- `CLAUDE.md` — project-breaking rules, Vite 7 pin rationale
- Dexie v4 docs — `Version.stores()` syntax per ARCHITECTURE.md source list
- MDN — OPFS (`navigator.storage.getDirectory`), `navigator.storage.persist`
- vite-plugin-pwa docs — `registerType`, `workbox`, manifest schema

### Secondary (MEDIUM)
- Tailwind v4 `@theme` directive — v4 migration guide (2025)
- shadcn/ui Tailwind v4 compatibility — shadcn init CLI (late 2025)
- `createImageBitmap` `imageOrientation: 'from-image'` — MDN (broadly supported modern browsers)

### Notes on confidence
- **HIGH** on schema, dayKey, OPFS, startup ordering — all grounded in the project's own authoritative `.planning/research/` docs.
- **MEDIUM** on `generateSW` vs `injectManifest` recommendation — a judgment call; `injectManifest` also works. Rationale documented above so the planner can reverse this choice if it wants custom SW message handling.
- **MEDIUM** on Tailwind v4 `@theme` syntax — v4 is recent (2025 GA); syntax should be sanity-checked against live docs when scaffolding.

---

## RESEARCH COMPLETE

**Phase:** 1 — Foundation
**Confidence:** HIGH

### Key findings
- Schemas, dayKey, OPFS pattern, SW strategy all already locked in `.planning/research/ARCHITECTURE.md`; research focuses on concrete code skeletons the planner can hand directly to tasks.
- D-07's WebP@80% overrides both ARCHITECTURE.md (which said WebP but didn't specify quality) and CLAUDE.md rule #5 (which said JPEG@70%). CLAUDE.md needs updating in Phase 1.
- Recommend `generateSW` over `injectManifest` for Phase 1 (simpler; no custom SW logic needed given `autoUpdate` + no update banner).
- `apple-touch-icon` must be in `index.html` — vite-plugin-pwa does not inject it.
- Vitest is discretionary; `console.assert` in dev mode is sufficient for the single dayKey test.

### File created
`/Users/anirudhchatterjee/dev/healthtracker/.planning/phases/01-foundation/01-RESEARCH.md`

### Confidence assessment
| Area | Level | Reason |
|------|-------|--------|
| Dexie schema | HIGH | Verbatim from ARCHITECTURE.md §"Object Store Schema" |
| dayKey implementation | HIGH | Verbatim from ARCHITECTURE.md §"Day Key Format Decision" + edge-case table |
| OPFS pipeline | HIGH | Adapted from ARCHITECTURE.md with locked D-07 WebP@80% override |
| PWA config | MEDIUM | `generateSW` recommendation is a judgment call (reversible); manifest fields verified against MDN/W3C manifest spec |
| Tailwind v4 tokens | MEDIUM | Syntax is correct per v4 GA but worth sanity-checking against live docs at scaffold time |
| Startup invariants | HIGH | Ordering driven by pitfall requirements + D-14 read-before-write logic |

### Ready for planning
The planner can now carve Phase 1 into ~5 plans per the Recommended Build Order section. Every requirement SETUP-01..05 and DATA-01..05 has a concrete code skeleton or reference.
