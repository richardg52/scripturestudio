/* Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright (c) 2026 Dr. Richard G. Clark. All rights reserved. */
/* =====================================================================
   JAGUAR ASCEND HUB — application
   State lives in this browser (localStorage). The Parent Portal can export
   a backup file and import it on another device.
   ===================================================================== */
const KEY = 'jaguarAscendHub.v2';
const SUBJ = {
  math: { name: 'Algebra I', short: 'Math', c: 'var(--math)', goal: 180, mins: [5, 10, 15, 10, 5] },
  eng: { name: 'English I', short: 'English', c: 'var(--eng)', goal: 120, mins: [5, 8, 7, 7, 3] },
  read: { name: 'Reading', short: 'Reading', c: 'var(--read)', goal: 120, mins: [5, 8, 7, 7, 3] },
  all: { name: 'The Ascend', short: 'Ascend', c: 'var(--gold)' }
};
const SUBJS = ['math', 'eng', 'read'];
const WEEKS = 18;
const STAGES = ['Warm-up', 'Learn (I do)', 'Together (We do)', 'On your own (You do)', 'Exit ticket & Show me'];
const DEFAULTS = () => ({
  student: { name: 'Ezekiel Wilson', first: 'Ezekiel', school: 'DeSoto Central High School', grade: 9, start: mondayOf(new Date()).toISOString().slice(0, 10) },
  team: { principal: 'Shane Jones', aps: 'Jermal Brown', counselor: '', mathTeacher: '', engTeacher: '', tutor: '' },
  settings: { pin: '1234', extTime: false, readAloud: true, calcOnTests: false, skipPlacement: false },
  results: [], log: [], time: {}, lessons: {}, writing: [], streak: { last: '', count: 0, best: 0 }, inProgress: null, tutorNotes: { math: '', eng: '', read: '' }, seenWelcome: false
});

/* ---------------- state ---------------- */
function mondayOf(d) { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t; }
function load() {
  try { const raw = JSON.parse(localStorage.getItem(KEY)); if (!raw) return DEFAULTS(); const d = DEFAULTS();
    for (const k in d) if (raw[k] === undefined) raw[k] = d[k];
    raw.settings = Object.assign(d.settings, raw.settings); raw.team = Object.assign(d.team, raw.team); raw.student = Object.assign(d.student, raw.student);
    return raw; } catch (e) { return DEFAULTS(); }
}
let ST = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(ST)); } catch (e) { /* storage full or blocked: keep working in memory */ } }
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const strip = h => String(h).replace(/<table[\s\S]*?<\/table>/g, ' [table] ').replace(/<div class="quote">/g, ' — ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const first = () => ST.student.first || ST.student.name.split(' ')[0];
function weekNo() { const s = new Date(ST.student.start + 'T00:00:00'); const d = Math.floor((Date.now() - s) / 864e5); return Math.max(1, Math.min(WEEKS, Math.floor(d / 7) + 1)); }
function letter(p) { if (p == null) return '—'; return p >= 90 ? 'A' : p >= 80 ? 'B' : p >= 70 ? 'C' : p >= 65 ? 'D' : 'F'; }
const pctStr = p => (p == null ? '—' : p + '%');
function touchStreak() {
  const today = new Date().toISOString().slice(0, 10); if (ST.streak.last === today) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  ST.streak.count = ST.streak.last === y ? ST.streak.count + 1 : 1; ST.streak.last = today; ST.streak.best = Math.max(ST.streak.best, ST.streak.count); save();
}

/* ---------------- automatic time-on-subject tracking ---------------- */
let activeSubj = null, lastInput = Date.now();
['click', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true }));
setInterval(() => {
  if (!activeSubj || document.hidden || Date.now() - lastInput > 120000) return;
  const subs = activeSubj === 'all' ? SUBJS : [activeSubj], w = weekNo();
  subs.forEach(s => { ST.time[s] = ST.time[s] || {}; ST.time[s][w] = (ST.time[s][w] || 0) + 0.25 / subs.length; });
  save();
}, 15000);
const minsWeek = (s, w = weekNo()) => Math.round((ST.time[s] || {})[w] || 0);
const minsTotal = s => Math.round(Object.values(ST.time[s] || {}).reduce((a, b) => a + b, 0));

/* ---------------- item building ---------------- */
const BANK = () => ({ math: HUB.math, eng: HUB.eng, read: HUB.read });
function inst(subj, f) {
  let it;
  for (let t = 0; t < 40; t++) {
    it = f.make ? f.make.call(f) : Object.assign({}, f);
    if (it.type === 'num') break;
    const all = [it.correct, ...(it.distractors || []).slice(0, 3)].map(String);
    if (all.length === 4 && new Set(all).size === 4) break;
  }
  it = Object.assign({ type: 'mc', hints: [] }, it, { subj, std: f.std, src: f.id || null, passage: f.passage || it.passage || null });
  if (it.distractors) it.distractors = it.distractors.slice(0, 3);
  return it;
}
function unitOf(subj, std) { const u = HUB.units[subj].find(u => u.stds.includes(std)); return u ? u.n : 0; }

