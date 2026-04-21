---
phase: 04-backup-polish
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - vite.config.ts
  - index.html
autonomous: true
requirements: [BACK-01, BACK-02]
tags: [pwa, manifest, ios, meta, install-polish]

must_haves:
  truths:
    - "PWA manifest contains `id: '/'` for stable identity (prevents install drift on future deploy-URL changes)"
    - "PWA manifest contains `categories: ['health', 'fitness', 'productivity']` (app-store / install-UI hint)"
    - "index.html contains `<meta name=\"mobile-web-app-capable\" content=\"yes\">` alongside the existing apple-prefixed tag (forward compatibility — research Pitfall 2)"
    - "Existing 3 apple-* meta tags (apple-mobile-web-app-capable, apple-mobile-web-app-status-bar-style, apple-mobile-web-app-title) remain intact from Phase 1"
    - "manifest description, theme_color, background_color, display, start_url, scope, orientation, icons all remain intact"
    - "npm run build succeeds and generates a manifest webmanifest with the new keys"
  artifacts:
    - path: "vite.config.ts"
      provides: "VitePWA manifest block with D-15 additions (id, categories)"
      contains: "id: '/',"
    - path: "index.html"
      provides: "D-14 iOS meta tags + RESEARCH-recommended standardized mobile-web-app-capable tag"
      contains: "mobile-web-app-capable"
  key_links:
    - from: "vite.config.ts"
      to: "dist/manifest.webmanifest (build output)"
      via: "VitePWA plugin reads the manifest object and writes it to the build output"
      pattern: "id: '/'"
    - from: "index.html"
      to: "iOS Safari standalone-mode renderer"
      via: "iOS reads apple-* meta tags directly from HTML head (NOT from manifest)"
      pattern: "apple-mobile-web-app-"
---

<objective>
Close D-14 (iOS meta tags) and D-15 (manifest hygiene) with the two tiny declarative changes CONTEXT.md locked in. Per the planner's resolution of open question #1, D-14 is reinterpreted as "already shipped by Phase 1, plus the RESEARCH-recommended one-line `mobile-web-app-capable` addition for Android correctness."

Purpose: `id: '/'` stabilizes PWA identity so future URL changes don't orphan installs. `categories` surfaces in app-store / install-UI rendering. The second `mobile-web-app-capable` meta tag preserves iOS behavior (the apple-prefixed tag is "deprecated" but still required — research Pitfall 2) while registering the standardized name Android's install UI prefers.
Output: 2 keys added to vite.config.ts manifest block; 1 line added to index.html. Zero runtime code.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-backup-polish/04-CONTEXT.md
@.planning/phases/04-backup-polish/04-RESEARCH.md
@.planning/phases/04-backup-polish/04-PATTERNS.md

<!-- Source files this plan READS or modifies -->
@vite.config.ts
@index.html
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Add manifest.id and manifest.categories in vite.config.ts</name>
  <files>
    - vite.config.ts (MODIFIED — 2 keys added to manifest object inside VitePWA)
  </files>
  <read_first>
    - vite.config.ts (current full file — verify the VitePWA block lines 32-57 and the exact structure of the manifest object lines 41-56)
    - .planning/phases/04-backup-polish/04-CONTEXT.md §D-15 (exact keys + values)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §"Code Examples" additional manifest section (verbatim target diff)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"vite.config.ts" for the surgical-change guidance
  </read_first>
  <behavior>
    - After edit, the VitePWA manifest object contains exactly one new line `id: '/',` and exactly one new line `categories: ['health', 'fitness', 'productivity'],`
    - All existing keys (`name`, `short_name`, `description`, `theme_color`, `background_color`, `display`, `start_url`, `scope`, `orientation`, `icons`) remain unchanged
    - `description` stays as `'Personal daily tracker for PT, food, steps, and lifts.'` — per CONTEXT D-15 sub-item "keep unless reads stale" and RESEARCH confirms it is clear
    - No change to `VitePWA` plugin options outside the `manifest` object (strategies, registerType, includeAssets, workbox all unchanged)
    - `npm run build` produces a `dist/manifest.webmanifest` that includes the two new keys (can be verified by grep on build output)
  </behavior>
  <action>
Modify `vite.config.ts`. The current manifest block (lines 41-56) reads:

```typescript
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
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
},
```

Insert the two new keys RIGHT AFTER `description` (so identity + category semantic-group together) — final state:

