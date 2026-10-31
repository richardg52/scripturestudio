// Table of 8 for sale (2026-10-23): proves the price list and what each order unlocks (functions/billing/catalog.js).
import { T8_PLANS, T8_ROOMS, T8_PREMIUM, T8_PREMIUM_KEYS, t8Order, t8Features, t8Price, t8Lookup, t8Cents } from "../supabase/functions/billing/catalog.js";
let bad = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) bad++; };
ok(T8_PLANS.table.cents === 699 && T8_PLANS.whole.cents === 1299 && T8_PLANS.church.cents === 2900 && T8_PLANS.church.tables === 5, "plans: $6.99, $12.99, Church & Community $29 for up to 5 tables");
ok(t8Price(699, "year") === 6990 && t8Lookup("whole", "year") === "t8_whole_year" && t8Lookup("games", "x") === "t8_games_month", "a year is ten months; every price has one lookup key");
ok(T8_ROOMS.watch.soon && !("movies" in T8_PREMIUM), "the licensed parts (Watch Nights, Movie Night) are not for sale yet (his decision 10/23)");
const a = t8Order({ plan: "table", rooms: ["games", "watch", "games"], premium: ["getaways"], seats: 8 });
ok(JSON.stringify(a.items) === JSON.stringify([{ key: "table", qty: 1 }, { key: "games", qty: 1 }, { key: "getaways", qty: 1 }]), "The Table + Game Room + Getaways (Watch Nights and the doubled room are dropped)");
const b = t8Order({ plan: "whole", rooms: ["games"], premium: ["pass", "rides"], seats: 15 });
ok(JSON.stringify(b.items) === JSON.stringify([{ key: "whole", qty: 1 }, { key: "pass", qty: 1 }, { key: "seat", qty: 3 }]), "The Whole Table already has rooms; the Pass replaces single Premium items; 15 people = 3 extra seats");
const c = t8Order({ plan: "church", premium: ["getaways"], seats: 14 });
ok(JSON.stringify(c.items) === JSON.stringify([{ key: "church", qty: 1 }, { key: "getaways", qty: 5 }, { key: "seat", qty: 10 }]), "Church & Community: Premium and extra seats count for all five tables");
ok(t8Order({ plan: "gold" }).code === "plan" && t8Order({ plan: "table", seats: 99 }).code === "seats", "an unknown plan or seat count is refused");
const f1 = t8Features([{ key: "table" }, { key: "games" }, { key: "getaways" }]);
ok(f1.plan === "table" && f1.features.join() === "games,getaways" && f1.seats === 12, "what The Table + Game Room + Getaways unlocks");
const f2 = t8Features([{ key: "whole" }, { key: "pass" }, { key: "seat", qty: 3 }]);
ok(f2.plan === "whole" && ["games", "dates", "faith", "live", "outings", ...T8_PREMIUM_KEYS].every(k => f2.features.includes(k)) && !f2.features.includes("watch") && f2.seats === 15, "The Whole Table + Pass unlocks every room and Premium feature, never the licensed ones; 15 seats");
const f3 = t8Features([{ key: "church" }, { key: "seat", qty: 10 }]);
ok(f3.plan === "church" && f3.seats === 14, "a church group's extra seats are shared out per table");
ok(t8Features([]).features.length === 0 && t8Features([]).plan === null, "no subscription, nothing unlocked");
ok(Object.keys({ ...T8_PLANS, ...T8_ROOMS, ...T8_PREMIUM }).every(k => Number.isInteger(t8Cents(k)) && t8Cents(k) > 0) && t8Cents("seat") === 100, "every item has a whole-cent price");
// the webhook (2026-10-23): a new Stripe endpoint sends events only in the newest API version, which moved current_period_end
// and invoice.subscription. Nothing in the handler may read those from the event body; it reads each object again in the pinned version.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../supabase/functions/billing/index.ts", import.meta.url), "utf8").replace(/(^|[^:"'`])\/\/[^\n]*/gm, "$1");
const hook = src.slice(src.indexOf("if (sig) {"), src.indexOf('ignored: ev.type'));
ok(/stripe-version": "2024-06-20"/.test(src) && /await stripe\(`subscriptions\/\$\{encodeURIComponent\(o\.id\)\}`\)/.test(hook) && /await stripe\(`invoices\/\$\{encodeURIComponent\(o\.id\)\}`\)/.test(hook),
  "the webhook reads each subscription and invoice again from Stripe in the pinned API version");
ok(!/sync\(o\)|o\??\.(subscription|current_period_end|items)\b/.test(hook), "and never trusts the event body's own fields (they move between API versions)");
// sales tax (2026-10-24): never charged before Stripe Tax is active, always once it is; prices are before tax; SaaS personal use
const ck = src.slice(src.indexOf('body.action === "checkout"'), src.indexOf('body.action === "thanks"'));
ok(/automatic_tax: \{ enabled: tax \? "true" : "false" \}/.test(ck) && /const tax = await taxActive\(\)/.test(ck) && /t\?\.status === "active"/.test(src),
  "checkout adds sales tax exactly when Stripe Tax is active on the account");
ok(/tax_behavior: "exclusive"/.test(src) && /tax_code: "txcd_10103000"/.test(src), "every new price is before tax, every product is SaaS for personal use");
console.log(bad ? `${bad} PROOF(S) FAILED` : "ALL PROOFS HOLD"); process.exit(bad ? 1 : 0);
