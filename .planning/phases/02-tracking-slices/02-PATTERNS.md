# Phase 2: Tracking Slices — Pattern Map

**Mapped:** 2026-04-20
**Phase directory:** `.planning/phases/02-tracking-slices`
**Files classified:** 43 (6 services + 5 feature hooks.ts + 5 schema files + 2 routes modified + 2 primitive libs + 1 lib extension + 3 shadcn components + 1 ui primitive + 1 main.tsx modified + 17 feature components + 1 shared `ProgressBar`)
**Analogs found in Phase 1 codebase:** 40 / 43 (3 files — sheet.tsx upgrade, main.tsx patch, package.json — are strict structural mutations, not "net-new file needs analog")

---

## Conventions Cheat Sheet

**Read this before anything else.** All downstream plans must honor these contracts.

### Path alias
- `@/*` resolves to `./src/*` (configured in `tsconfig.app.json` lines 22-24).
- Every new file MUST use `@/` imports for cross-directory references. Example: `import { db } from '@/db/db';` — NOT `import { db } from '../../db/db';`.
- Relative imports (`./foo`) allowed ONLY within the same directory (e.g. `features/food/FoodSheet.tsx` → `import { FoodPicker } from './FoodPicker';`).

### Naming
- **Services:** `camelCaseDomain.svc.ts` — `goals.svc.ts`, `pt.svc.ts`, `food.svc.ts`, `meals.svc.ts`, `steps.svc.ts`, `lifts.svc.ts`. Located at `src/services/`.
- **Feature hooks:** literal filename `hooks.ts` inside each `src/features/<domain>/` directory (no per-file camelCase).
- **Feature components:** `PascalCase.tsx` inside `src/features/<domain>/`. Examples: `PTSection.tsx`, `FoodSheet.tsx`, `GoalsForm.tsx`.
- **Zod schemas:** Phase 2 RESEARCH.md does NOT prescribe a separate `lib/schemas/` directory. Schemas live inline at the top of their consuming form component (see `src/features/settings/GoalsForm.tsx` example in RESEARCH Pattern 2, lines 400-414). **Keep this convention** unless a schema is reused across multiple components, in which case colocate it with the service (e.g. `meals.schemas.ts` next to `meals.svc.ts`).
- **Shared primitive components:** PascalCase at `src/components/ProgressBar.tsx` (next to AppShell/TabBar/Banner).
- **Shadcn primitives:** lowercase at `src/components/ui/sheet.tsx` (matches existing Phase 1 `button.tsx`, `card.tsx`).

### Service function signature shape
Services receive `dayKey: string` as a parameter — they NEVER derive it internally. `new Date()` is forbidden inside a service (only `Date.now()` for epoch-ms timestamps is allowed). The `dayKey` parameter is produced by callers via `todayKey()` from `@/lib/dayKey`.

Canonical shapes (verified against RESEARCH.md Patterns 1, 5, 7, 10 and existing `schema.ts`):
```typescript
// Read (reactive — used by useLiveQuery)
export function getTodayEntries(dayKey: string): Promise<MealEntry[]>;
export function getGoals(): Promise<Goals | undefined>;
export function getLastSessionForTemplate(templateId: string, excludeSessionId?: string): Promise<PTSession | undefined>;

// Write — takes a parameter object OR a fully-formed record (whichever is ergonomic)
export async function logMeal(params: { food: Food; servings: number; bucket: MealBucket; dayKey: string }): Promise<void>;
export async function upsertSteps(dayKey: string, count: number): Promise<void>;
export async function toggleLift(dayKey: string): Promise<void>;
export async function saveSession(session: PTSession): Promise<void>;
export async function createFood(params: { name; calories; proteinG; carbsG; fatG; servingLabel; photoFile? }): Promise<Food>;
```

### ID generation
- `crypto.randomUUID()` for all UUID-keyed records (`PTTemplate.id`, `PTSession.id`, `Food.id`, `MealEntry.id`). Verified usage in Phase 1 `photoStore.ts:22`.
- Never `Math.random()`, never an incrementing counter.

### Timestamps
- `Date.now()` (epoch ms, number) for `loggedAt`, `createdAt`, `updatedAt`.
- `todayKey()` from `@/lib/dayKey` for `dayKey` (YYYY-MM-DD string).
- `inferBucket()` (new in this phase) for `MealBucket` — colocated in `lib/dayKey.ts`.

### Imports block ordering (matches Phase 1 `InstallBanner.tsx`, `SettingsScreen.tsx`, `main.tsx`)
1. React / react-dom
2. Third-party (dexie-react-hooks, lucide-react, react-hook-form, zod, @hookform/resolvers)
3. `@/db/*` types
4. `@/lib/*` utilities
5. `@/services/*.svc`
6. `@/components/*` and `@/components/ui/*`
7. `@/features/<sibling>/*`
8. Same-directory relative imports (`./...`)

### Project-breaking rules (enforced by CLAUDE.md §"Project-Breaking Rules")
1. **No non-IDB `await` inside a Dexie transaction.** Write photo BEFORE opening transaction. See `db.ts:30-42` header comment.
2. **No `toISOString().split('T')[0]`.** Only `todayKey()` / `dateToKey()` / `keyToDate()` from `@/lib/dayKey`.
3. **Photos → OPFS, never Dexie blobs.** `foods.photoKey` stores only a filename string.
4. **Schema v1 stays intact.** Do NOT bump `db.version()` in Phase 2.

### Error-handling pattern (Phase 1 convention)
Silent + `console.error` for non-critical failures. No user-facing toasts in Phase 2. Observed in Phase 1 `main.tsx:38-40` (storage.persist), `photoStore.ts` (no try/catch internally — caller handles).

```typescript
try {
  await nonCriticalOperation();
} catch (err) {
  console.error('[module] description', err);
  // Continue silently — UI re-renders via useLiveQuery
}
```

