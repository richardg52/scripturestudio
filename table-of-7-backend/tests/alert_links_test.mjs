// 2026-11-01: alerts with no dinner went nowhere when tapped, and every phone notification opened Home (Rosa's approved
// photo "nowhere"; Candyce's Family Mail "back to the home screen"). An alert now carries a target ("kind:id") that the
// bell, the lock-screen notification and an already-open app all follow. This pins the effect at every link of the chain.
import { readFileSync } from "node:fs";
const R = p => readFileSync(new URL(p, import.meta.url), "utf8");
const app = R("../../table-of-7/index.html"), sw = R("../../table-of-7/sw.js");
const push = R("../supabase/functions/push/index.ts"), mail = R("../supabase/functions/mail/index.ts");
const mig = R("../supabase/migrations/20261101090000_t8_alert_links.sql");
let fails = 0; const ok = (n, c) => { console.log((c ? "PASS " : "FAIL ") + n); if(!c) fails++; };
ok("the alerts table gains a target column with a safe shape", /add column if not exists link text/.test(mig) && /alerts_link_shape/.test(mig));
ok("the app loads and saves each alert's target", /link:a\.link \|\| ""/.test(app) && /link:nz\(a\.link\)/.test(app));
ok("each bell row carries its target", /data-act="alert-go" data-id="\$\{a\.eventId\|\|""\}" data-link=/.test(app));
ok("tapping a bell row follows the target before anything else", /case "alert-go": closeSheet\(\); if\(b\.dataset\.link && alertGo\(b\.dataset\.link\)\) break;/.test(app));
ok("the router opens mail, a photo, the album and approvals", ["    mail: () =>", "    photo: () =>", "    gallery: () =>", "    approvals: () =>"].every(x => app.includes(x)) && /function alertGo\(/.test(app));
ok("a photo waiting for approval points the host to approvals", /They're waiting for your approval\.`, "approvals"\)/.test(app));
ok("an approved photo's alerts point at that photo", (app.match(/`photo:\$\{ph\.id\}`/g) || []).length >= 2);
ok("a notification opened with ?go= waits through sign-in and then opens it", /get\("go"\)/.test(app) && /runPendingGo/.test(app) && /openApp1\(\); if\(pendingGo\)/.test(app));
ok("an already-open app is told where to go", /t8go/.test(app) && /postMessage\(\{ t8go: go \}\)/.test(sw));
ok("the push sender puts the target in the address", /select\("id,to_member,text,event_id,link"\)/.test(push) && /const go = a\.link \|\|/.test(push));
ok("Family Mail alerts point at their conversation", (mail.match(/link: `mail:\$\{/g) || []).length === 2);
const F = n => R(`../supabase/functions/${n}/index.ts`);
const rooms = {movies:"movies", golf:"golf", outings:"outings", santa:"santa", prayer:"prayers", tourney:"games", recipes:"recipes", getaways:"getaways", hangouts:"hangouts"};
for (const [fn, room] of Object.entries(rooms)) ok(`${fn}: its alerts open ${room}`, F(fn).includes(`link = "${room}"`) && new RegExp(`\\n    ${room}: \\(\\) =>`).test(app));
ok("watch: alerts open Big Game Night or Netflix & Chill", /"gamenight" : "netflix"/.test(F("watch")) && /    gamenight: \(\) =>/.test(app) && /    netflix: \(\) =>/.test(app));
ok("dates: alerts open Date Night or Adventure Club", /"adventure" : "datenight"/.test(F("dates")) && /    datenight: \(\) =>/.test(app) && /    adventure: \(\) =>/.test(app));
ok("rides: alerts open the plan the ride is for", /rideLink = `\$\{kind === "dinner" \? "dinner" : kind\}:\$\{ref\}`/.test(F("rides")) && /link: rideLink/.test(F("rides")));
ok("Memphis Live: all four alerts open it", (F("live").match(/link: "memphislive"/g) || []).length === 4 && /    memphislive: \(\) =>/.test(app));
ok("games: a game's alerts open that game", (F("games").match(/`game:\$\{g\.id\}`/g) || []).length === 3 && /    game: \(\) =>/.test(app));
ok("family: a new family request opens the owner desk", /link: "owner"/.test(F("family")) && /    owner: \(\) =>/.test(app));
// a name written twice in the router: the second silently replaces the first (golf and santa did: a ride's "golf:<id>"
// opened the room list instead of that outing). Every name appears once.
const table = (app.match(/const opener = \{([\s\S]*?)\n  \}\[kind\];/) || [])[1] || "", names = [...table.matchAll(/\n    (\w+): \(\) =>/g)].map(m => m[1]);
ok("the router names each target once", names.length > 20 && names.length === new Set(names).size);
ok("golf and santa open the one named, else the room", /    golf: \(\) => \{ if\(id && has\(st\.golf, id\)\)\{ drawGolf\(id\); return true; \}/.test(app) && /    santa: \(\) => \{ if\(id && has\(st\.santa, id\)\)\{ drawSanta\(id\); return true; \}/.test(app));
// the dinner-vote alerts are written by the database with their dinner but no link: their notification opens that dinner
ok("a notification about a dinner opens that dinner", /const go = a\.link \|\| \(a\.event_id \? "dinner:" \+ a\.event_id : ""\)/.test(push) && /\?go=" \+ encodeURIComponent\(go\)/.test(push));
// 2026-11-02 (Candyce: "It still won't let me open my notifications"): a tap on a phone away over 10 minutes went to its
// target first and was then wiped by the 10-minute lock, so after the PIN it was Home. The target now waits for the lock.
ok("a tapped notification waits until the phone is awake and past the lock", /pendingGo = String\(g\); goWhenAwake\(\);/.test(app) && /function goWhenAwake\(\)\{ if\(document\.hidden \|\| app\.hidden \|\| awayTooLong\(\)\) return; runPendingGo\(\); \}/.test(app));
ok("coming back runs a waiting target, or locks and keeps it for after the PIN", /const long = awayTooLong\(\); awayAt = 0; if\(long && !app\.hidden\) lockFresh\("Locked after 10 minutes away\. Sign in again\."\); else goWhenAwake\(\);/.test(app));
ok("the 10-minute lock loads a fresh copy, keeping the target and the message", /function lockFresh\(msg\)\{ lockApp\(msg\);/.test(app) && /"\?go=" \+ encodeURIComponent\(pendingGo\)/.test(app) && /location\.replace\(to\)/.test(app) && /showSignIn\(lockMsg\)/.test(app));
ok("a waiting target is not thrown away while the app is locked", /function runPendingGo\(\)\{ if\(app\.hidden\) return; const g = pendingGo; pendingGo = ""; if\(g\) alertGo\(g\); \}/.test(app));
ok("a photo that wasn't approved opens the album", /didn't approve one of your photos\.`,eventId:null,link:"gallery"/.test(app));
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
