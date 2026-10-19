#!/usr/bin/env python3
"""Buduje bank gry „Przekonania" z dwóch tabel xlsx i pisanych ręcznie scenariuszy.

Użycie (z katalogu repo):
    python3 scripts/beliefs/gen-bank.py [--bias bledy_poznawcze_bias_wiki.xlsx]
                                        [--models modele_mentalne_fs_blog.xlsx]

Wynik:
    frontend/src/beliefsBank.json      — bank dla aplikacji (zwarty: pojęcia raz,
                                         pozycje odwołują się do nich po id)
    scripts/beliefs/bank.expanded.json — ten sam bank w formacie skilla
                                         learning-game-designer, do check_bank.py

Trzy rodzaje pozycji:
  def — opis pojęcia z tabeli (z wyciętymi zdaniami, które zdradzają nazwę)
        → nazwa. Dystraktory z tej samej podgrupy kodeksu albo kategorii modeli,
        bo rozróżnianie podobnych pojęć jest tu celem.
  scn — scenariusz z życia → które pojęcie działa (transfer). Ręcznie,
        scenarios.json.
  why — pytanie „dlaczego" z wzorcową odpowiedzią i samooceną.

Bez zależności spoza biblioteki standardowej: xlsx to zip z XML-em.
"""
import argparse
import json
import os
import random
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
T = "{%s}t" % NS["m"]