---

## File Classification

### Services (all NEW — `src/services/`)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/services/goals.svc.ts` | service | CRUD (singleton get/put) | `src/lib/installMode.ts` (module-level side-effect + exported fns) + `src/db/db.ts` import surface | role-match (no existing svc) |
| `src/services/pt.svc.ts` | service | CRUD + query | `src/lib/photoStore.ts` (encapsulates a data store behind typed functions) | role-match |
| `src/services/food.svc.ts` | service | CRUD + OPFS orchestration | `src/lib/photoStore.ts` (the OPFS pipeline it consumes) | exact flow-match (photo write → Dexie write) |
| `src/services/meals.svc.ts` | service | CRUD + denormalized-total aggregation | `src/lib/photoStore.ts` pattern structure | role-match |
| `src/services/steps.svc.ts` | service | upsert (natural key) | `src/lib/photoStore.ts` pattern structure | role-match |
| `src/services/lifts.svc.ts` | service | upsert (natural key) | `src/lib/photoStore.ts` pattern structure | role-match |

### Feature hooks (all NEW — `src/features/<domain>/hooks.ts`)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/pt/hooks.ts` | hook | reactive read via useLiveQuery | (none in Phase 1 — useLiveQuery not yet used) | RESEARCH-driven |
| `src/features/food/hooks.ts` | hook | reactive read via useLiveQuery | RESEARCH.md Pattern 1, lines 375-387 | RESEARCH-driven |
| `src/features/steps/hooks.ts` | hook | reactive read via useLiveQuery | same | RESEARCH-driven |
| `src/features/lifts/hooks.ts` | hook | reactive read via useLiveQuery | same | RESEARCH-driven |
| `src/features/settings/hooks.ts` | hook | reactive read via useLiveQuery | same | RESEARCH-driven |

### Lib extensions (MODIFY)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/lib/dayKey.ts` (MODIFY — add `inferBucket`) | primitive | pure transform | existing file itself (append-only extension) | exact |

### Routes (MODIFY)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/routes/TodayScreen.tsx` (MODIFY) | route | composition | `src/routes/TodayScreen.tsx` (keep frame, swap section contents) | exact (self-reference) |
| `src/routes/SettingsScreen.tsx` (MODIFY) | route | composition | `src/routes/SettingsScreen.tsx` (insert before `<div className="flex-1"/>`) | exact (self-reference) |
| `src/main.tsx` (MODIFY) | startup | initialization step | `src/main.tsx:33-41` (storage.persist step pattern) | exact (self-reference) |

### Shadcn UI primitive (MODIFY — UPGRADE)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/components/ui/sheet.tsx` | shadcn | overwritten by `npx shadcn@latest add sheet` | Phase 1 stub itself (same API surface) | upgrade, not net-new |

### Shared component (NEW)

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/components/ProgressBar.tsx` | primitive | pure view | `src/components/ui/card.tsx` (forwardRef + cn() + Tailwind class composition) | role-match + UI-SPEC geometry |

### Feature components — `src/features/` (all NEW)

**PT feature**
| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/pt/PTSection.tsx` | component | event-driven (tap → open Sheet) + reactive read | `src/routes/TodayScreen.tsx:22-28` (card frame) + RESEARCH Example A | exact frame |
| `src/features/pt/PTSheet.tsx` | sheet container | composition | Phase 1 `src/components/ui/sheet.tsx` (stub API surface) + RESEARCH Pattern 3 | sheet-pattern |
| `src/features/pt/PTTemplateList.tsx` | component | reactive read | `src/routes/TodayScreen.tsx` map-render pattern | role-match |
| `src/features/pt/PTTemplateEditor.tsx` | form (nested Sheet) | form-submit + array field | RESEARCH Pattern 2 + 4 | RESEARCH-driven |
| `src/features/pt/PTSessionForm.tsx` | form | form-submit + useFieldArray | RESEARCH Example C, lines 1065-1160 | RESEARCH-driven |
| `src/features/pt/PTExerciseRow.tsx` | component | stateless row render | RESEARCH Example C (per-exercise block lines 1110-1151) | RESEARCH-driven |
| `src/features/pt/PainRating.tsx` | component | controlled radio-group | UI-SPEC §"Pain rating", see below | UI-SPEC |

**Food feature**
| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/food/FoodSection.tsx` | component | event-driven + reactive read | RESEARCH Example A, lines 942-988 | exact |
| `src/features/food/FoodSheet.tsx` | sheet container | composition | RESEARCH Pattern 3 | sheet-pattern |
| `src/features/food/MacroTotalsBar.tsx` | component | reactive read | UI-SPEC §"Sticky macro totals bar" + `ProgressBar` use | UI-SPEC |
| `src/features/food/QuickLogChip.tsx` | component | event-driven (tap → re-log) | `src/components/ui/button.tsx` (cva variants + forwardRef) | role-match |
| `src/features/food/QuickLogChipRow.tsx` | component | reactive read + horizontal-scroll layout | UI-SPEC §"Quick-log chip row" | UI-SPEC |
| `src/features/food/FoodPicker.tsx` | component | search + create-trigger | UI-SPEC copywriting + RESEARCH §1 | UI-SPEC + RESEARCH |
| `src/features/food/FoodCreateForm.tsx` | form | RHF+Zod + photo-pipeline | RESEARCH Patterns 2 + 5 | RESEARCH-driven |
| `src/features/food/TodayMealList.tsx` | component | reactive read + grouped render | UI-SPEC §"Inline-edit meal row" | UI-SPEC |
| `src/features/food/MealEntryRow.tsx` | component | expand/collapse inline-edit | UI-SPEC §"Inline-edit meal row" | UI-SPEC |
| `src/features/food/FoodThumb.tsx` | component | Object URL lifecycle | RESEARCH Pattern 6, lines 613-645 | RESEARCH-driven |

**Steps feature**
| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/steps/StepsSection.tsx` | component | event-driven | `src/routes/TodayScreen.tsx:22-28` + `FoodSection` pattern | role-match |
| `src/features/steps/StepsInlineInput.tsx` | component | blur-to-save controlled input | RESEARCH Example E, lines 1215-1260 | exact |

