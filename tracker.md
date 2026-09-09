# Tracker — wdrożenie na Podman

Trzy pody w jednej sieci Podmana `app-net`. **Nie jest wymagana żadna publiczna
domena** — aplikacja jest dostępna po HTTPS pod nazwą DNS (lub adresem IP)
Twojego hosta w sieci lokalnej/firmowej, z certyfikatem TLS wygenerowanym
samodzielnie (self-signed), bez Let's Encrypt/certbot i bez otwierania portu 80
na świat:

```
           Sieć lokalna / firmowa
                   │  :8080 / :8443  (rootless Podman)
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

Przeglądarka nie łączy się bezpośrednio z Postgresem, więc pod `app` serwuje
zbudowany frontend i wystawia API nad tabelami — z logowaniem i danymi
rozdzielonymi per konto (patrz sekcje 2 i 3).

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
│   ├── init/                     # wykonywane przy tworzeniu pustej bazy
│   │   ├── 01_schema.sql
│   │   └── 02_seed_foods.sql     # generowany z FOOD_DB, nie edytować ręcznie
│   └── migrate_kv.sql            # przeniesienie danych ze starego kv_store
├── nginx/
│   └── default.conf.template     # HTTPS (self-signed) + proxy do app
├── server/
│   ├── package.json
│   ├── server.js                 # montowanie tras, SPA, obsługa błędów
│   ├── db.js                     # pula połączeń i parsery typów
│   ├── auth.js                   # scrypt, sesje, limiter logowania
│   ├── http.js                   # walidacja wejścia
│   └── routes/                   # habits, profile, foods, meals, anchors
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── api.js            # klient API (zastąpił shim window.storage)
│       ├── plans.js          # dane planów treningowych
│       └── App.jsx
└── scripts/
    ├── deploy.sh
    ├── teardown.sh              # odwrotność deploy.sh
    ├── db-init.sh               # schemat na już działającej bazie
    ├── create-user.sh           # zakłada konto (rejestracja jest zamknięta)
    ├── migrate-kv.sh            # kv_store → tabele, dla wskazanego konta
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

### `frontend/src/api.js`

Klient API. Zastąpił shim `window.storage` z czasów artefaktu Claude.ai — dane
nie są już jednym blobem JSON, tylko zwykłymi zasobami. Wszystkie żądania idą
z `credentials: "same-origin"`, żeby ciasteczko sesji dojechało do serwera,
a błędy wracają jako `ApiError` z kodem HTTP.

### `frontend/src/main.jsx`
```js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

### `frontend/src/App.jsx`

Cały interfejs w jednym komponencie. Warstwa danych trzyma się kilku zasad:

- **Logowanie jest bramką** — bez ważnej sesji renderuje się `LoginScreen`,
  reszta aplikacji w ogóle się nie montuje.
- **Odhaczenie nawyku jest optymistyczne**: stan zmienia się natychmiast,
  a błąd zapytania cofa go, dociągając odhaczenia z serwera.
- **Dziennik posiłków nie jest trzymany w całości** — wybrany dzień pobierany
  jest osobno, a mapa roku dostaje gotowe sumy dzienne policzone w SQL.
- **Ten sam produkt dopisany kilka razy jednego dnia jest sumowany dopiero
  przy wyświetlaniu.** W bazie zostają osobne wpisy, więc każdy da się nadal
  poprawić i skasować — grupa rozwija się w listę pojedynczych wpisów.
  Kluczem grupowania jest `foodId`, a dla produktów usuniętych z katalogu
  (`foodId` = `null`) sama nazwa.
- **Wzorów nie ma po stronie przeglądarki.** BMI, PPM i CPM przychodzą razem
  z profilem; komponent je wyłącznie wyświetla.

#### Zakładka nawyków

Nawyki nie są jedną listą, tylko czterema kaflami — po jednym na kategorię
(`CATEGORIES`), zajmującymi dwie trzecie szerokości. Kafel pokazuje w nagłówku
dzisiejsze odhaczenia w obrębie swojej kategorii. Nawyk z nieznaną kategorią
trafia do pierwszego kafla, tak samo jak `CAT_MAP` domyśla się dla niego koloru.

**Postęp przeniósł się z osobnej podzakładki do rozwinięcia pod nawykiem.**
Strzałka na dole karty odsłania te same trzy horyzonty (tydzień, miesiąc, rok)
w wariancie zwartym: `MonthView` i `YearView` przyjmują `compact`, które ścieśnia
odstępy i podpisy oraz zmniejsza kafelki miesięcy w widoku rocznym z 100 px do
52 px, żeby dwanaście miesięcy zmieściło się w kolumnie kategorii. Z tego samego
powodu `TimePicker` przyjmuje `stacked` — cztery kolumny godzin po 36 px nie
mieszczą się w karcie szerokiej na ~175 px, więc w kaflu schodzą do 30 px,
a przyciski lądują pod siatką zamiast obok niej.

