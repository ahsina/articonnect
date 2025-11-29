# Analyse Approfondie du Parcours Artisan - ArtiConnect

## Vue d'Ensemble

Ce document analyse en détail les deux parcours artisan disponibles sur ArtiConnect :
1. **Artisan Indépendant** - Travailleur autonome avec son propre SIRET
2. **Entreprise Multi-Salariés** - Société avec employés (OWNER, MANAGER, SUPERVISOR, TECHNICIAN, CONTRACTOR)

---

# PARTIE 1 : ARTISAN INDÉPENDANT

## 1.1 Inscription et Authentification

### Flux d'inscription
```
1. Création compte (email, mot de passe, nom, prénom, téléphone)
2. Choix du rôle ARTISAN
3. Vérification email (token 24h)
4. Création profil artisan initial
5. Détection multi-comptes automatique (risque score)
```

**Fichier clé** : `backend/api-gateway/src/auth/services/auth.service.ts`

### Sécurité
- **Mot de passe** : bcrypt avec 12 rounds
- **2FA** : TOTP (Google Authenticator compatible) + 10 codes backup
- **OAuth** : Google, Facebook, Apple
- **Session** : JWT (access 15min) + Refresh token (30 jours)
- **Multi-comptes** : Détection par device fingerprint + IP + UserAgent

### Points d'amélioration identifiés
| Aspect | État actuel | Recommandation |
|--------|------------|----------------|
| Vérification téléphone | SMS optionnel | Rendre obligatoire pour artisans |
| Session unique | Non implémenté | Limiter à 3 sessions simultanées |
| Géolocalisation login | Basique | Alertes connexion depuis nouveau pays |

---

## 1.2 Configuration du Profil Artisan

### Éléments requis
```prisma
model ArtisanProfile {
  siret                String?        // Numéro SIRET (FR/LU/BE)
  vatNumber            String?        // Numéro TVA
  businessName         String?        // Nom commercial
  description          String?        // Bio/Présentation
  baseAddress          String         // Adresse de base
  city                 String
  postalCode           String
  country              Country        // LU, FR, BE
  latitude             Float?
  longitude            Float?
  serviceRadius        Int            // Rayon intervention (km)
  hourlyRate           Decimal?       // Tarif horaire
  emergencyRate        Decimal?       // Tarif urgence
  categories           Category[]     // Spécialités
  certifications       Certification[]
  portfolio            PortfolioItem[]
}
```

### Étapes de configuration
1. **Informations personnelles** - Nom, photo, bio
2. **Informations professionnelles** - SIRET, TVA, assurance
3. **Spécialités** - Catégories de services (plomberie, électricité, etc.)
4. **Zone d'intervention** - Adresse + rayon (défaut 20km)
5. **Tarification** - Taux horaire, taux urgence
6. **Disponibilités** - Horaires de travail récurrents
7. **Certifications** - Documents professionnels
8. **Portfolio** - Photos de réalisations

### Scoring du profil
```
Complet = 100%
- Photo : 10%
- Description : 10%
- SIRET vérifié : 15%
- Catégories : 10%
- Zone service : 10%
- Stripe Connect : 20%
- KYC vérifié : 15%
- Certifications : 5%
- Portfolio : 5%
```

---

## 1.3 Vérification KYC

### Flux de vérification
```
1. Artisan demande vérification
2. Stripe Identity session créée
3. Upload documents (passeport, CNI, permis)
4. Selfie avec détection liveness
5. Vérification automatique Stripe
6. Webhook → Mise à jour statut
```

**Fichiers clés** :
- `backend/api-gateway/src/compliance/services/stripe-identity.service.ts`
- `backend/api-gateway/src/compliance/services/kyc.service.ts`

### Seuils KYC
| Seuil | Montant | Action |
|-------|---------|--------|
| Transaction unique | ≥1000€ | KYC requis |
| Cumul mensuel | ≥3000€ | KYC requis |

