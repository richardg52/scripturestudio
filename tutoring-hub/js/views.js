/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   VIEWS — dashboard, plan, lessons, practice, tests, report card, tutor
   ===================================================================== */
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK_EVENTS = { 1: 'Diagnostics: 3 pre-assessments + Ascend Baseline', 9: 'The Ascend — Checkpoint', 17: 'Post-assessments', 18: 'The Ascend — Final & Semester Report Card' };

/* ---------------- DASHBOARD ---------------- */
const ICON = { math: 'i-math', eng: 'i-eng', read: 'i-read' };
const ico = (id, cls = '') => `<svg class="${cls}"><use href="#${id}"/></svg>`;
function ring(p, color, size = 84) {
  const r = size / 2 - 8, C = 2 * Math.PI * r, v = p == null ? 0 : Math.max(0, Math.min(100, p)), c = size / 2;
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${p == null ? 'no data' : p + ' percent'}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="8"/><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - v / 100)).toFixed(1)}" transform="rotate(-90 ${c} ${c})"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="#fff" font-size="17">${p == null ? '0%' : p + '%'}</text></svg>`;
}
const RING_C = { math: '#8fb0ff', eng: '#ff9fd6', read: '#5fe3bd' };
function overallMastery() { const all = SUBJS.flatMap(s => Object.values(mastery(s))); const t = all.reduce((a, x) => a + x.t, 0); return t ? Math.round(all.reduce((a, x) => a + x.c, 0) / t * 100) : null; }
views.home = () => {
  const w = weekNo(), day = new Date().getDay();
  const preDone = SUBJS.filter(s => latest('pre', s)).length, ascDone = ST.results.some(r => r.kind === 'ascend'), diagDone = preDone + (ascDone ? 1 : 0);
  const t = ST.team, lessonsDone = s => HUB.lessons.filter(l => l.subj === s && ST.lessons[l.id]?.done).length, lessonsAll = s => HUB.lessons.filter(l => l.subj === s).length;
  const minsW = SUBJS.reduce((a, s) => a + minsWeek(s), 0), goalW = SUBJS.reduce((a, s) => a + SUBJ[s].goal, 0);
  const practiced = ST.log.filter(a => a.m === 'practice').length, om = overallMastery();
  const coachMsg = diagDone < 4
    ? `Hi ${esc(first())}, I'm <b>Coach J</b>, your personal tutor. I'll show you how every kind of problem works, step by step, before you ever try one alone. First, let's see what you already know. Take the Week 1 check-ins below. They're <b>not graded</b>.`
    : `${motto()} Today's mission is below. I'll walk you through each new skill first, then it's your turn.`;
  $('#app').innerHTML = `
  ${ST.inProgress ? `<div class="callout warn row between"><span>⏸ Paused test: <b>${esc(ST.inProgress.title)}</b> · ${Math.ceil(ST.inProgress.remaining / 60000)} min left</span><button class="btn primary sm" id="resume">Resume test</button></div>` : ''}
  <section class="hero">
    <div style="position:relative;z-index:1">
      <div class="row"><span class="pill gold">Week ${w} of ${WEEKS}</span>${WEEK_EVENTS[w] ? `<span class="pill">${WEEK_EVENTS[w]}</span>` : ''}</div>
      <h1>${greeting()}, ${esc(first())}.</h1>
      ${coachSays(coachMsg)}
      <div class="row">${diagDone < 4 ? `<button class="btn gold lg" id="startDiag">Start Week 1 check-ins (${diagDone}/4)</button>` : `<button class="btn gold lg" id="goMission">Start today's mission</button>`}<button class="btn lg" style="background:rgba(255,255,255,.12);color:#fff;border-color:rgba(255,255,255,.2)" onclick="go('plan')">View my plan</button></div>
    </div>
    <div class="hero-rings">${SUBJS.map(s => `<div class="ringbox">${ring(Math.round(lessonsDone(s) / lessonsAll(s) * 100), RING_C[s])}<b>${SUBJ[s].name}</b><span>${lessonsDone(s)}/${lessonsAll(s)} lessons</span></div>`).join('')}</div>
  </section>

  <div class="kpis">
    <div class="kpi"><div class="ico">${ico('i-target')}</div><div><b>${om == null ? '—' : om + '%'}</b><span>Overall mastery</span></div></div>
    <div class="kpi"><div class="ico" style="background:var(--gold-soft);color:var(--gold-ink)">${ico('i-clock')}</div><div><b>${minsW}<small class="muted" style="font-size:.8rem"> / ${goalW} min</small></b><span>Study time this week</span></div></div>
    <div class="kpi"><div class="ico" style="background:var(--good-soft);color:var(--good)">${ico('i-practice')}</div><div><b>${practiced}</b><span>Practice questions</span></div></div>
    <div class="kpi"><div class="ico" style="background:#ffe9d6;color:#e0711a">${ico('i-flame')}</div><div><b>${ST.streak.count} day${ST.streak.count === 1 ? '' : 's'}</b><span>Streak · best ${ST.streak.best}</span></div></div>
  </div>

  <div class="dash-grid">
    <div>
      ${diagDone < 4 ? `<div class="card" id="diagCard" style="margin-bottom:18px"><div class="row between"><h2>Week 1 check-ins</h2><span class="pill gold">${diagDone}/4 done</span></div><p class="muted">These show Coach J exactly where to start. Do your best and skip nothing. A low score is fine; it just tells us what to teach.</p>
        <div class="mission">${SUBJS.map(s => `<div class="mission-item ${latest('pre', s) ? 'done' : ''}" style="--c:${SUBJ[s].c}"><div class="sico">${ico(ICON[s])}</div><div><b>${SUBJ[s].name} pre-assessment</b><div class="meta">${s === 'read' ? '3 short passages' : '32 questions'} · about ${TIME.pre[s]} min · not graded</div></div><div class="row"><button class="btn sm ${latest('pre', s) ? 'done' : 'primary'}" data-pre="${s}">${latest('pre', s) ? '✓ Done' : 'Begin'}</button></div></div>`).join('')}
        <div class="mission-item ${ascDone ? 'done' : ''}" style="--c:var(--all)"><div class="sico">${ico('i-trophy')}</div><div><b>The Ascend: Baseline</b><div class="meta">All three subjects together · 75 min · your starting line</div></div><div class="row"><button class="btn sm ${ascDone ? 'done' : 'primary'}" id="ascBase">${ascDone ? '✓ Done' : 'Begin'}</button></div></div></div></div>` : ''}
      <div class="card" id="missionCard"><div class="row between"><h2>Today's mission · ${DAYS[day]}</h2><span class="small muted">≈ ${SUBJS.reduce((a, s) => a + SUBJ[s].mins.reduce((x, y) => x + y, 0), 0)} minutes</span></div>
        <div class="mission">${SUBJS.map(s => missionItem(s, w, day)).join('')}</div></div>
      <h2 class="sec">Focus skills <span class="small muted">Coach J's picks: your lowest-scoring skills right now</span></h2>
      <div class="grid g3">${SUBJS.map(s => { const wk = weakest(s, 3); return `<div class="card subj-card" style="--c:${SUBJ[s].c}"><div class="row"><div class="subj-ico" style="--c:${SUBJ[s].c}">${ico(ICON[s])}</div><h3 style="margin:0">${SUBJ[s].name}</h3></div>${wk.length ? wk.map(x => `<div class="focus"><span><b>${x.std}</b> ${HUB.std[x.std]}</span><span class="tag-${x.p >= 60 ? 'd' : 'n'}">${x.p}%</span><button class="btn sm" data-prac="${s}|${x.std}">Practice</button></div>`).join('') : '<p class="small muted" style="margin-top:10px">Take the pre-assessment and Coach J will find your focus skills.</p>'}
        <button class="btn sm ghost" data-smart="${s}" style="margin-top:8px">⚡ Smart Review</button></div>`; }).join('')}</div>
    </div>
    <aside>
      <div class="card team">
        <div class="team-head"><div class="badge-paw"><svg><use href="#paw"/></svg></div><div><b>My DeSoto Central Team</b><div class="small muted">Jaguars · Purple &amp; Gold</div></div></div>
        <dl>
          <dt>Principal</dt><dd>${esc(t.principal) || '<span class="muted">—</span>'}</dd>
          <dt>Asst. Principal(s)</dt><dd>${esc(t.aps) || '<span class="muted">—</span>'}</dd>
          <dt>Counselor</dt><dd>${esc(t.counselor) || '<span class="muted">—</span>'}</dd>
          <dt>Algebra I</dt><dd>${esc(t.mathTeacher) || '<span class="muted">—</span>'}</dd>
          <dt>English I</dt><dd>${esc(t.engTeacher) || '<span class="muted">—</span>'}</dd>
          <dt>Mentor</dt><dd>${esc(t.tutor) || '<span class="muted">—</span>'}</dd>
        </dl>
        <p class="small muted" style="margin:0">2911 Central Parkway, Southaven, MS 38672 · (662) 536-3612<br>Edit names in the Parent Portal.</p>
      </div>
      <div class="card"><h3>This week's study time</h3>${SUBJS.map(s => { const m = minsWeek(s), g = SUBJ[s].goal; return `<div style="margin:12px 0"><div class="row between small"><b>${SUBJ[s].name}</b><span class="muted">${m} / ${g} min</span></div><div class="bar" style="--c:${SUBJ[s].c}"><i style="width:${Math.min(100, Math.round(m / g * 100))}%"></i></div></div>`; }).join('')}<p class="small muted" style="margin:0">Tracked automatically while you work.</p></div>
      <div class="card"><h3>Current grades</h3>${SUBJS.map(s => { const g = grade(s); return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line)"><span>${SUBJ[s].name}</span><span class="grade-chip">${letter(g.pct)}</span></div>`; }).join('')}<button class="btn sm ghost" onclick="go('report')" style="margin-top:8px">Open report card →</button></div>
    </aside>
  </div>`;
  const on = (sel, fn) => $$(sel).forEach(b => b.onclick = () => fn(b));
  on('[data-pre]', b => startTest('pre', b.dataset.pre));
  on('#ascBase', () => startTest('ascend'));
  on('#resume', () => resumeTest());
  on('#startDiag', () => $('#diagCard').scrollIntoView({ behavior: 'smooth' }));
  on('#goMission', () => $('#missionCard').scrollIntoView({ behavior: 'smooth' }));
  on('[data-prac]', b => { const [s, std] = b.dataset.prac.split('|'); practiceStd(s, std); });
  on('[data-smart]', b => smartReview(b.dataset.smart));
  on('[data-lesson]', b => openLesson(b.dataset.lesson));
  on('[data-quiz]', b => { const [s, u] = b.dataset.quiz.split('|'); startTest('quiz', s, +u); });
  on('[data-weekprac]', b => { const l = HUB.lessons.find(x => x.id === b.dataset.weekprac); startPractice(l.subj, l.subj === 'read' ? { items: () => pickReading(10, { stds: l.stds }) } : l.gens ? { ids: l.gens } : l.only ? { ids: l.only } : { stds: l.stds }, `This week: ${l.title}`); });
  on('[data-post]', b => startTest('post', b.dataset.post));
  on('[data-ascend]', () => startTest('ascend'));
  if (!ST.seenWelcome) welcome();
};
function missionItem(s, w, day) {
  const l = lessonFor(s, w), st = l ? ST.lessons[l.id] || {} : {}, mins = SUBJ[s].mins.reduce((a, b) => a + b, 0);
  const qUnit = HUB.units[s].find(u => quizWeek(s, u.n) === w);
  let title, sub, btn;
  if (w === 17) { title = `${SUBJ[s].name} post-assessment`; sub = 'Unseen passages and new questions. This measures your growth.'; btn = `<button class="btn primary sm" data-post="${s}">${latest('post', s) ? 'Retake' : 'Begin'}</button>`; }
  else if (w === 18 || w === 9) { title = 'The Ascend'; sub = 'All three subjects. Then Smart Review on anything below 70%.'; btn = `<button class="btn primary sm" data-ascend="1">Begin</button>`; }
  else if (day === 5 && qUnit) { title = `Unit ${qUnit.n} Quiz: ${qUnit.title}`; sub = `10 questions · ${TIME.quiz[s]} min · best score counts`; btn = `<button class="btn primary sm" data-quiz="${s}|${qUnit.n}">Take quiz</button>`; }
  else if (day === 0 || day === 6) { title = 'Smart Review (optional)'; sub = 'Weekend boost: 10 questions on your weakest skills'; btn = `<button class="btn primary sm" data-smart="${s}">Start</button>`; }
  else if (l && (day === 1 || day === 2 || !st.done)) { title = l.title; sub = `Lesson with Coach J · Step ${Math.min(5, (st.stage || 0) + 1)} of 5 · ${mins} min`; btn = `<button class="btn primary sm" data-lesson="${l.id}">${st.done ? 'Review' : st.stage ? 'Continue' : 'Start lesson'}</button>`; }
  else if (day === 3 && l) { title = `Skill practice: ${l.title}`; sub = 'Coach J demonstrates, then you try 10'; btn = `<button class="btn primary sm" data-weekprac="${l.id}">Start</button>`; }
  else { title = 'Smart Review'; sub = 'Targets your weakest skills'; btn = `<button class="btn primary sm" data-smart="${s}">Start</button>`; }
  return `<div class="mission-item ${st.done && l && title === l.title ? 'done' : ''}" style="--c:${SUBJ[s].c}"><div class="sico">${ico(ICON[s])}</div><div><span class="small" style="color:${SUBJ[s].c};font-weight:800">${SUBJ[s].name.toUpperCase()}</span><br><b>${esc(title)}</b><div class="meta">${sub}</div></div><div class="row">${st.done && l ? '<span class="pill ok">Lesson ✓</span>' : ''}${btn}</div></div>`;
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function motto() { return pick(['Every expert was once a beginner. Today you add one more skill.', 'Small steps every day beat one big push on the weekend.', 'Mistakes are information. Read the explanation, then try again.', 'You don\'t have to be great to start, but you have to start to be great.', 'Jaguars don\'t quit. Neither do you.']); }
function welcome() {
  const d = document.createElement('div'); d.className = 'modal';
  d.innerHTML = `<div class="card modal-card"><div class="row"><div class="badge-paw" style="width:64px;height:64px;border-radius:20px"><svg style="width:38px;height:38px"><use href="#paw"/></svg></div><div><div class="eyebrow">Jaguar Ascend Hub</div><h2 style="margin:0">Welcome, ${esc(first())}!</h2></div></div>
  ${coachSays(`I'm <b>Coach J</b>, your personal tutor for <b>Algebra I</b>, <b>English I</b> and <b>Reading</b>. Here's how we'll work together:`)}
  <ol class="step-list"><li><b>I show you first.</b> For every new kind of problem, I solve one step by step while you watch.</li><li><b>Then it's your turn</b> with new numbers. If you miss it, we walk through <i>your</i> problem together and try a similar one.</li><li><b>Follow "Today's mission"</b> on the dashboard, about 1 hour 45 minutes a day.</li><li><b>Tests show your growth.</b> Tools lock during tests, and your report card updates automatically.</li></ol>
  <p class="small muted">Parents: the Parent Portal is PIN-protected (default <b>1234</b>; change it there).<br>Designed and created by Dr. Richard G. Clark · © ${new Date().getFullYear()} All rights reserved.</p>
  <button class="btn primary lg" id="wcl">Let's go</button></div>`;
  document.body.appendChild(d); d.querySelector('#wcl').onclick = () => { ST.seenWelcome = true; save(); d.remove(); };
}

/* ---------------- SEMESTER PLAN ---------------- */
views.plan = () => {
  const w = weekNo();
  const cell = (s, wk) => {
    if (wk === 9) return `<span class="pill gold">Ascend Checkpoint</span><div class="small muted">Re-teach weakest unit</div>`;
    if (wk === 17) return `<span class="pill">Post-assessment</span><div class="small muted">Review all units</div>`;
    if (wk === 18) return `<span class="pill gold">Ascend Final</span>`;
    const l = lessonFor(s, wk); if (!l) return '';
    const st = ST.lessons[l.id] || {}, q = HUB.units[s].find(u => quizWeek(s, u.n) === wk), qb = q ? best('quiz', s, q.n) : null;
    return `<a href="#" data-lesson="${l.id}">${esc(l.title)}</a> ${st.done ? `<span class="pill ok">✓ ${st.exitPct}%</span>` : ''}<div class="small muted">${l.stds.join(', ')}</div>${wk === 1 ? '<span class="pill">Pre-test</span> ' : ''}${q ? `<a href="#" class="pill quiz" data-quiz="${s}|${q.n}">Unit ${q.n} Quiz${qb != null ? ' · ' + qb + '%' : ''}</a>` : ''}`;
  };
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">My Semester Plan</div><h1>18 weeks to the Ascend</h1></div></div>
  <p class="muted">Sequenced to the Mississippi College &amp; Career Readiness Standards for Algebra I and Grade 9 English Language Arts. Because ${esc(first())} is rebuilding skills, Algebra begins with a 3-week Foundations Bootcamp and English with Grammar Foundations before grade-level content. Plan start: <b>${new Date(ST.student.start + 'T00:00:00').toLocaleDateString()}</b> (change in Tutor view).</p>
  <div class="grid g4" style="margin:16px 0">
    <div class="card"><b>Weekly time goal</b><p class="small">Algebra I 180 min · English 120 · Reading 120 (≈ 7 hours / week)</p></div>
    <div class="card"><b>Daily rhythm</b><p class="small">Mon: lesson (Learn + We do) · Tue: finish lesson + exit ticket · Wed: skill practice · Thu: Smart Review · Fri: unit quiz or review</p></div>
    <div class="card"><b>Assessments</b><p class="small">3 pre-tests · 24 unit quizzes · 45 exit tickets · 3 Ascend exams · 3 post-tests</p></div>
    <div class="card"><b>Mastery rule</b><p class="small">80%+ → move on. 60–79% → extra practice set. Below 60% → re-teach the lesson, then retake (best score counts).</p></div>
  </div>
  <div class="card flush"><div class="week hd"><div>Week</div><div>Algebra I (45 min)</div><div>English I (30 min)</div><div>Reading (30 min)</div></div>
  ${Array.from({ length: WEEKS }, (_, i) => i + 1).map(wk => `<div class="week ${wk === w ? 'now' : ''} ${[9, 18].includes(wk) ? 'asc' : ''}"><div><b>Wk ${wk}</b>${wk === w ? '<br><span class="pill gold">Now</span>' : ''}</div>${SUBJS.map(s => `<div>${cell(s, wk)}</div>`).join('')}</div>`).join('')}</div>`;
  $$('[data-lesson]').forEach(a => a.onclick = e => { e.preventDefault(); openLesson(a.dataset.lesson); });
  $$('[data-quiz]').forEach(a => a.onclick = e => { e.preventDefault(); const [s, u] = a.dataset.quiz.split('|'); startTest('quiz', s, +u); });
};

/* ---------------- LESSONS ---------------- */
views.learn = (subj = 'math') => {
  const ls = HUB.lessons.filter(l => l.subj === subj).sort((a, b) => a.week - b.week);
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">Lessons with Coach J</div><h1>Learn it step by step</h1></div></div>
  ${coachSays('Every lesson works the same way. <b>Warm-up</b> → <b>Learn</b> (I explain and show worked examples) → <b>Together</b> (I demonstrate, then you try) → <b>On your own</b> → <b>Exit ticket</b>. Pick up where you left off any time.')}
  <div class="seg">${SUBJS.map(s => `<button class="${s === subj ? 'on' : ''}" data-s="${s}">${SUBJ[s].name}</button>`).join('')}</div>
  ${HUB.units[subj].map(u => { const lu = ls.filter(l => l.unit === u.n); if (!lu.length) return ''; const qb = best('quiz', subj, u.n); return `
    <div class="card unit"><div class="row between"><h3>Unit ${u.n}: ${u.title}</h3><button class="btn sm ${qb != null ? 'done' : ''}" data-quiz="${subj}|${u.n}">Unit quiz${qb != null ? ' · best ' + qb + '%' : ''}</button></div>
    ${lu.map(l => { const st = ST.lessons[l.id] || {}; return `<div class="lesson-row"><div><span class="small muted">Week ${l.week}</span><br><b>${esc(l.title)}</b><div class="small muted">${l.stds.join(' · ')}</div></div><div class="row">${st.done ? `<span class="pill ok">✓ Exit ${st.exitPct}%</span>` : st.stage ? `<span class="pill">Step ${st.stage + 1}/5</span>` : ''}<button class="btn sm primary" data-lesson="${l.id}">${st.done ? 'Review' : st.stage ? 'Continue' : 'Start'}</button></div></div>`; }).join('')}</div>`; }).join('')}`;
  $$('.seg button').forEach(b => b.onclick = () => go('learn', b.dataset.s));
  $$('[data-lesson]').forEach(b => b.onclick = () => openLesson(b.dataset.lesson));
  $$('[data-quiz]').forEach(b => b.onclick = () => { const [s, u] = b.dataset.quiz.split('|'); startTest('quiz', s, +u); });
};
function openLesson(id) {
  const l = HUB.lessons.find(x => x.id === id); if (!l) return;
  go('learn', l.subj); $('#app').innerHTML = ''; activeSubj = l.subj; touchStreak();
  const rec = ST.lessons[id] = ST.lessons[id] || {}; let st = rec.done ? 0 : rec.stage || 0;
  const mins = SUBJ[l.subj].mins;
  const prevUnitStds = () => { const u = Math.max(0, l.unit - (l.week % 2 ? 1 : 0)); return HUB.units[l.subj].filter(x => x.n <= u).flatMap(x => x.stds); };
  const practiceOpts = () => l.subj === 'read' ? { items: () => pickReading(6, { stds: l.stds, exclude: [l.passage] }) } : l.gens ? { ids: l.gens } : l.only ? { ids: l.only } : { stds: l.stds };
  const render = () => {
    rec.stage = Math.max(rec.stage || 0, st); save(); activeSubj = l.subj;
    const passage = l.passage ? HUB.passages[l.passage] : null;
    const body = [
      `<h3>Warm-up <span class="muted small">· ${mins[0]} min</span></h3><p>Three quick questions to wake up your brain${l.week > 1 ? ' and review earlier skills' : ''}. Hints are on.</p><div id="lessonRun"></div>`,
      `<h3>Learn <span class="muted small">· ${mins[1]} min</span></h3>
       ${coachSays(`Today's goal: <b>${l.objective.replace(/^I can /, 'you will be able to ')}</b> Read my notes, then click through the worked examples. I'll explain every step.`)}
       ${l.vocab ? `<details open class="vocab"><summary><b>Key vocabulary</b></summary><dl>${l.vocab.map(v => `<dt>${v[0]}</dt><dd>${v[1]}</dd>`).join('')}</dl></details>` : ''}
       <div class="learn" id="learnTxt">${l.learn}</div>${speakBtn('learnTxt', 'Read the notes to me')}
       ${passage ? `<div class="passage"><div class="row between"><h4>${passage.title} <span class="pill">${passage.kind}</span></h4>${speakBtn('lpsg', 'Read passage')}</div><div class="psgbody" id="lpsg">${passage.html}</div></div>` : ''}
       ${l.model ? `<div class="model"><h4>👀 Watch me think (modeled reading)</h4>${l.model}</div>` : ''}
       ${(l.examples || []).map((ex, i) => `<div class="example walk"><div class="row between"><span class="tag">▶ Watch me: ${ex.title}</span>${speakBtn('ex' + i, 'Read steps')}</div><ol class="wsteps" id="ex${i}"></ol><button class="btn primary sm" data-ex="${i}">Show first step</button></div>`).join('')}`,
      `<h3>Together <span class="muted small">· ${mins[2]} min</span></h3>${coachSays('Quick checks first. Tap an answer and I\'ll tell you right away why it\'s right or wrong.')}
       <div id="checks">${l.checks.map((c, i) => { const ch = shuffle([c[1], ...c[2]]); return `<div class="check" data-i="${i}"><p><b>${i + 1}.</b> ${c[0]}</p><div class="choices">${ch.map(x => `<button class="choice" data-v="${esc(x)}"><span>${x}</span></button>`).join('')}</div><div class="feedback"></div></div>`; }).join('')}</div>
       <h4 style="margin-top:22px">${l.subj === 'read' ? 'Guided practice on the passage: I go first, then you' : 'Guided practice: I go first, then you'}</h4><div id="lessonRun"></div>`,
      `<h3>On your own <span class="muted small">· ${mins[3]} min</span></h3><p>${l.subj === 'math' ? 'New numbers every time. Calculator and formula sheet are allowed. Try first, then use a hint if stuck.' : l.subj === 'read' ? 'Apply the skill to NEW passages.' : 'Apply the skill. Use a hint if you get stuck.'}</p><div id="lessonRun"></div>`,
      `<h3>Exit ticket <span class="muted small">· ${mins[4]} min</span></h3><p>Five questions, graded and saved to the report card. Tools are locked.${rec.exitPct != null ? ` Best so far: <b>${rec.exitPct}%</b>.` : ''}</p>
       <button class="btn primary" id="exitBtn">${rec.done ? 'Retake exit ticket' : 'Start exit ticket'}</button>
       ${l.write ? `<div class="write"><h3>✍️ Write it</h3><p>${l.write.prompt}</p><textarea id="wr" rows="6" placeholder="Start writing…">${esc(lastWriting(l.id, 'write'))}</textarea><div class="checklist" id="wrChk"></div><button class="btn sm" id="wrSave">Save writing</button> <span class="small muted" id="wrMsg"></span></div>` : ''}
       <div class="write"><h3>🗣️ Show me what you know</h3><p>${l.showMe}</p><textarea id="sm" rows="4" placeholder="Explain in your own words…">${esc(lastWriting(l.id, 'showme'))}</textarea><button class="btn sm" id="smSave">Save</button> <span class="small muted" id="smMsg"></span></div>`
    ][st];
    $('#crumb').innerHTML = `Lessons <span>· ${esc(l.title)}</span>`;
    $('#app').innerHTML = `<button class="btn sm ghost" onclick="go('learn','${l.subj}')">← All ${SUBJ[l.subj].name} lessons</button>
      <div class="lesson-head"><span class="pill ${l.subj}">${SUBJ[l.subj].name} · Week ${l.week} · Unit ${l.unit}</span><h1>${esc(l.title)}</h1><div class="small muted">MS CCRS ${l.stds.join(', ')} · ${mins.reduce((a, b) => a + b, 0)} minutes</div></div>
      <div class="stagebar">${STAGES.map((n, k) => `<button class="${k < st ? 'done' : k === st ? 'on' : ''}" data-st="${k}" data-n="${k + 1}">${k + 1}. ${n}</button>`).join('')}</div>
      <div class="card lesson-body">${body}</div>
      <div class="row between navrow"><button class="btn" id="lPrev" ${st === 0 ? 'disabled' : ''}>← Back</button><button class="btn primary" id="lNext" ${st === 4 ? 'disabled' : ''}>Next step →</button></div>`;
    $$('.stagebar button').forEach(b => b.onclick = () => { st = +b.dataset.st; render(); });
    $('#lPrev').onclick = () => { st--; render(); scrollTo(0, 0); }; $('#lNext').onclick = () => { st++; render(); scrollTo(0, 0); };
    if (st === 0) { const stds = prevUnitStds(); const mk = () => startRun({ kind: 'practice', subj: l.subj, title: 'Warm-up', host: '#lessonRun', noCoach: true, items: l.subj === 'read' ? pickReading(3, { stds: HUB.units.read[0].stds.concat(l.stds) }) : spread(l.subj, 3, stds) }); mk(); RUN.again = mk; }
    if (st === 1) (l.examples || []).forEach((ex, i) => { let k = 0, busy = false; const btn = $(`[data-ex="${i}"]`); btn.onclick = () => { if (busy || k >= ex.steps.length) return; busy = true; const li = document.createElement('li'); if (k === ex.steps.length - 1) li.className = 'ans'; $('#ex' + i).appendChild(li); typeStep(li, `<span class="muted">${ex.steps[k][0]}</span><br><span class="math">${ex.steps[k][1]}</span>`, () => { busy = false; btn.textContent = 'Next step →'; if (k >= ex.steps.length) btn.replaceWith(Object.assign(document.createElement('span'), { className: 'pill ok', textContent: '✓ Example complete' })); }); k++; }; });
    if (st === 2) {
      $$('.check').forEach(div => { const c = l.checks[+div.dataset.i]; div.querySelectorAll('.choice').forEach(b => b.onclick = () => { const ok = b.dataset.v === esc(c[1]); div.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (x.dataset.v === esc(c[1])) x.classList.add('right'); }); if (!ok) b.classList.add('wrong'); div.querySelector('.feedback').innerHTML = `<div class="callout ${ok ? 'good' : 'bad'} small"><b>${ok ? 'Correct.' : 'Not quite.'}</b> ${c[3]}</div>`; }); });
      const mk = () => startRun({ kind: 'practice', subj: l.subj, title: 'Guided practice', host: '#lessonRun', items: l.subj === 'read' ? pickReading(3, { passages: [l.passage] }) : pickFrom(l.subj, 3, practiceOpts()) }); mk(); RUN.again = mk;
    }
    if (st === 3) { const o = practiceOpts(); const mk = () => startRun({ kind: 'practice', subj: l.subj, title: 'Independent practice', host: '#lessonRun', items: o.items ? o.items() : pickFrom(l.subj, 8, o) }); mk(); RUN.again = mk; }
    if (st === 4) {
      $('#exitBtn').onclick = () => startRun({ kind: 'exit', subj: l.subj, title: `Exit Ticket: ${l.title}`, items: BLUEPRINT.exit(l), lessonId: l.id });
      if (l.write) { const upd = () => { const t = $('#wr').value; $('#wrChk').innerHTML = l.write.checklist.map(([lab, re]) => `<div>${new RegExp(re, 'i').test(t) ? '<b class="tag-m">✓</b>' : '<span class="muted">○</span>'} ${lab}</div>`).join(''); }; $('#wr').oninput = upd; upd();
        $('#wrSave').onclick = () => { saveWriting(l, 'write', $('#wr').value, l.write.prompt); $('#wrMsg').textContent = 'Saved. Your parent or teacher can review it in the Parent Portal.'; }; }
      $('#smSave').onclick = () => { saveWriting(l, 'showme', $('#sm').value, l.showMe); $('#smMsg').textContent = 'Saved. Your parent or teacher can review it in the Parent Portal.'; };
    }
  };
  render();
}
function lastWriting(lessonId, type) { const w = ST.writing.filter(x => x.lessonId === lessonId && x.type === type); return w.length ? w[w.length - 1].text : ''; }
function saveWriting(l, type, text, prompt) { text = text.trim(); if (!text) return; ST.writing.push({ id: Date.now(), date: new Date().toISOString(), lessonId: l.id, lesson: l.title, subj: l.subj, type, prompt, text, score: null, comment: '' }); save(); }

