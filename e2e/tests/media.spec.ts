import fs from 'node:fs';

import { expect, test } from '@playwright/test';

import { SAMPLE_AUDIO_1, SAMPLE_VIDEO, uniqueName } from './helpers';

// Custom (uniquely named) buffers instead of re-using the fixture path
// directly — the media library is shared/unscoped-for-reads across every
// user (see server/CLAUDE.md), so a fixed filename would collide with
// whatever a previous run already uploaded and make "exactly this card"
// assertions unreliable across repeated runs.
async function uploadUniquelyNamed(
  page: import('@playwright/test').Page,
  sourcePath: string,
  extension: string,
  mimeType: string,
) {
  const name = `${uniqueName('e2e-media')}${extension}`;
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType,
    buffer: fs.readFileSync(sourcePath),
  });
  await expect(page.locator('article', { hasText: name })).toBeVisible({ timeout: 30_000 });
  return name;
}

// Already authenticated as the shared user via playwright.config.ts's default
// storageState (see global-setup.ts) — just navigate in.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('upload', () => {
  test('an uploaded file appears in the library as a card with its filename as the title', async ({ page }) => {
    await uploadUniquelyNamed(page, SAMPLE_AUDIO_1, '.mp3', 'audio/mpeg');
  });
});

test.describe('filter', () => {
  test('switching to the Video tab hides audio-only uploads and shows video ones', async ({ page }) => {
    const audioName = await uploadUniquelyNamed(page, SAMPLE_AUDIO_1, '.mp3', 'audio/mpeg');
    const videoName = await uploadUniquelyNamed(page, SAMPLE_VIDEO, '.mp4', 'video/mp4');

    await page.getByRole('button', { name: 'Video' }).click();
    await expect(page).toHaveURL(/filter=video/);

    await expect(page.locator('article', { hasText: videoName })).toBeVisible();
    await expect(page.locator('article', { hasText: audioName })).not.toBeVisible();
  });

  test('switching to the Audio tab hides video-only uploads', async ({ page }) => {
    const audioName = await uploadUniquelyNamed(page, SAMPLE_AUDIO_1, '.mp3', 'audio/mpeg');
    const videoName = await uploadUniquelyNamed(page, SAMPLE_VIDEO, '.mp4', 'video/mp4');

    await page.getByRole('button', { name: 'Audio' }).click();
    await expect(page).toHaveURL(/filter=audio/);

    await expect(page.locator('article', { hasText: audioName })).toBeVisible();
    await expect(page.locator('article', { hasText: videoName })).not.toBeVisible();
  });

  test('the "All" tab is the default and has no filter param in the URL', async ({ page }) => {
    await expect(page).not.toHaveURL(/filter=/);
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });
});

test.describe('search', () => {
  test('searching narrows the list to matching titles only', async ({ page }) => {
    const targetName = await uploadUniquelyNamed(page, SAMPLE_AUDIO_1, '.mp3', 'audio/mpeg');

    await page.fill('input[placeholder="Search tracks, videos, creators…"]', targetName);
    await expect(page).toHaveURL(/q=/);

    await expect(page.locator('article', { hasText: targetName })).toBeVisible();
    // A search for this exact unique name should leave exactly one result.
    await expect(page.locator('article')).toHaveCount(1);
  });

  test('a search with no matches shows the empty state', async ({ page }) => {
    await page.fill('input[placeholder="Search tracks, videos, creators…"]', 'no-such-track-xyz-nonsense');

    await expect(page.getByText('Nothing here yet — upload something to get started.')).toBeVisible();
  });
});

test.describe('delete', () => {
  test("deleting an own upload via its menu removes it from the list", async ({ page }) => {
    const name = await uploadUniquelyNamed(page, SAMPLE_AUDIO_1, '.mp3', 'audio/mpeg');
    const card = page.locator('article', { hasText: name });

    await card.locator('button[aria-label="More options"]').click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete' }).click();

    await expect(card).not.toBeVisible();
  });
});
