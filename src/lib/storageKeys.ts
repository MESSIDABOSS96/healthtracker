// src/lib/storageKeys.ts
// Centralized localStorage keys. No side effects — safe to import from anywhere.
// Prevents circular imports through @/main.tsx (which has module-load side effects:
// initApp() runs on import → renders App → mounts AppShell → mounts EvictionBanner →
// importing keys from main.tsx would create a cycle on the React-component side of the graph).
export const LAST_OPENED_KEY = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
