// src/services/auth.svc.ts
// Google sign-in, and the account identity the sync engine scopes data to.
//
// Sign-OUT deliberately does NOT delete local data. The database is this
// device's copy of the user's own logs, not a cache of someone else's account —
// wiping it on sign-out would mean a mis-tap costs a day's tracking, and would
// break the app's original promise that the data is yours and local. The one
// case that DOES need a wipe is a different account signing in on the same
// device, which would otherwise merge two people's food into one history.

import { supabase } from '@/lib/supabase';
import { db } from '@/db/db';
import { SYNCED_TABLES } from '@/db/schema';

/** localStorage, not Dexie — see CLAUDE.md rule #6 on what may live in a backup. */
const LAST_ACCOUNT_KEY = 'healthtracker:lastSyncedAccount';

export interface Account {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export async function getAccount(): Promise<Account | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  };
}

/**
 * Start the Google OAuth redirect.
 *
 * `redirectTo` is the app's own origin so the flow returns to whichever origin
 * the user actually launched — the deployed URL, a preview, or localhost —
 * without a build-time constant that silently breaks on one of them. Each of
 * those origins must be listed in Supabase's redirect allowlist; an origin
 * that isn't returns the user to the site root, signed out, with no error.
 */
export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured in this build.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      // Without this, Google silently reuses a previously-granted account on a
      // shared browser rather than letting the user choose — the exact failure
      // the two of you would hit signing in on the same laptop.
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Fires on sign-in, sign-out, and token refresh. Returns an unsubscribe fn. */
export function onAuthChange(cb: (account: Account | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange(() => {
    void getAccount().then(cb);
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Guard against two accounts sharing one device.
 *
 * If a different account signs in than the one this device last synced, the
 * local database holds the previous account's logs. Uploading them under the
 * new identity would silently merge two people's food, weight and check-ins
 * into one history, with no way to unpick it afterwards — so the local copy is
 * cleared first and rebuilt from the new account's server state.
 *
 * Returns true when a wipe happened, so the caller can say so rather than
 * leaving the user to notice their data vanished.
 */
export async function reconcileAccountOnDevice(accountId: string): Promise<boolean> {
  const previous = localStorage.getItem(LAST_ACCOUNT_KEY);
  localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
  if (!previous || previous === accountId) return false;

  await db.transaction(
    'rw',
    [...SYNCED_TABLES.map(t => db.table(t)), db.syncMeta],
    async () => {
      await Promise.all(SYNCED_TABLES.map(t => db.table(t).clear()));
      await db.syncMeta.clear();
    },
  );
  return true;
}

/** Forget the device's account association without touching the data. */
export function clearAccountAssociation(): void {
  localStorage.removeItem(LAST_ACCOUNT_KEY);
}
