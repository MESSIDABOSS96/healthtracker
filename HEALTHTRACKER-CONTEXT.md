# HealthTracker — Full Project Context

> Self-contained brief for handing to a fresh AI agent (e.g. Claude.ai) to recreate or design this application. Combines the contents of `.planning/PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, and the `research/` set (`SUMMARY.md`, `STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md`, `FEATURES.md`).

---

## 1. What This Is (One Paragraph)

A fully-local, offline-first **Progressive Web App** for one user (the developer himself) to track four daily health areas:

1. **PT exercises** — rehab for knee tendonitis & tennis elbow
2. **Food / macros** — active calorie cut (calories, protein, carbs, fat)
3. **Manual step count**
4. **Lightweight daily lift check-in** (yes/no + optional note — full lift tracking lives elsewhere)

The product's central feature — and the only one that *must* succeed — is a **calendar streak loop**. Every day is rendered as a 4-segment cell (one quadrant per area) that fills as each area is logged. Whole-day "complete" cells appear only when all four areas are logged. No backend, no auth, no cloud sync, single device.

## 2. Core Value (Non-Negotiable)

**Visual consistency feedback that makes logging feel like a win.**

If the streak loop motivates daily return, the app has succeeded — even if every other feature is rough. Every UX tradeoff biases toward:

1. **Low-friction entry** — every interaction must be fast on phone
2. **Satisfying visual feedback** — partial fills read as positive progress, never failure

## 3. User & Motivation Context

- Experienced lifter (years of training); recently developed knee tendonitis + tennis elbow → prescribed PT
- Simultaneously cutting (calorie deficit), needs macro tracking
- Has tried existing free trackers and found them unengaging
- Reports that visual calendar streaks on his lift-tracking platform meaningfully drive consistency — this is the pattern being replicated
- Used primarily on phone (mid-day meal log, post-PT log), occasionally on laptop
- Philosophy: *"Functionality tool for me"* — ship fast, iterate from real use, not upfront polish
- Prefers dark mode, minimal/calm visual aesthetic, low cognitive load

---

## 4. Locked Tech Stack

```
React 19.2 + Vite 7 + TypeScript
  └── PWA:       vite-plugin-pwa 1.2 (Workbox precaching, manifest, generateSW + autoUpdate)
  └── Storage:   Dexie 4.4 + dexie-react-hooks (useLiveQuery)
  └── Styling:   Tailwind CSS 4.2 + shadcn/ui
  └── Charts:    Recharts 3.8 (macro progress bars, future trend lines)
  └── Calendar:  react-activity-calendar 3.1 (renderBlock = custom DayCell)
  └── Forms:     React Hook Form 7.7 + Zod 3.25 (via @hookform/resolvers/zod)
  └── UI State:  Zustand 5 (ephemeral only — never persisted data)
```

### Why these (verified April 2026)

| Choice | Rationale |
|---|---|
| **React 19 + Vite 7** | Largest ecosystem; React 19 compiler (auto-memo); Vite 7 (not 8) avoids `vite-plugin-pwa` peer-dep gap (issue #918) |
| **TypeScript** | Dexie's `EntityTable<T,PK>` gives full schema type inference; Zod schemas double as TS types |
| **Dexie 4** | `useLiveQuery` makes IndexedDB reactive; eliminates separate sync layer; `EntityTable` typed |
| **Tailwind v4** | CSS-native variables, `@tailwindcss/vite` plugin, `@custom-variant dark (&:where(.dark, .dark *))` for dark mode toggle |
| **shadcn/ui** | Components are **copied into your source** — zero runtime, fully offline |
| **react-activity-calendar** | Purpose-built GitHub-contribution-graph; custom `renderBlock` prop for the 4-segment `DayCell` |
| **RHF + Zod** | Uncontrolled inputs = zero re-renders on keystroke; one schema → TS type + runtime validation |
| **Zustand** | Only for transient UI state (selected date, modal flags, active tab) — never data |

### Do **NOT** use

| Avoid | Why |
|---|---|
| Next.js / SSR | Adds zero value for a fully-local app; complicates SW lifecycle |
| Create React App | Unmaintained since 2023; Webpack-based; slower |
| Redux / Redux Toolkit | Massive boilerplate; Dexie + Zustand covers all needs |
| Firebase / Supabase | Require network; conflict with offline-only |
| Mantine / Chakra UI | CSS-in-JS runtime fights Tailwind's class utilities |
| RxDB | Replication features explicitly not needed; heavy |
| React Context for data | Causes subtree re-renders that `useLiveQuery` already avoids |
| Victory charts | More complex API than Recharts, no advantage here |
| `react-calendar-heatmap` | Less maintained, no dark mode |
| Push notifications (MVP) | #1 abandonment trigger in fitness apps |

### Install snippet

```bash
npm create vite@latest healthtracker -- --template react-ts
cd healthtracker
npm i -D vite-plugin-pwa workbox-precaching workbox-routing
npm i -D tailwindcss @tailwindcss/vite
npm i class-variance-authority clsx tailwind-merge
npx shadcn@latest init
npm i dexie dexie-react-hooks
npm i react-hook-form zod @hookform/resolvers
npm i zustand
npm i recharts react-activity-calendar
```

---

## 5. Architecture

### System Layers (UI → services → db; strict, no circular deps)

```
┌────────────────────────────────────────────────────────────────────┐
│                         UI Layer (React)                           │
│  PT  •  Food  •  Steps  •  Lifts                                   │
│  Calendar / Streak (derived reads across all 4)                    │
│  Settings / Export                                                 │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ useLiveQuery / liveQuery()
┌──────────────────────────┴─────────────────────────────────────────┐
│                       Service Layer                                │
│  pt.svc.ts • food.svc.ts • meals.svc.ts • steps.svc.ts             │
│  lifts.svc.ts • goals.svc.ts                                       │
│  streak.svc.ts (derived, reads all 4 daily stores)                 │
│  exportImport.ts (JSON dump/restore all stores)                    │
└──────────────────────────┬─────────────────────────────────────────┘
                           │ Dexie Table API