**Lift feature**
| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/lifts/LiftSection.tsx` | component | inline toggle | `src/routes/TodayScreen.tsx:22-28` + `StepsSection` | role-match |
| `src/features/lifts/LiftToggle.tsx` | component | tap → service mutation | UI-SPEC §"Lift card (inline, D-02)" | UI-SPEC |
| `src/features/lifts/LiftNoteInput.tsx` | component | blur-to-save note | `StepsInlineInput` pattern (RESEARCH Example E) | role-match |

**Settings feature**
| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/features/settings/GoalsForm.tsx` | form | RHF+Zod single-schema | RESEARCH Pattern 2 / Example at lines 400-455 | exact |

---

## Pattern Assignments

### `src/services/goals.svc.ts` (service, CRUD singleton)

**Analog:** `src/lib/photoStore.ts` (module-level helper style) + RESEARCH Example D, lines 1165-1189.

**Imports pattern** (copy verbatim):
```typescript
import { db } from '@/db/db';
import type { Goals } from '@/db/schema';
```
Reasoning: matches `src/db/db.ts:3-11` `import type { ... } from './schema'` style.

**Core pattern — seed-if-absent (idempotent on startup)** (from RESEARCH lines 1174-1179, verified against `schema.ts:81-89`):
```typescript
const SINGLETON_ID = 'singleton';
const DEFAULTS = { calories: 2000, proteinG: 180, carbsG: 180, fatG: 65, steps: 8000 };

export async function seedGoalsIfAbsent(): Promise<void> {
  const existing = await db.goals.get(SINGLETON_ID);
  if (existing) return;
  const goals: Goals = { id: SINGLETON_ID, ...DEFAULTS, updatedAt: Date.now() };
  await db.goals.put(goals);
}

export function getGoals(): Promise<Goals | undefined> {
  return db.goals.get(SINGLETON_ID);
}

export async function saveGoals(input: Omit<Goals, 'id' | 'updatedAt'>): Promise<void> {
  const goals: Goals = { id: SINGLETON_ID, ...input, updatedAt: Date.now() };
  await db.goals.put(goals);
}
```

**Error handling:** none at this layer — `put` is a single-statement auto-txn; callers in `initApp()` wrap with try/catch per the `main.tsx:36-41` pattern.

---

### `src/services/pt.svc.ts` (service, CRUD + indexed range query)

**Analog:** `schema.ts:11-38` (record shapes) + RESEARCH Pattern 10, lines 746-770.

**Imports pattern:**
```typescript
import { db } from '@/db/db';
import type { PTTemplate, PTSession } from '@/db/schema';
```

**Core pattern — reverse-indexed query for previous session** (RESEARCH 749-758, uses `ptSessions.templateId` index declared in `db.ts:58`):
```typescript
export async function getLastSessionForTemplate(
  templateId: string,
  excludeSessionId?: string,
): Promise<PTSession | undefined> {
  const sessions = await db.ptSessions
    .where('templateId').equals(templateId)
    .reverse()
    .sortBy('loggedAt');
  return sessions.find(s => s.id !== excludeSessionId);
}
```

**Template CRUD shape:**
```typescript
export async function createTemplate(input: Omit<PTTemplate, 'id' | 'createdAt'>): Promise<PTTemplate> {
  const template: PTTemplate = { id: crypto.randomUUID(), ...input, createdAt: Date.now() };
  await db.ptTemplates.put(template);
  return template;
}

export async function updateTemplate(template: PTTemplate): Promise<void> {
  await db.ptTemplates.put(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.ptTemplates.delete(id);
}

export function getTemplates(): Promise<PTTemplate[]> {
  return db.ptTemplates.orderBy('createdAt').toArray();
}
```

**Save session** (D-11 passes full `PTSession` object from RHF):
```typescript
export async function saveSession(session: PTSession): Promise<void> {
  await db.ptSessions.put(session);
}

export function getTodaySessions(dayKey: string): Promise<PTSession[]> {
  return db.ptSessions.where('dayKey').equals(dayKey).sortBy('loggedAt');
}
```

**Helper — relative time formatter** (RESEARCH Pattern 10, lines 761-770):
```typescript
export function formatRelativeDays(loggedAt: number): string {
  const now = Date.now();
  const days = Math.floor((now - loggedAt) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 14)  return '1 week ago';
  if (days < 30)  return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
```

---

### `src/services/food.svc.ts` (service, CRUD + OPFS orchestration)

**Analog:** `src/lib/photoStore.ts:51-75` (`resizePhoto`) + `:21-29` (`savePhoto`) + RESEARCH Pattern 5 lines 554-605.

