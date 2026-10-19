// Table of 7 Secret Santa draw (his order, 2026-10-18: couples kept apart). Server only.
// people: member ids; households: [[ids], …] who must not draw each other. Returns {giver: receiver} for everyone,
// a single ring or several, with nobody drawing themselves or their own household; null when no such draw exists.
export function santaDraw(people, households, rand = Math.random){
  const home = {}; (households || []).forEach((h, i) => (h || []).forEach(id => { home[id] = i; }));
  const ok = (g, r) => g !== r && (home[g] === undefined || home[g] !== home[r]);
  const n = people.length; if(n < 2) return null;
  // a random order, then try each giver's options in random order (backtracking): small families finish instantly
  const order = [...people]; for(let i = n - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const out = {}, used = new Set();
  const place = k => {
    if(k === n) return true;
    const g = order[k], opts = people.filter(r => !used.has(r) && ok(g, r));
    for(let i = opts.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [opts[i], opts[j]] = [opts[j], opts[i]]; }
    for(const r of opts){ out[g] = r; used.add(r); if(place(k + 1)) return true; used.delete(r); delete out[g]; }
    return false;
  };
  return place(0) ? out : null;
}
