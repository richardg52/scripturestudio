// Table of 7 Bid Whist, his house rules (jokers in, first to 7, no trump double, a Boston wins), proven.
import { readFileSync } from "node:fs";
import { bwDeck, bwInit, bwApply, bwLegal, bwBot, bwCanBid } from "../supabase/functions/games/bidwhist.js";
let fails = 0; const check = (n, ok, d = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + n + (ok ? "" : "  -> " + JSON.stringify(d))); };
const throws = f => { try { f(); return false; } catch { return true; } };
let seed = 6; const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
check("54 cards with both jokers", bwDeck().length === 54 && bwDeck().includes("BJ") && bwDeck().includes("LJ"));
let { st, sec } = bwInit(["a", "b", "c", "d"], rand);
check("12 cards each and 6 in the kitty, the whole deck", sec.hands.every(h => h.length === 12) && sec.kitty.length === 6 && new Set([...sec.hands.flat(), ...sec.kitty]).size === 54);
check("bidding starts left of the dealer; nothing hidden is public", st.phase === "bid" && st.seat === 0 && !JSON.stringify(st).match(/BJ|LJ|"[SHDC]\d+"/));
check("a bid is 4 to 7, uptown, downtown or no trump", bwCanBid(st, { n: 4, mode: "up" }) && !bwCanBid(st, { n: 3, mode: "up" }) && !bwCanBid(st, { n: 8, mode: "nt" }));
let r = bwApply(st, sec, 0, { bid: { n: 4, mode: "down" } });
check("a bid must beat the one before: 4 downtown is beaten by 4 no trump, not by 4 uptown", bwCanBid(r.st, { n: 4, mode: "nt" }) && !bwCanBid(r.st, { n: 4, mode: "up" }) && bwCanBid(r.st, { n: 5, mode: "up" }));
check("a bid out of turn is refused", throws(() => bwApply(r.st, r.sec, 2, { bid: null })));
r = bwApply(r.st, r.sec, 1, { bid: null }); r = bwApply(r.st, r.sec, 2, { bid: { n: 5, mode: "up" } }); r = bwApply(r.st, r.sec, 3, { bid: null });
check("after the dealer, the high bidder takes the kitty (18 cards)", r.st.phase === "kitty" && r.st.seat === 2 && r.sec.hands[2].length === 18 && r.st.high.n === 5);
const hand = r.sec.hands[2];
check("the bidder must put back exactly 6 of their own cards and name trump", throws(() => bwApply(r.st, r.sec, 2, { discard: hand.slice(0, 5), trump: "S" })) && throws(() => bwApply(r.st, r.sec, 2, { discard: hand.slice(0, 6) })));
r = bwApply(r.st, r.sec, 2, { discard: hand.slice(12, 18), trump: "H" });
check("the kitty counts as the bidding team's first book, and the bidder leads", r.st.phase === "play" && r.st.books[0] === 1 && r.st.seat === 2 && r.st.trump === "H");
let s2 = bwInit(["a", "b", "c", "d"], rand); let x = bwApply(s2.st, s2.sec, 0, { bid: null }); x = bwApply(x.st, x.sec, 1, { bid: null }); x = bwApply(x.st, x.sec, 2, { bid: null });
check("when everyone passes, the dealer must bid", throws(() => bwApply(x.st, x.sec, 3, { bid: null })) && bwApply(x.st, x.sec, 3, { bid: { n: 4, mode: "up" } }).st.phase === "kitty");
const P = (extra) => ({ phase: "play", trick: [], trump: "H", dir: "up", ...extra });
check("follow suit if you can", JSON.stringify(bwLegal(P({ trick: [{ seat: 0, card: "S9" }] }), ["S3", "H14", "C2"])) === '["S3"]');
check("in a trump game the jokers are trumps: they follow a trump lead", JSON.stringify(bwLegal(P({ trick: [{ seat: 0, card: "H9" }] }), ["BJ", "S3"])) === '["BJ"]');
check("in no trump the jokers belong to no suit", bwLegal(P({ trump: null, trick: [{ seat: 0, card: "S9" }] }), ["BJ", "C3"]).length === 2);
const T = (trick, extra) => { const s = { seats: ["a","b","c","d"], score: [0,0], hand: 1, lastHand: null, dealer: 3, phase: "play", seat: 0, bids: [], high: { n: 4, mode: "up" }, bidder: 0, trump: "H", dir: "up", nt: false, trick: [], last: null, books: [1, 0], counts: [2, 2, 2, 2], ...extra };
  let h = [[trick[0]], [trick[1]], [trick[2]], [trick[3]]], o = { st: s, sec: { hands: h, kitty: [] } }; for(let k = 0; k < 4; k++){ o = bwApply(o.st, o.sec, k, { card: trick[k] }); } return o; };
