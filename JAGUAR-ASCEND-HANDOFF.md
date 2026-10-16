# Jaguar Ascend Hub: Handoff

**Owner:** Dr. Richard G. Clark (designer and creator). Copyright © 2026. All rights reserved.
**Repo:** https://github.com/richardg52/scripturestudio, branch **`claude/desoto-central-tutoring-hub-0l3hal`**.
This branch is not merged into `main`. `main` is a separate app, Scripture Studio; don't mix them up.
**Student:** Ezekiel "Zeke" Wilson, Grade 9, DeSoto Central High School (Southaven, MS). Personal use only for now.

---

## 1. What this is
A self-contained tutoring web app for **Algebra I, English I, and Reading**, aligned to the Mississippi College & Career
Readiness Standards. Plain HTML/CSS/JS with **no build step, no server, no accounts, and no dependencies**. All progress
is stored in the browser's `localStorage`.

Key features:
- **Coach J**, a built-in virtual tutor. For each new problem type it solves one example step by step ("Watch me"),
  then the student tries one. On a miss it walks through the student's own problem and offers a similar one.
- **Placement gate:** lessons, practice, and quizzes stay locked until 3 pre-tests are done. A Placement Report follows.
- 18-week plan with 45 lessons in 5 steps each (Warm-up → Learn → Together → On your own → Exit ticket).
- Banks: 58 Algebra generators (unlimited unique problems), 400+ English items, 18 passages with 188 reading questions.
  4 passages are reserved for the post-test only.
- Tests: pre-tests, 24 unit quizzes, 45 exit tickets, **The Ascend** (combined exam) ×3, and post-tests. They are timed,
  pausable, have balanced answer keys, and lock the tools.
- Report card, Parent Portal (PIN **1234** by default), splash screen, in-app Manual and Quick Start sheet, dark mode,
  read-aloud, and an installable offline web app.

## 2. Folder map
| Path | What |
|---|---|
| `tutoring-hub/` | **The app. Deploy this folder as-is.** |
| `tutoring-hub/index.html` | Shell, full CSS design system, SVG icons, splash, tool drawers |
| `tutoring-hub/js/util.js` | Shared helpers (random, formatting, distractors) |
| `tutoring-hub/js/math.js` | Algebra standards, units, 58 generators (`make()` returns stem/correct/distractors/hints/explain) |
| `tutoring-hub/js/english.js` | English standards, units, curated banks and generators, hand-written items |
| `tutoring-hub/js/reading.js` | 14 passages and their questions |
| `tutoring-hub/js/reading-post.js` | 4 **reserved** post-test passages (`reserved:true`) |
| `tutoring-hub/js/lessons-math.js`, `lessons-ela.js` | All 45 lessons |
| `tutoring-hub/js/app.js` | State, the test/practice engine, grading, analytics, placement gate |
| `tutoring-hub/js/coach.js` | Coach J walkthroughs |
| `tutoring-hub/js/views.js` | All screens |
| `tutoring-hub/js/manual.js` | In-app Manual and printable Quick Start sheet |
| `tutoring-hub/manifest.webmanifest`, `sw.js`, `icons/` | Installable app and offline cache |
| `tutoring-hub/netlify.toml`, `_headers` | Hosting config (static, `publish = "."`) |
| `tutoring-hub-app/` | Capacitor wrapper: `android/` and `ios/` native projects (icons and splash already generated). See `APP-BUILD.md`. |
| `.github/workflows/jaguar-ascend-android.yml` | CI that builds a debug APK on push (last run: **success**) |
| `jaguar-ascend-tools/` | Playwright tests (`t2.js` quick, `qa.js` full click-through) and `icons.js` |
| `jaguar-ascend-docs/welcome-letter.md` | Email-ready welcome letter to Zeke and his parents |

