import { test as base, expect } from '@playwright/test';

/**
 * Custom test fixtures for ArtiConnect E2E tests
 */

// Test user credentials for authenticated tests
export const testUsers = {
  client: {
    email: 'test.client@articonnect.com',
    password: 'TestPassword123!',
    role: 'CLIENT',
  },
  artisan: {
    email: 'test.artisan@articonnect.com',
    password: 'TestPassword123!',
    role: 'ARTISAN',
  },
  admin: {
    email: 'test.admin@articonnect.com',
    password: 'TestPassword123!',
    role: 'ADMIN',
  },
};

// Extend base test with custom fixtures
export const test = base.extend<{
  authenticatedPage: ReturnType<typeof base.extend>;
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await page.goto('/login');
    await page.fill('input[type="email"]', testUsers.client.email);
    await page.fill('input[type="password"]', testUsers.client.password);
    await page.locator('button[type="submit"]').click();

    // Wait for redirect (login success)
    await page.waitForURL(/dashboard|home/, { timeout: 10000 }).catch(() => {
      // If redirect doesn't happen, continue anyway for tests that mock auth
    });

    await use(page);
  },
});

export { expect };

/**
 * Helper functions for E2E tests
 */
export const helpers = {
  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(page: any, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
  },

  /**
   * Fill a form field by label text
   */
  async fillByLabel(page: any, labelText: string, value: string) {
    const label = page.locator(`label:has-text("${labelText}")`);
    const input = page.locator(`input[id="${await label.getAttribute('for')}"]`);
    await input.fill(value);
  },

  /**
   * Check if toast notification appears
   */
  async expectToast(page: any, message: string | RegExp) {
    const toast = page.locator('[role="status"], .toast, [class*="toast"]');
    await expect(toast).toContainText(message);
  },

  /**
   * Generate a unique test email
   */
  generateTestEmail() {
    return `test.${Date.now()}@articonnect.test`;
  },

  /**
   * Mock API response
   */
  async mockApiResponse(page: any, url: string | RegExp, response: any) {
    await page.route(url, (route: any) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  },

  /**
   * Check for loading state
   */
  async waitForLoadingComplete(page: any) {
    // Wait for any loading spinners to disappear
    const loadingIndicators = page.locator('[class*="loading"], [class*="spinner"], .animate-spin');
    await loadingIndicators.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // Ignore if no loading indicators found
    });
  },
};
