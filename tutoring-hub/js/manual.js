/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   MANUAL & QUICK START — in-app user manual and a printable one-page
   Quick Start sheet.
   ===================================================================== */
views.manual = (tab = 'quick') => {
  const I = id => `<svg class="mi"><use href="#${id}"/></svg>`;
  const tile = (icon, title, body, n) => `<div class="qs-tile"><div class="qs-n">${n}</div><div class="qs-ico">${icon}</div><b>${title}</b><p>${body}</p></div>`;
  const quick = `
  <div class="qs-sheet" id="qsSheet">
    <div class="qs-head">
      <div class="badge-paw"><svg><use href="#paw"/></svg></div>
      <div><div class="eyebrow">Quick Start Sheet</div><h1>Jaguar Ascend in 5 steps</h1><p class="muted">For ${esc(ST.student.name)} · Grade 9 · Algebra I · English I · Reading</p></div>
    </div>
    <div class="qs-grid">
      ${tile(I('i-home'), 'Open the app', 'Tap the purple-and-gold <b>Jaguar paw</b> on your home screen or dock. It works even offline.', 1)}
      ${tile(I('i-target'), 'Take placement', 'Three check-ins: Algebra I, English I, Reading. <b>Not graded.</b> You can pause anytime.', 2)}
      ${tile(I('i-plan'), 'Follow Today\'s mission', 'The Dashboard lists exactly what to do: Algebra (45 min), English (30), Reading (30).', 3)}
      ${tile(`<svg class="mi" style="color:var(--gold)"><use href="#paw"/></svg>`, 'Learn with Coach J', 'Coach J shows a worked example <b>first</b>. Then it\'s your turn with new numbers.', 4)}
      ${tile(I('i-report'), 'Check your Report Card', 'Every Friday: grades, growth, and the skills to practice next.', 5)}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Buttons to know</h3>
        <table class="qs-keys">
          <tr><td><span class="key">💡 Show a hint</span></td><td>A nudge when you're stuck. Hints never cost points.</td></tr>
          <tr><td><span class="key">🔊 Read to me</span></td><td>Reads the question or passage aloud.</td></tr>
          <tr><td><span class="key">Walk me through it</span></td><td>Coach J solves <i>your</i> missed problem step by step.</td></tr>
          <tr><td><span class="key">Try a similar one</span></td><td>A fresh problem of the same kind, right away.</td></tr>
          <tr><td><span class="key">☆ Flag</span></td><td>Mark a test question to come back to.</td></tr>
          <tr><td><span class="key">Pause</span></td><td>Stop a test and resume later. Your time and answers are saved.</td></tr>
          <tr><td><span class="key">⚡ Smart Review</span></td><td>10 questions on your weakest skills.</td></tr>
        </table></div>
      <div class="card"><h3>Study tools <span class="small muted">(bottom right)</span></h3>
        <div class="qs-tools">
          <div>${I('i-calc')}<b>Calculator</b><span>Powers ^ and √</span></div>
          <div>${I('i-formula')}<b>Formula sheet</b><span>Slope, exponents, quadratics</span></div>
          <div>${I('i-read')}<b>Writer's guide</b><span>Commas, theme, RACE</span></div>
          <div>${I('i-clock')}<b>Focus timer</b><span>25-min sessions</span></div>
        </div>
        <p class="small muted" style="margin:10px 0 0">🔒 Tools lock during tests, just like at school.</p>
        <h3 style="margin-top:14px">Your weekly rhythm</h3>
        <p class="small" style="margin:0"><b>Mon</b> lesson · <b>Tue</b> finish + exit ticket · <b>Wed</b> skill practice · <b>Thu</b> Smart Review · <b>Fri</b> unit quiz<br>≈ 1 hr 45 min a day · 7 hrs a week · 18 weeks</p></div>
    </div>
    <div class="callout small qs-foot"><b>Parents:</b> the Parent Portal (sidebar) is protected by a PIN. Default is <b>1234</b>; change it on your first visit. Export a backup weekly.<br>Designed and created by Dr. Richard G. Clark · © ${new Date().getFullYear()} All rights reserved.</div>
  </div>`;
  const sec = (icon, title, html) => `<section class="card man-sec"><div class="row"><div class="subj-ico" style="--c:var(--purple-ink)">${icon}</div><h2 style="margin:0">${title}</h2></div><div class="man-body">${html}</div></section>`;
  const manual = `
  ${sec(I('i-home'), '1. Installing and opening', `<p>Jaguar Ascend is a web app that installs like a regular app, with no app store or account.</p>
    <ul><li><b>iPhone/iPad:</b> open the link in Safari → Share → <b>Add to Home Screen</b>.</li><li><b>Android:</b> open the link in Chrome → menu ⋮ → <b>Install app</b>.</li><li><b>Mac:</b> Safari → <b>File → Add to Dock</b>, or the install icon in Chrome's address bar.</li><li><b>Windows:</b> Chrome or Edge → install icon in the address bar → pin to taskbar.</li></ul>
    <p>The app opens with a splash screen, then the Dashboard. After the first visit it works offline.</p>`)}
  ${sec(I('i-target'), '2. Placement assessment', `<p>Before any lessons, Zeke takes three check-ins so Coach J knows where to start. Lessons, practice, and quizzes unlock when all three are done.</p>
    <table><tr><th>Check-in</th><th>Questions</th><th>Time</th></tr><tr><td>Algebra I</td><td>32, every unit</td><td>45 min</td></tr><tr><td>English I</td><td>32, every unit</td><td>40 min</td></tr><tr><td>Reading</td><td>3 passages, ~30 questions</td><td>50 min</td></tr></table>
    <p>They are <b>not graded</b>. Afterward, the <b>Placement Report</b> marks each unit <span class="tag-m">Strong</span>, <span class="tag-d">Developing</span>, or <span class="tag-n">Start here</span>. The optional <b>Ascend Baseline</b> sets the starting line for measuring growth.</p>`)}
  ${sec(I('i-plan'), '3. The Dashboard and Today\'s mission', `<p>The Dashboard shows the week (1–18), the daily streak, lessons completed, study time, and <b>Today's mission</b>: one task per subject, chosen by the day of the week. <b>Focus skills</b> lists the three lowest-scoring skills in each subject, each with a Practice button.</p>`)}
  ${sec(I('i-lessons'), '4. Lessons with Coach J', `<p>Each lesson has five timed steps:</p>
    <ol class="step-list"><li><b>Warm-up</b>: three quick review questions.</li><li><b>Learn (I do)</b>: Coach J's notes, key vocabulary, and worked examples typed out step by step.</li><li><b>Together (We do)</b>: quick checks, then Coach J demonstrates a problem before Zeke tries one.</li><li><b>On your own (You do)</b>: independent practice with hints.</li><li><b>Exit ticket and Show me</b>: five graded questions, plus a short written explanation (and a writing task in English).</li></ol>
    <p>Progress saves automatically. Lessons can be paused and continued.</p>`)}
  ${sec(I('i-practice'), '5. Practice and Smart Review', `<p>Practice is untimed, with hints and instant feedback, and it never lowers a grade. For each new type of problem Coach J solves one first (<b>Watch me</b>), then hands it over (<b>My turn</b>). A missed question offers <b>Walk me through it</b> and <b>Try a similar one</b>. <b>Smart Review</b> builds a 10-question set from the weakest skills.</p>`)}
  ${sec(I('i-tests'), '6. Tests and the Ascend', `<table><tr><th>Assessment</th><th>When</th><th>Counts toward grade</th></tr><tr><td>Placement (pre-tests)</td><td>Week 1</td><td>No, diagnostic only</td></tr><tr><td>Exit tickets (45)</td><td>End of each lesson</td><td>20%</td></tr><tr><td>Unit quizzes (24)</td><td>End of each unit</td><td>40%, best score counts</td></tr><tr><td>The Ascend (combined exam)</td><td>Weeks 1, 9, 18</td><td>20%</td></tr><tr><td>Post-assessments</td><td>Week 17</td><td>20%</td></tr></table>
    <p>Tests are timed, tools lock, and answers appear only after submitting. Use <b>☆ Flag</b> to mark questions and <b>Pause</b> to stop and resume later. Correct answers are spread evenly across A–D, so guessing one letter doesn't pay off.</p>`)}
  ${sec(I('i-report'), '7. Report Card', `<p>Letter grades (A 90 · B 80 · C 70 · D 65 · F below 65), category scores, growth from placement to post-test, unit quiz results, and mastery for every standard (<span class="tag-m">80%+ mastered</span>, <span class="tag-d">60–79% developing</span>, <span class="tag-n">below 60% needs support</span>). Use <b>Print / Save PDF</b> to share it.</p>`)}
  ${sec(I('i-parent'), '8. Parent Portal', `<p>PIN-protected (default <b>1234</b>). Here you can:</p><ul><li>Change the PIN, the student name, and the plan start date.</li><li>Turn on <b>extended time</b> (1.5×), read-aloud, or a calculator on Algebra tests.</li><li>Edit the school team contacts.</li><li>Score Zeke's writing and "Show me" answers (4-point rubric) and leave feedback.</li><li>Add report card comments.</li><li><b>Export / Import backups</b> to protect or move progress.</li></ul>`)}
  ${sec(I('i-guide'), '9. Tips and troubleshooting', `<ul><li><b>Progress is per device.</b> Pick one main device, and use Export/Import to move between devices.</li><li><b>Closed the app mid-test?</b> The test is paused automatically. Tap <b>Resume test</b> on the Dashboard.</li><li><b>Something looks out of date?</b> Close and reopen the app once to load the newest version.</li><li><b>Mastery rule:</b> 80%+ means move on. 60–79% means one more practice set. Below 60% means redo the lesson's Learn and Together steps, then retake.</li><li><b>Best habit:</b> short, daily sessions beat long weekend ones.</li></ul>`)}
  <p class="small muted" style="margin-top:16px">Jaguar Ascend · Designed and created by Dr. Richard G. Clark · Copyright © ${new Date().getFullYear()} Dr. Richard G. Clark. All rights reserved.</p>`;
  $('#app').innerHTML = `<div class="page-head noprint"><div><div class="eyebrow">Manual &amp; Quick Start</div><h1>${tab === 'quick' ? 'Quick Start Sheet' : 'User Manual'}</h1></div><button class="btn" onclick="print()">Print / Save PDF</button></div>
    <div class="seg noprint"><button class="${tab === 'quick' ? 'on' : ''}" data-m="quick">Quick Start Sheet</button><button class="${tab === 'full' ? 'on' : ''}" data-m="full">Full Manual</button></div>
    ${tab === 'quick' ? quick : manual}`;
  $$('[data-m]').forEach(b => b.onclick = () => { views.manual(b.dataset.m); $$('#tabs button').forEach(x => x.classList.toggle('on', x.dataset.view === 'manual')); });
};
