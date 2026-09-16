import express from "express";
import { query } from "../db.js";
import { wrap, reqId, BadRequest } from "../http.js";
import { validatePlan } from "../../shared/planSchema.mjs";

// Plany treningowe. Serwer nie zna struktury planu poza tym, co sprawdza
// `validatePlan` — ten sam walidator, który przeglądarka uruchamia przed
// wysłaniem. Tu jest po to, żeby do bazy nie trafiło nic, czego sylwetka
// nie potrafi wyświetlić (nieznany mięsień, brak dnia, obcy format).
export const planRoutes = express.Router();

const SELECT = `SELECT id, name, data, created_at AS "createdAt", updated_at AS "updatedAt" FROM training_plans`;

function checked(body) {
  const { errors, plan } = validatePlan(body);
  if (errors.length) throw new BadRequest("Plan ma błędy: " + errors.slice(0, 5).join("; ") + (errors.length > 5 ? ` (i ${errors.length - 5} więcej)` : ""));
  return plan;
}

planRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE user_id = $1 ORDER BY id`, [req.user.id]);
  res.json(rows);
}));

planRoutes.post("/", wrap(async (req, res) => {
  const plan = checked(req.body);
  const { rows } = await query(
    `INSERT INTO training_plans (user_id, name, data) VALUES ($1, $2, $3)
     RETURNING id, name, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [req.user.id, plan.name, JSON.stringify(plan)]
  );
  res.status(201).json(rows[0]);
}));

planRoutes.put("/:id", wrap(async (req, res) => {
  const plan = checked(req.body);
  const { rows } = await query(
    `UPDATE training_plans SET name = $3, data = $4, updated_at = now()
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, data, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [reqId(req.params.id), req.user.id, plan.name, JSON.stringify(plan)]
  );
  if (!rows.length) return res.status(404).json({ error: "Nie ma takiego planu." });
  res.json(rows[0]);
}));

planRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM training_plans WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego planu." });
  res.json({ ok: true });
}));