/* ---------------- PRACTICE ---------------- */
views.practice = (subj = 'math') => {
  const m = mastery(subj);
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">Practice with Coach J</div><h1>Build mastery, one skill at a time</h1></div></div>
  ${coachSays('Pick a skill. For each new type of problem I\'ll <b>solve one first while you watch</b>, then you try one with new numbers. Hints are always on, and practice never lowers your grade.')}
  <div class="seg">${SUBJS.map(s => `<button class="${s === subj ? 'on' : ''}" data-s="${s}">${SUBJ[s].name}</button>`).join('')}</div>
  <div class="card"><div class="row"><button class="btn primary" id="smart">⚡ Smart Review — my weakest skills</button><button class="btn" id="mixed">Mixed review (all units so far)</button></div>
  <p class="small muted" style="margin-top:8px">${subj === 'math' ? `Algebra I problems are generated fresh every time from ${HUB.math.length} problem types, so you will not see the same question twice.` : subj === 'eng' ? `${HUB.engCount}+ English I questions across grammar, punctuation, vocabulary, and writing.` : `${HUB.readCount} questions on ${Object.values(HUB.passages).filter(p => !p.reserved).length} passages. Some post-test passages are kept secret so the post-test is fair.`}</p></div>
  ${HUB.units[subj].map(u => `<div class="card unit"><h3>Unit ${u.n}: ${u.title}</h3><div class="skills">${u.stds.map(s => { const x = m[s]; const p = x && x.t ? Math.round(x.c / x.t * 100) : null; return `<button class="skill" data-std="${s}"><b>${s}</b><span>${HUB.std[s]}</span><em class="${p == null ? '' : p >= 80 ? 'tag-m' : p >= 60 ? 'tag-d' : 'tag-n'}">${p == null ? 'not started' : p + '% (last ' + x.t + ')'}</em></button>`; }).join('')}</div></div>`).join('')}`;
  $$('.seg button').forEach(b => b.onclick = () => go('practice', b.dataset.s));
  $$('[data-std]').forEach(b => b.onclick = () => practiceStd(subj, b.dataset.std));
  $('#smart').onclick = () => smartReview(subj);
  $('#mixed').onclick = () => { const stds = HUB.units[subj].filter(u => u.n <= currentUnit(subj)).flatMap(u => u.stds); startPractice(subj, { items: () => subj === 'read' ? pickReading(10, { stds }) : spread(subj, 10, stds) }, `Mixed review: ${SUBJ[subj].name}`); };
};

/* ---------------- TESTS ---------------- */
views.tests = () => {
  const card = (label, sub, btn, score, cls = '') => `<div class="card test-card ${cls}"><div><b>${label}</b><div class="small muted">${sub}</div></div><div class="row">${score != null ? `<span class="grade-chip">${score}%</span>` : ''}${btn}</div></div>`;
  const asc = ST.results.filter(r => r.kind === 'ascend');
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">Tests &amp; the Ascend</div><h1>Show what you know</h1></div></div><p class="muted">Tests are timed${ST.settings.extTime ? ' (extended time is ON: 1.5×)' : ''} and graded. Study tools are locked, answers are revealed only after you submit, and correct-answer letters are balanced so guessing one letter doesn't pay off. You can pause a test and come back.</p>
  <h2 class="sec">1 · Diagnostics <span class="small muted">(Week 1, not graded)</span></h2>
  <div class="grid g2">${SUBJS.map(s => card(`${SUBJ[s].name} Pre-Assessment`, `${s === 'read' ? '3 passages, about 27 questions' : '32 questions, every unit'} · ${TIME.pre[s]} min`, `<button class="btn sm ${latest('pre', s) ? '' : 'primary'}" data-t="pre|${s}">${latest('pre', s) ? 'Retake' : 'Begin'}</button>`, latest('pre', s)?.pct)).join('')}
  ${card('The Ascend — Baseline', 'All three subjects · 40 questions · 75 min', `<button class="btn sm ${asc.length ? '' : 'primary'}" data-t="ascend|all">${asc.length ? 'Take again' : 'Begin'}</button>`, asc[0]?.pct, 'asc')}</div>
  <h2 class="sec">2 · Unit quizzes <span class="small muted">(best score counts · 40% of grade)</span></h2>
  ${SUBJS.map(s => `<div class="card"><h3>${SUBJ[s].name}</h3><div class="quizgrid">${HUB.units[s].map(u => { const b = best('quiz', s, u.n); return `<button class="quizbtn ${b == null ? '' : b >= 80 ? 'm' : b >= 60 ? 'd' : 'n'}" data-t="quiz|${s}|${u.n}"><span>Unit ${u.n} · Wk ${quizWeek(s, u.n)}</span><b>${u.title}</b><em>${b == null ? '10 questions · ' + TIME.quiz[s] + ' min' : 'Best: ' + b + '%'}</em></button>`; }).join('')}</div></div>`).join('')}
  <h2 class="sec">3 · The Ascend <span class="small muted">(Weeks 1, 9, 18 · 20% of grade)</span></h2>
  <div class="card asc-card"><div class="row between"><div><h3>The Ascend — Combined Exam</h3><p class="small">Algebra I (16) + English I (12) + Reading (2 passages, 12) in one sitting · 75 minutes. Each attempt uses brand-new questions and passages. Each subject's part counts toward that subject's grade.</p></div><button class="btn primary" data-t="ascend|all">Begin the Ascend</button></div>
  ${asc.length ? `<div class="asc-hist">${asc.map(r => `<div><span class="small muted">${new Date(r.date).toLocaleDateString()}</span><b>${r.pct}%</b><span class="small">${SUBJS.map(s => r.bySubj[s] ? SUBJ[s].short + ' ' + Math.round(r.bySubj[s][0] / r.bySubj[s][1] * 100) + '%' : '').join(' · ')}</span></div>`).join('')}</div>` : ''}</div>
  <h2 class="sec">4 · Post-assessments <span class="small muted">(Week 17 · 20% of grade)</span></h2>
  <div class="grid g3">${SUBJS.map(s => card(`${SUBJ[s].name} Post-Assessment`, s === 'read' ? '4 reserved passages never seen in practice' : 'Same blueprint as the pre-test, all-new questions', `<button class="btn sm" data-t="post|${s}">${latest('post', s) ? 'Retake' : 'Begin'}</button>`, latest('post', s)?.pct)).join('')}</div>`;
  $$('[data-t]').forEach(b => b.onclick = () => { const [k, s, u] = b.dataset.t.split('|'); startTest(k, s, u != null ? +u : undefined); });
};

