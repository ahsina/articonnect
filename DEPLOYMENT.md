# Guide de Déploiement - ArtiConnect

Ce guide explique comment déployer ArtiConnect en production sur différentes plateformes.

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Configuration de Production](#configuration-de-production)
3. [Déploiement sur AWS](#déploiement-sur-aws)
4. [Déploiement avec Docker](#déploiement-avec-docker)
5. [Monitoring & Logs](#monitoring--logs)
6. [Maintenance](#maintenance)

---

## Prérequis

### Services Externes Requis

- ✅ **Stripe Account** (paiements)
- ✅ **Google Maps API Key** (géolocalisation)
- ✅ **SendGrid Account** (emails)
- ✅ **Twilio Account** (SMS)
- ✅ **AWS S3** (stockage fichiers)
- ✅ **Sentry Account** (monitoring erreurs)
- ✅ **Domain Name** avec SSL

### Infrastructure Minimale

**Backend:**
- CPU: 2 vCPU
- RAM: 4GB
- Storage: 20GB SSD

**Database:**
- PostgreSQL 15+
- RAM: 4GB
- Storage: 50GB SSD

**Cache:**
- Redis 7+
- RAM: 2GB

**Frontend:**
- Static hosting ou Node.js server
- CDN recommandé (CloudFlare)

---

## Configuration de Production

### Variables d'Environnement

Créer `.env.production`:

```bash
# ==============================
# APPLICATION
# ==============================
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://articonnect.com
BACKEND_URL=https://api.articonnect.com

# ==============================
# DATABASE
# ==============================
DATABASE_URL="postgresql://user:pass@prod-db.articonnect.com:5432/articonnect?schema=public"
REDIS_URL="redis://prod-redis.articonnect.com:6379"
MONGO_URL="mongodb://user:pass@prod-mongo.articonnect.com:27017/articonnect"

# ==============================
# SECURITY
# ==============================
JWT_SECRET="<STRONG-RANDOM-SECRET-256-BITS>"
ENCRYPTION_KEY="<32-BYTES-HEX-KEY>"

# ==============================
# STRIPE
# ==============================
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# ==============================
# EXTERNAL SERVICES
# ==============================
GOOGLE_MAPS_API_KEY="..."
SENDGRID_API_KEY="SG...."
SENDGRID_FROM_EMAIL="noreply@articonnect.com"
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
TWILIO_PHONE_NUMBER="+..."

# ==============================
# AWS
# ==============================
AWS_REGION="eu-west-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="articonnect-prod-uploads"

# ==============================
# MONITORING
# ==============================
SENTRY_DSN="https://...@sentry.io/..."
LOG_LEVEL="warn"
```

### Secrets Management

**Utiliser AWS Secrets Manager, Vault, ou équivalent:**

```bash
# Store secrets
aws secretsmanager create-secret \
  --name articonnect/production/jwt-secret \
  --secret-string "your-jwt-secret"

# Retrieve in app
const secret = await getSecret('articonnect/production/jwt-secret');
```

---

## Déploiement sur AWS

### Architecture Recommandée

```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
ALB (Load Balancer)
    ↓
    ├─ ECS Fargate (Backend) × 2
    ├─ ECS Fargate (Frontend) × 2
    │
    ├─ RDS PostgreSQL (Multi-AZ)
    ├─ ElastiCache Redis
    └─ S3 (Static Assets)
```

### Étapes de Déploiement

#### 1. Préparer les Images Docker

```bash
# Build Backend
cd backend/api-gateway
docker build -t articonnect-backend:latest .
docker tag articonnect-backend:latest \
  123456789.dkr.ecr.eu-west-1.amazonaws.com/articonnect-backend:latest

# Build Frontend
cd frontend
docker build -t articonnect-frontend:latest .
docker tag articonnect-frontend:latest \
  123456789.dkr.ecr.eu-west-1.amazonaws.com/articonnect-frontend:latest

# Push to ECR
aws ecr get-login-password --region eu-west-1 | \
  docker login --username AWS --password-stdin \
  123456789.dkr.ecr.eu-west-1.amazonaws.com

docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/articonnect-backend:latest
docker push 123456789.dkr.ecr.eu-west-1.amazonaws.com/articonnect-frontend:latest
```

#### 2. Créer RDS PostgreSQL

```bash
aws rds create-db-instance \
  --db-instance-identifier articonnect-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username articonnect \
  --master-user-password <STRONG-PASSWORD> \
  --allocated-storage 50 \
  --backup-retention-period 7 \
  --multi-az \
  --storage-encrypted \
  --db-name articonnect
```

#### 3. Créer ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id articonnect-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --num-cache-nodes 1
```

#### 4. Créer ECS Cluster

```bash
# Create cluster
aws ecs create-cluster --cluster-name articonnect-prod

# Create task definition (backend)
aws ecs register-task-definition \
  --cli-input-json file://backend-task-definition.json

# Create task definition (frontend)
aws ecs register-task-definition \
  --cli-input-json file://frontend-task-definition.json

# Create service
aws ecs create-service \
  --cluster articonnect-prod \
  --service-name articonnect-backend \
  --task-definition articonnect-backend:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

#### 5. Configurer ALB

```bash
# Create target group
aws elbv2 create-target-group \
  --name articonnect-backend-tg \
  --protocol HTTP \
  --port 4000 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Create load balancer
aws elbv2 create-load-balancer \
  --name articonnect-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx
```

#### 6. Exécuter Migrations

```bash
# Connect to ECS task
aws ecs execute-command \
  --cluster articonnect-prod \
  --task <task-id> \
  --container backend \
  --command "npx prisma migrate deploy" \
  --interactive
```

---

## Déploiement avec Docker Compose (Serveur Simple)

Pour un déploiement sur serveur unique:

### docker-compose.prod.yml

```yaml
version: '3.8'

services:
  backend:
    image: articonnect-backend:latest
    restart: always
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: articonnect-frontend:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=https://api.articonnect.com
    depends_on:
      - backend

  postgres:
    image: postgres:15-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=articonnect
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

### Commandes de Déploiement

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down
```

---

## Monitoring & Logs

### Sentry (Error Tracking)

Déjà configuré dans le code. Vérifier que `SENTRY_DSN` est défini.

### CloudWatch (AWS)

```bash
# Create log group
aws logs create-log-group --log-group-name /ecs/articonnect-backend

# Stream logs
aws logs tail /ecs/articonnect-backend --follow
```

### Healthchecks

**Backend**: `GET /health`
```json
{
  "status": "ok",
  "timestamp": "2025-01-20T10:30:00Z",
  "uptime": 86400,
  "database": "connected",
  "redis": "connected"
}
```

**Frontend**: `GET /`

### Alerts

Configurer des alertes pour:
- CPU > 80%
- Memory > 90%
- Disk > 85%
- Error rate > 1%
- Response time > 2s
- Database connections > 80% of max

---

## SSL/TLS

### Let's Encrypt (Gratuit)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d articonnect.com -d www.articonnect.com -d api.articonnect.com

# Auto-renewal (cron)
sudo crontab -e
# Add:
0 0 * * * certbot renew --quiet
```

### NGINX Configuration

```nginx
server {
    listen 80;
    server_name articonnect.com www.articonnect.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name articonnect.com www.articonnect.com;

    ssl_certificate /etc/letsencrypt/live/articonnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/articonnect.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl http2;
    server_name api.articonnect.com;

    ssl_certificate /etc/letsencrypt/live/articonnect.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/articonnect.com/privkey.pem;

    location / {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Maintenance

### Backups

**Database:**
```bash
# Daily backup (cron)
0 2 * * * pg_dump -h prod-db.articonnect.com -U articonnect articonnect | \
  gzip > /backups/articonnect-$(date +\%Y\%m\%d).sql.gz

# Upload to S3
aws s3 cp /backups/articonnect-$(date +\%Y\%m\%d).sql.gz \
  s3://articonnect-backups/database/
```

**Files (S3):**
```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket articonnect-prod-uploads \
  --versioning-configuration Status=Enabled

# Lifecycle policy (move to Glacier after 90 days)
```

### Updates

```bash
# 1. Pull latest code
git pull origin main

# 2. Build new images
./scripts/build-production.sh

# 3. Run migrations (if needed)
npm run migrate:prod

# 4. Deploy with zero-downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps --build backend

# 5. Wait for healthcheck
sleep 30

# 6. Check logs
docker-compose logs -f backend
```

### Rollback

```bash
# Rollback to previous image
docker-compose -f docker-compose.prod.yml up -d backend:previous

# Rollback database migration
npx prisma migrate resolve --rolled-back "<migration-name>"
```

---

## Checklist de Déploiement

- [ ] DNS configuré (A records, CNAME)
- [ ] SSL/TLS activé
- [ ] Variables d'environnement sécurisées
- [ ] Database avec backups automatiques
- [ ] Redis configuré
- [ ] S3 bucket créé
- [ ] Stripe en mode live
- [ ] SendGrid configuré
- [ ] Twilio configuré
- [ ] Monitoring activé (Sentry, CloudWatch)
- [ ] Logs centralisés
- [ ] Alertes configurées
- [ ] Healthchecks en place
- [ ] Rate limiting activé
- [ ] WAF configuré (CloudFlare)
- [ ] GDPR compliance vérifiée
- [ ] Tests end-to-end passés
- [ ] Load testing effectué
- [ ] Runbook documenté

---

## Support

**Urgences**: ops@articonnect.com
**Documentation**: https://docs.articonnect.com
**Status Page**: https://status.articonnect.com

---

**Version**: 1.0
**Dernière mise à jour**: 2025-11-07
