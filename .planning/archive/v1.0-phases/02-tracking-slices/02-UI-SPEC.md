---
phase: 2
slug: tracking-slices
status: draft
shadcn_initialized: true
preset: shadcn zinc (new-york style, `cssVariables: true`, baseColor: zinc, iconLibrary: lucide) — inherited from Phase 1 `components.json`
created: 2026-04-20
---

# Phase 2 — UI Design Contract

> Feature-logging design contract for PT templates/sessions, Food library+meal log with macros, Steps, Lift check-in, and Goals/Settings. **Extends** Phase 1's locked baseline (`.planning/phases/01-foundation/01-UI-SPEC.md`). Does NOT re-declare tokens, typography, spacing scale, color palette, anti-motion policy, accessibility baselines, or responsive scope — those remain authoritative per Phase 1 and are referenced by section name below.

**Inheritance rule:** if Phase 1 UI-SPEC declared a value, Phase 2 uses it verbatim. Phase 2 only specifies NEW design contracts that arise from logging UI (Sheet modals, progress bars, chips, inline forms, status copy). Any conflict between this spec and Phase 1 is a bug — Phase 1 wins.

**Scope narrowness:** this spec covers the Sheet primitive upgrade, 5 feature slices' visual contracts (PT, Food, Steps, Lift, Goals), progress-bar geometry, and Today-card populated-status copy. DayCell SVG, calendar grid, day-detail view, JSON export UX, and past-day editing are Phase 3/4 — explicitly excluded.

---

## Design System

Inherits from Phase 1 `components.json` — no changes.

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn (already initialized in Phase 1) | `components.json` exists |
| Preset | zinc / new-york / `cssVariables: true` / `iconLibrary: lucide` | Phase 1 D-15 + `components.json` |
| Component library | Radix (via shadcn/ui) | Phase 1 UI-SPEC |
| Icon library | `lucide-react` | Phase 1 UI-SPEC |
| Font | System stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) | Phase 1 `index.css` |
| Theme | Dark only (`.dark` class on `<html>`) | Phase 1 D-19 |
| Tokens | `src/styles/tokens.css` → Tailwind v4 `@theme` | Phase 1 D-18 |

### shadcn adds for Phase 2 (authoritative install list)

Planner/executor runs (idempotent):

```
npx shadcn@latest add sheet
```

This OVERWRITES the Phase 1 stub `src/components/ui/sheet.tsx` with the real Radix-Dialog-backed implementation (D-01). `@radix-ui/react-dialog` is pulled in automatically as a transitive dependency. **No other shadcn components added this phase** — all chips, progress bars, inline inputs, checkboxes, and form fields are built from Tailwind utilities on Phase 1 primitives (Button, Card, Sheet) or plain HTML elements.

### npm adds for Phase 2

```
npm install react-hook-form zod @hookform/resolvers
```

Per Phase 2 CONTEXT D-15. `@radix-ui/react-dialog` comes via shadcn Sheet re-install.

---

## Spacing Scale

**Inherits Phase 1 UI-SPEC §Spacing Scale verbatim.** 8-point grid: 4 / 8 / 16 / 24 / 32 / 48 / 64, with 44×44 touch-target exception.

### Phase 2 NEW fixed dimensions

| Element | Value | Rationale |
|---------|-------|-----------|
| Bottom Sheet max content height | `85vh` | Leaves safe-area + header visible behind scrim; scrollable inner content |
| Sheet top padding | 24px (`pt-6`) | Clear space above handle/title |
| Sheet horizontal padding | 16px (`px-4`) | Matches Today screen horizontal padding (Phase 1) |
| Sheet section gap | 16px (`space-y-4`) | Between Food Sheet sub-sections (macro bar → chips → search → list) |
| Quick-log chip height | 40px (`h-10`) | Tappable; chip itself is 40px; **parent row** gives `py-1` padding so total touch target ≥ 44px vertical |
| Quick-log chip horizontal padding | 12px (`px-3`) | Compact but readable; variable width by label length |
| Quick-log chip gap | 8px (`gap-2`) | Comfortable at thumb scale inside horizontal scroll row |
| Progress bar height | 8px (`h-2`) | Visible but not dominant; Phase 3 DayCell owns the heavier chroma; keeps Today cards calm |
| Progress bar corner radius | `rounded-full` (4px implicit at 8px height) | Softer read than hard-corner bars |
| Progress bar row gap (above/below) | 8px (`mt-2`) | Separates bar from numeric status line |
| Sticky macro totals bar height | 56px | Matches header height (Phase 1) — reads as internal sub-header inside Food Sheet |
| Inline-edit meal row height | 48px | Taller than a chip; includes servings input + bucket + delete |
| PT exercise row gap (vertical) | 16px (`space-y-4`) | One row per exercise; clear separation for input focus on mobile |
| PT actuals input width | 64px (`w-16`) | Three side-by-side (sets / reps / duration); fits iPhone 390px width with labels |
| Goals form field gap | 16px (`space-y-4`) | Five fields stacked; matches PT exercise rhythm |
| Form input height | 44px (`h-11`) | Matches accessibility touch target; slightly larger than shadcn Button default to privilege thumb |
| Lift toggle glyph size | 32px (font-size for `☐` / `✓`) | Visual weight matches section title; parent `<button>` wraps with 44×44 hit area via `p-2` |
| Steps inline input width | 96px (`w-24`) | Fits 5-digit step count; right-aligns in card status slot |

All values above are multiples of 4 except the 44px accessibility touch target and 56px sticky header (inherited from Phase 1). No other exceptions.

---

## Typography

**Inherits Phase 1 UI-SPEC §Typography verbatim.** Four roles (Display 20/600, Heading 16/600, Body 14/400, Label 12/400), two weights only (400 + 600), system font stack, line heights 1.2/1.3/1.5/1.4.

### Phase 2 role assignments (NEW consumers)

| Surface | Role | Rationale |
|---------|------|-----------|
| Sheet title (e.g. "Log food", "PT session") | Heading (16/600/`--text`) | Matches Today-card titles; sub-screen feel, not display |
| Sheet section label (e.g. "Recent", "Frequent", "Today's meals") | Label (12/400/`--muted`) uppercase via `uppercase tracking-wide` | Classifier, not a heading; recedes behind chip content |
| Macro totals numbers (4 macros) | Heading (16/600/`--text`) for number, Label (12/400/`--muted`) for unit label underneath | Number is the load-bearing signal; "cal" / "g" recede |
| Progress bar numeric status (e.g. "1420 / 2000 cal") | Body (14/400/`--text`) | Card-status-slot convention from Phase 1 |
| Quick-log chip label | Body (14/400/`--text`) on surface | Readable at thumb distance |
| PT exercise name | Body (14/400/`--text` **semibold exception: 14/600**) | Weight-600 on Body is the ONE Phase 2 typography addition — needed to distinguish exercise name from target/actuals. Declared here, not in Phase 1. |
| PT target display (e.g. "Target: 3×15") | Label (12/400/`--muted`) | Secondary to name and actuals |
| PT previous-session hint (D-12) | Label (12/400/`--muted`) | Muted one-liner — recedes visually per D-12 intent |
| Form field label (Goals) | Label (12/400/`--muted`) | Above input, not floating |
| Form field input text | Body (14/400/`--text`) | Matches Body role; number inputs use `tabular-nums` |
| Form field error message | Label (12/400/`#ef4444` — destructive, see Color) | Below the affected input; never red background |
| Inline "Create '[query]'" row | Body (14/400/`--text`) with leading `+` icon | Matches chip label role; reads as actionable |

