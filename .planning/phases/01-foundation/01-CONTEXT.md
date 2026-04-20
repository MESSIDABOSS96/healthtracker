# Phase 1: Foundation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 ships the non-negotiable infrastructure that every feature depends on: a scaffolded Vite + React 19 + TypeScript PWA, a Dexie v1 schema with all 7 object stores, the canonical `dayKey` utility, the OPFS photo pipeline with resize, the service worker + manifest (installable, offline), `navigator.storage.persist()` on startup, the dark-themed base app shell with tab-bar navigation, and the Phase 1 landing screen. No tracking features live in this phase — PT / Food / Steps / Lifts / Calendar all belong to Phases 2 and 3.

</domain>

<decisions>
## Implementation Decisions

### App shell + navigation
- **D-01:** Bottom tab bar is the primary navigation pattern. Top header renders app title + settings cog (per-screen overrides allowed in later phases).
- **D-02:** Three tab destinations: **Today**, **Calendar**, **Settings**. "Today" is the logging hub hosting all four tracking sections (PT / Food / Steps / Lift) as sub-sections on one screen — not separate tabs per domain.
- **D-03:** Routing uses `react-router-dom` with **hash routes** (`/#/today`, `/#/calendar`, `/#/settings`). Hash routing sidesteps SW navigation-fallback edge cases and supports future deep links (e.g. `/#/day/2026-04-20` in Phase 3).
- **D-04:** Safe-area insets honored on the bottom tab bar and top header (iOS home-indicator + notch) using `env(safe-area-inset-*)`.

### Phase 1 landing screen
- **D-05:** The Today screen ships in Phase 1 as the **real layout shell with labeled placeholder sections** — `PT — not logged yet`, `Food — 0 / target cals`, `Steps — —`, `Lift — ☐`. Phase 2 fills each section with actual logging UI. The layout visible on day-1 matches the layout at end of Phase 2; only the section internals change.
- **D-06:** Calendar and Settings tabs render minimal "Coming in Phase 3" / basic stub screens in Phase 1. Settings gets at least the install-instructions card (see D-12) wired in Phase 1.

### Photo pipeline
- **D-07:** Photo encoding is **WebP @ 80% quality**, max 800×800, stored in OPFS. Filenames: `food-<uuid>.webp`. This resolves the conflict between `CLAUDE.md` pitfall rule #5 (which said JPEG @ 70%) and `.planning/research/*.md` (which said WebP). **`CLAUDE.md` must be updated during Phase 1 execution** to reflect WebP @ 80%.
- **D-08:** Resize via `<canvas>` + `canvas.toBlob('image/webp', 0.8)`. `foods.photoKey` stores only the filename string; raw blobs never touch Dexie records.

### Service worker update strategy
- **D-09:** `vite-plugin-pwa` is configured with `registerType: 'autoUpdate'` — new SW activates silently on next reload. No in-app "new version available" banner in Phase 1 (SETUP-06 remains v2).
- **D-10:** Build version/hash surfaced as a small text line in Settings (e.g. `v1.0.0 (build abc123)`) so the current version is manually verifiable without a banner.

### Install prompt + eviction warning UX
- **D-11:** On first launch, detect standalone mode. If the app is running in a Safari/browser tab (not installed), show a **dismissible install banner** with iOS share-sheet instructions: *"Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen."* Framing is data-safety, not UX nice-to-have.
- **D-12:** Settings screen includes a persistent **Install** card with the same instructions for users who dismissed the banner.
- **D-13:** On Android (when `beforeinstallprompt` fires), capture the event and wire it to the same banner's primary button so native-prompt users get one-tap install.
- **D-14:** **Eviction-warning banner ships in Phase 1.** On app launch, check `lastOpenedAt` in `localStorage`. If gap > 4 days **AND** not running standalone, show a warning banner: *"Your data may be at risk — install to home screen or export now."* This closes Pitfall #3 (iOS 7-day storage eviction) without waiting for Phase 4.

### Dark theme design tokens
- **D-15:** Base palette = **shadcn zinc default**. Locked hex values:
  - `--bg`: `#09090b` (app background)
  - `--surface`: `#18181b` (cards, sheets, elevated surfaces)
  - `--border`: `#27272a` (dividers, outlines)
  - `--muted`: `#a1a1aa` (secondary text, disabled)
  - `--text`: `#fafafa` (primary text)
- **D-16:** Primary accent = **soft green `#22c55e`** (Tailwind `green-500`). Used for active tab indicator, progress bars, and the 4-segment complete state.
- **D-17:** **DayCell partial-fill progression is a single-hue alpha ramp** using the accent color. Lock for Phase 3 consumption:
  - 0 segments filled → `--surface` (no fill)
  - 1 segment → accent @ 25% alpha
  - 2 segments → accent @ 50% alpha
  - 3 segments → accent @ 75% alpha
  - 4 segments (complete) → accent @ 100% alpha
  Partial days always read as positive progress — never red, never empty. Directly addresses Pitfall #6 (streak anxiety).
