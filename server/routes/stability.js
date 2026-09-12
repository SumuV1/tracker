import express from "express";
import { query } from "../db.js";
import { wrap, reqText, optText, reqNumber, optNumber, reqId, BadRequest } from "../http.js";

// Stabilizacja emocjonalna: zasady, check-iny, użycia technik.
// Etykiety stanów i treść technik żyją w frontend/src/stability.js — serwer
// zna tylko klucze, żeby nie przepuścić śmiecia do bazy.
export const stabilityRoutes = express.Router();

const STATE_KEYS = ["spokoj", "napiecie", "zlosc", "lek", "dolek", "nakrecenie"];
const TECHNIQUE_KEY = /^[a-z0-9-]{2,60}$/;

function reqStates(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new BadRequest('Pole "states" musi być listą.');
  const out = [...new Set(value.map(String))];
  for (const s of out) if (!STATE_KEYS.includes(s)) throw new BadRequest(`Nieznany stan: ${s}.`);
  return out;
}

// ── Zasady ──────────────────────────────────────────────────────────────
const SELECT_P = `SELECT id, text, source, states, note, position FROM principles`;

stabilityRoutes.get("/principles", wrap(async (req, res) => {
  const { rows } = await query(`${SELECT_P} WHERE user_id = $1 ORDER BY position, id`, [req.user.id]);
  res.json(rows);
}));

stabilityRoutes.post("/principles", wrap(async (req, res) => {
  const b = req.body || {};
  const { rows } = await query(
    `INSERT INTO principles (user_id, text, source, states, note, position)
     VALUES ($1, $2, $3, $4::text[], $5,
             COALESCE((SELECT max(position) + 1 FROM principles WHERE user_id = $1), 0))
     RETURNING id, text, source, states, note, position`,
    [req.user.id, reqText(b.text, "text", { max: 600 }), optText(b.source, "source", { max: 160 }),
     reqStates(b.states), optText(b.note, "note", { max: 600 })]
  );
  res.status(201).json(rows[0]);
}));

stabilityRoutes.patch("/principles/:id", wrap(async (req, res) => {
  const b = req.body || {};
  const has = k => Object.prototype.hasOwnProperty.call(b, k);
  const { rows } = await query(
    `UPDATE principles SET
        text   = COALESCE($3, text),
        source = CASE WHEN $4::bool THEN $5 ELSE source END,
        states = CASE WHEN $6::bool THEN $7::text[] ELSE states END,
        note   = CASE WHEN $8::bool THEN $9 ELSE note END
      WHERE id = $1 AND user_id = $2
      RETURNING id, text, source, states, note, position`,
    [reqId(req.params.id), req.user.id,
     has("text") ? reqText(b.text, "text", { max: 600 }) : null,
     has("source"), has("source") ? optText(b.source, "source", { max: 160 }) : null,
     has("states"), has("states") ? reqStates(b.states) : [],
     has("note"), has("note") ? optText(b.note, "note", { max: 600 }) : null]
  );
  if (!rows.length) return res.status(404).json({ error: "Nie ma takiej zasady." });
  res.json(rows[0]);
}));

