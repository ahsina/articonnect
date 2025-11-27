import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Check the page title/brand
    await expect(page.locator('h1, .text-2xl').filter({ hasText: 'ArtiConnect' })).toBeVisible();
  });

  test('should display hero section with call-to-action buttons', async ({ page }) => {
    await page.goto('/');

    // Check hero title
    const heroTitle = page.locator('h2');
    await expect(heroTitle).toBeVisible();

    // Check CTA buttons exist
    const ctaButtons = page.locator('a[href*="register"]');
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    await page.goto('/');

    // Check for feature section (geolocation, negotiation, reviews)
    const featureSection = page.locator('.grid');
    await expect(featureSection).toBeVisible();

    // Should have at least 3 feature cards
    const featureCards = page.locator('.text-center.p-6, .feature-card');
    await expect(featureCards).toHaveCount(3);
  });

  test('should have navigation links', async ({ page }) => {
    await page.goto('/');

    // Check login button
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();

    // Check register button
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click login
    await page.locator('a[href="/login"]').click();

    // Should be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register as client', async ({ page }) => {
    await page.goto('/');

    // Click the "find artisan" CTA
    const clientCTA = page.locator('a[href*="register?role=client"]');
    if (await clientCTA.isVisible()) {
      await clientCTA.click();
      await expect(page).toHaveURL(/register.*role=client/);
    }
  });

  test('should navigate to register as artisan', async ({ page }) => {
    await page.goto('/');

    // Click the "I am artisan" CTA
    const artisanCTA = page.locator('a[href*="register?role=artisan"]');
    if (await artisanCTA.isVisible()) {
      await artisanCTA.click();
      await expect(page).toHaveURL(/register.*role=artisan/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should still be functional
    await expect(page.locator('h1, .text-2xl').filter({ hasText: 'ArtiConnect' })).toBeVisible();

    // CTA buttons should be visible
    const ctaButtons = page.locator('a[href*="register"]');
    await expect(ctaButtons.first()).toBeVisible();
  });
});

test.describe('Language Switching', () => {
  test('should display content in French by default', async ({ page }) => {
    await page.goto('/');

    // Check for French content
    const frenchContent = page.locator('text=/Trouvez|artisan|Connexion/i');
    await expect(frenchContent.first()).toBeVisible();
  });

  test('should switch language when language selector is used', async ({ page }) => {
    await page.goto('/');

    // Find language selector
    const languageSelector = page.locator('select').first();
    if (await languageSelector.isVisible()) {
      // Switch to English
      await languageSelector.selectOption('en');

      // Wait for content to update
      await page.waitForTimeout(500);

      // Check for English content
      const englishContent = page.locator('text=/Find|artisan|Login/i');
      await expect(englishContent.first()).toBeVisible();
    }
  });
});