Ostatnia trzecia część szerokości to **lista niewolnika**: rzeczy, od których
użytkownik trzyma się z daleka. To odwrotność nawyku, więc świadomie nie ma tam
odhaczania ani dziennika — tabela `avoid_items` trzyma samą nazwę, opcjonalne
uzasadnienie i kolejność.

#### Mapa mięśni

Sylwetka jest rysowana wyłącznie dla prawej połowy ciała, lewa powstaje przez
odbicie względem osi — symetria wynika więc z konstrukcji, nie z pilnowania
współrzędnych. Kształt mięśnia jest **jednocześnie grafiką i obszarem
klikalnym**; wcześniej były to dwie niezależne warstwy, które do siebie nie
pasowały, przez co klikało się obok tego, co widać.

Mięśnie mają przypisaną warstwę anatomiczną (`MUSCLE_LAYER`): 18 powierzchownych
i 6 głębokich. Przełącznik pokazuje jedną naraz — mięśnie spoza wybranej warstwy
zostają ledwie widocznym tłem i **nie reagują na kliknięcia**. To rozwiązuje
problem zasłaniania: zębaty przedni schowany pod piersiowym czy prostownik
grzbietu pod najszerszym są dostępne bez walki z tym, co leży na wierzchu.

#### Plany treningowe — `frontend/src/plans.js`

Plan to tydzień: każdy dzień ma partię, listę ćwiczeń i mięśnie, które
podświetlają się na sylwetce. Dane siedzą w osobnym module, bo są treścią,
a nie logiką — dopisanie kolejnego planu to dopisanie obiektu do
`TRAINING_PLANS`, bez dotykania komponentów.

Pola dnia poza listą ćwiczeń są opcjonalne i pokazują się tylko wtedy, gdy plan
je podaje: `warmup`, `intro`, `remark`, `loadNote`, `changes`. Tak samo
w ćwiczeniu — `load`, `rest` i znacznik `added`. Cardio opisujemy wariantami
(`cardio.variants`), bo jeden dzień potrafi mieć wersję ciągłą i interwałową
o różnych zakresach tętna. Plan może mieć własne `rules` — rozwijane zasady
wspólne nad paskiem dni.

Każdy dzień rozdziela mięśnie na dwie role:

| Rola | Znaczenie | Jak wygląda |
|---|---|---|
| `primary` | partia, pod którą ułożony jest dzień | pełny kolor, biały obrys, poświata |
| `support` | mięśnie wspomagające i stabilizujące w tych ćwiczeniach | kolor przygaszony, bez obrysu |

Identyfikatory muszą pokrywać się z kluczami `MUSCLES`. Partia dnia potrafi
leżeć w obu warstwach naraz (plecy: najszerszy jest powierzchowny, prostownik
grzbietu głęboki), więc mięśnie dnia **prześwitują też spod nieaktywnej
warstwy** — widać, że coś tam jest, a nad sylwetką pojawia się skrót do
przełączenia warstwy. Kliknięcie etykiety mięśnia w karcie dnia przełącza
warstwę samo.

Dzień cardio liczy zakres tętna ze wzoru Tanaki (`208 − 0,7 × wiek`), biorąc
wiek z profilu. Bez uzupełnionego profilu pokazuje sam wzór i odsyła do
zakładki „Kalorie & BMI".

Plany są **tylko do odczytu** — nic z nich nie trafia do bazy. Postępu
treningowego świadomie nie zapisujemy, dopóki nie wiadomo, w jakiej formie
miałby być prowadzony.

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

### Struktura serwera

```
server/
├── server.js          # montowanie tras, serwowanie SPA, obsługa błędów
├── db.js              # pula połączeń, parsery typów, czekanie na bazę
├── auth.js            # scrypt, sesje, limiter logowania, requireAuth
├── http.js            # walidacja wejścia i opakowanie handlerów async
└── routes/
    ├── habits.js  profile.js  foods.js  meals.js  anchors.js
```

### Trasy

Wszystko poza `/api/health` i `/api/auth/login` wymaga zalogowania. Każde
zapytanie filtruje po `user_id` z sesji — próba sięgnięcia po cudzy rekord
kończy się `404`, a nie `403`, żeby nie potwierdzać, że dany identyfikator
w ogóle istnieje.

