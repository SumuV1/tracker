#!/usr/bin/env bash
# Odtworzenie bazy ze zrzutu. UWAGA: nadpisuje bieżące dane.
#
# Domyślnie wgrywa do bazy produkcyjnej. Z opcją --into <nazwa> wgrywa do
# nowej, osobnej bazy — tak sprawdza się, czy kopia w ogóle się rozpakowuje,
# nie ruszając tego, co działa.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

FILE="${1:-}"
TARGET="$DB_NAME"
if [[ "${2:-}" == "--into" && -n "${3:-}" ]]; then TARGET="$3"; fi

if [[ -z "$FILE" || ! -f "$FILE" ]]; then
  echo "Użycie: $0 <plik.sql.gz> [--into <nowa_baza>]" >&2
  echo "Dostępne kopie:" >&2
  ls -1t backups/tracker-*.sql.gz 2>/dev/null | head -10 >&2 || echo "  (brak)" >&2
  exit 1
fi

gzip -t "$FILE"

if [[ "$TARGET" == "$DB_NAME" ]]; then
  echo "⚠️  To NADPISZE bazę '$DB_NAME' zawartością $FILE."
  echo "    Wszystko, co jest w niej teraz, przepadnie."
  read -rp "Wpisz ODTWARZAM, żeby kontynuować: " ACK
  [[ "$ACK" == "ODTWARZAM" ]] || { echo "Przerwane."; exit 1; }
else
  echo "▶ Baza kontrolna: $TARGET (produkcyjna '$DB_NAME' zostaje nietknięta)"
  podman exec postgres psql -q -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$TARGET\";"
  podman exec postgres psql -q -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$TARGET\";"
fi

gunzip -c "$FILE" | podman exec -i postgres psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$TARGET"

echo "✅ Odtworzono do bazy '$TARGET'. Zawartość:"
podman exec postgres psql -U "$DB_USER" -d "$TARGET" -c "
  SELECT relname AS tabela, n_live_tup AS wiersze
    FROM pg_stat_user_tables ORDER BY relname;"
