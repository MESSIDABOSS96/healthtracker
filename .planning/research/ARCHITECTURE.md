# Architecture Research

**Domain:** Fully-local IndexedDB PWA — personal health tracker
**Researched:** 2026-04-19
**Confidence:** HIGH (IndexedDB/Dexie patterns well-established; OPFS comparison verified via MDN + web.dev)

---

## Standard Architecture

### System Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                         UI Layer (React)                           │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    PT    │  │   Food   │  │  Steps   │  │  Lifts   │          │
│  │  Feature │  │  Feature │  │  Feature │  │  Feature │          │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘          │
│       │              │              │              │               │
│  ┌────┴──────────────┴──────────────┴──────────────┴────────────┐ │
│  │          Calendar / Streak Feature (derived reads)            │ │
│  └────────────────────────────┬──────────────────────────────────┘ │
│                               │                                    │
│  ┌────────────────────────────┴──────────────────────────────────┐ │
│  │                  Settings / Export Feature                    │ │
│  └────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────┬────────────────────────────────────┘
                                │ useLiveQuery / liveQuery()
┌───────────────────────────────┴────────────────────────────────────┐
│                       Service Layer                                │
│                                                                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  pt.svc.ts │  │food.svc.ts │  │steps.svc.ts│  │lifts.svc.ts │  │
│  └────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          streak.svc.ts  (derived, reads other stores)        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │          export.svc.ts  (JSON dump / restore all stores)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬────────────────────────────────────┘
                                │ Dexie table APIs
┌───────────────────────────────┴────────────────────────────────────┐
│                    Database Layer (Dexie.js)                       │
│                                                                    │
│  db.ts — single Dexie instance, all version() declarations        │
│                                                                    │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │ ptTemplates  │  │  ptSessions   │  │     foods     │           │
│  └──────────────┘  └───────────────┘  └───────────────┘           │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │  mealEntries │  │  stepEntries  │  │ liftCheckins  │           │
│  └──────────────┘  └───────────────┘  └───────────────┘           │
│  ┌──────────────┐                                                  │
│  │    goals     │                                                  │
│  └──────────────┘                                                  │
└───────────────────────────────┬────────────────────────────────────┘
                                │
┌───────────────────────────────┴────────────────────────────────────┐
│               Service Worker (vite-plugin-pwa + Workbox)          │
│                                                                    │
│  Precache: app shell (HTML, JS, CSS, icons)                       │
│  Runtime: StaleWhileRevalidate for font CDN (if any)              │
│  Runtime: CacheOnly for user photos served from OPFS              │
└────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| Feature slice (PT / Food / Steps / Lifts) | UI forms, display, entry flows for that domain | React components + useLiveQuery hooks |
| Calendar / Streak feature | Derived read across all 4 domains for a date range; renders 4-segment indicators | Aggregating liveQuery; reads ptSessions, mealEntries, stepEntries, liftCheckins |
| Settings / Export feature | Goals config CRUD; JSON export/import trigger; backup UX | Goals service + export.svc.ts |
| `*.svc.ts` service modules | Typed wrappers around Dexie table calls; query logic isolated from UI | Plain TS functions, no React |
| `db.ts` | Single Dexie instance; all schema versions declared here | Dexie class instantiation |
| Service worker | Offline app shell delivery; photo cache | workbox-precaching + workbox-routing |

---

## Object Store Schema

All stores use Dexie.js syntax. Primary key is listed first, then indexes in the `stores()` string.

### `ptTemplates`

Reusable exercise definitions. Rarely written, frequently read during session logging.

```typescript
interface PTTemplate {
  id: string;              // uuid, manual primary key
  name: string;            // e.g. "Wrist Flexor Stretch"
  targetSets: number;
  targetReps: number;
  targetDurationSecs?: number;
  notes?: string;
  createdAt: number;       // Unix ms — for ordering in library list
}
```

