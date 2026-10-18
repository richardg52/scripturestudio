# Copies the server's shared rules files into index.html between their markers (exports removed), so the app and the
# server always run the same rules. The rules tests then prove the two copies match. Run with /usr/bin/python3.
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
html = root / "table-of-7" / "index.html"; s = html.read_text(encoding="utf-8")
for name, fn in [("GAME RULES", "rules.js"), ("SPADES RULES", "spades.js"), ("BLACKJACK RULES", "blackjack.js")]:
    src = (root / "table-of-7-backend/supabase/functions/games" / fn).read_text(encoding="utf-8")
    src = re.sub(r"^export ", "", src, flags=re.M).strip()
    block = f"/* {name} START */\n{src}\n/* {name} END */"
    pat = re.compile(r"/\* " + name + r" START \*/\n[\s\S]*?\n/\* " + name + r" END \*/")
    if pat.search(s): s = pat.sub(lambda m: block, s)
    else:
        end = "/* SPADES RULES END */"; assert end in s; s = s.replace(end, end + "\n" + block, 1)
    print("synced", fn)
html.write_text(s, encoding="utf-8")
