import { defineConfig, devices } from '@playwright/test';

// UI tests run against the production build (same `base`, manifest and
// service worker that get deployed to GitHub Pages).
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4173/simon/',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/simon/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
