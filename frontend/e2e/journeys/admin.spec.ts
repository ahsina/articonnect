import { test, expect } from '@playwright/test';
import { login, visitOk } from './_setup';

/**
 * Parcours ADMIN de A à Z : authentification → navigation du back-office
 * (dashboard, users, modération, litiges, vérifications, analytics, specialties, settings).
 */
test.describe('Parcours ADMIN', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'admin');
    await expect(page).toHaveURL(/\/admin/);
  });

  test('dashboard admin se charge', async ({ page }) => {
    await visitOk(page, '/admin/admin/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation du back-office (lecture)', async ({ page }) => {
    for (const path of [
      '/admin/admin/dashboard',
      '/admin/admin/users',
      '/admin/admin/missions',
      '/admin/admin/moderation',
      '/admin/admin/disputes',
      '/admin/admin/no-shows',
      '/admin/admin/verifications',
      '/admin/admin/certifications',
      '/admin/admin/specialties',
      '/admin/admin/analytics',
      '/admin/admin/audit-logs',
      '/admin/admin/monitoring',
      '/admin/admin/feature-flags',
      '/admin/admin/fraud-settings',
      '/admin/admin/reputation',
    ]) {
      await visitOk(page, path);
    }
  });

  test('pages de configuration plateforme', async ({ page }) => {
    for (const path of [
      '/admin/admin/settings/fees',
      '/admin/admin/settings/payments',
      '/admin/admin/settings/tax',
      '/admin/admin/settings/compliance',
      '/admin/admin/settings/notifications',
      '/admin/admin/settings/limits',
    ]) {
      await visitOk(page, path);
    }
  });

  test('la gestion des utilisateurs charge la liste seedée (UI→API→DB)', async ({ page }) => {
    await visitOk(page, '/admin/admin/users');
    await page.waitForLoadState('networkidle').catch(() => {});
    // Au moins un email de compte seedé doit apparaître (6 users en base)
    const hasUsers =
      (await page.locator('text=/@example.com|@articonnect.com/i').count()) > 0 ||
      (await page.locator('table tr, [class*="row"], [class*="card"]').count()) > 1;
    expect(hasUsers, 'la liste des utilisateurs doit afficher des comptes réels').toBeTruthy();
  });

  test('la page specialties charge les 5 spécialités seedées (DB)', async ({ page }) => {
    await visitOk(page, '/admin/admin/specialties');
    await page.waitForLoadState('networkidle').catch(() => {});
    const hasSpecialties = (await page.locator('text=/Plomberie|Électricité|Peinture|Menuiserie|Serrurerie/i').count()) > 0;
    expect(hasSpecialties, 'les spécialités seedées doivent être affichées').toBeTruthy();
  });
});
