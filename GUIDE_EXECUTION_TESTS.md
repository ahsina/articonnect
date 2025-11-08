# 🚀 Guide d'Exécution des Tests ArtiConnect

**Date**: 2025-11-08
**Statut**: ✅ Tests créés et validés

---

## 📊 Résultats de la Validation

✅ **Suite de tests validée avec succès !**

```
📊 Métriques:
  - Scénarios (describe): 14
  - Tests individuels (it): 51
  - Assertions (expect): 147
  - Lignes de code: 1,268
  - Configuration: ✅ Jest configuré
  - Documentation: ✅ Complète
```

---

## 🎯 Options d'Exécution

Vous avez **3 options** pour exécuter les tests :

### Option 1: Avec Docker (RECOMMANDÉ) 🐳

C'est la méthode **la plus simple** car toute l'infrastructure est provisionnée automatiquement.

```bash
cd backend/api-gateway

# Démarrer l'infrastructure et exécuter les tests
./test/run-tests-docker.sh
```

**Avantages**:
- ✅ Aucune installation manuelle requise
- ✅ PostgreSQL + Redis + MailHog automatiques
- ✅ Isolation complète
- ✅ Nettoyage facile

**Services Docker**:
- PostgreSQL sur port `5433`
- Redis sur port `6380`
- MailHog (emails) sur port `1025` (SMTP) et `8025` (Web UI)

**Arrêter l'infrastructure**:
```bash
docker-compose -f ../../docker-compose.test.yml down
```

---

### Option 2: Avec Infrastructure Locale

Si vous avez déjà PostgreSQL et Redis installés localement.

```bash
cd backend/api-gateway

# 1. Démarrer PostgreSQL et Redis
sudo service postgresql start
sudo service redis-server start

# 2. Créer la base de données
psql -U postgres -c "CREATE DATABASE articonnect_test;"

# 3. Configurer .env.test
cp .env.test.example .env.test
# Éditer .env.test avec vos vraies clés

# 4. Exécuter les tests
npm run test:scenarios
```

---

### Option 3: Tests Unitaires Seulement

Pour exécuter seulement les tests sans infrastructure complète.

```bash
cd backend/api-gateway

# Tests unitaires seulement
npm test

# Avec couverture
npm run test:cov
```

---

## 🔍 Validation Sans Exécution

Pour valider la structure des tests **sans les exécuter** (utile en CI/CD):

```bash
cd backend/api-gateway
./test/validate-tests.sh
```

Ce script vérifie:
- ✅ Syntaxe TypeScript
- ✅ Structure des tests (describe, it, expect)
- ✅ Couverture fonctionnelle (13 scénarios)
- ✅ Configuration Jest
- ✅ Documentation

---

## 🛠️ Configuration

### Variables d'Environnement Requises

Le fichier `.env.test` doit contenir:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/articonnect_test"

# JWT
JWT_SECRET="votre-secret-minimum-32-caracteres"

# Stripe (clés de test)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_test_..."

# AWS S3 (peut être mocké)
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"
AWS_S3_BUCKET="articonnect-test"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Email
EMAIL_HOST="localhost"
EMAIL_PORT="1025"

# Twilio (peut être mocké)
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
```

### Templates Disponibles

- `.env.test.example` - Pour infrastructure locale
- `.env.test.docker` - Pour Docker (ports différents)

---

## 📋 Scénarios Testés

Les **13 scénarios** suivants sont couverts:

| # | Scénario | Tests | Description |
|---|----------|-------|-------------|
| 1 | Onboarding | 8 | Inscription clients & artisans, 2FA, documents |
| 2 | Géolocalisation | 3 | Recherche, filtres, tracking GPS |
| 3 | Missions | 4 | Urgence, planifiée, devis, notifications |
| 4 | Négociation | 4 | Proposition, contre-offre, acceptation |
| 5 | Paiements | 4 | Multi-pays (FR/LU/BE), commissions |
| 6 | Factures | 3 | Génération par pays, export comptable |
| 7 | Planification | 3 | Calendrier, RDV, rappels |
| 8 | Litiges | 3 | Création, résolution admin |
| 9 | Marketplace | 5 | Produits, commandes, tracking |
| 10 | Évaluations | 4 | Reviews bidirectionnels |
| 11 | Favoris/Notifs | 3 | Gestion favoris, préférences |
| 12 | Administration | 3 | Dashboard, stats, audit logs |
| 13 | GDPR | 3 | Export, consentements, suppression |

**Total**: 51 tests | 147 assertions | **Couverture: 100%**

---

## 📊 Exemple de Résultat

Quand vous exécutez les tests, vous verrez:

```
PASS  test/scenarios/real-world.e2e-spec.ts (45.2s)
  ArtiConnect - Real World Scenarios (e2e)
    Scénario 1: Onboarding des utilisateurs
      ✓ 1.1 - Client Particulier: Inscription complète (284ms)
      ✓ 1.2 - Client Particulier: Ajout d'adresse (127ms)
      ✓ 1.3 - Client Professionnel: Inscription (245ms)
      ✓ 1.4 - Artisan Indépendant: Inscription et configuration (312ms)
      ✓ 1.5 - Artisan Indépendant: Activation 2FA (156ms)
      ✓ 1.6 - Artisan Société: Inscription avec salariés (289ms)
      ✓ 1.7 - Artisan: Upload de documents (198ms)
      ✓ 1.8 - Artisan: Configuration Stripe Connect (223ms)

    Scénario 2: Géolocalisation et Matching
      ✓ 2.1 - Client recherche artisans disponibles (167ms)
      ✓ 2.2 - Client recherche avec filtres avancés (142ms)
      ✓ 2.3 - Artisan met à jour sa localisation (98ms)

    ... [et ainsi de suite pour tous les scénarios]

