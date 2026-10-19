// Table of 7 Secret Santa draw, proven (node table-of-7-backend/tests/santa_draw_test.mjs).
import { santaDraw } from "../supabase/functions/santa/draw.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const fam = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"];
const homes = [["p4", "p5"], ["p2", "p3"]];
let bad = 0, selfs = 0, couples = 0, notPerm = 0;
const seen = {};
for(let t = 0; t < 2000; t++){
  const d = santaDraw(fam, homes); if(!d){ bad++; continue; }
  const rec = Object.values(d);
  if(Object.keys(d).length !== fam.length || new Set(rec).size !== fam.length) notPerm++;
  for(const [g, r] of Object.entries(d)){ if(g === r) selfs++; if(homes.some(h => h.includes(g) && h.includes(r))) couples++; (seen[g] ||= new Set()).add(r); }
}
check("2,000 draws: every one finds a match for everybody", bad === 0, bad);
check("everyone gives exactly one gift and gets exactly one", notPerm === 0, notPerm);
check("nobody ever draws themselves", selfs === 0, selfs);
check("a couple never draws each other", couples === 0, couples);
check("the draw is fair: someone with no household can draw all six others", seen.p1?.size === fam.length - 1, [...(seen.p1 || [])]);
check("a person in a couple never draws their partner, but can draw the other five", !seen.p4?.has("p5") && seen.p4?.size === 5, [...(seen.p4 || [])]);
check("an impossible draw says so instead of breaking the rule", santaDraw(["a", "b", "c"], [["a", "b"]]) === null);
{ const sw = santaDraw(["a", "b"], []); check("two people can swap", sw && sw.a === "b" && sw.b === "a", sw); }
check("one person can't have a Secret Santa", santaDraw(["a"], []) === null);
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