Dexie declaration:
```
ptTemplates: 'id, name, createdAt'
```

Indexes: `name` (for library search/sort), `createdAt` (newest-first list).

---

### `ptSessions`

One record per logged PT session. A session references one template and records actuals.

```typescript
interface PTSession {
  id: string;              // uuid
  dayKey: string;          // 'YYYY-MM-DD' local date
  templateId: string;      // FK → ptTemplates.id
  templateName: string;    // denormalized — survives template rename/delete
  actualSets: number;
  actualReps: number;
  actualDurationSecs?: number;
  notes?: string;
  loggedAt: number;        // Unix ms, for ordering within a day
}
```

Dexie declaration:
```
ptSessions: 'id, dayKey, templateId, loggedAt'
```

Indexes: `dayKey` (primary query: "what PT did I do today?"), `templateId` (history for a template), `loggedAt` (ordering).

---

### `foods`

User-built food library. Written infrequently (add once, reuse many times).

```typescript
interface Food {
  id: string;              // uuid
  name: string;
  brand?: string;
  servingLabel: string;    // e.g. "1 cup", "100g"
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoKey?: string;       // OPFS filename, e.g. "food-<uuid>.webp" — null if no photo
  createdAt: number;
}
```

Dexie declaration:
```
foods: 'id, name, createdAt'
```

Indexes: `name` (recall search — prefix match via `.where('name').startsWith(query)`), `createdAt` (newest-first default sort).

Note: Do NOT index `photoKey`. It is looked up only when rendering a specific food detail — no filtering on it.

---

### `mealEntries`

One record per food-in-meal log event. Multiple entries can share a `dayKey`.

```typescript
interface MealEntry {
  id: string;              // uuid
  dayKey: string;          // 'YYYY-MM-DD'
  foodId: string;          // FK → foods.id
  foodName: string;        // denormalized snapshot
  servings: number;
  caloriesTotal: number;   // pre-computed: caloriesPerServing * servings
  proteinGTotal: number;
  carbsGTotal: number;
  fatGTotal: number;
  mealLabel?: string;      // 'breakfast' | 'lunch' | 'dinner' | 'snack' — optional
  loggedAt: number;        // Unix ms
}
```

Dexie declaration:
```
mealEntries: 'id, dayKey, foodId, loggedAt'
```

Indexes: `dayKey` (primary query: all meals for today), `foodId` (how often have I logged this food?), `loggedAt` (ordering within day).

Denormalize macro totals into each entry. Summing for a day is then a simple reduce over an already-fetched array — no join needed.

---

### `stepEntries`

One record per calendar day. Keyed by `dayKey` directly (natural primary key — only one step count per day).

```typescript
interface StepEntry {
  dayKey: string;          // 'YYYY-MM-DD' — IS the primary key
  count: number;
  updatedAt: number;       // Unix ms — for export ordering
}
```

Dexie declaration:
```
stepEntries: 'dayKey'
```

No secondary indexes needed. Queries are always exact-match by `dayKey` or a range `between('2026-01-01', '2026-04-30')`.

---

### `liftCheckins`

One record per calendar day. Same natural-key pattern as stepEntries.

```typescript
interface LiftCheckin {
  dayKey: string;          // 'YYYY-MM-DD' — IS the primary key
  didLift: boolean;
  note?: string;
  updatedAt: number;       // Unix ms
}
```

Dexie declaration:
```
liftCheckins: 'dayKey'
```

No secondary indexes needed. Boolean `didLift` is never queried as an index (IDB cannot index booleans efficiently, and full table scan over a year of data is < 400 records).

---

### `goals`

Single-record "table" — the user's current daily targets. Store as a single document with a well-known key.

```typescript
interface Goals {
  id: 'singleton';         // literal string — only one record ever
  caloriesTarget: number;
  proteinGTarget: number;
  carbsGTarget: number;
  fatGTarget: number;
  stepsTarget: number;
  updatedAt: number;
}
```

