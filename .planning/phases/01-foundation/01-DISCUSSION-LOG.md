# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 01-foundation
**Areas discussed:** App shell + landing screen, Photo format, SW update + install prompt UX, Dark theme design tokens

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| App shell + landing screen | Tab bar destinations, Phase 1 landing content, route structure | ✓ |
| Photo format: WebP vs JPEG | Resolve CLAUDE.md (JPEG) vs research (WebP) conflict | ✓ |
| SW update + install prompt UX | SW rollout + install prompt trigger timing | ✓ |
| Dark theme design tokens | Palette used across all future phases | ✓ |

**User chose:** All four areas.

---

## App shell + landing screen

### Q1. Primary navigation pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar | Mobile-first; native-feel on phone; research recommendation | ✓ |
| Top nav + hamburger drawer | 2-tap feature switches; higher friction | |
| Top tabs (segmented control) | Desktop-leaning; less thumb-friendly | |

### Q2. Nav destinations

| Option | Description | Selected |
|--------|-------------|----------|
| Today, Calendar, Settings (3 tabs — Today hosts all 4 logging sections) | Fewest taps; centers streak loop | ✓ |
| Today, PT, Food, Calendar, Settings (5 tabs) | Per-domain screens, risks Lift/Steps feeling small | |
| Today, Log, Calendar, Settings (4 tabs, Log routes to sub-screens) | Middle ground | |

### Q3. Phase 1 landing content

| Option | Description | Selected |
|--------|-------------|----------|
| Empty Today skeleton with labeled sections | Real layout ships Phase 1, Phase 2 fills sections | ✓ |
| Minimal "Foundation ready" placeholder | Throwaway UI replaced in Phase 2 | |
| Dev-only inspector (DB + OPFS stats) | Debug panel, removed in Phase 2 | |

### Q4. Routing

| Option | Description | Selected |
|--------|-------------|----------|
| react-router-dom with hash routes | Avoids SW nav-fallback edge cases; deep-link ready | ✓ |
| react-router-dom with browser routes | Cleaner URLs; minor extra SW config | |
| No router — Zustand activeTab state | Zero routing deps; loses URL/back semantics | |

**Notes:** User consistently took recommended path. Bottom tab bar + 3 tabs aligns with "low-friction entry" constraint from PROJECT.md.

---

## Photo format

### Q1. WebP vs JPEG

| Option | Description | Selected |
|--------|-------------|----------|
| WebP @ 80% quality | Smaller files; full support on targets; matches research docs | ✓ |
| JPEG @ 70% quality | Universally safe; matches current CLAUDE.md rule | |
| WebP with JPEG fallback at runtime | Feature-detect; adds complexity for no real win | |

**Notes:** Decision requires CLAUDE.md pitfall rule #5 to be updated during Phase 1 execution (from JPEG @ 70% → WebP @ 80%).

---

## SW update + install prompt UX

### Q1. Service worker update behavior

| Option | Description | Selected |
|--------|-------------|----------|
| autoUpdate, silent | Silent activation on reload; SETUP-06 stays v2 | ✓ |
| prompt registration + reload banner | Fulfills SETUP-06 spirit in Phase 1 | |
| autoUpdate + visible build version | Silent update + build hash in Settings | |

**Notes:** User took recommended. D-10 adds the build-version line to Settings as a belt-and-suspenders addition — surfaces version without a banner.

### Q2. Install prompt aggressiveness

| Option | Description | Selected |
|--------|-------------|----------|
| Banner on first launch if in Safari tab | Dismissible; iOS share-sheet instructions; data-safety framing | ✓ |
| Banner + repeat after N days | More defensive; extra state tracking | |
| Instructions in Settings only | No interrupt; weaker data-safety signal | |
| beforeinstallprompt only (no iOS banner) | Android-only; ineffective on user's primary iPhone | |

### Q3. Eviction-warning banner

| Option | Description | Selected |
|--------|-------------|----------|
| Ship in Phase 1 | 4-day-gap check + Safari-tab detection; closes Pitfall #3 | ✓ |
| Defer to Phase 4 | Batch with backup/polish work | |
| Skip entirely — rely on install prompt | Eliminates if user installs | |

**Notes:** User consistently chose the most defensive option against the iOS 7-day eviction pitfall. All three decisions together form a coherent data-safety story in Phase 1.

---

## Dark theme design tokens

### Q1. Base dark palette direction

| Option | Description | Selected |
|--------|-------------|----------|
| shadcn zinc default | Ships on day 1; `#09090b / #18181b / #27272a / #a1a1aa / #fafafa` | ✓ |
| Custom calm neutrals (Linear-ish) | Warmer, softer; ~30 min tuning | |
| True black OLED | Max contrast; can feel harsh long-session | |

### Q2. Primary accent color

| Option | Description | Selected |
|--------|-------------|----------|
| Soft green (`#22c55e`) | Reads 'consistency / positive progress'; habit-app standard | ✓ |
| Warm amber / gold | Distinctive; energetic without punishing | |
| Cool cyan / teal | Clinical / medical feel | |
| Dual accents (green + white) | Restrained; one more variable | |

### Q3. DayCell partial-fill progression (Phase 3 palette lock)

| Option | Description | Selected |
|--------|-------------|----------|
| Single-hue progression (accent @ 25/50/75/100% alpha) | Simplest; addresses Pitfall #6 directly | ✓ |
| Per-segment color per area | More info per cell; noisy palette | |
| Neutral-to-accent gradient | Richer visual; more tokens | |
| Defer to Phase 3 | Risks Phase 3 delay | |

**Notes:** User took all three recommended options. Palette locked with specific hex values (D-15, D-16) and alpha ramp (D-17) so Phase 2/3 agents don't re-litigate the visual identity.

---

## Claude's Discretion

Captured in CONTEXT.md `<decisions>` → "Claude's Discretion" subsection:
- Exact app-shell component decomposition and naming
- Bottom-tab icon choice (Lucide recommended)
- Banner copy wording and dismissal keys
- EXIF/orientation handling in photo resize
- Dev tooling (ESLint, Prettier, package manager = npm default)
- Goals singleton seeding strategy (Phase 2 concern)
- Vitest for `todayKey()` unit test vs `console.assert`

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section:
- SETUP-06 in-app SW update banner (stays v2)
- Light mode theme (out of scope)
- Custom calm palette (post-v1 revisit if needed)
- Per-segment colored DayCell quadrants (rejected)
- Testing framework (Claude's discretion in Phase 1 planning)
- Goals singleton default seeding (Phase 2 concern)
