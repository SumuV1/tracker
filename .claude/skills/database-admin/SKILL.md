---
name: database-admin
description: Use when the user asks about database schema design, query/index optimization, backups/restore, production-safe migrations, replication, or performance tuning for a specific engine (PostgreSQL, MySQL, MongoDB, etc.) — "zaprojektuj schemat bazy danych", "zoptymalizuj to zapytanie", "dodaj indeks", "backup bazy danych", "strojenie wydajności bazy", "bezpieczna migracja na produkcji", "design a database schema", "optimize this query", "add an index", "database backup/restore", "tune database performance", "zero-downtime migration". Complements backend-dev (which handles routine migrations/ORM usage while building an API) by going deeper on schema design, EXPLAIN plans, indexing strategy, backup/DR, and safe production schema changes. Not for general API/business-logic code (use backend-dev), and not for charts/dashboards (use dataviz).
---

# Zarządzanie bazami danych

Ten skill pomaga projektować, strajać i utrzymywać bazy danych — schemat, indeksy, zapytania, migracje na produkcji, backupy — niezależnie od silnika. To pogłębienie tematu bazodanowego z `backend-dev` (który zajmuje się rutynowymi migracjami przy budowie API) — użyj tego skilla, gdy temat wymaga głębszej wiedzy: projektowanie schematu od zera, strojenie wydajności, operacje administracyjne, bezpieczne zmiany schematu na działającej produkcji.

## Krok 1 — Rozpoznaj silnik i kontekst

- Ustal silnik bazy (PostgreSQL, MySQL/MariaDB, SQLite, MongoDB, Redis...) z konfiguracji projektu (connection string, docker-compose, ORM config) — rady różnią się mocno między silnikami relacyjnymi a dokumentowymi.
- Sprawdź istniejący schemat/migracje i narzędzie migracyjne w użyciu (Prisma Migrate, Alembic, Flyway, Liquibase, ActiveRecord...) — trzymaj się go zamiast proponować inne.
- Ustal skalę (liczba rekordów, ruch, czy to produkcja z realnym ruchem czy projekt na wczesnym etapie) — to determinuje, jak ostrożne muszą być zmiany.

## Krok 2 — Projektowanie schematu

- Normalizuj do 3NF domyślnie; denormalizuj świadomie i tylko gdy masz konkretny powód wydajnościowy (i wtedy nazwij ten kompromis wprost użytkownikowi).
- Dobieraj typy danych możliwie wąskie i precyzyjne (np. nie `TEXT` dla kodu kraju, nie `FLOAT` dla pieniędzy — użyj `DECIMAL`/`NUMERIC`).
- Klucze obce, `NOT NULL`, `UNIQUE` i `CHECK` wymuszaj na poziomie bazy — to ostatnia linia obrony integralności danych, niezależna od błędów w kodzie aplikacji.
- Dla baz dokumentowych (MongoDB) projektuj schemat pod wzorce odczytu (embed vs. reference) zamiast mechanicznie kopiować model relacyjny.
- Nazewnictwo tabel/kolumn spójne z konwencją już obecną w projekcie.

## Krok 3 — Indeksowanie i optymalizacja zapytań

- Zanim dodasz indeks, zmierz — uruchom `EXPLAIN`/`EXPLAIN ANALYZE` (lub odpowiednik silnika) na realnym zapytaniu i pokaż plan, nie zgaduj.
- Indeksuj kolumny używane w `WHERE`, `JOIN`, `ORDER BY` i klucze obce na dużych tabelach; dla zapytań wielokolumnowych rozważ indeks złożony w kolejności zgodnej z selektywnością i użyciem.
- Unikaj nadmiarowych indeksów — każdy spowalnia zapisy i zajmuje miejsce; usuwaj nieużywane (sprawdź statystyki użycia indeksów, jeśli silnik je udostępnia).
- Dla wolnych zapytań sprawdzaj kolejno: brakujący indeks, sekwencyjny skan dużej tabeli, złe typy w porównaniach (rzutowanie blokujące użycie indeksu), N+1 na poziomie ORM (to też pokrywa `backend-dev`, ale tu diagnozujesz to na poziomie samego zapytania SQL).
- Dla agregacji/raportów na dużych wolumenach rozważ materializowane widoki lub tabele podsumowań zamiast liczenia na żywo przy każdym żądaniu.

