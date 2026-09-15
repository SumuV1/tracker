---
name: mobile-web-design
description: Use when a browser app has to work well on a phone — "wersja mobilna", "na telefonie", "na komórce", "responsywność pod telefon", "dotyk", "bottom sheet", "dodaj do ekranu głównego", "PWA", "ikona na telefon", "za małe do kliknięcia", "make it work on mobile", "mobile layout", "touch targets", "home screen icon". Also load BEFORE building any new view in a project that is used from a phone, and when reviewing a UI change for phone usability. Not for general component structure or state management (use frontend-dev), and not for charts (use dataviz — this skill only sets the mobile constraints a chart must fit into).
---

# Projektowanie aplikacji przeglądarkowej pod telefon

Telefon to nie „mniejszy desktop". Inny wskaźnik (kciuk zamiast kursora), inny
kontekst (jedna ręka, w drodze, na danych komórkowych), inne ograniczenia
przeglądarki (klawiatura zasłania pół ekranu, Safari powiększa formularze).
Ten skill to procedura z twardymi progami, nie lista życzeń — większość z nich
została wyciągnięta z rzeczy, które w tym repo faktycznie się zepsuły.

Zasada nadrzędna: **projektuj najpierw pod kciuk, potem rozszerzaj na szerszy
ekran.** Odwrotny kierunek — „zmniejszmy wersję desktopową" — zawsze kończy się
elementami za małymi do trafienia.

## Krok 1 — Zanim cokolwiek narysujesz: pięć pytań

Odpowiedz na nie sobie (albo użytkownikowi, jeśli nie wynika z kontekstu):

1. **Co użytkownik robi kciukiem w pierwszych pięciu sekundach** po otwarciu tego widoku? To jest element, który ma być największy i najbliżej dołu ekranu.
2. **Co jest destrukcyjne** (usuń, wyczyść, wyloguj)? To ma być daleko od punktu 1 i nigdy pod kciukiem „z rozpędu".
3. **Ile tekstu naprawdę trzeba wpisać?** Każde pole to klawiatura zasłaniająca połowę ekranu. Jeśli da się wybrać zamiast wpisać — wybór.
4. **Czy ten widok ma sens w jednej kolumnie?** Jeśli nie, przeprojektuj, nie ściskaj.
5. **Skąd wchodzi użytkownik** — karta w przeglądarce czy skrót na ekranie głównym? Od tego zależy, czy potrzebny jest manifest i ikony (Krok 6).

## Krok 2 — Punkty przełamania i geometria

- Ustal breakpointy **raz, w jednym miejscu**, i używaj ich wszędzie. Jeśli
  layout stoi na stylach inline (jak w tym repo), źródłem prawdy jest hook na
  `matchMedia`, a nie media queries w CSS:
  ```js
  const MOBILE = "(max-width: 640px)";   // telefon: jedna kolumna
  const NARROW = "(max-width: 380px)";   // wąski telefon: skróć etykiety
  const WIDE   = "(min-width: 1000px)";  // dopiero tu kolumny obok siebie
  ```
- **Body nigdy nie przewija się w poziomie.** `overflow-x: hidden` na `body`,
  a to, co jest szersze niż ekran (tabela, wykres, siatka), przewija się we
  **własnym** kontenerze z `overflow-x: auto`.
- Kiedy element po zmniejszeniu spada poniżej progu dotyku (Krok 3), **zmień
  układ zamiast skalować**: dwie sylwetki obok siebie → jedna z przełącznikiem;
  siedem dni w rzędzie → tak, ale trzy sekcje obok siebie → jedna pod drugą.
- Zanim uznasz, że coś się zmieści, **policz to**: szerokość kontenera minus
  paddingi minus odstępy, podzielone przez liczbę kolumn. Jeśli wynik jest
  poniżej 44 px na element dotykowy albo poniżej ~160 px na kartę z tekstem,
  układ jest zły — niezależnie od tego, jak wygląda na Twoim monitorze.
- Warianty zwarte (`compact`) dla komponentów, które mają wejść w wąską
  kolumnę: mniejsze odstępy i podpisy, **nie** mniejsze cele dotyku.

## Krok 3 — Dotyk: progi, których nie negocjujesz

- **Cel dotyku ≥ 44 × 44 px** (Apple HIG; Material mówi 48 dp). Widoczna ikona
  może mieć 24 px, ale obszar klikalny robi się paddingiem do 44. Sąsiednie
  cele rozdziel co najmniej 8 px odstępu — kciuk nie ma krawędzi.
