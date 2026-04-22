// src/services/export.svc.ts
// Phase 4 data-export service. BACK-01 envelope shape + BACK-02 `<a download>` consumer.
// Read-only aggregate across all 7 Dexie stores + OPFS photo loop.
//
// Pitfall guards:
//   #1 (IDB auto-commit): NO transaction wrapper — all awaits are Dexie reads,
//      AND the OPFS loop does a non-IDB await that would trigger auto-commit inside
//      a transaction block. Export is strictly read-only; a personal single-user
//      backup has no snapshot-isolation requirement.
//   #4 (UTC dayKey bug): Caller (SettingsScreen/ExportCard) constructs the filename
//      via lib/dayKey.ts:todayKey(). This service exposes no dayKey derivation.
//   #6 (photos in OPFS): photoStore.loadPhoto() is the canonical OPFS read. Never
//      read raw Dexie blobs.
//
// Assumption (RESEARCH §Assumptions A1, A2): records contain only strings/numbers/
// booleans/simple arrays of same — JSON.stringify is lossless. Expected library
// size <100 photos × ~100KB = ~10MB envelope; fits in-memory on all target
// iOS 18+ / Android devices.

import { db } from '@/db/db';
import { loadPhoto } from '@/lib/photoStore';
import { APP_VERSION } from '@/lib/version';
import type {
  PTTemplate, PTSession, Food, MealEntry,
  StepEntry, LiftCheckin, Goals,
} from '@/db/schema';

interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    ptTemplates: PTTemplate[];
    ptSessions: PTSession[];
    foods: Food[];
    mealEntries: MealEntry[];
    stepEntries: StepEntry[];
    liftCheckins: LiftCheckin[];
    goals: Goals[];
  };
  photos: Record<string, string>;
}

export interface ExportResult {
  json: string;
  warnings: { skippedPhotos: string[] };
}

// Blob → `data:image/webp;base64,...` dataURI. Inline per RESEARCH Open Q #3
// (8 lines, single consumer — don't extract until a second caller appears).
// readAsDataURL over manual btoa+String.fromCharCode — no stack-overflow risk
// at arbitrary blob size. [CITED: MDN FileReader.readAsDataURL]
async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function exportAll(): Promise<ExportResult> {
  // Step 1 — Bulk Dexie read. Parallel, no transaction wrapper (Pitfall #1 guard).
  // Enumerated form (not db.tables.map) so each array keeps its narrow type.
  const [
    ptTemplates, ptSessions, foods, mealEntries,
    stepEntries, liftCheckins, goals,
  ] = await Promise.all([
    db.ptTemplates.toArray(),
    db.ptSessions.toArray(),
    db.foods.toArray(),
    db.mealEntries.toArray(),
    db.stepEntries.toArray(),
    db.liftCheckins.toArray(),
    db.goals.toArray(),
  ]);

  // Step 2 — OPFS photo read loop. SEQUENTIAL (iOS Safari OPFS parallel-read
  // flakiness per CONTEXT Claude's Discretion). Expected <50 photos; this is
  // not a hot path. Per-photo failure = skip + console.warn (D-10). Never
  // aborts the whole export.
  const photos: Record<string, string> = {};
  const skippedPhotos: string[] = [];

  for (const food of foods) {
    if (!food.photoKey) continue;
    try {
      const blob = await loadPhoto(food.photoKey);
      photos[food.photoKey] = await blobToBase64(blob);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[export] skipping photo ${food.photoKey}:`, err);
      skippedPhotos.push(food.photoKey);
    }
  }

  // Step 3 — Build envelope. exportedAt is UTC ISO (metadata, not a dayKey).
  const envelope: ExportEnvelope = {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: { ptTemplates, ptSessions, foods, mealEntries, stepEntries, liftCheckins, goals },
    photos,
  };

  return {
    json: JSON.stringify(envelope),
    warnings: { skippedPhotos },
  };
}
