-- WYGENEROWANE z FOOD_DB w frontend/src/App.jsx — nie edytuj ręcznie.
-- Wartości odżywcze na 100 g produktu.

INSERT INTO foods (source, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
SELECT 'builtin', v.name, v.category, v.kcal, v.protein_g, v.carbs_g, v.fat_g, v.fiber_g, v.salt_g
FROM (VALUES
  ('Mleko 2%', '🥛 Nabiał', 50, 3.4, 4.8, 2, 0, 0.1),
  ('Jogurt naturalny', '🥛 Nabiał', 61, 3.5, 4.7, 3.3, 0, 0.1),
  ('Ser żółty', '🥛 Nabiał', 380, 25, 1.3, 31, 0, 1.8),
  ('Twaróg chudy', '🥛 Nabiał', 98, 18, 3.5, 1, 0, 0.1),
  ('Masło', '🥛 Nabiał', 717, 0.9, 0.1, 81, 0, 0.1),
  ('Kefir', '🥛 Nabiał', 52, 3.3, 4.5, 2, 0, 0.1),
  ('Mozzarella', '🥛 Nabiał', 280, 22, 2.2, 22, 0, 0.6),
  ('Kurczak pierś', '🥩 Mięso', 165, 31, 0, 3.6, 0, 0.1),
  ('Wołowina (mielona)', '🥩 Mięso', 250, 26, 0, 17, 0, 0.1),
  ('Wieprzowina (schab)', '🥩 Mięso', 212, 23, 0, 13, 0, 0.1),
  ('Indyk pierś', '🥩 Mięso', 155, 30, 0, 3, 0, 0.1),
  ('Boczek', '🥩 Mięso', 541, 17, 0.7, 53, 0, 2),
  ('Szynka gotowana', '🥩 Mięso', 145, 18, 1.5, 7, 0, 2),
  ('Kiełbasa', '🥩 Mięso', 301, 14, 1.8, 27, 0, 2.2),
  ('Łosoś', '🐟 Ryby', 208, 20, 0, 13, 0, 0.1),
  ('Tuńczyk (puszka)', '🐟 Ryby', 116, 26, 0, 1, 0, 0.8),
  ('Dorsz', '🐟 Ryby', 82, 18, 0, 0.7, 0, 0.2),
  ('Makrela', '🐟 Ryby', 205, 19, 0, 14, 0, 0.3),
  ('Krewetki', '🐟 Ryby', 99, 24, 0.2, 0.3, 0, 0.5),
  ('Brokuły', '🥦 Warzywa', 34, 2.8, 6.6, 0.4, 2.6, 0.08),
  ('Marchew', '🥦 Warzywa', 41, 0.9, 9.6, 0.2, 2.8, 0.16),
  ('Ziemniaki', '🥦 Warzywa', 77, 2, 17, 0.1, 2.2, 0.01),
  ('Pomidor', '🥦 Warzywa', 18, 0.9, 3.9, 0.2, 1.2, 0.01),
  ('Szpinak', '🥦 Warzywa', 23, 2.9, 3.6, 0.4, 2.2, 0.2),
  ('Papryka czerwona', '🥦 Warzywa', 31, 1, 6, 0.3, 2.1, 0.01),
  ('Sałata', '🥦 Warzywa', 15, 1.4, 2.9, 0.2, 1.3, 0.03),
  ('Jabłko', '🍎 Owoce', 52, 0.3, 14, 0.2, 2.4, 0),
  ('Banan', '🍎 Owoce', 89, 1.1, 23, 0.3, 2.6, 0),
  ('Pomarańcza', '🍎 Owoce', 47, 0.9, 12, 0.1, 2.4, 0),
  ('Truskawki', '🍎 Owoce', 32, 0.7, 7.7, 0.3, 2, 0),
  ('Winogrona', '🍎 Owoce', 67, 0.6, 17, 0.4, 0.9, 0),
  ('Mango', '🍎 Owoce', 60, 0.8, 15, 0.4, 1.6, 0),
  ('Ryż biały (suchy)', '🌾 Zboża', 365, 7, 80, 0.7, 1.3, 0.01),
  ('Makaron (suchy)', '🌾 Zboża', 370, 13, 75, 1.5, 3.2, 0.02),
  ('Chleb pszenny', '🌾 Zboża', 265, 9, 49, 3.2, 2.7, 1.2),
  ('Płatki owsiane', '🌾 Zboża', 389, 17, 66, 7, 10, 0.02),
  ('Kasza gryczana', '🌾 Zboża', 335, 13, 71, 3.4, 10, 0.01),
  ('Jajko kurze', '🥚 Inne', 155, 13, 1.1, 11, 0, 0.3),
  ('Tofu', '🥚 Inne', 76, 8, 1.9, 4.8, 0.9, 0.01),
  ('Oliwa z oliwek', '🥚 Inne', 884, 0, 0, 100, 0, 0),
  ('Orzech włoski', '🥚 Inne', 654, 15, 14, 65, 6.7, 0),
  ('Migdały', '🥚 Inne', 579, 21, 22, 50, 12.5, 0.01)
) AS v(name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
WHERE NOT EXISTS (
  SELECT 1 FROM foods f WHERE f.source = 'builtin' AND f.name = v.name
);
