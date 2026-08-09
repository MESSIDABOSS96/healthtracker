// src/services/sync.svc.ts
// Cross-device sync. Dexie stays the source of truth for the UI; this moves
// rows between it and Supabase.
//
// The shape of the deal: every screen still reads Dexie through useLiveQuery
// and knows nothing about the network. Sync writes into Dexie, live queries
// refire, the UI updates. That's why the whole app kept working when this was
// added — nothing above this file changed.
//
// TRANSACTION RULE (CLAUDE.md #1): a Supabase call is a fetch. Every network
// round trip below completes BEFORE any Dexie transaction opens. Awaiting one
// inside a transaction auto-commits it and drops writes silently.
//
// CONFLICT MODEL: last write wins, on the writing device's clock. Two devices
// editing the same row in the same minute is the only case it gets wrong, and
// it resolves to one of the two real values rather than a merge artifact. What
// it deliberately does not do is resolve per-field: a row is a unit, so an edit
// that loses does not leave half its fields behind. Rows carry UUIDs and days
// are keyed by date, so the common case — two devices adding different entries —
// never conflicts at all.

import { supabase } from '@/lib/supabase';
import { db } from '@/db/db';
import { SYNCED_TABLES, type SyncedTable } from '@/db/schema';
import {
  clearDirty,
  dexieKey,
  getDirtyRows,
  getLocalClock,
  markSynced,
  seedSyncMetaForExistingData,
  setLocalChangeListener,
} from './syncMeta.svc';

const TABLE = 'sync_rows';

/** localStorage, per account — a shared cursor would skip rows after a switch. */
const cursorKey = (accountId: string) => `healthtracker:syncCursor:${accountId}`;

/** Supabase rejects very large payloads; a few hundred rows per round trip is ample. */
const PUSH_CHUNK = 200;

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

export interface SyncStatus {
  state: SyncState;
  lastSyncedAt: number | null;
  pendingCount: number;
  message?: string;
}

interface RemoteRow {
  table_name: SyncedTable;
  row_id: string;
  data: unknown | null;
  updated_at: number;
  deleted: boolean;
}

// ---------------------------------------------------------------------------
// Status broadcasting
// ---------------------------------------------------------------------------

