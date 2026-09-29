-- Kategorie nawyków: cztery filary → sześć (zdrowie, praca, finanse osobiste,
-- rozwój osobisty, relacje, czas dla siebie). Plik jest idempotentny i wykonuje
-- się przy każdym wdrożeniu: po pierwszym przebiegu żaden wiersz już nie pasuje.
--
-- Bez tego przemianowania nawyki ze starych kategorii wpadałyby do pierwszego
-- kafla („Zdrowie"), bo taki jest zapas dla nieznanej kategorii w interfejsie.

-- „Mindfulness" to dokładnie ta sama półka, tylko po polsku i szerzej.
UPDATE habits SET category = 'Czas dla siebie' WHERE category = 'Mindfulness';

-- „Osobiste" rozpadło się na dwie. Najpierw wszystko, co dotyczy pieniędzy
-- i inwestowania, potem reszta jako rozwój — kolejność ma znaczenie, bo drugi
-- UPDATE zgarnia to, czego pierwszy nie wziął.
UPDATE habits SET category = 'Finanse osobiste'
 WHERE category = 'Osobiste'
   AND (name ILIKE '%invest%' OR name ILIKE '%inwest%' OR name ILIKE '%finans%'
        OR name ILIKE '%oszczęd%' OR name ILIKE '%budżet%');
UPDATE habits SET category = 'Rozwój osobisty' WHERE category = 'Osobiste';
