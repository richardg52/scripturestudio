// Table of 7 Blackjack (his order, 2026-10-17). ONE copy of the rules: the server (functions/games) runs a family
// table with it, and the app carries the identical text (index.html, between the BLACKJACK RULES markers) for a game
// alone against the dealer on one phone. tests/blackjack_rules_test.mjs proves both. CHIPS ARE POINTS, NEVER MONEY.
// The table: 4 decks, reshuffled when fewer than 60 cards are left at a deal. The dealer stands on every 17. A
// blackjack (an ace and a ten-card as your first two) pays 3 to 2. Double down on any first two cards. Split a pair
// once (two cards of the same value); split aces get one card each. The dealer checks for blackjack when showing an
// ace or a ten-card. No insurance, no surrender. Everyone starts with 1,000 points; a bet is 10 to 500.
// A move: {bet:n} while betting (each player once a round, in any order); {act:"hit"|"stand"|"double"|"split"} from
// the player whose turn it is, on their current hand; {next:true} from anyone after a round, to start the next one.
// Cards: suit letter + rank 2..14 (11 J, 12 Q, 13 K, 14 A), e.g. "S14" is A♠. The dealer's face-down card and the
// shoe are hidden state (the server's game_secrets); the public state never holds them.
export const BJ_START = 1000, BJ_MIN = 10, BJ_MAX = 500, BJ_DECKS = 4;
export function bjShoe(rand = Math.random){
  const d = []; for(let k = 0; k < BJ_DECKS; k++) for(const s of ["S", "H", "D", "C"]) for(let r = 2; r <= 14; r++) d.push(s + r);
  for(let i = d.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
export const bjVal = c => { const r = Number(c.slice(1)); return r === 14 ? 11 : r >= 10 ? 10 : r; };
export function bjTotal(cards){
  let t = 0, aces = 0;
  for(const c of cards){ t += bjVal(c); if(Number(c.slice(1)) === 14) aces++; }
  while(t > 21 && aces){ t -= 10; aces--; }
  return { t, soft: aces > 0 };
}
export const bjNatural = h => h.cards.length === 2 && !h.split && bjTotal(h.cards).t === 21;
export function bjInit(players){
  return { players, bank: players.map(() => BJ_START), bets: players.map(() => null), hands: players.map(() => []), dealer: [],
    phase: "bet", seat: -1, h: 0, round: 1, results: null, shoeLeft: BJ_DECKS * 52 };
}
export const bjSecret = (rand = Math.random) => ({ shoe: bjShoe(rand), hole: null });
function bjDraw(sec, rand){ if(!sec.shoe.length) sec.shoe = bjShoe(rand); return sec.shoe.pop(); }
// the next hand still to play, from the current one on; false when every hand is done
function bjNext(st){
  for(let p = Math.max(st.seat, 0); p < st.players.length; p++)
    for(let i = p === st.seat ? st.h : 0; i < st.hands[p].length; i++)
      if(!st.hands[p][i].done){ st.seat = p; st.h = i; return true; }
  return false;
}
function bjFinish(st, sec, rand){
  st.dealer = [st.dealer[0], sec.hole]; sec.hole = null;
  const anyLive = st.hands.some(hs => hs.some(h => !h.bust && !bjNatural(h)));
  if(anyLive) while(bjTotal(st.dealer).t < 17) st.dealer.push(bjDraw(sec, rand));
  const d = bjTotal(st.dealer).t, dNat = st.dealer.length === 2 && d === 21;
  st.results = st.players.map((_, p) => st.hands[p].map(h => {
    let pay = 0, res;
    if(h.bust) res = "bust";
    else if(bjNatural(h) && dNat){ res = "push"; pay = h.bet; }
    else if(bjNatural(h)){ res = "blackjack"; pay = h.bet + Math.floor(h.bet * 1.5); }
    else if(dNat) res = "lose";
    else { const t = bjTotal(h.cards).t; if(d > 21 || t > d){ res = "win"; pay = h.bet * 2; } else if(t === d){ res = "push"; pay = h.bet; } else res = "lose"; }
    st.bank[p] += pay; return { res, net: pay - h.bet };
  }));
  st.phase = "over"; st.seat = -1; st.h = 0; st.shoeLeft = sec.shoe.length;
}
function bjDeal(st, sec, rand){
  if(sec.shoe.length < 60) sec.shoe = bjShoe(rand);
  st.hands = st.players.map((_, p) => st.bets[p] ? [{ cards: [], bet: st.bets[p], done: false }] : []);
  for(let k = 0; k < 2; k++){
    st.players.forEach((_, p) => { if(st.hands[p].length) st.hands[p][0].cards.push(bjDraw(sec, rand)); });
    if(k === 0) st.dealer = [bjDraw(sec, rand)]; else sec.hole = bjDraw(sec, rand);
  }
  st.hands.forEach(hs => hs.forEach(h => { if(bjTotal(h.cards).t === 21) h.done = true; }));
  st.phase = "play"; st.seat = -1; st.h = 0; st.shoeLeft = sec.shoe.length;
  if(bjVal(st.dealer[0]) >= 10 && bjTotal([st.dealer[0], sec.hole]).t === 21){ bjFinish(st, sec, rand); return; }   // the dealer peeks
  if(!bjNext(st)) bjFinish(st, sec, rand);
}
// p: the player's index in st.players. Returns { st, sec, over } (over: true when nobody can bet any more).
export function bjApply(st0, sec0, p, mv, rand = Math.random){
  const st = JSON.parse(JSON.stringify(st0)), sec = JSON.parse(JSON.stringify(sec0));
  if(!Number.isInteger(p) || p < 0 || p >= st.players.length) throw new Error("player");
  if(mv && mv.next === true){
    if(st.phase !== "over") throw new Error("illegal");
    Object.assign(st, { round: st.round + 1, bets: st.players.map(() => null), hands: st.players.map(() => []), dealer: [], results: null, phase: "bet", seat: -1, h: 0 });
    return { st, sec, over: st.bank.every(b => b < BJ_MIN) };
  }
  if(st.phase === "bet"){
    const b = mv && mv.bet;
    if(st.bets[p] !== null || !Number.isInteger(b) || b < BJ_MIN || b > BJ_MAX || b > st.bank[p]) throw new Error("illegal");
    st.bets[p] = b; st.bank[p] -= b;
    if(st.bets.every((x, i) => x !== null || st.bank[i] < BJ_MIN)) bjDeal(st, sec, rand);   // who can't cover the smallest bet sits out
    return { st, sec, over: false };
  }
  if(st.phase !== "play" || st.seat !== p) throw new Error("turn");
  const hs = st.hands[p], h = hs[st.h], a = mv && mv.act;
  if(a === "hit"){ h.cards.push(bjDraw(sec, rand)); const t = bjTotal(h.cards).t; if(t > 21){ h.bust = true; h.done = true; } else if(t === 21) h.done = true; }
  else if(a === "stand") h.done = true;
  else if(a === "double"){
    if(h.cards.length !== 2 || st.bank[p] < h.bet) throw new Error("illegal");
    st.bank[p] -= h.bet; h.bet *= 2; h.doubled = true; h.cards.push(bjDraw(sec, rand)); if(bjTotal(h.cards).t > 21) h.bust = true; h.done = true;
  } else if(a === "split"){
    if(hs.length !== 1 || h.cards.length !== 2 || bjVal(h.cards[0]) !== bjVal(h.cards[1]) || st.bank[p] < h.bet) throw new Error("illegal");
    st.bank[p] -= h.bet; const aces = Number(h.cards[0].slice(1)) === 14;
    hs.push({ cards: [h.cards[1]], bet: h.bet, done: false, split: true }); h.cards = [h.cards[0]]; h.split = true;
    for(const x of hs){ x.cards.push(bjDraw(sec, rand)); if(aces || bjTotal(x.cards).t === 21) x.done = true; }
  } else throw new Error("illegal");
  if(!bjNext(st)) bjFinish(st, sec, rand);
  return { st, sec, over: false };
}
// what the player whose turn it is may do now
export function bjCan(st, p){
  if(st.phase !== "play" || st.seat !== p) return [];
  const hs = st.hands[p], h = hs[st.h], out = ["hit", "stand"];
  if(h.cards.length === 2 && st.bank[p] >= h.bet) out.push("double");
  if(hs.length === 1 && h.cards.length === 2 && bjVal(h.cards[0]) === bjVal(h.cards[1]) && st.bank[p] >= h.bet) out.push("split");
  return out;
}