**CRITICAL Pitfall #1 compliance — photo write BEFORE transaction:**
```typescript
import { db } from '@/db/db';
import type { Food } from '@/db/schema';
import { resizePhoto, savePhoto, deletePhoto } from '@/lib/photoStore';

export async function createFood(params: {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string;
  photoFile?: File | null;
}): Promise<Food> {
  const { photoFile, ...rest } = params;

  // Step 1 — photo pipeline BEFORE any Dexie transaction (Pitfall #1, CLAUDE.md rule #1)
  let photoKey: string | undefined;
  if (photoFile) {
    try {
      const resized = await resizePhoto(photoFile);   // 800×800 WebP@80% (photoStore.ts:51-75)
      photoKey = await savePhoto(resized);            // OPFS write (photoStore.ts:21-29)
    } catch (err) {
      console.error('[food.svc] photo save failed', err);
      photoKey = undefined;  // silent fallback per UI-SPEC
    }
  }

  // Step 2 — Dexie write (single-statement; Dexie auto-transactions, no explicit tx needed)
  const food: Food = {
    id: crypto.randomUUID(),
    ...rest,
    photoKey,
    createdAt: Date.now(),
  };
  await db.foods.put(food);
  return food;
}

export async function deleteFood(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;
  if (food.photoKey) {
    try { await deletePhoto(food.photoKey); }
    catch (err) { console.error('[food.svc] photo delete failed', err); }
  }
  await db.foods.delete(id);
}

export function searchFoods(query: string): Promise<Food[]> {
  // Substring in-memory per Claude's Discretion in CONTEXT.md D-05
  const q = query.toLowerCase();
  return db.foods.orderBy('name').toArray()
    .then(all => q ? all.filter(f => f.name.toLowerCase().includes(q)) : all);
}
```

---

### `src/services/meals.svc.ts` (service, CRUD + denormalized aggregation)

**Analog:** RESEARCH Patterns 1 + 7, lines 314-368 and 657-694. Uses `MealEntry` computed-total schema from `schema.ts:54-66`.

**Core denormalization pattern** (FOOD-06 — copy from RESEARCH lines 334-368):
```typescript
import { db } from '@/db/db';
import type { Food, MealEntry, MealBucket } from '@/db/schema';

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export async function logMeal(params: {
  food: Food;
  servings: number;
  bucket: MealBucket;
  dayKey: string;
}): Promise<void> {
  const { food, servings, bucket, dayKey } = params;
  const entry: MealEntry = {
    id: crypto.randomUUID(),
    dayKey,
    foodId: food.id,
    servings,
    bucket,
    loggedAt: Date.now(),
    computedCalories: food.calories * servings,
    computedProteinG: food.proteinG * servings,
    computedCarbsG:   food.carbsG   * servings,
    computedFatG:     food.fatG     * servings,
  };
  await db.mealEntries.put(entry);
}

export function getTodayEntries(dayKey: string): Promise<MealEntry[]> {
  return db.mealEntries.where('dayKey').equals(dayKey).sortBy('loggedAt');
}

export async function getDailyTotals(dayKey: string): Promise<DailyTotals> {
  const entries = await db.mealEntries.where('dayKey').equals(dayKey).toArray();
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.computedCalories,
      proteinG: acc.proteinG + e.computedProteinG,
      carbsG:   acc.carbsG   + e.computedCarbsG,
      fatG:     acc.fatG     + e.computedFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
```

**Recent/Frequent — copy from RESEARCH lines 657-694:**
```typescript
const THIRTY_DAYS_MS = 30 * 86_400_000;

export async function getRecentFoods(limit = 10): Promise<Food[]> {
  const entries = await db.mealEntries.orderBy('loggedAt').reverse().toArray();
  const seen = new Set<string>();
  const orderedIds: string[] = [];
  for (const e of entries) {
    if (seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    orderedIds.push(e.foodId);
    if (orderedIds.length >= limit) break;
  }
  if (orderedIds.length === 0) return [];
  const foods = await db.foods.bulkGet(orderedIds);
  return foods.filter((f): f is Food => f !== undefined);
}

export async function getFrequentFoods(limit = 8): Promise<Food[]> {
  const since = Date.now() - THIRTY_DAYS_MS;
  const entries = await db.mealEntries.where('loggedAt').above(since).toArray();
  const counts = new Map<string, number>();
  for (const e of entries) counts.set(e.foodId, (counts.get(e.foodId) ?? 0) + 1);
  const orderedIds = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);
  if (orderedIds.length === 0) return [];
  const foods = await db.foods.bulkGet(orderedIds);
  return foods.filter((f): f is Food => f !== undefined);
}

export async function getLastServingsForFood(foodId: string): Promise<number | undefined> {
  const entries = await db.mealEntries.where('foodId').equals(foodId).reverse().sortBy('loggedAt');
  return entries[0]?.servings;
}
```

**Edit/delete** (D-20 locks scope to servings + bucket only):
```typescript
export async function updateMealEntry(id: string, patch: { servings: number; bucket: MealBucket }): Promise<void> {
  const existing = await db.mealEntries.get(id);
  if (!existing) return;
  const food = await db.foods.get(existing.foodId);
  if (!food) return;
  const updated: MealEntry = {
    ...existing,
    servings: patch.servings,
    bucket: patch.bucket,
    // Recompute denormalized totals (FOOD-06)
    computedCalories: food.calories * patch.servings,
    computedProteinG: food.proteinG * patch.servings,
    computedCarbsG:   food.carbsG   * patch.servings,
    computedFatG:     food.fatG     * patch.servings,
  };
  await db.mealEntries.put(updated);
}

export async function deleteMealEntry(id: string): Promise<void> {
  await db.mealEntries.delete(id);
}
```

---

### `src/services/steps.svc.ts` (service, natural-key upsert)

**Analog:** `schema.ts:68-72` (`StepEntry` natural-key PK).

```typescript
import { db } from '@/db/db';
import type { StepEntry } from '@/db/schema';

export async function upsertSteps(dayKey: string, count: number): Promise<void> {
  const entry: StepEntry = { dayKey, count, loggedAt: Date.now() };
  await db.stepEntries.put(entry);  // natural-key upsert — dayKey is PK
}

export function getStepsForDay(dayKey: string): Promise<StepEntry | undefined> {
  return db.stepEntries.get(dayKey);
}
```

---

### `src/services/lifts.svc.ts` (service, natural-key upsert)

**Analog:** `schema.ts:74-79` (`LiftCheckin` natural-key PK, note the field is `lifted` — not `didLift`; this is the correction flagged in RESEARCH Phase Requirements table LIFT-01).

