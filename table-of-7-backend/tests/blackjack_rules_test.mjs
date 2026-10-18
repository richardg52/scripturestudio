// Table of 7 Blackjack rules, proven (node table-of-7-backend/tests/blackjack_rules_test.mjs). Chips are points only.
import { readFileSync } from "node:fs";
import { bjShoe, bjVal, bjTotal, bjInit, bjSecret, bjApply, bjCan, BJ_START } from "../supabase/functions/games/blackjack.js";
let fails = 0;
const check = (n, ok, d = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  -> " + JSON.stringify(d))); };
const throws = f => { try { f(); return false; } catch { return true; } };
let seed = 3; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const shoe = bjShoe(rand);
check("the shoe is 4 full decks (208 cards, every card 4 times)", shoe.length === 208 && new Set(shoe).size === 52);
check("card values: ace 11, face cards 10, numbers their own", bjVal("S14") === 11 && bjVal("H13") === 10 && bjVal("D10") === 10 && bjVal("C7") === 7);
check("an ace counts 1 when 11 would bust", bjTotal(["S14", "H9", "D5"]).t === 15 && bjTotal(["S14", "H6"]).t === 17 && bjTotal(["S14", "H6"]).soft);
check("two aces and a nine make 21", bjTotal(["S14", "H14", "D9"]).t === 21);
// a rigged shoe: the last card is drawn first
const rig = (cards) => ({ shoe: [...Array(80).fill("C2"), ...[...cards].reverse()], hole: null });
let st = bjInit(["a", "b"]);
check("everyone starts with 1,000 points and bets first", st.bank.every(b => b === BJ_START) && st.phase === "bet");
check("a bet must be 10 to 500 and within your points", throws(() => bjApply(st, rig([]), 0, { bet: 5 })) && throws(() => bjApply(st, rig([]), 0, { bet: 501 })) && throws(() => bjApply(st, rig([]), 0, { bet: 12.5 })));
// deal order: a, b, dealer up, a, b, dealer hole
let r = bjApply(st, rig(["H10", "S9", "D6", "C7", "H8", "S10"]), 0, { bet: 100 });
check("one bet waits for the other players", r.st.phase === "bet" && r.st.bank[0] === 900);
check("a player can't bet twice in a round", throws(() => bjApply(r.st, r.sec, 0, { bet: 50 })));
r = bjApply(r.st, r.sec, 1, { bet: 50 });
check("when everyone has bet, the cards are dealt and player 1 plays first", r.st.phase === "play" && r.st.seat === 0 && r.st.hands[0][0].cards.join() === "H10,C7" && r.st.dealer.length === 1);
check("the dealer's face-down card is never in the public state", !JSON.stringify(r.st).includes("S10") && r.sec.hole === "S10");
check("only the player whose turn it is may act", throws(() => bjApply(r.st, r.sec, 1, { act: "hit" })));
check("player 1 may hit, stand or double (no pair, no split)", JSON.stringify(bjCan(r.st, 0)) === '["hit","stand","double"]');
let s2 = bjApply(r.st, r.sec, 0, { act: "stand" });
check("standing passes the turn to player 2", s2.st.seat === 1);
s2 = bjApply(s2.st, s2.sec, 1, { act: "stand" });
check("after the last player the dealer plays: 6 + 10 = 16, draws a 2, stands on 18", s2.st.phase === "over" && bjTotal(s2.st.dealer).t === 18, s2.st.dealer);
check("17 loses to 18; 17 vs 18 for player 2 also loses", s2.st.results[0][0].res === "lose" && s2.st.results[1][0].res === "lose" && s2.st.bank[0] === 900 && s2.st.bank[1] === 950, s2.st.results);
// blackjack pays 3 to 2
st = bjInit(["a"]); r = bjApply(st, rig(["S14", "D9", "H13", "C7"]), 0, { bet: 100 });
check("a blackjack pays 3 to 2 at once (1,000 - 100 + 250)", r.st.phase === "over" && r.st.results[0][0].res === "blackjack" && r.st.bank[0] === 1150, r.st);
// the dealer peeks
st = bjInit(["a"]); r = bjApply(st, rig(["H9", "S14", "D8", "C13"]), 0, { bet: 100 });
check("the dealer's blackjack ends the round at once and takes the bet", r.st.phase === "over" && r.st.results[0][0].res === "lose" && r.st.bank[0] === 900, r.st);
// bust
st = bjInit(["a"]); r = bjApply(st, rig(["H10", "S7", "D6", "C10", "H9"]), 0, { bet: 100 }); r = bjApply(r.st, r.sec, 0, { act: "hit" });
check("going over 21 is a bust and loses", r.st.phase === "over" && r.st.results[0][0].res === "bust" && r.st.bank[0] === 900, r.st);
// double
st = bjInit(["a"]); r = bjApply(st, rig(["H5", "S9", "D6", "C10", "H10", "S2"]), 0, { bet: 100 }); r = bjApply(r.st, r.sec, 0, { act: "double" });
check("doubling doubles the bet, gives exactly one card and wins 21 vs dealer", r.st.phase === "over" && r.st.hands[0][0].bet === 200 && r.st.hands[0][0].cards.length === 3 && r.st.results[0][0].res === "win" && r.st.bank[0] === 1200, r.st);
// split
st = bjInit(["a"]); r = bjApply(st, rig(["H8", "S10", "D8", "C7", "H3", "S2", "D10"]), 0, { bet: 100 });
check("a pair may be split", bjCan(r.st, 0).includes("split"));
r = bjApply(r.st, r.sec, 0, { act: "split" });
check("a split makes two hands, each with a new card, and costs a second bet", r.st.hands[0].length === 2 && r.st.hands[0].every(h => h.cards.length === 2) && r.st.bank[0] === 800, r.st.hands);
check("a split hand can't be split again", !bjCan(r.st, 0).includes("split"));
r = bjApply(r.st, r.sec, 0, { act: "stand" }); r = bjApply(r.st, r.sec, 0, { act: "stand" });
check("both split hands are settled against the dealer", r.st.phase === "over" && r.st.results[0].length === 2, r.st);
// next round
const nx = bjApply(r.st, r.sec, 0, { next: true });
check("after a round anyone starts the next; bets clear", nx.st.phase === "bet" && nx.st.round === 2 && nx.st.bets.every(b => b === null));
// many random rounds keep the points honest
let tot = 0, ok = true; for(let g = 0; g < 300; g++){ let s = bjInit(["a", "b"]), sec = bjSecret(rand);
  for(let k = 0; k < 6; k++){ for(const p of [0, 1]) if(s.bank[p] >= 10){ const x = bjApply(s, sec, p, { bet: 10 }); s = x.st; sec = x.sec; }
    let guard = 0; while(s.phase === "play" && guard++ < 50){ const can = bjCan(s, s.seat), x = bjApply(s, sec, s.seat, { act: bjTotal(s.hands[s.seat][s.h].cards).t < 15 && can.includes("hit") ? "hit" : "stand" }, rand); s = x.st; sec = x.sec; }
    if(s.phase !== "over"){ ok = false; break; } const x = bjApply(s, sec, 0, { next: true }); s = x.st; sec = x.sec; tot++; } }
check("1,800 random rounds all finish, every hand settled", ok && tot === 1800, tot);
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const m = html.match(/\/\* BLACKJACK RULES START \*\/\n([\s\S]*?)\n\/\* BLACKJACK RULES END \*\//);
const src = readFileSync(new URL("../supabase/functions/games/blackjack.js", import.meta.url), "utf8").replace(/^export /gm, "").trim();
check("the app's copy of the Blackjack rules matches the server's", !!m && m[1].trim() === src);
console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
