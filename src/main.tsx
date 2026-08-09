import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/index.css';
import { wireBeforeInstallPrompt } from './lib/installMode';
import { LAST_OPENED_KEY, PREV_OPENED_KEY } from './lib/storageKeys';
import { applyTheme, watchSystemTheme } from './lib/theme';
import { seedGoalsIfAbsent } from './services/goals.svc';
import { initSyncLifecycle } from './features/sync/useSync';

/**
 * initApp() — RESEARCH.md §6 startup-invariant sequence.
 * Ordering is non-negotiable:
 *   1. dark theme class (D-19, defense-in-depth on top of index.html class="dark")
 *   2. read previous lastOpenedAt BEFORE overwriting (eviction banner needs it for 4-day gap math, D-14)
 *   3. write new lastOpenedAt for next launch
 *   4. navigator.storage.persist() (SETUP-03 + Pitfall #3 — must run BEFORE Dexie opens)
 *   5. wire beforeinstallprompt (D-13) — must attach BEFORE any install button renders
 *   6. dev-only dayKey smoke (Pitfall #4 tripwire from Plan 01-02)
 *   7. render — Dexie opens lazily on first useLiveQuery
 *   8. SW registration via vite-plugin-pwa virtual module (D-09 autoUpdate)
 */
async function initApp(): Promise<void> {
  // Step 1 — theme. index.html already applied the class pre-paint; this
  // re-asserts it and subscribes to OS changes for the 'system' preference.
  applyTheme();
  watchSystemTheme();

  // Step 2 — read previous lastOpenedAt BEFORE overwriting it.
  const prev = localStorage.getItem(LAST_OPENED_KEY);
  localStorage.setItem(PREV_OPENED_KEY, prev ?? '');

  // Step 3 — write new lastOpenedAt for next launch.
  localStorage.setItem(LAST_OPENED_KEY, String(Date.now()));

  // Step 4 — SETUP-03 + Pitfall #3 (CLAUDE.md rule #4). Request persistent storage.
  // Best-effort; non-fatal — install/eviction banners are the user-facing fallback.
  if (navigator.storage?.persist) {
    try {
      // Raced against a timeout: render must not depend on this resolving.
      // persist() can hang indefinitely in some environments (headless Chrome
      // is one, but so is a browser mid-permission-prompt), and because this
      // await sits before createRoot, a hang meant a permanently blank page.
      // A missed persist costs a storage guarantee; a hang cost the whole app.
      const granted = await Promise.race([
        navigator.storage.persist(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000)),
      ]);
      (window as unknown as { __ht_persisted?: boolean }).__ht_persisted = granted;
    } catch {
      // Swallow — banner path still warns the user.
    }
  }

  // Step 5 — wire Android beforeinstallprompt (D-13). Must be attached before
  // Chrome fires the event; subsequent renders read the captured prompt via
  // getDeferredInstallPrompt() in InstallBanner / SettingsScreen.
  wireBeforeInstallPrompt();

  // Step 6 — dev-only dayKey regression tripwire (Pitfall #4 — Plan 01-02's smoke module).
  // Dynamic import inside import.meta.env.DEV ensures Vite tree-shakes the smoke module
  // out of production bundles (verified via grep -rl 'runDayKeySmoke' dist/ returning empty).
  if (import.meta.env.DEV) {
    void import('./lib/dayKey.smoke').then(({ runDayKeySmoke }) => runDayKeySmoke());
  }

  // Step 6.2 — demo fixture (`npm run dev:demo`, port 5174 → its own origin,
  // therefore its own IndexedDB, so this cannot reach the real database on
  // 5173). Seeds only when the meal table is empty, so edits made while poking
  // at the demo survive a reload; window.__demoReseed() forces a rebuild.
  // Dynamic import keeps the fixture out of production bundles.
  if (import.meta.env.DEV && import.meta.env.VITE_DEMO_SEED === '1') {
    try {
      const { db } = await import('./db/db');
      const { seedDemo, resetDemo } = await import('./dev/seedDemo');
      const { todayKey } = await import('./lib/dayKey');

      (window as unknown as { __demoReseed?: () => Promise<void> }).__demoReseed = () =>
        resetDemo(todayKey()).then(() => location.reload());

      if ((await db.mealEntries.count()) === 0) {
        await seedDemo(todayKey());
        console.info('[demo] seeded 17 weeks of fixture data');
      }
      console.info('[demo] run __demoReseed() in the console to regenerate');
    } catch (err) {
      console.error('[demo] seed failed', err);
    }
  }

  // Step 6.5 — D-13: ensure goals singleton exists before render.
  // Dexie opens lazily here on first goals.get(); awaited so useLiveQuery fires with data on first paint.
  try {
    await seedGoalsIfAbsent();
  } catch (err) {
    console.error('[initApp] goals seed failed', err);
  }

  // Step 6.6 — sync lifecycle. Deliberately NOT awaited: it makes network
  // calls, and this sits before createRoot, so awaiting it would put the first
  // paint behind a round trip — the same mistake persist() already cost us
  // once. Sync writes into Dexie and useLiveQuery refires, so the UI catches up
  // on its own; a signed-in user sees local data first and remote data a moment
  // later, which is the correct order anyway. No-ops when sync isn't configured.
  initSyncLifecycle();

  // Step 7 — render. Dexie opens lazily on first useLiveQuery (Plan 01-02 db.ts);
  // no eager db.open() needed before render.
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  // Step 8 — SW registration via vite-plugin-pwa virtual module. autoUpdate per D-09.
  // immediate: true registers as soon as the page loads (no idle delay).
  //
  // `autoUpdate` on its own installs the new worker and stops there: the page
  // that triggered the install keeps running the assets it already loaded, and
  // only some LATER launch serves the new build. On a phone that is close to
  // never. An installed iOS web app is resumed from the app switcher far more
  // often than it is launched cold, and a resume re-runs nothing — so a fix can
  // sit installed and unseen indefinitely, which is exactly what happened with
  // the standalone shell fix: three builds shipped and the phone ran none.
  //
  // The two additions below close that gap.
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      // A resumed app never re-runs this module, so ask on every return to the
      // foreground instead. `update()` is a conditional request — when nothing
      // changed it costs one 304 and installs nothing.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
    },
  });

  // The worker ships skipWaiting + clientsClaim (generateSW's autoUpdate
  // defaults), so a new one takes over this page the moment it activates —
  // while the DOM still holds the old build's HTML, CSS and JS. Reloading on
  // that handover is what turns "installed" into "running".
  //
  // Guarded on there having BEEN a controller: the first-ever registration also
  // fires this, and reloading there would be a pointless refresh on first open.
  // `reloading` guards the reload itself, since a reload that races a second
  // activation would otherwise loop.
  if ('serviceWorker' in navigator) {
    let reloading = false;
    const hadController = navigator.serviceWorker.controller !== null;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
  }
}

void initApp();
