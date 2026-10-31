// Table of 8 for sale (his order, 2026-10-23). THE price list — the storefront, the order page and the in-app Table Store
// all read it from functions/billing (action catalog); checkout never takes a price from the browser. Cents, US dollars,
// per month; a year costs 10 months. Proved by tests/billing_test.mjs.
export const T8_PLANS = {
  table:  { name: "The Table", cents: 699, rooms: false, tables: 1, blurb: "Every basic tool, for one family" },
  whole:  { name: "The Whole Table", cents: 1299, rooms: true, tables: 1, blurb: "Every basic tool and every room" },
  church: { name: "Church & Community", cents: 2900, rooms: true, tables: 5, blurb: "Up to 5 family tables, one account" },
};
// rooms: included in The Whole Table and Church & Community. soon = needs a licence before it can be sold (his decision 10/23)
export const T8_ROOMS = {
  games:   { name: "Game Room", cents: 299, ic: "🎲", d: "Spades, Bid Whist, Dominoes, Trivia, Family Feud and more" },
  dates:   { name: "Date Night & Adventure Club", cents: 199, ic: "💕", d: "Evenings for two, cooking classes, and kids' adventures" },
  faith:   { name: "Faith & Family", cents: 199, ic: "🙏", d: "Prayer Wall, Family Recipe Book and Secret Santa" },
  live:    { name: "City Live", cents: 199, ic: "🎟️", d: "Concerts, games and shows in town, with Who's in?" },
  outings: { name: "Family Outings", cents: 199, ic: "🎉", d: "Tigers games, bowling, the zoo, with settle-up" },
  watch:   { name: "Watch Nights", cents: 199, ic: "🏈", d: "Big Game Night and Netflix & Chill watch parties", soon: true },
};
// Premium: never included in a plan; added on their own (the Pass is all six)
export const T8_PREMIUM = {
  getaways:  { name: "Getaways", cents: 499, ic: "🧳", d: "Couples and family trips in 7 destinations, planned day by day, with the cost" },
  tourney:   { name: "Game Night Tournaments", cents: 349, ic: "🏆", d: "A live leaderboard across any games, and a champion of the year" },
  rides:     { name: "Rides & Carpools", cents: 349, ic: "🚗", d: "Match riders with drivers for every dinner and outing" },
  autopilot: { name: "Dinner on Autopilot", cents: 349, ic: "🔁", d: "Standing dinners: the vote opens by itself, with three picks" },
  topgolf:   { name: "Topgolf Outings", cents: 349, ic: "⛳", d: "Pick a day, book a bay, settle up (Movie Night is coming soon)" },
  keepsake:  { name: "Year at the Table", cents: 399, ic: "📖", d: "Your year in dinners: top places, new places, best photos" },
  pass:      { name: "Premium Pass", cents: 1499, ic: "✦", d: "All six Premium features" },
};
export const T8_SEAT = { name: "Extra seat", cents: 100 };   // past 12 people at a table
export const T8_PREMIUM_KEYS = ["getaways", "tourney", "rides", "autopilot", "topgolf", "keepsake"];
export const t8Price = (cents, cycle) => cycle === "year" ? cents * 10 : cents;
export const t8Lookup = (key, cycle) => `t8_${key}_${cycle === "year" ? "year" : "month"}`;
// what a subscription's items unlock: [{key, qty}] → { plan, features, seats }
export function t8Features(items){
  const keys = items.map(i => i.key), plan = ["church", "whole", "table"].find(k => keys.includes(k)) || null, f = new Set();
  if (plan && T8_PLANS[plan].rooms) Object.keys(T8_ROOMS).filter(k => !T8_ROOMS[k].soon).forEach(k => f.add(k));
  keys.filter(k => T8_ROOMS[k] && !T8_ROOMS[k].soon).forEach(k => f.add(k));
  keys.filter(k => T8_PREMIUM_KEYS.includes(k)).forEach(k => f.add(k));
  if (keys.includes("pass")) T8_PREMIUM_KEYS.forEach(k => f.add(k));
  const seatQty = items.filter(i => i.key === "seat").reduce((s, i) => s + (i.qty || 0), 0), tables = plan ? T8_PLANS[plan].tables : 1;
  return { plan, features: [...f].sort(), seats: 12 + Math.floor(seatQty / tables) };
}
// the order's line items, before Stripe: [{key, qty}] (a church plan's Premium and seats count for all five tables)
export function t8Order({ plan, rooms = [], premium = [], seats = 12 }){
  const P = T8_PLANS[plan]; if (!P) return { code: "plan" };
  const n = Math.round(+seats || 12); if (!(n >= 2 && n <= 40)) return { code: "seats" };
  const items = [{ key: plan, qty: 1 }];
  if (!P.rooms) [...new Set(rooms)].forEach(k => { if (T8_ROOMS[k] && !T8_ROOMS[k].soon) items.push({ key: k, qty: 1 }); });
  const prem = [...new Set(premium)];
  if (prem.includes("pass")) items.push({ key: "pass", qty: P.tables });
  else prem.forEach(k => { if (T8_PREMIUM_KEYS.includes(k)) items.push({ key: k, qty: P.tables }); });
  if (n > 12) items.push({ key: "seat", qty: (n - 12) * P.tables });
  return { items };
}
export const t8Cents = key => T8_PLANS[key]?.cents ?? T8_ROOMS[key]?.cents ?? T8_PREMIUM[key]?.cents ?? (key === "seat" ? T8_SEAT.cents : null);
export const t8Name = key => T8_PLANS[key]?.name ?? T8_ROOMS[key]?.name ?? T8_PREMIUM[key]?.name ?? (key === "seat" ? T8_SEAT.name : key);
