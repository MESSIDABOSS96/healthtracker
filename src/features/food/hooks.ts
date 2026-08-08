// src/features/food/hooks.ts
// useLiveQuery wrappers around meals.svc / food library. Parameterized by
// dayKey so DailyScreen (today) and DayDetail (past days) share components.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getTodayEntries,
  getDailyTotals,
  getRecentFoods,
  getFrequentFoods,
  getLastServingsForFood,
} from '@/services/meals.svc';
import { db } from '@/db/db';

export function useEntriesForDay(dayKey: string) {
  return useLiveQuery(() => getTodayEntries(dayKey), [dayKey]);
}

export function useDailyTotals(dayKey: string) {
  return useLiveQuery(() => getDailyTotals(dayKey), [dayKey]);
}

export function useRecentFoods() {
  return useLiveQuery(() => getRecentFoods(10), []);
}

export function useFrequentFoods() {
  return useLiveQuery(() => getFrequentFoods(8), []);
}

export function useAllFoods() {
  return useLiveQuery(() => db.foods.orderBy('name').toArray(), []);
}

export function useLastServingsForFood(foodId: string) {
  return useLiveQuery(() => getLastServingsForFood(foodId), [foodId]);
}
