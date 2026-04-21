import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// Phase 1 Plan 01-01: scaffold-only Vite config.
// PWA plugin is intentionally NOT added here — Plan 01-03 wires it later.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirror tsconfig.app.json "paths": Rollup needs an explicit alias because
    // TS paths don't propagate to the bundler. Required for shadcn @/ imports.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