### Statuts KYC
- `PENDING` - En attente de vérification
- `REQUIRES_INPUT` - Documents supplémentaires requis
- `VERIFIED` - Vérifié avec succès
- `REJECTED` - Rejeté
- `CANCELED` - Annulé

---

## 1.4 Stripe Connect

### Onboarding Stripe Express
```
1. Création compte Stripe Express
2. Redirect vers Stripe onboarding
3. Informations bancaires
4. Vérification identité
5. Webhook completion → stripeOnboarded = true
```

**Fichier clé** : `backend/api-gateway/src/payment/services/stripe.service.ts`

### Données stockées
```prisma
stripeAccountId        String?   // acct_xxx
stripeOnboarded        Boolean   // false → true après onboarding
stripeAccountStatus    String?   // active, pending, restricted
```

---

## 1.5 Gestion des Disponibilités

### Types de créneaux
```typescript
enum ShiftType {
  REGULAR    // Horaires standard
  OVERTIME   // Heures supplémentaires
  ONCALL     // Astreinte
  BREAK      // Pause
}
```

### Horaires récurrents
```prisma
model WorkingHours {
  dayOfWeek    Int      // 0=Dim, 1=Lun... 6=Sam
  startTime    String   // "09:00"
  endTime      String   // "18:00"
  isAvailable  Boolean
}
```

### Congés et absences
```prisma
model TimeOff {
  startDate    DateTime
  endDate      DateTime
  reason       String?
  approved     Boolean
}
```

### Sync calendrier externe
- Google Calendar (OAuth2)
- Outlook/Microsoft (OAuth2)
- iCal export/import

**Fichier clé** : `backend/api-gateway/src/calendar/services/google-calendar.service.ts`

---

## 1.6 Réception et Traitement des Missions

### Flux de découverte
```
Client crée mission → Système trouve artisans proches
                    → Filtre par spécialité
                    → Filtre par disponibilité
                    → Notification push (max 10 artisans)
```

### Matching algorithm
```typescript
// Distance Haversine (max 20km défaut)
// Spécialité correspondante
// Statut actif
// Disponibilité horaire
```

### Statuts mission
```
PENDING → NEGOTIATING → ACCEPTED → PENDING_DEPOSIT → DEPOSIT_PAID
       → IN_TRANSIT → IN_PROGRESS → COMPLETED → AUTO_VALIDATED
```

### Négociation prix
- Maximum 5 échanges
- Expiration : 15min (urgence) / 24h (programmé)
- Détection anomalie prix
- Décomposition : main d'œuvre + matériaux + déplacement

**Fichier clé** : `backend/api-gateway/src/mission/services/negotiation.service.ts`

---

## 1.7 Exécution de Mission

### Étapes
```
1. start-travel    → IN_TRANSIT (vérifie dépôt payé)
2. arrive          → IN_PROGRESS (démarre timer)
3. complete        → COMPLETED (48h rétractation)
4. validate/auto   → AUTO_VALIDATED (paiement déclenché)
```

### Gestion No-Show
```typescript
// Si client absent :
- Artisan soumet preuves (GPS, photos, logs appels)
- Auto-validation si preuves suffisantes
- Compensation : 50€ (urgence) / 30€ (programmé)
- Client perd 10 points réputation
```

**Fichier clé** : `backend/api-gateway/src/payment/services/no-show.service.ts`

---

## 1.8 Système de Paiement

### Commission plateforme
```
Mission : 100€
- Platform fee : 12% = 12€
- Artisan reçoit : 88% = 88€
```

### Modèle de dépôt (basé réputation client)
| Profil client | Dépôt requis |
|--------------|--------------|
| No-show historique | 100% |
| Taux dispute >10% | 100% |
| Score <50 | 100% |
| Nouveau client | 50% |
| Client VIP (>100 pts, +10 missions) | 30% |

### Paiement artisan
```
1. Capture paiement client (Stripe)
2. Screening fraude payout
3. Transfer vers Stripe Connect artisan
4. Notification confirmation
```

---

## 1.9 Système de Réputation