/* ---------------- REPORT CARD ---------------- */
views.report = () => {
  const comment = s => {
    const g = grade(s), pre = latest('pre', s), post = latest('post', s), wk = weakest(s, 2), m = mastery(s);
    const strong = Object.entries(m).filter(([, v]) => v.t >= 3 && v.c / v.t >= .8).map(([k]) => HUB.std[k]).slice(0, 2);
    if (!g.pct && !pre) return 'No assessments yet. Begin with the pre-assessment.';
    let t = `${first()} `;
    t += strong.length ? `is showing real strength in ${strong.join(' and ').toLowerCase()}. ` : 'is building foundational skills. ';
    if (pre && post) t += `Growth from pre- to post-assessment: ${post.pct - pre.pct >= 0 ? '+' : ''}${post.pct - pre.pct} points. `;
    if (wk.length) t += `Next focus: ${wk.map(x => HUB.std[x.std].toLowerCase()).join(' and ')}. `;
    const mins = minsTotal(s); if (mins) t += `${mins} minutes of study logged this semester.`;
    return t;
  };
  const subjBlock = s => {
    const g = grade(s), pre = latest('pre', s), post = latest('post', s), m = mastery(s), asc = ascendParts(s);
    const practiced = ST.log.filter(a => a.s === s && a.m === 'practice'), acc = practiced.length ? Math.round(practiced.filter(a => a.ok).length / practiced.length * 100) : null;
    return `<div class="card subj-card rc" style="--c:${SUBJ[s].c}">
    <div class="row between top"><div><h2>${SUBJ[s].name}</h2><div class="small muted">Current unit: ${HUB.units[s][currentUnit(s)].title}</div></div><div class="grade-badge"><div class="grade">${letter(g.pct)}</div><div class="muted">${pctStr(g.pct)}</div></div></div>
    <div class="tablewrap"><table><tr><th>Category</th><th>Weight</th><th>Score</th><th>Completed</th></tr>${g.cats.map(c => `<tr><td>${c[0]}</td><td>${Math.round(c[1] * 100)}%</td><td>${pctStr(c[2])}</td><td>${c[3]}</td></tr>`).join('')}</table></div>
    <div class="grid g4 stats"><div><span class="small muted">Pre-assessment</span><b>${pre ? pre.pct + '%' : '—'}</b></div><div><span class="small muted">Post-assessment</span><b>${post ? post.pct + '%' : '—'}</b></div><div><span class="small muted">Growth</span><b>${pre && post ? (post.pct - pre.pct >= 0 ? '+' : '') + (post.pct - pre.pct) + ' pts' : '—'}</b></div><div><span class="small muted">Practice accuracy</span><b>${acc == null ? '—' : acc + '%'} <span class="small muted">(${practiced.length} q)</span></b></div></div>
    ${asc.length ? `<div class="small"><b>Ascend (${SUBJ[s].short} part):</b> ${asc.map(a => `${a.title.replace('The Ascend — ', '')} ${a.pct}%`).join(' → ')}</div>` : ''}
    <h3>Unit quizzes</h3><div class="unitbar">${HUB.units[s].map(u => { const b = best('quiz', s, u.n); return `<div class="${b == null ? '' : b >= 80 ? 'm' : b >= 60 ? 'd' : 'n'}" title="${u.title}"><span>U${u.n}</span><b>${b == null ? '—' : b + '%'}</b></div>`; }).join('')}</div>
    <h3>Standards mastery <span class="small muted">(last 10 attempts per skill)</span></h3>
    ${HUB.units[s].map(u => u.stds.map(std => m[std] ? masteryRow(std, m[std].c, m[std].t) : `<div class="mastery"><div><b>${std}</b> <span class="muted">${HUB.std[std]}</span></div><div class="bar"><i style="width:0"></i></div><div class="small muted">not yet</div></div>`).join('')).join('')}
    <div class="callout small"><b>Comment:</b> ${comment(s)}${ST.tutorNotes[s] ? `<br><b>Parent/mentor:</b> ${esc(ST.tutorNotes[s])}` : ''}</div></div>`;
  };
  const asc = ST.results.filter(r => r.kind === 'ascend');
  $('#app').innerHTML = `<div class="rc-head card"><div class="row between"><div class="row"><svg viewBox="0 0 64 64" class="paw" aria-hidden="true"><use href="#paw"/></svg><div><h1>Report Card</h1><div>${esc(ST.student.name)} · ${esc(ST.student.school)} · Grade 9 · Week ${weekNo()} of ${WEEKS}</div><div class="small muted">Printed ${new Date().toLocaleDateString()}${ST.team.tutor ? ' · Mentor: ' + esc(ST.team.tutor) : ''}</div></div></div>
    <div class="row noprint"><button class="btn sm" onclick="print()">Print / Save PDF</button></div></div>
    <div class="grid g4 stats">${SUBJS.map(s => `<div><span class="small muted">${SUBJ[s].name}</span><b class="big">${letter(grade(s).pct)}</b><span class="small">${pctStr(grade(s).pct)}</span></div>`).join('')}<div><span class="small muted">Ascend</span><b class="big">${asc.length ? asc[asc.length - 1].pct + '%' : '—'}</b><span class="small">${asc.length} taken</span></div></div>
    <p class="small muted">Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark · © ${new Date().getFullYear()} All rights reserved.</p>
    <p class="small muted">Grade = Unit quizzes 40% · Exit tickets 20% · Ascend 20% · Post-assessment 20% (re-weighted over completed work). Pre-assessments are diagnostic and not graded. Scale: A 90–100 · B 80–89 · C 70–79 · D 65–69 · F below 65. Mastery: 80%+ mastered · 60–79% developing · below 60% needs support.</p></div>
  ${SUBJS.map(subjBlock).join('')}
  <div class="card"><h2>Assessment history</h2><div class="tablewrap"><table><tr><th>Date</th><th>Assessment</th><th>Type</th><th>Score</th><th>Grade</th><th>Time</th></tr>
  ${ST.results.slice().reverse().map(r => `<tr><td>${new Date(r.date).toLocaleDateString()}</td><td>${esc(r.title)}</td><td>${r.kind}</td><td>${r.score}/${r.total} (${r.pct}%)</td><td>${r.kind === 'pre' ? 'diag.' : letter(r.pct)}</td><td>${r.mins ?? '—'} min</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No assessments yet.</td></tr>'}</table></div></div>`;
};