Dexie declaration:
```
goals: 'id'
```

No indexes. `db.goals.get('singleton')` is the only query.

---

## Day Key Format Decision

**Decision: Store all day keys as `'YYYY-MM-DD'` strings in the user's local time zone.**

Rationale:

- This app is single-user, single-device, single timezone. There is no server reconciling records across time zones.
- All logging events ("log today's lunch", "did I complete my PT today?") are conceptually anchored to the user's local calendar day, not UTC.
- Using `new Date().toISOString().split('T')[0]` produces a UTC date, which will produce the wrong day key for users west of UTC after 7pm local time. This is the single most common timezone bug in health trackers.
- The correct approach: construct the key from local getters.

```typescript
// lib/dayKey.ts — single source of truth for day key construction

export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function keyToDate(key: string): Date {
  // Parse as local — NOT new Date(key) which parses as UTC midnight
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

`YYYY-MM-DD` strings sort lexicographically in the same order as chronologically. This means IDB range queries like `IDBKeyRange.bound('2026-01-01', '2026-04-30')` work correctly on `dayKey` primary keys without any index or date conversion.

**Never use `new Date(isoString).toISOString().split('T')[0]`** for generating a day key — this produces UTC dates.

---

## Component / Module Boundaries

### Feature Slice Structure

Each feature is a self-contained directory. Features do not import from each other's directories. All cross-cutting concerns go through shared services or the db layer.

```
src/
├── db/
│   ├── db.ts                  # Single Dexie instance; all version() declarations
│   ├── schema.ts              # TypeScript interfaces for all records
│   └── migrations.ts          # Upgrade function implementations (imported by db.ts)
│
├── lib/
│   ├── dayKey.ts              # todayKey(), dateToKey(), keyToDate()
│   ├── photoStore.ts          # OPFS read/write helpers
│   └── exportImport.ts        # JSON dump + restore logic
│
├── services/
│   ├── pt.svc.ts              # PT queries and mutations
│   ├── food.svc.ts            # Food library CRUD
│   ├── meals.svc.ts           # Meal log CRUD + daily macro aggregation
│   ├── steps.svc.ts           # Step entry upsert + query
│   ├── lifts.svc.ts           # Lift checkin upsert + query
│   ├── goals.svc.ts           # Goals singleton get/set
│   └── streak.svc.ts          # Derives 4-segment completion per day/range
│
├── features/
│   ├── pt/                    # PT template management + session logging UI
│   │   ├── PTTemplateList.tsx
│   │   ├── PTTemplateForm.tsx
│   │   ├── PTSessionLog.tsx
│   │   └── hooks.ts           # useLiveQuery wrappers for PT
│   │
│   ├── food/                  # Food library UI + meal log
│   │   ├── FoodLibrary.tsx
│   │   ├── FoodForm.tsx
│   │   ├── MealLog.tsx
│   │   ├── DailyMacroBar.tsx
│   │   └── hooks.ts
│   │
│   ├── steps/
│   │   ├── StepEntry.tsx
│   │   └── hooks.ts
│   │
│   ├── lifts/
│   │   ├── LiftCheckin.tsx
│   │   └── hooks.ts
│   │
│   ├── calendar/              # Streak calendar — reads streak.svc.ts
│   │   ├── StreakCalendar.tsx
│   │   ├── DayCell.tsx        # 4-segment indicator component
│   │   └── hooks.ts
│   │
│   └── settings/
│       ├── GoalsForm.tsx
│       ├── ExportImport.tsx
│       └── hooks.ts
│
├── components/                # Pure, shared UI primitives
│   ├── MacroBar.tsx
│   ├── ProgressRing.tsx
│   └── ...
│
├── sw.ts                      # Custom service worker (injectManifest strategy)
├── App.tsx
└── main.tsx
```

### What Talks to What

| Consumer | Allowed To Import | Not Allowed |
|----------|------------------|-------------|
| Feature component (`features/pt/`) | `services/pt.svc.ts`, `lib/*`, `components/*`, own `hooks.ts` | Other features' internals |
| Feature `hooks.ts` | Its feature's `*.svc.ts` | `db.ts` directly |
| `*.svc.ts` | `db.ts`, `lib/dayKey.ts` | React hooks, feature components |
| `streak.svc.ts` | `db.ts` (all stores) | Feature components |
| `export.svc.ts` | `db.ts` (all stores), `lib/photoStore.ts` | Feature components |
| `db.ts` | `schema.ts`, `migrations.ts` | Anything outside `db/` |

This enforces a strict dependency direction: UI → services → db. No circular dependencies.

---

## State Management Pattern

**Recommendation: Dexie `liveQuery()` as the reactive layer. No separate global state store (no Zustand, Redux, Jotai).**

Rationale: For a fully-local app where the database IS the source of truth, `liveQuery()` eliminates the need for a separate in-memory state layer. Components subscribe directly to queries; writes automatically invalidate and re-run relevant queries.

```typescript
// Example: DailyMacroBar using liveQuery
import { useLiveQuery } from 'dexie-react-hooks';
import { getMealEntriesForDay } from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function DailyMacroBar() {
  const entries = useLiveQuery(
    () => getMealEntriesForDay(todayKey()),
    []
  );

  if (!entries) return <Skeleton />;

  const totalCals = entries.reduce((sum, e) => sum + e.caloriesTotal, 0);
  // ...
}
```

```typescript
// meals.svc.ts
import { db } from '@/db/db';

export function getMealEntriesForDay(dayKey: string) {
  return db.mealEntries.where('dayKey').equals(dayKey).toArray();
}
```

**Pattern for the streak calendar** (month range query):

```typescript
// streak.svc.ts
export async function getStreakDataForRange(startKey: string, endKey: string) {
  const [sessions, meals, steps, lifts] = await Promise.all([
    db.ptSessions.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.stepEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.liftCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);
  // Aggregate into Map<dayKey, {pt: boolean, food: boolean, steps: boolean, lifts: boolean}>
}
```

`liveQuery` wrapping this will re-run whenever any of the four tables changes — which is exactly the desired behavior.

**Local UI state** (form values, modal open/close, search query strings) lives in `useState` / `useReducer` as normal React state. It never touches Dexie.

---

## Schema Versioning Strategy

**Start at version 1. Increment the version number for every schema change. Never mutate a past version declaration.**

```typescript
// db/db.ts
import Dexie, { type Table } from 'dexie';
import type { PTTemplate, PTSession, Food, MealEntry, StepEntry, LiftCheckin, Goals } from './schema';

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

    // Version 1 — initial schema
    this.version(1).stores({
      ptTemplates:  'id, name, createdAt',
      ptSessions:   'id, dayKey, templateId, loggedAt',
      foods:        'id, name, createdAt',
      mealEntries:  'id, dayKey, foodId, loggedAt',
      stepEntries:  'dayKey',
      liftCheckins: 'dayKey',
      goals:        'id',
    });

    // Future versions follow:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}

export const db = new HealthTrackerDB();
```

**Rules for future migrations:**

1. Add a new `this.version(N)` block. Only specify the stores that changed (Dexie merges unchanged stores automatically in v3+).
2. If data transformation is needed (rename a field, split a column), attach `.upgrade(tx => ...)`.
3. If only an index is added (no data change), no `.upgrade()` is needed.
4. Never delete a version block that has shipped. Removing a version number breaks upgrade paths for users on older data.

**Export format also carries a `schemaVersion`** (see Export/Import section) so that import-time validation can detect when a backup file was created against an older schema.

---

## Photo / Blob Storage

**Decision: Store food photos in OPFS (Origin Private File System), not as Blobs embedded in IndexedDB.**

### Why Not Blob-in-IDB

- IDB is optimized for structured data. Large blobs stored directly in IDB can cause serialization overhead and inflate the IDB store size, degrading query performance for surrounding records.
- Dexie's own documentation explicitly warns: "Never index properties containing images, movies or large (huge) strings."
- Reading a Blob from IDB requires a full record deserialize even when only the structured fields are needed.

### Why OPFS

- OPFS is purpose-built for file storage. Browser support is universal across modern browsers (Chrome, Firefox, Safari, Edge since early 2023).
- OPFS files are part of origin storage quota — same quota bucket as IDB, so no quota advantage. But the API is optimized for binary I/O.
- OPFS files are NOT visible to users (origin-private). They are not in the user's Downloads or photo library.
- Performance: OPFS synchronous access (via `createSyncAccessHandle`) is up to 2x faster than IndexedDB for binary writes.
- For an installed PWA on iOS/Android, the seven-day eviction policy that Safari applies to non-installed origin storage does NOT apply — installed PWAs get persistent quota treatment.

### Photo Storage Implementation

```typescript
// lib/photoStore.ts

const PHOTO_DIR = 'food-photos';

async function getDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(PHOTO_DIR, { create: true });
}

export async function savePhoto(file: File): Promise<string> {
  const key = `food-${crypto.randomUUID()}.webp`;
  const dir = await getDir();
  const fh = await dir.getFileHandle(key, { create: true });
  const writable = await fh.createWritable();
  // Optionally resize/compress before write
  await writable.write(file);
  await writable.close();
  return key; // stored as foods.photoKey
}

export async function getPhotoUrl(key: string): Promise<string> {
  const dir = await getDir();
  const fh = await dir.getFileHandle(key);
  const file = await fh.getFile();
  return URL.createObjectURL(file); // caller must revoke
}

export async function deletePhoto(key: string): Promise<void> {
  const dir = await getDir();
  await dir.removeEntry(key);
}
```

The `foods.photoKey` field holds only the OPFS filename. Object URLs are created on demand and revoked after use. Photos are included in JSON export as base64 data URIs so backups are self-contained.

---

## Export / Import JSON Format

**All data exports to a single JSON file. Format is versioned from day 1.**

### Export Envelope

```typescript
interface ExportEnvelope {
  schemaVersion: number;      // IDB schema version at export time (db.verno)
  exportedAt: string;         // ISO 8601 UTC timestamp
  appVersion: string;         // semver string from package.json (import.meta.env.VITE_APP_VERSION)
  data: {
    ptTemplates: PTTemplate[];
    ptSessions: PTSession[];
    foods: Food[];
    mealEntries: MealEntry[];
    stepEntries: StepEntry[];
    liftCheckins: LiftCheckin[];
    goals: Goals[];
  };
  photos: Record<string, string>; // { [photoKey]: 'data:image/webp;base64,...' }
}
```

Example envelope header:
```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-19T14:30:00.000Z",
  "appVersion": "1.0.0",
  "data": { ... },
  "photos": { "food-abc123.webp": "data:image/webp;base64,..." }
}
```

### Export Procedure

```typescript
// lib/exportImport.ts
export async function exportAll(): Promise<string> {
  const [ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals] =
    await Promise.all([
      db.ptTemplates.toArray(),
      db.ptSessions.toArray(),
      db.foods.toArray(),
      db.mealEntries.toArray(),
      db.stepEntries.toArray(),
      db.liftCheckins.toArray(),
      db.goals.toArray(),
    ]);

  const photos: Record<string, string> = {};
  for (const food of foods) {
    if (food.photoKey) {
      const url = await getPhotoUrl(food.photoKey);
      const resp = await fetch(url);
      const blob = await resp.blob();
      photos[food.photoKey] = await blobToBase64(blob);
      URL.revokeObjectURL(url);
    }
  }

  const envelope: ExportEnvelope = {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    appVersion: import.meta.env.VITE_APP_VERSION,
    data: { ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals },
    photos,
  };

  return JSON.stringify(envelope, null, 2);
}
```

### Import / Restore Procedure

Import is destructive-replace (not merge). The user confirms before wiping existing data.

```typescript
export async function importAll(json: string): Promise<void> {
  const envelope: ExportEnvelope = JSON.parse(json);

  if (typeof envelope.schemaVersion !== 'number') {
    throw new Error('Invalid export file: missing schemaVersion');
  }
  if (envelope.schemaVersion > db.verno) {
    throw new Error(
      `Export was created with a newer app version (schema ${envelope.schemaVersion}). ` +
      `Update the app before importing.`
    );
  }

  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(t => t.clear()));
    await db.ptTemplates.bulkPut(envelope.data.ptTemplates);
    await db.ptSessions.bulkPut(envelope.data.ptSessions);
    await db.foods.bulkPut(envelope.data.foods);
    await db.mealEntries.bulkPut(envelope.data.mealEntries);
    await db.stepEntries.bulkPut(envelope.data.stepEntries);
    await db.liftCheckins.bulkPut(envelope.data.liftCheckins);
    await db.goals.bulkPut(envelope.data.goals);
  });

  // Restore photos to OPFS
  for (const [key, dataUri] of Object.entries(envelope.photos)) {
    const blob = await dataUriToBlob(dataUri);
    await savePhotoBlob(blob, key); // variant that accepts a specific key
  }
}
```

---

## Service Worker / Offline Strategy

**Tool: vite-plugin-pwa with `injectManifest` strategy (custom service worker file).**

### Why `injectManifest` Over `generateSW`

`generateSW` auto-generates the service worker but gives no control over runtime caching rules. `injectManifest` lets you write `sw.ts` directly while still auto-injecting the Vite-hashed precache manifest via `self.__WB_MANIFEST`.

### Caching Strategies

| Resource Type | Strategy | Rationale |
|--------------|----------|-----------|
| App shell (HTML, JS, CSS, icons, fonts bundled) | Precache + CacheFirst | Always offline. Build hash ensures freshness. |
| Web manifest (`manifest.webmanifest`) | Precache | Required for installability. |
| User photos from OPFS | Not cached by SW — served via `createObjectURL` in-process | OPFS files are accessed directly in the main thread; SW does not intercept them. |
| Google Fonts / external CDN (if used) | StaleWhileRevalidate | Show cached, update in background. |

### Service Worker File (`src/sw.ts`)

```typescript
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute, createHandlerBoundToURL } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

// Injected by vite-plugin-pwa at build time
declare let self: ServiceWorkerGlobalScope;
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback — serve index.html for all nav requests
const handler = createHandlerBoundToURL('/index.html');
const navRoute = new NavigationRoute(handler);
registerRoute(navRoute);

// Optional: cache any external fonts
registerRoute(
  ({ url }) => url.hostname === 'fonts.gstatic.com',
  new StaleWhileRevalidate({ cacheName: 'google-fonts-webfonts' })
);
```

### vite.config.ts (relevant section)

```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  registerType: 'autoUpdate',
  manifest: {
    name: 'HealthTracker',
    short_name: 'HealthTracker',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    display: 'standalone',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
})
```

`registerType: 'autoUpdate'` means new service workers activate immediately after a page reload (suitable for a solo personal app where update-conflicts are not a concern).

---

## Architectural Patterns

### Pattern 1: Service-Layer Encapsulation of Dexie Queries

**What:** All Dexie queries live in `services/*.svc.ts`. Feature components never call `db.table.where(...)` directly.

**When to use:** Always — this is the foundational rule.

**Why:** Keeps query logic testable in isolation. When a query needs to change (e.g., add a filter), there is exactly one place to update it. Components remain decoupled from the database schema.

```typescript
// GOOD — in meals.svc.ts
export const getDailyMacros = (dayKey: string) =>
  db.mealEntries.where('dayKey').equals(dayKey).toArray();

// GOOD — in component
const entries = useLiveQuery(() => getDailyMacros(todayKey()), []);

// BAD — in component
const entries = useLiveQuery(() => db.mealEntries.where('dayKey').equals(todayKey()).toArray(), []);
```

### Pattern 2: Denormalize Computed Totals into Log Entries

**What:** Store pre-computed totals (`caloriesTotal`, `proteinGTotal`, etc.) in `mealEntries` at write time, derived from the food record and serving count.

**When to use:** Any time an aggregate is frequently read and the source data is immutable at read time.

**Why:** Avoids runtime joins. "Daily macro total" is a reduce over the day's entries — no need to fetch every referenced `Food` record. Survives food library edits (the log is a historical snapshot, not a live view).

### Pattern 3: Natural Key for Single-Per-Day Stores

**What:** Use `dayKey` as the primary key for `stepEntries` and `liftCheckins`.

**Why:** These stores hold at most one record per day by definition. A UUID primary key would add complexity with no benefit. `db.stepEntries.put({ dayKey: '2026-04-19', count: 8500 })` is an upsert — it creates or replaces the entry for that day.

---

## Anti-Patterns

### Anti-Pattern 1: Using UTC Date Strings as Day Keys

**What people do:** `new Date().toISOString().split('T')[0]` to get today's date.

**Why it's wrong:** This returns the UTC date. After 7pm for a UTC-5 user (midnight UTC), "today" in UTC is tomorrow in local time. A user logging their midnight snack gets it attributed to the wrong day.

**Do this instead:** Use `lib/dayKey.ts:todayKey()` which uses local date getters (`getFullYear()`, `getMonth()`, `getDate()`).

### Anti-Pattern 2: Storing Blobs Inline in IDB Records

**What people do:** `{ ...foodRecord, photoBlob: <ArrayBuffer> }` directly in the `foods` store.

**Why it's wrong:** Inflates IDB store size. Every query that fetches a food record deserializes the entire blob even if only the name and macros are needed. IDB is not optimized for this access pattern.

**Do this instead:** Store only `photoKey: string` in the food record. Retrieve the blob from OPFS via `getPhotoUrl(food.photoKey)` only when rendering the food detail view.

### Anti-Pattern 3: Deriving Streak State in Every Component

**What people do:** Each calendar cell independently queries ptSessions, mealEntries, stepEntries, liftCheckins, and derives its completion state.

**Why it's wrong:** N calendar cells × 4 async queries = 4N parallel IDB reads per render. For a 30-day month view, that is 120 queries.

**Do this instead:** `streak.svc.ts` issues 4 range queries for the full visible date range and returns a keyed map. The `liveQuery` wrapping it fires once and computes all cells from the in-memory result.

### Anti-Pattern 4: One Dexie Instance Per Feature

**What people do:** Create separate `new Dexie('PTDatabase')`, `new Dexie('FoodDatabase')`, etc.

**Why it's wrong:** Cross-store transactions (e.g., import/restore) become impossible. IDB transactions cannot span databases. The streak query needs to read 4 stores atomically.

**Do this instead:** Single `HealthTrackerDB` instance in `db/db.ts`, all stores declared together.

---

## Build Order (Module Dependencies)

The natural dependency graph determines implementation order:

```
Phase 1 — Foundation (no dependencies)
  db/db.ts + schema.ts          ← everything depends on this
  lib/dayKey.ts                 ← everything depends on this
  lib/photoStore.ts             ← foods depends on this

Phase 2 — Foundational feature modules (depend only on db)
  services/goals.svc.ts         ← standalone, no cross-store reads
  features/settings/GoalsForm   ← depends on goals.svc.ts
  services/food.svc.ts          ← standalone food library
  features/food/FoodLibrary     ← depends on food.svc.ts + photoStore

Phase 3 — Daily tracking (depend on foods)
  services/meals.svc.ts         ← references foods store
  features/food/MealLog         ← depends on meals.svc.ts
  services/steps.svc.ts         ← standalone
  features/steps/StepEntry      ← depends on steps.svc.ts
  services/lifts.svc.ts         ← standalone
  features/lifts/LiftCheckin    ← depends on lifts.svc.ts

Phase 4 — PT (self-contained but separate domain)
  services/pt.svc.ts
  features/pt/*

Phase 5 — Calendar / Streak (depends on all 4 daily tracking stores)
  services/streak.svc.ts        ← reads ptSessions, mealEntries, stepEntries, liftCheckins
  features/calendar/*

Phase 6 — Export / Import (depends on all stores + photoStore)
  lib/exportImport.ts
  features/settings/ExportImport

Phase 7 — PWA shell (can be configured early but validated last)
  src/sw.ts + vite-plugin-pwa config
  manifest icons
```

**Goals and the food library should be built first** because the meal log depends on the food library and the streak calendar depends on everything. The calendar is the last UI feature to build.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|--------------|-------|
| Feature ↔ Service | Direct function call | Services are pure TS; no React coupling |
| Service ↔ Dexie | Dexie Table API | All behind service layer |
| liveQuery ↔ React | `useLiveQuery` hook (dexie-react-hooks) | Returns `undefined` while loading — components must handle |
| OPFS ↔ Main thread | Async File System API | SW does not intercept OPFS; main thread only |
| Export ↔ File system | `showSaveFilePicker` (File System Access API) with `<a download>` fallback | File System Access API not available on iOS; detect and fall back |

### External Services

None. This is intentional. The app has no network dependencies at runtime. All data is local.

---

## Scaling Considerations

This is a single-user personal app. Traditional "scaling" concerns (multi-user, server load) do not apply. The relevant constraints are device storage and IDB performance ceilings.

| Data Volume | Behavior | Notes |
|-------------|----------|-------|
| ~1 year of daily logging | Trivial | ~365 step entries, ~365 lift checkins, ~1500 meal entries, ~200 PT sessions |
| ~5 years | Still fine | IDB handles millions of records; this app will never approach that |
| Photo library (100 food photos, ~200KB each) | ~20MB OPFS | Well within quota on any device |
| Export JSON file size | ~2MB without photos, ~20MB with photos | Fine for manual backup; no streaming needed |

The only realistic performance concern is the streak calendar query on slow mobile devices with several years of data. Mitigate by memoizing the range query result and only re-fetching when the visible month changes.

---

## Sources

- [Dexie.js — Version.stores() documentation](https://dexie.org/docs/Version/Version.stores())
- [Dexie.js — Compound Index](https://dexie.org/docs/Compound-Index)
- [Dexie.js — Database Versioning (Tutorial)](https://dexie.org/docs/Tutorial/Design#database-versioning)
- [Dexie.js — useLiveQuery()](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- [MDN — Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [MDN — Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [web.dev — Storage for the web](https://web.dev/articles/storage-for-the-web)
- [RxDB — LocalStorage vs IndexedDB vs OPFS comparison](https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html)
- [Vite PWA — injectManifest strategy](https://vite-pwa-org.netlify.app/guide/inject-manifest)
- [Vite PWA — Service worker precache](https://vite-pwa-org.netlify.app/guide/service-worker-precache)
- [IndexedDB — A Comprehensive Guide to Indexes (Medium)](https://medium.com/@kamresh485/a-comprehensive-guide-to-indexeddb-indexes-enhancing-data-retrieval-in-web-applications-8755957c0cbe)
- [The PWA Data Trap (Medium — backup/restore patterns)](https://scottkuhl.medium.com/the-pwa-data-trap-5bd94d546348)

---
*Architecture research for: HealthTracker — fully-local IndexedDB PWA*
*Researched: 2026-04-19*
