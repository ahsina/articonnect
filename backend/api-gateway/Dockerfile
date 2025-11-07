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

# Install dependencies
RUN npm ci --only=production

# ========================================
# Stage 2: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/shared/package*.json ./backend/shared/
COPY backend/api-gateway/package*.json ./backend/api-gateway/

# Install all dependencies (including dev)
RUN npm ci

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

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/backend/shared/node_modules ./backend/shared/node_modules
COPY --from=dependencies /app/backend/api-gateway/node_modules ./backend/api-gateway/node_modules

# Copy Prisma schema and generated client
COPY --from=build /app/backend/shared/prisma ./backend/shared/prisma
COPY --from=build /app/backend/shared/node_modules/.prisma ./backend/shared/node_modules/.prisma

# Copy built application
COPY --from=build /app/backend/api-gateway/dist ./backend/api-gateway/dist
COPY --from=build /app/backend/api-gateway/package*.json ./backend/api-gateway/

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