/* Choose reading items: favor a few passages so the student reads deeply, not 9 passages for 10 questions. */
function pickReading(n, { stds, passages, maxPassages = 3, exclude = [] } = {}) {
  let pool = (HUB.read).filter(q => !HUB.passages[q.passage].reserved && !exclude.includes(q.passage));
  if (passages) pool = HUB.read.concat(HUB.readPost || []).filter(q => passages.includes(q.passage));
  if (stds) pool = pool.filter(q => stds.includes(q.std));
  const byP = {}; pool.forEach(q => (byP[q.passage] = byP[q.passage] || []).push(q));
  let ps = shuffle(Object.keys(byP)).sort((a, b) => byP[b].length - byP[a].length);
  if (!passages) { const strong = ps.filter(p => byP[p].length >= 2); ps = shuffle(strong.length ? strong.slice(0, Math.max(maxPassages + 1, 4)) : ps).slice(0, maxPassages); }
  const per = Math.ceil(n / Math.max(1, ps.length)), out = [];
  ps.forEach(p => sample(byP[p], per).forEach(q => out.push(q)));
  // top up if short
  if (out.length < n) shuffle(pool.filter(q => !out.includes(q) && ps.includes(q.passage))).slice(0, n - out.length).forEach(q => out.push(q));
  if (out.length < n && !passages) { // still short: bring in one more passage at a time
    for (const p of shuffle(Object.keys(byP).filter(p => !ps.includes(p)))) { if (out.length >= n) break; ps.push(p); byP[p].slice(0, n - out.length).forEach(q => out.push(q)); }
  }
  return out.slice(0, n).sort((a, b) => ps.indexOf(a.passage) - ps.indexOf(b.passage)).map(q => inst('read', q));
}
function pickFrom(subj, n, { stds, ids } = {}) {
  if (subj === 'read') return pickReading(n, { stds });
  let pool = BANK()[subj];
  if (ids) pool = pool.filter(f => ids.includes(f.id));
  else if (stds) pool = pool.filter(f => stds.includes(f.std));
  if (!pool.length) return [];
  const out = [], stems = new Set(), used = new Set(), hasGen = pool.some(p => p.make);
  let order = shuffle(pool), k = 0, guard = 0;
  while (out.length < n && guard++ < n * 30) {
    if (k >= order.length) { order = shuffle(pool); k = 0; }
    const f = order[k++];
    if (!f.make) { // hand-written items are used at most once per set
      if (used.has(f)) { if (!hasGen && pool.every(p => used.has(p))) break; continue; }
      used.add(f);
    }
    const it = inst(subj, f);
    const sig = it.stem + '|' + it.correct + '|' + it.answer; // same wording can hold different questions
    if (stems.has(sig)) continue; stems.add(sig); out.push(it);
  }
  return out;
}
/* Spread n items evenly across a list of standards. */
function spread(subj, n, stds) {
  const per = {}; stds.forEach((s, i) => (per[s] = Math.floor(n / stds.length) + (i < n % stds.length ? 1 : 0)));
  let out = []; for (const s of shuffle(stds)) if (per[s]) out = out.concat(pickFrom(subj, per[s], { stds: [s] }));
  if (out.length < n) { // a thin skill: fill from its sibling skills
    const have = new Set(out.map(i => i.stem + '|' + i.correct));
    for (const it of pickFrom(subj, n * 2, { stds })) { if (out.length >= n) break; const k = it.stem + '|' + it.correct; if (!have.has(k)) { have.add(k); out.push(it); } }
  }
  return out;
}
/* Correct-answer letters are balanced (~25% each) and shuffled, with no long runs of the same letter. */
function balanceKeys(items) {
  const mc = items.filter(i => i.type === 'mc');
  let slots;
  for (let tries = 0; tries < 60; tries++) {
    slots = shuffle(mc.map((_, i) => i % 4)); let run = 1, ok = true;
    for (let i = 1; i < slots.length; i++) { run = slots[i] === slots[i - 1] ? run + 1 : 1; if (run > 2) { ok = false; break; } }
    if (ok) break;
  }
  mc.forEach((it, k) => { const ch = shuffle(it.distractors); ch.splice(slots[k], 0, it.correct); it.choices = ch; it.key = slots[k]; });
  return items;
}

