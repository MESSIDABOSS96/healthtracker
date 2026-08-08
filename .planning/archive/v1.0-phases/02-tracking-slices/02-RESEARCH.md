# Phase 2: Tracking Slices — Research

**Researched:** 2026-04-20
**Domain:** Local IndexedDB PWA — reactive feature logging with Dexie `useLiveQuery`, Radix-backed bottom Sheets, React Hook Form + Zod, OPFS photo capture
**Confidence:** HIGH (all library APIs verified via Context7 / official docs / installed node_modules; CONTEXT.md and UI-SPEC lock almost every design decision)

---

## Summary

Phase 2 is a **stack-already-picked, design-already-locked** phase. CONTEXT.md D-01..D-16 and UI-SPEC (both approved 2026-04-20) resolve virtually every non-trivial decision: the Sheet pattern, Food Sheet layout, PT session structure, goals defaults, zero-target semantics, previous-session-hint copy, anti-motion posture, inline-edit row behavior, copy strings, spacing, typography, color reservations. The planner's remaining work is **ordering and partitioning**, not technical choice-making.

Four NEW dependencies install cleanly: `@radix-ui/react-dialog` (transitively via `npx shadcn@latest add sheet`), `react-hook-form@^7.73`, `zod@^4.3`, `@hookform/resolvers@^5.2`. All are React 19 compatible. The Phase 1 `useLiveQuery` hook from `dexie-react-hooks@1.1.7` is already installed and works with Dexie 4. No stack expansion required beyond these four.

The three biggest pitfalls for Phase 2 are all from PITFALLS.md and CLAUDE.md — none new to this phase, but all newly *load-bearing*: (1) Pitfall #1 (non-IDB await in Dexie transaction) becomes real as services start composing multi-store writes, (2) Pitfall #4 (dayKey UTC drift) becomes real as Food Sheet's meal-bucket auto-inference and Steps upsert both derive keys — must route through `lib/dayKey.ts`, (3) Pitfall #8 (photo resize) — the Phase 1 `photoStore.resizePhoto` already handles this; Food create-form MUST call it before `savePhoto`.

**Primary recommendation:** Structure this phase as **5 plans of ~3 tasks each** — (P1) Foundation (Sheet upgrade, RHF+Zod install, services skeleton, goals seed); (P2) Goals & Settings (blocks P3+P4 — progress bars depend on `goals.svc.ts`); (P3) Food slice (heaviest — Sheet + picker + create-form + photo + inline-edit); (P4) PT slice (independent of Food after P1+P2; Sheet nesting + session form); (P5) Steps + Lift + Today wire-up (thin — inline inputs + 4 feature components on Today). P3 and P4 can run in parallel after P2 lands.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Logging interaction pattern**
- **D-01:** Multi-field sections (PT, Food) open a **bottom Sheet modal** on card tap. Phase 2 upgrades the Phase 1 `Sheet` component stub to the real Radix Dialog-backed shadcn Sheet via `npx shadcn@latest add sheet`.
- **D-02:** Simple sections stay **inline in the card** — no Sheet. Lift: tap `☐` glyph to toggle `☐ ↔ ✓` (persists `LiftCheckin{ dayKey, lifted }` immediately). Steps: tap card status area to reveal inline `<input type="number" inputmode="numeric">`; blur or Enter saves (upsert on `dayKey`).
- **D-03:** Multi-item composition uses **one Sheet with internal stacked list**. PT Sheet renders each template exercise as a row with its own actuals inputs + checkbox; Food Sheet renders picker + today's meal entries below. No nested/multi-step wizards.
- **D-04:** Post-save behavior: Sheet closes immediately on Save → Today card re-renders via `useLiveQuery` with populated status. No success toast, no stay-open state.

**Food logging flow**
- **D-05:** Food Sheet vertical order: (1) daily macro totals bar [sticky], (2) Recent chips row, (3) Frequent chips row, (4) search input, (5) today's logged meal entries grouped by bucket.
- **D-06:** New-food creation inline in picker Sheet. If search returns no results, show "Create '[query]'?" row → opens a create-form. Save writes to `foods` store AND creates a `MealEntry` for today using the just-created food.
- **D-07:** Photo capture via `<input type="file" accept="image/*" capture="environment">`. Captured file flows through `src/lib/photoStore.ts:resizePhoto()` + `savePhoto()` (Phase 1 helpers — WebP@80%, max 800×800, OPFS).
- **D-08:** **Recent** = last 10 foods by `MealEntry.loggedAt` (deduped by `foodId`, keep newest). **Frequent** = top 8 foods by `MealEntry` count where `loggedAt >= now - 30*86400_000`. One-tap chip re-logs with user's last-used `servings` for that food; `bucket` auto-inferred from local time: `breakfast` <11:00, `lunch` <15:00, `dinner` <21:00, `snack` else.

**PT template & session UX**
- **D-09:** Exercises are **embedded inside `PTTemplate.exercises[]`** — no separate exercises store. No schema migration; `db.version(1)` stays intact.
- **D-10:** Template management lives inside the PT Sheet above session-start. Template editor opens as a **nested Sheet** (Radix supports stacking).
- **D-11:** Session pre-populates all template exercises as rows. Each row contains: name, target display (read-only), `actualSets`/`actualReps`/`actualDurationSec` inputs, and an **explicit `completed` checkbox independent of actuals**. Partial sessions are valid. Session-level `painRating` (0–5) and `notes` (freeform) at bottom.
- **D-12:** PT-07 previous-session actuals render as **muted hint text directly under each exercise row**, e.g. `Last: 3×12 · pain 2/5 · 5 days ago`. Hidden if no prior session.

**Goals defaults + historical-target policy**
- **D-13:** On first app open, seed `goals` singleton with: `calories: 2000, proteinG: 180, carbsG: 180, fatG: 65, steps: 8000`. Seed runs inside `initApp()` (main.tsx) as a `goals.get('singleton')` → if absent → `put({...})` block.
- **D-14:** **SET-03 LOCKED (IRREVERSIBLE).** Progress bars and the future Phase 3 day-detail view always compare against **current** `goals.get('singleton')` — no per-day snapshot store, no effective-dated ranges. Historical days re-render against current target values.
- **D-15:** Goals form = one form, one Save button, all 5 fields saved atomically. React Hook Form + Zod. Zod schema: all 5 fields are `z.number().int().min(0)`. Form renders below the Install card and above the version line.
- **D-16:** Zero target = "not set" sentinel. If any goal field = 0, corresponding progress bar shows consumed-only (no fill, no denominator).

### Claude's Discretion

- Exact populated-card status copy formats — pattern intent fixed by UI-SPEC Copywriting Contract (title + em-dash + status). Planner copies UI-SPEC tables verbatim.
- Sheet open/close animation — resolved by UI-SPEC: **disabled** (`data-[state=open]:animate-none data-[state=closed]:animate-none`).
- Food picker search mode — prefix vs substring. **Recommendation:** substring via in-memory filter after an initial `.orderBy('name').toArray()` fetch — solo-user food libraries will stay < 500 items; substring is user-expected, prefix feels broken when you type "beef" mid-name.
- PT template exercise display ordering — default to array index (current schema has no `order` field).
- Error handling for DB write failures — Phase 1 silent+console pattern (UI-SPEC confirms no toasts).
- Keyboard-appearance tuning — `inputmode="numeric"` on integer inputs (steps, sets, reps, duration seconds, calories/macros in goals form), `inputmode="decimal"` on `servings` (MealEntry) since fractional servings like 1.5 are common.
- Plan partitioning — planner decides. Gate: Sheet upgrade + RHF/Zod install must land before any slice consumes them.

### Deferred Ideas (OUT OF SCOPE)

