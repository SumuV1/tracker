# Tracker — wdrożenie na Podman

Trzy pody w jednej sieci Podmana `app-net`. **Nie jest wymagana żadna publiczna
domena** — aplikacja jest dostępna po HTTPS pod nazwą DNS (lub adresem IP)
Twojego hosta w sieci lokalnej/firmowej, z certyfikatem TLS wygenerowanym
samodzielnie (self-signed), bez Let's Encrypt/certbot i bez otwierania portu 80
na świat:

```
           Sieć lokalna / firmowa
                   │  :80 / :443
          ┌────────▼─────────┐
          │    nginx-pod      │   nginx (TLS self-signed, reverse proxy)
          │  alias: web       │
          └────────┬─────────┘
                   │  http://app:3000   (sieć app-net)
          ┌────────▼─────────┐
          │     app-pod       │   React (zbudowany) + API Node/Express
          │  alias: app       │
          └────────┬─────────┘
                   │  postgres://db:5432 (sieć app-net)
          ┌────────▼─────────┐
          │     db-pod        │   PostgreSQL 16
          │  alias: db        │
          └──────────────────┘
```

Przeglądarka nie łączy się bezpośrednio z Postgresem, więc pod `app` zawiera cienkie API,
które udostępnia takie samo interfejs klucz–wartość jak `window.storage` z Claude.ai.
Dzięki temu Twój komponent React działa **bez zmian**.

---

## Struktura projektu

```
tracker/
├── Containerfile              # build React + serwer Node w jednym obrazie
├── .env.example
├── certs/                     # wygenerowane lokalnie, NIE w repo (.gitignore)
│   ├── fullchain.pem
│   └── privkey.pem
├── db/
│   └── init.sql
├── nginx/
│   └── default.conf.template     # HTTPS (self-signed) + proxy do app
├── server/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── storage.js         # shim: window.storage → API
│       └── App.jsx            # ⟵ TWÓJ istniejący komponent, bez zmian
└── scripts/
    ├── deploy.sh
    └── gen-self-signed-cert.sh
```

---

## 1. Frontend (Vite + React)

### `frontend/package.json`
```json
{
  "name": "tracker-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.0"
  }
}
```

### `frontend/vite.config.js`
```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // podczas `npm run dev` przekierowuje /api na lokalny serwer
  server: { proxy: { "/api": "http://localhost:3000" } },
});
```

### `frontend/index.html`
```html
<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### `frontend/src/storage.js`  ← kluczowa zmiana
```js
// Zastępuje window.storage z Claude.ai wywołaniami do własnego API.
// Zachowuje identyczny interfejs: get / set / delete / list.
const API = "/api/kv";

window.storage = {
  async get(key) {
    const r = await fetch(`${API}/${encodeURIComponent(key)}`);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("storage.get failed");
    return r.json(); // { key, value }
  },
  async set(key, value) {
    const r = await fetch(API, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!r.ok) throw new Error("storage.set failed");
    return r.json(); // { key, value }
  },
  async delete(key) {
    const r = await fetch(`${API}/${encodeURIComponent(key)}`, { method: "DELETE" });
    return r.json(); // { key, deleted }
  },
  async list(prefix = "") {
    const r = await fetch(`${API}?prefix=${encodeURIComponent(prefix)}`);
    return r.json(); // { keys: [...] }
  },
};
```

### `frontend/src/main.jsx`
```js
import "./storage.js"; // WAŻNE: przed App, aby window.storage istniało
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

### `frontend/src/App.jsx`
Wklej tutaj **swój obecny komponent** (ten z zakładkami Nawyki / Kalorie & BMI / Mięśnie / Z dołka) —
działa bez modyfikacji, bo używa `window.storage`, które dostarcza `storage.js`.

> Uwaga: zakładka „🌍 Wyszukaj online" korzystała z API Claude (`api.anthropic.com`) i **nie zadziała**
> w samodzielnym wdrożeniu. Zostaw ją wyłączoną lub podepnij własne API wartości odżywczych.

---

## 2. Serwer API + serwowanie frontendu (`app-pod`)

### `server/package.json`
```json
{
  "name": "tracker-server",
  "private": true,
  "type": "module",
  "scripts": { "start": "node server.js" },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.12.0"
  }
}
```

