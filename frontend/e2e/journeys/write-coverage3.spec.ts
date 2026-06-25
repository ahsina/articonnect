import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/** Vague 6 : cluster B2B/employés (le plus gros) + endpoints admin "cron" + écritures restantes. */
test.describe('Couverture B2B + cron + reste', () => {
  let admin: any, artisan: any, client: any;
  const fails: string[] = [];
  const log: string[] = [];
  const W = async (ctx: any, m: 'post' | 'put' | 'patch' | 'delete', path: string, data?: any) => {
    let r: any = null, s = 0;
    for (let a = 0; a < 2; a++) {
      r = await ctx[m](path, data !== undefined ? { data } : undefined).catch(() => null);
      s = r ? r.status() : 0;
      if (s !== 0 && s !== 502 && s !== 503) break;
      await new Promise((res) => setTimeout(res, 400));
    }
    let body = ''; if (s >= 400) body = r ? (await r.text()).slice(0, 180) : '';
    log.push(`${s} ${m.toUpperCase()} ${path}${s >= 400 ? ' :: ' + body : ''}`);
    if (s === 500 || s === 501) fails.push(`${s} ${m.toUpperCase()} ${path}: ${body}`);
    let j: any = null; try { j = body ? JSON.parse(body) : (r ? await r.json() : null); } catch {}
    return { s, json: j };
  };
  const gid = (j: any) => j?.id ?? j?.data?.id ?? null;
  const getJson = async (ctx: any, p: string) => { const r = await ctx.get(p).catch(() => null); try { return r ? await r.json() : null; } catch { return null; } };

  test.beforeAll(async ({ playwright }) => {
    admin = await apiContext(playwright, 'admin');
    artisan = await apiContext(playwright, 'artisan');
    client = await apiContext(playwright, 'client');
  });
  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('@@WCOV3@@\n' + log.join('\n'));
    await admin?.dispose(); await artisan?.dispose(); await client?.dispose();
  });

  test('B2B: company → invite → perf-reviews → time-tracking → shifts', async () => {
    const sfx = Date.now();
    // company (existante ou créée)
    let comp = await getJson(artisan, '/api/companies/my-company');
    if (!comp?.id) {
      const c = await W(artisan, 'post', '/api/companies', { companyName: `B2B SARL ${sfx}`, siret: `${sfx}`.slice(0, 14).padEnd(14, '0'), baseAddress: '1 rue', city: 'Luxembourg', postalCode: '1234', country: 'LU', latitude: 49.61, longitude: 6.13 });
      comp = c.json;
    }
    const companyId = comp?.id;
    const ownEmp = (comp?.employees ?? []).find((e: any) => e.role === 'OWNER');
    const cl = await getJson(client, '/api/users/profile');

    if (companyId) {
      // inviter le client comme TECHNICIEN
      const inv = await W(artisan, 'post', `/api/employees/${companyId}/invite`, { email: cl?.email, role: 'TECHNICIAN', paymentModel: 'SALARY' });
      const empId = gid(inv.json) ?? (inv.json?.employee?.id);
      const targetEmp = empId ?? ownEmp?.id;
      if (targetEmp) {
        // performance reviews
        const pr = await W(artisan, 'post', '/api/performance-reviews', { employeeId: targetEmp, reviewPeriodStart: '2026-01-01', reviewPeriodEnd: '2026-06-30', ratings: { qualityOfWork: 4, communication: 4, reliability: 5, technicalSkills: 4, customerService: 5, teamwork: 4 }, strengths: 'Bon', areasForImprovement: 'RAS' });
        const prId = gid(pr.json);
        if (prId) { await W(artisan, 'post', `/api/performance-reviews/${prId}/submit`, {}); await W(artisan, 'post', `/api/performance-reviews/${prId}/acknowledge`, {}); }
        await W(artisan, 'post', '/api/performance-reviews/goals', { employeeId: targetEmp, title: 'Objectif Q3', description: 'desc', targetDate: '2026-09-30' });
        await W(artisan, 'post', '/api/performance-reviews/360-feedback/request', { employeeId: targetEmp, reviewerIds: [cl?.id].filter(Boolean), deadline: '2026-08-01' });
        // shifts (companyId en query)
        await W(artisan, 'post', `/api/employee-features/shifts?companyId=${companyId}`, { employeeId: targetEmp, date: '2026-07-20', startTime: '09:00', endTime: '17:00', role: 'TECHNICIAN' });
      }
      await W(artisan, 'post', '/api/performance-reviews/templates', { name: `Tpl ${sfx}`, periodType: 'QUARTERLY', ratingCategories: ['qualité', 'communication'] });
    }
    // time-tracking (l'artisan est OWNER employee)
    await W(artisan, 'post', '/api/time-tracking/clock-in', {});
    await W(artisan, 'post', '/api/time-tracking/break/start', {});
    await W(artisan, 'post', '/api/time-tracking/break/end', {});
    await W(artisan, 'post', '/api/time-tracking/clock-out', {});
  });

  test('admin: déclencheurs cron/batch', async () => {
    await W(admin, 'post', '/api/missions/auto-validate');
    await W(admin, 'post', '/api/badges/admin/award-all');
    await W(admin, 'put', '/api/admin/fraud-settings/bot-detection/toggle', { enabled: false });
    await W(admin, 'put', '/api/admin/platform-config/fees', { commissionRate: 12 });
    await W(admin, 'put', '/api/admin/platform-config/missions', { maxActiveMissions: 10 });
    await W(admin, 'post', '/api/i18n/admin/translations/publish');
  });

  test('reste: recurring/mission-templates/quotes/certifs', async () => {
    const rec = await getJson(artisan, '/api/recurring-services');
    const recId = (Array.isArray(rec) ? rec : rec?.data ?? [])[0]?.id;
    if (recId) {
      await W(artisan, 'post', `/api/recurring-services/${recId}/pause`);
      await W(artisan, 'post', `/api/recurring-services/${recId}/resume`);
      await W(artisan, 'post', `/api/recurring-services/${recId}/generate-mission`);
    }
    const mt = await getJson(artisan, '/api/mission-templates');
    const mtId = (Array.isArray(mt) ? mt : mt?.data ?? [])[0]?.id;
    if (mtId) { await W(artisan, 'post', `/api/mission-templates/${mtId}/use`, {}); await W(artisan, 'post', `/api/mission-templates/${mtId}/duplicate`); }
    const certs = await getJson(artisan, '/api/certifications');
    const certId = (Array.isArray(certs) ? certs : certs?.data ?? [])[0]?.id;
    if (certId) { await W(admin, 'post', `/api/certifications/${certId}/verify`); await W(admin, 'post', `/api/certifications/${certId}/unverify`); }
    const qs = await getJson(artisan, '/api/quotes');
    const qId = (Array.isArray(qs) ? qs : qs?.data ?? [])[0]?.id;
    if (qId) { await W(artisan, 'post', `/api/quotes/${qId}/new-version`); await W(artisan, 'post', `/api/quotes/${qId}/request-signature`, {}); }
  });

  test('aucun vrai 500', async () => {
    expect(fails, `500:\n${fails.join('\n')}`).toHaveLength(0);
  });
});
