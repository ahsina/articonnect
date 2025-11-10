/**
 * ========================================================================
 * TESTS PRODUCTION-READY - ArtiConnect
 * ========================================================================
 *
 * Tests critiques manquants pour déploiement production à grande échelle
 * Scénarios: 32-34 + compléments 15, 20
 *
 * Scénarios couverts:
 * - S32: PWA Features (8 tests)
 * - S33: Backup & Recovery (5 tests)
 * - S15.6-8: Workflow temporel complet (3 tests)
 * - S34: Détection Fraude (6 tests)
 * - S20.7-8: Tracking GPS temps réel (2 tests)
 * - S35: Abonnements Artisans (4 tests)
 * - S23.7-9: Marketplace Complet (3 tests)
 *
 * Total: 31 tests additionnels
 * ========================================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AppModule } from '../../src/app.module';

describe('Tests Production-Ready (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let clientToken: string;
  let artisanToken: string;

  let adminId: string;
  let clientId: string;
  let artisanId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Nettoyer la base de données
    await prisma.notification.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.product.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.user.deleteMany();

    // Créer utilisateurs de test
    await setupTestUsers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * =====================================================
   * SCÉNARIO 32: PWA FEATURES
   * Tests des fonctionnalités Progressive Web App
   * =====================================================
   */
  describe('Scénario 32: PWA Features', () => {

    it('32.1 - Service Worker installé et enregistré', async () => {
      // Vérifier que le manifest.json existe et est valide
      const manifest = await request(app.getHttpServer())
        .get('/manifest.json')
        .expect(200);

      expect(manifest.body).toHaveProperty('name');
      expect(manifest.body).toHaveProperty('short_name');
      expect(manifest.body).toHaveProperty('icons');
      expect(manifest.body).toHaveProperty('start_url');
      expect(manifest.body).toHaveProperty('display');
      expect(manifest.body.display).toBe('standalone');
      expect(manifest.body).toHaveProperty('theme_color');
      expect(manifest.body).toHaveProperty('background_color');

      // Vérifier que le service worker est disponible
      const sw = await request(app.getHttpServer())
        .get('/service-worker.js')
        .expect(200);

      expect(sw.headers['content-type']).toContain('javascript');
      expect(sw.text).toContain('self.addEventListener');
      expect(sw.text).toContain('install');
      expect(sw.text).toContain('fetch');
    });

    it('32.2 - Fonctionnement offline avec cache strategies', async () => {
      // Enregistrer stratégies de cache
      const cacheConfig = await request(app.getHttpServer())
        .get('/pwa/cache-config')
        .expect(200);

      expect(cacheConfig.body).toHaveProperty('strategies');
      expect(cacheConfig.body.strategies).toHaveProperty('static'); // Cache first
      expect(cacheConfig.body.strategies).toHaveProperty('api'); // Network first
      expect(cacheConfig.body.strategies).toHaveProperty('images'); // Cache first

      // Tester accès API en mode offline (simulé)
      const offlineData = await request(app.getHttpServer())
        .get('/pwa/offline-data')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(offlineData.body).toHaveProperty('cachedMissions');
      expect(offlineData.body).toHaveProperty('cachedMessages');
      expect(offlineData.body).toHaveProperty('lastSync');
      expect(Array.isArray(offlineData.body.cachedMissions)).toBe(true);
    });

    it('32.3 - Push Notifications natives (Web Push)', async () => {
      // S'abonner aux push notifications
      const subscription = await request(app.getHttpServer())
        .post('/pwa/push-subscribe')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          endpoint: 'https://fcm.googleapis.com/fcm/send/mock-endpoint',
          keys: {
            p256dh: 'mock-p256dh-key',
            auth: 'mock-auth-key',
          },
        })
        .expect(201);

      expect(subscription.body.subscribed).toBe(true);
      expect(subscription.body.endpoint).toContain('fcm.googleapis.com');

      // Envoyer une push notification de test
      const push = await request(app.getHttpServer())
        .post('/pwa/push-send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: clientId,
          title: 'Nouvelle mission disponible',
          body: 'Un artisan a accepté votre demande',
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          data: {
            missionId: 'mission-123',
            url: '/missions/mission-123',
          },
        })
        .expect(200);

      expect(push.body.sent).toBe(true);
      expect(push.body.deliveryStatus).toBe('SUCCESS');
    });

    it('32.4 - Installation sur écran d\'accueil (beforeinstallprompt)', async () => {
      // Vérifier que l'app est installable
      const installable = await request(app.getHttpServer())
        .get('/pwa/installable-check')
        .expect(200);

      expect(installable.body.installable).toBe(true);
      expect(installable.body.criteria).toHaveProperty('manifest');
      expect(installable.body.criteria).toHaveProperty('serviceWorker');
      expect(installable.body.criteria).toHaveProperty('https');
      expect(installable.body.criteria.manifest).toBe(true);
      expect(installable.body.criteria.serviceWorker).toBe(true);

      // Simuler installation
      const install = await request(app.getHttpServer())
        .post('/pwa/install-event')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          platform: 'android',
          outcome: 'accepted',
        })
        .expect(201);

      expect(install.body.installed).toBe(true);
    });

    it('32.5 - Background Sync pour opérations offline', async () => {
      // Créer une opération à synchroniser
      const syncOperation = await request(app.getHttpServer())
        .post('/pwa/sync-operations')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          type: 'CREATE_REVIEW',
          data: {
            missionId: 'mission-offline-123',
            rating: 5,
            comment: 'Excellent travail',
          },
          createdAt: new Date().toISOString(),
        })
        .expect(201);

      expect(syncOperation.body.id).toBeDefined();
      expect(syncOperation.body.status).toBe('PENDING');

      // Déclencher synchronisation
      const sync = await request(app.getHttpServer())
        .post('/pwa/sync-trigger')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(sync.body.synced).toBe(true);
      expect(sync.body.operations).toBeGreaterThan(0);

      // Vérifier que l'opération a été synchronisée
      const status = await request(app.getHttpServer())
        .get(`/pwa/sync-operations/${syncOperation.body.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(status.body.status).toBe('COMPLETED');
    });

    it('32.6 - Cache Strategies avancées (API responses)', async () => {
      // Stratégie Network First avec fallback
      const networkFirst = await request(app.getHttpServer())
        .get('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('X-Cache-Strategy', 'network-first')
        .expect(200);

      expect(networkFirst.headers['x-cache-status']).toBe('MISS'); // Première requête

      // Deuxième requête (devrait utiliser le cache si réseau échoue)
      const cached = await request(app.getHttpServer())
        .get('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .set('X-Simulate-Offline', 'true')
        .expect(200);

      expect(cached.headers['x-cache-status']).toBe('HIT');
      expect(Array.isArray(cached.body)).toBe(true);
    });

    it('32.7 - Badge d\'icône avec compteur (App Icon Badge)', async () => {
      // Obtenir compteur de badge
      const badge = await request(app.getHttpServer())
        .get('/pwa/badge-count')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(badge.body).toHaveProperty('count');
      expect(badge.body.count).toBeGreaterThanOrEqual(0);

      // Mettre à jour le badge
      await request(app.getHttpServer())
        .post('/pwa/badge-update')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          count: 5,
        })
        .expect(200);

      // Vérifier mise à jour
      const updated = await request(app.getHttpServer())
        .get('/pwa/badge-count')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(updated.body.count).toBe(5);

      // Réinitialiser le badge
      await request(app.getHttpServer())
        .delete('/pwa/badge-clear')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
    });

    it('32.8 - Partage natif (Web Share API)', async () => {
      // Préparer données de partage
      const shareData = await request(app.getHttpServer())
        .post('/pwa/share-prepare')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          type: 'ARTISAN_PROFILE',
          artisanId: artisanId,
        })
        .expect(200);

      expect(shareData.body).toHaveProperty('title');
      expect(shareData.body).toHaveProperty('text');
      expect(shareData.body).toHaveProperty('url');
      expect(shareData.body.title).toContain('Artisan');
      expect(shareData.body.url).toContain(`/artisans/${artisanId}`);

      // Simuler partage natif
      const share = await request(app.getHttpServer())
        .post('/pwa/share-track')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          shareData: shareData.body,
          platform: 'whatsapp',
          success: true,
        })
        .expect(201);

      expect(share.body.shared).toBe(true);
      expect(share.body.platform).toBe('whatsapp');
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 33: BACKUP & RECOVERY
   * Tests de sauvegarde et récupération de données
   * =====================================================
   */
  describe('Scénario 33: Backup & Recovery', () => {

    it('33.1 - Backup automatique quotidien configuré', async () => {
      // Vérifier que le job de backup est configuré
      const backupConfig = await request(app.getHttpServer())
        .get('/admin/backup/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(backupConfig.body).toHaveProperty('enabled');
      expect(backupConfig.body.enabled).toBe(true);
      expect(backupConfig.body).toHaveProperty('schedule');
      expect(backupConfig.body.schedule).toBe('0 2 * * *'); // Tous les jours à 2h
      expect(backupConfig.body).toHaveProperty('retention');
      expect(backupConfig.body.retention).toBeGreaterThanOrEqual(7); // 7 jours minimum

      // Lister les backups existants
      const backups = await request(app.getHttpServer())
        .get('/admin/backup/list')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(backups.body)).toBe(true);
    });

    it('33.2 - Création et restauration backup complet', async () => {
      // Créer des données de test
      const testData = await prisma.user.create({
        data: {
          email: 'backup-test@example.com',
          password: 'hashed',
          firstName: 'Backup',
          lastName: 'Test',
          role: 'CLIENT',
          emailVerified: true,
          clientProfile: { create: {} },
        },
      });

      // Déclencher backup manuel
      const backup = await request(app.getHttpServer())
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'FULL',
          description: 'Test backup complet',
        })
        .expect(201);

      expect(backup.body).toHaveProperty('id');
      expect(backup.body).toHaveProperty('status');
      expect(backup.body.status).toBe('COMPLETED');
      expect(backup.body).toHaveProperty('size');
      expect(backup.body).toHaveProperty('location');
      expect(backup.body.location).toContain('s3://');

      // Supprimer les données de test
      await prisma.user.delete({ where: { id: testData.id } });

      // Vérifier que les données sont supprimées
      const deleted = await prisma.user.findUnique({
        where: { id: testData.id },
      });
      expect(deleted).toBeNull();

      // Restaurer depuis le backup
      const restore = await request(app.getHttpServer())
        .post('/admin/backup/restore')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          backupId: backup.body.id,
          tables: ['users', 'clientProfiles'],
        })
        .expect(200);

      expect(restore.body.status).toBe('COMPLETED');
      expect(restore.body.recordsRestored).toBeGreaterThan(0);

      // Vérifier que les données sont restaurées
      const restored = await prisma.user.findUnique({
        where: { email: 'backup-test@example.com' },
      });
      expect(restored).toBeDefined();
      expect(restored.firstName).toBe('Backup');

      // Cleanup
      await prisma.user.delete({ where: { id: restored.id } });
    });

    it('33.3 - Backup incrémental (changements uniquement)', async () => {
      // Créer backup complet initial
      const fullBackup = await request(app.getHttpServer())
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'FULL',
        })
        .expect(201);

      const fullBackupSize = fullBackup.body.size;

      // Faire quelques changements
      await prisma.user.update({
        where: { id: clientId },
        data: { firstName: 'Updated' },
      });

      // Créer backup incrémental
      const incrementalBackup = await request(app.getHttpServer())
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'INCREMENTAL',
          basedOn: fullBackup.body.id,
        })
        .expect(201);

      expect(incrementalBackup.body.type).toBe('INCREMENTAL');
      expect(incrementalBackup.body.size).toBeLessThan(fullBackupSize);
      expect(incrementalBackup.body).toHaveProperty('changesOnly');
      expect(incrementalBackup.body.changesOnly).toBe(true);
    });

    it('33.4 - Test d\'intégrité des données (checksum)', async () => {
      // Créer backup
      const backup = await request(app.getHttpServer())
        .post('/admin/backup/create')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'FULL',
        })
        .expect(201);

      // Vérifier intégrité
      const integrity = await request(app.getHttpServer())
        .post('/admin/backup/verify-integrity')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          backupId: backup.body.id,
        })
        .expect(200);

      expect(integrity.body.valid).toBe(true);
      expect(integrity.body).toHaveProperty('checksum');
      expect(integrity.body).toHaveProperty('expectedChecksum');
      expect(integrity.body.checksum).toBe(integrity.body.expectedChecksum);
      expect(integrity.body).toHaveProperty('verified');
      expect(integrity.body.verified).toBe(true);
    });

    it('33.5 - Plan de reprise d\'activité (Disaster Recovery)', async () => {
      // Obtenir le plan de DR
      const drPlan = await request(app.getHttpServer())
        .get('/admin/disaster-recovery/plan')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(drPlan.body).toHaveProperty('rto'); // Recovery Time Objective
      expect(drPlan.body).toHaveProperty('rpo'); // Recovery Point Objective
      expect(drPlan.body.rto).toBeLessThanOrEqual(4); // < 4h
      expect(drPlan.body.rpo).toBeLessThanOrEqual(24); // < 24h

      expect(drPlan.body).toHaveProperty('steps');
      expect(Array.isArray(drPlan.body.steps)).toBe(true);
      expect(drPlan.body.steps.length).toBeGreaterThan(0);

      // Simuler scénario de disaster
      const drTest = await request(app.getHttpServer())
        .post('/admin/disaster-recovery/test')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          scenario: 'DATABASE_FAILURE',
          dryRun: true,
        })
        .expect(200);

      expect(drTest.body).toHaveProperty('success');
      expect(drTest.body.success).toBe(true);
      expect(drTest.body).toHaveProperty('estimatedRecoveryTime');
      expect(drTest.body).toHaveProperty('steps');
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 15 (COMPLÉMENT): WORKFLOW TEMPOREL COMPLET
   * Tests des délais et temporalité dans le workflow
   * =====================================================
   */
  describe('Scénario 15 (Complément): Workflow Temporel', () => {

    it('15.6 - Workflow complet avec délai rétractation 48h', async () => {
      // Créer une mission
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Test délai rétractation',
          description: 'Mission test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 200.00,
          vatRate: 20.00,
        },
      });

      // Compléter la mission
      await request(app.getHttpServer())
        .put(`/missions/${mission.id}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      // Client valide et paye le solde
      const payment = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: mission.id,
          amount: 200.00,
          type: 'BALANCE',
        })
        .expect(201);

      expect(payment.body.status).toBe('SUCCEEDED');

      // Vérifier que les fonds sont bloqués (escrow)
      const escrow = await request(app.getHttpServer())
        .get(`/payments/${payment.body.id}/escrow-status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(escrow.body.status).toBe('HELD');
      expect(escrow.body.releaseDate).toBeDefined();

      // Calculer date de release (48h après paiement)
      const releaseDate = new Date(escrow.body.releaseDate);
      const paymentDate = new Date(payment.body.createdAt);
      const hoursDiff = (releaseDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60);

      expect(hoursDiff).toBeGreaterThanOrEqual(48);
      expect(hoursDiff).toBeLessThanOrEqual(49); // Marge de 1h

      // Vérifier qu'on peut demander remboursement pendant le délai
      const refundRequest = await request(app.getHttpServer())
        .post(`/payments/${payment.body.id}/refund-request`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Travail non conforme',
          amount: 200.00,
        })
        .expect(201);

      expect(refundRequest.body.status).toBe('PENDING');
      expect(refundRequest.body.eligibleForRefund).toBe(true);
    });

    it('15.7 - Transfert automatique artisan après expiration délai', async () => {
      // Créer une mission terminée
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'COMPLETED',
          title: 'Test transfert auto',
          description: 'Mission test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 300.00,
          vatRate: 20.00,
          completedAt: new Date(Date.now() - 50 * 60 * 60 * 1000), // Complétée il y a 50h
        },
      });

      // Paiement effectué il y a 50h (au-delà du délai de 48h)
      const payment = await prisma.payment.create({
        data: {
          missionId: mission.id,
          userId: clientId,
          amount: 300.00,
          type: 'BALANCE',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          providerPaymentId: 'pi_mock_old',
          createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000),
        },
      });

      // Déclencher processus de transfert automatique (job cron)
      const transfer = await request(app.getHttpServer())
        .post('/admin/payments/process-pending-transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(transfer.body.processed).toBeGreaterThan(0);
      expect(transfer.body.transfers).toBeInstanceOf(Array);

      // Vérifier qu'un transfert a été créé pour ce paiement
      const paymentTransfer = transfer.body.transfers.find(
        t => t.paymentId === payment.id
      );

      expect(paymentTransfer).toBeDefined();
      expect(paymentTransfer.artisanId).toBe(artisanId);
      expect(parseFloat(paymentTransfer.amount)).toBeLessThan(300.00); // Commission déduite
      expect(paymentTransfer.status).toBe('COMPLETED');
    });

    it('15.8 - Remboursement client pendant délai de rétractation', async () => {
      // Créer une mission avec paiement récent (< 48h)
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'COMPLETED',
          title: 'Test remboursement délai',
          description: 'Mission test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 250.00,
          vatRate: 20.00,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2h
        },
      });

      const payment = await prisma.payment.create({
        data: {
          missionId: mission.id,
          userId: clientId,
          amount: 250.00,
          type: 'BALANCE',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          providerPaymentId: 'pi_mock_recent',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Il y a 2h
        },
      });

      // Client demande remboursement (dans les 48h)
      const refund = await request(app.getHttpServer())
        .post(`/payments/${payment.id}/refund`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Travail non satisfaisant',
          amount: 250.00,
        })
        .expect(201);

      expect(refund.body.status).toBe('SUCCEEDED');
      expect(parseFloat(refund.body.amount)).toBe(250.00);
      expect(refund.body.withinRetractionPeriod).toBe(true);

      // Vérifier que le paiement est remboursé
      const updatedPayment = await prisma.payment.findUnique({
        where: { id: payment.id },
      });

      expect(updatedPayment.status).toBe('REFUNDED');

      // Vérifier que l'artisan n'a PAS reçu le transfert
      const transfers = await request(app.getHttpServer())
        .get('/artisans/transfers')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({ missionId: mission.id })
        .expect(200);

      // Aucun transfert ne devrait exister pour cette mission
      expect(transfers.body.length).toBe(0);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 34: DÉTECTION FRAUDE
   * Tests de prévention et détection de fraude
   * =====================================================
   */
  describe('Scénario 34: Détection Fraude', () => {

    it('34.1 - KYC artisan (vérification documents)', async () => {
      // Soumettre documents KYC
      const kyc = await request(app.getHttpServer())
        .post('/artisans/kyc/submit')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          documentType: 'ID_CARD',
          documentNumber: 'FR123456789',
          documentFrontUrl: 's3://documents/id-front.jpg',
          documentBackUrl: 's3://documents/id-back.jpg',
          proofOfAddressUrl: 's3://documents/proof-address.pdf',
          siretDocument: 's3://documents/siret.pdf',
        })
        .expect(201);

      expect(kyc.body).toHaveProperty('kycId');
      expect(kyc.body.status).toBe('PENDING_REVIEW');

      // Admin vérifie les documents
      const review = await request(app.getHttpServer())
        .post(`/admin/kyc/${kyc.body.kycId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'APPROVED',
          notes: 'Documents valides et conformes',
          verifiedFields: [
            'identity',
            'address',
            'business_registration',
          ],
        })
        .expect(200);

      expect(review.body.status).toBe('APPROVED');
      expect(review.body.kycLevel).toBe('VERIFIED');

      // Vérifier que l'artisan a le badge "Vérifié"
      const profile = await prisma.artisanProfile.findFirst({
        where: { userId: artisanId },
      });

      expect(profile).toBeDefined();
    });

    it('34.2 - Limites montants progressives (nouveaux artisans)', async () => {
      // Créer un nouvel artisan (non vérifié)
      const newArtisan = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newartisan@test.com',
          password: 'Pass123!',
          firstName: 'Nouveau',
          lastName: 'Artisan',
          role: 'ARTISAN',
          companyName: 'New Co',
          country: 'FR',
        })
        .expect(201);

      // Vérifier les limites
      const limits = await request(app.getHttpServer())
        .get('/artisans/transaction-limits')
        .set('Authorization', `Bearer ${newArtisan.body.token}`)
        .expect(200);

      expect(limits.body).toHaveProperty('dailyLimit');
      expect(limits.body).toHaveProperty('weeklyLimit');
      expect(limits.body).toHaveProperty('monthlyLimit');
      expect(limits.body.tier).toBe('NEW'); // Nouveau = limites basses

      expect(parseFloat(limits.body.dailyLimit)).toBe(500.00); // Limite basse
      expect(parseFloat(limits.body.weeklyLimit)).toBe(2000.00);

      // Tenter de créer une mission au-delà de la limite
      const overLimit = await request(app.getHttpServer())
        .post('/missions/accept')
        .set('Authorization', `Bearer ${newArtisan.body.token}`)
        .send({
          missionId: 'mock-mission-id',
          agreedPrice: 1000.00, // Au-delà de la limite quotidienne
        })
        .expect(403);

      expect(overLimit.body.error).toBe('LIMIT_EXCEEDED');
      expect(overLimit.body.message).toContain('limite quotidienne');
    });

    it('34.3 - Détection transactions circulaires', async () => {
      // Créer 2 utilisateurs qui vont faire des transactions circulaires
      const user1 = await prisma.user.create({
        data: {
          email: 'circular1@test.com',
          password: 'hashed',
          firstName: 'User',
          lastName: 'One',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Company 1',
              siret: '12345678900001',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
            },
          },
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: 'circular2@test.com',
          password: 'hashed',
          firstName: 'User',
          lastName: 'Two',
          role: 'CLIENT',
          emailVerified: true,
          clientProfile: { create: {} },
        },
      });

      // User1 → User2 (100€)
      await prisma.payment.create({
        data: {
          userId: user2.id,
          amount: 100.00,
          type: 'BALANCE',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          providerPaymentId: 'pi_circular_1',
          missionId: 'mission-circular-1',
        },
      });

      // User2 → User1 (100€) immédiatement après
      await prisma.payment.create({
        data: {
          userId: user1.id,
          amount: 100.00,
          type: 'BALANCE',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          providerPaymentId: 'pi_circular_2',
          missionId: 'mission-circular-2',
        },
      });

      // Analyser les patterns suspects
      const fraudCheck = await request(app.getHttpServer())
        .post('/admin/fraud-detection/analyze-patterns')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [user1.id, user2.id],
        })
        .expect(200);

      expect(fraudCheck.body).toHaveProperty('alerts');
      expect(fraudCheck.body.alerts.length).toBeGreaterThan(0);

      const circularAlert = fraudCheck.body.alerts.find(
        a => a.type === 'CIRCULAR_TRANSACTIONS'
      );

      expect(circularAlert).toBeDefined();
      expect(circularAlert.riskLevel).toBe('HIGH');
      expect(circularAlert.users).toContain(user1.id);
      expect(circularAlert.users).toContain(user2.id);
    });

    it('34.4 - Monitoring patterns suspects (IA)', async () => {
      // Créer pattern suspect : beaucoup de petites transactions rapides
      const suspiciousUser = await prisma.user.create({
        data: {
          email: 'suspicious@test.com',
          password: 'hashed',
          firstName: 'Suspicious',
          lastName: 'User',
          role: 'CLIENT',
          emailVerified: true,
          clientProfile: { create: {} },
        },
      });

      // Créer 10 paiements en 1 minute
      for (let i = 0; i < 10; i++) {
        await prisma.payment.create({
          data: {
            userId: suspiciousUser.id,
            amount: 9.99,
            type: 'BALANCE',
            status: 'SUCCEEDED',
            provider: 'STRIPE',
            providerPaymentId: `pi_rapid_${i}`,
            missionId: `mission-rapid-${i}`,
            createdAt: new Date(Date.now() - i * 1000), // 1 seconde d'écart
          },
        });
      }

      // Analyse IA
      const aiAnalysis = await request(app.getHttpServer())
        .post('/admin/fraud-detection/ai-analyze')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: suspiciousUser.id,
          period: '1h',
        })
        .expect(200);

      expect(aiAnalysis.body).toHaveProperty('riskScore');
      expect(aiAnalysis.body.riskScore).toBeGreaterThan(0.7); // Risque élevé
      expect(aiAnalysis.body).toHaveProperty('patterns');
      expect(aiAnalysis.body.patterns).toContain('RAPID_TRANSACTIONS');
      expect(aiAnalysis.body.patterns).toContain('SMALL_AMOUNTS');
      expect(aiAnalysis.body).toHaveProperty('recommendation');
      expect(aiAnalysis.body.recommendation).toBe('MANUAL_REVIEW');
    });

    it('34.5 - Blocage automatique compte suspect', async () => {
      // Créer utilisateur avec activité très suspecte
      const fraudUser = await prisma.user.create({
        data: {
          email: 'fraud@test.com',
          password: 'hashed',
          firstName: 'Fraud',
          lastName: 'User',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Fraud Co',
              siret: '99999999999999',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
            },
          },
        },
      });

      // Déclencher détection de fraude grave
      const fraudDetection = await request(app.getHttpServer())
        .post('/admin/fraud-detection/trigger-alert')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: fraudUser.id,
          alertType: 'CHARGEBACK_PATTERN',
          severity: 'CRITICAL',
          details: {
            chargebacks: 5,
            period: '7d',
            amount: 2000.00,
          },
        })
        .expect(201);

      expect(fraudDetection.body.action).toBe('AUTO_SUSPEND');
      expect(fraudDetection.body.suspended).toBe(true);

      // Vérifier que l'utilisateur est suspendu
      const user = await prisma.user.findUnique({
        where: { id: fraudUser.id },
      });

      expect(user.status).toBe('SUSPENDED');

      // Vérifier qu'il ne peut plus se connecter
      const loginAttempt = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'fraud@test.com',
          password: 'Pass123!',
        })
        .expect(403);

      expect(loginAttempt.body.message).toContain('suspendu');
      expect(loginAttempt.body.reason).toContain('fraude');
    });

    it('34.6 - Reporting TRACFIN (transactions suspectes)', async () => {
      // Créer transaction devant être signalée (montant élevé, pays sensible)
      const highValueTx = await prisma.payment.create({
        data: {
          userId: clientId,
          amount: 15000.00, // Au-delà du seuil
          type: 'BALANCE',
          status: 'SUCCEEDED',
          provider: 'STRIPE',
          providerPaymentId: 'pi_high_value',
          missionId: 'mission-high-value',
        },
      });

      // Générer rapport TRACFIN
      const report = await request(app.getHttpServer())
        .post('/admin/compliance/tracfin-report')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          paymentId: highValueTx.id,
          reason: 'HIGH_VALUE_TRANSACTION',
          details: 'Transaction supérieure à 10 000€',
        })
        .expect(201);

      expect(report.body).toHaveProperty('reportId');
      expect(report.body.status).toBe('SUBMITTED');
      expect(report.body).toHaveProperty('submittedAt');
      expect(report.body).toHaveProperty('authority');
      expect(report.body.authority).toBe('TRACFIN');

      // Vérifier que le rapport est stocké
      const reports = await request(app.getHttpServer())
        .get('/admin/compliance/tracfin-reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ year: new Date().getFullYear() })
        .expect(200);

      expect(reports.body.length).toBeGreaterThan(0);
      const thisReport = reports.body.find(r => r.reportId === report.body.reportId);
      expect(thisReport).toBeDefined();
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 20 (COMPLÉMENT): TRACKING GPS TEMPS RÉEL
   * Tests du suivi GPS en temps réel pendant mission
   * =====================================================
   */
  describe('Scénario 20 (Complément): Tracking GPS Temps Réel', () => {

    it('20.7 - Mise à jour position artisan temps réel pendant trajet', async () => {
      // Créer mission acceptée
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Urgence tracking GPS',
          description: 'Test tracking',
          category: 'Plomberie',
          address: '10 Rue Destination',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 150.00,
          vatRate: 20.00,
        },
      });

      // Artisan démarre le trajet
      await request(app.getHttpServer())
        .post(`/missions/${mission.id}/start-travel`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          startLatitude: 48.8500,
          startLongitude: 2.3400,
        })
        .expect(200);

      // Simuler 10 updates de position toutes les 10 secondes
      const positions = [
        { lat: 48.8510, lng: 2.3420, timestamp: new Date(Date.now()) },
        { lat: 48.8520, lng: 2.3440, timestamp: new Date(Date.now() + 10000) },
        { lat: 48.8530, lng: 2.3460, timestamp: new Date(Date.now() + 20000) },
        { lat: 48.8540, lng: 2.3480, timestamp: new Date(Date.now() + 30000) },
        { lat: 48.8550, lng: 2.3500, timestamp: new Date(Date.now() + 40000) },
        { lat: 48.8556, lng: 2.3510, timestamp: new Date(Date.now() + 50000) },
        { lat: 48.8560, lng: 2.3515, timestamp: new Date(Date.now() + 60000) },
        { lat: 48.8563, lng: 2.3518, timestamp: new Date(Date.now() + 70000) },
        { lat: 48.8565, lng: 2.3520, timestamp: new Date(Date.now() + 80000) },
        { lat: 48.8566, lng: 2.3522, timestamp: new Date(Date.now() + 90000) }, // Arrivée
      ];

      for (const pos of positions) {
        const update = await request(app.getHttpServer())
          .put('/geo/location/realtime')
          .set('Authorization', `Bearer ${artisanToken}`)
          .send({
            latitude: pos.lat,
            longitude: pos.lng,
            missionId: mission.id,
            timestamp: pos.timestamp.toISOString(),
          })
          .expect(200);

        expect(update.body.updated).toBe(true);
        expect(update.body.broadcastToClient).toBe(true); // WebSocket
      }

      // Vérifier que toutes les positions sont enregistrées
      const trackingHistory = await request(app.getHttpServer())
        .get(`/missions/${mission.id}/tracking-history`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(trackingHistory.body.positions.length).toBeGreaterThanOrEqual(10);
      expect(trackingHistory.body.totalDistance).toBeGreaterThan(0); // km
      expect(trackingHistory.body.averageSpeed).toBeGreaterThan(0); // km/h
    });

    it('20.8 - Client visualise position artisan sur carte en temps réel', async () => {
      // Créer mission en cours
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'IN_PROGRESS',
          title: 'Mission en cours',
          description: 'Test visualisation',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 150.00,
          vatRate: 20.00,
        },
      });

      // Artisan met à jour sa position
      await request(app.getHttpServer())
        .put('/geo/location/realtime')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8550,
          longitude: 2.3500,
          missionId: mission.id,
        })
        .expect(200);

      // Client récupère position actuelle de l'artisan
      const liveTracking = await request(app.getHttpServer())
        .get(`/missions/${mission.id}/live-tracking`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(liveTracking.body).toHaveProperty('artisanPosition');
      expect(liveTracking.body.artisanPosition).toHaveProperty('latitude');
      expect(liveTracking.body.artisanPosition).toHaveProperty('longitude');
      expect(liveTracking.body.artisanPosition.latitude).toBe(48.8550);
      expect(liveTracking.body.artisanPosition.longitude).toBe(2.3500);

      expect(liveTracking.body).toHaveProperty('eta');
      expect(liveTracking.body).toHaveProperty('distanceRemaining');
      expect(liveTracking.body).toHaveProperty('lastUpdate');

      // Vérifier que la position est récente (< 30 secondes)
      const lastUpdate = new Date(liveTracking.body.lastUpdate);
      const now = new Date();
      const secondsAgo = (now.getTime() - lastUpdate.getTime()) / 1000;
      expect(secondsAgo).toBeLessThan(30);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 35: ABONNEMENTS ARTISANS
   * Tests du système d'abonnements et commissions
   * =====================================================
   */
  describe('Scénario 35: Abonnements Artisans', () => {

    it('35.1 - Souscription abonnement Pro (29€/mois)', async () => {
      // Souscrire à l'abonnement Pro
      const subscription = await request(app.getHttpServer())
        .post('/artisans/subscriptions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          plan: 'PRO',
          billingPeriod: 'MONTHLY',
          paymentMethod: 'pm_mock_card',
        })
        .expect(201);

      expect(subscription.body.plan).toBe('PRO');
      expect(parseFloat(subscription.body.monthlyPrice)).toBe(29.00);
      expect(subscription.body.status).toBe('ACTIVE');
      expect(subscription.body.features).toContain('REDUCED_COMMISSION'); // 10% au lieu de 12%
      expect(subscription.body.features).toContain('ADVANCED_TOOLS');
      expect(subscription.body.features).toContain('PRIORITY_SUPPORT');

      // Vérifier que la commission est réduite
      const commissionRate = await request(app.getHttpServer())
        .get('/artisans/commission-rate')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(parseFloat(commissionRate.body.rate)).toBe(10.0); // Réduit de 12% à 10%
      expect(commissionRate.body.subscriptionPlan).toBe('PRO');
    });

    it('35.2 - Commission réduite selon abonnement', async () => {
      // Créer 3 artisans avec différents abonnements
      const basicArtisan = await prisma.user.create({
        data: {
          email: 'basic@test.com',
          password: 'hashed',
          firstName: 'Basic',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Basic Co',
              siret: '11111111100001',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              subscriptionPlan: 'BASIC', // 0€/mois, 12% commission
            },
          },
        },
      });

      const proArtisan = await prisma.user.create({
        data: {
          email: 'pro@test.com',
          password: 'hashed',
          firstName: 'Pro',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Pro Co',
              siret: '22222222200002',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              subscriptionPlan: 'PRO', // 29€/mois, 10% commission
            },
          },
        },
      });

      const premiumArtisan = await prisma.user.create({
        data: {
          email: 'premium@test.com',
          password: 'hashed',
          firstName: 'Premium',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Premium Co',
              siret: '33333333300003',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              subscriptionPlan: 'PREMIUM', // 79€/mois, 8% commission
            },
          },
        },
      });

      // Vérifier les taux de commission
      const rates = await request(app.getHttpServer())
        .post('/admin/commission-rates/calculate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          artisanIds: [basicArtisan.id, proArtisan.id, premiumArtisan.id],
          amount: 1000.00,
        })
        .expect(200);

      const basicRate = rates.body.find(r => r.artisanId === basicArtisan.id);
      const proRate = rates.body.find(r => r.artisanId === proArtisan.id);
      const premiumRate = rates.body.find(r => r.artisanId === premiumArtisan.id);

      expect(parseFloat(basicRate.commissionRate)).toBe(12.0);
      expect(parseFloat(basicRate.commissionAmount)).toBe(120.00);

      expect(parseFloat(proRate.commissionRate)).toBe(10.0);
      expect(parseFloat(proRate.commissionAmount)).toBe(100.00);

      expect(parseFloat(premiumRate.commissionRate)).toBe(8.0);
      expect(parseFloat(premiumRate.commissionAmount)).toBe(80.00);
    });

    it('35.3 - Upgrade/downgrade abonnement', async () => {
      // Artisan Basic upgrade vers Pro
      const upgrade = await request(app.getHttpServer())
        .put('/artisans/subscriptions/upgrade')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          newPlan: 'PREMIUM',
          immediateUpgrade: true,
        })
        .expect(200);

      expect(upgrade.body.plan).toBe('PREMIUM');
      expect(parseFloat(upgrade.body.monthlyPrice)).toBe(79.00);
      expect(upgrade.body.status).toBe('ACTIVE');
      expect(upgrade.body.upgradedAt).toBeDefined();

      // Vérifier commission réduite à 8%
      const newRate = await request(app.getHttpServer())
        .get('/artisans/commission-rate')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(parseFloat(newRate.body.rate)).toBe(8.0);

      // Downgrade vers Pro
      const downgrade = await request(app.getHttpServer())
        .put('/artisans/subscriptions/downgrade')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          newPlan: 'PRO',
          effectiveDate: 'END_OF_BILLING_PERIOD', // Pas immédiat
        })
        .expect(200);

      expect(downgrade.body.scheduledPlan).toBe('PRO');
      expect(downgrade.body.currentPlan).toBe('PREMIUM'); // Toujours Premium jusqu'à fin période
      expect(downgrade.body.effectiveDate).toBeDefined();
    });

    it('35.4 - Annulation abonnement', async () => {
      // Annuler abonnement
      const cancellation = await request(app.getHttpServer())
        .delete('/artisans/subscriptions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          reason: 'TOO_EXPENSIVE',
          feedback: 'Prix trop élevé pour volume actuel',
          immediateCancel: false, // Fin de période de facturation
        })
        .expect(200);

      expect(cancellation.body.status).toBe('CANCELING');
      expect(cancellation.body.cancelAt).toBeDefined();
      expect(cancellation.body.currentPeriodEnd).toBeDefined();

      // Vérifier que l'abonnement reste actif jusqu'à la fin de période
      const subscription = await request(app.getHttpServer())
        .get('/artisans/subscriptions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(subscription.body.status).toBe('ACTIVE'); // Encore actif
      expect(subscription.body.willCancelAt).toBeDefined();

      // Vérifier retour au taux de base après annulation
      expect(parseFloat(subscription.body.futureCommissionRate)).toBe(12.0);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 23 (COMPLÉMENT): MARKETPLACE COMPLET
   * Tests complémentaires marketplace
   * =====================================================
   */
  describe('Scénario 23 (Complément): Marketplace Complet', () => {

    it('23.7 - Options livraison vs retrait (workflow complet)', async () => {
      // Créer produit
      const product = await prisma.product.create({
        data: {
          artisanId: artisanId,
          name: 'Robinet de qualité',
          description: 'Robinet premium',
          category: 'Plomberie',
          price: 89.99,
          vatRate: 20.00,
          stock: 10,
          status: 'ACTIVE',
          shippingOptions: ['HOME_DELIVERY', 'PICKUP'],
        },
      });

      // Commande avec livraison à domicile
      const homeDelivery = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{
            productId: product.id,
            quantity: 1,
            price: 89.99,
          }],
          deliveryMethod: 'HOME_DELIVERY',
          deliveryAddress: {
            street: '10 Rue de la Paix',
            city: 'Paris',
            postalCode: '75001',
            country: 'FR',
          },
        })
        .expect(201);

      expect(homeDelivery.body.deliveryMethod).toBe('HOME_DELIVERY');
      expect(parseFloat(homeDelivery.body.subtotal)).toBe(89.99);
      expect(parseFloat(homeDelivery.body.shippingCost)).toBeGreaterThan(0);
      expect(homeDelivery.body).toHaveProperty('estimatedDelivery');
      expect(homeDelivery.body).toHaveProperty('trackingNumber');

      // Commande avec retrait (gratuit)
      const pickup = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{
            productId: product.id,
            quantity: 1,
            price: 89.99,
          }],
          deliveryMethod: 'PICKUP',
          pickupLocation: artisanId,
        })
        .expect(201);

      expect(pickup.body.deliveryMethod).toBe('PICKUP');
      expect(parseFloat(pickup.body.shippingCost)).toBe(0.00);
      expect(pickup.body).toHaveProperty('pickupAddress');
      expect(pickup.body).toHaveProperty('pickupInstructions');
      expect(pickup.body.pickupReady).toBe(false); // Pas encore prêt
    });

    it('23.8 - Calcul frais de port selon distance et poids', async () => {
      // Calculer frais France métropolitaine (courte distance)
      const localShipping = await request(app.getHttpServer())
        .post('/marketplace/calculate-shipping')
        .send({
          from: {
            postalCode: '75001',
            city: 'Paris',
            country: 'FR',
          },
          to: {
            postalCode: '75002',
            city: 'Paris',
            country: 'FR',
          },
          weight: 2.5, // kg
          dimensions: {
            length: 30,
            width: 20,
            height: 15, // cm
          },
        })
        .expect(200);

      expect(parseFloat(localShipping.body.cost)).toBeLessThan(10.00);
      expect(localShipping.body.carrier).toBe('COLISSIMO');
      expect(localShipping.body.estimatedDays).toBe('1-2');

      // Calculer frais longue distance
      const longDistanceShipping = await request(app.getHttpServer())
        .post('/marketplace/calculate-shipping')
        .send({
          from: {
            postalCode: '75001',
            city: 'Paris',
            country: 'FR',
          },
          to: {
            postalCode: '13001',
            city: 'Marseille',
            country: 'FR',
          },
          weight: 2.5,
          dimensions: {
            length: 30,
            width: 20,
            height: 15,
          },
        })
        .expect(200);

      expect(parseFloat(longDistanceShipping.body.cost)).toBeGreaterThan(parseFloat(localShipping.body.cost));
      expect(longDistanceShipping.body.estimatedDays).toBe('2-3');

      // Livraison gratuite si montant > 100€
      const freeShipping = await request(app.getHttpServer())
        .post('/marketplace/calculate-shipping')
        .send({
          from: { postalCode: '75001', country: 'FR' },
          to: { postalCode: '69001', country: 'FR' },
          weight: 5.0,
          orderAmount: 150.00, // Au-dessus du seuil
        })
        .expect(200);

      expect(parseFloat(freeShipping.body.cost)).toBe(0.00);
      expect(freeShipping.body.reason).toBe('FREE_OVER_100');
    });

    it('23.9 - Tracking livraison en temps réel', async () => {
      // Créer commande avec livraison
      const order = await prisma.order.create({
        data: {
          userId: clientId,
          artisanId: artisanId,
          status: 'SHIPPED',
          total: 129.99,
          deliveryMethod: 'HOME_DELIVERY',
          trackingNumber: 'TRACK123456789',
          carrier: 'COLISSIMO',
        },
      });

      // Récupérer informations de tracking
      const tracking = await request(app.getHttpServer())
        .get(`/marketplace/orders/${order.id}/tracking`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(tracking.body).toHaveProperty('trackingNumber');
      expect(tracking.body.trackingNumber).toBe('TRACK123456789');
      expect(tracking.body).toHaveProperty('carrier');
      expect(tracking.body).toHaveProperty('status');
      expect(tracking.body).toHaveProperty('estimatedDelivery');
      expect(tracking.body).toHaveProperty('events');
      expect(Array.isArray(tracking.body.events)).toBe(true);

      // Vérifier qu'il y a des événements de suivi
      expect(tracking.body.events.length).toBeGreaterThan(0);
      const latestEvent = tracking.body.events[0];
      expect(latestEvent).toHaveProperty('timestamp');
      expect(latestEvent).toHaveProperty('status');
      expect(latestEvent).toHaveProperty('location');

      // Mise à jour tracking (webhook du transporteur)
      const updateTracking = await request(app.getHttpServer())
        .post(`/marketplace/webhook/tracking-update`)
        .send({
          trackingNumber: 'TRACK123456789',
          event: {
            status: 'OUT_FOR_DELIVERY',
            location: 'Centre de tri Paris',
            timestamp: new Date().toISOString(),
          },
        })
        .expect(200);

      expect(updateTracking.body.updated).toBe(true);
      expect(updateTracking.body.notificationSent).toBe(true); // Client notifié
    });
  });

  /**
   * Setup des utilisateurs de test
   */
  async function setupTestUsers() {
    // Admin
    const admin = await prisma.user.create({
      data: {
        email: 'admin@articonnect.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Admin',
        lastName: 'System',
        role: 'ADMIN',
        emailVerified: true,
      },
    });
    adminId = admin.id;

    // Client
    const client = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Jean',
        lastName: 'Dupont',
        role: 'CLIENT',
        emailVerified: true,
        clientProfile: { create: {} },
      },
    });
    clientId = client.id;

    // Artisan
    const artisan = await prisma.user.create({
      data: {
        email: 'artisan@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Pierre',
        lastName: 'Martin',
        role: 'ARTISAN',
        emailVerified: true,
        artisanProfile: {
          create: {
            companyName: 'Martin Plomberie',
            siret: '12345678900014',
            baseAddress: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
          },
        },
      },
    });
    artisanId = artisan.id;

    // Générer tokens (mock)
    adminToken = 'mock_admin_token';
    clientToken = 'mock_client_token';
    artisanToken = 'mock_artisan_token';
  }

  /**
   * Helper: Calculer distance entre 2 points GPS
   */
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance en mètres
  }
});