stabilityRoutes.delete("/principles/:id", wrap(async (req, res) => {
  const { rowCount } = await query("DELETE FROM principles WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]);
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiej zasady." });
  res.json({ ok: true });
}));

// Zestaw startowy — sześć maksym, po jednej na stan, z uczciwą atrybucją.
// Celowo oznaczone jako przykład: strona ma działać od pierwszego wejścia, ale
// wartość jest w słowach użytkownika, nie w cudzych cytatach. Wgrywa się tylko
// na puste konto, żeby nie dublować.
const STARTER = [
  { text: "Nie rzeczy same niepokoją ludzi, lecz ich sądy o rzeczach.",
    source: "Epiktet, Encheiridion 5", states: ["napiecie", "lek"] },
  { text: "Największym lekarstwem na gniew jest zwłoka.",
    source: "Seneka, O gniewie II 29", states: ["zlosc"] },
  { text: "Częściej cierpimy w wyobraźni niż w rzeczywistości.",
    source: "Seneka, Listy 13", states: ["lek"] },
  { text: "O świcie, gdy niechętnie wstajesz, pomyśl: wstaję do pracy człowieka.",
    source: "Marek Aureliusz, Rozmyślania V 1", states: ["dolek"] },
  { text: "Znoś i powściągaj się.",
    source: "Epiktet (wg Gelliusza)", states: ["nakrecenie"] },
  { text: "Ile czasu zyskuje ten, kto nie ogląda się na to, co powiedział, zrobił czy pomyślał bliźni, lecz tylko na to, co sam robi.",
    source: "Marek Aureliusz, Rozmyślania IV 18", states: ["spokoj"] },
];
stabilityRoutes.post("/principles/seed", wrap(async (req, res) => {
  const { rows } = await query("SELECT 1 FROM principles WHERE user_id = $1 LIMIT 1", [req.user.id]);
  if (rows.length) throw new BadRequest("Masz już zasady — zestaw startowy jest tylko na puste konto.");
  for (const [i, p] of STARTER.entries()) {
    await query(
      `INSERT INTO principles (user_id, text, source, states, note, position) VALUES ($1,$2,$3,$4::text[],$5,$6)`,
      [req.user.id, p.text, p.source, p.states, "Przykład startowy — podmień na własne słowa albo usuń.", i]
    );
  }
  const all = await query(`${SELECT_P} WHERE user_id = $1 ORDER BY position, id`, [req.user.id]);
  res.status(201).json(all.rows);
}));

// ── Check-iny ───────────────────────────────────────────────────────────
const SELECT_C = `SELECT id, at, state, intensity, note FROM mood_checkins`;

stabilityRoutes.get("/checkins", wrap(async (req, res) => {
  const days = optNumber(req.query.days, "days", { min: 1, max: 366 }) ?? 14;
  const { rows } = await query(
    `${SELECT_C} WHERE user_id = $1 AND at > now() - ($2 || ' days')::interval ORDER BY at`,
    [req.user.id, String(days)]
  );
  res.json(rows);
}));

stabilityRoutes.post("/checkins", wrap(async (req, res) => {
  const b = req.body || {};
  const state = String(b.state ?? "");
  if (!STATE_KEYS.includes(state)) throw new BadRequest("Nieznany stan.");
  const intensity = reqNumber(b.intensity, "intensity", { min: 1, max: 5 });
  if (!Number.isInteger(intensity)) throw new BadRequest('Pole "intensity" musi być liczbą całkowitą 1–5.');
  const { rows } = await query(
    `INSERT INTO mood_checkins (user_id, state, intensity, note) VALUES ($1, $2, $3, $4)
     RETURNING id, at, state, intensity, note`,
    [req.user.id, state, intensity, optText(b.note, "note", { max: 400 })]
  );
  res.status(201).json(rows[0]);
}));

stabilityRoutes.delete("/checkins/:id", wrap(async (req, res) => {
  const { rowCount } = await query("DELETE FROM mood_checkins WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]);
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego wpisu." });
  res.json({ ok: true });
}));

// ── Użycia technik ──────────────────────────────────────────────────────
// Zwracamy licznik i ostatnie użycie per technika — tyle wystarcza, żeby przy
// technice napisać „użyta 4 razy w 30 dni, ostatnio wczoraj".
stabilityRoutes.get("/uses", wrap(async (req, res) => {
  const days = optNumber(req.query.days, "days", { min: 1, max: 366 }) ?? 30;
  const { rows } = await query(
    `SELECT technique, count(*)::int AS count, max(at) AS "lastAt"
       FROM technique_uses
      WHERE user_id = $1 AND at > now() - ($2 || ' days')::interval
      GROUP BY technique`,
    [req.user.id, String(days)]
  );
  res.json(rows);
}));

stabilityRoutes.post("/uses", wrap(async (req, res) => {
  const technique = String(req.body?.technique ?? "");
  if (!TECHNIQUE_KEY.test(technique)) throw new BadRequest("Nieprawidłowy identyfikator techniki.");
  const { rows } = await query(
    `INSERT INTO technique_uses (user_id, technique) VALUES ($1, $2) RETURNING id, technique, at`,
    [req.user.id, technique]
  );
  res.status(201).json(rows[0]);
}));
