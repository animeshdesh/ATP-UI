/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Deployed builds (production, staging) must talk to the real API and Supabase. Without this
 * check a missing variable would silently fall back to mock auth (@atp/core lib/env.ts).
 */
function requireDeployEnv(mode: string, command: string) {
  if (command !== 'build' || mode === 'development' || mode === 'test') return;
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const missing = ['VITE_API_URL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'].filter(
    (k) => !env[k],
  );
  if (missing.length || env.VITE_AUTH === 'mock')
    throw new Error(
      `${mode} build needs ${missing.join(', ') || 'VITE_AUTH=supabase'} (Pages environment variables, or .env.${mode}.local)`,
    );
  // The API is on its own origin (Railway, D-040): absolute https, or http only for localhost.
  const api = env.VITE_API_URL!;
  if (!/^https:\/\//.test(api) && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(api))
    throw new Error(`VITE_API_URL must be an absolute https URL, got "${api}"`);
}

export default defineConfig(({ mode, command }) => {
  requireDeployEnv(mode, command);
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        // Blue tile + white mark (pwa-assets.config.ts): tells it apart from ATP Money on a phone.
        includeAssets: [
          'atp-mark-tab.svg',
          'atp-mark.svg',
          'atp-logo.svg',
          'apple-touch-icon-180x180.png',
        ],
        manifest: {
          name: 'ATP Patients',
          short_name: 'ATP Patients',
          description: 'Patients, calendar and booking requests for ATP Rehab',
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
        },
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5554, strictPort: true },
    preview: { port: 5554, strictPort: true },
    test: {
      environment: 'jsdom',
      env: { VITE_AUTH: 'mock' },
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
