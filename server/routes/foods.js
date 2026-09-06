import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqNumber, optNumber, reqId } from "../http.js";

export const foodRoutes = express.Router();

const SELECT_FOOD = `
  SELECT id, source, name, category,
         kcal, protein_g AS "proteinG", carbs_g AS "carbsG",
         fat_g AS "fatG", fiber_g AS "fiberG", salt_g AS "saltG"
    FROM foods`;

// Widoczne są produkty wspólne (builtin/off) oraz własne produkty użytkownika.
foodRoutes.get("/", wrap(async (req, res) => {
  const q = optText(req.query.q, "q", { max: 100 });
  const category = optText(req.query.category, "category", { max: 60 });
  const limit = optNumber(req.query.limit, "limit", { min: 1, max: 500 }) ?? 200;

  const { rows } = await query(
    `${SELECT_FOOD}
      WHERE (user_id IS NULL OR user_id = $1)
        AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
        AND ($3::text IS NULL OR category = $3)
      ORDER BY (source = 'custom') DESC, name
      LIMIT $4`,
    [req.user.id, q, category, limit]
  );
  res.json(rows);
}));

foodRoutes.get("/categories", wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT category, count(*)::int AS count
       FROM foods
      WHERE category IS NOT NULL AND (user_id IS NULL OR user_id = $1)
      GROUP BY category ORDER BY category`,
    [req.user.id]
  );
  res.json(rows);
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
      optText(b.category, "category", { max: 60 }) ?? "⭐ Własne produkty",
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

// Kasować można wyłącznie własne produkty — wspólnych nie ruszamy.
foodRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM foods WHERE id = $1 AND user_id = $2 AND source = 'custom'",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego własnego produktu." });
  res.json({ ok: true });
}));
