// Table of 7 Bid Whist (his order, 2026-10-17), HIS HOUSE RULES: JOKERS IN, FIRST TO 7, NO-TRUMP COUNTS DOUBLE, A
// BOSTON WINS. ONE copy of the rules: the server (functions/games) runs family games with it, the app carries the
// identical text (index.html, between the BIDWHIST RULES markers) for a game with computer partners.
// tests/bidwhist_rules_test.mjs proves both.
// 54 cards (both jokers in). Four players, partners across: seats 0 and 2 are team 1, seats 1 and 3 are team 2.
// 12 cards each, 6 to the kitty. Bidding: once around from the dealer's left. A bid is 4 to 7 books over six, called
// uptown (high cards win), downtown (low cards win: A, 2, 3 … K) or no trump. A bid must beat the one before it: a
// bigger number, or the same number in no trump over a trump bid. Everyone may pass, except the dealer when everyone
// else has passed: then the dealer must bid at least 4. The winner picks up the kitty, puts 6 cards back (they count as
// the team's first book), names trump (in no trump: the direction) and leads. Follow suit if you can. In a trump game
// the Big Joker, then the Little Joker, then the trump suit win; the jokers ARE trumps. In no trump the jokers belong to
// no suit and never win a book. Scoring: the bidding team needs 6 + the bid in books (the kitty is one). Made: the
// books over six. Set: minus the bid. No trump counts double. All 13 books (a Boston) wins the game. First to 7 wins;
// a team at minus 7 loses.
// Cards: suit letter + rank 2..14 (11 J, 12 Q, 13 K, 14 A), "BJ", "LJ".
export const BW_TARGET = 7;
export function bwDeck(){ const d = ["BJ", "LJ"]; for(const s of ["S", "H", "D", "C"]) for(let r = 2; r <= 14; r++) d.push(s + r); return d; }
const bwShuffle = (a, rand) => { const b = [...a]; for(let i = b.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
export const bwJoker = c => c === "BJ" || c === "LJ";
// the suit a card follows in play: jokers are trumps in a trump game, and have no suit in no trump
export const bwSuit = (st, c) => bwJoker(c) ? (st.trump ? st.trump : null) : c[0];
// higher wins: uptown A K Q … 2, downtown A 2 3 … K
export function bwRankPower(st, c){ const r = Number(c.slice(1)); return st.dir === "down" ? (r === 14 ? 14 : 15 - r) : r; }
export function bwPower(st, c){
  if(bwJoker(c)) return st.trump ? (c === "BJ" ? 200 : 199) : -1;
  return bwRankPower(st, c) + (st.trump && c[0] === st.trump ? 100 : 0);
}
const BW_SUIT_ORDER = { S: 0, H: 1, D: 2, C: 3 };
export const bwSort = h => [...h].sort((a, b) => (bwJoker(a) ? -1 : BW_SUIT_ORDER[a[0]]) - (bwJoker(b) ? -1 : BW_SUIT_ORDER[b[0]]) || (bwJoker(a) || bwJoker(b) ? (a === "BJ" ? -1 : 1) : Number(b.slice(1)) - Number(a.slice(1))));
function bwFresh(st, sec, dealer, rand){
  const d = bwShuffle(bwDeck(), rand);
  sec.hands = [0, 1, 2, 3].map(k => bwSort(d.slice(k * 12, k * 12 + 12))); sec.kitty = d.slice(48);
  Object.assign(st, { dealer, phase: "bid", seat: (dealer + 1) % 4, bids: [null, null, null, null], high: null, bidder: null,
    trump: null, dir: "up", nt: false, trick: [], last: null, books: [0, 0], counts: [12, 12, 12, 12] });
}
export function bwInit(seats, rand = Math.random){
  const st = { seats, score: [0, 0], hand: 1, lastHand: null }, sec = {};
  bwFresh(st, sec, 3, rand); return { st, sec };
}
const bwBidRank = b => b.n * 2 + (b.mode === "nt" ? 1 : 0);
export function bwCanBid(st, b){
  if(!b || !Number.isInteger(b.n) || b.n < 4 || b.n > 7 || !["up", "down", "nt"].includes(b.mode)) return false;
  return !st.high || bwBidRank(b) > bwBidRank(st.high);
}
export function bwLegal(st, hand){
  if(st.phase !== "play") return [];
  if(!st.trick.length) return [...hand];
  const lead = st.trick.map(t => bwSuit(st, t.card)).find(s => s !== null);
  if(!lead) return [...hand];                                  // only a no-trump joker has been played
  const same = hand.filter(c => bwSuit(st, c) === lead);
  return same.length ? same : [...hand];
}
function bwWinner(st, trick){
  const lead = trick.map(t => bwSuit(st, t.card)).find(s => s !== null);
  let best = null;
  for(const t of trick){
    const s = bwSuit(st, t.card), trumpCard = st.trump && s === st.trump, p = bwPower(st, t.card);
    if(p < 0) continue;
    const ok = trumpCard || s === lead;
    if(!ok) continue;
    const score = (trumpCard ? 1000 : 0) + p;
    if(!best || score > best.score) best = { seat: t.seat, score };
  }
  return best ? best.seat : trick[0].seat;
}
// mv: {bid:{n, mode} | null} while bidding · {discard:[6 cards], trump?:suit, dir?} for the bidder with the kitty · {card}
export function bwApply(st0, sec0, seat, mv, rand = Math.random){
  const st = JSON.parse(JSON.stringify(st0)), sec = JSON.parse(JSON.stringify(sec0));
  if(seat !== st.seat) throw new Error("turn");
  if(st.phase === "bid"){
    const b = mv ? mv.bid : undefined, dealer = seat === st.dealer;
    if(b === null || b === undefined){
      if(dealer && !st.high) throw new Error("dealer");        // everyone passed: the dealer must bid
      st.bids[seat] = "pass";
    } else { if(!bwCanBid(st, b)) throw new Error("illegal"); st.bids[seat] = { n: b.n, mode: b.mode }; st.high = { n: b.n, mode: b.mode }; st.bidder = seat; }
    if(dealer){
      st.phase = "kitty"; st.seat = st.bidder; st.nt = st.high.mode === "nt"; st.dir = st.high.mode === "down" ? "down" : "up";
      sec.hands[st.bidder] = bwSort([...sec.hands[st.bidder], ...sec.kitty]); sec.kitty = []; st.counts[st.bidder] = 18;
    } else st.seat = (seat + 1) % 4;
    return { st, sec, over: null };
  }
  if(st.phase === "kitty"){
    const dis = mv && mv.discard, hand = sec.hands[seat];
    if(!Array.isArray(dis) || dis.length !== 6 || new Set(dis).size !== 6 || !dis.every(c => hand.includes(c))) throw new Error("illegal");
    if(st.nt){ if(!["up", "down"].includes(mv.dir)) throw new Error("illegal"); st.dir = mv.dir; st.trump = null; }
    else { if(!["S", "H", "D", "C"].includes(mv.trump)) throw new Error("illegal"); st.trump = mv.trump; }
    sec.hands[seat] = bwSort(hand.filter(c => !dis.includes(c))); sec.kitty = dis; st.counts[seat] = 12;
    st.books[seat % 2] += 1;                                   // the kitty is the bidding team's first book
    st.phase = "play"; st.seat = seat;                         // the bidder leads
    return { st, sec, over: null };
  }
  if(st.phase !== "play") throw new Error("illegal");
  const card = mv && mv.card;
  if(!bwLegal(st, sec.hands[seat]).includes(card)) throw new Error("illegal");
  sec.hands[seat] = sec.hands[seat].filter(c => c !== card); st.counts[seat] -= 1;
  st.trick.push({ seat, card });
  if(st.trick.length < 4){ st.seat = (seat + 1) % 4; return { st, sec, over: null }; }
  const w = bwWinner(st, st.trick); st.books[w % 2] += 1; st.last = { trick: st.trick, winner: w }; st.trick = []; st.seat = w;
  if(st.counts.some(n => n > 0)) return { st, sec, over: null };
  // the hand is over
  const team = st.bidder % 2, got = st.books[team], need = 6 + st.high.n, mult = st.nt ? 2 : 1;
  const boston = got === 13, made = got >= need, pts = made ? (got - 6) * mult : -st.high.n * mult;
  st.score[team] += pts;
  st.lastHand = { hand: st.hand, bidder: st.bidder, bid: st.high, trump: st.trump, dir: st.dir, books: st.books, made, pts, boston };
  const [a, b] = st.score;
  if(boston) return { st, sec, over: { winner: team, why: "a Boston" } };
  if(a >= BW_TARGET || b >= BW_TARGET || a <= -BW_TARGET || b <= -BW_TARGET){
    const winner = a <= -BW_TARGET ? 1 : b <= -BW_TARGET ? 0 : a === b ? team : a > b ? 0 : 1;
    return { st, sec, over: { winner, why: `${a} to ${b}` } };
  }
  st.hand += 1; bwFresh(st, sec, (st.dealer + 1) % 4, rand);
  return { st, sec, over: null };
}
// ---- the computer player
function bwStrength(hand, mode){
  const j = hand.filter(bwJoker).length, plain = hand.filter(c => !bwJoker(c));
  const by = {}; plain.forEach(c => (by[c[0]] ||= []).push(Number(c.slice(1))));
  const longest = Math.max(0, ...Object.values(by).map(x => x.length));
  let t = 0;
  for(const rs of Object.values(by)) for(const r of rs){
    if(r === 14) t += 1;
    else if(mode === "down" ? r === 2 : r === 13) t += rs.length >= 2 ? 0.7 : 0.3;
    else if(mode === "down" ? r === 3 : r === 12) t += rs.length >= 3 ? 0.4 : 0;
  }
  return t + (mode === "nt" ? 0 : j + Math.max(0, longest - 3) * 0.8);
}
export function bwBot(st, hand, seat){
  if(seat !== st.seat) return null;
  if(st.phase === "bid"){
    const best = ["up", "down"].map(m => ({ m, s: bwStrength(hand, m) })).sort((a, b) => b.s - a.s)[0];
    const n = Math.min(7, Math.floor(1 + best.s + 3 - 6 + 0.5));   // the kitty + my sure books + about 3 from my partner
    const bid = { n: Math.max(4, n), mode: best.m };
    if(n >= 4 && bwCanBid(st, bid)) return { bid };
    if(seat === st.dealer && !st.high) return { bid: { n: 4, mode: best.m } };
    return { bid: null };
  }
  if(st.phase === "kitty"){
    const by = {}; hand.filter(c => !bwJoker(c)).forEach(c => (by[c[0]] ||= []).push(c));
    const trump = Object.entries(by).sort((a, b) => b[1].length - a[1].length)[0][0];
    const keep = c => bwJoker(c) || (!st.nt && c[0] === trump);
    const weak = hand.filter(c => !keep(c)).sort((a, b) => bwRankPower({ dir: st.dir }, a) - bwRankPower({ dir: st.dir }, b));
    const discard = (weak.length >= 6 ? weak : [...weak, ...hand.filter(keep).reverse()]).slice(0, 6);
    return st.nt ? { discard, dir: "up" } : { discard, trump };
  }
  const legal = bwLegal(st, hand); if(legal.length === 1) return { card: legal[0] };
  const pw = c => bwPower(st, c) + (st.trump && bwSuit(st, c) === st.trump ? 1000 : 0);
  const low = cs => [...cs].sort((a, b) => pw(a) - pw(b))[0], high = cs => [...cs].sort((a, b) => pw(b) - pw(a))[0];
  const isTrump = c => st.trump && bwSuit(st, c) === st.trump, side = legal.filter(c => !isTrump(c));
  const cheap = cs => { const plain = cs.filter(c => !isTrump(c) && bwPower(st, c) >= 0); return low(plain.length ? plain : cs); };
  if(!st.trick.length){                                       // leading: the bidders pull trumps, the others cash their best side card
    const trumps = legal.filter(isTrump);
    if(seat % 2 === st.bidder % 2 && trumps.length >= 2) return { card: high(trumps) };
    return { card: side.length ? high(side) : high(legal) };
  }
  const wins = legal.filter(c => bwWinner(st, [...st.trick, { seat, card: c }]) === seat);
  const partner = (seat + 2) % 4, now = bwWinner(st, st.trick);
  if(now === partner && (st.trick.length === 3 || bwPower(st, st.trick.find(t => t.seat === partner).card) >= 113)) return { card: cheap(legal) };
  return { card: wins.length ? low(wins) : cheap(legal) };
}
