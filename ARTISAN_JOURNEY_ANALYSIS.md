# Analyse Approfondie du Parcours Artisan - ArtiConnect

## Sommaire Executif

ArtiConnect est une plateforme marketplace B2C reliant des artisans professionnels (plombiers, electriciens, menuisiers, etc.) avec des clients dans 3 pays europeens (Luxembourg, France, Belgique). Cette analyse simule le parcours complet d'un artisan, de l'inscription a la reception de paiements.

---

## 1. INSCRIPTION ET AUTHENTIFICATION

### 1.1 Flux d'Inscription Artisan

**Fichiers cles:**
- `frontend/app/(auth)/register/page.tsx`
- `backend/api-gateway/src/auth/services/auth.service.ts`

**Etapes du processus:**

```
1. Selection du role "ARTISAN" sur la page d'inscription
2. Saisie des informations de base:
   - Email (unique)
   - Mot de passe (12+ caracteres, 1 majuscule, 1 minuscule, 1 chiffre, 1 caractere special)
   - Prenom, Nom
   - Telephone (optionnel)
3. Acceptation CGU et Politique de confidentialite
4. Creation du compte avec:
   - Hash bcrypt (12 rounds) du mot de passe
   - Detection multi-comptes (fingerprinting, IP, user agent)
   - Token de verification email (32 bytes crypto-secure, 24h validite)
5. Redirection vers /artisan/profile?setup=true
```

**Securite implementee:**
- Detection de fraude multi-comptes avec score de risque
- CAPTCHA reCAPTCHA v3 optionnel
- Verification d'email obligatoire
- Blocage si score de risque trop eleve

### 1.2 Authentification 2FA (Obligatoire pour Artisans)

**Fichiers:** `backend/api-gateway/src/auth/services/two-factor.service.ts`

```
- TOTP (Time-based One-Time Password) via speakeasy
- QR Code pour apps (Google Authenticator, Authy)
- 10 codes de secours hashes (bcrypt)
- Session 2FA temporaire (5 min) stockee en Redis
```

---

## 2. CONFIGURATION DU PROFIL ARTISAN

### 2.1 Setup Initial

**Fichiers cles:**
- `frontend/app/artisan/profile/page.tsx`
- Schema Prisma: `ArtisanProfile`

**Informations requises:**

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `companyName` | String | Oui | Nom commercial (ex: "Plomberie Martin") |
| `siret` | String | Oui | Numero SIRET/Matricule unique |
| `description` | String | Non | Presentation de l'activite |
| `baseAddress` | String | Oui | Adresse de base pour calcul distances |
| `latitude/longitude` | Float | Oui | Coordonnees GPS (geocodage) |
| `serviceRadius` | Int | Oui | Rayon d'intervention (1-100km, defaut: 20km) |
| `hourlyRate` | Decimal | Non | Tarif horaire indicatif |
| `emergencyRate` | Decimal | Non | Tarif urgences |
| `specialtyIds` | String[] | Oui | Competences (min. 1) |

**Specialites disponibles:**
- Plomberie, Electricite, Peinture, Menuiserie
- Maconnerie, Jardinage, Climatisation, Serrurerie

### 2.2 Verification Business

**Statuts de verification:**
```
- businessVerified: Boolean (validation admin des documents)
- businessVerificationStatus: PENDING | VERIFIED | REJECTED
- vatNumber: String (crypte pour RGPD)
- insurance: String (assurance RC Pro)
```

---

## 3. CONFIGURATION STRIPE CONNECT

### 3.1 Onboarding Paiement

**Fichiers cles:**
- `frontend/app/artisan/stripe/page.tsx`
- `backend/api-gateway/src/payment/services/stripe.service.ts`

**Processus:**

```
1. L'artisan clique sur "Set Up Payments"
2. Creation compte Stripe Express:
   - stripe.accounts.create({ type: 'express', country: 'LU', email })
3. Generation lien d'onboarding:
   - stripe.accountLinks.create({ account, type: 'account_onboarding' })
4. Redirection vers Stripe pour:
   - Verification d'identite (KYC)
   - Ajout compte bancaire (IBAN)
   - Acceptation conditions Stripe
5. Webhook de confirmation:
   - stripeAccountId stocke
   - stripeOnboarded = true
```

