import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, optTime, reqId, reqDate, BadRequest } from "../http.js";

export const habitRoutes = express.Router();

// reminder_time jako "GG:MM" — typ time zwraca "06:30:00", czego frontend nie używa
const SELECT_HABIT = `
  SELECT id, name, category,
         to_char(reminder_time, 'HH24:MI') AS "reminderTime",
         position
    FROM habits`;

habitRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    `${SELECT_HABIT} WHERE user_id = $1 ORDER BY position, id`,
    [req.user.id]
  );
  res.json(rows);
}));

habitRoutes.post("/", wrap(async (req, res) => {
  const name = reqText(req.body?.name, "name", { max: 120 });
  const category = reqText(req.body?.category, "category", { max: 60 });
  const reminderTime = optTime(req.body?.reminderTime, "reminderTime");
  const { rows } = await query(
    `INSERT INTO habits (user_id, name, category, reminder_time, position)
     VALUES ($1, $2, $3, $4, COALESCE((SELECT max(position) + 1 FROM habits WHERE user_id = $1), 0))
     RETURNING id, name, category, to_char(reminder_time,'HH24:MI') AS "reminderTime", position`,
    [req.user.id, name, category, reminderTime]
  );
  res.status(201).json(rows[0]);
}));

habitRoutes.patch("/:id", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const b = req.body || {};
  // COALESCE zostawia pole nietknięte, gdy nie przyszło w żądaniu. Wyjątkiem
  // jest godzina: tam null to prawidłowa wartość ("usuń przypomnienie"),
  // więc odróżniamy brak klucza od jawnego wyczyszczenia.
  const clearTime = Object.prototype.hasOwnProperty.call(b, "reminderTime");
  const { rows } = await query(
    `UPDATE habits SET
        name          = COALESCE($3, name),
        category      = COALESCE($4, category),
        reminder_time = CASE WHEN $5 THEN $6::time ELSE reminder_time END
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, category, to_char(reminder_time,'HH24:MI') AS "reminderTime", position`,
    [
      id, req.user.id,
      optText(b.name, "name", { max: 120 }),
      optText(b.category, "category", { max: 60 }),
      clearTime,
      clearTime ? optTime(b.reminderTime, "reminderTime") : null,
    ]
  );
  if (!rows.length) return res.status(404).json({ error: "Nie ma takiego nawyku." });
  res.json(rows[0]);
}));

habitRoutes.delete("/:id", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const { rowCount } = await query(
    "DELETE FROM habits WHERE id = $1 AND user_id = $2",
    [id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego nawyku." });
  res.json({ ok: true });
}));

// ── Odhaczenia ────────────────────────────────────────────────────────────
// Zakres jest wymagany: widok roku pobiera 365 dni, widok tygodnia siedem.
habitRoutes.get("/logs", wrap(async (req, res) => {
  const from = reqDate(req.query.from, "from");
  const to = reqDate(req.query.to, "to");
  if (from > to) throw new BadRequest('"from" nie może być późniejsze niż "to".');
  const { rows } = await query(
    `SELECT l.habit_id AS "habitId", l.day
       FROM habit_logs l JOIN habits h ON h.id = l.habit_id
      WHERE h.user_id = $1 AND l.day BETWEEN $2 AND $3
      ORDER BY l.day`,
    [req.user.id, from, to]
  );
  res.json(rows);
}));

async function ownsHabit(userId, habitId) {
  const { rows } = await query(
    "SELECT 1 FROM habits WHERE id = $1 AND user_id = $2",
    [habitId, userId]
  );
  return rows.length > 0;
}

habitRoutes.put("/:id/logs/:day", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const day = reqDate(req.params.day, "day");
  if (!(await ownsHabit(req.user.id, id))) {
    return res.status(404).json({ error: "Nie ma takiego nawyku." });
  }
  await query(
    "INSERT INTO habit_logs (habit_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [id, day]
  );
  res.json({ habitId: id, day, done: true });
}));

habitRoutes.delete("/:id/logs/:day", wrap(async (req, res) => {
  const id = reqId(req.params.id);
  const day = reqDate(req.params.day, "day");
  if (!(await ownsHabit(req.user.id, id))) {
    return res.status(404).json({ error: "Nie ma takiego nawyku." });
  }
  await query("DELETE FROM habit_logs WHERE habit_id = $1 AND day = $2", [id, day]);
  res.json({ habitId: id, day, done: false });
}));
