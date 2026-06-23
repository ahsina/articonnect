#!/usr/bin/env bash
# Génère un certificat TLS auto-signé pour l'IP du serveur (pas de domaine → pas de Let's Encrypt).
set -euo pipefail
IP="${1:-149.56.131.178}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ssl"
mkdir -p "$DIR"

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -days 825 \
  -subj "/C=LU/O=ArtiConnect/CN=$IP" \
  -addext "subjectAltName=IP:$IP"

chmod 600 "$DIR/privkey.pem"
chmod 644 "$DIR/fullchain.pem"
echo "Certificat auto-signé généré dans $DIR (CN/SAN = IP:$IP, validité 825j)."
