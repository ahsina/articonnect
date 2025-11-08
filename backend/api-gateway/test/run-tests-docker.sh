#!/bin/bash

# ArtiConnect - Script d'exécution des tests E2E avec Docker
# Usage: ./test/run-tests-docker.sh

set -e

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ArtiConnect - Tests E2E avec Docker${NC}"
echo "========================================"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Veuillez exécuter ce script depuis backend/api-gateway${NC}"
    exit 1
fi

# Remonter au répertoire racine pour docker-compose
cd ../..

echo -e "${YELLOW}📋 Étape 1: Démarrage de l'infrastructure Docker${NC}"
echo "--------------------------------------------"

# Démarrer les services Docker
echo "🐳 Démarrage de PostgreSQL, Redis et MailHog..."
docker-compose -f docker-compose.test.yml up -d

# Attendre que les services soient prêts
echo "⏳ Attente que les services soient prêts..."
sleep 5

# Vérifier que PostgreSQL est prêt
echo -n "Vérification PostgreSQL..."
for i in {1..30}; do
    if docker exec articonnect-postgres-test pg_isready -U postgres > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}❌ Timeout${NC}"
        docker-compose -f docker-compose.test.yml logs postgres-test
        exit 1
    fi
    sleep 1
done

# Vérifier que Redis est prêt
echo -n "Vérification Redis..."
for i in {1..30}; do
    if docker exec articonnect-redis-test redis-cli ping > /dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e " ${RED}❌ Timeout${NC}"
        docker-compose -f docker-compose.test.yml logs redis-test
        exit 1
    fi
    sleep 1
done

echo -e "${GREEN}✅ Infrastructure Docker prête${NC}"
echo ""

# Retourner dans backend/api-gateway
cd backend/api-gateway

echo -e "${YELLOW}📋 Étape 2: Configuration de l'environnement${NC}"
echo "--------------------------------------------"

# Copier le fichier .env.test.docker vers .env.test
if [ ! -f ".env.test" ]; then
    echo "📝 Création de .env.test depuis .env.test.docker"
    cp .env.test.docker .env.test
else
    echo "ℹ️  .env.test existe déjà"
fi

# Charger les variables d'environnement
export $(cat .env.test | grep -v '^#' | xargs)

echo -e "${GREEN}✅ Variables d'environnement chargées${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 3: Préparation de la base de données${NC}"
echo "--------------------------------------------"

# Reset et migrer la base de données
echo "🔄 Reset de la base de données..."
npx prisma migrate reset --force --skip-seed

echo -e "${GREEN}✅ Base de données prête${NC}"
echo ""

echo -e "${YELLOW}📋 Étape 4: Exécution des tests E2E${NC}"
echo "--------------------------------------------"

# Exécuter les tests
npm run test:e2e test/scenarios/real-world.e2e-spec.ts -- --verbose

# Capturer le code de sortie
TEST_EXIT_CODE=$?

echo ""
echo "========================================"

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES TESTS ONT RÉUSSI!${NC}"
    echo ""
    echo "📊 Services Docker en cours:"
    echo "  - PostgreSQL: localhost:5433"
    echo "  - Redis: localhost:6380"
    echo "  - MailHog UI: http://localhost:8025"
    echo ""
    echo "💡 Pour arrêter les services:"
    echo "   docker-compose -f ../../docker-compose.test.yml down"
else
    echo -e "${RED}❌ CERTAINS TESTS ONT ÉCHOUÉ${NC}"
    echo ""
    echo "Consultez les logs ci-dessus pour plus de détails"
fi

echo "========================================"

exit $TEST_EXIT_CODE
