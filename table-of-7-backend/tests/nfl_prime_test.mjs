// Table of 8 Big Game Night: proves functions/watch/nfl.js against a REAL ESPN scoreboard reply (week 9 of 2026, trimmed,
// saved 2026-10-22 in fixtures/nfl). Only Thursday, Sunday-evening and Monday games, in Memphis time, with logos. No network.
//     node table-of-7-backend/tests/nfl_prime_test.mjs
import fs from "fs";
import { fileURLToPath } from "url";
import { primeGames, primeSlot, espnWeek } from "../supabase/functions/watch/nfl.js";
const j = JSON.parse(fs.readFileSync(fileURLToPath(new URL("fixtures/nfl/week9.json", import.meta.url)), "utf8"));
let fails = 0;
const check = (name, ok, detail = "") => { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail).slice(0, 300)}`)); };
const NOW = Date.parse("2026-10-22T20:00:00Z");
const g = primeGames(j, NOW);
const ct = iso => new Date(iso).toLocaleString("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
check("week 9 has exactly its three prime-time games (of 15)", j.events.length === 15 && g.length === 3, g.map(x => x.slot));
check("Thursday: Jaguars at Ravens, Thu Nov 5, 7:15 PM Memphis time, on Prime Video", g[0]?.slot === "Thursday Night Football" && g[0].away.short === "Jaguars" && g[0].home.short === "Ravens"
  && ct(g[0].kickoff) === "Thu, Nov 5, 7:15 PM" && g[0].networks.includes("Prime Video"), [g[0]?.slot, g[0]?.away, g[0]?.home, ct(g[0]?.kickoff), g[0]?.networks]);
check("Sunday night: Buccaneers at Bears on NBC", g[1]?.slot === "Sunday Night Football" && g[1].away.short === "Buccaneers" && g[1].home.short === "Bears" && g[1].networks.includes("NBC"), g[1]);
check("Monday night: Bills at Vikings on ESPN/ABC", g[2]?.slot === "Monday Night Football" && g[2].away.short === "Bills" && g[2].home.short === "Vikings" && g[2].networks.some(n => /ESPN|ABC/.test(n)), g[2]);
check("every team carries its official logo (https, ESPN's team logo)", g.every(x => [x.home, x.away].every(t => /^https:\/\/a\.espncdn\.com\/i\/teamlogos\/nfl\//.test(t.logo))), g.map(x => [x.home.logo, x.away.logo]));
check("the 1 PM and 4 PM Sunday games are not prime time", primeSlot(Date.parse("2026-11-08T18:00:00Z")) === "" && primeSlot(Date.parse("2026-11-08T21:25:00Z")) === "");
check("a Sunday 7:20 PM game is (Memphis time, either side of the clock change)", primeSlot(Date.parse("2026-10-26T00:20:00Z")) === "Sunday Night Football" && primeSlot(Date.parse("2026-11-09T02:20:00Z")) === "Sunday Night Football");
check("games long over are left out", primeGames(j, Date.parse("2026-12-25T00:00:00Z")).length === 0);
check("the week link asks ESPN for that regular-season week", espnWeek(9) === "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=9");
const app = fs.readFileSync(fileURLToPath(new URL("../../table-of-7/index.html", import.meta.url)), "utf8");
const src = fs.readFileSync(fileURLToPath(new URL("../supabase/functions/watch/nfl.js", import.meta.url)), "utf8").replace(/^export /gm, "").trim();
check("the app carries the identical reader (between the NFL RULES markers)", app.includes("/* NFL RULES START */\n" + src + "\n/* NFL RULES END */"));
console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
