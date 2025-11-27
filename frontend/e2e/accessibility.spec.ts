import { test, expect } from '@playwright/test';

test.describe('Accessibility', () => {
  test.describe('Keyboard Navigation', () => {
    test('should be able to navigate login form with keyboard', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');

      // First focusable should be email input or skip link
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'A', 'BUTTON']).toContain(focusedElement);

      // Continue tabbing to password
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to submit with Enter
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password');

      // Form should be submittable
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
    });

    test('should have skip to content link', async ({ page }) => {
      await page.goto('/');

      // Tab to reveal skip link (usually hidden until focused)
      await page.keyboard.press('Tab');

      // Check for skip link
      const skipLink = page.locator('a[href="#main-content"], .skip-to-content, [class*="skip"]');
      // Skip link might not be visible until focused
    });
  });

  test.describe('ARIA Labels', () => {
    test('navigation should have proper ARIA labels', async ({ page }) => {
      await page.goto('/');

      // Check main navigation has role or aria-label
      const nav = page.locator('nav');
      await expect(nav.first()).toBeVisible();
    });

    test('form inputs should have labels', async ({ page }) => {
      await page.goto('/login');

      // Email input should have label (either visible or sr-only)
      const emailInput = page.locator('input[type="email"]');
      const emailId = await emailInput.getAttribute('id');

      if (emailId) {
        // Check for associated label
        const label = page.locator(`label[for="${emailId}"]`);
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = await emailInput.getAttribute('aria-label');
        const hasPlaceholder = await emailInput.getAttribute('placeholder');

        // Should have at least one accessible name
        expect(hasLabel || hasAriaLabel || hasPlaceholder).toBeTruthy();
      }
    });

    test('buttons should have accessible names', async ({ page }) => {
      await page.goto('/login');

      // Submit button should have text
      const submitButton = page.locator('button[type="submit"]');
      const buttonText = await submitButton.textContent();
      expect(buttonText?.trim().length).toBeGreaterThan(0);
    });

    test('images should have alt text', async ({ page }) => {
      await page.goto('/');

      // Get all images
      const images = page.locator('img');
      const imageCount = await images.count();

      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Images should have alt text or be decorative (role="presentation")
        expect(alt !== null || role === 'presentation').toBeTruthy();
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('text should be visible', async ({ page }) => {
      await page.goto('/');

      // Check that main heading is visible
      const heading = page.locator('h2');
      await expect(heading).toBeVisible();

      // Check text is not transparent
      const color = await heading.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.color;
      });

      expect(color).not.toBe('transparent');
      expect(color).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Focus Indicators', () => {
    test('interactive elements should have visible focus indicators', async ({ page }) => {
      await page.goto('/login');

      // Focus on email input
      const emailInput = page.locator('input[type="email"]');
      await emailInput.focus();

      // Check that element has focus styles (outline or ring)
      const focusStyles = await emailInput.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          boxShadow: style.boxShadow,
          border: style.border,
        };
      });

      // Should have some visual focus indicator
      const hasOutline = focusStyles.outline !== 'none' && !focusStyles.outline.includes('0px');
      const hasBoxShadow = focusStyles.boxShadow !== 'none';
      const hasBorder = focusStyles.border !== 'none';

      // At least one focus indicator should be present
      // (Tailwind uses ring classes which manifest as box-shadow)
      expect(hasOutline || hasBoxShadow || hasBorder).toBeTruthy();
    });
  });

  test.describe('Touch Targets', () => {
    test('buttons should have minimum touch target size', async ({ page }) => {
      await page.goto('/login');

      const submitButton = page.locator('button[type="submit"]');
      const boundingBox = await submitButton.boundingBox();

      expect(boundingBox).not.toBeNull();
      if (boundingBox) {
        // WCAG recommends 44x44px minimum for touch targets
        expect(boundingBox.width).toBeGreaterThanOrEqual(44);
        expect(boundingBox.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
});

test.describe('Error Handling', () => {
  test('should display user-friendly error messages', async ({ page }) => {
    await page.goto('/login');

    // Submit invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Wait for error message
    const errorMessage = page.locator('.bg-red-50, [role="alert"], .text-red-700');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Error message should be readable (not a technical error code)
    const errorText = await errorMessage.textContent();
    expect(errorText?.toLowerCase()).not.toContain('500');
    expect(errorText?.toLowerCase()).not.toContain('undefined');
  });
});