/* ---------------- blueprints ---------------- */
const BLUEPRINT = {
  pre(subj) { return subj === 'read' ? readDiag(false) : HUB.units[subj].flatMap(u => spread(subj, 4, u.stds)); },
  post(subj) { return subj === 'read' ? readDiag(true) : HUB.units[subj].flatMap(u => spread(subj, 4, u.stds)); },
  ascend() {
    const m = HUB.units.math.flatMap(u => spread('math', 2, u.stds));
    const e = HUB.units.eng.flatMap(u => spread('eng', u.n < 4 ? 2 : 1, u.stds));
    const lit = pick(['delmar', 'tryout', 'static', 'wings', 'porch', 'science']), info = pick(['river', 'hamer', 'blues', 'hurricane', 'sleep', 'phones']);
    const r = pickReading(14, { passages: [lit, info] });
    return m.concat(e, r);
  },
  quiz(subj, unit) { const u = HUB.units[subj][unit]; return subj === 'read' ? pickReading(10, { stds: u.stds, maxPassages: 3 }) : spread(subj, 10, u.stds); },
  exit(lesson) { return lesson.subj === 'read' ? pickReading(5, { stds: lesson.stds, maxPassages: 2 }) : lesson.gens ? pickFrom(lesson.subj, 5, { ids: lesson.gens }) : lesson.only ? pickFrom(lesson.subj, 5, { ids: lesson.only }) : pickFrom(lesson.subj, 5, { stds: lesson.stds }); }
};
function readDiag(post) {
  if (post) return pickReading(40, { passages: ['dinner', 'catfish', 'serve', 'declaration'] });
  const lit = pick(['delmar', 'tryout', 'static', 'wings']), info = pick(['river', 'hamer', 'blues', 'hurricane']), arg = pick(['sleep', 'phones']);
  return pickReading(30, { passages: [lit, info, arg] });
}
const TIME = { pre: { math: 45, eng: 40, read: 50 }, post: { math: 45, eng: 40, read: 50 }, ascend: 75, quiz: { math: 20, eng: 15, read: 25 }, exit: 10 };

/* ---------------- views & routing ---------------- */
const views = {};
let RUN = null, runTimer = null;
function go(v, arg) {
  if (document.body.classList.contains('testing') && RUN && !RUN.practice) { if (!confirm('Pause this test and leave? Your answers and remaining time are saved — you can resume from the dashboard.')) return; pauseTest(); }
  stopRunTimer(); coachStop(); speechSynthesis?.cancel?.(); document.body.classList.remove('testing', 'calc-ok', 'nav-open'); activeSubj = null; RUN = null;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
  const nb = $(`#tabs button[data-view="${v}"]`); $('#crumb').innerHTML = nb ? nb.textContent : ''; refreshChrome();
  closeDrawers(); $('#app').innerHTML = ''; views[v](arg); scrollTo(0, 0);
}
function closeDrawers() { $$('.drawer').forEach(d => d.classList.remove('open')); }

function refreshChrome() {
  $('#weekChip').textContent = `Week ${weekNo()} of ${WEEKS}`;
  $('#streakChip span').textContent = ST.streak.count;
  $('#meName').textContent = ST.student.name;
  $('#meInit').textContent = ST.student.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  $$('.yr').forEach(e => e.textContent = new Date().getFullYear());
}

/* ---------------- read aloud ---------------- */
function speakText(html) {
  if (!('speechSynthesis' in window)) return alert('Read-aloud is not supported in this browser.');
  speechSynthesis.cancel();
  let t = strip(String(html).replace(/<sup>(\d+)<\/sup>/g, ' to the $1 power ').replace(/²/g, ' squared').replace(/−/g, ' minus ').replace(/×/g, ' times ').replace(/÷/g, ' divided by '));
  const u = new SpeechSynthesisUtterance(t); u.rate = 0.92; speechSynthesis.speak(u);
}
const speakBtn = (id, label = 'Read to me') => ST.settings.readAloud ? `<button class="btn sm ghost" data-speak="${id}" title="Read aloud">🔊 ${label}</button>` : '';
document.addEventListener('click', e => { const b = e.target.closest('[data-speak]'); if (!b) return; const el = document.getElementById(b.dataset.speak); if (el) speakText(el.innerHTML); });

/* =====================================================================
   RUNNER — one engine for tests (timed, no feedback) and practice
   (hints, instant feedback). Can render full-page or inside a lesson.
   ===================================================================== */
