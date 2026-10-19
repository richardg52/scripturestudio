// Table of 7 Game Night Tournament scoring (his order, 2026-10-18). ONE copy: the server (functions/tourney) crowns
// the champion with it, and the app carries the identical text (index.html, between the TOURNEY RULES markers) for the
// running leaderboard. tests/tourney_score_test.mjs proves both. Every helper carries the "tn" prefix.
// Each game: 1st place = 3 points, 2nd place = 1 point (a team that wins gives each member the points).
// The leaderboard: most points first; a tie is broken by most 1st places; still tied = shared place.
export const TN_FIRST = 3, TN_SECOND = 1;
export function tnBoard(players, results){
  const pts = Object.fromEntries(players.map(p => [p, { id: p, points: 0, wins: 0, seconds: 0 }]));
  for(const r of results || []){
    if(!r) continue;
    for(const p of r.first || []) if(pts[p]){ pts[p].points += TN_FIRST; pts[p].wins += 1; }
    for(const p of r.second || []) if(pts[p]){ pts[p].points += TN_SECOND; pts[p].seconds += 1; }
  }
  const list = Object.values(pts).sort((a, b) => b.points - a.points || b.wins - a.wins || a.id.localeCompare(b.id));
  let place = 0, prev = null;
  list.forEach((x, i) => { if(!prev || x.points !== prev.points || x.wins !== prev.wins) place = i + 1; x.place = place; prev = x; });
  return list;
}
// the champion(s): everyone in 1st place, or none when no game has a result yet
export function tnChampions(players, results){
  const b = tnBoard(players, results); return b.length && b[0].points > 0 ? b.filter(x => x.place === 1).map(x => x.id) : [];
}
