// src/services/weight.svc.ts
// Daily body-weight entries (one per dayKey, upsert semantics) + EMA trend math.
// Weight is stored as entered, in the app-wide unit from Goals (default lb).

import { db } from '@/db/db';
import type { WeightEntry } from '@/db/schema';
import { markDeleted, markWritten } from './syncMeta.svc';

export async function upsertWeight(dayKey: string, weight: number): Promise<void> {
  if (!Number.isFinite(weight) || weight <= 0) return;
  const entry: WeightEntry = { dayKey, weight, loggedAt: Date.now() };
  await db.weightEntries.put(entry);
  await markWritten('weightEntries', dayKey);
}

export async function deleteWeight(dayKey: string): Promise<void> {
  await db.weightEntries.delete(dayKey);
  await markDeleted('weightEntries', dayKey);
}

export function getWeight(dayKey: string): Promise<WeightEntry | undefined> {
  return db.weightEntries.get(dayKey);
}

/** All entries ordered by dayKey ascending (dayKey is the PK, so orderBy is free). */
export function getAllWeights(): Promise<WeightEntry[]> {
  return db.weightEntries.orderBy('dayKey').toArray();
}

export function getWeightsInRange(startKey: string, endKey: string): Promise<WeightEntry[]> {
  return db.weightEntries.where('dayKey').between(startKey, endKey, true, true).toArray();
}

/**
 * Exponential moving average over entries sorted by dayKey ascending.
 * alpha 0.12 ≈ Happy-Scale-style smoothing without configurability (deliberate).
 * Gaps between weigh-ins are fine — EMA steps per entry, not per calendar day.
 */
export function computeEma(
  entries: WeightEntry[],
  alpha = 0.12,
): Array<{ dayKey: string; weight: number; ema: number }> {
  let ema: number | null = null;
  return entries.map(e => {
    ema = ema === null ? e.weight : alpha * e.weight + (1 - alpha) * ema;
    return { dayKey: e.dayKey, weight: e.weight, ema: Math.round(ema * 100) / 100 };
  });
}
