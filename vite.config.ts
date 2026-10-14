/// <reference types="vitest/config" />
import { rmSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Deployed builds (production, staging) must talk to the real API and Supabase. Without this
 * check a missing variable would silently fall back to mock auth (src/lib/env.ts).
 */
function requireDeployEnv(mode: string, command: string) {
  if (command !== 'build' || mode === 'development' || mode === 'test') return;
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const missing = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(
    (k) => !env[k],
  );
  if (missing.length || env.VITE_AUTH === 'mock')
    throw new Error(
      `${mode} build needs ${missing.join(', ') || 'VITE_AUTH=supabase'} (set them in CI or .env.${mode}.local)`,
    );
}

/** The MSW worker (public/) is for `pnpm dev` only; keep it out of deployed builds. */
const dropMockWorker = (mode: string): Plugin => ({
  name: 'atp:drop-mock-worker',
  apply: 'build',
  closeBundle() {
    if (mode !== 'development') rmSync('dist/mockServiceWorker.js', { force: true });
  },
});

export default defineConfig(({ mode, command }) => {
  requireDeployEnv(mode, command);
  return {
    plugins: [
      react(),
      tailwindcss(),
      dropMockWorker(mode),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['atp-mark.svg', 'atp-logo.svg', 'apple-touch-icon-180x180.png'],
        manifest: {
          name: 'ATP Clinic OS',
          short_name: 'ATP OS',
          description: 'Clinic finance for ATP Rehab',
          lang: 'en-IN',
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#F1F1FE',
          theme_color: '#06AEEF',
          icons: [
            { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'maskable-icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          globIgnores: ['mockServiceWorker.js'],
          // Production/staging proxy the API at /api (D-037); local dev calls :4553 directly.
          navigateFallbackDenylist: [/^\/api\//, /^\/v1\//, /^\/health/],
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5553, strictPort: true },
    preview: { port: 5553, strictPort: true },
    test: {
      environment: 'jsdom',
      env: { VITE_AUTH: 'mock' },
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
