#!/bin/bash

# ========================================
# Database Migration Script
# ========================================
# This script handles Prisma database migrations
# Usage:
#   ./scripts/migrate.sh dev    # Create and apply migration (development)
#   ./scripts/migrate.sh deploy # Apply existing migrations (production)
#   ./scripts/migrate.sh reset  # Reset database (DANGEROUS - dev only)
#   ./scripts/migrate.sh status # Check migration status
# ========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo -e "${YELLOW}💡 Copy .env.example to .env and configure it:${NC}"
    echo "   cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

# Change to shared prisma directory
cd ../shared

case "$1" in
    dev)
        echo -e "${BLUE}🔄 Creating and applying migration...${NC}"
        read -p "Enter migration name: " MIGRATION_NAME

        if [ -z "$MIGRATION_NAME" ]; then
            echo -e "${RED}❌ Migration name cannot be empty${NC}"
            exit 1
        fi

        npx prisma migrate dev --name "$MIGRATION_NAME"
        echo -e "${GREEN}✅ Migration created and applied successfully${NC}"
        ;;

    deploy)
        echo -e "${BLUE}🚀 Deploying migrations to production...${NC}"
        npx prisma migrate deploy
        echo -e "${GREEN}✅ Migrations deployed successfully${NC}"
        ;;

    reset)
        echo -e "${YELLOW}⚠️  WARNING: This will delete all data in the database!${NC}"
        read -p "Are you sure you want to reset the database? (yes/no): " CONFIRM

        if [ "$CONFIRM" = "yes" ]; then
            echo -e "${BLUE}🔄 Resetting database...${NC}"
            npx prisma migrate reset --force
            echo -e "${GREEN}✅ Database reset successfully${NC}"
        else
            echo -e "${YELLOW}❌ Reset cancelled${NC}"
            exit 0
        fi
        ;;

    status)
        echo -e "${BLUE}📊 Checking migration status...${NC}"
        npx prisma migrate status
        ;;

    generate)
        echo -e "${BLUE}🔄 Generating Prisma Client...${NC}"
        npx prisma generate
        echo -e "${GREEN}✅ Prisma Client generated successfully${NC}"
        ;;

    studio)
        echo -e "${BLUE}🎨 Opening Prisma Studio...${NC}"
        npx prisma studio
        ;;

    *)
        echo -e "${BLUE}ArtiConnect Database Migration Tool${NC}"
        echo ""
        echo "Usage: ./scripts/migrate.sh [command]"
        echo ""
        echo "Commands:"
        echo "  dev       Create and apply a new migration (development)"
        echo "  deploy    Apply existing migrations (production)"
        echo "  reset     Reset the database (DANGEROUS - development only)"
        echo "  status    Check migration status"
        echo "  generate  Generate Prisma Client"
        echo "  studio    Open Prisma Studio"
        echo ""
        echo "Examples:"
        echo "  ./scripts/migrate.sh dev"
        echo "  ./scripts/migrate.sh deploy"
        echo "  ./scripts/migrate.sh status"
        exit 1
        ;;
esac
