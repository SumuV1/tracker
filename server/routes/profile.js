import express from "express";
import { query } from "../db.js";
import { wrap, optNumber, BadRequest } from "../http.js";

export const profileRoutes = express.Router();

// Współczynniki aktywności — indeks jest tym, co leży w profiles.activity.
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9];

// Wzory trzymamy po stronie serwera, żeby liczby na wykresach, w kaflach
// i w panelu „Jak to policzono" pochodziły z jednego miejsca.
// Metoda US Navy (Hodgdon–Beckett), wariant metryczny. Zwraca null zawsze, gdy
// wynik nie ma prawa być traktowany serio: brakuje wymiaru, argument logarytmu
// wychodzi niedodatni albo pomiary leżą poza zakresem, na którym model był
// kalibrowany. Cicho zwrócona liczba byłaby tu gorsza niż jej brak.
const LOG10 = Math.log10;
const inRange = (v, lo, hi) => typeof v === "number" && v >= lo && v <= hi;

function bodyFatPercent({ sex, heightCm: h, neckCm: neck, waistCm: waist, hipsCm: hips }) {
  if (!inRange(h, 120, 250) || !inRange(neck, 20, 70) || !inRange(waist, 40, 200)) return null;
  let pct;
  if (sex === "F") {
    if (!inRange(hips, 50, 200)) return null;
    const arg = waist + hips - neck;
    if (arg <= 0) return null;
    pct = 495 / (1.29579 - 0.35004 * LOG10(arg) + 0.221 * LOG10(h)) - 450;
  } else {
    const arg = waist - neck;
    if (arg <= 0) return null;
    pct = 495 / (1.0324 - 0.19077 * LOG10(arg) + 0.15456 * LOG10(h)) - 450;
  }
  // Wynik poza 0–70 % oznacza błąd pomiaru albo cale wpisane jako centymetry.
  return Number.isFinite(pct) && pct > 0 && pct <= 70 ? pct : null;
}

// Progi ACE. Orientacyjne, nie diagnostyczne — stąd sama etykieta bez oceny.
const BF_CATEGORIES = {
  M: [[6, "Tłuszcz niezbędny"], [14, "Sportowcy"], [18, "Fitness"], [25, "Akceptowalny"], [Infinity, "Otyłość"]],
  F: [[14, "Tłuszcz niezbędny"], [21, "Sportowcy"], [25, "Fitness"], [32, "Akceptowalny"], [Infinity, "Otyłość"]],
};
// Masa ciała po dojściu do zadanego procentu przy niezmienionej masie
// beztłuszczowej. Założenie zawodzi przy dużym deficycie bez treningu oporowego.
const BF_MILESTONES = { M: [24, 17, 13], F: [31, 24, 20] };
const round1 = v => Math.round(v * 10) / 10;

function deriveBodyFat(p) {
  const pct = bodyFatPercent(p);
  if (pct === null) return null;
  const w = p.weightKg;
  const category = (BF_CATEGORIES[p.sex] || BF_CATEGORIES.M).find(([max]) => pct < max)[1];
  const fatMassKg = w ? round1((w * pct) / 100) : null;
  const leanMassKg = w ? round1(w - (w * pct) / 100) : null;
  return {
    pct: round1(pct),
    category,
    fatMassKg,
    leanMassKg,
    // Zaokrąglamy dopiero tutaj — rachunek idzie na pełnej precyzji.
    milestones: leanMassKg === null ? [] : (BF_MILESTONES[p.sex] || BF_MILESTONES.M)
      .filter(t => t < pct)
      .map(t => ({ pct: t, weightKg: round1((w - (w * pct) / 100) / (1 - t / 100)) })),
  };
}

function derive(p) {
  const { weightKg: w, heightCm: h, ageYears: age, sex, activity } = p;
  const bodyFat = deriveBodyFat(p);
  if (!w || !h || !age || !sex) {
    return { bmi: null, bmr: null, tdee: null, activityFactor: null, targets: null, bodyFat };
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
    bodyFat,
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
         age_years AS "ageYears", sex, activity,
         neck_cm AS "neckCm", waist_cm AS "waistCm", hips_cm AS "hipsCm"
    FROM profiles WHERE user_id = $1`;

const EMPTY = {
  weightKg: null, heightCm: null, ageYears: null, sex: "M", activity: 1,
  neckCm: null, waistCm: null, hipsCm: null,
};

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
  // Granice takie same jak w CHECK-ach tabeli, żeby baza nie musiała odrzucać
  // tego, co przeszłoby walidację trasy.
  const neckCm = optNumber(b.neckCm, "neckCm", { min: 20, max: 70 });
  const waistCm = optNumber(b.waistCm, "waistCm", { min: 40, max: 200 });
  const hipsCm = optNumber(b.hipsCm, "hipsCm", { min: 50, max: 200 });

  const { rows } = await query(
    `INSERT INTO profiles (user_id, weight_kg, height_cm, age_years, sex, activity,
                           neck_cm, waist_cm, hips_cm, updated_at)
     VALUES ($1, $2, $3, $4, COALESCE($5,'M'), COALESCE($6, 1), $7, $8, $9, now())
     ON CONFLICT (user_id) DO UPDATE SET
       weight_kg  = EXCLUDED.weight_kg,
       height_cm  = EXCLUDED.height_cm,
       age_years  = EXCLUDED.age_years,
       sex        = EXCLUDED.sex,
       activity   = EXCLUDED.activity,
       neck_cm    = EXCLUDED.neck_cm,
       waist_cm   = EXCLUDED.waist_cm,
       hips_cm    = EXCLUDED.hips_cm,
       updated_at = now()
     RETURNING weight_kg AS "weightKg", height_cm AS "heightCm",
               age_years AS "ageYears", sex, activity,
               neck_cm AS "neckCm", waist_cm AS "waistCm", hips_cm AS "hipsCm"`,
    [req.user.id, weightKg, heightCm, ageYears, sex, activity, neckCm, waistCm, hipsCm]
  );
  res.json({ ...rows[0], ...derive(rows[0]) });
}));