### Score (0-200 points)
```
+15 : Avis 5 étoiles
+10 : Mission complétée sans problème
+5  : Dispute gagnée
-10 : Avis 1-2 étoiles
-20 : Dispute perdue
-30 : No-show confirmé
```

### Impact réputation
- Classement dans résultats recherche
- Eligibilité missions premium
- Taux de dépôt clients

---

## 1.10 Avis Bidirectionnels

### Client → Artisan
```typescript
{
  overallRating: 1-5,
  qualityRating: 1-5,      // Qualité du travail
  punctualityRating: 1-5,  // Ponctualité
  communicationRating: 1-5,
  valueRating: 1-5,        // Rapport qualité/prix
  comment: string
}
```

### Artisan → Client
```typescript
{
  overallRating: 1-5,
  paymentPromptness: 1-5,  // Paiement à temps
  respectRating: 1-5,      // Comportement
  safetyRating: 1-5,       // Environnement de travail
  comment: string
}
```

### Détection fraude avis
- Score de fraude par avis
- Auto-masquage si seuil dépassé
- Analyse patterns suspects

**Fichier clé** : `backend/api-gateway/src/fraud/services/review-fraud-detector.service.ts`

---

# PARTIE 2 : ENTREPRISE MULTI-SALARIÉS

## 2.1 Création d'Entreprise

### Prérequis
- Utilisateur doit être ARTISAN
- Un artisan = une seule entreprise

### Données entreprise
```prisma
model Company {
  companyName              String
  siret                    String          @unique
  vatNumber                String?
  description              String?
  website                  String?
  baseAddress              String
  city                     String
  postalCode               String
  country                  Country
  serviceRadius            Int             @default(20)
  businessVerified         Boolean         @default(false)
  stripeAccountId          String?
  stripeOnboarded          Boolean         @default(false)
  // Stats agrégées
  totalMissions            Int             @default(0)
  totalRevenue             Decimal         @default(0)
  averageRating            Decimal?
  totalReviews             Int             @default(0)
}
```

### Flux création
```
1. Artisan soumet formulaire entreprise
2. Validation SIRET unique
3. Création Company + CompanySettings
4. Création CompanyEmployee (OWNER, 100% commission)
5. Onboarding Stripe Connect entreprise
```

**Fichier clé** : `backend/api-gateway/src/company/company.service.ts`

---

## 2.2 Rôles et Permissions

### Hiérarchie des rôles
```
OWNER (Propriétaire)
  └── MANAGER (Responsable)
        └── SUPERVISOR (Superviseur)
              └── TECHNICIAN (Technicien)
              └── CONTRACTOR (Sous-traitant)
```

### Permissions par rôle
| Permission | OWNER | MANAGER | SUPERVISOR | TECHNICIAN | CONTRACTOR |
|------------|-------|---------|------------|------------|------------|
| canManageCompany | ✅ | ❌ | ❌ | ❌ | ❌ |
| canManageEmployees | ✅ | ✅ | ❌ | ❌ | ❌ |
| canViewAllMissions | ✅ | ✅ | ✅ | ❌ | ❌ |
| canAssignMissions | ✅ | ✅ | ✅ | ❌ | ❌ |
| canViewFinancials | ✅ | ✅ | ❌ | ❌ | ❌ |
| canManageSettings | ✅ | ❌ | ❌ | ❌ | ❌ |
| canViewAssignedMissions | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2.3 Gestion des Employés

### Flux d'invitation
```
1. Manager invite par email
2. Token unique généré (64 chars hex)
3. Email envoyé avec lien
4. Employé accepte invitation
5. Statut → ACTIVE
6. Notification au owner
```

### Statuts employé
```typescript
enum EmployeeStatus {
  ACTIVE              // En poste
  INACTIVE            // Temporairement inactif
  TERMINATED          // Fin de contrat
  PENDING_INVITATION  // Invitation en attente
}
```

