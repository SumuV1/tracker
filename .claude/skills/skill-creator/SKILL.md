---
name: skill-creator
description: Use when the user asks to create, scaffold, design, or improve a Claude Code skill (a SKILL.md under .claude/skills/) — e.g. "stwórz skill do X", "create a skill for X", "how should I structure this skill", "why isn't my skill triggering". Not for using an existing skill's functionality — only for authoring/editing skill definitions themselves.
---

# Tworzenie skilli dla Claude Code

Skill to katalog `.claude/skills/<nazwa>/` (projektowy) lub `~/.claude/skills/<nazwa>/` (globalny) zawierający `SKILL.md`. Poniższy proces prowadzi do stworzenia skilla, który faktycznie się aktywuje we właściwym momencie i daje modelowi jasne instrukcje.

## Krok 1 — Ustal jedną odpowiedzialność

Zapytaj (jeśli nie jest jasne z kontekstu rozmowy):
- Co dokładnie ma robić skill? (jedna spójna czynność, nie zbiór niepowiązanych zadań)
- Jakimi słowami/poleceniami użytkownik będzie o to prosił? (potrzebne do `description`)
- Czy skill ma przyjmować argumenty (np. `/nazwa <arg>`)?
- Skill projektowy (tylko to repo) czy globalny (wszystkie projekty)?

Jeśli skill robi więcej niż jedną rzecz, rozważ podział na kilka mniejszych skilli — łatwiej wtedy o trafny `description` i przewidywalne triggerowanie.

## Krok 2 — Nazwa

`kebab-case`, zwięzła, rzeczownikowa (`code-review`, `dataviz`, `update-config`). Nazwa katalogu musi być identyczna z polem `name` we frontmatter.

## Krok 3 — Napisz `description` (najważniejsza część)

`description` to JEDYNA rzecz, którą model widzi zanim zdecyduje się otworzyć skill — to na jej podstawie zapada decyzja o wywołaniu. Musi zawierać:

1. **Co robi** skill — krótko.
2. **Kiedy go użyć** — konkretne triggery: słowa kluczowe, typy próśb, przykładowe sformułowania użytkownika.
3. **Kiedy NIE używać** (opcjonalnie, ale ważne jeśli grozi false-positive) — np. "Not for X, only for Y".

Złe (za ogólne, nie wywoła się trafnie albo wywoła się zawsze):
```yaml
description: Helps with skills.
```

Dobre (konkretne triggery + wykluczenie):
```yaml
description: Use when the user asks to create, scaffold, or improve a Claude Code skill (SKILL.md) — "create a skill for X", "why isn't my skill triggering". Not for using an existing skill's functionality.
```

Wzoruj się na stylu opisów z istniejących skilli w projekcie (patrz przykłady w sekcji "Wzorce z tego repo" niżej) — dobre opisy często wypisują dosłowne frazy-triggery i explicit "Skip when X" / "Not for Y".

## Krok 4 — Struktura plików

- `SKILL.md` — zawsze wymagany. Frontmatter (`name`, `description`) + treść instrukcji.
- `references/*.md` — opcjonalnie: szczegółowa wiedza, którą model ma doczytać TYLKO gdy potrzebna (nie zaśmieca kontekstu przy każdym użyciu skilla). W SKILL.md odwołuj się warunkowo: "jeśli X, przeczytaj `references/foo.md`".
- `scripts/*` — opcjonalnie: gotowe skrypty/narzędzia do uruchomienia zamiast improwizowania kodu za każdym razem (np. walidator, generator).
- `assets/*` — opcjonalnie: szablony, palety, pliki wzorcowe do skopiowania/wypełnienia.

Nie twórz plików referencyjnych "na zapas" — tylko jeśli treść realnie by przeładowała SKILL.md.

## Krok 5 — Napisz treść SKILL.md

Piszesz instrukcje DLA MODELU wykonującego zadanie, nie dokumentację dla człowieka:
- Kroki numerowane, tryb rozkazujący ("Zrób X", nie "Można zrobić X").
- Konkretne, bez lania wody — model czyta to za każdym razem gdy skill się aktywuje.
- Jeśli są warianty/flagi zachowania (jak `--fix`, `--comment` w code-review), opisz każdy wariant osobno.
- Dodaj przykłady dobrego/złego rezultatu, jeśli pomagają rozróżnić przypadki brzegowe.
- Nie duplikuj wiedzy ogólnej, którą model już ma — pisz tylko to, co specyficzne dla tego zadania/projektu.

## Krok 6 — Utwórz pliki

Użyj `Write` dla `SKILL.md` (i ew. plików w `references/`/`scripts/`). Katalog docelowy:
- projektowy: `<cwd-repo-root>/.claude/skills/<nazwa>/`
- globalny: `~/.claude/skills/<nazwa>/`

## Krok 7 — Zweryfikuj

- Frontmatter to poprawny YAML, `name` == nazwa katalogu.
- Przeczytaj `description` na głos i sprawdź: czy naturalne sformułowanie użytkownika ("stwórz skill do...") faktycznie by go triggerowało, i czy nie triggeruje się na coś niepowiązanego.
- Poinformuj użytkownika, że nowy skill pojawi się w liście dostępnych skilli w NOWEJ konwersacji (bieżąca sesja ma już załadowaną listę) — jeśli chce przetestować od razu, potrzebna nowa sesja/`/clear`.

## Szablon SKILL.md

```markdown
---
name: nazwa-skilla
description: Use when [konkretne triggery, przykładowe frazy]. Not for [wykluczenia, jeśli potrzebne].
---

# [Tytuł]

[Krótki kontekst po co ten skill istnieje, 1-2 zdania.]

## Krok 1 — ...
## Krok 2 — ...
```

## Wzorce z tego repo

Zajrzyj do opisów istniejących skilli (dostępne w systemowym listingu skilli) po wzór jak formułować `description` z triggerami — np. skille `dataviz`, `update-config`, `code-review` mają opisy z jawnie wypisanymi frazami-triggerami i warunkami wykluczenia.
