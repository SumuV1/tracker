// ══════════════════════════════════════════════════════════════════
//  PLANY TRENINGOWE — pomocniki
// ══════════════════════════════════════════════════════════════════
// Same plany leżą w bazie (tabela training_plans) w formacie
// „sledzik-plan/1" opisanym w shared/planSchema.mjs. Przykładowy plan,
// który można wgrać jednym przyciskiem i który służy za wzór pliku do
// importu, to shared/plans/tyler-durden.json.

export const WEEKDAYS = [
  { key: "mon", label: "Poniedziałek", short: "Pon" },
  { key: "tue", label: "Wtorek", short: "Wt" },
  { key: "wed", label: "Środa", short: "Śr" },
  { key: "thu", label: "Czwartek", short: "Czw" },
  { key: "fri", label: "Piątek", short: "Pt" },
  { key: "sat", label: "Sobota", short: "Sob" },
  { key: "sun", label: "Niedziela", short: "Nd" },
];

// Date.getDay(): 0 = niedziela. Nasza tablica zaczyna się od poniedziałku.
export const todayKey = () => WEEKDAYS[(new Date().getDay() + 6) % 7].key;

// Tętno maksymalne wg Tanaki: dokładniejsze niż popularne 220 − wiek.
export const maxHeartRate = (age) => (age ? Math.round(208 - 0.7 * age) : null);
