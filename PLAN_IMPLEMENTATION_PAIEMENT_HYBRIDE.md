# 📋 PLAN D'IMPLÉMENTATION - SYSTÈME PAIEMENT HYBRIDE

**Date**: 2025-11-08
**Feature**: Paiement hybride basé sur réputation + Gestion no-show + Auto-validation
**Statut**: PLANIFICATION

---

## 🎯 OBJECTIFS

Implémenter un système de paiement intelligent qui:
1. ✅ Sécurise la plateforme (revenus garantis)
2. ✅ Protège l'artisan (paiement assuré)
3. ✅ Optimise la conversion client (flexibilité selon réputation)
4. ✅ Gère les cas limites (no-show, auto-validation, remboursements)

---

## 📊 MODÈLE HYBRIDE RETENU

### Règles de paiement selon réputation

```typescript
// Nouveaux clients (0-3 missions)
reputationScore < 50 → Paiement 100% AVANT déplacement

// Clients établis (4-10 missions, bonne réputation)
reputationScore 50-100 → Acompte 50% AVANT, solde APRÈS

// Clients VIP (10+ missions, 0 litige)
reputationScore > 100 → Acompte 30% AVANT, solde APRÈS

// Urgence: Toujours minimum 50% AVANT
missionType = EMERGENCY → depositMin = 50%
```

---

## 🗄️ MODIFICATIONS BASE DE DONNÉES

### 1. Table `User` - Ajout système réputation

```prisma
model User {
  // ... champs existants

  // NOUVEAU: Système de réputation
  reputationScore   Int      @default(100)  // Score 0-200
  completedMissions Int      @default(0)    // Compteur missions terminées
  noShowCount       Int      @default(0)    // Compteur absences client
  disputeCount      Int      @default(0)    // Compteur litiges
  disputeRate       Decimal  @default(0) @db.Decimal(5, 2) // % litiges

  // Relations
  noShowEvents      NoShowEvent[]
  reputationHistory ReputationHistory[]

  @@index([reputationScore])
}
```

### 2. Table `Mission` - Ajout workflow paiement

```prisma
enum MissionStatus {
  PENDING
  PENDING_DEPOSIT      // NOUVEAU: En attente acompte
  DEPOSIT_PAID         // NOUVEAU: Acompte payé
  IN_TRANSIT           // NOUVEAU: Artisan en route
  ACCEPTED
  IN_PROGRESS
  COMPLETED
  AUTO_VALIDATED       // NOUVEAU: Auto-validée après timeout
  DISPUTED
  CANCELLED
  CANCELLED_NO_SHOW    // NOUVEAU: Annulée pour no-show
}

model Mission {
  // ... champs existants

  // NOUVEAU: Gestion acompte
  depositRequired      Boolean  @default(true)
  depositPercentage    Int      @default(30)     // 30%, 50%, 100%
  depositAmount        Decimal? @db.Decimal(10, 2)
  depositPaidAt        DateTime?
  depositTimeoutAt     DateTime?                  // Délai paiement

  // NOUVEAU: Workflow temporel
  arrivedAt            DateTime?                  // Artisan arrivé sur site
  validatedAt          DateTime?                  // Client validé
  autoValidatedAt      DateTime?                  // Auto-validation
  autoValidatedReason  String?                    // Raison auto-validation

  // NOUVEAU: Gestion no-show
  noShowEventId        String?   @unique
  noShowEvent          NoShowEvent? @relation(fields: [noShowEventId], references: [id])

  // Relations
  payments             Payment[]

  @@index([depositPaidAt])
  @@index([validatedAt])
}
```

### 3. NOUVELLE Table `Payment` (détaillée)

