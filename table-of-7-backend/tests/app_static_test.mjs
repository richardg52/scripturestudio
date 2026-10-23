// Table of 8: proves things about the app file itself that broke (or nearly broke) on 2026-10-22. No network.
//   * the built-in restaurant list: every row is a full row (a missing comma once turned the list into nothing)
//   * no two click actions share a name (Memphis Live's "live" once collided with the live vote and did nothing)
//   * This Sunday turns three times a week: Monday, Wednesday and Friday
//     node table-of-7-backend/tests/app_static_test.mjs
import fs from "fs";
import { fileURLToPath } from "url";
const html = fs.readFileSync(fileURLToPath(new URL("../../table-of-7/index.html", import.meta.url)), "utf8");
let fails = 0;
const check = (name, ok, detail = "") => { if (!ok) fails++; console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : `  -> ${JSON.stringify(detail).slice(0, 300)}`)); };

// the restaurant list
const i = html.indexOf("const RAW = ["), j = html.indexOf("\n];", i);
const RAW = Function(`"use strict"; return ${html.slice(i + 12, j + 2)}`)();
const bad = RAW.filter(r => !Array.isArray(r) || r.length !== 9 || typeof r[0] !== "string" || !Array.isArray(r[3]) || !Array.isArray(r[7]) || !(r[6] >= 1 && r[6] <= 4));
check("every built-in restaurant row is a full, well-formed row", RAW.length >= 250 && !bad.length, bad.slice(0, 3));
const ids = RAW.map(r => r[0]);
check("no restaurant id is used twice", new Set(ids).size === ids.length, ids.filter((x, k) => ids.indexOf(x) !== k));
const hood = n => RAW.filter(r => r[2] === "Memphis" && r[4] === n).length;
const downtown = ["Downtown", "Beale Street", "South Main", "Harbor Town", "The Peabody", "The Pinch"].reduce((n, h) => n + hood(h), 0);
check("his order of 2026-10-22 is in: about 35 more downtown, and Germantown, Collierville, Cordova and Bartlett filled out",
  downtown >= 45 && hood("Germantown") >= 12 && hood("Collierville") >= 11 && hood("Cordova") >= 14 && hood("Bartlett") >= 12,
  { downtown, g: hood("Germantown"), c: hood("Collierville"), co: hood("Cordova"), b: hood("Bartlett") });
// the 80 added on 2026-10-22 are the rows in that day's migration: each is in the app with the same name and address
const mig = fs.readFileSync(fileURLToPath(new URL("../supabase/migrations/20261022090000_t8_more_restaurants.sql", import.meta.url)), "utf8");
const added = [...mig.matchAll(/^\('([a-z0-9-]+)','((?:[^']|'')*)','Memphis','(?:[^']|'')*','((?:[^']|'')*)'/gm)].map(m => [m[1], m[2].replace(/''/g, "'"), m[3].replace(/''/g, "'")]);
const RBY = Object.fromEntries(RAW.map(r => [r[0], r]));
const off = added.filter(([id, name, addr]) => !RBY[id] || RBY[id][1] !== name || RBY[id][5] !== addr || !/\d/.test(addr));
check("all 80 restaurants added on 2026-10-22 are in the app with the same name and a street address as the database row", added.length === 80 && !off.length, { n: added.length, off: off.slice(0, 3) });

// click actions
const cases = [...html.matchAll(/case "([a-z0-9-]+)":/g)].map(m => m[1]);
const dup = cases.filter((x, k) => cases.indexOf(x) !== k);
check("no two click actions share a name", !dup.length, dup);
for (const a of ["memlive", "lv-ask", "lv-save", "datenight", "dn-send", "adventure", "ac-pick", "whatsnew", "sunday-area", "gamenight", "netflix", "wp-send", "wp-bring", "who-tog", "who-all"])
  check(`the ${a} button has its own action`, cases.includes(a), a);

// This Sunday rotation (the same function the app runs)
const src = html.slice(html.indexOf("function pickSlot("), html.indexOf("const slotLabel"));
const DAY = 864e5, pickSlot = Function("DAY", `${src}; return pickSlot;`)(DAY);
const slots = [...Array(14)].map((_, k) => pickSlot(new Date(2026, 9, 19 + k, 12)));   // Mon Oct 19 … Sun Nov 1, local noon
const turns = slots.map((s, k) => k && s !== slots[k - 1] ? new Date(2026, 9, 19 + k).getDay() : null).filter(x => x !== null);
check("This Sunday's pick turns on Monday, Wednesday and Friday, and only then (three times a week)",
  JSON.stringify(turns) === JSON.stringify([3, 5, 1, 3, 5]), { slots, turns });
check("the turn holds all day (early morning and late night are the same pick)", pickSlot(new Date(2026, 9, 21, 0, 5)) === pickSlot(new Date(2026, 9, 21, 23, 55)));

console.log(fails ? `${fails} FAILED` : "ALL PROOFS HOLD");
process.exit(fails ? 1 : 0);