/* ---------------- TUTOR VIEW (PIN) ---------------- */
let tutorOK = false;
views.tutor = () => {
  if (!tutorOK) {
    $('#app').innerHTML = `<div class="card narrow"><div class="badge-paw"><svg><use href="#paw"/></svg></div><h1 style="margin-top:12px">Parent Portal</h1><p>Enter the PIN to manage settings and the school team, and to review ${esc(first())}'s written work and progress.</p><div class="row"><input class="num" id="pin" type="password" inputmode="numeric" placeholder="PIN"><button class="btn primary" id="pinGo">Open</button></div><p class="small muted">Default PIN is 1234. Change it inside.</p></div>`;
    const tryPin = () => { if ($('#pin').value === ST.settings.pin) { tutorOK = true; views.tutor(); } else $('#pin').value = '', $('#pin').placeholder = 'Wrong PIN'; };
    $('#pinGo').onclick = tryPin; $('#pin').onkeydown = e => e.key === 'Enter' && tryPin(); return;
  }
  const t = ST.team, s = ST.student, set = ST.settings;
  const inp = (id, label, val, type = 'text') => `<label class="field"><span>${label}</span><input id="${id}" type="${type}" value="${esc(val)}"></label>`;
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">Parent Portal</div><h1>Settings, team &amp; review</h1></div><button class="btn" id="lock2">Lock portal</button></div>
  <div class="grid g2">
   <div class="card"><h3>Student</h3>${inp('fName', 'Full name', s.name)}${inp('fFirst', 'First name (used in messages)', s.first)}${inp('fSchool', 'School', s.school)}${inp('fStart', 'Plan start date (Week 1 Monday)', s.start, 'date')}
     <h3>Accommodations &amp; settings</h3>
     <label class="check-row"><input type="checkbox" id="fExt" ${set.extTime ? 'checked' : ''}> Extended time on tests (1.5×)</label>
     <label class="check-row"><input type="checkbox" id="fRead" ${set.readAloud ? 'checked' : ''}> Read-aloud buttons (questions &amp; passages)</label>
     <label class="check-row"><input type="checkbox" id="fCalc" ${set.calcOnTests ? 'checked' : ''}> Allow calculator on Algebra tests (the MAAP Algebra I test provides one)</label>
     ${inp('fPin', 'Tutor PIN', set.pin)}</div>
   <div class="card"><h3>DeSoto Central team</h3><p class="small muted">Names were gathered from public school web pages and may be out of date — please confirm with the front office, (662) 536-3612.</p>
     ${inp('tPrin', 'Principal', t.principal)}${inp('tAp', 'Assistant Principal(s)', t.aps)}${inp('tCoun', 'School Counselor', t.counselor)}${inp('tMath', 'Algebra I Teacher', t.mathTeacher)}${inp('tEng', 'English I Teacher', t.engTeacher)}${inp('tTut', 'Mentor / parent contact', t.tutor)}
     <h3>Report card comments</h3>${SUBJS.map(x => `<label class="field"><span>${SUBJ[x].name}</span><textarea id="n_${x}" rows="2">${esc(ST.tutorNotes[x])}</textarea></label>`).join('')}</div>
  </div>
  <div class="row" style="margin:14px 0"><button class="btn primary" id="saveSet">Save settings</button><span id="saveMsg" class="small muted"></span></div>
  <div class="card"><h2>Written work to review</h2><p class="small muted">Score with the 4-point rubric: 4 = complete &amp; accurate with clear reasoning · 3 = mostly complete · 2 = partial · 1 = attempted.</p>
   ${ST.writing.length ? ST.writing.slice().reverse().map(w => `<div class="wr-item"><div class="small muted">${new Date(w.date).toLocaleString()} · ${SUBJ[w.subj].name} · ${esc(w.lesson)} · ${w.type === 'write' ? 'Writing task' : 'Show me'}</div><div class="small"><i>${esc(w.prompt)}</i></div><blockquote>${esc(w.text).replace(/\n/g, '<br>')}</blockquote>
     <div class="row"><select data-score="${w.id}"><option value="">Score…</option>${[4, 3, 2, 1].map(n => `<option ${w.score == n ? 'selected' : ''}>${n}</option>`).join('')}</select><input class="cmt" data-cmt="${w.id}" placeholder="Feedback for ${esc(first())}" value="${esc(w.comment)}"></div></div>`).join('') : '<p class="muted">Nothing yet.</p>'}</div>
  <div class="card"><h2>Shown work on math tests</h2>${ST.results.filter(r => r.items && r.items.some(i => i.work)).slice(-5).reverse().map(r => r.items.filter(i => i.work).map(i => `<div class="callout small ${i.ok ? 'good' : 'bad'}"><b>${esc(r.title)}</b> · ${esc(i.stem)}<br><pre>${esc(i.work)}</pre>Answered ${esc(i.resp ?? '—')} · key ${esc(i.key)}</div>`).join('')).join('') || '<p class="muted">No shown work yet.</p>'}</div>
  <div class="card"><h2>Data</h2><p class="small muted">Progress is saved in this browser. Export a backup regularly, and import it to move to another device.</p>
   <div class="row"><button class="btn" id="exp">Export backup</button><label class="btn">Import backup<input type="file" id="imp" accept="application/json" hidden></label><button class="btn danger" id="reset">Reset all data</button><button class="btn" id="lock">Lock portal</button></div></div>`;
  $('#saveSet').onclick = () => {
    Object.assign(ST.student, { name: $('#fName').value.trim() || 'Student', first: $('#fFirst').value.trim(), school: $('#fSchool').value.trim(), start: $('#fStart').value || ST.student.start });
    Object.assign(ST.settings, { extTime: $('#fExt').checked, readAloud: $('#fRead').checked, calcOnTests: $('#fCalc').checked, pin: $('#fPin').value.trim() || '1234' });
    Object.assign(ST.team, { principal: $('#tPrin').value.trim(), aps: $('#tAp').value.trim(), counselor: $('#tCoun').value.trim(), mathTeacher: $('#tMath').value.trim(), engTeacher: $('#tEng').value.trim(), tutor: $('#tTut').value.trim() });
    SUBJS.forEach(x => ST.tutorNotes[x] = $('#n_' + x).value.trim()); save(); $('#saveMsg').textContent = 'Saved.';
  };
  $$('[data-score]').forEach(el => el.onchange = () => { const w = ST.writing.find(x => x.id == el.dataset.score); w.score = el.value ? +el.value : null; save(); });
  $$('[data-cmt]').forEach(el => el.onchange = () => { const w = ST.writing.find(x => x.id == el.dataset.cmt); w.comment = el.value; save(); });
  $('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(ST, null, 1)], { type: 'application/json' })); a.download = `ascend-hub-${ST.student.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
  $('#imp').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(txt => { try { const d = JSON.parse(txt); if (!d.results) throw 0; ST = Object.assign(DEFAULTS(), d); save(); alert('Backup imported.'); go('home'); } catch (x) { alert('That file is not a valid backup.'); } }); };
  $('#reset').onclick = () => { if (confirm('Erase ALL progress, results, and writing? This cannot be undone. (Export a backup first.)')) { localStorage.removeItem(KEY); ST = DEFAULTS(); save(); tutorOK = false; go('home'); } };
  $('#lock').onclick = $('#lock2').onclick = () => { tutorOK = false; go('home'); };
};