```prisma
enum PaymentType {
  DEPOSIT              // Acompte
  BALANCE              // Solde
  NO_SHOW_FEE          // Frais no-show
  REFUND               // Remboursement
  COMPENSATION         // Compensation
}

enum PaymentStatus {
  PENDING
  AUTHORIZED           // Carte autorisée (hold)
  SUCCEEDED
  FAILED
  REFUNDED
  PARTIALLY_REFUNDED
}

enum RefundReason {
  CHANGED_MIND         // Client a tort → Artisan compensé
  EMERGENCY_RESOLVED   // Client a tort → Artisan compensé
  WORK_NOT_DONE        // Artisan a tort → Pas payé
  WORK_INCOMPLETE      // Artisan a tort → Paiement partiel
  POOR_QUALITY         // Artisan a tort → Investigation
  MUTUAL_CANCELLATION  // Neutre → Compensation déplacement si fait
  FORCE_MAJEURE        // Neutre → Remboursement total
}

model Payment {
  id                    String        @id @default(uuid())
  missionId             String
  mission               Mission       @relation(fields: [missionId], references: [id])
  userId                String        // Qui paie

  // Type et montants
  type                  PaymentType
  amount                Decimal       @db.Decimal(10, 2)
  depositPercentage     Int?          // Si DEPOSIT

  // Stripe
  stripePaymentIntentId String?       @unique
  stripeCustomerId      String?
  stripePaymentMethodId String?

  // Statut
  status                PaymentStatus @default(PENDING)

  // Refund
  refundReason          RefundReason?
  refundedAmount        Decimal?      @db.Decimal(10, 2)
  refundedAt            DateTime?

  // Compensation artisan
  artisanCompensated    Boolean       @default(false)
  compensationAmount    Decimal?      @db.Decimal(10, 2)
  absorbedBy            String?       // PLATFORM, CLIENT, ARTISAN

  // Délai rétractation (48h)
  withinRetractionPeriod Boolean     @default(true)
  retractionExpiresAt    DateTime?    // createdAt + 48h

  // Timestamps
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  authorizedAt          DateTime?
  succeededAt           DateTime?

  // Relations
  compensationLog       CompensationLog?

  @@index([missionId])
  @@index([userId])
  @@index([status])
  @@index([type])
}
```

### 4. NOUVELLE Table `NoShowEvent`

```prisma
enum NoShowStatus {
  PENDING              // En cours validation
  VALIDATED            // Validé par admin ou auto
  CONTESTED            // Client conteste
  REJECTED             // Rejeté par admin
}

model NoShowEvent {
  id                    String       @id @default(uuid())
  missionId             String       @unique
  mission               Mission?

  // Acteurs
  artisanId             String
  artisan               User         @relation("ArtisanNoShows", fields: [artisanId], references: [id])
  clientId              String
  client                User         @relation("ClientNoShows", fields: [clientId], references: [id])

  // Preuves
  arrivalTime           DateTime                    // Heure arrivée
  waitDurationMinutes   Int                         // Temps d'attente
  contactAttempts       Json                        // [{method: 'PHONE', timestamp: '...'}]
  proofPhotos           String[]                    // Photos devant porte
  gpsCoords             Json                        // {lat, lng}

  // Frais
  feeAmount             Decimal      @db.Decimal(10, 2)
  feeType               String       // EMERGENCY, SCHEDULED

  // Statut
  status                NoShowStatus @default(PENDING)
  validatedBy           String?      // adminId ou AUTO
  validatedAt           DateTime?
  rejectedReason        String?

  // Impact réputation
  reputationPenalty     Int          @default(-10)

  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  @@index([artisanId])
  @@index([clientId])
  @@index([status])
}
```

### 5. NOUVELLE Table `ReputationHistory`

```prisma
enum ReputationEvent {
  MISSION_COMPLETED    // +10 points
  MISSION_RATED_HIGH   // +5 points (>4 étoiles)
  MISSION_RATED_LOW    // -5 points (<3 étoiles)
  NO_SHOW              // -10 points
  DISPUTE_OPENED       // -15 points
  DISPUTE_LOST         // -20 points
  DISPUTE_WON          // +5 points
  REFUND_ABUSE         // -10 points
  MISSION_CANCELLED    // -5 points
  MANUAL_ADJUSTMENT    // Admin
}

model ReputationHistory {
  id             String           @id @default(uuid())
  userId         String
  user           User             @relation(fields: [userId], references: [id])
  event          ReputationEvent
  pointsChange   Int              // +10, -10, etc.
  previousScore  Int              // Score avant
  newScore       Int              // Score après
  missionId      String?          // Si lié à mission
  reason         String?          // Explication
  createdBy      String?          // adminId si manuel
  createdAt      DateTime         @default(now())

  @@index([userId])
  @@index([createdAt])
}
```

### 6. NOUVELLE Table `CompensationLog`

```prisma
model CompensationLog {
  id              String   @id @default(uuid())
  paymentId       String   @unique
  payment         Payment  @relation(fields: [paymentId], references: [id])
  missionId       String

  // Compensation
  compensatedUserId String  // artisanId généralement
  amount            Decimal @db.Decimal(10, 2)
  reason            String  // Description
  absorbedBy        String  // PLATFORM, CLIENT

  createdAt         DateTime @default(now())

  @@index([compensatedUserId])
}
```

