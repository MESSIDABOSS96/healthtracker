import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Phase 1 Plan 01-01: scaffold-only Vite config.
// PWA plugin is intentionally NOT added here — Plan 01-03 wires it later.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
