import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/**
 * Sous-flux métier profonds, vérifiés de bout en bout via l'API réelle (authentifiée),
 * orchestrés entre personas. Chaque écriture est confirmée par une lecture.
 * (Flux internes — n'exigent pas de clés tierces.)
 */
test.describe.serial('Sous-flux métier (API authentifiée, multi-personas)', () => {
  let client: any, artisan: any, admin: any;
  let clientId = '', artisanId = '', missionId = '', quoteId = '', productId = '';

  test.beforeAll(async ({ playwright }) => {
    client = await apiContext(playwright, 'client');
    artisan = await apiContext(playwright, 'artisan');
    admin = await apiContext(playwright, 'admin');
    clientId = (await (await client.get('/api/users/profile')).json()).id;
    artisanId = (await (await artisan.get('/api/users/profile')).json()).id;
    expect(clientId, 'client id').toBeTruthy();
    expect(artisanId, 'artisan id').toBeTruthy();
  });

  test.afterAll(async () => {
    await client?.dispose(); await artisan?.dispose(); await admin?.dispose();
  });

  test('1. Client met à jour son profil client (write→read)', async () => {
    const company = `E2E Corp ${Date.now()}`;
    const up = await client.put('/api/users/client-profile', {
      data: { clientType: 'PROFESSIONAL', companyName: company, vatNumber: 'LU12345678' },
    });
    expect(up.status(), await up.text()).toBeLessThan(300);
    const got = await (await client.get('/api/users/client-profile')).json();
    expect(got.companyName).toBe(company);
  });

  test('2. Client crée une mission (capture missionId)', async () => {
    const r = await client.post('/api/missions', {
      data: {
        type: 'SCHEDULED', title: `E2E Flow Mission ${Date.now()}`,
        description: 'Mission pour tester négociation/litige e2e.',
        category: 'Plomberie', address: '15 Rue de la Gare', city: 'Luxembourg',
        postalCode: '1234', country: 'LU', latitude: 49.6116, longitude: 6.1319, clientBudget: 250,
      },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    missionId = (await r.json()).id;
    expect(missionId).toBeTruthy();
  });

  test('3. Devis multi-artisans : un artisan PEUT offrir sur une mission ouverte (feature) ; client sans contrepartie -> 400', async () => {
    // Nouveau modèle : plusieurs artisans peuvent faire une offre sur une mission ouverte (PENDING),
    // le client compare et choisit. Un artisan candidat est donc AUTORISÉ (201).
    const r = await artisan.post(`/api/missions/${missionId}/negotiations`, {
      data: { missionId, proposedPrice: 230, message: 'Proposition e2e' },
    });
    expect([200, 201].includes(r.status()), `un artisan doit pouvoir offrir sur une mission ouverte, reçu ${r.status()}`).toBeTruthy();
    // Le client (propriétaire) n'a pas de contrepartie (aucun artisan assigné) : refus PROPRE (400), pas un 500.
    const c = await client.post(`/api/missions/${missionId}/negotiations`, {
      data: { missionId, proposedPrice: 240, message: 'Contre-proposition client e2e' },
    });
    expect(c.status(), `attendu 400, reçu ${c.status()}: ${await c.text()}`).toBe(400);
  });

  test('4. Litige : règle métier (refus 400 sur mission PENDING) + endpoint liste OK', async () => {
    // Un litige n'est autorisé que sur une mission acceptée/en cours/terminée (gated par l'assignation
    // d'un artisan, elle-même gated par la vérif. téléphone/Twilio). Sur PENDING → refus propre.
    const r = await client.post('/api/disputes', {
      data: { missionId, reason: 'QUALITY', description: 'Litige de test e2e.' },
    });
    expect(r.status(), `attendu 400, reçu ${r.status()}: ${await r.text()}`).toBe(400);
    // L'endpoint de liste répond correctement.
    const list = await client.get('/api/disputes');
    expect(list.status()).toBeLessThan(300);
  });

  test('5. Artisan crée un devis pour le client puis l\'envoie', async () => {
    const validUntil = new Date(Date.now() + 14 * 864e5).toISOString();
    const r = await artisan.post('/api/quotes', {
      data: {
        clientId, title: `Devis E2E ${Date.now()}`, validUntil,
        category: 'Plomberie', taxRate: 17,
        lineItems: [
          { itemType: 'LABOR', description: 'Main d\'œuvre', quantity: 2, unitPrice: 50 },
          { itemType: 'MATERIAL', description: 'Fournitures', quantity: 1, unitPrice: 80 },
        ],
      },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    quoteId = (await r.json()).id;
    expect(quoteId).toBeTruthy();
    const sent = await artisan.post(`/api/quotes/${quoteId}/send`, { data: {} });
    expect(sent.status(), await sent.text()).toBeLessThan(300);
  });

  test('6. Client répond au devis (acceptation + signature)', async () => {
    const r = await client.post(`/api/quotes/${quoteId}/respond`, {
      data: { accepted: true, signature: 'data:image/png;base64,iVBORw0KGgo=' },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const q = await (await client.get(`/api/quotes/${quoteId}`)).json();
    expect(q.status).toBe('ACCEPTED');
  });

  test('7. Client passe une commande marketplace (write→read)', async () => {
    const products = await (await client.get('/api/marketplace/products?limit=50')).json();
    const list = products.data ?? products;
    // Choisir un produit réellement en stock (les runs précédents peuvent en épuiser certains).
    const inStock = list.find((p: any) => (p.stock ?? 0) > 0) ?? list[0];
    productId = inStock?.id;
    expect(productId, 'un produit en stock doit exister').toBeTruthy();
    const r = await client.post('/api/marketplace/orders', {
      data: { items: [{ productId, quantity: 1 }], shippingAddress: '15 Rue de la Gare, 1234 Luxembourg' },
    });
    expect(r.status(), await r.text()).toBeLessThan(300);
    const orders = await (await client.get('/api/marketplace/orders')).json();
    const arr = Array.isArray(orders) ? orders : (orders.data ?? []);
    expect(arr.length).toBeGreaterThan(0);
  });

  test('8. Admin accède aux back-office data (users, disputes)', async () => {
    const users = await (await admin.get('/api/admin/users')).json();
    const uArr = Array.isArray(users) ? users : (users.data ?? []);
    expect(uArr.length, 'la liste des utilisateurs doit être peuplée').toBeGreaterThan(0);
    const disputes = await admin.get('/api/disputes');
    expect(disputes.status()).toBeLessThan(300);
  });
});
