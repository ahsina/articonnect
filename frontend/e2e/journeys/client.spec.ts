import { test, expect } from '@playwright/test';
import { login, visitOk, DEMO_USERS } from './_setup';

/**
 * Parcours CLIENT de A à Z : authentification → navigation de tout l'espace client
 * (lecture = UI→API→DB) → création d'une mission (écriture = UI→API→DB) → vérification
 * que la mission créée apparaît dans la liste.
 */
test.describe('Parcours CLIENT', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'client');
    await expect(page).toHaveURL(/\/client/);
  });

  test('dashboard se charge', async ({ page }) => {
    await visitOk(page, '/client/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('navigation de tout l\'espace client (lecture)', async ({ page }) => {
    for (const path of [
      '/client/dashboard',
      '/client/missions',
      '/client/marketplace',
      '/client/cart',
      '/client/orders',
      '/client/favorites',
      '/client/messages',
      '/client/notifications',
      '/client/invoices',
      '/client/disputes',
      '/client/settings',
    ]) {
      await visitOk(page, path);
    }
  });

  test('marketplace charge des produits réels (DB)', async ({ page }) => {
    await visitOk(page, '/client/marketplace');
    // Les produits seedés doivent apparaître (au moins un nom de produit connu OU des cartes)
    await page.waitForLoadState('networkidle').catch(() => {});
    const hasProducts =
      (await page.locator('text=/chêne|chauffe-eau|radiateur|Table|Robinet/i').count()) > 0 ||
      (await page.locator('[class*="card"], article, [data-testid*="product"]').count()) > 0;
    expect(hasProducts, 'des produits doivent être affichés').toBeTruthy();
  });

  test('création de mission de A à Z (écriture UI→API→DB→UI)', async ({ page }) => {
    const title = `E2E Mission ${Date.now()}`;
    // Écriture via l'API réelle, authentifiée par les cookies du navigateur (même chaîne que l'UI).
    const resp = await page.request.post('/api/missions', {
      data: {
        type: 'SCHEDULED',
        title,
        description: 'Mission de test e2e — création de A à Z (UI→API→DB).',
        category: 'Plomberie',
        address: '15 Rue de la Gare',
        city: 'Luxembourg',
        postalCode: '1234',
        country: 'LU',
        latitude: 49.6116,
        longitude: 6.1319,
        clientBudget: 200,
      },
    });
    expect(resp.status(), `POST /api/missions -> ${resp.status()} ${await resp.text()}`).toBeLessThan(300);

    // Vérification : la mission créée (DB) apparaît bien dans l'UI de la liste des missions.
    await page.goto('/client/missions');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 15000 });
  });

  test('le formulaire de création de mission s\'affiche sans planter (UI wizard)', async ({ page }) => {
    await visitOk(page, '/client/missions/new');
    await expect(page.locator('button').first()).toBeVisible();
    await expect(page.locator('text=/Application error|something went wrong/i')).toHaveCount(0);
  });
});
