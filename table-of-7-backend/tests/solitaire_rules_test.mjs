// Table of 7 Solitaire (Klondike) rules, proven (node table-of-7-backend/tests/solitaire_rules_test.mjs).
import { readFileSync } from "node:fs";
import { slDeal, slApply, slTargets, slCards, slWon, slCanFinish, slFinishStep, slHint, slRank } from "../supabase/functions/games/solitaire.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const throws = f => { try { f(); return false; } catch { return true; } };
let seed = 3; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const st = slDeal(1, rand);
const all = [...st.stock, ...st.tab.flatMap(c => [...c.down, ...c.up])];
check("the deal uses all 52 cards once", all.length === 52 && new Set(all).size === 52);
check("seven columns of 1 to 7, only the last card face up", st.tab.every((c, i) => c.down.length === i && c.up.length === 1));
check("24 cards wait in the stock", st.stock.length === 24 && st.waste.length === 0);
let d1 = slApply(st, { draw: true }); check("Draw 1 turns over one card", d1.waste.length === 1 && d1.stock.length === 23);
const st3 = slDeal(3, rand); let d3 = slApply(st3, { draw: true }); check("Draw 3 turns over three", d3.waste.length === 3 && d3.stock.length === 21);
let e = st; for(let i = 0; i < 24; i++) e = slApply(e, { draw: true });
check("an empty stock turns the waste back over, in the same order", (() => { const r = slApply(e, { draw: true }); return r.stock.length === 24 && r.waste.length === 0 && r.passes === 1 && JSON.stringify(r.stock) === JSON.stringify(st.stock); })());

// hand-built positions
const blank = () => ({ draw: 1, stock: [], waste: [], found: { S: [], H: [], D: [], C: [] }, tab: Array.from({ length: 7 }, () => ({ down: [], up: [] })), moves: 0, passes: 0 });
let p = blank(); p.waste = ["H1"];
check("an ace goes home", slTargets(p, { from: "waste" }).some(t => t.to === "found"));
p = blank(); p.waste = ["H2"]; check("a two can't go home before its ace", !slTargets(p, { from: "waste" }).some(t => t.to === "found"));
p = blank(); p.tab[0].up = ["S9"]; p.waste = ["H8"];
check("red 8 goes on black 9", slTargets(p, { from: "waste" }).some(t => t.to === "tab" && t.j === 0));
p.waste = ["D8"]; check("…and so does the 8 of diamonds", slTargets(p, { from: "waste" }).some(t => t.j === 0));
p.waste = ["C8"]; check("black 8 can't go on black 9", !slTargets(p, { from: "waste" }).some(t => t.j === 0));
p.waste = ["H7"]; check("a 7 can't go on a 9", !slTargets(p, { from: "waste" }).some(t => t.j === 0));
p = blank(); p.waste = ["H12"]; check("only a king starts an empty column", !slTargets(p, { from: "waste" }).length);
p.waste = ["H13"]; check("a king may", slTargets(p, { from: "waste" }).filter(t => t.to === "tab").length === 7);
p = blank(); p.tab[0] = { down: ["C5"], up: ["S9", "H8", "C7"] }; p.tab[1].up = ["D10"];
check("a run moves together", slCards(p, { from: "tab", i: 0, k: 0 }).length === 3 && slTargets(p, { from: "tab", i: 0, k: 0 }).some(t => t.j === 1));
let q = slApply(p, { src: { from: "tab", i: 0, k: 0 }, dst: { to: "tab", j: 1 } });
check("…and the hidden card underneath turns over", JSON.stringify(q.tab[1].up) === '["D10","S9","H8","C7"]' && JSON.stringify(q.tab[0]) === '{"down":[],"up":["C5"]}', q.tab);
check("a run can't go home", !slTargets(p, { from: "tab", i: 0, k: 1 }).some(t => t.to === "found"));
check("a move that isn't allowed is refused", throws(() => slApply(p, { src: { from: "tab", i: 0, k: 2 }, dst: { to: "found" } })) && throws(() => slApply(p, { src: { from: "waste" }, dst: { to: "found" } })));
check("a card can't move onto its own column", !slTargets(p, { from: "tab", i: 1, k: 0 }).some(t => t.j === 1));
p = blank(); p.found.H = ["H1", "H2", "H3"]; p.tab[0].up = ["S4"];
check("a card may come back down from home", slTargets(p, { from: "found", s: "H" }).some(t => t.j === 0));
check("drawing from an empty stock and waste is refused", throws(() => slApply(blank(), { draw: true })));

// finishing and winning
const nearly = blank(); for(const s of ["S", "H", "D", "C"]) nearly.found[s] = Array.from({ length: 12 }, (_, i) => s + (i + 1));
nearly.tab[0].up = ["S13"]; nearly.tab[1].up = ["H13"]; nearly.tab[2].up = ["D13"]; nearly.tab[3].up = ["C13"];
check("all face up with no stock: the Finish button can play it out", slCanFinish(nearly));
let f = nearly, n = 0; while(!slWon(f) && n < 60){ f = slFinishStep(f); n++; }
check("Finish takes every card home and wins", slWon(f) && n === 4);
check("a won game can't Finish again", !slCanFinish(f));
check("Hint sends a card home first", JSON.stringify(slHint(nearly)) === '{"src":{"from":"tab","i":0,"k":0},"dst":{"to":"found"}}', slHint(nearly));
check("Hint says draw when nothing else moves", (() => { const h = blank(); h.stock = ["H5"]; h.tab[0].up = ["C9"]; return slHint(h)?.draw === true; })());
check("Hint has nothing when nothing can move", slHint((() => { const h = blank(); h.tab[0].up = ["C9"]; return h; })()) === null);

// a whole game played by the Hint button alone never breaks a rule, and every card stays in play
let g = slDeal(1, rand), legal = true, steps = 0;
for(; steps < 400; steps++){ const h = slHint(g); if(!h) break; try { g = slApply(g, h); } catch { legal = false; break; }
  const cnt = g.stock.length + g.waste.length + Object.values(g.found).reduce((a, b) => a + b.length, 0) + g.tab.reduce((a, c) => a + c.down.length + c.up.length, 0); if(cnt !== 52){ legal = false; break; } }
check("400 hint moves in a row: every one legal, no card lost or made", legal, steps);
check("cards are numbered 1 to 13", slRank("S1") === 1 && slRank("H13") === 13);

// the app carries the identical rules
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const m = html.match(/\/\* SOLITAIRE RULES START \*\/\n([\s\S]*?)\n\/\* SOLITAIRE RULES END \*\//);
const src = readFileSync(new URL("../supabase/functions/games/solitaire.js", import.meta.url), "utf8").replace(/^export /gm, "").trim();
check("the app's copy of the Solitaire rules matches", !!m && m[1].trim() === src);
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
