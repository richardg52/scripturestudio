// Table of 7 Spades (Jokers & deuces) rules, proven (node table-of-7-backend/tests/spades_rules_test.mjs).
import { readFileSync } from "node:fs";
import { spDeck, spSuit, spPower, spDeal, spInit, spLegal, spApply, spScoreHand, spSort, spBotBid, spBotPlay } from "../supabase/functions/games/spades.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const throws = f => { try { f(); return false; } catch { return true; } };

const d = spDeck();
check("the deck has 52 cards, none twice", d.length === 52 && new Set(d).size === 52);
check("2♣ and 2♥ are out; both jokers are in", !d.includes("C2") && !d.includes("H2") && d.includes("BJ") && d.includes("LJ"));
check("trumps, highest first: Big Joker, Little Joker, 2♠, 2♦, A♠", ["BJ", "LJ", "S2", "D2", "S14", "S13"].every((c, i, a) => i === 0 || spPower(a[i - 1]) > spPower(c)));
check("the 2♦ and the jokers are spades", spSuit("D2") === "S" && spSuit("BJ") === "S" && spSuit("LJ") === "S" && spSuit("D3") === "D");
check("the lowest spade beats the best heart", spPower("S3") > spPower("H14"));
check("there are 16 spades and 12 of each other suit", d.filter(c => spSuit(c) === "S").length === 16 && ["H", "C", "D"].every(s => d.filter(c => spSuit(c) === s).length === 12));
let seed = 7; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const hands = spDeal(rand);
check("the deal gives 13 cards to each of four, the whole deck", hands.every(h => h.length === 13) && new Set(hands.flat()).size === 52);

let st = spInit(["a1", "b1", "a2", "b2"], 300);
check("the game starts with bids, seat 1 (left of the dealer) first, no cards in it", st.phase === "bid" && st.seat === 0 && !JSON.stringify(st).match(/"[SHDC]\d+"|BJ|LJ/), st);
check("a bid out of turn is refused", throws(() => spApply(st, hands, 1, { bid: 3 })));
check("a bid must be 0 to 13", throws(() => spApply(st, hands, 0, { bid: 14 })) && throws(() => spApply(st, hands, 0, { bid: 2.5 })));
let r = spApply(st, hands, 0, { bid: 4 }); r = spApply(r.st, r.hands, 1, { bid: 3 }); r = spApply(r.st, r.hands, 2, { bid: 0 }); r = spApply(r.st, r.hands, 3, { bid: 4 });
check("after four bids the play starts, left of the dealer leads", r.st.phase === "play" && r.st.seat === 0 && JSON.stringify(r.st.bids) === "[4,3,0,4]", r.st);

// following suit and breaking spades, on hand-built cards
const P = (trick, broken = false) => ({ phase: "play", trick, broken });
check("spades can't be led before they're broken", JSON.stringify(spLegal(P([]), ["S14", "H3", "D2"])) === '["H3"]');
check("…unless you hold only spades", spLegal(P([]), ["S14", "BJ"]).length === 2);
check("you must follow suit", JSON.stringify(spLegal(P([{ seat: 0, card: "H9" }]), ["H3", "S14", "C5"])) === '["H3"]');
check("the 2♦ follows a spade lead, not a diamond lead", JSON.stringify(spLegal(P([{ seat: 0, card: "S5" }]), ["D2", "D9"])) === '["D2"]' && JSON.stringify(spLegal(P([{ seat: 0, card: "D5" }]), ["D2", "D9"])) === '["D9"]');
check("with no card of the suit led, anything goes", spLegal(P([{ seat: 0, card: "H9" }]), ["S3", "C5"]).length === 2);

// a full trick: hearts led, one player trumps
const t = { ...spInit(["a1", "b1", "a2", "b2"], 300), phase: "play", seat: 0, bids: [1, 1, 1, 1] };
const h4 = [["H14", "C3"], ["H3", "C4"], ["S3", "C5"], ["H13", "C6"]];
let q = spApply(t, h4, 0, { card: "H14" }); q = spApply(q.st, q.hands, 1, { card: "H3" });
check("a card not in your hand is refused", throws(() => spApply(q.st, q.hands, 2, { card: "S14" })));
q = spApply(q.st, q.hands, 2, { card: "S3" }); check("playing a spade breaks spades", q.st.broken === true);
q = spApply(q.st, q.hands, 3, { card: "H13" });
check("the lowest trump takes the ace of the suit led, and the winner leads next", q.st.tricks[2] === 1 && q.st.seat === 2 && q.st.trick.length === 0 && q.st.last.winner === 2, q.st);
check("the Big Joker beats everything", (() => { const x = { ...t, trick: [{ seat: 0, card: "S2" }, { seat: 1, card: "LJ" }, { seat: 2, card: "D2" }] }; const y = spApply({ ...x, seat: 3 }, [[], [], [], ["BJ"]], 3, { card: "BJ" }); return y.st.last.winner === 3; })());

