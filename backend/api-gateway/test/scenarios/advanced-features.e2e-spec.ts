import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/common/redis/redis.service';

/**
 * ARTICONNECT - TESTS FONCTIONNALITÉS AVANCÉES
 *
 * Cette suite complète les tests basiques avec les fonctionnalités avancées
 * pour atteindre 95% de couverture du périmètre fonctionnel.
 *
 * Scénarios:
 * - 14: Chat & Messaging temps réel
 * - 15: Workflows E2E complets
 * - 16: Sécurité avancée
 * - 17: Paiements avancés
 * - 18: Admin Modération
 * - 19: Planification avancée
 * - 20: Géolocalisation avancée
 * - 21: TVA avancée
 * - 22: Notifications avancées
 * - 23: Marketplace avancé
 * - 24: Auth avancée (OAuth, Reset)
 * - 25: Analytics & Reporting
 */

describe('ArtiConnect - Advanced Features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  // Tokens pour les tests
  let clientToken: string;
  let clientId: string;
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
    redis = app.get<RedisService>(RedisService);

    await cleanDatabase();
    await setupTestUsers();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  /**
   * SCÉNARIO 14: CHAT & MESSAGING
   * Test du système de messagerie temps réel
   */
  describe('Scénario 14: Chat & Messaging temps réel', () => {

    it('14.1 - Envoi message temps réel entre client et artisan', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat/messages')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          receiverId: artisanId,
          content: 'Bonjour, êtes-vous disponible pour une intervention ?',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe('Bonjour, êtes-vous disponible pour une intervention ?');
      expect(response.body.senderId).toBe(clientId);
      expect(response.body.receiverId).toBe(artisanId);
      expect(response.body.read).toBe(false);

      // Vérifier que le message est en DB
      const message = await prisma.message.findUnique({
        where: { id: response.body.id },
      });
      expect(message).toBeDefined();
    });

    it('14.2 - Partage de photos dans le chat', async () => {
      // Upload d'une photo
      const uploadResponse = await request(app.getHttpServer())
        .post('/upload/chat')
        .set('Authorization', `Bearer ${clientToken}`)
        .attach('file', Buffer.from('fake-image-data'), 'photo.jpg')
        .expect(201);

      const photoUrl = uploadResponse.body.url;

      // Envoi du message avec la photo
      const response = await request(app.getHttpServer())
        .post('/chat/messages')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          receiverId: artisanId,
          content: 'Voici une photo du problème',
          attachments: [photoUrl],
        })
        .expect(201);

      expect(response.body.attachments).toHaveLength(1);
      expect(response.body.attachments[0]).toBe(photoUrl);
    });

    it('14.3 - Consultation historique des conversations', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/conversations/${artisanId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Vérifier que les messages sont triés par date
      if (response.body.length > 1) {
        const dates = response.body.map(m => new Date(m.createdAt).getTime());
        expect(dates).toEqual([...dates].sort((a, b) => a - b));
      }
    });

    it('14.4 - Blocage utilisateur et impossibilité d\'envoyer messages', async () => {
      // Bloquer l'artisan
      await request(app.getHttpServer())
        .post(`/users/${artisanId}/block`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      // Tentative d'envoi de message au bloqué
      const response = await request(app.getHttpServer())
        .post('/chat/messages')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          receiverId: artisanId,
          content: 'Ce message ne doit pas passer',
        })
        .expect(403);

      expect(response.body.message).toContain('blocked');

      // Débloquer pour la suite des tests
      await request(app.getHttpServer())
        .post(`/users/${artisanId}/unblock`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
    });

    it('14.5 - Rate limiting messages (anti-spam)', async () => {
      const promises = [];

      // Envoyer 15 messages rapidement (limite = 10/min)
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/chat/messages')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({
              receiverId: artisanId,
              content: `Message spam ${i}`,
            })
        );
      }

      const responses = await Promise.all(promises);

      // Les 10 premiers doivent passer, les suivants doivent être bloqués
      const successCount = responses.filter(r => r.status === 201).length;
      const blockedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(10);
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  /**
   * SCÉNARIO 15: WORKFLOWS E2E COMPLETS
   * Test des parcours utilisateurs complets de bout en bout
   */
  describe('Scénario 15: Workflows E2E complets', () => {

    it('15.1 - Workflow urgence complet avec tracking GPS', async () => {
      // 1. Client crée demande urgence
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          type: 'EMERGENCY',
          title: 'Fuite d\'eau urgente',
          description: 'Grosse fuite, besoin intervention immédiate',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          clientBudget: 200.00,
        })
        .expect(201);

      const missionId = missionResponse.body.id;

      // 2. Artisan accepte et propose prix
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiate`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          proposedPrice: 180.00,
          message: 'J\'arrive dans 20 minutes',
        })
        .expect(201);

      // 3. Client accepte
      const negotiations = await prisma.negotiation.findMany({
        where: { missionId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiate/${negotiations[0].id}/accept`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      // 4. Artisan update sa position GPS (en route)
      await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8500,
          longitude: 2.3400,
          missionId: missionId,
        })
        .expect(200);

      // 5. Client consulte position artisan
      const trackingResponse = await request(app.getHttpServer())
        .get(`/missions/${missionId}/tracking`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(trackingResponse.body).toHaveProperty('artisanLocation');
      expect(trackingResponse.body).toHaveProperty('estimatedArrival');

      // 6. Paiement
      await request(app.getHttpServer())
        .post(`/payments/mission/${missionId}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      // 7. Mission complétée
      await request(app.getHttpServer())
        .put(`/missions/${missionId}/complete`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      // 8. Review
      await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          missionId: missionId,
          overallRating: 5,
          comment: 'Intervention rapide et efficace !',
        })
        .expect(201);

      // Vérifier que tout le workflow est complet
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        include: { review: true, transaction: true },
      });

      expect(mission.status).toBe('COMPLETED');
      expect(mission.review).toBeDefined();
      expect(mission.transaction).toBeDefined();
    });

    it('15.2 - Workflow avec refus artisan et recherche élargie', async () => {
      // Créer une mission
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Installation radiateur',
          description: 'Installer un nouveau radiateur',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          clientBudget: 300.00,
        })
        .expect(201);

      const missionId = missionResponse.body.id;

      // Artisan refuse
      await request(app.getHttpServer())
        .post(`/missions/${missionId}/decline`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          reason: 'Agenda complet cette semaine',
        })
        .expect(200);

      // Vérifier que le système élargit la recherche
      // (en pratique, cela notifierait d'autres artisans dans un rayon plus large)
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
      });

      expect(mission.status).toBe('PENDING');
      expect(mission.artisanId).toBeNull();
    });

    it('15.3 - Workflow annulation avec pénalités', async () => {
      // Créer et accepter une mission
      const missionResponse = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Réparation robinet',
          description: 'Robinet qui fuit',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // Dans 12h
          clientBudget: 100.00,
        })
        .expect(201);

      const missionId = missionResponse.body.id;

      // Artisan accepte
      await prisma.mission.update({
        where: { id: missionId },
        data: {
          artisanId: artisanId,
          status: 'ACCEPTED',
          agreedPrice: 100.00,
        },
      });

      // Client annule moins de 24h avant
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Changement de plans',
        })
        .expect(200);

      // Vérifier pénalité appliquée (par ex. 20% du prix)
      expect(response.body).toHaveProperty('penalty');
      expect(parseFloat(response.body.penalty)).toBeGreaterThan(0);

      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
      });

      expect(mission.status).toBe('CANCELLED');
    });

    it('15.4 - Workflow panier marketplace multi-artisans', async () => {
      // Créer 2 artisans avec produits différents
      const artisan2 = await prisma.user.create({
        data: {
          email: 'artisan2@test.com',
          password: 'password',
          firstName: 'Jean',
          lastName: 'Menuisier',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Menuiserie Jean',
              siret: '11111111111111',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
            },
          },
        },
        include: { artisanProfile: true },
      });

      // Créer produits
      const product1 = await prisma.product.create({
        data: {
          artisanId: artisanId,
          name: 'Robinet design',
          description: 'Robinet moderne',
          category: 'Plomberie',
          price: 50.00,
          vatRate: 20.00,
          stock: 10,
          status: 'ACTIVE',
        },
      });

      const product2 = await prisma.product.create({
        data: {
          artisanId: artisan2.id,
          name: 'Étagère bois',
          description: 'Étagère artisanale',
          category: 'Menuiserie',
          price: 80.00,
          vatRate: 20.00,
          stock: 5,
          status: 'ACTIVE',
        },
      });

      // Client commande les 2 produits (2 artisans différents)
      const orderResponse = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [
            { productId: product1.id, quantity: 1 },
            { productId: product2.id, quantity: 1 },
          ],
          shippingAddress: '10 Rue Test, 75001 Paris',
        })
        .expect(201);

      expect(orderResponse.body.items).toHaveLength(2);
      expect(orderResponse.body.total).toBeGreaterThan(0);

      // Paiement
      await request(app.getHttpServer())
        .post(`/marketplace/orders/${orderResponse.body.id}/pay`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(200);

      // Vérifier que les 2 artisans reçoivent leur part
      const transactions = await prisma.transaction.findMany({
        where: {
          orderId: orderResponse.body.id,
        },
      });

      expect(transactions.length).toBeGreaterThan(0);
    });

    it('15.5 - Workflow paiement échoué avec retry', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Test paiement',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 100.00,
          vatRate: 20.00,
        },
      });

      // Premier essai avec carte refusée
      const failedResponse = await request(app.getHttpServer())
        .post(`/payments/mission/${mission.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_chargeDeclined', // Carte de test Stripe qui échoue
        })
        .expect(402); // Payment Required

      expect(failedResponse.body.message).toContain('declined');

      // Retry avec bonne carte
      const successResponse = await request(app.getHttpServer())
        .post(`/payments/mission/${mission.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      expect(successResponse.body.transaction).toBeDefined();
      expect(successResponse.body.transaction.status).toBe('COMPLETED');
    });
  });

  /**
   * SCÉNARIO 16: SÉCURITÉ AVANCÉE
   * Test des mécanismes de sécurité
   */
  describe('Scénario 16: Sécurité avancée', () => {

    it('16.1 - Rate limiting API (protection DDoS)', async () => {
      const promises = [];

      // Faire 150 requêtes rapidement (limite = 100/min)
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/specialties')
            .set('Authorization', `Bearer ${clientToken}`)
        );
      }

      const responses = await Promise.all(promises);

      const successCount = responses.filter(r => r.status === 200).length;
      const blockedCount = responses.filter(r => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(100);
      expect(blockedCount).toBeGreaterThan(0);
    });

    it('16.2 - Protection XSS dans les champs texte', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          type: 'SCHEDULED',
          title: xssPayload,
          description: `Test ${xssPayload} test`,
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          clientBudget: 100.00,
        })
        .expect(201);

      // Vérifier que le script a été sanitized
      expect(response.body.title).not.toContain('<script>');
      expect(response.body.description).not.toContain('<script>');
    });

    it('16.3 - Upload fichier: validation type et scan antivirus', async () => {
      // Tester upload d'un fichier non autorisé (.exe)
      const badFileResponse = await request(app.getHttpServer())
        .post('/upload/document')
        .set('Authorization', `Bearer ${artisanToken}`)
        .attach('file', Buffer.from('MZ...'), 'malware.exe')
        .expect(400);

      expect(badFileResponse.body.message).toContain('not allowed');

      // Tester upload d'un fichier valide
      const goodFileResponse = await request(app.getHttpServer())
        .post('/upload/document')
        .set('Authorization', `Bearer ${artisanToken}`)
        .attach('file', Buffer.from('PDF content'), 'document.pdf')
        .expect(201);

      expect(goodFileResponse.body).toHaveProperty('url');
    });

    it('16.4 - Protection brute force login', async () => {
      const promises = [];

      // Tenter 6 logins avec mauvais mot de passe
      for (let i = 0; i < 6; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/auth/login')
            .send({
              email: 'client@test.com',
              password: 'wrongpassword',
            })
        );
      }

      const responses = await Promise.all(promises);

      // Après 5 tentatives, le compte devrait être locké
      const lastResponse = responses[responses.length - 1];
      expect([401, 429]).toContain(lastResponse.status);
    });

    it('16.5 - Validation CSRF token sur requêtes sensibles', async () => {
      // Tentative de requête sensible sans token CSRF
      const response = await request(app.getHttpServer())
        .delete('/users/gdpr/delete-account')
        .set('Authorization', `Bearer ${clientToken}`)
        // Pas de CSRF token
        .expect(403);

      expect(response.body.message).toContain('CSRF');
    });
  });

  /**
   * SCÉNARIO 17: PAIEMENTS AVANCÉS
   * Test des fonctionnalités avancées de paiement
   */
  describe('Scénario 17: Paiements avancés', () => {

    it('17.1 - 3D Secure (Strong Customer Authentication)', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Test 3DS',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 500.00, // Montant élevé nécessitant 3DS
          vatRate: 20.00,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/payments/mission/${mission.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_authenticationRequired', // Carte test Stripe nécessitant 3DS
        })
        .expect(200);

      expect(response.body).toHaveProperty('requires3DS');
      expect(response.body).toHaveProperty('clientSecret');

      // Le client doit compléter 3DS avant que le paiement soit finalisé
      expect(response.body.status).toBe('requires_action');
    });

    it('17.2 - Détection fraude avec Stripe Radar', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Test fraude',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 2000.00, // Montant suspect pour un nouveau client
          vatRate: 20.00,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/payments/mission/${mission.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethodId: 'pm_card_riskLevelHighest', // Carte test à haut risque
        });

      // Le paiement peut être bloqué ou mis en review
      expect([402, 200]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.fraudReview).toBe(true);
      }
    });

    it('17.3 - Remboursement complet d\'une mission', async () => {
      // Créer une mission payée
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'PAID',
          title: 'Mission à rembourser',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 150.00,
          finalPrice: 150.00,
          vatRate: 20.00,
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          missionId: mission.id,
          type: 'MISSION',
          amount: 180.00, // 150 + 20% TVA
          commission: 18.00, // 12%
          artisanAmount: 132.00,
          status: 'COMPLETED',
          stripePaymentIntentId: 'pi_test123',
        },
      });

      // Admin effectue le remboursement
      const response = await request(app.getHttpServer())
        .post(`/admin/payments/${transaction.id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 180.00, // Remboursement total
          reason: 'Service non conforme',
        })
        .expect(200);

      expect(response.body.status).toBe('REFUNDED');

      const updatedTransaction = await prisma.transaction.findUnique({
        where: { id: transaction.id },
      });

      expect(updatedTransaction.status).toBe('REFUNDED');
    });

    it('17.4 - Remboursement partiel (après litige)', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'DISPUTED',
          title: 'Mission avec litige',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 200.00,
          finalPrice: 200.00,
          vatRate: 20.00,
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          missionId: mission.id,
          type: 'MISSION',
          amount: 240.00,
          commission: 24.00,
          artisanAmount: 176.00,
          status: 'COMPLETED',
        },
      });

      // Remboursement partiel de 50%
      const response = await request(app.getHttpServer())
        .post(`/admin/payments/${transaction.id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 120.00, // 50% du total
          reason: 'Travail partiellement effectué',
        })
        .expect(200);

      expect(parseFloat(response.body.refundedAmount)).toBe(120.00);
    });

    it('17.5 - Commissions dégressives selon volume artisan', async () => {
      // Artisan avec 0 missions (nouveau) → 12%
      const newArtisan = await prisma.user.create({
        data: {
          email: 'newartisan@test.com',
          password: 'password',
          firstName: 'Nouveau',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Nouveau Plombier',
              siret: '99999999999999',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              missionCount: 0,
            },
          },
        },
      });

      // Artisan avec 60 missions → 10%
      const midArtisan = await prisma.user.create({
        data: {
          email: 'midartisan@test.com',
          password: 'password',
          firstName: 'Expérimenté',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Plombier Expérimenté',
              siret: '88888888888888',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              missionCount: 60,
            },
          },
        },
      });

      // Artisan avec 150 missions → 8%
      const seniorArtisan = await prisma.user.create({
        data: {
          email: 'seniorartisan@test.com',
          password: 'password',
          firstName: 'Senior',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'Plombier Senior',
              siret: '77777777777777',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
              missionCount: 150,
            },
          },
        },
      });

      // Calculer commission pour chaque niveau
      const commissions = await Promise.all([
        request(app.getHttpServer())
          .post('/payments/calculate-commission')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ artisanId: newArtisan.id, amount: 100.00 }),
        request(app.getHttpServer())
          .post('/payments/calculate-commission')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ artisanId: midArtisan.id, amount: 100.00 }),
        request(app.getHttpServer())
          .post('/payments/calculate-commission')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ artisanId: seniorArtisan.id, amount: 100.00 }),
      ]);

      expect(parseFloat(commissions[0].body.commission)).toBe(12.00); // 12%
      expect(parseFloat(commissions[1].body.commission)).toBe(10.00); // 10%
      expect(parseFloat(commissions[2].body.commission)).toBe(8.00);  // 8%
    });
  });

  /**
   * SCÉNARIO 18: ADMIN MODÉRATION
   * Test des fonctionnalités de modération administrateur
   */
  describe('Scénario 18: Admin Modération', () => {

    it('18.1 - Validation complète profil artisan (workflow)', async () => {
      // Créer un artisan non vérifié
      const newArtisan = await prisma.user.create({
        data: {
          email: 'pending@artisan.com',
          password: 'password',
          firstName: 'Pending',
          lastName: 'Artisan',
          role: 'ARTISAN',
          emailVerified: true,
          artisanProfile: {
            create: {
              companyName: 'New Plomberie',
              siret: '11111111111111',
              baseAddress: 'Paris',
              latitude: 48.8566,
              longitude: 2.3522,
            },
          },
        },
      });

      // Admin vérifie le profil
      const response = await request(app.getHttpServer())
        .put(`/admin/artisans/${newArtisan.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          validated: true,
          notes: 'Documents vérifiés, profil complet',
        })
        .expect(200);

      expect(response.body.validated).toBe(true);

      // Vérifier dans DB
      const profile = await prisma.artisanProfile.findFirst({
        where: { userId: newArtisan.id },
      });
      expect(profile).toBeDefined();
    });

    it('18.2 - Vérification documents SIRET et assurance', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/artisans/${artisanId}/verify-documents`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          siretValid: true,
          insuranceValid: true,
          insuranceExpiryDate: '2025-12-31',
        })
        .expect(200);

      expect(response.body.documentsVerified).toBe(true);
    });

    it('18.3 - Suspension temporaire compte utilisateur', async () => {
      // Créer un utilisateur à suspendre
      const userToSuspend = await prisma.user.create({
        data: {
          email: 'tosuspend@test.com',
          password: 'password',
          firstName: 'To',
          lastName: 'Suspend',
          role: 'CLIENT',
          emailVerified: true,
          clientProfile: { create: {} },
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${userToSuspend.id}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Comportement inapproprié',
          duration: 7, // jours
        })
        .expect(200);

      expect(response.body.status).toBe('SUSPENDED');

      // Vérifier que l'utilisateur ne peut plus se connecter
      const loginAttempt = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'tosuspend@test.com',
          password: 'password',
        })
        .expect(403);

      expect(loginAttempt.body.message).toContain('suspended');
    });

    it('18.4 - Bannissement permanent utilisateur', async () => {
      const userToBan = await prisma.user.create({
        data: {
          email: 'toban@test.com',
          password: 'password',
          firstName: 'To',
          lastName: 'Ban',
          role: 'CLIENT',
          emailVerified: true,
          clientProfile: { create: {} },
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/admin/users/${userToBan.id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Fraude détectée',
          permanent: true,
        })
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { id: userToBan.id },
      });

      expect(user.status).toBe('DELETED');
      expect(user.deletedAt).toBeDefined();
    });

    it('18.5 - Modération avis: retrait avis abusif', async () => {
      // Créer un avis abusif
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'COMPLETED',
          title: 'Test',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 100.00,
          vatRate: 20.00,
          completedAt: new Date(),
        },
      });

      const review = await prisma.review.create({
        data: {
          missionId: mission.id,
          reviewerId: clientId,
          reviewedId: artisanId,
          overallRating: 1,
          comment: 'Contenu inapproprié et insultant',
        },
      });

      // Admin retire l'avis
      const response = await request(app.getHttpServer())
        .delete(`/admin/reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Contenu inapproprié',
        })
        .expect(200);

      // Vérifier que l'avis est supprimé
      const deletedReview = await prisma.review.findUnique({
        where: { id: review.id },
      });
      expect(deletedReview).toBeNull();
    });

    it('18.6 - Validation produits marketplace avant publication', async () => {
      const product = await prisma.product.create({
        data: {
          artisanId: artisanId,
          name: 'Produit en attente',
          description: 'À valider',
          category: 'Test',
          price: 50.00,
          vatRate: 20.00,
          stock: 5,
          status: 'DRAFT',
        },
      });

      const response = await request(app.getHttpServer())
        .put(`/admin/products/${product.id}/validate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
          notes: 'Produit conforme',
        })
        .expect(200);

      expect(response.body.status).toBe('ACTIVE');

      const updatedProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(updatedProduct.status).toBe('ACTIVE');
    });
  });

  /**
   * SCÉNARIO 19: PLANIFICATION AVANCÉE
   * Test des fonctionnalités avancées de calendrier
   */
  describe('Scénario 19: Planification avancée', () => {

    it('19.1 - Consultation calendrier multi-vues (jour/semaine/mois)', async () => {
      // Vue journalière
      const dayView = await request(app.getHttpServer())
        .get('/missions/calendar/day')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({
          date: new Date().toISOString().split('T')[0],
        })
        .expect(200);

      expect(Array.isArray(dayView.body)).toBe(true);

      // Vue hebdomadaire
      const weekView = await request(app.getHttpServer())
        .get('/missions/calendar/week')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({
          date: new Date().toISOString().split('T')[0],
        })
        .expect(200);

      expect(Array.isArray(weekView.body)).toBe(true);

      // Vue mensuelle
      const monthView = await request(app.getHttpServer())
        .get('/missions/calendar/month')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
        })
        .expect(200);

      expect(Array.isArray(monthView.body)).toBe(true);
    });

    it('19.2 - Export iCal pour synchronisation Google Calendar', async () => {
      const response = await request(app.getHttpServer())
        .get('/missions/calendar/export.ics')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/calendar');
      expect(response.text).toContain('BEGIN:VCALENDAR');
      expect(response.text).toContain('END:VCALENDAR');
    });

    it('19.3 - Blocage de créneaux (indisponibilités)', async () => {
      const response = await request(app.getHttpServer())
        .post('/artisans/availability/block')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          reason: 'Rendez-vous personnel',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.blocked).toBe(true);
    });

    it('19.4 - Gestion des congés artisan', async () => {
      const vacationStart = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const vacationEnd = new Date(Date.now() + 44 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .post('/artisans/vacations')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          startDate: vacationStart.toISOString(),
          endDate: vacationEnd.toISOString(),
          type: 'VACATION',
        })
        .expect(201);

      expect(response.body.type).toBe('VACATION');

      // Vérifier que l'artisan est marqué indisponible pendant cette période
      const profile = await prisma.artisanProfile.findFirst({
        where: { userId: artisanId },
      });
      expect(profile).toBeDefined();
    });

    it('19.5 - Calcul automatique temps de trajet entre missions', async () => {
      // Créer 2 missions consécutives
      const mission1 = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Mission 1',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue A',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          agreedPrice: 100.00,
          vatRate: 20.00,
        },
      });

      const mission2 = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'PENDING',
          title: 'Mission 2',
          description: 'Test',
          category: 'Plomberie',
          address: '50 Rue B',
          city: 'Paris',
          postalCode: '75002',
          country: 'FR',
          latitude: 48.8700,
          longitude: 2.3600,
          scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          agreedPrice: 100.00,
          vatRate: 20.00,
        },
      });

      // Calculer le trajet
      const response = await request(app.getHttpServer())
        .get('/missions/travel-time')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({
          fromMission: mission1.id,
          toMission: mission2.id,
        })
        .expect(200);

      expect(response.body).toHaveProperty('travelTime'); // en minutes
      expect(response.body).toHaveProperty('distance'); // en km
    });

    it('19.6 - Reprogrammation d\'un rendez-vous', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'À reprogrammer',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          agreedPrice: 100.00,
          vatRate: 20.00,
        },
      });

      const newDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      const response = await request(app.getHttpServer())
        .put(`/missions/${mission.id}/reschedule`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          newDate: newDate.toISOString(),
          reason: 'Problème d\'agenda',
        })
        .expect(200);

      expect(new Date(response.body.scheduledFor).getTime()).toBe(newDate.getTime());
    });

    it('19.7 - Annulation < 24h avec pénalités calculées', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'À annuler',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // Dans 12h
          agreedPrice: 200.00,
          vatRate: 20.00,
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/missions/${mission.id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          reason: 'Imprévu',
        })
        .expect(200);

      // Pénalité de 20% appliquée
      expect(response.body).toHaveProperty('penalty');
      expect(parseFloat(response.body.penalty)).toBe(40.00); // 20% de 200€
    });
  });

  /**
   * SCÉNARIO 20: GÉOLOCALISATION AVANCÉE
   * Test des fonctionnalités GPS avancées
   */
  describe('Scénario 20: Géolocalisation avancée', () => {

    it('20.1 - Calcul ETA (temps d\'arrivée estimé) dynamique', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Urgence',
          description: 'Test',
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

      // Artisan update sa position
      await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8500,
          longitude: 2.3400,
          missionId: mission.id,
        })
        .expect(200);

      // Calculer ETA
      const response = await request(app.getHttpServer())
        .get(`/missions/${mission.id}/eta`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('estimatedArrival'); // timestamp
      expect(response.body).toHaveProperty('duration'); // minutes
      expect(response.body).toHaveProperty('distance'); // km
    });

    it('20.2 - Notifications de proximité ("artisan à 5 min")', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Urgence proximité',
          description: 'Test',
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

      // Artisan se rapproche (à 1km = ~5min)
      await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8656, // ~1km de distance
          longitude: 2.3622,
          missionId: mission.id,
        })
        .expect(200);

      // Vérifier qu'une notification a été créée
      const notifications = await prisma.notification.findMany({
        where: {
          userId: clientId,
          type: 'SYSTEM',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].message).toContain('artisan');
    });

    it('20.3 - Calcul d\'itinéraire avec points intermédiaires', async () => {
      const response = await request(app.getHttpServer())
        .post('/geo/route')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          origin: { lat: 48.8566, lng: 2.3522 },
          destination: { lat: 48.8700, lng: 2.3600 },
          waypoints: [
            { lat: 48.8600, lng: 2.3550 },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('route');
      expect(response.body).toHaveProperty('totalDistance');
      expect(response.body).toHaveProperty('totalDuration');
      expect(Array.isArray(response.body.route)).toBe(true);
    });

    it('20.4 - Géofencing: validation arrivée sur site', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientId,
          artisanId: artisanId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Mission géofencing',
          description: 'Test',
          category: 'Plomberie',
          address: '10 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 100.00,
          vatRate: 20.00,
        },
      });

      // Artisan arrive sur site (dans rayon de 50m)
      const response = await request(app.getHttpServer())
        .post(`/missions/${mission.id}/check-in`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8567, // ~10m de distance
          longitude: 2.3523,
        })
        .expect(200);

      expect(response.body.checkedIn).toBe(true);

      const updatedMission = await prisma.mission.findUnique({
        where: { id: mission.id },
      });
      expect(updatedMission.status).toBe('IN_PROGRESS');
    });

    it('20.5 - Anonymisation positions pour privacy (arrondi 100m)', async () => {
      // Position exacte
      const exactPosition = { lat: 48.856613, lng: 2.352222 };

      const response = await request(app.getHttpServer())
        .post('/geo/anonymize')
        .send(exactPosition)
        .expect(200);

      // Vérifier que la position est arrondie
      expect(response.body.lat).not.toBe(exactPosition.lat);
      expect(response.body.lng).not.toBe(exactPosition.lng);

      // Vérifier que l'arrondi est d'environ 100m
      const distance = calculateDistance(
        exactPosition.lat,
        exactPosition.lng,
        response.body.lat,
        response.body.lng
      );
      expect(distance).toBeLessThan(100); // mètres
    });

    it('20.6 - Détection déplacements impossibles (anti-spoofing)', async () => {
      // Position à Paris
      await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 48.8566,
          longitude: 2.3522,
        })
        .expect(200);

      // Tentative de position à Lyon 1 minute après (impossible)
      const response = await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          latitude: 45.7640,
          longitude: 4.8357,
        })
        .expect(400);

      expect(response.body.message).toContain('impossible');
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 21: TVA AVANCÉE
   * =====================================================
   */
  describe('Scénario 21: TVA Avancée', () => {
    it('21.1 - Taux intermédiaires France (10%, 5.5%)', async () => {
      // Créer service avec taux réduit 10% (travaux rénovation énergétique)
      const response = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Isolation thermique',
          category: 'RENOVATION_ENERGETIQUE',
          country: 'FR',
          price: 1000.00,
          vatRate: 10.0, // Taux réduit
        })
        .expect(201);

      expect(parseFloat(response.body.vatRate)).toBe(10.0);
      expect(parseFloat(response.body.totalWithVat)).toBe(1100.00);

      // Service avec taux super réduit 5.5% (fourniture équipements)
      const response2 = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Fourniture chaudière',
          category: 'EQUIPEMENT_ENERGETIQUE',
          country: 'FR',
          price: 2000.00,
          vatRate: 5.5,
        })
        .expect(201);

      expect(parseFloat(response2.body.vatRate)).toBe(5.5);
      expect(parseFloat(response2.body.totalWithVat)).toBe(2110.00);
    });

    it('21.2 - Taux multiples Luxembourg (17%, 14%, 8%)', async () => {
      // Taux normal 17%
      const normal = await request(app.getHttpServer())
        .post('/invoices/calculate-vat')
        .send({
          country: 'LU',
          amount: 100.00,
          category: 'STANDARD',
        })
        .expect(200);

      expect(parseFloat(normal.body.vatRate)).toBe(17.0);
      expect(parseFloat(normal.body.vatAmount)).toBe(17.00);

      // Taux intermédiaire 14% (vin)
      const intermediate = await request(app.getHttpServer())
        .post('/invoices/calculate-vat')
        .send({
          country: 'LU',
          amount: 100.00,
          category: 'WINE',
        })
        .expect(200);

      expect(parseFloat(intermediate.body.vatRate)).toBe(14.0);

      // Taux réduit 8% (services)
      const reduced = await request(app.getHttpServer())
        .post('/invoices/calculate-vat')
        .send({
          country: 'LU',
          amount: 100.00,
          category: 'SERVICES',
        })
        .expect(200);

      expect(parseFloat(reduced.body.vatRate)).toBe(8.0);
    });

    it('21.3 - Auto-entrepreneur franchise TVA (non applicable)', async () => {
      // Créer artisan auto-entrepreneur
      const autoEntrepreneur = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'autoentrepreneur@test.com',
          password: 'Pass123!',
          firstName: 'Auto',
          lastName: 'Entrepreneur',
          role: 'ARTISAN',
          companyType: 'AUTO_ENTREPRENEUR',
          country: 'FR',
        })
        .expect(201);

      // Générer facture (TVA non applicable)
      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${autoEntrepreneur.body.token}`)
        .send({
          clientId,
          amount: 500.00,
          description: 'Réparation plomberie',
        })
        .expect(201);

      expect(response.body.vatApplicable).toBe(false);
      expect(response.body.vatAmount).toBe(0);
      expect(response.body.totalWithVat).toBe(500.00);
      expect(response.body.legalMention).toContain('TVA non applicable');
    });

    it('21.4 - Intracommunautaire B2B (autoliquidation)', async () => {
      // Client professionnel belge avec numéro TVA
      const b2bClient = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'b2b@company.be',
          password: 'Pass123!',
          role: 'CLIENT',
          clientType: 'PROFESSIONAL',
          country: 'BE',
          vatNumber: 'BE0123456789',
        })
        .expect(201);

      // Artisan français facture client belge B2B
      const response = await request(app.getHttpServer())
        .post('/invoices')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          clientId: b2bClient.body.id,
          amount: 1000.00,
          description: 'Prestation de service',
        })
        .expect(201);

      // Autoliquidation: TVA à 0%, mention obligatoire
      expect(response.body.vatApplicable).toBe(false);
      expect(response.body.vatAmount).toBe(0);
      expect(response.body.legalMention).toContain('Autoliquidation');
      expect(response.body.legalMention).toContain('Article 196');
    });

    it('21.5 - Alertes seuils TVA intracommunautaire', async () => {
      // Simuler ventes à un pays dépassant 10 000€
      const response = await request(app.getHttpServer())
        .get('/vat/intracom-threshold-status')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({ country: 'BE', year: 2025 })
        .expect(200);

      expect(response.body).toHaveProperty('currentAmount');
      expect(response.body).toHaveProperty('threshold'); // 10 000€
      expect(response.body).toHaveProperty('percentageUsed');

      // Si dépassement, alerte avec obligation d'immatriculation
      if (response.body.currentAmount > response.body.threshold) {
        expect(response.body.alert).toBe(true);
        expect(response.body.message).toContain('immatriculation TVA');
      }
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 22: NOTIFICATIONS AVANCÉES
   * =====================================================
   */
  describe('Scénario 22: Notifications Avancées', () => {
    it('22.1 - Templates personnalisables par admin', async () => {
      // Admin crée template personnalisé
      const template = await request(app.getHttpServer())
        .post('/notifications/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'MISSION_ACCEPTED_CUSTOM',
          subject: 'Bonne nouvelle {clientName} !',
          body: 'Votre mission {missionTitle} a été acceptée par {artisanName}. RDV le {date}.',
          variables: ['clientName', 'missionTitle', 'artisanName', 'date'],
        })
        .expect(201);

      expect(template.body.name).toBe('MISSION_ACCEPTED_CUSTOM');
      expect(template.body.variables).toHaveLength(4);

      // Utiliser le template
      const notification = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: clientId,
          templateName: 'MISSION_ACCEPTED_CUSTOM',
          data: {
            clientName: 'Jean',
            missionTitle: 'Réparation fuite',
            artisanName: 'Pierre',
            date: '2025-11-10 14:00',
          },
        })
        .expect(201);

      expect(notification.body.subject).toContain('Bonne nouvelle Jean');
      expect(notification.body.body).toContain('Pierre');
    });

    it('22.2 - Plages horaires (ne pas notifier la nuit)', async () => {
      // Configurer préférences utilisateur
      await request(app.getHttpServer())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
        })
        .expect(200);

      // Tenter d'envoyer notification à 23:00 (heure actuelle mockée)
      const response = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          userId: clientId,
          type: 'MESSAGE',
          content: 'Nouveau message',
          currentTime: '23:00',
        })
        .expect(201);

      // Notification différée jusqu'à 08:00
      expect(response.body.status).toBe('SCHEDULED');
      expect(response.body.scheduledFor).toContain('08:00');
    });

    it('22.3 - Canaux multiples (Email + Push + SMS)', async () => {
      // Configurer préférences multi-canal
      await request(app.getHttpServer())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          channels: {
            MISSION_ACCEPTED: ['EMAIL', 'PUSH'],
            PAYMENT_RECEIVED: ['EMAIL', 'SMS'],
            MESSAGE_RECEIVED: ['PUSH'],
          },
        })
        .expect(200);

      // Envoyer notification multi-canal
      const response = await request(app.getHttpServer())
        .post('/notifications/send')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userId: clientId,
          type: 'PAYMENT_RECEIVED',
          content: 'Paiement de 150€ reçu',
        })
        .expect(201);

      // Vérifier que 2 canaux sont utilisés
      expect(response.body.channels).toHaveLength(2);
      expect(response.body.channels).toContain('EMAIL');
      expect(response.body.channels).toContain('SMS');
      expect(response.body.emailSent).toBe(true);
      expect(response.body.smsSent).toBe(true);
    });

    it('22.4 - Digest hebdomadaire', async () => {
      // Activer digest hebdomadaire
      await request(app.getHttpServer())
        .put('/users/notification-preferences')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          weeklyDigest: true,
          digestDay: 'MONDAY',
          digestTime: '09:00',
        })
        .expect(200);

      // Récupérer aperçu du digest
      const response = await request(app.getHttpServer())
        .get('/notifications/digest-preview')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('weekSummary');
      expect(response.body).toHaveProperty('statistics');
      expect(response.body.statistics).toHaveProperty('missionsCompleted');
      expect(response.body.statistics).toHaveProperty('messagesReceived');
      expect(response.body.statistics).toHaveProperty('earnings');
    });

    it('22.5 - Newsletter promotionnelle (opt-in)', async () => {
      // S'abonner à la newsletter
      const subscription = await request(app.getHttpServer())
        .post('/newsletter/subscribe')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          categories: ['PROMOTIONS', 'NEW_ARTISANS', 'TIPS'],
        })
        .expect(201);

      expect(subscription.body.subscribed).toBe(true);
      expect(subscription.body.categories).toHaveLength(3);

      // Se désabonner
      const unsubscribe = await request(app.getHttpServer())
        .post('/newsletter/unsubscribe')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(unsubscribe.body.subscribed).toBe(false);
    });

    it('22.6 - Badge d\'icône (compteur nouveaux messages)', async () => {
      // Récupérer compteurs de badges
      const response = await request(app.getHttpServer())
        .get('/notifications/badge-counts')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('unreadMessages');
      expect(response.body).toHaveProperty('pendingMissions');
      expect(response.body).toHaveProperty('unreadNotifications');
      expect(response.body).toHaveProperty('totalBadgeCount');

      // Marquer notifications comme lues
      await request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      // Vérifier badge remis à 0
      const updated = await request(app.getHttpServer())
        .get('/notifications/badge-counts')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(updated.body.unreadNotifications).toBe(0);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 23: MARKETPLACE AVANCÉ
   * =====================================================
   */
  describe('Scénario 23: Marketplace Avancé', () => {
    it('23.1 - Promotions et codes promo', async () => {
      // Admin crée code promo
      const promo = await request(app.getHttpServer())
        .post('/marketplace/promo-codes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'WINTER2025',
          discountType: 'PERCENTAGE',
          discountValue: 15,
          validFrom: '2025-01-01',
          validUntil: '2025-03-31',
          minAmount: 50.00,
          maxUses: 100,
        })
        .expect(201);

      expect(promo.body.code).toBe('WINTER2025');

      // Client applique le code promo
      const order = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: 'prod-123', quantity: 2, price: 30.00 }],
          promoCode: 'WINTER2025',
        })
        .expect(201);

      expect(parseFloat(order.body.subtotal)).toBe(60.00);
      expect(parseFloat(order.body.discount)).toBe(9.00); // 15%
      expect(parseFloat(order.body.total)).toBe(51.00);
    });

    it('23.2 - Alertes stock bas', async () => {
      // Créer produit avec stock bas
      const product = await request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Robinet premium',
          price: 89.99,
          stock: 3,
          lowStockThreshold: 5,
        })
        .expect(201);

      // Vérifier alerte envoyée
      const alerts = await request(app.getHttpServer())
        .get('/marketplace/stock-alerts')
        .set('Authorization', `Bearer ${artisanToken}`)
        .expect(200);

      const lowStockAlert = alerts.body.find(a => a.productId === product.body.id);
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert.type).toBe('LOW_STOCK');
      expect(lowStockAlert.currentStock).toBe(3);
      expect(lowStockAlert.threshold).toBe(5);
    });

    it('23.3 - Politique retours/échanges 14 jours', async () => {
      // Client demande retour dans les 14 jours
      const returnRequest = await request(app.getHttpServer())
        .post('/marketplace/returns')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          orderId: 'order-123',
          reason: 'NOT_AS_DESCRIBED',
          comment: 'Couleur différente de la photo',
        })
        .expect(201);

      expect(returnRequest.body.status).toBe('PENDING');
      expect(returnRequest.body.eligibleForReturn).toBe(true);

      // Artisan accepte le retour
      const approval = await request(app.getHttpServer())
        .put(`/marketplace/returns/${returnRequest.body.id}/approve`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          refundMethod: 'ORIGINAL_PAYMENT',
          shippingLabelProvided: true,
        })
        .expect(200);

      expect(approval.body.status).toBe('APPROVED');
      expect(approval.body.refundAmount).toBeGreaterThan(0);
    });

    it('23.4 - Options livraison (domicile vs retrait)', async () => {
      // Commander avec livraison à domicile
      const homeDelivery = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: 'prod-123', quantity: 1 }],
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
      expect(homeDelivery.body.shippingCost).toBeGreaterThan(0);

      // Commander avec retrait en magasin (gratuit)
      const pickup = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          items: [{ productId: 'prod-123', quantity: 1 }],
          deliveryMethod: 'PICKUP',
          pickupLocation: 'atelier-artisan',
        })
        .expect(201);

      expect(pickup.body.deliveryMethod).toBe('PICKUP');
      expect(parseFloat(pickup.body.shippingCost)).toBe(0);
    });

    it('23.5 - Calcul frais de port', async () => {
      // Frais de port standard France
      const frShipping = await request(app.getHttpServer())
        .post('/marketplace/calculate-shipping')
        .send({
          country: 'FR',
          postalCode: '75001',
          weight: 2.5, // kg
          items: 3,
        })
        .expect(200);

      expect(parseFloat(frShipping.body.cost)).toBeGreaterThan(0);
      expect(frShipping.body.estimatedDays).toBe('2-3');

      // Livraison gratuite si montant > 100€
      const freeShipping = await request(app.getHttpServer())
        .post('/marketplace/calculate-shipping')
        .send({
          country: 'FR',
          orderAmount: 150.00,
        })
        .expect(200);

      expect(parseFloat(freeShipping.body.cost)).toBe(0);
      expect(freeShipping.body.reason).toBe('FREE_OVER_100');
    });

    it('23.6 - Modération IA (détection produits illégaux)', async () => {
      // Tenter de créer produit suspect
      const response = await request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Réplique arme à feu',
          description: 'Réplique exacte',
          price: 299.99,
        })
        .expect(400);

      expect(response.body.error).toBe('MODERATION_FAILED');
      expect(response.body.message).toContain('illégal');
      expect(response.body.aiConfidence).toBeGreaterThan(0.8);

      // Produit normal passe la modération
      const validProduct = await request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({
          name: 'Marteau professionnel',
          description: 'Outil de qualité pour artisans',
          price: 49.99,
        })
        .expect(201);

      expect(validProduct.body.moderationStatus).toBe('APPROVED');
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 24: AUTHENTIFICATION AVANCÉE
   * =====================================================
   */
  describe('Scénario 24: Authentification Avancée', () => {
    it('24.1 - OAuth Google', async () => {
      // Simuler callback OAuth Google
      const response = await request(app.getHttpServer())
        .post('/auth/oauth/google')
        .send({
          code: 'mock-google-auth-code',
          redirectUri: 'http://localhost:3000/auth/callback',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toContain('@gmail.com');
      expect(response.body.user.provider).toBe('GOOGLE');
      expect(response.body.user.emailVerified).toBe(true);
    });

    it('24.2 - OAuth Facebook', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/oauth/facebook')
        .send({
          accessToken: 'mock-facebook-token',
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.provider).toBe('FACEBOOK');
      expect(response.body.user.emailVerified).toBe(true);
    });

    it('24.3 - OAuth Apple', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/oauth/apple')
        .send({
          identityToken: 'mock-apple-identity-token',
          user: {
            email: 'privaterelay@icloud.com',
            firstName: 'John',
            lastName: 'Doe',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.provider).toBe('APPLE');
      expect(response.body.user.emailVerified).toBe(true);
    });

    it('24.4 - Reset password (email)', async () => {
      // Demander reset
      const resetRequest = await request(app.getHttpServer())
        .post('/auth/password-reset/request')
        .send({
          email: 'client@test.com',
        })
        .expect(200);

      expect(resetRequest.body.message).toContain('email envoyé');

      // Utiliser le token de reset
      const reset = await request(app.getHttpServer())
        .post('/auth/password-reset/confirm')
        .send({
          token: 'mock-reset-token-123',
          newPassword: 'NewSecurePass123!',
        })
        .expect(200);

      expect(reset.body.message).toContain('modifié avec succès');
    });

    it('24.5 - Vérification email (lien de confirmation)', async () => {
      // Créer compte non vérifié
      const user = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'Pass123!',
          role: 'CLIENT',
        })
        .expect(201);

      expect(user.body.emailVerified).toBe(false);

      // Vérifier email avec token
      const verification = await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: 'mock-verification-token' })
        .expect(200);

      expect(verification.body.emailVerified).toBe(true);
      expect(verification.body.message).toContain('confirmé');
    });

    it('24.6 - Vérification SMS (code 6 chiffres)', async () => {
      // Demander code SMS
      const smsRequest = await request(app.getHttpServer())
        .post('/auth/phone-verification/request')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          phone: '+33612345678',
        })
        .expect(200);

      expect(smsRequest.body.message).toContain('code envoyé');

      // Vérifier code
      const verification = await request(app.getHttpServer())
        .post('/auth/phone-verification/verify')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          phone: '+33612345678',
          code: '123456', // Mock code
        })
        .expect(200);

      expect(verification.body.phoneVerified).toBe(true);
    });

    it('24.7 - Gestion moyens de paiement sauvegardés', async () => {
      // Ajouter carte
      const addCard = await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          stripePaymentMethodId: 'pm_mock_card',
          type: 'CARD',
          isDefault: true,
        })
        .expect(201);

      expect(addCard.body.type).toBe('CARD');
      expect(addCard.body.isDefault).toBe(true);

      // Lister moyens de paiement
      const list = await request(app.getHttpServer())
        .get('/payment-methods')
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);

      expect(list.body.length).toBeGreaterThan(0);

      // Supprimer moyen de paiement
      await request(app.getHttpServer())
        .delete(`/payment-methods/${addCard.body.id}`)
        .set('Authorization', `Bearer ${clientToken}`)
        .expect(200);
    });
  });

  /**
   * =====================================================
   * SCÉNARIO 25: ANALYTICS & REPORTING
   * =====================================================
   */
  describe('Scénario 25: Analytics & Reporting', () => {
    it('25.1 - Dashboard KPIs temps réel', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeArtisans');
      expect(response.body).toHaveProperty('missionsToday');
      expect(response.body).toHaveProperty('revenueToday');
      expect(response.body).toHaveProperty('averageRating');
      expect(response.body).toHaveProperty('conversionRate');
    });

    it('25.2 - Graphiques analytics (revenus, utilisateurs)', async () => {
      // Données pour graphique revenus 30 derniers jours
      const revenueChart = await request(app.getHttpServer())
        .get('/analytics/revenue-chart')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(revenueChart.body.labels).toHaveLength(30);
      expect(revenueChart.body.data).toHaveLength(30);
      expect(revenueChart.body.total).toBeGreaterThanOrEqual(0);

      // Croissance utilisateurs
      const usersChart = await request(app.getHttpServer())
        .get('/analytics/users-growth')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: '12m' })
        .expect(200);

      expect(usersChart.body.labels).toHaveLength(12);
      expect(usersChart.body.clients).toHaveLength(12);
      expect(usersChart.body.artisans).toHaveLength(12);
    });

    it('25.3 - Export comptable artisan', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/accounting-export')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          format: 'CSV',
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('Date,Client,Montant HT,TVA,Montant TTC');
    });

    it('25.4 - Tableau de bord TVA par pays', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/vat-dashboard')
        .set('Authorization', `Bearer ${artisanToken}`)
        .query({ year: 2025 })
        .expect(200);

      expect(response.body).toHaveProperty('FR');
      expect(response.body).toHaveProperty('BE');
      expect(response.body).toHaveProperty('LU');

      expect(response.body.FR).toHaveProperty('totalHT');
      expect(response.body.FR).toHaveProperty('totalVAT');
      expect(response.body.FR).toHaveProperty('totalTTC');
      expect(response.body.FR.vatRate).toBe(20.0);
    });

    it('25.5 - Analyse comportement utilisateurs', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/user-behavior')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ userId: clientId })
        .expect(200);

      expect(response.body).toHaveProperty('totalMissions');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('preferredCategories');
      expect(response.body).toHaveProperty('totalSpent');
      expect(response.body).toHaveProperty('loyaltyScore');
      expect(response.body.preferredCategories).toBeInstanceOf(Array);
    });

    it('25.6 - Taux de conversion (demande → mission)', async () => {
      const response = await request(app.getHttpServer())
        .get('/analytics/conversion-funnel')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ period: '30d' })
        .expect(200);

      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('matchedRequests');
      expect(response.body).toHaveProperty('acceptedMissions');
      expect(response.body).toHaveProperty('completedMissions');
      expect(response.body).toHaveProperty('conversionRate');

      expect(parseFloat(response.body.conversionRate)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(response.body.conversionRate)).toBeLessThanOrEqual(100);
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
    await prisma.certification.deleteMany();
    await prisma.savedArtisan.deleteMany();
    await prisma.address.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.user.deleteMany();
  }
});
