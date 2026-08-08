# Architecture Research — v2.0 Duo Redesign Integration

**Domain:** Integration of new v2 features (AI food parsing, auto-library, lift/cardio check-offs, weight tracking, ring-closure) onto the existing HealthTracker v1 codebase
**Researched:** 2026-08-08
**Confidence:** HIGH (Dexie migration mechanics, layering, OPFS, existing code) / MEDIUM (Anthropic browser-direct call pattern, current model id) / LOW→flagged (exact closure/ring completion semantics — explicitly unresolved, needs design lock)

> This document supersedes the v1.0 `ARCHITECTURE.md` (2026-04-19, standard fully-local IndexedDB PWA patterns) for the v2.0 milestone. That research is still valid for the parts of the system unchanged in v2 (Dexie/OPFS fundamentals, layering conventions, SW strategy) and remains available via git history and `HEALTHTRACKER-CONTEXT.md`'s consolidated appendix. This document focuses specifically on **how the new v2 features integrate with the existing, already-shipped v1 codebase**.

## Existing System (v1, as shipped) — Ground Truth From Reading the Code

```
UI (routes/, features/*)
   │ useLiveQuery
Feature hooks (features/*/hooks.ts)
   │
Services (services/*.svc.ts)  ──────────────► lib/dayKey.ts, lib/photoStore.ts (OPFS)
   │ Dexie Table API
db/db.ts (single Dexie instance; HashRouter: /today /calendar /day/:dayKey /settings)
   version(1).stores({ ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals })
```

Layering is already enforced by convention (confirmed by reading the code, not assumed): feature components → own `hooks.ts` → own `*.svc.ts` → `db.ts`. `streak.svc.ts` is the one existing cross-cutting exception (reads all 4 daily-tracking stores in one `Promise.all` per visible range — explicitly commented in the file as "the ONE place per month-range where the calendar touches IDB"). `export.svc.ts` is the other (reads all 7 stores + loops OPFS). This precedent is exactly the shape `closure.svc.ts` and `export.svc.ts` v2 should follow — no new layering pattern is needed, only new cross-cutting services alongside the existing ones.

## Target System (v2)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ UI — routes/DailyScreen, routes/DashboardScreen, routes/DayDetailScreen, │
│      routes/SettingsScreen                                               │
│  features/food (freeform entry box, auto-library chips)                  │
│  features/checkins (lift + cardio one-tap tiles)                         │
│  features/weight (entry + trend)                                         │
│  features/closure (ring/segment indicator — replaces features/calendar's │
│      4-quadrant DayCell)                                                 │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ useLiveQuery
┌───────────────────────────┴────────────────────────────────────────────┐
│ Services                                                                │
│  meals.svc.ts (existing, minor changes)                                 │
│  food.svc.ts (evolves: dedupe, usage tracking)                          │
│  parse.svc.ts  ── provider boundary ── anthropic.provider.ts            │
│                                     └── local.provider.ts                │
│  checkins.svc.ts (NEW — replaces lifts.svc.ts; lift + cardio)           │
│  weight.svc.ts (NEW)                                                    │
│  closure.svc.ts (NEW — replaces streak.svc.ts)                          │
│  goals.svc.ts (existing, unchanged or lightly extended)                 │
│  export.svc.ts (v2 envelope) / import.svc.ts (NEW)                      │
│  apiKeyStore.ts (NEW, lib/ not services/ — see API key section)         │
└───────────────────────────┬────────────────────────────────────────────┘
                            │ Dexie Table API                    │ fetch (Anthropic API)
