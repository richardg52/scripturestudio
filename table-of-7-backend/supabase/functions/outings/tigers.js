// Table of 7: the University of Memphis men's basketball schedule, read from the Tigers' OFFICIAL calendar feed
// (gotigersgo.com, the SIDEARM "calendar.ashx" feed for men's basketball, sport_id 4). Server only.
// A game with a set tip-off has a UTC time ("20270123T200000Z"); one whose time isn't announced has a date only
// ("20270117"): its time comes back null and the app shows "time to be announced".
export const TIGERS_ICS = "https://gotigersgo.com/calendar.ashx/calendar.ics?sport_id=4";
export const TIGERS_SCHEDULE = "https://gotigersgo.com/sports/mens-basketball/schedule";
const unfold = s => String(s || "").replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
const unesc = s => String(s || "").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ").replace(/\\\\/g, "\\").trim();
// a UTC instant -> {date: "YYYY-MM-DD", time: "HH:MM"} on Memphis time (Central, daylight saving included)
export function tgCentral(ms){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
// the feed's text -> the games from `fromDate` (YYYY-MM-DD, Memphis time) on, soonest first
export function tigersGames(text, fromDate){
  const out = [];
  for(const ev of unfold(text).split("BEGIN:VEVENT").slice(1)){
    const get = k => { const m = ev.match(new RegExp("^" + k + "(?:;[^:\\r\\n]*)?:(.*)$", "m")); return m ? m[1].trim() : ""; };
    const start = get("DTSTART"), summary = unesc(get("SUMMARY")), location = unesc(get("LOCATION")), uid = get("UID");
    if(!start || !summary) continue;
    let date, time = null;
    const t = start.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/), d = start.match(/^(\d{4})(\d{2})(\d{2})$/);
    if(t){ ({ date, time } = tgCentral(Date.UTC(+t[1], +t[2] - 1, +t[3], +t[4], +t[5], +t[6]))); }
    else if(d) date = `${d[1]}-${d[2]}-${d[3]}`;
    else continue;
    const vs = summary.match(/\b(vs\.?|at)\s+(.+)$/i);
    const opponent = vs ? vs[2].trim() : summary.replace(/^University of Memphis Men's Basketball\s*/i, "").trim();
    const home = !!vs && /^vs/i.test(vs[1]) && /memphis/i.test(location);
    if(fromDate && date < fromDate) continue;
    out.push({ uid, date, time, opponent, home, location });
  }
  return out.sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));
}
