// src/features/settings/ExportCard.tsx
// Phase 4 export entry point (D-01 — Settings, between <GoalsForm /> and flex-1 spacer).
// Wires exportAll() to the browser download machinery + localStorage lastExportedAt.
//
// UX decisions (all locked in CONTEXT.md):
//   D-01 — Single entry point in Settings (Card visual match to Install Card).
//   D-02 — Filename `healthtracker-${todayKey()}.json` — LOCAL day via lib/dayKey.ts.
//          NEVER use the UTC-date split pattern (Pitfall #4).
//   D-03 — Post-save confirmation = inline "Last exported: {relative time}" line.
//          No toast, no modal, no Banner — just text inside the Card.
//   D-04 — localStorage `LAST_EXPORTED_KEY` + 14-day stale nudge inline when:
//          (a) never exported AND >=1 row across logging tables, OR
//          (b) lastExportedAt exists AND (now - lastExportedAt) > 14 * 86_400_000.
//   D-09 — Run-state UX = <Loader2 animate-spin /> + "Exporting…" + disabled button.
//   D-10 — Per-photo failure: skip-with-warning. Surface as
//          "Exported (N photo(s) couldn't be saved)" when warnings.skippedPhotos.length > 0.
//   D-11 — Total failure: inline red-tinted text. Button re-enables.
//
// Pitfall 5 (documented in code comment below): lastExportedAt is set after
// exportAll() serializes successfully, NOT after the user confirms the OS save
// dialog. If the user cancels the system download, the Card will still say
// "Last exported: just now" — acceptable quirk, user can re-tap Export.
//
// Pitfall 1 (RESEARCH): setTimeout(revokeObjectURL, 30_000) — synchronous revoke
// after a.click() cancels the download in Firefox / some Chromium versions.

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db } from '@/db/db';
import { todayKey } from '@/lib/dayKey';
import { LAST_EXPORTED_KEY } from '@/lib/storageKeys';
import { exportAll } from '@/services/export.svc';

type ExportState = 'idle' | 'exporting' | 'error';
const STALE_MS = 14 * 86_400_000; // 14 days

/** Relative-time formatter — minimal inline ladder, no Intl dep. */
function formatRelative(ms: number): string {
  const elapsed = Date.now() - ms;
  if (elapsed < 60_000) return 'just now';
  if (elapsed < 3_600_000) {
    const m = Math.round(elapsed / 60_000);
    return `${m} minute${m === 1 ? '' : 's'} ago`;
  }
  if (elapsed < 86_400_000) {
    const h = Math.round(elapsed / 3_600_000);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const d = Math.round(elapsed / 86_400_000);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

function triggerDownload(json: string, dayKey: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `healthtracker-${dayKey}.json`;
  a.click();
  // 30s delay per RESEARCH Pitfall 1 — Mozilla bugzilla 1282407 + Chromium issue 41380177.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function ExportCard() {
  const [state, setState] = useState<ExportState>('idle');
  const [lastExportedAt, setLastExportedAt] = useState<number | null>(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(LAST_EXPORTED_KEY) : null;
    return raw ? Number(raw) : null;
  });
  const [skippedCount, setSkippedCount] = useState<number>(0);

  // D-04 data-exists heuristic — useLiveQuery so nudge appears mid-session after
  // the first log on a fresh install. Four subscriptions on Settings mount is
  // negligible (per RESEARCH Open Q #4). Sum of counts — any nonzero means
  // "user has data worth backing up".
  const rowCount = useLiveQuery(async () => {
    const [a, b, c] = await Promise.all([
      db.mealEntries.count(),
      db.dailyCheckins.count(),
      db.weightEntries.count(),
    ]);
    return a + b + c;
  }, []);

  // Re-sync lastExportedAt from localStorage after every successful export
  // (handled in onExport); this useEffect ensures a cross-tab update also
  // triggers a refresh — cheap belt-and-suspenders.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_EXPORTED_KEY && e.newValue) {
        setLastExportedAt(Number(e.newValue));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const hasData = (rowCount ?? 0) > 0;
  const isStale =
    lastExportedAt !== null && Date.now() - lastExportedAt > STALE_MS;
  const showNeverExportedNudge = lastExportedAt === null && hasData;
  const showStaleNudge = isStale;

  let lastExportedLine: string | null = null;
  if (lastExportedAt !== null) {
    if (skippedCount > 0 && Date.now() - lastExportedAt < 60_000) {
      lastExportedLine = `Exported (${skippedCount} photo${skippedCount === 1 ? '' : 's'} couldn't be saved)`;
    } else {
      lastExportedLine = `Last exported: ${formatRelative(lastExportedAt)}`;
    }
  }

  let nudgeLine: string | null = null;
  if (showNeverExportedNudge) {
    nudgeLine = 'Back up your data';
  } else if (showStaleNudge && lastExportedAt !== null) {
    const days = Math.round((Date.now() - lastExportedAt) / 86_400_000);
    nudgeLine = `Time to back up — last exported ${days} days ago`;
  }

  async function onExport() {
    setState('exporting');
    setSkippedCount(0);
    try {
      const result = await exportAll();
      triggerDownload(result.json, todayKey());
      // Pitfall 5: lastExportedAt reflects "envelope serialized successfully",
      // NOT "user confirmed OS save dialog" — no browser callback exists for
      // the latter. Acceptable quirk; user can re-tap if save was cancelled.
      const now = Date.now();
      localStorage.setItem(LAST_EXPORTED_KEY, String(now));
      setLastExportedAt(now);
      setSkippedCount(result.warnings.skippedPhotos.length);
      setState('idle');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[export] total failure:', err);
      setState('error');
    }
  }

  return (
    <Card className="bg-surface border border-border rounded-lg p-4">
      <h2 className="text-base font-semibold text-text">Export data</h2>
      <p className="text-sm text-muted mt-1">
        Download all your logs as a single JSON file. Keep it somewhere safe — this is your backup.
      </p>
      {lastExportedLine && (
        <p className="text-xs text-muted mt-2">{lastExportedLine}</p>
      )}
      {nudgeLine && (
        <p className="text-xs text-muted mt-1">{nudgeLine}</p>
      )}
      <div className="mt-3">
        <Button
          variant="default"
          disabled={state === 'exporting'}
          onClick={() => {
            void onExport();
          }}
        >
          {state === 'exporting' && <Loader2 className="size-4 animate-spin" />}
          {state === 'exporting' ? 'Exporting…' : 'Export data'}
        </Button>
      </div>
      {state === 'error' && (
        <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>
          Export failed — try again. If it keeps failing, your library may be too large for in-memory encoding.
        </p>
      )}
    </Card>
  );
}
