import { defineConfig } from 'vitest/config';

// `base` and the PWA plugin are added in Milestone 5 (GitHub Pages deployment).
export default defineConfig({
  test: {
    // Playwright specs live in e2e/ and run via `npm run test:e2e`.
    include: ['tests/**/*.test.ts'],
  },
});
