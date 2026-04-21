// src/lib/version.ts
// APP_VERSION + BUILD_HASH for the Settings version line (D-10).
// Values are injected at build time by vite.config.ts `define` block.
// Fallbacks keep this module runnable in tests / non-Vite contexts.
export const APP_VERSION: string =
  (import.meta.env as unknown as { VITE_APP_VERSION?: string }).VITE_APP_VERSION ?? '0.1.0';
export const BUILD_HASH: string =
  (import.meta.env as unknown as { VITE_BUILD_HASH?: string }).VITE_BUILD_HASH ?? 'dev';