// scoring
const S = (bids, tricks) => spScoreHand({ bids, tricks });
check("making the bid: 10 a trick bid + 1 a bag", JSON.stringify(S([3, 2, 2, 2], [4, 2, 2, 2]).map(x => [x.pts, x.bags])) === "[[51,1],[40,0]]", S([3, 2, 2, 2], [4, 2, 2, 2]));
check("missing the bid costs 10 a trick bid", S([5, 0, 4, 0], [3, 0, 3, 7])[0].pts === -90);
check("nil made is +100, nil broken is -100 and its tricks are bags", (() => { const s = S([0, 4, 3, 0], [0, 6, 3, 4]); return s[0].pts === 130 && s[1].pts === -100 + 40 + 2 && s[1].bags === 4 + 2; })(), S([0, 4, 3, 0], [0, 6, 3, 4]));
check("a nil bidder's tricks don't help the partner's bid", S([0, 1, 4, 1], [3, 1, 3, 6])[0].pts === -100 - 40, S([0, 1, 4, 1], [3, 1, 3, 6]));

// a whole hand played out by the rules, start to finish, then the next deal and the bags penalty
function playHand(st, hands, deal){
  let s = st, h = hands, over = null;
  for(const k of [0, 1, 2, 3]){ const x = spApply(s, h, s.seat, { bid: 3 }); s = x.st; h = x.hands; }
  while(s.phase === "play" && !over){ const card = spLegal(s, h[s.seat])[0]; const x = spApply(s, h, s.seat, { card }, deal); s = x.st; h = x.hands; over = x.over; if(s.hand !== st.hand) break; }
  return { s, h, over };
}
seed = 11; const deal = () => spDeal(rand);
let g = spInit(["a1", "b1", "a2", "b2"], 300), gh = deal(), res = playHand(g, gh, deal);
check("after 13 tricks the hand is scored and a new one is dealt by the next dealer", res.s.hand === 2 && res.s.dealer === 0 && res.s.phase === "bid" && res.s.seat === 1 && res.h.every(x => x.length === 13) && res.s.lastHand?.hand === 1, res.s);
check("the hand's 13 tricks are all counted", res.s.lastHand.tricks.reduce((a, b) => a + b, 0) === 13);
const bagSt = { ...spInit(["a", "b", "c", "d"], 500), phase: "play", seat: 0, bids: [1, 1, 1, 1], tricks: [4, 0, 4, 0], bags: [8, 0], counts: [1, 1, 1, 1] };
const bag = spApply(spApply(spApply(spApply(bagSt, [["H14"], ["H3"], ["H4"], ["H5"]], 0, { card: "H14" }).st, [[], ["H3"], ["H4"], ["H5"]], 1, { card: "H3" }).st, [[], [], ["H4"], ["H5"]], 2, { card: "H4" }).st, [[], [], [], ["H5"]], 3, { card: "H5" }, () => spDeal(rand));
check("ten bags cost 100 and the count starts over", bag.st.score[0] === 20 + 7 - 100 && bag.st.bags[0] === 5 && bag.st.lastHand.res[0].bagPenalty === true, bag.st);
const end = { ...spInit(["a", "b", "c", "d"], 300), phase: "play", seat: 0, bids: [1, 1, 1, 1], tricks: [1, 1, 1, 0], score: [280, 100], counts: [1, 1, 1, 1] };
let e = spApply(end, [["H14"], ["H3"], ["H4"], ["H5"]], 0, { card: "H14" }); for(const k of [1, 2, 3]) e = spApply(e.st, e.hands, k, { card: e.hands[k][0] });
check("reaching the target ends the game for the higher team", e.over && e.over.winner === 0 && e.over.why === `${e.st.score[0]} to ${e.st.score[1]}`, e);
check("a made-up move is refused", throws(() => spApply(spInit(["a", "b", "c", "d"], 300), deal(), 0, { win: true })));
check("cards sort spades first, highest first", JSON.stringify(spSort(["H3", "S5", "BJ", "D2", "C9"])) === '["BJ","D2","S5","H3","C9"]');

// the app carries the identical rules
// the computer player: legal cards only, from its own hand, and every game it plays finishes
{ let s2 = 99; const r2 = () => (s2 = (s2 * 16807) % 2147483647) / 2147483647; let bad = 0, done = 0, made = 0, hands = 0;
  for(let g = 0; g < 150; g++){ let st = spInit(["a", "b", "c", "d"], 300), hs = spDeal(r2), over = null, n = 0;
    while(!over && n++ < 5000){ const k = st.seat, mv = st.phase === "bid" ? { bid: spBotBid(hs[k]) } : { card: spBotPlay(st, hs[k], k) };
      if(mv.card !== undefined && !spLegal(st, hs[k]).includes(mv.card)) bad++;
      const r = spApply(st, hs, k, mv, () => spDeal(r2)); if(r.st.lastHand && r.st.lastHand !== st.lastHand){ for(const x of r.st.lastHand.res){ hands++; if(x.won >= x.bid) made++; } } st = r.st; hs = r.hands; over = r.over; }
    if(over) done++; }
  check("the computer plays only legal cards (150 whole games)", bad === 0, bad);
  check("every computer game reaches a winner", done === 150, done);
  check("the computer bids sensibly: it makes most of its team bids", made / hands > 0.7, made / hands); }
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const m = html.match(/\/\* SPADES RULES START \*\/\n([\s\S]*?)\n\/\* SPADES RULES END \*\//);
const src = readFileSync(new URL("../supabase/functions/games/spades.js", import.meta.url), "utf8").replace(/^export /gm, "").trim();
check("the app's copy of the Spades rules matches the server's", !!m && m[1].trim() === src);
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
