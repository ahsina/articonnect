import { test, expect } from '@playwright/test';
import { login, DEMO_USERS } from './_setup';

/** Smoke : valide que l'authentification réelle fonctionne pour les 3 rôles et redirige correctement. */
test.describe('Smoke — authentification des 3 personas', () => {
  for (const persona of ['client', 'artisan', 'admin'] as const) {
    test(`login ${persona} → dashboard`, async ({ page }) => {
      await login(page, persona);
      // On doit avoir quitté /auth/login et atterri dans l'espace du rôle
      await expect(page).not.toHaveURL(/\/auth\/login/);
      const u = DEMO_USERS[persona];
      // L'URL contient l'espace attendu (client|artisan|admin)
      const space = persona === 'admin' ? 'admin' : persona;
      await expect(page).toHaveURL(new RegExp(`/${space}`));
    });
  }
});
