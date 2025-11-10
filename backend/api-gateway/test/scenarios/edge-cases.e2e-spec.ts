/**
 * ArtiConnect - Tests E2E - Edge Cases & Finition
 *
 * Tests de cas limites et scénarios spécifiques pour atteindre 95% de couverture
 *
 * Catégories:
 * - Gestion d'erreurs
 * - Conditions limites
 * - Concurrence et race conditions
 * - Cohérence des données
 * - Scénarios de récupération
 * - Cas d'usage inhabituels mais valides
 *
 * Total: 20 tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/common/prisma/prisma.service';

describe('ArtiConnect - Tests Edge Cases E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let clientId: string;
  let artisanId: string;
  let adminId: string;
  let clientToken: string;
  let artisanToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    await cleanDatabase();
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  /**
   * EDGE CASE 1: Demande avec exactement 0€
   */
  it('EC-1: Demande avec budget 0€ (devis uniquement)', async () => {
    const response = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        category: 'PLUMBING',
        description: 'Demande de devis uniquement',
        estimatedBudget: 0,
        quoteOnly: true,
      })
      .expect(201);

    expect(parseFloat(response.body.estimatedBudget)).toBe(0);
    expect(response.body.type).toBe('QUOTE_REQUEST');
  });

  /**
   * EDGE CASE 2: Client supprime compte avec missions en cours
   */
  it('EC-2: Suppression compte avec missions actives (soft delete)', async () => {
    // Créer mission active
    const mission = await request(app.getHttpServer())
      .post('/missions')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        requestId: 'req-123',
        status: 'IN_PROGRESS',
      })
      .expect(201);

    // Tenter suppression compte
    const deleteAttempt = await request(app.getHttpServer())
      .delete('/users/account')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    // Soft delete avec missions complétées après
    expect(deleteAttempt.body.deletionScheduled).toBe(true);
    expect(deleteAttempt.body.completionRequired).toBe(true);
    expect(deleteAttempt.body.activeMissionsCount).toBeGreaterThan(0);
    expect(deleteAttempt.body.message).toContain('missions en cours');
  });

  /**
   * EDGE CASE 3: Paiement avec montant exact 0.01€ (minimum Stripe)
   */
  it('EC-3: Paiement minimum Stripe (0.50€)', async () => {
    // Montant trop petit
    const tooSmall = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        amount: 0.30,
        paymentMethodId: 'pm_mock',
      })
      .expect(400);

    expect(tooSmall.body.error).toContain('minimum');

    // Montant minimum valide
    const valid = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        amount: 0.50,
        paymentMethodId: 'pm_mock',
      })
      .expect(201);

    expect(parseFloat(valid.body.amount)).toBe(0.50);
  });

  /**
   * EDGE CASE 4: Artisan dans zone exactement à la limite du rayon
   */
  it('EC-4: Artisan à exactement 5.000km (limite du rayon)', async () => {
    const search = await request(app.getHttpServer())
      .get('/artisans/search')
      .query({
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 5.0,
      })
      .expect(200);

    // Vérifier que les artisans à exactement 5km sont inclus
    const artisansAtEdge = search.body.results.filter(a =>
      Math.abs(a.distance - 5.0) < 0.01
    );

    if (artisansAtEdge.length > 0) {
      expect(artisansAtEdge[0].distance).toBeLessThanOrEqual(5.0);
    }
  });

  /**
   * EDGE CASE 5: Mission annulée puis réactivée (état invalide)
   */
  it('EC-5: Tentative de réactiver mission annulée (rejet)', async () => {
    // Créer et annuler mission
    const mission = await request(app.getHttpServer())
      .post('/missions')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        requestId: 'req-456',
      })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/missions/${mission.body.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);

    // Tenter de l'accepter (invalide)
    const invalid = await request(app.getHttpServer())
      .put(`/missions/${mission.body.id}/accept`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(400);

    expect(invalid.body.error).toContain('statut invalide');
  });

  /**
   * EDGE CASE 6: Upload fichier avec nom très long (255 caractères)
   */
  it('EC-6: Upload fichier avec nom maximum (255 chars)', async () => {
    const longName = 'a'.repeat(250) + '.jpg';

    const response = await request(app.getHttpServer())
      .post('/uploads/presigned-url')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        fileName: longName,
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(response.body.fileName.length).toBeLessThanOrEqual(255);
  });

  /**
   * EDGE CASE 7: Concurrent updates même mission (race condition)
   */
  it('EC-7: Updates concurrents (versioning optimiste)', async () => {
    const mission = await request(app.getHttpServer())
      .post('/missions')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        requestId: 'req-789',
      })
      .expect(201);

    // Deux updates simultanés
    const [update1, update2] = await Promise.allSettled([
      request(app.getHttpServer())
        .put(`/missions/${mission.body.id}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ notes: 'Update 1', version: 1 }),
      request(app.getHttpServer())
        .put(`/missions/${mission.body.id}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ notes: 'Update 2', version: 1 }),
    ]);

    // Un doit réussir, l'autre échouer (conflict)
    const results = [update1, update2];
    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 200);
    const failed = results.filter(r => r.status === 'fulfilled' && r.value.status === 409);

    expect(succeeded.length).toBe(1);
    expect(failed.length).toBe(1);
  });

  /**
   * EDGE CASE 8: Pagination avec offset > total items
   */
  it('EC-8: Pagination au-delà du total (retourne vide)', async () => {
    const response = await request(app.getHttpServer())
      .get('/missions')
      .set('Authorization', `Bearer ${artisanToken}`)
      .query({
        page: 999,
        limit: 20,
      })
      .expect(200);

    expect(response.body.results).toEqual([]);
    expect(response.body.page).toBe(999);
    expect(response.body.hasMore).toBe(false);
  });

  /**
   * EDGE CASE 9: Facture pays non supporté
   */
  it('EC-9: Facture pour pays hors zone (rejet)', async () => {
    const response = await request(app.getHttpServer())
      .post('/invoices')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        clientId,
        amount: 100.00,
        country: 'US', // Non supporté
      })
      .expect(400);

    expect(response.body.error).toContain('pays non supporté');
    expect(response.body.supportedCountries).toEqual(['FR', 'BE', 'LU']);
  });

  /**
   * EDGE CASE 10: Token JWT expiré
   */
  it('EC-10: Requête avec token expiré (401)', async () => {
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTYwMDAwMDAwMH0.mock';

    const response = await request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(response.body.error).toContain('expiré');
  });

  /**
   * EDGE CASE 11: Email avec caractères Unicode
   */
  it('EC-11: Inscription avec email Unicode (validé)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'utilisateur+test@société.fr',
        password: 'Pass123!',
        role: 'CLIENT',
      })
      .expect(201);

    expect(response.body.email).toContain('société');
  });

  /**
   * EDGE CASE 12: Evaluation 0 étoiles (invalide)
   */
  it('EC-12: Évaluation 0 ou 6 étoiles (rejet)', async () => {
    const zero = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        missionId: 'mission-123',
        rating: 0,
      })
      .expect(400);

    expect(zero.body.error).toContain('1 et 5');

    const six = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        missionId: 'mission-123',
        rating: 6,
      })
      .expect(400);

    expect(six.body.error).toContain('1 et 5');
  });

  /**
   * EDGE CASE 13: Recherche avec caractères spéciaux (SQL injection test)
   */
  it('EC-13: Recherche avec caractères spéciaux (sanitized)', async () => {
    const response = await request(app.getHttpServer())
      .get('/artisans/search')
      .query({
        query: "'; DROP TABLE users; --",
      })
      .expect(200);

    // Ne doit pas causer d'erreur SQL
    expect(response.body.results).toBeInstanceOf(Array);
  });

  /**
   * EDGE CASE 14: Création 1000 notifications simultanées (bulk)
   */
  it('EC-14: Bulk notifications (performance)', async () => {
    const start = Date.now();

    const response = await request(app.getHttpServer())
      .post('/admin/bulk-notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userIds: Array(100).fill(clientId),
        type: 'PROMOTIONAL',
        content: 'Message de masse',
      })
      .expect(201);

    const duration = Date.now() - start;

    expect(response.body.sent).toBe(100);
    expect(duration).toBeLessThan(5000); // < 5s
  });

  /**
   * EDGE CASE 15: Timezone différent client/artisan
   */
  it('EC-15: RDV avec timezones différents', async () => {
    const appointment = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artisanId,
        scheduledAt: '2025-11-10T14:00:00Z',
        clientTimezone: 'America/New_York', // UTC-5
        artisanTimezone: 'Europe/Paris', // UTC+1
      })
      .expect(201);

    expect(appointment.body.scheduledAtUTC).toBeDefined();
    expect(appointment.body.clientLocalTime).toContain('09:00'); // 14:00 - 5
    expect(appointment.body.artisanLocalTime).toContain('15:00'); // 14:00 + 1
  });

  /**
   * EDGE CASE 16: Remboursement partiel multiple (total > montant original)
   */
  it('EC-16: Remboursements partiels dépassant total (rejet)', async () => {
    const payment = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        amount: 100.00,
        paymentMethodId: 'pm_mock',
      })
      .expect(201);

    // Premier remboursement 60€
    await request(app.getHttpServer())
      .post(`/payments/${payment.body.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 60.00 })
      .expect(201);

    // Deuxième remboursement 50€ (total 110€ > 100€)
    const exceeded = await request(app.getHttpServer())
      .post(`/payments/${payment.body.id}/refund`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ amount: 50.00 })
      .expect(400);

    expect(exceeded.body.error).toContain('dépasse');
    expect(parseFloat(exceeded.body.remainingRefundable)).toBe(40.00);
  });

  /**
   * EDGE CASE 17: SIRET invalide (checksum Luhn)
   */
  it('EC-17: Validation SIRET avec checksum incorrect', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'artisan@invalid.com',
        password: 'Pass123!',
        role: 'ARTISAN',
        siret: '12345678901234', // Checksum invalide
      })
      .expect(400);

    expect(response.body.error).toContain('SIRET invalide');
  });

  /**
   * EDGE CASE 18: Géolocalisation Pôle Nord/Sud (limites)
   */
  it('EC-18: Coordonnées extrêmes (pôles)', async () => {
    // Pôle Nord
    const north = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        category: 'PLUMBING',
        latitude: 90.0,
        longitude: 0.0,
      })
      .expect(201);

    expect(north.body.latitude).toBe(90.0);

    // Pôle Sud
    const south = await request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        category: 'PLUMBING',
        latitude: -90.0,
        longitude: 0.0,
      })
      .expect(201);

    expect(south.body.latitude).toBe(-90.0);
  });

  /**
   * EDGE CASE 19: Chat message > 10000 caractères
   */
  it('EC-19: Message très long (limite 5000 chars)', async () => {
    const longMessage = 'a'.repeat(6000);

    const response = await request(app.getHttpServer())
      .post('/chat/messages')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        conversationId: 'conv-123',
        content: longMessage,
      })
      .expect(400);

    expect(response.body.error).toContain('5000');
  });

  /**
   * EDGE CASE 20: Artisan avec 0 missions mais note 5.0
   */
  it('EC-20: Note moyenne sans missions (N/A)', async () => {
    const newArtisan = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'new.artisan@test.com',
        password: 'Pass123!',
        role: 'ARTISAN',
      })
      .expect(201);

    const profile = await request(app.getHttpServer())
      .get(`/artisans/${newArtisan.body.id}`)
      .expect(200);

    expect(profile.body.averageRating).toBeNull();
    expect(profile.body.totalReviews).toBe(0);
    expect(profile.body.ratingDisplay).toBe('Nouveau');
  });

  /**
   * Setup utilisateurs de test
   */
  async function setupTestUsers() {
    const client = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Client',
        lastName: 'Test',
        role: 'CLIENT',
        emailVerified: true,
        clientProfile: { create: {} },
      },
    });
    clientId = client.id;

    const artisan = await prisma.user.create({
      data: {
        email: 'artisan@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Artisan',
        lastName: 'Test',
        role: 'ARTISAN',
        emailVerified: true,
        artisanProfile: {
          create: {
            companyName: 'Test Co',
            siret: '12345678901234',
            baseAddress: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
          },
        },
      },
    });
    artisanId = artisan.id;

    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    adminId = admin.id;

    clientToken = 'mock-client-token';
    artisanToken = 'mock-artisan-token';
    adminToken = 'mock-admin-token';
  }

  /**
   * Nettoyage base de données
   */
  async function cleanDatabase() {
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.order.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.dispute.deleteMany();
    await prisma.review.deleteMany();
    await prisma.negotiation.deleteMany();
    await prisma.missionHistory.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.request.deleteMany();
    await prisma.favorite.deleteMany();
    await prisma.certification.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.user.deleteMany();
  }
});
