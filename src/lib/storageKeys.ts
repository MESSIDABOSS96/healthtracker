// src/lib/storageKeys.ts
// Centralized localStorage keys. No side effects — safe to import from anywhere.
// Prevents circular imports through @/main.tsx (which has module-load side effects:
// initApp() runs on import → renders App → mounts AppShell → mounts EvictionBanner →
// importing keys from main.tsx would create a cycle on the React-component side of the graph).
export const LAST_OPENED_KEY = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';
// Anthropic API key lives in localStorage DELIBERATELY — export.svc only reads
// Dexie tables, so the key can never leak into a backup JSON.
export const API_KEY_KEY = 'healthtracker:anthropicApiKey';
// Theme preference — read by the pre-paint inline script in index.html too.
export const THEME_KEY = 'healthtracker:theme';