- Nic nie może być dostępne **wyłącznie przez hover**. Na telefonie hover nie
  istnieje: podpowiedź po najechaniu = brak podpowiedzi. Ta sama informacja
  musi być dostępna po tapnięciu albo widoczna od razu.
- Na przyciskach: `touch-action: manipulation` (usuwa 300 ms opóźnienia
  podwójnego tapnięcia) i `-webkit-tap-highlight-color: transparent` (bez
  niebieskiego błysku). Raz, globalnie, w `index.html`.
- Główna akcja widoku **na dole ekranu** lub na całą szerokość — tam sięga
  kciuk trzymający telefon jedną ręką. Górne rogi to strefa dwóch rąk.
- Akcja destrukcyjna: mała, z boku, nigdy pełnej szerokości, nigdy tuż obok
  akcji głównej. Jeśli jest nieodwracalna — potwierdzenie.

## Krok 4 — Formularze i klawiatura

- **Każde pole tekstowe ma `font-size ≥ 16px` na telefonie.** Poniżej tego
  iOS Safari powiększa stronę przy wejściu w pole i przesuwa cały widok. W tym
  repo załatwia to reguła w `index.html`:
  `@media (max-width: 640px) { input, select, textarea { font-size: 16px !important; } }`
  — sprawdź, że nowy styl inline jej nie nadpisuje.
- Dobieraj klawiaturę do treści: `inputMode="decimal"` do liczb z przecinkiem,
  `inputMode="numeric"` do całkowitych, `type="date"` do dat (z
  `colorScheme:"dark"` w ciemnym motywie, inaczej kontrolka jest biała),
  `autoComplete="username"` / `"current-password"` przy logowaniu.
- `type="number"` **nie** wymusza na iOS klawiatury numerycznej i pozwala
  wyczyścić pole do pustego stringa — obsłuż `""` w stanie, nie zakładaj liczby.
- Enter zatwierdza, Escape anuluje. Na telefonie Escape nie istnieje — przycisk
  „Anuluj" musi być widoczny, nie domyślny.
- Formularz w jednej kolumnie; etykieta **nad** polem, nie obok. Placeholder
  to nie etykieta — znika po wpisaniu pierwszego znaku.
- Modal na telefonie to **panel od dołu** (bottom sheet), nie okno na środku:
  `alignItems:"flex-end"`, zaokrąglone tylko górne rogi, i **koniecznie**
  `paddingBottom: calc(… + env(safe-area-inset-bottom))` — inaczej przycisk
  „Zapisz" ląduje pod paskiem gestów iPhone'a. Wymaga `viewport-fit=cover`
  w meta viewport.

## Krok 5 — Czytelność i kolor

- Tekst ≥ 4,5:1 kontrastu do tła (WCAG AA), duży tekst i ikony ≥ 3:1. Na
  ciemnym tle to boli częściej, niż się wydaje: `#555` na `#0a0a0a` to **2,7:1**
  (nieczytelne na słońcu), `#666` to 3,4:1 (wciąż za mało na tekst), dopiero
  `#8a8a8a` daje 5,7:1. Policz, nie zgaduj:
  ```bash
  node -e 'const L=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]};const [a,b]=process.argv.slice(1),[x,y]=[L(a),L(b)].sort((p,q)=>q-p);console.log(((x+0.05)/(y+0.05)).toFixed(2)+":1")' "#8a8a8a" "#161616"
  ```
- Minimalny rozmiar tekstu treści: 13 px; metadanych: 11 px — i tylko przy
  kontraście ≥ 4,5:1. 9–10 px wolno użyć wyłącznie na podpisach osi, które
  mają też wersję tekstową gdzie indziej.
- Etykiety w pasku zakładek: na telefonie krótka forma (`isMobile?short:long`),
  `whiteSpace:"nowrap"` + `overflow:"hidden"` + `textOverflow:"ellipsis"`, żeby
  piąta zakładka nie wypchnęła paska poza ekran.
- Kolor nigdy nie jest jedynym nośnikiem informacji — obok zawsze tekst albo
  ikona. Palety serii danych waliduj skillem `dataviz`, nie okiem.
- `@media (prefers-reduced-motion: reduce)` wyłącza przejścia i animacje.

## Krok 6 — Ekran główny, PWA i to, czego wymaga bezpieczny kontekst

Jeśli użytkownik ma wchodzić ze skrótu na ekranie głównym:

- `manifest.webmanifest` z `name`, `short_name`, `start_url`, `display:
  "standalone"`, `theme_color`, `background_color` i ikonami 192 + 512 px.
- `<link rel="apple-touch-icon">` **bez zaokrąglonych rogów i bez
  przezroczystości** — iOS nakłada własną maskę; zaokrąglenie w pliku daje
  ciemne obwódki. Do tego `<meta name="apple-mobile-web-app-title">`.