```typescript
import { db } from '@/db/db';
import type { LiftCheckin } from '@/db/schema';

export async function toggleLift(dayKey: string): Promise<void> {
  const existing = await db.liftCheckins.get(dayKey);
  const next: LiftCheckin = {
    dayKey,
    lifted: !(existing?.lifted ?? false),
    note: existing?.note,
    loggedAt: Date.now(),
  };
  await db.liftCheckins.put(next);
}

export async function setLiftNote(dayKey: string, note: string): Promise<void> {
  const existing = await db.liftCheckins.get(dayKey);
  const next: LiftCheckin = {
    dayKey,
    lifted: existing?.lifted ?? false,
    note: note || undefined,
    loggedAt: Date.now(),
  };
  await db.liftCheckins.put(next);
}

export function getLiftForDay(dayKey: string): Promise<LiftCheckin | undefined> {
  return db.liftCheckins.get(dayKey);
}
```

---

### `src/lib/dayKey.ts` (MODIFY — append `inferBucket`)

**Analog:** the file itself, specifically `todayKey()` / `dateToKey()` local-getter pattern at lines 10-19.

**Append-only addition** (RESEARCH Pattern 9, lines 732-738):
```typescript
// At the top, add type import
import type { MealBucket } from '@/db/schema';

/**
 * Infer meal bucket from local time per CONTEXT.md D-08.
 * breakfast < 11:00, lunch < 15:00, dinner < 21:00, snack otherwise.
 * Uses getHours() (local) — never getUTCHours() — same reason dayKey uses local getters.
 */
export function inferBucket(date: Date = new Date()): MealBucket {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
```

**Existing contract to preserve:** `todayKey()` / `dateToKey(date)` / `keyToDate(key)` — do not modify.

---

### `src/components/ui/sheet.tsx` (UPGRADE — overwritten by shadcn)

**Analog:** Phase 1 stub at `src/components/ui/sheet.tsx` lines 1-53 (the API surface that must remain).

**Action:** Run `npx shadcn@latest add sheet` inside the repo. The command reads `components.json` (already locked to `new-york` style + `@/components/ui` alias — verified at `/Users/anirudhchatterjee/dev/healthtracker/components.json`) and rewrites this file.

**Post-install mandatory modification** (UI-SPEC anti-motion override, §"Sheet" property table):
After the shadcn install completes, every `SheetContent` consumer passes:
```typescript
className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
```
This disables Radix Dialog's default slide animation per UI-SPEC Interaction & Motion table.

**Preserve from Phase 1 stub:**
- Named exports `Sheet`, `SheetContent`, `SheetTrigger`, `SheetTitle` (API surface already consumed in future feature components).
- Additional exports the real shadcn provides: `SheetHeader`, `SheetFooter`, `SheetDescription`, `SheetClose` — all permitted.

**Pitfall #11 guard:** run `git status` before/after the shadcn command. Expected diff is ONLY `src/components/ui/sheet.tsx` + `package.json` + `package-lock.json`. If `components.json` or unrelated UI files change, revert and re-investigate.

---

### `src/components/ProgressBar.tsx` (NEW — shared primitive)

**Analog (structure):** `src/components/ui/card.tsx:8-17` — `forwardRef` + `cn()` + Tailwind class composition.
**Analog (geometry):** UI-SPEC §"Progress bar component" + RESEARCH Example B, lines 992-1035.

**Imports pattern:**
```typescript
import { cn } from '@/lib/utils';
```

**Core pattern — D-16 zero-target sentinel + D-16 over-target clamp** (copy from RESEARCH 1003-1034):
```typescript
interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;           // "Cal" / "P" / "C" / "F" / "" (Steps card has none)
  ariaLabel?: string;
}

export function ProgressBar({ value, max, label, ariaLabel }: ProgressBarProps) {
  // D-16 zero-target sentinel: render consumed-only, no bar.
  if (max === 0) {
    return (
      <div className="flex items-baseline gap-2">
        {label && <span className="text-xs text-muted w-6">{label}</span>}
        <span className="text-sm text-text tabular-nums">{value}</span>
      </div>
    );
  }

  const percent = Math.min(100, (value / max) * 100);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted w-6">{label}</span>}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={ariaLabel ?? `${label ?? ''} progress`.trim()}
        className="relative h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
```

**No `transition: width`** — enforced by UI-SPEC Interaction & Motion table (instant update, no animation).

---

### Today-card frame components (`PTSection`, `FoodSection`, `StepsSection`, `LiftSection`)

**Analog (card frame):** `src/routes/TodayScreen.tsx:22-28` — VERBATIM:
```typescript
<Card key={title} className="bg-surface border border-border rounded-lg p-4">
  <div className="flex items-baseline justify-between">
    <h2 className="text-base font-semibold text-text">{title}</h2>
    <span className="text-sm text-muted">{status}</span>
  </div>
</Card>
```

**Canonical section component pattern** (PT example — RESEARCH Example A + UI-SPEC §"Today-card status slot"):
```typescript
// src/features/pt/PTSection.tsx
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { PTSheet } from './PTSheet';
import { useTodayPT } from './hooks';

export function PTSection() {
  const [open, setOpen] = useState(false);
  const today = useTodayPT();  // useLiveQuery → PTSession | undefined

  const statusText = today
    ? `${today.templateName ?? 'Session'} · ${today.exercises.filter(e => e.completed).length}/${today.exercises.length} ex`
    : 'not logged yet';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">PT</h2>
            <span className="text-sm text-muted">{statusText}</span>
          </div>
        </Card>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom"
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader><SheetTitle>PT</SheetTitle></SheetHeader>
          <PTSheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

**`FoodSection` extension:** adds 4 stacked `<ProgressBar />` below the card header per UI-SPEC §"Today-card status slot (live layout)" — see RESEARCH Example A lines 970-975.

**`LiftSection` + `StepsSection` — NO Sheet, inline only** per D-02. The Card's status slot renders `<LiftToggle dayKey={todayKey()} />` or `<StepsInlineInput />` directly instead of wrapping the Card in a `<button>`.

---

### `src/features/<domain>/hooks.ts` (NEW — useLiveQuery wrappers)

**Analog:** RESEARCH Pattern 1 at lines 375-387.

**Canonical shape** (applies to all 5 feature hooks.ts files):
```typescript
// src/features/food/hooks.ts
import { useLiveQuery } from 'dexie-react-hooks';
import { getTodayEntries, getDailyTotals, getRecentFoods, getFrequentFoods } from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function useTodayEntries() {
  return useLiveQuery(() => getTodayEntries(todayKey()), []);
}

