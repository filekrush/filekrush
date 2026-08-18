import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Run your Astro dev server automatically when testing locally.
  // Skip this and pass BASE_URL=https://filekrush.com to test prod instead.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:4321',
        reuseExistingServer: !process.env.CI,
      },

  projects: [
    // Desktop browser engines
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }, // closest proxy to iOS Safari's engine

    // Real device viewports + touch input — catches layout/interaction bugs, not just JS engine bugs
    { name: 'iphone-13', use: { ...devices['iPhone 13'] } },
    { name: 'iphone-se', use: { ...devices['iPhone SE'] } }, // smaller viewport, common budget device
    { name: 'pixel-5', use: { ...devices['Pixel 5'] } },
  ],
});