### Données employé
```prisma
model CompanyEmployee {
  userId              String
  companyId           String
  role                EmployeeRole
  status              EmployeeStatus
  paymentModel        PaymentModel
  commissionRate      Decimal?        // 0-100%
  baseSalary          Decimal?        // Salaire mensuel
  hourlyRate          Decimal?        // Taux horaire
  permissions         Json            // Array de permissions
  specialties         Specialty[]     // Compétences
  startDate           DateTime?
  endDate             DateTime?
  // Stats
  totalMissions       Int             @default(0)
  totalEarnings       Decimal         @default(0)
  averageRating       Decimal?
}
```

**Fichier clé** : `backend/api-gateway/src/employee/employee.service.ts`

---

## 2.4 Modèles de Rémunération

### Types de paiement
```typescript
enum PaymentModel {
  SALARY      // Salaire fixe, 0% commission
  COMMISSION  // 100% commission (défaut 50%)
  HYBRID      // Salaire + commission
}
```

### Calcul des gains
```
Mission: 500€

Si COMMISSION (50%):
  - Platform fee: 500 × 12% = 60€
  - Company revenue: 500 - 60 = 440€
  - Employee commission: 440 × 50% = 220€
  - Company profit: 440 - 220 = 220€

Si SALARY:
  - Employee commission: 0€
  - Employee reçoit salaire mensuel fixe

Si HYBRID (base 1500€ + 30%):
  - Salaire mensuel: 1500€
  - Commission mission: 440 × 30% = 132€
```

---

## 2.5 Planification des Shifts

### Types de shift
```typescript
enum ShiftType {
  REGULAR   // Standard
  OVERTIME  // Heures sup
  ONCALL    // Astreinte
  BREAK     // Pause
}
```

### Fonctionnalités
- Création individuelle ou en masse
- Détection conflits automatique
- Patterns récurrents (DAILY, WEEKLY, BIWEEKLY, MONTHLY)
- Vue calendrier par employé ou entreprise
- Requête employés disponibles par période

**Fichier clé** : `backend/api-gateway/src/employee/services/shift-scheduling.service.ts`

---

## 2.6 Attribution des Missions

### Flux d'attribution
```
1. Mission arrive à l'entreprise
2. Manager/Supervisor consulte employés disponibles
3. Attribution à un employé spécifique
4. Employé notifié
5. Employé exécute mission
6. Revenus créditées à l'employé
```

### Options d'attribution
- **Manuelle** : Manager assigne explicitement
- **Auto-assignement** : Si `allowEmployeeSelfAssignment = true`
- **Auto-attribution** : Si `autoAssignMissions = true` (basé sur dispo + compétences)

### Réassignation
- Possible tant que mission non démarrée
- Permissions requises : `canAssignMissions`
- Historique conservé

**Fichier clé** : `backend/api-gateway/src/mission/services/mission-assignment.service.ts`

---

## 2.7 Payroll Automatisé

### Fréquences de paiement
```typescript
enum PayoutFrequency {
  DAILY     // 2h du matin
  WEEKLY    // Dimanche
  BIWEEKLY  // 1er et 15
  MONTHLY   // 1er du mois
}
```

### Flux de paiement
```
1. CRON déclenche selon fréquence
2. Agrégation gains PENDING par employé
3. Vérification seuil minimum (défaut 50€)
4. Statut → PROCESSING
5. Stripe Transfer vers compte employé
6. Statut → PAID
7. Notification employé
```

### Gestion des erreurs
- Retry automatique si échec
- Statut FAILED après max retries
- Notification admin

**Fichier clé** : `backend/api-gateway/src/payment/services/automated-payout.service.ts`

---

## 2.8 Évaluations de Performance

### Types d'évaluation
1. **Performance Review** - Évaluation périodique par manager
2. **360 Feedback** - Feedback multi-sources
3. **Goals** - Objectifs individuels

### Critères d'évaluation
```typescript
{
  qualityOfWork: 1-5,
  communication: 1-5,
  reliability: 1-5,
  technicalSkills: 1-5,
  customerService: 1-5,
  teamwork: 1-5
}
```

