// Table of 8: the Memphis Grizzlies' home games (his order, 2026-10-19: "add the Memphis Grizzlies"), read from the
// team's OWN schedule service (the one nba.com/grizzlies/schedule loads), which carries each game's official
// Ticketmaster link (tickets.singleTickets). Server only. Only games at FedExForum with the Grizzlies at home are kept,
// and a ticket link is kept only when it is a Ticketmaster event page (never built or guessed).
import { tgCentral } from "./tigers.js";
export const GRIZ_TEAM = "1610612763";
export const grizSchedule = season => `https://d1uex6iw1vhj0r.cloudfront.net/public/1/teams/${GRIZ_TEAM}/schedule?season=${season}`;
// the NBA season that covers a date: August onward belongs to the season that starts that autumn
export function grizSeason(ms){ const d = tgCentral(ms).date, y = +d.slice(0, 4), mo = +d.slice(5, 7); const s = mo >= 8 ? y : y - 1; return `${s}-${String(s + 1).slice(2)}`; }
export function grizzliesGames(json, fromDate){
  const list = json?.results?.schedule; if(!Array.isArray(list)) return [];
  const out = [];
  for(const g of list){
    if(g?.type !== "game" || g?.home?.ta !== "MEM" || !/fedex\s*forum/i.test(g?.arenaName || "") || !/^\d{10}$/.test(String(g?.gid || ""))) continue;
    if(!/^00[1-6]/.test(String(g.gid))) continue;            // preseason, regular season, play-in, playoffs (not summer league)
    const ms = Date.parse(g.utcTime); if(!ms) continue;
    const { date, time } = tgCentral(ms);
    if(fromDate && date < fromDate) continue;
    const t = String(g?.tickets?.singleTickets || "");
    const tickets = /^https:\/\/www\.ticketmaster\.com\/event\/[A-Za-z0-9]+(\?|$)/.test(t) ? t : null;
    out.push({ uid: String(g.gid), date, time, opponent: [g.visitor?.tc, g.visitor?.tn].filter(Boolean).join(" ").trim() || "TBA",
      label: String(g.gameLabel || "").trim(), preseason: String(g.gid).startsWith("001"), home: true, location: "FedExForum, Memphis, Tenn.", tickets });
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
export const GRIZ_TICKETS = "https://www.nba.com/grizzlies/single-game-tickets";