function startRun(o) {
  // o: {kind, subj, title, items, unit, lessonId, host, onDone, practice}
  const practice = o.kind === 'practice';
  const items = balanceKeys(o.items);
  let mins = 0;
  if (!practice) { mins = o.kind === 'ascend' ? TIME.ascend : o.kind === 'exit' ? TIME.exit : (TIME[o.kind] || {})[o.subj] || 20; if (ST.settings.extTime) mins = Math.round(mins * 1.5); }
  RUN = { noCoach: !!o.noCoach, id: Date.now(), kind: o.kind, subj: o.subj, title: o.title, items, unit: o.unit ?? null, lessonId: o.lessonId || null, practice,
    i: 0, resp: items.map(() => null), work: items.map(() => ''), flag: items.map(() => false), checked: items.map(() => false), hintsUsed: items.map(() => 0),
    remaining: mins * 60000, startedAt: Date.now(), embedded: !!o.host, host: o.host || '#app', onDone: o.onDone || null };
  activeSubj = o.subj;
  if (!RUN.embedded) { $$('#tabs button').forEach(b => b.classList.remove('on')); scrollTo(0, 0); }
  if (!practice) { document.body.classList.add('testing'); document.body.classList.toggle('calc-ok', ST.settings.calcOnTests && o.subj !== 'eng'); closeDrawers(); }
  $('#crumb').innerHTML = practice ? `Practice <span>· ${esc(o.title)}</span>` : `Test mode <span>· ${esc(o.title)}</span>`;
  touchStreak(); startRunTimer(); renderQ();
}
function startRunTimer() { stopRunTimer(); if (!RUN || RUN.practice) return; RUN.tickAt = Date.now(); runTimer = setInterval(tick, 1000); }
function stopRunTimer() { if (runTimer) { clearInterval(runTimer); runTimer = null; } }
function tick() {
  if (!RUN || RUN.practice) return; const now = Date.now(); RUN.remaining -= now - RUN.tickAt; RUN.tickAt = now;
  const el = $('#tmr'); const left = Math.max(0, RUN.remaining);
  if (el) { el.textContent = String(Math.floor(left / 60000)).padStart(2, '0') + ':' + String(Math.floor(left / 1000) % 60).padStart(2, '0'); el.classList.toggle('low', left < 120000); }
  if (left <= 0) { stopRunTimer(); alert('Time is up — your test is being submitted.'); submitRun(); }
}
function pauseTest() { clearTimeout(autosaveT); if (!RUN || RUN.practice || RUN.embedded) return; saveCur(); stopRunTimer(); const { host, onDone, ...rest } = RUN; ST.inProgress = rest; save(); }
function resumeTest() {
  const p = ST.inProgress; if (!p) return; ST.inProgress = null; save();
  RUN = Object.assign(p, { host: '#app', embedded: false, onDone: null }); activeSubj = p.subj;
  document.body.classList.add('testing'); document.body.classList.toggle('calc-ok', ST.settings.calcOnTests && p.subj !== 'eng'); $$('#tabs button').forEach(b => b.classList.remove('on')); startRunTimer(); renderQ();
}
function saveCur() { if (!RUN) return; const n = $('#numAns'); if (n) RUN.resp[RUN.i] = n.value.trim() === '' ? null : n.value.trim(); const w = $('#work'); if (w) RUN.work[RUN.i] = w.value; }
function isRight(it, r) { if (r == null || r === '') return false; if (it.type === 'num') return Math.abs(parseNum(r) - it.answer) < 1e-6; return r === it.key; }
function keyText(it) { return it.type === 'num' ? neg(it.answer) : 'ABCD'[it.key] + '. ' + it.correct; }
function fbHTML(it, ok) { return `<div class="callout ${ok ? 'good' : 'bad'}"><b>${ok ? pick(['Correct!', 'Nice work!', 'Yes — exactly.', 'You got it.']) : 'Not quite.'}</b> ${ok ? '' : 'Correct answer: <b>' + keyText(it) + '</b>'}<div class="explain">${it.explain}</div></div>`; }

