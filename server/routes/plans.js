import express from "express";
import { query } from "../db.js";
import { wrap, reqId, reqDate, reqText, optNumber, BadRequest } from "../http.js";
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
// Pozycja dnia nie ma własnego identyfikatora — plan jest jednym JSON-em —
// więc wskazuje ją czwórka (plan, dzień tygodnia, rodzaj, numer w dniu).
// Rodzaj jest potrzebny, bo ćwiczenia i warianty cardio numerowane są osobno.
// Zapis wiążemy z datą kalendarzową: w przyszłym tygodniu ten sam dzień planu
// zaczyna się czysty, a historia zostaje — z niej bierze się podpowiedź
// „ostatnio tyle". Data przychodzi z przeglądarki, bo to jej strefa czasowa
// decyduje, co jest „dziś"; serwer stoi w UTC.

const KINDS = { ex: LIMITS.exercises, cardio: LIMITS.variants };

function entry(req) {
  const planId = reqId(req.body?.planId, "planId");
  const dayKey = reqText(req.body?.dayKey, "dayKey", { max: 3 });
  if (!DAY_KEYS.includes(dayKey)) throw new BadRequest("Nieznany dzień tygodnia.");
  const kind = req.body?.kind === undefined ? "ex" : req.body.kind;
  if (!Object.hasOwn(KINDS, kind)) throw new BadRequest("Nieznany rodzaj pozycji.");
  const exIndex = Number(req.body?.exIndex);
  if (!Number.isInteger(exIndex) || exIndex < 0 || exIndex >= KINDS[kind]) {
    throw new BadRequest("Nieprawidłowa pozycja w dniu.");
  }
  return { planId, dayKey, kind, exIndex, date: reqDate(req.body?.date, "date") };
}

// numeric wraca z pg jako tekst, a date jako obiekt Date w strefie serwera —
// rzutujemy w zapytaniu, żeby klient dostał liczbę i „RRRR-MM-DD".
const TODAY_COLS = `plan_id AS "planId", day_key AS "dayKey", kind, ex_index AS "exIndex",
                    done, max_load::float8 AS "maxLoad"`;

planRoutes.get("/log", wrap(async (req, res) => {
  const date = reqDate(req.query.date, "date");
  // `last` to ostatni zanotowany ciężar każdej pozycji sprzed dzisiaj —
  // punkt odniesienia na kolejny trening.
  const [today, last] = await Promise.all([
    query(`SELECT ${TODAY_COLS} FROM plan_exercise_logs WHERE user_id = $1 AND log_date = $2`,
      [req.user.id, date]),
    query(
      `SELECT DISTINCT ON (plan_id, day_key, kind, ex_index)
              plan_id AS "planId", day_key AS "dayKey", kind, ex_index AS "exIndex",
              max_load::float8 AS "maxLoad", to_char(log_date, 'YYYY-MM-DD') AS date
         FROM plan_exercise_logs
        WHERE user_id = $1 AND log_date < $2 AND max_load IS NOT NULL
        ORDER BY plan_id, day_key, kind, ex_index, log_date DESC`,
      [req.user.id, date]
    ),
  ]);
  res.json({ today: today.rows, last: last.rows });
}));

// Klient wysyła cały docelowy stan pozycji (odhaczenie + ciężar), a nie zmianę
// jednego pola — inaczej „brak pola" i „wyczyść pole" byłyby nie do odróżnienia.
planRoutes.post("/log", wrap(async (req, res) => {
  const { planId, dayKey, kind, exIndex, date } = entry(req);
  const done = req.body?.done === true;
  const maxLoad = optNumber(req.body?.maxLoad, "maxLoad", { min: 0, max: 9999 });

  if (!done && maxLoad === null) {
    await query(
      `DELETE FROM plan_exercise_logs
        WHERE user_id = $1 AND plan_id = $2 AND log_date = $3
          AND day_key = $4 AND kind = $5 AND ex_index = $6`,
      [req.user.id, planId, date, dayKey, kind, exIndex]
    );
    return res.json({ done: false, maxLoad: null });
  }

  const exName = reqText(req.body?.exName, "exName", { max: LIMITS.exName });
  // SELECT zamiast VALUES: wiersz powstaje tylko wtedy, gdy plan należy do tego
  // użytkownika — bez osobnego zapytania sprawdzającego.
  const { rowCount } = await query(
    `INSERT INTO plan_exercise_logs (user_id, plan_id, log_date, day_key, kind, ex_index, ex_name, done, max_load)
     SELECT $1, id, $3, $4, $5, $6, $7, $8, $9 FROM training_plans WHERE id = $2 AND user_id = $1
     ON CONFLICT (user_id, plan_id, log_date, day_key, kind, ex_index)
       DO UPDATE SET ex_name = EXCLUDED.ex_name, done = EXCLUDED.done, max_load = EXCLUDED.max_load`,
    [req.user.id, planId, date, dayKey, kind, exIndex, exName, done, maxLoad]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego planu." });
  res.json({ done, maxLoad });
}));
