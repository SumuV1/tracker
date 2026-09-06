import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqId } from "../http.js";

export const anchorRoutes = express.Router();

anchorRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT id, emoji, label, position FROM anchors
      WHERE user_id = $1 ORDER BY position, id`,
    [req.user.id]
  );
  res.json(rows);
}));

anchorRoutes.post("/", wrap(async (req, res) => {
  const { rows } = await query(
    `INSERT INTO anchors (user_id, emoji, label, position)
     VALUES ($1, $2, $3, COALESCE((SELECT max(position) + 1 FROM anchors WHERE user_id = $1), 0))
     RETURNING id, emoji, label, position`,
    [
      req.user.id,
      optText(req.body?.emoji, "emoji", { max: 8 }) ?? "🎵",
      reqText(req.body?.label, "label", { max: 200 }),
    ]
  );
  res.status(201).json(rows[0]);
}));

anchorRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM anchors WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiej kotwicy." });
  res.json({ ok: true });
}));
