import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * ARTICONNECT - TESTS SYSTÈME DE PAIEMENT HYBRIDE
 *
 * Cette suite de tests couvre le système de paiement hybride basé sur la réputation:
 * - Acomptes variables selon le score de réputation (30%, 50%, 100%)
 * - No-shows avec compensation intelligente
 * - Auto-validation après 7 jours
 * - Remboursements avec logique de compensation
 * - Évolution de la réputation
 */

describe('ArtiConnect - Hybrid Payment System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens et IDs pour les tests
  let clientNewToken: string;
  let clientNewId: string;
  let clientEstablishedToken: string;
  let clientEstablishedId: string;
  let clientVIPToken: string;
  let clientVIPId: string;
  let artisanToken: string;
  let artisanId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Nettoyage de la base de données de test
    await cleanDatabase();

    // Créer les utilisateurs de test
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  /**
   * SCÉNARIO 36.1: CLIENT NOUVEAU (score 50) → 100% ACOMPTE
   * Test que les nouveaux clients doivent payer 100% d'acompte
   */
  describe('Scénario 36.1: Client nouveau avec acompte 100%', () => {
    let missionId: string;

    it('36.1.1 - Créer une mission et accepter par artisan', async () => {
      // Créer mission
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          type: 'EMERGENCY',
          title: 'Fuite d\'eau urgente',
          description: 'Réparation fuite sous évier',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      // Artisan accepte la mission
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);
    });

    it('36.1.2 - Négocier et accepter le prix', async () => {
      // Artisan propose un prix
      const negotiationResponse = await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiations`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          proposedPrice: 150.00,
          message: 'Prix pour réparation complète',
        })
        .expect(201);

      const negotiationId = negotiationResponse.body.id;

      // Client accepte la négociation
      await request(app.getHttpServer())
        .put(`/missions/negotiations/${negotiationId}/accept`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          accepted: true,
        })
        .expect(200);
    });

    it('36.1.3 - Configurer l\'acompte - Doit exiger 100%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          agreedPrice: 150.00,
        })
        .expect(200);

      // Vérifier que le client nouveau doit payer 100%
      expect(response.body.paymentModel.depositPercentage).toBe(100);
      expect(response.body.paymentModel.depositRequired).toBe(true);
      expect(response.body.paymentModel.clientRiskLevel).toBe('HIGH');
      expect(response.body.depositAmount).toBe(150.00);
      expect(response.body.paymentModel.reason).toContain('nouveau');
    });

    it('36.1.4 - Vérifier le statut de l\'acompte', async () => {
      const response = await request(app.getHttpServer())
        .get(`/missions/${missionId}/deposit-status`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .expect(200);

      expect(response.body.depositRequired).toBe(true);
      expect(response.body.depositAmount).toBe(150.00);
      expect(response.body.depositPaidAt).toBeNull();
      expect(response.body.depositPercentage).toBe(100);
    });

    it('36.1.5 - Créer le paiement d\'acompte', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/deposit')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          missionId,
        })
        .expect(201);

      expect(response.body.clientSecret).toBeDefined();
      expect(response.body.amount).toBe(150.00);
      expect(response.body.depositPercentage).toBe(100);
    });

    it('36.1.6 - Simuler paiement réussi et vérifier déblocage voyage', async () => {
      // Simuler le paiement réussi en mettant à jour directement la mission
      await prisma.mission.update({
        where: { id: missionId },
        data: {
          depositPaidAt: new Date(),
          depositAmount: 150.00,
        },
      });

      // Maintenant l'artisan peut démarrer son voyage
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(response.body.status).toBe('TRAVELING');
    });

    it('36.1.7 - Vérifier que le voyage est bloqué si acompte non payé', async () => {
      // Créer une nouvelle mission pour ce test
      const mission2Response = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          type: 'EMERGENCY',
          title: 'Test blocage voyage',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
        })
        .expect(201);

      const mission2Id = mission2Response.body.id;

      // Accepter et configurer l'acompte
      await request(app.getHttpServer())
        .post(`/missions/${mission2Id}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${mission2Id}/setup-deposit`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({ agreedPrice: 100.00 })
        .expect(200);

      // Tenter de démarrer le voyage SANS payer l'acompte
      await request(app.getHttpServer())
        .post(`/missions/${mission2Id}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(400); // Doit être refusé
    });
  });

  /**
   * SCÉNARIO 36.2: CLIENT ÉTABLI (score 80) → 50% ACOMPTE
   * Test que les clients établis paient seulement 50% d'acompte
   */
  describe('Scénario 36.2: Client établi avec acompte 50%', () => {
    let missionId: string;

    it('36.2.1 - Créer et accepter mission', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Installation électrique',
          description: 'Installation complète',
          category: 'Électricité',
          address: '20 Avenue Test',
          city: 'Lyon',
          postalCode: '69001',
          country: 'FR',
          latitude: 45.7640,
          longitude: 4.8357,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);
    });

    it('36.2.2 - Configurer l\'acompte - Doit exiger 50%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          agreedPrice: 200.00,
        })
        .expect(200);

      // Vérifier que le client établi paie seulement 50%
      expect(response.body.paymentModel.depositPercentage).toBe(50);
      expect(response.body.paymentModel.depositRequired).toBe(true);
      expect(response.body.paymentModel.clientRiskLevel).toBe('MEDIUM');
      expect(response.body.depositAmount).toBe(100.00); // 50% de 200€
      expect(response.body.paymentModel.reason).toContain('établi');
    });

    it('36.2.3 - Workflow complet avec 50% acompte', async () => {
      // Payer l'acompte
      await prisma.mission.update({
        where: { id: missionId },
        data: {
          depositPaidAt: new Date(),
          depositAmount: 100.00,
        },
      });

      // Voyage
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      // Arrivée
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/arrive`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      // Complétion
      const completeResponse = await request(app.getHttpServer())
        .post(`/missions/${missionId}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(completeResponse.body.status).toBe('COMPLETED');
      expect(completeResponse.body.retractionDeadline).toBeDefined();

      // Validation par le client
      const validateResponse = await request(app.getHttpServer())
        .post(`/missions/${missionId}/validate`)
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .expect(200);

      expect(validateResponse.body.status).toBe('VALIDATED');
      expect(validateResponse.body.paymentTriggered).toBe(true);
    });
  });

  /**
   * SCÉNARIO 36.3: CLIENT VIP (score 150, 15+ missions) → 30% ACOMPTE
   * Test que les clients VIP bénéficient de seulement 30% d'acompte
   */
  describe('Scénario 36.3: Client VIP avec acompte 30%', () => {
    let missionId: string;

    it('36.3.1 - Créer et accepter mission', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientVIPToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Rénovation complète',
          description: 'Rénovation salle de bain',
          category: 'Rénovation',
          address: '30 Boulevard Test',
          city: 'Marseille',
          postalCode: '13001',
          country: 'FR',
          latitude: 43.2965,
          longitude: 5.3698,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);
    });

    it('36.3.2 - Configurer l\'acompte - Doit exiger seulement 30%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientVIPToken}`)
        .send({
          agreedPrice: 500.00,
        })
        .expect(200);

      // Vérifier que le client VIP paie seulement 30%
      expect(response.body.paymentModel.depositPercentage).toBe(30);
      expect(response.body.paymentModel.depositRequired).toBe(true);
      expect(response.body.paymentModel.clientRiskLevel).toBe('LOW');
      expect(response.body.depositAmount).toBe(150.00); // 30% de 500€
      expect(response.body.paymentModel.reason).toContain('VIP');
    });

    it('36.3.3 - Vérifier le profil de réputation VIP', async () => {
      const response = await request(app.getHttpServer())
        .get('/reputation/me')
        .set('Authorization', `Bearer ${clientVIPToken}`)
        .expect(200);

      expect(response.body.totalPoints).toBeGreaterThanOrEqual(150);
      expect(response.body.totalMissions).toBeGreaterThanOrEqual(15);
      expect(response.body.riskLevel).toBe('LOW');
    });
  });

  /**
   * SCÉNARIO 36.4: NO-SHOW AVEC COMPENSATION ARTISAN
   * Test du système de signalement no-show et compensation
   */
  describe('Scénario 36.4: No-show avec compensation artisan', () => {
    let missionId: string;

    it('36.4.1 - Créer mission et démarrer voyage', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          type: 'EMERGENCY',
          title: 'Mission test no-show',
          description: 'Test no-show',
          category: 'Plomberie',
          address: '40 Rue Test',
          city: 'Toulouse',
          postalCode: '31000',
          country: 'FR',
          latitude: 43.6047,
          longitude: 1.4442,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({ agreedPrice: 120.00 })
        .expect(200);

      // Simuler paiement
      await prisma.mission.update({
        where: { id: missionId },
        data: { depositPaidAt: new Date(), depositAmount: 120.00 },
      });

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);
    });

    it('36.4.2 - Artisan signale le no-show avec preuves', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/no-show/report')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          missionId,
          waitDurationMinutes: 25,
          contactAttempts: [
            {
              timestamp: new Date().toISOString(),
              method: 'PHONE',
              successful: false,
            },
            {
              timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
              method: 'SMS',
              successful: false,
            },
          ],
          gpsCoords: {
            latitude: 43.6047,
            longitude: 1.4442,
            timestamp: new Date().toISOString(),
          },
          proofPhotos: [
            'https://s3.example.com/proof1.jpg',
            'https://s3.example.com/proof2.jpg',
          ],
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING_REVIEW');
      expect(response.body.autoValidationEligible).toBe(true);
    });

    it('36.4.3 - Admin valide le no-show', async () => {
      // Récupérer les no-shows en attente
      const pendingResponse = await request(app.getHttpServer())
        .get('/payments/no-show/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(pendingResponse.body.length).toBeGreaterThan(0);
      const noShowEventId = pendingResponse.body[0].id;

      // Valider le no-show
      const validateResponse = await request(app.getHttpServer())
        .post('/payments/no-show/validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          noShowEventId,
        })
        .expect(200);

      expect(validateResponse.body.status).toBe('VALIDATED');
      expect(validateResponse.body.compensationApplied).toBe(true);
    });

    it('36.4.4 - Vérifier la compensation de l\'artisan', async () => {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: {
          transaction: true,
          noShowEvent: true,
        },
      });

      expect(mission.noShowEvent).toBeDefined();
      expect(mission.noShowEvent.status).toBe('VALIDATED');

      // Vérifier qu'une compensation a été créée
      const compensations = await prisma.compensationLog.findMany({
        where: { missionId },
      });
      expect(compensations.length).toBeGreaterThan(0);
    });

    it('36.4.5 - Vérifier la pénalité de réputation du client', async () => {
      const reputationHistory = await prisma.reputationHistory.findMany({
        where: {
          userId: clientNewId,
          reason: { contains: 'No-show' },
        },
      });

      expect(reputationHistory.length).toBeGreaterThan(0);
      expect(reputationHistory[0].pointsChange).toBeLessThan(0); // Pénalité négative
    });
  });

  /**
   * SCÉNARIO 36.5: AUTO-VALIDATION APRÈS 7 JOURS
   * Test du système d'auto-validation des missions bloquées
   */
  describe('Scénario 36.5: Auto-validation après 7 jours', () => {
    let missionId: string;

    it('36.5.1 - Créer mission et la marquer terminée', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Test auto-validation',
          description: 'Test',
          category: 'Plomberie',
          address: '50 Rue Test',
          city: 'Nice',
          postalCode: '06000',
          country: 'FR',
          latitude: 43.7102,
          longitude: 7.2620,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      // Workflow complet jusqu'à COMPLETED
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({ agreedPrice: 180.00 })
        .expect(200);

      await prisma.mission.update({
        where: { id: missionId },
        data: { depositPaidAt: new Date(), depositAmount: 90.00 },
      });

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/arrive`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);
    });

    it('36.5.2 - Simuler 8 jours d\'attente et déclencher auto-validation', async () => {
      // Mettre à jour la date de complétion pour simuler 8 jours
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      await prisma.mission.update({
        where: { id: missionId },
        data: {
          completedAt: eightDaysAgo,
        },
      });

      // Déclencher le CRON d'auto-validation
      const response = await request(app.getHttpServer())
        .post('/missions/auto-validate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.autoValidatedCount).toBeGreaterThan(0);
      expect(response.body.missions).toBeDefined();
      expect(response.body.missions.some((m: any) => m.id === missionId)).toBe(true);
    });

    it('36.5.3 - Vérifier que la mission est validée', async () => {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
      });

      expect(mission.status).toBe('VALIDATED');
      expect(mission.autoValidated).toBe(true);
    });

    it('36.5.4 - Vérifier que le paiement a été déclenché', async () => {
      const transactions = await prisma.transaction.findMany({
        where: { missionId },
      });

      const finalPayment = transactions.find(
        t => t.type === 'MISSION'
      );
      expect(finalPayment).toBeDefined();
    });
  });

  /**
   * SCÉNARIO 36.6: REMBOURSEMENT "CHANGEMENT D'AVIS" → ARTISAN COMPENSÉ
   * Test que l'artisan est compensé si le client change d'avis
   */
  describe('Scénario 36.6: Remboursement changement d\'avis', () => {
    let missionId: string;

    it('36.6.1 - Créer mission et payer acompte', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Test remboursement',
          description: 'Test',
          category: 'Plomberie',
          address: '60 Rue Test',
          city: 'Nantes',
          postalCode: '44000',
          country: 'FR',
          latitude: 47.2184,
          longitude: -1.5536,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({ agreedPrice: 200.00 })
        .expect(200);

      await prisma.mission.update({
        where: { id: missionId },
        data: { depositPaidAt: new Date(), depositAmount: 100.00 },
      });

      // Créer une transaction de dépôt pour le remboursement
      await prisma.transaction.create({
        data: {
          missionId,
          stripePaymentIntentId: 'pi_test_deposit_' + Date.now(),
          amount: 100.00,
          currency: 'EUR',
          commission: 0,
          artisanAmount: 0,
          status: 'COMPLETED',
          type: 'DEPOSIT',
        },
      });
    });

    it('36.6.2 - Client demande remboursement pour changement d\'avis', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          missionId,
          reason: 'CHANGE_OF_MIND',
        })
        .expect(200);

      expect(response.body.refundAmount).toBeLessThan(100.00); // Pas le montant total
      expect(response.body.artisanCompensation).toBeGreaterThan(0);
      expect(response.body.platformFee).toBeGreaterThan(0);
      expect(response.body.message).toContain('compensé');
    });

    it('36.6.3 - Vérifier la compensation de l\'artisan', async () => {
      const compensations = await prisma.compensationLog.findMany({
        where: { missionId },
      });

      expect(compensations.length).toBeGreaterThan(0);
      const compensation = compensations[0];
      expect(parseFloat(compensation.amount.toString())).toBeGreaterThan(0);
    });
  });

  /**
   * SCÉNARIO 36.7: REMBOURSEMENT "TRAVAIL NON FAIT" → ARTISAN PAS PAYÉ
   * Test que l'artisan n'est pas payé si le travail n'est pas fait
   */
  describe('Scénario 36.7: Remboursement travail non fait', () => {
    let missionId: string;

    it('36.7.1 - Créer mission et compléter workflow', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Test travail non fait',
          description: 'Test',
          category: 'Plomberie',
          address: '70 Rue Test',
          city: 'Strasbourg',
          postalCode: '67000',
          country: 'FR',
          latitude: 48.5734,
          longitude: 7.7521,
        })
        .expect(201);

      missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({ agreedPrice: 250.00 })
        .expect(200);

      await prisma.mission.update({
        where: { id: missionId },
        data: { depositPaidAt: new Date(), depositAmount: 125.00 },
      });

      // Créer transaction
      await prisma.transaction.create({
        data: {
          missionId,
          stripePaymentIntentId: 'pi_test_deposit_' + Date.now(),
          amount: 125.00,
          currency: 'EUR',
          commission: 0,
          artisanAmount: 0,
          status: 'COMPLETED',
          type: 'DEPOSIT',
        },
      });

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/arrive`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);
    });

    it('36.7.2 - Client demande remboursement pour travail non fait', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/refund')
        .set('Authorization', `Bearer ${clientEstablishedToken}`)
        .send({
          missionId,
          reason: 'WORK_NOT_DONE',
        })
        .expect(200);

      expect(response.body.refundAmount).toBe(125.00); // Remboursement total
      expect(response.body.artisanCompensation).toBe(0); // Artisan non compensé
      expect(response.body.message).toContain('complet');
    });

    it('36.7.3 - Vérifier que l\'artisan n\'a pas été payé', async () => {
      const compensations = await prisma.compensationLog.findMany({
        where: {
          missionId,
        },
      });

      expect(compensations.length).toBe(0);
    });

    it('36.7.4 - Vérifier la pénalité de réputation de l\'artisan', async () => {
      const reputationHistory = await prisma.reputationHistory.findMany({
        where: {
          userId: artisanId,
          reason: { contains: 'travail non fait' },
        },
      });

      expect(reputationHistory.length).toBeGreaterThan(0);
      expect(reputationHistory[0].pointsChange).toBeLessThan(0);
    });
  });

  /**
   * SCÉNARIO 36.8: ÉVOLUTION RÉPUTATION CLIENT
   * Test de l'évolution de la réputation et impact sur acomptes
   */
  describe('Scénario 36.8: Évolution réputation client', () => {
    it('36.8.1 - Vérifier réputation initiale client nouveau', async () => {
      const response = await request(app.getHttpServer())
        .get('/reputation/me')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .expect(200);

      const initialScore = response.body.totalPoints;
      expect(initialScore).toBe(50); // Score initial
      expect(response.body.riskLevel).toBe('HIGH');
    });

    it('36.8.2 - Compléter une mission avec succès', async () => {
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Mission succès',
          description: 'Test',
          category: 'Plomberie',
          address: '80 Rue Test',
          city: 'Bordeaux',
          postalCode: '33000',
          country: 'FR',
          latitude: 44.8378,
          longitude: -0.5792,
        })
        .expect(201);

      const missionId = missionResponse.body.id;

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/accept`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/setup-deposit`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .send({ agreedPrice: 150.00 })
        .expect(200);

      await prisma.mission.update({
        where: { id: missionId },
        data: {
          depositPaidAt: new Date(),
          depositAmount: 150.00,
          status: 'COMPLETED',
        },
      });

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/validate`)
        .set('Authorization', `Bearer ${clientNewToken}`)
        .expect(200);

      // Attendre que la réputation soit mise à jour
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    it('36.8.3 - Vérifier augmentation de réputation', async () => {
      const response = await request(app.getHttpServer())
        .get('/reputation/me')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .expect(200);

      expect(response.body.totalPoints).toBeGreaterThan(50); // Score augmenté
      expect(response.body.totalMissions).toBeGreaterThan(0);
    });

    it('36.8.4 - Vérifier historique de réputation', async () => {
      const response = await request(app.getHttpServer())
        .get('/reputation/me/history')
        .set('Authorization', `Bearer ${clientNewToken}`)
        .expect(200);

      expect(response.body.history.length).toBeGreaterThan(0);

      // Vérifier les événements positifs
      const positiveEvents = response.body.history.filter(
        (h: any) => h.pointsChange > 0
      );
      expect(positiveEvents.length).toBeGreaterThan(0);
    });

    it('36.8.5 - Admin ajuste manuellement la réputation', async () => {
      const response = await request(app.getHttpServer())
        .post('/reputation/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: clientNewId,
          pointsChange: 20,
          reason: 'Bonus pour fidélité',
        })
        .expect(201);

      expect(response.body.pointsChange).toBe(20);
    });

    it('36.8.6 - Vérifier que l\'ajustement est pris en compte', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reputation/user/${clientNewId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const historyResponse = await request(app.getHttpServer())
        .get(`/reputation/user/${clientNewId}/history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const adminAdjustment = historyResponse.body.history.find(
        (h: any) => h.eventType === 'ADMIN_ADJUSTMENT'
      );
      expect(adminAdjustment).toBeDefined();
      expect(adminAdjustment.pointsChange).toBe(20);
    });
  });

  /**
   * HELPER: Créer les utilisateurs de test avec différents niveaux de réputation
   */
  async function setupTestUsers() {
    // 1. Client Nouveau (score 50)
    const clientNewResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'client.new@test.com',
        password: 'TestPass123!',
        firstName: 'Client',
        lastName: 'Nouveau',
        role: 'CLIENT',
        phone: '+33600000001',
      })
      .expect(201);

    clientNewToken = clientNewResponse.body.accessToken;
    clientNewId = clientNewResponse.body.user.id;

    // Créer le profil réputation avec score 50
    await prisma.reputationProfile.create({
      data: {
        userId: clientNewId,
        totalPoints: 50,
        totalMissions: 0,
        successfulMissions: 0,
        cancelledMissions: 0,
        noShowCount: 0,
        averageRating: 0,
      },
    });

    // 2. Client Établi (score 80, 5 missions)
    const clientEstablishedResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'client.established@test.com',
        password: 'TestPass123!',
        firstName: 'Client',
        lastName: 'Établi',
        role: 'CLIENT',
        phone: '+33600000002',
      })
      .expect(201);

    clientEstablishedToken = clientEstablishedResponse.body.accessToken;
    clientEstablishedId = clientEstablishedResponse.body.user.id;

    await prisma.reputationProfile.create({
      data: {
        userId: clientEstablishedId,
        totalPoints: 80,
        totalMissions: 5,
        successfulMissions: 5,
        cancelledMissions: 0,
        noShowCount: 0,
        averageRating: 4.5,
      },
    });

    // 3. Client VIP (score 150, 15 missions)
    const clientVIPResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'client.vip@test.com',
        password: 'TestPass123!',
        firstName: 'Client',
        lastName: 'VIP',
        role: 'CLIENT',
        phone: '+33600000003',
      })
      .expect(201);

    clientVIPToken = clientVIPResponse.body.accessToken;
    clientVIPId = clientVIPResponse.body.user.id;

    await prisma.reputationProfile.create({
      data: {
        userId: clientVIPId,
        totalPoints: 150,
        totalMissions: 15,
        successfulMissions: 14,
        cancelledMissions: 1,
        noShowCount: 0,
        averageRating: 4.8,
      },
    });

    // 4. Artisan
    const artisanResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'artisan.test@test.com',
        password: 'TestPass123!',
        firstName: 'Artisan',
        lastName: 'Test',
        role: 'ARTISAN',
        phone: '+33600000004',
      })
      .expect(201);

    artisanToken = artisanResponse.body.accessToken;
    artisanId = artisanResponse.body.user.id;

    await prisma.reputationProfile.create({
      data: {
        userId: artisanId,
        totalPoints: 100,
        totalMissions: 10,
        successfulMissions: 10,
        cancelledMissions: 0,
        noShowCount: 0,
        averageRating: 4.7,
      },
    });

    // 5. Admin
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin.test@test.com',
        password: 'TestPass123!',
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        phone: '+33600000005',
      })
      .expect(201);

    adminToken = adminResponse.body.accessToken;
    adminId = adminResponse.body.user.id;
  }

  /**
   * HELPER: Nettoyer la base de données
   */
  async function cleanDatabase() {
    // Ordre important pour respecter les contraintes FK
    await prisma.reputationHistory.deleteMany();
    await prisma.noShowEvent.deleteMany();
    await prisma.compensationLog.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.negotiation.deleteMany();
    await prisma.missionHistory.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.review.deleteMany();
    await prisma.reputationProfile.deleteMany();
    await prisma.address.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.user.deleteMany();
  }
});
