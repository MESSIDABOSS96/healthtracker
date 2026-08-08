---
phase: 04-backup-polish
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/services/export.svc.ts
  - src/features/settings/ExportCard.tsx
  - src/lib/storageKeys.ts
  - src/routes/SettingsScreen.tsx
  - src/lib/useDayKey.ts
  - src/features/calendar/hooks.ts
  - src/features/calendar/StreakCount.tsx
  - src/components/ui/confirm-dialog.tsx
  - src/features/calendar/DayDetail.tsx
  - vite.config.ts
  - index.html
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 4 delivers the export service, midnight-rollover hook, confirm dialog, and manifest/meta polish. The six project-breaking pitfall rules are all respected: no `await` of non-IDB promises inside Dexie transactions, no `toISOString().split('T')[0]` day-key derivation, OPFS reads go through `loadPhoto()`, and the export filename uses `todayKey()` from `lib/dayKey.ts`. The `useDayKey` timer cleanup is correct and the dep array `[key]` correctly reschedules on each midnight fire.

Three warnings require attention before shipping: a synchronous-throw bug in `ConfirmDialog.onConfirm`, inconsistent absence of confirm dialogs on PT-session and Steps delete buttons in `DayDetail`, and relative `start_url`/`scope` values in the PWA manifest that can break identity on some browsers. Two info items cover minor code-quality points.

## Warnings

### WR-01: ConfirmDialog confirm button — dialog never closes if onConfirm throws synchronously

**File:** `src/components/ui/confirm-dialog.tsx:79-82`

**Issue:** The confirm button handler calls `onConfirm()` first, then `onOpenChange(false)`. If `onConfirm` throws synchronously (e.g., the caller passes a function that calls a service that throws immediately), the `onOpenChange(false)` call is never reached. The dialog stays open in an inconsistent state — the user sees a frozen modal with no way to dismiss it (click-outside is not available on `Dialog` without extra config; ESC would still work via Radix, but the confirm button path is broken).

**Fix:** Wrap both calls in a try/finally to guarantee the dialog closes regardless of `onConfirm` outcome:

```tsx
onClick={() => {
  try {
    onConfirm();
  } finally {
    onOpenChange(false);
  }
}}
```

If the caller needs async `onConfirm` support in the future, the signature should change to `onConfirm: () => void | Promise<void>` with an `await` inside an async handler, still guarded by try/finally.

---

### WR-02: DayDetail PT-session and Steps delete buttons fire without confirmation

**File:** `src/features/calendar/DayDetail.tsx:120-125` and `src/features/calendar/DayDetail.tsx:192-199`

**Issue:** The Lift "Delete" button correctly goes through `ConfirmDialog` (D-06). The PT-session "Delete" button calls `deleteSession(s.id)` directly on click — no confirm step. The Steps "Delete" button calls `deleteSteps(dayKey)` directly on click. Both deletions are permanent and affect streak state. A past-day PT session or steps entry deleted by misclick cannot be recovered. The inconsistency also confuses users: two of three destructive actions silently delete, one does not.

**Fix:** Add a confirm-dialog state for each, mirroring the existing Lift pattern:

```tsx
// For PT sessions (one confirm per session or a single shared state keyed by session id):
const [confirmDeleteSession, setConfirmDeleteSession] = useState<string | undefined>(undefined);

// Delete button:
onClick={() => setConfirmDeleteSession(s.id)}

// Dialog (placed alongside the existing Lift ConfirmDialog):
<ConfirmDialog
  open={confirmDeleteSession !== undefined}
  onOpenChange={(open) => { if (!open) setConfirmDeleteSession(undefined); }}
  title="Remove PT session?"
  body="This will permanently delete the PT session and all its exercises."
  confirmLabel="Remove"
  destructive
  onConfirm={() => { if (confirmDeleteSession) void deleteSession(confirmDeleteSession); }}
/>
```

Apply the same pattern for Steps (simpler — single entry per day, so a boolean flag suffices).

---

### WR-03: PWA manifest uses relative start_url and scope — may break PWA identity on some browsers

**File:** `vite.config.ts:50-51`

**Issue:** `start_url: '.'` and `scope: '.'` are relative URLs. The W3C Web App Manifest spec resolves relative values against the manifest URL, which works in Chrome/Edge. However, some browsers (older Chromium forks, some Android WebViews) resolve relative values differently, leading to identity mismatches. The `id` field is correctly set to `'/'` (absolute), but Chrome uses `id` to deduplicate installs only in newer versions; older installs rely on `start_url`. Mixing absolute `id` with relative `start_url` is a latent identity split risk.

**Fix:** Use absolute paths consistent with `id`:

```ts
start_url: '/',
scope: '/',
```

This matches the absolute `id: '/'` and is consistent with the Vite PWA plugin docs recommendation.

---

## Info

### IN-01: ExportCard nudge logic — showStaleNudge can display simultaneously with the skipped-photo confirmation line

**File:** `src/features/settings/ExportCard.tsx:103-106` and `src/features/settings/ExportCard.tsx:110-114`

**Issue:** `showStaleNudge` is derived from `lastExportedAt` being older than 14 days. After a successful export, `lastExportedAt` is set to `Date.now()`, so `isStale` immediately becomes false and `showStaleNudge` clears correctly. However, `skippedCount > 0 && Date.now() - lastExportedAt < 60_000` is the guard for the skipped-photo message. This logic is correct. The one edge case is if the user exports on day 14+, sees the stale nudge, and then the export succeeds — both `nudgeLine` and `lastExportedLine` (skipped-photo variant) would render. This is not a crash, and the stale nudge disappears on the next render since `lastExportedAt` is updated. No code change needed, but worth noting as accepted behavior per D-10/D-11.

---

### IN-02: vite.config.ts hardcodes app version string

**File:** `vite.config.ts:27`

**Issue:** `'import.meta.env.VITE_APP_VERSION'` is set to the string literal `'0.1.0'` in the Vite config rather than reading from `package.json`. This means bumping the version in `package.json` does not automatically update what the app displays — the config must be updated separately. For a solo project this is low risk, but it is a common source of version skew.

**Fix:** Read from `package.json` at build time:

```ts
import pkg from './package.json' with { type: 'json' };
// ...
'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
```

This requires `"resolveJsonModule": true` in `tsconfig.node.json` (usually already set by Vite scaffolding). Alternatively, Vite's built-in `loadEnv` or a simple `fs.readFileSync` + `JSON.parse` call achieves the same result.

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
