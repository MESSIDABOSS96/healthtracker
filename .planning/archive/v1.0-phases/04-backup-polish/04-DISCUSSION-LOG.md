# Phase 4: Backup & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 04-backup-polish
**Areas discussed:** Export trigger UX + nudges, Polish scope (carry-forwards), Export progress + failure UX, Install/icon polish gap

---

## Area 1: Export trigger UX + nudges

### Q1.1 — Where should the Export button live?

| Option | Description | Selected |
|--------|-------------|----------|
| Settings only | Single 'Export data' card/button in Settings, between Goals and version line. Matches Phase 1 D-12 install card pattern. One discoverable home for the data-safety story. | ✓ |
| Settings + day-detail cue | Same Settings button + a contextual 'Export now' link in the day-detail view (per 03-CONTEXT.md Integration Points note). User who just edited an old log gets a nudge to back up. More surface area, two code paths to maintain. | |
| Settings + Today header | Settings button + a small 'Backup' icon in the Today screen's top header. Maximum visibility, but adds chrome to Today (which Phase 1 D-01 keeps minimal). | |

**User's choice:** Settings only (Recommended)
**Notes:** Single discoverable home; honors PROJECT.md "minimal, low-noise". Becomes D-01.

### Q1.2 — Export filename convention?

| Option | Description | Selected |
|--------|-------------|----------|
| `healthtracker-YYYY-MM-DD.json` | Date only. Sortable, human-readable, matches what most apps do. Same-day duplicate gets browser '(1)' suffix automatically. | ✓ |
| `healthtracker-YYYY-MM-DD-HHMMSS.json` | Includes time. Always unique. Slightly noisier filename. | |
| `healthtracker-export-v{schemaVersion}-YYYY-MM-DD.json` | Includes schema version. Future-proofs for v2 import, but envelope already carries `schemaVersion`. | |

