import { expect, test, type Page } from '@playwright/test';

// Deterministic sequences: Math.random always returns 0, so every color is blue.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
});

const status = (page: Page) => page.locator('.status');
const tile = (page: Page, color: string) => page.locator(`.tile[data-color="${color}"]`);
const dialog = (page: Page) => page.getByRole('dialog');

test('manifest and icons are valid and served under /simon/', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBe('/simon/manifest.webmanifest');

  const manifestUrl = new URL(href!, page.url());
  const manifest = await (await request.get(manifestUrl.href)).json();
  expect(manifest.name).toBe('משחק סיימון');
  expect(manifest.display).toBe('standalone');
  expect(new URL(manifest.start_url, manifestUrl).pathname).toBe('/simon/');
  expect(new URL(manifest.scope, manifestUrl).pathname).toBe('/simon/');

  const icons = manifest.icons as { src: string; sizes: string; purpose: string }[];
  expect(icons.map((i) => `${i.sizes} ${i.purpose}`)).toEqual(
    expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
  );
  const iconUrls = [
    ...icons.map((i) => new URL(i.src, manifestUrl).href),
    new URL((await page.locator('link[rel="apple-touch-icon"]').getAttribute('href'))!, page.url()).href,
  ];
  for (const url of iconUrls) {
    expect(new URL(url).pathname.startsWith('/simon/')).toBe(true);
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('image/png');
  }
});

test('all page assets load from /simon/ with no external requests', async ({ page }) => {
  const requests: { url: string; status: number }[] = [];
  page.on('response', (res) => requests.push({ url: res.url(), status: res.status() }));
  await page.goto('./');
  await page.evaluate(() => document.fonts.ready);

  expect(requests.length).toBeGreaterThan(0);
  for (const { url, status } of requests) {
    const u = new URL(url);
    expect(u.host).toBe('localhost:4173');
    expect(u.pathname.startsWith('/simon/')).toBe(true);
    expect(status).toBeLessThan(400);
  }
  expect(requests.some((r) => r.url.endsWith('.woff2'))).toBe(true);
});

test('after one online visit the app works fully offline', async ({ page, context }) => {
  await page.goto('./');
  // Wait until the service worker is active and the precache has completed.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'משחק סיימון' })).toBeVisible();
  await expect(status(page)).toHaveText('לחץ על התחל');
  // The Hebrew Rubik font file is served from the cache, not the network.
  const loadedFaces = await page.evaluate(async () => {
    const faces = await document.fonts.load('16px Rubik', 'שלום');
    return faces.filter((f) => f.status === 'loaded').length;
  });
  expect(loadedFaces).toBeGreaterThan(0);

  // A full game: complete round 1, then lose in round 2.
  await page.getByRole('button', { name: 'התחל', exact: true }).tap();
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
  await tile(page, 'blue').tap();
  await expect(status(page)).toContainText('שלב 2 מתוך 10');
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
  await tile(page, 'red').tap();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('השלמת שלב אחד');
  await expect(dialog(page).getByText('התוצאה לא נשמרה במכשיר')).toBeHidden();

  // The result is saved and shown in About, still offline.
  await page.reload();
  await page.getByRole('button', { name: 'אודות' }).tap();
  await expect(page.locator('.history__item')).toHaveCount(1);
  await expect(page.locator('.history__item').first()).toContainText('הפסד');
});