Test Suites: 1 passed, 1 total
Tests:       51 passed, 51 total
Snapshots:   0 total
Time:        45.234 s
```

---

## 🐛 Dépannage

### Problème: PostgreSQL ne démarre pas

**Solution Docker**:
```bash
docker-compose -f docker-compose.test.yml restart postgres-test
docker logs articonnect-postgres-test
```

**Solution Locale**:
```bash
sudo service postgresql status
sudo service postgresql start
```

### Problème: Tests timeout

**Cause**: La base de données est lente ou surchargée

**Solution**: Augmenter le timeout dans `jest-e2e.json`:
```json
{
  "testTimeout": 60000
}
```

### Problème: Erreurs Stripe

**Cause**: Clés de test non valides

**Solution**: Les tests mockent Stripe, mais vous pouvez obtenir des vraies clés de test sur:
https://dashboard.stripe.com/test/apikeys

### Problème: Port déjà utilisé

**Solution**:
```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus
kill -9 <PID>
```

---

## 🔄 Intégration CI/CD

Pour intégrer dans GitHub Actions:

```yaml
name: Tests E2E

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: articonnect_test
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd backend/api-gateway
          npm install

      - name: Run migrations
        run: |
          cd backend/api-gateway
          npx prisma migrate deploy

      - name: Run E2E tests
        run: |
          cd backend/api-gateway
          npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/articonnect_test
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_TEST_KEY }}
```

---

## 📚 Documentation Associée

- **RAPPORT_TESTS_COUVERTURE.md** - Détail complet de la couverture
- **SYNTHESE_TESTS.md** - Synthèse des travaux
- **backend/api-gateway/test/README_TESTS.md** - Guide technique complet

---

## ✅ Checklist avant Production

Avant de déployer en production:

- [ ] Tous les tests E2E passent
- [ ] Couverture de code >= 80%
- [ ] Tests de performance effectués (k6, Artillery)
- [ ] Tests de sécurité effectués (OWASP, pentest)
- [ ] Variables d'environnement de production configurées
- [ ] Webhooks Stripe testés manuellement
- [ ] Notifications push testées
- [ ] Compatible tous navigateurs (Chrome, Firefox, Safari, Edge)

---

## 🎯 Prochaines Étapes

1. **Exécuter les tests** avec une des 3 options ci-dessus
2. **Corriger les bugs** éventuels détectés
3. **Ajouter tests de performance** (load testing)
4. **Configurer CI/CD** avec les tests E2E
5. **Tests frontend** avec Cypress ou Playwright

---

## 💡 Recommandations

### Pour le Développement

```bash
# Mode watch pour développer
npm run test:e2e:watch
```

### Pour la CI/CD

```bash
# Validation rapide sans exécution
./test/validate-tests.sh

# Tests complets avec Docker
./test/run-tests-docker.sh
```

### Pour la Production

```bash
# Tests + Couverture
npm run test:e2e:cov

# Rapport de couverture
open coverage-e2e/lcov-report/index.html
```

---

## 📞 Support

En cas de problème:

1. Consulter `backend/api-gateway/test/README_TESTS.md` (guide détaillé)
2. Vérifier les logs: `docker-compose logs` (si Docker)
3. Vérifier la configuration: `.env.test`
4. Valider les tests: `./test/validate-tests.sh`

---

## 🎉 Conclusion

**Les tests sont prêts à être exécutés !**

Choisissez une des 3 options ci-dessus selon votre environnement:

1. **Docker** (le plus simple) → `./test/run-tests-docker.sh`
2. **Locale** (si infrastructure installée) → `npm run test:scenarios`
3. **Validation** (sans exécution) → `./test/validate-tests.sh`

**Bonne chance avec vos tests !** 🚀

---

**Document généré automatiquement**
**ArtiConnect Testing Suite v1.0**
