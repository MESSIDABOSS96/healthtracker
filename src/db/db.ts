// src/db/db.ts
import Dexie, { type Table } from 'dexie';
import type {
  PTTemplate,
  PTSession,
  Food,
  MealEntry,
  StepEntry,
  LiftCheckin,
  DailyCheckin,
  WeightEntry,
  Goals,
  LongTermGoals,
  SyncMeta,
} from './schema';
import { normalizeFoodName } from '@/lib/normalizeFoodName';

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
 *   v3 (2026-08): Long-term goals.
 *     + longTermGoals (id PK — singleton: id === 'singleton')
 *       Goal weight + optional target date + weekly training frequency targets.
 *       Pure additive store; no data transformation, so no upgrade() needed.
 *
 *   v2 (2026-08): Duo redesign.
 *     + weightEntries (dayKey PK — one weigh-in per day)
 *     + dailyCheckins ([dayKey+kind] compound PK, dayKey idx) — lift/cardio,
 *       row existence = checked; carries source ('manual' | 'hevy') for future sync
 *     ~ foods gains normalizedName / lastUsedAt / usageCount indexes (auto-library)
 *     upgrade(): liftCheckins rows with lifted=true copied into dailyCheckins;
 *       foods backfilled with normalizedName + usage stats from mealEntries.
 *     ptTemplates / ptSessions / stepEntries / liftCheckins remain DECLARED but
 *     ORPHANED — no v2 code path reads or writes them. Deliberately not dropped:
 *     combining store deletion with other structural changes in one version block
 *     has known Dexie edge cases, and leaving them costs nothing.
 *
 * Future migrations MUST add this.version(N+1).stores({...}).upgrade(tx => {...})
 * — never mutate an earlier version block. See .planning/research/PITFALLS.md.
 * =========================================================================
 *
 * TRANSACTION RULE (Pitfall #1): Inside db.transaction('rw', tables, async () => {...})
 * every `await` must be a Dexie call. A non-IDB await (fetch, setTimeout, OPFS call,
 * etc.) causes IDB to auto-commit and drop subsequent writes silently. The Anthropic
 * Every await inside a transaction must be a Dexie call.
 * ========================================================================= */

export class HealthTrackerDB extends Dexie {
  /** @deprecated v1 orphaned store — do not use. */
  ptTemplates!: Table<PTTemplate, string>;
  /** @deprecated v1 orphaned store — do not use. */
  ptSessions!: Table<PTSession, string>;
  /** @deprecated v1 orphaned store — do not use. */
  stepEntries!: Table<StepEntry, string>;
  /** @deprecated v1 store — migrated into dailyCheckins; do not use. */
  liftCheckins!: Table<LiftCheckin, string>;

  foods!: Table<Food, string>;
  mealEntries!: Table<MealEntry, string>;
  dailyCheckins!: Table<DailyCheckin, [string, string]>;
  weightEntries!: Table<WeightEntry, string>;
  goals!: Table<Goals, string>;
  longTermGoals!: Table<LongTermGoals, string>;

  /** Sync change-tracking sidecar (v4) — see SyncMeta in schema.ts. */
  syncMeta!: Table<SyncMeta, [string, string]>;

  constructor() {
    // FROZEN. The app is called VZN now, but this string is the IndexedDB
    // database name — changing it doesn't rename anything, it points the app at
    // a new, empty database and orphans every existing log. Product name and
    // storage identity are different things; only the former is cosmetic.
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

    this.version(2)
      .stores({
        'foods':         'id, name, createdAt, normalizedName, lastUsedAt, usageCount',
        'dailyCheckins': '[dayKey+kind], dayKey',
        'weightEntries': 'dayKey',
      })
      .upgrade(async tx => {
        // All awaits below are Dexie calls on tx tables — safe inside the upgrade txn.

        // 1) Migrate v1 lift check-ins → generalized dailyCheckins.
        const lifts = (await tx.table('liftCheckins').toArray()) as LiftCheckin[];
        const migrated: DailyCheckin[] = lifts
          .filter(l => l.lifted)
          .map(l => ({
            dayKey: l.dayKey,
            kind: 'lift',
            source: 'manual',
            loggedAt: l.loggedAt,
          }));
        if (migrated.length > 0) {
          await tx.table('dailyCheckins').bulkPut(migrated);
        }

        // 2) Backfill auto-library fields on foods from meal history so the
        //    library is warm on day one (usage counts + recency).
        const entries = (await tx.table('mealEntries').toArray()) as MealEntry[];
        const usage = new Map<string, { count: number; last: number }>();
        for (const e of entries) {
          const u = usage.get(e.foodId) ?? { count: 0, last: 0 };
          u.count += 1;
          u.last = Math.max(u.last, e.loggedAt);
          usage.set(e.foodId, u);
        }
        await tx.table('foods').toCollection().modify(f => {
          const u = usage.get(f.id);
          f.normalizedName = normalizeFoodName(f.name);
          f.usageCount = u?.count ?? 0;
          f.lastUsedAt = u?.last ?? f.createdAt;
          f.parseSource = 'legacy';
        });
      });

    // Purely additive — no upgrade() needed.
    this.version(3).stores({
      'longTermGoals': 'id',
    });

    // Sync change-tracking sidecar. Additive: no upgrade() and no change to
    // any existing store, so a device that has never signed in behaves exactly
    // as it did before — the table simply stays empty.
    //
    // Rows already on the device when sync arrives have no syncMeta, which is
    // indistinguishable from "not yet written". That is the correct reading:
    // the first sign-in seeds a dirty row for every existing record so the
    // local history uploads once, rather than being silently outranked by an
    // empty server.
    this.version(4).stores({
      'syncMeta': '[table+rowId], dirty, updatedAt',
    });
  }
}

export const db = new HealthTrackerDB();
