import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqNumber, optNumber, reqId, BadRequest } from "../http.js";
import { FOOD_CATEGORIES, FALLBACK_CATEGORY } from "../../shared/foodCategories.mjs";

export const foodRoutes = express.Router();

const SELECT_FOOD = `
  SELECT id, source, name, category, is_dish AS "isDish",
         kcal, protein_g AS "proteinG", carbs_g AS "carbsG",
         fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"
    FROM foods`;

const DEFAULT_LIMIT = 200;

// Kategoria produktu pochodzi wyłącznie z listy — wolny tekst rozmnażałby
// kafelki filtra („Nabiał", „nabiał", „Nabial").
export function optCategory(v) {
  const c = optText(v, "category", { max: 60 });
  if (c !== null && !FOOD_CATEGORIES.includes(c)) throw new BadRequest("Nieznana kategoria produktu.");
  return c;
}

// Poprawiać i kasować można własne produkty oraz te pobrane z Open Food Facts.
// Te drugie są wspólne dla wszystkich kont instancji — przy jednym
// użytkowniku to jego katalog, a ponowny import po kodzie i tak je odtworzy.
const EDITABLE = "id = $1 AND ((source = 'custom' AND user_id = $2) OR source = 'off')";

// W ILIKE „%" i „_" są wieloznacznikami, więc bez tego wpisanie „%" w
// wyszukiwarkę pasowało do wszystkiego, a nazwa z podkreśleniem szukała za
// szeroko. ESCAPE deklarujemy w zapytaniu, bo domyślnego znaku Postgres
// (backslash) nie ma w standardzie.
const likeEscape = s => s.replace(/([\\%_])/g, "\\$1");

// Widoczne są produkty wspólne (builtin/off) oraz własne produkty użytkownika.
// Filtrowanie idzie po stronie bazy: katalog rośnie z każdym importem z Open
// Food Facts, a przeglądarka i tak pokazywała tylko to, co zmieściło się
// w limicie — po jego przekroczeniu produkty znikałyby bez słowa.
foodRoutes.get("/", wrap(async (req, res) => {
  const q = optText(req.query.q, "q", { max: 100 });
  const category = optText(req.query.category, "category", { max: 60 });
  const limit = optNumber(req.query.limit, "limit", { min: 1, max: 500 }) ?? DEFAULT_LIMIT;

  // Bierzemy jeden wiersz ponad limit — jeśli przyjdzie, wiadomo, że lista
  // jest ucięta, i klient może o tym powiedzieć zamiast milczeć.
  const { rows } = await query(
    `${SELECT_FOOD}
      WHERE (user_id IS NULL OR user_id = $1)
        AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%' ESCAPE '\\')
        AND ($3::text IS NULL OR category = $3)
      ORDER BY (source = 'custom') DESC, name
      LIMIT $4`,
    [req.user.id, q === null ? null : likeEscape(q), category, limit + 1]
  );
  const truncated = rows.length > limit;
  res.json({ items: truncated ? rows.slice(0, limit) : rows, truncated, limit });
}));

