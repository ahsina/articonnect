# 🚀 ArtiConnect - Quick Start Deployment

**For experienced DevOps engineers - 15 minutes to production**

---

## Prerequisites Installed
- Docker 24.0+ & Docker Compose 2.20+
- Domain pointing to server IP
- SSL certificates ready

---

## 1. Clone & Configure (2 min)

```bash
git clone https://github.com/your-org/articonnect.git
cd articonnect

# Copy and fill environment variables
cp .env.example .env.production
nano .env.production  # Fill in all <YOUR_*> placeholders
```

**Critical variables to set:**
```bash
POSTGRES_PASSWORD=<generate>
REDIS_PASSWORD=<generate>
JWT_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
STRIPE_SECRET_KEY=sk_live_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 2. SSL Setup (3 min)

```bash
# Install Certbot
sudo apt install certbot -y

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d www.yourdomain.com \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos

# Copy to nginx
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/
sudo chmod 644 nginx/ssl/fullchain.pem
sudo chmod 600 nginx/ssl/privkey.pem
```

---

## 3. Update Nginx Config (1 min)

```bash
nano nginx/nginx.conf

# Replace all instances of:
# - articonnect.com → yourdomain.com
# - api.articonnect.com → api.yourdomain.com
```

---

## 4. Database Setup (2 min)

```bash
# Load environment
export $(cat .env.production | xargs)

# Start PostgreSQL
docker-compose -f docker-compose.prod.yml up -d postgres

# Wait for ready
sleep 10

# Initialize schema
cd backend/shared
npx prisma generate
npx prisma db push
cd ../..
```

---

## 5. Build Images (5 min)

```bash
# Build backend
docker build -t youruser/articonnect-backend:latest -f backend/Dockerfile backend/

# Build frontend
docker build -t youruser/articonnect-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
  frontend/
```

---

## 6. Deploy (2 min)

```bash
# Update docker-compose.prod.yml
nano docker-compose.prod.yml
# Change:
# - ${DOCKER_USERNAME}/articonnect-backend → youruser/articonnect-backend
# - ${DOCKER_USERNAME}/articonnect-frontend → youruser/articonnect-frontend

# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check health
docker-compose -f docker-compose.prod.yml ps
```

---

## 7. Verify (1 min)

```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend
curl -I https://yourdomain.com

# Check all services are healthy
docker ps --format "table {{.Names}}\t{{.Status}}"
```

---

## 8. Post-Deployment

```bash
# Configure Stripe webhooks
# Go to: https://dashboard.stripe.com/webhooks
# Add endpoint: https://api.yourdomain.com/webhooks/stripe
# Events: payment_intent.*, charge.*

# Set up auto-renewal for SSL
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet --deploy-hook "docker-compose -f /path/to/articonnect/docker-compose.prod.yml restart nginx"

# Set up daily database backups
sudo nano /usr/local/bin/backup-articonnect.sh
```

Backup script:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec articonnect-postgres pg_dump -U articonnect articonnect_prod | gzip > /backups/db_$DATE.sql.gz
find /backups -name "db_*.sql.gz" -mtime +30 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup-articonnect.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-articonnect.sh
```

---

## ⚠️ Before Going Live

**Fix Critical TODOs:**
1. Create PWA icons (`icon-192x192.png`, `icon-512x512.png`)
2. Implement Stripe checkout flow in cart
3. Remove CSP `unsafe-inline` from backend

**Security:**
```bash
# Enable firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 🔧 Common Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart service
docker-compose -f docker-compose.prod.yml restart [service]

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Rollback
docker-compose -f docker-compose.prod.yml down
docker tag youruser/articonnect-backend:v1.0.0 youruser/articonnect-backend:latest
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring Setup

**Install monitoring (optional but recommended):**
```bash
# Sentry (already configured via SENTRY_DSN in .env)
# Datadog
DD_API_KEY=<key> DD_SITE="datadoghq.eu" bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"

# Prometheus + Grafana (advanced)
# See: DEPLOYMENT_GUIDE.md for full setup
```

---

**Full documentation:** See `DEPLOYMENT_GUIDE.md`
**Issues:** Check `TROUBLESHOOTING.md`
**Support:** docs@articonnect.com
