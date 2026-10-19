// Table of 8: the most specific REAL place to buy a movie night's tickets (his order, 2026-10-19: "real purchase
// links for the Movies"). Server only. Read from Fandango's own showtimes for the theater's ZIP and the night's date
// (the same data fandango.com's showtimes page loads), most specific first:
//   1. that showtime at that theater   → Fandango's own buy page for it (a fresh link: each showtime carries its code)
//   2. that theater on that date        → the theater's Fandango page for that day
//   3. the movie                        → its Fandango page
//   4. nothing matched                  → a Fandango search for the title (what the app did before)
// Nothing is built by guessing: every link (except the last) is one Fandango itself lists.
export const fdShowtimesUrl = (zip, date, page) => `https://www.fandango.com/napi/theaterswithshowtimes?zipCode=${zip}&date=${date}&page=${page}&limit=10&isdesktop=true&filter=open-theaters&filterEnabled=true`;
export const fdReferer = zip => `https://www.fandango.com/${zip}_movietimes`;
export const fdSearch = title => `https://www.fandango.com/search?q=${encodeURIComponent(title)}&mode=all`;
const norm = s => String(s || "").toLowerCase().replace(/\(\d{4}\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const street = s => { const m = String(s || "").toLowerCase().match(/^\s*(\d+)\s+(?:[nsew]\.?\s+|north\s+|south\s+|east\s+|west\s+)?([a-z0-9]+)/); return m ? m[1] + " " + m[2] : ""; };
export const fdZip = addr => (String(addr || "").match(/\b(\d{5})(?:-\d{4})?\b(?![\s\S]*\b\d{5}\b)/) || [])[1] || "";
// pages: the Fandango showtime pages (JSON) for the ZIP and date. want: {title, year, date: "YYYY-MM-DD", time: "HH:MM", addr, theaterName}
export function fdBest(pages, want){
  const t = norm(want.title), st = street(want.addr), zip = fdZip(want.addr);
  const theaters = pages.flatMap(p => Array.isArray(p?.theaters) ? p.theaters : []);
  const sameMovie = m => norm(m?.title) === t && (!want.year || !/\(\d{4}\)/.test(m?.title || "") || String(m.title).includes(`(${want.year})`));
  const th = theaters.find(x => st && street(x?.address1) === st && (!zip || String(x?.zip || "") === zip))
    || theaters.find(x => zip && String(x?.zip || "") === zip && norm(x?.name).includes(norm(want.theaterName).split(" ").slice(0, 2).join(" ")) && norm(want.theaterName));
  const movieAnywhere = theaters.flatMap(x => x?.movies || []).find(sameMovie);
  const overview = movieAnywhere && /^\/[a-z0-9-]+-\d+\/movie-overview$/.test(movieAnywhere.mopURI || "") ? "https://www.fandango.com" + movieAnywhere.mopURI : null;
  if(th){
    const page = /^\/[a-z0-9-]+\/theater-page$/.test(th.theaterPageUrl || "") ? `https://www.fandango.com${th.theaterPageUrl}?format=all&date=${want.date}` : null;
    const mv = (th.movies || []).find(sameMovie);
    if(mv && th.isTicketing){
      const shows = (mv.variants || []).flatMap(v => (v.amenityGroups || []).flatMap(a => a.showtimes || []))
        .filter(s => !s.expired && !s.isSoldOut && /^https:\/\/tickets\.fandango\.com\/transaction\/ticketing\//.test(s.ticketingJumpPageURL || ""));
      const exact = shows.find(s => s.ticketingDate === `${want.date}+${want.time}`);
      if(exact) return { level: "showtime", url: exact.ticketingJumpPageURL, theater: th.name, at: exact.screenReaderTime || want.time };
      if(page) return { level: "theater", url: page, theater: th.name, times: shows.map(s => s.screenReaderTime).filter(Boolean).slice(0, 12) };
    }
    if(page) return { level: "theater", url: page, theater: th.name, times: [] };
  }
  if(overview) return { level: "movie", url: overview };
  return { level: "search", url: fdSearch(want.title) };
}
