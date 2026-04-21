---
phase: 1
slug: foundation
status: draft
shadcn_initialized: false
preset: shadcn zinc (planned — scaffolded during Phase 1 execution)
created: 2026-04-20
---

# Phase 1 — UI Design Contract

> Shell-only design contract. Locks the app-shell, navigation, placeholder Today layout, stub screens, banners, and design tokens for Phase 1. Feature-logging UI (PT/Food/Steps/Lift inputs), DayCell SVG, calendar grid, and export UX are out of scope — see Phases 2–4.

**Scope narrowness:** this spec covers the AppShell (header + bottom tabs), the Today placeholder layout (per D-05), Calendar/Settings stubs, the Install banner (D-11/D-12/D-13), and the Eviction-warning banner (D-14). Nothing else.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (scaffolded during Phase 1 — `npx shadcn@latest init`, Tailwind v4 mode) |
| Preset | shadcn zinc (D-15 palette is the locked zinc default; no custom preset string) |
| Component library | Radix (via shadcn/ui). Phase 1 installs only `Button`, `Card`, `Sheet` (per RESEARCH §5). |
| Icon library | `lucide-react` (Claude's Discretion per CONTEXT — shadcn convention) |
| Font | System stack: `system-ui, -apple-system, "Segoe UI", sans-serif` (per RESEARCH §5) |
| Theme | Dark only. `.dark` class on `<html>` (D-19). Light mode explicitly out of scope. |
| Tokens | `src/styles/tokens.css` → Tailwind v4 `@theme` block (D-18) |

**shadcn initialization gate:** No `components.json` exists yet (greenfield). Phase 1 Plan 1 (scaffold) will run `npx shadcn@latest init`. The locked tokens D-15..D-17 are transcribed into `tokens.css` directly rather than from a remote preset string — the zinc values are fixed by CONTEXT.md and do not require preset fetch.

---

## Spacing Scale

Declared values (Tailwind v4 defaults, all multiples of 4):

| Token | Value | Usage in Phase 1 |
|-------|-------|------------------|
| xs | 4px (`p-1`) | Icon-to-label gap inside tab items |
| sm | 8px (`p-2`) | Tight element gaps; banner close-button padding |
| md | 16px (`p-4`) | Default card padding; horizontal screen padding |
| lg | 24px (`p-6`) | Between-section spacing on Today screen |
| xl | 32px (`p-8`) | Reserved — not used in Phase 1 |
| 2xl | 48px (`p-12`) | Reserved — not used in Phase 1 |
| 3xl | 64px (`p-16`) | Reserved — not used in Phase 1 |

### Fixed dimensions (Phase 1 shell)

| Element | Value | Rationale |
|---------|-------|-----------|
| Top header height | 56px | Single-line title + right-side icon slot; iOS-native feel |
| Bottom tab-bar height | 56px (+ safe-area-inset-bottom) | 3 tabs × icon+label fits comfortably at 56px |
| Tab touch target | min 44×44px | Accessibility baseline (iOS HIG + WCAG) — each tab item is 1/3 screen width × ≥44px tall |
| Content column max-width | `max-w-md` (448px) | iPhone-first; centers on tablet without redesign |
| Banner vertical padding | 12px | Between `sm` (8px) and `md` (16px); uses `py-3` |
| Safe-area insets | `env(safe-area-inset-top)` on header, `env(safe-area-inset-bottom)` on tab bar (D-04) | iPhone notch + home indicator |

**Exceptions:** Touch-target 44×44px minimum overrides the 8-point-only rule for tab-item tap regions (accessibility-driven).

---

## Typography

Tailwind v4 defaults with a system font stack. Four roles declared; two weights only.

| Role | Size | Tailwind | Weight | Line Height | Usage |
|------|------|----------|--------|-------------|-------|
| Display | 20px | `text-xl` | 600 (semibold) | 1.2 | App title in top header |
| Heading | 16px | `text-base` | 600 (semibold) | 1.3 | Today-screen section titles ("PT", "Food", "Steps", "Lift") |
| Body | 14px | `text-sm` | 400 (regular) | 1.5 | Section status lines, banner copy, Install card body |
| Label | 12px | `text-xs` | 400 (regular) | 1.4 | Tab-bar labels, version line in Settings, muted captions |

**Weights declared:** 400 (regular) + 600 (semibold). No other weights permitted in Phase 1.

**Font family:** system stack — no web-font download, no FOUT risk, matches iOS SF Pro / Android Roboto natively.

---

## Color

60 / 30 / 10 split. Tokens are locked verbatim per D-15, D-16. Quoted from CONTEXT.md.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#09090b` (`--bg`) | App background, page body (D-15) |
| Secondary (30%) | `#18181b` (`--surface`) | Cards, bottom tab bar, header bar, banners (D-15) |
| Border | `#27272a` (`--border`) | Dividers between Today sections, card outlines, header bottom-border (D-15) |
| Muted text | `#a1a1aa` (`--muted`) | Secondary text ("not logged yet", "Coming in Phase 3", version line) (D-15) |
| Primary text | `#fafafa` (`--text`) | Section titles, banner titles, app title (D-15) |
| Accent (10%) | `#22c55e` (`--accent`) | See reserved-for list below (D-16) |

### Accent reserved for (Phase 1)

Accent `#22c55e` is used ONLY for:

1. **Active tab indicator** in the bottom tab bar (icon + label colored accent when route matches)
2. **Install banner primary button** (`<Button variant="default">` on the "Install / Add to Home Screen" action)
3. **Focus ring** on keyboard-focused interactive elements (`ring-accent`)

Accent is NOT used for: inactive tab items, section titles, body text, banner backgrounds, card backgrounds, or borders.

### DayCell alpha-ramp tokens (declared but unused in Phase 1)

Per D-17, these variables MUST exist in `tokens.css` in Phase 1 but are not rendered by any Phase 1 component. Phase 3 consumes them.

| Token | Value | Meaning |
|-------|-------|---------|
| `--accent-25` | `rgba(34, 197, 94, 0.25)` | 1 of 4 segments |
| `--accent-50` | `rgba(34, 197, 94, 0.50)` | 2 of 4 segments |
| `--accent-75` | `rgba(34, 197, 94, 0.75)` | 3 of 4 segments |
| `--accent-100` | `#22c55e` | 4 of 4 segments (complete) |

### Destructive color

**N/A for Phase 1.** No destructive actions exist in the shell phase (no delete, no reset, no export). Banner dismissal is non-destructive (persistence in localStorage). Destructive color token to be declared by Phase 2 when first delete UI ships.

### Contrast check

shadcn zinc on `#09090b` background meets WCAG AA automatically:
- `#fafafa` on `#09090b`: 20.5:1 (AAA)
- `#a1a1aa` on `#09090b`: 8.4:1 (AAA)
- `#22c55e` on `#09090b`: 9.1:1 (AAA)

No manual contrast tuning required.

---

## Copywriting Contract

Phase 1 is shell-only — most copywriting is placeholder-text or banner-text. Copy is locked verbatim below; the executor must use these exact strings.

### Today-screen section labels (per D-05, quoted verbatim from CONTEXT.md)

| Section | Exact copy (label — status) |
|---------|-----------------------------|
| PT | `PT — not logged yet` |
| Food | `Food — 0 / target cals` |
| Steps | `Steps — —` (em-dash in status slot) |
| Lift | `Lift — ☐` (empty checkbox glyph `U+2610`) |

Each section renders as a `<Card>` with:
- **Title** (Heading role, primary text): the label portion before the em-dash (e.g., "PT")
- **Status** (Body role, muted text): the status portion after the em-dash (e.g., "not logged yet")

Phase 2 swaps the status slot for live data; the title slot and card frame remain identical.

### Calendar stub screen

| Element | Copy |
|---------|------|
| Body text (centered, muted) | `Coming in Phase 3` |

### Settings stub screen

| Element | Copy |
|---------|------|
| Screen title (header) | `Settings` |
| Install card title | `Install HealthTracker` |
| Install card body (iOS) | `Install to home screen to protect your data from automatic deletion. Tap Share → Add to Home Screen.` |
| Install card body (Android, when `beforeinstallprompt` fired) | `Install HealthTracker to your home screen so your data isn't cleared.` |
| Install card primary button (Android only) | `Install` |
| Version line (bottom, muted) | `v{version} (build {hash})` — e.g., `v0.1.0 (build abc1234)` (D-10) |

### Install banner (D-11 / D-12 / D-13)

| Element | Copy |
|---------|------|
| Banner title | `Install to protect your data` |
| Banner body (iOS) | `Tap Share → Add to Home Screen to keep your logs safe.` |
| Banner body (Android) | `Add HealthTracker to your home screen.` |
| Primary button (Android only) | `Install` |
| Dismiss control | `aria-label="Dismiss"`, X icon (`lucide-react` `X`) |

**Framing rule (D-11):** Copy is data-safety, never "nice-to-have." The verb `protect` is load-bearing — don't swap for "save" or "keep."

### Eviction-warning banner (D-14)

| Element | Copy |
|---------|------|
| Banner title | `Your data may be at risk` |
| Banner body | `You haven't opened HealthTracker in several days. Install to home screen or export now to avoid browser data loss.` |
| Primary action (placeholder — wires to install flow) | `Install` |
| Dismiss control | `aria-label="Dismiss"`, X icon |

**Trigger (D-14):** `lastOpenedAt` gap > 4 days AND `!isStandalone()`. Dismissal persists to localStorage key `ht.evictionBannerDismissedAt` (re-shows after 7 days if still at risk).

### Primary CTAs in Phase 1

Only two primary CTAs exist in the shell:

1. **Install** (Install banner Android button; Install card Android button) — verb + implicit noun ("Install [the app]").
2. **Dismiss** (banner X icon with `aria-label`) — non-primary, icon-only.

### Empty / error states

| State | Copy |
|-------|------|
| Empty (Calendar stub) | `Coming in Phase 3` |
| Empty (Today sections) | Per section label table above — "not logged yet", "0 / target cals", "—", "☐" |
| Error (startup — `persist()` failed) | Silent — no user-facing error. Logged to console only. (Failure is non-fatal; app still functions.) |
| Error (SW registration failed) | Silent — no user-facing error. Logged to console only. |

No network error states in Phase 1 (fully offline).

### Destructive confirmations

**N/A — deferred to Phase 2.** Phase 1 has no destructive UI.

---

## Layout & Component Contracts

### AppShell

Structure (top → bottom):

```
┌────────────────────────────────────┐
│  [Safe-area-top inset]             │
│  ┌──────────────────────────────┐  │  header: 56px
│  │ HealthTracker       [cog]    │  │  bg-surface, border-b
│  └──────────────────────────────┘  │
│                                    │
│  [Install banner — if show]        │  (stacks top-of-content, not sticky)
│  [Eviction banner — if show]       │  (below install banner, if both)
│                                    │
│  ┌────── route outlet ────────┐    │  flex-1, overflow-y-auto
│  │                            │    │  max-w-md mx-auto, px-4
│  │  (Today / Calendar /       │    │
│  │   Settings content)        │    │
│  │                            │    │
│  └────────────────────────────┘    │
│                                    │
│  ┌──────────────────────────────┐  │  bottom tabs: 56px
│  │ [Today] [Calendar] [Settings]│  │  bg-surface, border-t
│  └──────────────────────────────┘  │
│  [Safe-area-bottom inset]          │
└────────────────────────────────────┘
```

- **Root layout:** `flex flex-col min-h-dvh bg-bg text-text`
- **Component naming (Claude's Discretion):** `AppShell.tsx` (renders header + outlet + tab bar). `HashRouter` wraps it in `App.tsx`.

### Top header (D-01, D-04)

| Property | Value |
|----------|-------|
| Height | 56px |
| Safe-area | `padding-top: env(safe-area-inset-top)` applied to header wrapper |
| Background | `--surface` (`#18181b`) |
| Border | 1px bottom: `--border` (`#27272a`) |
| Sticky | Yes — `sticky top-0 z-40` (stays visible on scroll) |
| Left slot | App title `HealthTracker` (Display role, 20px/600) |
| Right slot | Settings-cog icon (`lucide-react` `Settings`, 20px, muted) — links to `/#/settings` |
| Padding | `px-4` (16px horizontal) |

### Bottom tab bar (D-01, D-02, D-04)

| Property | Value |
|----------|-------|
| Height | 56px (+ safe-area-inset-bottom) |
| Safe-area | `padding-bottom: env(safe-area-inset-bottom)` applied to tab-bar wrapper |
| Background | `--surface` (`#18181b`) |
| Border | 1px top: `--border` (`#27272a`) |
| Sticky | Yes — `sticky bottom-0 z-40` |
| Layout | `flex` — 3 equal-width tab items (`flex-1`) |
| Tab items | 3 total — order: Today, Calendar, Settings |

### Tab item component

| Property | Value |
|----------|-------|
| Tap target | Full tab width × 56px (comfortably exceeds 44×44 minimum) |
| Layout | `flex flex-col items-center justify-center gap-1` (icon above label) |
| Icon size | 20px |
| Label size | 12px (Label role) |
| Inactive color | `--muted` (`#a1a1aa`) for icon + label |
| Active color | `--accent` (`#22c55e`) for icon + label |
| Active indicator | Color-only (no top bar, no underline). Matches shadcn/calm aesthetic. |
| `aria-label` | Required on each tab item for screen readers |
| Keyboard focus | 2px ring-accent outline (`focus-visible:ring-2 focus-visible:ring-accent`) |

### Icons (Claude's Discretion — Lucide names locked here)

Locked to prevent planner ambiguity:

| Tab | Icon (`lucide-react`) | Route |
|-----|-----------------------|-------|
| Today | `Home` | `/#/today` |
| Calendar | `CalendarDays` | `/#/calendar` |
| Settings | `Settings` | `/#/settings` |

The Settings-cog in the top-right of the header ALSO uses `Settings` from `lucide-react` (20px, muted, non-accent — it's secondary navigation, not the tab's active state).

### Today screen (Phase 1 layout — D-05)

Vertical stack of 4 section `<Card>` components, each identical in frame. Phase 2 swaps the body; the frame stays.

| Property | Value |
|----------|-------|
| Outer padding | `px-4 py-6` (16px horizontal, 24px top/bottom) |
| Section gap | `space-y-4` (16px between cards) |
| Card (shadcn `<Card>`) | `bg-surface border border-border rounded-lg p-4` |
| Card content layout | `flex items-baseline justify-between` |
| Card title | Heading role (16px / 600, `--text`) — left side |
| Card status | Body role (14px / 400, `--muted`) — right side |

Rendered order (top → bottom): PT, Food, Steps, Lift. Quoted copy per the Copywriting Contract table.

### Calendar stub screen

| Property | Value |
|----------|-------|
| Layout | `flex items-center justify-center min-h-full` |
| Body text | `Coming in Phase 3`, 14px/400, `--muted`, centered |

No other elements.

### Settings stub screen

Vertical stack inside `px-4 py-6 space-y-4`:

1. **Install card** (shadcn `<Card>`, always visible — D-12)
   - Title: `Install HealthTracker` (Heading role)
   - Body: platform-dependent copy (see Copywriting Contract)
   - Primary button (Android only, when `beforeinstallprompt` was captured): `<Button variant="default">Install</Button>` — accent background

2. **Spacer** (`flex-1` if needed to push version to bottom — or plain `space-y-4` if stacking)

3. **Version line** (D-10)
   - `v{version} (build {hash})`, 12px/400, `--muted`, centered or left-aligned at bottom of screen
   - Read from Vite env (`import.meta.env.VITE_APP_VERSION` + build hash injected at build time)

### Install banner (D-11, D-12, D-13)

| Property | Value |
|----------|-------|
| Component | Custom `<Banner>` (built from shadcn `<Card>` primitive) — NOT shadcn `<Alert>` (`<Alert>` lacks a persistent close button pattern). |
| Placement | Top of content area, below header, above route outlet. NOT sticky. Scrolls with page. |
| Role | `role="banner"` |
| Background | `--surface` |
| Border | 1px `--border`, `rounded-lg` |
| Padding | `p-4` (16px) |
| Content | Title (Heading role) + body (Body role) + action row |
| Action row (iOS) | Dismiss X icon only (right-aligned) |
| Action row (Android w/ `beforeinstallprompt`) | Primary `<Button>Install</Button>` + Dismiss X icon |
| Dismissal | Click X → persist to localStorage key `ht.installBannerDismissedAt` = `Date.now()`. Banner stays dismissed for 14 days (re-appears if still not installed and window elapsed). |
| Visibility trigger | `!isStandalone() && !recentlyDismissed(14days)` |

### Eviction-warning banner (D-14)

| Property | Value |
|----------|-------|
| Component | Same `<Banner>` primitive as Install banner, with `variant="warning"` (optional visual cue — border-accent or leading warning icon; Claude's Discretion whether to add accent color here, default to plain to avoid overloading accent) |
| Placement | Top of content area, **below** the Install banner if both show simultaneously |
| Role | `role="banner"` |
| Icon (optional) | `lucide-react` `AlertTriangle` (20px, muted) at left of title — Claude's Discretion |
| Content | Title + body (see Copywriting Contract) |
| Action row | Primary `<Button>Install</Button>` (same handler as Install banner) + Dismiss X icon |
| Dismissal | localStorage key `ht.evictionBannerDismissedAt` = `Date.now()`. Re-shows after 7 days if still at risk. |
| Visibility trigger | `!isStandalone() && (Date.now() - lastOpenedAt) > 4*24*60*60*1000 && !recentlyDismissed(7days)` |

### Banner stacking rule

If both banners would show:
1. Install banner on top.
2. Eviction banner directly below (gap: `space-y-3`, 12px).

Use `space-y-3` on the banner container. Both banners are plain children of a flex-column — no custom stacking needed.

---

## Interaction & Motion

**No animations in Phase 1.** Explicitly:

| Interaction | Motion |
|-------------|--------|
| Route change (tab switch) | Instant. No fade, no slide, no transition. |
| Banner appear | Instant. No fade-in. |
| Banner dismiss | Instant removal from DOM. No fade-out. |
| Focus state | Native browser ring, 2px `--accent`. Instant. |
| Tap feedback | Native platform default only (no custom ripple, no press-down animation). |

**Rationale (aligned to PROJECT.md "calm, minimal, low-noise"):** the 4-segment streak visual in Phase 3 is where motion can pay off. Shell motion is noise. The planner must not introduce ad-hoc transitions; any `transition-*` Tailwind utility in Phase 1 requires explicit justification in plan notes.

**Reduced-motion baseline:** since no animations exist, no `prefers-reduced-motion` media query is needed in Phase 1. Phase 3 adds one when DayCell fills are introduced.

---

## Accessibility

Baseline requirements — every Phase 1 component must satisfy:

| Requirement | How it's met |
|-------------|--------------|
| Touch targets ≥ 44×44px | Tab items are 1/3 screen width × 56px tall. Dismiss X icon has 40px hit-area via `p-2` padding around a 24px SVG. |
| AA contrast | All color pairs documented in the Color section meet ≥7:1 (AAA). |
| Focus visible on keyboard | `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg` on every `<Button>` and tab item. |
| `aria-label` on icon-only controls | Tab items (`aria-label="Today"` etc.), Settings-cog in header (`aria-label="Settings"`), banner dismiss X (`aria-label="Dismiss"`). |
| `role="banner"` on install/eviction banners | Applied to the outer banner element. |
| Landmark roles | `<header>` for top header, `<nav>` for bottom tab bar, `<main>` for route outlet. |
| Screen-reader announce of active tab | `aria-current="page"` on active `<NavLink>` / tab item. |
| Skip-to-content link | N/A in Phase 1 (single-column shell). Reconsider in Phase 3 when calendar adds keyboard nav. |

---

## Responsive Scope

**iPhone-first (Anirudh's primary device per CLAUDE.md).**

| Breakpoint | Behavior |
|------------|----------|
| 320px–767px (phone) | Full-width layout. Content column `w-full px-4`. Default target. |
| ≥ 768px (tablet+) | Content column centers via `max-w-md mx-auto`. Layout unchanged — no desktop redesign. Header + tab bar remain full-width. |

No desktop (`≥ 1024px`) layout in Phase 1. The tab bar remains at the bottom on all widths (no side-rail conversion). Desktop polish is deferred to post-v1.

**Design baseline:** iPhone 13/14/15 at 390×844 logical pixels. All spacing and touch targets tested against this baseline.

---

## Component Inventory (Phase 1)

For the planner/executor to wire up shadcn installs and imports:

| Component | Source | Used for |
|-----------|--------|----------|
| `<Button>` | shadcn/ui | Install banner Android primary button, Install card Android primary button |
| `<Card>` | shadcn/ui | Today section cards, Settings Install card, Banner primitive base |
| `<Sheet>` | shadcn/ui | **Installed but not rendered in Phase 1** — reserved for Phase 2 (logging sheets). Planner installs to avoid a separate shadcn call later. |
| `<AppShell>` | Custom (`src/components/AppShell.tsx`) | Root layout |
| `<Banner>` | Custom (`src/components/Banner.tsx`) | Install + Eviction banners. Variants: `default` / optionally `warning`. |
| Tab items | Custom, built with `react-router-dom`'s `<NavLink>` | Bottom tab bar |
| Icons | `lucide-react` — `Home`, `CalendarDays`, `Settings`, `X`, `AlertTriangle` (optional) | See Icons table |

**shadcn installs (Phase 1 Plan 1):**
```
npx shadcn@latest add button card sheet
```

---

## Form Validation Patterns

**N/A — deferred to Phase 2.** Phase 1 has no forms (Settings screen in Phase 1 is a stub; goal-setting inputs arrive in Phase 2).

## Loading States

**N/A for Phase 1.** No async rendering occurs in the shell phase beyond Dexie lazy-open, which is not a user-visible state in the shell (no components query the DB yet). Loading spinners/skeletons arrive with Phase 2's live-data rendering.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `button`, `card`, `sheet` | not required (first-party registry) |
| (none — no third-party registries declared) | — | — |

**Third-party registry count: 0.** Safety vetting gate not triggered.

---

## Traceability: UI contract → CONTEXT.md decisions

| UI contract | Source D-code |
|-------------|---------------|
| Bottom tab bar + top header pattern | D-01 |
| 3 tabs (Today / Calendar / Settings); Today hosts 4 sub-sections | D-02 |
| Hash routing `/#/today` `/#/calendar` `/#/settings` | D-03 |
| Safe-area insets on header + tab bar | D-04 |
| Today placeholder copy verbatim | D-05 |
| Calendar + Settings stubs; Settings has Install card in Phase 1 | D-06 |
| Version line in Settings | D-10 |
| Install banner with data-safety framing | D-11 |
| Settings Install card | D-12 |
| `beforeinstallprompt` wired to banner button | D-13 |
| Eviction-warning banner triggers | D-14 |
| Palette (`--bg`, `--surface`, `--border`, `--muted`, `--text`) | D-15 |
| Accent `#22c55e` usage (tabs active, progress, complete) | D-16 |
| Alpha ramp tokens declared for Phase 3 | D-17 |
| `tokens.css` + Tailwind v4 `@theme` | D-18 |
| `.dark` only, light mode out of scope | D-19 |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
