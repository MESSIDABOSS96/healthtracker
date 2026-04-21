---
phase: 01-foundation
plan: 03
type: execute
wave: 2
depends_on: ["01-foundation-01"]
files_modified:
  - vite.config.ts
  - index.html
  - src/main.tsx
  - src/App.tsx
  - src/lib/installMode.ts
  - src/lib/version.ts
  - src/lib/storageKeys.ts
  - src/components/InstallBanner.tsx
  - src/components/EvictionBanner.tsx
  - src/components/AppShell.tsx
  - src/routes/SettingsScreen.tsx
  - public/icon-192.png
  - public/icon-512.png
  - public/icon-maskable-512.png
  - public/apple-touch-icon.png
  - public/favicon.ico
  - CLAUDE.md
autonomous: true
requirements: [SETUP-01, SETUP-02, SETUP-03, SETUP-05]
tags: [pwa, service-worker, manifest, install-banner, eviction-banner, startup, persist, safari]

must_haves:
  truths:
    - "After first page load, reloading with network disabled still serves the app from service-worker cache"
    - "Manifest is linked from index.html, validates as JSON, and includes icons 192/512/maskable-512"
    - "index.html contains a <link rel='apple-touch-icon'> pointing to /apple-touch-icon.png (iOS home-screen install)"
    - "navigator.storage.persist() is called on startup before Dexie opens"
    - "Install banner renders when app is not in standalone mode AND not dismissed within 14 days"
    - "Eviction-warning banner renders when lastOpenedAt gap > 4 days AND app is not standalone AND not dismissed within 7 days"
    - "Settings screen shows a version + build-hash line"
    - "CLAUDE.md rule #5 reads 'WebP @ 80%' (not 'JPEG @ 70%')"
    - "dayKey smoke assertion runs on dev startup and tree-shakes out of production builds"
  artifacts:
    - path: "vite.config.ts"
      provides: "VitePWA plugin config with generateSW strategy + registerType autoUpdate"
      contains: "VitePWA"
    - path: "src/main.tsx"
      provides: "initApp() with ordered startup: dark → lastOpenedAt → persist() → render → SW register"
      contains: "navigator.storage.persist"
    - path: "src/components/InstallBanner.tsx"
      provides: "Dismissible install banner wired to beforeinstallprompt + iOS share-sheet instructions"
      exports: ["InstallBanner"]
    - path: "src/components/EvictionBanner.tsx"
      provides: "7-day-gap eviction warning banner"
      exports: ["EvictionBanner"]
    - path: "index.html"
      provides: "iOS-installability head links (apple-touch-icon, theme-color)"
      contains: "apple-touch-icon"
  key_links:
    - from: "src/main.tsx"
      to: "navigator.storage.persist()"
      via: "initApp() sequence step 4"
      pattern: "navigator\\.storage\\.persist"
    - from: "src/main.tsx"
      to: "virtual:pwa-register"
      via: "vite-plugin-pwa auto-register"
      pattern: "virtual:pwa-register"
    - from: "src/components/AppShell.tsx"
      to: "src/components/InstallBanner.tsx + EvictionBanner.tsx"
      via: "banner slot render"
      pattern: "InstallBanner|EvictionBanner"
    - from: "src/routes/SettingsScreen.tsx"
      to: "src/lib/version.ts"
      via: "version line footer"
      pattern: "version"
---

<objective>
Complete the Phase 1 foundation by making the app installable (PWA manifest + icons), offline (service worker precache), resilient against iOS storage eviction (persist() + install banner + eviction banner), and self-auditable in production (version line in Settings). Also update CLAUDE.md project-breaking rule #5 to match CONTEXT.md D-07 (JPEG@70% → WebP@80%) and wire Plan 02's dayKey smoke assertion into the dev-mode startup path.

Purpose: Close SETUP-01, SETUP-02, SETUP-03, and SETUP-05 — the four PWA/offline/durability requirements that make the app real on a phone. Without this plan, Plan 01's shell lives only in a browser tab and Plan 02's data layer is at the mercy of iOS 7-day eviction.
Output: A production build that can be installed to iOS/Android home screen, launches offline, and self-protects against silent storage eviction.
</objective>

<deviations>
<!-- Deviations from upstream spec documents, locked during revision iteration 1 per checker feedback. -->

- **UI-SPEC §"Install banner" `role="banner"` → `role="region"` + `aria-label="Install prompt"`**: UI-SPEC specified `role="banner"` on both the Install and Eviction banners, but that conflicts with AppShell's implicit `<header role="banner">` landmark (WAI-ARIA forbids multiple `banner` landmarks per document). The Install banner is wrapped in a `<section role="region" aria-label="Install prompt">` so screen readers still get a named region.
- **UI-SPEC §"Eviction-warning banner" `role="banner"` → `role="alert"`**: Same multi-landmark conflict as above; additionally, the eviction banner is semantically a live alert (appears when the app detects a >4-day gap warning imminent data loss), which matches `role="alert"` per WAI-ARIA Authoring Practices. The wrapping `<div role="alert">` triggers screen reader announcement on mount.
- **AppShell `<header role="banner">` → `<header>`**: Explicit `role="banner"` removed from Plan 01-01's AppShell (the `<header>` element provides the role implicitly in HTML5). Prevents duplicate-landmark warnings from axe/Lighthouse when InstallBanner/EvictionBanner mount.
- **localStorage keys extracted to `src/lib/storageKeys.ts`**: Previously `LAST_OPENED_KEY` / `PREV_OPENED_KEY` were exported from `src/main.tsx` and imported by EvictionBanner via `@/main`. That created a latent circular import (main.tsx has module-load side effects — `initApp()` runs on import → renders App → mounts EvictionBanner → imports from main). The side-effect-free `storageKeys.ts` module resolves this at import-graph level.
</deviations>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/01-foundation/01-CONTEXT.md
@.planning/phases/01-foundation/01-RESEARCH.md
@.planning/phases/01-foundation/01-UI-SPEC.md
@CLAUDE.md

<interfaces>
<!-- Contracts consumed from Plan 01 -->