---

## 🔧 LOGIQUE MÉTIER (Services)

### Service 1: `ReputationService`

```typescript
class ReputationService {

  // Calculer modèle de paiement selon réputation
  determinePaymentModel(client: User, missionType: MissionType) {
    if (client.reputationScore < 50 || client.noShowCount > 0) {
      return {
        depositPercentage: 100,
        paymentBefore: 'TRAVEL',
        reason: 'NEW_CLIENT_OR_AT_RISK'
      };
    }

    if (missionType === 'EMERGENCY') {
      return client.reputationScore > 100
        ? { depositPercentage: 50, paymentBefore: 'TRAVEL' }
        : { depositPercentage: 100, paymentBefore: 'TRAVEL' };
    }

    if (client.reputationScore > 100 && client.completedMissions >= 10) {
      return {
        depositPercentage: 30,
        paymentBefore: 'CONFIRMATION',
        reason: 'VIP_CLIENT'
      };
    }

    // Default: Clients établis
    return {
      depositPercentage: 50,
      paymentBefore: 'TRAVEL',
      reason: 'ESTABLISHED_CLIENT'
    };
  }

  // Mettre à jour réputation après mission
  async updateReputationAfterMission(userId: string, event: ReputationEvent, points: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    const newScore = Math.max(0, Math.min(200, user.reputationScore + points));

    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore: newScore }
    });

    await this.prisma.reputationHistory.create({
      data: {
        userId,
        event,
        pointsChange: points,
        previousScore: user.reputationScore,
        newScore,
      }
    });

    return newScore;
  }

  // Pénalité no-show
  async penalizeForNoShow(clientId: string) {
    await this.updateReputationAfterMission(
      clientId,
      ReputationEvent.NO_SHOW,
      -10
    );

    await this.prisma.user.update({
      where: { id: clientId },
      data: { noShowCount: { increment: 1 } }
    });
  }
}
```

### Service 2: `PaymentService`

```typescript
class PaymentService {

  // Créer paiement acompte
  async createDepositPayment(missionId: string, clientId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { client: true }
    });

    if (!mission.depositRequired) {
      throw new Error('Acompte non requis pour cette mission');
    }

    const depositAmount = (mission.agreedPrice * mission.depositPercentage) / 100;

    // Stripe Payment Intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(depositAmount * 100), // centimes
      currency: 'eur',
      customer: mission.client.stripeCustomerId,
      metadata: {
        missionId,
        type: 'DEPOSIT',
        depositPercentage: mission.depositPercentage
      }
    });

    const payment = await this.prisma.payment.create({
      data: {
        missionId,
        userId: clientId,
        type: 'DEPOSIT',
        amount: depositAmount,
        depositPercentage: mission.depositPercentage,
        stripePaymentIntentId: paymentIntent.id,
        status: 'PENDING',
        retractionExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
      }
    });

    return { payment, paymentIntent };
  }

  // Process remboursement avec compensation
  async processRefund(paymentId: string, reason: RefundReason, amount: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { mission: { include: { artisan: true, client: true } } }
    });

    let artisanCompensated = false;
    let compensationAmount = 0;
    let absorbedBy = 'PLATFORM';

    switch (reason) {
      case RefundReason.CHANGED_MIND:
      case RefundReason.EMERGENCY_RESOLVED:
        // Client remboursé MAIS artisan payé
        await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(amount * 100)
        });

        // Plateforme compense l'artisan
        artisanCompensated = true;
        compensationAmount = amount;
        absorbedBy = 'PLATFORM';

        // Pénalité réputation client
        await this.reputationService.updateReputationAfterMission(
          payment.mission.clientId,
          ReputationEvent.REFUND_ABUSE,
          -10
        );
        break;

      case RefundReason.WORK_NOT_DONE:
      case RefundReason.ARTISAN_NO_SHOW:
        // Client remboursé ET artisan PAS payé
        await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(amount * 100)
        });

        artisanCompensated = false;

        // Pénalité artisan
        await this.reputationService.updateReputationAfterMission(
          payment.mission.artisanId,
          ReputationEvent.DISPUTE_LOST,
          -20
        );

        // Auto-ouvrir litige
        await this.disputeService.autoCreate(payment.missionId, reason);
        break;

      case RefundReason.MUTUAL_CANCELLATION:
        // Remboursement client + compensation déplacement si artisan en route
        await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(amount * 100)
        });

        if (payment.mission.status === 'IN_TRANSIT' || payment.mission.arrivedAt) {
          artisanCompensated = true;
          compensationAmount = 30.00; // Frais déplacement
          absorbedBy = 'PLATFORM';
        }
        break;
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REFUNDED',
        refundReason: reason,
        refundedAmount: amount,
        refundedAt: new Date(),
        artisanCompensated,
        compensationAmount,
        absorbedBy
      }
    });

    if (artisanCompensated) {
      await this.prisma.compensationLog.create({
        data: {
          paymentId,
          missionId: payment.missionId,
          compensatedUserId: payment.mission.artisanId,
          amount: compensationAmount,
          reason: `Compensation pour ${reason}`,
          absorbedBy
        }
      });
    }
  }
}
```

