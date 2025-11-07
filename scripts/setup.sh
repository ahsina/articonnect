#!/bin/bash

# ArtiConnect Setup Script
# This script sets up the development environment

set -e

echo "🚀 ArtiConnect Setup Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js version
echo "📦 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${RED}❌ Node.js 20+ is required. Current version: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js version OK: $(node -v)${NC}"
echo ""

# Check if .env exists
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi
echo ""

# Start Docker containers
echo "🐳 Starting Docker containers..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

docker-compose up -d
echo -e "${GREEN}✅ Docker containers started${NC}"
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5
echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."

echo "  → Root dependencies..."
npm install

echo "  → Backend shared dependencies..."
cd backend/shared
npm install
cd ../..

echo "  → Backend API Gateway dependencies..."
cd backend/api-gateway
npm install
cd ../..

echo "  → Frontend dependencies..."
cd frontend
npm install
cd ..

echo -e "${GREEN}✅ All dependencies installed${NC}"
echo ""

# Generate Prisma Client
echo "🗄️  Generating Prisma Client..."
cd backend/shared
npx prisma generate
echo -e "${GREEN}✅ Prisma Client generated${NC}"
echo ""

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy
echo -e "${GREEN}✅ Migrations completed${NC}"
echo ""

# Seed database
echo "🌱 Seeding database..."
npx prisma db seed
cd ../..
echo -e "${GREEN}✅ Database seeded${NC}"
echo ""

# Success message
echo "================================"
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo ""
echo "📚 Next steps:"
echo ""
echo "  1. Edit .env file with your API keys (Stripe, Google Maps, etc.)"
echo "  2. Start the development server:"
echo ""
echo "     npm run dev"
echo ""
echo "  3. Access the application:"
echo ""
echo "     Frontend:  http://localhost:3000"
echo "     Backend:   http://localhost:4000"
echo "     API Docs:  http://localhost:4000/api/docs"
echo ""
echo "  4. Test credentials:"
echo ""
echo "     Admin:    admin@articonnect.com / Admin123!"
echo "     Client:   jean.dupont@example.com / Client123!"
echo "     Artisan:  pierre.plombier@example.com / Artisan123!"
echo ""
echo "================================"
