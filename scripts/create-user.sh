#!/usr/bin/env bash
# Zakłada konto. Rejestracja w aplikacji jest zamknięta — to jedyna droga.
#
# Hasło hashujemy scryptem z wbudowanego modułu crypto Node'a: żadnej dodatkowej
# zależności, a scrypt jest odporny na ataki sprzętowe (parametr N wymusza pamięć).
# Format: scrypt$N$r$p$salt_b64$hash_b64 — serwer musi go odczytać tak samo.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

LOGIN="${1:-}"
if [[ -z "$LOGIN" ]]; then
  echo "Użycie: $0 <login>" >&2
  exit 1
fi

read -rsp "Hasło dla '$LOGIN': " PASS; echo
read -rsp "Powtórz hasło: " PASS2; echo
if [[ "$PASS" != "$PASS2" ]]; then
  echo "❌ Hasła się różnią." >&2
  exit 1
fi
if [[ ${#PASS} -lt 8 ]]; then
  echo "❌ Hasło musi mieć co najmniej 8 znaków." >&2
  exit 1
fi

HASH=$(PASS="$PASS" node -e '
const crypto = require("crypto");
const N = 16384, r = 8, p = 1, keylen = 32;
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(process.env.PASS, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 });
process.stdout.write(`scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`);
')

podman exec -i postgres psql -v ON_ERROR_STOP=1 -q -U "$DB_USER" -d "$DB_NAME" \
  -v login="$LOGIN" -v hash="$HASH" <<'SQL'
INSERT INTO users (login, password_hash) VALUES (:'login', :'hash');
SQL

UID_NEW=$(podman exec -i postgres psql -tAq -U "$DB_USER" -d "$DB_NAME" -v login="$LOGIN" <<'SQL'
SELECT id FROM users WHERE lower(login) = lower(:'login');
SQL
)
echo "✅ Konto '$LOGIN' utworzone (id: $UID_NEW)"
echo "   Przeniesienie dotychczasowych danych: ./scripts/migrate-kv.sh $LOGIN"