/* ---------------- GUIDE ---------------- */
views.guide = () => {
  $('#app').innerHTML = `<div class="page-head"><div><div class="eyebrow">How It Works</div><h1>A complete tutor, built in</h1></div></div>
  ${coachSays(`There's no live tutor to wait for. <b>I'm the tutor.</b> I teach every skill the way a great teacher does: I explain it, I <b>show you a complete worked example step by step</b>, we try one together, then you practice until you've mastered it.`)}
  <div class="grid g2">
   <div class="card"><h3>How Coach J teaches (I do → We do → You do)</h3><ol class="step-list"><li><b>Explain.</b> Short notes and key vocabulary, with read-aloud.</li><li><b>Watch me.</b> A worked example typed out one step at a time, with the reason for each step.</li><li><b>Together.</b> Quick checks with instant feedback.</li><li><b>Your turn.</b> Before each NEW type of problem, Coach J solves one first. Then ${esc(first())} solves a fresh one with new numbers.</li><li><b>Re-teach on the spot.</b> On a miss, Coach J walks through <i>his own problem</i> step by step, then gives a similar one to retry.</li><li><b>Exit ticket.</b> Five graded questions prove the skill stuck.</li></ol></div>
   <div class="card"><h3>For ${esc(first())}</h3><ol class="step-list"><li>Open the <b>Dashboard</b> and complete <b>Today's mission</b>: Algebra, English, Reading.</li><li>When Coach J says "Watch me," read every step before clicking Next.</li><li>Stuck? Tap <b>💡 Show a hint</b>. Hints help; they don't cost points.</li><li>Use <b>🔊 Read to me</b> on any question or passage.</li><li>On tests, tools lock. Use the <b>Show your work</b> box.</li><li>Every Friday, check your <b>Report Card</b> and do Smart Review on any red skill.</li></ol></div>
   <div class="card"><h3>For parents &amp; mentors</h3><ul class="small"><li><b>Mastery rule:</b> 80%+ → move on. 60–79% → one more practice set. Below 60% → redo the lesson's Learn and Together steps, then retake (best score counts).</li><li><b>Ask him to teach you.</b> Read the "Show me" answers in the Parent Portal. If he can explain it, he owns it.</li><li><b>Short and daily wins:</b> about 1 hour 45 minutes Monday–Thursday, plus a Friday quiz.</li><li><b>Time is tracked automatically</b> and pauses after 2 idle minutes.</li><li><b>Celebrate growth:</b> compare the pre-test, the Ascend Checkpoint, and the post-test.</li></ul></div>
   <div class="card"><h3>What's inside</h3><table class="small"><tr><td><b>Algebra I</b></td><td>${HUB.math.length} problem generators (unlimited unique problems), 15 lessons, 8 units including a 3-week Foundations Bootcamp</td></tr><tr><td><b>English I</b></td><td>${HUB.engCount}+ questions from curated banks (80 academic words, 35 roots, 30 figurative-language examples and more), 15 lessons with writing tasks</td></tr><tr><td><b>Reading</b></td><td>${Object.keys(HUB.passages).length} passages (${Object.values(HUB.passages).filter(p => p.reserved).length} reserved for the post-test), ${HUB.readCount + (HUB.readPost || []).length} questions, 15 lessons with modeled think-alouds</td></tr><tr><td><b>Assessments</b></td><td>3 pre-tests · 24 unit quizzes · 45 exit tickets · the Ascend ×3 · 3 post-tests, all auto-graded with balanced answer keys</td></tr></table></div>
   <div class="card"><h3>Alignment</h3><p class="small">Built on the Mississippi College &amp; Career Readiness Standards (MS CCRS) for Algebra I and Grade 9 English Language Arts. Algebra I ends with the MAAP Algebra I end-of-course test. Mississippi's English end-of-course test is English II (10th grade), so the reading strand also builds the paired-passage and evidence skills it requires.</p><p class="small muted">This pacing is a model plan, not DeSoto County's official pacing guide; adjust it to the classroom syllabus as needed. Passages are original except the Gettysburg Address, the Declaration of Independence excerpt, and Paul Laurence Dunbar's "We Wear the Mask" (public domain).</p></div>
   <div class="card"><h3>About</h3><p><b>Jaguar Ascend Hub</b> · Grade 9 Tutoring Program</p><p class="small">Designed and created by <b>Dr. Richard G. Clark</b>.<br>Copyright © ${new Date().getFullYear()} Dr. Richard G. Clark. All rights reserved.</p><p class="small muted">Independent tutoring program prepared for a DeSoto Central High School student. Not an official publication of DeSoto County Schools. School names and colors are used for the student's reference only.</p></div>
  </div>`;
};

/* ---------------- TOOLS ---------------- */
$('#toolbar').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (document.body.classList.contains('testing') && !(b.dataset.tool === 'calc' && ST.settings.calcOnTests && RUN && RUN.subj !== 'eng')) return;
  const d = $('#drawer-' + b.dataset.tool), open = d.classList.contains('open'); closeDrawers(); if (!open) d.classList.add('open');
};
$$('.drawer .x').forEach(x => x.onclick = closeDrawers);
(function calc() {
  const keys = ['7', '8', '9', '÷', 'C', '4', '5', '6', '×', '⌫', '1', '2', '3', '−', '^', '0', '.', '(', ')', '+', '√(', 'x²', '±', 'ans', '='];
  const scr = $('#calcScreen'); let ans = 0;
  $('#calcKeys').innerHTML = keys.map(k => `<button class="${/[÷×−+=^]/.test(k) ? 'op' : ''}">${k}</button>`).join('');
  const ev = () => {
    const e = scr.value.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/√\(/g, 'Math.sqrt(').replace(/\^/g, '**').replace(/ans/g, '(' + ans + ')');
    if (!/^[0-9+\-*/().\s]*$/.test(e.replace(/Math\.sqrt/g, ''))) { scr.value = 'Error'; return; }
    try { const v = Function('"use strict";return (' + e + ')')(); if (!isFinite(v)) throw 0; ans = +v.toFixed(10); scr.value = String(ans); } catch (x) { scr.value = 'Error'; }
  };
  $('#calcKeys').onclick = e => { if (e.target.tagName !== 'BUTTON') return; const k = e.target.textContent; if (scr.value === 'Error') scr.value = '';
    if (k === 'C') scr.value = ''; else if (k === '⌫') scr.value = scr.value.slice(0, -1); else if (k === '=') ev(); else if (k === 'x²') scr.value += '^2'; else if (k === '±') scr.value = scr.value.startsWith('-') ? scr.value.slice(1) : '-' + scr.value; else scr.value += k; };
  scr.onkeydown = e => { if (e.key === 'Enter') ev(); };
})();
(function focusTimer() {
  let iv = null, left = 25 * 60; const show = () => { $('#timerShow').textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); };
  $('#timerMin').onchange = () => { if (!iv) { left = +$('#timerMin').value * 60; show(); } };
  $('#timerStart').onclick = () => { if (iv) return; iv = setInterval(() => { left--; show(); if (left <= 0) { clearInterval(iv); iv = null; left = +$('#timerMin').value * 60; show(); alert('Focus session complete — take a 5-minute brain break, then start the next one.'); } }, 1000); };
  $('#timerStop').onclick = () => { clearInterval(iv); iv = null; left = +$('#timerMin').value * 60; show(); };
})();
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) go(b.dataset.view); };
$('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
$('#scrim').onclick = () => document.body.classList.remove('nav-open');
(function theme() { let t = null; try { t = localStorage.getItem('jah.theme'); } catch (e) { } if (t) document.documentElement.dataset.theme = t;
  $('#themeBtn').onclick = () => { const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; const n = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = n; try { localStorage.setItem('jah.theme', n); } catch (e) { } }; })();
addEventListener('beforeunload', () => { if (RUN && !RUN.practice && !RUN.embedded) pauseTest(); });
go('home');
