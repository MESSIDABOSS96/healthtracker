---
phase: 04-backup-polish
plan: "04"
subsystem: pwa-manifest
tags: [pwa, manifest, ios, meta, install-polish]

dependency_graph:
  requires: []
  provides:
    - "PWA manifest id='/' for stable identity (D-15)"
    - "PWA manifest categories for install-UI hint (D-15)"
    - "standardized mobile-web-app-capable meta tag (D-14 refinement)"
  affects:
    - vite.config.ts
    - index.html

tech_stack:
  added: []
  patterns:
    - "Dual apple-prefixed + standardized PWA meta tag for cross-platform install compatibility"
    - "W3C manifest id field pinned to '/' for URL-drift-proof PWA identity"

key_files:
  created: []
  modified:
    - vite.config.ts
    - index.html

decisions:
  - "D-15 closed: id='/' pins PWA identity per W3C manifest spec; categories surfaces in install-UI"
  - "D-14 confirmed-already-shipped by Phase 1 (3 apple-* tags); Phase 4 adds standardized mobile-web-app-capable for Android install-UI correctness"
  - "Both apple-mobile-web-app-capable AND mobile-web-app-capable ship together — iOS requires the apple-prefixed tag (RESEARCH Pitfall 2), Android install UI reads the standardized name"

metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-22T02:33:32Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 4 Plan 04: Manifest Meta Summary

**One-liner:** PWA manifest hardened with W3C `id='/'` + categories, and cross-platform install meta tags completed with standardized `mobile-web-app-capable` alongside the existing iOS apple-prefixed set.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add manifest.id and manifest.categories in vite.config.ts | b55efb6 | vite.config.ts |
| 2 | Add standardized mobile-web-app-capable meta tag in index.html | d952bf0 | index.html |

## What Was Built

**Task 1 — manifest hygiene (D-15):** Added two keys to the VitePWA manifest block in `vite.config.ts`:
- `id: '/'` immediately after `description` — pins PWA identity per W3C manifest spec. Without this field, browsers derive identity from `start_url+scope`, which can orphan installs if the deploy URL ever changes.
- `categories: ['health', 'fitness', 'productivity']` — surfaces in app-store and install-UI rendering that reads the W3C categories field.

Build verified: `dist/manifest.webmanifest` contains `"id":"/"` and `"categories":["health","fitness","productivity"]`. All 10 pre-existing manifest keys (name, short_name, description, theme_color, background_color, display, start_url, scope, orientation, icons) remain intact.

**Task 2 — cross-platform install meta (D-14 refinement):** Added one line to `index.html`:
```html
<meta name="mobile-web-app-capable" content="yes" />
```
Placed immediately after the existing `<meta name="apple-mobile-web-app-capable" content="yes" />`. The comment block above the meta group was updated to document the rationale (RESEARCH Pitfall 2: apple-prefixed tag is "deprecated" but still required by iOS Safari; standardized name is what Android install UI reads).

The three Phase 1 apple-* tags (capable, status-bar-style, title) are preserved intact — D-14's baseline was already shipped by Phase 1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing TS6133 unused React import in confirm-dialog.tsx**
- **Found during:** Task 1 verification (`npm run build` failed)
- **Issue:** `src/components/ui/confirm-dialog.tsx` contained `import * as React from 'react'` which was unused under the JSX automatic transform. This file was created by another parallel wave agent but not yet committed to git.
- **Fix:** A linter automatically removed the import before we could manually edit — the file was already clean on the second read.
- **Files modified:** src/components/ui/confirm-dialog.tsx (via linter, not committed by this plan — belongs to the parallel agent's plan)
- **Commit:** Not committed here (file is untracked, belongs to another plan's commit)

## Decisions Made

1. **D-15 closed:** `id: '/'` and `categories` added to `vite.config.ts` VitePWA manifest block. Build emits both fields into `dist/manifest.webmanifest`.
2. **D-14 confirmed-already-shipped + refined:** Phase 1 already shipped the 3 apple-* meta tags at `index.html:9-11`. Phase 4 adds the standardized `mobile-web-app-capable` name for Android install-UI completeness (per RESEARCH Pitfall 2). D-14 is therefore "Phase 1 baseline + Phase 4 standardized complement."
3. **Dual-tag pattern established:** Ship both `apple-mobile-web-app-capable` and `mobile-web-app-capable` together. iOS Safari requires the apple-prefixed name (deprecated but still actively read). Android install UI reads the standardized name. Both coexist harmlessly.

## Known Stubs

None — this plan adds only declarative metadata. No runtime code, no UI, no data flow.

## Threat Flags

None — declarative manifest keys and static HTML meta tags only. No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries.

## Self-Check: PASSED

- [x] `vite.config.ts` contains `id: '/',` — verified by grep
- [x] `vite.config.ts` contains `categories: ['health', 'fitness', 'productivity'],` — verified by grep
- [x] `dist/manifest.webmanifest` contains `"id":"/"` — verified by cat output
- [x] `dist/manifest.webmanifest` contains `"categories":["health","fitness","productivity"]` — verified by cat output
- [x] `index.html` contains `<meta name="mobile-web-app-capable" content="yes" />` — verified by grep
- [x] `index.html` still contains all 3 apple-* meta tags — verified by grep
- [x] `mobile-web-app-capable` appears 3 times in index.html (2 meta tags + 1 comment) — verified by grep -c returning 3
- [x] `npm run build` exits 0 — confirmed
- [x] Commits b55efb6 and d952bf0 exist in git log
