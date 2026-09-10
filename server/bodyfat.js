// Skład ciała — metoda US Navy (Hodgdon–Beckett), wariant metryczny.
// Osobny moduł, bo z tych samych wzorów korzysta i profil (stan bieżący),
// i historia pomiarów (trend). Wzór ma żyć w jednym miejscu.
// Metoda US Navy (Hodgdon–Beckett), wariant metryczny. Zwraca null zawsze, gdy
// wynik nie ma prawa być traktowany serio: brakuje wymiaru, argument logarytmu
// wychodzi niedodatni albo pomiary leżą poza zakresem, na którym model był
// kalibrowany. Cicho zwrócona liczba byłaby tu gorsza niż jej brak.
export const LOG10 = Math.log10;
const inRange = (v, lo, hi) => typeof v === "number" && v >= lo && v <= hi;

export function bodyFatPercent({ sex, heightCm: h, neckCm: neck, waistCm: waist, hipsCm: hips }) {
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
export const round1 = v => Math.round(v * 10) / 10;

export function deriveBodyFat(p) {
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
