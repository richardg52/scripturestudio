// Table of 7 Spades for couples (his order, 2026-10-17). HIS RULES: JOKERS & DEUCES. ONE copy of the rules: the
// server (functions/games) checks every bid and card with it; the app carries the identical text (index.html, between
// the SPADES RULES markers) to grey out cards you can't play. tests/spades_rules_test.mjs proves both.
// The deck: 2♣ and 2♥ come out, the two jokers go in (52 cards, 13 each). Trumps, highest first: Big Joker, Little
// Joker, 2♠, 2♦, then A♠ down to 3♠. The 2♦ and both jokers ARE spades: they follow spades and count as spades.
// Four players, partners sit across: seats 0 and 2 are team 1, seats 1 and 3 are team 2. Each hand: bids from the
// left of the dealer (0 = nil), then 13 tricks; follow suit if you can; spades can't be led until one has been played
// (unless you hold nothing else). Scoring: make your team's bid = 10 a trick bid + 1 a trick over (a "bag"); miss it =
// minus 10 a trick bid. Nil: +100 if that player takes no trick, -100 if they take any (their tricks are bags). Every
// 10 bags = minus 100. First team to the target (300 or 500) wins; a team at minus 200 loses. A tie keeps playing.
// Cards: suit letter + rank, ranks 3..14 (11 J, 12 Q, 13 K, 14 A): "S14" is A♠, "H3" is 3♥; "S2", "D2", "LJ", "BJ".
export const SP_TARGETS = [300, 500];
export function spDeck(){
  const d = ["BJ", "LJ", "S2", "D2"];
  for(const s of ["S", "H", "D", "C"]) for(let r = 3; r <= 14; r++) d.push(s + r);
  return d;
}
export const spSuit = c => c === "BJ" || c === "LJ" || c === "D2" || c[0] === "S" ? "S" : c[0];
export function spPower(c){
  if(c === "BJ") return 104; if(c === "LJ") return 103; if(c === "S2") return 102; if(c === "D2") return 101;
  return Number(c.slice(1)) + (spSuit(c) === "S" ? 80 : 0);
}
const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };
export const spSort = h => [...h].sort((a, b) => SUIT_ORDER[spSuit(a)] - SUIT_ORDER[spSuit(b)] || spPower(b) - spPower(a));
export function spDeal(rand = Math.random){
  const d = spDeck(); for(let i = d.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return [0, 1, 2, 3].map(k => spSort(d.slice(k * 13, k * 13 + 13)));
}
function spFresh(st, dealer){
  return Object.assign(st, { dealer, phase: "bid", seat: (dealer + 1) % 4, bids: [null, null, null, null], tricks: [0, 0, 0, 0],
    trick: [], last: null, broken: false, counts: [13, 13, 13, 13] });
}
// seats: [team 1, team 2, team 1, team 2] member ids -> public state (no cards in it)
export function spInit(seats, target){
  return spFresh({ seats, target: SP_TARGETS.includes(target) ? target : 500, hand: 1, score: [0, 0], bags: [0, 0], lastHand: null }, 3);
}
export function spLegal(st, hand){
  if(st.phase !== "play") return [];
  if(!st.trick.length) return st.broken || hand.every(c => spSuit(c) === "S") ? [...hand] : hand.filter(c => spSuit(c) !== "S");
  const led = spSuit(st.trick[0].card), same = hand.filter(c => spSuit(c) === led);
  return same.length ? same : [...hand];
}
function spWinner(trick){
  const led = spSuit(trick[0].card), trump = trick.some(t => spSuit(t.card) === "S") ? "S" : led;
  return trick.filter(t => spSuit(t.card) === trump).sort((a, b) => spPower(b.card) - spPower(a.card))[0].seat;
}
export function spScoreHand(st){
  const out = [0, 1].map(t => {
    const seats = [t, t + 2], bid = seats.reduce((s, k) => s + (st.bids[k] || 0), 0);
    const won = seats.filter(k => st.bids[k] !== 0).reduce((s, k) => s + st.tricks[k], 0);
    let pts = 0, bags = 0; const notes = [];
    for(const k of seats) if(st.bids[k] === 0){
      if(st.tricks[k] === 0){ pts += 100; notes.push({ seat: k, nil: true }); } else { pts -= 100; bags += st.tricks[k]; notes.push({ seat: k, nil: false }); }
    }
    if(bid > 0){ if(won >= bid){ pts += 10 * bid + (won - bid); bags += won - bid; } else pts -= 10 * bid; }
    else bags += won;
    return { bid, won, pts, bags, notes };
  });
  return out;
}
// mv: {bid: 0..13} in the bidding, {card} in the play. hands: the four hands (server only). Returns
// { st, hands, over } with over null or { winner: 0 | 1, why }. deal() makes the next hand's cards.
export function spApply(st0, hands0, seat, mv, deal = spDeal){
  const st = JSON.parse(JSON.stringify(st0)), hands = hands0.map(h => [...h]);
  if(seat !== st.seat) throw new Error("turn");
  if(st.phase === "bid"){
    const b = mv && mv.bid;
    if(!Number.isInteger(b) || b < 0 || b > 13) throw new Error("illegal");
    st.bids[seat] = b; st.seat = (seat + 1) % 4;
    if(st.bids.every(x => x !== null)){ st.phase = "play"; st.seat = (st.dealer + 1) % 4; }
    return { st, hands, over: null };
  }
  if(st.phase !== "play") throw new Error("illegal");
  const card = mv && mv.card;
  if(!spLegal(st, hands[seat]).includes(card)) throw new Error("illegal");
  hands[seat] = hands[seat].filter(c => c !== card); st.counts[seat] -= 1;
  st.trick.push({ seat, card }); if(spSuit(card) === "S") st.broken = true;
  if(st.trick.length < 4){ st.seat = (seat + 1) % 4; return { st, hands, over: null }; }
  const w = spWinner(st.trick); st.tricks[w] += 1; st.last = { trick: st.trick, winner: w }; st.trick = []; st.seat = w;
  if(st.counts.some(n => n > 0)) return { st, hands, over: null };
  // the hand is over: score it, then deal the next one (or end the game)
  const res = spScoreHand(st);
  res.forEach((r, t) => { st.score[t] += r.pts; st.bags[t] += r.bags; r.bagPenalty = false;
    if(st.bags[t] >= 10){ st.score[t] -= 100; st.bags[t] -= 10; r.bagPenalty = true; } });
  st.lastHand = { hand: st.hand, bids: st.bids, tricks: st.tricks, res };
  const [a, b] = st.score, done = (a >= st.target || b >= st.target || a <= -200 || b <= -200) && a !== b;
  if(done) return { st, hands, over: { winner: a > b ? 0 : 1, why: `${a} to ${b}` } };
  st.hand += 1; spFresh(st, (st.dealer + 1) % 4);
  return { st, hands: deal(), over: null };
}
