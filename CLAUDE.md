# VZN

A fully-local, offline-first PWA used independently by two friends (each installs it on their own phone — no backend, no auth, no shared data). Used on **both phone and desktop** by the same people.

**Product name vs storage identity:** the app is VZN, but the Dexie database is still `HealthTrackerDB` and localStorage keys still use the `healthtracker:` prefix. Those are addresses of data already in users' browsers — renaming them doesn't rename anything, it points the app at an empty store. They are frozen. Only user-visible copy carries the new name.

v2 covers: calorie/macro tracking with AI-parsed freeform entry and a self-building food library, one-tap lift/cardio check-offs, body-weight tracking with trends, and an Apple-Fitness-style daily closure ring plus a long-term Dashboard.

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
| AI + local food parsing | `src/services/parse.svc.ts` — Anthropic **or** OpenRouter, both browser-direct with the user's own key; deterministic offline grammar as fallback |
| AI provider config | `src/lib/apiKey.ts` — provider / key / model, localStorage only |
| Auto-library | `src/services/food.svc.ts` (`logParsedFood`, dedupe on `normalizedName`), `normalizeFoodName.ts` |
| Closure model | `src/services/closure.svc.ts` — day closes when food logged + lift + cardio checked (any-log semantics) |
| Check-offs / weight | `checkins.svc.ts` (row existence = checked, `source` field for future Hevy sync), `weight.svc.ts` (EMA trend) |
| Long-term goals | `longTermGoals.svc.ts` — goal weight (start snapshotted on first save), target date, weekly lift/cardio targets; projection math from the EMA |
| Theming | `lib/theme.ts` + `styles/tokens.css` (`:root` light, `.dark` dark) + pre-paint script in `index.html` |
| Demo fixture | `src/dev/seedDemo.ts` — `npm run dev:demo` (port 5174 = separate origin = separate IndexedDB) |
| Screens | `/daily` and `/day/:dayKey` are both thin wrappers over `features/day/DayScreen` — one screen, so stepping days with the arrows or clicking a closure-grid square always lands somewhere identical. `/dashboard` (trends, lazy), `/settings` |
| Day routing | `lib/dayRoutes.ts` — `dayPath()` is the single answer to "where does this day live" (today → `/daily`, else `/day/:key`). One URL per day. |
| Backup | `export.svc.ts` / `import.svc.ts` — v2 envelope, current schemaVersion only on import |

## Project-Breaking Rules

1. **Never `await` a non-IDB promise inside a Dexie transaction** — it silently auto-commits and drops writes. The provider parse fetch must ALWAYS complete before any Dexie write begins.
2. **Never edit a past `db.version(N).stores({...})` declaration** — migrations are append-only. Add a new version block. The orphaned v1 stores (ptTemplates, ptSessions, stepEntries, liftCheckins) stay declared forever.
3. **Never use `toISOString().split('T')[0]`** for day keys — UTC drift shifts days in western timezones. Use `lib/dayKey.ts` only.
4. **Call `navigator.storage.persist()` on startup** (done in `main.tsx`) — iOS Safari wipes IndexedDB after 7 days of inactivity otherwise.
5. **Photos: ≤800×800 WebP@80% in OPFS**, `foods.photoKey` stores only a filename — never Blobs in Dexie.
6. **The AI provider key lives in localStorage, never in Dexie** — export reads Dexie tables only, so the key can structurally never leak into a backup. Same for the provider and model settings.
7. **Parsed food never auto-saves** — every parse (AI or local) goes through the editable confirm form; keep the 4/4/9 macro sanity check wired.
8. **One `useLiveQuery` per consumer, never per day/cell** — dashboard and grids use single range queries.
9. **Never rename the Dexie database or the `healthtracker:` localStorage prefix** — see the note at the top. Product renames are cosmetic; storage identifiers are not.
10. **The phone layout is frozen** — every desktop change goes behind `lg:`. The two-column screens rely on column wrappers sharing the same 20px rhythm as their container, so below `lg` they collapse into a single evenly-spaced run. Don't "simplify" that into a grid with explicit row placement; it reorders the phone.

## Design

**Direction: high air, cloud light.** Palette is F7F9FB / EAE6DD / D6E3EF / AEC6DA / 6D8CA8 / 2E3A46 — a sky-blue and white world with a deep-ink text color. Two things carry the identity: the page is a **sky** (`--sky`, a fixed vertical wash with a white bloom at top, painted on the shell so cards and glass float in front of atmosphere), and every neutral is blue-biased rather than zinc. Dark mode is the same sky at night — ink-navy, not neutral black.

Because the palette is pale, working values are pinned to contrast ratios rather than to the swatches: `--muted` is a darkened slate that clears 4.5:1 on white (6D8CA8 itself is ~3.4:1 and cannot carry body text), and each ring/chart hue clears 3:1 on its own surface. `--faint` is deliberately below text thresholds — decoration, placeholders and axis furniture only.

