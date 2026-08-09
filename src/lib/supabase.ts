// src/lib/supabase.ts
// The one place the Supabase client is constructed.
//
// Sync is OPTIONAL and must stay that way. The app shipped as a fully-local
// PWA and still runs as one: with no credentials configured, `client` is null,
// the Settings card hides itself, and every screen behaves exactly as before.
// That isn't a graceful-degradation nicety — it's what keeps a Supabase outage,
// an expired project, or a fork of this repo from turning into a broken app.
//
// The anon key is a PUBLIC identifier and is meant to ship in the bundle. It
// grants nothing on its own: every table is protected by row-level security
// keyed on auth.uid(), so a signed-out client can read and write nothing. The
// AI provider key is the opposite kind of secret and stays in localStorage,
// never here (CLAUDE.md rule #6).

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** Null when the app is built without Supabase credentials — the local-only mode. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // The OAuth redirect comes back with the session in the URL hash;
          // detectSessionInUrl consumes it. persistSession keeps the user
          // signed in across launches, which for an installed PWA means they
          // sign in once per device rather than once per cold start.
          persistSession: true,
          detectSessionInUrl: true,
          autoRefreshToken: true,
        },
      })
    : null;

export function isSyncConfigured(): boolean {
  return supabase !== null;
}
