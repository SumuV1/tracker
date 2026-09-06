import express from "express";
import { query } from "../db.js";
import { wrap, reqDate, reqText, reqNumber, optNumber, reqId, BadRequest } from "../http.js";

export const mealRoutes = express.Router();

const SELECT_ENTRY = `
  SELECT id, day, food_id AS "foodId", name, grams, kcal,
         protein_g AS "proteinG", carbs_g AS "carbsG",
         fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"
    FROM meal_entries`;

// Sumy dzienne za rok — to zapytanie zastępuje ściąganie całego dziennika
// do przeglądarki tylko po to, żeby narysować mapę roku.
mealRoutes.get("/daily-totals", wrap(async (req, res) => {
  const year = optNumber(req.query.year, "year", { min: 1970, max: 3000 });
  if (year === null || !Number.isInteger(year)) throw new BadRequest('Podaj "year".');
  const { rows } = await query(
    `SELECT day, sum(kcal) AS kcal
       FROM meal_entries
      WHERE user_id = $1 AND day >= make_date($2, 1, 1) AND day <= make_date($2, 12, 31)
      GROUP BY day ORDER BY day`,
    [req.user.id, year]
  );
  res.json(rows);
}));

mealRoutes.get("/", wrap(async (req, res) => {
  const day = reqDate(req.query.day, "day");
  const { rows } = await query(
    `${SELECT_ENTRY} WHERE user_id = $1 AND day = $2 ORDER BY id`,
    [req.user.id, day]
  );
  res.json(rows);
}));

mealRoutes.post("/", wrap(async (req, res) => {
  const b = req.body || {};
  const foodId = b.foodId === undefined || b.foodId === null ? null : reqId(b.foodId, "foodId");
  if (foodId !== null) {
    // Produkt musi istnieć i być dostępny dla tego użytkownika — inaczej
    // klucz obcy przepuściłby wskazanie na cudzy produkt prywatny.
    const { rows } = await query(
      "SELECT 1 FROM foods WHERE id = $1 AND (user_id IS NULL OR user_id = $2)",
      [foodId, req.user.id]
    );
    if (!rows.length) throw new BadRequest("Nie ma takiego produktu.");
  }
  const { rows } = await query(
    `INSERT INTO meal_entries
       (user_id, day, food_id, name, grams, kcal, protein_g, carbs_g, fat_g, fiber_g, salt_g)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id, day, food_id AS "foodId", name, grams, kcal,
               protein_g AS "proteinG", carbs_g AS "carbsG",
               fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"`,
    [
      req.user.id,
      reqDate(b.day, "day"),
      foodId,
      reqText(b.name, "name", { max: 160 }),
      reqNumber(b.grams, "grams", { min: 0.1, max: 100000 }),
      reqNumber(b.kcal, "kcal", { min: 0, max: 100000 }),
      optNumber(b.proteinG, "proteinG", { min: 0, max: 10000 }) ?? 0,
      optNumber(b.carbsG, "carbsG", { min: 0, max: 10000 }) ?? 0,
      optNumber(b.fatG, "fatG", { min: 0, max: 10000 }) ?? 0,
      optNumber(b.fiberG, "fiberG", { min: 0, max: 10000 }) ?? 0,
      optNumber(b.saltG, "saltG", { min: 0, max: 10000 }) ?? 0,
    ]
  );
  res.status(201).json(rows[0]);
}));

mealRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM meal_entries WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego wpisu." });
  res.json({ ok: true });
}));
