---
phase: 04-backup-polish
plan: 05
type: execute
wave: 1
depends_on: []
files_modified:
  - public/icon-maskable-512.png
autonomous: false
requirements: [BACK-01, BACK-02]
tags: [pwa, icon, maskable, audit, polish]

must_haves:
  truths:
    - "public/icon-maskable-512.png has been opened in https://maskable.app/editor (or equivalent preview) and verified — the glyph fits inside the inner 60% safe zone with a 20% outer margin filled by the matte background"
    - "If the safe zone is violated, the icon was regenerated with proper padding; if the audit passed, the icon is unchanged"
    - "Manifest entry for the icon (vite.config.ts icons[] array with `purpose: 'maskable'`) is UNTOUCHED either way — wiring is already in place from Phase 1"
  artifacts:
    - path: "public/icon-maskable-512.png"
      provides: "512x512 PNG maskable icon with proper Android-safe geometry"
  key_links:
    - from: "public/icon-maskable-512.png"
      to: "vite.config.ts manifest.icons[] entry with purpose: 'maskable'"
      via: "VitePWA emits the file into dist/ and declares purpose=maskable; Android uses the safe-zone to mask into circles/rounds/squircles"
      pattern: "icon-maskable-512.png"
---

<objective>
Close D-16 — visual audit of the maskable PWA icon. Android's Adaptive Icons system crops maskable icons into platform-defined masks (circle, round-rect, squircle, etc.). Content outside the inner 60% diameter safe-zone gets cropped. If the current `public/icon-maskable-512.png` has the logo extending into the outer 20% margin, regenerate it with proper padding. If it passes, leave it alone — this plan is a cheap visual check, not a committal asset change.

Purpose: Ensures the HealthTracker logo renders correctly on Android home screens across mask shapes (circular on Pixel, squircle on Samsung, etc.). Phase 1 shipped the icon; Phase 4 ratifies it.
Output: Either a confirmed-intact `public/icon-maskable-512.png` (no change), OR a regenerated PNG with the logo inside the 60% safe zone and a matte background filling to the edges.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/phases/04-backup-polish/04-CONTEXT.md
@.planning/phases/04-backup-polish/04-RESEARCH.md
@.planning/phases/04-backup-polish/04-PATTERNS.md
@vite.config.ts
</context>

<tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 1: Visually audit icon-maskable-512.png safe-zone</name>
  <files>
    - public/icon-maskable-512.png (AUDIT — may or may not be modified)
  </files>
  <read_first>
    - .planning/phases/04-backup-polish/04-CONTEXT.md §D-16 (audit procedure)
    - .planning/phases/04-backup-polish/04-RESEARCH.md §"public/icon-maskable-512.png" Assumption A5 (expected outcome — audit passes)
    - .planning/phases/04-backup-polish/04-PATTERNS.md §"public/icon-maskable-512.png" (no code analog; visual check only)
    - vite.config.ts (confirm the icon is wired via `{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }` — no rewire needed regardless of audit outcome)
  </read_first>
  <what-built>
    Claude has NOT automated anything for this task — it is purely a visual-check checkpoint. The auditor (user) must open `public/icon-maskable-512.png` in a maskable preview tool and confirm the logo fits the safe zone. Claude's automated contribution: surface the file path, the tool URL, and the exact pass/fail criteria.

    Pre-checkpoint Claude action (automated, completes before the user is paused):
    1. Confirm the file exists at `public/icon-maskable-512.png`
    2. Print its dimensions using a one-liner (the user can use the OS Preview or an `identify` command if ImageMagick is installed — no dep install required for this task)
    3. Present the preview URL
  </what-built>
  <how-to-verify>
    Verification steps (user performs):

    1. Open https://maskable.app/editor in a browser.
    2. Upload or drag `public/icon-maskable-512.png` (absolute path: `/Users/anirudhchatterjee/dev/healthtracker/public/icon-maskable-512.png`) into the editor.
    3. Cycle through the preview masks on the right panel: **Circle**, **Rounded Square**, **Squircle**, **Square**, **Teardrop**. On each mask:
       - The HealthTracker logo's main content should remain FULLY VISIBLE inside the masked region
       - The matte/background color should extend to the outer edges with NO transparent corners visible through any mask
    4. If the logo's content (glyph / wordmark) gets clipped on ANY mask → **audit fails** → respond with "regenerate" + a short description of what was clipped
    5. If all 5 masks look correct → **audit passes** → respond with "approved" — no file change needed
    6. Alternative local tool: open the PNG in Preview.app (macOS) and mentally overlay a circle of diameter 60% × 512 = ~307px centered at (256, 256). Any logo content outside that circle will get clipped on the strictest mask.

    Expected outcome per RESEARCH Assumption A5: the audit passes (icon was produced correctly in Phase 1; A5 is flagged as "low risk" and explicitly says "if audit fails, regen is a 5-minute task").

    If regeneration is needed:
    - Any image editor (Figma, Preview + grid guides, GIMP, online tools) can produce a 512×512 PNG
    - Design target: HealthTracker glyph centered in the inner 60% (inside a 307px-diameter circle at 256,256), matte background `#09090b` (the dark theme color) or the existing matte filling out to the edges
    - Export as `icon-maskable-512.png` and overwrite the existing file in `public/`

    Do NOT change the manifest entry in `vite.config.ts` — the filename and `purpose: 'maskable'` declaration already match.
  </how-to-verify>
  <action>
