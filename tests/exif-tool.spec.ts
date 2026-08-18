import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// sample.jpg has no EXIF segment (JFIF-only header) and therefore no GPS
// data, so the GPS warning banner is expected NOT to appear here — this
// spec only exercises the view/remove flow, not GPS detection.
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.jpg');

test.describe('EXIF / Metadata tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/metadata/');
  });

  test('view mode reports no metadata for a fixture with no EXIF data', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // View tab is the default when mode="both"
    await expect(page.getByRole('button', { name: /^view metadata$/i })).toBeVisible();
    await expect(page.getByText(/^No metadata found$/)).toBeVisible({ timeout: 15_000 });

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('remove mode strips metadata and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^remove metadata$/i }).click();
    await page.getByRole('button', { name: /^remove all metadata$/i }).click();

    await expect(page.getByText(/^All metadata removed successfully$/)).toBeVisible({ timeout: 15_000 });

    const downloadBtn = page.getByRole('button', { name: /^download clean image$/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('dedicated remover route defaults straight to remove mode', async ({ page }) => {
    await page.goto('/metadata/remover/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // mode="remove" hides the view/remove tab switcher entirely
    await expect(page.getByRole('button', { name: /^view metadata$/i })).toHaveCount(0);
    await page.getByRole('button', { name: /^remove all metadata$/i }).click();
    await expect(page.getByText(/^All metadata removed successfully$/)).toBeVisible({ timeout: 15_000 });
  });
});
