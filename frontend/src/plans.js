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
//
// Pola dnia poza listą ćwiczeń są opcjonalne i pokazują się tylko wtedy, gdy
// plan je podaje: `warmup`, `intro`, `remark`, `loadNote`, `changes`.
// Cardio opisujemy wariantami (`cardio.variants`), bo jeden dzień potrafi mieć
// wersję ciągłą i interwałową o różnych zakresach tętna.

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
        cardio: { machine: "Bieżnia", variants: [{ time: "60 min", hrFrom: 80, hrTo: 90 }] },
        exercises: [],
      },
      sat: {
        title: "Cardio",
        short: "Cardio",
        primary: ["quadriceps", "hamstrings", "gastrocnemius", "gluteus"],
        support: ["tibialis"],
        cardio: { machine: "Bieżnia", variants: [{ time: "60 min", hrFrom: 80, hrTo: 90 }] },
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
  {
    id: "tyler-durden-pussy-edit",
    name: "Tyler Durden - Pussy Edit",
    summary:
      "Poprawka oryginału: dołożony dzień nóg i praca na tylne aktony barków, " +
      "określone zakresy powtórzeń i przerwy, cardio zbite do jednego dnia.",
    rules: [
      {
        title: "Przerwy między seriami",
        text:
          "Zakresy siłowe (6–8 powtórzeń) — 2–3 min. Hipertrofia (10–15) — 60–90 s. " +
          "Izolacje i ruchy na wysokie powtórzenia — 45–60 s. Skracanie przerw w seriach " +
          "ciężkich to obniżanie ciężaru roboczego bez żadnego zysku.",
      },
      {
        title: "Progresja",
        text:
          "Gdy wykonasz wszystkie serie w górnej granicy zakresu z zachowaną techniką, " +
          "podnieś ciężar o 2,5 kg (ruchy górnej części ciała) lub 5 kg (przysiad, martwy ciąg) " +
          "i wróć do dolnej granicy zakresu.",
      },
      {
        title: "Zapas do upadku",
        text:
          "W seriach roboczych zostawiaj 1–2 powtórzenia zapasu, poza seriami wyraźnie " +
          "oznaczonymi jako „do upadku”. Trening do skrajnego zmęczenia w każdej serii przy " +
          "sześciu dniach w tygodniu prowadzi do przetrenowania szybciej niż do wyników.",
      },
      {
        title: "Zaokrąglenia",
        text:
          "Obciążenia dobrane do realnych kombinacji talerzy (co 1,25 / 2,5 kg) i typowych " +
          "stosów maszyn (co 2,5 / 5 kg). Traktuj je jako punkt wyjścia, nie jako wartości " +
          "sztywne — kalibruj do własnej siły w pierwszym tygodniu.",
      },
    ],
    days: {
      mon: {
        title: "Klatka piersiowa",
        short: "Klatka",
        primary: ["pectoralis"],
        support: ["deltoid_front", "triceps", "serratus"],
        warmup: "5 min pracy ogólnej + 2 serie wprowadzające na ławce (pusty gryf × 12, 60 kg × 8).",
        changes:
          "Seria 25 powtórzeń na 75 kg poszła w całości. Wyciskanie zaczyna się od najcięższego " +
          "obciążenia, gdy układ nerwowy jest świeży — to jedyna kolejność, która ma sens przy " +
          "budowaniu siły. Pompki przeniesione na koniec jako praca wykończeniowa, a nie jako " +
          "wstępne zmęczenie przed serią roboczą. Ławka skośna awansowała przed maszynę: " +
          "wolny ciężar zawsze przed prowadzonym.",
        exercises: [
          {
            name: "Wyciskanie na ławce płaskiej",
            sets: "4 × 6–8",
            load: "102,5 kg",
            rest: "2–3 min",
            desc:
              "Chwyt nieco szerszy od barków, łopatki ściągnięte i dociśnięte, stopy stabilnie " +
              "na podłodze. Sztanga do dolnej części klatki, bez odbijania. Przy 4 × 6–8 asekuracja obowiązkowa.",
          },
          {
            name: "Wyciskanie na ławce skośnej",
            sets: "3 × 8–10",
            load: "45 / 55 / 60 kg",
            rest: "2 min",
            desc: "Oparcie 30–45° głową w górę. Górne pasmo klatki i przednie aktony naramiennych.",
          },
          {
            name: "Wyciskanie na maszynie (Nautilus)",
            sets: "3 × 10–12",
            load: "35 / 45 / 55 kg",
            rest: "90 s",
            desc: "Tor wymuszony, bezpieczna praca do wysokiego zmęczenia. Uchwyty na wysokości środka klatki.",
          },
          {
            name: "Pec deck",
            sets: "3 × 12–15",
            load: "27,5 / 32,5 / 35 kg",
            rest: "60 s",
            desc: "Przywodzenie ramion w płaszczyźnie poziomej, łokcie lekko ugięte. Kontrolowana faza negatywna.",
          },
          {
            name: "Pompki",
            sets: "2 serie do upadku",
            load: "masa ciała",
            rest: "60 s",
            desc:
              "Tułów w linii prostej, łokcie ok. 45° do tułowia. Na koniec sesji służą do domknięcia " +
              "objętości, nie do siły.",
          },
        ],
      },
      tue: {
        title: "Plecy i tylne aktony barków",
        short: "Plecy",
        primary: ["latissimus", "trapezius", "deltoid_back"],
        support: ["infraspinatus", "erector_spinae", "biceps", "forearm_front"],
        changes:
          "Wiosłowanie drążkiem T przesunięte na początek — to najcięższy technicznie ruch dnia " +
          "i wymaga świeżego grzbietu. Dołożone dwa ćwiczenia na tylne aktony barków, które " +
          "w oryginale nie występowały w ogóle przy pięciu wyciskaniach tygodniowo.",
        exercises: [
          {
            name: "Podciąganie",
            sets: "4 serie do upadku",
            load: "masa ciała · docelowo 25 powtórzeń łącznie",
            rest: "2 min",
            desc:
              "Chwyt nachwytem szerszy od barków. Ciąg łokciami w dół i do tyłu, klatka do drążka, " +
              "bez bujania. Pełny wyprost na dole.",
          },
          {
            name: "Wiosłowanie drążkiem T",
            sets: "3 × 8–10",
            load: "35 / 42,5 / 50 kg",
            rest: "2 min",
            desc:
              "Tułów pochylony ok. 45°, kręgosłup neutralny, ciąg do brzucha. Najwyższe obciążenie " +
              "osiowe spośród wiosłowań.",
          },
          {
            name: "Ściąganie drążka wyciągu górnego",
            sets: "3 × 10–12",
            load: "60 / 67,5 / 75 kg",
            rest: "90 s",
            desc: "Drążek do górnej części klatki, klatka wypchnięta, łokcie w dół wzdłuż tułowia. Nigdy za kark.",
          },
          {
            name: "Wiosłowanie siedząc (wyciąg dolny)",
            sets: "3 × 10–12",
            load: "35 / 37,5 / 40 kg",
            rest: "90 s",
            desc: "Plecy proste, uchwyt do dolnych żeber, łopatki ściągane na końcu ruchu.",
          },
          {
            name: "Face pull",
            sets: "3 × 15–20",
            load: "20 / 22,5 / 25 kg",
            rest: "60 s",
            added: true,
            desc:
              "Lina na wyciągu na wysokości twarzy. Ciągniesz w stronę czoła, rozdzielając dłonie " +
              "i rotując ramiona na zewnątrz. Bezpośrednia przeciwwaga dla protrakcji barków wywołanej " +
              "objętością wyciskań. Ciężar drugorzędny, zakres ruchu pierwszorzędny.",
          },
          {
            name: "Odwrotne rozpiętki",
            sets: "3 × 15",
            load: "2 × 6 kg",
            rest: "60 s",
            added: true,
            desc:
              "Tułów w opadzie lub na ławce skośnej piersią w dół, hantle unoszone bokiem przy niemal " +
              "wyprostowanych łokciach. Ruch bez rozpędu, obciążenie celowo niskie.",
          },
        ],
      },
      wed: {
        title: "Nogi",
        short: "Nogi",
        added: true,
        primary: ["quadriceps", "hamstrings", "gluteus", "gastrocnemius"],
        support: ["adductors", "erector_spinae", "sartorius"],
        intro:
          "Oryginalny plan nie zawierał ani jednego ćwiczenia na nogi. Przy pięciu sesjach siłowych " +
          "w tygodniu to najpoważniejsza luka — strukturalna, sylwetkowa i funkcjonalna.",
        loadNote:
          "Obciążeń nie podaję, bo nie ma punktu odniesienia — plan wyjściowy nie zawierał żadnego " +
          "ruchu na dolną część ciała. Pierwsze dwa tygodnie: ciężar pozwalający wykonać wszystkie " +
          "serie z 3–4 powtórzeniami zapasu i bez utraty technicznej. Progres 2,5–5 kg tygodniowo " +
          "w przysiadzie i martwym ciągu, dopóki technika się trzyma.",
        exercises: [
          {
            name: "Przysiad ze sztangą z tyłu",
            sets: "4 × 6–8",
            rest: "3 min",
            desc:
              "Sztanga na kapturach lub na tylnych aktonach naramiennych, stopy na szerokość barków, " +
              "palce lekko na zewnątrz. Schodzisz do co najmniej równoległości ud z podłogą, kolana " +
              "podążają za linią stóp, kręgosłup neutralny przez cały ruch. Podstawowy ruch na " +
              "czworogłowe, pośladki i mięśnie posturalne.",
          },
          {
            name: "Martwy ciąg rumuński",
            sets: "3 × 8–10",
            rest: "2–3 min",
            desc:
              "Start z pozycji stojącej, sztanga blisko ud. Cofasz biodra, kolana ugięte tylko lekko " +
              "i nieruchome, sztanga sunie po udach do połowy łydki. Praca na dwugłowe uda i pośladki " +
              "w rozciągnięciu. Plecy nie mogą się zaokrąglić — w momencie utraty neutralnej pozycji " +
              "seria jest skończona.",
          },
          {
            name: "Wypychanie na suwnicy",
            sets: "3 × 12",
            rest: "2 min",
            desc:
              "Stopy na środku platformy na szerokość bioder. Zginasz kolana do kąta ok. 90°, lędźwie " +
              "nie odrywają się od oparcia. Bezpieczna objętość dodatkowa bez obciążania kręgosłupa.",
          },
          {
            name: "Wykroki chodzone",
            sets: "3 × 10 na nogę",
            rest: "90 s",
            desc:
              "Długi krok w przód, kolano tylnej nogi schodzi tuż nad podłogę, tułów pionowo. " +
              "Praca jednostronna, koryguje asymetrie siły między nogami.",
          },
          {
            name: "Uginanie nóg leżąc",
            sets: "3 × 12–15",
            rest: "60 s",
            desc:
              "Izolacja dwugłowej uda w jej funkcji zginania kolana. Uzupełnia martwy ciąg rumuński, " +
              "który obciąża ją głównie w funkcji biodrowej.",
          },
          {
            name: "Wspięcia na palce",
            sets: "4 × 15",
            rest: "45 s",
            desc:
              "Pełny zakres: maksymalne opuszczenie pięty pod poziom stopnia, pełne wypięcie w górze, " +
              "pauza. Łydka reaguje na zakres ruchu i objętość, nie na rozpęd.",
          },
        ],
      },
      thu: {
        title: "Barki",
        short: "Barki",
        primary: ["deltoid_front", "deltoid_back", "trapezius"],
        support: ["triceps"],
        changes:
          "Unoszenie w przód zredukowane z trzech serii do dwóch — akton przedni dostaje już pełną " +
          "porcję pracy w poniedziałek przy wyciskaniach i nie potrzebuje osobnej objętości. " +
          "Uwolniona objętość poszła na czworoboczne, które w oryginale nie były trenowane bezpośrednio.",
        exercises: [
          {
            name: "Wyciskanie Arnoldowe",
            sets: "4 × 8–10",
            load: "2 × 12,5 kg",
            rest: "2 min",
            desc:
              "Siedząc, hantle na wysokości barków, dłonie do siebie. W trakcie wyciskania obracasz " +
              "nadgarstki o 180°, kończysz z dłońmi na zewnątrz.",
          },
          {
            name: "Unoszenie ramion bokiem",
            sets: "4 × 12–15",
            load: "2 × 7 kg",
            rest: "60 s",
            desc:
              "Łokcie minimalnie ugięte i stale wyżej niż nadgarstki, unoszenie do wysokości barków, " +
              "bez pracy tułowia. Główny bodziec na szerokość barku.",
          },
          {
            name: "Unoszenie ramion w przód",
            sets: "2 × 12–15",
            load: "2 × 5,5 kg",
            rest: "60 s",
            desc: "Do wysokości oczu, tempo kontrolowane, bez zarzucania.",
          },
          {
            name: "Szrugsy",
            sets: "3 × 12–15",
            load: "2 × 25 kg",
            rest: "90 s",
            added: true,
            desc:
              "Hantle wzdłuż tułowia, unoszenie barków pionowo w górę z krótką pauzą u szczytu. " +
              "Bez rotacji barków w tył — to zbędne obciążenie stawu.",
          },
        ],
      },
      fri: {
        title: "Biceps i triceps",
        short: "Ramiona",
        primary: ["biceps", "triceps"],
        support: ["forearm_front", "forearm_back"],
        changes:
          "Obciążenia bicepsa obniżone. W oryginale preacher curl szedł do wartości wyższej niż " +
          "pushdown na tricepsie — to odwrotność normalnego rozkładu siły i niemal na pewno efekt " +
          "liczenia stosu maszyny bez uwzględnienia dźwigni. Dołożone drugie ćwiczenie na triceps, " +
          "bo pojedynczy pushdown nie pokrywał głowy długiej, która pracuje wyłącznie przy ramieniu " +
          "uniesionym lub cofniętym. Triceps na początku sesji, bo stanowi około dwóch trzecich masy " +
          "ramienia i zasługuje na świeży start.",
        exercises: [
          {
            name: "Prostowanie ramion na wyciągu (pushdown)",
            sets: "3 × 10–12",
            load: "32,5 / 40 / 45 kg",
            rest: "90 s",
            desc: "Łokcie przyklejone do tułowia, ruch tylko w łokciach, pełny wyprost na dole.",
          },
          {
            name: "Wyciskanie francuskie leżąc",
            sets: "3 × 10–12",
            load: "25 / 30 / 32,5 kg",
            rest: "90 s",
            added: true,
            desc:
              "Sztanga EZ, ramiona pionowo lub lekko cofnięte za głowę. Zginasz łokcie, opuszczając " +
              "gryf do czoła lub za nie, ramiona nieruchome. Jedyny w planie ruch obciążający głowę " +
              "długą tricepsa w rozciągnięciu.",
          },
          {
            name: "Uginanie na modlitewniku",
            sets: "3 × 10–12",
            load: "27,5 / 32,5 / 35 kg",
            rest: "90 s",
            desc:
              "Ramiona oparte o skośną poduszkę, brak bujania. Najwyższe napięcie w dolnej fazie — " +
              "nie prostuj łokcia gwałtownie.",
          },
          {
            name: "Uginanie ze sztangą łamaną EZ",
            sets: "3 × 10–12",
            load: "22,5 / 27,5 / 30 kg",
            rest: "90 s",
            desc: "Łamany gryf odciąża nadgarstki, łokcie przy tułowiu, ruch tylko w łokciu.",
          },
          {
            name: "Uginanie młotkowe",
            sets: "3 × 12",
            load: "2 × 7 / 2 × 10 / 2 × 12,5 kg",
            rest: "60 s",
            desc: "Chwyt neutralny. Mięsień ramienno-promieniowy i głowa długa bicepsa.",
          },
        ],
      },
      sat: {
        title: "Cardio",
        short: "Cardio",
        primary: ["quadriceps", "hamstrings", "gastrocnemius", "gluteus"],
        support: ["tibialis"],
        cardio: {
          machine: "Bieżnia",
          variants: [
            { name: "Podstawowy", time: "50–60 min", hrFrom: 65, hrTo: 75, desc: "tempo ciągłe" },
            {
              name: "Alternatywny",
              time: "25–30 min",
              hrFrom: 85,
              hrTo: 90,
              desc: "interwały: 8–10 × 1 min pracy / 2 min truchtu",
            },
          ],
        },
        changes:
          "Godzina przy 80–90% HRmax to praca na progu mleczanowym i powyżej — realnie utrzymasz " +
          "taką intensywność 20–40 minut, i to będąc dobrze wytrenowanym. Po pięciu dniach siłowych " +
          "taka sesja zjada regenerację bez proporcjonalnego zysku. Praca ciągła przy 65–75% daje " +
          "lepszy bilans wydatku do kosztu regeneracyjnego; jeśli zależy ci na wysokim tętnie, " +
          "dostajesz je w wariancie interwałowym przy jednej trzeciej czasu.",
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
          "Dzień bez treningu. Po pięciu sesjach siłowych i cardio regeneracja jest jedynym " +
          "momentem, w którym powstaje adaptacja — trening ją tylko wywołuje.",
      },
    },
  },
];

// Tętno maksymalne wg Tanaki: dokładniejsze niż popularne 220 − wiek.
export const maxHeartRate = (age) => (age ? Math.round(208 - 0.7 * age) : null);