┌───────────────────────────┴───────────────────┐   ┌────────────┴──────────────┐
│ db/db.ts — version(2).stores({...}).upgrade()  │   │ api.anthropic.com/v1/     │
│  NEW: dailyCheckins, weightEntries             │   │ messages (BYOK, direct    │
│  EVOLVED: foods (usage/dedupe/serving fields)  │   │ from browser, CORS)       │
│  UNCHANGED (declared, orphaned): ptTemplates,  │   └────────────────────────────┘
│  ptSessions, stepEntries, liftCheckins,        │
│  mealEntries, goals                            │
└─────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | New / Modified |
|-----------|----------------|-----------------|
| `db/db.ts` `version(2)` block | Add `weightEntries`, `dailyCheckins`; evolve `foods` indexes; **append-only** — never touches `version(1)` block | Modified (additive) |
| `db/schema.ts` | Add `WeightEntry`, `DailyCheckin` interfaces; extend `Food`; remove `PTTemplate`/`PTSession`/`StepEntry`/`LiftCheckin` **type exports** (stores stay physically declared — see Orphaned Data section) | Modified |
| `services/checkins.svc.ts` | Upsert/read lift + cardio check-offs by `[dayKey, kind]`; replaces `lifts.svc.ts` | New (replaces) |
| `services/weight.svc.ts` | CRUD for `weightEntries`; range query for Dashboard trend | New |
| `services/parse.svc.ts` | Orchestrates AI vs local parsing; provider-agnostic; never touches Dexie directly (delegates food creation to `food.svc.ts`) | New |
| `services/parseProviders/anthropic.provider.ts` | Anthropic Messages API call, forced tool-use JSON output, dynamic-imported SDK | New |
| `services/parseProviders/local.provider.ts` | Regex/arithmetic fallback parser (no network, no bundled nutrition DB) | New |
| `services/food.svc.ts` | Gains dedupe-by-`normalizedName`, `usageCount`/`lastUsedAt` bump on log, structured serving fields | Modified |
| `services/closure.svc.ts` | Range aggregation across `mealEntries` + `dailyCheckins`; replaces `streak.svc.ts`; same Promise.all-range pattern | New (replaces) |
| `services/export.svc.ts` | v2 envelope: new stores in, orphaned v1 stores decision applied, API key **never** included (it isn't in Dexie) | Modified |
| `services/import.svc.ts` | Validates `schemaVersion === db.verno` (current version only — NOT a JSON-level v1→v2 migrator; that job belongs to the Dexie `upgrade()` callback, see Migration Paths) | New |
| `lib/apiKeyStore.ts` | `localStorage`-backed getter/setter for the Anthropic API key | New |

## Recommended Project Structure (delta from v1)

```
src/
├── db/
│   ├── db.ts                 # version(2) appended
│   └── schema.ts             # + WeightEntry, DailyCheckin; Food extended
├── lib/
│   └── apiKeyStore.ts         # NEW — localStorage wrapper, mirrors storageKeys.ts pattern
├── services/
│   ├── checkins.svc.ts        # NEW — replaces lifts.svc.ts
│   ├── weight.svc.ts          # NEW
│   ├── closure.svc.ts         # NEW — replaces streak.svc.ts
│   ├── parse.svc.ts           # NEW — provider orchestrator
│   ├── parseProviders/
│   │   ├── anthropic.provider.ts
│   │   └── local.provider.ts
│   ├── food.svc.ts            # MODIFIED — dedupe + usage tracking
│   ├── import.svc.ts          # NEW
│   ├── export.svc.ts          # MODIFIED
│   └── (pt.svc.ts, steps.svc.ts, lifts.svc.ts DELETED)
├── features/
│   ├── food/                  # MODIFIED — freeform entry, auto-library chips replace FoodCreateForm
│   ├── checkins/              # NEW — replaces features/lifts (generalized lift+cardio tiles)
│   ├── weight/                # NEW
│   ├── closure/                # NEW — replaces features/calendar's DayCell quadrant model
│   └── (features/pt/, features/steps/ DELETED)
└── routes/
    ├── DailyScreen.tsx         # replaces TodayScreen.tsx
    ├── DashboardScreen.tsx     # replaces CalendarScreen.tsx
    ├── DayDetailScreen.tsx     # kept — reused for tapping into a past day
    └── SettingsScreen.tsx      # kept — gains API key field + import button
```

### Structure Rationale

- **`parseProviders/` as its own folder, not flat files in `services/`:** the provider interface is the one place in this codebase where an external network dependency and a swappable-implementation pattern both apply — worth a dedicated boundary so `anthropic.provider.ts` (the only file that imports the Anthropic SDK) can be dynamically imported and code-split away from users who never touch AI parsing.
- **`apiKeyStore.ts` lives in `lib/`, not `services/`:** every existing `*.svc.ts` talks to `db.ts` (Dexie). The API key deliberately does **not** go through Dexie (see API Key Storage section) — putting it in `lib/` alongside `storageKeys.ts`/`photoStore.ts` (both non-Dexie persistence helpers) keeps the "services = Dexie boundary" convention intact rather than creating a `*.svc.ts` file that's secretly not talking to the database.
- **`features/checkins/` generalizes `features/lifts/`:** lift and cardio are now the same shape (`DailyCheckin` with a `kind` discriminator) — one feature folder with a `kind` prop on its tile component avoids duplicating `LiftToggle.tsx`/`LiftNoteInput.tsx` into near-identical cardio versions.

## Dexie `version(2)` Migration Design

### New stores

**`weightEntries`** — one entry per day, natural key (same pattern as v1's `stepEntries`/`liftCheckins`):

```typescript
interface WeightEntry {
  dayKey: string;   // PK — natural key, one record per day, upsert
  weightKg: number; // canonical unit; convert for display per user preference
  loggedAt: number;
}
```
Store string: `'dayKey'`.

**`dailyCheckins`** — generalizes lift + cardio (and any future check-off "kind") into one store instead of one store per activity type. This directly satisfies the "Hevy-sync-ready" requirement: a future sync job can `put()` a `source: 'hevy'` record for `kind: 'cardio'` without any schema change.

```typescript
interface DailyCheckin {
  dayKey: string;               // compound PK part 1
  kind: 'lift' | 'cardio';      // compound PK part 2 — extensible, don't hardcode to 2 kinds in queries
  completed: boolean;
  source: 'manual' | 'hevy';    // v2 ships 'manual' only; Hevy sync writes 'hevy' later
  note?: string;
  loggedAt: number;
}
```
Store string: `'[dayKey+kind], dayKey'`. The compound primary key `[dayKey+kind]` gives O(1) upsert (`db.dailyCheckins.put({dayKey, kind, ...})`) exactly like v1's `liftCheckins.dayKey` PK did. The **second, non-compound `dayKey` index is required** — without it, `closure.svc.ts`'s range query (`.where('dayKey').between(startKey, endKey)`, needed to fetch both kinds for a date range in one query, same shape as v1's `streak.svc.ts`) cannot be expressed; a compound key alone does not let you query on its first component independently. [Confidence: HIGH — Dexie compound-index syntax is core, well-documented behavior.]

### Evolved store: `foods`

Additive fields only (append-only applies to data shape too, not just store names — never repurpose or rename an existing field):

```typescript
interface Food {
  // ...existing fields unchanged...
  normalizedName: string;    // NEW — trim().toLowerCase(), indexed, dedupe key
  usageCount: number;        // NEW — incremented on every logMeal() call
  lastUsedAt: number;        // NEW — replaces the mealEntries-scan in getRecentFoods()
  servingQty?: number;       // NEW — canonical structured serving (replaces freeform parsing of servingLabel)
  servingUnit?: string;      // NEW — e.g. 'g', 'ml', 'oz', 'piece'
  parseSource?: 'ai' | 'local' | 'manual'; // NEW — provenance badge in UI, audit trail
}
```
Store string: `'id, name, normalizedName, lastUsedAt, usageCount, createdAt'`.

`servingLabel` (existing freeform string) is kept as-is for backward-compat display of pre-v2 records; new AI/local-parsed foods populate both `servingLabel` (display) and `servingQty`/`servingUnit` (structured, for future unit math). Old records simply have `servingQty`/`servingUnit` undefined — components must treat them as optional, not backfill-required.

### The `upgrade()` callback — what it does and does not do

```typescript
this.version(2)
  .stores({
    foods: 'id, name, normalizedName, lastUsedAt, usageCount, createdAt',
    dailyCheckins: '[dayKey+kind], dayKey',
    weightEntries: 'dayKey',
    // ptTemplates, ptSessions, stepEntries, liftCheckins, mealEntries, goals:
    // OMITTED — Dexie carries stores not mentioned in a later version forward unchanged.
  })
  .upgrade(async (tx) => {
    // 1. Migrate real user data: liftCheckins → dailyCheckins (kind: 'lift').
    //    This is a genuine data-continuity migration (not a drop) because lift
    //    check-off history feeds the v2 closure/streak count and Dashboard.
    const lifts = await tx.table('liftCheckins').toArray();
    for (const l of lifts) {
      await tx.table('dailyCheckins').put({
        dayKey: l.dayKey, kind: 'lift', completed: l.lifted,
        source: 'manual', note: l.note, loggedAt: l.loggedAt,
      });
    }

    // 2. Backfill foods.usageCount / lastUsedAt / normalizedName from existing
    //    mealEntries history, so the auto-library doesn't show "0 uses" for
    //    foods the user actually logs constantly in v1.
    const meals = await tx.table('mealEntries').toArray();
    const counts = new Map<string, number>();
    const lastUsed = new Map<string, number>();
    for (const m of meals) {
      counts.set(m.foodId, (counts.get(m.foodId) ?? 0) + 1);
      lastUsed.set(m.foodId, Math.max(lastUsed.get(m.foodId) ?? 0, m.loggedAt));
    }
    const foods = await tx.table('foods').toArray();
    for (const f of foods) {
      await tx.table('foods').put({
        ...f,
        normalizedName: f.name.trim().toLowerCase(),
        usageCount: counts.get(f.id) ?? 0,
        lastUsedAt: lastUsed.get(f.id) ?? f.createdAt,
      });
    }
    // Deliberately does NOT touch ptTemplates, ptSessions, stepEntries — see
    // "Orphaned v1 Data" below. Deliberately does NOT delete liftCheckins —
    // left in place for one release as a rollback source.
  });
```

**Pitfall #1 applies inside `upgrade()` just as much as inside `db.transaction()`** — every `await` above is a `tx.table(...)` Dexie call. The moment anyone adds a `fetch()` or `setTimeout` inside this callback (e.g. "let's call the AI to re-categorize old foods during migration" — don't), the versionchange transaction silently auto-commits and drops the rest of the migration. This is the single highest-stakes place in the whole v2 migration to violate that rule, because it runs once, unattended, on the user's real historical data.

### Orphaned v1 Data — decision options

**`ptTemplates`, `ptSessions`, `stepEntries`** have no v2 equivalent at all (features fully dropped, not renamed/generalized).

| Option | What it does | Risk | Recommendation |
|--------|--------------|------|-----------------|
| **A. Leave declared, do nothing** | Omit from `version(2).stores()`; Dexie carries the stores forward unchanged; old rows remain in IndexedDB, inert, never read or written by v2 code | None | **Recommended for the v2 milestone.** Zero migration risk, zero code needed. Data size is trivial (a rehab tracker + step counts for a few months = tens of KB). |
| **B. Clear rows, keep store shell** | Add `await tx.table('ptTemplates').clear()` (etc.) inside the `version(2).upgrade()` — plain `tx.table` calls, no interaction with the Dexie deletion bug | Low | Optional, for privacy/hygiene, if either user wants the PT rehab history gone. Not required. |
| **C. Drop the object stores** | `ptTemplates: null, ptSessions: null, stepEntries: null` in a **later, isolated** `version(3).stores({...})` with no other changes and no `.upgrade()` in that same version | Medium — Dexie has a documented bug where store deletion (`null`) combined with other structural changes or an `upgrade()` function in the *same* version can leave stores undeleted or behave unpredictably ([dexie/Dexie.js#889](https://github.com/dfahlander/Dexie.js/issues/889), [#276](https://github.com/dexie/Dexie.js/issues/276)) | Do this only as a **future, separate cleanup release**, never bundled with the v2 feature migration. |

Corresponding TypeScript cleanup (safe, does not touch the immutable `version(1)` block): delete the `PTTemplate`/`PTSession`/`StepEntry` interfaces from `schema.ts` and the `ptTemplates!`/`ptSessions!`/`stepEntries!` properties from the `HealthTrackerDB` class, and delete `pt.svc.ts`, `steps.svc.ts`, `features/pt/`, `features/steps/`. This only removes the TypeScript *accessor* layer — the physical object stores keep existing in IndexedDB per Option A, satisfying "declared but orphaned" exactly as posed in the question.

**`liftCheckins`** is different — it is migrated (data continuity), not orphaned. Keep the `LiftCheckin` interface + `liftCheckins!` property declared for at least this release (useful if a rollback or a manual data-recovery script is ever needed), delete `lifts.svc.ts` and stop writing to the store from the UI. Drop the accessor in a later cleanup release once `dailyCheckins` has been in production for both users for a while.

## AI Parse Service Boundary

### Provider interface

```typescript
// services/parseProviders/types.ts
export interface ParsedFoodItem {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingQty: number;
  servingUnit: string;
}

export interface ParseProvider {
  id: 'anthropic' | 'local';
  parse(freeformText: string): Promise<ParsedFoodItem[]>; // array: "eggs and toast" → 2 items
}
```

### Orchestration (`parse.svc.ts`)

```typescript
export async function parseFoodEntry(text: string): Promise<{ items: ParsedFoodItem[]; usedFallback: boolean }> {
  const key = getApiKey(); // lib/apiKeyStore.ts — localStorage read, sync
  if (key) {
    try {
      const { anthropicParse } = await import('./parseProviders/anthropic.provider');
      return { items: await anthropicParse(text, key), usedFallback: false };
    } catch (err) {
      console.warn('[parse.svc] anthropic provider failed, falling back to local', err);
      // fall through — offline, bad key, rate limit, network error all land here
    }
  }
  const { localParse } = await import('./parseProviders/local.provider');
  return { items: await localParse(text), usedFallback: true };
}
```

`parse.svc.ts` never touches Dexie. Callers (the food-entry feature) take the returned `ParsedFoodItem[]` and pass each item to `food.svc.ts`'s new dedupe-aware create function — keeping the "parsing" concern and the "persistence/dedupe" concern in separate services, matching the existing `food.svc.ts` / `meals.svc.ts` split (library vs. logging).

### Anthropic provider

- **Model:** `claude-haiku-4-5` — current, generally available as of this research date (launched Oct 2025, EOL no sooner than Oct 2026 per Anthropic/AWS docs). [Confidence: MEDIUM — verify exact model slug against Anthropic's docs at implementation time, since model names iterate.]
- **Browser-direct call:** Anthropic's API supports CORS for browser calls via the `anthropic-dangerous-direct-browser-access: true` request header (announced 2024, still the supported BYOK pattern in 2026). Using the official `@anthropic-ai/sdk`, this is `new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })`. [Confidence: HIGH — corroborated by Anthropic's own CORS announcement and the SDK's `dangerouslyAllowBrowser` option existing for exactly this "bring your own key" client-side use case.]
- **Structured output:** force a single tool call (`tool_choice: { type: 'tool', name: 'log_food' }`) with a JSON-schema tool definition matching `ParsedFoodItem[]`, rather than parsing prose — the standard, reliable pattern for getting strict JSON back from Claude.
- **Bundle impact:** dynamically `import()`ed only inside the `if (key)` branch above, so the SDK never loads for a user who hasn't set an API key or is offline — keeps it out of the main bundle per the existing performance discipline (see STACK.md/PITFALLS.md precedent of code-splitting non-critical paths).
- **Alternative considered:** raw `fetch()` to `https://api.anthropic.com/v1/messages` with the header set manually, skipping the SDK dependency entirely. Lighter, but loses the SDK's typed request/response and retry handling. Recommend the SDK (dynamically imported) unless bundle-size measurement later shows it matters.

### Local fallback provider

No bundled nutrition database (this would recreate the "third-party nutrition DB" anti-feature explicitly ruled out in `PROJECT.md`/`HEALTHTRACKER-CONTEXT.md`). The local provider is a **calculator, not a database**: a regex/keyword parser that recognizes the pattern from the requirement's own example — `"200g chicken, 31g protein per 100g"` — extracts quantity + unit + per-unit macro hints already present in the user's own text, and does the arithmetic. If the text contains no parseable macro hints (e.g. "a bowl of cereal" with no numbers), it returns a single low-confidence item with all macros zeroed and `name` set to the raw text, and the calling UI opens the existing manual-entry form pre-filled with that name for the user to fill in by hand. This keeps the offline path honest (never guesses) rather than silently fabricating macros.

## API Key Storage: `localStorage`, not Dexie

**Recommendation: `localStorage`, via a new `lib/apiKeyStore.ts`, following the existing `storageKeys.ts` convention — not a Dexie `settings`/`goals` field.**

Reasoning specific to this project (not a general ecosystem fact — this is an architecture decision, not something to verify against docs):

1. **Export/import safety by construction.** `export.svc.ts` and the new `import.svc.ts` only ever touch Dexie tables (confirmed by reading the current `exportAll()` — it enumerates `db.*` tables plus OPFS photos, nothing else). If the API key lived in Dexie, every future change to `export.svc.ts` would need an explicit exclusion to avoid leaking the key into a JSON file the user might screenshot, email to themselves, or hand to the other friend for comparison. Putting the key in `localStorage` means it is *structurally* excluded from the backup envelope — there is no filter to remember or forget.
2. **Equivalent durability.** `navigator.storage.persist()` (already called at every startup per `main.tsx`) is an origin-level grant under the Storage Standard — it protects `localStorage` exactly as it protects IndexedDB on the browsers this PWA targets. There is no durability advantage to Dexie here.
3. **No reactivity need.** The API key is read once when `parse.svc.ts` needs it and edited on a single Settings form; it doesn't need `useLiveQuery`'s cross-component reactivity the way `goals` does (goals feed progress bars in multiple places simultaneously).
4. **Consistency with existing non-Dexie persistence.** `lib/storageKeys.ts` already centralizes `localStorage` keys (`lastOpenedAt`, `installDismissedAt`, etc.) for exactly this kind of "app-level setting, not user data" concern. `apiKeyStore.ts` extends that existing pattern rather than introducing a new one.

```typescript
// lib/apiKeyStore.ts
const API_KEY_STORAGE_KEY = 'healthtracker:anthropicApiKey';
export function getApiKey(): string | null { return localStorage.getItem(API_KEY_STORAGE_KEY); }
export function setApiKey(key: string): void { localStorage.setItem(API_KEY_STORAGE_KEY, key); }
export function clearApiKey(): void { localStorage.removeItem(API_KEY_STORAGE_KEY); }
```

## Closure Computation Service (replaces `streak.svc.ts`)

`closure.svc.ts` follows the exact same range-aggregation pattern as v1's `streak.svc.ts` (one `Promise.all` per visible range, never per-cell queries — the existing Anti-Pattern 3 guard in the codebase comments applies unchanged), just against fewer, different stores:

```typescript
export interface ClosureState { food: boolean; lift: boolean; cardio: boolean; }

export async function getClosureDataForRange(startKey: string, endKey: string): Promise<Map<string, ClosureState>> {
  const [meals, checkins] = await Promise.all([
    db.mealEntries.where('dayKey').between(startKey, endKey, true, true).toArray(),
    db.dailyCheckins.where('dayKey').between(startKey, endKey, true, true).toArray(),
  ]);
  // meals → food: true for any dayKey present (or "hit target" — SEE OPEN DECISION below)
  // checkins → lift/cardio: true where kind matches and completed === true
}
```

The consecutive-streak-count algorithm (`getCurrentStreakCount`'s anchor/backward-scan logic in the current `streak.svc.ts`) is directly reusable — it's already store-agnostic once you swap `isComplete`'s definition from 4-flag to 3-flag AND.

**Open decision, carried forward from v1 and not yet resolvable by research alone:** whether `food: true` means "any meal logged" (matches v1's `STREAK-02` semantics and the general "low-friction" bias) or "hit calorie/macro target within some tolerance" (closer to the literal PROJECT.md wording "calories/macros are logged" could be read either way, and an Apple-ring metaphor implies filling toward a target, not just any log). This needs an explicit design lock before `closure.svc.ts` is implemented, exactly as the equivalent v1 "Segment completion definition" decision was locked before Phase 3 — do not infer silently in code.

## Route / IA Changes

```typescript
<HashRouter>
  <AppShell>
    <Routes>
      <Route path="/" element={<Navigate to="/daily" replace />} />
      <Route path="/daily" element={<DailyScreen />} />        {/* was /today */}
      <Route path="/dashboard" element={<DashboardScreen />} /> {/* was /calendar */}
      <Route path="/day/:dayKey" element={<DayDetailScreen />} /> {/* unchanged path */}
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  </AppShell>
</HashRouter>
```

- `DailyScreen` = today's closure state (ring/segment indicator) + all v2 logging entry points (food freeform box + auto-library chips, lift/cardio tiles, weight input).
- `DashboardScreen` = Recharts weight trend line + eating-adherence and lift/cardio-consistency visualizations over weeks/months. It may still embed a compact closure history strip (heatmap-style, reusing the `closure.svc.ts` range query) as one panel among several — that's a UI-design decision, not an architecture one; the important structural point is Dashboard is chart/trend-first, not calendar-first, unlike v1's `/calendar`.
- `/day/:dayKey` is retained unchanged as the drill-down for editing a past day, reusing the same leaf feature components `DailyScreen` uses (the existing `DayDetail*` components already establish this reuse pattern in v1 — no new pattern needed).
- HashRouter itself is unchanged; no reason to revisit that v1 decision for v2.

## Export / Import v2 Envelope

```typescript
interface ExportEnvelopeV2 {
  schemaVersion: number;   // db.verno === 2
  exportedAt: string;
  appVersion: string;
  data: {
    foods: Food[];             // v2 shape (usageCount, lastUsedAt, normalizedName, ...)
    mealEntries: MealEntry[];
    dailyCheckins: DailyCheckin[];
    weightEntries: WeightEntry[];
    goals: Goals[];
    // ptTemplates / ptSessions / stepEntries / liftCheckins: OMITTED —
    // dead per the Orphaned Data decision; nothing to back up going forward.
  };
  photos: Record<string, string>;
}
```

The Anthropic API key is never part of this envelope — it lives in `localStorage`, which `export.svc.ts` never reads (see API Key Storage section). This is enforced structurally, not by a filter someone has to remember to add.

### Two separate migration paths — do not conflate them

1. **In-place Dexie schema upgrade** (`db.version(2).upgrade()`): handles converting each user's **existing local IndexedDB** from v1 shape to v2 shape, automatically, the first time they open the upgraded app. This is where `liftCheckins → dailyCheckins` conversion and `foods` usage-count backfill belong (see Migration Design above). Every existing local install gets this for free the moment the new code loads — no user action, no JSON file involved.
2. **JSON export/import** (`export.svc.ts` / new `import.svc.ts`): a manual backup/restore mechanism for **disaster recovery** (device lost, browser data cleared, moving to a new phone), not a schema-migration tool. `import.svc.ts` should validate `envelope.schemaVersion === db.verno` and **reject** anything else with a clear message ("this backup is from an older/newer version of the app") rather than attempting a JSON-level v1→v2 transform — that transform already happened, once, correctly, inside the Dexie `upgrade()` callback for whoever had local v1 data. Building a second, parallel migration path inside `import.svc.ts` would duplicate the `upgrade()` logic and risk the two diverging.

## Suggested Build Order

1. **Dexie v2 schema + migration** (`db/db.ts`, `db/schema.ts`) — everything else depends on the new stores/fields existing. Includes the `liftCheckins → dailyCheckins` and `foods` usage-count backfill in `upgrade()`. Delete `pt.svc.ts`/`steps.svc.ts`/`lifts.svc.ts` and their feature folders here, per the Orphaned Data decision (Option A).
2. **Check-offs + weight** (`checkins.svc.ts`, `weight.svc.ts` + minimal UI tiles) — straightforward CRUD against the new stores, no AI dependency, lowest risk, validates the schema from step 1 end-to-end.
3. **AI parsing + auto-library** (`parse.svc.ts`, both providers, `food.svc.ts` dedupe/usage logic, `apiKeyStore.ts`, freeform entry UI) — the highest-uncertainty piece (external API, structured-output reliability, offline fallback UX); build once the data layer underneath it (step 1) is stable so parsed items have somewhere correct to land.
4. **Closure loop + Dashboard IA** (`closure.svc.ts`, ring UI, `/daily` + `/dashboard` routes, Recharts trend/adherence views) — depends on steps 2 and 3 producing real `mealEntries`/`dailyCheckins`/`weightEntries` data to visualize meaningfully; also where the open "food closure semantics" decision must be locked before implementation.
5. **Export/import v2 + final cleanup** (`export.svc.ts` v2 envelope, new `import.svc.ts`, Settings screen wiring) — last, because it needs the final shape of every store from steps 1–4 to be correct before it's worth versioning the backup format.

## Anti-Patterns to Avoid

### Anti-Pattern: Bundling store deletion with the feature migration
Dropping `ptTemplates`/`ptSessions`/`stepEntries` (`: null`) in the *same* `version(2).stores()` call that also adds `dailyCheckins`/`weightEntries` and runs an `upgrade()` function. Dexie has documented, reproducible bugs where store deletion interacts unpredictably with other structural changes in the same version. Do deletions (if ever) in their own later, isolated version bump with nothing else in it.

### Anti-Pattern: A non-Dexie await inside `version(2).upgrade()`
Same failure mode as the general Pitfall #1, but higher-stakes here because it runs once, unattended, against real historical data with no user-visible error if it silently truncates. Every `await` inside the `upgrade()` callback must be a `tx.table(...)` call — never `fetch`, never a provider call, never an OPFS read.

### Anti-Pattern: Letting `import.svc.ts` do double duty as a schema migrator
Treating "restore an old backup file" and "upgrade v1 IndexedDB data to v2 shape" as the same code path. They are different triggers (file upload vs. app boot) with different risk profiles; conflating them means the `upgrade()` migration logic effectively has to be written and tested twice.

### Anti-Pattern: Storing the API key in Dexie "for consistency with goals"
Superficially tidy (one settings model), but couples a secret to the same read surface (`db.*`) that `export.svc.ts` iterates over wholesale — every future contributor touching the export loop has to remember to exclude it. `localStorage` makes the exclusion structural instead of a discipline problem.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic Messages API (`api.anthropic.com/v1/messages`) | Direct browser fetch/SDK call with user's own key, `dangerouslyAllowBrowser: true` (SDK) or `anthropic-dangerous-direct-browser-access: true` header (raw fetch); forced tool-use for structured JSON | BYOK — key never leaves the user's device to any server the app controls (there is no app-controlled server). Must degrade to `local.provider.ts` on any failure (network, invalid key, rate limit). Verify exact model slug (`claude-haiku-4-5` at time of writing) against current Anthropic docs before implementation — model names iterate on a roughly 6–12 month cadence. |
| Hevy API | **Not integrated in v2** — `dailyCheckins.source: 'hevy'` is the only accommodation made now (a value the field can hold). Actual sync requires Hevy Pro (neither user has it) and is explicitly deferred. | Data-model-ready, code-not-ready. Don't build a sync client speculatively. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `parse.svc.ts` ↔ `food.svc.ts` | Direct function call, plain objects (`ParsedFoodItem[]`) | Parsing and persistence stay separate services, same split precedent as `food.svc.ts` (library) vs `meals.svc.ts` (logging) in v1 |
| `parse.svc.ts` ↔ `anthropic.provider.ts` / `local.provider.ts` | Dynamic `import()`, shared `ParseProvider` interface | Keeps the Anthropic SDK out of the main bundle; swap point if a third provider is ever added |
| `closure.svc.ts` ↔ `mealEntries` / `dailyCheckins` | Dexie range queries, `Promise.all`, one call per visible range | Same anti-per-cell-query discipline as v1 `streak.svc.ts` |
| `export.svc.ts` / `import.svc.ts` ↔ `apiKeyStore.ts` | **None — deliberately no import.** | The absence of this dependency is the point (see API Key Storage) |

## Sources

- Existing codebase, read directly: `src/db/db.ts`, `src/db/schema.ts`, `src/services/meals.svc.ts`, `src/services/streak.svc.ts`, `src/services/export.svc.ts`, `src/services/food.svc.ts`, `src/services/lifts.svc.ts`, `src/services/goals.svc.ts`, `src/lib/photoStore.ts`, `src/main.tsx`, `src/App.tsx` — HIGH confidence, ground truth for "as-is" architecture.
- `.planning/PROJECT.md`, `HEALTHTRACKER-CONTEXT.md` — HIGH confidence for v2 requirements and locked decisions; MEDIUM/flagged for the still-open closure-semantics question.
- Dexie compound primary keys and `stores()` syntax — HIGH confidence, core documented Dexie behavior (dexie.org/docs/Version/Version.upgrade()).
- Dexie table-deletion-on-upgrade bug: [dexie/Dexie.js#889](https://github.com/dfahlander/Dexie.js/issues/889), [dexie/Dexie.js#276](https://github.com/dexie/Dexie.js/issues/276) — MEDIUM confidence (community-reported GitHub issues, not official docs, but corroborated across multiple independent reports).
- Anthropic browser-direct CORS support / `anthropic-dangerous-direct-browser-access` header: [Simon Willison, Aug 2024](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/), [anthropic-sdk-typescript#248](https://github.com/anthropics/anthropic-sdk-typescript/issues/248) — HIGH confidence, corroborated by SDK's own `dangerouslyAllowBrowser` option existing for this exact use case.
- Claude Haiku 4.5 model availability: [Anthropic](https://www.anthropic.com/claude/haiku), [AWS Bedrock model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html) — MEDIUM confidence (launched Oct 2025, EOL no sooner than Oct 2026 per these sources; re-verify exact model slug at implementation time).

---
*Architecture research for: HealthTracker v2.0 Duo Redesign — integration of new features onto existing codebase*
*Researched: 2026-08-08*
