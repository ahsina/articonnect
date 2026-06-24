import { test, expect } from '@playwright/test';
import { login, visitOk } from './_setup';

/**
 * Parcours ARTISAN de A à Z : authentification → navigation de l'espace artisan
 * (dashboard, missions, devis, revenus, profil, certifications, disponibilités, entreprise).
 */
test.describe('Parcours ARTISAN', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'artisan');
    await expect(page).toHaveURL(/\/artisan/);
  });

  test('dashboard se charge', async ({ page }) => {
    await visitOk(page, '/artisan/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation de tout l\'espace artisan (lecture)', async ({ page }) => {
    for (const path of [
      '/artisan/dashboard',
      '/artisan/missions',
      '/artisan/quotations',
      '/artisan/earnings',
      '/artisan/analytics',
      '/artisan/profile',
      '/artisan/certifications',
      '/artisan/messages',
      '/artisan/availability/working-hours',
      '/artisan/availability/calendar',
      '/artisan/availability/time-off',
      '/artisan/settings',
    ]) {
      await visitOk(page, path);
    }
  });

  test('espace entreprise se charge', async ({ page }) => {
    for (const path of [
      '/artisan/company/dashboard',
      '/artisan/company/employees',
      '/artisan/company/assignments',
      '/artisan/company/reports',
    ]) {
      await visitOk(page, path);
    }
  });

  test('la page missions charge des données sans erreur (UI→API→DB)', async ({ page }) => {
    await visitOk(page, '/artisan/missions');
    await page.waitForLoadState('networkidle').catch(() => {});
    // La page rend une structure (liste vide acceptable, mais pas d'erreur)
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=/Application error|something went wrong/i')).toHaveCount(0);
  });
});
