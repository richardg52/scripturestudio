// Table of 8 Getaways (his order, 2026-10-23: "couples choose by Couples or family plan a getaway and the app will determine if
// this is for couples or family (how many) … a estimate package plan for flights, food, events … only your estimates based on
// your research"). One copy: the server reads Ticketmaster with tmTrip; the app (synced between the TRIP RULES markers by
// tests/sync_rules_copy.py) works out who it's for and the estimate. Proved by tests/trip_test.mjs.
// Every figure below is an ESTIMATE from public 2025–26 prices, never a quote — the app says so on every total.
export const GW_GEO = {
  Nashville: [36.1627, -86.7816, 25], Atlanta: [33.7490, -84.3880, 25], Chicago: [41.8781, -87.6298, 20], Dallas: [32.7767, -96.7970, 30],
  Houston: [29.7604, -95.3698, 30], "St. Louis": [38.6270, -90.1994, 25], Birmingham: [33.5186, -86.8104, 25], Huntsville: [34.7304, -86.5861, 25],
  "Gulf Shores": [30.2460, -87.7008, 30],
};
export const TRIP_COSTS = {
  gas: 3.10, mpg: 25, seatsPerCar: 5,                 // a family car; one more car for every five people
  hotelTax: 0.15, perRoom: 4,                          // up to four people share a room
  food: { mid: { breakfast: [12, 22], lunch: [16, 28], dinner: [32, 60] }, upscale: { breakfast: [20, 34], lunch: [26, 45], dinner: [65, 130] } },
  kidShare: 0.55,                                      // a child's meal against an adult's
  groundFly: [45, 85],                                 // rideshare or a rental, per party per day, when you fly
  mempark: 14,                                         // Memphis airport economy parking, per day
  cushion: 0.10,                                       // tips, snacks and the unexpected, on the high side
};
const tClip = (x, k) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const tHttps = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || "")) ? String(u) : "";
// not a show: bundles, passes and extras sold beside one (measured on Ticketmaster's Atlanta and Nashville replies, 2026-10-23)
export const tripAddOn = t => /hotel package|ticket \+ hotel|\bparking\b|suite rental|premium seating|vip package|upgrade|season pass|\b\w+ pass$|flex ticket|dinner reservation|\badd-?on\b|gift card|voucher/i.test(String(t || ""));
export const tripCalledOff = t => /^\s*(cancel+ed|postponed|called off)\b/i.test(String(t || ""));
const tripNextDay = d => new Date(Date.parse(d + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
export const tmTripUrl = (key, city, from, to) => {
  const g = GW_GEO[city]; if (!g) return "";
  return "https://app.ticketmaster.com/discovery/v2/events.json?apikey=" + encodeURIComponent(key) + `&latlong=${g[0]},${g[1]}&radius=${g[2]}&unit=miles`
    + `&startDateTime=${from}T00:00:00Z&endDateTime=${tripNextDay(to)}T11:59:59Z&size=120&sort=date,asc&locale=*`;   // the last evening, in Central time
};
// Ticketmaster's reply → the shows, games and concerts on those days, by the venue's own date (no parking passes, hotel
// bundles or cancelled shows; a long-running exhibit that opened months ago is not "on" this trip)
export function tmTrip(j, from = "", to = "9999"){
  const seen = new Set();
  return (j?._embedded?.events ?? []).map(e => {
    const s = e?.dates?.start ?? {};
    if (!e?.name || tripCalledOff(e.name) || tripAddOn(e.name) || e?.dates?.status?.code === "cancelled" || !s.localDate || s.localDate < from || s.localDate > to) return null;
    const v = e._embedded?.venues?.[0] ?? {}, c = e.classifications?.[0] ?? {};
    const seg = c.segment?.name ?? "", gen = c.genre?.name ?? "", sub = c.subGenre?.name ?? "";
    const league = seg === "Sports" && /^(NFL|NBA)$/.test(sub) ? sub : "";   // Ticketmaster files the league as the sub-genre
    const cat = seg === "Sports" ? "sports" : seg === "Music" ? "concert" : /comedy/i.test(gen) ? "comedy" : seg === "Arts & Theatre" ? "theater" : "family";
    const img = (e.images ?? []).filter(i => i?.ratio === "16_9" && i.width >= 500).sort((a, b) => a.width - b.width)[0];
    const pr = (e.priceRanges ?? [])[0];
    const key = tClip(e.name, 120).toLowerCase() + "|" + s.localDate + "|" + (s.localTime || "");
    if (seen.has(key)) return null; seen.add(key);
    return { id: "tm:" + tClip(e.id, 60), title: tClip(e.name, 120), day: s.localDate, time: s.localTime ? s.localTime.slice(0, 5) : "",
      venue: tClip(v.name, 80), address: tClip([v.address?.line1, v.city?.name, v.state?.stateCode].filter(Boolean).join(", "), 120),
      cat, league, from: pr && Number.isFinite(pr.min) && pr.min > 0 ? Math.round(pr.min) : null, url: tHttps(e.url), image: tHttps(img?.url) };
  }).filter(Boolean);
}
// who it's for: two grown-ups and no children is a couples' getaway; anything else is a family (or group) trip
export function tripMode(adults, kids){
  const a = Math.max(1, Math.round(+adults || 0)), k = Math.max(0, Math.round(+kids || 0));
  return { mode: a === 2 && k === 0 ? "couple" : k > 0 ? "family" : a > 2 ? "group" : "solo", people: a + k, adults: a, kids: k,
    label: a === 2 && k === 0 ? "A couples' getaway" : k > 0 ? `A family trip for ${a + k}` : a > 2 ? `A group trip for ${a}` : "A trip for one" };
}
const tripR10 = n => Math.round(n / 10) * 10;
const tripHrs = h => { const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60; return `${hh} ${hh === 1 ? "hour" : "hours"}${mm ? ` ${mm} min` : ""}`; };
// the package estimate. city: the curated city facts; picks: [{cat, cost_pp}] the stops chosen (meals and things to do)
export function tripEstimate({ city, adults, kids, nights, travel, tier, picks = [], events = [] }){
  const who = tripMode(adults, kids), n = Math.min(Math.max(Math.round(+nights || 1), 1), 14), days = n + 1, T = TRIP_COSTS, up = tier === "upscale";
  const eaters = who.adults + who.kids * T.kidShare, lines = [];
  if (travel === "fly") {
    lines.push({ k: "travel", label: `Flights from Memphis (${city.airport || "?"}) for ${who.people}`, low: city.airfare_rt_low * who.people, high: city.airfare_rt_high * who.people,
      note: city.nonstop_from_MEM ? "Nonstop flights exist" : "Usually one stop" });
    lines.push({ k: "ground", label: "Getting around there", low: T.groundFly[0] * days, high: T.groundFly[1] * days, note: "Rideshare or a rental car" });
    lines.push({ k: "park", label: "Parking at Memphis airport", low: T.mempark * days, high: T.mempark * days, note: "Economy lot" });
  } else {
    const cars = Math.ceil(who.people / T.seatsPerCar), gas = city.drive_miles * 2 * cars / T.mpg * T.gas;
    lines.push({ k: "travel", label: `Gas, ${city.drive_miles * 2} miles round trip${cars > 1 ? ` in ${cars} cars` : ""}`, low: gas * 0.9, high: gas * 1.15, note: `About ${tripHrs(city.drive_hours)} each way` });
    const pk = city.parking || [0, 0];
    if (pk[1]) lines.push({ k: "park", label: "Hotel parking", low: pk[0] * n, high: pk[1] * n, note: "Per night, downtown hotels" });
  }
  const rooms = Math.max(1, Math.ceil(who.people / T.perRoom)), rate = up ? city.hotel_upscale : city.hotel_mid;
  lines.push({ k: "hotel", label: `${up ? "Upscale" : "Comfortable"} hotel · ${rooms} ${rooms === 1 ? "room" : "rooms"} × ${n} ${n === 1 ? "night" : "nights"}`, low: rate[0] * rooms * n * (1 + T.hotelTax), high: rate[1] * rooms * n * (1 + T.hotelTax), note: "With taxes" });
  // food: the restaurants on the plan at their own typical prices; every other meal at a typical price for the hotel level
  const F = T.food[up ? "upscale" : "mid"], meal = (c, i) => F[c][i];
  const avgMeal = i => (meal("breakfast", i) + meal("lunch", i) + meal("dinner", i)) / 3;
  const MEALS = ["breakfast", "brunch", "lunch", "dinner"], eats = picks.filter(p => MEALS.includes(p.cat) && +p.cost_pp > 0), sweets = picks.filter(p => p.cat === "dessert" && +p.cost_pp > 0);
  const onPlan = eats.reduce((s, p) => s + +p.cost_pp, 0) + sweets.reduce((s, p) => s + +p.cost_pp, 0), rest = Math.max(0, days * 3 - eats.length);
  lines.push({ k: "food", label: `Food for ${days} days`, low: (onPlan * 0.9 + rest * avgMeal(0)) * eaters, high: (onPlan * 1.2 + rest * avgMeal(1)) * eaters,
    note: `${eats.length ? `${eats.length} ${eats.length === 1 ? "meal" : "meals"} on the plan, the rest typical` : "Three meals a day"}${who.kids ? "; children at about half" : ""}` });
  const fun = picks.filter(p => !["breakfast", "brunch", "lunch", "dinner", "dessert"].includes(p.cat) && +p.cost_pp > 0);
  const funPP = fun.reduce((s, p) => s + +p.cost_pp, 0), evPP = events.reduce((s, e) => s + (+e.from || 0), 0);
  if (funPP || evPP) lines.push({ k: "fun", label: `Things to do (${fun.length + events.length})`, low: (funPP + evPP) * (who.adults + who.kids * 0.7), high: (funPP * 1.15 + evPP * 1.8) * (who.adults + who.kids * 0.85), note: events.length ? "Tickets start at the lowest price listed" : "Admission and classes" });
  else lines.push({ k: "fun", label: "Things to do", low: 25 * who.people * days * 0.5, high: 60 * who.people * days * 0.6, note: "Pick a few to sharpen this" });
  const low = lines.reduce((s, l) => s + l.low, 0), high = lines.reduce((s, l) => s + l.high, 0) * (1 + T.cushion);
  return { who, nights: n, rooms, lines: lines.map(l => ({ ...l, low: tripR10(l.low), high: tripR10(l.high) })), low: tripR10(low), high: tripR10(high),
    perPerson: [tripR10(low / who.people), tripR10(high / who.people)] };
}
