/**
 * ArtiConnect - Tests E2E - Features Complémentaires (Phase 3)
 *
 * Scénarios 26-31: Tests complémentaires pour atteindre 95% de couverture
 *
 * Scénarios couverts:
 * - 26. Évaluations Avancées (5 tests)
 * - 27. Demandes & Matching Avancés (5 tests)
 * - 28. Négociation Avancée (4 tests)
 * - 29. Profils Avancés (5 tests)
 * - 30. Conformité & Légal (6 tests)
 * - 31. WebSocket & Temps Réel (5 tests)
 *
 * Total: 30 tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaService } from '../../src/shared/database/prisma.service';

describe('ArtiConnect - Tests Complémentaires E2E (Phase 3)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // IDs des utilisateurs de test
  let clientId: string;
  let artisanId: string;
  let adminId: string;

  // Tokens d'authentification
  let clientToken: string;
  let artisanToken: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [], // Import modules nécessaires
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup initial
    await cleanDatabase();
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  /**
   * =====================================================
   * SCÉNARIO 26: ÉVALUATIONS AVANCÉES
   * =====================================================
   */
  describe('Scénario 26: Évaluations Avancées', () => {
    it('26.1 - Badges qualité automatiques (Top Artisan, Fiable, Réactif)', async () => {
      // Créer artisan avec excellentes statistiques
      const topArtisan = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'top.artisan@test.com',
          password: 'Pass123!',
          role: 'ARTISAN',
          companyName: 'Plomberie Premium',
        })
        .expect(201);

      // Simuler 50 missions complétées avec note moyenne 4.8
      await request(app.getHttpServer())
        .post('/admin/simulate-stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          artisanId: topArtisan.body.id,
          completedMissions: 50,
          averageRating: 4.8,
          responseTimeMinutes: 15,
        })
        .expect(201);

      // Récupérer profil avec badges
      const profile = await request(app.getHttpServer())
        .get(`/artisans/${topArtisan.body.id}`)
        .expect(200);

      expect(profile.body.badges).toContain('TOP_ARTISAN'); // >50 missions + note >4.5
      expect(profile.body.badges).toContain('RELIABLE'); // Taux completion >95%
      expect(profile.body.badges).toContain('RESPONSIVE'); // Réponse <30min
    });

    it('26.2 - Impact sur visibilité dans recherches', async () => {
      // Recherche d'artisans plombiers
      const search = await request(app.getHttpServer())
        .get('/artisans/search')
        .query({
          category: 'PLUMBING',
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 10,
        })
        .expect(200);

      // Vérifier ordre: badges puis note puis proximité
      expect(search.body.results.length).toBeGreaterThan(0);

      const first = search.body.results[0];
      expect(first.badges).toBeDefined();
      expect(first.score).toBeGreaterThan(0); // Score composite

      // Premier résultat doit avoir meilleur score
      if (search.body.results.length > 1) {
        expect(first.score).toBeGreaterThanOrEqual(search.body.results[1].score);
      }
    });

    it('26.3 - Signalement avis inappropriés', async () => {
      // Créer avis
      const review = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: 'mission-123',
          rating: 1,
          comment: 'Commentaire offensant et inapproprié',
        })
        .expect(201);

      // Signaler l'avis
      const report = await request(app.getHttpServer())
        .post(`/reviews/${review.body.id}/report`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          reason: 'OFFENSIVE_LANGUAGE',
          details: 'Langage inapproprié et offensant',
        })
        .expect(201);

      expect(report.body.status).toBe('PENDING_REVIEW');
      expect(report.body.reportedBy).toBe(artisanId);

      // Admin modère le signalement
      const moderation = await request(app.getHttpServer())
        .put(`/reviews/reports/${report.body.id}/moderate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'REMOVE_REVIEW',
          reason: 'Contenu inapproprié confirmé',
        })
        .expect(200);

      expect(moderation.body.reviewRemoved).toBe(true);
    });

    it('26.4 - Détection faux avis (IA)', async () => {
      // Tenter de créer avis suspect (pattern détecté)
      const suspiciousReview = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: 'mission-456',
          rating: 5,
          comment: 'Excellent excellent excellent meilleur meilleur super super', // Répétitions suspectes
        })
        .expect(201);

      expect(suspiciousReview.body.flaggedForReview).toBe(true);
      expect(suspiciousReview.body.aiSuspicionScore).toBeGreaterThan(0.7);
      expect(suspiciousReview.body.status).toBe('PENDING_MODERATION');

      // Avis normal passe
      const normalReview = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: 'mission-789',
          rating: 4,
          comment: 'Travail bien fait, artisan professionnel et ponctuel.',
        })
        .expect(201);

      expect(normalReview.body.flaggedForReview).toBe(false);
      expect(normalReview.body.status).toBe('PUBLISHED');
    });

    it('26.5 - Vote utilité des avis', async () => {
      // Créer avis
      const review = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: 'mission-100',
          rating: 5,
          comment: 'Très bon travail, je recommande vivement.',
        })
        .expect(201);

      // Vote "utile"
      await request(app.getHttpServer())
        .post(`/reviews/${review.body.id}/vote`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ helpful: true })
        .expect(201);

      // Vote "pas utile"
      const otherClient = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otherclient@test.com',
          password: 'Pass123!',
          role: 'CLIENT',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/reviews/${review.body.id}/vote`)
        .set('Authorization', `Bearer ${otherClient.body.token}`)
        .send({ helpful: false })
        .expect(201);

      // Vérifier compteurs
      const updated = await request(app.getHttpServer())
        .get(`/reviews/${review.body.id}`)
        .expect(200);

      expect(updated.body.helpfulCount).toBe(1);
      expect(updated.body.notHelpfulCount).toBe(1);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 27: DEMANDES & MATCHING AVANCÉS
   * =====================================================
   */
  describe('Scénario 27: Demandes & Matching Avancés', () => {
    it('27.1 - Élargissement automatique rayon si pas de réponse', async () => {
      // Créer demande avec rayon initial 5km
      const request1 = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Fuite urgente',
          latitude: 48.8566,
          longitude: 2.3522,
          initialRadius: 5,
        })
        .expect(201);

      expect(request1.body.currentRadius).toBe(5);

      // Simuler expiration timeout sans réponse (après 2h)
      await request(app.getHttpServer())
        .post('/admin/simulate-timeout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          requestId: request1.body.id,
          hoursElapsed: 2,
        })
        .expect(200);

      // Vérifier élargissement automatique
      const updated = await request(app.getHttpServer())
        .get(`/requests/${request1.body.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(updated.body.currentRadius).toBe(10); // Doublé
      expect(updated.body.expansionCount).toBe(1);
    });

    it('27.2 - Ordre priorité (Favoris → Notés → Proches)', async () => {
      // Ajouter artisan aux favoris
      await request(app.getHttpServer())
        .post('/favorites')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ artisanId })
        .expect(201);

      // Créer demande
      const demande = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Réparation',
          latitude: 48.8566,
          longitude: 2.3522,
        })
        .expect(201);

      // Récupérer liste des artisans notifiés
      const notified = await request(app.getHttpServer())
        .get(`/requests/${demande.body.id}/notified-artisans`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      // Premier notifié doit être le favori
      expect(notified.body[0].id).toBe(artisanId);
      expect(notified.body[0].priorityReason).toBe('FAVORITE');
    });

    it('27.3 - Timeout demande (24h standard, 15min urgence)', async () => {
      // Demande standard
      const standard = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Réparation non urgente',
          urgent: false,
        })
        .expect(201);

      expect(standard.body.expiresAt).toBeDefined();
      const standardTimeout = new Date(standard.body.expiresAt).getTime() - new Date().getTime();
      expect(standardTimeout).toBeGreaterThan(23 * 60 * 60 * 1000); // ~24h

      // Demande urgence
      const urgent = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Fuite urgente',
          urgent: true,
        })
        .expect(201);

      const urgentTimeout = new Date(urgent.body.expiresAt).getTime() - new Date().getTime();
      expect(urgentTimeout).toBeLessThan(20 * 60 * 1000); // ~15min
    });

    it('27.4 - Upload photos/vidéos dans demande', async () => {
      // Créer demande avec médias
      const demande = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Fuite sous évier',
          mediaUrls: [
            's3://bucket/requests/photo1.jpg',
            's3://bucket/requests/video1.mp4',
          ],
        })
        .expect(201);

      expect(demande.body.media).toHaveLength(2);
      expect(demande.body.media[0].type).toBe('IMAGE');
      expect(demande.body.media[1].type).toBe('VIDEO');

      // Vérifier présignedURLs pour artisans
      const view = await request(app.getHttpServer())
        .get(`/requests/${demande.body.id}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(view.body.media[0].presignedUrl).toBeDefined();
      expect(view.body.media[0].presignedUrl).toContain('Expires=');
    });

    it('27.5 - Surcharge tarifaire urgence', async () => {
      // Demande standard
      const standard = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Réparation',
          urgent: false,
          estimatedPrice: 100.00,
        })
        .expect(201);

      expect(parseFloat(standard.body.finalPrice)).toBe(100.00);

      // Demande urgence (+30%)
      const urgent = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          category: 'PLUMBING',
          description: 'Fuite urgente',
          urgent: true,
          estimatedPrice: 100.00,
        })
        .expect(201);

      expect(parseFloat(urgent.body.urgencySurcharge)).toBe(30.00);
      expect(parseFloat(urgent.body.finalPrice)).toBe(130.00);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 28: NÉGOCIATION AVANCÉE
   * =====================================================
   */
  describe('Scénario 28: Négociation Avancée', () => {
    it('28.1 - Maximum 5 échanges de négociation', async () => {
      // Créer mission
      const mission = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          requestId: 'request-123',
          proposedPrice: 200.00,
        })
        .expect(201);

      // Négociations successives
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post(`/missions/${mission.body.id}/negotiate`)
          .set('Authorization', `Bearer ${clientToken}`)
          .send({
            counterOffer: 150.00 + i * 10,
          })
          .expect(201);

        if (i < 4) {
          await request(app.getHttpServer())
            .post(`/missions/${mission.body.id}/negotiate`)
            .set('Authorization', `Bearer ${artisanToken}`)
            .send({
              counterOffer: 200.00 - i * 10,
            })
            .expect(201);
        }
      }

      // 6ème tentative refusée
      const response = await request(app.getHttpServer())
        .post(`/missions/${mission.body.id}/negotiate`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          counterOffer: 180.00,
        })
        .expect(400);

      expect(response.body.error).toContain('maximum');
      expect(response.body.negotiationCount).toBe(5);
    });

    it('28.2 - Timeout automatique négociation', async () => {
      // Démarrer négociation
      const mission = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          requestId: 'request-456',
          proposedPrice: 300.00,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/missions/${mission.body.id}/negotiate`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          counterOffer: 250.00,
        })
        .expect(201);

      // Simuler timeout (24h sans réponse)
      await request(app.getHttpServer())
        .post('/admin/simulate-timeout')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          missionId: mission.body.id,
          hoursElapsed: 25,
        })
        .expect(200);

      // Vérifier statut
      const status = await request(app.getHttpServer())
        .get(`/missions/${mission.body.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(status.body.negotiationStatus).toBe('EXPIRED');
      expect(status.body.status).toBe('CANCELLED');
    });

    it('28.3 - Suggestion prix moyens (historique)', async () => {
      // Demander suggestion basée sur historique
      const suggestion = await request(app.getHttpServer())
        .get('/pricing/suggestion')
        .query({
          category: 'PLUMBING',
          serviceType: 'LEAK_REPAIR',
          postalCode: '75001',
        })
        .expect(200);

      expect(suggestion.body).toHaveProperty('averagePrice');
      expect(suggestion.body).toHaveProperty('minPrice');
      expect(suggestion.body).toHaveProperty('maxPrice');
      expect(suggestion.body).toHaveProperty('sampleSize'); // Nombre de missions similaires
      expect(parseFloat(suggestion.body.averagePrice)).toBeGreaterThan(0);
    });

    it('28.4 - Acompte 20-30% à la confirmation', async () => {
      // Accepter négociation finale
      const mission = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          requestId: 'request-789',
          proposedPrice: 500.00,
        })
        .expect(201);

      const accept = await request(app.getHttpServer())
        .post(`/missions/${mission.body.id}/accept`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          agreedPrice: 500.00,
        })
        .expect(201);

      expect(accept.body.status).toBe('CONFIRMED');
      expect(parseFloat(accept.body.depositAmount)).toBe(125.00); // 25%
      expect(parseFloat(accept.body.depositPercentage)).toBe(25);
      expect(accept.body.depositRequired).toBe(true);

      // Créer paiement acompte
      const deposit = await request(app.getHttpServer())
        .post(`/payments/${mission.body.id}/deposit`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          amount: 125.00,
          paymentMethodId: 'pm_mock_card',
        })
        .expect(201);

      expect(deposit.body.type).toBe('DEPOSIT');
      expect(parseFloat(deposit.body.amount)).toBe(125.00);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 29: PROFILS AVANCÉS
   * =====================================================
   */
  describe('Scénario 29: Profils Avancés', () => {
    it('29.1 - Portfolio photos artisan', async () => {
      // Ajouter photos au portfolio
      const photo1 = await request(app.getHttpServer())
        .post('/artisans/portfolio')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          imageUrl: 's3://bucket/portfolio/project1.jpg',
          title: 'Rénovation salle de bain',
          description: 'Projet complet',
          category: 'BATHROOM',
        })
        .expect(201);

      expect(photo1.body.imageUrl).toBeDefined();

      // Lister portfolio
      const portfolio = await request(app.getHttpServer())
        .get(`/artisans/${artisanId}/portfolio`)
        .expect(200);

      expect(portfolio.body.length).toBeGreaterThan(0);
      expect(portfolio.body[0]).toHaveProperty('presignedUrl');

      // Supprimer photo
      await request(app.getHttpServer())
        .delete(`/artisans/portfolio/${photo1.body.id}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);
    });

    it('29.2 - Toggle statut disponible/occupé', async () => {
      // Passer en mode occupé
      const setBusy = await request(app.getHttpServer())
        .put('/artisans/availability')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          available: false,
          reason: 'En mission jusqu\'à 18h',
        })
        .expect(200);

      expect(setBusy.body.available).toBe(false);

      // Vérifier qu'il n'apparaît plus dans recherches
      const search = await request(app.getHttpServer())
        .get('/artisans/search')
        .query({
          category: 'PLUMBING',
          onlyAvailable: true,
        })
        .expect(200);

      const found = search.body.results.find(a => a.id === artisanId);
      expect(found).toBeUndefined();

      // Repasser disponible
      await request(app.getHttpServer())
        .put('/artisans/availability')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ available: true })
        .expect(200);
    });

    it('29.3 - Historique demandes client', async () => {
      const history = await request(app.getHttpServer())
        .get('/clients/request-history')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(history.body).toHaveProperty('totalRequests');
      expect(history.body).toHaveProperty('completedMissions');
      expect(history.body).toHaveProperty('totalSpent');
      expect(history.body).toHaveProperty('requests');
      expect(history.body.requests).toBeInstanceOf(Array);

      if (history.body.requests.length > 0) {
        expect(history.body.requests[0]).toHaveProperty('category');
        expect(history.body.requests[0]).toHaveProperty('status');
        expect(history.body.requests[0]).toHaveProperty('createdAt');
      }
    });

    it('29.4 - Tableau de bord revenus artisan', async () => {
      const dashboard = await request(app.getHttpServer())
        .get('/artisans/revenue-dashboard')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(dashboard.body).toHaveProperty('totalRevenue');
      expect(dashboard.body).toHaveProperty('completedMissions');
      expect(dashboard.body).toHaveProperty('pendingPayments');
      expect(dashboard.body).toHaveProperty('averageMissionValue');
      expect(dashboard.body).toHaveProperty('revenueByCategory');
      expect(dashboard.body).toHaveProperty('chartData');
    });

    it('29.5 - Certifications avec dates d\'expiration', async () => {
      // Ajouter certification
      const cert = await request(app.getHttpServer())
        .post('/artisans/certifications')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'QualiPAC',
          issuer: 'Qualit\'EnR',
          issuedAt: '2024-01-01',
          expiresAt: '2027-01-01',
          documentUrl: 's3://bucket/certs/qualipac.pdf',
        })
        .expect(201);

      expect(cert.body.expiresAt).toBeDefined();

      // Récupérer certifications avec alertes expiration
      const certs = await request(app.getHttpServer())
        .get('/artisans/certifications')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(certs.body.active).toBeInstanceOf(Array);
      expect(certs.body.expiringSoon).toBeInstanceOf(Array);
      expect(certs.body.expired).toBeInstanceOf(Array);

      // Vérifier alerte si expiration < 3 mois
      const expiringSoon = certs.body.expiringSoon;
      if (expiringSoon.length > 0) {
        expect(expiringSoon[0].daysUntilExpiration).toBeLessThan(90);
      }
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 30: CONFORMITÉ & LÉGAL
   * =====================================================
   */
  describe('Scénario 30: Conformité & Légal', () => {
    it('30.1 - Acceptation CGU/CGV lors inscription', async () => {
      const user = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Pass123!',
          role: 'CLIENT',
          acceptedTerms: true,
          acceptedPrivacy: true,
          termsVersion: '2.0',
          privacyVersion: '1.5',
        })
        .expect(201);

      expect(user.body.legalConsents).toBeDefined();
      expect(user.body.legalConsents.termsAccepted).toBe(true);
      expect(user.body.legalConsents.privacyAccepted).toBe(true);
      expect(user.body.legalConsents.acceptedAt).toBeDefined();

      // Tenter inscription sans acceptation
      const rejected = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'another@test.com',
          password: 'Pass123!',
          role: 'CLIENT',
          acceptedTerms: false,
        })
        .expect(400);

      expect(rejected.body.error).toContain('CGU');
    });

    it('30.2 - Cookies consent banner', async () => {
      // Première visite: pas de consentement
      const firstVisit = await request(app.getHttpServer())
        .get('/legal/cookie-consent-status')
        .expect(200);

      expect(firstVisit.body.consentGiven).toBe(false);
      expect(firstVisit.body.showBanner).toBe(true);

      // Donner consentement
      const consent = await request(app.getHttpServer())
        .post('/legal/cookie-consent')
        .send({
          essential: true,
          analytics: true,
          marketing: false,
        })
        .expect(201);

      expect(consent.body.consentId).toBeDefined();
      expect(consent.body.preferences.analytics).toBe(true);
      expect(consent.body.preferences.marketing).toBe(false);
    });

    it('30.3 - Politique confidentialité', async () => {
      // Récupérer politique
      const policy = await request(app.getHttpServer())
        .get('/legal/privacy-policy')
        .expect(200);

      expect(policy.body.version).toBeDefined();
      expect(policy.body.content).toBeDefined();
      expect(policy.body.lastUpdated).toBeDefined();
      expect(policy.body.effectiveDate).toBeDefined();

      // Historique des versions
      const versions = await request(app.getHttpServer())
        .get('/legal/privacy-policy/versions')
        .expect(200);

      expect(versions.body).toBeInstanceOf(Array);
      expect(versions.body.length).toBeGreaterThan(0);
    });

    it('30.4 - Contrats artisans (signature électronique)', async () => {
      // Générer contrat
      const contract = await request(app.getHttpServer())
        .post('/legal/contracts/generate')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          type: 'ARTISAN_AGREEMENT',
          commissionRate: 12,
        })
        .expect(201);

      expect(contract.body.contractId).toBeDefined();
      expect(contract.body.status).toBe('PENDING_SIGNATURE');
      expect(contract.body.pdfUrl).toBeDefined();

      // Signer électroniquement
      const signature = await request(app.getHttpServer())
        .post(`/legal/contracts/${contract.body.contractId}/sign`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          signatureData: 'base64-encoded-signature',
          ipAddress: '192.168.1.1',
        })
        .expect(201);

      expect(signature.body.status).toBe('SIGNED');
      expect(signature.body.signedAt).toBeDefined();
      expect(signature.body.signedBy).toBe(artisanId);
    });

    it('30.5 - Purge automatique données (après X mois)', async () => {
      // Configurer politique de rétention
      const policy = await request(app.getHttpServer())
        .get('/admin/data-retention-policy')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(policy.body.inactiveUserPurgeDays).toBeDefined();
      expect(policy.body.deletedAccountPurgeDays).toBeDefined();

      // Simuler purge
      const purgePreview = await request(app.getHttpServer())
        .post('/admin/data-retention/preview-purge')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(purgePreview.body).toHaveProperty('usersToDelete');
      expect(purgePreview.body).toHaveProperty('recordsToAnonymize');
      expect(purgePreview.body).toHaveProperty('estimatedStorageFreed');
    });

    it('30.6 - Archivage factures 10 ans', async () => {
      // Créer facture
      const invoice = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          clientId,
          amount: 500.00,
          description: 'Mission complétée',
        })
        .expect(201);

      expect(invoice.body.archiveUntil).toBeDefined();

      // Vérifier période d'archivage (10 ans)
      const archiveDate = new Date(invoice.body.archiveUntil);
      const creationDate = new Date(invoice.body.createdAt);
      const yearsDiff = (archiveDate.getTime() - creationDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      expect(yearsDiff).toBeGreaterThanOrEqual(9.9);
      expect(yearsDiff).toBeLessThanOrEqual(10.1);

      // Vérifier que facture ne peut être supprimée
      const deleteAttempt = await request(app.getHttpServer())
        .delete(`/invoices/${invoice.body.id}`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(403);

      expect(deleteAttempt.body.error).toContain('obligation légale');
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 31: WEBSOCKET & TEMPS RÉEL
   * =====================================================
   */
  describe('Scénario 31: WebSocket & Temps Réel', () => {
    it('31.1 - Connexion WebSocket client', async () => {
      // Simuler connexion WS (mock)
      const wsConnect = await request(app.getHttpServer())
        .post('/ws/connect')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          clientType: 'WEB',
          deviceId: 'device-123',
        })
        .expect(201);

      expect(wsConnect.body.connectionId).toBeDefined();
      expect(wsConnect.body.status).toBe('CONNECTED');
      expect(wsConnect.body.supportedEvents).toBeInstanceOf(Array);
      expect(wsConnect.body.supportedEvents).toContain('MESSAGE_RECEIVED');
      expect(wsConnect.body.supportedEvents).toContain('MISSION_UPDATE');
    });

    it('31.2 - Notifications push temps réel', async () => {
      // Enregistrer device pour push
      const device = await request(app.getHttpServer())
        .post('/push/register-device')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          token: 'fcm-token-123',
          platform: 'IOS',
        })
        .expect(201);

      expect(device.body.deviceId).toBeDefined();

      // Envoyer notification push
      const push = await request(app.getHttpServer())
        .post('/push/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: clientId,
          title: 'Nouvelle mission',
          body: 'Un artisan a accepté votre demande',
          data: { missionId: 'mission-123' },
        })
        .expect(201);

      expect(push.body.sent).toBe(true);
      expect(push.body.devicesSent).toBe(1);
    });

    it('31.3 - Update position artisan en temps réel', async () => {
      // Mettre à jour position
      const update = await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8566,
          longitude: 2.3522,
          accuracy: 10,
          missionId: 'mission-active',
        })
        .expect(200);

      expect(update.body.updated).toBe(true);

      // Vérifier événement WS émis
      const wsEvents = await request(app.getHttpServer())
        .get('/ws/recent-events')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      const locationEvent = wsEvents.body.find(e => e.type === 'ARTISAN_LOCATION_UPDATE');
      expect(locationEvent).toBeDefined();
      expect(locationEvent.data.artisanId).toBe(artisanId);
    });

    it('31.4 - Chat temps réel (événements)', async () => {
      // Envoyer message
      const message = await request(app.getHttpServer())
        .post('/chat/messages')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          conversationId: 'conv-123',
          content: 'Bonjour',
        })
        .expect(201);

      expect(message.body.id).toBeDefined();

      // Vérifier événements WS générés
      const events = await request(app.getHttpServer())
        .get('/ws/recent-events')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({ conversationId: 'conv-123' })
        .expect(200);

      const messageEvent = events.body.find(e => e.type === 'MESSAGE_RECEIVED');
      expect(messageEvent).toBeDefined();
      expect(messageEvent.data.messageId).toBe(message.body.id);

      // Simuler typing indicator
      const typing = await request(app.getHttpServer())
        .post('/chat/typing')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          conversationId: 'conv-123',
          isTyping: true,
        })
        .expect(200);

      expect(typing.body.eventSent).toBe(true);
    });

    it('31.5 - Déconnexion propre', async () => {
      // Déconnexion WS
      const disconnect = await request(app.getHttpServer())
        .post('/ws/disconnect')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          connectionId: 'conn-123',
        })
        .expect(200);

      expect(disconnect.body.status).toBe('DISCONNECTED');
      expect(disconnect.body.cleanupDone).toBe(true);

      // Vérifier que les événements ne sont plus envoyés
      const status = await request(app.getHttpServer())
        .get('/ws/connection-status')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(status.body.connected).toBe(false);
    });
  });

  /**
   * Setup des utilisateurs de test
   */
  async function setupTestUsers() {
    // Client
    const client = await prisma.user.create({
      data: {
        email: 'client@test.com',
        password: '$2b$10$hashedpassword',
        firstName: 'Client',
        lastName: 'Test',
        role: 'CLIENT',
        emailVerified: true,
        clientProfile: {
          create: {},
        },
      },
    });
    clientId = client.id;

    // Artisan
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
            companyName: 'Plomberie Test',
            siret: '12345678901234',
            baseAddress: 'Paris',
            latitude: 48.8566,
            longitude: 2.3522,
          },
        },
      },
    });
    artisanId = artisan.id;

    // Admin
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

    // Générer tokens (normalement via /auth/login)
    clientToken = 'mock-client-token';
    artisanToken = 'mock-artisan-token';
    adminToken = 'mock-admin-token';
  }

  /**
   * Nettoyage de la base de données
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
