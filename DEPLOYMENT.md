# Guide de Déploiement ArtiConnect

Ce guide couvre le déploiement complet de la plateforme ArtiConnect en production.

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Configuration de l'Infrastructure](#2-configuration-de-linfrastructure)
3. [Configuration des Services Externes](#3-configuration-des-services-externes)
4. [Setup de la Base de Données](#4-setup-de-la-base-de-données)
5. [Configuration de l'Application](#5-configuration-de-lapplication)
6. [Déploiement avec Docker](#6-déploiement-avec-docker)
7. [Déploiement sur Cloud](#7-déploiement-sur-cloud)
8. [Configuration CI/CD](#8-configuration-cicd)
9. [Vérifications Post-Déploiement](#9-vérifications-post-déploiement)
10. [Monitoring et Logs](#10-monitoring-et-logs)
11. [Sécurité](#11-sécurité)
12. [Troubleshooting](#12-troubleshooting)
13. [Rollback](#13-rollback)

---

## 1. Prérequis

### Infrastructure Minimale

- **Serveur**:
  - CPU: 2 vCPUs minimum (4 vCPUs recommandé)
  - RAM: 4GB minimum (8GB recommandé)
  - Stockage: 50GB SSD minimum
  - OS: Ubuntu 22.04 LTS / Debian 11+ / Amazon Linux 2

- **Logiciels**:
  - Docker 24+ & Docker Compose 2.20+
  - Git 2.30+
  - Node.js 20+ (pour les builds locaux)
  - PostgreSQL 15+ (ou via Docker)
  - Redis 7+ (ou via Docker)

### Comptes et Services Externes

- [x] Compte AWS (S3 pour fichiers)
- [x] Compte Stripe (paiements)
- [x] Compte Google Cloud (Maps API)
- [x] Compte Firebase (notifications push)
- [x] Compte Twilio (SMS)
- [x] Compte SendGrid ou SMTP (emails)
- [x] Compte Sentry (monitoring erreurs - optionnel)
- [x] Nom de domaine configuré

---

## 2. Configuration de l'Infrastructure

### 2.1 Installation Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Vérifier
docker --version
docker-compose --version
```

### 2.2 Configuration Firewall

```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP
```

### 2.3 Configuration DNS

Configurer les enregistrements DNS pour votre domaine:

```
Type    Name              Value                   TTL
A       articonnect.fr    <YOUR_SERVER_IP>       300
A       api.articonnect.fr  <YOUR_SERVER_IP>     300
CNAME   www               articonnect.fr         300
```

---

## 3. Configuration des Services Externes

### 3.1 Google Maps API

**Étapes détaillées:**

1. **Accéder à Google Cloud Console**
   - Aller sur [https://console.cloud.google.com](https://console.cloud.google.com)
   - Se connecter avec votre compte Google

2. **Créer un nouveau projet**
   - Cliquer sur le menu déroulant de sélection de projet en haut
   - Cliquer sur "New Project"
   - Nom du projet: `ArtiConnect Production`
   - Organization: Sélectionner votre organisation ou "No organization"
   - Cliquer sur "Create"

3. **Activer la facturation**
   - Menu hamburger > Billing
   - Lier un compte de facturation (carte bancaire requise)
   - ⚠️ Google offre $200 de crédits gratuits pour les nouveaux comptes
   - Configurer des alertes de budget: $300/mois recommandé

4. **Activer les APIs nécessaires**
   - Menu hamburger > APIs & Services > Library

   Activer les APIs suivantes:

   a) **Geocoding API** (convertir adresses en coordonnées):
      - Rechercher "Geocoding API"
      - Cliquer sur "Enable"

   b) **Maps JavaScript API** (affichage de cartes):
      - Rechercher "Maps JavaScript API"
      - Cliquer sur "Enable"

   c) **Places API** (autocomplete d'adresses):
      - Rechercher "Places API"
      - Cliquer sur "Enable"

   d) **Distance Matrix API** (calcul de distances):
      - Rechercher "Distance Matrix API"
      - Cliquer sur "Enable"

   e) **Geolocation API** (optionnel, pour localisation GPS):
      - Rechercher "Geolocation API"
      - Cliquer sur "Enable"

5. **Créer une clé API**
   - APIs & Services > Credentials
   - Cliquer sur "+ CREATE CREDENTIALS"
   - Sélectionner "API key"
   - Une clé sera générée (format: `AIzaSy...`)

6. **Sécuriser la clé API** ⚠️ TRÈS IMPORTANT

   a) **Restriction d'application**:
      - Cliquer sur la clé API créée
      - Section "Application restrictions"
      - Sélectionner "HTTP referrers (web sites)"
      - Ajouter vos domaines:
        ```
        https://articonnect.fr/*
        https://*.articonnect.fr/*
        http://localhost:3000/*  (pour développement)
        ```

   b) **Restriction d'API**:
      - Section "API restrictions"
      - Sélectionner "Restrict key"
      - Cocher uniquement les APIs activées:
        - Geocoding API
        - Maps JavaScript API
        - Places API
        - Distance Matrix API

   c) **Sauvegarder**:
      - Cliquer sur "Save"

7. **Définir des quotas (optionnel mais recommandé)**
   - APIs & Services > Enabled APIs & Services
   - Cliquer sur chaque API
   - Aller dans "Quotas"
   - Définir des limites quotidiennes:
     - Geocoding: 10,000 requêtes/jour
     - Maps JavaScript: 25,000 chargements/jour
     - Places Autocomplete: 10,000 requêtes/jour

8. **Copier la clé API**
   - APIs & Services > Credentials
   - Copier la clé API (format: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXX`)

**Variables d'environnement:**
```env
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Coût estimé:**
- Geocoding API: $5 per 1,000 requests (first 40,000 free/month)
- Maps JavaScript: $7 per 1,000 loads (first 28,000 free/month)
- Places Autocomplete: $2.83 per 1,000 requests
- **Total estimé: $50-200/mois** selon utilisation

**Tester la configuration:**
```bash
# Test Geocoding API
curl "https://maps.googleapis.com/maps/api/geocode/json?address=Paris,France&key=YOUR_API_KEY"

# Devrait retourner les coordonnées de Paris
```

---

### 3.2 Stripe (Paiements)

**Étapes détaillées:**

1. **Créer un compte Stripe**
   - Aller sur [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
   - Remplir le formulaire d'inscription
   - Vérifier votre email

2. **Activer votre compte (KYC)**
   - Dashboard > Settings > Business settings
   - Compléter les informations:
     - Type d'entreprise (SARL, SAS, Auto-entrepreneur, etc.)
     - SIRET / SIREN
     - Adresse légale
     - Informations bancaires (IBAN)
     - Pièce d'identité du représentant légal
   - ⚠️ L'activation peut prendre 1-3 jours ouvrés

3. **Récupérer les clés API**
   - Dashboard > Developers > API Keys

   Vous verrez deux environnements:

   a) **Test Mode** (pour développement):
      - Publishable key: `pk_test_...`
      - Secret key: `sk_test_...`

   b) **Live Mode** (pour production):
      - Toggle "View test data" → OFF
      - Publishable key: `pk_live_...`
      - Secret key: `sk_live_...`

   ⚠️ **JAMAIS** commit ou partager les clés `sk_live_...`

4. **Configurer Stripe Connect** (pour paiements artisans)

   a) Activer Connect:
      - Dashboard > Connect > Get started
      - Choisir le type de plateforme: **Standard** (recommandé)
        - Standard: Les artisans gèrent leur propre compte Stripe
        - Express: Vous gérez les comptes pour eux (plus simple)

   b) Configurer les paramètres:
      - Connect > Settings
      - Branding: Logo, couleurs, nom de la plateforme
      - Account requirements: Informations requises des artisans

   c) Récupérer le Client ID:
      - Connect > Settings > General
      - Copier le "Connect Client ID": `ca_...`

5. **Configurer les Webhooks**

   Les webhooks permettent à Stripe de notifier votre backend des événements de paiement.

   a) Créer un endpoint:
      - Dashboard > Developers > Webhooks
      - Cliquer sur "+ Add endpoint"
      - Endpoint URL: `https://api.articonnect.fr/webhooks/stripe`
      - Description: "ArtiConnect Production Webhook"

   b) Sélectionner les événements à écouter:
      ```
      ✓ payment_intent.succeeded          (paiement réussi)
      ✓ payment_intent.payment_failed     (paiement échoué)
      ✓ payment_intent.requires_action    (authentification 3D Secure)
      ✓ charge.refunded                   (remboursement)
      ✓ charge.dispute.created            (litige créé)
      ✓ account.updated                   (compte Connect mis à jour)
      ✓ account.application.deauthorized  (artisan déconnecté)
      ✓ payout.paid                       (virement artisan effectué)
      ✓ payout.failed                     (virement artisan échoué)
      ✓ invoice.payment_succeeded         (pour abonnements)
      ✓ customer.subscription.deleted     (abonnement annulé)
      ```

   c) Récupérer le Webhook Secret:
      - Après création, cliquer sur l'endpoint
      - Section "Signing secret"
      - Cliquer sur "Reveal" et copier: `whsec_...`

6. **Configurer les produits/prix** (optionnel)

   a) Créer un produit:
      - Dashboard > Products > + Add product
      - Nom: "Commission ArtiConnect" ou "Abonnement Premium"
      - Pricing: Montant et devise (EUR)
      - Type: One-time ou Recurring

   b) Copier le Price ID:
      - Format: `price_...`
      - Utilisé dans le code pour créer des paiements

7. **Configurer les emails clients**
   - Dashboard > Settings > Emails
   - Activer les emails automatiques:
     - Reçu de paiement
     - Échec de paiement
     - Remboursement

8. **Configurer la conformité fiscale**
   - Dashboard > Settings > Tax settings
   - Activer la collecte de TVA si nécessaire
   - Configurer les taux de TVA par pays

**Variables d'environnement:**
```env
# Production
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# Test (développement)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_CONNECT_CLIENT_ID=ca_test_...
```

**Coûts:**
- **Paiements européens**: 1.4% + 0.25€ par transaction
- **Stripe Connect**: +0.25% par transaction sur sous-comptes
- **Virements (payouts)**: Gratuit en SEPA
- **Exemple**: Transaction de 100€ = 1.65€ de frais

**Tester la configuration:**
```bash
# Test avec Stripe CLI (installer stripe CLI d'abord)
stripe listen --forward-to http://localhost:4000/webhooks/stripe

# Carte de test: 4242 4242 4242 4242 (toute date future, tout CVC)
```

---

### 3.3 AWS S3 (Stockage Fichiers)

**Étapes détaillées:**

1. **Créer un compte AWS**
   - Aller sur [https://aws.amazon.com](https://aws.amazon.com)
   - Cliquer sur "Create an AWS Account"
   - Remplir les informations (carte bancaire requise)
   - ⚠️ Activer la MFA (authentification à deux facteurs) pour la sécurité

2. **Créer un utilisateur IAM** (ne PAS utiliser le compte root)

   a) Accéder à IAM:
      - Console AWS > Services > IAM

   b) Créer un utilisateur:
      - Users > Add users
      - User name: `articonnect-s3-user`
      - Access type: ✓ Programmatic access (pour API)
      - Next

   c) Définir les permissions:
      - **Option 1 (simple)**: Attach existing policy → `AmazonS3FullAccess`
      - **Option 2 (recommandé, sécurisé)**: Create custom policy:
        ```json
        {
          "Version": "2012-10-17",
          "Statement": [
            {
              "Effect": "Allow",
              "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
              ],
              "Resource": [
                "arn:aws:s3:::articonnect-uploads-production",
                "arn:aws:s3:::articonnect-uploads-production/*"
              ]
            }
          ]
        }
        ```
      - Next > Create user

   d) Récupérer les credentials:
      - ⚠️ **IMPORTANT**: Télécharger le CSV ou copier maintenant
      - Access Key ID: `AKIAXXXXXXXXXXXXXXXX`
      - Secret Access Key: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
      - ⚠️ Ces credentials ne seront **plus jamais affichés**

3. **Créer un bucket S3**

   a) Accéder à S3:
      - Console AWS > Services > S3

   b) Créer un bucket:
      - Cliquer sur "Create bucket"
      - Bucket name: `articonnect-uploads-production`
        - ⚠️ Doit être unique globalement
        - Suggestion: `articonnect-uploads-prod-<votre-id>`
      - AWS Region: `eu-west-3` (Paris) - important pour GDPR
      - Object Ownership: ACLs enabled

   c) Configurer l'accès public:
      - **Block all public access**: ❌ Décocher (pour permettre l'accès aux images)
      - ⚠️ Accepter l'avertissement (nous allons sécuriser avec ACLs)

   d) Versioning:
      - ✓ Enable versioning (permet de récupérer les fichiers supprimés)

   e) Encryption:
      - ✓ Enable server-side encryption
      - Encryption type: Amazon S3-managed keys (SSE-S3)

   f) Cliquer sur "Create bucket"