| Metoda | Ścieżka | Działanie |
|---|---|---|
| POST | `/api/auth/login` | logowanie, ustawia ciasteczko sesji |
| POST | `/api/auth/logout` | kasuje bieżącą sesję (pozostałe zostają) |
| GET | `/api/auth/me` | kim jestem |
| GET/POST | `/api/habits` | lista / dodanie nawyku |
| PATCH/DELETE | `/api/habits/:id` | zmiana / usunięcie |
| GET | `/api/habits/logs?from=&to=` | odhaczenia w zakresie dat |
| PUT/DELETE | `/api/habits/:id/logs/:day` | odhaczenie / cofnięcie |
| GET/PUT | `/api/profile` | profil wraz z BMI, PPM i CPM |
| GET | `/api/foods?q=&category=` | katalog: wspólne + własne |
| GET | `/api/foods/categories` | kategorie z licznikami |
| POST/PATCH/DELETE | `/api/foods`, `/api/foods/:id` | własne produkty (poprawiać i kasować można wyłącznie swoje) |
| GET/POST | `/api/meals?day=` | dziennik dnia |
| GET | `/api/meals/daily-totals?year=` | sumy kalorii per dzień |
| PATCH | `/api/meals/:id` | zmiana gramatury wpisu (wartości odżywcze skalują się proporcjonalnie) |
| DELETE | `/api/meals/:id` | usunięcie wpisu |
| GET/POST/DELETE | `/api/anchors` | kotwice |
| GET/POST/PATCH/DELETE | `/api/avoid`, `/api/avoid/:id` | lista niewolnika |
| GET | `/api/off/search?q=` | wyszukiwanie w Open Food Facts |
| POST | `/api/off/import` | pobranie produktu po kodzie i zapis do katalogu |

### Uwierzytelnianie

Sesja to losowy token (32 bajty) w ciasteczku `HttpOnly`, `Secure`,
`SameSite=Lax`, ważny 30 dni. W bazie leży wyłącznie jego skrót SHA-256 —
podejrzenie tabeli `sessions` nie wystarczy, żeby podszyć się pod konto.
Hasła weryfikuje scrypt z wbudowanego `crypto` (zero dodatkowych zależności),
porównanie przez `timingSafeEqual`.

Logowanie ma limiter: 10 nieudanych prób z jednego adresu w 15 minut i kolejne
dostają `429`. Odpowiedź jest identyczna dla złego loginu i złego hasła, więc
formularz nie zdradza, które konta istnieją. Serwer ma ustawione
`trust proxy`, bo inaczej za nginx-em wszystkie żądania miałyby jeden adres
i limiter obejmowałby wszystkich naraz.

### Open Food Facts

Wyszukiwanie pełnotekstowe **nie istnieje w API v2** Open Food Facts — służy do
niego osobna usługa `search.openfoodfacts.org`. Odczyt pojedynczego produktu
idzie już przez zwykłe API produktowe na `world.openfoodfacts.org`.

Ruch jest reglamentowany po ich stronie: **10 zapytań wyszukiwania i 15 odczytów
produktu na minutę z adresu IP**. Serwer pyta w imieniu wszystkich użytkowników
naraz, więc budżet jest wspólny i pilnowany w `routes/off.js` z zapasem (8 i 12).
Po przekroczeniu klient dostaje `429` z czytelnym komunikatem, zamiast doprowadzać
do zablokowania całej instancji.

Dwa mechanizmy ograniczają ruch:

- **Cache wyszukiwań** w pamięci (10 minut) — poprawianie frazy i powrót do
  poprzedniej nie kosztuje już nic.
- **Tabela `foods` jako cache produktów** — raz zaimportowany produkt zostaje
  na stałe z `source = 'off'` i kodem kreskowym, i od tej pory znajduje się
  w zwykłym wyszukiwaniu lokalnym bez ruchu na zewnątrz.

Wartości odżywcze przy imporcie pobiera serwer po kodzie kreskowym — nie
przyjmuje ich z przeglądarki. Klient wskazuje wyłącznie, który produkt.
Nagłówek `User-Agent` musi być czystym ASCII: nagłówki HTTP to ByteString,
więc polski znak w nazwie aplikacji wywraca `fetch`.

### Wartości pochodne

BMI, podstawowa (PPM) i całkowita przemiana materii (CPM) liczone są w
`routes/profile.js` i wracają razem z profilem. Wzory żyją w jednym miejscu
po stronie serwera — frontend je tylko wyświetla, zamiast liczyć równolegle.

