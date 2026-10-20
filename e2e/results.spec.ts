import { expect, test, type Page } from '@playwright/test';

const KEY = 'simon:results:v1';

// Deterministic sequences: Math.random always returns 0, so every color is blue.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
});

const status = (page: Page) => page.locator('.status');
const tile = (page: Page, color: string) => page.locator(`.tile[data-color="${color}"]`);
const startButton = (page: Page) => page.getByRole('button', { name: 'התחל', exact: true });
const dialog = (page: Page) => page.getByRole('dialog');

async function waitForTurn(page: Page) {
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
}

// Completes `rounds` rounds correctly, then presses a wrong color.
async function loseAfter(page: Page, rounds: number) {
  await startButton(page).tap();
  for (let r = 1; r <= rounds; r++) {
    await waitForTurn(page);
    for (let i = 0; i < r; i++) await tile(page, 'blue').tap();
    await expect(status(page)).toContainText(`שלב ${r + 1} מתוך 10`);
  }
  await waitForTurn(page);
  await tile(page, 'red').tap();
  await expect(dialog(page)).toBeVisible();
}

async function savedGames(page: Page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), KEY);
  return raw === null ? null : (JSON.parse(raw).games as { completedRounds: number; result: string; date: string }[]);
}

test('finished games are saved once and a new record shows only on a real improvement', async ({ page }) => {
  await page.goto('./');
  await loseAfter(page, 0);
  await expect(dialog(page)).toContainText('שיא אישי: 0');
  await expect(dialog(page).getByText('שיא חדש!')).toBeHidden();
  expect(await savedGames(page)).toEqual([{ date: expect.any(String), completedRounds: 0, result: 'loss' }]);

  // Results survive a reload; the game itself does not.
  await page.reload();
  await expect(status(page)).toHaveText('לחץ על התחל');
  await loseAfter(page, 1);
  await expect(dialog(page)).toContainText('שיא אישי: 1');
  await expect(dialog(page).getByText('שיא חדש!')).toBeVisible();
  expect(await savedGames(page)).toHaveLength(2);

  // Matching the record is not a new record.
  await page.getByRole('button', { name: 'שחק שוב' }).tap();
  await waitForTurn(page);
  await tile(page, 'blue').tap();
  await waitForTurn(page);
  await tile(page, 'red').tap();
  await expect(dialog(page)).toContainText('השלמת שלב אחד');
  await expect(dialog(page)).toContainText('שיא אישי: 1');
  await expect(dialog(page).getByText('שיא חדש!')).toBeHidden();
  const games = await savedGames(page);
  expect(games?.map((g) => g.completedRounds)).toEqual([0, 1, 1]);
  expect(Number.isNaN(Date.parse(games![2].date))).toBe(false);
});

test('abandoned games are never saved', async ({ page }) => {
  await page.goto('./');
  await startButton(page).tap();
  await waitForTurn(page);
  await page.getByRole('button', { name: 'אודות' }).tap();
  await page.getByRole('button', { name: 'בית' }).tap();
  await startButton(page).tap();
  await expect(status(page)).toContainText('צפה ברצף');
  await page.reload();
  await expect(status(page)).toHaveText('לחץ על התחל');
  expect(await savedGames(page)).toBeNull();
});

test('blocked storage does not break the game or claim a save', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('blocked', 'QuotaExceededError');
    };
  });
  await page.goto('./');
  await loseAfter(page, 1);
  await expect(dialog(page)).toContainText('הפסדת');
  await expect(dialog(page)).toContainText('התוצאה לא נשמרה במכשיר');
  await expect(dialog(page)).toContainText('שיא אישי: 0');
  await expect(dialog(page).getByText('שיא חדש!')).toBeHidden();
  await page.getByRole('button', { name: 'שחק שוב' }).tap();
  await expect(status(page)).toContainText('שלב 1 מתוך 10');
});

test('corrupted saved data keeps the game working and is not overwritten', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, '{broken');
      sessionStorage.setItem('seeded', '1');
    }
  }, KEY);
  await page.goto('./');
  await loseAfter(page, 0);
  await expect(dialog(page)).toContainText('הפסדת');
  await expect(dialog(page)).toContainText('התוצאה לא נשמרה במכשיר');
  await expect(dialog(page)).not.toContainText('שיא אישי');
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe('{broken');
});
