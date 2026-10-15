/* =====================================================================
   COACH J — the built-in virtual tutor
   Jaguar Ascend Hub · Designed and created by Dr. Richard G. Clark.
   Copyright © 2026 Dr. Richard G. Clark. All rights reserved.

   Teaching cycle for every new skill in practice ("I do → You do"):
     1. WATCH ME: Coach solves a problem of the same type, typing each step
        out loud (optional voice), explaining the thinking behind it.
     2. YOUR TURN: the student solves a fresh problem with new numbers.
     3. If wrong: Coach walks through the student's OWN problem step by step,
        then offers a similar problem to try again right away.
   ===================================================================== */
const COACH = { timers: [], voice: true };
function coachStop() { COACH.timers.forEach(clearInterval); COACH.timers = []; }
const coachFace = () => `<div class="face" aria-hidden="true"><svg><use href="#paw"/></svg></div>`;
function coachSays(html, who = 'Coach J') { return `<div class="coach">${coachFace()}<div class="bubble"><div class="who">${who}</div><div class="say">${html}</div></div></div>`; }

/* Turn any item into an ordered walkthrough. */
function walkSteps(it, demo) {
  const steps = [];
  const goal = it.subj === 'math' ? 'First I read the problem and ask: <b>what am I trying to find?</b>' : it.passage ? 'First I read the question carefully, then I go BACK to the passage. I never answer from memory.' : 'First I read the question carefully and underline the key words.';
  steps.push({ cls: 'think', html: goal });
  (it.hints || []).forEach(h => steps.push({ cls: 'think', html: h }));
  String(it.explain || '').split(/(?<=[.!?])\s+(?=[A-Z(“"<0-9−])/).map(s => s.trim()).filter(Boolean).forEach(s => steps.push({ cls: '', html: s }));
  const ans = it.type === 'num' ? neg(it.answer) : it.correct;
  steps.push({ cls: 'ans', html: `So the answer is <b>${ans}</b>.${it.subj === 'math' && /REI|EE\.4|CED\.1/.test(it.std) ? ' Then I <b>check</b> it by plugging it back in.' : ''}` });
  return steps;
}
/* Type a step out character by character, then swap in formatted HTML. */
function typeStep(li, html, done) {
  const txt = strip(html); let i = 0; li.classList.add('caret');
  if (COACH.voice && ST.settings.readAloud) speakText(html);
  const fast = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish = () => { li.classList.remove('caret'); li.innerHTML = html; done && done(); };
  if (fast) return finish();
  const step = Math.max(1, Math.round(txt.length / 70));
  const t = setInterval(() => { i += step; li.textContent = txt.slice(0, i); if (i >= txt.length) { clearInterval(t); finish(); } }, 22);
  COACH.timers.push(t);
}
/* Render a walkthrough into a host with Next / Show all controls. */
function runWalk(host, it, { title, onDone, tagLabel = 'Watch me — I do', auto = false } = {}) {
  coachStop();
  const steps = walkSteps(it);
  host.innerHTML = `<div class="walk">
    <div class="row between"><span class="tag">▶ ${tagLabel}</span><div class="row"><button class="btn sm ghost" id="wVoice">${COACH.voice ? '🔊 Voice on' : '🔇 Voice off'}</button></div></div>
    ${title ? `<h3 style="margin-top:12px">${title}</h3>` : ''}
    <div class="stem">${it.stem}</div>
    ${it.type === 'mc' && it.choices ? `<div class="small muted">Choices: ${it.choices.map((c, k) => `<b>${'ABCD'[k]}</b> ${c}`).join(' · ')}</div>` : ''}
    <ol class="wsteps" id="wSteps"></ol>
    <div class="row" id="wCtl"><button class="btn primary" id="wNext">Show first step</button><button class="btn ghost sm" id="wAll">Show all steps</button></div></div>`;
  let k = 0, busy = false;
  const list = host.querySelector('#wSteps'), next = host.querySelector('#wNext');
  const end = () => { host.querySelector('#wCtl').innerHTML = ''; onDone && onDone(); };
  const showNext = () => {
    if (busy || k >= steps.length) return; busy = true;
    const s = steps[k++], li = document.createElement('li'); if (s.cls) li.className = s.cls; list.appendChild(li);
    typeStep(li, s.html, () => { busy = false; if (k >= steps.length) end(); else { next.textContent = 'Next step →'; if (auto) setTimeout(showNext, 900); } });
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };
  next.onclick = showNext;
  host.querySelector('#wAll').onclick = () => { coachStop(); speechSynthesis?.cancel?.(); list.innerHTML = steps.map(s => `<li class="${s.cls}">${s.html}</li>`).join(''); k = steps.length; busy = false; end(); };
  host.querySelector('#wVoice').onclick = e => { COACH.voice = !COACH.voice; if (!COACH.voice) speechSynthesis?.cancel?.(); e.target.textContent = COACH.voice ? '🔊 Voice on' : '🔇 Voice off'; };
  if (auto) showNext();
}

/* A different problem of the same kind (new numbers / same skill). */
function similarItem(it) {
  const bank = BANK()[it.subj];
  if (it.src) { const f = bank.find(x => x.id === it.src); if (f && f.make) { for (let t = 0; t < 8; t++) { const n = inst(it.subj, f); if (n.stem !== it.stem) return n; } } }
  const same = bank.filter(x => x.std === it.std && (x.make || x.stem !== it.stem) && !(x.passage && HUB.passages[x.passage].reserved));
  const pref = it.passage ? same.filter(x => x.passage === it.passage && x.stem !== it.stem) : same;
  const f = pick(pref.length ? pref : same.length ? same : [it]);
  return inst(it.subj, f);
}
const demoKey = it => it.src || it.std;

/* Called by renderQ for practice runs. Returns true if Coach took over the screen. */
function coachIntercept(host, it) {
  if (!RUN || !RUN.practice || RUN.noCoach) return false;
  RUN.demoDone = RUN.demoDone || {};
  if (RUN.demoDone[demoKey(it)] || RUN.checked[RUN.i]) return false;
  const ex = RUN.demoEx && RUN.demoEx.key === demoKey(it) ? RUN.demoEx.item : (RUN.demoEx = { key: demoKey(it), item: balanceKeys([similarItem(it)])[0] }).item;
  const p = ex.passage ? HUB.passages[ex.passage] : null;
  host.innerHTML = `${RUN.embedded ? '' : `<div class="test-head"><div><span class="pill ${RUN.subj}">${SUBJ[RUN.subj].short} · Practice with Coach J</span><h2>${RUN.title}</h2></div><button class="btn sm" id="exitPr2">Exit practice</button></div>`}
    ${coachSays(`${pick(['Before you try one, watch me do one just like it.', 'Let me show you how I think through this kind of problem first.', 'Watch me first. Then it\'s your turn with new numbers.'])} <b>${HUB.std[it.std] || it.std}</b>. Click <b>Show first step</b>, and read each step before you go on.`)}
    <div class="qwrap ${p ? 'with-passage' : ''}">${p ? `<div class="passage"><div class="row between"><h4>${p.title} <span class="pill">${p.kind}</span></h4>${speakBtn('dpsg', 'Read passage')}</div><div class="psgbody" id="dpsg">${p.html}</div></div>` : ''}<div id="walkHost"></div></div>`;
  runWalk(host.querySelector('#walkHost'), ex, { onDone: () => {
    host.querySelector('#walkHost').insertAdjacentHTML('beforeend', `<div class="row" style="margin-top:14px"><button class="btn gold lg" id="myTurn">My turn →</button><button class="btn ghost sm" id="showAgain">Show me again</button></div>`);
    host.querySelector('#myTurn').onclick = () => { RUN.demoDone[demoKey(it)] = true; RUN.yourTurn = RUN.i; coachStop(); speechSynthesis?.cancel?.(); renderQ(); };
    host.querySelector('#showAgain').onclick = () => renderQ();
  } });
  const x = host.querySelector('#exitPr2'); if (x) x.onclick = () => { coachStop(); finishPractice(); };
  return true;
}
/* Feedback in practice: praise, or a guided walkthrough + "try a similar one". */
function coachFeedback(it, ok) {
  if (ok) return coachSays(`<b>${pick(['Yes! That\'s exactly it.', 'Correct — nice work.', 'You got it!', 'That\'s right. You\'re thinking like a pro.', 'Perfect. Keep that streak going.'])}</b><div class="explain small">${it.explain}</div>`);
  return coachSays(`<b>Not quite — and that's okay.</b> Mistakes show us exactly what to practice. The correct answer is <b>${keyText(it)}</b>.
    <div class="row" style="margin-top:10px"><button class="btn primary sm" id="walkMine">Walk me through it</button><button class="btn gold sm" id="similar">Try a similar one</button></div><div id="mineHost" style="margin-top:12px"></div>`);
}
function bindCoachFeedback(host, it) {
  const w = host.querySelector('#walkMine'), s = host.querySelector('#similar');
  if (w) w.onclick = () => { w.remove(); runWalk(host.querySelector('#mineHost'), it, { tagLabel: 'Let\'s walk through YOUR problem', auto: true }); };
  if (s) s.onclick = () => {
    coachStop(); const n = balanceKeys([similarItem(it)])[0], j = RUN.i + 1;
    RUN.items.splice(j, 0, n); ['resp', 'work', 'checked', 'hintsUsed', 'flag'].forEach(k => RUN[k].splice(j, 0, k === 'resp' ? null : k === 'work' ? '' : k === 'hintsUsed' ? 0 : false));
    RUN.demoDone = RUN.demoDone || {}; RUN.demoDone[demoKey(n)] = true; RUN.retry = j; RUN.i = j; renderQ();
  };
}
