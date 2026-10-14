import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqDate, reqId, BadRequest } from "../http.js";

// Cele ogólne — po jednym albo kilka na kategorię nawyków. Cel nie ma
// własnego dziennika: o postępie mówią odhaczenia nawyków, które pod niego
// podpięto, a te frontend i tak trzyma w pamięci.
export const goalRoutes = express.Router();

// Podpięte nawyki jako tablica identyfikatorów — przy kilkunastu celach
// osobne zapytanie na każdy byłoby zwykłym N+1. Termin jako tekst "RRRR-MM-DD",
// tak jak dni w pozostałych trasach.
const SELECT_GOAL = `
  SELECT g.id, g.name, g.category, g.note,
         to_char(g.deadline, 'YYYY-MM-DD') AS deadline,
         g.achieved_at AS "achievedAt", g.position,
         COALESCE(array_agg(gh.habit_id ORDER BY gh.habit_id)
                  FILTER (WHERE gh.habit_id IS NOT NULL), '{}') AS "habitIds"
    FROM goals g LEFT JOIN goal_habits gh ON gh.goal_id = g.id`;

// Parser bigint z db.js obejmuje pojedynczą wartość, nie tablicę — bigint[]
// przychodzi jako ["12","15"]. Bez zamiany na liczby `habitIds.includes(id)`
// we froncie zawsze dawało false i żaden nawyk nie wyglądał na podpięty.
const norm = g => ({ ...g, habitIds: g.habitIds.map(Number) });

async function oneGoal(userId, id) {
  const { rows } = await query(
    `${SELECT_GOAL} WHERE g.id = $1 AND g.user_id = $2 GROUP BY g.id`,
    [id, userId]
  );
  return rows[0] ? norm(rows[0]) : null;
}

// Termin: brak klucza = bez zmian, "" albo null = usuń termin.
const optDeadline = v => (v === undefined || v === null || v === "" ? null : reqDate(v, "deadline"));

goalRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    `${SELECT_GOAL} WHERE g.user_id = $1 GROUP BY g.id ORDER BY g.position, g.id`,
    [req.user.id]
  );
  res.json(rows.map(norm));
}));

goalRoutes.post("/", wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO goals (user_id, name, category, note, deadline, position)
     VALUES ($1, $2, $3, $4, $5, COALESCE((SELECT max(position) + 1 FROM goals WHERE user_id = $1), 0))
     RETURNING id`,
    [
      req.user.id,
      reqText(b.name, "name", { max: 160 }),
      reqText(b.category, "category", { max: 60 }),
      optText(b.note, "note", { max: 500 }),
      optDeadline(b.deadline),
    ]
  );
  res.status(201).json(await oneGoal(req.user.id, rows[0].id));
}));

goalRoutes.patch("/:id", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const b = req.body || {};
  const has = k => Object.prototype.hasOwnProperty.call(b, k);
  // Notatka i termin dają się wyczyścić, więc tak jak przy godzinie nawyku
  // odróżniamy brak klucza od jawnego "" / null.
  if (has("achieved") && typeof b.achieved !== "boolean") {
    throw new BadRequest('Pole "achieved" musi być prawdą albo fałszem.');
  }
  const name = optText(b.name, "name", { max: 160 });
  const category = optText(b.category, "category", { max: 60 });
  if (name === null && category === null && !has("note") && !has("deadline") && !has("achieved")) {
    throw new BadRequest("Nie ma czego zmienić.");
  }
  const { rowCount } = await query(
    `UPDATE goals SET
        name        = COALESCE($3, name),
        category    = COALESCE($4, category),
        note        = CASE WHEN $5 THEN $6 ELSE note END,
        deadline    = CASE WHEN $7 THEN $8::date ELSE deadline END,
        -- Ponowne „osiągnięty" nie przesuwa daty pierwszego osiągnięcia.
        achieved_at = CASE WHEN $9 THEN (CASE WHEN $10 THEN COALESCE(achieved_at, now()) END)
                           ELSE achieved_at END
      WHERE id = $1 AND user_id = $2`,
    [
      id, req.user.id, name, category,
      has("note"), has("note") ? optText(b.note, "note", { max: 500 }) : null,
      has("deadline"), has("deadline") ? optDeadline(b.deadline) : null,
      has("achieved"), b.achieved === true,
    ]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego celu." });
  res.json(await oneGoal(req.user.id, id));
}));

goalRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM goals WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego celu." });
  res.json({ ok: true });
}));

// ── Podpinanie nawyków ────────────────────────────────────────────────────
// Klucz obcy pilnuje tylko, że cel i nawyk istnieją — nie, że należą do tego
// samego konta. Bez sprawdzenia obu stron dałoby się podpiąć cudzy nawyk pod
// własny cel i czytać jego identyfikator w odpowiedzi.
async function ownsBoth(userId, goalId, habitId) {
  const { rows } = await query(
    `SELECT (SELECT 1 FROM goals  WHERE id = $1 AND user_id = $3) AS g,
            (SELECT 1 FROM habits WHERE id = $2 AND user_id = $3) AS h`,
    [goalId, habitId, userId]
  );
  return rows[0].g && rows[0].h;
}

goalRoutes.put("/:id/habits/:habitId", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const habitId = reqId(req.params.habitId, "habitId");
  if (!(await ownsBoth(req.user.id, id, habitId))) {
    return res.status(404).json({ error: "Nie ma takiego celu albo nawyku." });
  }
  await query(
    "INSERT INTO goal_habits (goal_id, habit_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [id, habitId]
  );
  res.json(await oneGoal(req.user.id, id));
}));

goalRoutes.delete("/:id/habits/:habitId", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const habitId = reqId(req.params.habitId, "habitId");
  if (!(await ownsBoth(req.user.id, id, habitId))) {
    return res.status(404).json({ error: "Nie ma takiego celu albo nawyku." });
  }
  await query("DELETE FROM goal_habits WHERE goal_id = $1 AND habit_id = $2", [id, habitId]);
  res.json(await oneGoal(req.user.id, id));
}));
