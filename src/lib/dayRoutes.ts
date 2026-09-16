// src/lib/dayRoutes.ts
// Where a given day lives in the router. Today is /daily (the tab), every other
// day is /day/:dayKey — one URL per day, so the grid, the day arrows and deep
// links all agree. Kept out of any component file so the dashboard chunk can
// link to a day without pulling the day-navigation UI in with it.
//
// The range is open in BOTH directions. Forward used to stop dead at today, on
// the reasoning that the app records what happened and nothing has happened
// tomorrow. But food is the one thing people decide before they eat it — meal
// prep, a menu read the night before, a day you already know the shape of — and
// with no way to reach tomorrow the only workaround was to remember it and
// retype it in the morning, which is exactly the friction this app exists to
// remove. There is no cap on how far ahead you can go either: a cap is a guess
// at how far ahead someone plans, and being wrong about it shows up as a dead
// arrow with no explanation. An empty day holds nothing and costs nothing.

import { addDays } from './dayKey';

/** A day that hasn't happened yet: logged food there is a plan, not a record. */
export function isFutureDay(dayKey: string, todayKey: string): boolean {
  return dayKey > todayKey;
}

export function dayPath(dayKey: string, todayKey: string): string {
  return dayKey === todayKey ? '/daily' : `/day/${dayKey}`;
}

/**
 * Where stepping `delta` days lands. The arrows and the swipe gesture both ask
 * this rather than each deciding for themselves; a swipe that could reach a day
 * the arrow won't would be the same screen disagreeing with itself.
 */
export function stepDayPath(dayKey: string, todayKey: string, delta: number): string {
  return dayPath(addDays(dayKey, delta), todayKey);
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
