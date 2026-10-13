import { defineConfig } from '@playwright/test';

// Browser smoke tests against the web build. They exercise the same screens and
// the same core logic as the phone app, with a fixed clock so results are stable.
//   npm run e2e
// Set PW_CHROMIUM=/path/to/chromium to use a browser you already have.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:8099',
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath: process.env.PW_CHROMIUM || undefined,
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'npx expo export --platform web --output-dir dist-e2e && npx serve dist-e2e -l 8099 --no-clipboard',
    url: 'http://localhost:8099',
    reuseExistingServer: true,
    timeout: 240_000,
    env: { EXPO_OFFLINE: '1', CI: '1' },
  },
});
