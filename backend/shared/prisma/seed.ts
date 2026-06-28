import { PrismaClient, UserRole, MissionType, MissionStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Generate secure random passwords for test users if not provided via environment
const getTestPassword = (envVar: string, defaultLength: number = 16): string => {
  return process.env[envVar] || randomBytes(defaultLength).toString('base64').slice(0, defaultLength) + '!Aa1';
};

// Test credentials (use environment variables in production, random in dev)
const TEST_PASSWORDS = {
  admin: getTestPassword('SEED_ADMIN_PASSWORD'),
  client: getTestPassword('SEED_CLIENT_PASSWORD'),
  artisan: getTestPassword('SEED_ARTISAN_PASSWORD'),
};

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (development, ou reset explicite via SEED_RESET=true)
  if (process.env.NODE_ENV === 'development' || process.env.SEED_RESET === 'true') {
    console.log('🗑️  Cleaning existing data...');
    await prisma.negotiation.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.review.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.mission.deleteMany();
    await prisma.message.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.savedArtisan.deleteMany();
    await prisma.certification.deleteMany();
    await prisma.address.deleteMany();
    await prisma.userConsent.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.backupCode.deleteMany();
    await prisma.clientProfile.deleteMany();
    await prisma.artisanProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.specialty.deleteMany();
    await prisma.category.deleteMany();
  }

  // Create Specialties
  console.log('🔧 Creating specialties...');
  const specialties = await Promise.all([
    prisma.specialty.create({
      data: {
        name: 'Plomberie',
        category: 'Sanitaire',
        description: 'Installation, réparation et entretien de plomberie',
        icon: '🔧',
      },
    }),
    prisma.specialty.create({
      data: {
        name: 'Électricité',
        category: 'Électrique',
        description: 'Installation électrique et dépannage',
        icon: '⚡',
      },
    }),
    prisma.specialty.create({
      data: {
        name: 'Menuiserie',
        category: 'Bois',
        description: 'Travaux de menuiserie et ébénisterie',
        icon: '🪚',
      },
    }),
    prisma.specialty.create({
      data: {
        name: 'Peinture',
        category: 'Finition',
        description: 'Peinture intérieure et extérieure',
        icon: '🎨',
      },
    }),
    prisma.specialty.create({
      data: {
        name: 'Serrurerie',
        category: 'Sécurité',
        description: 'Installation et dépannage de serrures',
        icon: '🔐',
      },
    }),
  ]);

  // Create Admin User
  console.log('👤 Creating admin user...');
  const hashedPassword = await bcrypt.hash(TEST_PASSWORDS.admin, 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@articonnect.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Krafolt',
      role: UserRole.ADMIN,
      emailVerified: true,
      consents: {
        create: {
          marketing: true,
          analytics: true,
          geolocation: true,
          ipAddress: '127.0.0.1',
        },
      },
    },
  });

  // Create Sample Clients
  console.log('👥 Creating sample clients...');
  const clients = await Promise.all([
    prisma.user.create({
      data: {
        email: 'jean.dupont@example.com',
        password: await bcrypt.hash(TEST_PASSWORDS.client, 12),
        firstName: 'Jean',
        lastName: 'Dupont',
        phone: '+352621123456',
        role: UserRole.CLIENT,
        emailVerified: true,
        clientProfile: {
          create: {
            addresses: {
              create: [
                {
                  label: 'Domicile',
                  street: '15 Rue de la Gare',
                  city: 'Luxembourg',
                  postalCode: '1234',
                  country: 'LU',
                  latitude: 49.6116,
                  longitude: 6.1319,
                  isDefault: true,
                },
              ],
            },
          },
        },
        consents: {
          create: {
            marketing: true,
            analytics: true,
            geolocation: true,
            ipAddress: '127.0.0.1',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'marie.martin@example.com',
        password: await bcrypt.hash(TEST_PASSWORDS.client, 12),
        firstName: 'Marie',
        lastName: 'Martin',
        phone: '+33612345678',
        role: UserRole.CLIENT,
        emailVerified: true,
        clientProfile: {
          create: {
            addresses: {
              create: [
                {
                  label: 'Appartement',
                  street: '25 Avenue des Champs',
                  city: 'Paris',
                  postalCode: '75008',
                  country: 'FR',
                  latitude: 48.8566,
                  longitude: 2.3522,
                  isDefault: true,
                },
              ],
            },
          },
        },
        consents: {
          create: {
            marketing: false,
            analytics: true,
            geolocation: true,
            ipAddress: '127.0.0.1',
          },
        },
      },
    }),
  ]);

  // Create Sample Artisans
  console.log('👷 Creating sample artisans...');
  const artisans = await Promise.all([
    prisma.user.create({
      data: {
        email: 'pierre.plombier@example.com',
        password: await bcrypt.hash(TEST_PASSWORDS.artisan, 12),
        firstName: 'Pierre',
        lastName: 'Lebon',
        phone: '+352621234567',
        role: UserRole.ARTISAN,
        emailVerified: true,
        artisanProfile: {
          create: {
            companyName: 'Plomberie Lebon',
            siret: '12345678901234',
            description: 'Expert en plomberie depuis 15 ans. Interventions rapides et efficaces.',
            baseAddress: '10 Rue de l\'Artisan, Luxembourg',
            latitude: 49.6116,
            longitude: 6.1319,
            serviceRadius: 30,
            hourlyRate: 60,
            emergencyRate: 90,
            rating: 4.8,
            reviewCount: 47,
            missionCount: 52,
            available: true,
            specialties: {
              connect: [{ id: specialties[0].id }], // Plomberie
            },
          },
        },
        consents: {
          create: {
            marketing: true,
            analytics: true,
            geolocation: true,
            ipAddress: '127.0.0.1',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'luc.electricien@example.com',
        password: await bcrypt.hash(TEST_PASSWORDS.artisan, 12),
        firstName: 'Luc',
        lastName: 'Durand',
        phone: '+33612987654',
        role: UserRole.ARTISAN,
        emailVerified: true,
        artisanProfile: {
          create: {
            companyName: 'Élec Durand',
            siret: '98765432109876',
            description: 'Électricien qualifié, installations et dépannages électriques.',
            baseAddress: '5 Boulevard Voltaire, Paris',
            latitude: 48.8566,
            longitude: 2.3522,
            serviceRadius: 25,
            hourlyRate: 65,
            emergencyRate: 95,
            rating: 4.6,
            reviewCount: 33,
            missionCount: 38,
            available: true,
            specialties: {
              connect: [{ id: specialties[1].id }], // Électricité
            },
          },
        },
        consents: {
          create: {
            marketing: true,
            analytics: true,
            geolocation: true,
            ipAddress: '127.0.0.1',
          },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: 'sophie.menuisier@example.com',
        password: await bcrypt.hash(TEST_PASSWORDS.artisan, 12),
        firstName: 'Sophie',
        lastName: 'Carpentier',
        phone: '+32487654321',
        role: UserRole.ARTISAN,
        emailVerified: true,
        artisanProfile: {
          create: {
            companyName: 'Menuiserie Carpentier',
            siret: '45678901234567',
            description: 'Menuiserie sur mesure, meubles et aménagements intérieurs.',
            baseAddress: '15 Rue des Artisans, Bruxelles',
            latitude: 50.8503,
            longitude: 4.3517,
            serviceRadius: 20,
            hourlyRate: 55,
            rating: 4.9,
            reviewCount: 28,
            missionCount: 30,
            available: true,
            specialties: {
              connect: [{ id: specialties[2].id }], // Menuiserie
            },
          },
        },
        consents: {
          create: {
            marketing: false,
            analytics: true,
            geolocation: true,
            ipAddress: '127.0.0.1',
          },
        },
      },
    }),
  ]);

  // Create Sample Missions
  console.log('📋 Creating sample missions...');
  const missions = await Promise.all([
    prisma.mission.create({
      data: {
        clientId: clients[0].id,
        artisanId: artisans[0].id,
        type: MissionType.EMERGENCY,
        status: MissionStatus.COMPLETED,
        title: 'Fuite d\'eau urgente',
        description: 'Fuite importante sous l\'évier de la cuisine',
        category: 'Plomberie',
        address: '15 Rue de la Gare',
        city: 'Luxembourg',
        postalCode: '1234',
        country: 'LU',
        latitude: 49.6116,
        longitude: 6.1319,
        clientBudget: 150,
        artisanQuote: 180,
        agreedPrice: 170,
        finalPrice: 170,
        vatRate: 17,
        totalAmount: 198.9,
        acceptedAt: new Date('2024-01-15'),
        startedAt: new Date('2024-01-15'),
        completedAt: new Date('2024-01-15'),
      },
    }),
    prisma.mission.create({
      data: {
        clientId: clients[1].id,
        artisanId: artisans[1].id,
        type: MissionType.SCHEDULED,
        status: MissionStatus.IN_PROGRESS,
        title: 'Installation prises électriques',
        description: 'Installation de 5 prises électriques dans le salon',
        category: 'Électricité',
        address: '25 Avenue des Champs',
        city: 'Paris',
        postalCode: '75008',
        country: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        scheduledFor: new Date('2024-02-01'),
        clientBudget: 300,
        agreedPrice: 280,
        vatRate: 20,
        totalAmount: 336,
        acceptedAt: new Date('2024-01-20'),
        startedAt: new Date('2024-02-01'),
      },
    }),
    prisma.mission.create({
      data: {
        clientId: clients[0].id,
        type: MissionType.QUOTE,
        status: MissionStatus.PENDING,
        title: 'Rénovation salle de bain',
        description: 'Rénovation complète d\'une salle de bain de 6m²',
        category: 'Plomberie',
        address: '15 Rue de la Gare',
        city: 'Luxembourg',
        postalCode: '1234',
        country: 'LU',
        latitude: 49.6116,
        longitude: 6.1319,
        clientBudget: 5000,
        vatRate: 17,
      },
    }),
  ]);

  // Create Product Categories
  console.log('🗂️  Creating product categories...');
  const slugify = (str: string): string =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const productCategoryNames = [
    'Plomberie', 'Sanitaire', 'Sécurité', 'Électricité', 'Électrique',
    'Bois', 'Finition', 'equipment', 'furniture', 'lighting', 'tools',
  ];
  const categoryMap: Record<string, string> = {};
  for (const name of productCategoryNames) {
    const cat = await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: { name, slug: slugify(name) },
    });
    categoryMap[name] = cat.id;
  }

  // Create Sample Products
  console.log('🛒 Creating sample products...');
  const products = await Promise.all([
    // Plomberie (artisan 0)
    prisma.product.create({
      data: {
        artisanId: artisans[0].id,
        name: 'Kit robinetterie premium salle de bain',
        description: `Kit complet de robinetterie haut de gamme pour salle de bain.

Contenu du kit:
• Robinet lavabo avec bec cascade
• Robinet douche thermostatique
• Pommeau de douche à effet pluie
• Flexible de douche 1,5m

Caractéristiques:
• Finition chromée brillante
• Garantie 10 ans
• Économie d'eau 30%
• Installation facile`,
        categoryId: categoryMap['tools'],
        photos: ['https://images.unsplash.com/photo-1585821569331-f071db2abd8d?w=800'],
        price: 349.99,
        vatRate: 17,
        stock: 15,
        sku: 'ROB-KIT-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[0].id,
        name: 'Chauffe-eau électrique 100L',
        description: `Chauffe-eau électrique vertical mural 100 litres.

Caractéristiques:
• Capacité: 100L
• Puissance: 2000W
• Temps de chauffe: 3h30
• Thermostat réglable 30-75°C
• Garantie 5 ans`,
        categoryId: categoryMap['equipment'],
        photos: ['https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=800'],
        price: 459.00,
        vatRate: 17,
        stock: 8,
        sku: 'CE-100L-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[0].id,
        name: 'Radiateur sèche-serviettes électrique',
        description: `Radiateur sèche-serviettes électrique design.

Performance:
• Puissance: 750W
• Thermostat digital programmable
• Mode boost séchage rapide
• Dimensions: 60 x 120 cm
• Garantie 3 ans`,
        categoryId: categoryMap['equipment'],
        photos: ['https://images.unsplash.com/photo-1585128792301-dba8e345a4ff?w=800'],
        price: 299.00,
        vatRate: 17,
        stock: 10,
        sku: 'RAD-SS-001',
        status: ProductStatus.ACTIVE,
      },
    }),

    // Électricité (artisan 1)
    prisma.product.create({
      data: {
        artisanId: artisans[1].id,
        name: 'Lustre LED design moderne',
        description: `Lustre LED design contemporain pour salon ou salle à manger.

Design:
• Style minimaliste et élégant
• Structure en aluminium brossé
• Diffuseur en verre opale

Éclairage:
• LED 40W (équivalent 200W)
• 3200 lumens
• Blanc chaud 3000K
• Intensité variable avec télécommande
• Garantie 3 ans`,
        categoryId: categoryMap['lighting'],
        photos: ['https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800'],
        price: 289.00,
        vatRate: 17,
        stock: 12,
        sku: 'LUS-LED-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[1].id,
        name: 'Pack domotique complet',
        description: `Solution domotique complète pour maison connectée.

Contenu:
• Hub central Zigbee/WiFi
• 10 prises connectées
• 5 ampoules LED connectées E27
• 3 détecteurs de mouvement
• Télécommande universelle

Compatible Alexa et Google Home`,
        categoryId: categoryMap['equipment'],
        photos: ['https://images.unsplash.com/photo-1558002038-1055907df827?w=800'],
        price: 599.00,
        vatRate: 17,
        stock: 5,
        sku: 'DOM-PACK-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[1].id,
        name: 'Appliques murales LED (paire)',
        description: `Paire d'appliques murales LED design moderne.

Caractéristiques:
• Design up/down
• LED 2x12W
• Blanc chaud 2700K
• IP44 (extérieur couvert)
• Garantie 2 ans`,
        categoryId: categoryMap['lighting'],
        photos: ['https://images.unsplash.com/photo-1550854180-70f368eae657?w=800'],
        price: 129.00,
        vatRate: 17,
        stock: 20,
        sku: 'APP-LED-001',
        status: ProductStatus.ACTIVE,
      },
    }),

    // Menuiserie (artisan 2)
    prisma.product.create({
      data: {
        artisanId: artisans[2].id,
        name: 'Table en chêne massif artisanale',
        description: `Magnifique table en chêne massif fabriquée à la main.

Fabrication artisanale:
• Chêne massif européen certifié FSC
• Assemblage traditionnel
• Finition huile naturelle
• Chaque table est unique

Caractéristiques:
• Épaisseur plateau: 4cm
• Garantie 10 ans
• Livraison et installation possibles`,
        categoryId: categoryMap['furniture'],
        photos: ['https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800'],
        price: 850.00,
        vatRate: 17,
        stock: 3,
        sku: 'TAB-CHE-001',
        status: ProductStatus.ACTIVE,
        variants: {
          create: [
            {
              name: 'Petite (120x80cm)',
              priceAdjustment: -100,
              stock: 5,
            },
            {
              name: 'Moyenne (160x90cm)',
              priceAdjustment: 0,
              stock: 3,
            },
            {
              name: 'Grande (200x100cm)',
              priceAdjustment: 200,
              stock: 2,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[2].id,
        name: 'Bibliothèque sur mesure',
        description: `Bibliothèque en bois massif, réalisée sur mesure.

Design personnalisable:
• Dimensions adaptées à votre espace
• Choix du bois (chêne, noyer, hêtre)
• Nombre d'étagères modulable
• Finition au choix

Délai de fabrication: 4-6 semaines
Livraison et installation incluses`,
        categoryId: categoryMap['furniture'],
        photos: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800'],
        price: 1250.00,
        vatRate: 17,
        stock: 0,
        sku: 'BIB-SUR-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[2].id,
        name: 'Set de 4 chaises design scandinave',
        description: `Lot de 4 chaises au design scandinave épuré.

Design:
• Lignes épurées et élégantes
• Style scandinave authentique
• Hêtre massif naturel
• Assise ergonomique

Qualité:
• Assemblage par tourillons
• Finition vernis mat
• Empilables
• Garantie 5 ans`,
        categoryId: categoryMap['furniture'],
        photos: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=800'],
        price: 380.00,
        vatRate: 17,
        stock: 8,
        sku: 'CHA-SCA-004',
        status: ProductStatus.ACTIVE,
      },
    }),
  ]);

  // Create Sample Reviews
  console.log('⭐ Creating sample reviews...');
  await prisma.review.create({
    data: {
      missionId: missions[0].id,
      reviewerId: clients[0].id,
      reviewedId: artisans[0].id,
      overallRating: 5,
      qualityRating: 5,
      punctualityRating: 5,
      communicationRating: 4,
      valueRating: 5,
      comment: 'Excellent travail ! Intervention très rapide et professionnelle. Je recommande vivement.',
      verified: true,
    },
  });

  // Démo : créer la config anti-fraude avec la détection multi-comptes désactivée
  // (sinon les connexions des comptes de démo depuis une même IP sont bloquées en 403).
  const existingFraudCfg = await prisma.fraudProtectionConfig.findFirst();
  if (!existingFraudCfg) {
    await prisma.fraudProtectionConfig.create({
      data: {
        multiAccountDetectionEnabled: false,
        sessionAnomalyDetectionEnabled: false,
        botDetectionEnabled: false,
        payoutFraudScreeningEnabled: false,
      },
    }).catch(() => undefined);
  } else {
    await prisma.fraudProtectionConfig.updateMany({
      data: {
        multiAccountDetectionEnabled: false,
        sessionAnomalyDetectionEnabled: false,
        botDetectionEnabled: false,
        payoutFraudScreeningEnabled: false,
      },
    }).catch(() => undefined);
  }

  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('📧 Test accounts created:');
  console.log('');
  console.log('Admin:    admin@articonnect.com');
  console.log('Client:   jean.dupont@example.com');
  console.log('Artisan:  pierre.plombier@example.com');
  console.log('');
  if (process.env.SEED_ADMIN_PASSWORD || process.env.SEED_CLIENT_PASSWORD || process.env.SEED_ARTISAN_PASSWORD) {
    console.log('ℹ️  Passwords were set via environment variables');
  } else {
    console.log('⚠️  Random passwords generated. Set SEED_ADMIN_PASSWORD, SEED_CLIENT_PASSWORD,');
    console.log('   and SEED_ARTISAN_PASSWORD environment variables for consistent credentials.');
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
