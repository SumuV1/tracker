import express from "express";
import { query, withTransaction } from "../db.js";
import { wrap, reqId, reqText, optText, reqNumber, optNumber, BadRequest } from "../http.js";

// Przepisy. Gotowe danie jest w katalogu zwykłym wierszem `foods` ze źródłem
// 'recipe' — dzięki temu dziennik, wyszukiwarka i edycja gramatury działają
// bez żadnej zmiany, a `recipe_items` trzyma tylko skład. Wartości odżywcze
// liczy serwer i zapisuje w tym wierszu; przeglądarka ich nie przysyła.
export const recipeRoutes = express.Router();

const MAX_ITEMS = 30;

const SELECT_DISH = `
  SELECT id, source, name, category, is_dish AS "isDish",
         recipe_yield_g::float8 AS "yieldG", kcal,
         protein_g AS "proteinG", carbs_g AS "carbsG",
         fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"
    FROM foods`;

const round2 = n => Math.round(n * 100) / 100;

// Z listy składników (wartości na 100 g + gramatura) robi wartości na 100 g
// gotowego dania. `yieldG` to waga po przygotowaniu: gotowanie odparowuje wodę,
// więc bez niej danie wychodziłoby „rzadsze", niż jest naprawdę.
function nutrition(items, yieldG) {
  const sum = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0, saltG: 0 };
  let grams = 0;
  for (const it of items) {
    grams += it.grams;
    for (const k of Object.keys(sum)) sum[k] += (Number(it.food[k]) || 0) * it.grams / 100;
  }
  const base = yieldG || grams;
  if (!(base > 0)) throw new BadRequest("Przepis musi mieć co najmniej jeden składnik z gramaturą.");
  const per100 = {};
  for (const k of Object.keys(sum)) per100[k] = round2(sum[k] * 100 / base);
  return { per100, totalG: round2(grams), servedG: round2(base), total: Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, round2(v)])) };
}

// Wczytuje składniki z ciała żądania razem z wartościami odżywczymi z katalogu.
// Produkty spoza widoczności użytkownika odpadają tu, a nie przy zapisie.
async function loadItems(q, userId, body, selfId) {
  const raw = Array.isArray(body?.items) ? body.items : null;
  if (!raw || !raw.length) throw new BadRequest("Przepis potrzebuje co najmniej jednego składnika.");
  if (raw.length > MAX_ITEMS) throw new BadRequest(`Za dużo składników (maks. ${MAX_ITEMS}).`);

  const items = raw.map((it, i) => ({
    foodId: reqId(it?.foodId, `items[${i}].foodId`),
    grams: reqNumber(it?.grams, `items[${i}].grams`, { min: 0.1, max: 99999 }),
  }));
  if (selfId && items.some(it => it.foodId === selfId)) {
    throw new BadRequest("Przepis nie może zawierać sam siebie.");
  }

  const ids = [...new Set(items.map(it => it.foodId))];
  const { rows } = await q(
    `SELECT id, name, kcal::float8, protein_g::float8 AS "proteinG", carbs_g::float8 AS "carbsG",
            fat_g::float8 AS "fatG", fiber_g::float8 AS "fiberG", salt_g::float8 AS "saltG"
       FROM foods WHERE id = ANY($1::bigint[]) AND (user_id IS NULL OR user_id = $2)`,
    [ids, userId]
  );
  const byId = new Map(rows.map(r => [r.id, r]));
  for (const it of items) {
    const food = byId.get(it.foodId);
    if (!food) throw new BadRequest("Któryś ze składników nie istnieje albo nie jest Twój.");
    it.food = food;
  }
  return items;
}

async function saveItems(q, dishId, items) {
  await q("DELETE FROM recipe_items WHERE dish_id = $1", [dishId]);
  await q(
    `INSERT INTO recipe_items (dish_id, food_id, grams, position)
     SELECT $1, t.food_id, t.grams, t.pos
       FROM unnest($2::bigint[], $3::numeric[], $4::int[]) AS t(food_id, grams, pos)`,
    [dishId, items.map(i => i.foodId), items.map(i => i.grams), items.map((_, i) => i)]
  );
}

// Skład dopinany do listy dań jednym zapytaniem — inaczej byłoby N+1.
async function withItems(rows, userId) {
  if (!rows.length) return rows;
  const { rows: items } = await query(
    `SELECT ri.dish_id AS "dishId", ri.food_id AS "foodId", ri.grams::float8 AS grams,
            f.name, f.kcal::float8 AS kcal
       FROM recipe_items ri
       JOIN foods f ON f.id = ri.food_id
      WHERE ri.dish_id = ANY($1::bigint[])
      ORDER BY ri.dish_id, ri.position, ri.id`,
    [rows.map(r => r.id)]
  );
  const byDish = new Map(rows.map(r => [r.id, []]));
  for (const it of items) byDish.get(it.dishId)?.push(it);
  return rows.map(r => ({ ...r, items: byDish.get(r.id) || [], userId }));
}

