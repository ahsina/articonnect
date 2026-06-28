#!/usr/bin/env bash
# Redéploiement PRODUCTION de Krafolt — SANS les bypass de démo.
# (Ne désactive PAS l'anti-fraude, ne force PAS phoneVerified.)
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f deploy/docker-compose.deploy.yml --env-file deploy/.env.deploy"
echo "==> build backend + frontend"
$COMPOSE build backend frontend
echo "==> up -d (toute la stack)"
$COMPOSE up -d
echo "==> flush du cache Redis"
RPWD=$(grep '^REDIS_PASSWORD=' deploy/.env.deploy | cut -d= -f2)
docker exec articonnect-redis redis-cli -a "$RPWD" --no-auth-warning FLUSHALL >/dev/null 2>&1 || true
echo "==> Terminé. Anti-fraude + throttle ACTIFS (posture production)."
