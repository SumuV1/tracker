import express from "express";
import { query } from "../db.js";
import { wrap, reqDate, optNumber, reqId, BadRequest } from "../http.js";
import { deriveBodyFat } from "../bodyfat.js";

// Historia pomiarów ciała. Profil trzyma stan bieżący, ta tabela — przebieg
// w czasie. Bez niej metoda US Navy jest bezużyteczna: jej własna metodyka mówi,
// że przy błędzie ±3–4 p.p. sens ma trend, a nie pojedynczy odczyt.
export const measurementRoutes = express.Router();

const SELECT = `
  SELECT id, to_char(day,'YYYY-MM-DD') AS day, weight_kg AS "weightKg",
         neck_cm AS "neckCm", waist_cm AS "waistCm", hips_cm AS "hipsCm"
    FROM body_measurements`;

// Wzrost i płeć są w profilu, nie w pomiarze: zmieniają się raz na nigdy,
// a bez nich nie da się policzyć BMI ani tkanki tłuszczowej dla wiersza.
async function withDerived(rows, userId) {
  const { rows: p } = await query(
    `SELECT height_cm AS "heightCm", sex FROM profiles WHERE user_id = $1`,
    [userId]
  );
  const { heightCm, sex } = p[0] || {};
  return rows.map(r => {
    const bodyFat = heightCm ? deriveBodyFat({ ...r, heightCm, sex }) : null;
    const bmi = heightCm && r.weightKg
      ? Math.round((r.weightKg / (heightCm / 100) ** 2) * 100) / 100
      : null;
    return { ...r, bmi, bodyFatPct: bodyFat?.pct ?? null, leanMassKg: bodyFat?.leanMassKg ?? null };
  });
}

measurementRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE user_id = $1 ORDER BY day`, [req.user.id]);
  res.json(await withDerived(rows, req.user.id));
}));

// Jeden pomiar na dzień — stąd upsert. Kilka ważeń tego samego dnia to szum
// (sama pora dnia zmienia obwód talii o 1–2 cm), a nie dodatkowe dane.
measurementRoutes.post("/", wrap(async (req, res) => {
  const b = req.body || {};
  const day = reqDate(b.day, "day");
  const weightKg = optNumber(b.weightKg, "weightKg", { min: 1, max: 999 });
  const neckCm = optNumber(b.neckCm, "neckCm", { min: 20, max: 70 });
  const waistCm = optNumber(b.waistCm, "waistCm", { min: 40, max: 200 });
  const hipsCm = optNumber(b.hipsCm, "hipsCm", { min: 50, max: 200 });
  if (weightKg === null && neckCm === null && waistCm === null && hipsCm === null) {
    throw new BadRequest("Pomiar bez żadnej wartości nie ma sensu.");
  }

  const { rows } = await query(
    `INSERT INTO body_measurements (user_id, day, weight_kg, neck_cm, waist_cm, hips_cm)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id, day) DO UPDATE SET
       weight_kg = EXCLUDED.weight_kg, neck_cm = EXCLUDED.neck_cm,
       waist_cm  = EXCLUDED.waist_cm,  hips_cm = EXCLUDED.hips_cm
     RETURNING id, to_char(day,'YYYY-MM-DD') AS day, weight_kg AS "weightKg",
               neck_cm AS "neckCm", waist_cm AS "waistCm", hips_cm AS "hipsCm"`,
    [req.user.id, day, weightKg, neckCm, waistCm, hipsCm]
  );

  // Pomiar z dzisiaj to zarazem stan bieżący. Bez tego wykres pokazywałby
  // jedną wagę, a formularz profilu obok drugą.
  await query(
    `UPDATE profiles SET weight_kg = COALESCE($3, weight_kg), neck_cm = COALESCE($4, neck_cm),
            waist_cm = COALESCE($5, waist_cm), hips_cm = COALESCE($6, hips_cm), updated_at = now()
      WHERE user_id = $1 AND $2::date = current_date`,
    [req.user.id, day, weightKg, neckCm, waistCm, hipsCm]
  );

  const [row] = await withDerived(rows, req.user.id);
  res.status(201).json(row);
}));

measurementRoutes.delete("/:id", wrap(async (req, res) => {
  const { rowCount } = await query(
    "DELETE FROM body_measurements WHERE id = $1 AND user_id = $2",
    [reqId(req.params.id), req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: "Nie ma takiego pomiaru." });
  res.json({ ok: true });
}));
