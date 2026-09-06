#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

NET=app-net
PODS=(nginx-pod app-pod db-pod)
CONTAINERS=(nginx tracker-app postgres)

PURGE=0
case "${1:-}" in
  "")       PURGE=0 ;;
  --purge)  PURGE=1 ;;
  *)
    cat >&2 <<EOF
Użycie: $0 [--purge]

  (bez opcji)  usuwa kontenery, pody i sieć app-net
               — wolumen pgdata, obraz i certs/ zostają nietknięte,
                 więc ./scripts/deploy.sh odtworzy wdrożenie z danymi
  --purge      dodatkowo usuwa wolumen pgdata (BEZPOWROTNA utrata danych),
               obraz tracker-app oraz katalog certs/
EOF
    exit 1 ;;
esac

# Pytamy przed czymkolwiek — odmowa nie może zostawić rozebranego wdrożenia.
if [[ $PURGE -eq 1 ]]; then
  echo "⚠  --purge usunie TRWALE:"
  echo "   • wolumen pgdata — całą bazę Trackera (nawyki, kalorie, pomiary)"
  echo "   • obraz tracker-app"
  echo "   • katalog certs/ — klienci będą musieli zaufać nowemu certyfikatowi"
  echo "   (oraz, jak zawsze, kontenery, pody i sieć app-net)"
  read -r -p "Wpisz 'tak', aby potwierdzić: " answer
  if [[ "$answer" != "tak" ]]; then
    echo "Przerwano — nic nie zostało usunięte."
    exit 0
  fi
  echo
fi

echo "▶ Pody i kontenery"
for pod in "${PODS[@]}"; do
  if podman pod exists "$pod"; then
    podman pod rm -f "$pod" >/dev/null
    echo "  usunięto pod $pod (wraz z kontenerami)"
  fi
done

# gdyby kontenery zostały uruchomione poza podami
for c in "${CONTAINERS[@]}"; do
  if podman container exists "$c"; then
    podman rm -f "$c" >/dev/null
    echo "  usunięto kontener $c"
  fi
done

echo "▶ Sieć"
if podman network exists "$NET"; then
  podman network rm "$NET" >/dev/null
  echo "  usunięto sieć $NET"
fi

if [[ $PURGE -eq 1 ]]; then
  echo "▶ Wolumen, obraz, certyfikat"
  if podman volume exists pgdata; then
    podman volume rm pgdata >/dev/null
    echo "  usunięto wolumen pgdata"
  fi
  if podman image exists tracker-app; then
    podman rmi tracker-app >/dev/null
    echo "  usunięto obraz tracker-app"
  fi
  if [[ -d certs ]]; then
    rm -rf certs
    echo "  usunięto katalog certs/"
  fi
fi

echo
echo "✅ Sprzątanie zakończone. Ponowne wdrożenie: ./scripts/deploy.sh"
