import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/login');

      // Check page title
      await expect(page.locator('h2')).toContainText(/connexion|login|anmelden/i);

      // Check form elements exist
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Check register link
      await expect(page.locator('a[href="/register"]')).toBeVisible();
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.locator('button[type="submit"]').click();

      // Email field should be required
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('required', '');
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');

      // Submit form
      await page.locator('button[type="submit"]').click();

      // Should show error message (wait for API response)
      await expect(page.locator('.bg-red-50, [role="alert"]')).toBeVisible({ timeout: 10000 });
    });

    test('should navigate to register page', async ({ page }) => {
      await page.goto('/login');

      // Click register link
      await page.locator('a[href="/register"]').click();

      // Should be on register page
      await expect(page).toHaveURL('/register');
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Click forgot password link
      const forgotLink = page.locator('a[href="/reset-password"]');
      if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await expect(page).toHaveURL('/reset-password');
      }
    });
  });

  test.describe('Register Page', () => {
    test('should display registration form', async ({ page }) => {
      await page.goto('/register');

      // Check page title
      await expect(page.locator('h2')).toContainText(/créer|create|konto/i);

      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();

      // Check role selection buttons
      await expect(page.locator('button').filter({ hasText: /artisan|handwerker/i })).toBeVisible();
      await expect(page.locator('button').filter({ hasText: /cherche|need|suche/i })).toBeVisible();
    });

    test('should toggle between client and artisan roles', async ({ page }) => {
      await page.goto('/register');

      // Click artisan button
      const artisanButton = page.locator('button').filter({ hasText: /artisan|handwerker/i });
      await artisanButton.click();

      // Artisan button should be active (default variant)
      await expect(artisanButton).toHaveClass(/bg-/);
    });

    test('should show password mismatch error', async ({ page }) => {
      await page.goto('/register');

      // Fill form with mismatched passwords
      await page.fill('input[placeholder*="Prénom"], input[placeholder*="First"]', 'John');
      await page.fill('input[placeholder*="Nom"], input[placeholder*="Last"]', 'Doe');
      await page.fill('input[type="email"]', 'john@example.com');
      await page.fill('input[type="password"]').first().fill('password123');
      await page.locator('input[type="password"]').nth(1).fill('differentpassword');

      // Check terms checkbox
      const checkbox = page.locator('input[type="checkbox"]');
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }

      // Submit form
      await page.locator('button[type="submit"]').click();

      // Should show error
      await expect(page.locator('.bg-red-50, [role="alert"]')).toBeVisible({ timeout: 5000 });
    });

    test('should navigate to login page', async ({ page }) => {
      await page.goto('/register');

      // Click login link
      await page.locator('a[href="/login"]').click();

      // Should be on login page
      await expect(page).toHaveURL('/login');
    });
  });
});