export function useDailyTotals() {
  return useLiveQuery(() => getDailyTotals(todayKey()), []);
}

export function useRecentFoods() {
  return useLiveQuery(() => getRecentFoods(10), []);
}

export function useFrequentFoods() {
  return useLiveQuery(() => getFrequentFoods(8), []);
}
```

**Dependency-array rule** (Pitfall #7, RESEARCH lines 894-899): empty `[]` is correct ONLY when the query fn reads `todayKey()` internally. If a prop like `dayKey` is passed in, it MUST appear in deps.

**`undefined` handling** (Pattern 8 — UI-SPEC Loading States): consumers render zero-state copy when `useLiveQuery` returns `undefined`, not a spinner.

---

### `src/features/settings/GoalsForm.tsx` (form — RHF + Zod)

**Analog:** RESEARCH Pattern 2 (lines 400-455) and Pattern Example, verbatim.

**Key RHF rules** (RESEARCH lines 459-462, Pitfall #4, Pitfall #5):
1. `{ valueAsNumber: true }` on every number `register()` call.
2. `values: current ? {...} : undefined` — NOT `defaultValues` — so form re-syncs when `useLiveQuery` resolves.
3. `formState.errors` is lazily subscribed; only destructure fields you access.

**Schema (inline, top of file):**
```typescript
const goalsSchema = z.object({
  calories: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  proteinG: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  carbsG:   z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  fatG:     z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  steps:    z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
});
type GoalsInput = z.infer<typeof goalsSchema>;
```

**Copy labels verbatim from UI-SPEC §"Goals form (Settings)":** `Daily goals`, `Calories`, `Protein (g)`, `Carbs (g)`, `Fat (g)`, `Steps`, `Save goals`.

**Destructive-color for errors:** inline `style={{ color: '#ef4444' }}` (UI-SPEC §"Destructive color" first-use declaration — do not use a Tailwind class because no `destructive` color token is registered in `tokens.css` yet).

---

### `src/features/food/FoodCreateForm.tsx` (form — RHF + Zod + photo pipeline)

**Analog:** RESEARCH Pattern 5 (service side, lines 559-592) + Pattern 2 (RHF shape).

**Critical ordering — photo THEN Dexie** (Pitfall #1):
```typescript
const onSubmit = async (data: FoodCreateInput) => {
  const photoFile = data.photoFile?.[0] ?? null;  // RHF FileList → File
  // Photo + Dexie happen inside createFood() — that's the correct pipeline.
  // Do NOT open db.transaction() here.
  const food = await createFood({ ...data, photoFile });
  // D-06: also log a MealEntry for today using the just-created food
  await logMeal({ food, servings: data.initialServings ?? 1, bucket: inferBucket(), dayKey: todayKey() });
  onClose();
};
```

**Photo capture input element** (D-07, UI-SPEC copy):
```typescript
<input type="file" accept="image/*" capture="environment" {...register('photoFile')} />
```

---

### `src/features/food/FoodThumb.tsx` (component — OPFS Object URL lifecycle)

**Analog:** RESEARCH Pattern 6 lines 613-645 — copy verbatim.

**Critical memory-leak guard** (Pitfall #3): create Object URL inside `useEffect`, revoke in cleanup. Never inline `URL.createObjectURL()` in JSX.

---

### `src/features/pt/PTSessionForm.tsx` (form — RHF useFieldArray, no Zod)

**Analog:** RESEARCH Example C, lines 1040-1160.

**Key deviation from other forms:** per D-19 and RESEARCH lines 1041-1042, PT session has **no Zod schema** — every field is optional. Use `useForm<FormValues>` without a resolver. Fields persist only when user taps Save (D-19 — form-local until save, no Dexie drafts).

**`useFieldArray` for exercises:**
```typescript
const { register, handleSubmit, control } = useForm<FormValues>({ values: { ... } });
const { fields } = useFieldArray({ control, name: 'exercises' });
```

**`values` (not `defaultValues`)** because template exercises arrive from `useLiveQuery` — same Pitfall #5 as Goals form.

---

### `src/features/steps/StepsInlineInput.tsx` (component — blur-to-save)

**Analog:** RESEARCH Example E, lines 1212-1260 — copy verbatim. All the tricky parts (ref-focus in queueMicrotask, Escape cancel, Enter-blurs, parseInt guard) are already worked out.

---

### `src/routes/TodayScreen.tsx` (MODIFY — replace sections)

**Analog:** itself at lines 12-32.

**Current frame to preserve:**
```typescript
<div className="px-4 py-6 space-y-4">
  {/* Phase 1 hard-coded sections replaced by 4 live components */}
</div>
```

**Phase 2 replacement** (D-05 locked; card frame is identical per Phase 1 UI-SPEC):
```typescript
import { PTSection } from '@/features/pt/PTSection';
import { FoodSection } from '@/features/food/FoodSection';
import { StepsSection } from '@/features/steps/StepsSection';
import { LiftSection } from '@/features/lifts/LiftSection';