- Ikony renderuj z jednego źródłowego SVG (np. `@resvg/resvg-js`), żeby kształt
  miał jedno źródło prawdy. Sprawdź czytelność przy **32 px** — to rozmiar,
  w którym ikona faktycznie żyje w karcie przeglądarki.
- **Instalacja jako PWA, service worker, dostęp do kamery i powiadomienia
  wymagają zaufanego certyfikatu.** Self-signed cert ich nie odblokuje, klik
  „przejdź mimo ostrzeżenia" też nie. Jeśli aplikacja stoi na self-signed —
  powiedz to użytkownikowi, zanim obiecasz skaner kodów albo push.

## Krok 7 — Wydajność na danych komórkowych

- Serwer musi kompresować odpowiedzi (`gzip`/`br`). Bundel 300 kB bez kompresji
  to 210 kB wyrzucone przy każdym zimnym wejściu — sprawdź nagłówek
  `content-encoding` w odpowiedzi, nie zakładaj.
- Żadnych zewnętrznych czcionek ani skryptów, jeśli nie są niezbędne — każdy
  to osobne połączenie i osobny punkt awarii poza Wi-Fi. `font-family:
  system-ui` wygląda natywnie i kosztuje zero.
- Duże listy: ogranicz wysokość i przewijaj w kontenerze; nie renderuj tysiąca
  wierszy, żeby pokazać dziesięć.

## Krok 8 — Weryfikacja bez telefonu w ręku

Na serwerze nie ma przeglądarki, więc nie da się „otworzyć i zobaczyć". To nie
zwalnia ze sprawdzenia — zmienia tylko narzędzia. Zanim zgłosisz zmianę jako
gotową, zrób z tej listy wszystko, co ma zastosowanie:

1. **Policz geometrię** (Krok 2) dla najwęższego wspieranego ekranu, 360 px.
   Wypisz liczby w odpowiedzi — „kafel ma 175 px w środku, siedem celów po
   22 px" — żeby użytkownik mógł je zakwestionować.
2. **Zmontuj aplikację w jsdom** z `matchMedia` zwracającym `matches: true`
   dla `MOBILE`, kliknij przez każdy widok i **każdy formularz** (formularze
   renderują się dopiero po kliknięciu — to tam wychodzą brakujące uchwyty).
   Sprawdź, że nic nie rzuca i że pojawiają się wersje mobilne etykiet.
3. **Wyrenderuj wszystko, co jest SVG** (wykresy, sylwetki, ikony) do PNG
   w szerokości mobilnej przez `@resvg/resvg-js` i **obejrzyj**. Wykres, który
   na 720 px ma pięć podpisów dat, na 380 px musi mieć trzy — jeśli ma pięć,
   nachodzą na siebie i tego nie zobaczysz w kodzie.
4. **Grep za pułapkami**: `fontSize` poniżej 16 na `input`/`select`/`textarea`
   bez nadrzędnej reguły 16 px; przyciski z `width`/`height` poniżej 44 bez
   paddingu; `:hover` jako jedyne źródło informacji; modale z
   `alignItems:"center"` bez wariantu mobilnego; `overflow` bez `-x` na
   szerokich kontenerach.
5. **Sprawdź, co serwuje serwer**: `curl -skI -H 'Accept-Encoding: gzip'` na
   bundel (kompresja), na `/manifest.webmanifest` i ikony (200 + właściwy
   `content-type`).
6. Czego nie da się sprawdzić bez urządzenia — **gesty, klawiatura systemowa,
   safe area na konkretnym modelu** — wypisz jawnie jako niesprawdzone i poproś
   użytkownika o jedno spojrzenie na telefonie. „Sprawdziłem, że się
   kompiluje" to nie jest sprawdzenie wersji mobilnej.

## Anty-wzorce — jeśli rozpoznajesz, cofnij

- Skalowanie desktopowego układu w dół zamiast przeprojektowania.
- Ikona 20 px z obszarem klikalnym 20 px.
- Podpowiedź wyłącznie w `title` albo po najechaniu.
- Okno modalne na środku ekranu z przyciskami pod klawiaturą.
- Tekst `#555` / `#666` na czarnym tle jako „subtelny".
- Pięć zakładek z pełnymi nazwami w pasku o szerokości 360 px.
- Obietnica kamery, powiadomień albo instalacji na self-signed certyfikacie.
- Wykres z jednym `viewBox` na wszystkie szerokości — na telefonie podpisy
  osi mają 5 px.
- „Działa u mnie" na monitorze 1920 px jako dowód działania na telefonie.