### Service 3: `NoShowService`

```typescript
class NoShowService {

  // Artisan signale no-show
  async reportNoShow(missionId: string, artisanId: string, data: {
    arrivalTime: Date,
    waitDurationMinutes: number,
    contactAttempts: any[],
    proofPhotos: string[],
    gpsCoords: { lat: number, lng: number }
  }) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { client: true }
    });

    // Validation minimum: 15 min d'attente
    if (data.waitDurationMinutes < 15) {
      throw new Error('Attente minimum 15 minutes requise');
    }

    // Validation preuves
    if (data.proofPhotos.length === 0) {
      throw new Error('Au moins une photo requise');
    }

    if (data.contactAttempts.length < 2) {
      throw new Error('Au moins 2 tentatives de contact requises');
    }

    // Calculer frais selon type mission
    const feeAmount = mission.type === 'EMERGENCY' ? 50.00 : 30.00;

    const noShowEvent = await this.prisma.noShowEvent.create({
      data: {
        missionId,
        artisanId,
        clientId: mission.clientId,
        arrivalTime: data.arrivalTime,
        waitDurationMinutes: data.waitDurationMinutes,
        contactAttempts: data.contactAttempts,
        proofPhotos: data.proofPhotos,
        gpsCoords: data.gpsCoords,
        feeAmount,
        feeType: mission.type,
        status: 'PENDING'
      }
    });

    // Auto-validation si preuves complètes
    if (this.areProofsComplete(noShowEvent)) {
      await this.validateNoShow(noShowEvent.id, 'AUTO');
    }

    // Notification admin pour validation manuelle sinon
    else {
      await this.notificationService.notifyAdmin({
        type: 'NO_SHOW_VALIDATION_REQUIRED',
        noShowEventId: noShowEvent.id
      });
    }

    return noShowEvent;
  }

  // Valider no-show (auto ou admin)
  async validateNoShow(noShowEventId: string, validatedBy: string) {
    const noShowEvent = await this.prisma.noShowEvent.findUnique({
      where: { id: noShowEventId },
      include: { mission: true, client: true, artisan: true }
    });

    // Mettre à jour statut
    await this.prisma.noShowEvent.update({
      where: { id: noShowEventId },
      data: {
        status: 'VALIDATED',
        validatedBy,
        validatedAt: new Date()
      }
    });

    // Facturer client
    const payment = await this.paymentService.createNoShowFee({
      missionId: noShowEvent.missionId,
      clientId: noShowEvent.clientId,
      artisanId: noShowEvent.artisanId,
      amount: noShowEvent.feeAmount
    });

    // Pénalité réputation client
    await this.reputationService.penalizeForNoShow(noShowEvent.clientId);

    // Annuler mission
    await this.prisma.mission.update({
      where: { id: noShowEvent.missionId },
      data: {
        status: 'CANCELLED_NO_SHOW',
        cancelledAt: new Date(),
        noShowEventId: noShowEvent.id
      }
    });

    return payment;
  }

  private areProofsComplete(noShowEvent: NoShowEvent): boolean {
    return (
      noShowEvent.waitDurationMinutes >= 15 &&
      noShowEvent.proofPhotos.length > 0 &&
      noShowEvent.contactAttempts.length >= 2 &&
      noShowEvent.gpsCoords !== null
    );
  }
}
```

### Service 4: `MissionService` (Auto-validation)