4. **Configurer CORS sur le bucket**

   CORS permet au navigateur de uploader des fichiers depuis votre domaine.

   a) Ouvrir le bucket créé
   b) Onglet "Permissions"
   c) Section "Cross-origin resource sharing (CORS)"
   d) Cliquer sur "Edit"
   e) Ajouter cette configuration:

   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": [
         "https://articonnect.fr",
         "https://*.articonnect.fr",
         "http://localhost:3000"
       ],
       "ExposeHeaders": ["ETag", "x-amz-server-side-encryption"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

   f) Sauvegarder

5. **Configurer la Bucket Policy** (optionnel, pour accès public en lecture)

   a) Permissions > Bucket Policy
   b) Ajouter cette policy (permet lecture publique des images):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::articonnect-uploads-production/public/*"
       }
     ]
   }
   ```

   ⚠️ Cela rend le dossier `/public/*` accessible publiquement

6. **Configurer Lifecycle Policy** (optionnel, pour optimiser les coûts)

   a) Management > Lifecycle rules
   b) Create rule:
      - Rule name: "Delete temp files"
      - Rule scope: Prefix = `temp/`
      - Lifecycle rule actions:
        - ✓ Expire current versions of objects
        - Days after object creation: 7
   c) Create rule:
      - Rule name: "Archive old files"
      - Rule scope: Prefix = `archive/`
      - Lifecycle rule actions:
        - ✓ Move current versions to Glacier after 90 days

7. **Configurer CloudFront CDN** (optionnel, recommandé pour performance)

   a) Services > CloudFront > Create distribution
   b) Origin domain: Sélectionner votre bucket S3
   c) Viewer protocol policy: Redirect HTTP to HTTPS
   d) Allowed HTTP methods: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   e) Create distribution
   f) Copier le CloudFront domain: `d111111abcdef8.cloudfront.net`

**Variables d'environnement:**
```env
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_S3_BUCKET=articonnect-uploads-production

# Optionnel si CloudFront
AWS_CLOUDFRONT_DOMAIN=d111111abcdef8.cloudfront.net
```

**Coûts (région Paris eu-west-3):**
- **Stockage**: $0.024 par GB/mois (premiers 50 TB)
- **Transfert sortant**: $0.09 par GB (premiers 10 TB)
- **Requêtes PUT**: $0.0055 per 1,000 requests
- **Requêtes GET**: $0.00044 per 1,000 requests
- **Exemple**: 10GB stockage + 50GB transfert = ~$5/mois

**Tester la configuration:**
```bash
# Installer AWS CLI
sudo apt-get install awscli

# Configurer
aws configure
# AWS Access Key ID: AKIA...
# AWS Secret Access Key: ...
# Default region: eu-west-3
# Default output format: json

# Tester
echo "test" > test.txt
aws s3 cp test.txt s3://articonnect-uploads-production/test/test.txt

# Lister
aws s3 ls s3://articonnect-uploads-production/test/

# Supprimer
aws s3 rm s3://articonnect-uploads-production/test/test.txt
```

---

### 3.4 Firebase Cloud Messaging (Notifications Push)

**Étapes détaillées:**

1. **Créer un projet Firebase**
   - Aller sur [https://console.firebase.google.com](https://console.firebase.google.com)
   - Cliquer sur "Add project"
   - Nom du projet: `ArtiConnect Production`
   - Accepter les termes
   - Enable Google Analytics: Oui (recommandé)
   - Choisir le compte Analytics
   - Cliquer sur "Create project"

2. **Ajouter une application Web**

   a) Dans le projet Firebase, cliquer sur l'icône Web `</>`
   b) App nickname: `ArtiConnect Web`
   c) ✓ Also set up Firebase Hosting (optionnel)
   d) Cliquer sur "Register app"
   e) Copier la configuration (firebaseConfig) pour le frontend

   ```javascript
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "articonnect-prod.firebaseapp.com",
     projectId: "articonnect-prod",
     storageBucket: "articonnect-prod.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```

3. **Activer Cloud Messaging**

   a) Menu hamburger > Build > Cloud Messaging
   b) ⚠️ Si demandé, associer le projet à une app mobile (ou skip)
   c) Cloud Messaging API devrait être activé automatiquement

4. **Générer une clé de serveur (pour le backend)**

   a) Project Settings (⚙️) > Service Accounts
   b) Cliquer sur "Generate new private key"
   c) Confirmer et télécharger le fichier JSON

   Le fichier ressemble à:
   ```json
   {
     "type": "service_account",
     "project_id": "articonnect-prod",
     "private_key_id": "abc123...",
     "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@articonnect-prod.iam.gserviceaccount.com",
     "client_id": "123456789",
     "auth_uri": "https://accounts.google.com/o/oauth2/auth",
     "token_uri": "https://oauth2.googleapis.com/token",
     "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
     "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
   }
   ```

5. **Extraire les variables d'environnement**

   Du fichier JSON téléchargé, extraire:
   - `project_id`: ID du projet
   - `private_key`: Clé privée (garder les `\n`)
   - `client_email`: Email du service account

6. **Configurer les notifications Web** (pour PWA)

   a) Project Settings > Cloud Messaging
   b) Web Push certificates > Generate key pair
   c) Copier le VAPID key pour le frontend

7. **Configurer les apps mobiles** (si application mobile)

   a) Pour Android:
      - Cliquer sur l'icône Android
      - Package name: `com.articonnect.app`
      - Télécharger `google-services.json`

   b) Pour iOS:
      - Cliquer sur l'icône iOS
      - Bundle ID: `com.articonnect.app`
      - Télécharger `GoogleService-Info.plist`
      - Upload le certificat APNs

**Variables d'environnement (Backend):**
```env
FIREBASE_PROJECT_ID=articonnect-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIB...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@articonnect-prod.iam.gserviceaccount.com
```

**Variables Frontend (Web):**
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=articonnect-prod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=articonnect-prod
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_VAPID_KEY=BNxxx...
```

**Coûts:**
- **Gratuit** jusqu'à 10 millions de messages/mois
- Au-delà: $0.01 par 1,000 messages
- **Pour la plupart des apps**: Gratuit à vie

**Tester la configuration:**
```bash
# Envoyer une notification de test depuis le backend
curl -X POST https://api.articonnect.fr/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "body": "Test notification",
    "userId": "user123"
  }'
```

---

### 3.5 Twilio (SMS Vérification)

**Étapes détaillées:**

1. **Créer un compte Twilio**
   - Aller sur [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
   - Remplir le formulaire d'inscription
   - Vérifier votre email et numéro de téléphone

2. **Compléter la vérification d'identité (KYC)**

   a) Dashboard > Account > Regulatory Compliance
   b) Remplir les informations:
      - Type d'entreprise
      - Informations légales
      - Adresse
   c) Upload des documents:
      - Kbis ou extrait INSEE
      - Pièce d'identité du représentant légal
   d) Validation: 1-5 jours ouvrés

3. **Acheter un numéro de téléphone**

   a) Console > Phone Numbers > Buy a Number
   b) Configuration:
      - Country: France (+33)
      - Capabilities: ✓ SMS (Voice optionnel)
      - Type: Mobile ou Local
   c) Rechercher et sélectionner un numéro
   d) Prix: ~1€/mois par numéro
   e) Cliquer sur "Buy"

4. **Récupérer les credentials**

   a) Console Dashboard (page d'accueil)
   b) Section "Account Info"
   c) Copier:
      - Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
      - Auth Token: Cliquer sur "Show" et copier

   ⚠️ **NE JAMAIS** commit ou partager l'Auth Token

5. **Configurer un Messaging Service** (recommandé pour meilleure délivrabilité)

   a) Console > Messaging > Services
   b) Create Messaging Service
   c) Configuration:
      - Friendly Name: `ArtiConnect SMS`
      - Use Case: `2FA, Account Notifications`
   d) Sender Pool:
      - Add senders > Phone Number
      - Sélectionner le numéro acheté
   e) Copy le Messaging Service SID: `MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **Configurer les templates SMS** (pour conformité)

   Pour éviter le spam, créer des templates:

   a) Console > Messaging > Regulatory Compliance > SMS Templates
   b) Créer un template de vérification:
      ```
      ArtiConnect: Votre code de vérification est {code}.
      Valide pendant 10 minutes. Ne le partagez pas.
      ```
   c) Soumettre pour approbation (24-48h)

7. **Configurer les alertes de budget**

   a) Console > Account > Usage & Alerts
   b) Set up alerts:
      - Monthly SMS limit: 500€
      - Alert at: 80% (400€)

8. **Tester avec le numéro gratuit** (Trial mode)

   En mode Trial, vous pouvez envoyer des SMS UNIQUEMENT vers:
   - Votre numéro vérifié
   - Numéros que vous ajoutez manuellement (max 5)

   Pour passer en production:
   - Console > Account > Upgrade
   - Recharger au minimum 20€

**Variables d'environnement:**
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+33612345678
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optionnel
```

**Coûts (France):**
- **Numéro de téléphone**: 1€/mois
- **SMS sortant**: 0.065€ par SMS
- **SMS entrant**: 0.01€ par SMS
- **Exemple**: 500 SMS/mois = ~32€/mois + 1€ = 33€/mois

**Tester la configuration:**
```bash
# Test avec cURL
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json" \
  --data-urlencode "From=+33612345678" \
  --data-urlencode "To=+33600000000" \
  --data-urlencode "Body=Test SMS from ArtiConnect" \
  -u ACxxx:your_auth_token
```

---

### 3.6 SendGrid (Emails)

**Étapes détaillées:**

1. **Créer un compte SendGrid**
   - Aller sur [https://signup.sendgrid.com](https://signup.sendgrid.com)
   - Remplir le formulaire d'inscription
   - Vérifier votre email

2. **Compléter votre profil**

   a) Settings > Sender Authentication > Get Started
   b) Remplir les informations:
      - Nom de l'entreprise
      - Site web
      - Type d'emails (Transactional)

3. **Authentifier votre domaine** (TRÈS IMPORTANT)

   L'authentification de domaine améliore la délivrabilité (évite spam).

   a) Settings > Sender Authentication > Domain Authentication
   b) Cliquer sur "Authenticate Your Domain"
   c) Configuration:
      - DNS Host: Sélectionner votre hébergeur DNS (Cloudflare, OVH, etc.)
      - Domain: `articonnect.fr`
      - Advanced Settings:
        - ✓ Use automated security
        - ✓ Use custom return path
   d) Next

   e) SendGrid vous donnera des enregistrements DNS à ajouter:
   ```
   Type    Name                                    Value
   CNAME   s1._domainkey.articonnect.fr           s1.domainkey.u12345.wl.sendgrid.net
   CNAME   s2._domainkey.articonnect.fr           s2.domainkey.u12345.wl.sendgrid.net
   CNAME   em1234.articonnect.fr                  u12345.wl.sendgrid.net
   TXT     articonnect.fr                         v=spf1 include:sendgrid.net ~all
   ```

   f) Ajouter ces enregistrements dans votre hébergeur DNS
   g) Retourner sur SendGrid et cliquer sur "Verify"
   h) Validation: immédiate à 48h selon propagation DNS

4. **Créer une clé API**

   a) Settings > API Keys
   b) Cliquer sur "Create API Key"
   c) Configuration:
      - API Key Name: `ArtiConnect Production`
      - API Key Permissions: **Full Access** (ou Mail Send uniquement)
   d) Create & View
   e) ⚠️ **COPIER LA CLÉ MAINTENANT** (ne sera plus jamais affichée)
      - Format: `SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

5. **Vérifier un expéditeur** (Single Sender)

   Si vous n'avez PAS authentifié le domaine, vous devez au moins vérifier un email.

   a) Settings > Sender Authentication > Single Sender Verification
   b) Create New Sender:
      - From Name: `ArtiConnect`
      - From Email: `noreply@articonnect.fr`
      - Reply To: `contact@articonnect.fr`
      - Company Address: Votre adresse légale
   c) Create
   d) Vérifier l'email envoyé à `noreply@articonnect.fr`

6. **Configurer les Suppressions** (Unsubscribe, Bounces)

   a) Settings > Mail Settings > Subscription Tracking
      - ✓ Enable
      - Configure le footer de désinscription

   b) Settings > Tracking > Tracking Settings
      - ✓ Click Tracking
      - ✓ Open Tracking

7. **Créer des templates d'emails** (optionnel)

   a) Email API > Dynamic Templates
   b) Create a Dynamic Template
   c) Nom: `Welcome Email`
   d) Add Version > Design Editor
   e) Créer le template avec variables:
      ```html
      <p>Bonjour {{firstName}},</p>
      <p>Bienvenue sur ArtiConnect!</p>
      <a href="{{verificationLink}}">Vérifier votre email</a>
      ```
   f) Copier le Template ID: `d-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

8. **Configurer les alertes**

   a) Settings > Alerts
   b) Create Alert:
      - Usage Limit: 80% of 100 emails/day (free tier)
      - Email: votre email

**Variables d'environnement:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
SENDGRID_FROM_EMAIL=noreply@articonnect.fr
SENDGRID_FROM_NAME=ArtiConnect

# Optionnel si templates
SENDGRID_TEMPLATE_WELCOME=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_TEMPLATE_VERIFY=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_TEMPLATE_RESET_PASSWORD=d-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Coûts:**
- **Free tier**: 100 emails/jour (permanent)
- **Essentials**: 15$/mois pour 40,000 emails/mois
- **Pro**: 60$/mois pour 100,000 emails/mois
- **Exemple**: 5,000 emails/mois = Free tier suffisant

**Alternative SMTP (Gmail, Outlook):**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false  # true pour port 465
SMTP_USER=contact@articonnect.fr
SMTP_PASSWORD=your_app_password  # Générer dans Gmail > Security > App passwords
SMTP_FROM=noreply@articonnect.fr
```

**Tester la configuration:**
```bash
# Test avec cURL
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer SG.xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "personalizations": [{
      "to": [{"email": "test@example.com"}]
    }],
    "from": {"email": "noreply@articonnect.fr", "name": "ArtiConnect"},
    "subject": "Test Email",
    "content": [{
      "type": "text/plain",
      "value": "This is a test email from ArtiConnect"
    }]
  }'
```

---

### 3.7 Sentry (Monitoring Erreurs)

**Étapes rapides:**

1. Créer un compte [Sentry](https://sentry.io/signup)
2. Créer un projet: Platform = Node.js / NestJS
3. Nom: `ArtiConnect API`
4. Copier le DSN: `https://xxxxx@sentry.io/xxxxx`

**Variables d'environnement:**
```env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=1.0.0
```

**Coût:** Gratuit jusqu'à 5,000 erreurs/mois

---

## 4. Setup de la Base de Données

### 4.1 Installation PostgreSQL (si non-Docker)

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Créer la base de données
sudo -u postgres psql

postgres=# CREATE DATABASE articonnect;
postgres=# CREATE USER articonnect WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
postgres=# GRANT ALL PRIVILEGES ON DATABASE articonnect TO articonnect;
postgres=# ALTER DATABASE articonnect OWNER TO articonnect;
postgres=# \q
```

### 4.2 Configuration PostgreSQL pour Production

Éditer `/etc/postgresql/15/main/postgresql.conf`:

```conf
# Connexions
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 4MB

# WAL
wal_buffers = 8MB
checkpoint_completion_target = 0.9

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d.log'
log_rotation_age = 1d
log_min_duration_statement = 1000  # Log queries > 1s

# Sécurité
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

Redémarrer:
```bash
sudo systemctl restart postgresql
```

### 4.3 Installation Redis (si non-Docker)

```bash
# Ubuntu/Debian
sudo apt install -y redis-server

# Configuration
sudo nano /etc/redis/redis.conf

# Modifier:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# appendonly yes
# requirepass YOUR_STRONG_PASSWORD

# Redémarrer
sudo systemctl restart redis
sudo systemctl enable redis
```

### 4.4 Backup Automatique

Créer un script de backup `/home/deploy/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="articonnect"
DB_USER="articonnect"
DB_HOST="localhost"
DB_PASSWORD="YOUR_PASSWORD"

# Créer le répertoire
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Vérifier le backup
if [ $? -eq 0 ]; then
  echo "Backup successful: $BACKUP_DIR/backup_$DATE.sql.gz"

  # Upload vers S3 (optionnel)
  aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://articonnect-backups/postgres/

  # Garder seulement les 7 derniers jours
  find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
else
  echo "Backup failed!"
  exit 1
fi
```

Rendre exécutable:
```bash
chmod +x /home/deploy/backup-db.sh
```

Ajouter au crontab:
```bash
crontab -e
# Backup quotidien à 3h du matin
0 3 * * * /home/deploy/backup-db.sh >> /var/log/backup-db.log 2>&1
```

---

## 5. Configuration de l'Application

### 5.1 Cloner le Repository

```bash
# Créer un utilisateur deploy
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy
sudo su - deploy

# Cloner le projet
git clone https://github.com/votre-org/articonnect.git
cd articonnect
git checkout production  # ou main
```

### 5.2 Configuration des Variables d'Environnement

Créer le fichier `.env` à partir de `.env.example`:

```bash
cd backend/api-gateway
cp .env.example .env
nano .env
```

**Configuration Production Complète:**

```env
# ========================================
# Application
# ========================================
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# ========================================
# Database (PostgreSQL)
# ========================================
DATABASE_URL=postgresql://articonnect:STRONG_PASSWORD@localhost:5432/articonnect?schema=public

# ========================================
# Redis
# ========================================
REDIS_URL=redis://:YOUR_REDIS_PASSWORD@localhost:6379

# ========================================
# JWT Authentication
# ========================================
# IMPORTANT: Générer des secrets forts avec: openssl rand -base64 64
JWT_SECRET=<générer_avec_openssl>
JWT_REFRESH_SECRET=<générer_avec_openssl>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ========================================
# CORS Configuration
# ========================================
ALLOWED_ORIGINS=https://articonnect.fr,https://www.articonnect.fr,https://app.articonnect.fr

# ========================================
# Stripe Payment
# ========================================
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...

# ========================================
# AWS S3 (File Storage)
# ========================================
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=articonnect-uploads-production

# ========================================
# Firebase Cloud Messaging
# ========================================
FIREBASE_PROJECT_ID=articonnect-prod
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@articonnect-prod.iam.gserviceaccount.com

# ========================================
# Twilio (SMS)
# ========================================
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+33612345678

# ========================================
# Google Maps API
# ========================================
GOOGLE_MAPS_API_KEY=AIzaSy...

# ========================================
# Email Service (SendGrid)
# ========================================
SENDGRID_API_KEY=SG.xxxxx...
SENDGRID_FROM_EMAIL=noreply@articonnect.fr
SENDGRID_FROM_NAME=ArtiConnect

# ========================================
# Monitoring
# ========================================
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# ========================================
# Feature Flags
# ========================================
ENABLE_2FA=true
ENABLE_EMAIL_VERIFICATION=true
ENABLE_PHONE_VERIFICATION=true
ENABLE_MARKETPLACE=true
```

**Sécuriser le fichier:**
```bash
chmod 600 .env
```

### 5.3 Générer les Secrets JWT

```bash
# Générer JWT_SECRET
openssl rand -base64 64

# Générer JWT_REFRESH_SECRET
openssl rand -base64 64
```

Copier les valeurs générées dans `.env`

---

## 6. Déploiement avec Docker

### 6.1 Build de l'Image

```bash
# À la racine du projet
docker build -t articonnect-api:latest -f backend/api-gateway/Dockerfile .
```

### 6.2 Créer docker-compose.production.yml

```yaml
version: '3.8'

services:
  # ===============================
  # Databases
  # ===============================
  postgres:
    image: postgres:15-alpine
    container_name: articonnect-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: articonnect
      POSTGRES_USER: articonnect
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U articonnect"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - articonnect-network

  redis:
    image: redis:7-alpine
    container_name: articonnect-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - articonnect-network

  # ===============================
  # Application
  # ===============================
  api:
    image: articonnect-api:latest
    container_name: articonnect-api
    restart: unless-stopped
    ports:
      - "4000:4000"
    env_file:
      - backend/api-gateway/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - articonnect-network
    volumes:
      - ./logs:/app/logs

  # ===============================
  # Reverse Proxy (Nginx)
  # ===============================
  nginx:
    image: nginx:alpine
    container_name: articonnect-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - api
    networks:
      - articonnect-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  nginx_cache:
    driver: local

networks:
  articonnect-network:
    driver: bridge
```

### 6.3 Configuration Nginx

Créer `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api_backend {
        server api:4000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # Cache
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m inactive=60m;

    server {
        listen 80;
        server_name api.articonnect.fr;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.articonnect.fr;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Client body size
        client_max_body_size 10M;

        # Logging
        access_log /var/log/nginx/api.access.log;
        error_log /var/log/nginx/api.error.log;

        # API endpoints
        location / {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Login endpoint - stricter rate limit
        location /auth/login {
            limit_req zone=login_limit burst=3 nodelay;
            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Health check (no rate limit)
        location /health {
            proxy_pass http://api_backend;
            access_log off;
        }
    }
}
```

### 6.4 Obtenir un Certificat SSL (Let's Encrypt)

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir le certificat
sudo certbot --nginx -d api.articonnect.fr

# Le certificat sera auto-renouvelé
# Vérifier le cron job:
sudo systemctl status certbot.timer
```

### 6.5 Appliquer les Migrations

```bash
cd backend/shared

# Vérifier l'état des migrations
npx prisma migrate status

# Appliquer les migrations
npx prisma migrate deploy

# Vérifier
npx prisma migrate status
```

### 6.6 Lancer l'Application

```bash
# Démarrer tous les services
docker-compose -f docker-compose.production.yml up -d

# Vérifier les logs
docker-compose logs -f api

# Vérifier l'état
docker-compose ps
```

---

## 7. Déploiement sur Cloud

### 7.1 AWS (EC2 + RDS + ElastiCache)

**Architecture:**
- EC2 (t3.medium): Application
- RDS PostgreSQL (db.t3.micro): Base de données
- ElastiCache Redis: Cache/Sessions
- S3: Fichiers statiques
- CloudFront: CDN
- Route 53: DNS
- ALB: Load balancer

**Déploiement:**

```bash
# 1. Créer une instance EC2
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.medium \
  --key-name articonnect-prod \
  --security-group-ids sg-xxxxx \
  --subnet-id subnet-xxxxx

# 2. Créer RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier articonnect-prod \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username articonnect \
  --master-user-password STRONG_PASSWORD \
  --allocated-storage 20

# 3. Créer ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id articonnect-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1

# 4. Se connecter à EC2 et déployer
ssh -i articonnect-prod.pem ubuntu@<EC2_IP>
# Suivre les étapes Docker ci-dessus
```

### 7.2 Google Cloud (Cloud Run + Cloud SQL)

**Déploiement:**

```bash
# 1. Build et push l'image
gcloud builds submit --tag gcr.io/PROJECT_ID/articonnect-api

# 2. Créer Cloud SQL PostgreSQL
gcloud sql instances create articonnect-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1

# 3. Déployer sur Cloud Run
gcloud run deploy articonnect-api \
  --image gcr.io/PROJECT_ID/articonnect-api \
  --platform managed \
  --region europe-west1 \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:europe-west1:articonnect-db \
  --set-env-vars DATABASE_URL=postgresql://...
```

### 7.3 DigitalOcean (App Platform)

**Déploiement:**

1. Créer une App sur [DigitalOcean](https://cloud.digitalocean.com/apps)
2. Connecter le repository GitHub
3. Configurer:
   - Type: Docker
   - Dockerfile path: `backend/api-gateway/Dockerfile`
   - HTTP Port: 4000
4. Ajouter une base de données PostgreSQL managée
5. Ajouter Redis managé
6. Configurer les variables d'environnement
7. Déployer

**Coût estimé:** ~$30-80/mois (App + DB + Redis)

---

## 8. Configuration CI/CD

Le workflow `.github/workflows/backend-ci.yml` est déjà en place.

**Ajouter les secrets GitHub:**

1. Aller sur GitHub > Settings > Secrets and Variables > Actions
2. Ajouter les secrets:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `PRODUCTION_HOST`
   - `PRODUCTION_SSH_KEY`
   - `DATABASE_URL` (pour tests)

---

## 9. Vérifications Post-Déploiement

### 9.1 Health Checks

```bash
# Basic health
curl https://api.articonnect.fr/health

# Readiness check
curl https://api.articonnect.fr/health/ready

# Liveness check
curl https://api.articonnect.fr/health/live
```

### 9.2 Vérifier les Logs

```bash
# Application logs
docker-compose logs -f api

# Vérifier les erreurs
docker-compose logs api | grep -i error

# Logs temps réel
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 10. Monitoring et Logs

Sentry est déjà configuré. Vérifier que `SENTRY_DSN` est défini.

Les logs sont stockés dans `backend/api-gateway/logs/`:
- `combined.log`: Tous les logs
- `error.log`: Erreurs uniquement

---

## 11. Sécurité

### Checklist Sécurité

- [x] HTTPS activé (TLS 1.2+)
- [x] Headers de sécurité (Helmet.js)
- [x] Rate limiting (Throttler)
- [x] CORS configuré
- [x] JWT avec expiration
- [x] Secrets en env variables
- [x] Firewall configuré
- [x] Backups automatiques

---

## 12. Troubleshooting

### Application ne démarre pas

```bash
# Vérifier les logs
docker-compose logs api

# Vérifier la connexion DB
docker exec -it articonnect-api sh
nc -zv postgres 5432
```

### Erreurs 500

```bash
# Vérifier les migrations
cd backend/shared
npx prisma migrate status
npx prisma migrate deploy
```

---

## 13. Rollback

```bash
# Rollback application
docker tag articonnect-api:previous articonnect-api:latest
docker-compose up -d api

# Rollback database (restaurer backup)
gunzip -c /var/backups/postgresql/backup_20251114.sql.gz | \
  docker exec -i articonnect-postgres psql -U articonnect -d articonnect
```

---

## Checklist Finale

- [ ] Tous les services externes configurés
- [ ] Variables d'environnement configurées
- [ ] SSL/TLS activé
- [ ] Migrations appliquées
- [ ] Backups configurés
- [ ] Monitoring activé
- [ ] Tests passés
- [ ] Documentation à jour

---

**Version:** 2.0.0
**Dernière mise à jour:** 15 Novembre 2025
**Auteur:** Équipe ArtiConnect DevOps