export function TodayScreen() {
  return (
    <div className="px-4 py-6 space-y-4">
      <PTSection />
      <FoodSection />
      <StepsSection />
      <LiftSection />
    </div>
  );
}
```

---

### `src/routes/SettingsScreen.tsx` (MODIFY — insert GoalsForm)

**Analog:** itself at lines 20-59. Phase 2 inserts `<GoalsForm />` between the Install card (ends line 50) and the `<div className="flex-1" />` spacer (line 52).

**Exact injection point:**
```typescript
{!installed && (
  <Card className="bg-surface border border-border rounded-lg p-4">
    {/* Install card unchanged */}
  </Card>
)}

<GoalsForm />  {/* ← INSERT HERE per CONTEXT.md §Integration Points */}

<div className="flex-1" />

<p className="text-xs text-muted text-center">
  v{APP_VERSION} (build {BUILD_HASH})
</p>
```

---

### `src/main.tsx` (MODIFY — add goals seed)

**Analog:** itself at lines 33-41 (the `navigator.storage.persist()` try/catch — same pattern: init step with silent-failure guard).

**Injection point:** After step 6 (dayKey smoke, line 53) and BEFORE step 7 (`createRoot` render, line 57). Per RESEARCH Example D lines 1191-1210:

```typescript
import { seedGoalsIfAbsent } from './services/goals.svc';  // add to imports

// ...inside initApp(), after the dev-only smoke dynamic import...

// Step 6.5 (NEW) — D-13: ensure goals singleton exists before render.
// Dexie opens lazily here on first DB access; awaited so useLiveQuery fires with data.
try {
  await seedGoalsIfAbsent();
} catch (err) {
  console.error('[initApp] goals seed failed', err);
}

// Step 7 — render (unchanged).
createRoot(document.getElementById('root')!).render(...);
```

---

## Shared Patterns

### Cross-cutting: Sheet component consumption pattern

**Source:** `src/components/ui/sheet.tsx` (post-upgrade) + RESEARCH Pattern 3, lines 470-513.
**Apply to:** `PTSection`, `FoodSection`, `PTSheet` (for nested template editor — Pattern 4), `FoodSheet`.

**Boilerplate every Sheet consumer writes:**
```typescript
const [open, setOpen] = useState(false);

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent
    side="bottom"
    className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
  >
    <SheetHeader><SheetTitle>{COPY.sheetTitle}</SheetTitle></SheetHeader>
    {/* body */}
  </SheetContent>
</Sheet>
```

**Anti-motion override is NON-NEGOTIABLE** — UI-SPEC Interaction & Motion table locks this.

---

### Cross-cutting: RHF + Zod form pattern

**Source:** RESEARCH Patterns 2 + Example E (Goals) at lines 395-455.
**Apply to:** `GoalsForm`, `FoodCreateForm`, `PTTemplateEditor`. (`PTSessionForm` exempt — uses RHF without a resolver per D-19.)

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ /* ... */ });
type Input = z.infer<typeof schema>;

const { register, handleSubmit, formState: { errors } } = useForm<Input>({
  resolver: zodResolver(schema),
  values: externalData ? { /* ...externalData... */ } : undefined,  // NOT defaultValues
});

<input {...register('numField', { valueAsNumber: true })} />  // ALWAYS for number inputs
```

**Four rules this pattern embeds** (from RESEARCH Pitfalls 4 + 5):
1. `valueAsNumber: true` on every numeric register.
2. `values` (not `defaultValues`) for async-sourced initial state.
3. `formState.errors` is lazily subscribed.
4. Input binding uses `{...register('name')}` spread (uncontrolled).

---

### Cross-cutting: useLiveQuery reactive read pattern

**Source:** RESEARCH Pattern 1 + Pattern 8.
**Apply to:** All feature hooks, all Today card status renders.

```typescript
const data = useLiveQuery(() => service.fn(todayKey()), []);
// ↓ Zero-state placeholder when undefined — NEVER a spinner (UI-SPEC Loading States)
const display = data?.field ?? 0;
```

---

### Cross-cutting: dayKey as a function parameter

**Source:** `src/lib/dayKey.ts:10-19` + CLAUDE.md project-breaking rule #3.
**Apply to:** Every service write fn (`logMeal`, `upsertSteps`, `toggleLift`, `saveSession`).

**Signature contract:** services NEVER call `new Date()` internally. `dayKey: string` is always a parameter. Callers produce it via `todayKey()`.

```typescript
// Correct
await upsertSteps(todayKey(), count);

// FORBIDDEN
await upsertSteps(count);  // service would derive key internally → Pitfall #4
```

Grep-level guard (documented in RESEARCH Pitfall 2 line 847): `grep -rn 'new Date(' src/` outside `lib/dayKey.ts` should return only `Date.now()` usages.

---

### Cross-cutting: Silent-error pattern

**Source:** `src/main.tsx:36-41` (storage.persist try/catch) + `src/lib/dayKey.smoke.ts` (console.assert).
**Apply to:** All non-critical Dexie writes, all OPFS I/O outside the photo pipeline hot path.

```typescript
try {
  await nonCriticalOp();
} catch (err) {
  console.error('[module-name] description', err);
  // Continue; UI re-renders via useLiveQuery with whatever state survived
}
```

**No user-facing toasts in Phase 2** — UI-SPEC Interaction & Motion + Error States tables are explicit on this.

---

### Cross-cutting: `cn()` class composition

**Source:** `src/lib/utils.ts:1-7` + every existing `components/ui/*.tsx` usage.
**Apply to:** All new shared components (`ProgressBar`, `QuickLogChip`, `PainRating`) that accept a `className` prop.

```typescript
import { cn } from '@/lib/utils';

export function MyComponent({ className, ...props }: Props) {
  return <div className={cn('default-classes here', className)} {...props} />;
}
```

---

### Cross-cutting: `forwardRef` for low-level UI primitives