# ── xlsx ────────────────────────────────────────────────────────────────────
def read_xlsx(path):
    """{nazwa arkusza: [ {kolumna: wartość} ]} — tylko tekst i liczby."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(T)))
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    out = {}
    for i, sh in enumerate(wb.find("m:sheets", NS), 1):
        rows = []
        root = ET.fromstring(z.read(f"xl/worksheets/sheet{i}.xml"))
        for r in root.iter("{%s}row" % NS["m"]):
            row = {}
            for c in r.findall("m:c", NS):
                col = re.match(r"[A-Z]+", c.get("r")).group()
                v, t = c.find("m:v", NS), c.get("t")
                if t == "s":
                    row[col] = shared[int(v.text)]
                elif t == "inlineStr":
                    row[col] = "".join(x.text or "" for x in c.iter(T))
                elif v is not None:
                    row[col] = v.text
            rows.append(row)
        out[sh.get("name")] = rows
    return out


# ── Scalanie i wykluczenia ──────────────────────────────────────────────────
# Synonimy i duplikaty między tabelami: jedno pojęcie = jedna pozycja, a druga
# nazwa trafia do akceptowanych odpowiedzi. Bez tego „efekt Barnuma" byłby
# błędną opcją w pytaniu o efekt Forera.
MERGE = {
    "b9": "b8",      # Baader-Meinhof = iluzja częstości
    "b116": "b115",  # Barnum = Forer
    "b132": "b131",  # eskalacja zaangażowania = irracjonalna eskalacja
    "b154": "b153",  # prawo trywialności = malowanie rowerowni
    "b29": "b30",    # racjonalizacja po zakupie = wspieranie własnego wyboru
    "b159": "b158",  # pomylenie źródła ⊂ błędna atrybucja pamięci
    "b168": "b18",   # błąd negatywności występuje w kodeksie dwa razy
    "b156": "m8",    # brzytwa Ockhama w obu tabelach
    "m82": "b1",     # heurystyka dostępności
    "m95": "b94",    # błąd retrospekcji
    "m99": "b82",    # błąd przeżywalności
    "m84": "b12",    # częstości bazowe
    "m85": "b58",    # stereotypizacja
    "m86": "b155",   # fałszywe koniunkcje = błąd koniunkcji
    "m97": "b121",   # podstawowy błąd atrybucji
    "m63": "b24",    # ramowanie
}
# Pary zbyt bliskie, żeby jedno było „błędną" opcją dla drugiego.
EXCLUDE_GROUPS = [
    ["b130", "b131", "m94"], ["b27", "b28", "b35", "m101"], ["b32", "b33", "b35"],
    ["b37", "b115"], ["b125", "b126"], ["b111", "b120"], ["b103", "b10"],
    ["b93", "b169"], ["b170", "b175"], ["b181", "b178", "b179", "b173"],
    ["b164", "b165", "b58"], ["b94", "b95", "b96"], ["b95", "b96"], ["b62", "b122"],
    ["b102", "b128"], ["b106", "b48"], ["b124", "b135"], ["b144", "b145"],
    ["b157", "b22"], ["b161", "b172", "b162", "b43"], ["b83", "b155"],
    ["b66", "m87"], ["b45", "b47", "m92", "m41"], ["m83", "b12", "b58", "b155"],
    ["m28", "m77"], ["m80", "b71"], ["m1", "m66"], ["m20", "m21"], ["b21", "b5"],
    ["b13", "b15"], ["b17", "b183"], ["b8", "b2"], ["b24", "m63"],
]


def excluded_pairs():
    ex = set()
    for g in EXCLUDE_GROUPS:
        g = [MERGE.get(x, x) for x in g]
        for a in g:
            for b in g:
                if a != b:
                    ex.add((a, b))
    return ex


# Krótsze formy, które ktoś naturalnie wpisze. Reszta wariantów to nazwa
# angielska i część nazwy przed nawiasem — dokłada je build_accept.
ACCEPT = {
    "b1": ["dostępność", "heurystyka dostępności"],
    "b19": ["kotwiczenie", "kotwica", "efekt zakotwiczenia"],
    "b27": ["błąd potwierdzenia", "potwierdzenie", "konfirmacja"],
    "b24": ["ramowanie", "framing"],
    "b121": ["FAE", "błąd atrybucji"],
    "b130": ["koszty utopione", "sunk cost"],
    "b131": ["eskalacja zaangażowania", "eskalacja"],
    "b106": ["nadmierna pewność siebie", "nadmierna pewność"],
    "b112": ["Dunning-Kruger", "Dunning Kruger"],
    "b18": ["negatywność"],
    "b94": ["hindsight", "efekt wiedzy po fakcie"],
    "b82": ["przeżywalność", "błąd przeżywającego"],
    "b12": ["częstość bazowa", "pomijanie częstości bazowych"],
    "b155": ["koniunkcja", "problem Lindy"],
    "b58": ["stereotypy", "skłonność do stereotypizacji"],
    "b51": ["Monte Carlo", "błąd Monte Carlo"],
    "b71": ["halo"],
    "b66": ["owczy pęd"],
    "b134": ["awersja do straty"],
    "b141": ["posiadanie"],
    "b148": ["status quo"],
    "b8": ["zjawisko Baader-Meinhof", "Baader-Meinhof"],
    "b115": ["efekt Barnuma", "Barnum"],
    "b153": ["prawo trywialności", "bikeshedding"],
    "b30": ["racjonalizacja po zakupie"],
    "b158": ["pomylenie źródła"],
    "b120": ["efekt Lake Wobegon", "Lake Wobegon"],
    "b126": ["Peltzman"],
    "b88": ["reflektor", "spotlight"],
    "b86": ["przejrzystość"],
    "b98": ["impact bias"],
    "b100": ["planowanie"],
    "b170": ["szczyt i koniec", "peak-end"],
    "m8": ["Ockham", "brzytwa Ockhama"],
    "m9": ["Hanlon"],
    "m43": ["regresja"],
    "m101": ["falsyfikacja"],
    "m87": ["dowód społeczny"],
    "m5": ["drugi rząd", "myślenie drugiego rzędu"],
}


def build_accept(c):
    out = []
    for s in [c["en"]] + ACCEPT.get(c["id"], []) + c.get("alias", []):
        if s and s not in out and s != c["n"]:
            out.append(s)
    base = re.split(r"\s*\(", c["n"])[0].strip()
    if base != c["n"] and base not in out:
        out.append(base)
    return out


# ── Wycinanie nazwy z opisu ─────────────────────────────────────────────────
STOP = {"efekt", "błąd", "błędy", "the", "effect", "bias", "fallacy", "of", "to", "and", "in",
        "law", "prawo", "iluzja", "illusion", "heurystyka", "heuristic", "model", "models",
        "części", "część", "part", "tendency", "skłonność", "się", "do", "na", "w", "z", "i",
        "za", "od", "dla", "lub", "oraz", "czy", "nie", "jest", "przez", "mental", "thinking",
        "myślenie", "zjawisko", "phenomenon", "theory", "zasada", "hypothesis", "hipoteza"}


def stems(*names):
    out = set()
    for n in names:
        for w in re.findall(r"[\wąćęłńóśźż'-]+", n.lower()):
            w = w.strip("-'")
            if len(w) < 4 or w in STOP:
                continue
            out.add(w[:max(4, len(w) - 3)])   # rdzeń odporny na odmianę
    return out


GIVEAWAY = re.compile(r"inna nazwa|nazwa pochodzi|nazwa nawiązuje|nazwany|nazwana|zwany|zwana|znany też|"
                      r"znane też|nazywan|to samo zjawisko|synonim|odmiana|podtyp|podmodel|"
                      r"rozszerzenie|szczególny przypadek|element reguły")


def proper_stems(names):
    """Rdzenie nazw własnych z nazwy pojęcia: Forer, Restorff, Semmelweis, IKEA…
    Słowa pospolite (pewność, uwaga) zostają w opisie — nazwa opisowa i tak
    mówi, czym jest zjawisko, a wycięcie zdania definiującego psuje pytanie."""
    out = set()
    for n in names:
        for i, w in enumerate(re.findall(r"[\wĄĆĘŁŃÓŚŹŻąćęłńóśźż'-]+", n)):
            for part in w.split("-"):
                part = part.strip("'")
                if i > 0 and part[:1].isupper() and len(part) >= 4 and part.lower() not in STOP:
                    out.add(part.lower()[:max(4, len(part) - 3)])
    return out


def redact(desc, names):
    """Usuwa zdania, które zdradzają nazwę (eponimy, „inna nazwa…"), a dosłowne
    wystąpienia nazwy zastępuje wielokropkiem."""
    st = proper_stems(names[:1])   # tylko polska nazwa: angielskie są w Title Case
    sents = re.split(r"(?<=[.!?])\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ„\"])", desc.strip())
    keep = []
    for s in sents:
        low = s.lower()
        words = re.findall(r"[\wąćęłńóśźż'-]+", low)
        if any(w.startswith(x) for w in words for x in st) or GIVEAWAY.search(low):
            continue
        for n in names:
            s = re.sub(r"(?<![\w])" + re.escape(n) + r"(?![\w])", "___", s, flags=re.I)
        keep.append(mask_words(s, names[0]))
    return " ".join(keep)


# Słowa z nazwy, które same nie zdradzają odpowiedzi — zostają w opisie.
MASK_KEEP = {"własnej", "grupy", "czasu", "informacji", "mniej", "pierwszego", "bezpieczeństwo",
             "punkty", "argument", "błędu", "moralne", "moralnych", "błędna", "pamięci", "ryzyka"}


def mask_words(s, name):
    """Odmienione wystąpienia słów nazwy → „…". Przy wyborze z listy opis
    z tym samym słowem co nazwa sprowadza pytanie do dopasowania wyrazów."""
    for w in re.findall(r"[\wąćęłńóśźż]+", name.lower()):
        if len(w) < 5 or w in STOP or w in MASK_KEEP:
            continue
        stem = w[:max(4, len(w) - 2)] if len(w) >= 7 else w[:max(4, len(w) - 1)]
        s = re.sub(r"(?<![\wąćęłńóśźż])" + re.escape(stem) + r"[\wąćęłńóśźż]*", "___", s, flags=re.I)
    return re.sub(r"___(\s*___)+", "___", s)


# ── Bank ────────────────────────────────────────────────────────────────────
def first_sentence(s):
    return re.split(r"(?<=[.!?])\s+", s.strip())[0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bias", default=os.path.join(ROOT, "bledy_poznawcze_bias_wiki.xlsx"))
    ap.add_argument("--models", default=os.path.join(ROOT, "modele_mentalne_fs_blog.xlsx"))
    ap.add_argument("--out", default=os.path.join(ROOT, "frontend", "src", "beliefsBank.json"))
    ap.add_argument("--expanded", default=os.path.join(HERE, "bank.expanded.json"))
    args = ap.parse_args()

    bx, mx = read_xlsx(args.bias), read_xlsx(args.models)
    content = json.load(open(os.path.join(HERE, "content.json"), encoding="utf-8"))
    overrides = content.get("def_overrides", {})

    topics, concepts, order = [], {}, []

    def topic_for(prefix, cat):
        tid = next((t["id"] for t in topics if t["cat"] == cat and t["id"].startswith(prefix)), None)
        if tid:
            return tid
        tid = f"{prefix}{sum(t['id'].startswith(prefix) for t in topics) + 1}"
        topics.append({"id": tid, "cat": cat})
        return tid

    for r in bx["Błędy poznawcze"][1:]:
        if not r.get("A"):
            continue
        cid = "b" + r["A"]
        concepts[cid] = {"id": cid, "t": topic_for("b", r["B"]), "sub": r["C"], "n": r["D"],
                         "en": r["E"], "d": r["F"], "src": r.get("G")}
        order.append(cid)
    for r in mx["Modele mentalne"][1:]:
        if not r.get("A"):
            continue
        cid = "m" + r["A"]
        concepts[cid] = {"id": cid, "t": topic_for("m", r["B"]), "sub": r["B"], "n": r["C"],
                         "en": r["D"], "d": r["E"], "src": r.get("F")}
        order.append(cid)

    # Scalenie: druga nazwa staje się aliasem, a jej opis nie znika — zostaje
    # w wyjaśnieniu pod odpowiedzią.
    for src, dst in MERGE.items():
        a, b = concepts[src], concepts[dst]
        b.setdefault("alias", []).extend([a["n"], a["en"]])
        b.setdefault("also", []).append(f"{a['n']} ({a['en']})")
    for src in MERGE:
        del concepts[src]
        order.remove(src)

    ex = excluded_pairs()
    rng = random.Random(20261019)

    def def_distractors(c):
        same_sub = [o for o in order if o != c["id"] and concepts[o]["sub"] == c["sub"]
                    and concepts[o]["t"] == c["t"] and (c["id"], o) not in ex]
        same_cat = [o for o in order if o != c["id"] and o not in same_sub
                    and concepts[o]["t"] == c["t"] and (c["id"], o) not in ex]
        rng.shuffle(same_sub)
        rng.shuffle(same_cat)
        pick = same_sub[:6]
        if len(pick) < 5:
            pick += same_cat[:5 - len(pick)]
        return pick

    items = []
    for cid in order:
        c = concepts[cid]
        q = overrides.get(cid) or redact(c["d"], [c["n"], c["en"]] + c.get("alias", []))
        if not q:
            print(f"BRAK pytania dla {cid} {c['n']} — dopisz def_overrides", file=sys.stderr)
            continue
        items.append({"id": "d" + cid, "c": cid, "k": "def", "q": q, "d": def_distractors(c)})

    known = set(concepts)
    for s in content["scenarios"]:
        for x in [s["c"]] + s.get("d", []):
            if x not in known:
                sys.exit(f"Scenariusz {s['id']}: nieznane pojęcie {x}")
        if s["c"] in s.get("d", []):
            sys.exit(f"Scenariusz {s['id']}: poprawna odpowiedź wśród dystraktorów")
        for k in s.get("ww", {}):
            if k not in s["d"]:
                sys.exit(f"Scenariusz {s['id']}: ww dla {k}, którego nie ma w d")
        it = {"id": s["id"], "c": s["c"], "k": "scn", "q": s["q"], "d": s["d"], "why": s["why"]}
        for k in ("ww", "acc", "ask"):
            if s.get(k):
                it[k] = s[k]
        items.append(it)
    for w in content["why"]:
        if w["c"] not in known:
            sys.exit(f"Pytanie {w['id']}: nieznane pojęcie {w['c']}")
        items.append({"id": w["id"], "c": w["c"], "k": "why", "q": w["q"], "a": w["a"], "why": w["why"]})

    # Kolejność wprowadzania nowych: najpierw pojęcia z listy priorytetów
    # (te, które najczęściej wykrzywiają przekonania o sobie i innych), potem
    # reszta po kolei z każdej kategorii. Scenariusz pojęcia przychodzi kilka
    # pozycji po jego definicji, pytanie „dlaczego" — jeszcze później.
    prio = [MERGE.get(x, x) for x in content["priority"]]
    for x in prio:
        if x not in known:
            sys.exit(f"priority: nieznane pojęcie {x}")
    rest_by_topic = {}
    for cid in order:
        if cid not in prio:
            rest_by_topic.setdefault(concepts[cid]["t"], []).append(cid)
    rr = []
    while any(rest_by_topic.values()):
        for t in [t["id"] for t in topics]:
            if rest_by_topic.get(t):
                rr.append(rest_by_topic[t].pop(0))
    rank_of = {cid: i for i, cid in enumerate(prio + rr)}
    off = {"def": 0, "scn": 6, "why": 14}
    items.sort(key=lambda it: (rank_of[it["c"]] + off[it["k"]], it["k"] != "def", it["id"]))

    topic_names = content["topic_names"]
    out_topics = [{"id": t["id"], "name": topic_names.get(t["cat"], t["cat"]), "cat": t["cat"],
                   "kind": "b" if t["id"].startswith("b") else "m"} for t in topics]
    out_concepts = {}
    for cid in order:
        c = concepts[cid]
        oc = {"n": c["n"], "en": c["en"], "d": c["d"], "t": c["t"]}
        if c.get("src"):
            oc["src"] = c["src"]
        if c.get("also"):
            oc["also"] = c["also"]
        acc = build_accept(c)
        if acc:
            oc["acc"] = acc
        out_concepts[cid] = oc
    bank = {"meta": content["meta"], "topics": out_topics, "concepts": out_concepts, "items": items}
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(bank, f, ensure_ascii=False, separators=(",", ":"))

    # Wersja rozwinięta dla walidatora skilla.
    ex_items = []
    for it in items:
        c = out_concepts[it["c"]]
        name = c["n"]
        e = {"id": it["id"], "topic": it["c"] and c["t"], "level": "transfer" if it["k"] == "scn" else "recall"}
        if it["k"] == "why":
            e.update(q=it["q"], a=it["a"], why=it["why"], grade="self")
        else:
            prompt = it.get("ask") or ("Jaki to błąd poznawczy?" if it["c"].startswith("b") else "Jaki to model mentalny?")
            e.update(q=f"{it['q']}\n{prompt}", a=name, accept=c.get("acc", []) + it.get("acc", []),
                     distractors=[out_concepts[d]["n"] for d in it["d"]],
                     why=it.get("why") or c["d"])
            ww = {out_concepts[d]["n"]: (it.get("ww", {}).get(d) or first_sentence(out_concepts[d]["d"])) for d in it["d"]}
            e["why_wrong"] = ww
        ex_items.append(e)
    with open(args.expanded, "w", encoding="utf-8") as f:
        json.dump({"meta": {k: v for k, v in content["meta"].items()},
                   "topics": [{"id": t["id"], "name": t["name"]} for t in out_topics],
                   "items": ex_items}, f, ensure_ascii=False, indent=1)

    kinds = {k: sum(it["k"] == k for it in items) for k in ("def", "scn", "why")}
    print(f"pojęcia: {len(out_concepts)}  pozycje: {len(items)}  {kinds}  "
          f"transfer: {kinds['scn'] / len(items):.0%}  bajty: {os.path.getsize(args.out)}")


if __name__ == "__main__":
    main()
