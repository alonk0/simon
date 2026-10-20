// Renders the SVG app icons in public/ to the PNG sizes needed for PWA install.
// Uses Playwright's Chromium (already a dev dependency). Run: npm run icons
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const outputs = [
  { src: 'public/icon.svg', out: 'public/pwa-192x192.png', size: 192 },
  { src: 'public/icon.svg', out: 'public/pwa-512x512.png', size: 512 },
  { src: 'public/icon.svg', out: 'public/apple-touch-icon.png', size: 180 },
  { src: 'public/icon-maskable.svg', out: 'public/maskable-512x512.png', size: 512 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { src, out, size } of outputs) {
  const svg = await readFile(src, 'utf8');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
  );
  await page.screenshot({ path: out, omitBackground: false });
  console.log(`wrote ${out}`);
}
await browser.close();
