import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/**
 * Couverture massive des endpoints d'écriture (création/màj) avec DTO valides.
 * Un payload DTO-valide atteint le service → couvre son code, même si la règle métier renvoie 400.
 * On n'échoue que sur un VRAI 500 (bug). 502/503 = transitoire (retry).
 */
type Ctx = any;
const FUTURE = '2026-12-31';
const FUTURE_ISO = '2026-12-31T10:00:00.000Z';

test.describe('Couverture écritures massives', () => {
  let admin: Ctx, artisan: Ctx, client: Ctx;
  const fails: string[] = [];
  const log: string[] = [];

  const W = async (ctx: Ctx, method: 'post' | 'put' | 'patch' | 'delete', path: string, data?: any) => {
    let r: any = null, s = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      r = await ctx[method](path, data !== undefined ? { data } : undefined).catch(() => null);
      s = r ? r.status() : 0;
      if (s !== 0 && s !== 502 && s !== 503) break;
      await new Promise((res) => setTimeout(res, 400));
    }
    let bodyText = '';
    if (s >= 400) bodyText = r ? (await r.text()).slice(0, 200) : '';
    log.push(`${s} ${method.toUpperCase()} ${path}${s >= 400 ? ' :: ' + bodyText : ''}`);
    if (s === 500 || s === 501) fails.push(`${s} ${method.toUpperCase()} ${path}: ${bodyText}`);
    let json: any = null;
    try { json = bodyText ? JSON.parse(bodyText) : (r ? await r.json() : null); } catch { /* noop */ }
    return { s, json };
  };
  const id = (j: any) => j?.id ?? j?.data?.id ?? null;

  test.beforeAll(async ({ playwright }) => {
    admin = await apiContext(playwright, 'admin');
    artisan = await apiContext(playwright, 'artisan');
    client = await apiContext(playwright, 'client');
  });
  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('@@WRITE-COV@@\n' + log.join('\n'));
    await admin?.dispose(); await artisan?.dispose(); await client?.dispose();
  });

  test('admin: contenu & référentiels', async () => {
    const sfx = Date.now();
    await W(admin, 'post', '/api/currencies/seed');
    await W(admin, 'post', '/api/specialties', { name: `Spec ${sfx}`, category: 'Plomberie', description: 'x' });
    await W(admin, 'post', '/api/currencies', { code: 'XTS', name: 'TestCoin', symbol: '₿', decimalPlaces: 2 });
    await W(admin, 'post', '/api/currencies/exchange-rate', { fromCurrency: 'EUR', toCurrency: 'USD', rate: 1.08 });
    await W(admin, 'post', '/api/currencies/convert', { amount: 100, fromCurrency: 'EUR', toCurrency: 'USD' });
    await W(admin, 'put', '/api/currencies/XTS', { name: 'TestCoin2' });
    await W(admin, 'post', '/api/config', { key: `cov.key.${sfx}`, value: 'v', dataType: 'STRING', category: 'GENERAL' });
    await W(admin, 'put', `/api/config/cov.key.${sfx}`, { value: 'v2' });
    await W(admin, 'post', '/api/badges', { key: `cov_badge_${sfx}`, name: 'Cov Badge', description: 'd', type: 'PERFORMANCE', tier: 'BRONZE', icon: '🏅', criteria: { type: 'mission_count', threshold: 10 } });
    // knowledge-base : create → publish → translations → feedback → bulk
    const kb = await W(admin, 'post', '/api/knowledge-base/articles', { title: `Article ${sfx}`, content: 'Contenu détaillé de test pour couverture.', category: 'GETTING_STARTED' });
    const kbId = id(kb.json);
    if (kbId) {
      await W(admin, 'put', `/api/knowledge-base/articles/${kbId}`, { content: 'Contenu mis à jour.' });
      await W(admin, 'post', `/api/knowledge-base/articles/${kbId}/publish`);
      await W(admin, 'post', `/api/knowledge-base/articles/${kbId}/translations`, { locale: 'en', title: 'Article EN', content: 'English content.' });
      await W(client, 'post', `/api/knowledge-base/articles/${kbId}/feedback`, { helpful: true });
      await W(admin, 'post', '/api/knowledge-base/bulk/status', { articleIds: [kbId], status: 'PUBLISHED' });
      await W(admin, 'post', `/api/knowledge-base/articles/${kbId}/unpublish`);
      await W(admin, 'post', `/api/knowledge-base/articles/${kbId}/archive`);
    }
    // support articles
    await W(admin, 'post', '/api/support/articles', { title: `Aide ${sfx}`, content: 'Article support.', category: 'general' });
  });

  test('admin: i18n (gros service)', async () => {
    const sfx = Date.now();
    await W(client, 'post', '/api/i18n/detect', { acceptLanguage: 'fr-FR,fr;q=0.9' });
    await W(admin, 'post', '/api/i18n/admin/locales', { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' });
    await W(admin, 'put', '/api/i18n/admin/locales/nl', { name: 'Nederlands' });
    await W(admin, 'put', '/api/i18n/admin/locales/nl/toggle');
    const tr = await W(admin, 'post', '/api/i18n/admin/translations', { key: `cov.${sfx}`, namespace: 'common', locale: 'fr', value: 'Bonjour' });
    const trId = id(tr.json);
    if (trId) await W(admin, 'put', `/api/i18n/admin/translations/${trId}`, { value: 'Salut' });
    await W(admin, 'post', '/api/i18n/admin/translations/bulk', { locale: 'fr', namespace: 'common', translations: { [`cov.b.${sfx}`]: 'V1', [`cov.c.${sfx}`]: 'V2' } });
    await W(admin, 'post', '/api/i18n/admin/translations/import', { locale: 'en', data: { [`cov.imp.${sfx}`]: 'Hello' } });
    await W(admin, 'post', '/api/i18n/admin/translations/export', { locale: 'fr' });
    await W(admin, 'post', '/api/i18n/admin/translations/compare', { sourceLocale: 'fr', targetLocale: 'en' });
    await W(admin, 'post', '/api/i18n/admin/translations/validate', { locale: 'fr' });
    if (trId) await W(admin, 'post', '/api/i18n/admin/translations/approve', { translationIds: [trId] });
    await W(admin, 'post', '/api/i18n/admin/translations/publish');
    await W(admin, 'post', '/api/i18n/admin/translations/plural', { locale: 'fr', key: `cov.${sfx}` });
    await W(admin, 'post', '/api/i18n/test/interpolation', { template: 'Bonjour {{name}}', variables: { name: 'Jean' } });
  });

  test('artisan: analytics (writes)', async () => {
    await W(artisan, 'post', '/api/analytics/match', { category: 'Plomberie', latitude: 49.61, longitude: 6.13 });
    await W(artisan, 'post', '/api/analytics/profitability', { startDate: '2026-01-01', endDate: '2026-06-30' });
    await W(artisan, 'post', '/api/analytics/trends', { metric: 'REVENUE', startDate: '2026-01-01', endDate: '2026-06-30' });
    await W(artisan, 'post', '/api/analytics/forecast', { metric: 'REVENUE', monthsAhead: 3 });
    const g = await W(artisan, 'post', '/api/analytics/goals', { period: 'MONTHLY', targetAmount: 5000, startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-06-30T00:00:00.000Z' });
    const gId = id(g.json);
    if (gId) await W(artisan, 'put', `/api/analytics/goals/${gId}`, { targetAmount: 6000 });
    await W(artisan, 'post', '/api/analytics/snapshot');
  });

  test('artisan: business (quotes/portfolio/certifs/documents/checklists/recurring)', async () => {
    const sfx = Date.now();
    const me = await client.get('/api/users/profile'); const clientId = (await me.json())?.id;

    // certifications
    await W(artisan, 'post', '/api/certifications', { name: 'RGE', issuer: 'Qualibat', issueDate: '2025-01-15' });
    // portfolio
    const proj = await W(artisan, 'post', '/api/portfolio/projects', { title: `Projet ${sfx}`, category: 'Plomberie', description: 'desc' });
    const projId = id(proj.json);
    if (projId) await W(artisan, 'post', `/api/portfolio/projects/${projId}/photos`, { url: 'https://example.com/p.jpg' });
    // quotes
    const q = await W(artisan, 'post', '/api/quotes', { clientId, title: `Devis ${sfx}`, category: 'Plomberie', taxRate: 17, validUntil: FUTURE, lineItems: [{ itemType: 'LABOR', description: 'Main d\'oeuvre', quantity: 2, unitPrice: 50 }] });
    const qId = id(q.json);
    if (qId) {
      await W(artisan, 'put', `/api/quotes/${qId}`, { title: 'Devis MAJ' });
      await W(artisan, 'post', `/api/quotes/${qId}/send`, {});
      await W(client, 'post', `/api/quotes/${qId}/view`);
      await W(client, 'post', `/api/quotes/${qId}/respond`, { accepted: true });
    }
    await W(artisan, 'post', '/api/quotes/templates', { name: `Tmpl ${sfx}`, category: 'Plomberie', defaultLineItems: [{ description: 'X', quantity: 1, unitPrice: 10 }] });
    await W(artisan, 'post', '/api/quotes/catalog', { name: `Mat ${sfx}`, category: 'Plomberie', unitPrice: 12.5 });
    // documents (→ pdf.service)
    const dt = await W(artisan, 'post', '/api/documents/templates', { name: `DocTmpl ${sfx}`, type: 'WORK_COMPLETION', category: 'general', sections: [{ title: 'Section 1', order: 0, fields: [{ label: 'Champ', type: 'TEXT', order: 0 }] }] });
    // checklists
    const ct = await W(artisan, 'post', '/api/checklists/templates', { name: `Check ${sfx}`, category: 'SAFETY', sections: [{ title: 'Sécurité', items: [{ label: 'Vérifier vanne', required: true }] }] });
    // recurring
    await W(artisan, 'post', '/api/recurring-services', { clientId, name: `Récurrent ${sfx}`, category: 'Plomberie', address: '1 rue', city: 'Luxembourg', postalCode: '1234', country: 'LU', frequency: 'MONTHLY', startDate: FUTURE, servicePrice: 80 });
    // crm
    const rel = await W(artisan, 'post', '/api/crm/clients', { clientId });
    const relId = id(rel.json);
    if (relId) await W(artisan, 'post', '/api/crm/follow-ups', { relationshipId: relId, title: 'Rappel', dueDate: FUTURE });
  });

  test('mixte: company, moderation, disputes, reviews, mission-templates', async () => {
    const sfx = Date.now();
    await W(artisan, 'post', '/api/companies', { companyName: `Cov SARL ${sfx}`, siret: '12345678901234', baseAddress: '1 rue', city: 'Luxembourg', postalCode: '1234', country: 'LU', latitude: 49.61, longitude: 6.13 });
    await W(client, 'post', '/api/moderation/reports', { type: 'REVIEW', reason: 'SPAM', description: 'Test report' });
    // dispute & review sur une mission du client
    const ms = await client.get('/api/missions'); const arr = await ms.json();
    const mission = (Array.isArray(arr) ? arr : arr?.data ?? [])[0];
    if (mission?.id) {
      await W(client, 'post', '/api/disputes', { missionId: mission.id, reason: 'QUALITY', description: 'Travail non conforme' });
      await W(client, 'post', '/api/reviews', { missionId: mission.id, overallRating: 5, comment: 'Très bien' });
    }
    await W(artisan, 'post', '/api/mission-templates', { name: `MT ${sfx}`, type: 'SCHEDULED', title: 'Tpl', description: 'd', category: 'Plomberie' });
  });

  test('aucun vrai 500', async () => {
    expect(fails, `500 détectés:\n${fails.join('\n')}`).toHaveLength(0);
  });
});
