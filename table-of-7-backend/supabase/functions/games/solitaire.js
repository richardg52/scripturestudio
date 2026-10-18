// Table of 7 Solitaire (Klondike; his order, 2026-10-18). Played on one phone, never on the server: this file is kept
// beside the other games' rules so tests/sync_rules_copy.py copies it into index.html (between the SOLITAIRE RULES
// markers) and tests/solitaire_rules_test.mjs proves it. Every helper carries the "sl" prefix (all rules share one script).
// Cards: suit + rank 1..13 (1 ace, 11 jack, 12 queen, 13 king). Seven columns, 1 to 7 cards, the last one face up.
// Build down in alternating colours; only a king starts an empty column; foundations go up by suit from the ace.
// Draw 1 or 3 from the stock; when it's empty, the waste turns back over (as often as you like).
export const SL_SUITS = ["S", "H", "D", "C"];
export const slRed = c => c[0] === "H" || c[0] === "D";
export const slRank = c => +c.slice(1);
const slTop = a => a[a.length - 1];
export function slDeal(draw, rand = Math.random){
  const d = []; for(const s of SL_SUITS) for(let r = 1; r <= 13; r++) d.push(s + r);
  for(let i = d.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  const tab = []; let k = 0;
  for(let i = 0; i < 7; i++){ const col = d.slice(k, k + i + 1); k += i + 1; tab.push({ down: col.slice(0, -1), up: col.slice(-1) }); }
  return { draw: draw === 3 ? 3 : 1, stock: d.slice(k), waste: [], found: { S: [], H: [], D: [], C: [] }, tab, moves: 0, passes: 0 };
}
const slCanFound = (st, c) => slRank(c) === st.found[c[0]].length + 1;
function slCanTab(st, c, j){
  const col = st.tab[j], top = slTop(col.up);
  if(!top) return !col.down.length && slRank(c) === 13;
  return slRed(top) !== slRed(c) && slRank(top) === slRank(c) + 1;
}
// a source: {from:"waste"} | {from:"tab", i, k} (k = where the run starts among that column's face-up cards) | {from:"found", s}
export function slCards(st, src){
  if(src.from === "waste") return st.waste.length ? [slTop(st.waste)] : [];
  if(src.from === "found") return st.found[src.s] && st.found[src.s].length ? [slTop(st.found[src.s])] : [];
  if(src.from === "tab"){ const up = (st.tab[src.i] && st.tab[src.i].up) || []; return Number.isInteger(src.k) && src.k >= 0 && src.k < up.length ? up.slice(src.k) : []; }
  return [];
}
// every place a source may go: [{to:"found"} | {to:"tab", j}]
export function slTargets(st, src){
  const cards = slCards(st, src); if(!cards.length) return [];
  const out = [];
  if(cards.length === 1 && src.from !== "found" && slCanFound(st, cards[0])) out.push({ to: "found" });
  for(let j = 0; j < 7; j++) if(!(src.from === "tab" && src.i === j) && slCanTab(st, cards[0], j)) out.push({ to: "tab", j });
  return out;
}
// mv: {draw:true} | {src, dst}; returns the new state, or throws when the move isn't allowed
export function slApply(st0, mv){
  const st = JSON.parse(JSON.stringify(st0));
  if(mv && mv.draw){
    if(st.stock.length){ const n = Math.min(st.draw, st.stock.length); for(let i = 0; i < n; i++) st.waste.push(st.stock.pop()); }
    else if(st.waste.length){ st.stock = st.waste.reverse(); st.waste = []; st.passes += 1; }
    else throw new Error("empty");
    st.moves += 1; return st;
  }
  const src = mv && mv.src, dst = mv && mv.dst;
  if(!src || !dst || !slTargets(st0, src).some(t => t.to === dst.to && (t.to === "found" || t.j === dst.j))) throw new Error("illegal");
  let cards;
  if(src.from === "waste") cards = [st.waste.pop()];
  else if(src.from === "found") cards = [st.found[src.s].pop()];
  else { const col = st.tab[src.i]; cards = col.up.splice(src.k); if(!col.up.length && col.down.length) col.up.push(col.down.pop()); }
  if(dst.to === "found") st.found[cards[0][0]].push(cards[0]); else st.tab[dst.j].up.push(...cards);
  st.moves += 1; return st;
}
export const slWon = st => SL_SUITS.every(s => st.found[s].length === 13);
// everything is face up and the stock and waste are empty: the rest can go home by itself
export const slCanFinish = st => !st.stock.length && !st.waste.length && st.tab.every(c => !c.down.length) && !slWon(st);
export function slFinishStep(st){
  for(let i = 0; i < 7; i++){ const k = st.tab[i].up.length - 1;
    if(k >= 0 && slTargets(st, { from: "tab", i, k }).some(t => t.to === "found")) return slApply(st, { src: { from: "tab", i, k }, dst: { to: "found" } }); }
  return null;
}
// a helpful move for the Hint button: a card home, then a run that turns over a hidden card or clears a column,
// then the waste card onto a column, then draw. null = no move left at all.
export function slHint(st){
  if(st.waste.length && slTargets(st, { from: "waste" }).some(t => t.to === "found")) return { src: { from: "waste" }, dst: { to: "found" } };
  for(let i = 0; i < 7; i++){ const k = st.tab[i].up.length - 1;
    if(k >= 0 && slTargets(st, { from: "tab", i, k }).some(t => t.to === "found")) return { src: { from: "tab", i, k }, dst: { to: "found" } }; }
  for(let i = 0; i < 7; i++){ const col = st.tab[i]; if(!col.up.length) continue;
    const t = slTargets(st, { from: "tab", i, k: 0 }).find(x => x.to === "tab");
    if(t && (col.down.length || (slRank(col.up[0]) !== 13 && st.tab[t.j].up.length))) return { src: { from: "tab", i, k: 0 }, dst: t }; }
  if(st.waste.length){ const t = slTargets(st, { from: "waste" }).find(x => x.to === "tab"); if(t) return { src: { from: "waste" }, dst: t }; }
  return st.stock.length || st.waste.length ? { draw: true } : null;
}
