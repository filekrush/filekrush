# Filekrush Playwright scaffold

## Install (run inside your actual filekrush repo)
```
npm install -D @playwright/test
npx playwright install --with-deps   # downloads chromium/firefox/webkit binaries
```
Copy `playwright.config.ts` and the `tests/` folder into your repo root.

## Run
```
npx playwright test                        # all browsers/devices, starts dev server automatically
npx playwright test --project=webkit        # just the iOS Safari proxy
npx playwright test --project=iphone-se     # just the small-viewport mobile check
npx playwright show-report                  # view HTML report after a run
```
Against production instead of local dev:
```
BASE_URL=https://filekrush.com npx playwright test
```

## Before this test will pass as-is
The selectors in `compress-image.spec.ts` are guesses based on your project doc
(FileDropZone, BeforeAfter, DownloadButton). Open the real page in a browser,
inspect the DOM, and swap in the actual selectors — ideally add `data-testid`
attributes to CompressImage.tsx / BeforeAfter.tsx / DownloadButton.tsx so tests
don't break every time you tweak copy or styling. That's a 10-minute job and
worth doing before replicating this pattern to the other 6 tools.

## Replicating to other tools
One spec file per tool, same shape: upload fixture → assert output state →
trigger download → assert zero console errors. For tools needing different
fixtures (PDF, HEIC), add them to tests/fixtures/.

## CI (optional, catches breakage on every push before Cloudflare deploys)
Add `.github/workflows/playwright.yml`:
```yaml
name: Playwright
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: playwright-report, path: playwright-report/ }
```
