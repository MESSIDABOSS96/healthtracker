// src/features/closure/hooks.ts
// Reactive closure reads. One useLiveQuery per consumer, never per day cell.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getClosureForDay,
  getClosureForRange,
  getCurrentClosureStreak,
  type DayClosure,
} from '@/services/closure.svc';

const EMPTY: DayClosure = { food: false, lift: false, cardio: false, closed: false };

export function useDayClosure(dayKey: string): DayClosure | undefined {
  return useLiveQuery(
    () => getClosureForDay(dayKey).then(m => m.get(dayKey) ?? EMPTY),
    [dayKey],
  );
}

export function useClosureStreak(todayKey: string): number | undefined {
  return useLiveQuery(() => getCurrentClosureStreak(todayKey), [todayKey]);
}

export function useClosureRange(startKey: string, endKey: string) {
  return useLiveQuery(() => getClosureForRange(startKey, endKey), [startKey, endKey]);
}
