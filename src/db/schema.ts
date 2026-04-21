// src/db/schema.ts
//
// TypeScript record interfaces for all 7 HealthTracker object stores.
// These shapes are the contract Phase 2 services and feature components consume.
// Field names/types are derived from .planning/research/ARCHITECTURE.md
// §"Object Store Schema" — keep this file as the single source of truth.
//
// Pitfall #6 (CLAUDE.md rule): Food.photoKey is a string filename reference into OPFS,
// NEVER an inline Blob. The actual photo bytes live in OPFS via src/lib/photoStore.ts.

export interface PTTemplate {
  id: string; // uuid
  name: string;
  exercises: Array<{
    name: string;
    targetSets?: number;
    targetReps?: number;
    targetDurationSec?: number;
    description?: string;
  }>;
  createdAt: number; // epoch ms
}

export interface PTSession {
  id: string; // uuid
  dayKey: string; // YYYY-MM-DD (local) — MUST come from lib/dayKey.ts
  templateId: string; // FK → PTTemplate.id
  loggedAt: number; // epoch ms
  exercises: Array<{
    name: string;
    actualSets?: number;
    actualReps?: number;
    actualDurationSec?: number;
    completed: boolean;
  }>;
  painRating?: number; // 0..5
  notes?: string;
}

export interface Food {
  id: string; // uuid
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingLabel: string; // e.g. "1 cup", "100g"
  photoKey?: string; // filename in OPFS (food-<uuid>.webp) — NEVER a Blob (Pitfall #6)
  createdAt: number;
}

export type MealBucket = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealEntry {
  id: string; // uuid
  dayKey: string; // YYYY-MM-DD (local)
  foodId: string; // FK → Food.id
  servings: number;
  bucket: MealBucket;
  loggedAt: number;
  // Denormalized totals (FOOD-06 — no runtime joins for day totals)
  computedCalories: number;
  computedProteinG: number;
  computedCarbsG: number;
  computedFatG: number;
}

export interface StepEntry {
  dayKey: string; // primary key — one record per day
  count: number;
  loggedAt: number;
}

export interface LiftCheckin {
  dayKey: string; // primary key — one record per day
  lifted: boolean;
  note?: string;
  loggedAt: number;
}

export interface Goals {
  id: string; // 'singleton'
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  steps: number;
  updatedAt: number;
}