**Statuts affiches:**
- `Not Configured`: Pas encore commence
- `Incomplete`: Onboarding interrompu
- `Active`: Peut recevoir des paiements

**Commission plateforme:** 12% (88% pour l'artisan)

### 3.2 Methodes de Paiement Supportees

- **Carte bancaire** avec 3D Secure obligatoire (SCA compliance)
- **Apple Pay / Google Pay** (via automatic_payment_methods)
- **SEPA Direct Debit** (virement bancaire europeen)
- **Radar** (detection fraude automatique)

---

## 4. GESTION DES DISPONIBILITES

### 4.1 Modeles de Donnees

**Schema Prisma:**
```prisma
- WorkingHours: Horaires recurrents (lundi 8h-18h)
- AvailabilitySlot: Creneaux specifiques
- TimeOff: Vacances/absences
- RecurringUnavailability: Indisponibilites recurrentes
```

### 4.2 Interface Artisan

**Pages:**
- `/artisan/availability/calendar` - Vue calendrier
- `/artisan/availability/working-hours` - Horaires par defaut
- `/artisan/availability/time-off` - Gestion absences

**Toggle disponibilite:**
```typescript
// Toggle rapide sur le profil
await artisanApi.toggleAvailability(!profile.available);
```

---

## 5. RECEPTION ET TRAITEMENT DES MISSIONS

### 5.1 Algorithme de Matching

**Fichiers:** `backend/api-gateway/src/mission/services/mission.service.ts`

**Criteres de matching:**
```
1. Distance (Haversine) < serviceRadius de l'artisan
2. Specialite correspondante a la categorie mission
3. Artisan disponible (available = true)
4. Statut actif (status = 'ACTIVE')
```

**Notifications:**
```typescript
// Max 10 artisans notifies par mission
await this.prisma.notification.createMany({
  data: artisansToNotify.map(artisan => ({
    userId: artisan.id,
    type: 'NEW_MISSION',
    title: 'Nouvelle mission disponible',
    message: `Une nouvelle mission "${mission.title}" correspond a vos competences`,
    link: `/artisan/missions/${mission.id}`,
  })),
});
```

### 5.2 Statuts de Mission

```
PENDING → Creation par client
   ↓
NEGOTIATING → Artisan accepte, negociation prix
   ↓
ACCEPTED → Prix agree
   ↓
PENDING_DEPOSIT → Attente acompte client
   ↓
DEPOSIT_PAID → Acompte paye
   ↓
IN_TRANSIT → Artisan en route
   ↓
IN_PROGRESS → Travail commence
   ↓
COMPLETED → Travail termine (48h retractation)
   ↓
AUTO_VALIDATED → Validation automatique apres 7 jours

Exceptions:
- CANCELLED: Annulation
- DISPUTED: Litige ouvert
- CANCELLED_NO_SHOW: No-show client
```

---

## 6. SYSTEME DE NEGOCIATION

### 6.1 Processus de Negociation

**Fichiers:** `backend/api-gateway/src/mission/services/negotiation.service.ts`

**Regles:**
- Maximum 5 echanges par mission
- Expiration: 15 min (urgence) / 24h (standard)
- Detection d'anomalie de prix automatique

**Structure d'une offre:**
```typescript
{
  proposedPrice: number,    // Prix total propose
  laborCost: number,        // Cout main d'oeuvre
  materialCost: number,     // Cout materiaux
  travelCost: number,       // Frais deplacement
  message: string,          // Message explicatif
  expiresAt: Date           // Date d'expiration
}
```

### 6.2 Detection Anomalies de Prix

**Fichiers:** `fraud/services/price-anomaly-detector.service.ts`

```typescript
// Apres acceptation du prix:
const anomalyResult = await this.priceAnomalyDetector.detectPriceAnomaly(missionId);

// Champs mis a jour:
mission.priceAnomalyFlag = anomalyResult.isAnomalous;
mission.expectedPrice = anomalyResult.expectedPrice;
mission.priceDeviation = anomalyResult.deviationPercentage;
```

---

## 7. SYSTEME DE PAIEMENT HYBRIDE

### 7.1 Determination de l'Acompte

**Fichiers:** `backend/api-gateway/src/payment/services/reputation.service.ts`

**Regles basees sur la reputation client:**

| Condition | Acompte | Niveau Risque |
|-----------|---------|---------------|
| No-show anterieur | 100% | HIGH |
| Taux litiges > 10% | 100% | HIGH |
| Score < 50 | 100% | HIGH |
| Mission urgence (non VIP) | 100% | MEDIUM |
| Mission urgence (VIP) | 50% | LOW |
| Client VIP (score > 100, 10+ missions) | 30% | LOW |
| Client etabli | 50% | MEDIUM |

### 7.2 Flux de Paiement

```
1. Client paye l'acompte (createDepositPayment)
   - PaymentIntent Stripe avec 3D Secure
   - Funds en escrow (capture_method: 'manual')

2. Artisan demarre le trajet (startTravel)
   - Verification acompte paye
   - Statut: IN_TRANSIT

3. Artisan arrive et travaille (markArrival)
   - Statut: IN_PROGRESS

4. Artisan termine (markCompleted)
   - Statut: COMPLETED
   - Delai retractation 48h demarre

5. Validation client ou auto-validation 7 jours
   - Capture du paiement
   - Transfert artisan (moins 12% commission)
```

### 7.3 Payout Fraud Detection

**Avant chaque transfert artisan:**
```typescript
const fraudResult = await this.payoutFraudDetector.screenPayout(artisanId, payoutAmount);

if (fraudResult.recommendation === 'HOLD_24H') {
  // Retenir le paiement 24h pour verification
}
if (fraudResult.recommendation === 'BLOCK') {
  throw new BadRequestException('Paiement bloque');
}
```

---

## 8. SYSTEME DE REPUTATION

### 8.1 Score de Reputation

**Echelle:** 0 - 200 points (100 = neutre)

**Actions et Points:**

| Action | Points | Direction |
|--------|--------|-----------|
| Mission completee | +10 | ↑ |
| Avis 5 etoiles | +15 | ↑ |
| Litige gagne | +5 | ↑ |
| Avis negatif (1-2 etoiles) | -10 | ↓ |
| No-show | -10 | ↓ |
| Mission annulee | -5 | ↓ |
| Litige perdu | -20 | ↓ |

### 8.2 Impact sur les Paiements

```typescript
// Clients a risque = plus d'acompte requis
if (score < 50 || noShowCount > 0 || disputeRate > 10%) {
  depositPercentage = 100;
  riskLevel = 'HIGH';
}
```

---

## 9. SYSTEME D'AVIS BIDIRECTIONNEL

### 9.1 Client → Artisan

**Fichiers:** `backend/api-gateway/src/review/services/review.service.ts`

**Criteres notes (1-5 etoiles):**
- `overallRating` - Note globale
- `qualityRating` - Qualite du travail
- `punctualityRating` - Ponctualite
- `communicationRating` - Communication
- `valueRating` - Rapport qualite/prix

### 9.2 Artisan → Client

**Criteres supplementaires:**
- `paymentPromptness` - Rapidite de paiement
- `respectRating` - Respect et courtoisie
- `safetyRating` - Securite du lieu de travail

### 9.3 Detection de Faux Avis

```typescript
const fraudResult = await this.reviewFraudDetector.detectFakeReview(review.id);

// Auto-masquage si score fraude > seuil
if (autoHideEnabled && fraudResult.fraudScore >= fraudThreshold) {
  review.hidden = true;
  review.hiddenReason = `Auto-hidden: fraud score ${fraudResult.fraudScore}`;
}
```

**Signaux detectes:**
- Contenu genere par IA
- Pattern suspect (timing, repetitions)
- Incitation financiere
- Abus de compte

---

## 10. DASHBOARD ARTISAN

### 10.1 Vue d'Ensemble

**Page:** `frontend/app/artisan/dashboard/page.tsx`

**Metriques affichees:**
- Total missions
- Missions en cours
- Missions completees
- Missions en attente
- Note moyenne

### 10.2 Gains

**API:** `artisanApi.getEarningsSummary()`

```typescript
interface EarningsSummary {
  totalEarnings: number;      // Total cumule
  pendingEarnings: number;    // En attente de validation
  thisMonthEarnings: number;  // Ce mois
  averagePerMission: number;  // Moyenne par mission
}
```

### 10.3 Missions a Proximite

```typescript
// Geolocalisation browser
navigator.geolocation.getCurrentPosition(async (position) => {
  const nearby = await missionsApi.getNearby(
    position.coords.latitude,
    position.coords.longitude,
    20 // rayon km
  );
});
```

---

## 11. GESTION D'ENTREPRISE (Multi-Employes)

### 11.1 Modeles

```prisma
model Company {
  id: String
  name: String
  owner: User
  employees: CompanyEmployee[]
  artisans: ArtisanProfile[]
}

model CompanyEmployee {
  id: String
  role: OWNER | MANAGER | SUPERVISOR | TECHNICIAN | CONTRACTOR
  salaryType: FIXED | COMMISSION | HYBRID
  commissionRate: Decimal
}
```

### 11.2 Fonctionnalites

**Pages:**
- `/artisan/company/create` - Creation entreprise
- `/artisan/company/employees` - Gestion employes
- `/artisan/company/assignments` - Affectation missions
- `/artisan/company/reports` - Rapports d'activite

---

## 12. CONFORMITE ET SECURITE

### 12.1 KYC (Know Your Customer)

**Fichiers:** `backend/api-gateway/src/compliance/services/kyc.service.ts`

**Seuils:**
- Transaction unique >= 1000EUR → KYC requis
- Cumul 30 jours >= 3000EUR → KYC requis

**Implementation:** Stripe Identity

### 12.2 TVA Multi-Pays

| Pays | Taux TVA |
|------|----------|
| Luxembourg | 17% |
| France | 20% |
| Belgique | 21% |

### 12.3 RGPD

- Export donnees utilisateur
- Droit a l'oubli (suppression)
- Consentement explicite a l'inscription
- Chiffrement donnees sensibles (vatNumber)

---

## 13. POINTS D'AMELIORATION IDENTIFIES

### 13.1 Fonctionnels

1. **Geocodage automatique** - L'adresse est stockee en string, le geocodage utilise des coordonnees par defaut par pays plutot qu'un service de geocodage reel.

2. **Calendrier avance** - L'integration Outlook Calendar est mentionnee mais non implementee de maniere visible dans le frontend artisan.

3. **Notifications push** - Firebase FCM est configure mais l'integration complete mobile (Capacitor) necessite verification.

### 13.2 Techniques

1. **Rate Limiting** - Configure a 10 req/s general, pourrait etre affine par endpoint.

2. **Tests E2E** - Nombreux tests unitaires mais tests d'integration limites pour le parcours complet.

3. **Monitoring** - Sentry/DataDog configures mais dashboards metier non visibles.

### 13.3 UX

1. **Onboarding Guide** - Pas de wizard step-by-step pour guider l'artisan lors de la premiere utilisation.

2. **Validation Front** - Certaines validations cote serveur uniquement (ex: format SIRET).

---

## 14. CONCLUSION

ArtiConnect presente une architecture **production-ready** avec:

**Points Forts:**
- Systeme de paiement robuste avec escrow et fraud detection
- Reputation bidirectionnelle influencant les conditions de paiement
- Multi-pays avec gestion TVA automatique
- Securite complete (2FA, KYC, RGPD)

**Architecture Technique:**
- Backend: NestJS avec Prisma (102 modeles)
- Frontend: Next.js 14 App Router
- Paiement: Stripe Connect Express
- Real-time: Socket.io + MongoDB (chat)

Le parcours artisan est **complet et coherent**, de l'inscription a la reception des paiements, avec des mecanismes de protection contre la fraude a chaque etape.

---

*Rapport genere le 29 novembre 2025*
*Analyse basee sur le code source ArtiConnect v1.0*