┌──────────────────────────┴─────────────────────────────────────────┐
│              Database Layer (single Dexie instance, db.ts)         │
│  ptTemplates • ptSessions • foods • mealEntries                    │
│  stepEntries • liftCheckins • goals                                │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
┌──────────────────────────┴─────────────────────────────────────────┐
│              Service Worker (vite-plugin-pwa + Workbox)            │
│  Precache: app shell (HTML/JS/CSS/icons)                           │
│  SPA navigation fallback → index.html                              │
└────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
src/
├── db/
│   ├── db.ts            # Single Dexie instance; all version() declarations
│   ├── schema.ts        # TypeScript interfaces for all 7 stores
│   └── migrations.ts    # Upgrade fns (imported by db.ts)
├── lib/
│   ├── dayKey.ts        # todayKey(), dateToKey(), keyToDate() — LOCAL date only
│   ├── photoStore.ts    # OPFS read/write/delete + WebP@80% resize ≤800×800
│   └── exportImport.ts  # JSON envelope dump + restore
├── services/
│   ├── pt.svc.ts
│   ├── food.svc.ts
│   ├── meals.svc.ts
│   ├── steps.svc.ts
│   ├── lifts.svc.ts
│   ├── goals.svc.ts
│   └── streak.svc.ts    # ONE Promise.all over 4 range queries (NOT 4N)
├── features/
│   ├── pt/      (PTTemplateList, PTTemplateForm, PTSessionLog, hooks.ts)
│   ├── food/    (FoodLibrary, FoodForm, MealLog, DailyMacroBar, hooks.ts)
│   ├── steps/   (StepEntry, hooks.ts)
│   ├── lifts/   (LiftCheckin, hooks.ts)
│   ├── calendar/ (StreakCalendar, MonthGrid, MonthHeader, WeekdayHeader,
│   │              DayCell, StreakCount, hooks.ts)
│   └── settings/ (GoalsForm, ExportCard, hooks.ts)
├── components/  # shared primitives (MacroBar, ProgressBar, Sheet, ConfirmDialog, ...)
├── sw.ts        # custom service worker (or generateSW config)
├── App.tsx
└── main.tsx
```

### Import rules (enforced by convention)

| Consumer | May import | Must NOT import |
|---|---|---|
| Feature component | own `services/*.svc.ts`, `lib/*`, `components/*`, own `hooks.ts` | other features' internals |
| Feature `hooks.ts` | its feature's `*.svc.ts` | `db.ts` directly |
| `*.svc.ts` | `db.ts`, `lib/dayKey.ts` | React, feature components |
| `streak.svc.ts` | `db.ts` (all stores) | feature components |
| `exportImport.ts` | `db.ts`, `lib/photoStore.ts` | feature components |

---

## 6. Data Model — 7 Object Stores (Dexie v1)

```typescript
// db/db.ts
import Dexie, { type Table } from 'dexie';
import type { PTTemplate, PTSession, Food, MealEntry, StepEntry, LiftCheckin, Goals } from './schema';

export class HealthTrackerDB extends Dexie {
  ptTemplates!:  Table<PTTemplate,  string>;
  ptSessions!:   Table<PTSession,   string>;
  foods!:        Table<Food,        string>;
  mealEntries!:  Table<MealEntry,   string>;
  stepEntries!:  Table<StepEntry,   string>;  // PK = dayKey
  liftCheckins!: Table<LiftCheckin, string>;  // PK = dayKey
  goals!:        Table<Goals,       string>;  // singleton

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
    // Future migrations: this.version(2).stores({...}).upgrade(tx => {...});
    // Append-only — NEVER edit a shipped version block.
  }
}

export const db = new HealthTrackerDB();
```

### Store schemas

```typescript
interface PTTemplate {
  id: string;           // uuid (manual PK)
  name: string;         // e.g. "Wrist Flexor Stretch"
  targetSets: number;
  targetReps: number;
  targetDurationSecs?: number;
  notes?: string;
  createdAt: number;    // Unix ms
}

interface PTSession {
  id: string;
  dayKey: string;       // 'YYYY-MM-DD' local date
  templateId: string;
  templateName: string; // denormalized — survives template rename/delete
  actualSets: number;
  actualReps: number;
  actualDurationSecs?: number;
  notes?: string;
  painRating?: number;  // 0–5 optional
  loggedAt: number;
}

interface Food {
  id: string;
  name: string;
  brand?: string;
  servingLabel: string; // "1 cup", "100g"
  caloriesPerServing: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  photoKey?: string;    // OPFS filename, e.g. "food-<uuid>.webp" — never an inline blob
  createdAt: number;
}

interface MealEntry {
  id: string;
  dayKey: string;
  foodId: string;
  foodName: string;     // denormalized snapshot
  servings: number;
  caloriesTotal: number; // pre-computed at write time — no runtime joins
  proteinGTotal: number;
  carbsGTotal: number;
  fatGTotal: number;
  mealLabel?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt: number;
}

interface StepEntry {
  dayKey: string;       // PK — natural key, one record per day, upsert
  count: number;
  updatedAt: number;
}

interface LiftCheckin {
  dayKey: string;       // PK
  didLift: boolean;
  note?: string;
  updatedAt: number;
}

interface Goals {
  id: 'singleton';      // literal string — only one record ever
  caloriesTarget: number;
  proteinGTarget: number;
  carbsGTarget: number;
  fatGTarget: number;
  stepsTarget: number;
  updatedAt: number;
}
```

### Day key — the single source of truth (Pitfall #4)

```typescript
// lib/dayKey.ts — ONLY way to construct a day key
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
  // Parse as LOCAL — NOT new Date(key) which parses as UTC midnight
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

`YYYY-MM-DD` strings sort lexicographically = chronologically → IDB range queries `between('2026-01-01', '2026-04-30')` work directly.

**NEVER** use `new Date().toISOString().split('T')[0]` — it returns UTC date and shifts the day for any user west of UTC after ~7pm local.

---

## 7. Project-Breaking Rules (Must Follow From Line 1)

1. **Never `await` a non-IDB promise inside a Dexie transaction.** Silently auto-commits and drops writes. Fetch all inputs *before* `db.transaction(...)`. (Pitfall #1 — silent data loss is the worst possible failure for a tracker.)
2. **Never edit a past `db.version(N).stores({...})` block.** Schema migrations are append-only. Always add `this.version(N+1).stores({...}).upgrade(tx => ...)`.
3. **Never use `toISOString().split('T')[0]`** for day keys. Use `lib/dayKey.ts` exclusively. Unit-test it at 11:30pm in a UTC-5 context.
4. **Call `navigator.storage.persist()` on every startup.** Without it iOS Safari evicts IndexedDB after 7 days of Safari use without interaction.
5. **Resize photos to ≤800×800 @ 80% WebP before OPFS write.** Raw iPhone photos are 3–12MB and crash the tab via quota. Use `createImageBitmap(file, { imageOrientation: 'from-image' })` to handle EXIF rotation.
6. **Photos live in OPFS, never as Dexie blobs.** `foods.photoKey` is just a filename string. Dexie's own docs warn: *"Never index properties containing images, movies or large strings."*

### Three-layer iOS eviction defense

iOS Safari wipes script-writable storage for any origin inactive 7 days of Safari use. Home-screen-installed PWAs are exempt. Defense:

1. `navigator.storage.persist()` on every launch
2. **Install banner** prompting "Add to Home Screen" with data-safety framing
3. **Eviction banner** if `lastOpenedAt` is >4 days old AND the app is running in a Safari tab (not standalone)

---

## 8. Patterns & Anti-Patterns

### Pattern 1 — Service-Layer Encapsulation

```typescript
// GOOD — meals.svc.ts
export const getDailyMacros = (dayKey: string) =>
  db.mealEntries.where('dayKey').equals(dayKey).toArray();

// GOOD — component
const entries = useLiveQuery(() => getDailyMacros(todayKey()), []);

// BAD — DB query inside component
const entries = useLiveQuery(() =>
  db.mealEntries.where('dayKey').equals(todayKey()).toArray(), []);
```

### Pattern 2 — Denormalize Computed Totals

`mealEntries` stores `caloriesTotal`, `proteinGTotal`, etc. at write time. Daily macro total = simple `reduce()` over the day's entries — no `Food` joins, survives food library edits.

### Pattern 3 — Natural Keys for Single-Per-Day Stores

`stepEntries` and `liftCheckins` use `dayKey` as PK. `db.stepEntries.put({ dayKey: '2026-04-19', count: 8500 })` is upsert by definition.

### Anti-Pattern 1 — UTC date strings as day keys → off-by-one bugs (see Rule #3)
### Anti-Pattern 2 — Blobs inline in IDB → quota crash, slow lookups (see Rule #6)
### Anti-Pattern 3 — Per-cell streak queries

```typescript
// BAD — N cells × 4 queries = 120 IDB reads per month render
calendarCells.map(cell => useLiveQuery(() => fetchAllFour(cell.dayKey)));

// GOOD — streak.svc.ts: 4 range queries for the whole visible range, ONCE
export async function getStreakDataForRange(startKey: string, endKey: string) {
  const [sessions, meals, steps, lifts] = await Promise.all([
    db.ptSessions.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.stepEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.liftCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);
  // Aggregate into Map<dayKey, { pt: boolean, food: boolean, steps: boolean, lifts: boolean }>
}
```

### Anti-Pattern 4 — Multiple Dexie instances → cross-store transactions impossible

Single `HealthTrackerDB` in `db/db.ts`. All stores declared together.

---

## 9. Photo Storage (OPFS)

```typescript
// lib/photoStore.ts
const PHOTO_DIR = 'food-photos';

async function getDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(PHOTO_DIR, { create: true });
}

export async function savePhoto(file: File): Promise<string> {
  // 1. Resize to ≤800×800 @ 80% WebP via canvas
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const max = 800;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width  * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });

  // 2. Write to OPFS
  const key = `food-${crypto.randomUUID()}.webp`;
  const dir = await getDir();
  const fh = await dir.getFileHandle(key, { create: true });
  const writable = await fh.createWritable();
  await writable.write(blob);
  await writable.close();
  return key; // → foods.photoKey
}

export async function getPhotoUrl(key: string): Promise<string> {
  const dir = await getDir();
  const fh = await dir.getFileHandle(key);
  const file = await fh.getFile();
  return URL.createObjectURL(file); // caller must revokeObjectURL after render
}

export async function deletePhoto(key: string): Promise<void> {
  const dir = await getDir();
  await dir.removeEntry(key);
}
```

---

## 10. JSON Export / Import

### Envelope (versioned from day 1)

```typescript
interface ExportEnvelope {
  schemaVersion: number;     // db.verno at export time
  exportedAt: string;        // ISO 8601 UTC
  appVersion: string;        // semver from import.meta.env.VITE_APP_VERSION
  data: {
    ptTemplates:  PTTemplate[];
    ptSessions:   PTSession[];
    foods:        Food[];
    mealEntries:  MealEntry[];
    stepEntries:  StepEntry[];
    liftCheckins: LiftCheckin[];
    goals:        Goals[];
  };
  photos: Record<string, string>; // { [photoKey]: 'data:image/webp;base64,...' }
}
```

### Export

- Use `<a download>` to trigger the file save (NOT `showSaveFilePicker` — fails on iOS PWAs)
- Photos embedded as base64 data URIs → backups are self-contained
- Wrap each `URL.createObjectURL` call with a matching `revokeObjectURL`

### Import (v2 — out of scope for v1)

Destructive replace with explicit confirmation. Rejects files where `schemaVersion > db.verno` ("update the app first"). Migrates older versions if needed.

---

## 11. Service Worker Strategy

`vite-plugin-pwa` with `generateSW` + `registerType: 'autoUpdate'` (used in v1; `injectManifest` was the original recommendation if more control is needed later).

| Resource | Strategy | Rationale |
|---|---|---|
| App shell (HTML/JS/CSS/icons) | Precache + CacheFirst | Always offline; build hash = freshness |
| `manifest.webmanifest` | Precache | Required for installability |
| OPFS photos | **Not** cached by SW; served via `createObjectURL` in main thread | SW does not intercept OPFS |
| External fonts (if any) | StaleWhileRevalidate | Show cached, update in background |

```typescript
// vite.config.ts (excerpt)
VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'HealthTracker',
    short_name: 'HealthTracker',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    display: 'standalone',
    icons: [
      { src: '/icon-192.png',          sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png',          sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
})
```

---

## 12. Feature Scope (v1)

### v1 Requirements (41 total, all mapped to phases)

#### Setup & Shell (Phase 1)
- **SETUP-01** Installable PWA on iOS/Android home screens (manifest, icons, theme color)
- **SETUP-02** Fully offline after first load (Workbox precaches app shell)
- **SETUP-03** `navigator.storage.persist()` at startup
- **SETUP-04** Dark, minimal, low-noise visual style as the default and *only* theme
- **SETUP-05** Useful landing screen (today summary + calendar) loads in <1s on warm cache

#### Data Layer (Phase 1)
- **DATA-01** IndexedDB schema versioned via Dexie `db.version(1).stores(...)` with append-only migration policy
- **DATA-02** Single `dayKey` utility (`YYYY-MM-DD` local time, from `getFullYear/Month/Date`) is the sole source of day identity
- **DATA-03** Object stores: `foods`, `mealEntries`, `ptTemplates`, `ptSessions`, `stepEntries`, `liftCheckins`, `goals`
- **DATA-04** Food photos in OPFS; `foods.photoKey` filename reference only
- **DATA-05** Photos resized client-side to ≤800×800 @ ~80% WebP before OPFS write

#### PT (Phase 2)
- **PT-01** Create / edit / delete PT exercise definitions (name, optional description, default target sets/reps or duration)
- **PT-02** Create / edit / delete PT routine templates (named list of exercises with target sets/reps)
- **PT-03** Start a PT session from a template — pre-populates exercises
- **PT-04** Log actual sets/reps (or duration) per exercise, tick complete, save
- **PT-05** Freeform notes field per session
- **PT-06** Optional 0–5 pain/difficulty rating per session
- **PT-07** When logging, previous session's actuals are visible for reference

#### Food & Macros (Phase 2)
- **FOOD-01** Add food to library (name, kcal, P/C/F, serving label, optional photo)
- **FOOD-02** Edit and delete foods *(v1 ships create + delete only; edit deferred per build decision D-17)*
- **FOOD-03** Log meal entry (food + servings + meal bucket: Breakfast/Lunch/Dinner/Snack, defaults to today's dayKey)
- **FOOD-04** "Recent" section: most recently logged foods → one-tap re-log with prior serving pre-filled
- **FOOD-05** "Frequent" section: foods logged most often
- **FOOD-06** Each meal entry denormalizes computed macro totals at write time
- **FOOD-07** Day view shows live progress bars for kcal/P/C/F vs. configured daily targets
- **FOOD-08** Edit and delete meal entries

#### Steps (Phase 2)
- **STEPS-01** Enter step count for a given day (default: today) — one record per day, upsert
- **STEPS-02** Day view shows progress bar for steps vs. step goal

#### Lifts (Check-In Only) (Phase 2)
- **LIFT-01** Single "Lifted today" toggle (dayKey + boolean)
- **LIFT-02** Optional short note alongside the check-in

#### Streak Calendar — the core (Phase 3)
- **STREAK-01** Each day rendered as a 4-segment indicator (quadrants: PT / meals / steps / lift)
- **STREAK-02** A quadrant fills when ≥1 log exists for that day in its area (≥1 PT session, ≥1 meal entry, any step record, lift checkin = yes)
- **STREAK-03** Day rendered "complete" only when all 4 quadrant conditions met
- **STREAK-04** Calendar renders current month in month-at-a-time grid with prev/next navigation
- **STREAK-05** Cells are **neutral** (not red/punitive) for zero-log days; partial fills read as positive progress
- **STREAK-06** Tapping a calendar day opens that day's detail view (all four areas + logs + totals)
- **STREAK-07** Calendar screen displays current consecutive-complete-days streak count

#### Settings / Goals (Phase 2)
- **SET-01** Set daily targets for kcal, P, C, F, steps in a Settings screen
- **SET-02** Target changes take effect immediately across progress bars and day views (no reload)
- **SET-03** Goal changes are non-destructive to historical logs

#### Backup (Phase 4)
- **BACK-01** Export all data as a single JSON file (envelope: `schemaVersion`, `exportedAt`, `appVersion`, `data`, base64 `photos` map) via Settings button
- **BACK-02** Export uses `<a download>` to work on iOS home-screen PWAs

### v2 (deferred)

- **BACK-03** JSON import / restore (validates `schemaVersion`, destructive-replace with explicit confirmation)
- **INSIGHT-01..04** Per-exercise PT history chart, weekly macro summary, year-view heatmap, pain/difficulty trend
- **FOOD-09, FOOD-10** Meal templates / combos, copy-yesterday-to-today
- **SETUP-06** In-app SW update prompt
- **BACK-04** Auto-prompt weekly export

### Explicitly Out of Scope (do NOT add)

| Feature | Reason |
|---|---|
| Full lift tracking (sets/reps/weight) | User has another platform; duplicate entry defeats the purpose |
| Accounts / auth | Solo personal tool; auth = friction with no payoff |
| Cloud sync / hosted backend | Fully-local IDB is sufficient; backend breaks offline-first |
| Apple Health / Google Fit | Manual entry is acceptable; avoids platform plumbing |
| Barcode scanning | User explicitly preferred custom-library model |
| Third-party nutrition API (USDA/Nutritionix) | User prefers self-added foods; external dep breaks offline |
| Social / sharing / leaderboards | Solo motivation tool, not a social product |
| Hydration / sleep / mood | Scope-creep risk; only add if streak loop demands more segments |
| Bodyweight / measurements | Not a stated motivator; revisit post-v1 if it aids the cut |
| Push notification reminders | #1 abandon trigger in fitness apps; calendar visual IS the reminder |
| Streak freeze / grace days / punitive UI | Anti-pattern for injury-recovery users; missed days are neutral, never punished |
| Badges / XP / achievements | Gamification overload = documented abandon trigger |
| SSR / Next.js | SPA is sufficient; SSR complicates SW lifecycle |
| Adaptive macro targets | Requires bodyweight (out of scope) |
| AI meal suggestions | Requires backend or local model; out of scope |
| Onboarding wizard | Forced onboarding correlates with Day-1 abandonment |

---

## 13. The Streak Calendar — Design Detail

### Visual pattern (combine GitHub heatmap + Apple rings)

- **Day cell:** small square with 2×2 quadrant fill
  - NW = PT, NE = Food, SW = Steps, SE = Lift  *(locked decision D-08)*
  - 0/4 = empty neutral grey cell
  - 1/4, 2/4, 3/4 = partial fill — visually distinct positive states (count-based alpha ramp, decision D-09)
  - 4/4 = full color, possibly subtle glow / checkmark
  - Today's cell has a ring outline
- **Today screen:** full-size 4-segment display showing today's live state, animates on each log
- **Streak count:** simple number near the calendar header — *"N consecutive complete days"*
- **Month summary:** *X/30 complete days this month* in small text below the grid
- **Calendar grid:** 42 cells (6 weeks × 7 days) for any month, prev/next navigation

### Critical UX rules

1. **No red, no empty, no punitive states for partial days.** A 2/4 day looks like progress, not failure. Use graduated fill with neutral-to-positive color for all non-zero states.
2. **No streak freeze / grace tokens.** For a rehab user, missing PT on a flare day is medically appropriate. Recording it honestly > gamifying.
3. **No "streak broken" UI.** The calendar shows the positive pattern. Streak count is secondary; the heatmap is primary.
4. **Tap a day → opens Day Detail route** (`/#/day/:dayKey`) where all four areas are inline-editable, reusing the same leaf components Today uses.

### `streak.svc.ts` shape

```typescript
type DayQuadrants = { pt: boolean; food: boolean; steps: boolean; lift: boolean };

export async function getStreakDataForRange(
  startKey: string,
  endKey: string,
): Promise<Map<string, DayQuadrants>> {
  const [sessions, meals, steps, lifts] = await Promise.all([
    db.ptSessions.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.stepEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.liftCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);
  // Aggregate into a Map<dayKey, DayQuadrants>; lift quadrant true iff didLift === true.
}
```

`useLiveQuery` wrapping this re-runs whenever any of the 4 tables changes — exactly the desired behavior.

---

## 14. Reactive Data Pattern

```typescript
// Example: DailyMacroBar
import { useLiveQuery } from 'dexie-react-hooks';
import { getMealEntriesForDay } from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function DailyMacroBar() {
  const entries = useLiveQuery(() => getMealEntriesForDay(todayKey()), []);
  if (!entries) return <Skeleton />;
  const totalCals = entries.reduce((sum, e) => sum + e.caloriesTotal, 0);
  // ... render bars vs. goals
}
```

- Use `useLiveQuery` for any persisted data (Dexie auto-rerenders on writes that touch matching tables).
- Use `useState` / `useReducer` for local form values, modal flags, search strings — **never** Dexie for that.
- Use Zustand only for cross-component ephemeral UI (selected date, active tab) — never persisted state.

---

## 15. Complete Pitfall Reference

### Critical (project-breaking)

| # | Pitfall | Severity | Phase to address | Fix |
|---|---|---|---|---|
| 1 | Dexie async-in-transaction (silent commit, dropped writes) | PROJECT-BREAKING | Data layer | Pre-fetch all inputs; only `await` Dexie ops inside `db.transaction(...)` |
| 2 | Schema migrations: editing past `version(N)` blocks | PROJECT-BREAKING | Data layer | Append-only; always add `version(N+1)` with `.upgrade()` |
| 3 | iOS Safari 7-day storage eviction | PROJECT-BREAKING (non-installed users) | PWA shell | `navigator.storage.persist()` + Install banner + Eviction banner |
| 4 | UTC date string day keys (off-by-one for non-UTC users) | HIGH (invisible corruption) | Data layer | `lib/dayKey.ts` with local getters; unit-test at 11:30pm UTC-5 |
| 5 | Stale service worker stuck after deploy | HIGH | PWA setup | `registerType: 'autoUpdate'` + versioned cache names + visible app version in Settings |
| 6 | Streak anxiety from binary all-or-nothing UI | HIGH (abandonment) | Calendar UX | Graduated fills, neutral-grey for 0/4, no red, no streak freeze |
| 7 | Food logging friction (10+ taps to log a repeat meal) | HIGH (retention) | Food feature | Recent + Frequent chips, one-tap re-log with prior servings pre-filled |

### Moderate

| # | Pitfall | Fix |
|---|---|---|
| 8 | Photo storage without resize | ≤800×800 @ 80% WebP via canvas before OPFS write; never index blob fields |
| 9 | JSON export buried + no `schemaVersion` | Visible Export card in Settings; envelope with `schemaVersion` from day 1; "last exported N days ago" indicator |
| 10 | SW cache serving stale `sw.js` itself | `vite-plugin-pwa` handles correctly; never precache `sw.js` |
| 11 | Notification fatigue from daily reminders | Don't ship notifications in MVP; calendar IS the ambient reminder |

### "Looks Done But Isn't" verification checklist

- [ ] Macro totals update **immediately** after saving a food (not next page load)
- [ ] Late-night entries (23:30 local in UTC-5) land on the correct calendar cell
- [ ] Real device with v1 data opens correctly after a v3 schema bump
- [ ] New build triggers update prompt in installed PWA within ~60s
- [ ] Export → clear DB → import round-trip preserves all records and macro totals
- [ ] 20 food photos < 10MB IndexedDB usage (resize pipeline working)
- [ ] iPhone Safari (not standalone): `navigator.storage.persist()` is called and result surfaced
- [ ] 2/4 segment day shows visually distinct positive state (no red/empty)

---

## 16. Phase Roadmap (Build Order)

| # | Phase | REQs | Core Deliverable |
|---|---|---|---|
| 1 | Foundation | SETUP + DATA (10) | Vite/React/TS scaffold, Dexie v1 (7 stores), `dayKey` util, OPFS `photoStore`, vite-plugin-pwa shell, Install + Eviction banners, dark-mode base layout, hash routing, AppShell with bottom tab bar |
| 2 | Tracking Slices | PT + FOOD + STEPS + LIFT + SET (22) | PT (templates → sessions w/ previous-session hint, pain rating, notes); Food (create+photo, Recent/Frequent chips, inline-edit, bucketed today list, live macro bars); Steps (inline + bar); Lift (toggle + conditional note); Goals form (RHF+Zod) in Settings |
| 3 | Streak Loop | STREAK (7) | `streak.svc.ts` (single Promise.all over 4 range queries), `monthMath.ts`, `DayCell.tsx` pure 2×2 primitive, `MonthHeader` + `WeekdayHeader` + `MonthGrid` + `StreakCount` + `StreakCalendar`, `/#/day/:dayKey` route + `DayDetail` reusing Phase 2 leaf components |
| 4 | Backup & Polish | BACK (2) | `exportAll()` + `ExportCard` UI + `LAST_EXPORTED_KEY`; `useDayKey` midnight hook; `ConfirmDialog` for Lift delete; manifest.id + categories + `mobile-web-app-capable`; maskable icon safe-zone audit |

### Phase 2 parallelism

PT plans and Food+Steps+Lifts+Goals plans can be developed concurrently since they share only `db.ts`. Plan order:

1. `02-01-foundation` — install RHF/Zod + Radix Dialog, upgrade Sheet, ProgressBar primitive, `inferBucket`, service skeletons, goals seed in `initApp` (no REQs)
2. `02-02-goals-settings` — Goals form (RHF+Zod), `useGoals` hook (SET-01..03)
3. `02-03-food-slice` — Food Sheet: quick-log chips, inline create+photo, section-grouped today's meals, inline-edit (FOOD-01..08)
4. `02-04-pt-slice` — PT Sheet: template list + nested editor + session form + previous-session hint + pain + notes (PT-01..07)
5. `02-05-steps-lift-today` — inline Steps + Lift slices; wire 4 feature sections into TodayScreen (STEPS-01..02, LIFT-01..02)

### Plans completed (as of 2026-04-21)

- Phase 1: 3/3 ✓
- Phase 2: 5/5 ✓
- Phase 3: 4/4 ✓
- Phase 4: 5/5 ✓ (one human-walkthrough UAT pending across phases)

---

## 17. Key Decisions Log

| Decision | Rationale | Status |
|---|---|---|
| Fully-local PWA, IndexedDB only | Solo use + ship-fast + no auth needed | Locked |
| Custom food library (no third-party API) | User explicitly prefers; eats repeat meals; no external dep | Locked |
| Templates-combo PT model | Balances structure with low friction; user has prescribed exercises | Locked |
| Lifts = daily check-in only | User tracks lifts in detail elsewhere; re-tracking adds friction | Locked |
| Manual JSON export/import for backup | Simplest model giving user control; no backend needed | Locked |
| Dark mode + minimal aesthetic | User-stated preference; aligns with low cognitive load | Locked |
| React 19 + Vite 7 + TS + Dexie 4 + Tailwind v4 + shadcn/ui | Research phase | Locked |
| Photos: WebP @ 80%, ≤800×800, OPFS-stored, photoKey reference in Dexie | Raw iPhone photos crash tab; OPFS keeps Dexie row size flat; WebP@80% > JPEG@70% | Locked |
| Three-layer iOS eviction defense (persist + install banner + eviction banner) | `persist()` alone insufficient if user dismisses or rarely uses Safari | Locked |
| DayCell quadrant order: NW=PT, NE=Food, SW=Steps, SE=Lift (D-08) | Lock once before Phase 3 to prevent semantic drift | Locked |
| Count-based alpha ramp for 0/1/2/3/4 segment states (D-09) | Partial fills must read as positive, not punitive | Locked |
| Segment completion = "any log" for all 4 areas in v1 | Avoids streak anxiety; macros-target gating can come in v1.x | Locked |
| FOOD-02: v1 ships food create+delete only; edit deferred (D-17) | Bring food edit forward only if real use shows need | Locked |
| Hash routing (no Next.js / no SSR) | Simpler SW lifecycle; SPA sufficient | Locked |
| `registerType: 'autoUpdate'` (generateSW, not injectManifest, in v1) | Solo personal app; update conflicts not a concern | Locked |

### Open / pre-Phase-3 decisions (for next iteration)

1. PT rest-day affordance: `isRestDay` flag on `ptSessions` vs. separate record? — defer to v2 unless needed
2. Calendar view: month-at-a-time vs. rolling 30-day? — v1 = month-at-a-time

---

## 18. Open Decisions Affecting Future Design Work

For someone redesigning the calendar / DayCell visual:

- **DayCell SVG geometry** — exact arc / square geometry for 4-segment indicator
- **Color palette** for 0/1/2/3/4-segment states across light backgrounds (not in scope) and dark backgrounds (in scope)
- **Today cell affordance** — ring? glow? both?
- **Streak count typography** — hero size, weight; pairs with calendar grid spacing
- **Day Detail route layout** — share leaf components with Today, but consider density for a single day vs. live-updating today

---

## 19. UX Anti-Patterns to Avoid (Design Specifically)

| Anti-pattern | What to do instead |
|---|---|
| Red / empty cells for partial-complete days | Graduated fill (1–4 segments lit) with neutral-to-positive color for all non-zero states |
| Food log flow with 10+ taps per item | Recent + Frequent chips on log screen; one-tap re-add with pre-filled servings |
| No "rest day" affordance for PT | At minimum: don't punish missed PT days with red — show as neutral (rest-day flag is v2) |
| Calorie counter only visible after full meal log | Show running macro totals **live** after each food saved |
| Backup prompt buried in Settings only | Visible Export card; "last backup N days ago"; first-use data-safety banner |
| Install prompt framed as optional UX fluff | Frame as **data safety** — *"Install to home screen to prevent automatic deletion"* |
| Streak count reset to 0 after any break | Show "Best streak" + "Last 30 days consistency %" alongside current streak; missed days neutral grey |
| Onboarding wizard / forced setup tour | Sane defaults, optional dismissable first-run tip overlay maximum |

---

## 20. Competitor Landscape (Where This Sits)

| Feature | MyFitnessPal | MacroFactor | Cronometer | Strong/Hevy | **HealthTracker** |
|---|---|---|---|---|---|
| Food logging | Barcode + 14M DB | Verified DB, timeline | 84+ nutrients | None | **Custom personal library, recents/frequent recall** |
| Macro progress | Daily bars | Daily + weekly | Per-nutrient | None | **Daily bars: kcal + P + C + F only** |
| Workout logging | Basic | None | None | Sets/reps/weight | **PT templates: target vs. actual + notes + pain rating** |
| Streak / calendar | None | None | None | Calendar history | **4-segment month calendar (core differentiator)** |
| Habit check-in | None | None | None | None | **Lift check-in (yes/no + note)** |
| Step tracking | Via integrations | Via integrations | Via integrations | None | **Manual entry + goal** |
| Offline / local | Cloud-required | Cloud-required | Cloud-required | Cloud sync | **100% local IndexedDB** |
| Gamification | Badges, streaks | None | None | Progress graphs | **4-segment indicator only — no badges, no XP** |
| Data export | CSV (Premium) | CSV | CSV | CSV | **JSON (open format, free)** |
| Auth required | Yes | Yes | Yes | Yes | **None** |

**Key insight:** No competitor combines PT rehab tracking + macro logging + habit check-ins + streak visualization in a single unified view. The 4-segment calendar is genuinely novel in this combination.

---

## 21. Performance Budget

| Concern | Limit | Mitigation |
|---|---|---|
| App shell warm-cache load | <1s on phone | Precache via Workbox; small bundle (~150–250KB gz typical) |
| Streak month query | One pass per visible month | Memoize range query; only refetch when visible month changes |
| Food library list render | ~20 photos before lazy-loading needed | `createObjectURL` per visible thumbnail; revoke after load |
| Daily macro recalc | Reduce over `mealEntries[dayKey]` | Denormalized totals — no joins |
| 1 year of data | ~365 step + 365 lift + ~1500 meal + ~200 PT entries | Trivially handled by IDB |
| Photo library (100 × 200KB) | ~20MB OPFS | Well within quota; resize pipeline keeps it bounded |

---

## 22. What "Done" Looks Like

The app is working when:

1. The user opens it daily on phone home screen, fully offline
2. Logging a previously-eaten food takes ≤3 taps (chip → confirm servings → save)
3. The current month's calendar shows visible per-day partial-fill progress
4. Days with all 4 areas logged read as visually distinct "complete"
5. The user has exported a JSON backup at least once
6. After 7 days of laptop-only use, opening the app on phone still has all data (PWA installed → eviction-exempt)
7. After 30 days of real use the user is *still* logging — not just for the first 2 weeks

If 1–7 hold and every other feature is rough, the app has succeeded.

---

## Appendix A — File Map for Reference (existing repo)

| File | Purpose |
|---|---|
| `.planning/PROJECT.md` | Core value, requirements, constraints, key decisions |
| `.planning/REQUIREMENTS.md` | v1 / v2 / out-of-scope with REQ-IDs and traceability table |
| `.planning/ROADMAP.md` | Phase structure with goals + success criteria |
| `.planning/STATE.md` | Current project memory — in-progress work, decisions to resolve |
| `.planning/research/SUMMARY.md` | Stack + build-order recommendations |
| `.planning/research/STACK.md` | Full technology choices with versions and rationale |
| `.planning/research/ARCHITECTURE.md` | Object store schemas, day-key rules, OPFS, SW strategy |
| `.planning/research/FEATURES.md` | Table-stakes / differentiators / anti-features |
| `.planning/research/PITFALLS.md` | Project-breaking pitfalls to prevent from Phase 1 |
| `CLAUDE.md` | Condensed rules for AI agents working in the repo |

---

*Consolidated 2026-04-26 from `.planning/` artifacts for handoff to a fresh design/build agent.*
