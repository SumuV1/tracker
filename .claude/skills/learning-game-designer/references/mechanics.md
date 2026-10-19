# Mechaniki, schemat banku i wzorce analogowe

## Spis treści
1. Bank: schemat i zasady
2. Katalog mechanik (technika → mechanika → pułapka)
3. Wzorce analogowe (papier, grupa)
4. Procedury i zadania (worked examples)
5. Pomiar skuteczności

---

## 1. Bank: schemat i zasady

`bank.json`:

```json
{
  "meta": {
    "title": "Diagnoza błędów logicznych",
    "subtitle": "10 minut dziennie",
    "lang": "pl",
    "interleave": true,
    "accent": "#2f6f5e",
    "fiction": {
      "name": "Biuro Detektywa Argumentów",
      "intro": "Każda odpowiedź to trop. Zamykaj sprawy, wracaj do starych.",
      "ranks": ["Praktykant", "Detektyw", "Inspektor", "Mistrz"]
    },
    "ui": {}
  },
  "topics": [
    {"id": "t1", "name": "Błędy relewancji"},
    {"id": "t2", "name": "Błędy przyczynowości"}
  ],
  "items": [
    {
      "id": "i01",
      "topic": "t1",
      "q": "„Nie możesz krytykować polityki, bo sam jesteś nieudacznikiem.” Jak nazywa się ten błąd?",
      "a": "ad hominem",
      "accept": ["argumentum ad hominem"],
      "distractors": ["fałszywa dychotomia", "post hoc", "pętla w rozumowaniu"],
      "why": "Atakuje osobę zamiast argumentu. Prawdziwość tezy nie zależy od tego, kto ją głosi.",
      "why_wrong": {"post hoc": "Post hoc dotyczy przyczyny z następstwa czasowego."},
      "hint": "Kogo atakuje mówiący?",
      "grade": "auto"
    }
  ]
}
```

Pola pozycji:

| Pole | Wymagane | Opis |
|---|---|---|
| `id` | tak | unikalny |
| `topic` | tak | id z `topics` |
| `q` | tak | pytanie; nie może zawierać odpowiedzi |
| `a` | tak | poprawna odpowiedź (krótka) albo model odpowiedzi dla `grade:"self"` |
| `accept` | nie | dopuszczalne warianty przy wpisywaniu |
| `distractors` | zalecane | 2-4 błędne opcje z realnych nieporozumień. Bez nich pozycja jest zawsze w formacie wpisywania |
| `why` | tak | 1-2 zdania przyczynowe, pokazywane po każdej odpowiedzi |
| `why_wrong` | nie | mapa: tekst dystraktora → konkretne nieporozumienie |
| `hint` | nie | wskazówka bez podawania odpowiedzi |
| `level` | zalecane | `recall` (przypomnienie) albo `transfer` (nowa sytuacja, zastosowanie). Walidator liczy udział transferu (cel ≥ 25%) |
| `mc_only` | nie | `true` = zawsze format wyboru, nigdy wpisywanie. Dla poprawnych odpowiedzi będących zdaniem (zbyt długich do wpisania). Wymaga ≥ 2 dystraktorów |
| `grade` | nie | `auto` (domyślnie; dopasowanie tekstu, a przy braku zgodności pytanie "czy Twoja odpowiedź była poprawna?") albo `self` (pytania "wyjaśnij/uzasadnij": gracz wpisuje, widzi model `a`, ocenia się) |

Zasady pisania:

- Jedna idea na pozycję; odpowiedź ≤ 6 słów (dla `grade:"auto"`).
- ≥ 25% pozycji na poziomie transferu: nowy scenariusz, zastosowanie reguły, a nie parafraza źródła.
- Dystraktory podobne długością i formą. Nie więcej niż ~40% poprawnych odpowiedzi jako najdłuższa opcja. Bez "wszystkie/żadne z powyższych".
- Pozycje `grade:"self"` dla zrozumienia przyczynowego ("Dlaczego X prowadzi do Y?") - to elaborative interrogation.
- Pozycje procedur: patrz sekcja 4.
- Liczba: min. 24, docelowo 30-60. Wprowadzanie nowych: max ~8 na sesję.

`meta.interleave`: `true` dla kategorii podobnych do siebie (rozróżnianie), `false` dla par słówek i luźnych faktów.

---

## 2. Katalog mechanik

