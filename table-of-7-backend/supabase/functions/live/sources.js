// Table of 8 Memphis Live (his order, 2026-10-22): turns each venue's own public calendar into showings the app can
// list. One copy, used by functions/live and proved by tests/live_sources_test.mjs against real responses.
// Every showing: {id, source, title, starts_at (UTC ISO), all_day, venue, address, category, price, free, ticket_url,
// info_url, image_url}. category is one of concert · comedy · sports · theater · family · outdoor.
// Nothing is guessed: a ticket link is one the venue (or Ticketmaster) itself lists; with none, the event's own page.
export const UA = "TableOf8/1.0 (family events calendar; +https://table-of-8.netlify.app)";
export const DAYS_AHEAD = 120;
const clip = (x, k) => String(x ?? "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "’").replace(/&#8211;|&ndash;/g, "–")
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, k);
const httpsOnly = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || "")) ? String(u) : "";
const iso = ms => new Date(ms).toISOString();
const isFree = (...xs) => xs.some(x => /\bfree\b/i.test(String(x || "")));
// the first link in an event's text that is a ticket seller (not a sponsor's website)
const TICKET_HOST = /(ovationtix\.com|ticketmaster\.com|etix\.com|eventbrite\.com|axs\.com|seetickets|tix\.com|ticketweb|universe\.com|operamemphis\.org\/tickets|\/tickets?\b)/i;
export function ticketIn(html){
  for (const m of String(html || "").matchAll(/href="([^"]+)"/g)) { const u = httpsOnly(m[1].replace(/&amp;/g, "&")); if (u && TICKET_HOST.test(u)) return u; }
  return "";
}
const COMEDY = /comedy|comedian|improv|second city|stand-?up/i;
const inWindow = (ms, now) => ms > now - 3 * 3600e3 && ms < now + DAYS_AHEAD * 864e5;
// venues mark a called-off show in its title ("CANCELLED: …", "POSTPONED: …"): it is never listed as on
// add-on listings that are not a show of their own (hotel packages, parking passes, suites)
export const addOn = t => /hotel package|ticket \+ hotel|\bparking\b|suite rental|premium seating|vip package/i.test(String(t || ""));
export const calledOff = t => /^\s*(cancel+ed|postponed|called off)\b/i.test(String(t || "").replace(/&amp;/g, "&"));

// GPAC (Germantown Performing Arts Center): Squarespace event list, ?format=json → upcoming[]
const GPAC_SKIP = new Set(["Adult Dance Class", "School Matinee", "Visual Artist Reception"]);
export function gpacParse(j, now = Date.now()){
  return (j?.upcoming ?? []).filter(e => e?.title && !calledOff(e.title) && Number(e.startDate) && !(e.categories ?? []).some(c => GPAC_SKIP.has(c)) && inWindow(Number(e.startDate), now)).map(e => {
    const cats = e.categories ?? [], loc = e.location ?? {};
    const category = cats.includes("Peanut Butter & Jam") || cats.includes("Youth Symphony") ? "family" : COMEDY.test(e.title) ? "comedy"
      : cats.some(c => /jazz|concert|symphony/i.test(c)) ? "concert" : cats.includes("Center Stage Series") ? "theater" : /symphony|orchestra|band|jazz|concert|quartet|choir|sings?\b/i.test(e.title) ? "concert" : "theater";
    const where = clip(String(loc.addressTitle || "").replace(/^Venue:\s*/i, ""), 80);
    return { id: "gpac:" + clip(e.id || e.fullUrl, 80), source: "gpac", title: clip(e.title, 120), starts_at: iso(Number(e.startDate)), all_day: false,
      venue: where ? `GPAC · ${where}` : "GPAC", address: clip([loc.addressLine1, loc.addressLine2].filter(Boolean).join(", "), 120) || "1801 Exeter Rd, Germantown, TN 38138",
      category, price: "", free: isFree(e.title, e.excerpt), ticket_url: ticketIn(e.body), info_url: httpsOnly("https://www.gpacweb.com" + (e.fullUrl || "")),
      image_url: httpsOnly(e.assetUrl) };
  });
}

// Overton Park Shell (the old Levitt Shell): Squarespace GetItemsByMonth → [] with structuredContent.startDate
export const shellUrl = (month, year) => `https://overtonparkshell.org/api/open/GetItemsByMonth?month=${String(month).padStart(2, "0")}-${year}&collectionId=60aff9d6f3becd1070913d6f`;
export function shellParse(list, now = Date.now()){
  return (Array.isArray(list) ? list : []).filter(e => e?.title && !calledOff(e.title) && Number(e?.structuredContent?.startDate) && !/^baptist health/i.test(e.title) && inWindow(Number(e.structuredContent.startDate), now)).map(e => {
    const loc = e.location ?? {}, t = clip(e.title, 120), addr = clip([loc.addressLine1, loc.addressLine2].filter(Boolean).join(", "), 120);
    // "Shell on Wheels" shows go out into the city: name the place they are at, never the Shell itself
    const atShell = !addr || /1928 Poplar/i.test(addr);
    return { id: "shell:" + clip(e.id || e.fullUrl, 80), source: "shell", title: t, starts_at: iso(Number(e.structuredContent.startDate)), all_day: false,
      venue: atShell ? "Overton Park Shell" : clip(loc.addressTitle, 80) || "Shell on Wheels (away from the Shell)", address: addr || "1928 Poplar Ave, Memphis, TN 38104",
      category: /movie|film|laser|kids|family|children/i.test(t) ? "family" : COMEDY.test(t) ? "comedy" : /yoga|walk|\brun\b|market|festival|fair\b/i.test(t) ? "outdoor" : "concert",
      price: "", free: isFree(e.title, e.excerpt), ticket_url: ticketIn(e.excerpt), info_url: httpsOnly("https://overtonparkshell.org" + (e.fullUrl || "")), image_url: httpsOnly(e.assetUrl) };
  });
}

