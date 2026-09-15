---
name: frontend-dev
description: Use when the user asks to build, scaffold, or improve a frontend UI, component, page, or styling — "stwórz komponent", "zbuduj interfejs", "dodaj formularz", "napraw responsywność", "popraw dostępność (a11y)", "zaprojektuj layout", "build a React component", "create a UI", "style this page", "make it responsive". Framework-agnostic: detects and follows the project's existing stack (React, Vue, Svelte, vanilla JS, etc.) rather than imposing one. Not for backend/API-only work, and not for data visualization/charts/dashboards (use dataviz for that).
---

# Tworzenie frontendu

Ten skill pomaga budować i ulepszać interfejsy użytkownika — komponenty, strony, style, layouty — niezależnie od frameworka. Zanim zaczniesz pisać kod, ustal kontekst projektu i trzymaj się jego konwencji zamiast narzucać własne.

## Krok 1 — Rozpoznaj stack i konwencje projektu

- Sprawdź `package.json` (lub odpowiednik) żeby ustalić framework (React/Vue/Svelte/Angular/vanilla), bundler i biblioteki stylowania już w użyciu (Tailwind, CSS Modules, styled-components, SCSS itp.).
- Znajdź istniejące komponenty podobne do zadania i wzoruj się na ich strukturze, nazewnictwie i stylu kodu zamiast wymyślać nowy wzorzec.
- Sprawdź, czy jest system designu / paleta kolorów / design tokens (np. `tailwind.config`, `theme.ts`) i użyj go zamiast hardkodować wartości.
- Jeśli zadanie dotyczy wykresów, dashboardów lub wizualizacji danych — użyj skilla `dataviz` zamiast tego.

## Krok 2 — Struktura komponentów

- Jeden komponent = jedna odpowiedzialność. Jeśli komponent robi więcej niż jedną rzecz (np. fetch danych + renderowanie + logika formularza), rozważ podział.
- Props/interfejsy minimalne i jawne — nie przekazuj całych obiektów, gdy potrzebne jest jedno pole.
- Nazwy komponentów i plików zgodne z konwencją projektu (sprawdź istniejące pliki zamiast zakładać).
- Nie twórz abstrakcji (wrapper hooks, generic base components) dla jednego użycia — trzy podobne linijki są lepsze niż przedwczesna abstrakcja.

## Krok 3 — Stylowanie

- Używaj istniejącego podejścia w projekcie (Tailwind, CSS Modules, styled-components...) — nie mieszaj kilku podejść w jednym projekcie.
- Trzymaj się istniejącej skali spacingu/typografii/kolorów (design tokens) zamiast magicznych liczb.
- Projektuj mobile-first i responsywnie, chyba że projekt jest jawnie desktop-only.
- Zadbaj o wszystkie stany interaktywne: hover, focus, active, disabled, loading, error, empty — nie tylko "happy path".

## Krok 4 — Dostępność (a11y) — sprawdzaj zawsze

- Semantyczny HTML zamiast `<div>` na wszystko (`<button>`, `<nav>`, `<main>`, `<label>`).
- Elementy interaktywne muszą być dostępne z klawiatury (widoczny focus, obsługa Enter/Space/Escape tam, gdzie to relevantne).
- Obrazy mają `alt`, pola formularzy mają powiązane `<label>`, kontrast kolorów spełnia co najmniej WCAG AA.
- ARIA tylko wtedy, gdy semantyczny HTML nie wystarcza — nie dodawaj jej na wyrost.

## Krok 5 — Stan i dane

- Stan lokalny (np. `useState`, ref, lokalny reactive state) dla UI-only state; stan globalny/kontekst tylko gdy faktycznie dzielony między odległymi komponentami.
- Rozróżniaj stan serwera (dane z API — cache, loading, error) od stanu UI (otwarty modal, wartość inputu); nie miksuj ich bez potrzeby.
- Dla każdego fetchu danych obsłuż stany loading/error/empty, nie tylko przypadek z danymi.

## Krok 6 — Weryfikacja przed zakończeniem

- Jeśli projekt ma dev server, uruchom go i sprawdź zmianę w przeglądarce (golden path + przypadki brzegowe) zanim zgłosisz zadanie jako gotowe.
- Uruchom typecheck/lint, jeśli projekt je ma skonfigurowane.
- Jeśli nie możesz przetestować wizualnie, powiedz to wprost zamiast zakładać, że działa.
