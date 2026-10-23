// Table of 8 Getaways (his order, 2026-10-23): proves the trip rules (functions/getaways/trip.js, one copy synced into the
// app) and the app's Getaway data. Offline: Ticketmaster's reply is a fixture shaped like the live Atlanta/Nashville reads.
import { readFileSync } from "node:fs";
import { tmTrip, tmTripUrl, tripMode, tripEstimate, tripAddOn, GW_GEO } from "../supabase/functions/getaways/trip.js";
let bad = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) bad++; };
const fx = JSON.parse(readFileSync(new URL("./fixtures/getaways/atlanta_tm.json", import.meta.url)));
const ev = tmTrip(fx, "2026-11-06", "2026-11-08");
ok(ev.some(e => e.title === "Atlanta Hawks vs. Washington Wizards" && e.league === "NBA" && e.time === "19:00" && e.from === 24 && e.venue === "State Farm Arena"), "an NBA game keeps its league, time, lowest price and arena");
ok(ev.filter(e => /Hawks vs\. Washington/.test(e.title)).length === 1, "the same game listed twice is one card");
ok(ev.some(e => /Falcons/.test(e.title) && e.league === "NFL"), "an NFL game is marked NFL (Ticketmaster's sub-genre)");
ok(!ev.some(e => /Pass$|Dinner Reservation/.test(e.title)), "season passes and dinner-reservation add-ons are not shows");
ok(!ev.some(e => e.day < "2026-11-06" || e.day > "2026-11-08"), "nothing dated before or after the trip (a pass from September, a show after) is listed");
ok(!ev.some(e => /Cancelled|Spectacular/.test(e.title)), "cancelled shows are left out (by name or by status)");
ok(ev.find(e => e.title === "Comedy Night")?.url === "" && ev.find(e => e.title === "Comedy Night")?.cat === "comedy", "a link that isn't https is never kept; comedy is comedy");
ok(!tripAddOn("Atlanta Hawks vs. Brooklyn Nets") && !tripAddOn("Grand Ole Opry: OPRY 100") && tripAddOn("Season Pass"), "real shows are not mistaken for add-ons");
const u = tmTripUrl("KEY", "Nashville", "2026-11-06", "2026-11-09");
ok(u.includes("latlong=36.1627,-86.7816") && u.includes("endDateTime=2026-11-10T11:59:59Z"), "the Ticketmaster search covers the city and the trip's last evening in Central time");
ok(tripMode(2, 0).mode === "couple" && tripMode(2, 0).label === "A couples' getaway", "two grown-ups, no kids: a couples' getaway");
ok(tripMode(2, 3).mode === "family" && tripMode(2, 3).people === 5 && tripMode(2, 3).label === "A family trip for 5", "add kids: a family trip, and it says how many");
ok(tripMode(4, 0).mode === "group" && tripMode(1, 0).mode === "solo", "more grown-ups is a group; one is a trip for one");
const NASH = { airport: "BNA", nonstop_from_MEM: true, airfare_rt_low: 120, airfare_rt_high: 260, drive_miles: 212, drive_hours: 3.25, hotel_mid: [170, 260], hotel_upscale: [320, 550], parking: [25, 55] };
const a = tripEstimate({ city: NASH, adults: 2, kids: 0, nights: 2, travel: "drive", tier: "mid" });
const sum = k => a.lines.reduce((s, l) => s + l[k], 0);
ok(a.lines.find(l => l.k === "travel").low === 50 && a.lines.find(l => l.k === "hotel").low === 390 && a.lines.find(l => l.k === "food").low === 360, "the couple's drive to Nashville: gas $50, hotel from $390, food from $360 (worked by hand)");
ok(Math.abs(a.low - sum("low")) <= 30 && a.high >= sum("high"), "the total is the lines added up (plus 10% for the unexpected on the high side)");
const f = tripEstimate({ city: NASH, adults: 2, kids: 4, nights: 3, travel: "drive", tier: "mid" });
ok(f.rooms === 2 && /in 2 cars/.test(f.lines[0].label), "six people: two rooms and two cars");
const fly = tripEstimate({ city: NASH, adults: 2, kids: 0, nights: 2, travel: "fly", tier: "upscale" });
ok(fly.lines[0].low === 240 && fly.lines.some(l => l.k === "ground") && fly.lines.some(l => /Memphis airport/.test(l.label)) && fly.high > a.high, "flying: fares for each person, getting around, airport parking; upscale costs more");
const k0 = tripEstimate({ city: NASH, adults: 2, kids: 0, nights: 2, travel: "drive", tier: "mid" }).lines.find(l => l.k === "food").low;
const k2 = tripEstimate({ city: NASH, adults: 2, kids: 2, nights: 2, travel: "drive", tier: "mid" }).lines.find(l => l.k === "food").low;
ok(k2 > k0 && k2 < k0 * 2, "children eat for about half");
const tasting = tripEstimate({ city: NASH, adults: 2, kids: 0, nights: 2, travel: "drive", tier: "mid", picks: [{ cat: "dinner", cost_pp: 325 }] }).lines.find(l => l.k === "food");
ok(tasting.low === Math.round((325 * 0.9 + 8 * 20) * 2 / 10) * 10 && /1 meal on the plan/.test(tasting.note), "a $325 tasting dinner on the plan is counted at its own price, the other eight meals at a typical price");
const withEv = tripEstimate({ city: NASH, adults: 2, kids: 0, nights: 2, travel: "drive", tier: "mid", picks: [{ cat: "museum", cost_pp: 30 }], events: [{ from: 60 }] });
ok(withEv.lines.find(l => l.k === "fun").low === 180 && withEv.lines.find(l => l.k === "fun").high > 180, "things to do add up from the stops and the tickets chosen, as a range");
// the app
const html = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
const block = html.match(/\/\* TRIP RULES START \*\/\n([\s\S]*?)\n\/\* TRIP RULES END \*\//)?.[1] ?? "";
ok(block === readFileSync(new URL("../supabase/functions/getaways/trip.js", import.meta.url), "utf8").replace(/^export /gm, "").trim(), "the app carries the identical trip rules (between the TRIP RULES markers)");
const GW = JSON.parse(html.match(/const GW_CITIES = (\{[\s\S]*?\});\n/)[1]);
ok(Object.keys(GW_GEO).every(c => GW[c]) && Object.keys(GW).length === 9, "every Getaway city has its data, and only those nine");
const urls = Object.values(GW).flatMap(c => c.places.flatMap(p => [p.web, p.menu].filter(Boolean)));
ok(urls.every(u => /^https:\/\/[^\s"'<>]+$/.test(u)), `every website and menu link is https (${urls.length})`);
const open = Object.entries(GW).filter(([, c]) => !c.checking);
ok(open.every(([, c]) => c.places.every(p => p.ok)), "a city opens only when every one of its places was confirmed on Google");
ok(Object.values(GW).every(c => c.places.filter(p => p.ok).every(p => p.pid || p.n === "Lincoln Park Zoo")), "every confirmed place keeps its Google Place ID for Reviews and Directions");
const SLOTS = { meal: ["breakfast"], brunch: ["brunch", "breakfast"], morning: ["sight", "museum", "outdoors"], lunch: ["lunch"], afternoon: ["shopping", "sight", "museum", "family_fun", "outdoors"], dinner: ["dinner"],
  eveningC: ["music", "comedy", "nightlife", "dessert"], eveningF: ["family_fun", "dessert", "sight"] };
const fits = (p, m) => m === "couple" ? p.f !== "family" : p.f !== "couple" && p.kid !== false;
const gaps = [];
for (const [city, c] of open) for (const m of ["couple", "family"]) for (const [k, cats] of Object.entries(SLOTS)) {
  if ((k === "eveningC" && m !== "couple") || (k === "eveningF" && m !== "family")) continue;
  // breakfast and lunch fall back to any confirmed spot (a couple can eat at a family café); dinner and evenings must fit who's going
  const strict = !["meal", "brunch", "lunch"].includes(k);
  const n = c.places.filter(p => p.ok && cats.includes(p.c) && (!strict || fits(p, m))).length; if (n < 1) gaps.push(`${city}/${m}/${k}`); }
ok(!gaps.length, `every open city has a place for every part of the day, and dinner and evenings fit couples and families${gaps.length ? ": missing " + gaps.join(", ") : ""}`);
ok(open.length >= 5 && open.map(([k]) => k).join() === "Nashville,Atlanta,Chicago,Dallas,Houston", `open now: ${open.map(([k]) => k).join(", ")}`);
console.log(bad ? `${bad} PROOF(S) FAILED` : "ALL PROOFS HOLD"); process.exit(bad ? 1 : 0);
