// src/features/sync/useSync.ts
// React glue for auth + sync. One lifecycle, owned at app level.
//
// The lifecycle is a module singleton rather than component state because it
// must survive re-renders and route changes — a websocket subscription torn
// down and rebuilt every time the user navigates to Settings would be both
// wasteful and racy. Components read it; they don't own it.

import { useEffect, useState } from 'react';
import {
  getAccount,
  onAuthChange,
  reconcileAccountOnDevice,
  clearAccountAssociation,
  type Account,
} from '@/services/auth.svc';
import { getSyncStatus, onSyncStatus, start, type SyncStatus } from '@/services/sync.svc';
import { isSyncConfigured } from '@/lib/supabase';

let stopSync: (() => void) | null = null;
let account: Account | null = null;
const accountListeners = new Set<(a: Account | null) => void>();

function setAccount(next: Account | null): void {
  account = next;
  for (const l of accountListeners) l(next);
}

/**
 * Bind sync to the signed-in account. Called once from main.tsx.
 *
 * The wipe-on-account-change check runs BEFORE sync starts. Starting first
 * would upload the previous account's data under the new identity in the
 * bootstrap push — the one ordering mistake here that is unrecoverable.
 */
export function initSyncLifecycle(): void {
  if (!isSyncConfigured()) return;

  const bind = async (next: Account | null) => {
    stopSync?.();
    stopSync = null;
    setAccount(next);
    if (!next) return;
    await reconcileAccountOnDevice(next.id);
    stopSync = start(next.id);
  };

  void getAccount().then(bind);
  onAuthChange(a => void bind(a));
}

/** Called on explicit sign-out so the next account isn't treated as a switch. */
export function releaseSync(): void {
  stopSync?.();
  stopSync = null;
  clearAccountAssociation();
  setAccount(null);
}

export function useAccount(): Account | null {
  const [value, setValue] = useState<Account | null>(account);
  useEffect(() => {
    accountListeners.add(setValue);
    setValue(account);
    return () => {
      accountListeners.delete(setValue);
    };
  }, []);
  return value;
}

export function useSyncStatus(): SyncStatus {
  const [value, setValue] = useState<SyncStatus>(getSyncStatus);
  useEffect(() => onSyncStatus(setValue), []);
  return value;
}
