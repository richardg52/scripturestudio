// Table of 7 Dominoes, ALL FIVES TO 150 (his choice, 2026-10-17). ONE copy of the rules: the server (functions/games)
// runs family games with it, the app carries the identical text (index.html, between the DOMINOES RULES markers) for
// games against the computer. tests/dominoes_rules_test.mjs proves both.
// A double-six set (28 tiles). 2 players take 7 tiles each; 3 or 4 players take 5. The first round starts with the
// highest double; after that the round's winner sets down any tile. Match an open end. If the first tile is a double it
// is the spinner: once both its sides are played on, its top and bottom open too. Can't play? Draw from the boneyard
// until you can; when it's empty, pass. Points: after you play, add up the open ends (a double at an end counts both
// halves; an untouched side of the spinner counts its number). If the total is 5, 10, 15 … you score it. A player who
// plays their last tile scores everyone else's leftover pips, rounded to the nearest 5. If nobody can play, the lowest
// hand wins those points. First to 150 wins.
// A tile is [a, b] with a <= b. A move is {tile:[a,b], end:"E"|"W"|"N"|"S"} (no end for the first tile), {draw:true}
// or {pass:true}.
export const DM_TARGET = 150;
export function dmSet(){ const s = []; for(let a = 0; a <= 6; a++) for(let b = a; b <= 6; b++) s.push([a, b]); return s; }
const dmShuffle = (a, rand) => { const b = [...a]; for(let i = b.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const dmSame = (x, y) => Math.min(x[0], x[1]) === Math.min(y[0], y[1]) && Math.max(x[0], x[1]) === Math.max(y[0], y[1]);   // either way round
const dmPips = h => h.reduce((a, t) => a + t[0] + t[1], 0);
const dmRound5 = n => Math.round(n / 5) * 5;
function dmDeal(st, sec, starter, rand){
  const d = dmShuffle(dmSet(), rand), each = st.n === 2 ? 7 : 5;
  sec.hands = st.seats.map((_, k) => d.slice(k * each, k * each + each)); sec.yard = d.slice(st.n * each);
  let turn = starter;
  if(starter === null){                                       // the first round: the highest double starts
    let best = -1; sec.hands.forEach((h, k) => h.forEach(t => { if(t[0] === t[1] && t[0] > best){ best = t[0]; turn = k; } }));
    if(turn === null) turn = 0;
  }
  Object.assign(st, { center: null, arms: { E: [], W: [], N: [], S: [] }, turn, passes: 0, last: null, counts: sec.hands.map(h => h.length), yard: sec.yard.length });
}
export function dmInit(seats, rand = Math.random){
  const st = { seats, n: seats.length, score: seats.map(() => 0), round: 1, lastRound: null, winSeat: null }, sec = {};
  dmDeal(st, sec, null, rand); return { st, sec };
}
const dmSpinner = st => st.center && st.center[0] === st.center[1];
// the open ends: each is {end, val, dbl} (val is the number to match; dbl when a double sits at that end)
export function dmEnds(st){
  if(!st.center) return [];
  const c = st.center, out = [];
  for(const e of ["W", "E"]){ const arm = st.arms[e]; if(arm.length){ const t = arm[arm.length - 1]; out.push({ end: e, val: t[1], dbl: t[0] === t[1] }); } else out.push({ end: e, val: e === "W" ? c[0] : c[1], dbl: dmSpinner(st) }); }
  if(dmSpinner(st) && st.arms.E.length && st.arms.W.length) for(const e of ["N", "S"]){ const arm = st.arms[e]; if(arm.length){ const t = arm[arm.length - 1]; out.push({ end: e, val: t[1], dbl: t[0] === t[1] }); } else out.push({ end: e, val: c[0], open: true }); }
  return out;
}
// the open-end total that scores when it is a multiple of 5
export function dmCount(st){
  if(!st.center) return 0;
  const c = st.center, sp = dmSpinner(st);
  if(!st.arms.E.length && !st.arms.W.length) return c[0] + c[1];
  let t = 0;
  for(const e of ["W", "E"]){ const arm = st.arms[e]; if(arm.length){ const x = arm[arm.length - 1]; t += x[0] === x[1] ? x[1] * 2 : x[1]; } else t += sp ? c[0] : (e === "W" ? c[0] : c[1]); }
  for(const e of ["N", "S"]){ const arm = st.arms[e]; if(arm.length){ const x = arm[arm.length - 1]; t += x[0] === x[1] ? x[1] * 2 : x[1]; } }
  return t;
}
export function dmMoves(st, hand){
  if(!st.center) return hand.map(t => ({ tile: t }));
  const out = [];
  for(const t of hand) for(const e of dmEnds(st)) if(t[0] === e.val || t[1] === e.val) out.push({ tile: t, end: e.end });
  return out;
}
export function dmApply(st0, sec0, seat, mv, rand = Math.random){
  const st = JSON.parse(JSON.stringify(st0)), sec = JSON.parse(JSON.stringify(sec0));
  if(seat !== st.turn) throw new Error("turn");
  const hand = sec.hands[seat], moves = dmMoves(st, hand);
  const sync = () => { st.counts = sec.hands.map(h => h.length); st.yard = sec.yard.length; };
  const next = () => { st.turn = (seat + 1) % st.n; };
  if(mv && mv.draw === true){
    if(moves.length || !sec.yard.length) throw new Error("illegal");
    hand.push(sec.yard.pop()); st.last = { seat, drew: true }; sync(); return { st, sec, over: null };
  }
  if(mv && mv.pass === true){
    if(moves.length || sec.yard.length) throw new Error("illegal");
    st.passes += 1; st.last = { seat, passed: true }; next();
    if(st.passes >= st.n){                                    // blocked: the lowest hand takes the points
      const tot = sec.hands.map(dmPips), low = Math.min(...tot), w = tot.indexOf(low);
      return dmEndRound(st, sec, w, dmRound5(tot.reduce((a, x, i) => a + (i === w ? 0 : x), 0)), "blocked", rand);
    }
    sync(); return { st, sec, over: null };
  }
  const t = mv && mv.tile; if(!Array.isArray(t) || t.length !== 2) throw new Error("illegal");
  const tile = [Math.min(t[0], t[1]), Math.max(t[0], t[1])];
  const ok = moves.find(m => dmSame(m.tile, tile) && (!st.center || m.end === mv.end));
  if(!ok) throw new Error("illegal");
  sec.hands[seat] = hand.filter(x => !dmSame(x, tile));
  if(!st.center) st.center = tile;
  else {
    const e = dmEnds(st).find(x => x.end === mv.end);
    st.arms[mv.end].push(tile[0] === e.val ? [tile[0], tile[1]] : [tile[1], tile[0]]);   // [the side that matches, the new open side]
  }
  st.passes = 0;
  const count = dmCount(st), pts = count > 0 && count % 5 === 0 ? count : 0;
  st.score[seat] += pts; st.last = { seat, tile, end: mv.end || null, count, pts };
  if(!sec.hands[seat].length){
    const bonus = dmRound5(sec.hands.reduce((a, h, i) => a + (i === seat ? 0 : dmPips(h)), 0));
    return dmEndRound(st, sec, seat, bonus, "domino", rand);
  }
  if(st.score[seat] >= DM_TARGET){ st.winSeat = seat; sync(); return { st, sec, over: { winSeat: seat, why: `${st.score[seat]} points` } }; }
  next(); sync(); return { st, sec, over: null };
}
function dmEndRound(st, sec, w, bonus, how, rand){
  st.score[w] += bonus; st.lastRound = { round: st.round, winner: w, bonus, how };
  if(Math.max(...st.score) >= DM_TARGET){ const top = Math.max(...st.score), ws = st.score.indexOf(top); st.winSeat = ws;
    st.counts = sec.hands.map(h => h.length); st.yard = sec.yard.length; return { st, sec, over: { winSeat: ws, why: `${top} points` } }; }
  st.round += 1; dmDeal(st, sec, w, rand);
  return { st, sec, over: null };
}
// ---- the computer player: the move that scores most, else the heaviest tile (doubles first)
export function dmBot(st, hand, seat){
  if(seat !== st.turn) return null;
  const moves = dmMoves(st, hand);
  if(!moves.length) return st.yard > 0 ? { draw: true } : { pass: true };
  const val = m => { const x = dmApply(st, { hands: st.seats.map((_, i) => i === seat ? hand : []), yard: [] }, seat, m, () => 0.5);
    return (x.st.last?.pts || 0) * 10 + m.tile[0] + m.tile[1] + (m.tile[0] === m.tile[1] ? 3 : 0); };
  return [...moves].map(m => ({ m, v: (() => { try { return val(m); } catch { return -1; } })() })).sort((a, b) => b.v - a.v)[0].m;
}
