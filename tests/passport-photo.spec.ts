import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.jpg');

test.describe('Passport Photo tool', () => {
  test('generates an Indian passport photo (600x600px) and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    // /passport-photo/india presets defaultCountry="india", so the country
    // picker doesn't need to be touched.
    await page.goto('/passport-photo/india/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^generate passport photo$/i }).click();

    // Success banner text is built from passport-specs.json: "India passport
    // photo — 600 × 600px — <n> KB".
    await expect(page.getByText(/^India passport photo\s—\s600\s×\s600px\s—\s\d+\sKB$/)).toBeVisible({
      timeout: 15_000,
    });

    const downloadBtn = page.getByRole('button', { name: /download passport photo/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('generates a US passport photo (600x600px) and enables download', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/passport-photo/usa/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^generate passport photo$/i }).click();

    await expect(
      page.getByText(/^United States passport photo\s—\s600\s×\s600px\s—\s\d+\sKB$/)
    ).toBeVisible({ timeout: 15_000 });

    const downloadBtn = page.getByRole('button', { name: /download passport photo/i });
    await expect(downloadBtn).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click(),
    ]);
    expect(await download.path()).not.toBeNull();

    expect(consoleErrors, `Console/page errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
  });

  test('switching country on the generic tool updates the target spec', async ({ page }) => {
    // /passport-photo (index) defaults to India but exposes the full
    // country picker, letting us exercise the country-switch behavior.
    await page.goto('/passport-photo/');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(FIXTURE);

    await page.getByRole('button', { name: /^United Kingdom$/ }).click();
    await expect(page.getByText(/35\s×\s45mm\s•\s413\s×\s531px/)).toBeVisible();

    await page.getByRole('button', { name: /^generate passport photo$/i }).click();
    await expect(
      page.getByText(/^United Kingdom passport photo\s—\s413\s×\s531px\s—\s\d+\sKB$/)
    ).toBeVisible({ timeout: 15_000 });
  });
});
