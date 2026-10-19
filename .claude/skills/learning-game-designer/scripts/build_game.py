#!/usr/bin/env python3
"""Buduje samodzielną grę HTML z banku pozycji.

Użycie:
    python3 build_game.py bank.json game.html [--template ścieżka] [--force]

Waliduje bank (check_bank.py), wstrzykuje go do assets/game-template.html
między znaczniki /*BANK_START*/ i /*BANK_END*/ oraz podstawia tytuł.
ERROR z walidatora przerywa budowę, chyba że podano --force.
"""
import argparse
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from check_bank import check, load  # noqa: E402

DEFAULT_TEMPLATE = os.path.join(HERE, "..", "assets", "game-template.html")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("bank")
    ap.add_argument("out")
    ap.add_argument("--template", default=DEFAULT_TEMPLATE)
    ap.add_argument("--force", action="store_true", help="buduj mimo ERROR")
    args = ap.parse_args()

    bank = load(args.bank)
    err, warn, _ = check(bank)
    for e in err:
        print("ERROR:", e)
    for w in warn:
        print("WARN: ", w)
    if err and not args.force:
        print(f"Przerwano: {len(err)} ERROR. Popraw bank albo użyj --force.")
        return 1

    tpl = open(args.template, encoding="utf-8").read()
    # </ w JSON osadzonym w <script> mogłoby zamknąć znacznik
    payload = json.dumps(bank, ensure_ascii=False, indent=2).replace("</", "<\\/")
    pattern = re.compile(r"/\*BANK_START\*/.*?/\*BANK_END\*/", re.S)
    if not pattern.search(tpl):
        print("ERROR: szablon nie ma znaczników BANK_START/BANK_END")
        return 1
    out = pattern.sub(lambda _: "/*BANK_START*/" + payload + "/*BANK_END*/", tpl, count=1)
    title = html.escape(bank.get("meta", {}).get("title", "Gra do nauki"))
    out = out.replace("__TITLE__", title)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"OK: {args.out} ({len(bank['items'])} pozycji, {len(out)//1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
