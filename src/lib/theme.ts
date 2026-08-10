// src/lib/theme.ts
// Theme preference: 'light' (default), 'dark', or 'system'. The resolved theme
// is applied as a `.dark` class on <html>, which swaps the token values in
// styles/tokens.css. index.html runs the same logic inline before first paint —
// keep the two in sync if the storage key or class ever changes.
//
// The default is light rather than system because the design HAS a first
// impression and it is the daylight one: the palette is a sky, and someone
// opening the app for the first time should meet it. Dark mode is the same sky
// at night, and it stays one tap away — 'system' is still an option, it is just
// no longer what you get by not choosing. Only the absence of a stored
// preference is affected; anyone who has already chosen keeps their choice.

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
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'light';
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
