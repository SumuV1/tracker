---
name: learning-game-designer
description: Projektuje i buduje gry do nauki (cyfrowe w HTML albo analogowe - karty, quiz drużynowy, gra planszowa/escape room) oparte na technikach nauki o najlepszych dowodach empirycznych - retrieval practice, spaced repetition, interleaving, korygujący feedback, kalibracja trudności do ok. 85% poprawnych, samowyjaśnianie, przykłady krok po kroku. Używaj ZAWSZE, gdy użytkownik chce stworzyć grę edukacyjną, grę do powtórek, grywalizację materiału, fiszki z mechaniką gry, quiz do nauki, serious game, learning game, grę na lekcję/szkolenie/egzamin/kurs językowy, albo prosi o "ciekawszy sposób na naukę" konkretnego tematu - nawet jeśli nie użyje słowa "gra". Nie używaj do samej oceny wiedzy (test sumatywny bez celu uczenia) ani do gier czysto rozrywkowych bez treści dydaktycznej.
---

# Learning Game Designer

Gra tutaj jest nośnikiem technik nauki, nie ozdobą quizu. Dowody w skrócie (szczegóły i źródła: `references/evidence.md`):

- Dunlosky i in. (2013): wysoka użyteczność mają tylko **practice testing** i **distributed practice**; podkreślanie, streszczanie i ponowne czytanie - niska.
- Testing effect: g ≈ 0,50 (Rowland 2014), g ≈ 0,61 (Adesope 2017). Z feedbackiem g = 0,73, bez - 0,39.
- Gamifikacja: cognitive g = 0,49, motivational 0,36, behavioral 0,25 (Sailer i Homner 2020). Serious games vs zwykła nauka: d = 0,29 (nauka), 0,36 (retencja); **motywacja bez istotnej przewagi** (Wouters 2013).
- Gry działają lepiej, gdy: są **wielosesyjne**, uzupełniają inną instrukcję, mają element grupowy (Wouters 2013).

Wniosek projektowy: efekt daje mechanika uczenia ukryta w grze (przywołanie, odstępy, przeplot, feedback). Fabuła, punkty i grafika tylko podtrzymują powrót do tej mechaniki. Główny tryb porażki: quiz z doklejoną fabułą, w którym punkty dostaje się za coś innego niż uczenie się.

**Test integracji (zastosuj do każdego projektu):** czy czynność, za którą gracz jest nagradzany, jest tą samą czynnością, która go uczy? Jeśli nie - przeprojektuj rdzeń.

## Workflow

### 1. Intake (pięć parametrów)

Ustal z wiadomości użytkownika, czego brakuje, i **załóż domyślne zamiast wypytywać**. Pytaj (max 2 pytania naraz) tylko o temat/materiał, jeśli go nie podano. Założenia wypisz na początku odpowiedzi jednym blokiem.

| Parametr | Domyślne założenie |
|---|---|
| Cel: co uczący ma umieć ROBIĆ po grze (czasownik: przypomnieć, rozróżnić, obliczyć, zdecydować) | przypomnieć + zastosować |
| Uczący: wiek, poziom wyjściowy, język | dorosły, początkujący-średni, język rozmowy |
| Materiał: notatki, podstawa programowa, temat | z wiedzy własnej + weryfikacja faktów (patrz krok 3) |
| Horyzont: liczba sesji i czas | ≥3 sesje w 14 dni, 10 min/sesja |
| Medium: ekran / papier / grupa | gra HTML na ekranie |

Jeśli horyzont to jedna sesja, powiedz wprost, że bez powrotu retencja będzie niższa (efekt rozłożenia w czasie znika), i zaproponuj mikropowtórki po 1 i 7 dniach.

### 2. Dobór techniki rdzeniowej do typu wiedzy

| Typ celu | Technika rdzeniowa | Mechanika gry |
|---|---|---|
| Fakty, słownictwo, definicje | cued recall + spacing (Leitner) | pudełka, mapa opanowania |
| Rozróżnianie pojęć/kategorii | interleaving + feedback kontrastowy | mieszane "co to jest?", sortowanie |
| Zrozumienie przyczynowe | elaborative interrogation, samowyjaśnianie | pytania "dlaczego" z modelową odpowiedzią i samooceną |
| Procedury, zadania (matematyka, kod, SQL) | worked examples → wygaszanie kroków → zadania mieszane | naprawa błędnego rozwiązania, uzupełnianie kroku, potem pełne zadania |
| Decyzje w scenariuszach | scenariusze z konsekwencjami + powrót po tygodniu | branching, rozwiązanie z odroczonym feedbackiem |
| Rozpoznawanie wzorców (EKG, nuty, błędy w kodzie) | perceptual learning, dużo prób, ~85% trafności | szybkie serie klasyfikacji |