Tam samo liczona jest **tkanka tłuszczowa metodą US Navy (Hodgdon–Beckett)**,
w wariancie metrycznym, z obwodów szyi i talii (u kobiet dodatkowo bioder).
Funkcja zwraca `null` zawsze, gdy wynik nie ma prawa być traktowany serio:

- brakuje któregoś obwodu,
- argument logarytmu wychodzi niedodatni (`talia − szyja ≤ 0`),
- pomiar leży poza zakresem kalibracji modelu (wzrost 120–250, szyja 20–70,
  talia 40–200, biodra 50–200 cm),
- wynik wypada poza 0–70 %, co oznacza błąd pomiaru albo cale wpisane jako
  centymetry.

Cicho zwrócona liczba byłaby tu gorsza niż jej brak — wzór zawiera logarytm,
więc naruszenie warunku daje wynik niezdefiniowany, a nie komunikat o błędzie.
Razem z procentem wracają masa tłuszczu, masa beztłuszczowa, kategoria ACE
oraz masa ciała przy niższych progach procentowych przy założeniu, że masa
beztłuszczowa się nie zmieni. Rachunek idzie na pełnej precyzji, zaokrąglenie
do jednego miejsca następuje dopiero przy zwrocie. Błąd standardowy metody to
±3–4 punkty procentowe — interfejs pisze to przy wyniku.

---

## 3. Baza danych (`db-pod`)

Pliki z `db/init/` wykonuje Postgres przy inicjalizacji **pustego** wolumenu.
Na bazie, która już istnieje, ten sam schemat zakłada `./scripts/db-init.sh`
(pliki są idempotentne, więc powtórne uruchomienie niczego nie psuje).

### Tabele — `db/init/01_schema.sql`

| Tabela | Zawartość |
|---|---|
| `users` | konta: login, hash hasła (scrypt). Rejestracja zamknięta — patrz `create-user.sh` |
| `sessions` | tokeny sesji z datą wygaśnięcia, kasowalne (wylogowanie działa naprawdę) |
| `habits` | nawyki: nazwa, kategoria, godzina przypomnienia, kolejność |
| `habit_logs` | odhaczenia, klucz `(habit_id, day)` — obecność wiersza znaczy „zrobione" |
| `profiles` | waga, wzrost, wiek, płeć, poziom aktywności, obwody szyi / talii / bioder — jeden wiersz na konto |
| `foods` | katalog produktów: `builtin` (wspólne), `custom` (prywatne), `off` (cache OpenFoodFacts) |
| `meal_entries` | dziennik posiłków — wartości odżywcze zapisane w chwili dodania |
| `anchors` | kotwice z zakładki „Z dołka" |
| `avoid_items` | lista niewolnika — rzeczy, od których użytkownik trzyma się z daleka |

Trzy decyzje projektowe, które nie są oczywiste z samego DDL:

- **BMI i przemiana materii nie są przechowywane.** To czyste funkcje pól
  z `profiles`, liczone przy odczycie. W starym modelu zapisany wynik potrafił
  rozjechać się z profilem po edycji wagi bez kliknięcia „Oblicz".
- **`meal_entries` duplikuje wartości odżywcze** zamiast liczyć je z `foods`.
  To celowe: korekta produktu w katalogu (`PATCH /api/foods/:id`) nie zmienia
  tego, co zostało zjedzone w zeszłym miesiącu — wpis zachowuje nawet nazwę
  sprzed poprawki. `food_id` zostaje wyłącznie jako informacja
  o pochodzeniu i przechodzi w `NULL`, gdy produkt zniknie z katalogu.
- **Odhaczenie to jeden wiersz, nie nadpisanie bloba.** W modelu klucz–wartość
  każde kliknięcie przepisywało całą strukturę nawyków, więc dwa otwarte
  urządzenia cicho kasowały sobie nawzajem zmiany.

Brak tabeli na odhaczone techniki w „Z dołka" jest zamierzony — struktura
poziomów zmieni się przy przebudowie zakładki, a klucz oparty o pozycję
w tablicy technik i tak trafiłby do kosza.

### Konta i przeniesienie danych

```bash
./scripts/db-init.sh                # schemat (tylko dla istniejącej już bazy)
./scripts/create-user.sh <login>    # pyta o hasło, zakłada konto
./scripts/migrate-kv.sh <login>     # przenosi dane z kv_store na to konto
```

`migrate-kv.sh` jest idempotentny i **nie kasuje `kv_store`** — stara tabela
zostaje jako siatka bezpieczeństwa, dopóki aplikacja nie przejdzie na nowe
tabele i nie potwierdzisz, że komplet danych się zgadza.

