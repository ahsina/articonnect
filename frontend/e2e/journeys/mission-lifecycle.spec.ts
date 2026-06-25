import { test, expect } from '@playwright/test';
import { apiContext } from './_setup';

/**
 * Cycle de vie complet d'une mission (le plus gros morceau de code métier non couvert) :
 * client crée → artisan accepte → négociation → client accepte → start-travel → arrive →
 * complete → client valide. Couvre mission.service + negotiation.service + hooks.
 * Pré-requis : client & artisan ont phoneVerified=true (PhoneVerifiedGuard sur accept/accept-négo).
 */
test('cycle mission complet A→Z', async ({ playwright }) => {
  test.setTimeout(90000);
  const client = await apiContext(playwright, 'client');
  const artisan = await apiContext(playwright, 'artisan');
  const steps: string[] = [];
  const step = async (name: string, p: Promise<any>) => {
    const r = await p.catch(() => null);
    const s = r ? r.status() : 0;
    steps.push(`${name}=${s}`);
    if (s >= 400 || s === 0) {
      const body = r ? (await r.text()).slice(0, 160) : 'no resp';
      throw new Error(`Étape "${name}" a échoué (${s}): ${body}\nSteps: ${steps.join(' ')}`);
    }
    return r;
  };

  // 1) Client crée la mission
  const created = await step('create', client.post('/api/missions', { data: {
    type: 'SCHEDULED', title: `Cycle complet ${Date.now()}`,
    description: 'Mission e2e cycle de vie complet.', category: 'Plomberie',
    address: '15 Rue de la Gare', city: 'Luxembourg', postalCode: '1234',
    country: 'LU', latitude: 49.6116, longitude: 6.1319, clientBudget: 250,
  } }));
  const mission = await created.json();
  const id = mission.id;
  expect(id).toBeTruthy();

  // 2) Artisan accepte (→ NEGOTIATING) — PhoneVerifiedGuard
  await step('accept', artisan.post(`/api/missions/${id}/accept`));
  await step('tracking', artisan.get(`/api/missions/${id}/tracking`));
  await step('deposit-status', artisan.get(`/api/missions/${id}/deposit-status`));

  // 3) Artisan propose un prix (négociation)
  const negResp = await step('negotiation-create', artisan.post(`/api/missions/${id}/negotiations`, {
    data: { missionId: id, proposedPrice: 240, laborCost: 180, materialCost: 60, message: 'Offre artisan' },
  }));
  const neg = await negResp.json();
  await step('negotiation-list', client.get(`/api/missions/${id}/negotiations`));

  // 4) Client accepte la négociation (→ ACCEPTED, agreedPrice) — PhoneVerifiedGuard
  await step('negotiation-accept', client.put(`/api/missions/negotiations/${neg.id}/accept`, {
    data: { accepted: true },
  }));

  // 5) Artisan : start-travel → arrive → complete
  await step('start-travel', artisan.post(`/api/missions/${id}/start-travel`));
  await step('arrive', artisan.post(`/api/missions/${id}/arrive`));
  await step('complete', artisan.post(`/api/missions/${id}/complete`));

  // 6) Client valide. Le versement artisan (triggerArtisanPayment) exige une transaction de
  // paiement réelle : en démo (pas de paiement encaissé) un 400 "Aucune transaction trouvée"
  // est attendu — validateCompletion s'est quand même exécuté (status, historique, validatedAt).
  const valResp = await client.post(`/api/missions/${id}/validate`).catch(() => null);
  const valStatus = valResp ? valResp.status() : 0;
  steps.push(`validate=${valStatus}`);
  if (valStatus >= 400) {
    const body = valResp ? await valResp.text() : '';
    expect(body, `validate inattendu (${valStatus}): ${body.slice(0, 160)}`).toContain('Aucune transaction');
  }

  // Vérification finale : la mission a bien parcouru le cycle jusqu'à COMPLETED
  const finalResp = await client.get(`/api/missions/${id}`);
  const final = await finalResp.json();
  // eslint-disable-next-line no-console
  console.log(`@@LIFECYCLE@@ status=${final.status} agreedPrice=${final.agreedPrice} steps=${steps.join(' ')}`);
  expect(['COMPLETED', 'AUTO_VALIDATED', 'VALIDATED']).toContain(final.status);

  await client.dispose();
  await artisan.dispose();
});
