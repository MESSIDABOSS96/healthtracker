// src/features/closure/hooks.ts
// Reactive closure reads. One useLiveQuery per consumer, never per day cell.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getClosureForDay,
  getClosureForRange,
  getCurrentClosureStreak,
  type DayClosure,
} from '@/services/closure.svc';

export function useDayClosure(dayKey: string): DayClosure | undefined {
  return useLiveQuery(() => getClosureForDay(dayKey), [dayKey]);
}

export function useClosureStreak(todayKey: string): number | undefined {
  return useLiveQuery(() => getCurrentClosureStreak(todayKey), [todayKey]);
}

export function useClosureRange(startKey: string, endKey: string) {
  return useLiveQuery(() => getClosureForRange(startKey, endKey), [startKey, endKey]);
}
