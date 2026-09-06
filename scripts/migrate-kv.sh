#!/usr/bin/env bash
# Przenosi dane ze starego kv_store do tabel, przypisując je do wskazanego konta.
# Stary rekord zostaje nietknięty — kv_store kasujemy dopiero po tym, jak
# aplikacja przejdzie na nowe tabele i potwierdzisz, że wszystko się zgadza.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

LOGIN="${1:-}"
if [[ -z "$LOGIN" ]]; then
  echo "Użycie: $0 <login>" >&2
  exit 1
fi

UID_TARGET=$(podman exec -i postgres psql -tAq -U "$DB_USER" -d "$DB_NAME" -v login="$LOGIN" <<'SQL'
SELECT id FROM users WHERE lower(login) = lower(:'login');
SQL
)
if [[ -z "$UID_TARGET" ]]; then
  echo "❌ Nie ma konta '$LOGIN'. Załóż je: ./scripts/create-user.sh $LOGIN" >&2
  exit 1
fi

echo "▶ Przenoszenie danych do konta '$LOGIN' (id: $UID_TARGET)"
podman exec -i postgres psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB_NAME" \
  -v uid="$UID_TARGET" < db/migrate_kv.sql

echo "✅ Gotowe. Co trafiło do tabel:"
podman exec -i postgres psql -U "$DB_USER" -d "$DB_NAME" -v uid="$UID_TARGET" <<'SQL'
SELECT 'nawyki'          AS tabela, count(*) FROM habits       WHERE user_id = :uid
UNION ALL SELECT 'odhaczenia',      count(*) FROM habit_logs l JOIN habits h ON h.id = l.habit_id WHERE h.user_id = :uid
UNION ALL SELECT 'profil',          count(*) FROM profiles     WHERE user_id = :uid
UNION ALL SELECT 'własne produkty', count(*) FROM foods        WHERE user_id = :uid
UNION ALL SELECT 'wpisy posiłków',  count(*) FROM meal_entries WHERE user_id = :uid
UNION ALL SELECT 'kotwice',         count(*) FROM anchors      WHERE user_id = :uid;
SQL
