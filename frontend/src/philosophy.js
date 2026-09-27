// ══════════════════════════════════════════════════════════════════
//  FILOZOFIA — kanon zasad, cztery filary
// ══════════════════════════════════════════════════════════════════
// Techniki odpowiadają na „co zrobić teraz, gdy emocja skacze". Kanon
// odpowiada na „jaki mam trzymać standard, zanim skoczy". Dlatego żyje tu,
// obok TECHNIQUES, a nie w bazie: to tekst zadeklarowany raz, nie wpis, który
// się codziennie dopisuje. Zasady użytkownika (tabela `principles`) zostają
// osobno i są w pełni edytowalne — kanon da się z nich przepisać „po swojemu",
// ale nie da się go skasować przez przypadek.
//
// `key` jest stałym identyfikatorem (bez polskich znaków, ten sam wzorzec co
// klucze technik), żeby dopisanie albo przestawienie zasady nie zmieniało
// znaczenia niczego, co już zostało zapisane.

export const PILLARS = [
  { key: "dzialanie",  numeral: "I",   label: "Działanie",  icon: "🏹",
    desc: "Ruch przed pewnością. Informacja powstaje z działania, nie z rozważania." },
  { key: "dyscyplina", numeral: "II",  label: "Dyscyplina", icon: "🧱",
    desc: "Standard nie zależy od nastroju. Trud jest ceną celu, nie celem." },
  { key: "umysl",      numeral: "III", label: "Umysł",      icon: "🧭",
    desc: "Fakty przed opiniami, konsekwencje przed odruchem, własny osąd przed tłumem." },
  { key: "tozsamosc",  numeral: "IV",  label: "Tożsamość",  icon: "🪞",
    desc: "Najpierw umysł, potem czyn, na końcu tożsamość — w tej kolejności." },
];
export const PILLAR_MAP = Object.fromEntries(PILLARS.map(p => [p.key, p]));