```typescript
manifest: {
  name: 'HealthTracker',
  short_name: 'HealthTracker',
  description: 'Personal daily tracker for PT, food, steps, and lifts.',
  id: '/',                                            // Phase 4 D-15: pin PWA identity (W3C manifest spec)
  categories: ['health', 'fitness', 'productivity'],  // Phase 4 D-15: install-UI / store category hint
  theme_color: '#09090b',
  background_color: '#09090b',
  display: 'standalone',
  start_url: '.',
  scope: '.',
  orientation: 'portrait',
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
},
```

Do NOT alter any other part of the file — `define`, `plugins` order, `resolve.alias`, `strategies`, `registerType`, `includeAssets`, `workbox` remain exactly as they are.
  </action>
  <verify>
    <automated>
      grep -q "id: '/'," vite.config.ts \
      && grep -q "categories: \\['health', 'fitness', 'productivity'\\]," vite.config.ts \
      && grep -q "name: 'HealthTracker'," vite.config.ts \
      && grep -q "short_name: 'HealthTracker'," vite.config.ts \
      && grep -q "description: 'Personal daily tracker for PT, food, steps, and lifts.'," vite.config.ts \
      && grep -q "theme_color: '#09090b'," vite.config.ts \
      && grep -q "background_color: '#09090b'," vite.config.ts \
      && grep -q "display: 'standalone'," vite.config.ts \
      && grep -q "start_url: '.'," vite.config.ts \
      && grep -q "scope: '.'," vite.config.ts \
      && grep -q "orientation: 'portrait'," vite.config.ts \
      && grep -q "icon-maskable-512.png" vite.config.ts \
      && npm run build \
      && grep -q "\"id\":\"/\"" dist/manifest.webmanifest \
      && grep -q "\"categories\":\\[\"health\",\"fitness\",\"productivity\"\\]" dist/manifest.webmanifest
    </automated>
  </verify>
  <acceptance_criteria>
    - File `vite.config.ts` contains the exact line (ignoring trailing whitespace/comments): `id: '/',`
    - File contains `categories: ['health', 'fitness', 'productivity'],`
    - File still contains all 10 pre-existing manifest keys verbatim: `name`, `short_name`, `description`, `theme_color`, `background_color`, `display`, `start_url`, `scope`, `orientation`, `icons`
    - File still contains the 3-icon array (icon-192.png, icon-512.png, icon-maskable-512.png with `purpose: 'maskable'`)
    - File still contains `strategies: 'generateSW'`, `registerType: 'autoUpdate'` (untouched)
    - `npm run build` exits 0
    - Build output `dist/manifest.webmanifest` contains the JSON pair `"id":"/"` (verifies VitePWA correctly emitted the new key)
    - Build output `dist/manifest.webmanifest` contains the JSON pair `"categories":["health","fitness","productivity"]`
  </acceptance_criteria>
  <done>
    vite.config.ts has the 2 new manifest keys in the recommended semantic position. Build succeeds and the generated webmanifest contains both fields.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Add standardized mobile-web-app-capable meta tag in index.html</name>
  <files>
    - index.html (MODIFIED — 1 line added)
  </files>
  <read_first>
    - index.html (current full file — verify lines 9-11 already contain the 3 apple-* tags from Phase 1)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §"Common Pitfalls" Pitfall 2 (why BOTH tags must ship)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §"Open Questions" #1 (D-14 scope decision — planner resolved to "already-shipped + 1-line refinement")
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"index.html" for current state
  </read_first>
  <behavior>
    - After edit, index.html contains BOTH `<meta name="apple-mobile-web-app-capable" content="yes" />` AND `<meta name="mobile-web-app-capable" content="yes" />` in the `<head>`
    - The 3 existing apple-* meta tags (capable, status-bar-style, title) remain intact — D-14's explicit list is preserved
    - No other index.html changes — the viewport, theme-color, apple-touch-icon, favicon, title, body, script remain byte-for-byte identical
    - iOS Safari continues to read `apple-mobile-web-app-capable` (research Pitfall 2 — tag is "deprecated" but still required)
    - Android install UI reads the standardized `mobile-web-app-capable` name
  </behavior>
  <action>
Modify `index.html`. The current `<head>` (lines 1-14) reads:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#09090b" />
    <!-- iOS home-screen install support (vite-plugin-pwa does NOT inject these — iOS Safari reads them from HTML, not the manifest). -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HealthTracker" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <title>HealthTracker</title>
  </head>
