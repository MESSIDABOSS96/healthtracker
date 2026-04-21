// src/db/db.ts
import Dexie, { type Table } from 'dexie';
import type {
  PTTemplate,
  PTSession,
  Food,
  MealEntry,
  StepEntry,
  LiftCheckin,
  Goals,
} from './schema';

/* =========================================================================
 * SCHEMA VERSION HISTORY — APPEND-ONLY. NEVER EDIT A SHIPPED VERSION BLOCK.
 * =========================================================================
 *   v1 (2026-04): Initial schema — 7 stores.
 *     ptTemplates  (id PK, name idx, createdAt idx)
 *     ptSessions   (id PK, dayKey idx, templateId idx, loggedAt idx)
 *     foods        (id PK, name idx, createdAt idx)
 *     mealEntries  (id PK, dayKey idx, foodId idx, loggedAt idx)
 *     stepEntries  (dayKey PK — natural key, one record per day)
 *     liftCheckins (dayKey PK — natural key, one record per day)
 *     goals        (id PK — singleton: id === 'singleton')
 *
 * Future migrations MUST add this.version(N+1).stores({...}).upgrade(tx => {...})
 * — never mutate an earlier version block. See .planning/research/PITFALLS.md
 * §Pitfall 2 for the rationale and failure mode.
 * =========================================================================
 *
 * TRANSACTION RULE (Pitfall #1): Inside db.transaction('rw', tables, async () => {...})
 * every `await` must be a Dexie call. A non-IDB await (fetch, setTimeout, IndexedDB
 * OPFS call, etc.) causes IDB to auto-commit and drop subsequent writes silently.
 * CORRECT:
 *   await db.transaction('rw', db.foods, async () => {
 *     const f = await db.foods.get(id);           // Dexie — OK
 *     await db.foods.put({ ...f, name: 'new' });  // Dexie — OK
 *   });
 * FORBIDDEN (silent data loss):
 *   await db.transaction('rw', db.foods, async () => {
 *     const resp = await fetch('/x');             // ← non-IDB — txn auto-commits here
 *     await db.foods.put(...);                    // ← throws or no-ops
 *   });
 * ========================================================================= */

export class HealthTrackerDB extends Dexie {
  ptTemplates!: Table<PTTemplate, string>;
  ptSessions!: Table<PTSession, string>;
  foods!: Table<Food, string>;
  mealEntries!: Table<MealEntry, string>;
  stepEntries!: Table<StepEntry, string>;
  liftCheckins!: Table<LiftCheckin, string>;
  goals!: Table<Goals, string>;

  constructor() {
    super('HealthTrackerDB');
    this.version(1).stores({
      'ptTemplates':  'id, name, createdAt',
      'ptSessions':   'id, dayKey, templateId, loggedAt',
      'foods':        'id, name, createdAt',
      'mealEntries':  'id, dayKey, foodId, loggedAt',
      'stepEntries':  'dayKey',
      'liftCheckins': 'dayKey',
      'goals':        'id',
    });
  }
}

export const db = new HealthTrackerDB();
