# ArtiConnect - Architecture Technique

## 📐 Vue d'Ensemble

Architecture microservices moderne, scalable et sécurisée pour la plateforme ArtiConnect.

---

## 🏗️ Stack Technologique

### Backend
- **Runtime**: Node.js 20 LTS (TypeScript)
- **Framework**: NestJS (architecture modulaire, DI, décorateurs)
- **ORM**: Prisma (type-safe, migrations, génération de types)
- **Bases de données**:
  - PostgreSQL 15 (données relationnelles)
  - Redis 7 (cache, sessions, queues)
  - MongoDB (logs, chat en temps réel)
- **API**: REST + GraphQL + WebSocket (Socket.io)
- **Validation**: Zod / class-validator
- **Tests**: Jest + Supertest

### Frontend Web
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State Management**: Zustand + React Query (server state)
- **UI Library**: shadcn/ui + Tailwind CSS
- **Maps**: Leaflet / Google Maps API
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Tests**: Vitest + Testing Library

### Mobile (PWA)
- **Base**: Next.js PWA
- **Native Access**: Capacitor (camera, géolocalisation, push)
- **Offline**: Service Workers + IndexedDB
- **Notifications**: Firebase Cloud Messaging

### Infrastructure
- **Cloud**: AWS (ou GCP/Azure)
- **Container**: Docker + Docker Compose
- **Orchestration**: Kubernetes (EKS)
- **CI/CD**: GitHub Actions
- **CDN**: CloudFlare
- **Storage**: AWS S3 (images, documents)
- **Monitoring**: DataDog + Sentry
- **Logs**: AWS CloudWatch / ELK Stack

---

## 📦 Architecture Microservices

```
┌─────────────────────────────────────────────────────────────┐
│                     LOAD BALANCER (NGINX)                   │
│                     + CloudFlare CDN + WAF                  │
└────────────┬─────────────────────────────────┬──────────────┘
             │                                 │
    ┌────────▼─────────┐              ┌────────▼─────────┐
    │   Frontend       │              │   API Gateway    │
    │   (Next.js)      │              │   (NestJS)       │
    │   Port: 3000     │              │   Port: 4000     │
    └──────────────────┘              └────────┬─────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        │                      │                      │
              ┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼────────┐
              │  Auth Service     │  │  Mission Service  │  │  Payment Service│
              │  Port: 4001       │  │  Port: 4002       │  │  Port: 4003     │
              └─────────┬─────────┘  └─────────┬─────────┘  └────────┬────────┘
                        │                      │                      │
              ┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼────────┐
              │  User Service     │  │  Chat Service     │  │Marketplace Svc  │
              │  Port: 4004       │  │  Port: 4005       │  │  Port: 4006     │
              └─────────┬─────────┘  └─────────┬─────────┘  └────────┬────────┘
                        │                      │                      │
              ┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼────────┐
              │  Geo Service      │  │  Notification Svc │  │  Admin Service  │
              │  Port: 4007       │  │  Port: 4008       │  │  Port: 4009     │
              └───────────────────┘  └───────────────────┘  └─────────────────┘
                        │
                        └──────────────────┬───────────────────────┐
                                           │                       │
                                 ┌─────────▼──────┐      ┌─────────▼──────┐
                                 │  PostgreSQL    │      │     Redis      │
                                 │  Port: 5432    │      │  Port: 6379    │
                                 └────────────────┘      └────────────────┘
                                           │
                                 ┌─────────▼──────┐
                                 │    MongoDB     │
                                 │  Port: 27017   │
                                 └────────────────┘
```

---

## 🗄️ Schéma de Base de Données (PostgreSQL)

### Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ================================
// USERS & AUTHENTICATION
// ================================

enum UserRole {
  CLIENT
  ARTISAN
  ADMIN
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  DELETED
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  phone     String?  @unique
  password  String
  role      UserRole @default(CLIENT)
  status    UserStatus @default(ACTIVE)

  // 2FA
  twoFactorEnabled Boolean @default(false)
  twoFactorSecret  String? // Encrypted

  // Profil
  firstName String
  lastName  String
  avatar    String? // URL S3