function renderQ() {
  const R0 = RUN, it = R0.items[R0.i], pr = R0.practice, L = 'ABCD', host = $(R0.host); if (!host) return;
  if (!it) { host.innerHTML = '<div class="callout warn">No questions are available for this selection yet.</div>'; return; }
  coachStop();
  if (pr && coachIntercept(host, it)) return;
  const done = pr && R0.checked[R0.i], r = R0.resp[R0.i];
  const p = it.passage ? HUB.passages[it.passage] : null;
  const passage = p ? `<div class="passage" id="psg"><div class="row between"><h4>${p.title} <span class="pill">${p.kind}</span></h4>${speakBtn('psgbody', 'Read passage')}</div><div id="psgbody" class="psgbody">${p.html}</div></div>` : '';
  const answerUI = it.type === 'num'
    ? `<label class="small muted" for="numAns">Type your answer (whole numbers, negatives like −3, decimals, or fractions like 7/2):</label><div class="row"><input class="num" id="numAns" inputmode="decimal" autocomplete="off" value="${esc(r ?? '')}" ${done ? 'disabled' : ''}></div>`
    : `<div class="choices" role="radiogroup">${it.choices.map((c, k) => { let cls = r === k ? 'sel' : ''; if (done) { if (k === it.key) cls = 'right'; else if (r === k) cls = 'wrong'; } return `<button class="choice ${cls}" data-k="${k}" role="radio" aria-checked="${r === k}" ${done ? 'disabled' : ''}><span class="L">${L[k]}</span><span>${c}</span></button>`; }).join('')}</div>`;
  const hints = it.hints || [], hu = R0.hintsUsed[R0.i];
  const hintUI = pr && hints.length && !done ? `<div class="hints">${hints.slice(0, hu).map((h, k) => `<div class="hint"><b>Hint ${k + 1}:</b> ${h}</div>`).join('')}${hu < hints.length ? `<button class="btn sm ghost" id="hintBtn">💡 ${hu ? 'Another hint' : 'Show a hint'}</button>` : ''}</div>` : '';
  const head = R0.embedded ? `<div class="row between"><b>${R0.title}</b><span class="small muted">Question ${R0.i + 1} of ${R0.items.length}</span></div>` : `
    <div class="test-head"><div><span class="pill ${R0.subj}">${R0.kind === 'ascend' ? 'Combined exam' : SUBJ[R0.subj].short}${R0.kind !== 'practice' ? ' · ' + ({ pre: 'Pre-assessment', post: 'Post-assessment', quiz: 'Unit quiz', exit: 'Exit ticket', ascend: 'The Ascend' })[R0.kind] : ' · Practice'}</span><h2>${R0.title}</h2></div>
    <div class="row">${pr ? '' : '<span class="timer" id="tmr">--:--</span><button class="btn sm" id="pauseBtn">Pause</button>'}${pr ? `<button class="btn sm" id="exitPr">Exit practice</button>` : ''}</div></div>
    ${pr ? '' : `<div class="callout warn small">Test mode: calculator${ST.settings.calcOnTests && R0.subj !== 'eng' ? ' is allowed (bottom right), but the formula sheet and guides are' : ', formula sheet, and guides are'} locked. Show your steps in the scratch-work box.</div>`}
    <div class="progress"><i style="width:${Math.round((R0.i + 1) / R0.items.length * 100)}%"></i></div>
    <div class="qnav">${R0.items.map((q, k) => `<button class="${R0.resp[k] != null && R0.resp[k] !== '' ? 'ans' : ''} ${k === R0.i ? 'cur' : ''} ${R0.flag[k] ? 'flag' : ''} ${pr && R0.checked[k] ? (isRight(q, R0.resp[k]) ? 'ok' : 'no') : ''}" data-q="${k}" aria-label="Question ${k + 1}">${k + 1}</button>`).join('')}</div>`;
  const turn = pr && !done ? (R0.retry === R0.i ? coachSays('Here\'s a similar one. Use the same steps we just walked through — you\'ve got this.') : R0.yourTurn === R0.i ? coachSays(`<b>Your turn, ${esc(first())}!</b> Same kind of problem, new numbers. Follow the same steps I just showed you. If you get stuck, tap <b>💡 Show a hint</b>.`) : '') : '';
  host.innerHTML = `${head}${turn}
  <div class="qwrap ${p ? 'with-passage' : ''}">${passage}
    <div class="card qcard">
      <div class="row between"><span class="small muted">${R0.embedded ? '' : `Question ${R0.i + 1} of ${R0.items.length} · `}${it.std} · ${HUB.std[it.std] || ''}</span><div class="row">${speakBtn('qstem')}${pr ? '' : `<button class="btn sm ghost" id="flagBtn">${R0.flag[R0.i] ? '★ Flagged' : '☆ Flag'}</button>`}</div></div>
      <div class="stem" id="qstem">${it.stem}${it.type === 'mc' ? `<ol class="sr-choices" type="A">${it.choices.map(c => `<li>${c}</li>`).join('')}</ol>` : ''}</div>
      ${answerUI}${hintUI}
      ${it.subj === 'math' ? `<details class="showwork" ${R0.work[R0.i] ? 'open' : ''}><summary>✏️ Show your work ${pr ? '' : '(saved for review)'}</summary><textarea id="work" placeholder="Write each step on its own line…">${esc(R0.work[R0.i])}</textarea></details>` : ''}
      <div class="feedback" id="fb">${done ? (pr ? coachFeedback(it, isRight(it, r)) : fbHTML(it, isRight(it, r))) : ''}</div>
    </div></div>
  <div class="row between navrow">
    <button class="btn" id="qPrev" ${R0.i === 0 ? 'disabled' : ''}>← Back</button>
    <div class="row">${pr && !done ? '<button class="btn primary" id="qCheck">Check answer</button>' : ''}
    ${R0.i < R0.items.length - 1 ? `<button class="btn ${pr && !done ? '' : 'primary'}" id="qNext">Next →</button>` : `<button class="btn ${pr && !done ? '' : 'primary'}" id="qSubmit">${pr ? 'Finish' : 'Submit test'}</button>`}</div>
  </div>`;
  tick();
  host.querySelectorAll('.choice').forEach(b => b.onclick = () => { saveCur(); RUN.resp[RUN.i] = +b.dataset.k; if (!pr) autosave(); renderQ(); });
  host.querySelectorAll('.qnav button').forEach(b => b.onclick = () => { saveCur(); RUN.i = +b.dataset.q; renderQ(); });
  const on = (id, fn) => { const el = host.querySelector('#' + id); if (el) el.onclick = fn; };
  on('qPrev', () => { saveCur(); RUN.i--; renderQ(); });
  on('qNext', () => { saveCur(); if (pr && !RUN.checked[RUN.i] && RUN.resp[RUN.i] != null) { RUN.checked[RUN.i] = true; logAttempt(it, isRight(it, RUN.resp[RUN.i]), 'practice'); } RUN.i++; renderQ(); });
  on('qCheck', () => { saveCur(); if (RUN.resp[RUN.i] == null || RUN.resp[RUN.i] === '') { host.querySelector('#fb').innerHTML = '<div class="callout warn small">Choose or type an answer first. Stuck? Use a hint.</div>'; return; } RUN.checked[RUN.i] = true; logAttempt(it, isRight(it, RUN.resp[RUN.i]), 'practice'); renderQ(); });
  on('hintBtn', () => { saveCur(); RUN.hintsUsed[RUN.i]++; renderQ(); });
  on('flagBtn', () => { saveCur(); RUN.flag[RUN.i] = !RUN.flag[RUN.i]; renderQ(); });
  on('pauseBtn', () => { pauseTest(); RUN = null; document.body.classList.remove('testing'); go('home'); });
  on('exitPr', () => { saveCur(); finishPractice(); });
  on('qSubmit', () => { saveCur(); if (pr) { if (!RUN.checked[RUN.i] && RUN.resp[RUN.i] != null) { RUN.checked[RUN.i] = true; logAttempt(it, isRight(it, RUN.resp[RUN.i]), 'practice'); } return finishPractice(); }
    const un = RUN.resp.filter(x => x == null || x === '').length, fl = RUN.flag.filter(Boolean).length;
    if ((un || fl) && !confirm(`${un ? un + ' question(s) unanswered. ' : ''}${fl ? fl + ' flagged for review. ' : ''}Submit anyway?`)) return; submitRun(); });
  const n = host.querySelector('#numAns'); if (n) { n.oninput = () => { RUN.resp[RUN.i] = n.value.trim() || null; }; n.onkeydown = e => { if (e.key === 'Enter') (host.querySelector('#qCheck') || host.querySelector('#qNext') || host.querySelector('#qSubmit'))?.click(); }; }
  if (done && pr) bindCoachFeedback(host, it);
  if (RUN.embedded) host.scrollIntoView({ block: 'nearest' });
}
let autosaveT = 0;
function autosave() { if (!RUN || RUN.practice || RUN.embedded) return; clearTimeout(autosaveT); autosaveT = setTimeout(() => { if (!RUN || RUN.practice || RUN.embedded) return; const { host, onDone, ...rest } = RUN; ST.inProgress = rest; save(); }, 300); }

