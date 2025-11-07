import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SPECIALTIES = [
  // Construction
  { name: 'Maçonnerie', category: 'Construction', description: 'Construction et réparation de murs, fondations', icon: '🧱' },
  { name: 'Charpente', category: 'Construction', description: 'Installation et réparation de charpentes', icon: '🏗️' },
  { name: 'Couverture', category: 'Construction', description: 'Pose et réparation de toitures', icon: '🏠' },

  // Plomberie & Chauffage
  { name: 'Plomberie', category: 'Plomberie & Chauffage', description: 'Installation et réparation de systèmes de plomberie', icon: '🔧' },
  { name: 'Chauffage', category: 'Plomberie & Chauffage', description: 'Installation et maintenance de systèmes de chauffage', icon: '🔥' },
  { name: 'Climatisation', category: 'Plomberie & Chauffage', description: 'Installation et entretien de climatisation', icon: '❄️' },

  // Électricité
  { name: 'Électricité générale', category: 'Électricité', description: 'Installation électrique et mise aux normes', icon: '⚡' },
  { name: 'Domotique', category: 'Électricité', description: 'Installation de systèmes domotiques intelligents', icon: '🏡' },
  { name: 'Antennes & Paraboles', category: 'Électricité', description: 'Installation d\'antennes TV et paraboles', icon: '📡' },

  // Menuiserie
  { name: 'Menuiserie bois', category: 'Menuiserie', description: 'Fabrication et pose de menuiseries en bois', icon: '🪵' },
  { name: 'Menuiserie aluminium', category: 'Menuiserie', description: 'Pose de fenêtres et portes en aluminium', icon: '🪟' },
  { name: 'Menuiserie PVC', category: 'Menuiserie', description: 'Installation de menuiseries PVC', icon: '🚪' },
  { name: 'Agencement intérieur', category: 'Menuiserie', description: 'Création de placards, dressings, cuisines', icon: '🗄️' },

  // Finition
  { name: 'Peinture', category: 'Finition', description: 'Peinture intérieure et extérieure', icon: '🎨' },
  { name: 'Revêtements de sol', category: 'Finition', description: 'Pose de parquet, carrelage, moquette', icon: '🟫' },
  { name: 'Carrelage', category: 'Finition', description: 'Pose de carrelage mural et au sol', icon: '⬜' },
  { name: 'Plâtrerie', category: 'Finition', description: 'Pose et finition de plâtre', icon: '🧰' },
  { name: 'Papier peint', category: 'Finition', description: 'Pose de papier peint et revêtements muraux', icon: '📜' },

  // Isolation
  { name: 'Isolation thermique', category: 'Isolation', description: 'Isolation des combles, murs, sols', icon: '🧊' },
  { name: 'Isolation phonique', category: 'Isolation', description: 'Insonorisation et isolation acoustique', icon: '🔇' },

  // Extérieur & Jardin
  { name: 'Terrassement', category: 'Extérieur & Jardin', description: 'Travaux de terrassement et nivellement', icon: '🚜' },
  { name: 'Aménagement paysager', category: 'Extérieur & Jardin', description: 'Création et entretien d\'espaces verts', icon: '🌳' },
  { name: 'Clôtures & Portails', category: 'Extérieur & Jardin', description: 'Installation de clôtures et portails', icon: '🚧' },
  { name: 'Terrasses & Dallages', category: 'Extérieur & Jardin', description: 'Construction de terrasses en bois, composite', icon: '🪵' },
  { name: 'Piscines', category: 'Extérieur & Jardin', description: 'Installation et rénovation de piscines', icon: '🏊' },

  // Serrurerie & Métallerie
  { name: 'Serrurerie', category: 'Serrurerie & Métallerie', description: 'Installation et dépannage serrures', icon: '🔐' },
  { name: 'Métallerie', category: 'Serrurerie & Métallerie', description: 'Fabrication et pose d\'ouvrages métalliques', icon: '⚙️' },
  { name: 'Ferronnerie', category: 'Serrurerie & Métallerie', description: 'Création de garde-corps, rampes, grilles', icon: '🔨' },

  // Vitrerie
  { name: 'Vitrerie', category: 'Vitrerie', description: 'Pose et remplacement de vitres', icon: '🪟' },
  { name: 'Miroiterie', category: 'Vitrerie', description: 'Installation de miroirs et parois vitrées', icon: '🪞' },

  // Nettoyage & Entretien
  { name: 'Nettoyage', category: 'Nettoyage & Entretien', description: 'Nettoyage après travaux, entretien', icon: '🧹' },
  { name: 'Ramonage', category: 'Nettoyage & Entretien', description: 'Ramonage de cheminées et conduits', icon: '🧯' },

  // Rénovation énergétique
  { name: 'Pompes à chaleur', category: 'Rénovation énergétique', description: 'Installation de pompes à chaleur', icon: '♨️' },
  { name: 'Panneaux solaires', category: 'Rénovation énergétique', description: 'Installation de panneaux photovoltaïques', icon: '☀️' },
  { name: 'VMC', category: 'Rénovation énergétique', description: 'Installation de ventilation mécanique', icon: '💨' },
];

async function main() {
  console.log('🌱 Seeding specialties...');

  for (const specialty of SPECIALTIES) {
    await prisma.specialty.upsert({
      where: { name: specialty.name },
      update: specialty,
      create: specialty,
    });
  }

  console.log(`✅ Created ${SPECIALTIES.length} specialties`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding specialties:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