**Source:** `src/components/ui/card.tsx:8-17`, `src/components/ui/button.tsx:41-46`.
**Apply to:** `ProgressBar` (if it needs a ref — otherwise skip), `QuickLogChip` (yes, for focus management inside Sheet).

```typescript
export const QuickLogChip = React.forwardRef<HTMLButtonElement, QuickLogChipProps>(
  ({ className, ...props }, ref) => (
    <button ref={ref} type="button" className={cn(/* ... */, className)} {...props} />
  ),
);
QuickLogChip.displayName = 'QuickLogChip';
```

---

### Cross-cutting: `cva` variants for multi-style components

**Source:** `src/components/ui/button.tsx:9-35` — the only existing use.
**Apply to:** If `QuickLogChip` ends up needing variants (resting / highlighted) — otherwise Tailwind utilities inline are sufficient. For Phase 2, `QuickLogChip` likely does NOT need `cva` (UI-SPEC §"Quick-log chip" has one state).

**Do NOT invent variants** where UI-SPEC specifies one visual state.

---

## No Analog Found

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| `src/features/pt/PainRating.tsx` | component (custom radio-group pattern) | controlled radio | No existing radio-group primitive in Phase 1 | Use RESEARCH `Don't Hand-Roll` table line: 4 `<button>`s with `role="radiogroup"` + `role="radio" aria-checked`. UI-SPEC §"Pain rating" specifies 40×40 pills. |
| `src/features/food/QuickLogChip.tsx` | component (pill-button) | tap → event | No pill/chip primitive in Phase 1 (Button is squared) | Build from plain `<button>` + `cn()` + UI-SPEC §"Quick-log chip" dimensions (h-10, px-3, rounded-full, bg-surface, border-border). |
| `src/features/food/QuickLogChipRow.tsx` | layout (horizontal scroll) | composition | No horizontal-scroll container exists | Use UI-SPEC §"Quick-log chip row" verbatim: `flex overflow-x-auto gap-2 px-4 py-1`. Optional mask fade. |
| `src/features/food/MacroTotalsBar.tsx` | component (sticky sub-header) | reactive read + 4× ProgressBar | No sticky-sub-header exists in Phase 1 | UI-SPEC §"Sticky macro totals bar" specifies `sticky top-0`, h=56px, `bg-surface` opaque, 4 flex-1 columns with `divide-x divide-border`. Compose with `<ProgressBar />`. |
| `src/features/food/MealEntryRow.tsx` | component (expand/collapse) | controlled expansion state | No inline-edit pattern in Phase 1 | UI-SPEC §"Inline-edit meal row" specifies resting + edit modes + kbd handling. |
| `package.json` additions | config | install deps | Not a code file — plan authors run `npm install react-hook-form zod @hookform/resolvers` + `npx shadcn@latest add sheet`. Verified deps in RESEARCH version table (lines 142-147). |

---

## Metadata

**Analog search scope:** `src/db`, `src/lib`, `src/components`, `src/components/ui`, `src/routes`, `src/styles` — Phase 1's entire 23-file `src/` tree per `.planning/phases/01-foundation/01-VERIFICATION.md`.

**Files scanned (Read-tool, no duplicate ranges):**
- `src/db/db.ts` — 69 lines (transaction-rule header, schema version block)
- `src/db/schema.ts` — 90 lines (all 7 record interfaces)
- `src/lib/dayKey.ts` — 26 lines (todayKey/dateToKey/keyToDate)
- `src/lib/dayKey.smoke.ts` — 36 lines (dev-only tripwire)
- `src/lib/photoStore.ts` — 76 lines (OPFS pipeline)
- `src/lib/utils.ts` — 7 lines (cn helper)
- `src/lib/installMode.ts` — 62 lines (module-level side-effect helper pattern)
- `src/components/ui/sheet.tsx` — 53 lines (Phase 1 stub; upgraded in Phase 2)
- `src/components/ui/button.tsx` — 49 lines (cva variants + forwardRef)
- `src/components/ui/card.tsx` — 43 lines (forwardRef + cn composition)
- `src/components/AppShell.tsx` — 50 lines (layout composition)
- `src/components/TabBar.tsx` — 49 lines (NavLink pattern; reference only — Phase 2 doesn't add tabs)
- `src/components/Banner.tsx` — 67 lines (Card composition)
- `src/components/EvictionBanner.tsx` — 83 lines (state + effect pattern)
- `src/components/InstallBanner.tsx` — 82 lines (state + effect pattern)
- `src/routes/TodayScreen.tsx` — 33 lines (4-card frame — load-bearing analog for all Section components)
- `src/routes/SettingsScreen.tsx` — 60 lines (injection point for GoalsForm)
- `src/routes/CalendarScreen.tsx` — 12 lines (reference only — Phase 3 work)
- `src/App.tsx` — 23 lines (router composition)
- `src/main.tsx` — 69 lines (initApp sequence — injection point for goals seed)
- `src/styles/tokens.css` — 22 lines (accent palette ramp for future phases)
- `src/styles/index.css` — 28 lines (theme directive, safe-area classes)
- `tsconfig.app.json` — 29 lines (path alias confirmed)
- `components.json` — confirmed shadcn config for `npx add sheet`

**Key convention sources (by file):**
- `@/` path alias: `tsconfig.app.json:22-24`
- `cn()` helper: `src/lib/utils.ts:6`
- `forwardRef + displayName`: `src/components/ui/card.tsx:8-17`, `button.tsx:41-46`
- `crypto.randomUUID()`: `src/lib/photoStore.ts:22`
- `console.error` silent-error: `src/main.tsx:36-41`
- Dexie transaction rule comment: `src/db/db.ts:30-43`
- Append-only schema comment: `src/db/db.ts:13-28`

**Pattern extraction date:** 2026-04-20

---

## PATTERN MAPPING COMPLETE
