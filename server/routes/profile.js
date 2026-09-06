import express from "express";
import { query } from "../db.js";
import { wrap, optNumber, BadRequest } from "../http.js";

export const profileRoutes = express.Router();

// Współczynniki aktywności — indeks jest tym, co leży w profiles.activity.
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];

// Wzory trzymamy po stronie serwera, żeby liczby na wykresach, w kaflach
// i w panelu „Jak to policzono" pochodziły z jednego miejsca.
function derive(p) {
  const { weightKg: w, heightCm: h, ageYears: age, sex, activity } = p;
  if (!w || !h || !age || !sex) {
    return { bmi: null, bmr: null, tdee: null, activityFactor: null, targets: null };
  }
  const bmi = w / (h / 100) ** 2;
  // Mifflin-St Jeor
  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === "M" ? 5 : -161);
  const factor = ACTIVITY_FACTORS[activity] ?? ACTIVITY_FACTORS[1];
  const tdee = Math.round(bmr * factor);
  return {
    bmi: Math.round(bmi * 100) / 100,
    bmr: Math.round(bmr),
    tdee,
    activityFactor: factor,
    targets: {
      // Rozkład makroskładników 30/45/25 % energii; białko i węglowodany
      // dają 4 kcal/g, tłuszcz 9 kcal/g.
      kcal: tdee,
      proteinG: Math.round((tdee * 0.30) / 4),
      carbsG: Math.round((tdee * 0.45) / 4),
      fatG: Math.round((tdee * 0.25) / 9),
      // Błonnik: zalecenie ~14 g na 1000 kcal. Sól to nie cel, tylko górny
      // limit WHO — interfejs pokazuje ją inaczej niż pozostałe pozycje.
      fiberG: Math.max(25, Math.round((tdee / 1000) * 14)),
      saltG: 5,
    },
  };
}

const SELECT_PROFILE = `
  SELECT weight_kg AS "weightKg", height_cm AS "heightCm",
         age_years AS "ageYears", sex, activity
    FROM profiles WHERE user_id = $1`;

const EMPTY = { weightKg: null, heightCm: null, ageYears: null, sex: "M", activity: 1 };

profileRoutes.get("/", wrap(async (req, res) => {
  const { rows } = await query(SELECT_PROFILE, [req.user.id]);
  const profile = rows[0] || EMPTY;
  res.json({ ...profile, ...derive(profile) });
}));

profileRoutes.put("/", wrap(async (req, res) => {
  const b = req.body || {};
  const weightKg = optNumber(b.weightKg, "weightKg", { min: 1, max: 999 });
  const heightCm = optNumber(b.heightCm, "heightCm", { min: 1, max: 999 });
  const ageYears = optNumber(b.ageYears, "ageYears", { min: 1, max: 129 });
  const sex = b.sex === "F" ? "F" : b.sex === "M" ? "M" : null;
  if (b.sex !== undefined && sex === null) throw new BadRequest('Pole "sex" musi być "M" albo "F".');
  const activity = optNumber(b.activity, "activity", { min: 0, max: 4 });
  if (activity !== null && !Number.isInteger(activity)) {
    throw new BadRequest('Pole "activity" musi być liczbą całkowitą 0–4.');
  }

  const { rows } = await query(
    `INSERT INTO profiles (user_id, weight_kg, height_cm, age_years, sex, activity, updated_at)
     VALUES ($1, $2, $3, $4, COALESCE($5,'M'), COALESCE($6, 1), now())
     ON CONFLICT (user_id) DO UPDATE SET
       weight_kg  = EXCLUDED.weight_kg,
       height_cm  = EXCLUDED.height_cm,
       age_years  = EXCLUDED.age_years,
       sex        = EXCLUDED.sex,
       activity   = EXCLUDED.activity,
       updated_at = now()
     RETURNING weight_kg AS "weightKg", height_cm AS "heightCm",
               age_years AS "ageYears", sex, activity`,
    [req.user.id, weightKg, heightCm, ageYears, sex, activity]
  );
  res.json({ ...rows[0], ...derive(rows[0]) });
}));