function logAttempt(it, ok, mode) { ST.log.push({ t: Date.now(), s: it.subj, std: it.std, ok: ok ? 1 : 0, m: mode }); if (ST.log.length > 8000) ST.log = ST.log.slice(-8000); save(); }

function finishPractice() {
  const R0 = RUN; const tried = R0.items.map((it, k) => R0.checked[k]).filter(Boolean).length, right = R0.items.filter((it, k) => R0.checked[k] && isRight(it, R0.resp[k])).length;
  const host = $(R0.host), pct = tried ? Math.round(right / tried * 100) : 0;
  const msg = !tried ? 'No questions checked yet.' : pct >= 80 ? `Strong work, ${first()}! You're ready to move on.` : pct >= 60 ? 'Getting there. One more set will lock it in.' : 'This skill needs more practice. Re-read the lesson notes, then try a new set — use the hints.';
  host.innerHTML = `<div class="card"><h2>${R0.title} — done</h2><div class="big-score">${right} / ${tried}</div><div class="callout ${pct >= 80 ? 'good' : pct >= 60 ? 'warn' : 'bad'}">${msg}</div>
    <div class="row"><button class="btn primary" id="again">New set (new questions)</button>${R0.embedded ? '' : '<button class="btn" id="back">Back to practice</button>'}</div></div>`;
  const items0 = R0.items, opts = R0.again;
  host.querySelector('#again').onclick = () => { if (opts) opts(); };
  const b = host.querySelector('#back'); if (b) b.onclick = () => go('practice', R0.subj);
  if (R0.onDone) R0.onDone({ tried, right, pct });
  activeSubj = R0.embedded ? R0.subj : null;
}
function submitRun() {
  stopRunTimer(); clearTimeout(autosaveT); const R0 = RUN; ST.inProgress = null;
  const byStd = {}, bySubj = {}; let c = 0;
  R0.items.forEach((it, k) => { const ok = isRight(it, R0.resp[k]); if (ok) c++; (byStd[it.std] = byStd[it.std] || [0, 0]); byStd[it.std][1]++; if (ok) byStd[it.std][0]++; (bySubj[it.subj] = bySubj[it.subj] || [0, 0]); bySubj[it.subj][1]++; if (ok) bySubj[it.subj][0]++; logAttempt(it, ok, R0.kind); });
  const pct = Math.round(c / R0.items.length * 100);
  const rec = { id: R0.id, date: new Date().toISOString(), week: weekNo(), kind: R0.kind, subj: R0.subj, title: R0.title, unit: R0.unit, lessonId: R0.lessonId, score: c, total: R0.items.length, pct, byStd, bySubj,
    mins: Math.round((Date.now() - R0.startedAt) / 60000),
    items: R0.items.map((it, k) => ({ std: it.std, stem: strip(it.stem).slice(0, 220), resp: it.type === 'num' ? R0.resp[k] : R0.resp[k] == null ? null : 'ABCD'[R0.resp[k]], key: it.type === 'num' ? neg(it.answer) : 'ABCD'[it.key], ok: isRight(it, R0.resp[k]), work: R0.work[k] || '' })) };
  ST.results.push(rec);
  if (R0.kind === 'exit' && R0.lessonId) { const l = ST.lessons[R0.lessonId] = ST.lessons[R0.lessonId] || {}; l.done = true; l.exitPct = Math.max(l.exitPct || 0, pct); l.date = rec.date; }
  save(); document.body.classList.remove('testing'); activeSubj = null;
  if (R0.onDone) R0.onDone(rec);
  showResults(rec, R0);
}
function showResults(rec, R0) {
  const L = 'ABCD', host = $(R0.host);
  const missed = Object.entries(rec.byStd).filter(([, [a, b]]) => a / b < .7).map(([s]) => s);
  const cheer = rec.pct >= 90 ? `Outstanding, ${first()}! That is mastery.` : rec.pct >= 80 ? `Great job, ${first()}. You're on track.` : rec.pct >= 70 ? `Solid effort, ${first()}. A little more practice on the skills below will push this higher.` : rec.pct >= 50 ? `You're building, ${first()}. Every point here is a skill you now have. Let's target the gaps below.` : `This shows us exactly where to start, ${first()}. That's what assessments are for. Follow the practice plan below.`;
  host.innerHTML = `<div class="card result-head"><div class="row between"><div><span class="pill ${rec.subj}">${SUBJ[rec.subj].short}</span><h1>${rec.title}</h1><p class="muted">${cheer}</p></div>
    <div class="grade-badge"><div class="grade">${rec.kind === 'pre' ? '—' : letter(rec.pct)}</div><div class="muted">${rec.score} / ${rec.total} · ${rec.pct}%</div>${rec.kind === 'pre' ? '<div class="small muted">Diagnostic — not graded</div>' : ''}</div></div>
    ${rec.kind === 'ascend' ? `<div class="grid g3" style="margin-top:12px">${Object.entries(rec.bySubj).map(([s, [a, b]]) => `<div class="card subj-card" style="--c:${SUBJ[s].c}"><b>${SUBJ[s].name}</b><div class="big">${Math.round(a / b * 100)}%</div><span class="small muted">${a} / ${b}</span></div>`).join('')}</div>` : ''}
    <h3>Results by skill</h3>${Object.entries(rec.byStd).sort((x, y) => x[1][0] / x[1][1] - y[1][0] / y[1][1]).map(([s, [a, b]]) => masteryRow(s, a, b)).join('')}
    ${missed.length ? `<div class="callout" style="margin-top:14px"><b>Your practice plan:</b> ${missed.slice(0, 4).map(s => `<button class="btn sm" data-prac="${unitSubj(s)}|${s}">${s} · ${HUB.std[s]}</button>`).join(' ')}</div>` : ''}
    ${rec.kind === 'pre' ? placementNext() : ''}${rec.kind === 'exit' && rec.lessonId ? `<div class="row" style="margin-top:12px"><button class="btn primary" onclick="openLesson('${rec.lessonId}')">← Back to the lesson</button></div>` : ''}
    <div class="row" style="margin-top:16px">${R0.embedded ? '' : '<button class="btn ' + (rec.kind === 'pre' ? '' : 'primary') + '" onclick="go(\'report\')">Report card</button><button class="btn" onclick="go(\'tests\')">All tests</button><button class="btn" onclick="go(\'home\')">Dashboard</button>'}</div></div>
  <h2 style="margin-top:24px">Answer review</h2>
  ${R0.items.map((it, k) => { const ok = isRight(it, R0.resp[k]); const yours = R0.resp[k] == null || R0.resp[k] === '' ? '(no answer)' : it.type === 'num' ? esc(R0.resp[k]) : L[R0.resp[k]] + '. ' + it.choices[R0.resp[k]];
    return `<div class="card review ${ok ? 'ok' : 'no'}"><div class="small muted">${k + 1}. ${it.std} · ${HUB.std[it.std] || ''}${it.passage ? ' · ' + HUB.passages[it.passage].title : ''}</div><div class="stem">${it.stem}</div><div class="small">Your answer: <b>${yours}</b> ${ok ? '✓' : ''}</div>${ok ? `<details class="small"><summary>Why</summary>${it.explain}</details>` : fbHTML(it, false)}</div>`; }).join('')}`;
  host.querySelectorAll('[data-prac]').forEach(b => b.onclick = () => { const [s, std] = b.dataset.prac.split('|'); practiceStd(s, std); });
  if (!R0.embedded) scrollTo(0, 0);
}
function placementNext() {
  const next = SUBJS.find(s => !latest('pre', s));
  if (next) return `<div class="callout"><b>Placement: ${SUBJS.filter(s => latest('pre', s)).length} of 3 done.</b> Take a short break if you need one, then continue. <div class="row" style="margin-top:10px"><button class="btn primary" onclick="startTest('pre','${next}')">Next: ${SUBJ[next].name} placement →</button><button class="btn" onclick="go('placement')">Placement overview</button></div></div>`;
  return `<div class="callout good"><b>Placement complete. Great work!</b> Coach J now knows exactly where to start you. <div class="row" style="margin-top:10px"><button class="btn primary" onclick="go('placement')">See my Placement Report →</button></div></div>`;
}
function unitSubj(std) { for (const s of SUBJS) if (HUB.units[s].some(u => u.stds.includes(std))) return s; return 'math'; }
function masteryRow(s, a, b) {
  const p = Math.round(a / b * 100), t = p >= 80 ? ['Mastered', 'm'] : p >= 60 ? ['Developing', 'd'] : ['Needs support', 'n'];
  return `<div class="mastery"><div><b>${s}</b> <span class="muted">${HUB.std[s] || ''}</span></div><div class="bar ${t[1]}"><i style="width:${Math.max(p, 3)}%"></i></div><div class="small tag-${t[1]}">${p}% <span class="muted">(${a}/${b})</span></div></div>`;
}

