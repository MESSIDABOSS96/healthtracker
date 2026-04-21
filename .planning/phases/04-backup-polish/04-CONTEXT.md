# Phase 4: Backup & Polish - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 closes the data-safety story before any meaningful volume of data accumulates. Two REQs: **BACK-01** (JSON export of all data via Settings) and **BACK-02** (`<a download>` mechanism, no `showSaveFilePicker`). Plus a deliberately bounded set of polish items: the install/manifest gap (icons already ship; this phase fills the iOS-specific meta gap and manifest hygiene) and a tight set of carry-forward fixes from the Phase 3 review.

After Phase 4 the v1 milestone is complete: install, log, see streak, back up.

**Explicitly out of scope for Phase 4:**
- Import / restore (BACK-03) — v2 per REQUIREMENTS
- Weekly auto-export prompt (BACK-04) — v2; the 14-day staleness *display* in Settings is in scope, but no notification/modal/auto-trigger
- In-app SW update banner (SETUP-06) — v2
- Toast primitive — Phase 4 reuses inline text + the Radix Dialog already pulled in by Phase 2's Sheet
- Per-quadrant DayCell variants, year-heatmap, badges/XP — see Phase 3 + REQUIREMENTS Out-of-Scope (still locked)
- Anything not explicitly in Polish Scope §D-09..D-12 below — hard scope ceiling agreed during discussion (§Specifics)

</domain>

<decisions>
## Implementation Decisions

### Export trigger + nudges (Settings surface)

