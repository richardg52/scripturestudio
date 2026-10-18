// Table of 7 Wild Card (his order, 2026-10-17: "add UNO"). Uno's rules under our own name and card art (UNO is
// Mattel's). ONE copy of the rules: the server (functions/games) runs family games with it, the app carries the
// identical text (index.html, between the WILDCARD RULES markers) for games against the computer.
// tests/wildcard_rules_test.mjs proves both.
// 108 cards: red, yellow, green, blue — one 0, two each of 1-9, Skip, Reverse and Draw Two — plus 4 Wild and 4 Wild
// Draw Four. 7 cards each; the first card turned up is always a number. Match the color, the number or the symbol, or
// play a Wild (you name the color). Can't play? Draw one; if it plays you may play it, else your turn ends. Skip: the
// next player misses a turn. Reverse: the direction turns (with two players it works as a Skip). Draw Two / Wild Draw
// Four: the next player draws 2 / 4 and misses a turn. Going down to one card? Call "Last card!" as you play it, or any
// other player can catch you before the next move and you draw 2. First to play their last card wins the round and
// scores the cards left in everyone else's hand (numbers at face value, action cards 20, wilds 50). One round, or to 200.
// Cards: color letter + 0-9 | S (skip) | R (reverse) | D (draw two); "W" and "W4" for the wilds.
export const WC_COLORS = ["R", "Y", "G", "B"], WC_TARGETS = [0, 200];
export function wcDeck(){
  const d = [];
  for(const c of WC_COLORS){ d.push(c + "0"); for(let n = 1; n <= 9; n++) d.push(c + n, c + n); for(const a of ["S", "R", "D"]) d.push(c + a, c + a); }
  for(let i = 0; i < 4; i++) d.push("W", "W4");
  return d;
}
const wcShuffle = (a, rand) => { const b = [...a]; for(let i = b.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const wcWild = c => c === "W" || c === "W4";
export const wcColor = c => wcWild(c) ? null : c[0];
export const wcFace = c => wcWild(c) ? c : c.slice(1);
export const wcPoints = c => wcWild(c) ? 50 : /^[SRD]$/.test(wcFace(c)) ? 20 : Number(wcFace(c));
export const wcPlayable = (st, c) => wcWild(c) || wcColor(c) === st.color || wcFace(c) === wcFace(st.top);
function wcDraw(sec, rand){
  if(!sec.pile.length){ const top = sec.discard.pop(); sec.pile = wcShuffle(sec.discard, rand); sec.discard = [top]; }
  return sec.pile.pop();
}
function wcDealRound(st, sec, start, rand){
  sec.pile = wcShuffle(wcDeck(), rand); sec.discard = [];
  sec.hands = st.seats.map(() => []);
  for(let k = 0; k < 7; k++) sec.hands.forEach(h => h.push(sec.pile.pop()));
  let top = sec.pile.pop(); while(!/^\d$/.test(wcFace(top))){ sec.pile.unshift(top); top = sec.pile.pop(); }
  sec.discard.push(top);
  Object.assign(st, { top, color: wcColor(top), turn: start, start, dir: 1, drew: false, unsafe: null, last: null, counts: sec.hands.map(h => h.length), pile: sec.pile.length });
}
// seats: 2-4 player ids (computer seats "bot:1".."bot:3") -> { st (public), sec (hands, draw pile, discards) }
export function wcInit(seats, target, rand = Math.random){
  const st = { seats, n: seats.length, target: WC_TARGETS.includes(target) ? target : 0, score: seats.map(() => 0), round: 1, lastRound: null, winSeat: null };
  const sec = {}; wcDealRound(st, sec, 0, rand); return { st, sec };
}
const wcStep = (st, from, k) => ((from + k * st.dir) % st.n + st.n * 4) % st.n;
// what the player whose turn it is may play now (after drawing, only the drawn card)
export function wcLegal(st, hand){
  if(st.drew) return hand.length && wcPlayable(st, hand[hand.length - 1]) ? [hand[hand.length - 1]] : [];
  return hand.filter(c => wcPlayable(st, c));
}
// mv: {card, color?, last?} | {draw:true} | {pass:true} | {catch:true} (any other player, while someone forgot "Last card!")
export function wcApply(st0, sec0, seat, mv, rand = Math.random){
  const st = JSON.parse(JSON.stringify(st0)), sec = JSON.parse(JSON.stringify(sec0));
  const sync = () => { st.counts = sec.hands.map(h => h.length); st.pile = sec.pile.length; };
  if(mv && mv.catch === true){
    if(st.unsafe === null || seat === st.unsafe || seat < 0 || seat >= st.n) throw new Error("illegal");
    const v = st.unsafe; sec.hands[v].push(wcDraw(sec, rand), wcDraw(sec, rand)); st.unsafe = null; st.last = { seat, caught: v }; sync();
    return { st, sec, over: null };
  }
  if(seat !== st.turn) throw new Error("turn");
  st.unsafe = null;
  const hand = sec.hands[seat];
  if(mv && mv.draw === true){
    if(st.drew) throw new Error("illegal");
    const c = wcDraw(sec, rand); hand.push(c); st.drew = true; st.last = { seat, drew: true };
    if(!wcPlayable(st, c)){ st.drew = false; st.turn = wcStep(st, seat, 1); st.last.passed = true; }
    sync(); return { st, sec, over: null };
  }
  if(mv && mv.pass === true){
    if(!st.drew) throw new Error("illegal");
    st.drew = false; st.turn = wcStep(st, seat, 1); st.last = { seat, passed: true }; sync(); return { st, sec, over: null };
  }
  const c = mv && mv.card;
  if(!wcLegal(st, hand).includes(c)) throw new Error("illegal");
  if(wcWild(c) && !WC_COLORS.includes(mv.color)) throw new Error("color");
  hand.splice(hand.lastIndexOf(c), 1); sec.discard.push(c);
  st.top = c; st.color = wcWild(c) ? mv.color : wcColor(c); st.drew = false;
  st.last = { seat, card: c, color: st.color };
  const f = wcFace(c);
  let next = wcStep(st, seat, 1);
  if(f === "S") next = wcStep(st, seat, 2);
  else if(f === "R"){ st.dir *= -1; next = st.n === 2 ? seat : wcStep(st, seat, 1); }
  else if(f === "D" || c === "W4"){ const v = wcStep(st, seat, 1); const k = f === "D" ? 2 : 4; for(let i = 0; i < k; i++) sec.hands[v].push(wcDraw(sec, rand)); st.last.hit = v; next = wcStep(st, seat, 2); }
  if(!hand.length){                                   // the round is won
    const pts = sec.hands.reduce((a, h, i) => a + (i === seat ? 0 : h.reduce((x, y) => x + wcPoints(y), 0)), 0);
    st.score[seat] += pts; st.lastRound = { round: st.round, winner: seat, pts };
    if(!st.target || st.score[seat] >= st.target){ st.winSeat = seat; sync(); return { st, sec, over: { winSeat: seat, why: st.target ? `${st.score[seat]} points` : `played out in round ${st.round}` } }; }
    st.round += 1; wcDealRound(st, sec, (st.start + 1) % st.n, rand); return { st, sec, over: null };
  }
  if(hand.length === 1 && mv.last !== true) st.unsafe = seat;
  if(hand.length === 1 && mv.last === true) st.last.called = true;
  st.turn = next; sync();
  return { st, sec, over: null };
}
// ---- the computer player: plays only legal cards; keeps wilds for last; hits the next player when they're close to out
export function wcBot(st, hand, seat, rand = Math.random){
  if(st.unsafe !== null && st.unsafe !== seat && rand() < 0.5) return { catch: true };
  if(seat !== st.turn) return null;
  const legal = wcLegal(st, hand);
  if(!legal.length) return st.drew ? { pass: true } : { draw: true };
  const nextCount = st.counts[wcStep(st, seat, 1)];
  const by = c => (nextCount <= 2 && /^[SD]$|^W4$/.test(wcFace(c)) ? 100 : 0) + (wcWild(c) ? -50 : 0) + wcPoints(c);
  const card = [...legal].sort((a, b) => by(b) - by(a))[0];
  const mv = { card, last: hand.length === 2 && rand() < 0.9 };
  if(wcWild(card)){ const cnt = { R: 0, Y: 0, G: 0, B: 0 }; hand.forEach(x => { if(!wcWild(x)) cnt[wcColor(x)]++; }); mv.color = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0]; }
  return mv;
}
