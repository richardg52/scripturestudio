// Table of 8: refresh the Tigers' per-game buy links (run on a Mac, not in the suite).
// The University's box office keeps automated programs out, so this never fetches it. Instead:
//   1. Open https://gotigersgo.evenue.net/events/BKSGT in a real browser (a session can do it in Chrome) and save the
//      page (File → Save Page As…, "Web Page, HTML Only").
//   2. node table-of-7-backend/tests/refresh_tigers_tickets.mjs <the saved page>
// It reads the Tigers' own calendar (an open feed), pairs each home game to the box office's own entry for it (same
// Memphis date, same opponent: tigers.js), and prints SQL that replaces the rows in tigers_ticket_links. Apply that SQL
// to the database (a session does it through the Supabase connector). Nothing is guessed: a game the box office
// doesn't list is left out, and the app opens the box office's Tigers list for it instead.
import { readFileSync } from "node:fs";
import { tigersGames, tigersBoxOffice, tigersTickets, tgCentral, TIGERS_ICS } from "../supabase/functions/outings/tigers.js";
const saved = process.argv[2];
if(!saved){ console.error("Give the saved box office page: node refresh_tigers_tickets.mjs <file>"); process.exit(1); }
const box = tigersBoxOffice(readFileSync(saved, "utf8"));
if(!box.length){ console.error("That file has no box office game list in it. Save the BKSGT page again."); process.exit(1); }
const r = await fetch(TIGERS_ICS); if(!r.ok){ console.error("The Tigers' calendar answered", r.status); process.exit(1); }
const games = tigersTickets(tigersGames(await r.text(), tgCentral(Date.now()).date), box).filter(g => g.home);
const linked = games.filter(g => g.tickets);
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
console.log("delete from public.tigers_ticket_links;");
if(linked.length) console.log("insert into public.tigers_ticket_links (uid, game_date, opponent, url) values\n  " + linked.map(g => `(${q(g.uid)}, ${q(g.date)}, ${q(g.opponent)}, ${q(g.tickets)})`).join(",\n  ") + ";");
console.error(`${linked.length} of ${games.length} home games have their own box office page.` + (games.length > linked.length ? ` Not listed: ${games.filter(g => !g.tickets).map(g => g.date + " " + g.opponent).join(", ")}.` : ""));
