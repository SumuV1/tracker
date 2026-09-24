import express from "express";
import { query } from "../db.js";
import { wrap, reqId, reqDate, reqText, BadRequest } from "../http.js";
import { validatePlan, DAY_KEYS, LIMITS } from "../../shared/planSchema.mjs";

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

// ── Odhaczanie ćwiczeń ────────────────────────────────────────────────────
// Ćwiczenie nie ma własnego identyfikatora — plan jest jednym JSON-em — więc
// wskazujemy je trójką (plan, dzień tygodnia, pozycja w dniu), a odhaczenie
// wiążemy z datą kalendarzową. Dzięki temu w przyszłym tygodniu ten sam dzień
// zaczyna się czysty, a przy okazji zostaje historia, co i kiedy zrobione.
// Data przychodzi z przeglądarki, bo to jej strefa czasowa decyduje, co jest
// „dziś" — serwer stoi w UTC.

function where(req) {
  const planId = reqId(req.body?.planId, "planId");
  const dayKey = reqText(req.body?.dayKey, "dayKey", { max: 3 });
  if (!DAY_KEYS.includes(dayKey)) throw new BadRequest("Nieznany dzień tygodnia.");
  const exIndex = Number(req.body?.exIndex);
  if (!Number.isInteger(exIndex) || exIndex < 0 || exIndex >= LIMITS.exercises) {
    throw new BadRequest("Nieprawidłowa pozycja ćwiczenia.");
  }
  return { planId, dayKey, exIndex, date: reqDate(req.body?.date, "date") };
}

planRoutes.get("/log", wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT plan_id AS "planId", day_key AS "dayKey", ex_index AS "exIndex", ex_name AS "exName"
       FROM plan_exercise_logs WHERE user_id = $1 AND log_date = $2`,
    [req.user.id, reqDate(req.query.date, "date")]
  );
  res.json(rows);
}));

planRoutes.post("/log", wrap(async (req, res) => {
  const { planId, dayKey, exIndex, date } = where(req);

  if (req.body?.done === false) {
    await query(
      `DELETE FROM plan_exercise_logs
        WHERE user_id = $1 AND plan_id = $2 AND log_date = $3 AND day_key = $4 AND ex_index = $5`,
      [req.user.id, planId, date, dayKey, exIndex]
    );
    return res.json({ done: false });
  }

  const exName = reqText(req.body?.exName, "exName", { max: LIMITS.exName });
  // SELECT zamiast VALUES: wiersz powstaje tylko wtedy, gdy plan należy do tego
  // użytkownika — bez osobnego zapytania sprawdzającego.
  const { rowCount } = await query(
    `INSERT INTO plan_exercise_logs (user_id, plan_id, log_date, day_key, ex_index, ex_name)
     SELECT $1, id, $3, $4, $5, $6 FROM training_plans WHERE id = $2 AND user_id = $1
     ON CONFLICT (user_id, plan_id, log_date, day_key, ex_index)
       DO UPDATE SET ex_name = EXCLUDED.ex_name`,
    [req.user.id, planId, date, dayKey, exIndex, exName]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego planu." });
  res.json({ done: true });
}));
