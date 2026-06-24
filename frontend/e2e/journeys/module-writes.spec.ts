import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/** Flux d'écriture des modules réparés : création + relecture (UI→API→DB). */
test.describe('Écritures modules (création → relecture)', () => {
  let artisan: any, client: any;
  test.beforeAll(async ({ playwright }) => {
    artisan = await apiContext(playwright, 'artisan');
    client = await apiContext(playwright, 'client');
  });
  test.afterAll(async () => { await artisan?.dispose(); await client?.dispose(); });

  test('Artisan crée un projet portfolio', async () => {
    const title = `Projet E2E ${Date.now()}`;
    const r = await artisan.post('/api/portfolio/projects', {
      data: { title, category: 'Plomberie', description: 'Rénovation salle de bain', city: 'Luxembourg', country: 'LU' },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const list = await (await artisan.get('/api/portfolio/projects')).json();
    const arr = Array.isArray(list) ? list : (list.data ?? []);
    expect(arr.some((p: any) => p.title === title)).toBeTruthy();
  });

  test('Client crée un ticket de support', async () => {
    const subject = `Ticket E2E ${Date.now()}`;
    const r = await client.post('/api/support/tickets', {
      data: { subject, description: 'Demande de test e2e.', category: 'TECHNICAL_ISSUE' },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const list = await (await client.get('/api/support/tickets')).json();
    const arr = Array.isArray(list) ? list : (list.data ?? []);
    expect(arr.some((t: any) => t.subject === subject)).toBeTruthy();
  });
});