## Krok 4 — Bezpieczne migracje na produkcji

- Zmiany schematu na tabelach z realnym ruchem rób w sposób bez przestoju (expand-contract): najpierw dodaj nową kolumnę/tabelę jako opcjonalną, wdróż kod obsługujący oba warianty, backfill danych w batchach, dopiero potem usuń stare pola/kod w osobnym wdrożeniu.
- Unikaj blokujących operacji DDL na dużych tabelach (np. `ALTER TABLE ADD COLUMN` z wartością domyślną na starszych silnikach, przebudowa indeksu bez `CONCURRENTLY`/odpowiednika) — sprawdź, czy silnik i wersja obsługują wariant bezblokadowy.
- Backfill dużych tabel rób w małych transakcjach/batchach z throttlingiem, nie jedną transakcją na milion rekordów — to blokuje inne zapytania i rozdyma WAL/log.
- Każda migracja nieodwracalna (drop column/table, utrata danych) wymaga jawnego potwierdzenia użytkownika przed wykonaniem — nigdy nie zakładaj zgody.
- Testuj migrację na kopii/staging przed produkcją, jeśli taka jest dostępna w projekcie.

## Krok 5 — Backup, restore i disaster recovery

- Zanim zaproponujesz zmianę ryzykowną (duża migracja, masowy update/delete), sprawdź czy istnieje świeży backup i jak wygląda proces restore — jeśli nie wiesz, zapytaj użytkownika zamiast zakładać.
- Backupy pełne + logi transakcyjne (WAL/binlog) dla point-in-time recovery na produkcji, jeśli silnik to wspiera i skala tego wymaga.
- Restore testuj okresowo (backup, którego nikt nie przywrócił, nie jest zweryfikowanym backupem) — jeśli to sugestia dla użytkownika, powiedz to wprost.
- Destrukcyjne operacje (`DROP`, `TRUNCATE`, masowy `DELETE`/`UPDATE` bez `WHERE` ograniczającego zakres) wymagają jawnego potwierdzenia i, jeśli to możliwe, wykonania najpierw jako `SELECT` żeby zweryfikować zakres.

## Krok 6 — Operacje i dostęp

- Connection pooling skonfiguruj adekwatnie do obciążenia (rozmiar puli, timeouty) — zbyt duża pula wyczerpuje limity połączeń bazy, zbyt mała tworzy kolejkowanie.
- Uprawnienia bazy danych na zasadzie najmniejszego przywileju: osobne role dla aplikacji (bez `SUPERUSER`/`DROP`), migracji i analityki/odczytu — nie używaj jednego konta admina wszędzie.
- Dla replikacji/skalowania odczytu upewnij się, że kod aplikacji świadomie rozróżnia zapisy (primary) od odczytów tolerujących opóźnienie (replica) — nie zakładaj natychmiastowej spójności między replikami.
- Monitoruj rozmiar tabel/indeksów, wolne zapytania i wykorzystanie połączeń, jeśli projekt ma do tego narzędzia (pg_stat_statements, slow query log, APM) — wskaż użytkownikowi gdzie patrzeć, jeśli nie masz bezpośredniego dostępu.

## Krok 7 — Weryfikacja przed zakończeniem

- Dla nowego schematu/migracji uruchom ją lokalnie/na staging i sprawdź, że aplikacja nadal działa z nowym i (jeśli to migracja wieloetapowa) ze starym kodem.
- Dla optymalizacji zapytania pokaż plan wykonania przed i po zmianie jako dowód poprawy, nie tylko deklarację.
- Jeśli nie masz dostępu do bazy/środowiska żeby coś zweryfikować, powiedz to wprost zamiast zakładać, że działa.
