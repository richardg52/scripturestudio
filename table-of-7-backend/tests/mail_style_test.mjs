// Family Mail draws each message with its kind as a style name. A bare "note" collided with the app's
// restaurant-notes box (.note: a grid on --surface), so on a light-mode device (his iPad, 2026-10-31) every
// plain note showed as faint text in a white box and "mine" lost its right-hand place. Kinds now carry "ml-".
import { readFileSync } from "node:fs";
const s = readFileSync(new URL("../../table-of-7/index.html", import.meta.url), "utf8");
let fails = 0; const ok = (name, c) => { console.log((c ? "PASS " : "FAIL ") + name); if(!c) fails++; };
ok("each Family Mail message's kind is drawn as ml-<kind>", /class="mlmsg \$\{mine \? "mine" : ""\} ml-\$\{m\.kind\}"/.test(s));
ok("no Family Mail message class is a bare kind name", !/class="mlmsg[^"]*\} \$\{m\.kind\}"/.test(s));
ok("the request and hug looks follow the new names", s.includes(".mlmsg.ml-request .mlbub") && s.includes(".mlmsg.ml-hug .mlbub"));
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
