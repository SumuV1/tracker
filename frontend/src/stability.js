// ══════════════════════════════════════════════════════════════════
//  STABILIZACJA EMOCJONALNA — stany, techniki
// ══════════════════════════════════════════════════════════════════
// Zakładka nie jest już „o dołku": problemem jest amplituda emocji, nie ich
// kierunek. Złość, lęk, nakręcenie i dołek to ta sama nieumiejętność w różnych
// strojach, więc techniki podpinają się pod STAN, a nie pod „poziom dołka".
//
// Każda technika ma stały identyfikator (`key`). Wcześniej odhaczenia nie były
// zapisywane, bo klucz oparty o pozycję w tablicy poszedłby do kosza przy
// pierwszej zmianie struktury — teraz `key` jest tym, co trafia do bazy.

export const STATES = [
  { key: "spokoj",     label: "Spokój",     icon: "🌊", arousal: "low",
    hint: "Równo. Nic nie ciągnie w żadną stronę." },
  { key: "napiecie",   label: "Napięcie",   icon: "🪢", arousal: "high",
    hint: "Ściśnięte ciało, myśli krążą, trudno usiedzieć." },
  { key: "zlosc",      label: "Złość",      icon: "🔥", arousal: "high",
    hint: "Gorąco i szybko. Chce się uderzyć w coś albo w kogoś." },
  { key: "lek",        label: "Lęk",        icon: "🌫️", arousal: "high",
    hint: "Niepokój — bez powodu albo z powodem, który rośnie." },
  { key: "dolek",      label: "Dołek",      icon: "🕳️", arousal: "low",
    hint: "Ciężko, płasko, bez energii i bez sensu." },
  { key: "nakrecenie", label: "Nakręcenie", icon: "⚡", arousal: "high",
    hint: "Za dużo energii, za szybko. Euforia albo gonitwa." },
];
export const STATE_MAP = Object.fromEntries(STATES.map(s => [s.key, s]));

// Grupy według mechanizmu działania, nie według „poziomu":
//   wyciszenie  — zbicie pobudzenia przez ciało (nerw błędny, odruch nurkowy)
//   rozplatanie — wyjście z pętli myślowej
//   rozruch     — wyciągnięcie z niskiego pobudzenia
export const GROUPS = [
  { key: "wyciszenie",  label: "Wyciszenie",  icon: "🫁", color: "#3aa88c",
    desc: "Ciało pierwsze. Pobudzenie schodzi przez oddech i zimno, nie przez perswazję." },
  { key: "rozplatanie", label: "Rozplątanie", icon: "🧶", color: "#c98500",
    desc: "Kiedy myśl kręci się w kółko — wyciągnąć ją na zewnątrz i nazwać." },
  { key: "rozruch",     label: "Rozruch",     icon: "🔧", color: "#9085e9",
    desc: "Działanie poprzedza motywację, nie odwrotnie. Małe, zamknięte, teraz." },
];

