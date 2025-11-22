# ==========================================
# Multi-stage Dockerfile for ArtiConnect Backend
# ==========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies for both shared and api-gateway
COPY shared/package*.json ./shared/
COPY api-gateway/package*.json ./api-gateway/
RUN cd shared && npm ci --only=production
RUN cd api-gateway && npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/shared/node_modules ./shared/node_modules
COPY --from=deps /app/api-gateway/node_modules ./api-gateway/node_modules

# Copy source code
COPY shared ./shared
COPY api-gateway ./api-gateway

# Generate Prisma Client
WORKDIR /app/shared
RUN npx prisma generate

# Build the application
WORKDIR /app/api-gateway
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app

# Install only production dependencies
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/api-gateway/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/api-gateway/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/shared/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nestjs:nodejs /app/shared/prisma ./prisma

# Copy package.json for version info
COPY --chown=nestjs:nodejs api-gateway/package*.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
