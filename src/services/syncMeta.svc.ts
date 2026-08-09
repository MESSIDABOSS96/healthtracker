// src/services/syncMeta.svc.ts
// Change tracking for cross-device sync.
//
// Every local write to a synced table stamps a row here; the sync engine reads
// it to know what to push. The calls are explicit at each write site rather
// than intercepted by a Dexie hook or DBCore middleware. Interception would be
// less code and would catch writes automatically — and that is exactly the
// problem: a write path that silently fails to register is a row that exists on
// one device forever, with nothing on screen to say so. An explicit call is
// greppable, reviewable, and fails loudly in tests.
//
// TRANSACTION RULE (CLAUDE.md #1): these are plain Dexie calls, safe to await
// inside a transaction alongside the write they describe. Never await a network
// promise beside them.

import Dexie from 'dexie';
import { db } from '@/db/db';
import { SYNCED_TABLES, type SyncedTable } from '@/db/schema';

/**
 * Fired after any local change is recorded, so sync can push it immediately
 * instead of waiting for the next interval.
 *
 * A callback registered by the sync engine rather than a direct call into it:
 * this module must not import sync.svc, which already imports this one, and a
 * cycle between the two would be resolved differently by Vite and by the test
 * runner. It stays null in a build with no sync configured, which is also what
 * makes every write path below safe to call offline.
 */
let localChangeListener: (() => void) | null = null;

export function setLocalChangeListener(cb: (() => void) | null): void {
  localChangeListener = cb;
}

function notifyLocalChange(): void {
  localChangeListener?.();
}

/**
 * dailyCheckins is keyed by [dayKey+kind]; everything else by a string id.
 * Joined with a space, which cannot appear in a YYYY-MM-DD dayKey or in
 * 'lift'/'cardio' — so the flattened key is unambiguous and reversible.
 */
export function syncRowId(key: string | [string, string]): string {
  return Array.isArray(key) ? key.join(' ') : key;
}

/** Reverse of syncRowId, for applying a remote change to a compound-key table. */
export function dexieKey(table: SyncedTable, rowId: string): string | [string, string] {
  if (table !== 'dailyCheckins') return rowId;
  const [dayKey, kind] = rowId.split(' ');
  return [dayKey, kind];
}

/**
 * Record a local insert or update. `now` is injectable so a caller writing
 * several rows in one logical action stamps them with one identical clock —
 * two rows written a millisecond apart would otherwise sort against each other
 * on a remote device for no reason.
 */
export async function markWritten(
  table: SyncedTable,
  key: string | [string, string],
  now = Date.now(),
): Promise<void> {
  await db.syncMeta.put({
    table,
    rowId: syncRowId(key),
    updatedAt: now,
    deleted: false,
    dirty: 1,
  });
  notifyLocalChange();
}

/**
 * Record a local delete.
 *
 * The tombstone is the entire reason this table exists. A row simply absent
 * from `mealEntries` is indistinguishable from one this device has not been
 * told about yet — without a tombstone the next pull would helpfully restore
 * everything the user just deleted.
 */
export async function markDeleted(
  table: SyncedTable,
  key: string | [string, string],
  now = Date.now(),
): Promise<void> {
  await db.syncMeta.put({
    table,
    rowId: syncRowId(key),
    updatedAt: now,
    deleted: true,
    dirty: 1,
  });
  notifyLocalChange();
}

/** Bulk form of markWritten, for the paths that touch many rows at once. */
export async function markManyWritten(
  table: SyncedTable,
  keys: Array<string | [string, string]>,
  now = Date.now(),
): Promise<void> {
  if (!keys.length) return;
  await db.syncMeta.bulkPut(
    keys.map(key => ({
      table,
      rowId: syncRowId(key),
      updatedAt: now,
      deleted: false,
      dirty: 1,
    })),
  );
  notifyLocalChange();
}

/**
 * Seed change tracking for data that predates sync.
 *
 * Runs once, on first sign-in. Everything already on the device is marked
 * dirty so it uploads; without this the first pull would look authoritative
 * against a device that had simply never reported its history, and months of
 * logs would sit locally forever while the server stayed empty.
 *
 * Existing meta is left alone — a row already tracked keeps its real clock
 * rather than being back-dated to now.
 */
export async function seedSyncMetaForExistingData(): Promise<number> {
  const now = Date.now();
  let seeded = 0;

  for (const table of SYNCED_TABLES) {
    // Ranged over the compound index — `table` on its own is not an index, and
    // `where('table')` throws. Caught and treated as "nothing known", that
    // mistake would silently re-dirty every already-synced row on this device
    // and re-upload the entire history on each sign-in.
    const [rows, existing] = await Promise.all([
      db.table(table).toCollection().primaryKeys(),
      db.syncMeta
        .where('[table+rowId]')
        .between([table, Dexie.minKey], [table, Dexie.maxKey])
        .toArray(),
    ]);
    const known = new Set(existing.map(m => m.rowId));
    const fresh = (rows as Array<string | [string, string]>).filter(
      k => !known.has(syncRowId(k)),
    );
    if (!fresh.length) continue;
    await markManyWritten(table, fresh, now);
    seeded += fresh.length;
  }

  return seeded;
}

/** Everything with local changes the server has not acknowledged. */
export function getDirtyRows() {
  return db.syncMeta.where('dirty').equals(1).toArray();
}

/**
 * Clear the dirty flag after a successful push — but only if the row has not
 * been written again since. `expectedUpdatedAt` is the clock the pushed
 * payload carried; a mismatch means the user edited the row while the request
 * was in flight, and clearing the flag would strand that edit on this device.
 */
export async function clearDirty(
  table: SyncedTable,
  rowId: string,
  expectedUpdatedAt: number,
): Promise<void> {
  await db.syncMeta.where('[table+rowId]').equals([table, rowId]).modify(meta => {
    if (meta.updatedAt === expectedUpdatedAt) meta.dirty = 0;
  });
}

/**
 * Record that a row arrived from the server, so the next push doesn't send it
 * straight back. Written with the REMOTE clock: stamping it with local time
 * would make every pulled row look newer than the copy that produced it and
 * ping-pong the two devices indefinitely.
 */
export async function markSynced(
  table: SyncedTable,
  rowId: string,
  remoteUpdatedAt: number,
  deleted: boolean,
): Promise<void> {
  await db.syncMeta.put({ table, rowId, updatedAt: remoteUpdatedAt, deleted, dirty: 0 });
}

/** The local clock for one row, or undefined if this device has never seen it. */
export async function getLocalClock(
  table: SyncedTable,
  rowId: string,
): Promise<number | undefined> {
  const meta = await db.syncMeta.get([table, rowId]);
  return meta?.updatedAt;
}
