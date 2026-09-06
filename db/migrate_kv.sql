-- Przeniesienie danych ze starego modelu klucz–wartość (kv_store) do tabel.
-- Wywoływane przez ./scripts/migrate-kv.sh, które podstawia :uid.
--
-- Skrypt NIE usuwa kv_store — stary rekord zostaje nietknięty aż do momentu,
-- w którym potwierdzisz, że nowe tabele mają komplet danych.
-- Jest idempotentny: ponowne uruchomienie nie zduplikuje wierszy.

\set ON_ERROR_STOP on
BEGIN;

-- Kolumna pomocnicza — wiąże odhaczenia ze starymi identyfikatorami nawyków
-- ("<idNawyku>_<data>"). Zostaje w tabeli na stałe, bo to po niej skrypt
-- rozpoznaje, że dany nawyk już przeniósł. Do usunięcia dopiero po tym, jak
-- kv_store przestanie być potrzebne.
ALTER TABLE habits ADD COLUMN IF NOT EXISTS legacy_id text;

-- ── Nawyki ───────────────────────────────────────────────────────────────
INSERT INTO habits (user_id, name, category, reminder_time, position, legacy_id)
SELECT :uid,
       h->>'name',
       COALESCE(NULLIF(h->>'category',''), 'Zdrowie'),
       NULLIF(h->>'time','')::time,
       ord::int,
       h->>'id'
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'habit_tracker_v1') s,
     jsonb_array_elements(s.v->'habits') WITH ORDINALITY AS t(h, ord)
WHERE h->>'name' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM habits x WHERE x.user_id = :uid AND x.legacy_id = h->>'id'
  );

-- ── Odhaczenia ───────────────────────────────────────────────────────────
INSERT INTO habit_logs (habit_id, day)
SELECT hb.id, split_part(l.key, '_', 2)::date
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'habit_tracker_v1') s,
     jsonb_each(s.v->'logs') AS l(key, val)
JOIN habits hb ON hb.user_id = :uid AND hb.legacy_id = split_part(l.key, '_', 1)
WHERE l.val::text <> 'false'
  AND split_part(l.key, '_', 2) ~ '^\d{4}-\d{2}-\d{2}$'
ON CONFLICT (habit_id, day) DO NOTHING;

-- ── Profil ───────────────────────────────────────────────────────────────
-- Zapisane bmiVal i tdee celowo pomijamy: są funkcją poniższych pól
-- i liczone są od nowa przy odczycie.
INSERT INTO profiles (user_id, weight_kg, height_cm, age_years, sex, activity)
SELECT :uid,
       NULLIF(s.v->'profile'->>'weight','')::numeric,
       NULLIF(s.v->'profile'->>'height','')::numeric,
       NULLIF(s.v->'profile'->>'age','')::int,
       NULLIF(s.v->'profile'->>'sex',''),
       COALESCE(NULLIF(s.v->'profile'->>'activity','')::smallint, 1)
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'bmi_tracker_v1') s
WHERE s.v->'profile' IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

-- ── Własne produkty ──────────────────────────────────────────────────────
INSERT INTO foods (source, user_id, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
SELECT 'custom', :uid,
       f->>'name',
       '⭐ Własne produkty',
       COALESCE((f->>'cal')::numeric, 0),
       COALESCE((f->>'p')::numeric, 0),
       COALESCE((f->>'c')::numeric, 0),
       COALESCE((f->>'f')::numeric, 0),
       COALESCE((f->>'fb')::numeric, 0),
       COALESCE((f->>'s')::numeric, 0)
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'custom_foods_v1') s,
     jsonb_array_elements(s.v) AS f
WHERE f->>'name' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM foods x
    WHERE x.source = 'custom' AND x.user_id = :uid AND x.name = f->>'name'
  );

-- ── Dziennik posiłków ────────────────────────────────────────────────────
INSERT INTO meal_entries (user_id, day, name, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
SELECT :uid,
       d.key::date,
       e->>'name',
       COALESCE((e->>'grams')::numeric, 100),
       COALESCE((e->>'cal')::numeric, 0),
       COALESCE((e->>'p')::numeric, 0),
       COALESCE((e->>'c')::numeric, 0),
       COALESCE((e->>'f')::numeric, 0),
       COALESCE((e->>'fb')::numeric, 0),
       COALESCE((e->>'s')::numeric, 0)
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'bmi_tracker_v1') s,
     jsonb_each(s.v->'calDays') AS d(key, val),
     jsonb_array_elements(d.val) AS e
-- Celowo warunek zero-jedynkowy: ten sam produkt można zjeść tego samego dnia
-- dwa razy, więc nie da się odróżnić duplikatu od prawdziwego powtórzenia.
-- Jeśli użytkownik ma już jakiekolwiek wpisy, pomijamy cały krok.
WHERE d.key ~ '^\d{4}-\d{2}-\d{2}$'
  AND NOT EXISTS (SELECT 1 FROM meal_entries m WHERE m.user_id = :uid);

-- ── Kotwice ──────────────────────────────────────────────────────────────
INSERT INTO anchors (user_id, emoji, label, position)
SELECT :uid,
       COALESCE(NULLIF(a->>'emoji',''), '🎵'),
       a->>'text',
       ord::int
FROM (SELECT value::jsonb AS v FROM kv_store WHERE key = 'dolekSystem_v1') s,
     jsonb_array_elements(s.v->'kotwice') WITH ORDINALITY AS t(a, ord)
WHERE a->>'text' IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM anchors x WHERE x.user_id = :uid AND x.label = a->>'text'
  );

COMMIT;
