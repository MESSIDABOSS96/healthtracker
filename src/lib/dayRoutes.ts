// src/lib/dayRoutes.ts
// Where a given day lives in the router. Today is /daily (the tab), every other
// day is /day/:dayKey — one URL per day, so the grid, the day arrows and deep
// links all agree. Kept out of any component file so the dashboard chunk can
// link to a day without pulling the day-navigation UI in with it.

import { addDays } from './dayKey';

export function dayPath(dayKey: string, todayKey: string): string {
  return dayKey === todayKey ? '/daily' : `/day/${dayKey}`;
}

/**
 * Where stepping `delta` days lands — or null when that's the future, which is
 * the one direction the app refuses to go. The arrows and the swipe gesture
 * both ask this rather than each deciding for themselves; a swipe that could
 * reach a day the arrow won't would be the same screen disagreeing with itself.
 */
export function stepDayPath(dayKey: string, todayKey: string, delta: number): string | null {
  const next = addDays(dayKey, delta);
  if (next > todayKey) return null;
  return dayPath(next, todayKey);
}

/**
 * Carried in history state so the arriving day knows which way it came from and
 * can enter from that side. Deliberately not component state: /daily and
 * /day/:key are different route components, so today → yesterday REMOUNTS, and
 * anything held in a ref is born empty on the most common step of all.
 */
export interface DayNavState {
  /** +1 = moved forward in time, -1 = back. */
  dir: -1 | 1;
}
