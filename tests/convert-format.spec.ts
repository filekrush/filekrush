import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JPG_FIXTURE = path.join(__dirname, 'fixtures', 'sample.jpg');

test.describe('Convert Format tool', () => {
  test('converts JPG to PNG and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // /convert/jpg-to-png presets fromFormat/toFormat, so the format picker
    // buttons don't need to be touched.
    await page.goto('/convert/jpg-to-png/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(JPG_FIXTURE);

    await page.getByRole('button', { name: /^convert to png$/i }).click();

    // BeforeAfter renders the "After" size, and a separate line renders
    // "JPG → PNG" once conversion finishes.
    await expect(page.getByText(/^\d[\d.]*\s(KB|MB)$/).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^JPG\s→\sPNG$/)).toBeVisible();

    const downloadBtn = page.getByRole('button', { name: /^download png$/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('converts JPG to WebP and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/convert/jpg-to-webp/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(JPG_FIXTURE);

    await page.getByRole('button', { name: /^convert to webp$/i }).click();

    await expect(page.getByText(/^\d[\d.]*\s(KB|MB)$/).last()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/^JPG\s→\sWebP$/)).toBeVisible();

    const downloadBtn = page.getByRole('button', { name: /^download webp$/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });
});
