# Multi-stage build for ArtiConnect Frontend

# ========================================
# Stage 1: Dependencies
# ========================================
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd frontend && npm ci

# ========================================
# Stage 2: Build
# ========================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install all dependencies
RUN cd frontend && npm ci

# Copy source code
COPY frontend ./frontend

# Build application
WORKDIR /app/frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:4000}

RUN npm run build

# ========================================
# Stage 3: Production
# ========================================
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy dependencies
COPY --from=dependencies /app/frontend/node_modules ./node_modules

# Copy built application
COPY --from=build /app/frontend/.next ./.next
COPY --from=build /app/frontend/public ./public
COPY --from=build /app/frontend/package*.json ./
COPY --from=build /app/frontend/next.config.js ./

# Create .next/cache directory
RUN mkdir -p .next/cache

# Change ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["npm", "start"]
