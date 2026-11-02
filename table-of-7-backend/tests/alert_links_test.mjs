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
ok("the push sender puts the target in the address", /select\("id,to_member,text,event_id,link"\)/.test(push) && /\?go=" \+ encodeURIComponent\(a\.link\)/.test(push));
ok("Family Mail alerts point at their conversation", (mail.match(/link: `mail:\$\{/g) || []).length === 2);
console.log(fails ? `\n${fails} FAILED` : "\nALL PROOFS HOLD"); process.exit(fails ? 1 : 0);
