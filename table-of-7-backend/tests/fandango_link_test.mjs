// Table of 8: the most specific real Fandango link for a movie night, proven by hand-built showtimes
// (node table-of-7-backend/tests/fandango_link_test.mjs). Pass saved Fandango showtime pages to test real data too.
import { readFileSync, existsSync } from "node:fs";
import { fdBest, fdZip } from "../supabase/functions/movies/fandango.js";
let fails = 0;
const check = (name, ok, detail = "") => { if(!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail)}`)); };
const jump = (t) => `https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2026-10-19%2B${t}&mid=1&tid=AAYOR&showtimehashcode=v2-x`;
const S = (t, extra = {}) => ({ ticketingDate: `2026-10-19+${t}`, screenReaderTime: t, expired: false, isSoldOut: false, ticketingJumpPageURL: jump(t), ...extra });
const pages = [{ theaters: [
  { id: "AAYOR", name: "Malco Powerhouse Cinema", address1: "540 South Front Street", zip: "38103", isTicketing: true, theaterPageUrl: "/malco-powerhouse-cinema-aayor/theater-page",
    movies: [{ id: 1, title: "Street Fighter (2026)", mopURI: "/street-fighter-2026-1/movie-overview", variants: [{ amenityGroups: [{ showtimes: [S("16:30"), S("19:20", { isSoldOut: true }), S("21:00", { ticketingJumpPageURL: "https://evil.example/x" })] }] }] }] },
  { id: "AAOST", name: "Malco Studio on the Square", address1: "2105 Court Avenue", zip: "38104", isTicketing: true, theaterPageUrl: "/malco-studio-on-the-square-aaost/theater-page", movies: [] }] }];
const W = (o) => ({ title: "Street Fighter", year: "2026", date: "2026-10-19", time: "16:30", addr: "540 S Front St, Memphis, TN 38103, USA", theaterName: "Powerhouse Cinema Grill & MXT", ...o });
check("the ZIP is read from a Google address", fdZip("540 S Front St, Memphis, TN 38103, USA") === "38103");
let b = fdBest(pages, W({}));
check("the exact showtime at the theater (matched by street, not name) opens Fandango's buy page for it", b.level === "showtime" && b.url === jump("16:30") && b.theater === "Malco Powerhouse Cinema", b);
b = fdBest(pages, W({ time: "19:20" }));
check("a sold-out showtime is never offered; the theater's page for that day is", b.level === "theater" && b.url === "https://www.fandango.com/malco-powerhouse-cinema-aayor/theater-page?format=all&date=2026-10-19", b);
b = fdBest(pages, W({ time: "21:00" }));
check("a buy link that isn't Fandango's own is never passed on", b.level === "theater" && !b.url.includes("evil"), b);
b = fdBest(pages, W({ addr: "2105 Court Ave, Memphis, TN 38104", theaterName: "Studio on the Square" }));
check("a theater not showing it gives that theater's page for the day", b.level === "theater" && b.url.includes("aaost"), b);
b = fdBest(pages, W({ addr: "1 Nowhere Rd, Memphis, TN 38999" }));
check("a theater Fandango doesn't list gives the movie's own Fandango page", b.level === "movie" && b.url === "https://www.fandango.com/street-fighter-2026-1/movie-overview", b);
b = fdBest(pages, W({ year: "1994", addr: "1 Nowhere Rd 38999" }));
check("a different year's film of the same name is not taken for it", b.level === "search", b);
b = fdBest([], W({}));
check("with no showtimes at all, the link is a Fandango search for the title", b.level === "search" && b.url.includes("search?q=Street%20Fighter"), b);
const real = process.argv.slice(2).filter(existsSync);
if(real.length){
  const p = real.map(f => JSON.parse(readFileSync(f, "utf8")));
  const r = fdBest(p, W({}));
  check(`real Fandango data gives a buy link (${r.level})`, ["showtime", "theater"].includes(r.level) && /^https:\/\/(tickets|www)\.fandango\.com\//.test(r.url), r);
}
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