Before pausing for the human checkpoint, Claude performs the following automated prep (this is what `what-built` refers to):

STEP 1 — Verify the asset exists and report its size:
```bash
ls -la public/icon-maskable-512.png
# Expected: file exists, typical PNG size ~5-50KB
```

STEP 2 — If `ImageMagick` is available, report dimensions (optional — skip silently if not installed):
```bash
command -v identify >/dev/null 2>&1 && identify public/icon-maskable-512.png || true
# Expected: "public/icon-maskable-512.png PNG 512x512 ..."
```

STEP 3 — Confirm vite.config.ts still wires the icon with `purpose: 'maskable'`:
```bash
grep "icon-maskable-512.png" vite.config.ts
# Expected: `{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },`
```

STEP 4 — Emit the resume prompt with the three outcomes and pause.

After the user resumes:

- If user says "approved" / "passes" / "ok" → no file change, this task is complete
- If user says "regenerate" / "fails" → the user either provides a regenerated file themselves (placed at the same path) OR asks Claude to attempt regeneration via a headless tool. For v1, delegate generation to the user's design tool — Claude does not own icon design. Once the new file is in place, re-run the verify (confirm the filesize changed and the dimensions are still 512×512), then mark complete.
  </action>
  <verify>
    <automated>
      test -f public/icon-maskable-512.png \
      && grep -q "icon-maskable-512.png" vite.config.ts \
      && grep -q "purpose: 'maskable'" vite.config.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - File `public/icon-maskable-512.png` exists
    - Manifest entry in vite.config.ts still declares `{ src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }` (unchanged — wiring is Phase 1's)
    - User has posted one of: `approved` (audit passed — no file change) OR confirmation that the file was regenerated and replaced
    - If the file was regenerated: dimensions are still 512×512 (the PWA manifest's `sizes: '512x512'` declaration would lie otherwise — breaking Android adaptive-icon rendering)
  </acceptance_criteria>
  <resume-signal>
    Respond with ONE of:
    - `approved` — the audit passed across all 5 mask shapes in maskable.app/editor; no file change needed
    - `regenerated` — the icon was failing the safe zone on at least one mask and has been replaced with a corrected 512×512 PNG at the same path
    - `defer` — the audit could not be performed right now; defer this task to post-v1 (acceptable per RESEARCH A5 "low risk" — but flag in the summary that D-16 is NOT closed)
  </resume-signal>
  <done>
    User has signaled approved / regenerated / defer. If approved or regenerated, D-16 is closed. If deferred, D-16 is flagged in the phase summary for post-v1 attention.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| None applicable | Static asset audit only. No code change, no input surface, no runtime behavior. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| — | — | — | — | none — static-asset visual audit only. The only "risk" is an ugly icon on some Android mask shapes, which is a UX concern, not a security concern. |

**ASVS L1 applicable controls:** None.
</threat_model>

<verification>
1. File exists at `public/icon-maskable-512.png`
2. vite.config.ts manifest entry for the maskable icon is intact
3. User has signaled `approved` / `regenerated` / `defer`
</verification>

<success_criteria>
**D-16 closed (or explicitly deferred):** The maskable icon has been visually audited against the 5 standard Android adaptive-icon mask shapes. Either the icon passed as-is (no change), or it was regenerated with a 60% safe-zone inner glyph and matte-filled 20% outer margin. If the user signaled `defer`, D-16 remains open and is surfaced in the Phase 4 summary for post-v1 attention.
</success_criteria>

<output>
After completion, create `.planning/phases/04-backup-polish/04-05-SUMMARY.md` using `$HOME/.claude/get-shit-done/templates/summary.md`. Capture:
- Decisions: D-16 closed (pass OR regenerated) OR explicitly deferred
- Affects: `public/` (audit only; may or may not have regenerated)
- Provides: Ratified maskable icon (or deferred flag)
</output>
