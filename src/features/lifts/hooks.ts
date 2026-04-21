// src/features/lifts/hooks.ts
// Populated by Plan 02-05 — useLiveQuery wrapper around lifts.svc.getLiftForDay(todayKey()).
// Re-fires automatically on any put/delete in the liftCheckins store, so the ☐ ⇄ ✓ glyph
// in the Lift card reflects toggle state instantly without a reload.

import { useLiveQuery } from 'dexie-react-hooks';
import { getLiftForDay } from '@/services/lifts.svc';
import { todayKey } from '@/lib/dayKey';

export function useLiftForDay() {
  return useLiveQuery(() => getLiftForDay(todayKey()), []);
}
