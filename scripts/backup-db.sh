#!/usr/bin/env bash
# Zrzut bazy do katalogu backups/, z retencją. Do uruchamiania ręcznie i z crona.
#
# Zrzut leci przez `pg_dump` W KONTENERZE, nie z hosta: host nie ma klienta
# Postgresa, a kontener ma zawsze wersję zgodną z serwerem.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

# Cron nie dostaje tego, co daje sesja SSH: bez XDG_RUNTIME_DIR rootless Podman
# nie znajdzie swojego gniazda. Katalog /run/user/<uid> żyje między sesjami
# dzięki `loginctl enable-linger`.
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export PATH="/usr/bin:/usr/local/bin:$PATH"

DIR="${BACKUP_DIR:-backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
mkdir -p "$DIR"

OUT="$DIR/tracker-$(date +%Y%m%d-%H%M%S).sql.gz"
TMP="$OUT.part"
# Niedokończony zrzut nie ma zostać na dysku i udawać kopii.
trap 'rm -f "$TMP"' EXIT

# --clean --if-exists: zrzut da się wgrać na bazę, w której już coś stoi.
podman exec postgres pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$TMP"

gzip -t "$TMP"                                  # zepsute archiwum ma polec tutaj
SIZE=$(stat -c%s "$TMP")
if (( SIZE < 1024 )); then
  echo "❌ Zrzut ma $SIZE bajtów — to nie jest kopia bazy." >&2
  exit 1
fi
mv "$TMP" "$OUT"
trap - EXIT

# Retencja liczona wiekiem pliku, nie ich liczbą: dzienny cron daje wtedy
# dokładnie tyle kopii, ile dni wstecz chcemy móc odtworzyć.
find "$DIR" -maxdepth 1 -name 'tracker-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete \
  | sed 's/^/  usunięto stare: /'

echo "✅ $(date '+%Y-%m-%d %H:%M:%S')  $OUT  ($(numfmt --to=iec "$SIZE"))"
echo "   kopii w $DIR: $(find "$DIR" -maxdepth 1 -name 'tracker-*.sql.gz' | wc -l), retencja ${KEEP_DAYS} dni"