Ring/chart hues are sage (food) / slate-ink (lift) / warm clay (cardio) — three separable hues that all belong to the palette. `--accent` is the sky blue and is the brand color: nav, selection, focus, closure success.

Light and dark** (`src/styles/tokens.css` — `:root` is light, `.dark` overrides). Theme preference is system/light/dark in Settings; `index.html` applies it pre-paint to avoid a flash — keep that inline script in sync with `lib/theme.ts` (both set `theme-color` to the *header's surface*, not the page ground).

**Never hardcode a color in a component.** Use tokens: `--sky/sky-top/sky-bottom`, `--text/muted/faint/bg/surface/surface-2/border/hairline/accent/accent-wash/accent-solid/on-accent/track/danger/warn`, `--ring-*` (closure ring), `--chart-*` (Recharts series). Ring and chart colors are defined per theme and each set is validated against its own surface — re-run the dataviz palette validator before changing either. `--accent-solid`/`--on-accent` exist because white on `--accent` is only 3.4:1; solid fills must use the pair.

**Depth, not outlines.** Cards are `--surface` + `--shadow-md` + a `--hairline` edge on the `--bg` ground; `--surface-2` is the *inset* step (inputs, segmented troughs) — lighter than surface in light mode, darker in dark. Shape and motion tokens: `--r-xs…--r-xl` (→ `rounded-xs…rounded-xl`), `--ease-out/-in-out/-spring` (→ `ease-out-soft`/`ease-smooth`/`ease-pop`). There is no `ease-in` on purpose.

**Type: system-ui for prose, Instrument Sans for numbers.** Numbers are this app's content, so every numeric readout gets the `.stat` class (display face + tabular figures + tight tracking). The font is self-hosted woff2, precached by the SW — nothing loads from a network at runtime.

Shared primitives — reach for these before hand-rolling: `ui/card` (Card/CardHeader/CardTitle/CardMeta/CardContent), `ui/button`, `ui/meter` (the one progress fill), `ui/segmented` (the one segmented control), `ui/styles` (`field`, `press`, `focusRing`, `eyebrow`, `label`), `features/settings/SettingsCard`, `features/dashboard/ChartLegend`. **Uppercase tracking is reserved for `eyebrow`** — one structural role, not every micro-label.

`index.css` scopes Tailwind with `source(none)` + explicit `@source` lines. Auto-detection walks `.planning/` and `.agents/`, whose docs quote old class names — leave the scoping in place.

**Liquid glass is the navigation layer only.** `.glass` (index.css) is for the floating header and tab bar — things with live content moving behind them. Content cards stay opaque; glass on glass turns the screen milky. The shell's bars are absolutely positioned OVER a full-height scrolling `<main>` precisely so there is something to blur; `--shell-header`/`--shell-tabbar` keep the overlap and `<main>`'s padding in sync.

**Desktop (`lg:` and up).** Content widens to `max-w-6xl`, navigation moves into the header capsule, and the bottom tab bar is dropped (a thumb affordance with no thumb). Dashboard and Settings go two-up and **stretch** so a short card never leaves a hole beside a taller one; the closure grid spans the full last row and shows 26 weeks there instead of 12.

**DayScreen stays a single centred column at every width** (`lg:max-w-2xl`). It was briefly two columns; anything placed beside the ring demotes it from "the point of the app" to "one of two things happening at once". Forms and lists also don't want 1150px line lengths — the Dashboard is where the extra width earns its keep.

**Every desktop grid needs `lg:[&>*]:min-w-0`.** Grid items default to `min-width: auto` and refuse to shrink below their content's intrinsic width; Recharts' ResponsiveContainer reports a large one. Without it the cards overflow, the page grows a horizontal scrollbar, and `mx-auto` centres against that wider scroll width — which looks like "the layout is shifted left". `<main>` also carries `overflow-x-hidden` as a backstop. Note this is about the *items*: Tailwind's `grid-cols-2` already emits `repeat(2, minmax(0,1fr))`, so changing the track does nothing.

Motion: press feedback (`press`) on everything tappable, UI transitions under 300ms, and `prefers-reduced-motion` respected in every animation. Design skills live in `.agents/skills/` (apple-design, pick-ui-library, improve-animations).

Mobile-first: the shell is a fixed `h-dvh` column — header and tab bar are flex siblings and only `<main>` scrolls (a `min-h-dvh` shell with `sticky bottom-0` bars does *not* pin the tab bar). Content is capped at `max-w-md` with safe-area insets — it's a phone PWA.

## Explicitly Out of Scope

Shared data between the two users, backend/auth/sync, Hevy auto-sync (deferred — needs Hevy Pro; `source: 'hevy'` field reserved), nutrition DBs/barcode scanning, photo food recognition, fuzzy library merging, full lift tracking (lives in Hevy), notifications, social features. PT rehab and steps tracking are retired v1 features — do not resurrect.
