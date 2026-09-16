// src/lib/dayRoutes.ts
// Where a given day lives in the router. Today is /daily (the tab), every other
// day is /day/:dayKey — one URL per day, so the grid, the day arrows and deep
// links all agree. Kept out of any component file so the dashboard chunk can
// link to a day without pulling the day-navigation UI in with it.

import { addDays } from './dayKey';

/**
 * How far forward you can go. Forward used to stop dead at today, on the
 * reasoning that the app records what happened and nothing has happened
 * tomorrow. But food is the one thing people decide BEFORE they eat it —
 * meal prep, a menu read the night before, a day you already know the shape of
 * — and with no way to reach tomorrow the only workaround was to remember it
 * and retype it in the morning, which is exactly the friction this app exists
 * to remove.
 *
 * It is a horizon rather than an open gate because the forward arrow has to
 * stop somewhere: an arrow that never disables invites stepping into 2031, and
 * the disabled state is the only thing on screen that says where the app's
 * world ends. A week is the span a plan is actually made over.
 */
export const PLAN_AHEAD_DAYS = 7;

/** The last day you're allowed to plan — today + the horizon. */
export function planHorizonKey(todayKey: string): string {
  return addDays(todayKey, PLAN_AHEAD_DAYS);
}

/** Is this a day the app will open at all? Past and today always; future only
 *  inside the planning horizon. Deep links are checked against this too, so a
 *  hand-typed /day/2031-01-01 can't wander off the end. */
export function isReachableDay(dayKey: string, todayKey: string): boolean {
  return dayKey <= planHorizonKey(todayKey);
}

/** A day that hasn't happened yet: logged food there is a plan, not a record. */
export function isFutureDay(dayKey: string, todayKey: string): boolean {
  return dayKey > todayKey;
}

export function dayPath(dayKey: string, todayKey: string): string {
  return dayKey === todayKey ? '/daily' : `/day/${dayKey}`;
}

/**
 * Where stepping `delta` days lands — or null when that's past the planning
 * horizon. The arrows and the swipe gesture both ask this rather than each
 * deciding for themselves; a swipe that could reach a day the arrow won't would
 * be the same screen disagreeing with itself.
 */
export function stepDayPath(dayKey: string, todayKey: string, delta: number): string | null {
  const next = addDays(dayKey, delta);
  if (!isReachableDay(next, todayKey)) return null;
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
