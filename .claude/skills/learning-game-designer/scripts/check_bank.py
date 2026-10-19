#!/usr/bin/env python3
"""Walidator banku pozycji dla learning-game-designer.

Użycie:
    python3 check_bank.py bank.json
    python3 check_bank.py game.html          # czyta bank spomiędzy /*BANK_START*/ i /*BANK_END*/

Kod wyjścia: 1 gdy są ERROR, 0 w pozostałych przypadkach.
Wypisuje ERROR (blokują budowę), WARN (jakość/dydaktyka) i statystyki.
"""
import json
import re
import sys
import unicodedata
from collections import Counter

MIN_ITEMS = 24
MAX_NEW_TOPIC_SHARE = 0.60
LONGEST_BIAS_LIMIT = 0.40
MIN_TRANSFER_SHARE = 0.25
BAD_OPTIONS = ("wszystkie powyższe", "żadne z powyższych", "żadna z powyższych", "all of the above", "none of the above")


def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower().replace("ł", "l"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9\s]", " ", s)).strip()


def load(path):
    text = open(path, encoding="utf-8").read()
    if path.lower().endswith((".html", ".htm")):
        m = re.search(r"/\*BANK_START\*/(.*?)/\*BANK_END\*/", text, re.S)
        if not m:
            raise ValueError("Brak znaczników /*BANK_START*/ ... /*BANK_END*/ w pliku HTML")
        text = m.group(1)
    return json.loads(text)


