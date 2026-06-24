import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/**
 * Vérifie que les modules historiquement cassés par le bug `req.user.id` (16 controllers)
 * répondent correctement (pas de 500) après le fix du JwtStrategy.
 * On exerce les principaux endpoints GET avec le persona adéquat.
 */
test.describe('Modules réparés (req.user.id) — endpoints GET sans 500', () => {
  let artisan: any, admin: any, client: any;

  test.beforeAll(async ({ playwright }) => {
    artisan = await apiContext(playwright, 'artisan');
    admin = await apiContext(playwright, 'admin');
    client = await apiContext(playwright, 'client');
  });
  test.afterAll(async () => { await artisan?.dispose(); await admin?.dispose(); await client?.dispose(); });

  const cases: Array<[string, () => any, string]> = [];
  // (persona, path) — évalués à l'exécution via getters
  const defs: Array<{ who: 'artisan' | 'admin' | 'client'; paths: string[] }> = [
    { who: 'artisan', paths: [
      '/api/portfolio', '/api/portfolio/projects',
      '/api/documents', '/api/documents/templates', '/api/documents/templates/global',
      '/api/crm/clients', '/api/crm/clients/stats', '/api/crm/follow-ups',
      '/api/subcontractor-portal/dashboard', '/api/subcontractor-portal/offers', '/api/subcontractor-portal/assignments',
      '/api/recurring-services', '/api/recurring-services/stats', '/api/recurring-services/upcoming',
      '/api/checklists/templates', '/api/checklists/templates/global',
    ]},
    { who: 'client', paths: [
      '/api/support/tickets',
      '/api/knowledge-base/articles', '/api/knowledge-base/categories', '/api/knowledge-base/featured', '/api/knowledge-base/tags',
    ]},
    { who: 'admin', paths: [
      '/api/admin/analytics/metrics', '/api/admin/analytics/time-series', '/api/admin/analytics/top-artisans',
    ]},
  ];

  for (const d of defs) {
    for (const p of d.paths) {
      test(`${d.who} GET ${p} → pas de 500`, async () => {
        const ctx = d.who === 'artisan' ? artisan : d.who === 'admin' ? admin : client;
        const r = await ctx.get(p);
        expect(r.status(), `${p} a renvoyé ${r.status()}: ${await r.text()}`).toBeLessThan(500);
      });
    }
  }
});
