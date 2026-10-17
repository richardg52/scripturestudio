// Table of 7 Game Room rules (his order, 2026-10-17). ONE copy of the rules: the server (functions/games) checks
// every move with it, and the app carries the identical text (index.html, between the GAME RULES markers) to draw
// the board and show legal moves. tests/games_rules_test.mjs proves the rules and that both copies match.
// Sides: 0 moves first, 1 second. A move is {i} (Tic-Tac-Toe square), {c} (Connect Four column) or {f,t} (Checkers).
export const GAMES = { ttt: "Tic-Tac-Toe", c4: "Connect Four", checkers: "Checkers" };
export function gameInit(kind){
  if(kind === "ttt") return { b: Array(9).fill(null) };
  if(kind === "c4") return { b: Array(42).fill(null) };
  if(kind === "checkers"){
    const b = Array(64).fill(null);
    for(let i = 0; i < 64; i++){ const r = Math.floor(i / 8), c = i % 8; if((r + c) % 2 !== 1) continue;
      if(r <= 2) b[i] = { s: 1, k: false }; else if(r >= 5) b[i] = { s: 0, k: false }; }
    return { b, chain: null, quiet: 0 };
  }
  throw new Error("kind");
}
const TTT_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
function ckSteps(p){ const dirs = []; if(p.s === 0 || p.k) dirs.push([-1,-1],[-1,1]); if(p.s === 1 || p.k) dirs.push([1,-1],[1,1]); return dirs; }
const onB = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
function ckJumps(b, i){ const p = b[i], r = Math.floor(i / 8), c = i % 8, out = [];
  for(const [dr, dc] of ckSteps(p)){ const mr = r + dr, mc = c + dc, tr = r + 2*dr, tc = c + 2*dc;
    if(onB(tr, tc) && b[mr*8+mc] && b[mr*8+mc].s !== p.s && !b[tr*8+tc]) out.push({ f: i, t: tr*8+tc }); }
  return out; }
function ckSlides(b, i){ const p = b[i], r = Math.floor(i / 8), c = i % 8, out = [];
  for(const [dr, dc] of ckSteps(p)){ const tr = r + dr, tc = c + dc; if(onB(tr, tc) && !b[tr*8+tc]) out.push({ f: i, t: tr*8+tc }); }
  return out; }
export function gameLegal(kind, st, side){
  if(kind === "ttt") return st.b.map((v, i) => v === null ? { i } : null).filter(Boolean);
  if(kind === "c4") return [0,1,2,3,4,5,6].filter(c => st.b[c] === null).map(c => ({ c }));
  if(kind === "checkers"){
    if(st.chain != null) return ckJumps(st.b, st.chain);
    let jumps = [], slides = [];
    st.b.forEach((p, i) => { if(p && p.s === side){ jumps = jumps.concat(ckJumps(st.b, i)); slides = slides.concat(ckSlides(st.b, i)); } });
    return jumps.length ? jumps : slides;      // a jump, when there is one, must be taken
  }
  return [];
}
const gSame = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function c4Win(b, side){ const at = (r, c) => r >= 0 && r < 6 && c >= 0 && c < 7 && b[r*7+c] === side;
  for(let r = 0; r < 6; r++) for(let c = 0; c < 7; c++) for(const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]])
    if([0,1,2,3].every(k => at(r + k*dr, c + k*dc))) return true; return false; }
// returns { st, turn, over } where over is null or { winner: 0 | 1 | 2 (draw), why }
export function gameApply(kind, st0, side, mv){
  const legal = gameLegal(kind, st0, side);
  const pick = kind === "ttt" ? { i: mv && mv.i } : kind === "c4" ? { c: mv && mv.c } : { f: mv && mv.f, t: mv && mv.t };
  if(!legal.some(m => gSame(m, pick))) throw new Error("illegal");
  const st = JSON.parse(JSON.stringify(st0)), other = 1 - side;
  if(kind === "ttt"){
    st.b[pick.i] = side;
    if(TTT_LINES.some(l => l.every(i => st.b[i] === side))) return { st, turn: other, over: { winner: side, why: "three in a row" } };
    if(st.b.every(v => v !== null)) return { st, turn: other, over: { winner: 2, why: "board full" } };
    return { st, turn: other, over: null };
  }
  if(kind === "c4"){
    let r = 5; while(st.b[r*7 + pick.c] !== null) r--;
    st.b[r*7 + pick.c] = side;
    if(c4Win(st.b, side)) return { st, turn: other, over: { winner: side, why: "four in a row" } };
    if(st.b.every(v => v !== null)) return { st, turn: other, over: { winner: 2, why: "board full" } };
    return { st, turn: other, over: null };
  }
  // checkers
  const p = st.b[pick.f]; st.b[pick.f] = null; st.b[pick.t] = p;
  const fr = Math.floor(pick.f / 8), tr = Math.floor(pick.t / 8), jumped = Math.abs(tr - fr) === 2;
  if(jumped){ const mid = ((fr + tr) / 2) * 8 + ((pick.f % 8) + (pick.t % 8)) / 2; st.b[mid] = null; }
  let crowned = false;
  if(!p.k && ((p.s === 0 && tr === 0) || (p.s === 1 && tr === 7))){ p.k = true; crowned = true; }
  st.quiet = jumped || crowned ? 0 : (st.quiet || 0) + 1;
  if(jumped && !crowned && ckJumps(st.b, pick.t).length){ st.chain = pick.t; return { st, turn: side, over: null }; }  // keep jumping
  st.chain = null;
  if(!gameLegal(kind, st, other).length) return { st, turn: other, over: { winner: side, why: "no moves left" } };
  if(st.quiet >= 80) return { st, turn: other, over: { winner: 2, why: "40 moves each without a capture" } };
  return { st, turn: other, over: null };
}