| Technika | Mechanika gry | Dlaczego tak | Pułapka |
|---|---|---|---|
| Retrieval | "Zamknij sprawę": odpowiedź przed odsłonięciem tropu | wymusza produkcję z pamięci | podpowiedzi zawsze widoczne = cichy recognition |
| Feedback | Raport po odpowiedzi: poprawna + dlaczego + dlaczego nie Twoja | korygujący feedback (g 0,73 vs 0,39) | samo "Źle!" bez wyjaśnienia |
| Spacing | Pudełka Leitnera: akta wracają po 1, 3, 7, 16, 35 dniach | rozłożenie w czasie, wysoka użyteczność | gra "do końca" w jeden wieczór |
| Successive relearning | Błędna pozycja wraca po 3-5 innych, aż raz poprawna w sesji | domknięcie błędu bez natychmiastowego powtórzenia | powtórka natychmiast po błędzie (tylko krótka pamięć robocza) |
| Interleaving | Mieszane "którym błędem jest to?" z różnych tematów | wymusza dyskryminację kategorii | przeplot słówek (szkodzi) |
| Elaborative interrogation | Pytania "dlaczego" + model odpowiedzi + samoocena | uczy przyczyn | zbyt otwarte pytania bez modelu |
| Metapoznanie | Deklaracja pewności, wykres kalibracji na końcu | hiperkorekta, trafniejsza samoocena | punkty za pewność zachęcają do blefu, dlatego nie nagradzamy pewności, tylko pokazujemy kalibrację |
| Kalibracja trudności | Ruchoma trafność z paskiem 80-90%, adaptacja tempa i formatu | ~85% jako cel | wymuszanie 100% (nuda) lub <70% (zniechęcenie) |
| Postęp widoczny | Mapa opanowania: kafelki kolorowane pudełkiem | poczucie kompetencji bez nagród zewnętrznych | postęp mierzony czasem lub liczbą sesji |
| Fikcja | Rama 1-2 zdań, czynność nauki = czasownik fabuły | wspiera efekt behawioralny | fabuła z dialogami i animacjami = obciążenie |
| Social | Zespół zbiera "wspólną kasę" z poprawnych odpowiedzi; zespoły porównują wynik | współpraca + rywalizacja | stały ranking indywidualny |

---

## 3. Wzorce analogowe

Dla każdego wzorca generuj: karty/arkusze (pdf/docx), klucz odpowiedzi, instrukcję prowadzącego (≤ 1 strona), harmonogram powrotów.

### A. Pudełko Leitnera (indywidualnie lub w parach)
- Materiały: karty pytanie/odpowiedź+wyjaśnienie, 5 kopert/przegródek z datami powrotu (dziś, +1, +3, +7, +16 dni).
- Reguły: gracz odpowiada na głos lub pisemnie **przed** odwróceniem karty; poprawna → następna przegródka, błędna → pierwsza.
- Punkty: 1 za poprawną z przegródki 1-2, 2 za 3-4, 3 za 5. Nic za samo przejrzenie.
- Czas: 10 min dziennie.

### B. Zakład pewności (grupa 3-5 zespołów)
- Prowadzący czyta pytanie; zespół **zapisuje** odpowiedź i stawia 1, 2 lub 3 żetony.
- Poprawna: +stawka. Błędna: -stawka. Za pewnością idzie ryzyko, więc zespoły uczą się kalibracji.
- Po rundzie prowadzący omawia **wyłącznie** pytania, na które zespoły stawiały dużo i myliły się (hiperkorekta).
- Pytania mieszane tematycznie (interleaving). Co najmniej jedna runda wraca do materiału sprzed tygodnia.

### C. Escape room z powrotem
- Każda zagadka (zamek) wymaga odpowiedzi na pytanie z **wcześniejszej** lekcji (wywołanie odroczone), nie z bieżącej.
- Nagroda: kolejna wskazówka, wyłącznie za odpowiedź. Błąd daje wyjaśnienie, a zamek zostaje.
- Kolejność zamków mieszana tematycznie.

### D. Detektyw błędów (procedury)
- Karta ze rozwiązaniem zadania zawierającym jeden błąd; gracz wskazuje krok i poprawia.
- Poziomy: błąd oczywisty → subtelny → dwa błędy. To worked example z aktywnym przetwarzaniem.

### E. Pojedynek wyjaśnień (pary)
- Gracz A losuje pytanie "dlaczego", wyjaśnia partnerowi własnymi słowami (30-60 s). B ocenia względem modelu odpowiedzi z karty i zadaje jedno pytanie. Zamiana ról.
- Punkty za zgodność z modelem, nie za płynność.

### F. Sortownia (rozróżnianie)
- Stos 30-40 kart z przykładami, gracz sortuje do 4-5 kategorii bez ściągi; potem porównuje z kluczem i **zapisuje, które kategorie pomylił**. Kolejna runda ze zmieszanym stosem.

---

## 4. Procedury i zadania (matematyka, kod, SQL)

Sekwencja poziomów w grze ("worked example fading"):

1. **Pełny przykład + pytanie o uzasadnienie kroku** ("dlaczego tu dzielimy?") - początkujący.
2. **Przykład z jednym brakującym krokiem** do uzupełnienia.
3. **Przykład z kilkoma brakami**.
4. **Naprawa błędnego rozwiązania** (znajdź i popraw krok).
5. **Pełne zadanie samodzielnie**, **przemieszane** z innymi typami zadań (interleaving typów, nie tematów).

Zasady: poziom rośnie z opanowaniem danego typu zadania. U osób zaawansowanych pomiń poziomy 1-2 (przykłady szkodzą ekspertom). Zadania generuj parametrycznie (różne liczby, ta sama struktura), żeby ten sam typ wracał w nowych wariantach, a nie w tych samych danych.

---

## 5. Pomiar skuteczności

Wynik w grze nie mierzy uczenia: poprawna odpowiedź tuż po feedbacku to krótka pamięć. Dostarcz użytkownikowi plan:

- **Pretest** (opcjonalnie) przed pierwszą sesją: 10-15 pozycji z banku, bez feedbacku.
- **Test odroczony** 7-14 dni po ostatniej sesji, **bez gry**, w formacie zgodnym z celem (jeśli cel to zastosowanie - zadania, nie definicje), z pozycjami nowymi (transfer) i starymi.
- Porównanie z grupą kontrolną lub poprzednim sposobem nauki, jeśli to możliwe.
- Szablon cyfrowy eksportuje statystyki (trafność, kalibracja, pudełka) w JSON.
