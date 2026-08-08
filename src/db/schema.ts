// src/db/schema.ts
//
// TypeScript record interfaces for all HealthTracker object stores.
// v2 (2026-08): adds DailyCheckin (lift/cardio), WeightEntry, and auto-library
// fields on Food. PT and steps are retired features — their v1 types remain only
// because the v1 stores stay declared in Dexie (append-only migrations).
//
// Pitfall #6 (CLAUDE.md rule): Food.photoKey is a string filename reference into OPFS,
// NEVER an inline Blob. The actual photo bytes live in OPFS via src/lib/photoStore.ts.

// ---------------------------------------------------------------------------
// RETIRED v1 types — stores still exist in IndexedDB (orphaned, untouched).
// No v2 code reads or writes these outside the db class declaration.
// ---------------------------------------------------------------------------

export interface PTTemplate {
  id: string;
  name: string;
  exercises: Array<{
    name: string;
    targetSets?: number;
    targetReps?: number;
    targetDurationSec?: number;
    description?: string;
  }>;
  createdAt: number;
}

export interface PTSession {
  id: string;
  dayKey: string;
  templateId: string;
  loggedAt: number;
  exercises: Array<{
    name: string;
    actualSets?: number;
    actualReps?: number;
    actualDurationSec?: number;
    completed: boolean;
  }>;
  painRating?: number;
  notes?: string;
}

export interface StepEntry {
  dayKey: string;
  count: number;
  loggedAt: number;
}

/** v1 store — migrated into dailyCheckins by the version(2) upgrade. */
export interface LiftCheckin {
  dayKey: string;
  lifted: boolean;
  note?: string;
  loggedAt: number;
}

// ---------------------------------------------------------------------------
// Active v2 types
// ---------------------------------------------------------------------------

export type ParseSource = 'ai' | 'local' | 'legacy';

export interface Food {
  id: string; // uuid
  name: string;
  /** Dedupe key for the auto-library: lowercased/trimmed/collapsed name. Exact match only. */
  normalizedName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string; // e.g. "1 cup", "100g", "1 bar"
  /** Structured serving, when known (parsed entries). e.g. 100 + 'g'. */
  servingQty?: number;
  servingUnit?: string;
  /** How this item entered the library. 'legacy' = v1 manual creation. */
  parseSource?: ParseSource;
  usageCount: number; // times logged — drives Frequent surfacing
  lastUsedAt: number; // epoch ms — drives Recent surfacing
  photoKey?: string; // filename in OPFS — NEVER a Blob (Pitfall #6)
  createdAt: number;
}

export type MealBucket = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string; // uuid
  dayKey: string; // YYYY-MM-DD (local) — MUST come from lib/dayKey.ts
  foodId: string; // FK → Food.id
  servings: number;
  bucket: MealBucket;
  loggedAt: number;
  // Denormalized totals — no runtime joins for day totals
  computedCalories: number;
  computedProteinG: number;
  computedCarbsG: number;
  computedFatG: number;
}

export type CheckinKind = 'lift' | 'cardio';
/** 'manual' today; 'hevy' reserved for a future Hevy API sync writer. */
export type CheckinSource = 'manual' | 'hevy';

/**
 * One row per (dayKey, kind). Row existence = checked off; un-checking deletes the row.
 * Compound primary key [dayKey+kind]; secondary dayKey index for range queries.
 */
export interface DailyCheckin {
  dayKey: string;
  kind: CheckinKind;
  source: CheckinSource;
  loggedAt: number;
}

export type WeightUnit = 'lb' | 'kg';

/** One row per day (dayKey PK). Weight stored as entered, in the app-wide unit. */
export interface WeightEntry {
  dayKey: string;
  weight: number;
  loggedAt: number;
}

export interface Goals {
  id: string; // 'singleton'
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** v1 field — retired with steps tracking; kept optional for legacy rows. */
  steps?: number;
  weightUnit?: WeightUnit; // default 'lb'
  updatedAt: number;
}
