#!/usr/bin/env bash
# Zakłada schemat na DZIAŁAJĄCEJ bazie. Świeże wdrożenie dostaje go automatycznie
# (Postgres wykonuje db/init/* przy inicjalizacji pustego wolumenu) — ten skrypt
# jest dla baz, które powstały wcześniej. Pliki są idempotentne.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

for f in db/init/*.sql; do
  echo "▶ $f"
  podman exec -i postgres psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB_NAME" < "$f"
done

echo "✅ Schemat gotowy"
podman exec postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
