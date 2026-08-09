// src/services/import.svc.ts
// Restore from a v2 export envelope. REPLACES existing data (clear + bulkPut).
//
// Rules:
//   - Only the current schemaVersion is accepted; older/newer files are rejected
//     with a clear message rather than half-migrated (the Dexie upgrade path is
//     the only migration engine — import never duplicates it).
//   - Photos (non-IDB OPFS writes) are restored BEFORE the Dexie transaction so
//     no non-IDB await ever lives inside it (Pitfall #1). Orphaned photos from a
//     failed table restore are harmless.

import { db } from '@/db/db';
import { savePhotoAs } from '@/lib/photoStore';
import type { ExportEnvelope } from './export.svc';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

function dataUriToBlob(dataUri: string): Blob {
  const [meta, b64] = dataUri.split(',');
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? 'image/webp';
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export interface ImportSummary {
  foods: number;
  mealEntries: number;
  dailyCheckins: number;
  weightEntries: number;
  photos: number;
}

export async function importAll(json: string): Promise<ImportSummary> {
  let envelope: ExportEnvelope;
  try {
    envelope = JSON.parse(json) as ExportEnvelope;
  } catch {
    throw new ImportError("That file isn't valid JSON.");
  }

  if (typeof envelope !== 'object' || envelope === null || !envelope.data) {
    throw new ImportError("That file doesn't look like a VZN backup.");
  }
  if (envelope.schemaVersion !== db.verno) {
    throw new ImportError(
      `This backup is schema v${envelope.schemaVersion}; the app expects v${db.verno}. ` +
        'Export a fresh backup from the current app version instead.',
    );
  }

  const d = envelope.data;
  const arrays = [
    d.foods, d.mealEntries, d.dailyCheckins, d.weightEntries, d.goals,
    d.longTermGoals, d.ptTemplates, d.ptSessions, d.stepEntries, d.liftCheckins,
  ];
  if (arrays.some(a => !Array.isArray(a))) {
    throw new ImportError('Backup file is missing expected data sections.');
  }

  // Step 1 — OPFS photos (non-IDB) BEFORE the Dexie transaction.
  let photoCount = 0;
  for (const [key, dataUri] of Object.entries(envelope.photos ?? {})) {
    try {
      await savePhotoAs(key, dataUriToBlob(dataUri));
      photoCount += 1;
    } catch (err) {
      console.warn(`[import] skipping photo ${key}:`, err);
    }
  }

  // Step 2 — Atomic table restore. Every await inside is a Dexie call.
  await db.transaction(
    'rw',
    [
      db.foods, db.mealEntries, db.dailyCheckins, db.weightEntries, db.goals,
      db.longTermGoals, db.ptTemplates, db.ptSessions, db.stepEntries, db.liftCheckins,
    ],
    async () => {
      await Promise.all([
        db.foods.clear(), db.mealEntries.clear(), db.dailyCheckins.clear(),
        db.weightEntries.clear(), db.goals.clear(), db.longTermGoals.clear(),
        db.ptTemplates.clear(), db.ptSessions.clear(), db.stepEntries.clear(),
        db.liftCheckins.clear(),
      ]);
      await Promise.all([
        db.foods.bulkPut(d.foods),
        db.mealEntries.bulkPut(d.mealEntries),
        db.dailyCheckins.bulkPut(d.dailyCheckins),
        db.weightEntries.bulkPut(d.weightEntries),
        db.goals.bulkPut(d.goals),
        db.longTermGoals.bulkPut(d.longTermGoals),
        db.ptTemplates.bulkPut(d.ptTemplates),
        db.ptSessions.bulkPut(d.ptSessions),
        db.stepEntries.bulkPut(d.stepEntries),
        db.liftCheckins.bulkPut(d.liftCheckins),
      ]);
    },
  );

  return {
    foods: d.foods.length,
    mealEntries: d.mealEntries.length,
    dailyCheckins: d.dailyCheckins.length,
    weightEntries: d.weightEntries.length,
    photos: photoCount,
  };
}