  // Metadata
  emailVerified    Boolean   @default(false)
  emailVerifiedAt  DateTime?
  phoneVerified    Boolean   @default(false)
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  // Relations
  clientProfile   ClientProfile?
  artisanProfile  ArtisanProfile?
  refreshTokens   RefreshToken[]
  backupCodes     BackupCode[]
  consents        UserConsent[]
  notifications   Notification[]
  sentMessages    Message[]       @relation("SentMessages")
  receivedMessages Message[]      @relation("ReceivedMessages")

  // Missions
  clientMissions  Mission[]       @relation("ClientMissions")
  artisanMissions Mission[]       @relation("ArtisanMissions")

  // Reviews
  givenReviews    Review[]        @relation("GivenReviews")
  receivedReviews Review[]        @relation("ReceivedReviews")

  // Marketplace
  products        Product[]
  orders          Order[]

  @@index([email])
  @@index([role])
  @@index([status])
}

model ClientProfile {
  id       String @id @default(uuid())
  userId   String @unique
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Adresses
  addresses       Address[]

  // Paiement
  stripeCustomerId       String?  @unique
  defaultPaymentMethod   String?

  // Favoris
  savedArtisans   SavedArtisan[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ArtisanProfile {
  id       String @id @default(uuid())
  userId   String @unique
  user     User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Informations professionnelles
  companyName     String
  siret           String  @unique
  vatNumber       String? // Encrypted
  description     String?
  website         String?

  // Spécialités
  specialties     Specialty[]

  // Zone d'intervention
  serviceRadius   Int @default(20) // km
  baseAddress     String
  latitude        Float
  longitude       Float

  // Tarification
  hourlyRate      Decimal?  @db.Decimal(10, 2)
  emergencyRate   Decimal?  @db.Decimal(10, 2)

  // Documents
  insurance       String? // URL document assurance
  certifications  Certification[]

  // Stripe Connect
  stripeAccountId String?  @unique
  stripeOnboarded Boolean  @default(false)

  // Statistiques
  rating          Decimal  @default(0) @db.Decimal(3, 2)
  reviewCount     Int      @default(0)
  missionCount    Int      @default(0)

  // Disponibilité
  available       Boolean  @default(true)
  currentLat      Float?
  currentLng      Float?
  lastLocationUpdate DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([latitude, longitude])
  @@index([rating])
}

model Address {
  id            String @id @default(uuid())
  clientId      String
  client        ClientProfile @relation(fields: [clientId], references: [id], onDelete: Cascade)

  label         String // "Domicile", "Travail", etc.
  street        String
  city          String
  postalCode    String
  country       String // "LU", "FR", "BE"
  latitude      Float
  longitude     Float

  isDefault     Boolean @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId])
  @@index([latitude, longitude])
}

model Specialty {
  id          String @id @default(uuid())
  name        String @unique
  category    String // "Plomberie", "Électricité", etc.
  description String?
  icon        String?

  artisans    ArtisanProfile[]

  createdAt DateTime @default(now())
}

model Certification {
  id          String @id @default(uuid())
  artisanId   String
  artisan     ArtisanProfile @relation(fields: [artisanId], references: [id], onDelete: Cascade)

  name        String
  issuer      String
  issueDate   DateTime
  expiryDate  DateTime?
  document    String? // URL S3

  verified    Boolean @default(false)

  createdAt DateTime @default(now())
}

