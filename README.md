# ArtiConnect - Plateforme de Mise en Relation Artisans-Clients

Une plateforme web et mobile (PWA) de type Uber pour mettre en relation des clients avec des artisans locaux.

## 📋 Fonctionnalités Principales

- ✅ **Authentification sécurisée** (JWT + 2FA)
- ✅ **Géolocalisation en temps réel** (Redis Geospatial)
- ✅ **Système de matching** clients-artisans
- ✅ **Négociation de prix** en temps réel
- ✅ **Marketplace** pour vente de produits
- ✅ **Paiement sécurisé** (Stripe Connect + Escrow)
- ✅ **Gestion TVA multi-pays** (LU, FR, BE)
- ✅ **Dashboard admin** complet
- ✅ **Système d'évaluation** et avis
- ✅ **Progressive Web App** (PWA)

## 🏗️ Architecture

### Backend
- **Framework**: NestJS (Node.js + TypeScript)
- **Base de données**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Paiements**: Stripe
- **Storage**: AWS S3

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **State**: Zustand + React Query
- **Maps**: Leaflet / Google Maps
- **PWA**: next-pwa + Capacitor

## 🚀 Installation

### Prérequis
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- MongoDB 7+ (pour chat)

### 1. Cloner le projet

```bash
git clone https://github.com/yourusername/articonnect.git
cd articonnect
```

### 2. Installer les dépendances

```bash
# Root
npm install

# Backend
cd backend/shared && npm install && cd ../..
cd backend/api-gateway && npm install && cd ../..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configuration

Copier `.env.example` vers `.env` et remplir les variables:

```bash
cp .env.example .env
```

Variables importantes:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: Secret pour JWT
- `STRIPE_SECRET_KEY`: Clé API Stripe
- `GOOGLE_MAPS_API_KEY`: Clé Google Maps

### 4. Base de données

```bash
# Générer Prisma client
cd backend/shared
npx prisma generate

# Lancer les migrations
npx prisma migrate dev

# (Optionnel) Seed data
npx prisma db seed

cd ../..
```

### 5. Démarrage avec Docker

```bash
# Lancer PostgreSQL, Redis, MongoDB
docker-compose up -d

# Vérifier que les services sont actifs
docker-compose ps
```

### 6. Lancer l'application

**Option 1: Développement séparé**

```bash
# Terminal 1 - Backend
cd backend/api-gateway
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Option 2: Développement concurrent**

```bash
# À la racine
npm run dev
```

L'application sera accessible sur:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/api/docs

## 📚 Documentation

- [Documentation Fonctionnelle](./DOCUMENTATION_FONCTIONNELLE.md) - Vue d'ensemble complète
- [Analyse de Sécurité](./ANALYSE_SECURITE.md) - Vulnérabilités et solutions
- [Architecture Technique](./ARCHITECTURE_TECHNIQUE.md) - Architecture détaillée

## 🧪 Tests

```bash
# Backend
cd backend/api-gateway
npm run test          # Tests unitaires
npm run test:e2e      # Tests end-to-end
npm run test:cov      # Coverage

# Frontend
cd frontend
npm run test
```

## 📦 Build & Déploiement

### Build

```bash
# Backend
cd backend/api-gateway
npm run build

# Frontend
cd frontend
npm run build
```

### Production

```bash
# Backend
npm run start:prod

# Frontend
npm run start
```

## 🔐 Sécurité

- ✅ HTTPS obligatoire
- ✅ Helmet.js (headers sécurisés)
- ✅ Rate limiting
- ✅ Validation stricte des inputs (Zod)
- ✅ Hashing bcrypt (12 rounds)
- ✅ JWT avec expiration courte
- ✅ 2FA (TOTP)
- ✅ RGPD compliant

## 📱 PWA

L'application est installable en tant que PWA:
1. Ouvrir l'app sur mobile (Chrome/Safari)
2. "Ajouter à l'écran d'accueil"
3. Fonctionnement offline partiel

## 🌍 Multi-pays

Taux de TVA supportés:
- 🇱🇺 Luxembourg: 17%
- 🇫🇷 France: 20%
- 🇧🇪 Belgique: 21%

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

Projet privé - Tous droits réservés

## 👥 Équipe

- **Développement**: ArtiConnect Team
- **Contact**: support@articonnect.com

## 🐛 Bugs & Support

Créer une issue sur GitHub ou contacter support@articonnect.com