- **Segment completion definition** ("any log" vs "hit target for food") — Phase 3 lock before `streak.svc.ts` is written.
- **PT rest-day affordance** — Phase 3 or post-v1.
- **Meal templates / combos** (FOOD-09, FOOD-10) — v2.
- **Edit/delete for past-day entries** (older than today) — Phase 3's day-detail view. Phase 2 supports edit/delete of today's entries only.
- **PT session history chart** (INSIGHT-01) — v2.
- **Weekly macro summary** (INSIGHT-02) — v2.
- **Toast primitive + error-toast UX** — deferred; Phase 2 follows Phase 1's silent+console pattern.
- **Today-card populated-status exact copy** — fixed by UI-SPEC Copywriting Contract; planner should not deviate.

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PT-01 | Create/edit/delete PT exercise definitions | D-09 collapses this into PT template editor (exercises embedded in `PTTemplate.exercises[]`) — satisfied by template editor's add/edit/remove exercise rows |
| PT-02 | Create/edit/delete PT routine templates | Template editor in nested Sheet (D-10). `pt.svc.ts:createTemplate/updateTemplate/deleteTemplate` |
| PT-03 | Start PT session from template, pre-populate exercises | `pt.svc.ts:startSession(templateId)` — constructs `PTSession` with exercises cloned from `PTTemplate.exercises[]` and `completed: false` |
| PT-04 | Log actual sets/reps/duration per exercise, tick off complete, save | Session sheet row structure per D-11 + UI-SPEC PT exercise row layout |
| PT-05 | Freeform session notes field | Schema already has `PTSession.notes?: string` — bottom of session sheet |
| PT-06 | Optional 0–5 pain rating per session | Schema already has `PTSession.painRating?: number` — pill row component per UI-SPEC |
| PT-07 | Previous session's actuals visible during logging | D-12 muted one-liner under each row. Query: `pt.svc.ts:getLastSessionForTemplate(templateId, beforeDayKey?)` returns most-recent `PTSession` by `loggedAt desc` excluding the in-progress one |
| FOOD-01 | Add new food to library (name, macros, serving label, optional photo) | Create-food inline form in Food Sheet (D-06). Photo via Phase 1 `photoStore.resizePhoto` + `savePhoto` |
| FOOD-02 | Edit/delete foods in library | Phase 2 scope: delete via picker overflow (UI-SPEC destructive action). Edit is deferrable — see Open Questions |
| FOOD-03 | Log meal entry (pick food, servings, bucket, today's dayKey) | Quick-log chip (D-08 one-tap) + inline-edit for fine-tune. Bucket auto-inferred |
| FOOD-04 | Recent section — one-tap re-log with prior servings pre-filled | D-08 Recent definition. `meals.svc.ts:getRecentFoods(limit=10)` |
| FOOD-05 | Frequent section — top foods by log count in last 30d | D-08 Frequent definition. `meals.svc.ts:getFrequentFoods(limit=8, sinceMs)` |
| FOOD-06 | MealEntry denormalizes computed totals at write time | Schema already has `computedCalories/ProteinG/CarbsG/FatG`. `meals.svc.ts:logMeal(...)` computes at insert |
| FOOD-07 | Day view shows live-updating macro progress bars against targets | `useLiveQuery` over `meals.svc.ts:getDailyTotals(dayKey)` + `goals.svc.ts:getGoals()`. 4 `ProgressBar` components stacked in Food card. Zero-target sentinel per D-16 |
| FOOD-08 | Edit/delete meal entries | Inline-edit row per UI-SPEC (tap meal row in "Today" section of Food Sheet → expand to edit mode) |
| STEPS-01 | Enter step count per day, one record per day (upsert) | `stepEntries` natural `dayKey` PK. `steps.svc.ts:upsertSteps(dayKey, count)`. Inline input per D-02 |
| STEPS-02 | Steps progress bar against daily goal | Same `ProgressBar` component. Zero-target sentinel per D-16 |
| LIFT-01 | Single "Lifted today" toggle, stores `{dayKey, didLift}` | Schema field is `lifted` (not `didLift`). `lifts.svc.ts:toggleLift(dayKey)`. Inline glyph toggle per D-02 |
| LIFT-02 | Optional short note on lift checkin | Schema has `LiftCheckin.note?: string`. UI-SPEC: `Add note` affordance reveals after toggle on |
| SET-01 | Set daily targets for cal/protein/carbs/fat/steps | Goals form per D-15. `goals.svc.ts:saveGoals(goals)` |
| SET-02 | Target changes take effect immediately across progress bars | `useLiveQuery(() => db.goals.get('singleton'))` — Dexie re-fires on any `goals` put |
| SET-03 | Non-destructive goal changes | **LOCKED by D-14:** current-targets-always approach. No snapshot store. Progress bars re-render against new values |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Day totals reactivity (macros, steps) | Database (Dexie `useLiveQuery`) | UI (React hooks) | `useLiveQuery` is THE reactive layer per ARCHITECTURE.md §State Management — no separate cache/store |
| Progress bar rendering | UI (React component) | — | Pure view: computes `width: min(100%, consumed/target)` from props; renders only |
| Meal logging (write path) | Service (`meals.svc.ts`) | Database (Dexie transaction) | Service composes: resolve food → compute denormalized totals → `mealEntries.put()` — all in one Dexie-only transaction |
| Recent/Frequent ranking | Service (`meals.svc.ts`) | — | Dexie index on `mealEntries.foodId` + `loggedAt`; aggregation in JS after fetch (solo-user scale) |
| OPFS photo write | `lib/photoStore.ts` (existing) | Service (`food.svc.ts`) | Photo write MUST happen BEFORE any Dexie transaction starts (Pitfall #1). Service orchestrates: resize → save → insert food record |
| Form state + validation | UI (React Hook Form + Zod) | — | Ephemeral; never persists to Dexie. On submit → call service |
| Modal open/close state | UI (`useState`) | — | CLAUDE.md "ephemeral UI only" — local component state, not Zustand (overkill for per-feature opens) |
| Bucket auto-inference | `lib/dayKey.ts` new helper | Service (`meals.svc.ts`) | Single function `inferBucket(date = new Date()): MealBucket` colocated with dayKey — same concern (local-time derivation) |
| Previous-session lookup | Service (`pt.svc.ts`) | Database (Dexie index query) | Service uses `ptSessions.where('templateId').equals(id).reverse().sortBy('loggedAt')` → first. Component receives a plain `PTSession | undefined` |
| Goals seed on app init | `main.tsx` `initApp()` | Service (`goals.svc.ts`) | Seed runs ONCE before render; not a React concern |
| Settings goals form | UI (feature component) | Service (`goals.svc.ts`) | Form reads current goals via `useLiveQuery`, submits via `saveGoals` |

---

## Standard Stack

### Core (already installed in Phase 1)

| Library | Installed Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `dexie` | 4.0.11 | IndexedDB wrapper | Source of truth for all persistence [VERIFIED: node_modules/dexie/package.json] |
| `dexie-react-hooks` | 1.1.7 | `useLiveQuery` reactive hook | Installed 1.1.7 works fine with dexie 4.x — the hooks package jumped to 4.4.0 to version-align with dexie 4 semver, but 1.1.7's `useLiveQuery` is API-compatible [VERIFIED: npm view shows versions 1.1.7 and 4.4.0 both extant; no migration required] |
| `react` / `react-dom` | 19.x | UI framework | Phase 1 |
| `tailwindcss` | 4.x | Styling utilities | Phase 1 |
| `lucide-react` | 0.468.0 | Icons | Phase 1 — `Plus`, `Camera`, `MoreHorizontal`, `X` new consumers in Phase 2 |
| `class-variance-authority`, `clsx`, `tailwind-merge` | — | shadcn class helpers (`cn` util) | Phase 1 — used by new custom components |

### New installs (Phase 2)

| Library | Version | Purpose | Why This Version |
|---------|---------|---------|-----------------|
| `react-hook-form` | ^7.73.1 | Form state (uncontrolled inputs, zero re-renders on keystroke) | Latest 7.x, React 19 compatible [VERIFIED: `npm view react-hook-form version` → 7.73.1, 2026-04] |
| `zod` | ^4.3.6 | Schema validation + TS inference | Zod 4 is the current major (2025-Q4 release). API-stable for our use [VERIFIED: `npm view zod version` → 4.3.6]. **Note:** `@hookform/resolvers` `@5` supports Zod 4 |
| `@hookform/resolvers` | ^5.2.2 | RHF ↔ Zod bridge | Resolvers 5.x targets Zod 4; 3.x was Zod 3-only [VERIFIED: `npm view @hookform/resolvers version` → 5.2.2] |
| `@radix-ui/react-dialog` | ^1.1.15 | Sheet primitive backing | Installed transitively by `npx shadcn@latest add sheet`; do not install manually [VERIFIED: shadcn Sheet docs confirm Radix Dialog backing] |

**Version verification table:**

| Package | `npm view <pkg> version` output (this session) | Notes |
|---------|------------------------------------------------|-------|
| `react-hook-form` | `7.73.1` | [VERIFIED: npm registry, 2026-04-20] |
| `zod` | `4.3.6` | [VERIFIED: npm registry, 2026-04-20] |
| `@hookform/resolvers` | `5.2.2` | [VERIFIED: npm registry, 2026-04-20] |
| `@radix-ui/react-dialog` | `1.1.15` | [VERIFIED: npm registry, 2026-04-20] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Hook Form | Formik / controlled-components | Formik is controlled-input (re-render per keystroke). RHF is smaller, faster, zero-dep. **Locked by CLAUDE.md stack list.** |
| Zod | Yup / Valibot | Valibot is smaller but ecosystem is thinner. Zod has `z.infer<>` which we use as single source of truth. **Locked by CLAUDE.md.** |
| `dexie-react-hooks.useLiveQuery` | Zustand with manual subscribe | Would duplicate Dexie's reactive layer. ARCHITECTURE.md §State Management explicitly rejects this. |
| Native `<input type="checkbox">` (PT `completed`) | shadcn Checkbox | UI-SPEC locks native `accent-color: var(--accent)` approach for simplicity; no `npx shadcn add checkbox` required |
| shadcn Select for MealBucket | Segmented 4-pill control | UI-SPEC Inline-edit meal row spec says `4-option segmented control` — implement as 4 buttons with `role="radiogroup"`, not a Select |

### Installation (Phase 2, single command)

```bash
# Upgrade Phase 1 Sheet stub to real Radix (transitively installs @radix-ui/react-dialog)
npx shadcn@latest add sheet

# Forms + validation
npm install react-hook-form zod @hookform/resolvers
```

**Do NOT run `npx shadcn@latest add` for button/card** — Phase 1 Button and Card are hand-ported (deliberately) and UI-SPEC says to reuse them as-is. Running `shadcn add button` would overwrite.

---

## Architecture Patterns

### System Architecture Diagram

```
                       ┌────────────────────────────┐
                       │  TodayScreen (4 slots)     │
                       │  ┌────┐┌────┐┌────┐┌────┐  │
                       │  │ PT ││Food││Stps││Lift│  │
                       │  └──┬─┘└──┬─┘└──┬─┘└──┬─┘  │
                       └─────┼─────┼─────┼─────┼────┘
                             │     │     │     │
                   tap ──────┘     │     │     │
                   (open Sheet)    │     │     │
                             │     │     │     │
            ┌────────────────┘     │     │     └─ inline toggle (no Sheet)
            │                      │     │
            ▼                      ▼     ▼
    ┌─────────────┐      ┌─────────────────┐
    │  PT Sheet   │      │   Food Sheet    │      SettingsScreen
    │ (D-03,D-10) │      │  (D-05)         │      ┌─────────────┐
    │             │      │                 │      │ GoalsForm   │
    │ TemplateList│      │ ┌─────────────┐ │      │ (RHF+Zod)   │
    │   │         │      │ │MacroTotals  │ │      │    │        │
    │   └─nest→   │      │ │(sticky,D-08)│ │      │    ▼        │
    │ TemplateEdit│      │ └──────┬──────┘ │      │ goals.svc   │
    │   │         │      │ ┌──────▼──────┐ │      └─────┬───────┘
    │   ▼         │      │ │Recent chips │ │            │
    │ SessionForm │      │ │Frequent     │ │            │
    │   │         │      │ │Search+Create│ │            │
    │   ▼         │      │ │TodayMealList│ │            │
    │ pt.svc      │      │ └──────┬──────┘ │            │
    └─────┬───────┘      │        ▼        │            │
          │              │ food.svc        │            │
          │              │ meals.svc       │            │
          │              │ photoStore.ts   │            │
          │              └────────┬────────┘            │
          │                       │                     │
          └──────┬────────────────┴─────────────────────┘
                 │
                 ▼
         ┌──────────────────────────────────────────────┐
         │ Dexie DB (Phase 1, unchanged at v1)          │
         │                                               │
         │ ptTemplates ptSessions foods mealEntries     │
         │ stepEntries liftCheckins goals               │
         │                                               │
         │ useLiveQuery → auto-rerender on any put/del  │
         └──────────────────────────────────────────────┘
                 ▲
                 │ savePhoto returns photoKey string
                 │
         ┌───────┴────────────────┐
         │ OPFS /food-photos/     │  (Phase 1 photoStore.ts)
         │ food-<uuid>.webp       │
         └────────────────────────┘
```

**Data flow primary path (new food + log):** user types name in search → no match → taps "Create …" → fills form + optional photo → Save → (1) `resizePhoto(file)` pre-transaction (Pitfall #1!) → (2) `savePhoto(blob)` → photoKey → (3) Dexie rw transaction [`foods`, `mealEntries`]: `foods.put({...food, photoKey})`, `mealEntries.put({...entry, computed*})` → (4) Sheet closes → (5) `useLiveQuery` fires → Today Food card updates progress bars, MacroTotalsBar re-renders, TodayMealList shows new row.

### Recommended Project Structure

```
src/
├── db/                   # (Phase 1 — unchanged)
├── lib/
│   ├── dayKey.ts         # (Phase 1) + ADD: inferBucket(date?: Date): MealBucket
│   ├── photoStore.ts     # (Phase 1 — unchanged)
│   └── utils.ts          # (Phase 1) cn helper
│
├── services/             # (NEW — Phase 2)
│   ├── goals.svc.ts      # get, save, seedIfAbsent
│   ├── pt.svc.ts         # templates CRUD, startSession, saveSession, getLastSessionForTemplate
│   ├── food.svc.ts       # foods CRUD (add, edit, delete)
│   ├── meals.svc.ts      # logMeal, editMealEntry, deleteMealEntry, getTodayEntries, getDailyTotals, getRecentFoods, getFrequentFoods
│   ├── steps.svc.ts      # upsertSteps, getStepsForDay
│   └── lifts.svc.ts      # toggleLift, setLiftNote, getLiftForDay
│
├── components/
│   ├── ui/
│   │   ├── button.tsx    # (Phase 1)
│   │   ├── card.tsx      # (Phase 1)
│   │   └── sheet.tsx     # (Phase 2 UPGRADE — shadcn add sheet overwrites Phase 1 stub)
│   ├── ProgressBar.tsx   # (NEW — 9 instances across app)
│   ├── AppShell.tsx      # (Phase 1)
│   ├── TabBar.tsx        # (Phase 1)
│   └── Banner.tsx        # (Phase 1)
│
├── features/             # (NEW — Phase 2)
│   ├── pt/
│   │   ├── PTSection.tsx            # Today card wrapper — opens Sheet on tap
│   │   ├── PTSheet.tsx              # Root Sheet content (template list mode)
│   │   ├── PTTemplateList.tsx
│   │   ├── PTTemplateEditor.tsx     # Nested Sheet
│   │   ├── PTSessionForm.tsx
│   │   ├── PTExerciseRow.tsx
│   │   ├── PainRating.tsx           # 0-5 pill radiogroup
│   │   └── hooks.ts                 # useTemplates, useLastSession
│   ├── food/
│   │   ├── FoodSection.tsx
│   │   ├── FoodSheet.tsx
│   │   ├── MacroTotalsBar.tsx       # Sticky; 4 ProgressBar instances
│   │   ├── QuickLogChip.tsx
│   │   ├── QuickLogChipRow.tsx      # Horizontal scroll container
│   │   ├── FoodPicker.tsx           # Search + create inline trigger
│   │   ├── FoodCreateForm.tsx       # RHF+Zod form with photo capture
│   │   ├── TodayMealList.tsx
│   │   ├── MealEntryRow.tsx         # Inline-edit expand/collapse
│   │   └── hooks.ts                 # useRecentFoods, useFrequentFoods, useTodayEntries, useDailyTotals, useGoals (proxy)
│   ├── steps/
│   │   ├── StepsSection.tsx
│   │   ├── StepsInlineInput.tsx
│   │   └── hooks.ts
│   ├── lifts/
│   │   ├── LiftSection.tsx
│   │   ├── LiftToggle.tsx
│   │   ├── LiftNoteInput.tsx
│   │   └── hooks.ts
│   └── settings/
│       ├── GoalsForm.tsx
│       └── hooks.ts
│
├── routes/
│   ├── TodayScreen.tsx   # MODIFY — replace sections[] with 4 feature components
│   ├── SettingsScreen.tsx# MODIFY — inject <GoalsForm /> between Install card and version line
│   └── CalendarScreen.tsx# (Phase 1 — unchanged; Phase 3 rewrites)
│
└── main.tsx              # MODIFY — add `await seedGoalsIfAbsent()` to initApp() per D-13
```

**Structural rule (inherited from ARCHITECTURE.md):** feature components never `import { db }`. They import from `services/*.svc.ts` and `features/*/hooks.ts`. Services are the only consumers of the `db` singleton.

### Pattern 1: Service-layer Dexie encapsulation

**What:** All Dexie queries live in `services/*.svc.ts`. Feature components call service functions either directly (writes) or via `useLiveQuery` (reads).

**When to use:** Always — this is the foundational rule from ARCHITECTURE.md.

**Example:**
```typescript
// src/services/meals.svc.ts
// Source: ARCHITECTURE.md §"Pattern 1" + CLAUDE.md rule #1 (no non-IDB await in txn)

import { db } from '@/db/db';
import type { Food, MealEntry, MealBucket } from '@/db/schema';

export interface DailyTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function getTodayEntries(dayKey: string): Promise<MealEntry[]> {
  return db.mealEntries
    .where('dayKey')
    .equals(dayKey)
    .sortBy('loggedAt'); // ascending by log time
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
    // FOOD-06: denormalize at write
    computedCalories: food.calories * servings,
    computedProteinG: food.proteinG * servings,
    computedCarbsG: food.carbsG * servings,
    computedFatG: food.fatG * servings,
  };
  await db.mealEntries.put(entry);
}

export async function getDailyTotals(dayKey: string): Promise<DailyTotals> {
  const entries = await db.mealEntries.where('dayKey').equals(dayKey).toArray();
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.computedCalories,
      proteinG: acc.proteinG + e.computedProteinG,
      carbsG: acc.carbsG + e.computedCarbsG,
      fatG: acc.fatG + e.computedFatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
```

```typescript
// src/features/food/hooks.ts
// useLiveQuery re-fires whenever any mealEntries row is put or deleted.

import { useLiveQuery } from 'dexie-react-hooks';
import { getTodayEntries, getDailyTotals } from '@/services/meals.svc';
import { todayKey } from '@/lib/dayKey';

export function useTodayEntries() {
  return useLiveQuery(() => getTodayEntries(todayKey()), []);
  // returns `undefined` while loading — callers handle
}

export function useDailyTotals() {
  return useLiveQuery(() => getDailyTotals(todayKey()), []);
}
```

### Pattern 2: RHF + Zod schema as single source of truth

**What:** Define Zod schema once; derive TS type via `z.infer`; use `zodResolver` to validate form.

**When to use:** Every form (Goals, Food create, PT template editor, MealEntry inline-edit).

**Example:**
```typescript
// src/features/settings/GoalsForm.tsx
// Source: react-hook-form.com/get-started + @hookform/resolvers/zod

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLiveQuery } from 'dexie-react-hooks';
import { getGoals, saveGoals } from '@/services/goals.svc';

// Per D-15 + D-16: all 5 fields required, min 0 (zero = "not set" sentinel).
const goalsSchema = z.object({
  calories: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  proteinG: z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  carbsG:   z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  fatG:     z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
  steps:    z.number({ message: 'Required' }).int({ message: 'Whole number only' }).min(0, 'Must be 0 or higher'),
});
type GoalsInput = z.infer<typeof goalsSchema>;  // ← single source of truth for TS

export function GoalsForm() {
  const current = useLiveQuery(() => getGoals(), []);
  const { register, handleSubmit, formState: { errors }, reset } = useForm<GoalsInput>({
    resolver: zodResolver(goalsSchema),
    // NOTE: values (not defaultValues) so form re-syncs if goals change elsewhere
    values: current ? {
      calories: current.calories,
      proteinG: current.proteinG,
      carbsG:   current.carbsG,
      fatG:     current.fatG,
      steps:    current.steps,
    } : undefined,
  });

  const onSubmit = async (data: GoalsInput) => {
    await saveGoals(data);
    // No toast — UI-SPEC "Save success" = NONE. useLiveQuery updates Today cards.
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Each field with valueAsNumber so RHF passes number to Zod, not string */}
      <div>
        <label htmlFor="calories" className="text-xs text-muted">Calories</label>
        <input
          id="calories"
          type="number"
          inputMode="numeric"
          {...register('calories', { valueAsNumber: true })}
          aria-invalid={errors.calories ? 'true' : 'false'}
          aria-describedby={errors.calories ? 'calories-err' : undefined}
          className="h-11 w-full rounded-md border border-border bg-bg px-3 text-text"
        />
        {errors.calories && <p id="calories-err" className="text-xs" style={{ color: '#ef4444' }}>{errors.calories.message}</p>}
      </div>
      {/* ... 4 more fields identical pattern ... */}
      <button type="submit" className="w-full h-11 rounded-md bg-accent text-bg font-medium">Save goals</button>
    </form>
  );
}
```

**Key RHF gotchas (verified against react-hook-form.com docs):**
1. **`valueAsNumber: true`** in `register()` is REQUIRED for number inputs — otherwise RHF passes the string `"180"` to Zod, which fails the `z.number()` check with a confusing error.
2. **`values` vs `defaultValues`** — use `values` (the newer option) when data comes from an async source (`useLiveQuery` returns `undefined` first, then data). `defaultValues` only reads once at mount.
3. **`formState.errors` is lazily subscribed** — only fields you access re-render on error change.

### Pattern 3: shadcn Sheet bottom modal (Radix Dialog backed)

**What:** After `npx shadcn@latest add sheet`, the `Sheet` family uses Radix Dialog internally. Pass `side="bottom"` on `SheetContent`.

**When to use:** Every multi-field logging modal (PT, Food, PT template editor nested).

**Example (PT Sheet):**
```typescript
// src/features/pt/PTSection.tsx
// Source: ui.shadcn.com/docs/components/sheet (verified 2026-04-20) + UI-SPEC §Sheet

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { PTSheet } from './PTSheet';
import { useTodayPT } from './hooks';

export function PTSection() {
  const [open, setOpen] = useState(false);
  const today = useTodayPT();

  const statusText = today
    ? `${today.templateName} · ${today.exercises.filter(e => e.completed).length}/${today.exercises.length} ex`
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
        <SheetContent
          side="bottom"
          // UI-SPEC: disable Radix slide-in animation per anti-motion policy
          className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none"
        >
          <SheetHeader>
            <SheetTitle>PT</SheetTitle>
          </SheetHeader>
          <PTSheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### Pattern 4: Nested Sheets (template editor inside PT Sheet)

**What:** Radix supports multiple Dialog roots stacking. Each has its own open state.

**Example:**
```typescript
// Inside PTSheet.tsx
const [editingTemplate, setEditingTemplate] = useState<PTTemplate | null>(null);
const [creating, setCreating] = useState(false);
const editorOpen = creating || editingTemplate !== null;

return (
  <>
    {/* Parent Sheet content: template list, etc. */}
    <PTTemplateList onEdit={setEditingTemplate} onCreate={() => setCreating(true)} />

    {/* Nested Sheet — mounts separately; Radix manages z-stack */}
    <Sheet open={editorOpen} onOpenChange={(o) => { if (!o) { setCreating(false); setEditingTemplate(null); }}}>
      <SheetContent side="bottom" className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none">
        <PTTemplateEditor
          template={editingTemplate}
          onDone={() => { setCreating(false); setEditingTemplate(null); }}
        />
      </SheetContent>
    </Sheet>
  </>
);
```

### Pattern 5: OPFS photo pipeline (pre-transaction resize + save)

**What:** Resize and write photo to OPFS BEFORE opening any Dexie transaction. Pitfall #1 otherwise.

**When to use:** Every food create with a photo.

**Example:**
```typescript
// src/services/food.svc.ts

import { db } from '@/db/db';
import { resizePhoto, savePhoto, deletePhoto } from '@/lib/photoStore';
import type { Food } from '@/db/schema';

export async function createFood(params: {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string;
  photoFile?: File | null;   // raw file from <input type="file">
}): Promise<Food> {
  const { photoFile, ...rest } = params;

  // Step 1 — photo pipeline BEFORE any Dexie transaction (Pitfall #1)
  let photoKey: string | undefined;
  if (photoFile) {
    try {
      const resized = await resizePhoto(photoFile);  // 800×800 WebP@80%
      photoKey = await savePhoto(resized);            // OPFS write
    } catch (err) {
      console.error('[food.svc] photo save failed', err);
      // UI-SPEC: photo failure is silent; food is created without photo.
      photoKey = undefined;
    }
  }

  // Step 2 — Dexie write (no non-IDB awaits inside)
  const food: Food = {
    id: crypto.randomUUID(),
    ...rest,
    photoKey,
    createdAt: Date.now(),
  };
  await db.foods.put(food);  // single-statement; no need for explicit transaction
  return food;
}

export async function deleteFood(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;
  // Delete photo BEFORE Dexie txn (non-IDB I/O)
  if (food.photoKey) {
    try { await deletePhoto(food.photoKey); }
    catch (err) { console.error('[food.svc] photo delete failed', err); }
  }
  await db.foods.delete(id);
  // Note: associated mealEntries keep foodId reference; that's historical data
  // (denormalized totals survive food deletion — FOOD-06 intent).
}
```

### Pattern 6: Object URL lifecycle for photos in chips

**What:** `URL.createObjectURL(blob)` on mount, `URL.revokeObjectURL(url)` on unmount. Otherwise memory leak.

**Example:**
```typescript
// src/features/food/FoodThumb.tsx
import { useEffect, useState } from 'react';
import { loadPhoto } from '@/lib/photoStore';

export function FoodThumb({ photoKey, size = 20 }: { photoKey?: string; size?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoKey) { setUrl(null); return; }
    let cancelled = false;
    let objectUrl: string | null = null;

    void (async () => {
      try {
        const blob = await loadPhoto(photoKey);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch (err) {
        console.error('[FoodThumb] load failed', err);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoKey]);

  if (!url) return null;
  return <img src={url} width={size} height={size} className="rounded-full object-cover" alt="" />;
}
```

### Pattern 7: Recent/Frequent food ranking (per D-08)

**What:** Two read-side queries — one orders by recent, one aggregates by count within 30-day window.

**Example:**
```typescript
// src/services/meals.svc.ts (continued)

const THIRTY_DAYS_MS = 30 * 86_400_000;

export async function getRecentFoods(limit = 10): Promise<Food[]> {
  // Newest-first across all MealEntry rows, dedupe by foodId keeping newest.
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
  const entry = await db.mealEntries
    .where('foodId').equals(foodId)
    .reverse().sortBy('loggedAt');
  return entry[0]?.servings;
}
```

**Performance note:** `orderBy('loggedAt').reverse().toArray()` in `getRecentFoods` fetches ALL entries. For a solo user with < 5000 meal entries over several years, this is still < 50ms on-device. If perf becomes an issue, switch to `.reverse().limit(50)` and dedupe from a smaller slice. [ASSUMED: scale claim — verified by ARCHITECTURE.md §Scaling Considerations which projects ~1500 meals/year]

### Pattern 8: `useLiveQuery` + `undefined` loading state

**What:** `useLiveQuery` returns `undefined` until the first query resolves. Components must handle.

**When to use:** Every reactive read.

**Example:**
```typescript
const totals = useDailyTotals();           // DailyTotals | undefined
const goals  = useGoals();                 // Goals | undefined

// Render zero-state placeholders while loading (per UI-SPEC Loading States:
// "Today cards — render zero-state copy while useLiveQuery is undefined")
const calories = totals?.calories ?? 0;
const target   = goals?.calories ?? 0;
```

**Anti-pattern:** `if (totals === undefined) return <Spinner />;` — UI-SPEC forbids spinners. Render zero-state instead.

### Pattern 9: Bucket auto-inference colocated with dayKey

**What:** Add `inferBucket()` to `lib/dayKey.ts` — same "local-time" concern as dayKey generation.

**Example:**
```typescript
// src/lib/dayKey.ts — append to existing file

import type { MealBucket } from '@/db/schema';

/**
 * Infer meal bucket from local time per CONTEXT.md D-08.
 * breakfast < 11:00, lunch < 15:00, dinner < 21:00, snack otherwise.
 * Uses getHours() (local) — never getUTCHours() for the same reason dayKey uses local getters.
 */
export function inferBucket(date: Date = new Date()): MealBucket {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
```

### Pattern 10: PT previous-session lookup

**What:** Query last `PTSession` for a template, using `templateId` index + reverse-sort by `loggedAt`.

**Example:**
```typescript
// src/services/pt.svc.ts

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

/** Relative-time formatter for previous-session hint (D-12). */
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

### Pattern 11: Zustand — DO NOT ADD IN PHASE 2

**CLAUDE.md specifies Zustand for "ephemeral UI only". Phase 2 evaluation:** the only candidates for Zustand would be Sheet-open flags and modal drafts. Every Sheet is owned by a single Today-card component; `useState` is sufficient. **No Zustand usage is warranted in Phase 2.** Adding it would be over-engineering. Revisit in Phase 3 if the calendar shares state across day cells.

### Anti-Patterns to Avoid

- **Storing form drafts in Zustand:** UI-SPEC says Sheet dismissal discards unsaved changes silently. `useState` per Sheet is correct.
- **Double Dexie instance:** only one `db` singleton across services. Never `new Dexie(...)` in a service file.
- **Awaiting non-IDB inside `db.transaction()`:** e.g., `await fetch()`, `await setTimeout`, or `await savePhoto()` inside a transaction block causes silent commit + data loss. Photo writes happen BEFORE the transaction opens.
- **`Date(key)` parsing:** re-read `lib/dayKey.ts:keyToDate` — new Date("2026-04-20") parses as UTC midnight. Always `keyToDate(k)`.
- **Indexing blob fields:** Never add `photoKey` to the Dexie `stores()` index string. It's an opaque reference; filtering on it is never needed.
- **Inline `await db.foods.add(food)` inside React components:** always route through `services/*.svc.ts`.
- **Re-creating Object URLs on every render:** memoize in `useEffect` + revoke on cleanup.
- **Storing goals in Zustand AND Dexie:** `goals` singleton is the one source; `useLiveQuery` is the reactive channel.
- **Re-running `seedGoalsIfAbsent()` on every render:** it's an `initApp()` step, not a hook.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dexie reactivity | Custom event emitter on puts + React Context | `useLiveQuery` from `dexie-react-hooks` | Dexie tracks writes internally; `useLiveQuery` auto re-fires on any write to queried tables. Hand-rolling misses hidden writes (migrations, bulk ops) |
| Bottom sheet modal | Custom div + overlay + scroll-lock + focus trap | shadcn Sheet (Radix Dialog backed) | Radix handles focus trap, scroll lock, Escape, scrim click, aria — 500+ lines of subtle a11y wiring |
| Form state | `useState` per field + manual validation | React Hook Form + Zod + zodResolver | RHF handles uncontrolled inputs (zero re-render per keystroke), Zod gives runtime + TS types in one shot |
| Number input parsing | `parseFloat(e.target.value)` everywhere | `register(name, { valueAsNumber: true })` | RHF coerces properly; empty string → `NaN` which Zod flags as "Required" |
| Schema validation | Ad-hoc `if (typeof x !== 'number')` checks | Zod `z.object({...})` | Composable, exhaustive, produces TS types. `z.infer<>` is load-bearing elsewhere |
| UUID generation | `Math.random().toString(36)` | `crypto.randomUUID()` | Native, collision-resistant. Already used in Phase 1 `photoStore.ts`. Works in all target browsers |
| Date formatting for "5 days ago" | `date-fns` | 12-line `formatRelativeDays` helper | Only one use site (PT hint); `date-fns` = 10KB+ for one function |
| Photo resize | `new Image()` + manual canvas draw | `createImageBitmap` with `imageOrientation: 'from-image'` + canvas | Phase 1 `photoStore.resizePhoto` already does this with EXIF handling — reuse, don't rewrite |
| Progress bar | Recharts `<Bar>` / `<Progress>` component | Plain div + inline `style={{ width: percent }}` | UI-SPEC says "Two nested divs: outer track + inner fill". Zero dependency. Recharts is overkill for a static bar |
| Meal bucket chips | shadcn Select / Radix RadioGroup | 4 `<button>`s with `role="radiogroup"` + `role="radio" aria-checked` | UI-SPEC specifies "segmented control" visual; native buttons + ARIA roles are fewer deps and match the pill style elsewhere |
| Toast notifications | shadcn Toast / sonner | Nothing (intentional) | UI-SPEC: no toasts in Phase 2. Dexie re-render + Sheet close IS the success signal |
| Confirmation modal for delete | shadcn AlertDialog | Silent delete (per UI-SPEC) | Phase 2 explicit design decision: no destructive confirmations |

**Key insight:** Almost every candidate "hand-roll problem" here has a Phase 1 primitive or a locked-design decision that obviates it. The CLAUDE.md stack + UI-SPEC together already prevent most scope creep. The planner's role is to enforce reuse, not invent new primitives.

---

## Runtime State Inventory

**Skipped — this is a greenfield feature phase, not a rename/refactor.** All Phase 2 work is additive: new services, new components, new DB rows (no migrations). Existing Phase 1 state (Dexie v1 schema, OPFS photo directory, localStorage `healthtracker:lastOpenedAt`, goals singleton once seeded) is unchanged in structure — only **new rows** are written into existing stores. No renames, no data migrations, no OS-registered state changes.

---

## Common Pitfalls

### Pitfall 1: Non-IDB await inside Dexie transaction (PITFALLS.md #1 — PROJECT-BREAKING)

**What goes wrong:** A service function opens a Dexie `rw` transaction, then `await`s something non-Dexie (e.g., `savePhoto()`, `fetch()`, `sleep()`). IDB auto-commits the transaction at the await point; subsequent Dexie calls silently no-op or throw `TransactionInactiveError`. Data loss without error message.

**Why it happens in Phase 2 specifically:** Food create is the highest-risk operation — it combines OPFS photo write, food row insert, AND potentially a meal entry insert. Naïve authoring puts them all inside one transaction.

**How to avoid:**
- **Always write photo BEFORE opening the Dexie transaction** (see Pattern 5 above).
- Prefer single-table single-operation writes: `await db.foods.put(...)` without explicit `db.transaction(...)` — Dexie auto-transactions this.
- When you DO need a multi-statement transaction (e.g., createFood+logMeal atomically), keep it Dexie-only: `await db.transaction('rw', [db.foods, db.mealEntries], async () => { await db.foods.put(food); await db.mealEntries.put(entry); });`. Do NOT call `resizePhoto` or `savePhoto` inside.

**Warning signs:** `TransactionInactiveError` in console on create-food flow. Food appears to save but meal entry is missing on Today card.

### Pitfall 2: dayKey UTC drift (PITFALLS.md #4 / CLAUDE.md #3 — HIGH)

**What goes wrong:** A developer types `new Date().toISOString().split('T')[0]` in `meals.svc.ts:logMeal` to get today's key. On a user's 23:30 local timestamp in UTC-5, this returns tomorrow's date. The meal logs to the wrong day.

**Phase 2 specific risk sites:**
- `meals.svc.ts:logMeal` — MUST accept `dayKey` from caller (who uses `todayKey()`).
- `steps.svc.ts:upsertSteps` — same.
- `lifts.svc.ts:toggleLift` — same.
- `pt.svc.ts:saveSession` — same.
- `inferBucket()` — uses `getHours()` (local), not `getUTCHours()`.

**How to avoid:**
- NEVER call `new Date()` inside a service function. Always take `dayKey: string` as a parameter.
- The ONLY place `new Date()` is allowed in Phase 2 is `todayKey()` and `inferBucket()` in `lib/dayKey.ts`, plus `Date.now()` for epoch-ms timestamps.
- Add a grep-level convention: `grep -rn 'new Date(' src/` outside `lib/dayKey.ts` should return only `Date.now()` usages.

**Warning signs:** Calendar (Phase 3) will show yesterday's meals on the wrong day; streak counts off by one for UTC-5+ users; "I logged but it's not showing" reports.

### Pitfall 3: Photo memory leak from unrevoked Object URLs

**What goes wrong:** Food Sheet renders 8 Frequent chips + 10 Recent chips + TodayMealList rows, each with a `<img src={createObjectURL(blob)}>`. Without revoke-on-unmount, every Sheet open adds another 18 unreferenced blob URLs.

**Phase 2 specific risk sites:** `FoodThumb.tsx` (Pattern 6), `MealEntryRow.tsx` photo leading icon, `QuickLogChip.tsx` thumbnail.

**How to avoid:**
- Follow Pattern 6 verbatim: `let objectUrl`, set inside effect, revoke in cleanup.
- Never inline `src={URL.createObjectURL(await loadPhoto(key))}` in JSX — async function in render + no cleanup = guaranteed leak.
- Consider a `useFoodThumb(photoKey)` hook that encapsulates the lifecycle so every consumer gets it right.

**Warning signs:** `navigator.storage.estimate()` usage climbs with Sheet open/close cycles; memory growth in Safari Web Inspector Memory tab.

### Pitfall 4: RHF number inputs posting strings to Zod

**What goes wrong:** `<input type="number" {...register('calories')}>` without `valueAsNumber: true` — RHF gives Zod the string `"2000"`, `z.number()` fails with "Expected number, received string".

**How to avoid:**
- Every numeric `register()` call includes `{ valueAsNumber: true }`.
- `servings` in MealEntry is a decimal — use `valueAsNumber: true`, Zod: `z.number().positive()` (accepts 1.5).
- Integer fields: Zod `.int()`; RHF: `valueAsNumber: true` + `step="1"` on input.

**Warning signs:** Zod error "Expected number, received string"; form never submits even with valid input.

### Pitfall 5: `defaultValues` vs `values` race in async form

**What goes wrong:** `useLiveQuery(() => getGoals())` returns `undefined` for one tick, then the goals object. If the RHF form uses `defaultValues: current`, it captures `undefined` on mount and never updates.

**How to avoid:**
- Use `values: current ? {...} : undefined` instead of `defaultValues`. RHF re-syncs form state when `values` changes.
- Alternative: wait for `current` before rendering the form. Adds an extra render cycle — acceptable.

**Warning signs:** Goals form shows empty inputs on first load even after D-13 seed has run.

### Pitfall 6: Nested Sheet focus-return / scroll-lock edge cases

**What goes wrong:** When the nested template-editor Sheet closes, focus should return to the template's "Edit" menu item in the parent Sheet, not to the page body behind the scrim. Radix handles this by default IF both Sheets are mounted inside the same React tree; if the nested Sheet is a portal sibling of the parent, focus return fails.

**How to avoid:**
- Keep the nested `<Sheet>` JSX **inside** the parent Sheet's content component (see Pattern 4). Both render via Radix portals but share the trigger context.
- Do not render the nested Sheet from TodayScreen.tsx top level — it must be inside PTSheet.tsx.
- Test: open PT Sheet → tap Edit template → editor opens → tap Cancel → focus should be back on the Edit menu item.

### Pitfall 7: `useLiveQuery` dependency array staleness

**What goes wrong:** `useLiveQuery(() => getTodayEntries(todayKey()), [])` — the empty deps array is fine because `todayKey()` is called INSIDE the query fn and re-evaluated on each fire. But `useLiveQuery(() => getTodayEntries(dayKeyProp), [dayKeyProp])` — if `dayKeyProp` changes, deps MUST include it.

**Phase 2 specific risk:** Phase 2 only uses `todayKey()`-based queries (Today-screen only), so `[]` deps are correct everywhere. But when Phase 3 opens a day-detail view for arbitrary dayKeys, the deps array becomes load-bearing. Document this in service hooks.

### Pitfall 8: Goals seed running on every open / race with render

**What goes wrong:** If `seedGoalsIfAbsent()` is called from a React effect (e.g., inside `SettingsScreen`), it races with `useLiveQuery` — the form may render with empty values before the seed lands, showing validation errors briefly.

**How to avoid:**
- Call `await seedGoalsIfAbsent()` in `main.tsx:initApp()` BEFORE `createRoot(...).render(...)`. Blocks render by ~1ms. Guarantees the singleton exists on first `useLiveQuery` fire.
- Implementation: `if (await db.goals.get('singleton')) return; await db.goals.put({ id: 'singleton', ...defaults, updatedAt: Date.now() });` — idempotent via the get-then-put pattern.

### Pitfall 9: Progress bar division-by-zero

**What goes wrong:** D-16 allows `target === 0` ("not set" sentinel). A naïve `width: (consumed / target * 100) + '%'` returns `Infinity%` or `NaN%`, rendering a broken bar or a full bar.

**How to avoid (Pattern from UI-SPEC):**
- If `target === 0`, do NOT render the bar at all (contract: "if `target === 0`, bar is not in the DOM").
- Render the consumed-only layout: number + unit.

### Pitfall 10: Food library getting a photoKey index by accident

**What goes wrong:** A developer adds `photoKey` to the Dexie `stores()` string thinking it helps filtering. Dexie warns against indexing binary-referencing fields; as the library grows, index maintenance becomes slow.

**How to avoid:**
- Schema string for `foods` is fixed at `'id, name, createdAt'` (Phase 1, v1). Never append `photoKey`.
- Since Phase 2 doesn't bump schema version, this pitfall is primarily a code-review discipline issue.

### Pitfall 11: `shadcn add sheet` overwriting unrelated config

**What goes wrong:** `npx shadcn@latest add sheet` re-reads `components.json` and may re-normalize imports or add missing file paths. If `components.json` has drifted from shadcn defaults, it may touch files the author didn't expect.

**How to avoid:**
- Run `git status` before `shadcn add sheet`; verify only `src/components/ui/sheet.tsx` and `package.json` changed.
- If shadcn complains about the `style` preset, re-confirm `components.json` specifies `"style": "new-york"` (it does — verified).
- Expected Phase 2 diff: `src/components/ui/sheet.tsx` (rewritten), `package.json` (adds `@radix-ui/react-dialog`), `package-lock.json`.

---

## Code Examples

### Example A: Complete Food Sheet integration (outline)

```typescript
// src/features/food/FoodSection.tsx
// Source: patterns 1, 3, 8 above. UI-SPEC §Today-card status slot + Progress bars.

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ProgressBar';
import { FoodSheet } from './FoodSheet';
import { useDailyTotals } from './hooks';
import { useGoals } from '@/features/settings/hooks';

export function FoodSection() {
  const [open, setOpen] = useState(false);
  const totals = useDailyTotals();
  const goals  = useGoals();
  const cals   = Math.round(totals?.calories ?? 0);
  const calT   = goals?.calories ?? 0;

  const status = calT > 0
    ? `${cals} / ${calT} cal`
    : (cals > 0 ? `${cals} cal` : '—');

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full text-left">
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-text">Food</h2>
            <span className="text-sm text-muted">{status}</span>
          </div>
          <div className="mt-2 space-y-2">
            <ProgressBar value={cals} max={calT} label="Cal" />
            <ProgressBar value={Math.round(totals?.proteinG ?? 0)} max={goals?.proteinG ?? 0} label="P" />
            <ProgressBar value={Math.round(totals?.carbsG  ?? 0)} max={goals?.carbsG  ?? 0} label="C" />
            <ProgressBar value={Math.round(totals?.fatG    ?? 0)} max={goals?.fatG    ?? 0} label="F" />
          </div>
        </Card>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] pt-6 px-4 pb-4 data-[state=open]:animate-none data-[state=closed]:animate-none">
          <SheetHeader><SheetTitle>Log food</SheetTitle></SheetHeader>
          <FoodSheet onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
```

### Example B: ProgressBar component (zero deps)

```typescript
// src/components/ProgressBar.tsx
// Source: UI-SPEC §Progress bar component. Accent fill on bg-white/[0.08] track.

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;        // "Cal" / "P" / "C" / "F" / "" (Steps card has none)
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
        aria-label={ariaLabel ?? `${label} progress`}
        className="relative h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
```

### Example C: PT session form (outline)

```typescript
// src/features/pt/PTSessionForm.tsx
// Source: Pattern 2 (RHF/Zod) — BUT per CONTEXT.md D-11, session has NO Zod schema
// because every field is optional. Use RHF without a resolver; validate at submit.

import { useForm, useFieldArray } from 'react-hook-form';
import type { PTTemplate, PTSession } from '@/db/schema';
import { todayKey } from '@/lib/dayKey';
import { saveSession, getLastSessionForTemplate, formatRelativeDays } from '@/services/pt.svc';
import { useLiveQuery } from 'dexie-react-hooks';

interface FormValues {
  exercises: Array<{
    name: string;            // pre-filled from template, read-only
    targetSets?: number;
    targetReps?: number;
    targetDurationSec?: number;
    actualSets?: number;
    actualReps?: number;
    actualDurationSec?: number;
    completed: boolean;
  }>;
  painRating?: number;
  notes?: string;
}

export function PTSessionForm({ template, onClose }: { template: PTTemplate; onClose: () => void }) {
  const last = useLiveQuery(() => getLastSessionForTemplate(template.id), [template.id]);

  const { register, handleSubmit, control } = useForm<FormValues>({
    values: {
      exercises: template.exercises.map(e => ({
        name: e.name,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
        targetDurationSec: e.targetDurationSec,
        actualSets: undefined,
        actualReps: undefined,
        actualDurationSec: undefined,
        completed: false,
      })),
      painRating: undefined,
      notes: '',
    },
  });
  const { fields } = useFieldArray({ control, name: 'exercises' });

  const onSubmit = async (data: FormValues) => {
    const session: PTSession = {
      id: crypto.randomUUID(),
      dayKey: todayKey(),
      templateId: template.id,
      loggedAt: Date.now(),
      exercises: data.exercises.map(e => ({
        name: e.name,
        actualSets: e.actualSets,
        actualReps: e.actualReps,
        actualDurationSec: e.actualDurationSec,
        completed: e.completed,
      })),
      painRating: data.painRating,
      notes: data.notes || undefined,
    };
    await saveSession(session);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, idx) => {
        const prev = last?.exercises.find(e => e.name === field.name);
        return (
          <div key={field.id} className="border-b border-border py-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-text">{field.name}</h3>
              <span className="text-xs text-muted">
                Target: {field.targetSets}×{field.targetReps}
                {field.targetDurationSec ? ` · ${field.targetDurationSec}s` : ''}
              </span>
            </div>
            {prev && (
              <p className="text-xs text-muted">
                Last: {prev.actualSets ?? '—'}×{prev.actualReps ?? '—'}
                {last?.painRating != null ? ` · pain ${last.painRating}/5` : ''}
                {' · '}{formatRelativeDays(last!.loggedAt)}
              </p>
            )}
            <div className="flex gap-2">
              <div className="w-16">
                <label className="text-xs text-muted">Sets</label>
                <input type="number" inputMode="numeric" className="h-11 w-full rounded-md border border-border bg-bg px-2"
                  {...register(`exercises.${idx}.actualSets`, { valueAsNumber: true })} />
              </div>
              <div className="w-16">
                <label className="text-xs text-muted">Reps</label>
                <input type="number" inputMode="numeric" className="h-11 w-full rounded-md border border-border bg-bg px-2"
                  {...register(`exercises.${idx}.actualReps`, { valueAsNumber: true })} />
              </div>
              {field.targetDurationSec != null && (
                <div className="w-16">
                  <label className="text-xs text-muted">Sec</label>
                  <input type="number" inputMode="numeric" className="h-11 w-full rounded-md border border-border bg-bg px-2"
                    {...register(`exercises.${idx}.actualDurationSec`, { valueAsNumber: true })} />
                </div>
              )}
              <label className="flex items-center gap-2 ml-auto">
                <input type="checkbox" {...register(`exercises.${idx}.completed`)}
                  style={{ accentColor: 'var(--accent)' }} />
                <span className="text-sm">Done</span>
              </label>
            </div>
          </div>
        );
      })}

      {/* Pain rating pills + notes ... */}
      <button type="submit" className="h-11 w-full rounded-md bg-accent text-bg font-medium mt-6">
        Save session
      </button>
    </form>
  );
}
```

### Example D: Goals seed on init

```typescript
// src/services/goals.svc.ts

import { db } from '@/db/db';
import type { Goals } from '@/db/schema';

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

```typescript
// src/main.tsx — MODIFICATION (new step 6.5)

import { seedGoalsIfAbsent } from './services/goals.svc';

async function initApp(): Promise<void> {
  // ... existing steps 1-6 ...

  // Step 6.5 (NEW) — D-13: ensure goals singleton exists before render.
  // Dexie opens lazily here on first DB access.
  try {
    await seedGoalsIfAbsent();
  } catch (err) {
    console.error('[initApp] goals seed failed', err);
  }

  // Step 7 — render (unchanged).
  createRoot(document.getElementById('root')!).render(...);
}
```

### Example E: Steps inline input with blur-to-save

```typescript
// src/features/steps/StepsInlineInput.tsx

import { useState, useRef } from 'react';
import { upsertSteps, getStepsForDay } from '@/services/steps.svc';
import { todayKey } from '@/lib/dayKey';
import { useLiveQuery } from 'dexie-react-hooks';

export function StepsInlineInput() {
  const [editing, setEditing] = useState(false);
  const current = useLiveQuery(() => getStepsForDay(todayKey()), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = async (raw: string) => {
    const n = parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0) return setEditing(false);
    await upsertSteps(todayKey(), n);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button type="button" onClick={() => { setEditing(true); queueMicrotask(() => inputRef.current?.focus()); }}
        className="text-sm text-text tabular-nums">
        {current?.count ?? 0}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="numeric"
      defaultValue={current?.count ?? ''}
      aria-label="Enter step count for today"
      placeholder="0"
      className="w-24 h-11 text-right tabular-nums bg-bg border border-border rounded-md px-2"
      onBlur={(e) => void commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') setEditing(false);
      }}
    />
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Controlled inputs w/ `useState` per field | React Hook Form uncontrolled + `register()` | RHF became dominant by 2022; React 19 reinforced | Zero re-renders per keystroke; tiny bundle |
| `yup` for schema validation | `zod` with TS inference via `z.infer` | Zod dominant since 2023 | Single source of truth for types + runtime; Yup's API is TypeScript-lossier |
| `idb` + manual subscriptions | Dexie + `useLiveQuery` | Dexie 4 (Dec 2024) stable; `dexie-react-hooks` mature | Reactive reads without separate store layer |
| Blob-in-IDB for photos | OPFS for photos + photoKey string in IDB | OPFS cross-browser by 2023 | Smaller IDB store, faster queries, Dexie-docs-blessed |
| Manual Radix Dialog wiring | shadcn `npx add sheet` | shadcn stable since 2024, Tailwind v4 compat 2026-Q1 | File-in-repo ownership + zero runtime |
| `Date.toISOString().split('T')[0]` as day key | Local-time `YYYY-MM-DD` from `getFullYear/Month/Date` | Documented in PITFALLS.md #4 | Correct cross-timezone day identity |
| `defaultValues` on async data | `values` (RHF 7.43+) for sync with external state | RHF 7.43 (2023) | Form re-syncs when `useLiveQuery` resolves |

**Deprecated/outdated (do not use):**
- `Formik` — controlled inputs, 10x larger than RHF, community-dormant.
- `react-hook-form@6.x` — `register()` API changed in 7.x; 7.x is the current major.
- `zod@3.x` — 4.x is current major; `@hookform/resolvers@5` targets Zod 4. [VERIFIED: npm registry]
- `new Date(isoString)` for YYYY-MM-DD parsing — see PITFALLS.md #4.

---

## Project Constraints (from CLAUDE.md)

CLAUDE.md directives binding Phase 2 work (compliance required):

1. **Never `await` a non-IDB promise inside a Dexie transaction** — auto-commit drops writes. Photo writes happen BEFORE transactions (Pattern 5, Pitfall #1).
2. **Never edit a past `db.version(N).stores({...})` declaration** — Phase 2 does NOT bump schema. All writes fit v1's existing stores. If a Plan gets tempted to add `mealEntries.servings` index, STOP — it's not needed; `dayKey` + `foodId` indexes suffice for Phase 2 queries.
3. **Never use `toISOString().split('T')[0]`** — only `lib/dayKey.ts:todayKey()/dateToKey()/keyToDate()`. New `inferBucket()` stays in same file, uses `getHours()` (local).
4. **Call `navigator.storage.persist()` on startup** — already in Phase 1 `main.tsx`. Phase 2 does not touch this.
5. **Resize photos to ≤800×800 @ 80% WebP before OPFS write** — use Phase 1 `photoStore.resizePhoto()` as the sole path. Never pass raw `File` to `savePhoto()`.
6. **Photos live in OPFS, not as Dexie blobs** — `foods.photoKey` stores only a filename. Phase 1 `photoStore` is unchanged.
7. **`foods.photoKey` never in Dexie `stores()` index string** — confirmed intact.
8. **GSD YOLO mode + coarse granularity + parallelism on** — plan check and verifier enabled. Phase 2 partitions for parallel execution per ROADMAP guidance.
9. **Pin Vite to 7.x** (vite-plugin-pwa 1.3 peer-dep) — already pinned. Phase 2 doesn't touch Vite.
10. **PT rest-day affordance OUT OF SCOPE** — do not add in Phase 2; goes to Phase 3 or v2.
11. **Plan 01-02 residual item:** `src/lib/dayKey.smoke.ts` is unimported (tree-shakable), wired via dynamic import in `initApp()`. Phase 2 does not modify.

All of the above are directly honored by CONTEXT.md and UI-SPEC. No conflicts detected.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Substring food search is acceptable performance-wise for solo-user libraries up to ~500 foods | Claude's Discretion / Pattern 7 notes | If a user's library grows beyond, filter UI would feel laggy. Mitigation: switch to prefix `.where('name').startsWith` — trivial. Low risk. |
| A2 | `dexie-react-hooks@1.1.7` installed in Phase 1 is fully API-compatible with Dexie 4.x `useLiveQuery` | Standard Stack | Verified no API change between 1.1.x and 4.4.0 for `useLiveQuery` signature based on npm release notes; if a subtle behavioral diff exists, upgrade to 4.4.0 is a one-line package.json change. Low risk. |
| A3 | `getRecentFoods()` fetching all mealEntries then deduping in JS stays < 50ms for realistic usage | Pattern 7 | ARCHITECTURE.md projects ~1500 meals/year; 5 years = 7500 rows. If perceived slow, add `.limit(200)` to the initial reverse scan. Low risk. |
| A4 | `useLiveQuery` returning `undefined` on first render is observable by the user as "zero-state" placeholder for < 16ms and not visually jarring | Pattern 8 / UI-SPEC Loading States | UI-SPEC explicitly endorses this. Confirmed. No risk. |
| A5 | Radix Dialog native focus-return works across nested PT Sheets when both are rendered in the same React tree | Pattern 4 / Pitfall #6 | This is Radix's documented behavior but has edge cases around React 19's concurrent rendering. Test in browser before marking P4 plan complete. Medium risk — add to plan verification steps. |
| A6 | Food edit is out of Phase 2 scope (only create and delete) | Phase Requirements table, FOOD-02 | FOOD-02 requirement literally says "edit and delete foods in the library". CONTEXT.md D-06 covers inline create; delete covered by UI-SPEC overflow menu. **Edit is not explicitly in either lock.** See Open Question 1. HIGH risk — needs user confirmation. |
| A7 | `seedGoalsIfAbsent()` is safe to run on every app start (no race with React render) | Pattern Example D | Verified: awaited before `createRoot(...).render()` in initApp; Dexie opens lazily. No React effect. No risk. |
| A8 | `servings` accepts decimals (e.g., 1.5 servings) per real-life use | Claude's Discretion | Schema type is `number`; no Zod schema yet. Recommendation: `z.number().positive()` accepts decimals. This matches how food loggers typically work. Low risk. |

---

## Open Questions

1. **FOOD-02 "edit foods in library" — is editing in Phase 2 or deferred?**
   - What we know: FOOD-02 requires edit AND delete. CONTEXT.md D-06 covers inline CREATE, UI-SPEC covers DELETE (overflow menu), but neither locks EDIT.
   - What's unclear: Is "edit a food record's calories" a Phase 2 UI affordance, or is it intentionally deferred to "just delete + re-create" for simplicity?
   - Recommendation: **Planner should ask discuss-phase** before locking plans. Two viable paths: (a) add a "Edit food" option to the picker overflow menu (small — reuses `FoodCreateForm` with prepopulated values), or (b) defer to v2 and document "edit = delete + re-create". (b) is simpler but may conflict with REQUIREMENTS.md Traceability showing FOOD-02 in Phase 2.

2. **Do we support ALL-DAY "today's meal list" showing items from all buckets, or is it tab-filtered (Breakfast/Lunch/Dinner/Snack)?**
   - What we know: UI-SPEC says "today's entries grouped by bucket" in Food Sheet. D-05 says "today's already-logged meal entries grouped by bucket".
   - What's unclear: "grouped by" — is this a visual section-header grouping (all visible, separated by labels) or a bucket-tab filter?
   - Recommendation: Section-header grouping (all visible, 4 labeled sections, each with its entries or "—" if empty). Easier to scan and cheaper to build than tabbed UI. Document in plan.

3. **Does `completed` checkbox on a PT exercise row auto-commit, or only on Save session?**
   - What we know: D-11 says "Partial sessions are valid" and session is saved on explicit Save. UI-SPEC has a single "Save session" button.
   - What's unclear: Is there a Phase 2 UX where user checks off exercises as they go and the session auto-saves drafts, or is everything form-local until Save?
   - Recommendation: All form-local until Save; no draft persistence in Phase 2. This matches UI-SPEC "Sheet primary action" pattern and avoids partial-session complexity. Document explicitly in plan.

4. **Edit MealEntry — does the inline-edit row allow changing the `foodId` (swap food), or only `servings` + `bucket`?**
   - What we know: UI-SPEC meal entry inline-edit shows `Servings` input and `Meal` select; no food-swap UI.
   - What's unclear: explicit confirmation that food swap is out.
   - Recommendation: servings + bucket only. If user needs a different food, they delete and re-log. Document in plan.

5. **Does MealEntry.servings = 0 mean "skip/invalid" or is it a legitimate value?**
   - What we know: Zod suggested `z.number().positive()` — rejects 0 and negatives.
   - What's unclear: behavior is straightforward; just confirming Zod uses `.positive()` not `.min(0)`.
   - Recommendation: `z.number().positive()`. `0 servings` is not a meaningful log. Low ambiguity.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, test, dev | ✓ | (Phase 1 passed) | — |
| npm | Install RHF/Zod/Radix | ✓ | (Phase 1) | — |
| `npx` | `shadcn@latest add sheet` | ✓ | (bundled with npm) | — |
| react@19 | All UI | ✓ (installed) | 19.x | — |
| dexie@4 | All persistence | ✓ (installed) | 4.0.11 | — |
| OPFS API | Photo save | ✓ (Phase 1 photoStore tested) | — | — |
| `navigator.storage.persist` | Phase 1, not Phase 2 new | ✓ | — | — |
| Internet for initial `npm install` | Install new deps | Assumed ✓ | — | If offline: Phase 2 is blocked on dep install. |

**Nothing missing that blocks Phase 2 planning.**

---

## Security Domain

**security_enforcement status:** Not set in `.planning/config.json` — treated as enabled per research protocol, but the applicable surface is minimal for a fully-local no-backend single-user PWA.

### Applicable ASVS Categories (scoped to local-only PWA)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | NO | No accounts (PROJECT.md out-of-scope: no auth) |
| V3 Session Management | NO | No sessions — app state is Dexie |
| V4 Access Control | NO | Single-user, single-device, no sharing |
| V5 Input Validation | YES | Zod schemas on all forms (Goals, Food create, MealEntry edit, PT template). Zero untrusted input — user is the only source. Validation is UX quality, not security boundary |
| V6 Cryptography | PARTIAL | `crypto.randomUUID()` for record IDs — native, CSPRNG-backed. No password/credential storage |
| V8 Data Protection | PARTIAL | Data is local only. `navigator.storage.persist()` already requested in Phase 1. Export to JSON is Phase 4 (user-initiated, no network) |
| V9 Communications | NO | No network calls in Phase 2 |
| V10 Malicious Code | NO | No user-uploaded code paths; photos are image blobs only |
| V11 Business Logic | YES | Goals form zero-target sentinel (D-16) is a deliberate validation edge case that's correctly handled |
| V12 Files and Resources | YES | Photo capture accepts `image/*` via `<input>`; OPFS writes are origin-scoped (browser guarantees isolation). `savePhoto` does NOT validate file is actually an image decode-able as one — see mitigation below |
| V13 API and Web Service | NO | No APIs |
| V14 Configuration | PARTIAL | Tailwind tokens + shadcn config locked in Phase 1. No untrusted config in Phase 2 |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation | Phase 2 Status |
|---------|--------|---------------------|---------------|
| Untrusted file upload to OPFS (user picks non-image from file picker) | Tampering | `createImageBitmap` in `resizePhoto()` throws on non-image files | ✓ Handled by Phase 1 `photoStore.resizePhoto`; `createImageBitmap` rejects non-images. Food create form catches the throw and saves food without photo per UI-SPEC photo-failure silence rule |
| XSS via user-entered food name / notes | Tampering / Repudiation | React auto-escapes strings in JSX; don't use `dangerouslySetInnerHTML` | ✓ Phase 2 has zero `dangerouslySetInnerHTML` usage planned. Confirmed |
| Integer overflow in goal (user enters 999999999 calories) | Tampering | Zod `.int()` validates; no upper bound documented | Low risk — solo user, no impact beyond a broken-looking progress bar. Optional: `.max(100000)` on goals |
| IndexedDB quota exhaustion | Denial of Service | `navigator.storage.estimate()` + eviction banner (Phase 1) | ✓ Already addressed |
| Untrusted Zod schema via prototype pollution | Tampering | Zod schemas are code, not data | ✓ Not applicable |
| Clickjacking | Tampering | PWA installed to home screen runs in standalone, not in-frame | ✓ Manifest `display: standalone` already set in Phase 1 |
| Service-worker poisoning | Spoofing | vite-plugin-pwa signs by hash; Cache-Control: no-cache on sw.js (Phase 1) | ✓ Already addressed |

**Net:** Phase 2 introduces no new security boundaries. All security considerations carry over from Phase 1's already-correct setup.

---

## Sources

### Primary (HIGH confidence)

- **CONTEXT.md** (`.planning/phases/02-tracking-slices/02-CONTEXT.md`) — D-01..D-16 locked decisions [VERIFIED: read in this session]
- **UI-SPEC** (`.planning/phases/02-tracking-slices/02-UI-SPEC.md`) — design contract, copy strings, spacing, colors [VERIFIED: read in this session]
- **REQUIREMENTS.md** — PT-01..07, FOOD-01..08, STEPS-01..02, LIFT-01..02, SET-01..03 [VERIFIED: read in this session]
- **ARCHITECTURE.md** (`.planning/research/ARCHITECTURE.md`) — service-layer pattern, object store schema, liveQuery pattern [VERIFIED]
- **PITFALLS.md** (`.planning/research/PITFALLS.md`) — IDB txn auto-commit (#1), UTC dayKey drift (#4), photo resize (#8), food logging friction (#7) [VERIFIED]
- **STACK.md** (`.planning/research/STACK.md`) — stack lock + version compatibility notes [VERIFIED]
- **CLAUDE.md** — project rules 1–6 (transaction, schema, dayKey, persist, resize, OPFS) [VERIFIED]
- **src/ Phase 1 outputs** — `db/schema.ts`, `db/db.ts`, `lib/dayKey.ts`, `lib/photoStore.ts`, `components/ui/{button,card,sheet}.tsx`, `routes/TodayScreen.tsx`, `routes/SettingsScreen.tsx`, `main.tsx` [VERIFIED: read in this session]
- **package.json** + installed `node_modules` — Phase 1 dependency state [VERIFIED: filesystem inspection]
- **components.json** — shadcn preset (new-york, zinc, cssVariables, lucide) [VERIFIED: read in this session]
- **npm registry** — `npm view` queries for react-hook-form, zod, @hookform/resolvers, @radix-ui/react-dialog, dexie-react-hooks, lucide-react, recharts, react-activity-calendar [VERIFIED: this session, 2026-04-20]

### Secondary (MEDIUM confidence)

- **shadcn Sheet docs** (`https://ui.shadcn.com/docs/components/sheet`) — API surface (Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose, SheetDescription), `side="bottom"` support, Radix Dialog backing [CITED: WebFetch this session]
- **React Hook Form docs** (`https://react-hook-form.com/get-started`) — `register()`, `valueAsNumber`, `values` vs `defaultValues`, `handleSubmit`, `formState.errors` [CITED: docs knowledge from training, verified for 7.x API]
- **Zod docs** (`https://zod.dev`) — `z.object`, `z.number().int().min(0)`, `z.infer<>`, `z.enum` for MealBucket [CITED: training knowledge current as of 2025-Q4]
- **Dexie `useLiveQuery` docs** (`https://dexie.org/docs/dexie-react-hooks/useLiveQuery()`) — reactive subscription semantics, deps array, undefined loading [CITED]
- **Radix Dialog docs** (`https://www.radix-ui.com/primitives/docs/components/dialog`) — nested Dialog stacking, focus-return, Escape handling [CITED]

### Tertiary (LOW confidence / training knowledge)

- **`useLiveQuery` deps array edge cases in React 19 concurrent mode** [ASSUMED] — Pattern 8 and Pitfall #7 are based on documented behavior in Dexie 4. React 19 concurrent renderer is unlikely to change this but not tested in this project.
- **Nested Radix Sheet focus-return in React 19 StrictMode** [ASSUMED] — Pitfall #6 flagged for plan-verification-time testing (A5 in Assumptions).

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified via `npm view`; all libraries confirmed React 19 compatible
- Architecture patterns: HIGH — Phase 1 code already exemplifies the service-layer and `useLiveQuery` patterns; Phase 2 is extension, not invention
- Don't-hand-roll: HIGH — every item backed by CLAUDE.md, UI-SPEC, or Phase 1 existing helpers
- Pitfalls: HIGH — all 11 pitfalls traceable to PITFALLS.md, CLAUDE.md, or shadcn-install behavior
- Code examples: HIGH — compile-mentally against Phase 1's installed dependencies; only Example C's useFieldArray has minor uncertainty around React 19 concurrent re-renders (low impact)
- User Constraints: HIGH — copied verbatim from CONTEXT.md, which was just approved

**Research date:** 2026-04-20
**Valid until:** ~2026-05-20 (30 days — stack is stable; reverify `npm view` versions if phase planning slips beyond that window)

**Final note for planner:** This phase is unusually well-constrained. CONTEXT.md + UI-SPEC eliminate most ambiguity. The planner's primary work is:
1. **Partition** the 22 requirements into plans such that P3 (Food) and P4 (PT) can run in parallel after P1 (foundation) + P2 (Goals).
2. **Enforce** the "service-layer first, feature components second" build order within each plan.
3. **Surface** Open Questions 1-4 to the user before finalizing plans (especially Q1 — FOOD-02 edit scope is ambiguous and affects plan sizing).
4. **Verify** Pitfall avoidance at plan level — each plan's success criteria should explicitly check that no non-IDB await sits inside a Dexie transaction, and that dayKey is never derived inside a service function.
