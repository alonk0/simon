import { expect, test, type Page } from '@playwright/test';

const KEY = 'simon:results:v1';

type Game = { date: string; completedRounds: number; result: 'win' | 'loss' };

// Seeds storage once per test (not again on reload), with Math.random fixed so every color is blue.
async function seed(page: Page, value: string | null) {
  await page.addInitScript(
    ({ key, value }) => {
      Math.random = () => 0;
      if (value !== null && !sessionStorage.getItem('seeded')) {
        localStorage.setItem(key, value);
        sessionStorage.setItem('seeded', '1');
      }
    },
    { key: KEY, value },
  );
}

const games = (list: Game[]) => JSON.stringify({ schemaVersion: 1, games: list });
// Midday local time keeps the displayed date stable in any time zone.
const day = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();

const status = (page: Page) => page.locator('.status');
const tile = (page: Page, color: string) => page.locator(`.tile[data-color="${color}"]`);
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const historyRows = (page: Page) => page.locator('.history__item');
const resetDialog = (page: Page) => page.getByRole('dialog', { name: 'איפוס נתונים' });

async function openAbout(page: Page) {
  await button(page, 'אודות').tap();
  await expect(page.getByRole('heading', { name: 'אודות', level: 1 })).toBeVisible();
}

async function expectEmpty(page: Page) {
  await expect(page.getByTestId('best')).toHaveText('אין נתונים');
  await expect(page.getByTestId('total')).toHaveText('0');
  await expect(page.getByTestId('wins')).toHaveText('0');
  await expect(page.getByTestId('rate')).toHaveText('אין נתונים');
  await expect(page.getByText('עדיין אין משחקים שהסתיימו')).toBeVisible();
  await expect(historyRows(page)).toHaveCount(0);
}

const seeded: Game[] = [
  { date: day(2025, 4, 5), completedRounds: 6, result: 'loss' },
  { date: day(2025, 4, 8), completedRounds: 5, result: 'loss' },
  { date: day(2025, 4, 10), completedRounds: 10, result: 'win' },
];

test('empty history shows non-misleading empty states', async ({ page }) => {
  await seed(page, null);
  await page.goto('./');
  await openAbout(page);
  await expectEmpty(page);
});

test('statistics and history match saved games, newest first, date only', async ({ page }) => {
  await seed(page, games(seeded));
  await page.goto('./');
  await openAbout(page);
  await expect(page.getByTestId('best')).toHaveText('10');
  await expect(page.getByTestId('total')).toHaveText('3');
  await expect(page.getByTestId('wins')).toHaveText('1');
  await expect(page.getByTestId('rate')).toHaveText('33%');
  await expect(historyRows(page)).toHaveText([
    /ניצחון\s*10 שלבים\s*10\.04\.2025/,
    /הפסד\s*5 שלבים\s*08\.04\.2025/,
    /הפסד\s*6 שלבים\s*05\.04\.2025/,
  ]);
  // No time of day or duration anywhere in the history.
  for (const text of await historyRows(page).allInnerTexts()) expect(text).not.toContain(':');
});

test('a just-finished game appears at the top; an abandoned game is not added', async ({ page }) => {
  await seed(page, games(seeded));
  await page.goto('./');
  await button(page, 'התחל').tap();
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
  await tile(page, 'red').tap();
  await expect(page.getByRole('dialog')).toContainText('הפסדת');
  await button(page, 'שחק שוב').tap();

  // Leave mid-game: nothing is recorded and the best stays the same.
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
  await openAbout(page);
  await expect(page.getByTestId('total')).toHaveText('4');
  await expect(page.getByTestId('best')).toHaveText('10');
  await expect(historyRows(page).first()).toContainText('הפסד');
  await expect(historyRows(page).first()).toContainText('0 שלבים');

  // Back home starts from idle.
  await button(page, 'בית').tap();
  await expect(status(page)).toHaveText('לחץ על התחל');
  await expect(button(page, 'התחל')).toBeVisible();
});

test('cancelling the reset dialog changes nothing', async ({ page }) => {
  await seed(page, games(seeded));
  await page.goto('./');
  await openAbout(page);
  await button(page, 'איפוס נתונים').tap();
  await expect(resetDialog(page)).toBeVisible();
  await expect(resetDialog(page)).toContainText('האם אתה בטוח שברצונך לאפס את כל הנתונים?');
  await button(page, 'ביטול').tap();
  await expect(resetDialog(page)).toBeHidden();
  await expect(historyRows(page)).toHaveCount(3);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(games(seeded));

  // Escape also cancels.
  await button(page, 'איפוס נתונים').tap();
  await page.keyboard.press('Escape');
  await expect(resetDialog(page)).toBeHidden();
  await expect(historyRows(page)).toHaveCount(3);
});

test('confirming the reset clears everything immediately and after reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('other-app', 'keep'));
  await seed(page, games(seeded));
  await page.goto('./');
  await openAbout(page);
  await button(page, 'איפוס נתונים').tap();
  await resetDialog(page).getByRole('button', { name: 'איפוס', exact: true }).tap();
  await expect(resetDialog(page)).toBeHidden();
  await expectEmpty(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('other-app'))).toBe('keep');

  await page.reload();
  await openAbout(page);
  await expectEmpty(page);
});

test('corrupted data shows a notice and can be reset', async ({ page }) => {
  await seed(page, '{broken');
  await page.goto('./');
  await openAbout(page);
  await expect(page.getByText('הנתונים השמורים אינם תקינים')).toBeVisible();
  await expect(page.getByTestId('best')).toHaveText('אין נתונים');
  await button(page, 'איפוס נתונים').tap();
  await resetDialog(page).getByRole('button', { name: 'איפוס', exact: true }).tap();
  await expect(page.getByText('הנתונים השמורים אינם תקינים')).toBeHidden();
  await expectEmpty(page);
});

test('a long history scrolls vertically without horizontal overflow', async ({ page }) => {
  const many: Game[] = Array.from({ length: 30 }, (_, i) => ({
    date: day(2025, 1, 1 + (i % 28)),
    completedRounds: i % 10,
    result: 'loss',
  }));
  await seed(page, games(many));
  await page.goto('./');
  await openAbout(page);
  await expect(historyRows(page)).toHaveCount(30);
  const { scrollWidth, clientWidth, scrollHeight, innerHeight } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollHeight).toBeGreaterThan(innerHeight);
  await button(page, 'איפוס נתונים').scrollIntoViewIfNeeded();
  await expect(button(page, 'איפוס נתונים')).toBeInViewport();
});
