#!/usr/bin/env bash
# Backup Krafolt : Postgres (pg_dump) + bucket MinIO. Rétention 7 jours.
set -euo pipefail
cd "$(dirname "$0")/.."
ENVF="deploy/.env.deploy"
ROOT="${BACKUP_ROOT:-/home/debian/backups/krafolt}"
DATE=$(date +%Y%m%d-%H%M)
mkdir -p "$ROOT"

# --- Postgres ---
docker exec articonnect-postgres pg_dump -U articonnect articonnect | gzip > "$ROOT/db-$DATE.sql.gz"

# --- MinIO (bucket articonnect) ---
MK=$(grep '^AWS_ACCESS_KEY_ID=' "$ENVF" | cut -d= -f2)
MS=$(grep '^AWS_SECRET_ACCESS_KEY=' "$ENVF" | cut -d= -f2)
docker run --rm --network articonnect-net -v "$ROOT":/backup --entrypoint sh minio/mc -c \
  "mc alias set m http://minio:9000 '$MK' '$MS' >/dev/null 2>&1 && mc mirror --overwrite m/articonnect /backup/minio-$DATE" >/dev/null 2>&1 || true
if [ -d "$ROOT/minio-$DATE" ]; then
  tar -czf "$ROOT/minio-$DATE.tar.gz" -C "$ROOT" "minio-$DATE"; docker run --rm -u 0 -v "$ROOT":/b alpine rm -rf "/b/minio-$DATE" >/dev/null 2>&1
fi

# --- Rétention 7 jours ---
find "$ROOT" -maxdepth 1 -name '*.gz' -mtime +7 -delete 2>/dev/null || true

echo "[$(date)] Backup OK -> $ROOT (db-$DATE.sql.gz + minio-$DATE.tar.gz)"