Uwaga: dla **par słówek i izolowanych faktów** interleaving nie pomaga (blokowanie lepsze, g = -0,39; Brunmair i Richter 2019). Ustaw `meta.interleave: false`. Przeplot stosuj, gdy kategorie są do siebie podobne, a przykłady w obrębie kategorii zróżnicowane.

### 3. Bank treści (najważniejszy krok)

Jakość gry = jakość banku pytań. Pisz go przed jakimkolwiek kodem.

- Jedna pozycja = jedna idea. Odpowiedź w pytaniu cued recall: jednoznaczna, ≤ 6 słów.
- Minimum 24 pozycje, 3+ tematów (przy interleaving). Docelowo 30-60.
- ≥ 25% pozycji na poziomie **transferu** (nowa sytuacja, zastosowanie), nie powtórzenie zdania ze źródła. Test końcowy powinien wymagać tego, co cel nazywa czasownikiem.
- Dystraktory z realnych błędów uczących się, o podobnej długości i formie. Poprawna odpowiedź nie może być systematycznie najdłuższa. Bez "wszystkie powyższe".
- `why`: 1-2 zdania przyczynowe. `why_wrong` dla dystraktorów, gdy znasz konkretne nieporozumienie.
- **Poprawność merytoryczna:** fakty nietrywialne, niszowe lub zależne od daty zweryfikuj wyszukiwaniem. Błędny feedback jest gorszy niż brak gry, bo utrwala błąd z potwierdzeniem. Czego nie da się zweryfikować, pomiń albo oznacz.
- Jeśli użytkownik dał materiał (plik, notatki), buduj z niego i nie dodawaj faktów spoza niego bez oznaczenia.

Schemat pozycji i pełne zasady: `references/mechanics.md` → sekcja "Bank".

### 4. Pętla rdzeniowa (niezmienne elementy)

Każda gra, cyfrowa i analogowa, ma tę kolejność. Skrócenie jej psuje efekt:

1. **Pytanie przed odpowiedzią.** Gracz wywołuje odpowiedź z pamięci, zanim cokolwiek zobaczy. Brak ekranów "przeczytaj najpierw" (reread ma niską użyteczność).
2. **Zobowiązanie do pewności** (pewny / chyba / zgaduję). Daje kalibrację i wykorzystuje efekt hiperkorekty: błędy popełnione z pewnością są poprawiane skuteczniej.
3. **Natychmiastowy feedback korygujący** z wyjaśnieniem. Sama informacja "źle" nie wystarcza.
4. **Ponowne podanie błędnych** po kilku innych pozycjach w tej samej sesji (successive relearning).
5. **Harmonogram powrotu:** poprawne odpowiedzi odsuwają pozycję w czasie (1 → 3 → 7 → 16 → 35 dni), błędna wraca do początku.
6. **Kalibracja trudności:** cel to ok. 80-90% poprawnych (Wilson i in. 2019: optimum ≈ 85% dla zadań klasyfikacji). Gra mierzy ruchomą trafność i dostosowuje tempo wprowadzania nowego materiału oraz format (wybór → wpisanie).

### 5. Warstwa gry (lekka, w służbie pętli)

