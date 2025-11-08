#!/bin/bash

# ArtiConnect - Script d'exécution des tests de scénarios réels
# Usage: ./test/run-scenarios.sh

set -e

echo "🚀 ArtiConnect - Tests de Scénarios Réels E2E"
echo "=============================================="
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Veuillez exécuter ce script depuis backend/api-gateway${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Étape 1: Vérification de l'environnement${NC}"
echo "--------------------------------------------"

# Vérifier que la base de données de test est configurée
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL n'est pas définie. Utilisation de la valeur par défaut de test${NC}"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/articonnect_test"
fi

echo "✅ Base de données: $DATABASE_URL"

# Vérifier les variables d'environnement nécessaires
echo ""
echo -e "${YELLOW}📋 Étape 2: Vérification des variables d'environnement${NC}"
echo "--------------------------------------------"

required_vars=("JWT_SECRET" "STRIPE_SECRET_KEY" "AWS_ACCESS_KEY_ID" "AWS_SECRET_ACCESS_KEY")
missing_vars=0

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ $var n'est pas définie${NC}"
        missing_vars=$((missing_vars + 1))
    else
        echo -e "${GREEN}✅ $var est définie${NC}"
    fi
done

if [ $missing_vars -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Certaines variables sont manquantes. Les tests peuvent échouer.${NC}"
    echo -e "${YELLOW}   Créez un fichier .env.test avec toutes les variables nécessaires.${NC}"
    echo ""
    read -p "Voulez-vous continuer quand même? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo -e "${YELLOW}📋 Étape 3: Migration de la base de données de test${NC}"
echo "--------------------------------------------"

# Reset et migrate la base de données de test
echo "🔄 Reset de la base de données..."
npx prisma migrate reset --force --skip-seed

echo "✅ Base de données prête"

echo ""
echo -e "${YELLOW}📋 Étape 4: Exécution des tests${NC}"
echo "--------------------------------------------"

# Exécuter les tests E2E
npm run test:e2e test/scenarios/real-world.e2e-spec.ts

# Capturer le code de sortie
TEST_EXIT_CODE=$?

echo ""
echo "=============================================="

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS ONT RÉUSSI!${NC}"
    echo ""
    echo "📊 Rapport de couverture disponible dans: coverage-e2e/"
    echo "📄 Rapport détaillé: RAPPORT_TESTS_COUVERTURE.md"
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    echo ""
    echo "Consultez les logs ci-dessus pour plus de détails"
fi

echo "=============================================="

exit $TEST_EXIT_CODE
