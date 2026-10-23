// Table of 8 Big Game Night (his order, 2026-10-22: "NFL Thursday, Sunday evening and Monday night games only … use logos
// where you can"). Reads ESPN's public NFL scoreboard on the phone itself (ESPN refuses data-centre servers with 403 but lets any web page
// read it: Access-Control-Allow-Origin *; measured 2026-10-22) and keeps only the
// prime-time games in Memphis time: every Thursday game, Sunday games starting 6 PM or later, and every Monday game.
// Each game keeps both teams' official logos, the network(s), the stadium, and the score once it has started.
// One copy: synced into the app between the NFL RULES markers (tests/sync_rules_copy.py) and proved by
// tests/nfl_prime_test.mjs against a real ESPN reply.
export const ESPN_NOW = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";
export const espnWeek = (week, type = 2) => `${ESPN_NOW}?seasontype=${type}&week=${week}`;
const nflHttps = u => /^https:\/\/[^\s"'<>]+$/.test(String(u || "")) ? String(u) : "";
const nflClip = (x, k) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
// weekday and hour on a Memphis clock
export function memphisClock(ms){
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return { day: p.weekday, hour: Number(p.hour) };
}
export function primeSlot(ms){
  const { day, hour } = memphisClock(ms);
  return day === "Thu" ? "Thursday Night Football" : day === "Mon" ? "Monday Night Football" : day === "Sun" && hour >= 18 ? "Sunday Night Football" : "";
}
const nflTeam = c => ({ name: nflClip(c?.team?.displayName, 60), short: nflClip(c?.team?.shortDisplayName || c?.team?.name, 30), abbr: nflClip(c?.team?.abbreviation, 6),
  logo: nflHttps(c?.team?.logo), color: /^[0-9a-f]{6}$/i.test(c?.team?.color || "") ? c.team.color : "", record: nflClip(c?.records?.[0]?.summary, 12), score: c?.score ?? "" });
export function primeGames(j, now = Date.now()){
  return (j?.events ?? []).map(e => {
    const c = e?.competitions?.[0], ms = Date.parse(e?.date);
    if (!c || !Number.isFinite(ms) || ms < now - 5 * 3600e3) return null;
    const slot = primeSlot(ms); if (!slot) return null;
    const home = (c.competitors ?? []).find(x => x.homeAway === "home"), away = (c.competitors ?? []).find(x => x.homeAway === "away");
    if (!home || !away) return null;
    const state = c.status?.type?.state ?? e.status?.type?.state ?? "pre";
    return { id: nflClip(e.id, 20), slot, kickoff: new Date(ms).toISOString(), home: nflTeam(home), away: nflTeam(away),
      networks: [...new Set((c.broadcasts ?? []).flatMap(b => b?.names ?? []).map(n => nflClip(n, 30)))].slice(0, 4),
      venue: nflClip(c.venue?.fullName, 60), city: nflClip([c.venue?.address?.city, c.venue?.address?.state].filter(Boolean).join(", "), 40),
      state, detail: nflClip(c.status?.type?.shortDetail, 40) };
  }).filter(Boolean).sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
}