From src/components/Banner.tsx (Plan 01 — consumed by InstallBanner and EvictionBanner):
```typescript
export interface BannerProps {
  title: string;
  body: string;
  variant?: 'default' | 'warning';
  primaryAction?: { label: string; onClick: () => void };
  onDismiss: () => void;
}
export function Banner(props: BannerProps): JSX.Element;
```

From src/components/AppShell.tsx (Plan 01 — contains a banner slot comment above route outlet):
```typescript
// AppShell renders: header > banner slot > route outlet > bottom tab bar
// Plan 03 inserts <InstallBanner /> and <EvictionBanner /> in the banner slot.
```

From src/routes/SettingsScreen.tsx (Plan 01 — stub to extend with Install card + version line):
```typescript
export function SettingsScreen(): JSX.Element;
// Plan 03 extends this file; do NOT rewrite it.
```

<!-- Contracts consumed from Plan 02 -->

From src/lib/dayKey.smoke.ts (Plan 02 — dev-only smoke module, unimported until Plan 03 wires it):
```typescript
export function runDayKeySmoke(): void;
```

<!-- Contracts this plan establishes -->

From src/lib/storageKeys.ts (centralized localStorage keys — no side effects; safe to import from any module):
```typescript
export const LAST_OPENED_KEY: string;    // 'healthtracker:lastOpenedAt'
export const PREV_OPENED_KEY: string;    // 'healthtracker:prevOpenedAt'
export const INSTALL_DISMISSED_KEY: string; // 'healthtracker:installDismissedAt'
```

From src/lib/installMode.ts (used in both banners):
```typescript
export function isStandalone(): boolean;  // display-mode standalone OR navigator.standalone
export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null;
export function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'>;
```

