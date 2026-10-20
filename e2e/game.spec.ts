import { expect, test, type Page } from '@playwright/test';

// Deterministic sequences: Math.random always returns 0, so every color is blue.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto('./');
});

const status = (page: Page) => page.locator('.status');
const tile = (page: Page, color: string) => page.locator(`.tile[data-color="${color}"]`);
const startButton = (page: Page) => page.getByRole('button', { name: 'התחל', exact: true });
const dialog = (page: Page) => page.getByRole('dialog');

async function waitForTurn(page: Page) {
  await expect(status(page)).toContainText('תורך!', { timeout: 15_000 });
}

test('start shows the sequence with blocked tiles, then the player turn', async ({ page }) => {
  await startButton(page).tap();
  await expect(startButton(page)).toBeHidden();
  await expect(status(page)).toContainText('שלב 1 מתוך 10');
  await expect(status(page)).toContainText('צפה ברצף');
  for (const color of ['blue', 'red', 'yellow', 'green']) await expect(tile(page, color)).toBeDisabled();

  await expect(tile(page, 'blue')).toHaveClass(/tile--lit/);
  await waitForTurn(page);
  await expect(tile(page, 'red')).toBeEnabled();
});

test('a correct round advances automatically, a mistake ends the game, and play again restarts', async ({ page }) => {
  await startButton(page).tap();
  await waitForTurn(page);
  await tile(page, 'blue').tap();
  await expect(status(page)).toContainText('שלב 2 מתוך 10');
  await expect(status(page)).toContainText('צפה ברצף');

  await waitForTurn(page);
  await tile(page, 'blue').tap();
  await tile(page, 'red').tap();

  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page)).toContainText('הפסדת');
  await expect(dialog(page)).toContainText('השלמת שלב אחד');
  await expect(startButton(page)).toBeHidden();

  await page.getByRole('button', { name: 'שחק שוב' }).tap();
  await expect(dialog(page)).toBeHidden();
  await expect(status(page)).toContainText('שלב 1 מתוך 10');
  await waitForTurn(page);
  await tile(page, 'green').tap();
  await expect(dialog(page)).toContainText('השלמת 0 שלבים');
});

test('mute toggles during a game without changing the game', async ({ page }) => {
  await startButton(page).tap();
  const mute = page.getByRole('button', { name: 'השתק צלילים' });
  await mute.tap();
  await expect(page.getByRole('button', { name: 'הפעל צלילים' })).toHaveAttribute('aria-pressed', 'true');
  await expect(tile(page, 'blue')).toHaveClass(/tile--lit/);
  await waitForTurn(page);
  await tile(page, 'blue').tap();
  await expect(status(page)).toContainText('שלב 2 מתוך 10');
});

test('going to About mid-game resets home to the initial state', async ({ page }) => {
  await startButton(page).tap();
  await waitForTurn(page);
  await page.getByRole('button', { name: 'אודות' }).tap();
  await expect(page.getByRole('heading', { name: 'אודות' })).toBeVisible();
  await page.getByRole('button', { name: 'בית' }).tap();
  await expect(status(page)).toHaveText('לחץ על התחל');
  await expect(startButton(page)).toBeVisible();
  await expect(tile(page, 'blue')).toBeDisabled();
});

test('reloading mid-game returns to the initial state', async ({ page }) => {
  await startButton(page).tap();
  await expect(status(page)).toContainText('צפה ברצף');
  await page.reload();
  await expect(status(page)).toHaveText('לחץ על התחל');
  await expect(startButton(page)).toBeVisible();
});
