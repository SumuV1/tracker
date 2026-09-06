# Tracker — wdrożenie na Podman

Trzy pody w jednej sieci Podmana `app-net`:

```
                Internet
                   │  :80 / :443
          ┌────────▼─────────┐
          │    nginx-pod      │   nginx (TLS, reverse proxy) + certbot
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
├── db/
│   └── init.sql
├── nginx/
│   ├── bootstrap.conf.template   # HTTP-only, do wydania certyfikatu
│   └── default.conf.template     # docelowy HTTPS + proxy
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
    ├── issue-cert.sh
    └── enable-tls.sh
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

## 5. nginx + certbot (`nginx-pod`)

Wykorzystujemy szablony oficjalnego obrazu nginx: pliki w `/etc/nginx/templates/*.template`
są przetwarzane przez `envsubst` przy starcie (podmienia tylko zmienne z ENV, np. `${DOMAIN}`).

### `nginx/bootstrap.conf.template`  (tylko HTTP — do wydania certyfikatu)
```nginx
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    location / {
        add_header Content-Type text/plain;
        return 200 'Oczekiwanie na certyfikat TLS...';
    }
}
```

### `nginx/default.conf.template`  (docelowy HTTPS + proxy do app)
```nginx
server {
    listen 80;
    server_name ${DOMAIN};

    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name ${DOMAIN};

    ssl_certificate     /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

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
DOMAIN=twoja-domena.pl
EMAIL=admin@twoja-domena.pl

DB_USER=tracker
DB_PASSWORD=zmien_to_na_silne_haslo
DB_NAME=tracker
```

---

## 7. Skrypty wdrożeniowe

### `scripts/deploy.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

NET=app-net

echo "▶ Sieć"
podman network exists "$NET" || podman network create "$NET"

echo "▶ Wolumeny"
for v in pgdata certs certbot-www; do
  podman volume exists "$v" || podman volume create "$v"
done

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

echo "▶ nginx-pod (bootstrap HTTP, alias: web)"
podman pod exists nginx-pod || podman pod create --name nginx-pod \
  --network "${NET}:alias=web" -p 80:80 -p 443:443
podman container exists nginx || podman run -d --pod nginx-pod --name nginx --restart=always \
  -e DOMAIN="$DOMAIN" \
  -v "$PWD/nginx/bootstrap.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  docker.io/library/nginx:alpine

echo "✅ Gotowe. Teraz: ./scripts/issue-cert.sh, potem ./scripts/enable-tls.sh"
```

### `scripts/issue-cert.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

podman run --rm \
  -v certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  docker.io/certbot/certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --no-eff-email --non-interactive

echo "✅ Certyfikat wydany dla $DOMAIN"
```

### `scripts/enable-tls.sh`  (przełącza nginx na konfigurację HTTPS)
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a

podman rm -f nginx
podman run -d --pod nginx-pod --name nginx --restart=always \
  -e DOMAIN="$DOMAIN" \
  -v "$PWD/nginx/default.conf.template:/etc/nginx/templates/default.conf.template:ro,Z" \
  -v certs:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  docker.io/library/nginx:alpine

echo "✅ HTTPS aktywne na https://$DOMAIN"
```

Nadaj uprawnienia: `chmod +x scripts/*.sh`

---

## 8. Uruchomienie — kolejność

```bash
cp .env.example .env      # i uzupełnij domenę, e-mail, hasło DB
./scripts/deploy.sh       # sieć + 3 pody (nginx w trybie HTTP)
./scripts/issue-cert.sh   # Let's Encrypt przez webroot (domena musi wskazywać na serwer, port 80 otwarty)
./scripts/enable-tls.sh   # przełączenie nginx na HTTPS
```

Sprawdzenie:
```bash
podman pod ps
podman ps --all
curl -k https://$DOMAIN/api/health     # → {"ok":true}
```

---

## 9. Odnawianie certyfikatu (systemd timer)

`~/.config/systemd/user/certbot-renew.service`
```ini
[Unit]
Description=Odnawianie certyfikatu Let's Encrypt

[Service]
Type=oneshot
ExecStart=/usr/bin/podman run --rm -v certs:/etc/letsencrypt -v certbot-www:/var/www/certbot docker.io/certbot/certbot renew
ExecStartPost=/usr/bin/podman exec nginx nginx -s reload
```

`~/.config/systemd/user/certbot-renew.timer`
```ini
[Unit]
Description=Codzienne sprawdzanie odnowienia certyfikatu

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl --user enable --now certbot-renew.timer
loginctl enable-linger "$USER"   # aby timer działał bez zalogowanej sesji
```

---

## Uwagi

- **Wymagany Podman 4.4+** (składnia `--network nazwa:alias=...` i DNS w sieciach netavark).
- **Jedna sieć `app-net`** łączy wszystkie trzy pody; usługi znajdują się wzajemnie po aliasach
  `db`, `app`, `web` (DNS Podmana).
- **Trwałość danych**: wolumen `pgdata` (baza) oraz `certs` (certyfikaty) przetrwają restart.
- **Jeden użytkownik / bez logowania** — tak jak oryginalny artefakt. Dane są wspólne dla całej instancji;
  dodanie kont i uwierzytelniania to osobny krok.
- **Automatyczny start po reboocie**: `--restart=always` + `podman generate systemd` lub Quadlet,
  jeśli chcesz zarządzać podami przez systemd.
```
