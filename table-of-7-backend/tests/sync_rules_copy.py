# Copies the server's shared rules files into index.html between their markers (exports removed), so the app and the
# server always run the same rules. The rules tests then prove the two copies match. Run with /usr/bin/python3.
import re, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
html = root / "table-of-7" / "index.html"; s = html.read_text(encoding="utf-8")
for name, fn in [("GAME RULES", "rules.js"), ("SPADES RULES", "spades.js"), ("BLACKJACK RULES", "blackjack.js"), ("WILDCARD RULES", "wildcard.js"), ("BIDWHIST RULES", "bidwhist.js"), ("DOMINOES RULES", "dominoes.js"), ("SOLITAIRE RULES", "solitaire.js"), ("TOURNEY RULES", "../tourney/score.js"), ("RIDES RULES", "../rides/match.js"), ("NFL RULES", "../watch/nfl.js"), ("TRIP RULES", "../getaways/trip.js")]:
    src = (root / "table-of-7-backend/supabase/functions/games" / fn).read_text(encoding="utf-8")
    src = re.sub(r"^export ", "", src, flags=re.M).strip()
    block = f"/* {name} START */\n{src}\n/* {name} END */"
    pat = re.compile(r"/\* " + name + r" START \*/\n[\s\S]*?\n/\* " + name + r" END \*/")
    if pat.search(s): s = pat.sub(lambda m: block, s)
    else:
        end = "/* SPADES RULES END */"; assert end in s; s = s.replace(end, end + "\n" + block, 1)
    print("synced", fn)
html.write_text(s, encoding="utf-8")
# The rules files all land in ONE script in the app, so a helper name used by two of them (2026-10-17: "same",
# "SUIT_ORDER", "step") stops the whole app loading. Parse the app's script after every sync and refuse a clash.
import subprocess, tempfile
code = max(re.findall(r"<script(?![^>]*src)[^>]*>(.*?)</script>", s, re.S), key=len)
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as f: f.write(code)
r = subprocess.run(["node", "--check", f.name], capture_output=True, text=True)
if r.returncode: raise SystemExit("THE APP NO LONGER PARSES:\n" + r.stderr[-800:])
print("the app's script parses")
