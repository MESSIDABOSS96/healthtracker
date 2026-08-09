// src/services/auth.svc.ts
// Email + password sign-in, and the account identity sync scopes data to.
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
}

export async function getAccount(): Promise<Account | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
}

/**
 * Email + password, deliberately over an OAuth redirect.
 *
 * The redirect flow is hostile to an installed PWA: it leaves the app, and on
 * iOS it can return to Safari rather than the standalone window the user
 * started in — so they sign in and the app they were holding is still signed
 * out. Magic links are worse for the same reason, since the link opens in
 * whatever the mail client considers the default browser. Credentials entered
 * in-app never leave the app.
 *
 * Errors are surfaced verbatim rather than normalized to "sign-in failed".
 * Supabase distinguishes wrong password from unconfirmed email from rate
 * limited, and collapsing those leaves the user retyping a correct password.
 */
export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured in this build.');
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

/**
 * Create an account.
 *
 * With email confirmation disabled in Supabase this returns a live session
 * immediately. With it enabled, it returns a user and NO session — the caller
 * would look signed out for no visible reason, so that case is reported rather
 * than silently doing nothing.
 */
export async function signUp(email: string, password: string): Promise<void> {
  if (!supabase) throw new Error('Sync is not configured in this build.');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      // Where the confirmation link lands. Without this it falls back to the
      // project's Site URL — one dashboard field, easy to point at the wrong
      // app, and when it is wrong the user confirms successfully and is then
      // dropped onto a stranger's site with no explanation. Naming the current
      // origin means the link returns to whichever build sent it, and the
      // setting can't drift out from under us.
      emailRedirectTo: window.location.origin,
    },
  });
  if (error) throw error;
  if (!data.session) {
    throw new Error(
      'Account created — check your email to confirm it, then sign in. ' +
        '(Turn off "Confirm email" in Supabase to skip this step.)',
    );
  }
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
