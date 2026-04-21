// src/features/steps/hooks.ts
// Populated by Plan 02-05 — useLiveQuery wrapper around steps.svc.getStepsForDay(todayKey()).
// Re-fires automatically on any put/delete in the stepEntries store, delivering STEPS-02
// cross-screen reactivity (Settings → Today bar updates without reload).

import { useLiveQuery } from 'dexie-react-hooks';
import { getStepsForDay } from '@/services/steps.svc';
import { todayKey } from '@/lib/dayKey';

export function useStepsForDay() {
  return useLiveQuery(() => getStepsForDay(todayKey()), []);
}