let status: SyncStatus = { state: 'idle', lastSyncedAt: null, pendingCount: 0 };
const listeners = new Set<(s: SyncStatus) => void>();

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch };
  for (const l of listeners) l(status);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function onSyncStatus(cb: (s: SyncStatus) => void): () => void {
  listeners.add(cb);
  cb(status);
  return () => listeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Pull
// ---------------------------------------------------------------------------

/**
 * Apply one server row locally, unless this device holds a newer unpushed edit.
 *
 * The `dirty` half of that check is what stops a stale server copy from
 * reverting an edit made while offline: the local row is newer AND still owed
 * to the server, so it wins here and goes up on the next push.
 */
async function applyRemoteRow(row: RemoteRow): Promise<void> {
  const { table_name: table, row_id: rowId, updated_at: remoteClock, deleted } = row;
  if (!SYNCED_TABLES.includes(table)) return; // a table this build doesn't know

  const localClock = await getLocalClock(table, rowId);
  if (localClock !== undefined && localClock > remoteClock) {
    const meta = await db.syncMeta.get([table, rowId]);
    if (meta?.dirty === 1) return; // local edit is newer and still owed — keep it
  }

  const key = dexieKey(table, rowId);
  await db.transaction('rw', [db.table(table), db.syncMeta], async () => {
    if (deleted) await db.table(table).delete(key);
    else if (row.data) await db.table(table).put(row.data);
    await markSynced(table, rowId, remoteClock, deleted);
  });
}

/**
 * Fetch everything changed since the cursor and apply it.
 *
 * The cursor advances to the newest row actually applied rather than to "now",
 * so a row written server-side during the request isn't skipped by a clock that
 * ran ahead of the data. Paged, because a first sync on a device with months of
 * history is thousands of rows.
 */
async function pull(accountId: string): Promise<number> {
  if (!supabase) return 0;
  const cursor = Number(localStorage.getItem(cursorKey(accountId)) ?? 0);
  let applied = 0;
  let high = cursor;
  let from = 0;
  const PAGE = 1000;

  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('table_name,row_id,data,updated_at,deleted')
      .gt('updated_at', cursor)
      .order('updated_at', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data?.length) break;

    // Network work is finished for this page before any Dexie write opens.
    for (const row of data as RemoteRow[]) {
      await applyRemoteRow(row);
      if (row.updated_at > high) high = row.updated_at;
      applied++;
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  if (high > cursor) localStorage.setItem(cursorKey(accountId), String(high));
  return applied;
}

// ---------------------------------------------------------------------------
// Push
// ---------------------------------------------------------------------------

/**
 * Send local changes up.
 *
 * The row payload is read at push time rather than captured when it was marked
 * dirty: several edits between syncs collapse into one upload of the current
 * value, which is both cheaper and the answer the user would expect.
 */
async function push(accountId: string): Promise<number> {
  if (!supabase) return 0;
  const dirty = await getDirtyRows();
  if (!dirty.length) return 0;

  const payloads: Array<{
    user_id: string;
    table_name: SyncedTable;
    row_id: string;
    data: unknown | null;
    updated_at: number;
    deleted: boolean;
  }> = [];

  for (const meta of dirty) {
    const row = meta.deleted
      ? null
      : await db.table(meta.table).get(dexieKey(meta.table, meta.rowId));

    // Marked present but gone from the table: a delete that never registered.
    // Upload it as a tombstone rather than dropping the change on the floor.
    const deleted = meta.deleted || row === undefined;

    payloads.push({
      user_id: accountId,
      table_name: meta.table,
      row_id: meta.rowId,
      data: deleted ? null : row,
      updated_at: meta.updatedAt,
      deleted,
    });
  }

  for (let i = 0; i < payloads.length; i += PUSH_CHUNK) {
    const chunk = payloads.slice(i, i + PUSH_CHUNK);
    const { error } = await supabase
      .from(TABLE)
      .upsert(chunk, { onConflict: 'user_id,table_name,row_id' });
    if (error) throw error;

    // Cleared one row at a time against the clock that was sent — a row edited
    // while the request was in flight keeps its dirty flag and goes next time.
    for (const p of chunk) await clearDirty(p.table_name, p.row_id, p.updated_at);
  }

  return payloads.length;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

let running: Promise<void> | null = null;

/**
 * One full cycle: push local changes, then pull remote ones.
 *
 * Push first so a local edit is never overwritten by a server copy that simply
 * hadn't heard about it yet. Concurrent calls share the in-flight run rather
 * than interleaving two pushes over the same dirty set.
 */
export function syncNow(accountId: string): Promise<void> {
  if (running) return running;

  running = (async () => {
    if (!navigator.onLine) {
      setStatus({ state: 'offline', pendingCount: (await getDirtyRows()).length });
      return;
    }
    setStatus({ state: 'syncing' });
    try {
      await push(accountId);
      await pull(accountId);
      setStatus({
        state: 'idle',
        lastSyncedAt: Date.now(),
        pendingCount: (await getDirtyRows()).length,
        message: undefined,
      });
    } catch (err) {
      console.error('[sync] cycle failed', err);
      setStatus({
        state: navigator.onLine ? 'error' : 'offline',
        pendingCount: (await getDirtyRows()).length,
        message: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  })().finally(() => {
    running = null;
  });

  return running;
}

/** First sync on a device: make sure pre-sync history uploads before pulling. */
export async function bootstrapSync(accountId: string): Promise<void> {
  await seedSyncMetaForExistingData();
  await syncNow(accountId);
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/**
 * Live push. Rows this account writes anywhere arrive here within a second.
 *
 * The device's own writes come back too — applyRemoteRow's clock check makes
 * that a no-op rather than a loop, since the local row already carries the same
 * timestamp. A dropped connection falls back to the cycle triggers in start():
 * realtime is the fast path, not the only one, which is what keeps a websocket
 * failure from silently stopping sync altogether.
 */
function subscribeRealtime(accountId: string): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel(`sync_rows:${accountId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${accountId}` },
      payload => {
        const row = payload.new as RemoteRow | undefined;
        if (!row?.table_name) return;
        void applyRemoteRow(row)
          .then(() => {
            const cur = Number(localStorage.getItem(cursorKey(accountId)) ?? 0);
            if (row.updated_at > cur) {
              localStorage.setItem(cursorKey(accountId), String(row.updated_at));
            }
          })
          .catch(err => console.error('[sync] realtime apply failed', err));
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/**
 * Wire up sync for a signed-in account. Returns a teardown function.
 *
 * Realtime carries the live case; the other three triggers exist because a
 * websocket is not a guarantee. Coming back online, returning to the tab, and
 * a slow interval each recover a connection that dropped without anyone
 * noticing — the failure mode this is guarding against is silent, so it can't
 * rely on the mechanism that failed to report it.
 */
export function start(accountId: string): () => void {
  const unsubscribeRealtime = subscribeRealtime(accountId);
  const run = () => void syncNow(accountId);

  // Debounced: logging a meal writes the entry and bumps the food row, and a
  // burst of check-off taps fires several times a second. One cycle covers all
  // of them, and the dirty set is read at push time so nothing is missed.
  let debounce: number | undefined;
  setLocalChangeListener(() => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(run, 400);
  });

  const onOnline = () => run();
  const onVisible = () => {
    if (document.visibilityState === 'visible') run();
  };
  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(run, 5 * 60 * 1000);

  void bootstrapSync(accountId);

  return () => {
    setLocalChangeListener(null);
    window.clearTimeout(debounce);
    unsubscribeRealtime();
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}