### Workflow évaluation
```
1. DRAFT      → Manager crée évaluation
2. SUBMITTED  → Manager soumet
3. ACKNOWLEDGED → Employé confirme lecture
```

### Objectifs (Goals)
- Création par manager/supervisor
- Suivi de progression (0-100%)
- Catégorisation
- Date cible
- Notes de complétion

**Fichier clé** : `backend/api-gateway/src/employee/services/performance-review.service.ts`

---

## 2.9 Paramètres Entreprise

### CompanySettings
```prisma
model CompanySettings {
  // Commission
  defaultCommissionRate        Decimal   @default(50)
  ownerCommissionRate          Decimal   @default(100)

  // Attribution missions
  autoAssignMissions           Boolean   @default(false)
  requireManagerApproval       Boolean   @default(false)
  allowEmployeeSelfAssignment  Boolean   @default(true)

  // Paiement
  payoutFrequency              String    @default("WEEKLY")
  minimumPayout                Decimal   @default(50)

  // Notifications
  notifyOwnerOnNewMission      Boolean   @default(true)
  notifyManagerOnNewMission    Boolean   @default(true)
  notifyEmployeeOnAssignment   Boolean   @default(true)

  // Horaires défaut
  defaultWorkingHoursStart     String    @default("09:00")
  defaultWorkingHoursEnd       String    @default("18:00")
}
```

---

## 2.10 Reporting et Analytics

### Métriques entreprise
- Total missions (toutes / complétées / actives)
- Revenu total et par période
- Note moyenne et nombre d'avis
- Nombre d'employés par statut

### Métriques employé
- Missions assignées / complétées
- Revenus générés
- Note moyenne
- Temps de réponse

### Exports disponibles
- CSV des missions
- Rapport financier par période
- Performance employés

---

# PARTIE 3 : COMPARAISON DES MODÈLES

## 3.1 Tableau Comparatif

| Aspect | Indépendant | Entreprise (Owner) | Entreprise (Employee) |
|--------|-------------|--------------------|-----------------------|
| **Revenus** | 88% (après 12% plateforme) | 88% (paramétrable) | 0-88% (selon modèle) |
| **Paiement** | Direct par mission | Direct par mission | Selon fréquence entreprise |
| **Missions** | Auto-acceptation | Assigne ou exécute | Assignées par manager |
| **Disponibilités** | Auto-gérées | Auto-gérées | Shifts planifiés |
| **KYC** | Obligatoire | Obligatoire (entreprise) | Non requis |
| **Stripe Connect** | Obligatoire | Obligatoire (entreprise) | Optionnel (pour paiements) |
| **Évaluations** | Avis clients uniquement | Avis clients | Avis clients + Performance reviews |
| **Responsabilité** | Individuelle | Sur employés | Limitée aux missions |
| **Évolution** | Créer entreprise | - | Promotion possible |

---

## 3.2 Transition Indépendant → Entreprise

### Processus
```
1. Artisan indépendant avec profil complet
2. Création entreprise via formulaire
3. Migration SIRET vers entreprise
4. Artisan devient OWNER (100% commission)
5. Ancien profil artisan désactivé
6. Peut maintenant inviter employés
```

**Fichier clé** : `backend/api-gateway/src/common/migrations/artisan-to-company-migration.service.ts`

---

# PARTIE 4 : GAPS ET RECOMMANDATIONS

## 4.1 Gaps Identifiés

### Authentification
| Gap | Impact | Priorité |
|-----|--------|----------|
| Pas de vérification téléphone obligatoire | Fraude potentielle | HIGH |
| Sessions illimitées | Sécurité réduite | MEDIUM |
| Pas d'alertes connexion suspecte | Sécurité | MEDIUM |

### Gestion Employés
| Gap | Impact | Priorité |
|-----|--------|----------|
| Pas d'app mobile dédiée employé | UX réduite | HIGH |
| Pas de pointeuse temps réel | Suivi approximatif | MEDIUM |
| Pas de chat interne entreprise | Communication | LOW |