// `states` wskazuje stany z zakładki stabilizacji, przy których zasada ma
// najwięcej sensu — stąd bierze ją „zasada na dziś". Pusta lista znaczy
// „na każdy stan", tak samo jak przy zasadach własnych.
export const CANON = [
  // ── I. Działanie ──────────────────────────────────────────────────────
  { key: "zacznij-i-idz", pillar: "dzialanie", n: 1,
    text: "Zacznij i idź naprzód.",
    states: ["dolek", "napiecie"] },
  { key: "najmniejszy-krok", pillar: "dzialanie", n: 2,
    text: "Gdy nie wiesz, co robić, zrób najmniejszy krok w stronę celu albo test, który da ci informację.",
    states: ["dolek", "lek"] },
  { key: "akcja-produkuje-informacje", pillar: "dzialanie", n: 3,
    text: "Akcja produkuje informację.",
    detail: ["Testuj pomysły bez oczekiwania konkretnej reakcji, potem iteruj i ulepszaj."],
    states: ["dolek", "lek"] },
  { key: "decyzje-odwracalne", pillar: "dzialanie", n: 4,
    text: "Decyzje odwracalne podejmuj od razu.",
    detail: ["Nieodwracalne analizuj prostym narzędziem i w ograniczonym czasie."],
    states: ["napiecie", "lek"] },
  { key: "sprawdz-grunt", pillar: "dzialanie", n: 5,
    text: "Kto nie ryzykuje, ten nie pije szampana.",
    detail: ["Przed dużym ryzykiem zrób najpierw pierwszy krok, który sprawdzi grunt."],
    states: ["dolek", "lek"] },
  { key: "male-cele-z-terminem", pillar: "dzialanie", n: 6,
    text: "Stawiaj małe cele z terminem.",
    detail: ["Małe sukcesy budują pewność siebie, a termin wymusza tempo.",
             "Codziennie pytaj: co mogę dziś zrobić, by być lepszym jutro?"],
    states: ["dolek"] },

  // ── II. Dyscyplina ────────────────────────────────────────────────────
  { key: "dyscyplina-rozpuszcza-chaos", pillar: "dyscyplina", n: 7,
    text: "Dyscyplina rozpuszcza chaos w głowie.",
    detail: ["To robienie tego, czego nie chcesz, tak jakbyś to kochał."],
    states: ["napiecie", "dolek"] },
  { key: "koniec-komfortu", pillar: "dyscyplina", n: 8,
    text: "Rozwój zaczyna się tam, gdzie kończy się komfort.",
    detail: ["Trud jest ceną celu, nie celem: jeśli droga wymaga trudu, nie cofaj się.",
             "Jeśli istnieje łatwiejsza i równie dobra droga, wybierz ją."],
    states: ["dolek"] },
  { key: "przyjemnosc-nie-jest-celem", pillar: "dyscyplina", n: 9,
    text: "Przyjemność nie jest celem.",
    detail: ["Dążenie wyłącznie do przyjemności jest zbędne."],
    states: ["nakrecenie"] },
  { key: "projektuj-otoczenie", pillar: "dyscyplina", n: 10,
    text: "Projektuj otoczenie: usuń rozpraszacze, utrudniaj złe czynności, ułatwiaj dobre.",
    states: ["napiecie", "nakrecenie"] },
  { key: "jedna-rzecz-jak-wszystkie", pillar: "dyscyplina", n: 11,
    text: "Jak robisz jedną rzecz, tak robisz wszystkie.",
    detail: ["Trzymaj wysoki standard zachowania i etyki pracy."],
    states: ["spokoj", "dolek"] },

  // ── III. Umysł ────────────────────────────────────────────────────────
  { key: "kontrola-nad-reakcja", pillar: "umysl", n: 12,
    text: "Pełną kontrolę masz tylko nad swoją reakcją.",
    detail: ["Czuj emocje, ale nie oddawaj im steru."],
    states: ["zlosc", "lek", "napiecie"] },
  { key: "fakty-nie-opinie", pillar: "umysl", n: 13,
    text: "Liczą się fakty, nie opinie, również twoje własne.",
    detail: ["Nie okłamuj się i bądź dla siebie brutalnie szczery."],
    states: ["dolek", "zlosc", "lek"] },
  { key: "wiedziec-a-rozumiec", pillar: "umysl", n: 14,
    text: "Wiedzieć to nie to samo co rozumieć.",
    detail: ["Buduj solidną wiedzę, nie sieć skojarzeń.",
             "Skojarzenia służą do jej odnajdywania: to, co kiedyś wiedziałeś, odzyskasz po nitce do kłębka."],
    states: ["spokoj"] },
  { key: "mysl-w-konsekwencjach", pillar: "umysl", n: 15,
    text: "Myśl w konsekwencjach: co zrobić, jaki będzie efekt, jaki efekt będzie miał ten efekt.",
    detail: ["Rozpisz scenariusz najlepszy, bazowy i najgorszy."],
    states: ["napiecie", "nakrecenie"] },
  { key: "kazdy-wybor-kosztuje", pillar: "umysl", n: 16,
    text: "Każdy wybór kosztuje.",
    detail: ["Gdy cele się wykluczają, poświęć jeden.",
             "Ryzyko nie znika, tylko zmienia położenie, więc wybierz, które przyjmujesz."],
    states: ["napiecie", "lek"] },
  { key: "swiadomosc-terenu", pillar: "umysl", n: 17,
    text: "Bądź świadomy terenu i ludzi wokół siebie.",
    states: ["spokoj", "nakrecenie"] },
  { key: "bez-tlumu", pillar: "umysl", n: 18,
    text: "Nie dostosowuj się do tłumu.",
    detail: ["Kieruj się własnym racjonalnym osądem."],
    states: ["spokoj", "lek"] },

  // ── IV. Tożsamość ─────────────────────────────────────────────────────
  { key: "umysl-czyn-tozsamosc", pillar: "tozsamosc", n: 19,
    text: "Najpierw umysł, potem czyn, na końcu tożsamość.",
    detail: ["Wizualizuj, kim chcesz być, zachowuj się jak ta osoba i rób to, co ona robi:"],
    bullets: ["inwestor analizuje finanse firm, wskaźniki i blockchain",
              "bokser trenuje, sparuje i się rozciąga",
              "mówca najpierw słucha i daje się wypowiedzieć innym, a sam mówi na końcu (Carnegie)"],
    states: ["dolek", "spokoj"] },
  { key: "zdolnosc-nie-wynik", pillar: "tozsamosc", n: 20,
    text: "Wierz w swoją zdolność do nauki i wytrwania, nie w gwarantowany wynik.",
    detail: ["Wyobraź sobie cel, a potem realne przeszkody na drodze do niego."],
    states: ["lek", "dolek"] },
  // Bez przypisanych stanów: pytanie kontrolne pasuje do każdego z nich.
  { key: "zwyciezam-nad-soba", pillar: "tozsamosc", n: 21,
    text: "Przy każdej rozterce pytaj: czy tak myśli ktoś, kto zwycięża nad sobą?",
    states: [] },
];
export const CANON_MAP = Object.fromEntries(CANON.map(r => [r.key, r]));

// Kanon w kształcie zasady, żeby „zasada na dziś" mogła losować z jednej puli
// razem z zasadami własnymi. `id` ma przedrostek, bo identyfikatory z bazy są
// liczbami — nie ma jak je pomylić. `note` to rozwinięcie w jednej linii:
// dokładnie to, co karta zasady dnia umie pokazać pod cytatem.
export const canonAsPrinciple = r => ({
  id: "canon:" + r.key,
  canon: r,
  text: r.text,
  source: `Filozofia · ${PILLAR_MAP[r.pillar].numeral}. ${PILLAR_MAP[r.pillar].label} · ${r.n}`,
  states: r.states,
  note: [...(r.detail || []), ...(r.bullets || []).map(b => "• " + b)].join(" "),
});

export const CANON_PRINCIPLES = CANON.map(canonAsPrinciple);
