import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.pdf'); // small 3-page text-only PDF (~2.4KB)

test.describe('Compress PDF tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/compress-pdf/');
  });

  test('compresses an uploaded PDF and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^compress pdf$/i }).click();

    // This fixture is a tiny text-only PDF, so CompressPdf.tsx is likely to
    // report "noChange" rather than an actual size reduction — the download
    // button and its label depend on which branch fires, so wait for either.
    const noChangeMsg = page.getByText(/couldn't be compressed further/i);
    const compressedSize = page.getByText(/^\d[\d.]*\s(KB|MB)$/).last();
    await expect(noChangeMsg.or(compressedSize)).toBeVisible({ timeout: 15_000 });

    const downloadBtn = page.getByRole('button', { name: /download (original|compressed pdf)/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('supports switching compression level before compressing', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    // The button's accessible name concatenates the label and hint spans
    // ("Maximum" + "Smallest file"), so match a prefix rather than the exact label.
    await page.getByRole('button', { name: /^maximum/i }).click();
    await page.getByRole('button', { name: /^compress pdf$/i }).click();

    const downloadBtn = page.getByRole('button', { name: /download (original|compressed pdf)/i });
    await expect(downloadBtn).toBeEnabled({ timeout: 15_000 });
  });
});
