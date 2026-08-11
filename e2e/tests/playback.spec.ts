import fs from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { STORAGE_STATE_PATH } from '../global-setup';
import { SAMPLE_AUDIO_1, uniqueName } from './helpers';

// Uploaded-most-recently-first is this app's default list order (confirmed
// throughout manual testing this session) — uploading in this order gives a
// predictable [third, second, first, ...] card order to build a known
// now-playing/up-next queue from.
async function uploadThreeTracks(page: Page) {
  const names: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = `${uniqueName(`e2e-playback-${i}`)}.mp3`;
    await page.setInputFiles('input[type="file"]', {
      name,
      mimeType: 'audio/mpeg',
      buffer: fs.readFileSync(SAMPLE_AUDIO_1),
    });
    await expect(page.locator('article', { hasText: name })).toBeVisible({ timeout: 30_000 });
    names.push(name);
  }
  return names.reverse(); // [third, second, first] — the order they now appear in
}

// Playback interactions (play, queue navigation) never mutate the underlying
// media, so all tests in this file share one set of 3 uploaded tracks
// instead of each uploading its own — cuts this file's upload count 5x,
// which matters since each upload is a real ffprobe/thumbnail-generation
// round trip against the backend.
let tracks: string[];

test.beforeAll(async ({ browser }) => {
  // browser.newPage() bypasses the project's default storageState (that's
  // only wired up for the per-test `page`/`context` fixtures), so it's
  // passed explicitly here to start this page authenticated too.
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  await page.goto('/');
  tracks = await uploadThreeTracks(page);
  await context.close();
});

// Already authenticated as the shared user via playwright.config.ts's default
// storageState (see global-setup.ts) — just navigate in.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('clicking a card starts playback, showing it in Now Playing', async ({ page }) => {
  const [top] = tracks;

  await page.locator('article', { hasText: top! }).click();

  const player = page.locator('aside', { hasText: 'NOW PLAYING' });
  await expect(player.locator('[class*="trackTitle"]')).toHaveText(top!);
});

test('playing a card queues the following items as Up Next', async ({ page }) => {
  const [top, second, third] = tracks;

  await page.locator('article', { hasText: top! }).click();

  const player = page.locator('aside', { hasText: 'NOW PLAYING' });
  await expect(player.getByText('UP NEXT')).toBeVisible();
  const upNextItems = player.locator('[class*="upNextTitle"]');
  await expect(upNextItems.nth(0)).toHaveText(second!);
  await expect(upNextItems.nth(1)).toHaveText(third!);
});

test('clicking an Up Next item switches Now Playing to it', async ({ page }) => {
  const [top, second] = tracks;

  await page.locator('article', { hasText: top! }).click();
  const player = page.locator('aside', { hasText: 'NOW PLAYING' });
  await player.locator('[class*="upNextTitle"]', { hasText: second! }).click();

  await expect(player.locator('[class*="trackTitle"]')).toHaveText(second!);
});

test('Next advances to the following queued track', async ({ page }) => {
  const [top, second] = tracks;

  await page.locator('article', { hasText: top! }).click();
  const player = page.locator('aside', { hasText: 'NOW PLAYING' });
  await player.getByRole('button', { name: 'Next' }).click();

  await expect(player.locator('[class*="trackTitle"]')).toHaveText(second!);
});

test('Skip Back is disabled with nothing played before, then returns to the previous track', async ({ page }) => {
  const [top, second] = tracks;

  await page.locator('article', { hasText: top! }).click();
  const player = page.locator('aside', { hasText: 'NOW PLAYING' });
  await expect(player.getByRole('button', { name: 'Skip Back' })).toBeDisabled();

  await player.getByRole('button', { name: 'Next' }).click();
  await expect(player.locator('[class*="trackTitle"]')).toHaveText(second!);
  await expect(player.getByRole('button', { name: 'Skip Back' })).toBeEnabled();

  await player.getByRole('button', { name: 'Skip Back' }).click();
  await expect(player.locator('[class*="trackTitle"]')).toHaveText(top!);
});
