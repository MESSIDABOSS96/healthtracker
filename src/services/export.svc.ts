// src/services/export.svc.ts
// v2 backup export. Envelope covers every Dexie store — active v2 stores plus
// the orphaned v1 stores (pt/steps/liftCheckins), so a backup is always a
// complete copy of the database — and OPFS photos as data URIs.
//
// The Anthropic API key deliberately CANNOT appear here: it lives in
// localStorage (lib/apiKey.ts) and this service reads Dexie tables only.
//
// Pitfall guards:
//   #1 (IDB auto-commit): NO transaction wrapper — the OPFS loop awaits non-IDB
//      promises, which would auto-commit any surrounding Dexie transaction.
//   #4 (UTC dayKey bug): filename dayKeys come from lib/dayKey.ts in the caller.

import { db } from '@/db/db';
import { loadPhoto } from '@/lib/photoStore';
import { APP_VERSION } from '@/lib/version';
import type {
  PTTemplate, PTSession, Food, MealEntry, StepEntry, LiftCheckin,
  DailyCheckin, WeightEntry, Goals,
} from '@/db/schema';

export interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: {
    foods: Food[];
    mealEntries: MealEntry[];
    dailyCheckins: DailyCheckin[];
    weightEntries: WeightEntry[];
    goals: Goals[];
    // Orphaned v1 stores — carried in backups for completeness.
    ptTemplates: PTTemplate[];
    ptSessions: PTSession[];
    stepEntries: StepEntry[];
    liftCheckins: LiftCheckin[];
  };
  photos: Record<string, string>;
}

export interface ExportResult {
  json: string;
  warnings: { skippedPhotos: string[] };
}

async function blobToBase64(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

export async function exportAll(): Promise<ExportResult> {
  const [
    foods, mealEntries, dailyCheckins, weightEntries, goals,
    ptTemplates, ptSessions, stepEntries, liftCheckins,
  ] = await Promise.all([
    db.foods.toArray(),
    db.mealEntries.toArray(),
    db.dailyCheckins.toArray(),
    db.weightEntries.toArray(),
    db.goals.toArray(),
    db.ptTemplates.toArray(),
    db.ptSessions.toArray(),
    db.stepEntries.toArray(),
    db.liftCheckins.toArray(),
  ]);

  // OPFS photo loop — sequential (iOS Safari parallel-read flakiness), per-photo
  // failure skips + warns, never aborts the export.
  const photos: Record<string, string> = {};
  const skippedPhotos: string[] = [];
  for (const food of foods) {
    if (!food.photoKey) continue;
    try {
      const blob = await loadPhoto(food.photoKey);
      photos[food.photoKey] = await blobToBase64(blob);
    } catch (err) {
      console.warn(`[export] skipping photo ${food.photoKey}:`, err);
      skippedPhotos.push(food.photoKey);
    }
  }

  const envelope: ExportEnvelope = {
    schemaVersion: db.verno,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      foods, mealEntries, dailyCheckins, weightEntries, goals,
      ptTemplates, ptSessions, stepEntries, liftCheckins,
    },
    photos,
  };

  return { json: JSON.stringify(envelope), warnings: { skippedPhotos } };
}
