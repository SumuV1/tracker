#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

# Rootless Podman nie zbinduje portów <1024 — stąd domyślne 8080/8443.
HTTP_PORT="${HTTP_PORT:-8080}"
HTTPS_PORT="${HTTPS_PORT:-8443}"

NET=app-net

echo "▶ Sieć"
podman network exists "$NET" || podman network create "$NET"

echo "▶ Wolumen bazy danych"
podman volume exists pgdata || podman volume create pgdata

echo "▶ db-pod (PostgreSQL, alias: db)"
podman pod exists db-pod || podman pod create --name db-pod --network "${NET}:alias=db"
podman container exists postgres || podman run -d --pod db-pod --name postgres --restart=always \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  -v pgdata:/var/lib/postgresql/data:Z \
  -v "$PWD/db/init:/docker-entrypoint-initdb.d:ro,Z" \
  docker.io/library/postgres:16-alpine

echo "▶ Budowa obrazu aplikacji"
podman build -t tracker-app -f Containerfile .

echo "▶ app-pod (React + API, alias: app)"
podman pod exists app-pod || podman pod create --name app-pod --network "${NET}:alias=app"
podman container exists tracker-app || podman run -d --pod app-pod --name tracker-app --restart=always \
  -e DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}" \
  tracker-app

echo "▶ Certyfikat TLS (self-signed, bez domeny publicznej)"
if [[ ! -f certs/fullchain.pem || ! -f certs/privkey.pem ]]; then
  ./scripts/gen-self-signed-cert.sh
else
  echo "  już istnieje, pomijam (uruchom ./scripts/gen-self-signed-cert.sh ręcznie, by wymienić)"
fi

echo "▶ nginx-pod (HTTPS, alias: web)"
podman pod exists nginx-pod || podman pod create --name nginx-pod \
  --network "${NET}:alias=web" -p "${HTTP_PORT}:80" -p "${HTTPS_PORT}:443"
podman container exists nginx || podman run -d --pod nginx-pod --name nginx --restart=always \
  -e HOST="$HOST" \
  -e HTTPS_PORT="$HTTPS_PORT" \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v "$PWD/certs:/etc/nginx/certs:ro,Z" \
  docker.io/library/nginx:alpine

echo "✅ Gotowe: https://$HOST:$HTTPS_PORT"
echo "   Certyfikat jest self-signed — przeglądarka pokaże ostrzeżenie,"
echo "   patrz tracker.md, sekcja o zaufaniu certyfikatowi."
