import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = [
  path.join(__dirname, 'fixtures', 'sample.jpg'),
  path.join(__dirname, 'fixtures', 'sample2.jpg'),
  path.join(__dirname, 'fixtures', 'sample3.jpg'),
];

test.describe('Image to PDF tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/image-to-pdf/');
  });

  test('creates a multi-page PDF from 3 images and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURES);

    await expect(page.getByText(/^Drag to reorder\s•\s3\simages$/)).toBeVisible();

    await page.getByRole('button', { name: /^create pdf \(3 pages\)$/i }).click();

    await expect(page.getByText(/^PDF created\s—\s3\spages\s—\s\d+\sKB$/)).toBeVisible({
      timeout: 15_000,
    });

    const downloadBtn = page.getByRole('button', { name: /^download pdf$/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('supports removing an image before conversion', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURES);
    await expect(page.getByText(/^Drag to reorder\s•\s3\simages$/)).toBeVisible();

    // The remove ("✕") button is only visible on hover in real usage, but it
    // still exists in the DOM and is clickable directly in a test.
    await page.getByRole('button', { name: '✕' }).first().click();

    await expect(page.getByText(/^Drag to reorder\s•\s2\simages$/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^create pdf \(2 pages\)$/i })).toBeVisible();
  });

  test('supports reordering images via drag and drop', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURES);
    await expect(page.getByText(/^Drag to reorder\s•\s3\simages$/)).toBeVisible();

    const thumbs = page.locator('.grid > div[draggable="true"]');
    const namesBefore = await thumbs.locator('p').allTextContents();
    expect(namesBefore).toEqual(['sample.jpg', 'sample2.jpg', 'sample3.jpg']);

    // Drag the first thumbnail onto the last one to move it to the end.
    await thumbs.nth(0).dragTo(thumbs.nth(2));

    const namesAfter = await thumbs.locator('p').allTextContents();
    expect(namesAfter).not.toEqual(namesBefore);
    expect(namesAfter.sort()).toEqual([...namesBefore].sort());
  });
});