def check(bank):
    err, warn = [], []
    meta = bank.get("meta")
    topics = bank.get("topics")
    items = bank.get("items")

    if not isinstance(meta, dict) or not meta.get("title"):
        err.append("meta.title jest wymagane")
        meta = meta if isinstance(meta, dict) else {}
    if not isinstance(topics, list) or not topics:
        err.append("topics: wymagana niepusta lista {id, name}")
        topics = []
    if not isinstance(items, list) or not items:
        err.append("items: wymagana niepusta lista")
        return err, warn, {}

    topic_ids = []
    for t in topics:
        if not isinstance(t, dict) or not t.get("id") or not t.get("name"):
            err.append(f"topics: nieprawidłowy wpis {t!r}")
        else:
            topic_ids.append(t["id"])
    if len(set(topic_ids)) != len(topic_ids):
        err.append("topics: powtórzone id")

    interleave = meta.get("interleave", True) is not False
    seen_ids, seen_q = set(), {}
    mc_items = longest = 0
    self_items = transfer_items = level_marked = 0
    topic_counter = Counter()

    for n, it in enumerate(items, 1):
        label = f"items[{n}]" + (f" id={it.get('id')}" if isinstance(it, dict) and it.get("id") else "")
        if not isinstance(it, dict):
            err.append(f"{label}: wpis nie jest obiektem")
            continue
        for f in ("id", "topic", "q", "a", "why"):
            if not it.get(f):
                err.append(f"{label}: brak pola '{f}'")
        iid = it.get("id")
        if iid in seen_ids:
            err.append(f"{label}: duplikat id")
        seen_ids.add(iid)
        if it.get("topic") and it["topic"] not in topic_ids:
            err.append(f"{label}: topic '{it['topic']}' nie istnieje w topics")
        topic_counter[it.get("topic")] += 1

        grade = it.get("grade", "auto")
        if grade not in ("auto", "self"):
            err.append(f"{label}: grade musi być 'auto' lub 'self'")
        if grade == "self":
            self_items += 1

        q, a = str(it.get("q", "")), str(it.get("a", ""))
        nq = norm(q)
        if nq in seen_q:
            warn.append(f"{label}: to samo pytanie co {seen_q[nq]}")
        seen_q[nq] = iid

        if grade == "auto":
            if len(a) > 60 and not it.get("mc_only"):
                warn.append(f"{label}: odpowiedź ma {len(a)} znaków; dla grade:auto skracaj do ≤ 6 słów albo użyj grade:'self'")
            na = norm(a)
            if len(na) >= 4 and re.search(r"\b" + re.escape(na) + r"\b", nq):
                warn.append(f"{label}: pytanie zawiera odpowiedź (przeciek)")
        if len(str(it.get("why", ""))) < 15:
            warn.append(f"{label}: 'why' krótsze niż 15 znaków; feedback powinien wyjaśniać przyczynę")

        acc = it.get("accept")
        if acc is not None and (not isinstance(acc, list) or not all(isinstance(x, str) for x in acc)):
            err.append(f"{label}: accept musi być listą napisów")

        d = it.get("distractors")
        if d is not None:
            if not isinstance(d, list) or not all(isinstance(x, str) for x in d):
                err.append(f"{label}: distractors musi być listą napisów")
            else:
                nd = [norm(x) for x in d]
                if norm(a) in nd:
                    err.append(f"{label}: dystraktor równy poprawnej odpowiedzi")
                if len(set(nd)) != len(nd):
                    err.append(f"{label}: powtórzone dystraktory")
                if len(d) < 2:
                    warn.append(f"{label}: <2 dystraktory; pozycja będzie zawsze w formacie wpisywania")
                elif len(d) > 4:
                    warn.append(f"{label}: >4 dystraktory; gra losuje 3")
                else:
                    mc_items += 1
                    if len(a) > max(len(x) for x in d):
                        longest += 1
                for x in d + [a]:
                    if norm(x) in [norm(b) for b in BAD_OPTIONS]:
                        warn.append(f"{label}: opcja '{x}' (unikaj 'wszystkie/żadne z powyższych')")
                ww = it.get("why_wrong")
                if isinstance(ww, dict):
                    for k in ww:
                        if k not in d:
                            warn.append(f"{label}: why_wrong ma klucz '{k}', którego nie ma w distractors")

        if it.get("mc_only") and not (isinstance(d, list) and len(d) >= 2):
            err.append(f"{label}: mc_only wymaga ≥ 2 dystraktorów")
        if it.get("mc_only") and grade == "self":
            err.append(f"{label}: mc_only i grade:'self' wykluczają się")

        lvl = it.get("level")
        if lvl is not None:
            level_marked += 1
            if lvl == "transfer":
                transfer_items += 1
            elif lvl != "recall":
                warn.append(f"{label}: level powinno być 'recall' lub 'transfer'")

    total = len(items)
    if total < MIN_ITEMS:
        warn.append(f"Tylko {total} pozycji (zalecane ≥ {MIN_ITEMS}); mała pula szybko wraca i przestaje wymagać wysiłku")
    if interleave and len(topic_ids) < 2:
        warn.append("interleave=true przy jednym temacie; przeplot nie ma czego mieszać")
    if total and topic_counter:
        top, cnt = topic_counter.most_common(1)[0]
        if len(topic_ids) > 1 and cnt / total > MAX_NEW_TOPIC_SHARE:
            warn.append(f"Temat '{top}' to {cnt/total:.0%} pozycji (próg {MAX_NEW_TOPIC_SHARE:.0%})")
    if mc_items and longest / mc_items > LONGEST_BIAS_LIMIT:
        warn.append(f"Poprawna odpowiedź jest najdłuższą opcją w {longest}/{mc_items} pozycji ({longest/mc_items:.0%}); uczący się zgadują po długości")
    if total and self_items / total > 0.5:
        warn.append(f"{self_items}/{total} pozycji to grade:'self'; samoocena bywa zawyżona, dodaj pozycje z automatyczną oceną")
    if level_marked == 0:
        warn.append("Brak pola 'level' (recall|transfer): nie da się sprawdzić udziału pozycji transferowych (cel ≥ 25%)")
    elif transfer_items / total < MIN_TRANSFER_SHARE:
        warn.append(f"Pozycje transferowe: {transfer_items}/{total} ({transfer_items/total:.0%}); cel ≥ {MIN_TRANSFER_SHARE:.0%}")

    stats = {
        "pozycje": total,
        "tematy": dict(topic_counter),
        "z_dystraktorami": mc_items,
        "self": self_items,
        "transfer": transfer_items if level_marked else "nieoznaczone",
    }
    return err, warn, stats


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    try:
        bank = load(argv[1])
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: nie można wczytać banku: {e}")
        return 1
    err, warn, stats = check(bank)
    for e in err:
        print("ERROR:", e)
    for w in warn:
        print("WARN: ", w)
    if stats:
        print("STATY:", json.dumps(stats, ensure_ascii=False))
    print(f"Wynik: {len(err)} ERROR, {len(warn)} WARN")
    return 1 if err else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
