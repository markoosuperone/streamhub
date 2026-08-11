import fs from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { STORAGE_STATE_PATH } from '../global-setup';
import { SAMPLE_AUDIO_1, uniqueName } from './helpers';

async function uploadUniquelyNamed(page: Page) {
  const name = `${uniqueName('e2e-playlist-media')}.mp3`;
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType: 'audio/mpeg',
    buffer: fs.readFileSync(SAMPLE_AUDIO_1),
  });
  await expect(page.locator('article', { hasText: name })).toBeVisible({ timeout: 30_000 });
  return name;
}

// Adding/removing a track to/from a playlist never mutates the underlying
// media item, so both tests that need "some track to add" share one upload
// instead of each uploading its own — one less real ffprobe/thumbnail round
// trip against the backend.
let sharedTrackName: string;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ storageState: STORAGE_STATE_PATH });
  const page = await context.newPage();
  await page.goto('/');
  sharedTrackName = await uploadUniquelyNamed(page);
  await context.close();
});

// AddToPlaylistModal defaults to a "pick an existing playlist" list once the
// account has any — only shows the create form directly when it has none. As
// the shared e2e account accumulates playlists across test runs, always
// explicitly get to the create form instead of assuming which state it's in.
async function createAndAddViaModal(page: Page, title: string) {
  const dialog = page.getByRole('dialog');
  const newPlaylistButton = dialog.getByRole('button', { name: 'New playlist' });
  if (await newPlaylistButton.isVisible().catch(() => false)) {
    await newPlaylistButton.click();
  }
  await dialog.locator('input[placeholder="Playlist name…"]').fill(title);
  await dialog.getByRole('button', { name: 'Create & add' }).click();
  await dialog.getByRole('button', { name: 'Close' }).click();
}

// Already authenticated as the shared user via playwright.config.ts's default
// storageState (see global-setup.ts) — just navigate in.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('creates a playlist, showing it in the playlists rail', async ({ page }) => {
  const title = uniqueName('Road Trip');

  await page.getByRole('button', { name: 'New playlist' }).first().click();
  await page.fill('input[placeholder="Playlist name…"]', title);
  await page.getByRole('button', { name: 'Create' }).click();

  await expect(page.getByRole('link', { name: title })).toBeVisible();
});

test('adds a track to a playlist via the card button, reflected in the Library rail', async ({ page }) => {
  const trackName = sharedTrackName;
  const title = uniqueName('Focus Mix');

  await page.locator('article', { hasText: trackName }).locator('button[aria-label="Add to playlist"]').click();
  await createAndAddViaModal(page, title);

  await page.click('a[href="/library"]');
  await page.waitForURL('**/library');
  // Library's "Your playlists" rows (LibraryPlaylistRow) are plain clickable
  // divs, not <Link>s like PlaylistsRail's on Home — select by its text.
  await page.getByText(title, { exact: true }).click();

  const rail = page.locator('aside').last();
  await expect(rail.getByText(trackName)).toBeVisible();
  await expect(rail.getByText('1 items')).toBeVisible();
});

test('removes a track from the playlist rail, decrementing the count', async ({ page }) => {
  const trackName = sharedTrackName;
  const title = uniqueName('Chill Mix');

  await page.locator('article', { hasText: trackName }).locator('button[aria-label="Add to playlist"]').click();
  await createAndAddViaModal(page, title);

  await page.click('a[href="/library"]');
  await page.waitForURL('**/library');
  await page.getByText(title, { exact: true }).click();

  const rail = page.locator('aside').last();
  await expect(rail.getByText(trackName)).toBeVisible();
  await rail.locator('button', { hasText: '✕' }).click();

  await expect(rail.getByText(trackName)).not.toBeVisible();
  await expect(rail.getByText('Empty — add tracks from the + button on any card.')).toBeVisible();
});

test('renames a playlist via its menu', async ({ page }) => {
  const originalTitle = uniqueName('Old Name');
  const newTitle = uniqueName('New Name');

  await page.getByRole('button', { name: 'New playlist' }).first().click();
  await page.fill('input[placeholder="Playlist name…"]', originalTitle);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('link', { name: originalTitle })).toBeVisible();

  // The row's "More options" button is a sibling of the title link, not an
  // ancestor/descendant of it — go up to their shared parent via xpath
  // rather than a div:has() selector, which is more fragile to unrelated
  // wrapping divs.
  const row = page.getByRole('link', { name: originalTitle }).locator('xpath=..');
  await row.scrollIntoViewIfNeeded();
  await row.locator('button[aria-label="More options"]').click();
  const menu = page.getByRole('menu');
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Rename' }).click();
  const input = page.locator('input[class*="renameInput"]');
  await expect(input).toBeVisible();
  await input.click();
  await input.fill(newTitle);
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('link', { name: newTitle })).toBeVisible();
  await expect(page.getByRole('link', { name: originalTitle })).not.toBeVisible();
});

test('deletes a playlist via its menu', async ({ page }) => {
  const title = uniqueName('Throwaway');

  await page.getByRole('button', { name: 'New playlist' }).first().click();
  await page.fill('input[placeholder="Playlist name…"]', title);
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.getByRole('link', { name: title })).toBeVisible();

  const row = page.getByRole('link', { name: title }).locator('xpath=..');
  await row.locator('button[aria-label="More options"]').click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('link', { name: title })).not.toBeVisible();
});