/* ---------------- placement gate ---------------- */
const placementDone = () => ST.settings.skipPlacement || SUBJS.every(s => latest('pre', s));
function gated() { if (placementDone()) return false; go('placement'); return true; }

/* ---------------- launching activities ---------------- */
function startTest(kind, subj, unit) {
  if ((kind === 'quiz' || kind === 'post') && gated()) return;
  if (ST.inProgress && !confirm('You have a paused test. Starting a new one will discard it. Continue?')) return;
  ST.inProgress = null;
  let items, title;
  if (kind === 'ascend') { items = BLUEPRINT.ascend(); title = `The Ascend — ${weekNo() <= 3 ? 'Baseline' : weekNo() <= 12 ? 'Checkpoint' : 'Final'}`; subj = 'all'; }
  else if (kind === 'quiz') { items = BLUEPRINT.quiz(subj, unit); title = `Unit ${unit} Quiz: ${HUB.units[subj][unit].title}`; }
  else { items = BLUEPRINT[kind](subj); title = `${SUBJ[subj].name} ${kind === 'pre' ? 'Pre-Assessment' : 'Post-Assessment'}`; }
  startRun({ kind, subj, title, items, unit });
}
function startPractice(subj, opts, title, n = 10, host) {
  if (!host && gated()) return;
  const make = () => startRun({ kind: 'practice', subj, title, items: opts.items ? opts.items() : pickFrom(subj, n, opts), host, onDone: opts.onDone });
  make(); RUN.again = make;
}
function practiceStd(subj, std) { startPractice(subj, { stds: [std] }, `${std}: ${HUB.std[std]}`, subj === 'math' ? 8 : 6); }
function smartReview(subj) {
  const weak = weakest(subj, 4).map(w => w.std);
  const stds = weak.length ? weak : HUB.units[subj].filter(u => u.n <= currentUnit(subj)).flatMap(u => u.stds);
  startPractice(subj, { items: () => subj === 'read' ? pickReading(10, { stds }) : spread(subj, 10, stds) }, `Smart Review: ${SUBJ[subj].name}`);
}