- **D-01** — **Single export entry point in Settings.** A new "Export data" Card sits in `SettingsScreen.tsx` between `<GoalsForm />` and the `flex-1` spacer (i.e., above the version line). No Today-screen surface, no day-detail "Export now" cue. PROJECT.md "minimal, low-noise" + one discoverable home for the data-safety story.
- **D-02** — **Filename: `healthtracker-YYYY-MM-DD.json`.** Date-only (local time, via `lib/dayKey.ts:todayKey()` — Pitfall #4 still applies; never `new Date().toISOString().split('T')[0]`). Same-day duplicate exports get the browser's automatic `(1)`, `(2)` suffix — acceptable. Schema version lives in the envelope (BACK-01), not the filename.
- **D-03** — **Post-save confirmation = inline "Last exported" line.** The Card's helper text live-renders `Last exported: {relative time}` driven by the `lastExportedAt` value (e.g. `Last exported: just now`, `Last exported: 5 days ago`). No toast, no modal, no banner, no new primitive. Empty/never-exported state shows nothing (or a subtle hint per D-04).
- **D-04** — **`lastExportedAt` is tracked in `localStorage` under a key declared in `src/lib/storageKeys.ts`** (e.g. `LAST_EXPORTED_KEY = 'ht.lastExportedAt'`). Set to `Date.now()` after each successful export. When `now - lastExportedAt > 14 * 86400_000` **OR** `lastExportedAt` is absent **AND** the user has any data (heuristic: any of `ptSessions`, `mealEntries`, `stepEntries`, `liftCheckins` has ≥1 row), the Card surfaces a calm one-liner like `Time to back up — your last export was {N} days ago` (or `Back up your data` for never-exported). The line is informational text inside the Card, NOT a separate Banner/Eviction-style component. Honors PROJECT.md "calm" + reuses existing Card primitive.

### Polish scope (carry-forwards from Phase 3 review — HARD SCOPE CEILING)

These three items are IN. Anything not on this list is OUT — locked during discussion to prevent scope creep.

- **D-05** — **Fix WR-01/02 (streak count midnight staleness).** Add a small reactive hook `src/lib/useDayKey.ts` (or co-located in `src/features/calendar/hooks.ts`) that returns `todayKey()` and re-renders when local midnight passes (one `setTimeout` to next local midnight + chained reschedule on tick). Wire it into `useCurrentStreakCount` and the StreakCount subtitle so a long-open session reflects the new day's streak after midnight without a reload. Implementation MUST go through `lib/dayKey.ts` for any key construction (Pitfall #4). Cleanup the timer on unmount.
- **D-06** — **Add a confirm dialog for `deleteLift`.** Build a thin `ConfirmDialog` component on top of `@radix-ui/react-dialog` (already installed for Sheet in Phase 2 — same primitive, different consumer). Copy: `Remove lift check-in for {date}? Note will be deleted too.` / `Cancel` / `Remove`. Wired into the day-detail Lift row's delete affordance. Component lives in `src/components/ui/confirm-dialog.tsx` and is intentionally generic (future destructive actions reuse it).
- **D-07** — **Day-detail "Export now" contextual cue: SKIP.** The Settings 14-day nudge (D-04) already covers the motivation. A second surface in day-detail would be duplicate and would creep day-detail's purpose (view + edit, not nudge).
- **D-08** — **Hard scope ceiling.** Eviction-banner copy refinement, Goals-form validation polish, TodayScreen empty-state copy — all REJECTED for Phase 4. Defer to post-v1 if real daily use surfaces them. The planner MUST NOT add polish items beyond D-05/D-06.

### Export progress + failure UX

- **D-09** — **Run-state UX = spinner + disable button.** During `exportAll()`: button label flips to `Exporting…`, button `disabled`, small `lucide-react` spinner icon inside (already in deps). No determinate progress bar (overkill at expected library sizes <50 photos), no per-photo updates. Matches Phase 2 D-04 anti-motion / Sheet save pattern. Re-enable + render `Last exported: just now` on success.
- **D-10** — **Per-photo failure: skip-with-warning.** If `loadPhoto(key)` throws or `blobToBase64` fails for an individual photo, omit that key from the `photos` map and continue with the rest. Track failed count; surface as `Exported (1 photo couldn't be saved)` in the post-save inline line. Failed photos are logged to `console.warn` with the photoKey. The corresponding `Food.photoKey` reference still exists in `data.foods` — the v2 importer (BACK-03) will treat absent photo keys as "photo lost", consistent with general missing-asset handling.
- **D-11** — **Total failure: inline error in the export Card.** If the Dexie `Promise.all` throws or `JSON.stringify` throws (rare; quota/memory edge case), surface a red-tinted text line below the button: `Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding.` Console logs the underlying error (Phase 1 silent+console pattern). No modal, no Banner, no blocking. Button re-enables.
- **D-12** — **No pre-flight size estimate.** Solo user, expected library <100 photos, expected envelope <20MB. Premature optimization to estimate-and-warn for a path that will not realistically fire. The D-11 error path is the safety net.

### Install/icon polish

- **D-13** — **Skip iOS launch splash screens.** Per-device PNG variants (`apple-touch-startup-image`) are 10-15+ assets covering every iPhone resolution × orientation. Maintenance cost is real, and iOS falls back to a black screen for ~200ms which against the dark `#09090b` theme is effectively invisible. Won't ship.
- **D-14** — **Add the 3 standard Apple meta tags in `index.html`.** Five-minute change, no new assets:
  ```html
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="HealthTracker">
  ```
  `black-translucent` lets the dark theme bleed under the iOS notch/Dynamic Island for a more native feel. Title overrides the browser-title default on the iOS home screen.
- **D-15** — **Manifest hygiene additions in `vite.config.ts` `VitePWA({ manifest })`.** Add:
  - `id: '/'` — stabilizes PWA identity per W3C manifest spec; without it, identity is derived from start_url+scope which can drift on origin changes
  - `categories: ['health', 'fitness', 'productivity']` — surfaces in app stores / install UIs that read the categories field
  - Audit the existing `description` for clarity (current: "Personal daily tracker for PT, food, steps, and lifts." — keep unless it reads stale)
- **D-16** — **Maskable icon visual audit during execution.** Open `public/icon-maskable-512.png` in https://maskable.app/editor (or the equivalent local preview the planner picks). If the icon's content extends into the outer 20% safe-zone margin Android crops, regenerate with proper padding (matte background filling to the edge, glyph centered in the inner 60%). If it looks correct in the preview, leave it. Cheap inspection, no commitment unless the audit fails.

### Claude's Discretion

The following are not locked — implementer picks during planning/execution unless they become blocking questions:

- **`export.svc.ts` decomposition.** Whether to put everything in `src/services/export.svc.ts` (recommended; matches ARCHITECTURE.md §"Component / Module Boundaries" `export.svc.ts` row) or split helpers (`blobToBase64`, `buildEnvelope`, `triggerDownload`) into `src/lib/export/`. Either is fine; service-layer rule still applies (UI never imports `db` directly).
- **Download trigger implementation.** Likely pattern: `URL.createObjectURL(new Blob([json], { type: 'application/json' }))` → set on a hidden `<a download={filename}>` → click programmatically → `revokeObjectURL` after a microtask. Planner picks the exact wiring. BACK-02 just requires `<a download>`, not `showSaveFilePicker`.
- **OPFS-read concurrency.** Sequential `for…of` over `food.photoKey` is fine for Phase 4. Could `Promise.all` for parallelism, but iOS Safari has been historically flaky with parallel OPFS reads. Sequential is safer; Claude can benchmark if it feels slow.
- **`useDayKey` location.** `src/lib/useDayKey.ts` (lib-level reusable hook) or `src/features/calendar/hooks.ts` (co-located with current consumers). Recommend lib-level since it's not calendar-specific (any "what day is it" caller benefits).
- **`ConfirmDialog` API surface.** Trigger-as-render-prop vs imperative `confirm()` Promise wrapper. Recommend the controlled `open`/`onOpenChange` Radix-style pattern matching Sheet — consistent with Phase 2 component conventions.
- **Stale nudge "data exists" heuristic.** D-04 says check `≥1 row across the 4 logging tables`. Implementation can use `Promise.all([db.ptSessions.count(), db.mealEntries.count(), db.stepEntries.count(), db.liftCheckins.count()])` then sum, OR a `useLiveQuery` wrapper. Either fine; live wrapper means the nudge appears mid-session after the first log on a fresh install.
- **Inline nudge / "Last exported" copy.** Final wording — keep PROJECT.md "calm, minimal" tone. "Last exported: {relative time}" / "Time to back up — last exported {N} days ago" / "Back up your data" (never-exported) are starting points; refine if any feels off.
- **Card visual treatment for the export entry.** Reuse the existing `Card` primitive matching the Install card's styling. Title: "Export data" or "Backup". Body: 1 line of helper text + button. No icons unless they aid clarity.
- **Filename timestamp source.** D-02 says local-day. Implementation MUST use `lib/dayKey.ts:todayKey()` or `dateToKey(new Date())` — never `toISOString().split('T')[0]` (Pitfall #4).

### Folded Todos

None — `gsd-sdk query todo.match-phase 4` returned zero matches.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level
- `.planning/PROJECT.md` — Core Value ("logging feels like a win"), "minimal, low-noise" aesthetic, Current State block (Phase 3 complete, "Next: Phase 4 — Backup & Polish")
- `.planning/REQUIREMENTS.md` — Phase 4 covers BACK-01, BACK-02 (2 requirements); BACK-03 / BACK-04 / SETUP-06 explicitly v2; Out-of-Scope table forbids notifications, badges, cloud sync
- `.planning/ROADMAP.md` §"Phase 4: Backup & Polish" — Goal + 2 success criteria
- `.planning/STATE.md` — Current Position (Phase 4, ready to plan); blocker note (none for Phase 4)
- `CLAUDE.md` — Project-breaking pitfalls (esp. #1 IDB-transaction auto-commit — relevant because OPFS reads inside an export MUST run OUTSIDE any Dexie transaction; #4 dayKey UTC bug — filename and "last exported" must use `lib/dayKey.ts`)

### Phase 1 carry-forward (LOCKED, directly consumed in Phase 4)
- `.planning/phases/01-foundation/01-CONTEXT.md` §D-11/D-12/D-14 — Install banner + Settings install card + Eviction banner (all already shipping; D-14 Eviction is the conceptual sibling of D-04's stale-nudge — same data-safety arc, different surface)
- `.planning/phases/01-foundation/01-CONTEXT.md` §D-15/D-16 — Color tokens (`--surface`, `--accent`, `--muted`) used by the export Card and any failure-state text
- `.planning/phases/01-foundation/01-UI-SPEC.md` — Anti-motion policy (no spinner pulse, no toast slide), Card visual treatment, accessibility baselines

### Phase 2 carry-forward (LOCKED)
- `.planning/phases/02-tracking-slices/02-CONTEXT.md` §D-04 — "Sheet closes immediately on Save → Today card re-renders via `useLiveQuery`" — same anti-motion philosophy applies to the export run-state UX (D-09)
- `.planning/phases/02-tracking-slices/02-CONTEXT.md` §D-15 — RHF + Zod pattern (not used in Phase 4 directly, but the Card-with-action pattern matches GoalsForm visual rhythm)
- `src/components/ui/sheet.tsx` consumer of `@radix-ui/react-dialog` — confirms the dialog primitive is already installed; D-06 ConfirmDialog reuses it without adding deps

### Phase 3 carry-forward (LOCKED)
- `.planning/phases/03-streak-loop/03-CONTEXT.md` §D-11 — Today-ring on DayCell uses `--accent` (not affected by Phase 4, but the same accent token threads through the export Card)
- `.planning/phases/03-streak-loop/03-CONTEXT.md` `<code_context>` "Phase 4 hooks into" — flagged the day-detail "Export now" cue (REJECTED in this phase per D-07 — keep the flag closed)
- `.planning/phases/03-streak-loop/03-REVIEW.md` WR-01, WR-02, WR-03 — the three carry-forward items D-05/D-06 close (D-07 closes the third by deferral)

### Architecture + features (research)
- `.planning/research/ARCHITECTURE.md` §"Export / Import JSON Format" — **Authoritative spec for `ExportEnvelope` shape, `exportAll()` procedure, `blobToBase64`, schema-version semantics.** Phase 4 implementation matches this verbatim except the importAll half (BACK-03 v2, omit).
- `.planning/research/ARCHITECTURE.md` §"Component / Module Boundaries" — `export.svc.ts` is the new Phase 4 service module; UI → services → db direction holds
- `.planning/research/ARCHITECTURE.md` §"Service Worker / Offline Strategy" — confirms current `generateSW + autoUpdate` setup; no SW changes for Phase 4
- `.planning/research/ARCHITECTURE.md` §"Storage Layer Pattern" — confirms `db.verno` is the source of truth for `schemaVersion` in the envelope
- `.planning/research/PITFALLS.md` §"Pitfall 1" — IDB auto-commit; relevant to D-09 because OPFS reads inside the export loop are non-IDB and MUST NOT happen inside `db.transaction()`
- `.planning/research/PITFALLS.md` §"Pitfall 4" — UTC midnight date bug; D-02 filename and D-04 staleness math both depend on `lib/dayKey.ts`
- `.planning/research/SUMMARY.md` §"Must have for v1" + §"Defer to v2+" — confirms BACK-01/02 in v1 scope; BACK-03 + import flow in v2

### Existing code (Phase 1 + 2 + 3 outputs that Phase 4 consumes)
- `src/db/db.ts` — `db.verno` is the `schemaVersion` source for the envelope; `db.tables` for the bulk read; transaction semantics still apply
- `src/db/schema.ts` — All 7 record interfaces are the typed contract for `ExportEnvelope.data`
- `src/lib/dayKey.ts` — `todayKey()` / `dateToKey()` for filename + last-exported math (Pitfall #4)
- `src/lib/photoStore.ts` — `loadPhoto(key)` for OPFS reads during export; `getDir()` is private (don't bypass)
- `src/lib/storageKeys.ts` — Pattern for new `LAST_EXPORTED_KEY` constant; matches `PREV_OPENED_KEY` style
- `src/lib/version.ts` — `APP_VERSION` for the envelope
- `src/components/Banner.tsx` — Existing primitive; Phase 4 does NOT need new banners (D-04 is inline text)
- `src/components/InstallBanner.tsx` + `EvictionBanner.tsx` — Patterns for localStorage-driven dismissable surfaces (reference only; not modified in Phase 4)
- `src/components/ui/card.tsx`, `button.tsx` — Reused for the export Card
- `src/components/ui/sheet.tsx` — Confirms `@radix-ui/react-dialog` is in deps; D-06 ConfirmDialog is the second consumer
- `src/routes/SettingsScreen.tsx` — Phase 4 inserts the export Card between `<GoalsForm />` and the `flex-1` spacer; outer layout unchanged
- `src/routes/DayDetail.tsx` (Phase 3) — D-06 wires ConfirmDialog into the Lift row's delete handler; no other day-detail changes
- `src/services/lifts.svc.ts` — `deleteLift` is the function the D-06 dialog gates; no service signature change
- `src/services/streak.svc.ts` + `src/features/calendar/hooks.ts` — D-05 wires the new `useDayKey` hook through `useCurrentStreakCount` (and any other midnight-sensitive consumer)
- `vite.config.ts` — D-15 manifest tweaks land here; D-13 confirms no new icons needed
- `index.html` — D-14 adds the 3 apple-* meta tags
- `lucide-react` (existing dep) — Spinner icon for D-09 (`<Loader2 className="animate-spin" />` or equivalent)

### External library docs (fetch during research/planning if needed)
- W3C Web App Manifest spec — `id`, `categories`, `description` semantics — https://www.w3.org/TR/appmanifest/
- Apple `apple-mobile-web-app-*` meta tags — https://developer.apple.com/documentation/webkit/promoting_apps_with_smart_app_banners (and the Safari HTML reference for the `meta` tag set)
- Maskable icon safe-zone preview — https://maskable.app/editor (D-16)
- Radix Dialog primitive (already installed) — https://www.radix-ui.com/primitives/docs/components/dialog (for D-06 ConfirmDialog wiring)
- File download via `<a download>` — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#download (BACK-02; iOS PWA constraint)
- `URL.createObjectURL` lifecycle — https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static (revoke after click for the export download)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@radix-ui/react-dialog` already installed** (Phase 2 added it for `Sheet`). D-06 `ConfirmDialog` is the second consumer — no new deps, no new install. The same `Dialog.Root` / `Dialog.Portal` / `Dialog.Content` primitive backs Sheet today.
- **`lucide-react` already installed** (Phase 1 dep). D-09 spinner uses `<Loader2 className="animate-spin" />` (or equivalent) — no new icon dep.
- **All 7 Dexie tables are read-ready.** `db.verno === 1`, `db.tables` enumerable for the bulk read. `db.tables.map(t => t.toArray())` is the ARCHITECTURE.md-prescribed pattern.
- **`photoStore.loadPhoto(key)`** is the canonical OPFS read. Phase 4 export loops over `foods.filter(f => f.photoKey)` and calls this; no need for a new helper. Returns a `Blob`, then convert to base64 via `FileReader.readAsDataURL` or equivalent.
- **`storageKeys.ts` pattern** (`PREV_OPENED_KEY`) is the model for the new `LAST_EXPORTED_KEY` constant. Same kebab-prefix style: `'ht.lastExportedAt'`.
- **`lib/version.ts:APP_VERSION`** (Phase 1) — `import.meta.env.VITE_APP_VERSION` is wired through Vite define. Drop straight into `envelope.appVersion`.
- **`Card` primitive** (Phase 1) — wraps the export entry, matches Install card visual rhythm.
- **Inline-error pattern in Banner** (`variant="warning"`) — D-11 reuses the styling but renders as plain text inside the Card, not as a separate Banner.

### Established Patterns
- **UI → services → db dependency direction.** `export.svc.ts` is the new service module; the SettingsScreen export Card consumes it. SettingsScreen never `import { db }` directly. Same rule the Phase 2/3 services followed.
- **`Promise.all` over independent reads.** Same pattern as Phase 3 `streak.svc.ts` (4 range queries in parallel) and Phase 2 `meals.svc.ts` (denormalized totals at write). Phase 4 export does the 7-table bulk read in `Promise.all`.
- **Pitfall #1 transaction discipline.** OPFS reads (`loadPhoto`) are non-IDB and MUST run OUTSIDE any `db.transaction()`. Pattern: do the Dexie reads first (`Promise.all` over `db.tables.map(t => t.toArray())`), then the OPFS loop, then build the envelope. The export does NOT need a Dexie transaction at all (read-only consistency for a personal export is fine without it).
- **Silent + console pattern for non-critical errors.** Phase 1 `initApp()` try/catch carry-over. Per-photo failures (D-10) `console.warn`; the user-visible signal is the count in the post-save line.
- **localStorage as ephemeral PWA state.** Pattern from Phase 1's `PREV_OPENED_KEY`, `INSTALL_DISMISSED_KEY`, etc. `LAST_EXPORTED_KEY` joins the same family — written by export.svc.ts on success, read by SettingsScreen for the inline-line render.
- **Anti-motion policy.** Phase 1 UI-SPEC. D-09 spinner is the only animated element added in Phase 4 — keep it small, don't pulse, no fancy easing. No success animations, no slide-in confirmations.
- **No new Banner instances.** D-04 nudge is inline text inside the export Card, not a fourth Banner sibling alongside Install + Eviction. Banners are reserved for site-wide attention; the nudge is contextual and lives where the action does.

### Integration Points
- **`src/routes/SettingsScreen.tsx`** — Insert `<ExportCard />` (or inlined JSX) between `<GoalsForm />` and the `<div className="flex-1" />` spacer. No other layout changes.
- **`src/routes/DayDetail.tsx`** — Lift row's existing delete affordance gets wrapped in the new ConfirmDialog. Confirm gate is the only behavioral change; the underlying `deleteLift(dayKey)` call is unchanged.
- **`src/features/calendar/hooks.ts`** (or `src/lib/useDayKey.ts`) — `useCurrentStreakCount` and the StreakCount subtitle's `subtitle = todayKey()` call switch to `const today = useDayKey(); ... = today;`. Internals: `useState(todayKey())` + `useEffect` that schedules `setTimeout(() => setKey(todayKey()), msUntilMidnight())` on mount and on each tick.
- **New `src/services/export.svc.ts`** — Single export `exportAll(): Promise<{ json: string; warnings: { skippedPhotos: string[] } }>`. Caller (the SettingsScreen handler) blobs it, triggers `<a download>`, writes `LAST_EXPORTED_KEY`, surfaces the warning count.
- **New `src/components/ui/confirm-dialog.tsx`** — Generic Radix-Dialog wrapper. Props: `open`, `onOpenChange`, `title`, `body`, `confirmLabel`, `onConfirm`, `cancelLabel?`, `destructive?: boolean`. Tailwind-styled to match the Sheet visual language.
- **`vite.config.ts`** — `VitePWA({ manifest: { ..., id: '/', categories: [...] } })` per D-15.
- **`index.html`** — Add the 3 apple-* meta tags per D-14 in the `<head>`.
- **`src/lib/storageKeys.ts`** — Add `export const LAST_EXPORTED_KEY = 'ht.lastExportedAt';`.
- **`public/icon-maskable-512.png`** — Visual audit per D-16; regenerate only if safe-zone violated. No build wiring change either way (manifest entry already in place).

</code_context>

<specifics>
## Specific Ideas

- **"Logging feels like a win" still applies — but Phase 4's analog is "backup feels reassuring, not nagging."** D-03 + D-04 consciously avoid toasts, modals, and a fourth banner. Inline text inside the existing Card is the calm voice.
- **Hard scope ceiling is load-bearing.** Phase 4 is the v1 ship-line. The discussion explicitly rejected eviction-banner refinement, Goals-form polish, and TodayScreen empty-state copy — three things that would be reasonable to fix but would push Phase 4 from "ship the data-safety closure" to "general v1 polish pass." Defer them. If they bite in real use, post-v1.
- **The export NEVER needs a Dexie transaction.** Read-only, photos are OPFS (Pitfall #1 trap if wrapped). Just `Promise.all` the table reads then iterate OPFS reads — strictly outside any transaction.
- **Filename uses local-day, not UTC-day.** Pitfall #4. `healthtracker-2026-04-21.json` for an export taken at 11:30pm PT on April 21 must say `2026-04-21`, not `2026-04-22`. Use `lib/dayKey.ts:todayKey()`.
- **Skip-with-warning on per-photo failure (D-10) is the right tradeoff for a personal tool.** Failing the whole export on one corrupt photo would mean: user takes a bad photo a year ago, never knows, and one day every backup attempt blocks. Skip-and-warn keeps the user backed up.
- **iOS apple-* meta tags (D-14) are the highest-ROI polish.** Three lines of HTML that meaningfully improve how the standalone PWA feels on iPhone (no more browser-chrome bleed, native-style status bar) — for the user's primary device.
- **`id: '/'` in manifest (D-15) is the kind of future-proofing that costs nothing now and avoids identity drift if the deploy URL ever changes.** Worth including even though it's invisible day-to-day.

</specifics>

<deferred>
## Deferred Ideas

- **Import / restore (BACK-03).** Hard v2. Phase 4 ships export-only; importer is its own phase when v2 starts. The export envelope's `schemaVersion` field is the v2 importer's main contract.
- **Weekly auto-export prompt / notification (BACK-04).** v2. Phase 4's 14-day stale text is *passive surfacing* — it appears when the user happens to open Settings. A notification system is a categorically different feature.
- **Day-detail "Export now" contextual cue.** Considered + rejected during this discussion (D-07). The Settings nudge handles motivation. Don't revisit unless real-use feedback shows the Settings nudge is missed.
- **Toast / snackbar primitive.** Phase 2 deferred this; Phase 4 also doesn't need it (D-03 inline-text, D-09 spinner, D-11 inline error all avoid toasts). Keep deferred.
- **Eviction-banner refinement (4-day trigger, copy).** Considered + rejected as polish creep (§D-08 ceiling). Eviction banner ships as-is from Phase 1.
- **Goals-form validation polish (zero-as-sentinel UX).** Phase 2 D-16. Considered + rejected as polish creep. Defer.
- **TodayScreen empty-state copy refinement.** Considered + rejected as polish creep. Defer.
- **iOS launch splash screens.** D-13 explicit reject. ROI doesn't justify the asset maintenance for a solo PWA against a dark theme.
- **Manifest `screenshots` array.** D-15 rejected variant. Useful for app-store/install-prompt rendering on public apps; overkill for solo use.
- **Determinate progress bar during export.** D-09 rejected variant. Library size doesn't justify.
- **Pre-flight envelope size estimate.** D-12 rejected variant. Will not realistically fire.
- **Encrypting the export JSON.** Out of scope. Personal data, single device, single user, manual file management. Adds cryptographic complexity for no realistic threat (the device storage already isn't encrypted at the IDB layer).
- **Cloud-backup hooks (Dropbox / iCloud Drive auto-save).** Out of scope per REQUIREMENTS Out-of-Scope (cloud sync). User saves the JSON wherever they want via the iOS share-sheet downstream of `<a download>`.
- **Streak-related polish beyond WR-01/02.** Phase 3 verified architecturally; only the midnight-rollover bug is fixed in Phase 4.
- **"Undo" affordance for destructive day-detail actions.** D-06 rejected variant in favor of confirm-then-delete. Revisit only if confirm-fatigue surfaces in real use.

### Reviewed Todos (not folded)
None — `gsd-sdk query todo.match-phase 4` returned zero matches.

</deferred>

---

*Phase: 04-backup-polish*
*Context gathered: 2026-04-21*
