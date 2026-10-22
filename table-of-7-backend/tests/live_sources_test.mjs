// Table of 8 Memphis Live: proves functions/live/sources.js against REAL venue responses (trimmed copies saved
// 2026-10-22 in fixtures/live: GPAC's Squarespace event list, the Overton Park Shell's month list, and the Overton Park
// Conservancy's Events Calendar REST, which carries the Memphis Zoo). No network.
//     node table-of-7-backend/tests/live_sources_test.mjs
import fs from "fs";
import { fileURLToPath } from "url";
import { gpacParse, shellParse, overtonParse, tmParse, tmUrl, geohash, ticketIn, calledOff } from "../supabase/functions/live/sources.js";
const here = p => fileURLToPath(new URL(p, import.meta.url));
const J = f => JSON.parse(fs.readFileSync(here("fixtures/live/" + f), "utf8"));
let fails = 0;
const check = (name, ok, detail = "") => { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail).slice(0, 300)}`)); };
const NOW = Date.parse("2026-10-22T20:00:00Z");
const CATS = ["concert", "comedy", "sports", "theater", "family", "outdoor"];
const wellFormed = e => e.id && e.title && !Number.isNaN(Date.parse(e.starts_at)) && CATS.includes(e.category) && typeof e.free === "boolean"
  && [e.ticket_url, e.info_url, e.image_url].every(u => u === "" || /^https:\/\/\S+$/.test(u));

// GPAC
const g = gpacParse(J("gpac.json"), NOW);
check("GPAC: real shows come through, each well formed", g.length >= 4 && g.every(wellFormed), g.find(e => !wellFormed(e)));
const cray = g.find(e => /Robert Cray/.test(e.title));
check("GPAC: The Robert Cray Band, Sat Oct 24 at 8 PM in Memphis time, at the Performance Hall, with its own OvationTix link",
  cray && new Date(cray.starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" }) === "10/24/2026, 8:00:00 PM"
  && /Highland Capital Performance Hall/.test(cray.venue) && /^https:\/\/ci\.ovationtix\.com\//.test(cray.ticket_url) && cray.category === "concert", cray);
check("GPAC: a sponsor's website is never taken as the ticket link", g.every(e => !e.ticket_url || /ovationtix|ticket|etix|eventbrite|axs|tix/i.test(e.ticket_url)), g.map(e => e.ticket_url));
check("GPAC: dance classes, school matinees and artist receptions are left out", !g.some(e => /Adult Dance|School Matinee|Artist Reception/i.test(e.title)));
check("GPAC: The Best of The Second City is filed under Comedy", g.filter(e => /Second City/.test(e.title)).every(e => e.category === "comedy") && g.some(e => /Second City/.test(e.title)), g.map(e => [e.title, e.category]));
check("GPAC: Peanut Butter & Jam shows are filed under Family", g.filter(e => /Peanut Butter/i.test(e.title)).every(e => e.category === "family"));
check("GPAC: a show that has passed is left out", gpacParse(J("gpac.json"), NOW + 400 * 864e5).length === 0);

// Overton Park Shell
const s = shellParse(J("shell.json"), NOW);
check("Shell: real events come through, each well formed", s.length >= 2 && s.every(wellFormed), s);
const sAll = shellParse(J("shell.json"), Date.parse("2026-10-01T05:00:00Z"));
check("Shell: a show the Shell marked CANCELLED is never listed; a RESCHEDULED one still is", sAll.length >= 3 && !sAll.some(e => /cancel/i.test(e.title)) && sAll.some(e => /^RESCHEDULED/.test(e.title)), sAll.map(e => e.title));
check("Shell: “&amp;” in a title reads as “&”", sAll.every(e => !/&amp;/.test(e.title)));
check("Shell: a show at the Shell says so; a Shell on Wheels show names where it really is (MOSH Laser Live is on Central Ave)",
  s.filter(e => /1928 Poplar/.test(e.address)).every(e => e.venue === "Overton Park Shell")
  && s.filter(e => /MOSH Laser/.test(e.title)).every(e => e.venue !== "Overton Park Shell" && /3050 Central/.test(e.address)) && s.some(e => /MOSH Laser/.test(e.title)), s.map(e => [e.title, e.venue, e.address]));
check("Shell: the yoga and wellness classes are not listed as concerts", s.filter(e => /yoga/i.test(e.title)).every(e => e.category === "outdoor") && !s.some(e => /^Baptist Health/i.test(e.title)));
check("Shell: each event links to its own page on the Shell's site", s.every(e => /^https:\/\/overtonparkshell\.org\/eventpage\//.test(e.info_url)), s.map(e => e.info_url));

// Overton Park Conservancy (and the Memphis Zoo)
const o = overtonParse(J("overton.json"), NOW);
check("Overton: real events come through, each well formed", o.length >= 5 && o.every(wellFormed), o.find(e => !wellFormed(e)));
const boo = o.filter(e => e.title === "Zoo Boo");
check("Overton: Zoo Boo is the Memphis Zoo's, a Family event, $20 – $23, with the Zoo's own page as the ticket link, one row per night",
  boo.length >= 2 && boo.every(e => e.venue === "Memphis Zoo" && e.category === "family" && e.price === "$20 – $23" && e.ticket_url === "https://www.memphiszoo.org/zoo-boo")
  && new Set(boo.map(e => e.id)).size === boo.length, boo);
check("Overton: classes and lectures (Education, Learn, Science Café) are left out", !o.some(e => /journaling course/i.test(e.title)));
check("Overton: a 'website' field holding words instead of a link is never shown as a link", o.every(e => e.ticket_url === "" || /^https:\/\//.test(e.ticket_url)));
check("Overton: 'Free' events are marked free", o.filter(e => /^free$/i.test(e.price)).every(e => e.free));

// ticket links
check("ticketIn: takes the first seller link and skips sponsors", ticketIn('<a href="https://www.bank.com/">x</a> <a href="https://ci.ovationtix.com/1/production/2">t</a>') === "https://ci.ovationtix.com/1/production/2");
check("calledOff: CANCELLED / Canceled / POSTPONED titles are caught, ordinary titles are not", calledOff("CANCELLED: Orion Free Concert") && calledOff("Canceled - Jazz") && calledOff("POSTPONED: Gala") && !calledOff("Cancel Culture Comedy Tour") && !calledOff("Zoo Boo"));
check("ticketIn: never an http or javascript link", ticketIn('<a href="http://ci.ovationtix.com/1">t</a><a href="javascript:alert(1)">t</a>') === "");

// Ticketmaster (only once his key is in): the query and the published response shape
const u = new URL(tmUrl("KEY", 0, NOW));
check("Ticketmaster: 40 miles around downtown Memphis (the geohash decodes to 35.1495, -90.049)", geohash(35.1495, -90.049) === "9ypzyyu2d" && u.searchParams.get("geoPoint") === "9ypzyyu2d" && u.searchParams.get("radius") === "40" && u.searchParams.get("unit") === "miles");
check("Ticketmaster: the window starts now and runs 120 days, soonest first", u.searchParams.get("startDateTime") === "2026-10-22T20:00:00Z" && u.searchParams.get("endDateTime") === "2027-02-19T20:00:00Z" && u.searchParams.get("sort") === "date,asc");
// Built from Ticketmaster's published Discovery v2 event shape (NOT a live reply: no key yet). The first keyed refresh
// is checked against this in live_sync before anyone relies on it.
const tm = tmParse({ _embedded: { events: [
  { id: "A1", name: "Comedy Night", url: "https://www.ticketmaster.com/event/A1", dates: { start: { localDate: "2026-11-08", localTime: "19:30:00", dateTime: "2026-11-09T01:30:00Z" }, status: { code: "onsale" } },
    classifications: [{ segment: { name: "Arts & Theatre" }, genre: { name: "Comedy" } }], priceRanges: [{ min: 39.5, max: 89 }],
    images: [{ ratio: "16_9", width: 640, url: "https://s1.ticketm.net/a.jpg" }, { ratio: "3_2", width: 1024, url: "https://s1.ticketm.net/b.jpg" }],
    _embedded: { venues: [{ name: "Landers Center", address: { line1: "4560 Venture Dr" }, city: { name: "Southaven" }, state: { stateCode: "MS" }, postalCode: "38671" }] } },
  { id: "A2", name: "Grizzlies vs Kings", url: "https://www.ticketmaster.com/event/A2", dates: { start: { dateTime: "2026-11-01T00:00:00Z" }, status: { code: "cancelled" } }, classifications: [{ segment: { name: "Sports" } }] },
  { id: "A3", name: "A show", url: "javascript:alert(1)", dates: { start: { localDate: "2026-12-01" } }, classifications: [{ segment: { name: "Music" } }] }] } }, NOW);
check("Ticketmaster: a comedy show at the Landers Center maps to Comedy, 7:30 PM Memphis time, From $40, its own buy link and 16:9 picture",
  tm[0]?.category === "comedy" && new Date(tm[0].starts_at).toLocaleString("en-US", { timeZone: "America/Chicago" }) === "11/8/2026, 7:30:00 PM" && tm[0].price === "From $40"
  && tm[0].ticket_url === "https://www.ticketmaster.com/event/A1" && tm[0].image_url === "https://s1.ticketm.net/a.jpg" && /Southaven, MS/.test(tm[0].address), tm[0]);
check("Ticketmaster: a cancelled event is left out, and a bad link is never kept", tm.length === 2 && !tm.some(e => e.title.startsWith("Grizzlies")) && tm[1].ticket_url === "" && tm[1].all_day && tm[1].category === "concert", tm);

console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