/* ---------------- analytics ---------------- */
function mastery(subj) { // per standard: last 10 attempts
  const m = {}; for (let i = ST.log.length - 1; i >= 0; i--) { const a = ST.log[i]; if (a.s !== subj) continue; const x = m[a.std] = m[a.std] || { c: 0, t: 0 }; if (x.t < 10) { x.t++; x.c += a.ok; } }
  return m;
}
function weakest(subj, n) { const m = mastery(subj); return Object.entries(m).filter(([, v]) => v.t >= 2).map(([std, v]) => ({ std, p: Math.round(v.c / v.t * 100), t: v.t })).filter(x => x.p < 80).sort((a, b) => a.p - b.p).slice(0, n); }
function currentUnit(subj) { const l = lessonFor(subj, weekNo()); return l ? l.unit : HUB.units[subj].length - 1; }
function lessonFor(subj, w) { return HUB.lessons.find(l => l.subj === subj && l.week === w) || null; }
function quizWeek(subj, unit) { return Math.max(...HUB.lessons.filter(l => l.subj === subj && l.unit === unit).map(l => l.week)); }
function best(kind, subj, unit) { const r = ST.results.filter(x => x.kind === kind && x.subj === subj && (unit == null || x.unit === unit)); return r.length ? Math.max(...r.map(x => x.pct)) : null; }
function latest(kind, subj) { const r = ST.results.filter(x => x.kind === kind && x.subj === subj); return r.length ? r[r.length - 1] : null; }
function ascendParts(subj) { return ST.results.filter(r => r.kind === 'ascend' && r.bySubj[subj]).map(r => ({ date: r.date, title: r.title, pct: Math.round(r.bySubj[subj][0] / r.bySubj[subj][1] * 100) })); }
function avg(a) { return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; }
/* Grade = Unit quizzes 40% + Exit tickets 20% + Ascend 20% + Post-test 20% (re-weighted over what exists). Pre-tests are diagnostic only. Best attempt counts for retakes. */
function grade(subj) {
  const quizzes = HUB.units[subj].map(u => best('quiz', subj, u.n)).filter(x => x != null);
  const exits = HUB.lessons.filter(l => l.subj === subj).map(l => ST.lessons[l.id]?.exitPct).filter(x => x != null);
  const asc = ascendParts(subj).map(a => a.pct), post = latest('post', subj)?.pct;
  const cats = [['Unit quizzes', .4, avg(quizzes), quizzes.length], ['Exit tickets', .2, avg(exits), exits.length], ['The Ascend', .2, avg(asc), asc.length], ['Post-assessment', .2, post ?? null, post != null ? 1 : 0]];
  const have = cats.filter(c => c[2] != null), w = have.reduce((a, c) => a + c[1], 0);
  return { pct: have.length ? Math.round(have.reduce((a, c) => a + c[1] * c[2], 0) / w) : null, cats };
}