Hasła hashuje scrypt z wbudowanego modułu `crypto` Node'a (bez dodatkowych
zależności), format `scrypt$N$r$p$salt$hash`.

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

# Porty na hoście — rootless Podman nie zbinduje portów <1024
HTTP_PORT=8080
HTTPS_PORT=8443

DB_USER=tracker
DB_PASSWORD=zmien_to_na_silne_haslo
DB_NAME=tracker
```

`HOST` **nie musi być domeną publiczną**. Wystarczy:
- wpis w lokalnym/firmowym serwerze DNS wskazujący na ten host, albo
- wpis w pliku `hosts` na maszynach klienckich (`C:\Windows\System32\drivers\etc\hosts`
  / `/etc/hosts`), albo
- po prostu adres IP hosta, jeśli DNS nie jest dostępny.

### Porty a rootless Podman

Podman uruchomiony jako zwykły użytkownik **nie może bindować portów poniżej 1024** —
pod z `-p 80:80` nie wystartuje (zostaje w stanie `Created` z `internal libpod error`).
Dlatego domyślnie używamy 8080/8443, a aplikacja jest pod `https://$HOST:$HTTPS_PORT`.

Jeśli chcesz adres bez numeru portu, masz dwie drogi:
```bash
# a) obniżenie progu portów uprzywilejowanych (jednorazowo, wymaga sudo)
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee /etc/sysctl.d/99-tracker.conf
# potem w .env: HTTP_PORT=80 / HTTPS_PORT=443 i ponowne wdrożenie

# b) przekierowanie portów na firewallu, np. firewalld
sudo firewall-cmd --permanent --add-forward-port=port=443:proto=tcp:toport=8443
sudo firewall-cmd --reload
```

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
```

### `scripts/teardown.sh`  (odwrotność `deploy.sh`)

Usuwa to, co utworzył `deploy.sh` — w kolejności odwrotnej do tworzenia:

```bash
./scripts/teardown.sh            # kontenery, pody, sieć app-net
./scripts/teardown.sh --purge    # dodatkowo wolumen pgdata, obraz i certs/
```

Domyślnie **wolumen `pgdata` zostaje nietknięty**, więc `./scripts/deploy.sh`
odtwarza wdrożenie razem z danymi — to zwykły sposób na restart „od zera"
po zmianie konfiguracji. `--purge` kasuje bazę bezpowrotnie i dopytuje
o potwierdzenie (trzeba wpisać `tak`).

Skrypt jest idempotentny: sprawdza `podman pod exists` / `container exists` /
`network exists` przed każdym usunięciem, więc uruchomiony na czystym systemie
po prostu nic nie robi. Nie czyta `.env` — nazwy zasobów są stałe, dzięki czemu
działa nawet gdy `.env` zniknął.

> Uwaga na `pgdata` przy zmianie hasła: Postgres ustawia `POSTGRES_PASSWORD`
> **tylko przy inicjalizacji pustego katalogu danych**. Jeśli zmienisz
> `DB_PASSWORD` w `.env`, a wolumen już istnieje, aplikacja dostanie
> `password authentication failed for user "tracker"`. Wtedy albo
> `./scripts/teardown.sh --purge`, albo zmiana hasła w samej bazie:
> `podman exec -it postgres psql -U tracker -c "ALTER USER tracker WITH PASSWORD '...'"`.

Nadaj uprawnienia: `chmod +x scripts/*.sh`

---

## 8. Uruchomienie — kolejność

```bash
cp .env.example .env      # uzupełnij HOST (nazwa DNS lub IP hosta) i hasło DB
./scripts/deploy.sh       # sieć + wolumen + certyfikat self-signed + 3 pody, od razu HTTPS
```

Sprawdzenie:
```bash
podman pod ps                                  # wszystkie trzy pody: Running
podman logs tracker-app                        # → "DB gotowa" i "API na :3000"
curl -k https://$HOST:$HTTPS_PORT/api/health   # -k: pomija weryfikację self-signed, → {"ok":true}
curl -sI http://$HOST:$HTTP_PORT/              # → 301 na https://$HOST:$HTTPS_PORT/
```

Usunięcie wdrożenia: `./scripts/teardown.sh` (patrz sekcja 7).

> Jeśli `podman pod ps` pokazuje pod w stanie `Created` zamiast `Running`,
> najczęstszą przyczyną jest próba zbindowania portu <1024 w trybie rootless —
> patrz „Porty a rootless Podman" w sekcji 6.

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
