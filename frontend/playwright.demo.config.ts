import { defineConfig, devices } from '@playwright/test';

/**
 * Config Playwright dédiée aux parcours E2E exécutés contre le déploiement DÉMO
 * (HTTPS auto-signé sur IP) — voir e2e/journeys/.
 * Usage : PLAYWRIGHT_BASE_URL=https://149.56.131.178:9443 npx playwright test --config=playwright.demo.config.ts
 */
export default defineConfig({
  testDir: './e2e/journeys',
  fullyParallel: false,
  workers: 1,
  retries: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://149.56.131.178:9443',
    ignoreHTTPSErrors: true, // certificat auto-signé de la démo
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
