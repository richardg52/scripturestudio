// Table of 7: prove the Game Room rules. Run: node table-of-7-backend/tests/games_rules_test.mjs
// Also proves the app's copy of the rules (index.html, between the GAME RULES markers) is the same text.
import { readFileSync } from "node:fs";
import { gameInit, gameLegal, gameApply } from "../supabase/functions/games/rules.js";
let fails = 0; const check = (n, ok, d = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  -> " + JSON.stringify(d))); };
const play = (kind, moves) => { let st = gameInit(kind), turn = 0, r; for(const m of moves){ r = gameApply(kind, st, turn, m); st = r.st; turn = r.turn; if(r.over) return r; } return { st, turn, over: null }; };
const throws = f => { try { f(); return false; } catch { return true; } };
// Tic-Tac-Toe
check("ttt: row wins", play("ttt", [{i:0},{i:3},{i:1},{i:4},{i:2}]).over?.winner === 0);
check("ttt: diagonal wins for side 1", play("ttt", [{i:1},{i:0},{i:2},{i:4},{i:3},{i:8}]).over?.winner === 1);
check("ttt: full board is a draw", play("ttt", [{i:0},{i:1},{i:2},{i:4},{i:3},{i:5},{i:7},{i:6},{i:8}]).over?.winner === 2);
check("ttt: taken square refused", throws(() => play("ttt", [{i:0},{i:0}])));
// Connect Four
check("c4: vertical four wins", play("c4", [{c:0},{c:1},{c:0},{c:1},{c:0},{c:1},{c:0}]).over?.winner === 0);
check("c4: horizontal four wins", play("c4", [{c:0},{c:0},{c:1},{c:1},{c:2},{c:2},{c:3}]).over?.winner === 0);
check("c4: diagonal four wins", play("c4", [{c:0},{c:1},{c:1},{c:2},{c:2},{c:3},{c:2},{c:3},{c:3},{c:6},{c:3}]).over?.winner === 0);
check("c4: pieces fall to the bottom", play("c4", [{c:3}]).st.b[5*7+3] === 0);
check("c4: full column refused", throws(() => play("c4", [{c:0},{c:0},{c:0},{c:0},{c:0},{c:0},{c:0}])));
// Checkers
const ck = () => { const s = gameInit("checkers"); s.b = Array(64).fill(null); return s; };
const at = (r, c) => r*8 + c;
let s = gameInit("checkers");
check("checkers: 12 pieces each", s.b.filter(p => p && p.s === 0).length === 12 && s.b.filter(p => p && p.s === 1).length === 12);
check("checkers: side 0 has 7 opening moves", gameLegal("checkers", s, 0).length === 7);
check("checkers: a man may not move backward", throws(() => { const t = ck(); t.b[at(4,3)] = {s:0,k:false}; gameApply("checkers", t, 0, {f:at(4,3), t:at(5,2)}); }));
{ const t = ck(); t.b[at(5,2)] = {s:0,k:false}; t.b[at(4,3)] = {s:1,k:false}; t.b[at(6,7)] = {s:0,k:false}; t.b[at(0,1)] = {s:1,k:false};
  const L = gameLegal("checkers", t, 0); check("checkers: a jump must be taken", L.length === 1 && L[0].f === at(5,2) && L[0].t === at(3,4), L);
  const r = gameApply("checkers", t, 0, {f:at(5,2), t:at(3,4)}); check("checkers: the jumped piece is removed", r.st.b[at(4,3)] === null); }
{ const t = ck(); t.b[at(6,1)] = {s:0,k:false}; t.b[at(5,2)] = {s:1,k:false}; t.b[at(3,4)] = {s:1,k:false}; t.b[at(0,7)] = {s:1,k:false};
  let r = gameApply("checkers", t, 0, {f:at(6,1), t:at(4,3)}); check("checkers: a double jump keeps the same turn", r.turn === 0 && r.st.chain === at(4,3), r);
  check("checkers: mid-jump, only that piece may jump on", gameLegal("checkers", r.st, 0).every(m => m.f === at(4,3)));
  r = gameApply("checkers", r.st, 0, {f:at(4,3), t:at(2,5)}); check("checkers: double jump completes", r.st.b[at(3,4)] === null && r.st.chain === null && r.turn === 1); }
{ const t = ck(); t.b[at(1,2)] = {s:0,k:false}; t.b[at(5,6)] = {s:1,k:false}; const r = gameApply("checkers", t, 0, {f:at(1,2), t:at(0,1)});
  check("checkers: reaching the far row crowns a king", r.st.b[at(0,1)].k === true); }
{ const t = ck(); t.b[at(2,3)] = {s:0,k:false}; t.b[at(1,4)] = {s:1,k:false}; t.b[at(1,2)] = {s:1,k:false}; t.b[at(6,1)] = {s:1,k:false};
  const r = gameApply("checkers", t, 0, {f:at(2,3), t:at(0,5)}); check("checkers: crowning by a jump ends the turn", r.st.b[at(0,5)].k && r.turn === 1 && r.st.chain === null, r); }
{ const t = ck(); t.b[at(3,3)] = {s:0,k:true}; t.b[at(7,0)] = {s:1,k:false};
  check("checkers: a king moves backward too", gameLegal("checkers", t, 0).some(m => m.t === at(4,4))); }
{ const t = ck(); t.b[at(5,2)] = {s:0,k:false}; t.b[at(4,3)] = {s:1,k:false};
  const r = gameApply("checkers", t, 0, {f:at(5,2), t:at(3,4)}); check("checkers: taking the last piece wins", r.over?.winner === 0, r.over); }
{ const t = ck(); t.b[at(7,0)] = {s:1,k:false}; t.b[at(0,7)] = {s:0,k:false}; t.b[at(2,1)] = {s:0,k:false};
  const r = gameApply("checkers", t, 0, {f:at(2,1), t:at(1,0)}); check("checkers: a player with no moves loses", r.over?.winner === 0, r.over); }
check("checkers: a move out of turn is refused", throws(() => gameApply("checkers", gameInit("checkers"), 1, {f:at(5,0), t:at(4,1)})));
// the app carries the identical rules
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const m = html.match(/\/\* GAME RULES START \*\/\n([\s\S]*?)\n\/\* GAME RULES END \*\//);
const src = readFileSync(new URL("../supabase/functions/games/rules.js", import.meta.url), "utf8").replace(/^export /gm, "").trim();
check("the app's copy of the rules matches the server's", !!m && m[1].trim() === src);
console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