check("the Big Joker beats everything in a trump game", T(["S14", "BJ", "H14", "S2"]).st.last.winner === 1);
check("the Little Joker beats the ace of trumps", T(["H14", "LJ", "S3", "S2"]).st.last.winner === 1);
check("any trump beats the ace led", T(["S14", "S3", "H2", "S5"]).st.last.winner === 2);
check("downtown, low cards win: the ace, then the 2, beats the king", T(["S13", "S2", "S5", "C9"], { trump: null, dir: "down", nt: true }).st.last.winner === 1);
check("in no trump a joker never wins a book", T(["S5", "BJ", "S3", "LJ"], { trump: null, nt: true }).st.last.winner === 0);
// scoring and the end of the game
const E = (books, bid, extra = {}) => { const o = T(["S14", "S3", "S2", "S5"], { books, counts: [1, 1, 1, 1], high: bid, nt: bid.mode === "nt", trump: bid.mode === "nt" ? null : "H", ...extra }); return o; };
let e = E([9, 3], { n: 4, mode: "up" }); check("made: the books over six (9 + this book = 10, so 4)", e.st.lastHand.made && e.st.score[0] === 4, e.st.lastHand);
e = E([9, 3], { n: 4, mode: "nt" }); check("no trump counts double (10 books: 4 × 2 = 8, which also wins the game)", e.st.score[0] === 8 && e.over && e.over.winner === 0, e.st.score);
e = E([7, 5], { n: 4, mode: "up" }); check("set: minus the bid (8 books for a 4 bid needs 10)", !e.st.lastHand.made && e.st.score[0] === -4);
e = E([12, 0], { n: 4, mode: "up" }); check("all 13 books, a Boston, wins the game", e.over && e.over.winner === 0 && e.over.why === "a Boston");
e = E([9, 3], { n: 4, mode: "up" }, { score: [4, 0] }); check("first to 7 wins (4 + 4 = 8)", e.over && e.over.winner === 0);
let ok = true, done = 0; for(let k = 0; k < 120; k++){ let y = bwInit(["a","b","c","d"], rand), over = null, n = 0;
  while(!over && n++ < 20000){ const s = y.st.seat, mv = bwBot(y.st, y.sec.hands[s], s); if(mv.card && !bwLegal(y.st, y.sec.hands[s]).includes(mv.card)){ ok = false; break; } const z = bwApply(y.st, y.sec, s, mv, rand); y = { st: z.st, sec: z.sec }; over = z.over; }
  if(over) done++; }
check("the computer bids, picks up the kitty and plays only legal cards; all 120 computer games finish", ok && done === 120, done);
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const m = html.match(/\/\* BIDWHIST RULES START \*\/\n([\s\S]*?)\n\/\* BIDWHIST RULES END \*\//);
const src = readFileSync(new URL("../supabase/functions/games/bidwhist.js", import.meta.url), "utf8").replace(/^export /gm, "").trim();
check("the app's copy of the Bid Whist rules matches the server's", !!m && m[1].trim() === src);
console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
