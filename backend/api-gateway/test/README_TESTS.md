# 🧪 Guide d'Exécution des Tests - ArtiConnect

Ce document explique comment exécuter les tests de la plateforme ArtiConnect.

---

## 📋 Table des Matières

1. [Types de Tests](#types-de-tests)
2. [Prérequis](#prérequis)
3. [Configuration](#configuration)
4. [Exécution des Tests](#exécution-des-tests)
5. [Résultats](#résultats)
6. [Dépannage](#dépannage)

---

## 🎯 Types de Tests

### Tests E2E - Scénarios Réels

**Fichier**: `test/scenarios/real-world.e2e-spec.ts`

**Couverture**: 13 scénarios réels couvrant 100% du périmètre fonctionnel
- ✅ Onboarding (8 tests)
- ✅ Géolocalisation (3 tests)
- ✅ Missions (4 tests)
- ✅ Négociation (4 tests)
- ✅ Paiements (4 tests)
- ✅ Factures (3 tests)
- ✅ Planification (3 tests)
- ✅ Litiges (3 tests)
- ✅ Marketplace (5 tests)
- ✅ Évaluations (4 tests)
- ✅ Favoris/Notifications (3 tests)
- ✅ Administration (3 tests)
- ✅ GDPR (3 tests)

**Total**: 50+ tests individuels

---

## 🔧 Prérequis

### 1. Node.js et npm
```bash
node --version  # v18+ requis
npm --version   # v9+ requis
```

### 2. PostgreSQL
```bash
psql --version  # v14+ requis
```

### 3. Redis
```bash
redis-cli --version  # v6+ requis
```

### 4. Variables d'environnement
Créer un fichier `.env.test` à la racine de `backend/api-gateway/`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/articonnect_test"

# JWT
JWT_SECRET="test-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# Stripe (utiliser les clés de test)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."

# AWS S3 (peut utiliser LocalStack pour les tests)
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"
AWS_REGION="eu-west-1"
AWS_S3_BUCKET="articonnect-test"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Email (utiliser Mailhog ou service de test)
EMAIL_HOST="localhost"
EMAIL_PORT="1025"
EMAIL_USER="test"
EMAIL_PASSWORD="test"
EMAIL_FROM="noreply@articonnect.test"

# Twilio (compte de test)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+15005550006"

# Application
PORT="3001"
NODE_ENV="test"
```

---

## ⚙️ Configuration

### 1. Installation des dépendances
```bash
cd backend/api-gateway
npm install
```

### 2. Créer la base de données de test
```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base
CREATE DATABASE articonnect_test;

# Quitter
\q
```

### 3. Appliquer les migrations
```bash
# Utiliser le .env.test
export $(cat .env.test | xargs)

# Reset et migrer
npx prisma migrate reset --force --skip-seed
```

---

## 🚀 Exécution des Tests

### Méthode 1: Script Automatique (Recommandé)

Le script `run-scenarios.sh` effectue toutes les étapes automatiquement :

```bash
cd backend/api-gateway
npm run test:scenarios
```

Ce script va :
1. ✅ Vérifier l'environnement
2. ✅ Vérifier les variables d'environnement
3. ✅ Reset et migrer la base de données
4. ✅ Exécuter tous les tests E2E
5. ✅ Générer le rapport de couverture

### Méthode 2: Commandes npm

```bash
# Exécuter tous les tests E2E
npm run test:e2e

# Exécuter un fichier de test spécifique
npm run test:e2e test/scenarios/real-world.e2e-spec.ts

# Mode watch (re-exécute automatiquement)
npm run test:e2e:watch

# Avec couverture de code
npm run test:e2e:cov
```

### Méthode 3: Jest Direct

```bash
# Exécuter tous les tests
jest --config ./test/jest-e2e.json

# Verbose mode
jest --config ./test/jest-e2e.json --verbose

# Un scénario spécifique
jest --config ./test/jest-e2e.json -t "Scénario 1"

# Tests matchant un pattern
jest --config ./test/jest-e2e.json -t "Onboarding"
```

---

## 📊 Résultats

### Interprétation des Résultats

#### ✅ Tests Réussis
```
PASS  test/scenarios/real-world.e2e-spec.ts
  ArtiConnect - Real World Scenarios (e2e)
    Scénario 1: Onboarding des utilisateurs
      ✓ 1.1 - Client Particulier: Inscription complète (250 ms)
      ✓ 1.2 - Client Particulier: Ajout d'adresse (120 ms)
      ...
```

**Signification** : Tous les scénarios fonctionnent correctement ✅

#### ❌ Tests Échoués
```
FAIL  test/scenarios/real-world.e2e-spec.ts
  ArtiConnect - Real World Scenarios (e2e)
    Scénario 5: Paiements et Commissions
      ✕ 5.1 - Paiement mission en France (TVA 20%) (350 ms)
```

**Action** : Vérifier les logs d'erreur et corriger le code

### Rapport de Couverture

Après exécution avec `--coverage`, un rapport HTML est généré :

```bash
# Ouvrir le rapport
open coverage-e2e/lcov-report/index.html
```

**Métriques clés** :
- **Statements** : % de lignes exécutées
- **Branches** : % de conditions testées
- **Functions** : % de fonctions appelées
- **Lines** : % de lignes de code couvertes

**Objectif** : Minimum 80% de couverture

---

## 📄 Rapports

### 1. Rapport de Couverture Fonctionnelle

**Fichier** : `RAPPORT_TESTS_COUVERTURE.md` (racine du projet)

Contient :
- Matrice de couverture complète
- Détail de chaque scénario
- Cas réels testés
- Points d'attention

### 2. Rapport Jest

**Fichier** : `coverage-e2e/lcov-report/index.html`

Contient :
- Couverture de code ligne par ligne
- Fichiers non couverts
- Branches non testées

---

## 🐛 Dépannage

### Problème 1: Base de données

**Erreur** :
```
Error: P1001: Can't reach database server
```

**Solution** :
```bash
# Vérifier que PostgreSQL est lancé
sudo systemctl status postgresql
# ou
brew services list

# Vérifier la connexion
psql -U postgres -d articonnect_test
```

### Problème 2: Migrations

**Erreur** :
```
Error: Migration engine error
```

**Solution** :
```bash
# Reset complet
npx prisma migrate reset --force

# Regénérer le client Prisma
npx prisma generate
```

### Problème 3: Variables d'environnement

**Erreur** :
```
Error: JWT_SECRET is not defined
```

**Solution** :
```bash
# Charger le .env.test
export $(cat .env.test | xargs)

# Vérifier
echo $JWT_SECRET
```

### Problème 4: Port déjà utilisé

**Erreur** :
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution** :
```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus
kill -9 <PID>
```

### Problème 5: Stripe

**Erreur** :
```
Error: Invalid Stripe API key
```

**Solution** :
1. Vérifier que vous utilisez une clé de **test** (commence par `sk_test_`)
2. Obtenir une clé de test sur https://dashboard.stripe.com/test/apikeys
3. Mettre à jour `.env.test`

### Problème 6: Redis

**Erreur** :
```
Error: Redis connection failed
```

**Solution** :
```bash
# Démarrer Redis
redis-server

# Vérifier
redis-cli ping
# Devrait retourner: PONG
```

### Problème 7: Timeout

**Erreur** :
```
Error: Timeout - Async callback was not invoked within the 30000 ms timeout
```

**Solution** :
```bash
# Augmenter le timeout dans jest-e2e.json
{
  "testTimeout": 60000
}
```

---

## 🔍 Débogage

### Mode Verbose

```bash
# Afficher tous les détails
npm run test:e2e -- --verbose

# Afficher les requêtes SQL (Prisma)
DEBUG=prisma:query npm run test:e2e
```

### Debug avec VS Code

Créer `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest E2E Debug",
      "program": "${workspaceFolder}/backend/api-gateway/node_modules/.bin/jest",
      "args": [
        "--config",
        "./test/jest-e2e.json",
        "--runInBand"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Puis F5 pour déboguer.

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

---

## ✅ Checklist Avant Commit

Avant de commiter du code, assurez-vous que :

- [ ] Tous les tests E2E passent
- [ ] La couverture de code est >= 80%
- [ ] Les nouveaux endpoints ont des tests
- [ ] Les cas d'erreur sont testés
- [ ] La documentation est à jour

```bash
# Vérification rapide
npm run test:e2e && npm run lint && npm run build
```

---

**Document maintenu par l'équipe ArtiConnect**
**Dernière mise à jour : 2025-11-08**