- **D-18:** CSS variables declared in a single `src/styles/tokens.css` imported by `main.tsx`. Tailwind v4 `@theme` block references these variables so utility classes (`bg-surface`, `text-muted`, etc.) resolve correctly.
- **D-19:** `.dark` class applied to `<html>` on mount and is the only theme. Light mode is out of scope.

### Claude's Discretion
- Exact app-shell component decomposition (`AppShell.tsx` vs `Layout.tsx` naming, how the top header composes with per-screen actions).
- Bottom-tab icon choice (Lucide icons recommended — shadcn convention).
- Banner component styling, dismissal persistence key names, copy wording (the decisions above fix intent and triggers, not exact strings).
- EXIF stripping and orientation normalization in the photo resize pipeline.
- Dev tooling: ESLint/Prettier config, package manager choice (npm is the default unless user flags otherwise).
- Goals singleton initialization strategy (seed with sensible defaults on first run vs empty-until-user-saves).
- Whether to add Vitest for the `todayKey()` unit test in Phase 1 or use a `console.assert` smoke check. Success criteria allow either.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core value, constraints, out-of-scope
- `.planning/REQUIREMENTS.md` — v1 REQ-IDs (SETUP-01..05, DATA-01..05 for this phase)
- `.planning/ROADMAP.md` §"Phase 1: Foundation" — Goal, success criteria
- `CLAUDE.md` — Project-breaking pitfall rules (note: pitfall #5 must be updated from JPEG to WebP per D-07)

### Stack + Architecture
- `.planning/research/SUMMARY.md` — Executive summary; open decisions; recommended stack
- `.planning/research/STACK.md` — Locked technology choices and versions (React 19, Vite 7, Dexie 4.4, Tailwind 4.2, shadcn/ui, vite-plugin-pwa 1.2)
- `.planning/research/ARCHITECTURE.md` — Object store schemas, `dayKey` implementation, OPFS pattern, service-worker strategy, service-layer boundaries
- `.planning/research/PITFALLS.md` — All 11 pitfalls; Phase 1 must prevent #1 (IDB transaction auto-commit), #2 (schema migration rules), #3 (iOS eviction), #4 (UTC midnight date bug), #5 (SW update), #8 (photo resize)

### External library docs (fetch during research/planning if needed)
- Dexie v4 `Version.stores()` + `useLiveQuery` — https://dexie.org/docs
- vite-plugin-pwa `injectManifest` — https://vite-pwa-org.netlify.app/guide/inject-manifest
- Tailwind CSS v4 `@theme` + dark variant — https://tailwindcss.com/docs
- MDN OPFS (`navigator.storage.getDirectory`) — https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None yet.** Project is greenfield — only `.planning/` and `CLAUDE.md` exist. Phase 1 is building the reusable foundation everything else will consume.

### Established Patterns
- `.planning/research/ARCHITECTURE.md` prescribes the folder layout and service-layer dependency direction (UI → services → db). Phase 1 scaffolds this structure even though only `db/`, `lib/`, and a minimal `features/` (shell only) will have real contents.

### Integration Points
- **Phase 2 hooks into:** `db/db.ts` (all 7 stores exist), `lib/dayKey.ts` (exported helpers), `lib/photoStore.ts` (OPFS helpers), `features/` folder structure, the Today screen's section slots, `tokens.css` theme variables.
- **Phase 3 hooks into:** `tokens.css` accent + partial-fill alpha ramp (D-17), Calendar tab route already in place, hash-route deep-link pattern.
- **Phase 4 hooks into:** Settings screen structure, install-card component pattern, eviction-warning banner (already built in Phase 1 — Phase 4 will reuse/extend with export prompts).

</code_context>

<specifics>
## Specific Ideas

- User's primary device is iPhone; shell must feel native (bottom tabs, safe-area insets, standalone-mode detection).
- YOLO / ship-fast mode: prefer shadcn defaults where they're "good enough" rather than custom work. Custom palettes deferred unless they unlock real value.
- CLAUDE.md's description of "calm, minimal, low-noise" is the aesthetic North Star — err on the side of restraint in shell chrome.

</specifics>

<deferred>
## Deferred Ideas

- **SETUP-06 (in-app SW update banner)** — remains v2. Phase 1 uses silent `autoUpdate` + version line in Settings.
- **Light mode theme** — out of scope per PROJECT.md ("dark mode, minimal aesthetic").
- **Custom calm palette (Linear-ish warm neutrals)** — rejected in favor of shadcn zinc for speed. Can revisit post-v1 if the palette feels wrong in daily use.
- **Per-segment colored DayCell quadrants** — rejected; single-hue alpha ramp chosen for clarity and streak-anxiety mitigation.
- **Testing framework (Vitest)** — decision deferred to Claude's discretion in Phase 1 planning. If added, only scope is `todayKey()` unit test validating 11:30pm UTC-5 behavior.
- **Goals singleton default seeding** — Claude's discretion during Phase 2 planning (not Phase 1 scope since Settings UI is Phase 2).

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-20*