```typescript
class MissionService {

  // CRON Job quotidien: Auto-valider missions bloquées
  async autoValidateStuckMissions() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const stuckMissions = await this.prisma.mission.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { lt: sevenDaysAgo },
        validatedAt: null,
        // Pas de litige
        disputes: { none: {} }
      },
      include: { client: true, artisan: true }
    });

    for (const mission of stuckMissions) {
      await this.prisma.mission.update({
        where: { id: mission.id },
        data: {
          status: 'AUTO_VALIDATED',
          autoValidatedAt: new Date(),
          validatedAt: new Date(),
          autoValidatedReason: 'CLIENT_TIMEOUT_7_DAYS'
        }
      });

      // Notification client
      await this.notificationService.send({
        userId: mission.clientId,
        type: 'MISSION_AUTO_VALIDATED',
        title: 'Mission auto-validée',
        message: `Votre mission a été automatiquement validée après 7 jours sans action.`
      });

      // Déclencher paiement artisan
      await this.paymentService.triggerArtisanPayment(mission.id);

      // Bonus réputation client (pour avoir laissé faire)
      await this.reputationService.updateReputationAfterMission(
        mission.clientId,
        ReputationEvent.MISSION_COMPLETED,
        +10
      );
    }

    return stuckMissions.length;
  }

  // Bloquer démarrage trajet si acompte non payé
  async startTravel(missionId: string, artisanId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: { payments: true }
    });

    // NOUVEAU: Vérification acompte
    if (mission.depositRequired && !mission.depositPaidAt) {
      throw new ForbiddenException(
        'Impossible de démarrer le trajet: acompte non payé par le client'
      );
    }

    // Continue workflow normal
    await this.prisma.mission.update({
      where: { id: missionId },
      data: {
        status: 'IN_TRANSIT',
        startedAt: new Date()
      }
    });

    // Notification client
    await this.notificationService.send({
      userId: mission.clientId,
      type: 'ARTISAN_ON_WAY',
      title: 'Artisan en route',
      message: `${mission.artisan.firstName} est en route vers votre domicile.`
    });
  }
}
```

---

## 🌐 ENDPOINTS API

### Endpoints Réputation

```typescript
// GET /users/:id/reputation
// Consulter score réputation et historique
{
  score: 120,
  level: "VIP",
  completedMissions: 15,
  noShowCount: 0,
  disputeRate: 0,
  history: [...],
  nextLevelAt: 150
}

// GET /users/:id/payment-model
// Voir modèle de paiement applicable
{
  depositPercentage: 30,
  paymentBefore: "CONFIRMATION",
  reason: "VIP_CLIENT",
  benefits: ["Acompte réduit à 30%", "Priorité support"]
}
```

### Endpoints Paiement

```typescript
// POST /payments/deposit
// Payer acompte mission
{
  missionId: "xxx",
  paymentMethodId: "pm_xxx"
}

// POST /payments/:id/refund
// Demander remboursement (avec raison)
{
  amount: 200.00,
  reason: "CHANGED_MIND", // Enum RefundReason
  description: "Je n'ai plus besoin"
}

// GET /payments/:id/refund-eligibility
// Vérifier éligibilité remboursement
{
  eligible: true,
  withinRetractionPeriod: true,
  expiresAt: "2025-11-10T10:00:00Z",
  hoursRemaining: 36
}
```

### Endpoints No-Show

```typescript
// POST /missions/:id/arrive-on-site
// Artisan signale arrivée
{
  latitude: 48.8566,
  longitude: 2.3522
}

// POST /missions/:id/report-no-show
// Artisan signale client absent
{
  waitDurationMinutes: 20,
  contactAttempts: [
    { method: "PHONE_CALL", timestamp: "..." },
    { method: "DOORBELL", timestamp: "..." },
    { method: "SMS", timestamp: "..." }
  ],
  proofPhotos: ["s3://..."],
  gpsCoords: { lat: 48.8566, lng: 2.3522 }
}

// POST /admin/no-shows/:id/validate
// Admin valide/rejette no-show
{
  action: "VALIDATE", // ou "REJECT"
  reason: "Preuves complètes et valides"
}
```

### Endpoints Mission (modifiés)

```typescript
// POST /missions/:id/start-travel
// MODIFIÉ: Bloqué si acompte non payé
// Lance exception si depositRequired && !depositPaidAt

// POST /missions/:id/validate
// Client valide mission
{
  approved: true,
  rating: 5,
  comment: "Excellent travail"
}
```