```

Insert ONE new line immediately after the existing `apple-mobile-web-app-capable` line. Also update the comment above to mention both tags. Final state:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#09090b" />
    <!-- iOS home-screen install support (vite-plugin-pwa does NOT inject these — iOS Safari reads them from HTML, not the manifest).
         Phase 4 D-14 / RESEARCH Pitfall 2: the apple-prefixed tag is "deprecated" but still required by iOS Safari; we ship both
         the apple-prefixed and the standardized `mobile-web-app-capable` name for cross-platform correctness. -->
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="HealthTracker" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <title>HealthTracker</title>
  </head>
```

No changes to `<body>`, `<script>`, the `<html lang="en" class="dark">` attributes, the viewport tag, the theme-color tag, the apple-touch-icon link, the icon link, or the title.
  </action>
  <verify>
    <automated>
      grep -q '<meta name="mobile-web-app-capable" content="yes" />' index.html \
      && grep -q '<meta name="apple-mobile-web-app-capable" content="yes" />' index.html \
      && grep -q '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />' index.html \
      && grep -q '<meta name="apple-mobile-web-app-title" content="HealthTracker" />' index.html \
      && grep -q '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />' index.html \
      && grep -q '<title>HealthTracker</title>' index.html \
      && grep -q 'viewport-fit=cover' index.html \
      && grep -q 'theme-color' index.html \
      && test "$(grep -c 'mobile-web-app-capable' index.html)" -ge "2" \
      && npm run build
    </automated>
  </verify>
  <acceptance_criteria>
    - File `index.html` contains the exact line `<meta name="mobile-web-app-capable" content="yes" />` (standardized name — NEW)
    - File STILL contains the exact line `<meta name="apple-mobile-web-app-capable" content="yes" />` (apple-prefixed — from Phase 1, MUST remain for iOS per Pitfall 2)
    - File STILL contains `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />` (Phase 1 — D-14)
    - File STILL contains `<meta name="apple-mobile-web-app-title" content="HealthTracker" />` (Phase 1 — D-14)
    - File STILL contains `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` (Phase 1)
    - File STILL contains `<title>HealthTracker</title>` and the `viewport-fit=cover` + theme-color meta tags (untouched)
    - The substring `mobile-web-app-capable` appears at least TWICE in the file (one apple-prefixed, one standardized)
    - `<body>`, `<script>`, and the `<html>` tag attributes are byte-for-byte unchanged
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>
    index.html now ships both the apple-prefixed and standardized `mobile-web-app-capable` meta tags. Build succeeds. D-14 fully closed (Phase 1's 3 tags + Phase 4's 1 standardized tag).
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| None applicable | Declarative build-config + static HTML meta tags only. No runtime code, no new input surface, no network. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| — | — | — | — | none — declarative change only. Manifest id and categories are hint-metadata; iOS apple-* + standardized mobile-web-app-capable meta tags are declarative install directives, not executable code. No attack surface added. |

**ASVS L1 applicable controls:** None.
</threat_model>

<verification>
1. `npm run build` exits 0
2. Build output `dist/manifest.webmanifest` contains `"id":"/"` and `"categories":["health","fitness","productivity"]`
3. Grep confirms index.html contains both `mobile-web-app-capable` and `apple-mobile-web-app-capable` (each appearing at least once)
4. Manual sanity (Phase-end UAT, NOT this plan's gate):
   - Open DevTools Application panel → Manifest; confirm `id` = `/` and `categories` lists the 3 items
   - Install to iOS home screen; confirm status-bar-style is black-translucent (carry-forward from Phase 1 — should still work since apple-* tags are intact)
</verification>

<success_criteria>
**D-15 closed:** vite.config.ts manifest block contains `id: '/'` and `categories: ['health', 'fitness', 'productivity']`. Build emits them into dist/manifest.webmanifest.

**D-14 closed (plus RESEARCH refinement):** index.html ships all 3 apple-* tags from Phase 1 PLUS the research-recommended standardized `mobile-web-app-capable` tag for Android install-UI correctness. Pitfall 2 handled — both tag names coexist per research best practice.

**No collateral changes:** Only 3 lines added across 2 files. No other manifest fields, no other HTML tags, no build plugin behavior altered.
</success_criteria>

<output>
After completion, create `.planning/phases/04-backup-polish/04-04-SUMMARY.md` using `$HOME/.claude/get-shit-done/templates/summary.md`. Capture:
- Decisions: D-14 closed (Phase 1 baseline + Phase 4 standardized tag), D-15 closed; open Q #1 resolved
- Patterns established: "dual apple-prefixed + standardized PWA meta tag pattern for forward compatibility"
- Affects: `vite.config.ts`, `index.html`
- Provides: PWA manifest `id` + `categories`; cross-platform install capability meta
</output>
