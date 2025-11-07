# Notes d'implémentation - ArtiConnect

## ✅ Fonctionnalités implémentées

### 1. Module Specialty (API Spécialités)
- ✅ Controller, Service, DTOs complets
- ✅ Endpoints CRUD (GET, POST, PUT, DELETE)
- ✅ Protection Admin pour création/modification
- ✅ Seed data: 35 spécialités (Construction, Plomberie, Électricité, etc.)
- ✅ Frontend connecté (page become-artisan)

### 2. Types stricts (Suppression any())
- ✅ DTOs Marketplace: CreateProductDto, UpdateProductDto, CreateOrderDto
- ✅ Tous les `any()` remplacés par types stricts
- ✅ Validation OrderStatus enum
- ✅ Order service avec gestion stock + transaction
- ✅ Backend: 0 any() (hors tests)

### 3. Service Email (Nodemailer + Templates)
- ✅ EmailModule global
- ✅ Templates HTML: reset password, welcome, verification, mission notification
- ✅ Support SMTP production + Ethereal (dev)
- ✅ Intégré dans auth.service.ts

**Variables env nécessaires:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=ArtiConnect
SMTP_FROM_EMAIL=noreply@articonnect.com
FRONTEND_URL=http://localhost:3000
```

### 4. Frontend Marketplace connecté
- ✅ marketplace/page.tsx: Charge produits depuis API
- ✅ marketplace/[id]/page.tsx: Détails produit depuis API
- ✅ Gestion erreurs avec fallback
- ✅ Code mock conservé en commentaire

### 5. Algorithme Matching Artisans
- ✅ `findAndNotifyNearbyArtisans()` implémenté
- ✅ Recherche artisans par spécialité + disponibilité
- ✅ Calcul distance (formule Haversine)
- ✅ Filtre par serviceRadius
- ✅ Notifications automatiques (max 10 artisans)

**Comment ça marche:**
```typescript
// Lors de la création d'une mission
await this.findAndNotifyNearbyArtisans(mission);

// Trouve artisans:
// 1. Rôle ARTISAN + statut ACTIVE
// 2. Disponible (artisanProfile.available = true)
// 3. Spécialité correspond à mission.category
// 4. Distance <= serviceRadius

// Envoie notifications en base de données
// Les artisans les reçoivent via /notifications endpoint
```

## 🚧 Fonctionnalités partiellement implémentées

### 6. Upload Avatar vers S3

**État actuel:**
- ✅ Endpoint `/users/avatar` existe
- ✅ Upload fichier avec Multer
- ✅ Validation type/taille (JPEG, PNG, GIF, WebP < 5MB)
- ⚠️ Stockage: DiceBear temporaire

**Pour production S3:**
```typescript
// backend/api-gateway/src/user/services/user.service.ts:158

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

async uploadAvatar(userId: string, file: Express.Multer.File) {
  // 1. Configurer S3
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // 2. Generate unique filename
  const fileName = `avatars/${userId}-${Date.now()}.${file.mimetype.split('/')[1]}`;

  // 3. Upload to S3
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  }));

  // 4. Get public URL
  const avatarUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

  // 5. Update user in database
  await this.prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
  });

  return { avatar: avatarUrl };
}
```

**Variables env nécessaires:**
```bash
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=articonnect-avatars
```

### 7. Panier d'achat (Cart)

**État actuel:**
- ✅ Order API fonctionnel (création commandes)
- ⚠️ Pas de gestion panier côté client

**Implémentation recommandée (LocalStorage):**

```typescript
// frontend/lib/hooks/useCart.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const existing = get().items.find(i => i.productId === item.productId);
        if (existing) {
          set({
            items: get().items.map(i =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, item] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(i => i.productId !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
        } else {
          set({
            items: get().items.map(i =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          });
        }
      },

      clearCart: () => set({ items: [] }),

      get total() {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'articonnect-cart',
    }
  )
);
```

**Utilisation:**
```typescript
// Dans marketplace/[id]/page.tsx

import { useCart } from '@/lib/hooks/useCart';

const { addItem } = useCart();

const handleAddToCart = () => {
  addItem({
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity: 1,
    image: product.images[0],
  });
  toast({ title: 'Ajouté au panier' });
};
```

### 8. Notifications Push (FCM)

**État actuel:**
- ✅ Notifications en base de données
- ✅ API `/notifications` fonctionnelle
- ⚠️ Pas de push notifications temps réel

**Implémentation Firebase Cloud Messaging:**

```typescript
// backend/api-gateway/src/notification/services/fcm.service.ts

import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService {
  private messaging: admin.messaging.Messaging;

  constructor() {
    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }
    this.messaging = admin.messaging();
  }

  async sendNotification(token: string, title: string, body: string, data?: Record<string, string>) {
    try {
      await this.messaging.send({
        token,
        notification: { title, body },
        data: data || {},
        android: {
          priority: 'high',
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      });
    } catch (error) {
      console.error('FCM error:', error);
    }
  }

  async sendToMultiple(tokens: string[], title: string, body: string) {
    if (tokens.length === 0) return;

    try {
      await this.messaging.sendMulticast({
        tokens,
        notification: { title, body },
      });
    } catch (error) {
      console.error('FCM multicast error:', error);
    }
  }
}
```

**Frontend (Service Worker):**
```typescript
// frontend/public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  projectId: "your-project-id",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

**Variables env nécessaires:**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 📊 Résumé Implementation

| Fonctionnalité | État | Prod Ready | Notes |
|----------------|------|------------|-------|
| API Specialty | ✅ | ✅ | Complet avec seed data |
| Types stricts | ✅ | ✅ | 0 any() dans le code |
| Email Service | ✅ | ✅ | Nécessite config SMTP |
| Marketplace API | ✅ | ✅ | Frontend connecté |
| Matching Artisans | ✅ | ✅ | Notifications auto |
| Upload S3 | ⚠️ | ❌ | DiceBear temporaire |
| Cart | ⚠️ | ❌ | Nécessite Zustand + LocalStorage |
| Push FCM | ⚠️ | ❌ | Notifications DB seulement |

## 🚀 Next Steps pour production

1. **Upload S3**: Configurer AWS credentials + implémenter upload réel
2. **Cart**: Ajouter Zustand + composant panier + page checkout
3. **Push FCM**: Configurer Firebase + service worker + tokens utilisateurs
4. **Tests**: Ajouter tests unitaires + E2E
5. **CI/CD**: Configurer déploiement automatique
6. **Monitoring**: Sentry pour erreurs + logs centralisés

## 📝 Variables environnement complètes

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/articonnect
MONGODB_URI=mongodb://user:password@localhost:27017/articonnect

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-very-long-secret-key
JWT_REFRESH_SECRET=your-very-long-refresh-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=ArtiConnect
SMTP_FROM_EMAIL=noreply@articonnect.com

# Frontend
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# AWS S3 (optionnel)
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=articonnect-uploads

# Firebase (optionnel)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```