---

## ✅ TESTS À CRÉER (Scénario 36)

```typescript
describe('Scénario 36: Workflow Paiement Hybride', () => {

  it('36.1 - Nouveau client: Paiement 100% AVANT déplacement', async () => {
    // Client avec 0 mission
    // Créer urgence
    // Vérifier depositPercentage = 100
    // Vérifier artisan ne peut pas start-travel sans paiement
  });

  it('36.2 - Client établi: Acompte 50% AVANT', async () => {
    // Client avec 5 missions, score 75
    // Créer urgence
    // Vérifier depositPercentage = 50
  });

  it('36.3 - Client VIP: Acompte 30% AVANT', async () => {
    // Client avec 12 missions, score 120
    // Créer RDV planifié
    // Vérifier depositPercentage = 30
  });

  it('36.4 - No-show: Artisan signale client absent', async () => {
    // Artisan arrive
    // Client absent
    // Artisan attend 15min + preuves
    // Système valide auto
    // Client facturé 50€
    // Artisan compensé
    // Réputation client -10
  });

  it('36.5 - Auto-validation après 7 jours', async () => {
    // Mission complétée il y a 8 jours
    // Client n'a pas validé
    // CRON auto-valide
    // Artisan payé automatiquement
  });

  it('36.6 - Remboursement "Changement d\'avis" → Artisan compensé', async () => {
    // Client paie 200€
    // Client demande remboursement (CHANGED_MIND)
    // Client remboursé 200€
    // Artisan reçoit 200€ (plateforme absorbe)
    // Client -10 points réputation
  });

  it('36.7 - Remboursement "Travail non fait" → Artisan pas payé', async () => {
    // Client paie 200€
    // Client demande remboursement (WORK_NOT_DONE)
    // Client remboursé 200€
    // Artisan ne reçoit rien
    // Litige auto-ouvert
    // Artisan -20 points réputation
  });

  it('36.8 - Évolution réputation selon comportement', async () => {
    // Nouveau client: score 100
    // Complète mission: +10 → 110
    // Note 5 étoiles: +5 → 115
    // No-show: -10 → 105
    // Litige perdu: -20 → 85
  });
});
```

---

## 📦 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

### Phase 1: Base de données (1 jour)
1. Modifier schema.prisma
2. Créer migration Prisma
3. Appliquer migration en dev
4. Vérifier intégrité DB

### Phase 2: Services métier (2 jours)
1. ReputationService
2. PaymentService (refund avec compensation)
3. NoShowService
4. MissionService (auto-validation + blocage travel)

### Phase 3: API Endpoints (1 jour)
1. Routes réputation
2. Routes paiement modifiées
3. Routes no-show
4. Routes mission modifiées

### Phase 4: Tests E2E (1 jour)
1. Scénario 36.1-36.8
2. Validation manuelle
3. Correction bugs

### Phase 5: Documentation (0.5 jour)
1. API docs
2. Workflow docs
3. README

**TOTAL**: ~5.5 jours

---

## ⚠️ POINTS D'ATTENTION

### Sécurité
- ✅ Validation preuves no-show (éviter faux signalements)
- ✅ Rate limiting sur remboursements (éviter abus)
- ✅ Logs complets pour audit
- ✅ Webhook Stripe sécurisé

### Business
- ⚠️ Plateforme absorbe compensation "changement d'avis" → Coût à anticiper
- ⚠️ Monitoring des taux de no-show par zone géographique
- ⚠️ A/B test sur pourcentages acompte selon conversion

### UX
- 🎨 Afficher clairement modèle paiement au client
- 🎨 Expliquer pourquoi 100% vs 30% (réputation)
- 🎨 Gamification réputation (badges, niveaux)

---

## 🎯 VALIDATION AVANT IMPLÉMENTATION

**Questions à confirmer** :

1. ✅ Modèle hybride approuvé ?
2. ✅ Frais no-show: 30€ planifié, 50€ urgence OK ?
3. ✅ Auto-validation: 7 jours OK ?
4. ✅ Pénalité réputation: -10 no-show, -20 litige OK ?
5. ✅ Plateforme absorbe compensation "changement d'avis" OK ?

---

**Prêt à coder ?** Dis-moi si ce plan te convient ou si tu veux ajuster quelque chose ! 🚀
