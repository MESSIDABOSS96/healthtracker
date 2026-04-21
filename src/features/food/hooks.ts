// src/features/food/hooks.ts
// Plan 02-03 (food slice) — useLiveQuery wrappers around meals.svc / food.svc.
// Each hook re-fires when its backing store mutates (any put/delete in mealEntries
// or foods), driving FOOD-07 live-totals reactivity and the picker / chip rows.
//
// Note: useAllFoods is the ONE place in the feature layer that touches `db` directly
// (for orderBy queries the meals service doesn't expose). Acceptable here because
// hooks.ts is already a reactive-read layer, not a UI component. Other features
// should stick to service functions only.

import { useLiveQuery } from 'dexie-react-hooks';
import {
  getTodayEntries,
  getDailyTotals,
  getRecentFoods,
  getFrequentFoods,
  getLastServingsForFood,
} from '@/services/meals.svc';
import { db } from '@/db/db';
import { todayKey } from '@/lib/dayKey';

export function useTodayEntries() {
  return useLiveQuery(() => getTodayEntries(todayKey()), []);
}

export function useDailyTotals() {
  return useLiveQuery(() => getDailyTotals(todayKey()), []);
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