## 3. Remaining to-do (in order)
1. **Deploy** `tutoring-hub/` to Netlify as a **new site**. This was blocked only by the cloud sandbox's firewall.
   - Easiest: drag the `tutoring-hub` folder onto https://app.netlify.com/drop, or
   - CLI: `cd tutoring-hub && npx netlify-cli deploy --prod --dir .` (create a new site when prompted). Then rename it to
     `jaguar-ascend` in Site configuration.
   - Do **not** deploy from the repo root. The root `netlify.toml` belongs to Scripture Studio.
   - Verify that `/`, `/manifest.webmanifest`, `/sw.js`, `/js/app.js`, and `/icons/icon-192.png` all return 200.
2. Put the live URL into `jaguar-ascend-docs/welcome-letter.md` (replace `[ADD THE JAGUAR ASCEND LINK HERE]`).
3. Decide whether the **PIN** stays in the letter or goes in a separate parents-only email. Zeke also receives the letter.
4. In the app's Parent Portal: change the PIN, and **confirm the school team names**. They were gathered from public pages
   and sources conflicted: principal "Shane Jones" (newer district page) vs "Cliff Johnston" (older school page), and
   assistant principal "Jermal Brown". Confirm with the front office at (662) 536-3612.
5. On Zeke's device, open the URL and choose Add to Home Screen (iPhone: Safari → Share; Android: Chrome → Install app;
   Mac: Safari → File → Add to Dock).
6. *(Optional)* There is also a private claude.ai copy at https://claude.ai/artifact/MZ4xqPixSjbGwUrebNyfA3. It isn't
   needed; the owner may delete it.

## 4. Running and testing locally
```bash
# Run: open tutoring-hub/index.html directly, or serve it to test install/offline:
cd tutoring-hub && python3 -m http.server 8080   # then visit http://localhost:8080

# Automated tests (Node 18+):
cd jaguar-ascend-tools && npm install && npx playwright install chromium
node t2.js   # quick: validates every generator x300, all blueprints, all 45 lessons, mobile widths → expect "errors []"
node qa.js   # full UI click-through as a student (placement, lessons, Coach J, tests, portal, tools)
```
`qa.js` reports `ISSUES` and `ERRORS` arrays. Both should be empty, except a possible `results practice plan` click
miss when no skill scored below 70% (that is expected).

## 5. How to change things safely
- **Bump `VERSION` in `tutoring-hub/sw.js`** on every release, so installed copies pick up the update.
- **Add a math generator:** push to `HUB.math` in `math.js` with `{id, std, make(){ return {stem, correct, distractors:[3], type:'mc'|'num', answer?, hints:[...], explain} }}`.
  `inst()` in `app.js` regenerates until all 4 choices are distinct. Use `neg()` (typographic minus) for display.
- **Add English/Reading items:** use `S(std, stem, correct, [3 wrong], explain, hint)` or `R(passage, std, ...)`.
  The `std` must exist in `HUB.std` and a unit in `HUB.units`.
- **Lessons:** objects in `lessons-*.js` (week, unit, stds, objective, vocab, learn HTML, examples (step pairs),
  checks `[q, correct, [wrong], why]`, gens/only (generator ids), showMe, optional `write` and `passage`).
- **Grade weights:** `grade()` in `app.js` (quizzes 40%, exit tickets 20%, Ascend 20%, post 20%; pre-tests are not graded).
- **State key:** `localStorage['jaguarAscendHub.v2']`. The Parent Portal exports and imports it as JSON.
- Keep the copyright headers and the credit line "Designed and created by Dr. Richard G. Clark".

## 6. Native apps (optional, for later)
See `tutoring-hub-app/APP-BUILD.md`. Steps: `npm install`, `npm run sync`, then Android Studio (`npm run android`) or Xcode
on a Mac (`npm run ios`). App ID: `com.drrichardclark.jaguarascend`. The Android launcher-icon bug is already fixed.
For any **commercial/store** release, replace the DeSoto Central name, mascot, colors, and staff unless the district gives
permission.

## 7. Known limits
- Progress is per device and per browser. Use Export/Import backup to move it.
- Read-aloud uses the browser's speech engine, so voices vary by device.
- Fonts load from Google Fonts online and fall back to system fonts offline.
