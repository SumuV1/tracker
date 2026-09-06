#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

podman rm -f nginx
podman run -d --pod nginx-pod --name nginx --restart=always \
  -e DOMAIN="$DOMAIN" \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  docker.io/library/nginx:alpine

echo "✅ HTTPS aktywne na https://$DOMAIN"