From src/lib/version.ts (used in Settings version line):
```typescript
export const APP_VERSION: string;    // from import.meta.env.VITE_APP_VERSION, fallback '0.1.0'
export const BUILD_HASH: string;     // from import.meta.env.VITE_BUILD_HASH, fallback 'dev'
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configure vite-plugin-pwa (generateSW + autoUpdate), manifest, icons, index.html apple-touch-icon</name>
  <files>
    vite.config.ts,
    index.html,
    public/icon-192.png,
    public/icon-512.png,
    public/icon-maskable-512.png,
    public/apple-touch-icon.png,
    public/favicon.ico
  </files>
  <read_first>
    - .planning/phases/01-foundation/01-RESEARCH.md §4 (vite-plugin-pwa config + iOS-installability checklist + apple-touch-icon gotcha)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-09: autoUpdate; D-15 theme_color)
    - .planning/research/ARCHITECTURE.md §"Service Worker / Offline Strategy"
    - vite.config.ts (Plan 01 created it without VitePWA; this task adds the VitePWA block)
    - index.html (Plan 01 created a minimal template; this task adds iOS head links)
  </read_first>
  <action>
    1. Install vite-plugin-pwa if not already present from Plan 01 (`npm ls vite-plugin-pwa` — should show ^1.2.x). If missing: `npm install --save-dev vite-plugin-pwa@^1.2.0`.

    2. Edit `vite.config.ts` to add the VitePWA plugin AFTER the Tailwind plugin. Use `generateSW` (NOT `injectManifest`) per RESEARCH.md §4 recommendation:

       ```typescript
       import { defineConfig } from 'vite';
       import react from '@vitejs/plugin-react';
       import tailwindcss from '@tailwindcss/vite';
       import { VitePWA } from 'vite-plugin-pwa';
       import { execSync } from 'node:child_process';

       // Build-time hash: short git commit if available, else build timestamp.
       let buildHash = 'dev';
       try {
         buildHash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
           .toString().trim();
       } catch { /* not a git repo yet — acceptable */ }

       export default defineConfig({
         define: {
           'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash),
           'import.meta.env.VITE_APP_VERSION': JSON.stringify('0.1.0'),
         },
         plugins: [
           react(),
           tailwindcss(),
           VitePWA({
             strategies: 'generateSW',
             registerType: 'autoUpdate',
             includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
             workbox: {
               globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
               navigateFallback: 'index.html',
               cleanupOutdatedCaches: true,
             },
             manifest: {
               name: 'HealthTracker',
               short_name: 'HealthTracker',
               description: 'Personal daily tracker for PT, food, steps, and lifts.',
               theme_color: '#09090b',
               background_color: '#09090b',
               display: 'standalone',
               start_url: '.',
               scope: '.',
               orientation: 'portrait',
               icons: [
                 { src: '/icon-192.png',           sizes: '192x192', type: 'image/png' },
                 { src: '/icon-512.png',           sizes: '512x512', type: 'image/png' },
                 { src: '/icon-maskable-512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
               ],
             },
           }),
         ],
       });
       ```
       Justification for `generateSW` (not `injectManifest`): RESEARCH.md §4 — Phase 1 needs only precache + SPA fallback; no custom runtime caching or SW message handlers (SETUP-06 update banner is v2 per D-09). `generateSW` is the lower-surface-area choice.

    3. Update `index.html` to add iOS-installability head links per RESEARCH.md §4 iOS-installability checklist. **iOS Safari reads `apple-touch-icon` from HTML, NOT from the manifest** — vite-plugin-pwa does not inject it:

       ```html
       <!doctype html>
       <html lang="en" class="dark">
         <head>
           <meta charset="UTF-8" />
           <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
           <meta name="theme-color" content="#09090b" />
           <!-- iOS home-screen install support -->
           <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
           <meta name="apple-mobile-web-app-capable" content="yes" />
           <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
           <meta name="apple-mobile-web-app-title" content="HealthTracker" />
           <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
           <title>HealthTracker</title>
         </head>
         <body>
           <div id="root"></div>
           <script type="module" src="/src/main.tsx"></script>
         </body>
       </html>
       ```

    4. Generate icon placeholder files in `public/` using `sharp-cli` (pick ONE concrete approach — prior drafts listed three non-functional options which is why this step is revised in iteration 1):

       ```bash
       # Write an inline SVG source with the app color palette (D-15 bg, D-16 accent).
       cat > /tmp/ht-icon.svg <<'SVG'
       <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
         <rect width="512" height="512" fill="#09090b"/>
         <text x="256" y="340" font-size="320" fill="#22c55e" text-anchor="middle"
               font-family="system-ui,-apple-system,sans-serif" font-weight="700">H</text>
       </svg>
       SVG

       # Generate PNGs at the declared manifest sizes via sharp-cli (npx handles install).
       npx --yes sharp-cli -i /tmp/ht-icon.svg -o public/icon-512.png       resize 512 512
       npx --yes sharp-cli -i /tmp/ht-icon.svg -o public/icon-192.png       resize 192 192
       npx --yes sharp-cli -i /tmp/ht-icon.svg -o public/apple-touch-icon.png resize 180 180

       # Maskable icon reuses the 512 (the "H" glyph is already centered within ~80% safe zone).
       cp public/icon-512.png public/icon-maskable-512.png

       # favicon.ico — reuse the 192 PNG (Vite scaffold usually creates one; only write if missing).
       test -f public/favicon.ico || cp public/icon-192.png public/favicon.ico
       ```

       Acceptance is "PNGs with correct declared dimensions exist and are loaded by the build without 404." Visual polish is deferred to Phase 4 per ROADMAP.md (Phase 4 = "Backup & Polish — PWA install/icon polish").

    5. Run `npm run build` and confirm:
       - `dist/manifest.webmanifest` exists and validates as JSON.
       - `dist/sw.js` exists.
       - `dist/workbox-*.js` exists (Workbox-generated runtime).
       - `dist/icon-192.png`, `dist/icon-512.png`, `dist/icon-maskable-512.png`, `dist/apple-touch-icon.png` all exist.
       - `dist/index.html` contains the `apple-touch-icon` link.
  </action>
  <acceptance_criteria>
    - `grep -c 'VitePWA' vite.config.ts` returns at least `1`.
    - `grep -c "strategies: 'generateSW'" vite.config.ts` returns `1`.
    - `grep -c "registerType: 'autoUpdate'" vite.config.ts` returns `1` (D-09).
    - `grep -c "theme_color: '#09090b'" vite.config.ts` returns `1` (D-15).
    - `grep -c "purpose: 'maskable'" vite.config.ts` returns `1`.
    - `grep -c "navigateFallback: 'index.html'" vite.config.ts` returns `1` (SPA offline fallback).
    - `grep -c "cleanupOutdatedCaches: true" vite.config.ts` returns `1` (stale-SW guard).
    - `grep -c 'VITE_BUILD_HASH' vite.config.ts` returns at least `1` (build hash wired).
    - `grep -c 'apple-touch-icon' index.html` returns `1`.
    - `grep -c 'apple-mobile-web-app-capable' index.html` returns `1`.
    - `grep -c 'apple-mobile-web-app-status-bar-style' index.html` returns `1`.
    - All four icon files exist: `test -f public/icon-192.png && test -f public/icon-512.png && test -f public/icon-maskable-512.png && test -f public/apple-touch-icon.png`.
    - `file public/icon-192.png | grep -q '192 x 192'` (correct pixel dimensions).
    - `file public/icon-512.png | grep -q '512 x 512'`.
    - `file public/apple-touch-icon.png | grep -q '180 x 180'` (iOS standard apple-touch-icon size).
    - `file public/icon-maskable-512.png | grep -q '512 x 512'` (maskable icon matches 512 declared size).
    - After `npm run build`: `test -f dist/manifest.webmanifest && test -f dist/sw.js`.
    - `npm run build` exits 0.
  </acceptance_criteria>
  <verify>
    <automated>npm run build && test -f dist/manifest.webmanifest && test -f dist/sw.js && test -f dist/icon-192.png && test -f dist/icon-512.png && test -f dist/icon-maskable-512.png && test -f dist/apple-touch-icon.png && grep -q 'apple-touch-icon' dist/index.html && grep -q "strategies: 'generateSW'" vite.config.ts && grep -q "registerType: 'autoUpdate'" vite.config.ts</automated>
  </verify>
  <done>VitePWA produces a valid manifest + service worker with SPA fallback and autoUpdate; iOS-installability head links present in index.html; all four icon assets ship; `dist/` passes manifest + SW existence checks.</done>
</task>

<task type="auto">
  <name>Task 2: Build initApp() startup sequence, install-mode helper, version module, wire dayKey smoke, update CLAUDE.md rule #5</name>
  <files>
    src/main.tsx,
    src/lib/installMode.ts,
    src/lib/version.ts,
    src/lib/storageKeys.ts,
    CLAUDE.md
  </files>
  <read_first>
    - .planning/phases/01-foundation/01-RESEARCH.md §6 (startup invariant ordering table + initApp code skeleton)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-09 autoUpdate; D-11 install detection; D-13 beforeinstallprompt; D-14 eviction trigger)
    - .planning/research/PITFALLS.md §"Pitfall 3" (iOS 7-day eviction — rationale for persist())
    - CLAUDE.md (rule #5 text currently reads "JPEG @ ~70%" — must update to "WebP @ 80%")
    - src/lib/dayKey.smoke.ts (Plan 02 export)
    - src/main.tsx (Plan 01 created a minimal version; this task replaces it with the full initApp sequence)
  </read_first>
  <action>
    1. Create `src/lib/storageKeys.ts` FIRST (centralized localStorage keys; no side effects so safe to import from main, banners, and any future caller without creating import cycles):
       ```typescript
       // src/lib/storageKeys.ts
       // Centralized localStorage keys. No side effects — safe to import from anywhere.
       // Prevents circular imports through @/main.tsx (which has module-load side effects).
       export const LAST_OPENED_KEY       = 'healthtracker:lastOpenedAt';
       export const PREV_OPENED_KEY       = 'healthtracker:prevOpenedAt';
       export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
       ```
       Note: Key values changed from `ht.*` (used in earlier drafts of this plan) to the `healthtracker:*` namespace prefix used by this module. Banner dismissal keys (`ht.installBannerDismissedAt`, `ht.evictionBannerDismissedAt`) remain unchanged in the banner components — they are per-banner dismissal timestamps and stay local to each banner component. The keys exported here are the SHARED startup-state keys (LAST/PREV opened) plus the unified install-dismissal timestamp (INSTALL_DISMISSED_KEY, available to both banners if they want to share state; InstallBanner uses its own 14-day timestamp separately).

    2. Create `src/lib/version.ts`:
       ```typescript
       // Values are injected by vite.config.ts `define` block.
       // Fallbacks keep the file runnable in tests / non-Vite contexts.
       export const APP_VERSION: string =
         (import.meta.env as any).VITE_APP_VERSION ?? '0.1.0';
       export const BUILD_HASH: string =
         (import.meta.env as any).VITE_BUILD_HASH ?? 'dev';
       ```

    3. Create `src/lib/installMode.ts` — the standalone-detection + beforeinstallprompt capture module. Used by both banners and the Settings Install card in Task 4:
       ```typescript
       // src/lib/installMode.ts
       // Install-mode detection + Android beforeinstallprompt capture (D-11, D-13).

       type InstallPromptChoice = 'accepted' | 'dismissed';
       interface BeforeInstallPromptEvent extends Event {
         prompt(): Promise<void>;
         userChoice: Promise<{ outcome: InstallPromptChoice; platform: string }>;
       }

       let deferredPrompt: BeforeInstallPromptEvent | null = null;

       /** Call once at module load (import side-effect via main.tsx). */
       export function wireBeforeInstallPrompt(): void {
         window.addEventListener('beforeinstallprompt', (e) => {
           e.preventDefault();
           deferredPrompt = e as BeforeInstallPromptEvent;
         });
         window.addEventListener('appinstalled', () => {
           deferredPrompt = null;
         });
       }

       export function isStandalone(): boolean {
         return (
           window.matchMedia('(display-mode: standalone)').matches ||
           // iOS Safari pre-iOS 17 exposes navigator.standalone, not display-mode.
           (navigator as unknown as { standalone?: boolean }).standalone === true
         );
       }

       export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
         return deferredPrompt;
       }

       export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
         if (!deferredPrompt) return 'unavailable';
         await deferredPrompt.prompt();
         const { outcome } = await deferredPrompt.userChoice;
         deferredPrompt = null;
         return outcome;
       }
       ```

    4. Rewrite `src/main.tsx` to implement the RESEARCH.md §6 startup-invariant sequence. Ordering is non-negotiable (matches Plan 01's current main.tsx but now adds persist + lastOpenedAt + SW register). IMPORTANT: Import LAST_OPENED_KEY and PREV_OPENED_KEY from `./lib/storageKeys` (do NOT re-declare them here — they are shared by EvictionBanner via the same module to avoid circular imports through `@/main`):
       ```typescript
       import { StrictMode } from 'react';
       import { createRoot } from 'react-dom/client';
       import { registerSW } from 'virtual:pwa-register';
       import App from './App';
       import './styles/index.css';
       import { wireBeforeInstallPrompt } from './lib/installMode';
       import { LAST_OPENED_KEY, PREV_OPENED_KEY } from './lib/storageKeys';

       async function initApp(): Promise<void> {
         // Step 1 — dark theme class (D-19). Belt-and-suspenders with index.html class="dark".
         document.documentElement.classList.add('dark');

         // Step 2 — read previous lastOpenedAt BEFORE overwriting it. Eviction banner (D-14)
         // needs the prior timestamp to compute the 4-day gap.
         const prev = localStorage.getItem(LAST_OPENED_KEY);
         localStorage.setItem(PREV_OPENED_KEY, prev ?? '');

         // Step 3 — write new lastOpenedAt for next launch.
         localStorage.setItem(LAST_OPENED_KEY, String(Date.now()));

         // Step 4 — SETUP-03 + Pitfall #3. Request persistent storage. Best-effort; non-fatal.
         if (navigator.storage?.persist) {
           try {
             const granted = await navigator.storage.persist();
             (window as unknown as { __ht_persisted?: boolean }).__ht_persisted = granted;
           } catch {
             // Swallow — banner path still warns the user.
           }
         }

         // Wire Android beforeinstallprompt (must be attached before any install button renders).
         wireBeforeInstallPrompt();

         // Dev-only dayKey regression tripwire (Pitfall #4 — Plan 02's smoke module).
         if (import.meta.env.DEV) {
           import('./lib/dayKey.smoke').then(({ runDayKeySmoke }) => runDayKeySmoke());
         }

         // Step 5 — render. Dexie opens lazily on first useLiveQuery; no pre-open needed.
         createRoot(document.getElementById('root')!).render(
           <StrictMode><App /></StrictMode>
         );

         // Step 6 — SW registration via vite-plugin-pwa's virtual module. autoUpdate per D-09.
         registerSW({ immediate: true });
       }

       initApp();
       ```
       Note: Dynamic `import('./lib/dayKey.smoke')` inside `import.meta.env.DEV` guarantees Vite tree-shakes the smoke module out of production bundles (verified via `grep -c 'runDayKeySmoke' dist/assets/*.js` returning 0 after build).

    5. Edit `CLAUDE.md` — update **Project-Breaking Rules** rule #5 to match CONTEXT.md D-07. Replace the line:

       > 5. **Resize photos to ≤800×800 @ ~70% JPEG before OPFS write** — raw iPhone photos fill quota and crash the tab.

       With:

       > 5. **Resize photos to ≤800×800 @ 80% WebP before OPFS write** — raw iPhone photos fill quota and crash the tab.

       The prose around it (Pitfall #6 "OPFS, not as Dexie blobs") is unchanged. This edit closes the inconsistency CONTEXT.md D-07 flagged.
  </action>
  <acceptance_criteria>
    - `grep -c 'navigator.storage.persist' src/main.tsx` returns at least `1`.
    - `test -f src/lib/storageKeys.ts` (centralized storage-keys module exists, per BLOCKER 2 fix — prevents circular import through `@/main`).
    - `grep -c 'export const LAST_OPENED_KEY' src/lib/storageKeys.ts` returns `1`.
    - `grep -c 'export const PREV_OPENED_KEY' src/lib/storageKeys.ts` returns `1`.
    - `grep -c 'export const INSTALL_DISMISSED_KEY' src/lib/storageKeys.ts` returns `1`.
    - `grep -c "'healthtracker:lastOpenedAt'" src/lib/storageKeys.ts` returns `1`.
    - `grep -c "from './lib/storageKeys'" src/main.tsx` returns `1` (main.tsx imports keys, does NOT redeclare them).
    - `grep -c 'export const LAST_OPENED_KEY' src/main.tsx` returns `0` (key must NOT be declared in main.tsx — keeps import graph acyclic).
    - `grep -c 'registerSW' src/main.tsx` returns `1`.
    - `grep -c 'virtual:pwa-register' src/main.tsx` returns `1`.
    - `grep -c 'runDayKeySmoke' src/main.tsx` returns `1` (smoke import wired).
    - `grep -c 'import.meta.env.DEV' src/main.tsx` returns `1` (gated by dev env).
    - `grep -c 'wireBeforeInstallPrompt' src/main.tsx` returns `1`.
    - `grep -c 'beforeinstallprompt' src/lib/installMode.ts` returns `1`.
    - `grep -c 'display-mode: standalone' src/lib/installMode.ts` returns `1`.
    - `grep -c 'navigator.*standalone' src/lib/installMode.ts` returns `1` (iOS fallback).
    - `src/lib/version.ts` exists and `grep -c 'APP_VERSION' src/lib/version.ts` returns `1`, `grep -c 'BUILD_HASH' src/lib/version.ts` returns `1`.
    - `grep -c 'WebP' CLAUDE.md` returns at least `1` and `grep -c 'JPEG' CLAUDE.md` returns `0` (rule #5 updated).
    - `grep -c '80% WebP' CLAUDE.md` returns `1` (exact phrase from D-07).
    - `npm run build` exits 0.
    - `! grep -rl 'runDayKeySmoke' dist/ 2>/dev/null` (recursive check across ENTIRE dist/ tree — catches the case where Vite emits the smoke module as a separate chunk like `dist/assets/dayKey.smoke-<hash>.js`; grep returns 1 when NO matches, so `!` inverts it to pass).
    - `! ls dist/assets/dayKey.smoke-*.js 2>/dev/null` (no smoke-specific chunk emitted).
    - Preview-server offline check: start `npm run preview`, load once in a browser, then kill the network and reload — page still serves (manual check; noted in SUMMARY).
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q 'navigator.storage.persist' src/main.tsx && grep -q 'virtual:pwa-register' src/main.tsx && grep -q 'runDayKeySmoke' src/main.tsx && grep -q '80% WebP' CLAUDE.md && ! grep -q 'JPEG' CLAUDE.md && ! grep -rl 'runDayKeySmoke' dist/ 2>/dev/null && ! ls dist/assets/dayKey.smoke-*.js 2>/dev/null</automated>
  </verify>
  <done>initApp() runs the 6-step startup sequence; persist() called before render; dev-only dayKey smoke tree-shakes from production; beforeinstallprompt captured for Android; CLAUDE.md rule #5 updated to WebP @ 80%; version/build-hash values available via import.meta.env.</done>
</task>

<task type="auto">
  <name>Task 3: Build InstallBanner + EvictionBanner, extend Settings with Install card and version line, mount banners in AppShell</name>
  <files>
    src/components/InstallBanner.tsx,
    src/components/EvictionBanner.tsx,
    src/components/AppShell.tsx,
    src/routes/SettingsScreen.tsx
  </files>
  <read_first>
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Install banner" (copy, triggers, dismissal persistence)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Eviction-warning banner" (copy, trigger math, dismissal persistence)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Settings stub screen" (Install card + version line layout)
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Banner stacking rule"
    - .planning/phases/01-foundation/01-UI-SPEC.md §"Copywriting Contract" (verbatim strings)
    - .planning/phases/01-foundation/01-CONTEXT.md (D-11, D-12, D-13, D-14)
    - src/components/Banner.tsx (Plan 01 — primitive consumed by both banners)
    - src/components/AppShell.tsx (Plan 01 — banner slot to fill)
    - src/routes/SettingsScreen.tsx (Plan 01 — stub to extend)
    - src/lib/installMode.ts (created in Task 2)
    - src/lib/version.ts (created in Task 2)
    - src/main.tsx (constants LAST_OPENED_KEY, PREV_OPENED_KEY)
  </read_first>
  <action>
    1. Create `src/components/InstallBanner.tsx` (D-11 / D-13 / UI-SPEC Install banner). Uses Plan 01's Banner primitive; dismissal persists via localStorage key `ht.installBannerDismissedAt`; re-shows after 14 days:

       ```tsx
       import { useEffect, useState } from 'react';
       import { Banner } from './Banner';
       import { isStandalone, getDeferredInstallPrompt, triggerInstallPrompt } from '@/lib/installMode';

       const DISMISS_KEY = 'ht.installBannerDismissedAt';
       const DISMISS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

       function isAndroid(): boolean {
         return /android/i.test(navigator.userAgent);
       }

       export function InstallBanner() {
         const [visible, setVisible] = useState(false);
         const [tick, setTick] = useState(0);

         useEffect(() => {
           if (isStandalone()) { setVisible(false); return; }
           const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
           if (dismissed && Date.now() - dismissed < DISMISS_WINDOW_MS) { setVisible(false); return; }
           setVisible(true);
         }, [tick]);

         // Re-check when beforeinstallprompt fires (Android) — retriggers render so Install button shows.
         useEffect(() => {
           const handler = () => setTick((t) => t + 1);
           window.addEventListener('beforeinstallprompt', handler);
           return () => window.removeEventListener('beforeinstallprompt', handler);
         }, []);

         if (!visible) return null;

         const android = isAndroid() && getDeferredInstallPrompt() !== null;
         // UI-SPEC §"Copywriting Contract" — verbatim strings.
         const body = android
           ? 'Add HealthTracker to your home screen.'
           : 'Tap Share → Add to Home Screen to keep your logs safe.';

         // WARNING 2 deviation from UI-SPEC: wrap in role="region" + aria-label="Install prompt".
         // UI-SPEC originally specified role="banner" here, but that conflicts with AppShell's
         // implicit <header> role="banner" landmark (WCAG/ARIA forbids multiple "banner" landmarks
         // on one page). role="region" + aria-label gives screen readers a distinct navigable region.
         return (
           <section role="region" aria-label="Install prompt">
             <Banner
               title="Install to protect your data"
               body={body}
               primaryAction={
                 android
                   ? { label: 'Install', onClick: () => { void triggerInstallPrompt(); } }
                   : undefined
               }
               onDismiss={() => {
                 localStorage.setItem(DISMISS_KEY, String(Date.now()));
                 setVisible(false);
               }}
             />
           </section>
         );
       }
       ```

    2. Create `src/components/EvictionBanner.tsx` (D-14 / UI-SPEC Eviction-warning banner). Trigger: `!isStandalone() && (Date.now() - prevOpenedAt) > 4*24*60*60*1000 && !recentlyDismissed(7days)`:

       ```tsx
       import { useEffect, useState } from 'react';
       import { Banner } from './Banner';
       import { isStandalone, triggerInstallPrompt } from '@/lib/installMode';
       import { PREV_OPENED_KEY } from '@/lib/storageKeys';

       const DISMISS_KEY = 'ht.evictionBannerDismissedAt';
       const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
       const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

       export function EvictionBanner() {
         const [visible, setVisible] = useState(false);

         useEffect(() => {
           if (isStandalone()) { setVisible(false); return; }
           const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
           if (dismissed && Date.now() - dismissed < DISMISS_WINDOW_MS) { setVisible(false); return; }
           const prevRaw = localStorage.getItem(PREV_OPENED_KEY);
           const prev = prevRaw ? Number(prevRaw) : null;
           if (!prev) { setVisible(false); return; }                    // first launch — no gap to measure
           if (Date.now() - prev <= FOUR_DAYS_MS) { setVisible(false); return; }
           setVisible(true);
         }, []);

         if (!visible) return null;

         // WARNING 2 deviation from UI-SPEC: wrap in role="alert" instead of role="banner".
         // The eviction warning is semantically an urgent live alert about imminent data loss,
         // so role="alert" is correct per WAI-ARIA (it gets announced by screen readers when
         // it appears, which matches the banner's gap-triggered appearance). This also resolves
         // the multi-landmark conflict with AppShell's implicit <header> role="banner".
         return (
           <div role="alert">
             <Banner
               variant="warning"
               title="Your data may be at risk"
               body="You haven't opened HealthTracker in several days. Install to home screen or export now to avoid browser data loss."
               primaryAction={{ label: 'Install', onClick: () => { void triggerInstallPrompt(); } }}
               onDismiss={() => {
                 localStorage.setItem(DISMISS_KEY, String(Date.now()));
                 setVisible(false);
               }}
             />
           </div>
         );
       }
       ```

       NOTE: `PREV_OPENED_KEY` is imported from `@/lib/storageKeys` (not `@/main`). This is intentional — importing from `@/main` would create a circular dependency because `main.tsx` has module-load side effects (`initApp()` runs on import → renders App → mounts AppShell → mounts EvictionBanner → imports from main). The centralized `storageKeys.ts` module has no side effects, so it is safe to import from any component.

    3. Edit `src/components/AppShell.tsx` to replace the banner-slot placeholder comment with the actual banners. Per UI-SPEC §"Banner stacking rule", Install goes first, Eviction second, separated by `space-y-3`:

       ```tsx
       // inside <main> → banner slot:
       <div className="px-4 pt-4 space-y-3">
         <InstallBanner />
         <EvictionBanner />
       </div>
       {children}
       ```

       Import both at the top of AppShell.tsx. Both components self-guard against rendering when the trigger conditions are unmet (returning `null`), so the wrapping `<div>` is always present but empty when no banner shows. Consider wrapping with a helper that omits padding when both return null, or accept the harmless 16px top padding in the banner-less state (acceptable — matches UI-SPEC's `px-4 py-6` outer padding on Today).

    4. Extend `src/routes/SettingsScreen.tsx` with (a) the Install card per UI-SPEC §"Settings stub screen" and D-12, and (b) the version line at the bottom per D-10. Copy strings are VERBATIM from UI-SPEC Copywriting Contract:

       ```tsx
       import { Card } from '@/components/ui/card';
       import { Button } from '@/components/ui/button';
       import { getDeferredInstallPrompt, triggerInstallPrompt, isStandalone } from '@/lib/installMode';
       import { APP_VERSION, BUILD_HASH } from '@/lib/version';

       function isAndroid(): boolean {
         return /android/i.test(navigator.userAgent);
       }

       export function SettingsScreen() {
         const installed = isStandalone();
         const canInstall = isAndroid() && getDeferredInstallPrompt() !== null;

         return (
           <div className="px-4 py-6 space-y-4 flex flex-col min-h-[calc(100dvh-112px)]">
             <h1 className="text-xl font-semibold">Settings</h1>

             {!installed && (
               <Card className="bg-surface border border-border rounded-lg p-4">
                 <h2 className="text-base font-semibold text-text">Install HealthTracker</h2>
                 <p className="text-sm text-muted mt-1">
                   {canInstall
                     ? "Install HealthTracker to your home screen so your data isn't cleared."
                     : 'Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.'}
                 </p>
                 {canInstall && (
                   <div className="mt-3">
                     <Button variant="default" onClick={() => { void triggerInstallPrompt(); }}>
                       Install
                     </Button>
                   </div>
                 )}
               </Card>
             )}

             <div className="flex-1" />

             <p className="text-xs text-muted text-center">
               v{APP_VERSION} (build {BUILD_HASH})
             </p>
           </div>
         );
       }
       ```

    5. Run `npm run build && npm run preview`, open the preview URL in a browser, and manually verify (capture in SUMMARY):
       - Install banner renders at top with exact copy.
       - Settings tab shows Install card (iOS copy if no deferred prompt) and version line at bottom.
       - Eviction banner does NOT render on fresh install (no prior lastOpenedAt — correct behavior).
       - Simulate eviction trigger by running `localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000))` in DevTools and reloading — eviction banner appears.
       - Simulate dismissal by clicking X on each banner; banner disappears; reloading does not re-show within the 14-day (install) / 7-day (eviction) window.

    6. Run a Lighthouse audit against the preview server to validate SETUP-05 (<1s warm-cache load) with an automated proxy (WARNING 1 revision — manual human-verify is insufficient without an automated gate). Assumes `npm run preview -- --port 4173` is running in another shell or backgrounded:

       ```bash
       # Background the preview server, wait briefly for it to bind, then audit.
       ( npm run preview -- --port 4173 >/tmp/preview.log 2>&1 & echo $! > /tmp/preview.pid )
       # Give the preview a few seconds to come up; production builds boot fast.
       until curl -sf http://localhost:4173 >/dev/null; do sleep 1; done

       # Run Lighthouse in headless Chrome, export JSON.
       npx --yes lighthouse http://localhost:4173 \
         --only-categories=performance,pwa \
         --chrome-flags="--headless --no-sandbox" \
         --output=json --output-path=./lighthouse.json --quiet

       # Assertions — non-zero exit if gate fails.
       jq -e '.categories.pwa.score == 1' lighthouse.json \
         || (echo "FAIL: PWA score != 1 (install-readiness gate failed)" && exit 1)
       jq -e '.audits["first-contentful-paint"].numericValue < 1500' lighthouse.json \
         || (echo "FAIL: FCP >= 1500ms (warm-cache <1s gate failed)" && exit 1)

       # Cleanup.
       rm -f lighthouse.json
       kill $(cat /tmp/preview.pid) 2>/dev/null || true
       rm -f /tmp/preview.pid /tmp/preview.log
       ```

       If the environment cannot run Lighthouse (e.g., no Chromium available), fall back to a lighter Resource Timing probe as documented in SUMMARY — in a browser dev console, verify `performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd < 1500` on a warm reload, and note the manual measurement in the human-verify checkpoint (Task 4) comment thread.
  </action>
  <acceptance_criteria>
    - `grep -c 'role="region"' src/components/InstallBanner.tsx` returns `1` (deviation from UI-SPEC — avoids duplicate `role="banner"` landmark with AppShell's `<header>`; see `<deviations>` block).
    - `grep -c 'aria-label="Install prompt"' src/components/InstallBanner.tsx` returns `1`.
    - `grep -c 'role="alert"' src/components/EvictionBanner.tsx` returns `1` (deviation from UI-SPEC — eviction warning is a live alert about imminent data loss; semantically correct per WAI-ARIA).
    - `grep -c "'Install to protect your data'" src/components/InstallBanner.tsx` returns `1` (UI-SPEC verbatim).
    - `grep -c "'Tap Share → Add to Home Screen to keep your logs safe.'" src/components/InstallBanner.tsx` returns `1` (iOS body copy verbatim).
    - `grep -c "'Add HealthTracker to your home screen.'" src/components/InstallBanner.tsx` returns `1` (Android body copy verbatim).
    - `grep -c "'ht.installBannerDismissedAt'" src/components/InstallBanner.tsx` returns `1` (dismissal persistence key).
    - `grep -c "14 \\* 24 \\* 60 \\* 60 \\* 1000" src/components/InstallBanner.tsx` returns `1` (14-day re-show window).
    - `grep -c "'Your data may be at risk'" src/components/EvictionBanner.tsx` returns `1` (UI-SPEC verbatim).
    - `grep -c "'ht.evictionBannerDismissedAt'" src/components/EvictionBanner.tsx` returns `1`.
    - `grep -c "4 \\* 24 \\* 60 \\* 60 \\* 1000" src/components/EvictionBanner.tsx` returns `1` (4-day trigger).
    - `grep -c "7 \\* 24 \\* 60 \\* 60 \\* 1000" src/components/EvictionBanner.tsx` returns `1` (7-day re-show window).
    - `grep -c 'InstallBanner' src/components/AppShell.tsx` returns at least `1`.
    - `grep -c 'EvictionBanner' src/components/AppShell.tsx` returns at least `1`.
    - `grep -c 'space-y-3' src/components/AppShell.tsx` returns at least `1` (banner stacking gap per UI-SPEC).
    - `grep -c "'Install HealthTracker'" src/routes/SettingsScreen.tsx` returns `1` (UI-SPEC Install card title verbatim).
    - `grep -c 'APP_VERSION' src/routes/SettingsScreen.tsx` returns `1`.
    - `grep -c 'BUILD_HASH' src/routes/SettingsScreen.tsx` returns `1`.
    - `grep -c "'Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.'" src/routes/SettingsScreen.tsx` returns `1` (iOS Install-card body verbatim).
    - `grep -c "\"Install HealthTracker to your home screen so your data isn't cleared.\"" src/routes/SettingsScreen.tsx` returns `1` (Android Install-card body verbatim).
    - `npm run typecheck` exits 0.
    - `npm run build` exits 0.
    - Lighthouse PWA category score == 1 (fully install-ready) — verified via `jq -e '.categories.pwa.score == 1' lighthouse.json` returning exit 0 against a warm-cache preview run. Documents SETUP-05 automated proxy per WARNING 1 revision.
    - Lighthouse `first-contentful-paint` numericValue < 1500ms on warm cache — verified via `jq -e '.audits["first-contentful-paint"].numericValue < 1500' lighthouse.json` returning exit 0. If Chromium is unavailable in the execution environment, acceptance is deferred to the Task 4 human-verify checkpoint and the fallback Resource Timing probe documented in step 6.
    - `lighthouse.json` is deleted after gate check (no audit artifact left in the repo).
  </acceptance_criteria>
  <verify>
    <automated>npm run typecheck && npm run build && grep -q "'Install to protect your data'" src/components/InstallBanner.tsx && grep -q "'Your data may be at risk'" src/components/EvictionBanner.tsx && grep -q "'Install HealthTracker'" src/routes/SettingsScreen.tsx && grep -q 'APP_VERSION' src/routes/SettingsScreen.tsx && grep -q 'InstallBanner' src/components/AppShell.tsx && grep -q 'EvictionBanner' src/components/AppShell.tsx</automated>
  </verify>
  <done>Both banners render per UI-SPEC with verbatim copy and working dismissal persistence; Settings screen shows Install card (platform-aware) and version line; AppShell stacks both banners above the route outlet with correct spacing; build is clean.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Human verification — install to iOS/Android home screen and confirm offline launch</name>
  <what-built>
    Phase 1 infrastructure is complete. The app is installable to iOS + Android home screens, works offline after first load, protects against iOS 7-day eviction via navigator.storage.persist() + install/eviction banners, and renders the dark shell with Today placeholders per D-05.
  </what-built>
  <how-to-verify>
    Run the production build and serve it over a LAN-accessible port so the user can install it from both iOS Safari and Android Chrome:

    1. Local build + serve:
       - `npm run build && npm run preview -- --host` (preview server binds 0.0.0.0 on the LAN; note the LAN URL it prints, e.g. `http://192.168.1.34:4173`).

    2. On iPhone:
       - Open the LAN URL in Safari.
       - Confirm: dark theme renders, top header says "HealthTracker", 3 bottom tabs, Today screen shows the 4 placeholder cards.
       - Tap Share → Add to Home Screen. Confirm the app icon appears on the home screen.
       - Kill Safari, enable Airplane Mode, tap the home-screen icon. App MUST launch and render the shell offline. Tabs navigate. Settings version line shows a non-"dev" build hash.

    3. On Android (Chrome):
       - Open the LAN URL. Confirm the Install banner's primary "Install" button appears (beforeinstallprompt fired).
       - Tap Install. Confirm the app installs and launches in standalone mode.
       - Enable Airplane Mode and re-launch from the home-screen icon. App MUST render the shell offline.

    4. Eviction-banner simulation (desktop or mobile):
       - In DevTools console: `localStorage.setItem('healthtracker:prevOpenedAt', String(Date.now() - 5*24*60*60*1000)); location.reload();`
       - Confirm the "Your data may be at risk" banner appears.
       - Click the X — banner dismisses. Reload — banner does not re-appear (7-day window).

    5. CLAUDE.md sanity check:
       - Confirm `CLAUDE.md` rule #5 reads "WebP @ 80%" (not "JPEG @ ~70%").

    If any of the above fails, describe which and which device/browser.
  </how-to-verify>
  <resume-signal>Type "approved" once iOS AND Android installs work offline. Or describe failures for fix-up.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Service worker cache → offline launch | A buggy SW can trap users on an old build; `autoUpdate` + `cleanupOutdatedCaches: true` mitigates |
| beforeinstallprompt event → user choice | Android-only API; iOS uses manual share-sheet; platform detection must not falsely show "Install" button on iOS |
| localStorage keys → banner state | User clears site data ⇒ banners re-show next session (acceptable; data-safety framing makes this a feature not a bug) |
| iOS 7-day eviction → silent data loss | Pitfall #3 — navigator.storage.persist() + install banner + eviction banner form the three-layer defense |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-12 | Information Disclosure | Build hash reveals commit history | accept | Single-user local app; commit hash is not sensitive (D-10 explicitly surfaces it) |
| T-01-13 | Tampering | Stale service worker serves an old, bug-ridden build | mitigate | `registerType: 'autoUpdate'` + `cleanupOutdatedCaches: true` + SW installs new build on next reload per D-09 |
| T-01-14 | Denial of Service | iOS Safari evicts IndexedDB after 7 days of inactivity (Pitfall #3) | mitigate | Three defenses: (1) navigator.storage.persist() on startup; (2) Install banner encouraging home-screen install; (3) Eviction banner warning after 4-day gap |
| T-01-15 | Repudiation | User disputes which version they were running | accept | Version + build hash shown in Settings (D-10) provides self-evidence; sufficient for single-user app |
| T-01-16 | Spoofing | Fake beforeinstallprompt event registering false install on iOS | accept | beforeinstallprompt does not fire on iOS Safari; isAndroid() guard means the Install button only renders when both Android and prompt captured |
| T-01-17 | Tampering | Supply chain — vite-plugin-pwa or Workbox introducing malicious caching | mitigate | Pin vite-plugin-pwa ^1.2; package-lock.json committed; Vite ^7 held until 1.3 (CLAUDE.md rationale) |
| T-01-18 | Denial of Service | Icon-asset 404 breaks manifest validity and install flow | mitigate | Task 1 acceptance criteria verify all four icon files exist in `dist/` after build; `includeAssets` array in vite.config.ts ensures they're precached |
</threat_model>

<verification>
- `npm run build` exits 0 and produces `dist/manifest.webmanifest`, `dist/sw.js`, `dist/icon-*.png`, `dist/apple-touch-icon.png`.
- `dist/` tree does NOT contain `runDayKeySmoke` anywhere (dev-only smoke tree-shaken out; verified via `! grep -rl 'runDayKeySmoke' dist/`).
- CLAUDE.md rule #5 reads "80% WebP" (not "JPEG").
- `src/main.tsx` contains the ordered startup sequence: dark class → read prev → write new → persist → render → registerSW.
- Install banner + Eviction banner components exist with verbatim UI-SPEC copy and correct localStorage dismissal keys/windows.
- Human verification checkpoint confirms iOS + Android installability + offline launch.
</verification>

<success_criteria>
1. Production build is installable to iOS and Android home screens from Safari and Chrome respectively.
2. After first load, re-launching the installed app with no network connection still renders the shell (offline PWA — SETUP-02).
3. navigator.storage.persist() is called before any Dexie access on every launch (SETUP-03).
4. App loads to the Today screen (landing with placeholder cards) in under 1 second from a warm service-worker cache on a modern iPhone (SETUP-05 — verified via Lighthouse PWA audit or manual timing).
5. Install banner and eviction-warning banner render with exact UI-SPEC copy and dismiss correctly; 14-day and 7-day re-show windows respected.
6. Settings screen shows a version + build-hash line (D-10).
7. CLAUDE.md project-breaking rule #5 now matches CONTEXT.md D-07 (WebP @ 80%).
8. All of ROADMAP.md Phase 1 success criteria (#1, #2, #3, #4, #5) are observable and pass.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation/01-03-SUMMARY.md` with:
- Lighthouse PWA audit result (if run) — pass/fail + installability + SW precache evidence
- The LAN URL used for device testing (do not include in the SUMMARY file if user prefers; note that it was tested)
- Confirmation of iOS + Android install + offline-launch test results from the human-verify checkpoint
- Whether beforeinstallprompt fired on the Android test device (Chrome sometimes requires repeat visits)
- Any deviations from RESEARCH.md §4 vite-plugin-pwa config (e.g., if `generateSW` had to be swapped for `injectManifest` for any reason)
- Final bundle size from `npm run build` output (so Phase 2 can budget against it)
- Confirmation that CLAUDE.md rule #5 now reads "WebP @ 80%"
</output>
