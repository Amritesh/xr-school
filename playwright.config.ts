import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Three.js/WebGL contexts are GPU-heavy; serial browser acceptance avoids
  // false timeouts and context loss when all 35 classes launch together.
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  outputDir: 'tmp/playwright-results',
  webServer: process.env.XR_BASE_URL
    ? undefined
    : {
      command: 'npm --workspace apps/web run start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.XR_BASE_URL ?? 'http://127.0.0.1:3000',
    viewport: { width: 1440, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
