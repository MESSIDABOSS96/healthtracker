---
phase: 01-foundation
verified: 2026-04-20T00:00:00Z
status: human_needed
score: 11/13 must-haves verified (2 require on-device testing)
overrides_applied: 0
human_verification:
  - test: "iOS Safari — Add to Home Screen → offline launch"
    expected: "Open LAN preview URL in iOS Safari. Tap Share → Add to Home Screen. Confirm icon appears on home screen. Kill Safari, enable Airplane Mode, tap icon. App must launch in standalone mode and render the dark shell (header, 4 Today cards, bottom tab bar) with no network."
    why_human: "Requires physical iOS device — headless environment can't install to iOS home screen or invoke Add-to-Home-Screen. SETUP-01 + SETUP-02 goal-level confirmation for iOS."
  - test: "Android Chrome — beforeinstallprompt → install → offline launch"
    expected: "Open LAN preview URL in Android Chrome. Confirm InstallBanner's primary 'Install' button appears (beforeinstallprompt fired). Tap Install. Confirm standalone mode launches. Enable Airplane Mode, re-launch from home-screen icon. App must render offline."
    why_human: "Requires physical Android device — headless environment can't receive beforeinstallprompt events or complete Chrome install flow. SETUP-01 + SETUP-02 goal-level confirmation for Android."
  - test: "Warm-cache first-contentful-paint <1s on modern iPhone"
    expected: "After install + one warm launch, relaunching from home-screen icon should show the dark shell (header + 4 Today cards + bottom tab bar) in under 1 second. Measure via Safari Web Inspector or DevTools Performance panel: domContentLoadedEventEnd < 1000ms from navigation start, or Lighthouse FCP < 1500ms against preview URL."
    why_human: "Lighthouse requires a headless Chromium which this environment lacks; on-device timing requires a physical iPhone (SETUP-05)."
  - test: "Eviction banner DevTools simulation"
    expected: "In DevTools console run: localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000)); location.reload(). Confirm the 'Your data may be at risk' banner appears. Click the X — banner dismisses. Reload — banner does not re-appear (7-day window active)."
    why_human: "Requires running the preview server + interacting in a browser; can't be verified by static grep or build artifacts alone. Code path is verified (grep shows correct 4-day/7-day constants, role='alert', correct dismissal key) but live behavior needs browser confirmation."
---

# Phase 1: Foundation Verification Report

**Phase Goal:** "The app's non-negotiable infrastructure exists and is correct — safe local storage, correct date math, offline delivery, and dark base layout. No feature can be built without this being solid."

