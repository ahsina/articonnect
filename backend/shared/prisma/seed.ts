import { PrismaClient, UserRole, MissionType, MissionStatus, ProductStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing data (development only)
  if (process.env.NODE_ENV === 'development') {
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
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@articonnect.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'ArtiConnect',
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
        password: await bcrypt.hash('Client123!', 12),
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
        password: await bcrypt.hash('Client123!', 12),
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
        password: await bcrypt.hash('Artisan123!', 12),
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
        password: await bcrypt.hash('Artisan123!', 12),
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
        password: await bcrypt.hash('Artisan123!', 12),
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

  // Create Sample Products
  console.log('🛒 Creating sample products...');
  const products = await Promise.all([
    prisma.product.create({
      data: {
        artisanId: artisans[0].id,
        name: 'Robinet de cuisine chromé',
        description: 'Robinet mitigeur en laiton chromé, garantie 5 ans',
        category: 'Sanitaire',
        photos: ['/products/robinet-1.jpg'],
        price: 89.99,
        vatRate: 17,
        stock: 15,
        sku: 'ROB-001',
        status: ProductStatus.ACTIVE,
      },
    }),
    prisma.product.create({
      data: {
        artisanId: artisans[2].id,
        name: 'Étagère murale en chêne',
        description: 'Étagère murale sur mesure en chêne massif, 80cm',
        category: 'Menuiserie',
        photos: ['/products/etagere-1.jpg'],
        price: 149.99,
        vatRate: 21,
        stock: 5,
        sku: 'ETG-001',
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

  console.log('✅ Seeding completed successfully!');
  console.log('');
  console.log('📧 Test Credentials:');
  console.log('');
  console.log('Admin:');
  console.log('  Email: admin@articonnect.com');
  console.log('  Password: Admin123!');
  console.log('');
  console.log('Client:');
  console.log('  Email: jean.dupont@example.com');
  console.log('  Password: Client123!');
  console.log('');
  console.log('Artisan:');
  console.log('  Email: pierre.plombier@example.com');
  console.log('  Password: Artisan123!');
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
