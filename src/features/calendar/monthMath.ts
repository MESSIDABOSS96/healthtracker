// src/features/calendar/monthMath.ts
// Month-grid date math for the 42-cell calendar window (6 weeks × 7 days).
// EVERY Date→string conversion MUST route through src/lib/dayKey.ts — never the
// UTC ISO-formatting path, never hand-built dayKeys (Pitfall #4 / CLAUDE.md #3).
// This module is pure (no Dexie, no React, no side effects).

import { dateToKey } from '@/lib/dayKey';

export function firstOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1);
}

export function lastOfMonth(year: number, month0: number): Date {
  // Day 0 of next month === last day of this month. No DST wrap risk (day arithmetic, not hour).
  return new Date(year, month0 + 1, 0);
}

export function sundayOnOrBefore(d: Date): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay()); // getDay(): Sun=0..Sat=6
  return copy;
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export interface MonthCell {
  dayKey: string;
  inMonth: boolean;
}

export interface MonthRange {
  startKey: string;
  endKey: string;
  cells: MonthCell[];
}

/**
 * Compute the 42-cell month-grid window anchored at the Sunday on-or-before the
 * 1st of (year, month0). Returns startKey/endKey (inclusive bounds) for the
 * Dexie range query AND a 42-element cells array, each cell flagged inMonth.
 *
 * month0 is a JS month index: Jan=0..Dec=11 (matches Date.getMonth()).
 */
export function monthRangeKeys(year: number, month0: number): MonthRange {
  const first = firstOfMonth(year, month0);
  const gridStart = sundayOnOrBefore(first);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    cells.push({ dayKey: dateToKey(d), inMonth: d.getMonth() === month0 });
  }
  return { startKey: cells[0].dayKey, endKey: cells[41].dayKey, cells };
}
