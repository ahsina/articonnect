# 🚀 ArtiConnect - Comprehensive Deployment Guide

**Version:** 1.0.0
**Last Updated:** November 2025
**Platform:** Docker, AWS/Cloud Ready

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Infrastructure Requirements](#infrastructure-requirements)
4. [Configuration Files](#configuration-files)
5. [Database Setup](#database-setup)
6. [Docker Deployment](#docker-deployment)
7. [SSL/TLS Certificate Setup](#ssltls-certificate-setup)
8. [Domain & DNS Configuration](#domain--dns-configuration)
9. [Post-Deployment Steps](#post-deployment-steps)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedure](#rollback-procedure)

---

## ✅ Pre-Deployment Checklist

### Code Readiness
- [x] All CI/CD tests passing
- [x] Frontend build successful (no errors)
- [x] Backend build successful (no errors)
- [!] **14 TODO comments found** - Review before production:
  - Backend: 10 TODOs (bank transfers, calendar integration, badges)
  - Frontend: 4 TODOs (API integrations, cart checkout)
- [x] No critical security vulnerabilities
- [!] **PWA icons missing** - Create before deployment

### Infrastructure Preparation
- [ ] Production server provisioned
- [ ] Database server configured
- [ ] Redis server configured
- [ ] S3 bucket created
- [ ] Domain purchased and configured
- [ ] SSL certificates obtained
- [ ] Monitoring tools set up

### Third-Party Services
- [ ] Stripe account (production keys)
- [ ] Twilio account (SMS/2FA)
- [ ] AWS account (S3 storage)
- [ ] Google Maps API key
- [ ] SMTP server (email delivery)
- [ ] Sentry account (error tracking)

---

## 🌍 Environment Setup

### 1. Server Requirements

**Minimum Specifications:**
- **CPU:** 4 cores
- **RAM:** 8 GB
- **Storage:** 50 GB SSD
- **OS:** Ubuntu 20.04 LTS or later
- **Docker:** v24.0+
- **Docker Compose:** v2.20+

**Recommended Specifications:**
- **CPU:** 8 cores
- **RAM:** 16 GB
- **Storage:** 100 GB SSD (with auto-scaling)

### 2. Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add user to docker group (logout required after)
sudo usermod -aG docker $USER
```

---

## 🏗️ Infrastructure Requirements

### Required Services

| Service | Purpose | Provider Options |
|---------|---------|------------------|
| **PostgreSQL** | Main database | AWS RDS, DigitalOcean, Self-hosted |
| **Redis** | Cache & sessions | AWS ElastiCache, Redis Cloud, Self-hosted |
| **S3** | File storage | AWS S3, DigitalOcean Spaces, MinIO |
| **SMTP** | Email delivery | SendGrid, AWS SES, Mailgun |
| **CDN** | Static assets | CloudFlare, AWS CloudFront |

### Port Requirements

| Port | Service | Internal/External |
|------|---------|-------------------|
| 80 | HTTP (redirect to HTTPS) | External |
| 443 | HTTPS | External |
| 3000 | Backend API | Internal only |
| 3001 | Frontend | Internal only |
| 5432 | PostgreSQL | Internal only |
| 6379 | Redis | Internal only |

---

## ⚙️ Configuration Files

### 1. Create Production Environment File

Create `.env.production` in the project root:

```bash
# ===================================
# PRODUCTION ENVIRONMENT VARIABLES
# ===================================

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
POSTGRES_DB=articonnect_prod
POSTGRES_USER=articonnect
POSTGRES_PASSWORD=<STRONG_PASSWORD_HERE>  # Generate with: openssl rand -base64 32
DATABASE_URL="postgresql://articonnect:<PASSWORD>@postgres:5432/articonnect_prod?schema=public"

# ==========================================
# REDIS CONFIGURATION
# ==========================================
REDIS_PASSWORD=<STRONG_PASSWORD_HERE>  # Generate with: openssl rand -base64 32
REDIS_URL="redis://:<PASSWORD>@redis:6379"

# ==========================================
# JWT & AUTHENTICATION
# ==========================================
JWT_SECRET=<GENERATE_WITH_OPENSSL>  # openssl rand -base64 64
JWT_REFRESH_SECRET=<GENERATE_WITH_OPENSSL>  # Different from JWT_SECRET
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="30d"

# ==========================================
# STRIPE PAYMENT (PRODUCTION KEYS)
# ==========================================
STRIPE_SECRET_KEY=sk_live_...  # From Stripe Dashboard
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe webhook settings
PLATFORM_COMMISSION_PERCENT=10

# ==========================================
# AWS S3 STORAGE
# ==========================================
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY>
AWS_S3_BUCKET=articonnect-prod-uploads

# ==========================================
# FRONTEND & BACKEND URLs
# ==========================================
NEXT_PUBLIC_API_URL=https://api.articonnect.com
NEXT_PUBLIC_FRONTEND_URL=https://articonnect.com
NEXT_PUBLIC_SOCKET_URL=https://api.articonnect.com
FRONTEND_URL=https://articonnect.com

# ==========================================
# GOOGLE SERVICES
# ==========================================
GOOGLE_CLIENT_ID=<YOUR_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<YOUR_CLIENT_SECRET>
GOOGLE_CALLBACK_URL=https://api.articonnect.com/auth/google/callback
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<YOUR_API_KEY>

# ==========================================
# EMAIL (SMTP)
# ==========================================
SMTP_HOST=smtp.sendgrid.net  # Or your SMTP provider
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey  # For SendGrid
SMTP_PASSWORD=<SENDGRID_API_KEY>
SMTP_FROM=noreply@articonnect.com

# ==========================================
# SMS (TWILIO) - For 2FA
# ==========================================
TWILIO_ACCOUNT_SID=<YOUR_ACCOUNT_SID>
TWILIO_AUTH_TOKEN=<YOUR_AUTH_TOKEN>
TWILIO_PHONE_NUMBER=+33XXXXXXXXX

# ==========================================
# MONITORING & ERROR TRACKING
# ==========================================
SENTRY_DSN=<YOUR_SENTRY_DSN>
SENTRY_ENVIRONMENT=production
LOG_LEVEL=info

# ==========================================
# SECURITY
# ==========================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGINS=https://articonnect.com,https://www.articonnect.com

# ==========================================
# MULTI-COUNTRY
# ==========================================
SUPPORTED_COUNTRIES=LU,FR,BE,DE
VAT_RATES={"LU":17,"FR":20,"BE":21,"DE":19}

# ==========================================
# FEATURE FLAGS
# ==========================================
ENABLE_2FA=true
ENABLE_MARKETPLACE=true
ENABLE_CHAT=true
ENABLE_PUSH_NOTIFICATIONS=true

# ==========================================
# DOCKER
# ==========================================
DOCKER_USERNAME=<YOUR_DOCKERHUB_USERNAME>

# ==========================================
# ENVIRONMENT
# ==========================================
NODE_ENV=production
PORT=3000
FRONTEND_PORT=3001
```

### 2. Verify Configuration

```bash
# Check for missing required variables
cat .env.production | grep "YOUR_"
cat .env.production | grep "<"

# All these should return nothing - if not, fill in missing values
```

---

## 💾 Database Setup

### 1. Initialize PostgreSQL

```bash
# Start PostgreSQL container
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for database to be ready
sleep 10

# Generate Prisma Client
cd backend/shared
npx prisma generate

# Push schema to database (for initial setup)
DATABASE_URL="postgresql://articonnect:<PASSWORD>@localhost:5432/articonnect_prod" \
  npx prisma db push

# Or run migrations (if migrations directory is complete)
DATABASE_URL="postgresql://articonnect:<PASSWORD>@localhost:5432/articonnect_prod" \
  npx prisma migrate deploy
```

### 2. Verify Database Setup

```bash
# Connect to database
docker exec -it articonnect-postgres psql -U articonnect -d articonnect_prod

# Check tables
\dt

# Expected tables: User, Mission, Payment, Transaction, etc.
# Exit: \q
```

### 3. Seed Production Data (Optional)

```bash
# Create admin user
cd backend/api-gateway
npm run seed:admin

# Import initial data (categories, specialties, etc.)
npm run seed:initial-data
```

---

## 🐳 Docker Deployment

### 1. Build Docker Images

```bash
# Build backend image
cd backend
docker build -t <DOCKERHUB_USERNAME>/articonnect-backend:latest .

# Build frontend image
cd ../frontend
docker build -t <DOCKERHUB_USERNAME>/articonnect-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.articonnect.com .

# Verify images
docker images | grep articonnect
```

### 2. Push to Docker Registry (Optional)

```bash
# Login to Docker Hub
docker login

# Push images
docker push <DOCKERHUB_USERNAME>/articonnect-backend:latest
docker push <DOCKERHUB_USERNAME>/articonnect-frontend:latest
```

### 3. Deploy with Docker Compose

```bash
# Navigate to project root
cd /path/to/articonnect

# Load environment variables
export $(cat .env.production | xargs)

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 4. Verify Containers

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected output:
# articonnect-nginx      Up (healthy)   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# articonnect-frontend   Up (healthy)   3001/tcp
# articonnect-backend    Up (healthy)   3000/tcp
# articonnect-postgres   Up (healthy)   5432/tcp
# articonnect-redis      Up (healthy)   6379/tcp
```

---

## 🔒 SSL/TLS Certificate Setup

### Option 1: Let's Encrypt (Recommended for Production)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificates
sudo certbot certonly --standalone -d articonnect.com -d www.articonnect.com -d api.articonnect.com \
  --email admin@articonnect.com --agree-tos --no-eff-email

# Copy certificates to nginx/ssl/
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/articonnect.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/articonnect.com/privkey.pem nginx/ssl/

# Set permissions
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem

# Restart nginx
docker-compose -f docker-compose.prod.yml up -d nginx
```

### Option 2: Self-Signed Certificates (Development Only)

```bash
# Generate self-signed certificate
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/CN=articonnect.com"
```

### Auto-Renewal Setup (Let's Encrypt)

```bash
# Create renewal cron job
sudo crontab -e

# Add this line (runs daily at 3 AM):
0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/articonnect/docker-compose.prod.yml restart nginx"
```

---

## 🌐 Domain & DNS Configuration

### 1. Point Domain to Server

Configure DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | <SERVER_IP> | 3600 |
| A | www | <SERVER_IP> | 3600 |
| A | api | <SERVER_IP> | 3600 |
| CNAME | www | articonnect.com | 3600 |

### 2. Verify DNS Propagation

```bash
# Check DNS resolution
nslookup articonnect.com
nslookup www.articonnect.com
nslookup api.articonnect.com

# Or use
dig articonnect.com
```

### 3. Update Hosts File (Temporary Testing)

If DNS isn't ready yet, test locally:

```bash
# Edit hosts file
sudo nano /etc/hosts

# Add entries:
<SERVER_IP> articonnect.com
<SERVER_IP> www.articonnect.com
<SERVER_IP> api.articonnect.com
```

---

## 🎯 Post-Deployment Steps

### 1. Health Checks

```bash
# Check backend health
curl https://api.articonnect.com/health

# Expected: {"status":"ok"}

# Check frontend
curl -I https://articonnect.com

# Expected: HTTP/2 200
```

### 2. Test Critical Paths

```bash
# Test user registration
curl -X POST https://api.articonnect.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","role":"CLIENT"}'

# Test login
curl -X POST https://api.articonnect.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

### 3. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.articonnect.com/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `charge.failed`
4. Copy webhook secret to `.env.production`

### 4. Verify PWA Installation

1. Open https://articonnect.com in Chrome
2. Check for install button in address bar
3. Open DevTools → Application → Manifest
4. Verify all fields are correct

**⚠️ Action Required: PWA icons missing!**

Create icons before going live:
```bash
cd frontend/public

# Create 192x192 icon
convert logo.png -resize 192x192 icon-192x192.png

# Create 512x512 icon
convert logo.png -resize 512x512 icon-512x512.png
```

### 5. Set Up Monitoring

```bash
# Install monitoring agent (example: Datadog)
DD_API_KEY=<YOUR_API_KEY> DD_SITE="datadoghq.eu" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Configure backend logging
# Logs are already configured via Sentry DSN in .env
```

### 6. Enable Firewall

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

### 7. Database Backup Setup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-articonnect.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/articonnect"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec articonnect-postgres pg_dump -U articonnect articonnect_prod | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Redis
docker exec articonnect-redis redis-cli --rdb /data/dump_$DATE.rdb

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://articonnect-backups/

# Delete backups older than 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-articonnect.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-articonnect.sh
```

---

## 📊 Monitoring & Maintenance

### Key Metrics to Monitor

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| CPU Usage | Datadog/CloudWatch | > 80% for 5 min |
| Memory Usage | Datadog/CloudWatch | > 85% |
| Disk Usage | Datadog/CloudWatch | > 85% |
| Response Time | Sentry/APM | > 1000ms (p95) |
| Error Rate | Sentry | > 1% |
| Database Connections | PostgreSQL | > 80 |
| Redis Memory | Redis | > 450MB |

### Log Locations

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Nginx logs
docker exec articonnect-nginx tail -f /var/log/nginx/access.log
docker exec articonnect-nginx tail -f /var/log/nginx/error.log

# PostgreSQL logs
docker-compose -f docker-compose.prod.yml logs postgres

# System logs
sudo journalctl -u docker -f
```

### Maintenance Tasks

**Daily:**
- Check error logs
- Monitor disk space
- Verify backup completion

**Weekly:**
- Review performance metrics
- Check for security updates
- Analyze user reports

**Monthly:**
- Update dependencies
- Review and rotate logs
- Performance optimization

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Backend Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Common issues:
# - Database connection failed → Check DATABASE_URL
# - Port already in use → Check for conflicting services
# - Out of memory → Increase server RAM or optimize queries
```

#### 2. Frontend Shows 502 Bad Gateway

```bash
# Check frontend container
docker-compose -f docker-compose.prod.yml ps frontend

# Restart frontend
docker-compose -f docker-compose.prod.yml restart frontend

# Check nginx config
docker exec articonnect-nginx nginx -t
```

#### 3. Database Connection Timeout

```bash
# Check PostgreSQL health
docker exec articonnect-postgres pg_isready -U articonnect

# Check connections
docker exec articonnect-postgres psql -U articonnect -c "SELECT count(*) FROM pg_stat_activity;"

# Restart if needed
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 4. SSL Certificate Issues

```bash
# Check certificate expiration
echo | openssl s_client -servername articonnect.com -connect articonnect.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew manually
sudo certbot renew

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

#### 5. High Memory Usage

```bash
# Check container stats
docker stats

# If backend is consuming too much:
# 1. Check for memory leaks in logs
# 2. Restart container
docker-compose -f docker-compose.prod.yml restart backend

# If Redis is full:
docker exec articonnect-redis redis-cli --scan --pattern "*" | wc -l
docker exec articonnect-redis redis-cli FLUSHDB  # CAREFUL: Clears all cache
```

---

## ⏮️ Rollback Procedure

### Quick Rollback (Using Previous Images)

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Pull previous version
docker pull <DOCKERHUB_USERNAME>/articonnect-backend:v1.0.0
docker pull <DOCKERHUB_USERNAME>/articonnect-frontend:v1.0.0

# Tag as latest
docker tag <DOCKERHUB_USERNAME>/articonnect-backend:v1.0.0 <DOCKERHUB_USERNAME>/articonnect-backend:latest
docker tag <DOCKERHUB_USERNAME>/articonnect-frontend:v1.0.0 <DOCKERHUB_USERNAME>/articonnect-frontend:latest

# Restart
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Stop backend to prevent writes
docker-compose -f docker-compose.prod.yml stop backend

# Restore from backup
gunzip < /backups/articonnect/db_20251122_020000.sql.gz | \
  docker exec -i articonnect-postgres psql -U articonnect -d articonnect_prod

# Restart backend
docker-compose -f docker-compose.prod.yml start backend
```

---

## 📝 Pre-Production TODO Items

### Critical (Must Fix Before Production)

**PWA Icons:**
- [ ] Create `icon-192x192.png`
- [ ] Create `icon-512x512.png`
- [ ] Test PWA installation on mobile

**Code TODOs to Address:**

**Backend (High Priority):**
1. `bank-transfer.service.ts:264` - Implement Stripe Connect fund transfers
2. `bank-transfer.service.ts:279` - Add client notification on rejection
3. `main.ts:50` - Remove `unsafe-inline` from CSP (implement nonces)

**Frontend (Medium Priority):**
4. `cart/page.tsx:17` - Implement Stripe checkout flow
5. `artisan/profile/page.tsx:69` - Complete artisan profile API integration
6. `marketplace/page.tsx:326` - Add to cart functionality

**Backend (Low Priority - Can be post-launch):**
7. `outlook-calendar.service.ts` - Implement Outlook Calendar integration (4 TODOs)
8. `badges.service.ts:154` - Implement response time tracking

### Configuration Checklist

Before going live, ensure all these are set:
- [ ] All `<YOUR_*>` placeholders replaced in `.env.production`
- [ ] Stripe webhook endpoint configured
- [ ] DNS records propagated (24-48 hours)
- [ ] SSL certificates installed and auto-renewal configured
- [ ] Backup cron jobs tested
- [ ] Monitoring alerts configured
- [ ] Firewall rules applied
- [ ] SMTP email delivery tested
- [ ] SMS (Twilio) tested for 2FA
- [ ] S3 bucket permissions verified

---

## 🎉 Launch Checklist

**Final Pre-Launch:**
- [ ] Run full regression tests
- [ ] Load test with expected traffic
- [ ] Security scan completed
- [ ] Privacy policy and terms updated
- [ ] GDPR compliance verified
- [ ] Backup and restore tested
- [ ] Rollback procedure tested
- [ ] On-call schedule prepared
- [ ] Incident response plan documented

**Go Live:**
- [ ] Switch DNS to production
- [ ] Announce on social media
- [ ] Monitor logs for first 2 hours continuously
- [ ] Have rollback ready to execute
- [ ] Customer support team briefed

---

## 📞 Support Contacts

**Infrastructure Issues:**
- Server Provider Support
- Docker Community Forums
- CloudFlare Support (if using)

**Application Issues:**
- Backend Logs: Check Sentry
- Database: Check PostgreSQL logs
- Payment: Stripe Support Dashboard

**Emergency Contacts:**
- DevOps Lead: [Contact]
- Security Lead: [Contact]
- Database Admin: [Contact]

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [NestJS Production](https://docs.nestjs.com/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/docs/)

---

**Document Version:** 1.0.0
**Last Reviewed:** November 2025
**Next Review:** January 2026
