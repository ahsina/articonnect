#!/bin/bash

# ArtiConnect - Quick Setup Script
# This script automates the installation and setup process

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local all_ok=true
    
    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 20 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d. -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 20 ]; then
            print_warning "Node.js version should be 20 or higher. Current: $NODE_VERSION"
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 20+ from https://nodejs.org/"
        all_ok=false
    fi
    
    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: v$NPM_VERSION"
    else
        print_error "npm is not installed"
        all_ok=false
    fi
    
    # Check Docker
    if command_exists docker; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker is installed: $DOCKER_VERSION"
    else
        print_warning "Docker is not installed. Docker is recommended for database services."
        print_info "You can install Docker from https://www.docker.com/get-started"
    fi
    
    # Check Docker Compose
    if command_exists docker-compose || docker compose version >/dev/null 2>&1; then
        print_success "Docker Compose is available"
    else
        print_warning "Docker Compose is not installed"
    fi
    
    if [ "$all_ok" = false ]; then
        print_error "Please install the required dependencies and run this script again."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    print_info "Installing root dependencies..."
    npm install
    print_success "Root dependencies installed"
}

# Setup environment variables
setup_env() {
    print_header "Setting Up Environment Variables"
    
    if [ -f ".env" ]; then
        print_warning ".env file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_success ".env file created from .env.example"
        print_warning "Please edit .env file and configure your environment variables"
        print_info "Required: DATABASE_URL, REDIS_URL, MONGODB_URL, JWT_SECRET, JWT_REFRESH_SECRET"
    else
        print_error ".env.example not found"
        exit 1
    fi
}

# Setup Docker services
setup_docker() {
    print_header "Setting Up Docker Services"
    
    if ! command_exists docker; then
        print_warning "Docker not installed, skipping Docker setup"
        return
    fi
    
    print_info "Starting PostgreSQL, Redis, and MongoDB..."
    
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        print_success "Docker services started"
        
        print_info "Waiting for services to be ready..."
        sleep 5
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            print_success "Services are running"
        else
            print_error "Some services failed to start. Check with: docker-compose ps"
        fi
    else
        print_error "docker-compose.yml not found"
    fi
}

# Setup Prisma
setup_prisma() {
    print_header "Setting Up Prisma Database"
    
    print_info "Generating Prisma client..."
    npm run prisma:generate
    print_success "Prisma client generated"
    
    print_info "Running database migrations..."
    npm run prisma:migrate || {
        print_warning "Migrations failed. This might be expected for a first-time setup."
        print_info "Trying to push schema directly..."
        cd backend/shared
        npx prisma db push
        cd ../..
    }
    print_success "Database schema ready"
}

# Seed database
seed_database() {
    print_header "Seeding Database"
    
    read -p "Do you want to seed the database with test data? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        print_info "Skipping database seeding"
        return
    fi
    
    print_info "Seeding database with test data..."
    cd backend/shared
    npx prisma db seed || print_warning "Seeding failed or no seed file found"
    cd ../..
    print_success "Database seeded"
}

# Final instructions
print_final_instructions() {
    print_header "Setup Complete!"
    
    echo -e "${GREEN}✓ ArtiConnect is ready to use!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Review and configure your ${YELLOW}.env${NC} file"
    echo -e "  2. Make sure all environment variables are set correctly"
    echo -e "  3. Start the development servers:"
    echo ""
    echo -e "     ${GREEN}npm run dev${NC}         - Start both backend and frontend"
    echo -e "     ${GREEN}npm run dev:backend${NC}  - Start backend only"
    echo -e "     ${GREEN}npm run dev:frontend${NC} - Start frontend only"
    echo ""
    echo -e "${BLUE}Access the application:${NC}"
    echo -e "  • Frontend:  ${YELLOW}http://localhost:3000${NC}"
    echo -e "  • API:       ${YELLOW}http://localhost:4000${NC}"
    echo -e "  • Swagger:   ${YELLOW}http://localhost:4000/api/docs${NC}"
    echo ""
    echo -e "${BLUE}Test accounts (after seeding):${NC}"
    echo -e "  • Client:    ${YELLOW}jean.dupont@example.com${NC} / ${YELLOW}Client123!${NC}"
    echo -e "  • Artisan:   ${YELLOW}marc.plombier@example.com${NC} / ${YELLOW}Artisan123!${NC}"
    echo -e "  • Admin:     ${YELLOW}admin@articonnect.com${NC} / ${YELLOW}Admin123!${NC}"
    echo ""
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  • ${GREEN}npm run docker:up${NC}      - Start Docker services"
    echo -e "  • ${GREEN}npm run docker:down${NC}    - Stop Docker services"
    echo -e "  • ${GREEN}npm run prisma:studio${NC}  - Open Prisma Studio (DB GUI)"
    echo -e "  • ${GREEN}npm test${NC}               - Run tests"
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo -e "  • README.md"
    echo -e "  • DOCUMENTATION_FONCTIONNELLE.md"
    echo -e "  • ANALYSE_SECURITE.md"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
    echo ""
}

# Main execution
main() {
    clear
    
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              ArtiConnect - Setup Script                       ║"
    echo "║                                                               ║"
    echo "║  This script will help you set up the development            ║"
    echo "║  environment for ArtiConnect platform.                       ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    print_info "Starting setup process..."
    sleep 1
    
    # Run setup steps
    check_prerequisites
    install_dependencies
    setup_env
    setup_docker
    setup_prisma
    seed_database
    print_final_instructions
}

# Run main function
main
