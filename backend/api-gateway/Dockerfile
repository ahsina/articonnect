# Multi-stage build for ArtiConnect Backend

# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/shared/package*.json ./backend/shared/
COPY backend/api-gateway/package*.json ./backend/api-gateway/

# Retire le hook husky (script "prepare" racine) avant l'install — absent en prod-only
RUN npm pkg delete scripts.prepare && npm ci --only=production

# ========================================
# Stage 2: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /app

# OpenSSL requis pour que Prisma détecte la bonne cible (linux-musl-openssl-3.0.x) au generate
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY backend/shared/package*.json ./backend/shared/
COPY backend/api-gateway/package*.json ./backend/api-gateway/

# Retire le hook husky (script "prepare" racine) avant l'install
RUN npm pkg delete scripts.prepare && npm ci

# Copy source code
COPY backend/shared ./backend/shared
COPY backend/api-gateway ./backend/api-gateway

# Generate Prisma Client
WORKDIR /app/backend/shared
RUN npx prisma generate

# Build application
WORKDIR /app/backend/api-gateway
RUN npm run build

# ========================================
# Stage 3: Production
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# dumb-init (signaux) + openssl (libssl3 pour le query engine Prisma au runtime)
RUN apk add --no-cache dumb-init openssl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Monorepo npm workspaces : les dépendances sont hoistées dans /app/node_modules et le client
# Prisma est généré au même endroit. On copie l'arbre /app complet du stage build (inclut
# node_modules hoisté + client Prisma généré + dist + la CLI prisma pour `db push`).
COPY --from=build /app ./

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set working directory
WORKDIR /app/backend/api-gateway

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
