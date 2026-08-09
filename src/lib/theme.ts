// src/lib/theme.ts
// Theme preference: 'system' (default), 'light', or 'dark'. The resolved theme
// is applied as a `.dark` class on <html>, which swaps the token values in
// styles/tokens.css. index.html runs the same logic inline before first paint —
// keep the two in sync if the storage key or class ever changes.

import { THEME_KEY } from './storageKeys';

export type ThemePref = 'system' | 'light' | 'dark';

/** Browser-chrome color. Matches the sticky header's surface, not the page
 *  ground, so the status bar reads as part of the header. Keep in sync with
 *  the pre-paint script in index.html. */
const SURFACE_COLOR: Record<'light' | 'dark', string> = {
  light: '#EAF1F9',
  dark: '#16212C',
};

export function getThemePref(): ThemePref {
  const raw = localStorage.getItem(THEME_KEY);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function systemPrefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolveTheme(pref: ThemePref = getThemePref()): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return pref;
}

/** Apply the resolved theme to <html> and the browser chrome color. */
export function applyTheme(pref: ThemePref = getThemePref()): void {
  const resolved = resolveTheme(pref);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', SURFACE_COLOR[resolved]);
}

export function setThemePref(pref: ThemePref): void {
  localStorage.setItem(THEME_KEY, pref);
  applyTheme(pref);
}

/**
 * Re-apply on OS theme changes so 'system' tracks live. Returns an unsubscribe.
 * Called once at startup; the listener is intentionally never removed there.
 */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
  if (!mq) return () => {};
  const onChange = () => {
    if (getThemePref() === 'system') applyTheme('system');
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
