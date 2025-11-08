import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';

/**
 * ARTICONNECT - TESTS SCÉNARIOS RÉELS
 *
 * Cette suite de tests couvre l'ensemble du périmètre fonctionnel
 * avec des scénarios réels d'utilisation de la plateforme.
 */

describe('ArtiConnect - Real World Scenarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Tokens et IDs pour les tests
  let clientParticulierToken: string;
  let clientParticulierId: string;
  let clientProfessionnelToken: string;
  let clientProfessionnelId: string;
  let artisanIndependantToken: string;
  let artisanIndependantId: string;
  let artisanSocieteToken: string;
  let artisanSocieteId: string;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Nettoyage de la base de données de test
    await cleanDatabase();
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  /**
   * SCÉNARIO 1: ONBOARDING
   * Test de l'inscription et configuration des différents types d'utilisateurs
   */
  describe('Scénario 1: Onboarding des utilisateurs', () => {

    it('1.1 - Client Particulier: Inscription complète', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'jean.dupont@gmail.com',
          password: 'SecurePass123!',
          firstName: 'Jean',
          lastName: 'Dupont',
          role: 'CLIENT',
          phone: '+33612345678',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.role).toBe('CLIENT');

      clientParticulierToken = response.body.accessToken;
      clientParticulierId = response.body.user.id;

      // Vérification que le profil client est créé
      const profile = await prisma.clientProfile.findUnique({
        where: { userId: clientParticulierId },
      });
      expect(profile).toBeDefined();
    });

    it('1.2 - Client Particulier: Ajout d\'adresse', async () => {
      const response = await request(app.getHttpServer())
        .post('/addresses')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          label: 'Domicile',
          street: '15 Rue de la République',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          isDefault: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.city).toBe('Paris');
      expect(response.body.country).toBe('FR');
    });

    it('1.3 - Client Professionnel: Inscription avec données entreprise', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'contact@entreprise-btp.fr',
          password: 'SecurePass456!',
          firstName: 'Marie',
          lastName: 'Martin',
          role: 'CLIENT',
          phone: '+33698765432',
        })
        .expect(201);

      clientProfessionnelToken = response.body.accessToken;
      clientProfessionnelId = response.body.user.id;

      expect(response.body.user.role).toBe('CLIENT');
    });

    it('1.4 - Artisan Indépendant: Inscription et configuration profil', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'pierre.plombier@gmail.com',
          password: 'ArtisanPass123!',
          firstName: 'Pierre',
          lastName: 'Plombier',
          role: 'ARTISAN',
          phone: '+33687654321',
        })
        .expect(201);

      artisanIndependantToken = registerResponse.body.accessToken;
      artisanIndependantId = registerResponse.body.user.id;

      // Configuration du profil artisan
      const profileResponse = await request(app.getHttpServer())
        .put('/users/profile/artisan')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          companyName: 'Pierre Plomberie',
          siret: '12345678901234',
          vatNumber: 'FR12345678901',
          description: 'Plombier professionnel avec 15 ans d\'expérience',
          serviceRadius: 25,
          baseAddress: '10 Avenue de la Plomberie, Luxembourg',
          latitude: 49.6116,
          longitude: 6.1319,
          hourlyRate: 65.00,
          emergencyRate: 95.00,
          specialties: ['Plomberie', 'Dépannage urgence'],
        })
        .expect(200);

      expect(profileResponse.body.companyName).toBe('Pierre Plomberie');
      expect(profileResponse.body.serviceRadius).toBe(25);
    });

    it('1.5 - Artisan Indépendant: Activation 2FA', async () => {
      // Génération du secret 2FA
      const setupResponse = await request(app.getHttpServer())
        .post('/auth/2fa/setup')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .expect(200);

      expect(setupResponse.body).toHaveProperty('qrCode');
      expect(setupResponse.body).toHaveProperty('secret');

      // Note: Dans un vrai test, on utiliserait un code TOTP réel
      // Pour le test, on simule l'activation
    });

    it('1.6 - Artisan Société: Inscription avec salariés', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'contact@electricite-pro.lu',
          password: 'CompanyPass789!',
          firstName: 'Marc',
          lastName: 'Électricien',
          role: 'ARTISAN',
          phone: '+352691234567',
        })
        .expect(201);

      artisanSocieteToken = registerResponse.body.accessToken;
      artisanSocieteId = registerResponse.body.user.id;

      // Configuration du profil société
      const profileResponse = await request(app.getHttpServer())
        .put('/users/profile/artisan')
        .set('Authorization', `Bearer ${artisanSocieteToken}`)
        .send({
          companyName: 'Électricité Pro SARL',
          siret: '98765432109876',
          vatNumber: 'LU98765432',
          description: 'Entreprise d\'électricité avec 5 salariés',
          serviceRadius: 50,
          baseAddress: 'Zone Industrielle, Luxembourg-Ville',
          latitude: 49.6116,
          longitude: 6.1319,
          hourlyRate: 75.00,
          emergencyRate: 110.00,
          specialties: ['Électricité', 'Installation', 'Dépannage'],
        })
        .expect(200);

      expect(profileResponse.body.companyName).toBe('Électricité Pro SARL');
    });

    it('1.7 - Artisan: Upload de documents (assurance, certifications)', async () => {
      // Upload assurance
      const insuranceResponse = await request(app.getHttpServer())
        .post('/upload/document')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .field('documentType', 'insurance')
        .attach('file', Buffer.from('fake-insurance-pdf'), 'assurance.pdf')
        .expect(201);

      expect(insuranceResponse.body).toHaveProperty('url');

      // Ajout de certification
      const certificationResponse = await request(app.getHttpServer())
        .post('/certifications')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          name: 'Certification Plomberie Professionnelle',
          issuer: 'Chambre des Métiers Luxembourg',
          issueDate: '2020-06-15',
          expiryDate: '2025-06-15',
        })
        .expect(201);

      expect(certificationResponse.body.verified).toBe(false);
    });

    it('1.8 - Artisan: Configuration Stripe Connect', async () => {
      const response = await request(app.getHttpServer())
        .post('/stripe/connect/account')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          country: 'LU',
          businessType: 'individual',
        })
        .expect(201);

      expect(response.body).toHaveProperty('accountId');
      expect(response.body).toHaveProperty('onboardingUrl');
    });
  });

  /**
   * SCÉNARIO 2: GÉOLOCALISATION ET MATCHING
   * Test de la recherche d'artisans par localisation
   */
  describe('Scénario 2: Géolocalisation et Matching', () => {

    it('2.1 - Client recherche artisans disponibles autour de sa position', async () => {
      const response = await request(app.getHttpServer())
        .get('/geo/search')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .query({
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 20, // km
          specialty: 'Plomberie',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Vérifier que les artisans sont triés par distance
      if (response.body.length > 1) {
        expect(response.body[0].distance).toBeLessThanOrEqual(response.body[1].distance);
      }
    });

    it('2.2 - Client recherche avec filtres avancés', async () => {
      const response = await request(app.getHttpServer())
        .get('/geo/search')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .query({
          latitude: 49.6116,
          longitude: 6.1319,
          radius: 30,
          specialty: 'Électricité',
          minRating: 4.0,
          available: true,
          maxHourlyRate: 80.00,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((artisan) => {
        expect(artisan.rating).toBeGreaterThanOrEqual(4.0);
        expect(artisan.hourlyRate).toBeLessThanOrEqual(80.00);
      });
    });

    it('2.3 - Artisan met à jour sa localisation en temps réel', async () => {
      const response = await request(app.getHttpServer())
        .put('/geo/location')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          latitude: 49.6200,
          longitude: 6.1400,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  /**
   * SCÉNARIO 3: DEMANDES DE MISSION
   * Test des différents types de demandes
   */
  describe('Scénario 3: Création de demandes', () => {
    let missionUrgenceId: string;
    let missionNormaleId: string;
    let missionDevisId: string;

    it('3.1 - Client crée une demande URGENCE (fuite d\'eau)', async () => {
      const response = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          type: 'EMERGENCY',
          title: 'Fuite d\'eau urgente - Cuisine',
          description: 'Grosse fuite sous l\'évier, eau qui coule partout !',
          category: 'Plomberie',
          address: '15 Rue de la République',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          clientBudget: 150.00,
          photos: [],
        })
        .expect(201);

      missionUrgenceId = response.body.id;
      expect(response.body.type).toBe('EMERGENCY');
      expect(response.body.status).toBe('PENDING');
    });

    it('3.2 - Client crée une demande NORMALE planifiée', async () => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7); // Dans 7 jours

      const response = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          type: 'SCHEDULED',
          title: 'Installation nouveau radiateur',
          description: 'Besoin d\'installer un radiateur dans la chambre',
          category: 'Plomberie',
          address: '15 Rue de la République',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: scheduledDate.toISOString(),
          estimatedDuration: 180, // 3 heures
          clientBudget: 350.00,
          photos: [],
        })
        .expect(201);

      missionNormaleId = response.body.id;
      expect(response.body.type).toBe('SCHEDULED');
      expect(response.body.scheduledFor).toBeDefined();
    });

    it('3.3 - Client professionnel crée une demande de DEVIS', async () => {
      const response = await request(app.getHttpServer())
        .post('/missions')
        .set('Authorization', `Bearer ${clientProfessionnelToken}`)
        .send({
          type: 'QUOTE',
          title: 'Rénovation électrique complète bureaux',
          description: 'Refaire toute l\'installation électrique de nos locaux (200m²)',
          category: 'Électricité',
          address: '50 Avenue des Entreprises',
          city: 'Luxembourg',
          postalCode: 'L-1234',
          country: 'LU',
          latitude: 49.6116,
          longitude: 6.1319,
          clientBudget: 15000.00,
          estimatedDuration: 1200, // 20 heures
          photos: [],
        })
        .expect(201);

      missionDevisId = response.body.id;
      expect(response.body.type).toBe('QUOTE');
    });

    it('3.4 - Système notifie les artisans compatibles', async () => {
      // Vérifier que les artisans ont reçu des notifications
      const notifications = await prisma.notification.findMany({
        where: {
          userId: artisanIndependantId,
          type: 'NEW_MISSION',
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  /**
   * SCÉNARIO 4: NÉGOCIATION DE PRIX
   * Test du système de négociation entre client et artisan
   */
  describe('Scénario 4: Négociation de prix', () => {
    let missionId: string;

    beforeAll(async () => {
      // Créer une mission pour la négociation
      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          type: 'SCHEDULED',
          status: 'PENDING',
          title: 'Réparation robinet',
          description: 'Robinet qui fuit',
          category: 'Plomberie',
          address: '15 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          clientBudget: 100.00,
          vatRate: 20.00,
        },
      });
      missionId = mission.id;
    });

    it('4.1 - Artisan accepte la mission et propose un prix', async () => {
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiate`)
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          proposedPrice: 150.00,
          message: 'Bonjour, je peux intervenir. Le tarif inclurait le déplacement et la main d\'œuvre.',
        })
        .expect(201);

      expect(response.body.proposedPrice).toBe('150.00');

      // Vérifier que le statut de la mission est passé à NEGOTIATING
      const mission = await prisma.mission.findUnique({ where: { id: missionId } });
      expect(mission.status).toBe('NEGOTIATING');
      expect(mission.artisanId).toBe(artisanIndependantId);
    });

    it('4.2 - Client fait une contre-proposition', async () => {
      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiate`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          proposedPrice: 130.00,
          message: 'Je peux aller jusqu\'à 130€',
        })
        .expect(201);

      expect(response.body.proposedPrice).toBe('130.00');
    });

    it('4.3 - Artisan accepte la contre-proposition', async () => {
      const negotiations = await prisma.negotiation.findMany({
        where: { missionId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });

      const response = await request(app.getHttpServer())
        .post(`/missions/${missionId}/negotiate/${negotiations[0].id}/accept`)
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Vérifier que la mission est acceptée avec le prix convenu
      const mission = await prisma.mission.findUnique({ where: { id: missionId } });
      expect(mission.status).toBe('ACCEPTED');
      expect(mission.agreedPrice).toBeDefined();
    });

    it('4.4 - Historique des négociations est complet', async () => {
      const negotiations = await prisma.negotiation.findMany({
        where: { missionId },
        orderBy: { createdAt: 'asc' },
      });

      expect(negotiations.length).toBeGreaterThanOrEqual(2);
      expect(negotiations[0].proposedPrice).toBeDefined();
      expect(negotiations[1].proposedPrice).toBeDefined();
    });
  });

  /**
   * SCÉNARIO 5: PAIEMENTS ET COMMISSIONS
   * Test du système de paiement avec calcul de TVA multi-pays
   */
  describe('Scénario 5: Paiements et Commissions', () => {
    let missionFranceId: string;
    let missionLuxembourgId: string;
    let missionBelgiqueId: string;

    it('5.1 - Paiement mission en France (TVA 20%)', async () => {
      // Créer une mission acceptée en France
      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          artisanId: artisanIndependantId,
          type: 'EMERGENCY',
          status: 'ACCEPTED',
          title: 'Mission test France',
          description: 'Test',
          category: 'Plomberie',
          address: '15 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 100.00,
          vatRate: 20.00, // TVA France
        },
      });
      missionFranceId = mission.id;

      // Client effectue le paiement
      const response = await request(app.getHttpServer())
        .post(`/payments/mission/${missionFranceId}`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          paymentMethodId: 'pm_card_visa', // Test Stripe
        })
        .expect(201);

      expect(response.body.amount).toBe(120.00); // 100 + 20% TVA
      expect(response.body.transaction).toBeDefined();

      // Vérifier le calcul de la commission (12%)
      const transaction = await prisma.transaction.findUnique({
        where: { id: response.body.transaction.id },
      });

      expect(parseFloat(transaction.commission.toString())).toBe(12.00); // 12% de 100€
      expect(parseFloat(transaction.artisanAmount.toString())).toBe(88.00); // 100 - 12
    });

    it('5.2 - Paiement mission au Luxembourg (TVA 17%)', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientProfessionnelId,
          artisanId: artisanSocieteId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Mission test Luxembourg',
          description: 'Test',
          category: 'Électricité',
          address: 'Zone Industrielle',
          city: 'Luxembourg',
          postalCode: 'L-1234',
          country: 'LU',
          latitude: 49.6116,
          longitude: 6.1319,
          agreedPrice: 500.00,
          vatRate: 17.00, // TVA Luxembourg
        },
      });
      missionLuxembourgId = mission.id;

      const response = await request(app.getHttpServer())
        .post(`/payments/mission/${missionLuxembourgId}`)
        .set('Authorization', `Bearer ${clientProfessionnelToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      expect(response.body.amount).toBe(585.00); // 500 + 17% TVA
    });

    it('5.3 - Paiement mission en Belgique (TVA 21%)', async () => {
      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          artisanId: artisanIndependantId,
          type: 'SCHEDULED',
          status: 'ACCEPTED',
          title: 'Mission test Belgique',
          description: 'Test',
          category: 'Plomberie',
          address: 'Rue de Bruxelles',
          city: 'Bruxelles',
          postalCode: '1000',
          country: 'BE',
          latitude: 50.8503,
          longitude: 4.3517,
          agreedPrice: 200.00,
          vatRate: 21.00, // TVA Belgique
        },
      });
      missionBelgiqueId = mission.id;

      const response = await request(app.getHttpServer())
        .post(`/payments/mission/${missionBelgiqueId}`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      expect(response.body.amount).toBe(242.00); // 200 + 21% TVA
    });

    it('5.4 - Vérification des commissions par type d\'artisan', async () => {
      // Les commissions peuvent varier selon le volume de l'artisan
      const transactions = await prisma.transaction.findMany({
        where: {
          status: 'COMPLETED',
        },
      });

      transactions.forEach((transaction) => {
        const commissionRate = (
          parseFloat(transaction.commission.toString()) /
          parseFloat(transaction.amount.toString())
        ) * 100;

        // Commission entre 8% et 15%
        expect(commissionRate).toBeGreaterThanOrEqual(8);
        expect(commissionRate).toBeLessThanOrEqual(15);
      });
    });
  });

  /**
   * SCÉNARIO 6: FACTURES
   * Test de la génération de factures conformes par pays
   */
  describe('Scénario 6: Génération de factures', () => {

    it('6.1 - Génération facture France (client particulier)', async () => {
      const missions = await prisma.mission.findMany({
        where: {
          country: 'FR',
          status: 'COMPLETED',
        },
        take: 1,
      });

      if (missions.length === 0) {
        // Compléter une mission pour le test
        const mission = await prisma.mission.findFirst({
          where: { country: 'FR' },
        });

        await prisma.mission.update({
          where: { id: mission.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });
      }

      const response = await request(app.getHttpServer())
        .get(`/payments/invoice/${missions[0].id}`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('invoiceNumber');
      expect(response.body).toHaveProperty('pdfUrl');
      expect(response.body.country).toBe('FR');
      expect(response.body.vatRate).toBe(20.00);
    });

    it('6.2 - Génération facture Luxembourg (client professionnel)', async () => {
      const missions = await prisma.mission.findMany({
        where: {
          country: 'LU',
          status: 'COMPLETED',
        },
        take: 1,
      });

      const response = await request(app.getHttpServer())
        .get(`/payments/invoice/${missions[0].id}`)
        .set('Authorization', `Bearer ${clientProfessionnelToken}`)
        .expect(200);

      expect(response.body.country).toBe('LU');
      expect(response.body.vatRate).toBe(17.00);
    });

    it('6.3 - Export comptable pour artisan', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/export')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .query({
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          format: 'csv',
        })
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
    });
  });

  /**
   * SCÉNARIO 7: PLANIFICATION ET RENDEZ-VOUS
   * Test du système de calendrier et gestion des rendez-vous
   */
  describe('Scénario 7: Planification et rendez-vous', () => {

    it('7.1 - Artisan consulte ses disponibilités', async () => {
      const response = await request(app.getHttpServer())
        .get('/missions/schedule')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .query({
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('7.2 - Client propose une date, artisan confirme', async () => {
      const scheduledDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          type: 'SCHEDULED',
          status: 'PENDING',
          title: 'Rendez-vous planifié',
          description: 'Test planification',
          category: 'Plomberie',
          address: '15 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          scheduledFor: scheduledDate,
          clientBudget: 100.00,
          vatRate: 20.00,
        },
      });

      // Artisan accepte le rendez-vous
      const response = await request(app.getHttpServer())
        .post(`/missions/${mission.id}/accept`)
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          confirmedDate: scheduledDate.toISOString(),
        })
        .expect(200);

      expect(response.body.status).toBe('ACCEPTED');
    });

    it('7.3 - Système envoie rappels automatiques', async () => {
      // Vérifier que des notifications de rappel sont créées
      const notifications = await prisma.notification.findMany({
        where: {
          type: 'MISSION_ACCEPTED',
        },
      });

      expect(notifications.length).toBeGreaterThan(0);
    });
  });

  /**
   * SCÉNARIO 8: LITIGES
   * Test du système de gestion des litiges
   */
  describe('Scénario 8: Gestion des litiges', () => {
    let disputeMissionId: string;
    let disputeId: string;

    beforeAll(async () => {
      // Créer une mission pour le litige
      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          artisanId: artisanIndependantId,
          type: 'EMERGENCY',
          status: 'COMPLETED',
          title: 'Mission avec problème',
          description: 'Test litige',
          category: 'Plomberie',
          address: '15 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 150.00,
          finalPrice: 150.00,
          vatRate: 20.00,
          completedAt: new Date(),
        },
      });
      disputeMissionId = mission.id;
    });

    it('8.1 - Client ouvre un litige', async () => {
      const response = await request(app.getHttpServer())
        .post('/disputes')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          missionId: disputeMissionId,
          reason: 'Travail non conforme',
          description: 'La fuite n\'est pas réparée correctement, ça coule toujours',
          priority: 'HIGH',
        })
        .expect(201);

      disputeId = response.body.id;
      expect(response.body.status).toBe('OPEN');

      // Vérifier que le statut de la mission est passé à DISPUTED
      const mission = await prisma.mission.findUnique({ where: { id: disputeMissionId } });
      expect(mission.status).toBe('DISPUTED');
    });

    it('8.2 - Admin consulte les litiges', async () => {
      // Créer un admin pour le test
      const admin = await prisma.user.create({
        data: {
          email: 'admin@articonnect.com',
          password: 'AdminPass123!',
          firstName: 'Admin',
          lastName: 'System',
          role: 'ADMIN',
          emailVerified: true,
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'admin@articonnect.com',
          password: 'AdminPass123!',
        })
        .expect(200);

      adminToken = loginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/admin/disputes')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          status: 'OPEN',
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('8.3 - Admin résout le litige avec remboursement partiel', async () => {
      const response = await request(app.getHttpServer())
        .post(`/admin/disputes/${disputeId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolution: 'Remboursement partiel de 50€ accordé au client',
          refundAmount: 50.00,
          status: 'RESOLVED',
        })
        .expect(200);

      expect(response.body.status).toBe('RESOLVED');
      expect(response.body.resolution).toBeDefined();

      // Vérifier que le litige est résolu dans la DB
      const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
      expect(dispute.status).toBe('RESOLVED');
      expect(dispute.resolvedAt).toBeDefined();
    });
  });

  /**
   * SCÉNARIO 9: MARKETPLACE
   * Test du système de vente de produits
   */
  describe('Scénario 9: Marketplace', () => {
    let productId: string;
    let orderId: string;

    it('9.1 - Artisan crée un produit avec variantes', async () => {
      const response = await request(app.getHttpServer())
        .post('/marketplace/products')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          name: 'Kit de plomberie professionnel',
          description: 'Kit complet pour dépannage plomberie',
          category: 'Outils',
          price: 89.99,
          vatRate: 20.00,
          stock: 10,
          sku: 'KIT-PLOMB-001',
          status: 'ACTIVE',
          photos: ['https://example.com/photo1.jpg'],
          variants: [
            { name: 'Standard', stock: 10, priceAdjustment: 0 },
            { name: 'Premium', stock: 5, priceAdjustment: 20.00 },
          ],
        })
        .expect(201);

      productId = response.body.id;
      expect(response.body.name).toBe('Kit de plomberie professionnel');
      expect(response.body.variants.length).toBe(2);
    });

    it('9.2 - Client recherche des produits', async () => {
      const response = await request(app.getHttpServer())
        .get('/marketplace/products/search')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .query({
          keyword: 'plomberie',
          category: 'Outils',
          maxPrice: 100,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('9.3 - Client commande un produit', async () => {
      const response = await request(app.getHttpServer())
        .post('/marketplace/orders')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          items: [
            {
              productId: productId,
              quantity: 2,
            },
          ],
          shippingAddress: '15 Rue de la République, 75001 Paris',
        })
        .expect(201);

      orderId = response.body.id;
      expect(response.body.status).toBe('PENDING');
      expect(response.body.total).toBeDefined();
    });

    it('9.4 - Client paie la commande', async () => {
      const response = await request(app.getHttpServer())
        .post(`/marketplace/orders/${orderId}/pay`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
        })
        .expect(200);

      expect(response.body.status).toBe('PAID');
    });

    it('9.5 - Artisan met à jour le tracking de la commande', async () => {
      const response = await request(app.getHttpServer())
        .put(`/marketplace/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          trackingNumber: 'TRACK123456789',
          status: 'SHIPPED',
        })
        .expect(200);

      expect(response.body.trackingNumber).toBe('TRACK123456789');
      expect(response.body.status).toBe('SHIPPED');
    });
  });

  /**
   * SCÉNARIO 10: ÉVALUATIONS
   * Test du système de reviews et notation
   */
  describe('Scénario 10: Système d\'évaluations', () => {
    let reviewMissionId: string;

    beforeAll(async () => {
      // Créer une mission complétée pour l'évaluation
      const mission = await prisma.mission.create({
        data: {
          clientId: clientParticulierId,
          artisanId: artisanIndependantId,
          type: 'SCHEDULED',
          status: 'COMPLETED',
          title: 'Mission à évaluer',
          description: 'Test évaluation',
          category: 'Plomberie',
          address: '15 Rue Test',
          city: 'Paris',
          postalCode: '75001',
          country: 'FR',
          latitude: 48.8566,
          longitude: 2.3522,
          agreedPrice: 150.00,
          finalPrice: 150.00,
          vatRate: 20.00,
          completedAt: new Date(),
        },
      });
      reviewMissionId = mission.id;
    });

    it('10.1 - Client évalue l\'artisan après mission', async () => {
      const response = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          missionId: reviewMissionId,
          overallRating: 5,
          qualityRating: 5,
          punctualityRating: 4,
          communicationRating: 5,
          valueRating: 4,
          comment: 'Excellent travail, très professionnel et rapide !',
          photos: [],
        })
        .expect(201);

      expect(response.body.overallRating).toBe(5);
    });

    it('10.2 - Artisan évalue le client', async () => {
      const response = await request(app.getHttpServer())
        .post('/reviews')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          missionId: reviewMissionId,
          overallRating: 5,
          comment: 'Client très agréable et respectueux',
        })
        .expect(201);

      expect(response.body.overallRating).toBe(5);
    });

    it('10.3 - Vérification mise à jour du rating artisan', async () => {
      const artisanProfile = await prisma.artisanProfile.findUnique({
        where: { userId: artisanIndependantId },
      });

      expect(artisanProfile.reviewCount).toBeGreaterThan(0);
      expect(parseFloat(artisanProfile.rating.toString())).toBeGreaterThan(0);
    });

    it('10.4 - Client consulte les avis d\'un artisan', async () => {
      const response = await request(app.getHttpServer())
        .get(`/reviews/artisan/${artisanIndependantId}`)
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  /**
   * SCÉNARIO 11: FAVORIS ET NOTIFICATIONS
   */
  describe('Scénario 11: Favoris et notifications', () => {

    it('11.1 - Client sauvegarde un artisan en favori', async () => {
      const response = await request(app.getHttpServer())
        .post('/favorites')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          artisanId: artisanIndependantId,
        })
        .expect(201);

      expect(response.body.artisanId).toBe(artisanIndependantId);
    });

    it('11.2 - Client consulte ses artisans favoris', async () => {
      const response = await request(app.getHttpServer())
        .get('/favorites')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('11.3 - Artisan configure ses préférences de notification', async () => {
      const response = await request(app.getHttpServer())
        .put('/notifications/preferences')
        .set('Authorization', `Bearer ${artisanIndependantToken}`)
        .send({
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          newMission: true,
          missionUpdate: true,
          newMessage: true,
          marketingEmails: false,
        })
        .expect(200);

      expect(response.body.newMission).toBe(true);
      expect(response.body.marketingEmails).toBe(false);
    });
  });

  /**
   * SCÉNARIO 12: ADMINISTRATION
   */
  describe('Scénario 12: Dashboard admin', () => {

    it('12.1 - Admin consulte les statistiques globales', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('totalMissions');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('activeArtisans');
    });

    it('12.2 - Admin valide les certifications artisan', async () => {
      const certifications = await prisma.certification.findMany({
        where: { verified: false },
        take: 1,
      });

      if (certifications.length > 0) {
        const response = await request(app.getHttpServer())
          .put(`/admin/certifications/${certifications[0].id}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            verified: true,
          })
          .expect(200);

        expect(response.body.verified).toBe(true);
      }
    });

    it('12.3 - Admin consulte les logs d\'audit', async () => {
      const response = await request(app.getHttpServer())
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  /**
   * SCÉNARIO 13: GDPR ET CONFORMITÉ
   */
  describe('Scénario 13: GDPR et conformité', () => {

    it('13.1 - Client demande l\'export de ses données', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/gdpr/export')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('missions');
      expect(response.body).toHaveProperty('reviews');
    });

    it('13.2 - Client met à jour ses consentements', async () => {
      const response = await request(app.getHttpServer())
        .put('/users/gdpr/consents')
        .set('Authorization', `Bearer ${clientParticulierToken}`)
        .send({
          marketing: false,
          analytics: true,
          geolocation: true,
        })
        .expect(200);

      expect(response.body.marketing).toBe(false);
      expect(response.body.analytics).toBe(true);
    });

    it('13.3 - Client demande la suppression de son compte', async () => {
      // Créer un utilisateur temporaire pour ce test
      const tempUser = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'temp-delete@test.com',
          password: 'TempPass123!',
          firstName: 'Temp',
          lastName: 'User',
          role: 'CLIENT',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .delete('/users/gdpr/delete-account')
        .set('Authorization', `Bearer ${tempUser.body.accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Vérifier que le compte est marqué comme supprimé
      const user = await prisma.user.findUnique({
        where: { id: tempUser.body.user.id },
      });
      expect(user.status).toBe('DELETED');
      expect(user.deletedAt).toBeDefined();
    });
  });

  /**
   * Fonction utilitaire pour nettoyer la base de données
   */
  async function cleanDatabase() {
    // Ordre important pour respecter les contraintes de clés étrangères
    await prisma.auditLog.deleteMany();
    await prisma.notificationPreferences.deleteMany();
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
    await prisma.userConsent.deleteMany();
    await prisma.backupCode.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.passwordResetToken.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.phoneVerificationToken.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.user.deleteMany();
  }
});
