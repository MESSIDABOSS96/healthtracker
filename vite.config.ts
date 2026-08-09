import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import { execSync } from 'node:child_process';

// Phase 1 Plan 01-03: PWA + offline + iOS-installability config.
// generateSW (NOT injectManifest) per RESEARCH.md §4 — Phase 1 only needs precache + SPA fallback.
// autoUpdate per CONTEXT.md D-09 — silent SW update on next reload, no in-app banner (SETUP-06 is v2).

// Build-time hash: short git commit if available, else build timestamp marker 'dev'.
let buildHash = 'dev';
try {
  buildHash = execSync('git rev-parse --short HEAD', {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .toString()
    .trim();
} catch {
  /* not a git repo yet — acceptable */
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(buildHash),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('0.1.0'),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'VZN',
        short_name: 'VZN',
        description: 'Daily calorie, training and body-weight tracker.',
        id: '/',                                            // Phase 4 D-15: pin PWA identity (W3C manifest spec)
        categories: ['health', 'fitness', 'productivity'],  // Phase 4 D-15: install-UI / store category hint
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    // Mirror tsconfig.app.json "paths": Rollup needs an explicit alias because
    // TS paths don't propagate to the bundler. Required for shadcn @/ imports.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
