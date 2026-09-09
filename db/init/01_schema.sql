-- Schemat Trackera. Plik jest idempotentny: uruchamiany przez Postgresa przy
-- inicjalizacji pustego wolumenu, a na istniejącej bazie przez ./scripts/db-init.sh

-- ── Konta ─────────────────────────────────────────────────────────────────
-- Rejestracja jest zamknięta — konta zakłada ./scripts/create-user.sh
CREATE TABLE IF NOT EXISTS users (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  login         text NOT NULL CHECK (length(btrim(login)) BETWEEN 2 AND 64),
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- unikalność bez względu na wielkość liter
CREATE UNIQUE INDEX IF NOT EXISTS users_login_key ON users (lower(login));

CREATE TABLE IF NOT EXISTS sessions (
  token      text PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx    ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at);

-- ── Nawyki ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id       bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          text NOT NULL CHECK (length(btrim(name)) > 0),
  category      text NOT NULL,
  reminder_time time,                     -- NULL = bez przypomnienia
  position      int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS habits_user_idx ON habits (user_id);

-- Obecność wiersza = nawyk odhaczony tego dnia. Klucz złożony zastępuje
-- klucze postaci "<idNawyku>_<data>" z modelu klucz–wartość i sprawia, że
-- odhaczenie jest pojedynczym zapisem zamiast nadpisania całego bloba.
CREATE TABLE IF NOT EXISTS habit_logs (
  habit_id bigint NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  day      date NOT NULL,
  done_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (habit_id, day)
);
CREATE INDEX IF NOT EXISTS habit_logs_day_idx ON habit_logs (day);

-- ── Profil ────────────────────────────────────────────────────────────────
-- Trzymamy wyłącznie dane wejściowe. BMI oraz przemiana materii są funkcjami
-- tych wartości i liczone są przy odczycie — dzięki temu nie mogą rozjechać
-- się z profilem po edycji, co przy zapisanych wynikach było możliwe.
CREATE TABLE IF NOT EXISTS profiles (
  user_id    bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  weight_kg  numeric(5,2) CHECK (weight_kg > 0),
  height_cm  numeric(5,2) CHECK (height_cm > 0),
  age_years  int          CHECK (age_years > 0 AND age_years < 130),
  sex        char(1)      CHECK (sex IN ('M','F')),
  activity   smallint NOT NULL DEFAULT 1 CHECK (activity BETWEEN 0 AND 4),
  -- Obwody do metody US Navy. Zakresy to granice walidacji modelu, nie
  -- fizjologii — poza nimi wzór przestaje cokolwiek znaczyć.
  neck_cm    numeric(5,2) CHECK (neck_cm  BETWEEN 20 AND 70),
  waist_cm   numeric(5,2) CHECK (waist_cm BETWEEN 40 AND 200),
  hips_cm    numeric(5,2) CHECK (hips_cm  BETWEEN 50 AND 200),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Dla baz założonych przed dodaniem obwodów. ADD COLUMN IF NOT EXISTS pomija
-- kolumnę razem z jej ograniczeniem, więc ponowne uruchomienie nic nie psuje.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS neck_cm  numeric(5,2) CHECK (neck_cm  BETWEEN 20 AND 70);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS waist_cm numeric(5,2) CHECK (waist_cm BETWEEN 40 AND 200);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hips_cm  numeric(5,2) CHECK (hips_cm  BETWEEN 50 AND 200);

-- ── Produkty ──────────────────────────────────────────────────────────────
-- source: 'builtin' — baza wbudowana, wspólna dla wszystkich
--         'custom'  — produkt użytkownika, prywatny
--         'off'     — pobrany z OpenFoodFacts; tabela służy zarazem za cache,
--                     żeby nie odpytywać API o ten sam kod kreskowy dwa razy
-- Wszystkie wartości odżywcze są na 100 g.
CREATE TABLE IF NOT EXISTS foods (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source      text NOT NULL CHECK (source IN ('builtin','custom','off')),
  user_id     bigint REFERENCES users(id) ON DELETE CASCADE,  -- NULL = wspólny
  off_barcode text,
  name        text NOT NULL CHECK (length(btrim(name)) > 0),
  category    text,
  kcal        numeric(7,2) NOT NULL CHECK (kcal >= 0),
  protein_g   numeric(6,2) NOT NULL DEFAULT 0,
  carbs_g     numeric(6,2) NOT NULL DEFAULT 0,
  fat_g       numeric(6,2) NOT NULL DEFAULT 0,
  fiber_g     numeric(6,2) NOT NULL DEFAULT 0,
  salt_g      numeric(6,2) NOT NULL DEFAULT 0,
  fetched_at  timestamptz,                                    -- kiedy z OFF
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- produkt prywatny wtedy i tylko wtedy, gdy ma właściciela
  CONSTRAINT foods_owner_matches_source CHECK ((source = 'custom') = (user_id IS NOT NULL)),
  CONSTRAINT foods_barcode_only_for_off CHECK (off_barcode IS NULL OR source = 'off')
);
CREATE UNIQUE INDEX IF NOT EXISTS foods_off_barcode_key ON foods (off_barcode) WHERE source = 'off';
CREATE INDEX IF NOT EXISTS foods_user_idx ON foods (user_id);
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods (lower(name));

-- ── Dziennik posiłków ─────────────────────────────────────────────────────
-- Wartości odżywcze kopiujemy w chwili dodania wpisu, już przeliczone na
-- podaną gramaturę. Powiązanie z katalogiem (food_id) jest tylko informacją
-- o pochodzeniu: późniejsza korekta produktu nie może zmieniać tego, co
-- faktycznie zostało zjedzone w zeszłym miesiącu.
CREATE TABLE IF NOT EXISTS meal_entries (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  food_id    bigint REFERENCES foods(id) ON DELETE SET NULL,
  name       text NOT NULL,
  grams      numeric(7,2) NOT NULL CHECK (grams > 0),
  kcal       numeric(7,2) NOT NULL CHECK (kcal >= 0),
  protein_g  numeric(6,2) NOT NULL DEFAULT 0,
  carbs_g    numeric(6,2) NOT NULL DEFAULT 0,
  fat_g      numeric(6,2) NOT NULL DEFAULT 0,
  fiber_g    numeric(6,2) NOT NULL DEFAULT 0,
  salt_g     numeric(6,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meal_entries_user_day_idx ON meal_entries (user_id, day);

-- ── Lista niewolnika ──────────────────────────────────────────────────────
-- Odwrotność nawyku: rzeczy, od których użytkownik trzyma się z daleka.
-- Nie ma dziennika odhaczeń, bo nie ma czego odhaczać — liczy się sama lista.
CREATE TABLE IF NOT EXISTS avoid_items (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (length(btrim(name)) > 0),
  note       text,
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS avoid_items_user_idx ON avoid_items (user_id);

-- ── Z dołka ───────────────────────────────────────────────────────────────
-- Na razie wyłącznie kotwice. Tabeli na odhaczone techniki świadomie tu nie
-- ma: struktura poziomów i technik zmieni się przy przebudowie zakładki,
-- a klucz oparty o pozycję w tablicy technik i tak trzeba by wyrzucić.
CREATE TABLE IF NOT EXISTS anchors (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      text NOT NULL DEFAULT '🎵',
  label      text NOT NULL CHECK (length(btrim(label)) > 0),
  position   int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS anchors_user_idx ON anchors (user_id);
