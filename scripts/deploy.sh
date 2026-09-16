#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

# Rootless Podman nie zbinduje portów <1024 — stąd domyślne 8080/8443.
HTTP_PORT="${HTTP_PORT:-8080}"
HTTPS_PORT="${HTTPS_PORT:-8443}"
# Adres, na którym publikowane są porty. Domyślnie pętla zwrotna: aplikacja jest
# wtedy nieosiągalna z sieci NIEZALEŻNIE od reguł zapory, a wystawia ją Tailscale
# (`tailscale serve`), który łączy się po localhost. Ustaw 0.0.0.0, żeby wrócić
# do dostępu wprost z sieci.
BIND_ADDR="${BIND_ADDR:-127.0.0.1}"

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

# Kontener trzeba wymienić, gdy build dał nowy obraz — inaczej `deploy.sh`
# kończy się słowem „Gotowe", a w sieci dalej stoi poprzednia wersja. Porównanie
# identyfikatorów obrazu zamiast bezwarunkowego `rm -f` sprawia, że wdrożenie bez
# zmian w kodzie nie zrywa działającej aplikacji.
NEW_IMAGE=$(podman image inspect -f '{{.Id}}' tracker-app)
CUR_IMAGE=$(podman container inspect -f '{{.Image}}' tracker-app 2>/dev/null || true)
if [[ -n "$CUR_IMAGE" && "$CUR_IMAGE" != "$NEW_IMAGE" ]]; then
  echo "  nowy obraz — wymieniam kontener"
  podman rm -f tracker-app >/dev/null
  CUR_IMAGE=""
fi
if [[ -z "$CUR_IMAGE" ]]; then
  podman run -d --pod app-pod --name tracker-app --restart=always \
    -e DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}" \
    tracker-app >/dev/null
else
  echo "  obraz bez zmian — kontener zostaje"
fi

echo "▶ Certyfikat TLS (self-signed, bez domeny publicznej)"
if [[ ! -f certs/fullchain.pem || ! -f certs/privkey.pem ]]; then
  ./scripts/gen-self-signed-cert.sh
else
  echo "  już istnieje, pomijam (uruchom ./scripts/gen-self-signed-cert.sh ręcznie, by wymienić)"
fi

echo "▶ nginx-pod (HTTPS, alias: web)"
# Przy pętli zwrotnej publikujemy też ::1 — `localhost` bywa rozwiązywane
# najpierw na adres IPv6 i cel `tailscale serve` trafiłby w próżnię.
PUBLISH=(-p "${BIND_ADDR}:${HTTP_PORT}:80" -p "${BIND_ADDR}:${HTTPS_PORT}:443")
if [[ "$BIND_ADDR" == "127.0.0.1" ]]; then
  PUBLISH+=(-p "[::1]:${HTTP_PORT}:80" -p "[::1]:${HTTPS_PORT}:443")
fi
podman pod exists nginx-pod || podman pod create --name nginx-pod \
  --network "${NET}:alias=web" "${PUBLISH[@]}"
podman container exists nginx || podman run -d --pod nginx-pod --name nginx --restart=always \
  -e HOST="$HOST" \
  -e HTTPS_PORT="$HTTPS_PORT" \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v "$PWD/certs:/etc/nginx/certs:ro,Z" \
  docker.io/library/nginx:alpine

echo "▶ Uruchomienie zatrzymanych kontenerów"
# Po restarcie serwera kontenery istnieją, ale mogą leżeć (np. gdy
# `podman-restart` przerwał start na pierwszym błędzie). Wszystkie kroki wyżej
# pomijają istniejące kontenery, więc bez tego „Gotowe" mówiłoby nieprawdę.
# `podman start` na działającym kontenerze nic nie robi.
podman start postgres tracker-app nginx >/dev/null

echo "▶ Sprawdzenie"
for _ in $(seq 1 30); do
  if curl -sk -o /dev/null -w '%{http_code}' "https://localhost:${HTTPS_PORT}/api/nope" 2>/dev/null | grep -q 404; then
    echo "  API odpowiada"; break
  fi
  sleep 1
done
podman ps -a --filter name='^(postgres|tracker-app|nginx)$' --format '  {{.Names}}\t{{.Status}}'

if [[ "$BIND_ADDR" == "0.0.0.0" ]]; then
  echo "✅ Gotowe: https://$HOST:$HTTPS_PORT"
else
  echo "✅ Gotowe. Porty słuchają tylko na $BIND_ADDR — wejście przez Tailscale:"
  command -v tailscale >/dev/null && tailscale serve status 2>/dev/null | head -2 \
    || echo "   (skonfiguruj: tailscale serve --bg https+insecure://localhost:${HTTPS_PORT})"
  # Przy wejściu przez Tailscale certyfikat self-signed nie dociera do
  # przeglądarki — obsługuje tylko odcinek tailscaled → nginx po pętli zwrotnej.
  echo "   Certyfikat widziany przez przeglądarkę wystawia Tailscale (Let's Encrypt)."
fi
if [[ "$BIND_ADDR" == "0.0.0.0" ]]; then
  echo "   Certyfikat jest self-signed — przeglądarka pokaże ostrzeżenie,"
  echo "   patrz tracker.md, sekcja o zaufaniu certyfikatowi."
fi
