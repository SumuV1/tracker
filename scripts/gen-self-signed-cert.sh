#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

mkdir -p certs

# SAN musi wskazywać właściwy typ (IP vs DNS), inaczej przeglądarki odrzucą cert.
if [[ "$HOST" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]]; then
  SAN_HOST="IP:${HOST}"
else
  SAN_HOST="DNS:${HOST}"
fi
SAN="${SAN_HOST},DNS:localhost,IP:127.0.0.1"

openssl req -x509 -nodes -newkey rsa:2048 \
  -days 3650 \
  -keyout certs/privkey.pem \
  -out certs/fullchain.pem \
  -subj "/CN=${HOST}" \
  -addext "subjectAltName=${SAN}"

chmod 600 certs/privkey.pem

echo "✅ Certyfikat self-signed wygenerowany dla ${HOST} (ważny 10 lat)"
echo "   certs/fullchain.pem, certs/privkey.pem"
echo "   Uruchom ten skrypt ponownie, żeby wymienić certyfikat, a potem:"
echo "   podman restart nginx"
