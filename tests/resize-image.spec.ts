import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.jpg'); // 1600x1200 noisy JPG

test.describe('Resize Image tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resize/');
  });

  test('resizes to a preset that matches the original aspect ratio', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // sample.jpg is 1600x1200 (4:3), so 800x600 keeps the same ratio and
    // ResizeImage.tsx skips the crop/stretch picker entirely.
    await page.getByRole('button', { name: /^800×600$/ }).click();
    await page.getByRole('button', { name: /^resize$/i }).click();

    // BeforeAfter block renders dimensions as "<w> × <h>" — the "After" value
    // is the second occurrence of this exact pattern on the page.
    const afterDims = page.getByText(/^\d+\s×\s\d+$/).last();
    await expect(afterDims).toHaveText('800 × 600', { timeout: 15_000 });

    const downloadBtn = page.getByRole('button', { name: /download resized image/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('resizes to a preset with a different aspect ratio using stretch mode', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // 600x600 doesn't match the 4:3 original, so a crop/stretch picker
    // appears — pick "Stretch" to avoid simulating canvas drag interactions.
    await page.getByRole('button', { name: /^600×600$/ }).click();
    await expect(page.getByRole('button', { name: /^stretch$/i })).toBeVisible();
    await page.getByRole('button', { name: /^stretch$/i }).click();
    await page.getByRole('button', { name: /^resize$/i }).click();

    const afterDims = page.getByText(/^\d+\s×\s\d+$/).last();
    await expect(afterDims).toHaveText('600 × 600', { timeout: 15_000 });

    const downloadBtn = page.getByRole('button', { name: /download resized image/i });
    await expect(downloadBtn).toBeEnabled();
  });
});
