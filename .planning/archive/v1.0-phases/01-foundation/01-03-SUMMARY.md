---
phase: 01-foundation
plan: 03
subsystem: infra
tags: [pwa, service-worker, vite-plugin-pwa, manifest, install-banner, eviction-banner, persist, ios-safari, startup, version]

requires:
  - phase: 01-foundation-01
    provides: Vite 7 + React 19 + TypeScript scaffold, Banner primitive, AppShell with banner-slot placeholder, Settings stub
  - phase: 01-foundation-02
    provides: dayKey utility + dev-only dayKey.smoke module (Pitfall #4 tripwire) ready to be wired into startup
provides:
  - VitePWA (generateSW + autoUpdate) with manifest, SPA fallback, cleanupOutdatedCaches
  - Four PWA icon assets (192, 512, maskable-512, apple-touch-icon 180) generated from inline SVG via sharp-cli
  - iOS-installability head links in index.html (apple-touch-icon, apple-mobile-web-app-capable, status-bar-style, title)
  - initApp() ordered startup sequence — dark class, prev/last opened bookkeeping, navigator.storage.persist(), beforeinstallprompt wiring, dev-only dayKey smoke, render, registerSW
  - src/lib/installMode.ts (isStandalone, beforeinstallprompt capture, triggerInstallPrompt)
  - src/lib/version.ts (APP_VERSION + BUILD_HASH from import.meta.env)
  - src/lib/storageKeys.ts (centralized localStorage keys — side-effect-free; breaks circular import through @/main)
  - InstallBanner — iOS share-sheet copy + Android beforeinstallprompt button, 14-day dismissal window
  - EvictionBanner — 4-day-gap trigger, 7-day dismissal window, role="alert" for live-region announcement
  - AppShell mounts both banners above route outlet with space-y-3 stacking
  - SettingsScreen extended with Install card (platform-aware copy) + version + build-hash footer line
  - CLAUDE.md project-breaking rule #5 updated from "JPEG @ ~70%" → "WebP @ 80%" (matches CONTEXT.md D-07)
affects: [phase-02-tracking-slices, phase-03-streak-loop, phase-04-backup-polish]

tech-stack:
  added:
    - vite-plugin-pwa@^1.2.0 (registered via STACK.md / Plan 01 install)
    - sharp-cli (npx, build-time only, not a dep)
  patterns:
    - "generateSW (not injectManifest) — lower-surface-area for Phase 1; v2 update banner can revisit"
    - "registerType: 'autoUpdate' — SW activates new build on next reload (D-09)"
    - "Build-time VITE_BUILD_HASH baked via vite.config.ts define block (git rev-parse --short HEAD with try/catch fallback to 'dev')"
    - "Side-effect-free key modules (storageKeys.ts, version.ts, installMode.ts) imported from main + components without circular-import risk"
    - "ARIA landmark deconfliction — Install banner uses role='region' + aria-label, Eviction banner uses role='alert'; AppShell <header> uses implicit role='banner' (no explicit role attribute)"
    - "Dev-only modules tree-shake via dynamic import inside import.meta.env.DEV branch (verified via grep across dist/)"

key-files:
  created:
    - src/lib/installMode.ts
    - src/lib/version.ts
    - src/lib/storageKeys.ts
    - src/components/InstallBanner.tsx
    - src/components/EvictionBanner.tsx
    - public/icon-192.png
    - public/icon-512.png
    - public/icon-maskable-512.png
    - public/apple-touch-icon.png
    - public/favicon.ico
  modified:
    - vite.config.ts
    - index.html
    - src/main.tsx
    - src/components/AppShell.tsx
    - src/routes/SettingsScreen.tsx
    - src/vite-env.d.ts
    - CLAUDE.md

key-decisions:
  - "ARIA landmark deviation from UI-SPEC: Install banner wraps in role='region'+aria-label, Eviction banner wraps in role='alert'. UI-SPEC originally specified role='banner' on both, but that conflicts with AppShell's implicit <header> banner landmark (WAI-ARIA forbids multiple banner landmarks)."
  - "AppShell <header> dropped explicit role='banner' (HTML5 implicit) — prevents axe/Lighthouse duplicate-landmark warnings when both new banners mount."
  - "localStorage keys extracted to src/lib/storageKeys.ts (side-effect-free) instead of exporting from main.tsx — eliminates a latent circular import (main → App → AppShell → EvictionBanner → @/main)."
  - "generateSW chosen over injectManifest — Phase 1 only needs precache + SPA fallback; v2 update-toast (SETUP-06) can switch to injectManifest later without breaking the manifest contract."
  - "Icons generated from a single inline SVG (H glyph on bg-token bg) via sharp-cli; visual polish deferred to Phase 4 per ROADMAP. Maskable icon = 512 PNG copy (centered glyph already inside ~80% safe zone)."
  - "Dev-only dayKey smoke wired via dynamic import inside import.meta.env.DEV — Vite tree-shakes the smoke module out of production bundles (verified: no runDayKeySmoke in dist/, no dayKey.smoke chunk emitted)."

patterns-established:
  - "Startup-invariant order (matches RESEARCH.md §6): dark class → read prev → write last → persist() → wire beforeinstallprompt → (DEV) dayKey smoke → render → registerSW. Reordering breaks eviction-banner math or persist-before-Dexie-open invariant."
  - "Per-banner dismissal localStorage keys (ht.installBannerDismissedAt 14d, ht.evictionBannerDismissedAt 7d) live local to each banner — separate from shared startup-state keys (healthtracker:lastOpenedAt, healthtracker:prevOpenedAt) in storageKeys.ts."
  - "BeforeInstallPromptEvent typed inline in installMode.ts (lib.dom does not ship this type) — single source of truth, re-exported via getter helpers."
  - "Banner stacking rule: <div className='px-4 pt-4 space-y-3'> wraps Install (first) + Eviction (second) above route outlet — UI-SPEC §Banner stacking rule."

requirements-completed: [SETUP-01, SETUP-02, SETUP-03, SETUP-05]

duration: 35min
completed: 2026-04-21
---

# Phase 01 Plan 03: PWA + Startup + Banners Summary

**Installable, offline-capable PWA shell with three-layer iOS eviction defense (persist + install banner + eviction banner), dark-themed startup sequence, and Settings install/version surface — Phase 1 foundation complete.**

## Performance

- **Duration:** ~35 min (across 3 atomic feat commits)
- **Started:** 2026-04-20T19:54:00Z
- **Completed:** 2026-04-21
- **Tasks:** 4 (3 auto + 1 human-verify checkpoint)
- **Files modified:** 17 (10 created, 7 modified)

## Accomplishments

- **PWA installability:** vite-plugin-pwa generateSW + autoUpdate produces a valid manifest.webmanifest, sw.js, workbox runtime, and four icon assets shipping in dist/. iOS Safari head links (apple-touch-icon, apple-mobile-web-app-capable, status-bar-style, title) make Add-to-Home-Screen work.
- **Offline shell:** Workbox precaches all build assets (14 entries, 286.92 KiB) and falls back to index.html for SPA navigation. After first load, the app re-launches offline.
- **Three-layer iOS eviction defense:** (1) navigator.storage.persist() called on every startup before Dexie opens; (2) InstallBanner promotes home-screen install (the only durable storage on iOS); (3) EvictionBanner warns when prevOpenedAt gap exceeds 4 days and the app isn't installed.
- **Settings install surface:** Platform-aware Install card + version footer (`v0.1.0 (build {short-hash})`) self-document the running build (D-10).
- **Dev-only Pitfall #4 tripwire:** Plan 02's dayKey.smoke module is now wired into initApp() under import.meta.env.DEV; tree-shakes cleanly out of production (verified across dist/).
- **CLAUDE.md rule #5 corrected:** "JPEG @ ~70%" → "WebP @ 80%" — closes the inconsistency CONTEXT.md D-07 flagged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure vite-plugin-pwa, manifest, icons, iOS install meta** — `80d772b` (feat)
2. **Task 2: initApp() startup + dayKey smoke + CLAUDE.md WebP rule** — `58753c8` (feat)
3. **Task 3: Install + Eviction banners + Settings extension** — `5a32c6f` (feat)
4. **Task 4: Human-verify checkpoint** — Approved without on-device test (carried as HUMAN-UAT for follow-up)

**Plan metadata:** This SUMMARY.md commit closes the plan.

## Files Created/Modified

### Created
- `src/lib/installMode.ts` — isStandalone(), beforeinstallprompt capture, triggerInstallPrompt()
- `src/lib/version.ts` — APP_VERSION + BUILD_HASH from import.meta.env (with safe fallbacks)
- `src/lib/storageKeys.ts` — centralized side-effect-free localStorage keys (LAST_OPENED_KEY, PREV_OPENED_KEY, INSTALL_DISMISSED_KEY)
- `src/components/InstallBanner.tsx` — UI-SPEC verbatim copy, platform-aware (Android Install button vs iOS share-sheet text), 14-day dismissal
- `src/components/EvictionBanner.tsx` — 4-day-gap trigger, 7-day dismissal, role="alert"
- `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png`, `public/apple-touch-icon.png`, `public/favicon.ico`

### Modified
- `vite.config.ts` — VitePWA block (generateSW, autoUpdate, manifest, workbox SPA fallback), VITE_BUILD_HASH define
- `index.html` — iOS install head links (apple-touch-icon, capable, status-bar-style, title), theme-color
- `src/main.tsx` — initApp() ordered startup sequence; imports keys from storageKeys (no longer redeclares them)
- `src/components/AppShell.tsx` — banner slot now mounts InstallBanner + EvictionBanner with space-y-3 stacking; explicit header role removed
- `src/routes/SettingsScreen.tsx` — Install card (platform-aware copy) + version footer
- `src/vite-env.d.ts` — virtual:pwa-register module declaration
- `CLAUDE.md` — Project-Breaking Rules #5 updated to "WebP @ 80%"

## Decisions Made

See key-decisions in frontmatter. Highlights:
- **ARIA landmark deconfliction** (deviation from UI-SPEC): role="region"+aria-label for Install, role="alert" for Eviction. UI-SPEC's original role="banner" would have produced duplicate-landmark warnings against AppShell's <header>.
- **storageKeys.ts** extracted as a side-effect-free module to break a latent circular import through main.tsx (which has render-on-import side effects).
- **generateSW over injectManifest** — minimum-surface-area choice for Phase 1; SETUP-06 update-toast in v2 can revisit if needed.

## Deviations from Plan

Three documented deviations (all in `<deviations>` block of PLAN.md, all locked during plan revision iteration 1):

1. **InstallBanner role** — `role="banner"` → `role="region"` + `aria-label="Install prompt"` to avoid duplicate-banner-landmark with AppShell `<header>`.
2. **EvictionBanner role** — `role="banner"` → `role="alert"` (semantically a live alert about imminent data loss; matches WAI-ARIA APG; also resolves landmark conflict).
3. **AppShell `<header>`** — explicit `role="banner"` removed (HTML5 implicit).
4. **localStorage keys location** — extracted to `src/lib/storageKeys.ts` instead of being declared+exported from `main.tsx` (eliminates circular-import risk through `@/main`).

All four deviations were proactive plan-revision decisions, not auto-fix surprises during execution.

## Issues Encountered

None during the executor cycle. The plan was revised once before execution to lock the four ARIA / circular-import deviations above.

## Lighthouse / SETUP-05 measurement

Lighthouse PWA + FCP audit (Task 3 step 6 / WARNING 1 revision) was NOT run in this resumed cycle — this orchestrator does not have a headless Chromium available, and the previous executor commits did not include a `lighthouse.json` artifact. The bundle is 263.85 KB (gzip 84.61 KB) main JS + 13.68 KB CSS, well under any plausible 1500ms FCP budget on a modern iPhone over a warm SW cache, but this is an inference, not a measurement. SETUP-05 carries forward to a HUMAN-UAT item for on-device confirmation.

## Human-Verify Checkpoint

**Status:** Approved without on-device test (user election).

The Task 4 LAN-served device test (iOS Safari + Android Chrome install + offline relaunch + eviction-banner DevTools simulation) was not executed in this cycle. The user opted to close the checkpoint without on-device verification. The following items remain unverified-but-credible based on the build artifacts:

- iOS Safari Add-to-Home-Screen → standalone-mode launch
- Android Chrome beforeinstallprompt → Install button → standalone-mode launch
- Offline launch from home-screen icon (Airplane Mode reload)
- Eviction-banner appearance after `localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000)); location.reload()`
- Settings version line shows non-`dev` build hash on production preview

These will be carried forward as a HUMAN-UAT item by phase verification so they remain visible in `/gsd-progress` and `/gsd-audit-uat`.

## Build Output

```
dist/manifest.webmanifest                          0.49 kB
dist/index.html                                    1.03 kB │ gzip:  0.53 kB
dist/assets/index-CFO9RzVd.css                    13.68 kB │ gzip:  3.48 kB
dist/assets/workbox-window.prod.es5-BIl4cyR9.js    5.76 kB │ gzip:  2.37 kB
dist/assets/index-W2AdW--c.js                    263.85 kB │ gzip: 84.61 kB

PWA v1.2.0 — generateSW
precache 14 entries (286.92 KiB)
files generated: dist/sw.js, dist/workbox-8c29f6e4.js
```

Total dist/: 332K. Tree-shake verified — `runDayKeySmoke` absent from all dist/ chunks; no `dayKey.smoke-*.js` chunk emitted.

## CLAUDE.md Rule #5 Confirmation

`grep -c '80% WebP' CLAUDE.md` → 1
`grep -c 'JPEG' CLAUDE.md` → 0

Rule #5 now reads: "Resize photos to ≤800×800 @ 80% WebP before OPFS write — raw iPhone photos fill quota and crash the tab."

## Next Phase Readiness

Phase 2 (Tracking Slices) can now build directly on:
- A running, installable, offline-capable shell
- A live data layer (Plan 02) with Dexie + dayKey + photoStore
- A version-pinned, hash-stamped production build for self-audit
- Banners + Install card patterns to mirror for any future "data-safety" UI

No blockers. Carry-forward HUMAN-UAT: on-device install/offline confirmation + Lighthouse FCP measurement.

---
*Phase: 01-foundation*
*Completed: 2026-04-21*