// ── Lista ─────────────────────────────────────────────────────────────────
// Zwraca wszystko, co jest daniem: własne przepisy (ze składem) i pozycje
// katalogu oznaczone jako gotowe danie (bez składu).
recipeRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    `${SELECT_DISH}
      WHERE (user_id IS NULL OR user_id = $1)
        AND (is_dish OR source = 'recipe')
      ORDER BY (source = 'recipe') DESC, name`,
    [req.user.id]
  );
  res.json(await withItems(rows, req.user.id));
}));

// ── Zapis ─────────────────────────────────────────────────────────────────
function meta(body) {
  return {
    name: reqText(body?.name, "name", { max: 120 }),
    category: optText(body?.category, "category", { max: 60 }) ?? "🍲 Przepisy",
    yieldG: optNumber(body?.yieldG, "yieldG", { min: 1, max: 99999 }),
  };
}

recipeRoutes.post("/", wrap(async (req, res) => {
  const { name, category, yieldG } = meta(req.body);
  const row = await withTransaction(async q => {
    const items = await loadItems(q, req.user.id, req.body, null);
    const { per100 } = nutrition(items, yieldG);
    const { rows } = await q(
      `INSERT INTO foods (source, user_id, name, category, is_dish, recipe_yield_g,
                          kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
       VALUES ('recipe', $1, $2, $3, true, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [req.user.id, name, category, yieldG, per100.kcal, per100.proteinG, per100.carbsG, per100.fatG, per100.fiberG, per100.saltG]
    );
    await saveItems(q, rows[0].id, items);
    return rows[0].id;
  });
  const { rows } = await query(`${SELECT_DISH} WHERE id = $1`, [row]);
  res.status(201).json((await withItems(rows, req.user.id))[0]);
}));

recipeRoutes.put("/:id", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const { name, category, yieldG } = meta(req.body);
  const ok = await withTransaction(async q => {
    const items = await loadItems(q, req.user.id, req.body, id);
    const { per100 } = nutrition(items, yieldG);
    const { rowCount } = await q(
      `UPDATE foods SET name = $3, category = $4, recipe_yield_g = $5,
              kcal = $6, protein_g = $7, carbs_g = $8, fat_g = $9, fiber_g = $10, salt_g = $11
        WHERE id = $1 AND user_id = $2 AND source = 'recipe'`,
      [id, req.user.id, name, category, yieldG, per100.kcal, per100.proteinG, per100.carbsG, per100.fatG, per100.fiberG, per100.saltG]
    );
    if (!rowCount) return false;
    await saveItems(q, id, items);
    return true;
  });
  if (!ok) return res.status(404).json({ error: "Nie ma takiego przepisu." });
  const { rows } = await query(`${SELECT_DISH} WHERE id = $1`, [id]);
  res.json((await withItems(rows, req.user.id))[0]);
}));

recipeRoutes.delete("/:id", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const used = await query("SELECT 1 FROM recipe_items WHERE food_id = $1 LIMIT 1", [id]);
  if (used.rows.length) throw new BadRequest("Ten przepis jest składnikiem innego — usuń go najpierw stamtąd.");
  const { rowCount } = await query(
    "DELETE FROM foods WHERE id = $1 AND user_id = $2 AND source = 'recipe'",
    [id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego przepisu." });
  res.json({ ok: true });
}));

// ── Oznaczanie gotowych dań ───────────────────────────────────────────────
// Dotyczy każdej widocznej pozycji katalogu, także wspólnej: aplikacja jest
// jednoosobowa, więc flaga jest globalna. Przy wielu kontach trzeba by ją
// przenieść do tabeli wiążącej użytkownika z produktem.
recipeRoutes.patch("/dish/:id", wrap(async (req, res) => {
  if (typeof req.body?.isDish !== "boolean") throw new BadRequest('Pole "isDish" musi być true albo false.');
  const { rows } = await query(
    `UPDATE foods SET is_dish = $3
      WHERE id = $1 AND (user_id IS NULL OR user_id = $2) AND source <> 'recipe'
      RETURNING id, is_dish AS "isDish"`,
    [reqId(req.params.id), req.user.id, req.body.isDish]
  );
  if (!rows.length) return res.status(404).json({ error: "Nie ma takiego produktu." });
  res.json(rows[0]);
}));