model SavedArtisan {
  id        String @id @default(uuid())
  clientId  String
  client    ClientProfile @relation(fields: [clientId], references: [id], onDelete: Cascade)

  artisanId String
  artisan   User   @relation(fields: [artisanId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([clientId, artisanId])
}

// ================================
// MISSIONS
// ================================

enum MissionType {
  EMERGENCY    // Dépannage urgent
  SCHEDULED    // Planifié
  QUOTE        // Demande de devis
}

enum MissionStatus {
  PENDING      // Créée, en attente artisans
  NEGOTIATING  // En négociation
  ACCEPTED     // Acceptée par artisan
  PAID         // Payée (acompte)
  IN_PROGRESS  // En cours
  COMPLETED    // Terminée
  CANCELLED    // Annulée
  DISPUTED     // Litige
}

model Mission {
  id          String @id @default(uuid())

  // Client
  clientId    String
  client      User   @relation("ClientMissions", fields: [clientId], references: [id])

  // Artisan
  artisanId   String?
  artisan     User?  @relation("ArtisanMissions", fields: [artisanId], references: [id])

  // Type & Status
  type        MissionType
  status      MissionStatus @default(PENDING)

  // Détails
  title       String
  description String
  category    String // "Plomberie", etc.

  // Localisation
  address     String
  city        String
  postalCode  String
  country     String
  latitude    Float
  longitude   Float

  // Planification
  scheduledFor DateTime?
  estimatedDuration Int? // minutes

  // Pricing
  clientBudget    Decimal?  @db.Decimal(10, 2)
  artisanQuote    Decimal?  @db.Decimal(10, 2)
  agreedPrice     Decimal?  @db.Decimal(10, 2)
  finalPrice      Decimal?  @db.Decimal(10, 2)

  // TVA
  vatRate         Decimal   @db.Decimal(5, 2) // 20.00 pour 20%
  totalAmount     Decimal?  @db.Decimal(10, 2) // TTC

  // Photos
  photos          String[] // URLs S3

  // Negotiations
  negotiations    Negotiation[]

  // Transaction
  transaction     Transaction?

  // Review
  review          Review?

  // Metadata
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  acceptedAt      DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  cancelledAt     DateTime?

  @@index([clientId])
  @@index([artisanId])
  @@index([status])
  @@index([type])
  @@index([latitude, longitude])
  @@index([createdAt])
}

model Negotiation {
  id          String @id @default(uuid())
  missionId   String
  mission     Mission @relation(fields: [missionId], references: [id], onDelete: Cascade)

  senderId    String
  receiverId  String

  // Proposition
  proposedPrice Decimal @db.Decimal(10, 2)
  message       String?

  // Status
  accepted      Boolean?
  rejectedReason String?

  createdAt     DateTime @default(now())

  @@index([missionId])
}

// ================================
// REVIEWS & RATINGS
// ================================

model Review {
  id          String @id @default(uuid())

  // Mission liée
  missionId   String @unique
  mission     Mission @relation(fields: [missionId], references: [id], onDelete: Cascade)

  // Reviewer
  reviewerId  String
  reviewer    User   @relation("GivenReviews", fields: [reviewerId], references: [id])

  // Reviewed
  reviewedId  String
  reviewed    User   @relation("ReceivedReviews", fields: [reviewedId], references: [id])

  // Ratings (1-5)
  overallRating Int
  qualityRating Int?
  punctualityRating Int?
  communicationRating Int?
  valueRating Int?

  // Comment
  comment     String?
  photos      String[] // URLs

  // Metadata
  helpful     Int @default(0) // Nombre de "utile"
  verified    Boolean @default(true) // Mission vérifiée

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([reviewedId])
  @@index([overallRating])
}

// ================================
// MARKETPLACE
// ================================

enum ProductStatus {
  DRAFT
  ACTIVE
  INACTIVE
  SOLD_OUT
}

model Product {
  id          String @id @default(uuid())

  // Artisan vendeur
  artisanId   String
  artisan     User   @relation(fields: [artisanId], references: [id], onDelete: Cascade)

  // Informations produit
  name        String
  description String
  category    String
  photos      String[] // URLs S3

  // Pricing
  price       Decimal @db.Decimal(10, 2)
  vatRate     Decimal @db.Decimal(5, 2)

  // Stock
  stock       Int
  sku         String? @unique

  // Status
  status      ProductStatus @default(DRAFT)

  // Variants (optionnel)
  variants    ProductVariant[]

  // Orders
  orderItems  OrderItem[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([artisanId])
  @@index([status])
  @@index([category])
}

model ProductVariant {
  id          String @id @default(uuid())
  productId   String
  product     Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  name        String // "Taille: L", "Couleur: Bleu"
  priceAdjustment Decimal @default(0) @db.Decimal(10, 2)
  stock       Int

  createdAt   DateTime @default(now())

  @@index([productId])
}

enum OrderStatus {
  PENDING
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model Order {
  id          String @id @default(uuid())

  // Client
  clientId    String
  client      User   @relation(fields: [clientId], references: [id])

  // Items
  items       OrderItem[]

  // Pricing
  subtotal    Decimal @db.Decimal(10, 2)
  vat         Decimal @db.Decimal(10, 2)
  total       Decimal @db.Decimal(10, 2)

  // Livraison
  shippingAddress String
  shippingCost    Decimal @default(0) @db.Decimal(10, 2)
  trackingNumber  String?

  // Status
  status      OrderStatus @default(PENDING)

  // Transaction
  transaction Transaction?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  paidAt      DateTime?
  shippedAt   DateTime?
  deliveredAt DateTime?

  @@index([clientId])
  @@index([status])
}

model OrderItem {
  id          String @id @default(uuid())
  orderId     String
  order       Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

  productId   String
  product     Product @relation(fields: [productId], references: [id])

  quantity    Int
  unitPrice   Decimal @db.Decimal(10, 2)
  totalPrice  Decimal @db.Decimal(10, 2)

  @@index([orderId])
}

// ================================
// PAYMENTS & TRANSACTIONS
// ================================

enum TransactionType {
  MISSION
  PRODUCT
  REFUND
}

enum TransactionStatus {
  PENDING
  HELD         // Fonds bloqués (escrow)
  COMPLETED
  FAILED
  REFUNDED
}

model Transaction {
  id          String @id @default(uuid())

  // Type
  type        TransactionType

  // Mission ou Order
  missionId   String? @unique
  mission     Mission? @relation(fields: [missionId], references: [id])

  orderId     String? @unique
  order       Order?  @relation(fields: [orderId], references: [id])

  // Montants
  amount      Decimal @db.Decimal(10, 2)
  commission  Decimal @db.Decimal(10, 2)
  artisanAmount Decimal @db.Decimal(10, 2)

  // Stripe
  stripePaymentIntentId String? @unique
  stripeTransferId      String? @unique

  // Status
  status      TransactionStatus @default(PENDING)

  // Metadata
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?
  refundedAt  DateTime?

  @@index([status])
  @@index([type])
}

// ================================
// CHAT & MESSAGING
// ================================

model Message {
  id          String @id @default(uuid())

  senderId    String
  sender      User   @relation("SentMessages", fields: [senderId], references: [id])

  receiverId  String
  receiver    User   @relation("ReceivedMessages", fields: [receiverId], references: [id])

  // Contenu
  content     String
  attachments String[] // URLs

  // Status
  read        Boolean @default(false)
  readAt      DateTime?

  createdAt   DateTime @default(now())

  @@index([senderId, receiverId])
  @@index([createdAt])
}

// ================================
// NOTIFICATIONS
// ================================

enum NotificationType {
  NEW_MISSION
  MISSION_ACCEPTED
  NEGOTIATION
  PAYMENT
  REVIEW
  MESSAGE
  SYSTEM
}

model Notification {
  id          String @id @default(uuid())

  userId      String
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        NotificationType
  title       String
  message     String
  data        Json? // Metadata

  read        Boolean @default(false)
  readAt      DateTime?

  createdAt   DateTime @default(now())

  @@index([userId, read])
  @@index([createdAt])
}

// ================================
// AUTHENTICATION
// ================================

model RefreshToken {
  id          String @id @default(uuid())
  token       String // Hashed
  userId      String
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  deviceInfo  String?
  expiresAt   DateTime
  revoked     Boolean @default(false)

  createdAt   DateTime @default(now())

  @@index([userId])
}

model BackupCode {
  id          String @id @default(uuid())
  code        String // Hashed
  userId      String
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  used        Boolean @default(false)
  usedAt      DateTime?

  createdAt   DateTime @default(now())

  @@index([userId])
}

model PasswordResetToken {
  id          String @id @default(uuid())
  token       String // Hashed
  userId      String

  expiresAt   DateTime
  used        Boolean @default(false)

  createdAt   DateTime @default(now())

  @@index([userId])
}

// ================================
// GDPR & CONSENTS
// ================================

model UserConsent {
  id          String @id @default(uuid())
  userId      String @unique
  user        User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  marketing   Boolean @default(false)
  analytics   Boolean @default(false)
  geolocation Boolean @default(false)
  emailNotif  Boolean @default(true)
  smsNotif    Boolean @default(false)
  pushNotif   Boolean @default(true)

  consentDate DateTime @default(now())
  ipAddress   String

  updatedAt   DateTime @updatedAt
}

// ================================
// ADMIN & LOGS
// ================================

model AuditLog {
  id          String @id @default(uuid())

  userId      String?
  action      String
  resource    String
  details     Json?

  ipAddress   String
  userAgent   String?

  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 🔄 Architecture des Services

### 1. Auth Service (`/backend/services/auth`)

```
auth-service/
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts      # Login, register, refresh
│   │   ├── 2fa.controller.ts       # 2FA setup/verify
│   │   └── password.controller.ts  # Reset password
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── jwt.service.ts
│   │   ├── 2fa.service.ts
│   │   └── email.service.ts
│   ├── middleware/
│   │   ├── authenticate.ts
│   │   └── rate-limit.ts
│   ├── validators/
│   │   └── auth.validator.ts
│   └── types/
│       └── jwt-payload.ts
└── tests/
```

**Responsabilités**:
- Authentification (login, register)
- Gestion des tokens (JWT, refresh)
- 2FA (TOTP)
- Reset password
- Session management

---

### 2. User Service (`/backend/services/user`)

**Responsabilités**:
- CRUD utilisateurs
- Profils (client, artisan)
- Upload avatar
- Gestion documents
- RGPD (export, suppression)

---

### 3. Mission Service (`/backend/services/mission`)

**Responsabilités**:
- CRUD missions
- Matching artisans
- Workflow statuts
- Planification
- Photos upload

---

### 4. Geo Service (`/backend/services/geo`)

**Responsabilités**:
- Géolocalisation temps réel
- Calcul de distance
- Recherche artisans par zone
- Geocoding (adresse → lat/lng)

**Technologies**:
- Redis Geospatial (GEOADD, GEORADIUS)
- Google Maps API / OpenStreetMap

---

### 5. Chat Service (`/backend/services/chat`)

**Responsabilités**:
- Messaging temps réel (WebSocket)
- Historique chat
- Notifications message

**Technologies**:
- Socket.io (WebSocket)
- MongoDB (stockage messages)
- Redis (pub/sub)

---

### 6. Payment Service (`/backend/services/payment`)

**Responsabilités**:
- Intégration Stripe
- Gestion escrow
- Calcul commissions
- Facturation
- Gestion TVA

---

### 7. Notification Service (`/backend/services/notification`)

**Responsabilités**:
- Push notifications (FCM)
- Emails (SendGrid)
- SMS (Twilio)
- Templating

---

### 8. Marketplace Service (`/backend/services/marketplace`)

**Responsabilités**:
- CRUD produits
- Gestion stock
- Orders
- Search & filters

---

### 9. Admin Service (`/backend/services/admin`)

**Responsabilités**:
- Dashboard analytics
- Gestion utilisateurs
- Modération
- Litiges
- Configuration

---

## 🌐 Frontend Architecture (Next.js)

```
frontend/
├── app/                    # App Router (Next.js 14)
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── reset-password/
│   ├── (client)/
│   │   ├── dashboard/
│   │   ├── missions/
│   │   ├── artisans/
│   │   └── marketplace/
│   ├── (artisan)/
│   │   ├── dashboard/
│   │   ├── missions/
│   │   ├── calendar/
│   │   └── shop/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── missions/
│   │   └── analytics/
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui components
│   ├── layouts/
│   ├── forms/
│   ├── maps/
│   └── shared/
├── lib/
│   ├── api/               # API client
│   ├── hooks/             # Custom hooks
│   ├── utils/
│   ├── validators/
│   └── store/             # Zustand stores
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json      # PWA manifest
├── styles/
│   └── globals.css
└── next.config.js
```

---

## 📱 PWA Configuration

### `manifest.json`

```json
{
  "name": "ArtiConnect",
  "short_name": "ArtiConnect",
  "description": "Plateforme de mise en relation artisans-clients",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2563EB",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

```typescript
// sw.ts
const CACHE_NAME = 'articonnect-v1';
const urlsToCache = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/offline'))
  );
});
```

---

## 🐳 Docker Configuration

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  # ===============================
  # Databases
  # ===============================
  postgres:
    image: postgres:15-alpine
    container_name: articonnect-postgres
    environment:
      POSTGRES_DB: articonnect
      POSTGRES_USER: articonnect
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - articonnect-network

  redis:
    image: redis:7-alpine
    container_name: articonnect-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - articonnect-network

  mongodb:
    image: mongo:7
    container_name: articonnect-mongo
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: articonnect
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    networks:
      - articonnect-network

  # ===============================
  # Backend Services
  # ===============================
  api-gateway:
    build:
      context: ./backend/api-gateway
      dockerfile: Dockerfile
    container_name: articonnect-api-gateway
    ports:
      - "4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://articonnect:${DB_PASSWORD}@postgres:5432/articonnect
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
      - mongodb
    networks:
      - articonnect-network

  auth-service:
    build:
      context: ./backend/services/auth
      dockerfile: Dockerfile
    container_name: articonnect-auth
    ports:
      - "4001:4001"
    environment:
      DATABASE_URL: postgresql://articonnect:${DB_PASSWORD}@postgres:5432/articonnect
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - articonnect-network

  mission-service:
    build:
      context: ./backend/services/mission
      dockerfile: Dockerfile
    container_name: articonnect-mission
    ports:
      - "4002:4002"
    environment:
      DATABASE_URL: postgresql://articonnect:${DB_PASSWORD}@postgres:5432/articonnect
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - articonnect-network

  # ===============================
  # Frontend
  # ===============================
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: articonnect-frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://api-gateway:4000
    depends_on:
      - api-gateway
    networks:
      - articonnect-network

  # ===============================
  # Nginx (Load Balancer)
  # ===============================
  nginx:
    image: nginx:alpine
    container_name: articonnect-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - api-gateway
    networks:
      - articonnect-network

volumes:
  postgres_data:
  redis_data:
  mongo_data:

networks:
  articonnect-network:
    driver: bridge
```

---

## 🚀 Déploiement (AWS)

### Infrastructure

```
┌───────────────────────────────────────────────────────────┐
│                    Route 53 (DNS)                         │
│              articonnect.com                              │
└─────────────────────┬─────────────────────────────────────┘
                      │
┌─────────────────────▼─────────────────────────────────────┐
│              CloudFront (CDN)                             │
│          + WAF + DDoS Protection                          │
└──────────┬────────────────────────────────────┬───────────┘
           │                                    │
┌──────────▼────────────┐          ┌────────────▼───────────┐
│   S3 (Static Assets)  │          │  ALB (Load Balancer)   │
│   Images, CSS, JS     │          │                        │
└───────────────────────┘          └────────────┬───────────┘
                                                │
                                   ┌────────────▼───────────┐
                                   │   EKS (Kubernetes)     │
                                   │   - API Services       │
                                   │   - Frontend           │
                                   └────────────┬───────────┘
                                                │
                      ┌─────────────────────────┼─────────────────┐
                      │                         │                 │
          ┌───────────▼─────────┐   ┌───────────▼──────┐  ┌──────▼──────┐
          │  RDS (PostgreSQL)   │   │  ElastiCache     │  │  DocumentDB │
          │  Multi-AZ           │   │  (Redis)         │  │  (MongoDB)  │
          └─────────────────────┘   └──────────────────┘  └─────────────┘
```

---

## 📊 Monitoring & Observabilité

### Métriques Clés

```typescript
// Prometheus metrics
import { Counter, Histogram, Gauge } from 'prom-client';

// Requêtes HTTP
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP',
  labelNames: ['method', 'route', 'status']
});

// Missions créées
const missionsCreated = new Counter({
  name: 'missions_created_total',
  help: 'Nombre total de missions créées'
});

// Artisans actifs
const activeArtisans = new Gauge({
  name: 'active_artisans',
  help: 'Nombre d\'artisans actuellement actifs'
});
```

---

## ✅ Checklist Technique Pré-Dev

- [ ] Schéma de BDD validé
- [ ] Architecture microservices définie
- [ ] Stack technique choisie
- [ ] Docker Compose prêt
- [ ] CI/CD configuré
- [ ] Monitoring planifié
- [ ] Stratégie de tests définie

---

**Version**: 1.0
**Date**: 2025-11-07
