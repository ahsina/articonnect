import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/** Vague 5 : clusters internal-chat, returns, payment, invoices, subcontractors, documents-jobs,
 *  checklist-instances, upload, availability — avec prérequis créés dans le spec. */
test.describe('Couverture écritures vague 2', () => {
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
  const firstId = (j: any) => { const a = Array.isArray(j) ? j : (j?.data ?? []); return a[0]?.id ?? null; };

  test.beforeAll(async ({ playwright }) => {
    admin = await apiContext(playwright, 'admin');
    artisan = await apiContext(playwright, 'artisan');
    client = await apiContext(playwright, 'client');
  });
  test.afterAll(async () => {
    // eslint-disable-next-line no-console
    console.log('@@WCOV2@@\n' + log.join('\n'));
    await admin?.dispose(); await artisan?.dispose(); await client?.dispose();
  });

  const missionPayload = (t: string) => ({ type: 'SCHEDULED', title: t, description: 'desc cov', category: 'Plomberie', address: '1 rue', city: 'Luxembourg', postalCode: '1234', country: 'LU', latitude: 49.61, longitude: 6.13, clientBudget: 200 });

  test('payment + cycle jusqu\'à ACCEPTED', async () => {
    const sfx = Date.now();
    const m = await W(client, 'post', '/api/missions', missionPayload(`Pay ${sfx}`));
    const id = gid(m.json);
    if (id) {
      await W(artisan, 'post', `/api/missions/${id}/accept`);
      const ng = await W(artisan, 'post', `/api/missions/${id}/negotiations`, { missionId: id, proposedPrice: 200, message: 'offre' });
      const negId = gid(ng.json);
      if (negId) await W(client, 'put', `/api/missions/negotiations/${negId}/accept`, { accepted: true });
      // payment.service : create-intent, setup-deposit, deposit-status
      await W(client, 'post', '/api/payments/create-intent', { missionId: id });
      await W(artisan, 'post', `/api/missions/${id}/setup-deposit`, { agreedPrice: 200 });
      // invoices sur la mission
      await W(artisan, 'post', `/api/invoices/mission/${id}`);
      const inv = await getJson(artisan, '/api/invoices'); const invId = firstId(inv);
      if (invId) { await W(artisan, 'post', `/api/invoices/${invId}/issue`); await W(artisan, 'post', `/api/invoices/${invId}/paid`); }
      // documents job + sign
      const doc = await W(artisan, 'post', '/api/documents', { missionId: id, name: 'Doc travail', type: 'WORK_COMPLETION', data: { note: 'ok' } });
      const docId = gid(doc.json);
      if (docId) await W(artisan, 'post', `/api/documents/${docId}/sign`, { signature: 'data:image/png;base64,iVBOR' });
      // subcontractor + assignment sur la mission
      const sc = await W(artisan, 'post', '/api/subcontractors', { externalName: 'Sous-traitant', externalEmail: `st${sfx}@example.com`, specialties: ['Plomberie'] });
      const scId = gid(sc.json);
      if (scId) await W(artisan, 'post', '/api/subcontractors/assignments', { subcontractorId: scId, missionId: id, agreedAmount: 100, commissionRate: 10 });
    }
  });

  test('internal-chat', async () => {
    const me = await getJson(artisan, '/api/users/profile');
    const cl = await getJson(client, '/api/users/profile');
    const room = await W(artisan, 'post', '/api/internal-chat/rooms', { name: 'Salle Cov', type: 'GROUP', memberIds: [cl?.id].filter(Boolean) });
    const roomId = gid(room.json);
    if (roomId) {
      await W(artisan, 'put', `/api/internal-chat/rooms/${roomId}`, { name: 'Salle MAJ' });
      const msg = await W(artisan, 'post', `/api/internal-chat/rooms/${roomId}/messages`, { content: 'Bonjour équipe' });
      const msgId = gid(msg.json);
      if (msgId) await W(artisan, 'post', `/api/internal-chat/messages/${msgId}/reactions`, { emoji: '👍' });
      await W(artisan, 'post', `/api/internal-chat/rooms/${roomId}/pin`);
      await W(artisan, 'post', `/api/internal-chat/rooms/${roomId}/mute`);
      await W(artisan, 'post', `/api/internal-chat/rooms/${roomId}/archive`);
    }
  });

  test('marketplace order + return', async () => {
    const prods = await getJson(client, '/api/marketplace/products');
    const list = (Array.isArray(prods) ? prods : prods?.data ?? []);
    const product = list.find((p: any) => Number(p.stock) > 0) ?? list[0];
    if (product?.id) {
      const order = await W(client, 'post', '/api/marketplace/orders', { items: [{ productId: product.id, quantity: 1 }], shippingAddress: '1 rue, Luxembourg' });
      const orderId = gid(order.json);
      const oitems = order.json?.items ?? order.json?.orderItems ?? [];
      if (orderId) {
        await W(artisan, 'patch', `/api/marketplace/orders/${orderId}/status`, { status: 'PROCESSING' });
        await W(client, 'post', '/api/marketplace/returns', { orderId, items: oitems[0] ? [{ orderItemId: oitems[0].id, productId: product.id, quantity: 1, reason: 'DEFECTIVE' }] : [], description: 'Défectueux' });
      }
    }
  });

  test('checklists instances + availability + upload + verification', async () => {
    const sfx = Date.now();
    const tmpl = await getJson(artisan, '/api/checklists/templates');
    const tmplId = firstId(tmpl);
    const ms = await getJson(client, '/api/missions');
    const missionId = firstId(ms);
    if (tmplId && missionId) {
      const inst = await W(artisan, 'post', '/api/checklists/instances', { templateId: tmplId, missionId });
      const instId = gid(inst.json);
      if (instId) await W(artisan, 'put', `/api/checklists/instances/${instId}`, { notes: 'en cours' });
    }
    await W(artisan, 'put', '/api/availability/status', { available: true });
    await W(artisan, 'post', '/api/upload/presigned-url', { fileType: 'document', mimeType: 'application/pdf' });
    await W(artisan, 'post', '/api/verification/business', { country: 'LU', registrationNumber: `LU${sfx}`, companyName: 'Cov SARL' });
  });

  test('aucun vrai 500', async () => {
    expect(fails, `500:\n${fails.join('\n')}`).toHaveLength(0);
  });
});