foodRoutes.get("/categories", wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT category, count(*)::int AS count
       FROM foods
      WHERE category IS NOT NULL AND (user_id IS NULL OR user_id = $1)
      GROUP BY category ORDER BY category`,
    [req.user.id]
  );
  // Kolejność z listy kategorii, nie alfabetyczna po emoji; puste kategorie
  // zostają na liście, żeby filtr nie zmieniał kształtu po skasowaniu
  // ostatniego produktu. Spoza listy (przepisy) dochodzą na końcu.
  const count = new Map(rows.map(r => [r.category, r.count]));
  res.json([
    ...FOOD_CATEGORIES.map(category => ({ category, count: count.get(category) ?? 0 })),
    ...rows.filter(r => !FOOD_CATEGORIES.includes(r.category)),
  ]);
}));

foodRoutes.post("/", wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO foods (source, user_id, name, category, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
     VALUES ('custom', $1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, source, name, category, kcal,
               protein_g AS "proteinG", carbs_g AS "carbsG",
               fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"`,
    [
      req.user.id,
      reqText(b.name, "name", { max: 120 }),
      optCategory(b.category) ?? FALLBACK_CATEGORY,
      reqNumber(b.kcal, "kcal", { min: 0, max: 9999 }),
      optNumber(b.proteinG, "proteinG", { min: 0, max: 999 }) ?? 0,
      optNumber(b.carbsG, "carbsG", { min: 0, max: 999 }) ?? 0,
      optNumber(b.fatG, "fatG", { min: 0, max: 999 }) ?? 0,
      optNumber(b.fiberG, "fiberG", { min: 0, max: 999 }) ?? 0,
      optNumber(b.saltG, "saltG", { min: 0, max: 999 }) ?? 0,
    ]
  );
  res.status(201).json(rows[0]);
}));

// Poprawka (własnego albo z Open Food Facts — patrz EDITABLE) nie
// rusza wpisów w dzienniku: te trzymają wartości odżywcze skopiowane w chwili
// dodania i mają nimi zostać, bo opisują zjedzony posiłek, a nie dzisiejszą
// treść katalogu.
foodRoutes.patch("/:id", wrap(async (req, res) => {
  const b = req.body || {};
  // COALESCE zostawia pole nietknięte, gdy nie przyszło w żądaniu.
  const { rows } = await query(
    `UPDATE foods SET
        name      = COALESCE($3, name),
        category  = COALESCE($4, category),
        kcal      = COALESCE($5, kcal),
        protein_g = COALESCE($6, protein_g),
        carbs_g   = COALESCE($7, carbs_g),
        fat_g     = COALESCE($8, fat_g),
        fiber_g   = COALESCE($9, fiber_g),
        salt_g    = COALESCE($10, salt_g)
      WHERE ${EDITABLE}
      RETURNING id, source, name, category, kcal,
                protein_g AS "proteinG", carbs_g AS "carbsG",
                fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"`,
    [
      reqId(req.params.id),
      req.user.id,
      optText(b.name, "name", { max: 120 }),
      optCategory(b.category),
      optNumber(b.kcal, "kcal", { min: 0, max: 9999 }),
      optNumber(b.proteinG, "proteinG", { min: 0, max: 999 }),
      optNumber(b.carbsG, "carbsG", { min: 0, max: 999 }),
      optNumber(b.fatG, "fatG", { min: 0, max: 999 }),
      optNumber(b.fiberG, "fiberG", { min: 0, max: 999 }),
      optNumber(b.saltG, "saltG", { min: 0, max: 999 }),
    ]
  );
  if (!rows.length) return res.status(404).json({ error: "Tego produktu nie można edytować." });
  res.json(rows[0]);
}));

// Kasować można to samo, co poprawiać — produktów wbudowanych nie ruszamy.
// Wpisy w dzienniku zostają (food_id → NULL), bo trzymają własne wartości.
foodRoutes.delete("/:id", wrap(async (req, res) => {
  // Klucz obcy w recipe_items jest RESTRICT, więc bez tego sprawdzenia
  // skasowanie składnika kończyłoby się błędem bazy i kodem 500.
  const used = await query(
    `SELECT f.name FROM recipe_items ri JOIN foods f ON f.id = ri.dish_id
      WHERE ri.food_id = $1 ORDER BY f.name LIMIT 3`,
    [reqId(req.params.id)]
  );
  if (used.rows.length) {
    throw new BadRequest("Ten produkt jest składnikiem przepisu: " + used.rows.map(r => r.name).join(", ") + ". Usuń go najpierw z przepisu.");
  }
  const { rowCount } = await query(
    `DELETE FROM foods WHERE ${EDITABLE}`,
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Tego produktu nie można usunąć." });
  res.json({ ok: true });
}));
