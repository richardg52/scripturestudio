// Table of 7: reading the Tigers' official basketball calendar, proven on a real copy of the feed and by hand-built
// lines (node table-of-7-backend/tests/tigers_schedule_test.mjs). Pass a saved feed as the first argument to test it too.
import { readFileSync, existsSync } from "node:fs";
import { tigersGames, tgCentral } from "../supabase/functions/outings/tigers.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const ics = ["BEGIN:VCALENDAR",
  "BEGIN:VEVENT", "UID:a1", "DTSTART:20270123T200000Z", "SUMMARY:University of Memphis Men's Basketball vs North Texas", "LOCATION:Memphis\\, Tenn., FedExForum", "END:VEVENT",
  "BEGIN:VEVENT", "UID:a2", "DTSTART:20270117", "SUMMARY:University of Memphis Men's Basketball at UAB", "LOCATION:Birmingham\\, Ala.", "END:VEVENT",
  "BEGIN:VEVENT", "UID:a3", "DTSTART:20261110T010000Z", "SUMMARY:University of Memphis Men's Basketball vs Ole Miss", "LOCATION:Memphis\\, Tenn., ", " FedExForum", "END:VEVENT",
  "END:VCALENDAR"].join("\r\n");
const g = tigersGames(ics, "2026-01-01");
check("three games are read, soonest first", g.length === 3 && g[0].uid === "a3" && g[2].uid === "a1", g);
check("a 20:00 UTC tip-off in January is 2:00 PM in Memphis", g[2].date === "2027-01-23" && g[2].time === "14:00", g[2]);
check("a 01:00 UTC tip-off is the evening before in Memphis (7:00 PM, November 9)", g[0].date === "2026-11-09" && g[0].time === "19:00", g[0]);
check("a game without a set time has its date and no time", g[1].date === "2027-01-17" && g[1].time === null, g[1]);
check("the opponent is read", g[2].opponent === "North Texas" && g[1].opponent === "UAB", g);
check("a game at FedExForum is a home game; an away game is not", g[2].home === true && g[1].home === false, g);
check("a folded line in the feed is joined back together", /FedExForum/.test(g[0].location), g[0]);
check("the commas in a place are real commas", g[1].location === "Birmingham, Ala.", g[1].location);
check("games before the given day are left out", tigersGames(ics, "2027-01-20").length === 1);
check("summer time is counted too: 23:00 UTC in June is 6:00 PM in Memphis", tgCentral(Date.UTC(2027, 5, 1, 23, 0)).time === "18:00");
const real = process.argv[2];
if(real && existsSync(real)){
  const r = tigersGames(readFileSync(real, "utf8"), "2026-01-01");
  check(`the real feed reads (${r.length} games)`, r.length >= 20 && r.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.date) && x.opponent), r.slice(0, 3));
  check("the real feed has home games at FedExForum", r.filter(x => x.home).length >= 10 && r.filter(x => x.home).every(x => /FedExForum|Memphis/i.test(x.location)), r.filter(x => x.home).length);
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
