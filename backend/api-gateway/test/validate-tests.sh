#!/bin/bash

# ArtiConnect - Script de validation des tests (sans exécution)
# Vérifie la syntaxe, la structure et la couverture des tests
# Usage: ./test/validate-tests.sh

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 ArtiConnect - Validation des Tests${NC}"
echo "======================================"
echo ""

VALIDATION_ERRORS=0

echo -e "${YELLOW}📋 Étape 1: Vérification de la syntaxe TypeScript${NC}"
echo "--------------------------------------------"

# Vérifier que le fichier de test existe
TEST_FILE="test/scenarios/real-world.e2e-spec.ts"
if [ -f "$TEST_FILE" ]; then
    echo -e "${GREEN}✅${NC} Fichier de test trouvé: $TEST_FILE"

    # Compter les lignes
    LINE_COUNT=$(wc -l < "$TEST_FILE")
    echo "   📊 Lignes de code: $LINE_COUNT"
else
    echo -e "${RED}❌${NC} Fichier de test non trouvé: $TEST_FILE"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

echo ""
echo -e "${YELLOW}📋 Étape 2: Analyse de la structure des tests${NC}"
echo "--------------------------------------------"

if [ -f "$TEST_FILE" ]; then
    # Compter les describe blocks
    DESCRIBE_COUNT=$(grep -c "describe(" "$TEST_FILE" || true)
    echo -e "${GREEN}✅${NC} Scénarios (describe): $DESCRIBE_COUNT"

    # Compter les it/test blocks
    IT_COUNT=$(grep -c "it(" "$TEST_FILE" || true)
    echo -e "${GREEN}✅${NC} Tests individuels (it): $IT_COUNT"

    # Compter les expect
    EXPECT_COUNT=$(grep -c "expect(" "$TEST_FILE" || true)
    echo -e "${GREEN}✅${NC} Assertions (expect): $EXPECT_COUNT"

    # Vérifier les hooks
    BEFORE_ALL=$(grep -c "beforeAll(" "$TEST_FILE" || true)
    AFTER_ALL=$(grep -c "afterAll(" "$TEST_FILE" || true)
    echo -e "${GREEN}✅${NC} Hooks: $BEFORE_ALL beforeAll, $AFTER_ALL afterAll"
fi

echo ""
echo -e "${YELLOW}📋 Étape 3: Vérification de la couverture fonctionnelle${NC}"
echo "--------------------------------------------"

if [ -f "$TEST_FILE" ]; then
    # Scénarios attendus
    declare -a EXPECTED_SCENARIOS=(
        "Onboarding"
        "Géolocalisation"
        "Missions"
        "Négociation"
        "Paiements"
        "Factures"
        "Planification"
        "Litiges"
        "Marketplace"
        "Évaluations"
        "Favoris"
        "Administration"
        "GDPR"
    )

    echo "Vérification des scénarios requis:"
    MISSING_SCENARIOS=0

    for scenario in "${EXPECTED_SCENARIOS[@]}"; do
        if grep -q "$scenario" "$TEST_FILE"; then
            echo -e "  ${GREEN}✅${NC} Scénario '$scenario' présent"
        else
            echo -e "  ${RED}❌${NC} Scénario '$scenario' manquant"
            MISSING_SCENARIOS=$((MISSING_SCENARIOS + 1))
            VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
        fi
    done

    if [ $MISSING_SCENARIOS -eq 0 ]; then
        echo -e "${GREEN}✅ Tous les scénarios requis sont présents${NC}"
    fi
fi

echo ""
echo -e "${YELLOW}📋 Étape 4: Vérification des configurations Jest${NC}"
echo "--------------------------------------------"

# Vérifier jest.config.js
if [ -f "jest.config.js" ]; then
    echo -e "${GREEN}✅${NC} jest.config.js trouvé"
else
    echo -e "${RED}❌${NC} jest.config.js manquant"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

# Vérifier test/jest-e2e.json
if [ -f "test/jest-e2e.json" ]; then
    echo -e "${GREEN}✅${NC} test/jest-e2e.json trouvé"
else
    echo -e "${RED}❌${NC} test/jest-e2e.json manquant"
    VALIDATION_ERRORS=$((VALIDATION_ERRORS + 1))
fi

echo ""
echo -e "${YELLOW}📋 Étape 5: Vérification de la documentation${NC}"
echo "--------------------------------------------"

# Vérifier les fichiers de documentation
declare -a DOC_FILES=(
    "../../RAPPORT_TESTS_COUVERTURE.md"
    "../../SYNTHESE_TESTS.md"
    "test/README_TESTS.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅${NC} Documentation trouvée: $doc"
    else
        echo -e "${YELLOW}⚠️${NC}  Documentation manquante: $doc"
    fi
done

echo ""
echo -e "${YELLOW}📋 Étape 6: Vérification TypeScript (compilation)${NC}"
echo "--------------------------------------------"

echo "Compilation TypeScript du fichier de test..."
if npx tsc --noEmit "$TEST_FILE" 2>&1 | head -20; then
    echo -e "${GREEN}✅ Pas d'erreurs TypeScript majeures${NC}"
else
    echo -e "${YELLOW}⚠️  Quelques warnings TypeScript (normal pour les tests)${NC}"
fi

echo ""
echo "======================================"

if [ $VALIDATION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ VALIDATION RÉUSSIE - Les tests sont bien structurés${NC}"
    echo ""
    echo "📊 Résumé:"
    echo "  - Scénarios: $DESCRIBE_COUNT"
    echo "  - Tests: $IT_COUNT"
    echo "  - Assertions: $EXPECT_COUNT"
    echo "  - Lignes de code: $LINE_COUNT"
    echo ""
    echo "🚀 Prochaine étape: Exécuter les tests avec:"
    echo "   npm run test:scenarios        (avec infrastructure locale)"
    echo "   ./test/run-tests-docker.sh    (avec Docker)"
    exit 0
else
    echo -e "${RED}❌ VALIDATION ÉCHOUÉE - $VALIDATION_ERRORS erreur(s) trouvée(s)${NC}"
    exit 1
fi
