---
status: partial
phase: 04-backup-polish
source: [04-VERIFICATION.md]
started: 2026-04-21T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Export button click produces a downloadable JSON file
expected: Tap "Export data" in Settings → browser downloads `healthtracker-YYYY-MM-DD.json` where YYYY-MM-DD is today's LOCAL dayKey (not UTC). Button shows spinner + "Exporting…" while running, swaps back to "Export data" on completion.
result: [pending]

### 2. Downloaded file parses into correct envelope shape
expected: Open the downloaded JSON. Top-level shape is `{ schemaVersion, exportedAt, appVersion, data: {ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals}, photos: { [key]: dataURI } }`. All 7 tables present (arrays). Photos map present (may be empty if no food photos exist). `data.foods[i].photoKey` (where present) appears as a key in `photos`.
result: [pending]

### 3. 14-day stale nudge renders inline
expected: Manually set `localStorage.setItem('healthtracker:lastExportedAt', String(Date.now() - 15 * 86400000))` in DevTools. Refresh Settings. ExportCard shows "Time to back up — last exported 15 days ago" inline (no modal, no banner). Card text styling matches Settings card visual language.
result: [pending]

### 4. Never-exported nudge after first log
expected: On a fresh install with no data, ExportCard does NOT show the nudge. Log any single entry (PT, food, steps, or lift). Refresh Settings. ExportCard now shows "Back up your data" inline. After tapping Export and completing one export, the nudge disappears.
result: [pending]

### 5. Midnight rollover — streak count and today-ring update without reload
expected: With Calendar open, manually advance system clock past local midnight (or run for ~24h). Streak count updates within ~5s of midnight to reflect the new day's status (likely starting at 0 for today's quadrants). Today's calendar cell becomes the new day's cell with empty quadrants. No page reload required.
result: [pending]

### 6. iOS standalone PWA install experience
expected: On iOS Safari → Share → "Add to Home Screen". Open the app from the home-screen icon. App launches in standalone mode (no Safari chrome). Status bar uses black-translucent style. Home-screen icon shows correctly (192px or 512px depending on device). On Android Chrome equivalent, icon is masked into circle/squircle correctly with no clipping.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
