# HealthTracker

A fully-local, offline-first PWA used independently by two friends (each installs it on their own phone — no backend, no auth, no shared data). v2 covers: calorie/macro tracking with AI-parsed freeform entry and a self-building food library, one-tap lift/cardio check-offs, body-weight tracking with trends, and an Apple-Fitness-style daily closure ring plus a long-term Dashboard.

**Workflow note:** Build directly with normal tools. Do NOT use the GSD workflow/skills — the user explicitly does not want it. `.planning/` holds historical planning docs and research notes (useful reference, not process to follow).

## Core Value

**Consistency through satisfying daily closure and visible long-term progress.** Every UX tradeoff biases toward low-friction entry (type it and done; one-tap re-logs and check-offs) and clean, sleek visual feedback.

## Stack

React 19 + Vite 7 + TypeScript + Dexie 4 (+ `useLiveQuery`) + Tailwind CSS 4 + `motion` (animations) + Recharts (Dashboard, lazy-loaded) + React Hook Form + Zod.

**Pin Vite to 7.x** (vite-plugin-pwa peer-dep policy).

## Architecture Map

| Area | Where |
|------|-------|
| Dexie schema + migrations | `src/db/db.ts` (v1 + v2 blocks), types in `src/db/schema.ts` |
| Day identity | `src/lib/dayKey.ts` only (+ `useDayKey` for midnight rollover) |
| AI + local food parsing | `src/services/parse.svc.ts` (Claude Haiku browser-direct; deterministic offline grammar) |
| Auto-library | `src/services/food.svc.ts` (`logParsedFood`, dedupe on `normalizedName`), `normalizeFoodName.ts` |
| Closure model | `src/services/closure.svc.ts` — day closes when food logged + lift + cardio checked (any-log semantics) |
| Check-offs / weight | `checkins.svc.ts` (row existence = checked, `source` field for future Hevy sync), `weight.svc.ts` (EMA trend) |
| API key | `src/lib/apiKey.ts` — localStorage ONLY, never Dexie (keeps it out of exports) |
| Screens | `/daily` (ring + logging), `/dashboard` (trends, lazy), `/day/:dayKey`, `/settings` |
| Backup | `export.svc.ts` / `import.svc.ts` — v2 envelope, current schemaVersion only on import |

## Project-Breaking Rules

1. **Never `await` a non-IDB promise inside a Dexie transaction** — it silently auto-commits and drops writes. The Anthropic parse fetch must ALWAYS complete before any Dexie write begins.
2. **Never edit a past `db.version(N).stores({...})` declaration** — migrations are append-only. Add a new version block. The orphaned v1 stores (ptTemplates, ptSessions, stepEntries, liftCheckins) stay declared forever.
3. **Never use `toISOString().split('T')[0]`** for day keys — UTC drift shifts days in western timezones. Use `lib/dayKey.ts` only.
4. **Call `navigator.storage.persist()` on startup** (done in `main.tsx`) — iOS Safari wipes IndexedDB after 7 days of inactivity otherwise.
5. **Photos: ≤800×800 WebP@80% in OPFS**, `foods.photoKey` stores only a filename — never Blobs in Dexie.
6. **The Anthropic API key lives in localStorage, never in Dexie** — export reads Dexie tables only, so the key can structurally never leak into a backup.
7. **Parsed food never auto-saves** — every parse (AI or local) goes through the editable confirm form; keep the 4/4/9 macro sanity check wired.
8. **One `useLiveQuery` per consumer, never per day/cell** — dashboard and grids use single range queries.

## Design

Dark-only, zinc base + green accent (`src/styles/tokens.css`). Ring segment colors: `--ring-food/lift/cardio`; chart colors `--chart-*` are dark-surface-validated — don't swap them casually. Design skills live in `.agents/skills/` (apple-design, pick-ui-library, improve-animations) — consult for UI/motion work. Respect `prefers-reduced-motion` in every animation.

## Explicitly Out of Scope

Shared data between the two users, backend/auth/sync, Hevy auto-sync (deferred — needs Hevy Pro; `source: 'hevy'` field reserved), nutrition DBs/barcode scanning, photo food recognition, fuzzy library merging, full lift tracking (lives in Hevy), notifications, social features. PT rehab and steps tracking are retired v1 features — do not resurrect.
