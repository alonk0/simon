import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Deployed to GitHub Pages under https://alonk0.github.io/simon/
export default defineConfig({
  base: '/simon/',
  plugins: [
    VitePWA({
      strategies: 'generateSW',
      injectRegister: 'auto',
      // No update UI: a new version waits and takes over on the next launch,
      // so files never change in the middle of a game (see ADR-5).
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
      },
      manifest: {
        name: 'משחק סיימון',
        short_name: 'סיימון',
        description: 'משחק הזיכרון סיימון: צפה ברצף הצבעים וחזור עליו.',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        background_color: '#F4F5F7',
        theme_color: '#F4F5F7',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    // Playwright specs live in e2e/ and run via `npm run test:e2e`.
    include: ['tests/**/*.test.ts'],
  },
});
