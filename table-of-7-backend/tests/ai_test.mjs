// Table of 7 computer opponents (his order, 2026-10-17), proven on the app's own code (node tests/ai_test.mjs).
import { readFileSync } from "node:fs";
import * as R from "../supabase/functions/games/rules.js";
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const src = html.slice(html.indexOf("const AI_LV = "), html.indexOf("let aiTimer = null;"));
const { aiMove } = new Function("gameLegal", "gameApply", "localStorage", src + "; return { aiMove };")(R.gameLegal, R.gameApply, { getItem: () => null, setItem: () => {} });
let fails = 0; const check = (n, ok, d = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  -> " + JSON.stringify(d))); };
const rnd = (kind, s, side) => { const l = R.gameLegal(kind, s, side); return l[Math.floor(Math.random() * l.length)]; };
function match(kind, lv, games){ let w = 0, l = 0, d = 0, illegal = 0, slow = 0;
  for(let g = 0; g < games; g++){ let s = R.gameInit(kind), turn = g % 2, over = null, n = 0;      // the computer is side 1; who starts alternates
    while(!over && n++ < 400){ let m; if(turn === 1){ const t0 = performance.now(); m = aiMove(kind, s, 1, lv); if(performance.now() - t0 > 1500) slow++;
        if(!R.gameLegal(kind, s, 1).some(x => JSON.stringify(x) === JSON.stringify(m))){ illegal++; break; } } else m = rnd(kind, s, 0);
      const r = R.gameApply(kind, s, turn, m); s = r.st; turn = r.turn; over = r.over; }
    if(!over) d++; else if(over.winner === 1) w++; else if(over.winner === 0) l++; else d++; }
  return { w, l, d, illegal, slow }; }
for(const [kind, games] of [["ttt", 120], ["c4", 30], ["checkers", 12]]){
  for(const lv of [1, 2, 3]){ const r = match(kind, lv, lv === 3 && kind !== "ttt" ? Math.ceil(games / 2) : games);
    check(`${kind} ${["", "Easy", "Medium", "Hard"][lv]}: only legal moves, each under 1.5 s (${r.w} won, ${r.l} lost, ${r.d} drawn vs a random player)`, !r.illegal && !r.slow, r);
    if(lv === 3 && kind === "ttt") check("Tic-Tac-Toe Hard never loses", r.l === 0, r);
    if(lv === 3 && kind !== "ttt") check(`${kind} Hard beats a random player almost every time`, r.w >= (r.w + r.l + r.d) * 0.9, r); } }
console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
