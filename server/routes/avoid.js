import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqId, BadRequest } from "../http.js";

// „Lista niewolnika" — rzeczy, od których użytkownik trzyma się z daleka.
// Odwrotność nawyku: nawyk odhaczasz, tego nie ruszasz, więc nie ma tu
// żadnego dziennika odhaczeń, tylko sama lista.
export const avoidRoutes = express.Router();

const SELECT = `SELECT id, name, note, position FROM avoid_items`;

avoidRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    `${SELECT} WHERE user_id = $1 ORDER BY position, id`,
    [req.user.id]
  );
  res.json(rows);
}));

avoidRoutes.post("/", wrap(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO avoid_items (user_id, name, note, position)
     VALUES ($1, $2, $3, COALESCE((SELECT max(position) + 1 FROM avoid_items WHERE user_id = $1), 0))
     RETURNING id, name, note, position`,
    [
      req.user.id,
      reqText(req.body?.name, "name", { max: 200 }),
      optText(req.body?.note, "note", { max: 500 }),
    ]
  );
  res.status(201).json(rows[0]);
}));

avoidRoutes.patch("/:id", wrap(async (req, res) => {
  const b = req.body || {};
  const name = b.name === undefined ? null : reqText(b.name, "name", { max: 200 });
  // Pusta notatka to jej skasowanie, dlatego undefined i "" znaczą co innego.
  const note = b.note === undefined ? undefined : optText(b.note, "note", { max: 500 });
  if (name === null && note === undefined) throw new BadRequest("Nie ma czego zmienić.");
  const { rows } = await query(
    `UPDATE avoid_items
        SET name = COALESCE($3, name),
            note = CASE WHEN $4::bool THEN $5 ELSE note END
      WHERE id = $1 AND user_id = $2
      RETURNING id, name, note, position`,
    [reqId(req.params.id), req.user.id, name, note !== undefined, note ?? null]
  );
  if (!rows.length) return res.status(404).json({ error: "Nie ma takiej pozycji." });
  res.json(rows[0]);
}));

avoidRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM avoid_items WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiej pozycji." });
  res.json({ ok: true });
}));
