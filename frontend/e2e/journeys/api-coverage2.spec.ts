import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/** Vague 2 : GET de détail (avec id récupéré d'une liste) + écritures fiables → couvre plus de code. */

async function firstId(ctx: any, listPath: string, key = 'id'): Promise<string | null> {
  const r = await ctx.get(listPath).catch(() => null);
  if (!r || r.status() >= 400) return null;
  const j = await r.json().catch(() => null);
  const arr = Array.isArray(j) ? j : (j?.data ?? j?.reports ?? j?.invoices ?? []);
  return arr && arr[0] ? arr[0][key] : null;
}

test.describe('Couverture vague 2 — GET de détail', () => {
  let client: any, artisan: any, admin: any;
  test.beforeAll(async ({ playwright }) => {
    client = await apiContext(playwright, 'client');
    artisan = await apiContext(playwright, 'artisan');
    admin = await apiContext(playwright, 'admin');
  });
  test.afterAll(async () => { await client?.dispose(); await artisan?.dispose(); await admin?.dispose(); });

  test('endpoints de détail sans 500', async () => {
    const errors: string[] = [];
    const pairs: Array<[any, string, string]> = [
      [client, '/api/marketplace/products', '/api/marketplace/products/'],
      [client, '/api/missions', '/api/missions/'],
      [client, '/api/users/artisans', '/api/users/artisans/'],
      [client, '/api/specialties', '/api/specialties/'],
      [admin, '/api/admin/users', '/api/admin/users/'],
      [artisan, '/api/quotes', '/api/quotes/'],
      [artisan, '/api/certifications', '/api/certifications/'],
      [artisan, '/api/portfolio/projects', '/api/portfolio/projects/'],
      [client, '/api/disputes', '/api/disputes/'],
      [client, '/api/support/tickets', '/api/support/tickets/'],
      [client, '/api/knowledge-base/articles', '/api/knowledge-base/articles/'],
    ];
    for (const [ctx, listPath, detailBase] of pairs) {
      const id = await firstId(ctx, listPath);
      if (!id) continue;
      const r = await ctx.get(detailBase + id).catch(() => null);
      const s = r ? r.status() : 0;
      if (s >= 500 || s === 0) errors.push(`${s} ${detailBase}${id}`);
    }
    // missions détail spécifiques (tracking, etc.)
    const mid = await firstId(client, '/api/missions');
    if (mid) for (const sub of ['/tracking', '/cancellation-fees']) {
      const r = await client.get(`/api/missions/${mid}${sub}`).catch(() => null);
      const s = r ? r.status() : 0;
      if (s >= 500) errors.push(`${s} /api/missions/${mid}${sub}`);
    }
    // eslint-disable-next-line no-console
    console.log('@@COV2-detail@@ 5xx=' + errors.length + ' ' + JSON.stringify(errors));
    expect(errors, errors.join(', ')).toHaveLength(0);
  });
});

test.describe('Couverture vague 2 — écritures', () => {
  let client: any, artisan: any;
  test.beforeAll(async ({ playwright }) => {
    client = await apiContext(playwright, 'client');
    artisan = await apiContext(playwright, 'artisan');
  });
  test.afterAll(async () => { await client?.dispose(); await artisan?.dispose(); });

  test('mises à jour fiables sans 500', async () => {
    const errors: string[] = [];
    const W = async (ctx: any, method: 'put' | 'post', path: string, data: any) => {
      const r = await ctx[method](path, { data }).catch(() => null);
      const s = r ? r.status() : 0;
      if (s >= 500 || s === 0) errors.push(`${s} ${method.toUpperCase()} ${path}: ${r ? (await r.text()).slice(0, 80) : 'no resp'}`);
    };
    // Client
    await W(client, 'put', '/api/users/profile', { firstName: 'Jean', lastName: 'Dupont', phone: '+352621123456' });
    await W(client, 'put', '/api/users/client-profile', { clientType: 'PROFESSIONAL', companyName: 'Cov SARL', vatNumber: 'LU12345678' });
    await W(client, 'put', '/api/notifications/preferences', { email: true, push: true, sms: false });
    // Artisan (services que j'ai écrits — DTOs connus)
    await W(artisan, 'put', '/api/artisan/profile', { description: 'Plombier expérimenté', serviceRadius: 25 });
    await W(artisan, 'put', '/api/artisan/availability/toggle', { available: true });
    await W(artisan, 'put', '/api/artisan/location', { latitude: 49.61, longitude: 6.13 });
    await W(artisan, 'put', '/api/artisan/working-hours', { workingHours: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isEnabled: true },
      { dayOfWeek: 2, startTime: '09:00', endTime: '17:00', isEnabled: true },
    ] });
    await W(artisan, 'post', '/api/artisan/time-off', { startDate: '2026-08-01', endDate: '2026-08-10', reason: 'Congés' });
    await W(artisan, 'post', '/api/artisan/availability', { startTime: '2026-07-01T09:00:00Z', endTime: '2026-07-01T12:00:00Z' });
    await W(artisan, 'put', '/api/artisan/notification-preferences', { emailNotifications: true, pushNotifications: false });

    // eslint-disable-next-line no-console
    console.log('@@COV2-write@@ 5xx=' + errors.length + '\n' + errors.join('\n'));
    expect(errors, errors.join(' | ')).toHaveLength(0);
  });
});
