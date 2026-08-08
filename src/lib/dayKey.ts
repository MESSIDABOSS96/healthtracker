// src/lib/dayKey.ts
// Single source of truth for day-identity across all stores.
// MUST use local Date getters (year/month/day) — never the UTC ISO-formatting
// path — to avoid UTC-drift on western timezones at night (see
// .planning/research/PITFALLS.md §Pitfall 4 and CLAUDE.md rule #3).
//
// The forbidden one-liner that flips a 23:30 UTC-5 timestamp to "tomorrow" is
// documented in PITFALLS.md §Pitfall 4 — read that before editing this file.

import type { MealBucket } from '@/db/schema';

export function todayKey(): string {
  return dateToKey(new Date());
}

export function dateToKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function keyToDate(key: string): Date {
  // Parse components as local — direct ISO-date parsing would produce UTC midnight.
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Step a dayKey by whole days (negative = backward), staying in local time. */
export function addDays(key: string, days: number): string {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return dateToKey(date);
}

/**
 * Infer meal bucket from local time per CONTEXT.md D-08.
 * breakfast < 11:00, lunch < 15:00, dinner < 21:00, snack otherwise.
 * Uses local getHours() — not the UTC hour variant — same reason dayKey uses local getters (Pitfall #4).
 */
export function inferBucket(date: Date = new Date()): MealBucket {
  const h = date.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