### Paiements
| Gap | Impact | Priorité |
|-----|--------|----------|
| Pas de factures PDF auto-générées | Comptabilité | HIGH |
| Pas d'export comptable (FEC) | Conformité | HIGH |
| Pas de multi-devises | Expansion | LOW |

### Missions
| Gap | Impact | Priorité |
|-----|--------|----------|
| Pas de devis PDF | Professionalisme | MEDIUM |
| Pas de signature électronique | Légal | MEDIUM |
| Pas de suivi temps réel GPS | Transparence | LOW |

---

## 4.2 Recommandations Prioritaires

### 1. Vérification téléphone obligatoire
```typescript
// Ajouter dans RegisterDto
phone: string;  // Obligatoire pour ARTISAN
phoneVerified: boolean;  // Doit être true avant missions

// Ajouter guard
@UseGuards(PhoneVerifiedGuard)
async acceptMission() { ... }
```

### 2. Génération factures/devis PDF
```typescript
// Nouveau service
class InvoiceService {
  generateQuotePDF(negotiation: Negotiation): Buffer
  generateInvoicePDF(mission: Mission): Buffer
  generateMonthlyStatement(artisan: Artisan, month: Date): Buffer
}
```

### 3. App mobile employé
- Vue missions assignées
- Pointage début/fin
- Chat avec supervisor
- Notifications push

### 4. Dashboard temps réel entreprise
```typescript
// WebSocket events
'employee:location' // GPS temps réel
'mission:status'    // Changements statut
'shift:started'     // Pointage
```

### 5. Export comptable FEC
```typescript
// Format officiel français
class AccountingExportService {
  exportFEC(company: Company, year: number): Buffer
  exportVATReport(company: Company, quarter: number): Buffer
}
```

---

## 4.3 Statut Production

### Artisan Indépendant : 95% Ready
| Feature | Status | Notes |
|---------|--------|-------|
| Inscription | ✅ 100% | OAuth + Email/Password |
| Profil | ✅ 100% | Complet |
| KYC | ✅ 100% | Stripe Identity intégré |
| Stripe Connect | ✅ 100% | Express accounts |
| Missions | ✅ 100% | Workflow complet |
| Paiements | ✅ 100% | Dépôt + Transfer |
| Avis | ✅ 100% | Bidirectionnel + fraude |
| Calendrier | ⚠️ 70% | UI basique, sync externe OK |
| Certifications | ⚠️ 80% | Notifications OK, vérification manuelle |

### Entreprise Multi-Salariés : 90% Ready
| Feature | Status | Notes |
|---------|--------|-------|
| Création entreprise | ✅ 100% | |
| Gestion employés | ✅ 100% | CRUD + invitations |
| Rôles/Permissions | ✅ 100% | 5 rôles, permissions granulaires |
| Attribution missions | ✅ 100% | Manuel + auto |
| Shifts | ✅ 100% | Planning + conflits |
| Payroll | ✅ 100% | 4 fréquences |
| Évaluations | ✅ 100% | Reviews + 360 + Goals |
| Reporting | ⚠️ 80% | Stats OK, exports limités |
| Facturation | ⚠️ 60% | Pas de PDF auto |

---

## 4.4 Roadmap Suggérée

### Phase 1 (Immédiat)
1. ✅ Calendrier interactif (FAIT)
2. ✅ Notifications certifications (FAIT)
3. ✅ Analytics dashboard (FAIT)
4. ✅ Stripe Identity réel (FAIT)
5. ⬜ Génération factures PDF
6. ⬜ Export comptable

### Phase 2 (Court terme)
1. ⬜ App mobile employé (React Native)
2. ⬜ Signature électronique devis
3. ⬜ Chat interne entreprise
4. ⬜ Pointeuse temps réel

### Phase 3 (Moyen terme)
1. ⬜ Multi-langues complet (DE, PT, IT)
2. ⬜ Multi-devises
3. ⬜ Marketplace matériaux
4. ⬜ Formation en ligne intégrée

---

*Document généré le 2025-11-29*
*Version 2.0 - Analyse approfondie Independent + Entreprise*
