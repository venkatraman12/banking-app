import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'always' }]],

  use: {
    baseURL: 'http://localhost:3000',
    actionTimeout: 10000,
    headless: false,
    video: 'off',
    screenshot: 'only-on-failure',
    slowMo: process.env.PLAYWRIGHT_SLOW_MO !== undefined ? Number(process.env.PLAYWRIGHT_SLOW_MO) : 600,
  },

  projects: [
    // ── Default desktop (npm test) ──────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: /mobile\.spec\.js/,
    },

    // ── Cross-browser desktop (npm run test:browsers) ───────────────────────
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
      testMatch: /banking-app\.spec\.js/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
      testMatch: /banking-app\.spec\.js/,
    },

    // ── Mobile devices (npm run test:mobile) ────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'], slowMo: 300 },
      testMatch: /mobile\.spec\.js/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'], slowMo: 300 },
      testMatch: /mobile\.spec\.js/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 15000,
  },
})
