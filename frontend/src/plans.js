// ══════════════════════════════════════════════════════════════════
//  PLANY TRENINGOWE
// ══════════════════════════════════════════════════════════════════
// Plan to tydzień treningowy: każdy dzień ma swoją partię, listę ćwiczeń
// i mięśnie, które podświetlają się na sylwetce. Identyfikatory w `primary`
// i `support` muszą pokrywać się z kluczami MUSCLES w App.jsx.
//
//   primary — partia, pod którą ułożony jest dzień
//   support — mięśnie realnie pracujące w tych ćwiczeniach jako wspomagające
//             albo stabilizujące; podświetlają się słabiej

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

export const TRAINING_PLANS = [
  {
    id: "tyler-durden",
    name: "Tyler Durden",
    summary: "Cztery dni siłowe na podziale partii, dwa dni cardio, niedziela wolna.",
    note:
      "Przelicznik 1 lb = 0,4536 kg. Obciążenia zaokrąglone do kombinacji " +
      "osiągalnych standardowymi talerzami (co 1,25 / 2,5 kg) i typowymi stosami " +
      "maszyn (co 2,5 / 5 kg); odchyłka od przeliczenia nie przekracza 1,5 kg.",
    days: {
      mon: {
        title: "Klatka piersiowa",
        short: "Klatka",
        primary: ["pectoralis"],
        support: ["deltoid_front", "triceps", "serratus"],
        exercises: [
          {
            name: "Pompki",
            sets: "3 × 25",
            load: "masa ciała",
            desc:
              "Podpór przodem, dłonie nieco szerzej niż barki, tułów w linii prostej od głowy do pięt. " +
              "Klatka schodzi tuż nad podłogę, łokcie pod kątem ok. 45° do tułowia, nie rozłożone na boki.",
          },
          {
            name: "Wyciskanie na ławce płaskiej",
            sets: "25 / 15 / 8",
            load: "75 / 87,5 / 102,5 kg",
            desc:
              "Chwyt nieco szerszy od barków, łopatki ściągnięte i dociśnięte do ławki, stopy stabilnie " +
              "na podłodze. Sztanga schodzi do dolnej części klatki, kontrolowanie, bez odbijania od żeber.",
          },
          {
            name: "Wyciskanie na maszynie (Nautilus)",
            sets: "3 × 15",
            load: "35 / 45 / 60 kg",
            desc:
              "Tor ruchu wymuszony, mniejsze wymagania stabilizacyjne. Siedzisko ustaw tak, żeby uchwyty " +
              "były na wysokości środka klatki.",
          },
          {
            name: "Wyciskanie na ławce skośnej",
            sets: "3 × 15",
            load: "35 / 45 / 60 kg",
            desc:
              "Oparcie 30–45° głową w górę. Akcentuje górne pasmo mięśnia piersiowego i przednie aktony naramiennych.",
          },
          {
            name: "Pec deck (rozpiętki na maszynie)",
            sets: "3 × 15",
            load: "27,5 / 32,5 / 35 kg",
            desc:
              "Ruch izolowany: przywodzenie ramion w płaszczyźnie poziomej z lekko ugiętymi łokciami. " +
              "Kontrolowane rozciągnięcie w fazie negatywnej, ściśnięcie klatki na końcu ruchu.",
          },
        ],
      },
      tue: {
        title: "Plecy",
        short: "Plecy",
        primary: ["latissimus", "trapezius"],
        support: ["infraspinatus", "erector_spinae", "deltoid_back", "biceps", "forearm_front"],
        remark: "Plan nie precyzuje liczby powtórzeń dla tego dnia.",
        exercises: [
          {
            name: "Podciąganie",
            sets: "3 serie do upadku",
            load: "masa ciała · cel 25 powtórzeń łącznie",
            desc:
              "Chwyt nachwytem szerszy od barków. Ciągniesz łokciami w dół i do tyłu, klatka do drążka, " +
              "bez bujania bioder. Pełny wyprost ramion na dole.",
          },
          {
            name: "Wiosłowanie siedząc (wyciąg dolny)",
            sets: "3 serie",
            load: "35 / 37,5 / 40 kg",
            desc:
              "Plecy proste, kolana lekko ugięte. Uchwyt do dolnych żeber, łopatki ściągane na końcu ruchu. " +
              "Tułów nie odchyla się do tyłu więcej niż o kilka stopni.",
          },
          {
            name: "Ściąganie drążka wyciągu górnego",
            sets: "3 serie",
            load: "60 / 67,5 / 75 kg",
            desc:
              "Drążek do górnej części klatki, klatka wypchnięta, łokcie prowadzone w dół wzdłuż tułowia. Nigdy za kark.",
          },
          {
            name: "Wiosłowanie drążkiem T",
            sets: "3 serie",
            load: "35 / 42,5 / 50 kg",
            desc:
              "Tułów pochylony ok. 45°, kręgosłup neutralny, ciąg do brzucha. Największe obciążenie osiowe " +
              "spośród wszystkich wiosłowań — technika przed ciężarem.",
          },
        ],
      },
      wed: {
        title: "Barki",
        short: "Barki",
        primary: ["deltoid_front", "deltoid_back"],
        support: ["trapezius", "triceps"],
        remark:
          "Oryginał podaje jedną liczbę na ćwiczenie — potraktowana jako ciężar sumaryczny pary hantli, rozdzielony na sztukę.",
        exercises: [
          {
            name: "Wyciskanie Arnoldowe",
            sets: "3 serie",
            load: "2 × 12,5 kg",
            desc:
              "Siedząc, hantle na wysokości barków, dłonie skierowane do siebie. W trakcie wyciskania obracasz " +
              "nadgarstki o 180°, kończysz z dłońmi na zewnątrz. Rotacja angażuje przedni i boczny akton naramiennego w jednym ruchu.",
          },
          {
            name: "Unoszenie ramion bokiem",
            sets: "3 serie",
            load: "2 × 7 kg",
            desc:
              "Hantle wzdłuż tułowia, łokcie minimalnie ugięte i stale wyżej niż nadgarstki. Unoszenie do wysokości " +
              "barków, bez zarzucania i bez pracy tułowia. Izolacja aktonu bocznego.",
          },
          {
            name: "Unoszenie ramion w przód",
            sets: "3 serie",
            load: "2 × 5,5 kg",
            desc: "Hantle lub sztanga unoszone przed sobą do wysokości oczu. Akton przedni.",
          },
        ],
      },
      thu: {
        title: "Biceps i triceps",
        short: "Ramiona",
        primary: ["biceps", "triceps"],
        support: ["forearm_front", "forearm_back"],
        remark: "Plan nie precyzuje liczby powtórzeń dla tego dnia.",
        exercises: [
          {
            name: "Uginanie na modlitewniku (preacher curl)",
            sets: "3 serie",
            load: "27,5 / 35 / 42,5 kg",
            desc:
              "Ramiona oparte o skośną poduszkę, co eliminuje bujanie i pracę barków. Największe napięcie " +
              "w dolnej, rozciągniętej fazie — nie prostuj łokcia gwałtownie.",
          },
          {
            name: "Uginanie ze sztangą łamaną EZ",
            sets: "3 serie",
            load: "22,5 / 30 / 35 kg",
            desc: "Łamany gryf zmniejsza skręcenie nadgarstków. Łokcie przy tułowiu, ruch wyłącznie w stawie łokciowym.",
          },
          {
            name: "Uginanie młotkowe",
            sets: "3 serie",
            load: "2 × 7 / 2 × 10 / 2 × 12,5 kg",
            desc:
              "Chwyt neutralny, kciuki do góry. Akcentuje mięsień ramienno-promieniowy i głowę długą bicepsa, " +
              "buduje grubość przedramienia.",
          },
          {
            name: "Prostowanie ramion na wyciągu (pushdown)",
            sets: "3 serie",
            load: "32,5 / 40 / 45 kg",
            desc:
              "Łokcie przyklejone do tułowia, ruch tylko w łokciach, pełny wyprost na dole. " +
              "W oryginale opisane jako „wyciskanie na drążku”.",
          },
        ],
      },
      fri: {
        title: "Cardio",
        short: "Cardio",
        primary: ["quadriceps", "hamstrings", "gastrocnemius", "gluteus"],
        support: ["tibialis"],
        cardio: { machine: "Bieżnia", minutes: 60, hrFrom: 80, hrTo: 90 },
        exercises: [],
      },
      sat: {
        title: "Cardio",
        short: "Cardio",
        primary: ["quadriceps", "hamstrings", "gastrocnemius", "gluteus"],
        support: ["tibialis"],
        cardio: { machine: "Bieżnia", minutes: 60, hrFrom: 80, hrTo: 90 },
        exercises: [],
      },
      sun: {
        title: "Wolne",
        short: "Wolne",
        rest: true,
        primary: [],
        support: [],
        exercises: [],
        desc:
          "Dzień bez treningu. Regeneracja jest częścią planu — to wtedy odbudowują się włókna " +
          "nadwyrężone przez cztery dni siłowe.",
      },
    },
  },
];

// Tętno maksymalne wg Tanaki: dokładniejsze niż popularne 220 − wiek.
export const maxHeartRate = (age) => (age ? Math.round(208 - 0.7 * age) : null);