**User's choice:** `healthtracker-YYYY-MM-DD.json` (Recommended)
**Notes:** Date is from `lib/dayKey.ts` (Pitfall #4). Becomes D-02.

### Q1.3 — Post-save user feedback?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline 'Last exported: just now' line | Replace button helper text with live-updating timestamp. No toast, no modal, no new primitives. | ✓ |
| Brief inline confirmation banner | ~3s green strip then collapse. Requires building a toast-ish primitive. | |
| Nothing visible | Browser's native download surface only. No in-app feedback. | |

**User's choice:** Inline 'Last exported: just now' line (Recommended)
**Notes:** Calm + persistent + zero new primitives. Becomes D-03.

### Q1.4 — Track `lastExportedAt` and nudge when stale?

| Option | Description | Selected |
|--------|-------------|----------|
| Track + nudge after 14 days | Persist in localStorage; show calm 'Time to back up' line in the export Card when stale or never-exported. No new banner. | ✓ |
| Track but no nudge | Store for 'Last exported' display only. Defers nudge decision. | |
| Don't track at all | Fire-and-forget. v2 BACK-04 will need to add this state later. | |

**User's choice:** Track + nudge after 14 days (Recommended)
**Notes:** Becomes D-04. New `LAST_EXPORTED_KEY` in `storageKeys.ts`. Inline text inside the Card, NOT a new Banner.

---

## Area 2: Polish scope (carry-forwards)

### Q2.1 — Phase 3 WR-01/02 (streak count midnight staleness): fix in Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix in Phase 4 | Add a midnight rollover hook (`useDayKey()`) that re-renders when local midnight passes. | ✓ |
| Defer to v2 | Real-world impact low; user closes/reopens between sessions. | |

**User's choice:** Fix in Phase 4 (Recommended)
**Notes:** Becomes D-05. Implementation goes through `lib/dayKey.ts` (Pitfall #4); cleanup timer on unmount.

### Q2.2 — Phase 3 WR-03 (deleteLift clears note silently, no confirm): fix in Phase 4?

| Option | Description | Selected |
|--------|-------------|----------|
| Add a confirm dialog | Reuse Radix Dialog as a small confirm modal. Reusable for future destructive actions. | ✓ |
| Add an undo affordance | 'Undone' link for ~5s. Requires toast-ish primitive. | |
| Leave as-is, defer | Solo user, low blast radius. | |

**User's choice:** Add a confirm dialog (Recommended)
**Notes:** Becomes D-06. New `src/components/ui/confirm-dialog.tsx`. `@radix-ui/react-dialog` already installed (Phase 2 Sheet consumer).

### Q2.3 — Day-detail 'Export now' contextual cue: scope in?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip — Settings nudge handles it | Already decided in Area 1: 14-day stale nudge. Second surface = duplicate. | ✓ |
| Add subtle muted link in day-detail footer | 'Last exported: 5 days ago → Export'. Contextually relevant after past-day edits. | |

**User's choice:** Skip — Settings nudge handles it (Recommended)
**Notes:** Becomes D-07. Closes the flag from 03-CONTEXT.md `<code_context>`.

### Q2.4 — Anything ELSE in Phase 4 polish scope? (multi-select)

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing else — lock scope here | Phase 4 = export + chosen carry-forwards + install/icon polish only. | ✓ |
| Eviction-banner refinement | Re-tune trigger or copy now that real data exists. | |
| Goals-form validation polish | Zero-as-sentinel UX (Phase 2 D-16) feels confusing. | |
| TodayScreen empty-state copy | Phase 1 D-05 placeholders never re-tuned with live data. | |

**User's choice:** Nothing else — lock scope here (Recommended)
**Notes:** Becomes D-08 hard scope ceiling. Three rejected items deferred to post-v1.

---

## Area 3: Export progress + failure UX

### Q3.1 — Run-state UX during export?

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner + disable button | Button label 'Exporting…', `disabled`, small spinner. No progress %. | ✓ |
| Determinate progress bar | 'Exporting 12 of 47 photos…' using existing ProgressBar. | |
| Background — no UI | iOS may not honor download if user navigates away mid-encode. | |

**User's choice:** Spinner + disable button (Recommended)
**Notes:** Becomes D-09. Uses `lucide-react` `<Loader2>` (already in deps).

### Q3.2 — Single-photo failure during export?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip + record in envelope | Omit failed photos; surface count in post-save line. Backup completes. | ✓ |
| Fail the whole export | Safest data integrity, but one corrupt photo blocks all backup. | |
| Skip silently | User has no idea anything went wrong. | |

**User's choice:** Skip + record in envelope (Recommended)
**Notes:** Becomes D-10. `console.warn` per skipped key. Post-save line shows '(1 photo couldn't be saved)' if applicable.

### Q3.3 — Total export failure (Dexie throws or JSON.stringify throws)?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error in the export card | Red-tinted text below button. Logs to console. No blocking modal. | ✓ |
| Modal/banner error | More visible but more intrusive. | |

**User's choice:** Inline error in the export card (Recommended)
**Notes:** Becomes D-11. Phase 1 silent+console pattern.

### Q3.4 — Pre-flight envelope size estimate?

| Option | Description | Selected |
|--------|-------------|----------|
| No pre-flight; rely on error handling | Solo user, library <100 photos, ~10-20MB envelope. D-11 covers worst case. | ✓ |
| Compute envelope size estimate first | Warn at >50MB. Useful at scale; will not realistically fire here. | |

**User's choice:** No pre-flight; rely on error handling (Recommended)
**Notes:** Becomes D-12.

---

## Area 4: Install/icon polish gap

### Q4.1 — iOS launch splash screens?

| Option | Description | Selected |
|--------|-------------|----------|
| Skip — not worth it | 10+ device-specific PNGs; iOS falls back to black bg matching dark theme. | ✓ |
| Add minimum set | 3-4 most common iPhone sizes. ~800KB of PNGs. | |
| Add full set | Every iPhone since 2018 + iPad. Several MB. Overkill. | |

**User's choice:** Skip — not worth it (Recommended)
**Notes:** Becomes D-13. Black fallback ~200ms is invisible against `#09090b` bg.

### Q4.2 — iOS-specific meta tags in `index.html`?

| Option | Description | Selected |
|--------|-------------|----------|
| Add the standard 3 | `apple-mobile-web-app-capable`, `…-status-bar-style: black-translucent`, `…-title`. Five-minute change. | ✓ |
| Skip | manifest covers cross-platform basics. | |

**User's choice:** Add the standard 3 (Recommended)
**Notes:** Becomes D-14. `black-translucent` lets dark theme bleed under iOS notch.

### Q4.3 — Manifest tweaks?

| Option | Description | Selected |
|--------|-------------|----------|
| Add `id` + `categories` + audit | `id: '/'` (PWA spec), `categories: ['health', 'fitness', 'productivity']`, audit description copy. | ✓ |
| Add a `screenshots` array | Useful for public apps; overkill for solo use. | |
| Leave manifest as-is | Current works — don't touch. | |

**User's choice:** Add `id` + `categories` + audit (Recommended)
**Notes:** Becomes D-15. `id: '/'` future-proofs against origin drift.

### Q4.4 — Maskable icon safe-zone audit?

| Option | Description | Selected |
|--------|-------------|----------|
| Visual audit during execution | Check via maskable.app preview; regenerate only if safe-zone violated. | ✓ |
| Regenerate now — assume it's wrong | Pre-emptive re-do. Adds asset task even if not needed. | |
| Skip the audit | Trust existing asset. | |

**User's choice:** Visual audit during execution (Recommended)
**Notes:** Becomes D-16. Cheap inspection, no commitment unless needed.

---

## Claude's Discretion

The following implementation choices are NOT locked by the user — Claude picks during planning/execution:
- `export.svc.ts` decomposition (single file vs split helpers)
- Download trigger implementation (`URL.createObjectURL` + hidden `<a>` click pattern)
- OPFS-read concurrency (sequential vs `Promise.all`)
- `useDayKey` location (`src/lib/` vs `src/features/calendar/hooks.ts`)
- `ConfirmDialog` API surface (controlled vs imperative)
- Stale-nudge "data exists" heuristic implementation
- Final inline copy wording (within PROJECT.md tone)
- Card visual treatment for export entry
- Filename timestamp source — MUST use `lib/dayKey.ts`

## Deferred Ideas

Captured in CONTEXT.md `<deferred>` section. Highlights:
- BACK-03 import (v2)
- BACK-04 weekly auto-prompt (v2)
- Toast primitive
- Eviction-banner refinement, Goals-form polish, TodayScreen empty-state copy (post-v1 polish creep)
- iOS launch splash screens (rejected — D-13)
- Determinate progress bar (rejected — D-9 variant)
- Pre-flight size estimate (rejected — D-12 variant)
- Day-detail 'Export now' cue (rejected — D-07)
- Encryption, cloud-backup hooks (out of REQUIREMENTS scope)
- "Undo" for destructive day-detail actions (rejected — D-06 variant)