### `server/server.js`
```js
import express from "express";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "6mb" }));

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function initDb(retries = 15) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS kv_store (
          key        text PRIMARY KEY,
          value      text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`);
      console.log("DB gotowa");
      return;
    } catch (e) {
      console.log("DB niedostępna, ponawiam...", e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("Nie udało się połączyć z bazą");
}

// --- API klucz–wartość (odpowiednik window.storage) ---
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.get("/api/kv", async (req, res) => {
  const prefix = req.query.prefix || "";
  const { rows } = await pool.query(
    "SELECT key FROM kv_store WHERE key LIKE $1 ORDER BY key",
    [prefix + "%"]
  );
  res.json({ keys: rows.map((r) => r.key) });
});

app.get("/api/kv/:key", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT key, value FROM kv_store WHERE key = $1",
    [req.params.key]
  );
  if (!rows.length) return res.status(404).json({ error: "not found" });
  res.json(rows[0]);
});

app.put("/api/kv", async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: "key required" });
  await pool.query(
    `INSERT INTO kv_store (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, String(value ?? "")]
  );
  res.json({ key, value });
});

app.delete("/api/kv/:key", async (req, res) => {
  await pool.query("DELETE FROM kv_store WHERE key = $1", [req.params.key]);
  res.json({ key: req.params.key, deleted: true });
});

// --- serwowanie zbudowanego frontendu (SPA) ---
app.use(express.static(path.join(__dirname, "public")));
app.get("*", (_req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

const PORT = process.env.PORT || 3000;
initDb().then(() => app.listen(PORT, () => console.log("API na :" + PORT)));
```

---

## 3. Baza danych (`db-pod`)

### `db/init.sql`
```sql
CREATE TABLE IF NOT EXISTS kv_store (
  key        text PRIMARY KEY,
  value      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 4. Obraz aplikacji

### `Containerfile`
```dockerfile
# ---- etap 1: build frontendu ----
FROM docker.io/library/node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build            # → /app/dist

# ---- etap 2: serwer Node ----
FROM docker.io/library/node:20-alpine
WORKDIR /srv
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=build /app/dist ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 5. nginx (`nginx-pod`)

Wykorzystujemy szablony oficjalnego obrazu nginx: pliki w `/etc/nginx/templates/*.template`
są przetwarzane przez `envsubst` przy starcie (podmienia tylko zmienne z ENV, np. `${HOST}`).
Certyfikat TLS jest generowany lokalnie (self-signed) — patrz sekcja 7 — więc nie ma
fazy „bootstrap HTTP" ani wyzwania ACME: nginx od razu startuje z HTTPS.

### `nginx/default.conf.template`  (HTTPS self-signed + proxy do app)
```nginx
server {
    listen 80;
    server_name ${HOST};
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name ${HOST};

    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    location / {
        proxy_pass http://app:3000;      # alias podu app w sieci app-net
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Konfiguracja

### `.env.example`  → skopiuj do `.env` i uzupełnij
```bash
# Nazwa DNS hosta w Twojej sieci (lub adres IP) — sprawdź: hostname -f
HOST=host.example.lan

DB_USER=tracker
DB_PASSWORD=zmien_to_na_silne_haslo
DB_NAME=tracker
```

`HOST` **nie musi być domeną publiczną**. Wystarczy:
- wpis w lokalnym/firmowym serwerze DNS wskazujący na ten host, albo
- wpis w pliku `hosts` na maszynach klienckich (`C:\Windows\System32\drivers\etc\hosts`
  / `/etc/hosts`), albo
- po prostu adres IP hosta, jeśli DNS nie jest dostępny.

---

## 7. Skrypty wdrożeniowe

### `scripts/gen-self-signed-cert.sh`  (generuje certyfikat TLS bez CA/domeny)
```bash
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
```

Certyfikat trzyma się w bind-mouncie `certs/` (nie w wolumenie Podmana), żeby był
łatwo dostępny do zaimportowania na maszyny klienckie — patrz sekcja 9.
Katalog jest w `.gitignore`, klucz prywatny nigdy nie trafia do repo.

### `scripts/deploy.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

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
  -v "$PWD/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro,Z" \
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
  --network "${NET}:alias=web" -p 80:80 -p 443:443
podman container exists nginx || podman run -d --pod nginx-pod --name nginx --restart=always \
  -e HOST="$HOST" \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v "$PWD/certs:/etc/nginx/certs:ro,Z" \
  docker.io/library/nginx:alpine

echo "✅ Gotowe: https://$HOST"
echo "   Certyfikat jest self-signed — przeglądarka pokaże ostrzeżenie,"
echo "   patrz tracker.md, sekcja o zaufaniu certyfikatowi."
```

Nadaj uprawnienia: `chmod +x scripts/*.sh`

---

## 8. Uruchomienie — kolejność

```bash
cp .env.example .env      # uzupełnij HOST (nazwa DNS lub IP hosta) i hasło DB
./scripts/deploy.sh       # sieć + wolumeny + certyfikat self-signed + 3 pody, od razu HTTPS
```

Sprawdzenie:
```bash
podman pod ps
podman ps --all
curl -k https://$HOST/api/health     # -k: pomija weryfikację self-signed CA, → {"ok":true}
```

---

## 9. Zaufanie certyfikatowi i jego wymiana

Certyfikat jest self-signed, więc przeglądarka przy pierwszym wejściu pokaże
ostrzeżenie „Połączenie nie jest prywatne" / `NET::ERR_CERT_AUTHORITY_INVALID`.
Do wyboru:

- **Zaakceptować ostrzeżenie ręcznie** (najszybsze, wystarczające do użytku
  jednoosobowego/testowego) — „Zaawansowane" → „Przejdź do (niebezpieczne)".
- **Zaimportować `certs/fullchain.pem` jako zaufany certyfikat** na urządzeniach,
  z których korzystasz — wtedy przeglądarka nie pokazuje już ostrzeżenia:
  - Linux: `sudo cp certs/fullchain.pem /etc/pki/ca-trust/source/anchors/tracker.pem && sudo update-ca-trust`
  - Windows: zaimportuj plik do „Zaufane główne urzędy certyfikacji" (certmgr.msc)
  - macOS: Pęk kluczy → import → ustaw zaufanie „Zawsze ufaj"

Certyfikat generowany jest na 10 lat, więc **nie jest potrzebny automatyczny
mechanizm odnawiania** (nie ma tu certbota ani ACME). Jeśli mimo to chcesz go
wymienić (np. zmienił się `HOST`, albo chcesz krótszy okres ważności z powodów
bezpieczeństwa):

```bash
./scripts/gen-self-signed-cert.sh   # nadpisuje certs/fullchain.pem i privkey.pem
podman restart nginx
```

Jeśli chcesz mieć to zautomatyzowane mimo długiej ważności (np. coroczna
rotacja), możesz dodać systemd timer analogiczny do poniższego:

`~/.config/systemd/user/cert-renew.service`
```ini
[Unit]
Description=Wymiana self-signed certyfikatu TLS

[Service]
Type=oneshot
WorkingDirectory=%h/tracker
ExecStart=%h/tracker/scripts/gen-self-signed-cert.sh
ExecStartPost=/usr/bin/podman restart nginx
```

`~/.config/systemd/user/cert-renew.timer`
```ini
[Unit]
Description=Coroczna wymiana certyfikatu TLS

[Timer]
OnCalendar=yearly
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl --user enable --now cert-renew.timer
loginctl enable-linger "$USER"   # aby timer działał bez zalogowanej sesji
```

---

## Uwagi

- **Wymagany Podman 4.4+** (składnia `--network nazwa:alias=...` i DNS w sieciach netavark).
- **Bez publicznej domeny**: `HOST` to dowolna nazwa DNS w Twojej sieci lokalnej/firmowej
  (albo IP hosta) — nie trzeba niczego kupować ani wystawiać portu 80 na świat.
  Certyfikat TLS jest self-signed, ważny 10 lat, generowany lokalnie przez
  `openssl` (wymaga zainstalowanego pakietu `openssl` na hoście uruchamiającym skrypty).
- **Jedna sieć `app-net`** łączy wszystkie trzy pody; usługi znajdują się wzajemnie po aliasach
  `db`, `app`, `web` (DNS Podmana).
- **Trwałość danych**: wolumen `pgdata` (baza) przetrwa restart. Certyfikat leży w `certs/`
  na hoście (bind-mount), poza wolumenami Podmana — łatwiej go stąd zaimportować na klienty.
- **Jeden użytkownik / bez logowania** — tak jak oryginalny artefakt. Dane są wspólne dla całej instancji;
  dodanie kont i uwierzytelniania to osobny krok.
- **Automatyczny start po reboocie**: `--restart=always` + `podman generate systemd` lub Quadlet,
  jeśli chcesz zarządzać podami przez systemd.
```
