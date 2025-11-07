#!/bin/bash

# ArtiConnect Clean Script
# This script cleans all generated files and dependencies

set -e

echo "🧹 ArtiConnect Clean Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Confirmation
read -p "This will remove all node_modules, dist, build, and .next directories. Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Clean node_modules
echo "🗑️  Removing node_modules..."
rm -rf node_modules
rm -rf backend/shared/node_modules
rm -rf backend/api-gateway/node_modules
rm -rf frontend/node_modules
echo -e "${GREEN}✅ node_modules removed${NC}"

# Clean build directories
echo "🗑️  Removing build directories..."
rm -rf backend/api-gateway/dist
rm -rf frontend/.next
rm -rf frontend/out
echo -e "${GREEN}✅ Build directories removed${NC}"

# Clean Prisma generated files
echo "🗑️  Removing Prisma generated files..."
rm -rf backend/shared/node_modules/.prisma
echo -e "${GREEN}✅ Prisma generated files removed${NC}"

# Clean logs
echo "🗑️  Removing log files..."
rm -rf logs
rm -rf backend/api-gateway/logs
rm -rf *.log
echo -e "${GREEN}✅ Log files removed${NC}"

# Clean cache
echo "🗑️  Removing cache..."
rm -rf .next/cache
rm -rf frontend/.next/cache
echo -e "${GREEN}✅ Cache removed${NC}"

echo ""
echo "================================"
echo -e "${GREEN}✅ Clean completed successfully!${NC}"
echo ""
echo "To reinstall everything, run:"
echo ""
echo "  ./scripts/setup.sh"
echo ""