- **Fikcja:** 1-2 zdania ramy, w której czynność nauki jest czasownikiem fabuły ("diagnozujesz", "łamiesz szyfr"). Fikcja zwiększała efekt behawioralny (Sailer i Homner).
- **Postęp = opanowanie**, nie czas ani liczba kliknięć (mapa opanowania, rangi z progami opanowania).
- **Punkty tylko za uczenie:** poprawne wywołanie z pamięci, więcej za trudniejszy format (wpisanie > wybór) i późniejsze pudełko. Zero punktów za obecność, czas, serie bez treści. Nagrody oczekiwane za samą czynność osłabiają motywację wewnętrzną (Deci i in. 1999, 128 eksperymentów).
- **Porażka tania:** brak żyć, brak utraty postępu, brak limitu czasu domyślnie. Błąd = kolejna próba z wyjaśnieniem.
- **Autonomia:** wybór długości sesji i nacisku na temat.
- **Grupa:** jeśli kontekst grupowy, współpraca w zespole + rywalizacja między zespołami (Sailer i Homner: lepsza niż sama rywalizacja). Unikaj rankingu indywidualnego o stałej pozycji, demotywuje słabszych.
- **Obciążenie poznawcze:** jedna nowa mechanika naraz, instrukcja ≤ 3 zdania, zero dekoracji, które nic nie niosą.

### 6. Budowa

**Gra cyfrowa (domyślnie):** użyj gotowego silnika, nie pisz od zera.

1. Zapisz bank jako `bank.json` (schemat w `references/mechanics.md`).
2. `python scripts/check_bank.py bank.json` - napraw wszystkie ERROR, rozważ WARN.
3. `python scripts/build_game.py bank.json game.html` - wstrzykuje bank do `assets/game-template.html` (Leitner, retrieval-first, pewność, przeplot, adaptacja trudności, mapa opanowania, eksport/import postępu).
4. Dostosuj tylko to, co wynika z projektu: `meta.fiction`, kolory (`meta.accent`), napisy UI (`meta.ui`), `meta.interleave`. Zmieniaj kod silnika tylko, gdy cel wymaga mechaniki, której szablon nie ma. Wtedy zachowaj pętlę z kroku 4.
5. Dostarczenie: jedna samodzielna strona HTML. Jeśli dostępne jest narzędzie Artifact, opublikuj jako artefakt (załaduj wcześniej skill `artifact-design`); w przeciwnym razie `SendUserFile`. Postęp w przeglądarce może zniknąć (localStorage bywa pusty), dlatego szablon ma eksport/import postępu w JSON. Jeśli sesja oferuje zdolność runtime utrwalającą stan, użyj jej zamiast localStorage.

**Gra analogowa:** wybierz wzorzec z `references/mechanics.md` → "Wzorce analogowe", wygeneruj karty/arkusze jako PDF lub dokument (skille `pdf`/`docx` albo dokument z Claude), z kluczem odpowiedzi i instrukcją prowadzącego.

### 7. Przegląd przed oddaniem

Przejdź `references/review-checklist.md`. Każdy punkt oznacz spełniony/niespełniony. Niespełnione popraw, nie dopisuj usprawiedliwień.

### 8. Odpowiedź końcowa

Krótko, bez wstępów i pochwał. Układ:

1. Plik/artefakt (jedno zdanie, co to jest i ile pozycji).
2. Założenia, które przyjąłeś w intake.
3. Tabela: **technika → gdzie w grze → efekt wg literatury** (liczby ze `references/evidence.md`, tylko te, które realnie zaimplementowałeś).
4. Plan użycia: ile sesji, w jakich odstępach, co zmierzyć.
5. Ograniczenia: średnie efekty to nie gwarancja; skuteczność mierzy się testem odroczonym (1-2 tygodnie, bez gry), nie wynikiem w grze; gdzie dowody są słabsze.

Nie obiecuj konkretnego wzrostu wyników. Podaj dane jako zakres z badań i zaznacz zastrzeżenia (np. badania z randomizacją pokazują mniejsze efekty gier niż quasi-eksperymenty).

## Czego nie robić

- Nie dodawaj ekranu "przeczytaj materiał" jako części gry. Materiał źródłowy to osobna sprawa; gra służy do wywoływania.
- Nie nagradzaj szybkości, chyba że celem jest płynność (np. tabliczka mnożenia).
- Nie używaj odliczania czasu domyślnie. Presja czasu zwiększa obciążenie i obniża jakość przywołania; włączaj opcjonalnie.
- Nie wprowadzaj więcej niż ~8 nowych pozycji w sesji.
- Nie cytuj liczb spoza `references/evidence.md` bez wyszukania. Dane oznaczone tam jako niezweryfikowane podawaj z adnotacją.
- Nie twórz gry z jednego typu pytań wyboru, jeśli cel wymaga produkcji (wpisanie, wyjaśnienie, rozwiązanie zadania).
