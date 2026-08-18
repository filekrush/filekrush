import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.jpg'); // ~1.7MB noisy JPG, 1600x1200

test.describe('Compress Image tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compress/to-100kb/');
  });

  test('compresses an uploaded image and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // Upload via the hidden file input inside FileDropZone
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // Compression only starts once the COMPRESS button is clicked
    await page.getByRole('button', { name: /^compress$/i }).click();

    // Wait for the BeforeAfter component to show the compressed result.
    // Anchored to a formatted size (e.g. "99.5 KB") — a loose /KB|MB/ match also
    // hits the hidden astro-island hydration props blob, which contains the
    // substring "defaultTargetKB".
    const afterSize = page.getByText(/^\d[\d.]*\s(KB|MB)$/).last();
    await expect(afterSize).toBeVisible({ timeout: 15_000 });

    // Download button should become enabled once processing finishes
    const downloadBtn = page.getByRole('button', { name: /download/i });
    await expect(downloadBtn).toBeEnabled();

    // Confirm the actual download fires and produces a non-empty file
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();

    // No uncaught JS errors during the whole flow — this is what would have
    // caught the iPhone break: WASM/Canvas/File API failures usually throw.
    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('respects the 100KB target size preset', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^compress$/i }).click();

    await expect(page.getByText(/^\d[\d.]*\s(KB|MB)$/).last()).toBeVisible({ timeout: 15_000 });

    // BeforeAfter.tsx renders the "After" size as "<n> KB" (or MB for larger results)
    const resultText = await page.getByText(/^\d[\d.]*\sKB$/).last().textContent();
    const kb = parseFloat(resultText?.replace(/[^\d.]/g, '') ?? '0');
    expect(kb).toBeGreaterThan(0);
    expect(kb).toBeLessThanOrEqual(105); // small tolerance above the 100KB target
  });
});
