# ArtiConnect - Plateforme de Mise en Relation Artisans-Clients

Une plateforme web et mobile (PWA) de type Uber pour mettre en relation des clients avec des artisans locaux au Luxembourg, en France et en Belgique.

[![CI/CD](https://github.com/yourusername/articonnect/workflows/CI/badge.svg)](https://github.com/yourusername/articonnect/actions)
[![License](https://img.shields.io/badge/license-Private-red.svg)](LICENSE)

## 📋 Fonctionnalités Principales

### Pour les Clients
- 🔍 **Recherche d'artisans** par spécialité, localisation et rating
- 📝 **Création de missions** (urgentes ou programmées)
- 💬 **Chat en temps réel** avec les artisans
- 💰 **Négociation de prix** directe
- ⭐ **Système d'évaluation** et d'avis
- 🛒 **Marketplace** pour acheter des produits d'artisans
- 📱 **Notifications push** pour les updates importantes
- 📍 **Géolocalisation** pour trouver les artisans les plus proches

### Pour les Artisans
- 📋 **Réception de missions** selon la localisation et spécialités
- 💼 **Gestion de profil** professionnel complet
- 📊 **Dashboard** avec statistiques et revenus
- 🗺️ **Rayon d'intervention** configurable
- 🏪 **Boutique en ligne** pour vendre des produits
- 💳 **Paiements sécurisés** via Stripe Connect
- ⚡ **Notifications temps réel** pour nouvelles missions

### Pour les Administrateurs
- 👥 **Gestion des utilisateurs** (suspension, activation)
- 📈 **Analytics** détaillées (revenus, missions, utilisateurs)
- 🔍 **Modération** des avis et contenus
- 💰 **Suivi des commissions** de la plateforme
- 📊 **Rapports** multi-critères

## 🏗️ Architecture

### Backend (NestJS)
```
backend/
├── api-gateway/          # API principale
│   ├── src/
│   │   ├── auth/         # Authentification (JWT + 2FA)
│   │   ├── user/         # Gestion utilisateurs
│   │   ├── mission/      # Gestion missions
│   │   ├── geo/          # Géolocalisation (Redis)
│   │   ├── payment/      # Paiements Stripe
│   │   ├── marketplace/  # E-commerce
│   │   ├── admin/        # Dashboard admin
│   │   ├── chat/         # Messagerie WebSocket
│   │   └── notification/ # Système notifications
│   └── test/             # Tests E2E
└── shared/
    └── prisma/           # Schema & migrations
```

**Stack:**
- Framework: NestJS 10
- Base de données: PostgreSQL 15 + Prisma ORM
- Cache & Geo: Redis 7
- Messagerie: MongoDB + Socket.io
- Paiements: Stripe Connect
- Storage: AWS S3 (avatars, images)

### Frontend (Next.js 14)
```
frontend/
├── app/
│   ├── (auth)/           # Pages authentification
│   ├── client/           # Interface client
│   ├── artisan/          # Interface artisan
│   ├── admin/            # Interface admin
│   └── layout.tsx
├── components/
│   ├── ui/               # Composants réutilisables
│   ├── chat/             # Composants chat
│   ├── reviews/          # Système avis
│   ├── notifications/    # Bell notifications
│   └── map/              # Carte interactive
└── lib/
    ├── api/              # API clients
    └── hooks/            # Custom hooks
```

**Stack:**
- Framework: Next.js 14 (App Router)
- UI: Tailwind CSS + shadcn/ui + Radix UI
- State: React Query + Context API (Auth)
- WebSocket: Socket.io-client (chat temps réel)
- Forms: React Hook Form + Zod validation
- Notifications: Custom Toast system
- PWA: next-pwa + Service Worker

## ✨ Nouvelles Fonctionnalités (Janvier 2025)

### Authentification Complète
- ✅ **Pages de connexion et inscription** avec validation côté client
- ✅ **Sélection de rôle** (Client/Artisan) lors de l'inscription
- ✅ **AuthContext** pour gestion globale de l'état utilisateur
- ✅ **Protection des routes** avec redirection automatique selon le rôle
- ✅ **Changement de mot de passe** avec vérification de l'ancien mot de passe
- ✅ **Révocation des tokens** après changement de mot de passe (sécurité)

### Upload d'Avatar
- ✅ **Upload d'avatar** avec validation (JPEG, PNG, GIF, WebP, max 5MB)
- ✅ **Preview en temps réel** avec indicateur de chargement
- ✅ **Optimisation d'images** côté backend

### Messagerie Temps Réel
- ✅ **Socket.IO intégré** pour chat en temps réel
- ✅ **Indicateur de connexion** (En ligne/Hors ligne)
- ✅ **Messages instantanés** avec mise à jour optimiste
- ✅ **Notifications toast** pour erreurs et succès

### Système de Notifications
- ✅ **Toast notifications** avec Radix UI
- ✅ **Auto-dismiss** après 5 secondes
- ✅ **Variants**: success, error, default
- ✅ **Maximum 5 toasts** simultanés

## 🚀 Installation Rapide

### Prérequis
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- MongoDB 7+ (pour le chat)
- npm 10+

### 1. Cloner et installer

```bash
git clone https://github.com/yourusername/articonnect.git
cd articonnect
npm install
```

### 2. Configuration Backend

Copier `backend/.env.example` vers `backend/.env` et remplir:

```env
# Database
DATABASE_URL="postgresql://articonnect:password@localhost:5432/articonnect"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRATION="15m"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
JWT_REFRESH_EXPIRATION="30d"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# MongoDB (Chat)
MONGODB_URI="mongodb://localhost:27017/articonnect"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (SendGrid)
SENDGRID_API_KEY="SG...."
EMAIL_FROM="noreply@articonnect.com"

# AWS S3
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="articonnect-uploads"

# Google Maps
GOOGLE_MAPS_API_KEY="your-google-maps-key"

# Application
PORT="3001"
NODE_ENV="development"
```

### 3. Configuration Frontend

Copier `frontend/.env.example` vers `frontend/.env.local`:

```env
# API URLs
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"

# Stripe
NEXT_PUBLIC_STRIPE_PUBLIC_KEY="pk_test_..."

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-key"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Base de données

```bash
# Générer Prisma client
npm run prisma:generate

# Lancer les migrations
npm run prisma:migrate

# (Optionnel) Données de test
cd backend/shared
npx prisma db seed
```

### 5. Démarrer avec Docker

```bash
# Lancer PostgreSQL, Redis, MongoDB
docker-compose up -d

# Vérifier les services
docker-compose ps
```

### 6. Lancer l'application

```bash
# Démarrage concurrent backend + frontend
npm run dev
```

Accès:
- 🌐 **Frontend**: http://localhost:3000
- 🔌 **API**: http://localhost:4000
- 📚 **Swagger**: http://localhost:4000/api/docs

## 👤 Comptes de Test

Après le seed, vous pouvez utiliser ces comptes:

**Client 1:**
```
Email: jean.dupont@example.com
Password: Client123!
```

**Client 2:**
```
Email: sophie.martin@example.com
Password: Client123!
```

**Artisan 1 (Plombier):**
```
Email: marc.plombier@example.com
Password: Artisan123!
```

**Artisan 2 (Électricien):**
```
Email: pierre.electricien@example.com
Password: Artisan123!
```

**Artisan 3 (Multi-services):**
```
Email: claude.multiservices@example.com
Password: Artisan123!
```

**Administrateur:**
```
Email: admin@articonnect.com
Password: Admin123!
```

## 🔌 API Endpoints Principaux

### Authentification (`/auth`)
```typescript
POST   /auth/register          // Inscription (Client/Artisan)
POST   /auth/login             // Connexion (retourne JWT)
POST   /auth/logout            // Déconnexion
POST   /auth/refresh           // Refresh token
POST   /auth/change-password   // Changement de mot de passe
POST   /auth/2fa/enable        // Activer 2FA
POST   /auth/2fa/verify        // Vérifier code 2FA
```

### Utilisateurs (`/users`)
```typescript
GET    /users/profile          // Obtenir profil utilisateur
PUT    /users/profile          // Mettre à jour profil
POST   /users/avatar           // Upload avatar (multipart/form-data)
POST   /users/artisan-profile  // Créer profil artisan
GET    /users/artisans         // Liste des artisans
GET    /users/artisans/:id     // Détails artisan
```

### Missions (`/missions`)
```typescript
GET    /missions               // Liste missions (filtres: status, type)
POST   /missions               // Créer mission
GET    /missions/:id           // Détails mission
PUT    /missions/:id           // Mettre à jour mission
POST   /missions/:id/accept    // Accepter mission (artisan)
POST   /missions/:id/complete  // Compléter mission
POST   /missions/:id/cancel    // Annuler mission
```

### Chat (`/chat`)
```typescript
GET    /chat/conversations     // Liste conversations
GET    /chat/conversation/:userId    // Messages avec utilisateur
POST   /chat/conversation/:userId/read  // Marquer comme lu
DELETE /chat/message/:id       // Supprimer message
```

**WebSocket Events:**
```typescript
// Écouter
socket.on('message', (data) => {...})
socket.on('message-read', (data) => {...})
socket.on('typing', (data) => {...})

// Émettre
socket.emit('send-message', { receiverId, content })
socket.emit('typing', { receiverId })
```

### Marketplace (`/marketplace`)
```typescript
GET    /marketplace/products   // Liste produits
POST   /marketplace/products   // Créer produit (artisan)
PUT    /marketplace/products/:id  // Modifier produit
DELETE /marketplace/products/:id  // Supprimer produit
GET    /marketplace/orders     // Commandes
PUT    /marketplace/orders/:id // Mettre à jour statut commande
```

### Paiements (`/payments`)
```typescript
POST   /payments/create-intent      // Créer PaymentIntent Stripe
POST   /payments/confirm            // Confirmer paiement
POST   /payments/webhook            // Webhook Stripe
GET    /payments/history            // Historique paiements
```

### Admin (`/admin`)
```typescript
GET    /admin/users            // Tous les utilisateurs
PUT    /admin/users/:id/suspend    // Suspendre utilisateur
GET    /admin/stats            // Statistiques plateforme
GET    /admin/analytics        // Analytics détaillées
```

**Authentication:** Tous les endpoints (sauf `/auth/login` et `/auth/register`) nécessitent un header `Authorization: Bearer <token>`.

**Swagger Documentation:** Disponible sur `http://localhost:3001/api/docs` en développement.

## 📚 Documentation Complète

- [Documentation Fonctionnelle](./DOCUMENTATION_FONCTIONNELLE.md) - Vue d'ensemble complète (6,700+ mots)
- [Analyse de Sécurité](./ANALYSE_SECURITE.md) - OWASP Top 10 et solutions (10,000+ mots)
- [Architecture Technique](./ARCHITECTURE_TECHNIQUE.md) - Architecture détaillée
- [Guide de Déploiement](./DEPLOYMENT.md) - Déploiement AWS complet
- [Guide de Contribution](./CONTRIBUTING.md) - Standards et conventions

## 🧪 Tests

### Backend

```bash
cd backend/api-gateway

# Tests unitaires
npm run test

# Tests E2E (nécessite PostgreSQL + Redis)
npm run test:e2e

# Coverage
npm run test:cov

# Watch mode
npm run test:watch
```

**Coverage actuel:** ~75% (auth, mission, payment modules)

### Frontend

```bash
cd frontend

# Tests unitaires
npm run test

# Tests avec coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Tests de charge

```bash
# Avec k6
k6 run scripts/load-tests/mission-creation.js
```

## 📦 Build & Déploiement

### Build Local

```bash
# Build tout le projet
npm run build

# Build backend uniquement
npm run build:backend

# Build frontend uniquement
npm run build:frontend
```

### Docker Production

```bash
# Build images Docker
docker-compose -f docker-compose.prod.yml build

# Lancer en production
docker-compose -f docker-compose.prod.yml up -d

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Déploiement AWS

```bash
# Configurer AWS CLI
aws configure

# Déployer avec Terraform
cd infrastructure/terraform
terraform init
terraform plan
terraform apply

# Ou utiliser le script
./scripts/deploy-aws.sh production
```

## 🔐 Sécurité

### Mesures Implémentées

- ✅ **HTTPS obligatoire** - TLS 1.3 avec certificats Let's Encrypt
- ✅ **Helmet.js** - Headers HTTP sécurisés (HSTS, CSP, X-Frame-Options)
- ✅ **Rate Limiting** - 10 req/s général, 5 req/min pour login
- ✅ **Validation stricte** - Zod pour tous les inputs
- ✅ **Hashing bcrypt** - 12 rounds pour les mots de passe
- ✅ **JWT courte durée** - 15 min accessToken, 30j refreshToken
- ✅ **2FA (TOTP)** - Authentification deux facteurs pour artisans
- ✅ **RGPD compliant** - Export données, droit à l'oubli
- ✅ **SQL Injection** - Protection Prisma ORM
- ✅ **XSS Protection** - Sanitization des inputs
- ✅ **CSRF Protection** - Tokens CSRF pour mutations

### Audit de Sécurité

```bash
# Audit npm
npm audit

# Audit avec Snyk
snyk test

# Scan OWASP ZAP
zap-cli quick-scan http://localhost:3000
```

## 📱 Progressive Web App

### Fonctionnalités PWA

- ✅ **Installation** - Ajout à l'écran d'accueil (Android/iOS)
- ✅ **Offline Mode** - Service Worker avec stratégies de cache
- ✅ **Push Notifications** - Notifications pour missions et messages
- ✅ **Background Sync** - Synchronisation en arrière-plan
- ✅ **App Shell** - Chargement instantané
- ✅ **Responsive** - Design adaptatif mobile-first

### Installation PWA

**Android (Chrome):**
1. Ouvrir https://articonnect.com sur Chrome
2. Cliquer sur le menu (⋮) → "Installer l'application"

**iOS (Safari):**
1. Ouvrir https://articonnect.com sur Safari
2. Toucher le bouton Partager
3. "Ajouter à l'écran d'accueil"

## 🌍 Multi-pays & Internationalisation

### Pays Supportés

| Pays | Code | TVA | Devise | Lancement |
|------|------|-----|--------|-----------|
| 🇱🇺 Luxembourg | LU | 17% | EUR | Q1 2024 |
| 🇫🇷 France | FR | 20% | EUR | Q2 2024 |
| 🇧🇪 Belgique | BE | 21% | EUR | Q2 2024 |

### Villes Pilotes

- **Luxembourg**: Luxembourg-Ville, Esch-sur-Alzette, Differdange
- **France**: Metz, Strasbourg, Nancy
- **Belgique**: Arlon, Liège

## 📊 Performances

### Métriques Cibles

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Time to Interactive**: < 3.8s
- **API Response Time**: < 200ms (p95)

### Optimisations

- ✅ Code splitting automatique (Next.js)
- ✅ Image optimization (next/image)
- ✅ Static generation pour pages publiques
- ✅ Redis caching pour queries fréquentes
- ✅ CDN pour assets statiques
- ✅ Database indexing (Prisma)
- ✅ Connection pooling (PostgreSQL)

## 🛠️ Scripts Utilitaires

```bash
# Nettoyage
npm run clean              # Nettoyer node_modules, dist, caches

# Base de données
npm run prisma:studio      # Interface UI Prisma
npm run prisma:reset       # Reset DB (⚠️ données perdues)
npm run db:backup          # Backup PostgreSQL
npm run db:restore         # Restore backup

# Docker
npm run docker:up          # Démarrer services Docker
npm run docker:down        # Arrêter services Docker
npm run docker:logs        # Voir logs Docker
npm run docker:reset       # Reset volumes Docker

# Développement
npm run dev                # Dev backend + frontend
npm run dev:backend        # Dev backend uniquement
npm run dev:frontend       # Dev frontend uniquement
npm run format             # Formatter code (Prettier)
npm run lint               # Linter code (ESLint)
```

## 🔧 Dépannage

### Problèmes Courants

**1. Erreur Prisma Client**
```bash
cd backend/shared
npx prisma generate
```

**2. Port déjà utilisé**
```bash
# Libérer port 4000 (backend)
lsof -ti:4000 | xargs kill -9

# Libérer port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

**3. Redis connection failed**
```bash
# Vérifier Redis
redis-cli ping

# Redémarrer Redis
docker-compose restart redis
```

**4. PostgreSQL connection failed**
```bash
# Vérifier PostgreSQL
docker-compose ps postgres

# Voir logs
docker-compose logs postgres
```

## 🤝 Contribution

Nous acceptons les contributions ! Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour les détails.

### Workflow

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit avec conventional commits (`git commit -m 'feat: Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request
6. Attendre review et CI/CD

### Conventional Commits

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatage
- `refactor:` Refactoring
- `test:` Tests
- `chore:` Tâches diverses

## 📄 Licence

Projet privé - Tous droits réservés © 2024 ArtiConnect

## 👥 Équipe

- **Product Owner**: [Nom]
- **Tech Lead**: [Nom]
- **Backend Developers**: [Noms]
- **Frontend Developers**: [Noms]
- **DevOps Engineer**: [Nom]
- **UI/UX Designer**: [Nom]

## 📞 Contact & Support

- 📧 **Email**: support@articonnect.com
- 💬 **Discord**: [Lien serveur Discord]
- 🐛 **Bugs**: [GitHub Issues](https://github.com/yourusername/articonnect/issues)
- 📖 **Docs**: https://docs.articonnect.com
- 🌐 **Website**: https://articonnect.com

## 🎯 Roadmap

### Q1 2024
- [x] MVP Backend complet
- [x] MVP Frontend complet
- [x] Système de paiement
- [x] Chat temps réel
- [ ] Tests complets (80%+ coverage)
- [ ] Déploiement production

### Q2 2024
- [ ] Application mobile native (React Native)
- [ ] Système de facturation automatique
- [ ] Analytics avancés
- [ ] Multi-langues (FR, EN, DE)
- [ ] Expansion France et Belgique

### Q3 2024
- [ ] Programme de fidélité
- [ ] Assurance missions
- [ ] Intégration calendrier (Google, Outlook)
- [ ] Système de parrainage
- [ ] API publique pour partenaires

---

**Développé avec ❤️ par l'équipe ArtiConnect**