export const TECHNIQUES = [
  { key: "oddech-fizjologiczny", group: "wyciszenie", states: ["napiecie", "zlosc", "lek", "nakrecenie"],
    icon: "💨", name: "Oddech fizjologiczny", time: "2 min",
    desc: "Najszybszy sposób na obniżenie kortyzolu. Podwójny wdech aktywuje nerw błędny i dosłownie zmienia stan układu nerwowego w ciągu sekund.",
    steps: ["Wciągnij powietrze nosem przez 4 sekundy", "Zrób krótki dodatkowy wdech nosem (doładowanie płuc)", "Wydychaj powoli ustami przez 6–8 sekund", "Powtórz 3–5 razy — poczujesz, jak ciało zwalnia"] },
  { key: "zimna-woda", group: "wyciszenie", states: ["zlosc", "lek", "nakrecenie"],
    icon: "🌊", name: "Zimna woda na twarz", time: "1 min",
    desc: "Reset fizjologiczny. Zimna woda aktywuje odruch nurkowy — gwałtownie spowalnia tętno i uspokaja układ nerwowy.",
    steps: ["Idź do łazienki", "Nabierz zimnej wody w dłonie", "Przemyj twarz, czoło, skronie i szyję", "Powtórz 2–3 razy"] },
  { key: "mini-ruch", group: "wyciszenie", states: ["zlosc", "napiecie", "nakrecenie", "dolek"],
    icon: "🏃", name: "Mini ruch fizyczny", time: "2 min",
    desc: "Ruch spala kortyzol i adrenalinę nagromadzone w ciele. Cokolwiek wystarczy, żeby zmienić stan.",
    steps: ["Wstań od komputera — to najważniejszy krok", "10 przysiadów lub 20 podskoków w miejscu", "Albo szybki marsz po mieszkaniu przez 2 minuty", "Powtórz, jeśli poczułeś, że pomaga"] },
  { key: "5-4-3-2-1", group: "rozplatanie", states: ["lek", "napiecie", "nakrecenie"],
    icon: "👁️", name: "Technika 5-4-3-2-1", time: "3 min",
    desc: "Uziemienie sensoryczne — wyciąga umysł z pętli myślowej i przenosi uwagę do tu i teraz.",
    steps: ["5 rzeczy, które WIDZISZ — nazwij je w myślach", "4 rzeczy, których możesz DOTKNĄĆ — dotknij każdej", "3 rzeczy, które SŁYSZYSZ — wsłuchaj się aktywnie", "2 rzeczy, które CZUJESZ zapachem", "1 rzecz, którą SMAKUJESZ"] },
  { key: "brain-dump", group: "rozplatanie", states: ["napiecie", "lek", "zlosc", "dolek"],
    icon: "📝", name: "Brain dump", time: "10 min",
    desc: "Wypisanie myśli na zewnątrz zmniejsza ich intensywność w środku. Pisz bez cenzury — nikt tego nie zobaczy.",
    steps: ["Weź kartkę lub otwórz pusty plik", "Pisz przez 10 minut, co czujesz i myślisz — bez zatrzymywania", "Nie redaguj, nie oceniaj, nie poprawiaj", "Po skończeniu przeczytaj raz i zaznacz, co jest faktem, a co interpretacją"] },
  { key: "co-boli", group: "rozplatanie", states: ["dolek", "napiecie"],
    icon: "🔍", name: "Co dokładnie boli?", time: "5 min",
    desc: "Każdy rodzaj bólu wymaga innej odpowiedzi. Zmęczenie to nie to samo co poczucie porażki. Precyzja ma znaczenie.",
    steps: ["Zapytaj siebie: czy to zmęczenie fizyczne lub psychiczne?", "Czy to poczucie porażki, wstydu lub rozczarowania sobą?", "Czy to samotność — brak kontaktu z ludźmi?", "Czy to stagnacja — poczucie, że nic się nie zmienia?", "Zapisz odpowiedź — wskazuje, czego naprawdę potrzebujesz"] },
  { key: "defuzja", group: "rozplatanie", states: ["lek", "dolek", "zlosc"],
    icon: "🧠", name: "Defuzja poznawcza", time: "3 min",
    desc: "Technika z ACT. Zamiast być myślą — obserwujesz ją z dystansu. Małe słowa, duża różnica w intensywności.",
    steps: ["Zauważ myśl, np. „jestem beznadziejny”", "Zamień ją na: „mam myśl, że jestem beznadziejny”", "Albo: „mój umysł mówi mi teraz, że jestem beznadziejny”", "Powtórz kilka razy — poczujesz, jak myśl traci moc"] },
  { key: "zrodlo", group: "rozplatanie", states: ["spokoj", "dolek", "zlosc"],
    icon: "🗺️", name: "Skąd to przyszło?", time: "10 min",
    desc: "Kiedy jesteś już stabilniejszy — warto zrozumieć, co wywołało skok. Nie po to, żeby się obwiniać, tylko żeby następnym razem zobaczyć go wcześniej.",
    steps: ["Czy to był jednorazowy czynnik — niewyspanie, stres, przeciążenie?", "Czy to powtarzający się wzorzec, który widzisz regularnie?", "Co pojawiło się jako pierwsze — sygnał ostrzegawczy?", "Zapisz odpowiedź — to materiał na Twój system wczesnego ostrzegania"] },
  { key: "mini-lista", group: "rozruch", states: ["dolek"],
    icon: "✅", name: "Mini-lista 3 rzeczy", time: "5 min",
    desc: "Działanie poprzedza motywację, nie odwrotnie. Małe zadanie → mały sukces → lekkie odblokowanie energii.",
    steps: ["Napisz 3 konkretne rzeczy do zrobienia dziś", "Żadna nie może zająć więcej niż 20 minut", "Żadna nie może być „wielkim projektem”", "Zrób pierwszą z listy teraz"] },
  { key: "kontakt", group: "rozruch", states: ["dolek", "lek"],
    icon: "💬", name: "Kontakt z kimś bliskim", time: "dowolnie",
    desc: "Nie musisz rozmawiać o problemie. Sam głos kogoś bliskiego zmienia stan. Kontakt społeczny to biologiczna potrzeba.",
    steps: ["Napisz lub zadzwoń do kogoś — bez planu rozmowy", "Nie musisz tłumaczyć, co czujesz, ani „mieć powodu”", "Nawet krótkie „hej, co u ciebie?” wystarczy", "Jeśli nie masz teraz komu — idź gdzieś, gdzie są ludzie"] },
  { key: "kotwica", group: "rozruch", states: ["dolek"],
    icon: "⚓", name: "Twoja kotwica", time: "30–60 min",
    desc: "Każdy ma coś, co historycznie pomagało — nawet trochę. Ochota pojawia się w trakcie, nie przed. Nie czekaj na nią.",
    steps: ["Zajrzyj do kotwic poniżej", "Wybierz jedną rzecz, która historycznie działała", "Zacznij — nawet bez energii i entuzjazmu", "Daj sobie 10 minut, zanim ocenisz, czy pomaga"] },
  { key: "male-osiagniecie", group: "rozruch", states: ["dolek"],
    icon: "🔧", name: "Małe zamknięte osiągnięcie", time: "20 min",
    desc: "Poczucie sprawczości to bezpośrednia kontra dla bezsilności. Zamknij coś małego.",
    steps: ["Znajdź coś, co wisi od jakiegoś czasu", "Ticket, skrypt, porządek w plikach — cokolwiek", "Coś, co możesz zamknąć w 20 minut", "Odznacz jako zrobione — to ważna część, nie pomijaj jej"] },
];
export const TECHNIQUE_MAP = Object.fromEntries(TECHNIQUES.map(t => [t.key, t]));

// Zasada dnia: ta sama przez cały dzień, inna jutro. Deterministycznie z daty,
// żeby odświeżenie strony nie zmieniało bodźca — dwadzieścia zasad na raz to
// szum, jedna to bodziec. `offset` obsługuje przycisk „inna".
export function dailyPick(list, dateStr, offset = 0) {
  if (!list.length) return null;
  let h = 0;
  for (const ch of dateStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[(h + offset) % list.length];
}
