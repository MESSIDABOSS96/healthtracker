/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Typed as optional on purpose: a build without Supabase credentials is a
// supported configuration (the original local-only app), so every read has to
// be undefined-checked rather than assumed present.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
