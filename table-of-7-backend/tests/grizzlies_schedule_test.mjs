// Table of 8: reading the Grizzlies' own schedule and keeping only real Ticketmaster links, proven by hand-built games
// (node table-of-7-backend/tests/grizzlies_schedule_test.mjs). Pass a saved copy of the team's schedule to test it too.
import { readFileSync, existsSync } from "node:fs";
import { grizzliesGames, grizSeason } from "../supabase/functions/outings/grizzlies.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const G = (gid, utc, home, arena, tickets, extra = {}) => ({ type: "game", gid, utcTime: utc, arenaName: arena, home: { ta: home }, visitor: { tc: "Utah", tn: "Jazz" }, tickets: { singleTickets: tickets }, ...extra });
const doc = { results: { schedule: [
  G("0022600089", "2026-10-22T00:00:00Z", "MEM", "FedExForum", "https://www.ticketmaster.com/event/1B00650BF16BF1BF?brand=grizzlies"),
  G("0022600100", "2026-11-03T01:00:00Z", "MEM", "FedExForum", "https://evil.example/event/1"),
  G("0022600200", "2026-11-05T00:30:00Z", "LAL", "Crypto.com Arena", "https://www.ticketmaster.com/event/AAA"),
  G("1622600005", "2026-07-07T23:00:00Z", "MEM", "Jon M. Huntsman Center", ""),
  G("0012600001", "2026-10-10T23:00:00Z", "MEM", "FedExForum", "", { gameLabel: "Preseason" }),
  { type: "event", title: "not a game" }] } };
const g = grizzliesGames(doc, "2026-01-01");
check("only home games at FedExForum are kept (no away games, no summer league)", g.length === 3 && g.every(x => x.home), g.map(x => x.uid));
check("a 00:00 UTC tip-off is 7:00 PM the evening before in Memphis", g.find(x => x.uid === "0022600089").date === "2026-10-21" && g.find(x => x.uid === "0022600089").time === "19:00", g[1]);
check("the opponent is the visiting team's city and name", g[0].opponent === "Utah Jazz");
check("a real Ticketmaster event page is kept", g.find(x => x.uid === "0022600089").tickets.startsWith("https://www.ticketmaster.com/event/1B00650BF16BF1BF"));
check("anything that isn't a Ticketmaster event page is dropped, never passed on", g.find(x => x.uid === "0022600100").tickets === null);
check("a preseason game is marked", g.find(x => x.uid === "0012600001").preseason === true);
check("games before the given day are left out", grizzliesGames(doc, "2026-10-25").length === 1);
check("October 2026 is the 2026-27 season; March 2027 is still 2026-27", grizSeason(Date.UTC(2026, 9, 20)) === "2026-27" && grizSeason(Date.UTC(2027, 2, 1)) === "2026-27");
check("a broken document reads as no games", grizzliesGames({}, "2026-01-01").length === 0 && grizzliesGames(null, "2026-01-01").length === 0);
const real = process.argv[2];
if(real && existsSync(real)){
  const r = grizzliesGames(JSON.parse(readFileSync(real, "utf8")), "2026-08-01");
  check(`the real schedule reads (${r.length} home games, ${r.filter(x => x.tickets).length} with Ticketmaster pages)`, r.length >= 35 && r.filter(x => x.tickets).length >= 35, r.slice(0, 2));
  check("no two real games share a ticket page", new Set(r.filter(x => x.tickets).map(x => x.tickets.split("?")[0])).size === r.filter(x => x.tickets).length);
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
