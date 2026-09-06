#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

podman run --rm \
  -v certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  docker.io/certbot/certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo "✅ Certyfikat wydany dla $DOMAIN"