**Phase 2 typography addition (one exception to Phase 1's strict 4-role / 2-weight rule):**
`Body-semibold` = 14px / weight 600 / line-height 1.5. Used ONLY for PT exercise name in a session row, where visual hierarchy without a new font-size is required. No other use site in Phase 2. Declared explicitly so the checker does not flag it as drift.

---

## Color

**Inherits Phase 1 UI-SPEC §Color verbatim.** Zinc dark palette (`--bg` `#09090b`, `--surface` `#18181b`, `--border` `#27272a`, `--muted` `#a1a1aa`, `--text` `#fafafa`) + accent `--accent` `#22c55e`.

### Phase 2 60 / 30 / 10 audit

| Role | Value | Phase 2 usage (additions on top of Phase 1 usage) |
|------|-------|---------------------------------------------------|
| Dominant (60%) | `--bg` `#09090b` | App body, Sheet scrim background (`rgba(0,0,0,0.6)` overlay — see Scrim below) |
| Secondary (30%) | `--surface` `#18181b` | **Sheet panel background**, sticky macro totals bar, chip background, form input background, progress-bar track (via alpha — see below), inline-edit meal row background |
| Border | `--border` `#27272a` | Sheet top border, chip border (resting state), form input border, progress-bar track at 100% (fallback), separator lines between today's meal entries, PT exercise row separator |
| Muted text | `--muted` `#a1a1aa` | Section labels, previous-session hint, "not set" sentinel copy, form field labels, chip label when dimmed (not-yet-logged variant — not used in Phase 2, reserved) |
| Primary text | `--text` `#fafafa` | Sheet titles, chip labels, macro numbers, exercise names (semibold), form input text, active-state chip text |
| Accent (10%) | `--accent` `#22c55e` | See reserved-for list below |

### Accent reserved for (Phase 2 — ADDITIVE to Phase 1's list)

Phase 1 reserved accent for: active tab indicator, Install-banner primary button, keyboard focus ring.

Phase 2 adds these ONLY:

1. **Progress-bar fill** for the 4 macro bars (calories / protein / carbs / fat) and the steps bar. Solid `--accent` fill at any non-zero-target, non-zero-consumed state. Exceeds-target state: bar still fills to 100% width (no overflow rendering in Phase 2); number shows actual value (e.g. "2340 / 2000 cal"). **No visual "over target" state in Phase 2** — design decision to avoid a red/negative signal per Pitfall #6 streak-anxiety principle. Future phase can add a muted "+340" overflow indicator if needed.
2. **Primary button** in Sheet footers (`Save`, `Start session`, `Create '[query]'`). Inherits Phase 1 Button `variant="default"` (already accent-bg).
3. **Sheet title-row trailing `Save` action** in PT Session sheet and Goals form: standard `<Button variant="default">`.
4. **Checkbox checked state (PT exercise `completed` + Lift `☐ → ✓` toggle)**: the `✓` glyph itself colored `--accent`. Empty `☐` is `--muted`. Transition: instant color swap (per anti-motion policy).

Accent is NOT used for:
- Chip backgrounds, chip borders, chip text (even in "frequent" / "recent" contexts — chips stay surface/border/text)
- Form input borders when focused (focus ring handles visibility — ring-accent is already in Phase 1 contract)
- Sheet panel borders or backgrounds
- Inline-edit meal row highlight
- Any "success" state (no success indication beyond Sheet closing + Today card re-rendering — per D-04)
- Hover states on chips or list rows
- Macro totals bar background (stays `--surface`)
- Previous-session hint (stays `--muted`)

### Progress-bar track color

Progress bar track is `rgba(255, 255, 255, 0.08)` — a subtle alpha on `--text` over `--surface`. This keeps the track barely visible at rest ("not started" reads as near-empty), and the accent fill stands out cleanly. **Not** `--border` (`#27272a`) — border on surface is too muted to read as a bar. **Not** `--accent-25` — that ramp is reserved for Phase 3 DayCell (D-17) and must not leak into Phase 2 progress bars or the contract blurs.

Locked: `bg-white/[0.08]` on the track (Tailwind v4 arbitrary alpha syntax), `bg-accent` on the fill.

### Sheet scrim (overlay behind Sheet)

Radix Dialog overlay: `bg-black/60` (`rgba(0, 0, 0, 0.6)`). No blur (`backdrop-blur-*` banned per anti-motion / low-noise aesthetic). Scrim click closes Sheet.

### Destructive color (Phase 2 FIRST-USE declaration)

Phase 1 deferred destructive color to "when first delete UI ships." Phase 2 ships delete UI (meal entry delete, PT template delete, food library delete via picker overflow). Locked:

| Role | Value | Usage |
|------|-------|-------|
| Destructive | `#ef4444` (Tailwind `red-500`) | Delete button text on inline-edit rows; delete action in "⋯" overflow menu; form field error message text |

Destructive color is NEVER used for:
- Backgrounds (no red-bg delete buttons)
- Borders (form field error borders stay `--border` — only the error-message copy below is red)
- Confirmation modals (Phase 2 has NO destructive confirmation modals — see Copywriting Contract)

Contrast: `#ef4444` on `#18181b`: 4.6:1 (passes AA large-text; Body 14px 400 technically needs 4.5:1 — meets threshold exactly). Acceptable for inline delete labels; does NOT need tuning.

### Contrast spot-checks (Phase 2 NEW pairs)

- Body (14/400 `#fafafa`) on sticky macro totals bar `#18181b`: 20.5:1 (AAA) — inherits Phase 1 finding
- `#ef4444` on `#18181b` surface: 4.6:1 (AA)
- Chip label `#fafafa` on chip bg `#18181b` with `--border`: 20.5:1 (AAA)
- Progress bar track `rgba(255,255,255,0.08)` on `#18181b` card bg: 1.08:1 — intentionally subtle; this is not a text surface and does not need to meet contrast
- Progress bar fill `#22c55e` on track `rgba(255,255,255,0.08)`: visible delta confirmed empirically — no contrast concern since it's a data-viz fill, not a text surface

---

## Copywriting Contract

Phase 2 ships live-logging UI; copy below is locked verbatim. Executor must use these exact strings. All copy is title-case sentence casing for labels (Phase 1 convention) and lowercase-midsentence for inline status phrases.

### Today-card populated-status copy patterns (D-04 + CONTEXT §"Claude's Discretion")

Pattern: `{Title} — {status}`. The em-dash separator (U+2014) and surrounding spaces are mandatory. Title casing matches Phase 1 unaltered.

| Card | Status slot pattern | Example populated | When |
|------|---------------------|-------------------|------|
| PT | `{Template name} · {completedCount}/{totalCount} ex` | `PT — Upper Body · 4/6 ex` | Any session exists for today; most-recent session wins |
| PT | `not logged yet` | `PT — not logged yet` | Zero sessions today (Phase 1 copy retained) |
| Food | `{calsConsumed} / {calsTarget} cal` | `Food — 1420 / 2000 cal` | ≥1 meal entry today AND `caloriesTarget > 0` |
| Food | `{calsConsumed} cal` | `Food — 1420 cal` | ≥1 meal entry today AND `caloriesTarget === 0` (D-16 sentinel) |
| Food | `0 / {calsTarget} cal` | `Food — 0 / 2000 cal` | Zero entries today AND `caloriesTarget > 0` (replaces Phase 1 `0 / target cals`) |
| Food | `—` | `Food — —` | Zero entries AND `caloriesTarget === 0` (degenerate; both un-set) |
| Steps | `{count} / {target}` | `Steps — 6400 / 8000` | Entry exists AND `stepsTarget > 0` |
| Steps | `{count}` | `Steps — 6400` | Entry exists AND `stepsTarget === 0` |
| Steps | `0 / {target}` | `Steps — 0 / 8000` | No entry AND `stepsTarget > 0` |
| Steps | `—` | `Steps — —` | No entry AND `stepsTarget === 0` (Phase 1 copy retained for zero state) |
| Lift | `✓` (colored `--accent`) | `Lift — ✓` | `didLift === true` today |
| Lift | `☐` (colored `--muted`) | `Lift — ☐` | No checkin today OR `didLift === false` (Phase 1 copy retained) |

**Exact numeric formatting:** all numbers are unformatted integers (no thousands separator). "1420" NOT "1,420". Rationale: `tabular-nums` kerning + status-slot space-economy + consistency with Phase 1 Steps placeholder rendering.

**Rounding:** `Math.round()` for totals displayed in the card status slot. Full precision (no rounding) inside the Food Sheet macro totals bar.

### Food Sheet copy (all strings locked)

| Element | Copy |
|---------|------|
| Sheet title | `Log food` |
| Sticky macro bar — cal label | `cal` |
| Sticky macro bar — protein label | `P` |
| Sticky macro bar — carbs label | `C` |
| Sticky macro bar — fat label | `F` |
| Recent section label | `Recent` |
| Recent empty state | `No recent foods yet — search or add below.` |
| Frequent section label | `Frequent` |
| Frequent empty state | (hidden when empty — no row renders) |
| Search input placeholder | `Search your foods` |
| Search empty result row | `Create "{query}"` (leading `+` Lucide `Plus` icon 16px) |
| Today's meals section label | `Today` |
| Today's meals empty state | `No meals logged yet today.` |
| Meal entry row (display) | `{foodName} · {servings}× {servingLabel}` |
| Meal entry row — bucket badge | `breakfast` / `lunch` / `dinner` / `snack` (lowercase, Label role, `--muted`) |
| Meal entry inline-edit — servings label | `Servings` |
| Meal entry inline-edit — bucket label | `Meal` |
| Meal entry inline-edit — Save | `Save` |
| Meal entry inline-edit — Delete | `Delete` (destructive color, text-only, no icon) |
| Meal entry inline-edit — Cancel | `Cancel` (ghost variant) |
| Create-food inline form title | `Add food` |
| Create-food form — Name field label | `Name` |
| Create-food form — Name placeholder | `e.g. Ground beef` |
| Create-food form — Calories label | `Calories` |
| Create-food form — Protein label | `Protein (g)` |
| Create-food form — Carbs label | `Carbs (g)` |
| Create-food form — Fat label | `Fat (g)` |
| Create-food form — Serving label field label | `Serving` |
| Create-food form — Serving placeholder | `e.g. 100 g` |
| Create-food form — Photo button (no photo) | `Add photo` (leading `Camera` icon 16px) |
| Create-food form — Photo button (has photo) | `Change photo` (leading `Camera` icon + small thumbnail 24px) |
| Create-food form — Save button | `Save and log` |
| Create-food form — Cancel button | `Cancel` |
| Sheet close control | `aria-label="Close"` X icon (Lucide `X`, 20px) — top-right of Sheet |

### PT Sheet copy

| Element | Copy |
|---------|------|
| Sheet title (template list mode) | `PT` |
| Template list header label | `Start session` |
| Empty-state body (no templates yet) | `No PT templates yet. Create one to start logging sessions.` |
| Empty-state primary action | `New template` (leading `Plus` icon 16px) |
| Template card — tap intent | entire card is tappable → opens Session sheet |
| Template card — overflow menu trigger | `aria-label="More"` icon button (Lucide `MoreHorizontal`, 20px, `--muted`) |
| Template card overflow — Edit | `Edit template` |
| Template card overflow — Delete | `Delete template` (destructive color) |
| "+ New template" bottom button | `New template` (leading `Plus` icon) |
| Template editor sheet title | `{mode} template` — "New template" / "Edit template" |
| Template editor — Name field label | `Name` |
| Template editor — Name placeholder | `e.g. Upper Body` |
| Template editor — Exercises section label | `Exercises` |
| Template editor — Exercise name field label (per row) | `Name` |
| Template editor — Target sets label | `Sets` |
| Template editor — Target reps label | `Reps` |
| Template editor — Target duration label (optional) | `Duration (sec)` |
| Template editor — Add exercise button | `Add exercise` (leading `Plus` icon) |
| Template editor — Remove exercise (per row) | `aria-label="Remove exercise"` X icon, 16px, `--muted` |
| Template editor — Save button | `Save template` |
| Template editor — Cancel | `Cancel` (ghost variant) |
| Session sheet title | `{Template name}` (e.g. `Upper Body`) |
| Session — Exercise row — actuals input: sets | `Sets` (label above input) |
| Session — Exercise row — actuals input: reps | `Reps` (label above input) |
| Session — Exercise row — actuals input: duration | `Sec` (label above input, compact) |
| Session — Exercise row — completed checkbox label | `Done` (right of checkbox) |
| Session — Previous-session hint (D-12) | `Last: {sets}×{reps} · pain {rating}/5 · {relativeTime}` — e.g. `Last: 3×12 · pain 2/5 · 5 days ago` |
| Session — Previous-session hint, no actuals | `Last: (not completed) · {relativeTime}` |
| Session — Previous-session hint, no prior session | (row hidden; no empty state rendered) |
| Session — Pain rating section label | `Pain` |
| Session — Pain rating scale | `0` / `1` / `2` / `3` / `4` / `5` (6 radio-style buttons in a row, selected = accent-text + border) |
| Session — Notes section label | `Notes` |
| Session — Notes placeholder | `How did it feel?` |
| Session — Save button | `Save session` |

### Steps card (inline, D-02)

| Element | Copy |
|---------|------|
| Card title | `Steps` (Phase 1 copy retained) |
| Tap-to-reveal state | Status slot shows live value per §Today-card populated-status table; tap anywhere on the card status area reveals the inline input in-place |
| Inline input placeholder | `0` |
| Inline input `aria-label` | `Enter step count for today` |
| Save behavior | Blur or Enter commits; `Escape` cancels; no button |

### Lift card (inline, D-02)

| Element | Copy |
|---------|------|
| Card title | `Lift` (Phase 1 copy retained) |
| Tap target | The `☐` / `✓` glyph in the card's status slot is the tap target (44×44 hit area around the 32px glyph via `p-1.5`) |
| `aria-label` (untoggled) | `Mark lifted today` |
| `aria-label` (toggled) | `Undo lifted today` |
| Note affordance | A secondary muted text link labeled `Add note` appears **only after** lift is toggled on (not before — avoids clutter pre-action) |
| Note inline edit | Reveals a single-line text input below the glyph on tap of `Add note`; blur-to-save. No multi-line. |
| Note placeholder | `Optional note` |

### Goals form (Settings)

| Element | Copy |
|---------|------|
| Form section label above the form | `Daily goals` |
| Calories label | `Calories` |
| Protein label | `Protein (g)` |
| Carbs label | `Carbs (g)` |
| Fat label | `Fat (g)` |
| Steps label | `Steps` |
| Helper text (below label) — each field | (none by default; keep form compact) |
| Save button | `Save goals` |
| Save success indication | NONE — per D-04 (no toasts). Button stays enabled; `useLiveQuery` re-renders progress bars on Today. Visual feedback is the bars themselves updating when user navigates back. |
| Validation error — field empty | `Required` |
| Validation error — below zero | `Must be 0 or higher` |
| Validation error — non-integer | `Whole number only` |
| Zero-value behavior (D-16) | Permitted; save succeeds; progress bars on Today render "not set" sentinel format (see Today-card table) |

### Sheet-wide conventions

| Element | Copy |
|---------|------|
| Sheet primary action (bottom-right footer) | Context-specific verb + noun (`Save food`, `Save goals`, `Save session`, `Save template`) |
| Sheet secondary action | `Cancel` (ghost variant) — left of primary, OR omitted if Sheet can be dismissed via close-X and scrim |
| Close (X) control | Top-right of Sheet, `aria-label="Close"`, Lucide `X` 20px, `--muted` color |
| Dismissal side-effects | Close-X + scrim click + `Escape` key all discard unsaved changes silently. No confirm-discard modal. |

### Destructive confirmations (Phase 2)

**NONE — explicit design decision.** Destructive actions in Phase 2 (delete meal entry, delete PT template, delete food library entry) execute immediately without a confirmation modal. Rationale:

1. Per D-04 and the "logging feels like a win" principle, every extra modal adds friction.
2. Phase 2 has no undo primitive. A confirmation modal would half-solve the problem while adding ceremony.
3. Accidental deletion of a single meal entry, template, or food is low-stakes for a solo user (re-enter is fast).
4. Phase 4 JSON export is the safety net for catastrophic loss; per-item confirmation is not the right ergonomic.

If a user expresses regret in real use, revisit by adding an optimistic delete + 5-second snackbar-undo pattern (NOT a confirmation modal). That work is deferred.

### Empty states (Phase 2)

| Surface | Copy (or behavior) |
|---------|---|
| Food Sheet — Recent empty | `No recent foods yet — search or add below.` |
| Food Sheet — Frequent empty | Row hidden entirely |
| Food Sheet — Today's meals empty | `No meals logged yet today.` |
| Food Sheet — Search empty result | Row shows `Create "{query}"` (the action, not an empty-state) |
| PT Sheet — No templates | `No PT templates yet. Create one to start logging sessions.` + `New template` button |
| PT Session — No previous sessions | hint row hidden per row |
| Goals form — Not yet saved | Inputs pre-populated from D-13 seed defaults (2000/180/180/65/8000); form is always "full" |
| Today cards — Zero state | per Today-card populated-status table; no separate empty-state copy |

### Error states (Phase 2)

| Source | Behavior |
|--------|----------|
| Dexie write failure (per-feature) | Silent + `console.error` — matches Phase 1 pattern. No user-facing error toast. Sheet stays open; user can retry. |
| Form validation (Zod) | Per-field inline error message (Label role, destructive color) rendered directly below the affected input. Form Save button stays enabled; clicking with errors re-validates and scrolls to the first error field. |
| Photo save failure | Silent + console; photo input clears; food is created WITHOUT a photo so the save still completes. |

### Primary CTAs in Phase 2

Locked verbs (use exactly these — no synonyms):

1. `Save` — default across forms
2. `Save food`, `Save goals`, `Save session`, `Save template`, `Save and log` — noun-specific when ambiguous
3. `New template` — creation verb for PT templates
4. `Add exercise` — insertion within template editor
5. `Add photo` / `Change photo` — photo affordance
6. `Add note` — lift note reveal
7. `Delete` — destructive, inline row action
8. `Cancel` — universal dismiss without save
9. `Edit template` / `Delete template` — overflow menu verbs

"Update", "Submit", "Confirm", "OK", "Done" are **banned** in Phase 2 UI strings. "Save" is the vocabulary.

---

## Layout & Component Contracts (Phase 2 NEW)

### Sheet (upgraded from Phase 1 stub)

The Phase 1 `src/components/ui/sheet.tsx` stub is OVERWRITTEN by `npx shadcn@latest add sheet` at the start of Phase 2 execution. Phase 1's stub API surface (`Sheet`, `SheetContent`, `SheetTrigger`, `SheetTitle`) is covered by the real shadcn API — no consumer churn is required beyond adding `SheetHeader` / `SheetFooter` / `SheetDescription` / `SheetClose` imports.

| Property | Value |
|----------|-------|
| Direction | `side="bottom"` on all Phase 2 Sheets (bottom Sheet modal per D-01) |
| Backing | `@radix-ui/react-dialog` (installed transitively via shadcn Sheet) |
| Panel background | `--surface` (`#18181b`) |
| Panel border | 1px top `--border`; no left/right borders (edges run to screen edges) |
| Panel top-corner radius | `rounded-t-lg` (12px) |
| Panel max height | `85vh` (`max-h-[85vh]`) |
| Panel padding | `pt-6 px-4 pb-4` — top padding leaves room for the title + close-X; bottom padding sits above safe-area inset |
| Safe-area | `padding-bottom: calc(1rem + env(safe-area-inset-bottom))` on the sheet footer — prevents the primary Save action from being eaten by the home indicator |
| Overlay / scrim | `bg-black/60` — no backdrop blur |
| Open animation | **Disabled.** Phase 2 overrides Radix Dialog defaults: `data-[state=open]:animate-none data-[state=closed]:animate-none` on `SheetContent`. Reason: Phase 1 anti-motion policy. Slide-in feels slow at the 85vh height and violates the "calm, minimal, low-noise" aesthetic. Instant appearance is the contract. |
| Close triggers | Scrim click, Escape key, close-X button (top-right), footer Cancel button. All dismiss identically. |
| Scroll lock | Radix default — body scroll locks when Sheet open |
| Focus management | Radix default — focus moves to first focusable element on open; returns to trigger on close |
| Z-index | Radix default (`z-50`) — above header (`z-40`) and tab bar (`z-40`) |

### Nested Sheet stacking (D-10)

PT template editor opens as a nested Sheet **inside** the PT Sheet. Radix supports this natively (each Dialog root manages its own stack).

| Property | Value |
|----------|-------|
| Parent Sheet (PT list) | stays mounted; scrim remains; focus moves into nested Sheet |
| Nested Sheet scrim | Additional `bg-black/60` overlay above parent — total visual scrim becomes darker (`~0.84`), which is intentional: reinforces modal depth without new color |
| Nested Sheet panel | Identical styling to parent (same `--surface` bg, `rounded-t-lg`) — no "elevated" appearance needed since scrim already signals depth |
| Nested close behavior | Closing nested returns focus + scroll to parent Sheet; parent stays open. Closing parent while nested is open closes nested first, then parent (Radix default). |
| Depth cap | Only ONE level of nesting permitted in Phase 2 (PT template editor inside PT Sheet). No triple-nested Sheets. |

### Sheet internal layout

Generic Sheet composition from top → bottom:

```
┌─────────────────────────────────────┐
│  [X]  Sheet title                   │  pt-6 px-4 — 56px effective header
├─────────────────────────────────────┤
│                                     │
│  sticky sub-header (Food only:      │  Food sheet ONLY
│  macro totals bar)                  │
│                                     │
│  scrollable body content            │
│  ...                                │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  [Cancel]          [Save primary]   │  footer — safe-area-bottom
└─────────────────────────────────────┘
```

Header has close-X left-aligned (inverted from web convention — thumb reaches left on one-handed iPhone use). Title centers between X and right edge.

### Progress bar component (NEW — built inline, no shadcn)

Used 5× on Today screen (cal / protein / carbs / fat / steps) + 4× in Food Sheet sticky macro totals bar.

| Property | Value |
|----------|-------|
| Height | 8px (`h-2`) |
| Track | `bg-white/[0.08]` on `--surface` parent |
| Fill | `bg-accent` |
| Corner radius | `rounded-full` on both track and fill |
| Transition | **None** — fill width change is instant on data update (per anti-motion policy). `useLiveQuery` re-render is near-instant (< 16ms); no animation-to-smooth-the-jump required. |
| Zero-state | Track visible, fill width 0% (no rendering of fill element when 0 / `consumed === 0`) |
| Zero-target state (D-16 sentinel) | Render CONSUMED-ONLY layout: number + unit (e.g. `1420 cal`), NO bar rendered, NO denominator. Contract: if `target === 0`, bar is not in the DOM. |
| Over-target state | Fill clamped to 100% width; numeric status shows actual value (e.g. `2340 / 2000 cal`); no overflow indicator in Phase 2. |
| ARIA | `role="progressbar" aria-valuenow aria-valuemax aria-label="{macroName} progress"` |
| Markup | Two nested divs: outer track + inner fill with `style={{ width: percent }}` |

### Sticky macro totals bar (Food Sheet only)

| Property | Value |
|----------|-------|
| Position | `sticky top-0` inside Sheet's scrollable body |
| Height | 56px |
| Background | `--surface` (opaque — no alpha) |
| Bottom border | 1px `--border` (separates from scrollable content when scrolled) |
| Layout | 4 equal-width columns (flex `flex-1`), one per macro |
| Per-column layout | Number (Heading role, `tabular-nums`) on top, unit label (Label role, `--muted`) below; center-aligned |
| Progress bar | Thin 4px bar (`h-1`) below each column's text, spanning the column's full width. Uses same accent-on-alpha pattern. |
| Horizontal divider | `divide-x divide-border` between columns |
| Zero-target per macro | Show consumed-only number; hide the bar for that column; no denominator |

### Quick-log chip (Food Sheet, NEW component)

Built from plain `<button>`, no shadcn.

| Property | Value |
|----------|-------|
| Element | `<button type="button">` |
| Height | 40px (`h-10`) |
| Horizontal padding | 12px (`px-3`) |
| Background | `--surface` |
| Border | 1px `--border`, `rounded-full` |
| Label | Body role (14/400/`--text`) |
| Icon (optional leading, when chip represents a food with photo) | 20px thumbnail avatar, `rounded-full`, `mr-2` |
| Resting state | as above |
| Pressed state | `active:bg-border/40` (native press feedback only — no transition) |
| Hover state | `hover:bg-border/40` (desktop-only; phone primary) |
| Focus state | Phase 1 `focus-visible:ring-2 focus-visible:ring-accent` |
| Disabled state | Not used in Phase 2 |
| Max width | none — chips flow in horizontal scrolling row |
| `aria-label` | `Log {foodName}` when chip's label is the food name; expands on screen readers |
| Touch target | Chip height 40px + parent row `py-1` (4px above, 4px below) = 48px vertical. Horizontal ≥ 44px guaranteed by min-width-content + px-3. |

### Quick-log chip row (horizontal scroll)

| Property | Value |
|----------|-------|
| Layout | `flex overflow-x-auto gap-2 px-4 py-1` |
| Scroll | Horizontal. No scroll-snap. No scroll indicator dots. |
| Mask | Soft fade at right edge (`mask-image`) — signals overflow without a visible scrollbar. Implementation: `[mask-image:linear-gradient(to_right,black_90%,transparent)]` Tailwind arbitrary. Optional for Phase 2; executor may omit if it complicates rendering — skipping it is acceptable. |
| Empty row | Not rendered; a muted empty-state string is rendered in its place (see Copywriting Contract) |

### Inline-edit meal row (Today's meals list, Food Sheet)

| Property | Value |
|----------|-------|
| Resting row layout | `flex items-center justify-between py-3 px-0` inside a `<ul>` with `divide-y divide-border` |
| Resting row content | `{foodName} · {servings}× {servingLabel}` (left) + bucket badge (right, Label role, `--muted`, lowercase) |
| Tap target | Whole row is tappable → toggles inline-edit mode |
| Edit mode layout | Row expands to show `Servings` number input (`w-20`), `Meal` select (4-option segmented control), and footer buttons: `Delete` (destructive, ghost variant) · `Cancel` (ghost) · `Save` (default) |
| Edit-mode height | `auto` (grows to ~96px with inputs) |
| Save behavior | Commits via `meals.svc.ts`; row collapses back to resting state |
| Cancel behavior | Row collapses without commit |
| Delete behavior | Row immediately removed from DOM; `meals.svc.ts` delete runs in background |
| Keyboard | `Escape` collapses without save; `Enter` in servings input commits |

### PT exercise row (Session sheet)

| Property | Value |
|----------|-------|
| Layout | Vertical stack per exercise with 16px spacing |
| Row 1 (header) | Exercise name (Body-semibold 14/600/`--text`) left · Target display (`Target: 3×15`, Label role, `--muted`) right |
| Row 2 (previous-session hint, D-12) | Muted one-liner (Label role, `--muted`) — hidden if no prior session |
| Row 3 (actuals inputs) | Three number inputs in a horizontal row: `Sets` / `Reps` / `Sec` (all 64px wide, labels above inputs, `inputmode="numeric"`). `Sec` hidden if template has no `targetDurationSecs`. |
| Row 4 (completed checkbox) | Left-aligned checkbox glyph (`☐` → `✓`) + `Done` label right of glyph. Native `<input type="checkbox">` styled to match (accent fill on checked via `accent-color: var(--accent)`). |
| Row separator | 1px `--border` bottom divider between exercises (not below the last exercise). |

### Pain rating (Session sheet footer)

| Property | Value |
|----------|-------|
| Layout | Horizontal row of 6 pill-buttons (`0` through `5`) |
| Pill dimensions | 40×40 (`h-10 w-10`), `rounded-full`, `border border-border bg-surface text-text` |
| Selected state | Border → `--accent`, text → `--accent`, no background change. Instant on tap. |
| Spacing | `gap-2` between pills |
| Label | `Pain` Label role above the row |
| Group role | `role="radiogroup" aria-label="Pain rating"` |
| Per-pill role | `role="radio" aria-checked aria-label="{n}"` |
| Unselected behavior | Nothing pre-selected; omit-able — if user leaves blank, `painRating` saves as `null` / omitted |

### Goals form (Settings)

| Property | Value |
|----------|-------|
| Container | `<Card>` wrapping the form; title `Daily goals` (Heading role) at top; 16px padding |
| Placement in Settings | Below the Install card (Phase 1), above the version line |
| Form framework | React Hook Form + Zod, single schema covering all 5 fields |
| Fields | `Calories` / `Protein (g)` / `Carbs (g)` / `Fat (g)` / `Steps` — stacked vertically, label above input, `space-y-4` between fields |
| Input type | `type="number" inputmode="numeric"` on all 5 |
| Input styling | 44px height, 12px horizontal padding, `bg-bg border border-border rounded-md text-text` (input bg is `--bg` — darker than Card surface — for contrast inside the Card) |
| Focus state | Phase 1 focus-visible-ring pattern (2px accent ring, offset on `--bg`) |
| Error state | Input border stays `--border` (not red); error message (destructive color, Label role) rendered directly below |
| Save button | Full-width below the last field; `<Button variant="default">Save goals</Button>` |
| Save success | No toast, no success checkmark, no spinner — button stays enabled; progress bars on Today re-render via `useLiveQuery` when user navigates back |
| Zero-value semantics (D-16) | Permitted values: `0` to MAX_SAFE_INTEGER; Zod rejects negatives and non-integers |

### Today-card status slot (live layout)

Phase 1 locked the card frame (`flex items-baseline justify-between`, Heading title left, Body status right). Phase 2 ADDS: below the status line, a full-width progress bar (per §Progress bar) when the card represents a numeric-target domain (Food, Steps). Height impact on card: +16px when bar rendered (+8px bar + +8px gap).

| Card | Status slot layout |
|------|---|
| PT | Heading left + status-string right only. NO progress bar. (PT-02..07 isn't a numeric target.) |
| Food | Heading left + `{consumed} / {target} cal` string right + 4 progress bars below the entire card (one per macro, stacked `space-y-2`, each with a 12px leading label: `Cal` / `P` / `C` / `F`). |
| Steps | Heading left + `{consumed} / {target}` string right + 1 progress bar below (no leading label). |
| Lift | Heading left + `☐`/`✓` glyph right only. NO progress bar. |

**Exception for Food card:** the 4-bar stack under the Food card is a Phase 2 addition to Phase 1's single-card layout. It adds ~40px to Food card height (4 bars × 8px + 3 gaps × 8px + padding). This is the ONLY Phase 1 frame deviation — Phase 2's contribution to the Today layout that wasn't present in Phase 1 copy.

### Photo capture affordance (Food create form)

| Property | Value |
|----------|-------|
| Input element | `<input type="file" accept="image/*" capture="environment">` (D-07) |
| Trigger | `<Button variant="outline">Add photo</Button>` with Lucide `Camera` icon 16px leading |
| Post-capture UI | Button text swaps to `Change photo`; button shows 24px thumbnail in leading position |
| Removal | No explicit "remove photo" affordance in Phase 2 — user re-taps Change photo and picks a different image. Cancel on the form discards the selection. |
| Storage path | `savePhoto()` from Phase 1 `photoStore.ts` — WebP@80%, 800×800, OPFS |
| Rendering in picker chips / meal rows | For v1 Phase 2, photo thumbnails DO render in chip leading slot (20px) and in inline-edit-row leading slot when food has `photoKey`. Object URL lifecycle: create on component mount, revoke on unmount. |

---

## Interaction & Motion

**Inherits Phase 1 anti-motion policy verbatim.** No animations on route changes, no fade-ins, no banner slide-ins, no ripple, no press-down animation beyond native platform default.

### Phase 2 specific motion bans (explicit, additive)

| Interaction | Motion contract |
|---|---|
| Sheet open | **Instant.** Override Radix Dialog default slide. (Explicit `data-[state=open]:animate-none` on `SheetContent`.) |
| Sheet close | **Instant.** Override Radix default. |
| Scrim fade | **Instant** — scrim appears on mount, disappears on unmount. No opacity transition. |
| Inline-edit meal row expand | **Instant.** No height transition. |
| PT exercise checkbox `☐ → ✓` | **Instant color swap.** No cross-fade. |
| Lift `☐ → ✓` glyph toggle | **Instant color swap.** No cross-fade. |
| Progress bar fill update | **Instant width set** — no `transition: width` CSS. |
| Chip press / hover | Native `:active:bg-border/40` / `:hover:bg-border/40` — no explicit transition duration. |
| Sheet primary button press | Native; no shadcn `transition-colors` override from Phase 1 Button. (Phase 1 Button already has `transition-colors` baked in — we KEEP that for color tokens only; it's imperceptibly short.) |
| Form field focus | Native browser focus ring behavior + Phase 1 `focus-visible:ring-2` — instant, no transition. |
| Sticky macro bar on scroll | No shadow-on-scroll transition, no sticky "appear" animation. Just a static 1px bottom border when scrolled past (browser handles sticky natively). |

### Reduced-motion

Still N/A per Phase 1 reasoning (no animations means no reduced-motion media query needed). Phase 3 will add it for DayCell.

### Tap feedback

Native only. No custom ripples. No custom press-down shadows. The Phase 1 convention extends.

---

## Accessibility

**Inherits Phase 1 UI-SPEC §Accessibility verbatim.** Touch targets ≥ 44×44, AA contrast (most pairs AAA), focus-visible rings, aria-labels on icon-only controls, landmark roles, `aria-current` on active tab.

### Phase 2 NEW accessibility contracts

| Surface | Requirement | How it's met |
|---|---|---|
| Sheet | `role="dialog" aria-modal="true"` | Radix Dialog provides by default |
| Sheet title | `aria-labelledby` pointing to SheetTitle element | Radix provides when using `<SheetTitle>` |
| Sheet close X | `aria-label="Close"` | Explicit on the close button |
| Progress bar | `role="progressbar" aria-valuenow aria-valuemin={0} aria-valuemax={target} aria-label="{macroName} progress"` | On every rendered progress bar |
| Quick-log chip | `aria-label="Log {foodName}"` | Explicit on each chip button |
| PT exercise checkbox | Native `<input type="checkbox">` with associated `<label>Done</label>` | Native semantics |
| Pain rating pills | `role="radiogroup" aria-label="Pain rating"` on container; `role="radio" aria-checked` on each pill | Explicit |
| Form fields | Native `<label htmlFor>` + `<input id>` association | React Hook Form register handles `id` |
| Form field errors | `aria-invalid="true"` on errored input + `aria-describedby` to error message | RHF integration |
| Lift toggle | `aria-label="Mark lifted today"` / `aria-label="Undo lifted today"` (dynamic) + `aria-pressed={didLift}` | Explicit |
| Steps inline input | `aria-label="Enter step count for today"` when no visible label | Explicit |
| Number inputs in PT session | Associated `<label>` above each (`Sets` / `Reps` / `Sec`) | Native |
| Sheet focus management | First focusable element focused on open; trigger focused on close | Radix default |
| Body scroll lock when Sheet open | Background content cannot be scrolled | Radix default |

### Contrast re-check (Phase 2 surfaces)

All Phase 2 color pairs inherit Phase 1's ≥ 7:1 baseline. Destructive `#ef4444` on `--surface` = 4.6:1 (AA exactly for Body text). Acceptable only as an inline error label; not elevated to bulk body usage.

---

## Responsive Scope

**Inherits Phase 1 UI-SPEC §Responsive Scope verbatim.** iPhone-first, `max-w-md` content column, no desktop redesign.

### Phase 2 iPhone-first notes

- Sheet occupies full screen width (not `max-w-md`) — on tablet+ it remains full-width bottom Sheet, NOT centered, NOT capped to `max-w-md`. Rationale: bottom Sheet is a full-width modal by convention; letter-boxing on tablet would look broken.
- Sheet internal content STILL uses `max-w-md mx-auto` for readable line length on tablet. Scrim and panel remain full-width.
- Form fields inside Goals form are full-width of their parent (Card inside Settings column, which is already `max-w-md`).
- Quick-log chip row ALWAYS scrolls horizontally regardless of width (intentional consistency between phone and tablet).

---

## Component Inventory (Phase 2)

For the planner/executor to wire up shadcn installs, imports, and new components.

### shadcn re-install / upgrades

| Component | Action | Rationale |
|---|---|---|
| `<Sheet>` + family | **Upgrade from Phase 1 stub.** Run `npx shadcn@latest add sheet` — overwrites `src/components/ui/sheet.tsx`. | First consumer in Phase 2; Phase 1 deferred the Radix wire-up. |

### Phase 1 components REUSED as-is

| Component | Phase 2 usage |
|---|---|
| `<Button>` | Sheet footer primary/cancel actions, Goals form Save, chip-styled `Add exercise`, PT "+ New template" |
| `<Card>` | Goals form wrapper, Today-card frames (unchanged from Phase 1) |
| `<AppShell>` | Unchanged |
| `<TabBar>` | Unchanged |
| `<Banner>` | Unchanged (Install + Eviction still render) |
| Lucide icons — `Home`, `CalendarDays`, `Settings`, `X`, `AlertTriangle` | All unchanged from Phase 1 list |

### Phase 2 NEW Lucide icons

| Icon | Usage |
|---|---|
| `Plus` | `New template`, `Add exercise`, `Create "{query}"` inline row |
| `Camera` | `Add photo` / `Change photo` button |
| `MoreHorizontal` | PT template card overflow menu trigger |
| `X` | Sheet close (already in Phase 1 list; re-declared for completeness) |

### Phase 2 NEW custom components (feature-owned)

| Component | Source | Used for |
|---|---|---|
| `<ProgressBar value={} max={} label={} />` | Custom (`src/components/ProgressBar.tsx`) | 5 progress-bar sites on Today + 4 sites in Food Sheet macro bar (9 total instances) |
| `<QuickLogChip food onLog />` | Custom (`src/features/food/QuickLogChip.tsx`) | Recent + Frequent chip rows in Food Sheet |
| `<MacroTotalsBar dayKey />` | Custom (`src/features/food/MacroTotalsBar.tsx`) | Sticky top bar inside Food Sheet |
| `<FoodPicker />` / `<FoodCreateForm />` | Custom (`src/features/food/`) | Sheet internals for Food flow |
| `<TodayMealList dayKey />` | Custom (`src/features/food/TodayMealList.tsx`) | Inline-edit meal row list |
| `<PTTemplateList />` / `<PTTemplateEditor />` / `<PTSessionForm templateId />` | Custom (`src/features/pt/`) | PT Sheet internals |
| `<PainRating value onChange />` | Custom (`src/features/pt/PainRating.tsx`) | 0-5 pill row inside PT Session sheet |
| `<LiftToggle dayKey />` | Custom (`src/features/lifts/LiftToggle.tsx`) | Inline card-embedded toggle |
| `<StepsInlineInput dayKey />` | Custom (`src/features/steps/StepsInlineInput.tsx`) | Inline card-embedded number input |
| `<GoalsForm />` | Custom (`src/features/settings/GoalsForm.tsx`) | Settings form; RHF+Zod |

No third-party shadcn registries are used in Phase 2.

---

## Form Validation Patterns

Phase 2 introduces forms; the validation contract is locked here.

### Stack

- React Hook Form (`react-hook-form`) — form state + field registration
- Zod (`zod`) — schema declaration
- `@hookform/resolvers/zod` — RHF-to-Zod bridge

### Schema conventions

| Form | Schema |
|---|---|
| Goals form | 5 fields, each `z.number().int().min(0)` (per D-15 + D-16 allowing zero) |
| Food create form | `name: z.string().min(1)`, 4 macros `z.number().min(0)`, `servingLabel: z.string().min(1)`, `photoKey: z.string().optional()` |
| PT template editor | `name: z.string().min(1)`, `exercises: z.array(...).min(1)`; each exercise: `name: z.string().min(1)`, `targetSets: z.number().int().min(0)`, `targetReps: z.number().int().min(0)`, `targetDurationSecs: z.number().int().min(0).optional()` |
| PT session form | No schema — all fields optional; on Save, whatever the user filled in is persisted (D-11 explicit). Pain rating optional, notes optional, per-row actuals optional, per-row `completed` boolean defaults to `false`. |
| Meal entry inline-edit | `servings: z.number().positive()`, `bucket: z.enum(['breakfast','lunch','dinner','snack'])` |

### Error display

- Inline, directly below the affected input
- Label role (12/400), destructive color `#ef4444`
- Single message per field at a time (Zod first-error)
- Form Save button stays **enabled** with errors; clicking triggers re-validation + scroll-to-first-error
- No "form-level" error summary banner

### Validation timing

- On Save button click (onSubmit) — primary trigger
- On blur for individual fields in Goals form and Food create form — secondary (surfaces errors before Save)
- Never validate on every keystroke (feels punishing)

---

## Loading States

Phase 2 has live-data rendering via `useLiveQuery`. Loading states are **silent by contract**: IndexedDB reads on a local device are sub-16ms; a spinner would flash + disappear before the eye registers.

| Surface | Loading contract |
|---|---|
| Today cards — initial data load | Render the zero-state copy (`not logged yet`, `0 / 2000 cal`, `—`, `☐`) while `useLiveQuery` is `undefined`. When data arrives, status slot swaps in-place. No spinner. |
| Food Sheet — open → first render | Sheet appears instantly with empty Recent/Frequent/Today rows. As queries resolve (same tick or next microtask), rows populate. No skeleton. |
| Photo save during food create | No spinner on the Save button. If save succeeds: Sheet closes. If save takes >500ms: the user sees the Sheet remain open — acceptable. No progress indicator. |
| PT previous-session hint | Starts empty (no row); when query resolves, hint row renders. |
| Goals form — initial field pre-population | Form inputs start with the seeded `D-13` defaults read synchronously from a cached goals singleton. No loading state. |

**No skeleton components ship in Phase 2.** No spinner components. No `<Loading />` primitive. If the planner or executor wants to add one "just in case," reject it.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | `sheet` (upgrades Phase 1 stub), reuses `button`, `card` from Phase 1 | not required — first-party |
| (none — no third-party registries declared) | — | — |

**Third-party registry count: 0.** Safety vetting gate not triggered. Phase 2 does not introduce any non-shadcn-official registry. All custom components (ProgressBar, QuickLogChip, MacroTotalsBar, LiftToggle, StepsInlineInput, GoalsForm, PainRating, etc.) are built in-repo from Tailwind utilities on Phase 1 primitives.

---

## Traceability: UI contract → Phase 2 CONTEXT.md decisions

| UI contract | Source D-code |
|---|---|
| Sheet upgrade from Phase 1 stub to Radix Dialog-backed | D-01 |
| Sheet `side="bottom"` + single Sheet + 85vh max-height | D-01 |
| Lift inline `☐↔✓` glyph + Steps inline number input | D-02 |
| PT Sheet: templates list → session OR nested template editor | D-03, D-10 |
| Sheet closes immediately on save; no toasts; no success modal | D-04 |
| Food Sheet layout order: macro totals [sticky] → Recent → Frequent → search → today | D-05 |
| Inline "Create '[query]'" search empty state | D-06 |
| Photo capture via `<input capture="environment">` → `photoStore.savePhoto` | D-07 |
| Recent = last 10 deduped; Frequent = top 8 in 30d; bucket auto-infer | D-08 |
| PT template editor inline; exercises embedded in template record | D-09 |
| PT exercise row with independent actuals + `completed` checkbox | D-11 |
| PT previous-session hint as muted one-liner under each row | D-12 |
| Goals form below Install card; RHF+Zod; one form, one Save | D-15 |
| Zero-target sentinel → consumed-only, no denominator, no bar | D-16 |
| Today-card status copy patterns (`title — status`) | D-04 + CONTEXT §"Claude's Discretion" |
| Anti-motion on Sheet open/close | CONTEXT §"Claude's Discretion" (resolved: disabled) |
| Nested Sheet stacking uses Radix native depth | D-10 + CONTEXT §"Claude's Discretion" |
| Progress bar geometry (8px, accent on `white/0.08`, no `--accent-25` leak) | CONTEXT §"Claude's Discretion" (Phase 3 preserves alpha ramp) |
| Chip visual spec (40px, `--border` border, 14/400 label) | CONTEXT §"Claude's Discretion" |
| No destructive confirmation modals; silent delete | CONTEXT §"Anti-patterns to call out" + D-04 |
| No loading spinners for local IDB | CONTEXT §"Anti-patterns to call out" |

## Traceability: UI contract → Phase 1 UI-SPEC inheritance

| Phase 1 section | How Phase 2 inherits |
|---|---|
| Design System (shadcn zinc, new-york, Lucide, system font) | Inherited; no change to `components.json` |
| Spacing Scale (4/8/16/24/32/48/64 + 44-touch) | Inherited verbatim; Phase 2 adds fixed dimensions only |
| Typography (Display/Heading/Body/Label, 400+600) | Inherited; Phase 2 adds one Body-semibold exception for PT exercise names |
| Color (zinc dark + accent) | Inherited verbatim; Phase 2 adds destructive `#ef4444` and names new accent-reserved-for sites |
| DayCell alpha-ramp tokens (`--accent-25/50/75/100`) | Declared but still NOT consumed in Phase 2 — reserved for Phase 3 DayCell exclusively |
| Anti-motion policy | Inherited verbatim; Phase 2 explicitly extends it to override Radix Sheet slide animation |
| Accessibility baselines | Inherited; Phase 2 adds Sheet/form/progress-bar ARIA contracts |
| Responsive Scope (iPhone-first, `max-w-md`) | Inherited; Phase 2 notes Sheet is full-width exception |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