// Overton Park Conservancy: The Events Calendar REST (it carries the Memphis Zoo's and the Metal Museum's events too)
export const overtonUrl = page => `https://overtonpark.org/wp-json/tribe/events/v1/events?per_page=50&page=${page}`;
const OVERTON_SKIP = new Set(["Education", "Learn", "Health and Wellness", "Science Café"]);
export function overtonParse(j, now = Date.now()){
  return (j?.events ?? []).filter(e => e?.title && !calledOff(e.title) && e.utc_start_date && !(e.categories ?? []).some(c => OVERTON_SKIP.has(c?.name))).map(e => {
    const ms = Date.parse(String(e.utc_start_date).replace(" ", "T") + "Z"); if (!inWindow(ms, now)) return null;
    const v = e.venue && typeof e.venue === "object" && !Array.isArray(e.venue) ? e.venue : {};
    const venue = clip(v.venue, 80) || "Overton Park";
    const cats = (e.categories ?? []).map(c => c?.name);
    return { id: "overton:" + clip(e.id, 40) + ":" + String(e.utc_start_date).slice(0, 10), source: "overton", title: clip(e.title, 120), starts_at: iso(ms), all_day: e.all_day === true,
      venue, address: clip([v.address, v.city, v.zip].filter(Boolean).join(", "), 120) || "Overton Park, Memphis, TN 38112",
      category: /zoo/i.test(venue) || cats.includes("Art") ? "family" : "outdoor",
      price: clip(e.cost, 40), free: isFree(e.cost), ticket_url: httpsOnly(e.website), info_url: httpsOnly(e.url), image_url: httpsOnly(e.image?.url) };
  }).filter(Boolean);
}

// Ticketmaster Discovery (only once his own key is in Supabase secrets as TICKETMASTER_API_KEY). Memphis and the
// venues around it (Landers Center, FedExForum, the Orpheum, Minglewood, Graceland, the Cannon Center, Tunica):
// 40 miles around downtown. NOT VERIFIED against a live keyed reply until the key is in (the shape is Ticketmaster's
// published one); the first keyed refresh writes what it got into live_sync for the Host to see.
const B32 = "0123456789bcdefghjkmnpqrstuvwxyz";
export function geohash(lat, lon, len = 9){
  let bit = 0, ch = 0, even = true, out = ""; const la = [-90, 90], lo = [-180, 180];
  while (out.length < len) { const r = even ? lo : la, v = even ? lon : lat, mid = (r[0] + r[1]) / 2;
    if (v > mid) { ch |= 16 >> bit; r[0] = mid; } else r[1] = mid; even = !even;
    if (bit < 4) bit++; else { out += B32[ch]; bit = 0; ch = 0; } }
  return out;
}
export const tmUrl = (key, page, now = Date.now()) => "https://app.ticketmaster.com/discovery/v2/events.json?" + new URLSearchParams({
  apikey: key, geoPoint: geohash(35.1495, -90.049), radius: "40", unit: "miles", size: "100", page: String(page), sort: "date,asc",
  startDateTime: new Date(now).toISOString().slice(0, 19) + "Z", endDateTime: new Date(now + DAYS_AHEAD * 864e5).toISOString().slice(0, 19) + "Z" });
export function tmParse(j, now = Date.now()){
  return (j?._embedded?.events ?? []).map(e => {
    const s = e?.dates?.start ?? {}; const ms = s.dateTime ? Date.parse(s.dateTime) : s.localDate ? Date.parse(s.localDate + "T18:00:00Z") : NaN;
    if (!e?.name || calledOff(e.name) || addOn(e.name) || !Number.isFinite(ms) || !inWindow(ms, now) || e?.dates?.status?.code === "cancelled") return null;
    const v = e._embedded?.venues?.[0] ?? {}, c = e.classifications?.[0] ?? {};
    const seg = c.segment?.name ?? "", gen = c.genre?.name ?? "";
    const category = seg === "Sports" ? "sports" : seg === "Music" ? "concert" : /comedy/i.test(gen) ? "comedy" : seg === "Arts & Theatre" ? "theater" : "family";
    const img = (e.images ?? []).filter(i => i?.ratio === "16_9" && i.width >= 500).sort((a, b) => a.width - b.width)[0];
    const pr = (e.priceRanges ?? [])[0];
    return { id: "tm:" + clip(e.id, 60), source: "ticketmaster", title: clip(e.name, 120), starts_at: iso(ms), all_day: !s.dateTime,
      venue: clip(v.name, 80), address: clip([v.address?.line1, v.city?.name, v.state?.stateCode, v.postalCode].filter(Boolean).join(", "), 120),
      category, price: pr && Number.isFinite(pr.min) ? `From $${Math.round(pr.min)}` : "", free: false,
      ticket_url: httpsOnly(e.url), info_url: httpsOnly(e.url), image_url: httpsOnly(img?.url) };
  }).filter(Boolean);
}
