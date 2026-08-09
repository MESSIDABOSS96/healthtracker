// src/lib/storageKeys.ts
// Centralized localStorage keys. No side effects — safe to import from anywhere.
//
// The `healthtracker:` prefix is FROZEN. The app is called VZN now, but these
// strings are the addresses of data already sitting in users' browsers —
// renaming them silently abandons every saved theme choice, API key and
// export timestamp. Same reasoning as the Dexie database name in db/db.ts.
// Prevents circular imports through @/main.tsx (which has module-load side effects:
// initApp() runs on import → renders App → mounts AppShell → mounts EvictionBanner →
// importing keys from main.tsx would create a cycle on the React-component side of the graph).
export const LAST_OPENED_KEY = 'healthtracker:lastOpenedAt';
export const PREV_OPENED_KEY = 'healthtracker:prevOpenedAt';
export const INSTALL_DISMISSED_KEY = 'healthtracker:installDismissedAt';
export const LAST_EXPORTED_KEY = 'healthtracker:lastExportedAt';
// The AI provider config lives in localStorage DELIBERATELY — export.svc only
// reads Dexie tables, so the key can never leak into a backup JSON.
// The key name still says "anthropic" for the frozen-prefix reason above: it's
// the address of a key someone already has saved. It now holds whichever
// provider's key is active; AI_PROVIDER_KEY says which.
export const API_KEY_KEY = 'healthtracker:anthropicApiKey';
export const AI_PROVIDER_KEY = 'healthtracker:aiProvider';
export const AI_MODEL_KEY = 'healthtracker:aiModel';
// Theme preference — read by the pre-paint inline script in index.html too.
export const THEME_KEY = 'healthtracker:theme';