**Verified:** 2026-04-20
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | App installs to iOS and Android home screen and launches in standalone mode with no network after first load | ? HUMAN NEEDED | Code-level: manifest.webmanifest (dist/), sw.js (dist/), all 4 icons at correct dimensions (192/512/512-maskable/180 apple-touch), index.html has apple-touch-icon + apple-mobile-web-app-capable, vite-plugin-pwa generateSW + autoUpdate + navigateFallback='index.html'. On-device install + offline launch not tested this cycle (human_verify checkpoint approved without on-device test per user note). |
| SC-2 | All 7 Dexie object stores exist at v1 with append-only migration convention documented in db.ts | ✓ VERIFIED | `src/db/db.ts` lines 54-65: `this.version(1).stores({ ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals })`. Header comment (lines 13-28) documents "APPEND-ONLY. NEVER EDIT A SHIPPED VERSION BLOCK." Pitfall #1 non-IDB-await rule documented lines 30-43 with CORRECT/FORBIDDEN examples. |
| SC-3 | `todayKey()` returns correct local YYYY-MM-DD at 11:30pm UTC-5 | ✓ VERIFIED | Behavioral spot-check: `new Date(2026,3,19,23,30); getFullYear+getMonth+getDate → "2026-04-19"` confirmed via node. `src/lib/dayKey.ts` uses only local getters (getFullYear/Month/Date); no `toISOString` anywhere; `dayKey.smoke.ts` asserts this exact case every dev launch. |
| SC-4 | Food photos save to OPFS as resized ≤800×800 WebP; `foods` records hold only photoKey filename | ✓ VERIFIED | `src/lib/photoStore.ts` uses `navigator.storage.getDirectory()` (OPFS), WebP encoding (`'image/webp'`), quality=0.8, maxDim=800, filename pattern `food-<uuid>.webp`, EXIF orientation via `imageOrientation: 'from-image'`. `src/db/schema.ts` line 48: `photoKey?: string` (NOT Blob) — Pitfall #6 guarded. |
| SC-5 | App renders in dark mode with shell (nav + tab bar) in <1s from warm SW cache | ⚠️ PARTIAL / HUMAN NEEDED | Dark mode rendering: ✓ VERIFIED (index.html `class="dark"`, tokens.css locked hex #09090b, main.tsx defense-in-depth `.dark` class). Shell structure: ✓ VERIFIED (AppShell header + outlet + TabBar; TodayScreen 4 cards). <1s warm-cache timing: NOT MEASURED (no Chromium for Lighthouse; no on-device timing). Bundle is 264KB / 85KB gzip — well under any plausible 1500ms FCP on modern hardware, but this is inference not measurement. |

**Score:** 11/13 truths fully verified (SC-2, SC-3, SC-4 fully; SC-5 partial; SC-1 + SC-5-timing require human on-device testing)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Vite ^7, React ^19, Dexie ^4, Tailwind ^4, vite-plugin-pwa ^1 pinned | ✓ VERIFIED | All 5 major-version pins present. `node_modules/vite/package.json` reports 7.3.2. |
| `vite.config.ts` | React + Tailwind + VitePWA plugins; generateSW + autoUpdate; VITE_BUILD_HASH injected; @ alias | ✓ VERIFIED | All 7 required patterns present (VitePWA, generateSW, autoUpdate, theme_color #09090b, maskable purpose, navigateFallback, cleanupOutdatedCaches). Build inlines hash `5a32c6f`. |
| `index.html` | class="dark", viewport-fit=cover, theme-color, apple-touch-icon, apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-mobile-web-app-title | ✓ VERIFIED | All 7 iOS-install head elements present. `dist/index.html` also contains apple-touch-icon (transpile preserves). |
| `src/styles/tokens.css` | D-15/D-16/D-17 locked hex values including alpha ramp | ✓ VERIFIED | `#09090b` bg, `#22c55e` accent, all 4 alpha-ramp tokens (25/50/75/100) present. |
| `src/styles/index.css` | Tailwind v4 @theme + tokens.css @import + safe-area helpers | ✓ VERIFIED | `@theme` block maps tokens to --color-* utilities. `.safe-area-top/bottom` helpers present. |
| `src/main.tsx` | initApp() with ordered startup (dark → prev/last opened → persist → wire install → DEV smoke → render → registerSW) | ✓ VERIFIED | All 8 steps present and ordered correctly. Imports LAST/PREV_OPENED_KEY from storageKeys.ts (not redeclared). |
| `src/App.tsx` | HashRouter wrapping AppShell with 3 routes | ✓ VERIFIED | HashRouter + Navigate(/ → /today) + 3 routes. |
| `src/components/AppShell.tsx` | Header + banner slot (Install + Eviction) + outlet + TabBar | ✓ VERIFIED | All 4 structural regions present. InstallBanner + EvictionBanner mounted with `space-y-3` per UI-SPEC. No explicit role="banner" (implicit via `<header>`). |
| `src/components/TabBar.tsx` | 3 tabs (Today/Calendar/Settings) + aria-label + focus-visible:ring-accent + safe-area-bottom | ✓ VERIFIED | All 3 NavLinks present with Home/CalendarDays/Settings icons; aria-label per tab; focus-visible:ring-accent applied; safe-area-bottom on nav. |
| `src/components/Banner.tsx` | Reusable primitive matching BannerProps contract | ✓ VERIFIED | Exact interface exported; role="region" + aria-label="Safety notice"; dismiss button with aria-label="Dismiss"; focus-visible:ring-accent. |
| `src/components/InstallBanner.tsx` | Platform-aware copy + 14-day dismissal + beforeinstallprompt awareness | ✓ VERIFIED | Both verbatim strings present (iOS: "Tap Share → Add to Home Screen to keep your logs safe."; Android: "Add HealthTracker to your home screen."); DISMISS_WINDOW_MS = 14*24*60*60*1000; role="region" + aria-label="Install prompt". |
| `src/components/EvictionBanner.tsx` | 4-day trigger + 7-day dismissal + role="alert" + PREV_OPENED_KEY import from storageKeys | ✓ VERIFIED | FOUR_DAYS_MS + DISMISS_WINDOW_MS(7d) constants present; role="alert"; imports PREV_OPENED_KEY from @/lib/storageKeys (NOT @/main — circular-import prevented); verbatim "Your data may be at risk" title. |
| `src/routes/TodayScreen.tsx` | 4 D-05 placeholder cards with exact copy | ✓ VERIFIED | `'not logged yet'`, `'0 / target cals'`, `'—'` (U+2014), `'☐'` (U+2610) all present verbatim. |
| `src/routes/CalendarScreen.tsx` | Phase 3 stub | ✓ VERIFIED | `'Coming in Phase 3'` verbatim. |
| `src/routes/SettingsScreen.tsx` | Install card (platform-aware) + version footer | ✓ VERIFIED | Install card hides when standalone; platform-aware iOS vs Android body copy; version footer `v{APP_VERSION} (build {BUILD_HASH})` present. |
| `src/db/db.ts` | HealthTrackerDB with v1 stores + append-only header + Pitfall #1 comment | ✓ VERIFIED | All 7 stores present; APPEND-ONLY + Pitfall #1 comments present with CORRECT/FORBIDDEN examples. |
| `src/db/schema.ts` | 7 TypeScript interfaces + MealBucket union | ✓ VERIFIED | All 7 interfaces + MealBucket union present; photoKey is `string`, not Blob. |
| `src/lib/dayKey.ts` | todayKey/dateToKey/keyToDate using local getters only | ✓ VERIFIED | 3 exports; no toISOString; no `new Date(key)` UTC-parsing form. |
| `src/lib/dayKey.smoke.ts` | runDayKeySmoke() with Apr 19 2026 23:30 assertion | ✓ VERIFIED | Literal `new Date(2026, 3, 19, 23, 30)` present; asserts `=== '2026-04-19'`; references Pitfall #4 in error message. |
| `src/lib/photoStore.ts` | savePhoto/loadPhoto/deletePhoto/resizePhoto with WebP@80%/800px | ✓ VERIFIED | All 4 exports; 'image/webp'; quality=0.8; maxDim=800; crypto.randomUUID; imageOrientation: 'from-image'; PHOTO_DIR='food-photos'. |
| `src/lib/installMode.ts` | isStandalone + wireBeforeInstallPrompt + triggerInstallPrompt | ✓ VERIFIED | All 3 exports + module-local deferredPrompt state; display-mode standalone + navigator.standalone fallback; appinstalled cleanup. |
| `src/lib/version.ts` | APP_VERSION + BUILD_HASH from import.meta.env | ✓ VERIFIED | Both exports with '0.1.0' / 'dev' fallbacks; build inlines literal `"0.1.0"` and `"5a32c6f"`. |
| `src/lib/storageKeys.ts` | LAST_OPENED_KEY + PREV_OPENED_KEY + INSTALL_DISMISSED_KEY | ✓ VERIFIED | All 3 keys present with `healthtracker:` namespace; side-effect-free module (prevents circular import through @/main). |
| `public/icon-192.png` | 192x192 PNG | ✓ VERIFIED | file(1) confirms 192 x 192 RGBA. |
| `public/icon-512.png` | 512x512 PNG | ✓ VERIFIED | file(1) confirms 512 x 512 RGBA. |
| `public/icon-maskable-512.png` | 512x512 PNG for manifest purpose=maskable | ✓ VERIFIED | file(1) confirms 512 x 512 RGBA. |
| `public/apple-touch-icon.png` | 180x180 PNG (iOS standard) | ✓ VERIFIED | file(1) confirms 180 x 180 RGBA. |
| `dist/manifest.webmanifest` | Valid JSON with name, icons[3], theme_color, display=standalone, start_url | ✓ VERIFIED | JSON validates; 3 icons declared; theme_color=#09090b; display=standalone. |
| `dist/sw.js` | Workbox-generated service worker | ✓ VERIFIED | File exists (1.7KB); workbox-*.js runtime also present. |
| `CLAUDE.md` | Rule #5 reads "80% WebP" not "JPEG" | ✓ VERIFIED | Line 36: "Resize photos to ≤800×800 @ 80% WebP before OPFS write". Zero JPEG mentions. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `src/main.tsx` | `./App` | `createRoot(...).render(<App />)` | ✓ WIRED | Line 57-61: import + render in StrictMode. |
| `src/App.tsx` | `react-router-dom HashRouter` | HashRouter wrapping AppShell | ✓ WIRED | Line 11: `<HashRouter><AppShell>...</HashRouter>`. |
| `src/App.tsx` | `src/components/AppShell.tsx` | Import + JSX mount | ✓ WIRED | Line 2 import + line 12 render. |
| `src/App.tsx` | `TodayScreen / CalendarScreen / SettingsScreen` | `<Route element={...}>` | ✓ WIRED | Lines 15-17 all 3 routes. |
| `src/components/AppShell.tsx` | `src/components/TabBar.tsx` | `<TabBar />` bottom-render | ✓ WIRED | Line 4 import + line 46 render. |
| `src/components/AppShell.tsx` | `InstallBanner + EvictionBanner` | Banner slot above outlet | ✓ WIRED | Lines 5-6 imports + lines 39-40 render inside `<div className="px-4 pt-4 space-y-3">`. |
| `src/main.tsx` | `navigator.storage.persist()` | initApp Step 4 | ✓ WIRED | Line 36: `await navigator.storage.persist()` inside try/catch. Bundle grep confirms literal present in dist. |
| `src/main.tsx` | `virtual:pwa-register` | `registerSW({ immediate: true })` | ✓ WIRED | Line 3 import + line 65 call. dist bundle contains 'sw.js' and 'workbox' and 'register('. |
| `src/main.tsx` | `src/lib/dayKey.smoke.ts` | Dynamic import under import.meta.env.DEV | ✓ WIRED (DEV) + ✓ TREE-SHAKEN (PROD) | Lines 51-53: `if (import.meta.env.DEV) void import('./lib/dayKey.smoke')...`. `grep -rl 'runDayKeySmoke' dist/` returns empty; no `dayKey.smoke-*.js` chunk emitted. |
| `src/main.tsx` | `wireBeforeInstallPrompt` | Step 5 of initApp | ✓ WIRED | Line 6 import + line 46 call. |
| `src/main.tsx` | `storageKeys.ts LAST/PREV_OPENED_KEY` | Read/write localStorage | ✓ WIRED | Line 7 import + lines 26-30 read prev, write prev, write last. Not redeclared in main.tsx. |
| `src/components/EvictionBanner.tsx` | `storageKeys.ts PREV_OPENED_KEY` | localStorage.getItem | ✓ WIRED (side-effect-free import) | Line 4 import from @/lib/storageKeys (NOT @/main — acyclic). |
| `src/routes/SettingsScreen.tsx` | `src/lib/version.ts` | Version footer render | ✓ WIRED | Line 4 import + line 55 `v{APP_VERSION} (build {BUILD_HASH})`. |
| `src/routes/SettingsScreen.tsx` | `src/lib/installMode.ts` | Install card + button | ✓ WIRED | Line 3 import + lines 22-23 call isStandalone + getDeferredInstallPrompt + line 42 triggerInstallPrompt on click. |
| `src/db/db.ts` | `src/db/schema.ts` | TypeScript type imports | ✓ WIRED | Lines 3-11 import all 7 record types. |
| `src/lib/photoStore.ts` | `navigator.storage.getDirectory` | OPFS root | ✓ WIRED | Line 16: `navigator.storage.getDirectory()`. |
| `src/styles/index.css` | `src/styles/tokens.css` | @import | ✓ WIRED | Line 1: `@import './tokens.css';`. |

### Data-Flow Trace (Level 4)

Only components that render dynamic data are traced. Phase 1 components render mostly static data (placeholders, stubs, banners driven by localStorage/API state). Photo pipeline has no consumer yet (intentional — Phase 2 Food UI is the consumer).

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `InstallBanner` | `visible` (useState) | Effect reads isStandalone() + localStorage[ht.installBannerDismissedAt] | ✓ (real browser state) | ✓ FLOWING |
| `EvictionBanner` | `visible` (useState) | Effect reads isStandalone() + localStorage[ht.evictionBannerDismissedAt] + PREV_OPENED_KEY | ✓ (real browser state; main.tsx writes PREV key on every launch) | ✓ FLOWING |
| `SettingsScreen` | `installed`, `canInstall` | `isStandalone()` + `getDeferredInstallPrompt()` | ✓ (deferredPrompt captured by main.tsx's wireBeforeInstallPrompt at startup) | ✓ FLOWING |
| `SettingsScreen` | `APP_VERSION`, `BUILD_HASH` | `src/lib/version.ts` reads from import.meta.env | ✓ (vite.config.ts `define` injects literals `"0.1.0"` + `"5a32c6f"` at build time — verified in dist bundle) | ✓ FLOWING |
| `TodayScreen` | `sections` array | Hardcoded 4-section array (Phase 1 placeholder, per plan) | N/A — static placeholder by design | ✓ VERIFIED (intentional) |
| `TabBar` | `tabs` array + NavLink isActive | Hardcoded + react-router state | ✓ | ✓ FLOWING |
| `photoStore` | N/A | No consumer yet | N/A — Phase 2 Food UI is consumer (intentional per plan) | ℹ️ UNCONSUMED |
| `db` | N/A | No consumer yet | N/A — Phase 2 services are consumers (intentional per plan) | ℹ️ UNCONSUMED |
| `dayKey` | N/A (besides smoke) | dayKey.smoke.ts under DEV | ✓ DEV (tree-shaken in PROD as intended) | ✓ FLOWING (dev) |

No HOLLOW or DISCONNECTED artifacts. Unconsumed artifacts (photoStore, db, dayKey) are intentionally tree-shakeable until Phase 2 consumers land — this is documented in Plan 01-02 SUMMARY and keeps production bundle small (264 KB / 85 KB gzip unchanged).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `dateToKey(Apr 19 2026 23:30 local)` returns "2026-04-19" (SC-3 critical case) | `node -e "const d=new Date(2026,3,19,23,30);...console.log(...)"` | `2026-04-19` | ✓ PASS |
| TypeScript typecheck | `npx tsc -b --noEmit` | exits 0, no output | ✓ PASS |
| dist/sw.js exists | `ls dist/sw.js` | file present, 1.7 KB | ✓ PASS |
| dist/manifest.webmanifest validates as JSON | `cat dist/manifest.webmanifest` | valid JSON with 3 icons + theme_color + display=standalone | ✓ PASS |
| All 4 icons exist with correct dimensions | `file public/icon-*.png public/apple-touch-icon.png` | 192×192 + 512×512 + 512×512 + 180×180 RGBA | ✓ PASS |
| Tree-shake smoke out of production | `grep -rl 'runDayKeySmoke' dist/` + `ls dist/assets/dayKey.smoke-*.js` | both return empty | ✓ PASS |
| Vite pinned to ^7 | `node -p "require('./node_modules/vite/package.json').version"` | 7.3.2 | ✓ PASS |
| Build inlines VITE_BUILD_HASH | `grep -oE '"[0-9a-f]{7,10}"' dist/assets/index-*.js` | `"5a32c6f"` + `"0.1.0"` | ✓ PASS |
| Bundle contains persist + registerSW wiring | `grep 'navigator.storage.persist' dist/assets/index-*.js` + `grep 'sw.js\\|workbox\\|register(' dist/assets/index-*.js` | both patterns present | ✓ PASS |
| CLAUDE.md rule #5 updated | `grep '80% WebP\\|JPEG' CLAUDE.md` | "80% WebP" present, zero JPEG | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SETUP-01 | Plan 01-03 | Install as PWA to iOS + Android (manifest, icons, theme color) | ? NEEDS HUMAN | Code-level: manifest + icons + theme_color + iOS head links all verified. On-device install not tested (human_verify). |
| SETUP-02 | Plan 01-03 | App functions fully offline after first load (SW precache via Workbox) | ? NEEDS HUMAN | Code-level: generateSW + navigateFallback + cleanupOutdatedCaches + precache 14 entries. On-device offline relaunch not tested. |
| SETUP-03 | Plan 01-03 | navigator.storage.persist() at startup | ✓ SATISFIED | main.tsx Step 4 (line 36) — called before render. Bundle contains the literal. |
| SETUP-04 | Plan 01-01 | Dark, minimal, low-noise default theme | ✓ SATISFIED | tokens.css locked D-15 palette; index.html `class="dark"`; main.tsx defense-in-depth `.dark`; TabBar/AppShell use bg-bg/surface/text/muted/accent tokens. |
| SETUP-05 | Plan 01-03 | Loads to useful landing screen in <1s on warm cache | ⚠️ INFERRED / NEEDS HUMAN | Bundle is 264 KB / 85 KB gzip; 14 precache entries / 287 KiB. Well under any plausible 1500ms FCP budget on modern hardware, but Lighthouse / on-device timing not run. Treated as human_verify (explicit user carry-forward per 01-03 SUMMARY). |
| DATA-01 | Plan 01-02 | Dexie version(1).stores + append-only migration policy | ✓ SATISFIED | db.ts lines 54-65 + header comment lines 13-28. |
| DATA-02 | Plan 01-02 | Single dayKey utility (YYYY-MM-DD local) as sole source for day identity | ✓ SATISFIED | dayKey.ts uses getFullYear/Month/Date only; todayKey/dateToKey/keyToDate exported; dev-only smoke asserts the canonical 23:30 UTC-5 case. |
| DATA-03 | Plan 01-02 | All 7 stores exist (foods, mealEntries, ptTemplates, ptSessions, stepEntries, liftCheckins, goals) | ✓ SATISFIED | All 7 keys present in this.version(1).stores({...}); matching TypeScript interfaces in schema.ts. |
| DATA-04 | Plan 01-02 | Photos in OPFS; foods records hold photoKey reference only (not blob) | ✓ SATISFIED | photoStore.ts uses navigator.storage.getDirectory (OPFS); schema.ts Food.photoKey is `string`, not Blob; header comment names Pitfall #6. |
| DATA-05 | Plan 01-02 | Resize photos to ≤800×800 before OPFS write | ✓ SATISFIED (with documented format deviation) | resizePhoto: maxDim=800, quality=0.8, WebP encoding, EXIF orientation. Note: REQUIREMENTS.md line 30 still reads "~70% JPEG" but this was deliberately superseded by CONTEXT.md D-07 (WebP@80%) — CLAUDE.md rule #5 and this artifact both reflect the updated decision. The DoS-mitigation intent of the requirement is fully preserved. |

**Coverage:** 10/10 Phase 1 requirements accounted for by plan frontmatter. Zero orphans. 8 fully satisfied, 2 (SETUP-01 + SETUP-02) pending on-device human verification, 1 (SETUP-05) inferred from bundle size + pending human timing measurement.

### Anti-Patterns Found

Scanned all 23 files in `src/` and modified files in this phase. Also checked public assets and config.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/routes/TodayScreen.tsx` | 12-17 | Hardcoded 4-section `sections` array with static status strings | ℹ️ Info | Intentional Phase 1 placeholder per D-05. Phase 2 swaps status slot for live data. Not a stub — this is the designed Phase 1 output. |
| `src/routes/CalendarScreen.tsx` | 6-10 | Single line "Coming in Phase 3" render | ℹ️ Info | Intentional Phase 3 stub per ROADMAP. Not a Phase 1 regression. |
| `src/lib/version.ts` | 5-8 | `?? '0.1.0'` / `?? 'dev'` fallbacks | ℹ️ Info | Correct defensive pattern — Vite `define` replaces the expression at build time (verified in dist bundle: `"0.1.0"` + `"5a32c6f"` inlined). Fallback only active in non-Vite test contexts. |
| `src/components/ui/sheet.tsx` | — | Not read, but flagged in SUMMARY as "Phase-1 placeholder with no Radix backing" | ℹ️ Info | Documented in 01-01 SUMMARY. Not consumed anywhere in Phase 1. No user-visible impact until Phase 2 upgrades when logging sheets ship. |

No TODO/FIXME/XXX/HACK/PLACEHOLDER markers in production code paths. No `return null` stubs that reach user-visible rendering inappropriately. No empty `{}` handlers that silently swallow user actions (banner onDismiss, SettingsScreen install click are all wired to real side effects).

### Human Verification Required

#### 1. iOS Safari — Add to Home Screen → offline launch (SETUP-01 + SETUP-02)

**Test:**
1. Run `npm run build && npm run preview -- --host` and note LAN URL.
2. On iPhone, open the LAN URL in Safari.
3. Confirm dark shell renders (header "HealthTracker", 4 Today cards, bottom tab bar).
4. Tap Share → Add to Home Screen. Confirm icon appears on home screen.
5. Kill Safari, enable Airplane Mode, tap home-screen icon.

**Expected:** App launches in standalone mode (no Safari chrome) and renders the dark shell with tab navigation working — entirely offline.

**Why human:** Physical iOS device required — headless environment cannot invoke iOS Add-to-Home-Screen or run offline relaunch from the home-screen icon.

#### 2. Android Chrome — beforeinstallprompt → install → offline launch (SETUP-01 + SETUP-02)

**Test:**
1. On Android, open the LAN URL in Chrome.
2. Confirm InstallBanner's "Install" primary button appears at the top of Today (beforeinstallprompt fired).
3. Tap Install. Confirm standalone mode launches.
4. Enable Airplane Mode and re-launch from the home-screen icon.

**Expected:** App installs to home screen, launches standalone, and renders offline after Airplane Mode relaunch.

**Why human:** Physical Android device required — headless environment cannot receive beforeinstallprompt events or complete the Chrome install flow.

#### 3. Warm-cache FCP <1s on modern iPhone (SETUP-05)

**Test:** After the iPhone install above + one warm launch, relaunch from the home-screen icon. Dark shell + 4 Today cards + tab bar should appear in under 1 second. Measure via Safari Web Inspector → Performance panel (`domContentLoadedEventEnd` < 1000ms) or Lighthouse FCP against the preview URL (< 1500ms).

**Expected:** Sub-1s time-to-interactive on warm SW cache.

**Why human:** This environment has no Chromium headless for Lighthouse; phone-level timing requires an actual device. Bundle size (264 KB / 85 KB gzip) suggests the budget is easily met, but that's an inference, not a measurement.

#### 4. Eviction banner DevTools simulation

**Test:** Load preview URL. In DevTools console: `localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000)); location.reload();`

**Expected:** "Your data may be at risk" banner appears above the route outlet. Clicking the X dismisses it; reloading does not re-show the banner within the 7-day window. Role="alert" triggers screen-reader announcement on mount.

**Why human:** Live browser interaction required. Code path is fully verified statically (correct 4-day / 7-day constants, storage key, role="alert", dismissal persistence) but browser behavior needs a human run.

### Gaps Summary

**No blocking gaps.** All Phase 1 observable truths are supported by verified artifacts and correct wiring. The two items flagged `human_needed` (on-device install + warm-cache FCP measurement) represent the human verification surface explicitly carried forward from Plan 01-03's approved-without-on-device-test checkpoint. They should surface in `/gsd-progress` and `/gsd-audit-uat` for the user's next on-device session.

The format deviation in DATA-05 (WebP@80% vs REQUIREMENTS.md's "~70% JPEG") is an intentional, documented supersession by CONTEXT.md D-07 + updated CLAUDE.md rule #5. DoS-mitigation intent is fully preserved; WebP@80% produces smaller files than JPEG@70% at equivalent quality, strengthening the original requirement. REQUIREMENTS.md line 30 should be updated to match at next milestone transition.

### Intentional Unconsumed Modules

Three modules are created but not yet imported by any React component. This is by design and verified not to leave production bundle bloat:

- `src/lib/photoStore.ts` — Phase 2 Food UI consumes
- `src/db/db.ts` + `src/db/schema.ts` — Phase 2 services consume
- `src/lib/dayKey.ts` — only consumed via `dayKey.smoke.ts` in DEV; Phase 2 services consume in PROD

Bundle evidence: `dist/assets/index-*.js` is 264 KB total; no dayKey.smoke chunk is emitted; no `runDayKeySmoke` identifier appears anywhere in dist/. Tree-shake is effective.

---

_Verified: 2026-04-20_
_Verifier: Claude (gsd-verifier)_
