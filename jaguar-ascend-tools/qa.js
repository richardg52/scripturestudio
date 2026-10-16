const { chromium } = require('playwright');
const URL='file://'+require('path').resolve(__dirname,'../tutoring-hub/index.html');
const log=(...a)=>console.log(...a);
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 const p=await ctx.newPage(); const errs=[]; const issues=[];
 p.on('pageerror',e=>errs.push('PAGE '+e.stack.split('\n').slice(0,3).join(' | '))); p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_|net::/.test(m.text()))errs.push('CON '+m.text())});
 p.on('dialog',d=>d.accept());
 await p.route(/fonts\.g/,r=>r.abort());
 await p.goto(URL,{waitUntil:'domcontentloaded'});
 await p.evaluate(()=>{ window.print=()=>{}; });
 const vis=async s=>p.locator(s).first().isVisible().catch(()=>false);
 const click=async (s,label)=>{ try{ await p.locator(s).first().click({timeout:4000}); }catch(e){ issues.push('CLICK FAIL '+(label||s)+': '+e.message.split('\n')[0]); } };
 // splash
 log('splash visible', await vis('#splash')); await p.screenshot({path:'splash.png'});
 await click('#splash','splash'); await p.waitForTimeout(700);
 log('welcome visible', await vis('#wcl')); await click('#wcl','welcome');
 log('crumb', await p.textContent('#crumb'));
 // gates
 for(const v of ['learn','practice']){ await click(`#tabs button[data-view="${v}"]`); const t=await p.textContent('#app h1'); if(!/Placement/.test(t)) issues.push('gate missing on '+v+' -> '+t); }
 await click('#tabs button[data-view="plan"]'); await click('#app [data-lesson]','plan lesson link'); if(!/Placement/.test(await p.textContent('#app h1'))) issues.push('plan lesson link not gated');
 await click('#tabs button[data-view="tests"]'); await click('[data-t^="quiz"]','quiz btn'); if(!/Placement/.test(await p.textContent('#app h1'))) issues.push('quiz not gated');
 // answer helper through UI
 async function answerAll(acc=0.6, opts={}){
   for(let guard=0; guard<80; guard++){
     if(await vis('#numAns')){ const ans=await p.evaluate(()=>String(RUN.items[RUN.i].answer)); await p.fill('#numAns', Math.random()<acc?ans:'7777'); }
     else if(await vis('.choice')){ const k=await p.evaluate(()=>RUN.items[RUN.i].key); const n=Math.random()<acc?k:(k+1)%4; await p.locator('.choice').nth(n).click(); }
     if(opts.work && await vis('.showwork summary')){ await p.locator('.showwork summary').click(); await p.fill('#work','step 1\nstep 2'); }
     if(await vis('#qNext')) await p.click('#qNext'); else if(await vis('#qSubmit')){ await p.click('#qSubmit'); return; } else { issues.push('no next/submit'); return; }
   }
 }
 // placement via UI
 await click('#tabs button[data-view="placement"]'); await click('#nextPre','begin placement');
 log('test head', await p.textContent('.test-head h2'));
 log('tools hidden in test', !(await vis('#toolbar button')), 'sidebar hidden', !(await vis('.sidebar')));
 // flag & qnav
 await click('#flagBtn'); await click('.qnav button:nth-child(3)'); await click('#qPrev');
 await answerAll(.5,{work:true});
 log('after math pre', await p.textContent('#app h1'));
 await click('text=Next: English I placement'); await answerAll(.6);
 await click('text=Next: Reading placement'); log('reading passage shown', await vis('.passage')); await answerAll(.6);
 await click('text=See my Placement Report'); log('placement report', await p.textContent('#app h1')); await p.screenshot({path:'placement.png',fullPage:true});
 // ascend + pause/resume via UI
 await click('#ascB','ascend'); await answerAll.call(null,.6).catch(()=>{}); 
 // (answerAll submits) -> retake to test pause
 await click('#tabs button[data-view="tests"]'); await click('[data-t="ascend|all"]'); await p.locator('.choice').first().click(); await click('#pauseBtn','pause');
 log('resume banner', await vis('#resume')); await click('#resume'); log('resumed', await vis('#tmr')); await answerAll(.6);
 // dashboard missions
 await click('#tabs button[data-view="home"]'); await p.screenshot({path:'home.png',fullPage:true});
 const missionBtns = await p.locator('#missionCard .mission-item button').count(); log('mission buttons', missionBtns);
 // lesson full walk-through via UI
 await click('#tabs button[data-view="learn"]'); await click('[data-lesson="m4"]');
 log('lesson title', await p.textContent('#app h1'));
 // warmup: answer, check, coach? (noCoach) 
 async function practiceLoop(max=12){
   for(let g=0; g<max*4; g++){
     if(await vis('#wAll')){ await click('#wAll'); await click('#myTurn','my turn'); continue; }
     if(await vis('#again')) return 'finished';
     if(await vis('#qCheck')){
       if(await vis('#hintBtn')) await click('#hintBtn');
       if(await vis('#numAns')){ const ans=await p.evaluate(()=>String(RUN.items[RUN.i].answer)); await p.fill('#numAns', Math.random()<.6?ans:'7777'); }
       else if(await vis('#lessonRun .choice, #app .choice:not(.check .choice)')){ const k=await p.evaluate(()=>RUN.items[RUN.i].key); await p.locator('.qcard .choice').nth(Math.random()<.6?k:(k+1)%4).click(); }
       await click('#qCheck');
       if(await vis('#walkMine')){ await click('#walkMine'); await p.waitForTimeout(300); if(await vis('#mineHost #wAll')) await click('#mineHost #wAll'); await click('#similar'); continue; }
       continue;
     }
     if(await vis('#qNext')){ await click('#qNext'); continue; }
     if(await vis('#qSubmit')){ await click('#qSubmit'); continue; }
     return 'stuck';
   }
   return 'max';
 }
 log('warmup', await practiceLoop(3));
 await click('#lNext'); // learn
 for(let i=0;i<12;i++){ if(await vis('[data-ex="0"]')){ await click('[data-ex="0"]'); await p.waitForTimeout(900);} }
 log('example complete', await vis('text=✓ Example complete'));
 await click('[data-speak="learnTxt"]','read aloud');
 await click('#lNext'); // together
 const nChecks = await p.locator('.check').count(); for(let i=0;i<nChecks;i++) await p.locator('.check').nth(i).locator('.choice').first().click();
 log('checks answered', nChecks, await p.locator('.check .callout').count());
 log('together practice', await practiceLoop(3)); await p.screenshot({path:'together.png',fullPage:true});
 await click('#lNext'); log('you do', await practiceLoop(8));
 await click('#lNext'); await p.fill('#sm','I would plug 6 back in and check both sides match.'); await click('#smSave'); log('showme saved', await p.textContent('#smMsg'));
 await click('#exitBtn'); await answerAll(.8,{work:true}); log('back to lesson btn', await vis('text=← Back to the lesson')); await click('text=← Back to the lesson'); log('back in lesson', await p.textContent('#app h1'));
 // english writing lesson
 await click('#tabs button[data-view="learn"]'); await click('.seg button[data-s="eng"]'); await click('[data-lesson="e8"]'); await click('.stagebar button[data-st="4"]');
 await p.fill('#wr','Schools should allow phones at lunch. According to a survey, 78% of parents agree. This shows families want contact. Therefore it makes sense.'); log('checklist ticks', await p.locator('#wrChk .tag-m').count()); await click('#wrSave');
 // reading lesson coach with passage
 await click('#tabs button[data-view="learn"]'); await click('.seg button[data-s="read"]'); await click('[data-lesson="r3"]'); await click('.stagebar button[data-st="2"]'); log('reading together', await practiceLoop(3));
 // practice view
 for(const s of ['math','eng','read']){ await click('#tabs button[data-view="practice"]'); await click(`.seg button[data-s="${s}"]`); await click('.skill'); log('practice '+s, await practiceLoop(10)); if(await vis('#again')){ await click('#again'); await p.waitForTimeout(100); log('again ok', await vis('#wAll, #qCheck')); } }
 await click('#tabs button[data-view="practice"]'); await click('#smart'); log('smart', await practiceLoop(10)); await click('#back','back to practice');
 await click('#mixed'); await click('#wAll'); await click('#myTurn'); await click('#exitPr','exit practice');
 // quizzes from tests page
 await click('#tabs button[data-view="tests"]'); const nq=await p.locator('[data-t^="quiz"]').count(); log('quiz buttons', nq);
 for(const sel of ['[data-t="quiz|math|0"]','[data-t="quiz|eng|1"]','[data-t="quiz|read|2"]']){ await click('#tabs button[data-view="tests"]'); await click(sel); await answerAll(.75); }
 await click('[data-prac]','results practice plan'); log('practice from results', await vis('#wAll, #qCheck'));
 // post test
 await click('#tabs button[data-view="tests"]'); await click('[data-t="post|read"]'); log('post passage reserved', await p.evaluate(()=>HUB.passages[RUN.items[0].passage].reserved)); await answerAll(.8);
 // plan links
 await click('#tabs button[data-view="plan"]'); await click('a[data-quiz]'); log('plan quiz opened', await vis('#tmr')); await answerAll(.7);
 // report
 await click('#tabs button[data-view="report"]'); await click('text=Print / Save PDF'); await p.screenshot({path:'report.png',fullPage:true});
 // portal
 await click('#tabs button[data-view="tutor"]'); await p.fill('#pin','0000'); await click('#pinGo'); log('wrong pin blocked', await vis('#pinGo'));
 await p.fill('#pin','1234'); await click('#pinGo'); log('portal open', await vis('#saveSet'));
 await p.fill('#tCoun','Ms. Example'); await p.check('#fExt'); await click('#saveSet'); log('saved', await p.textContent('#saveMsg'));
 if(await vis('[data-score]')){ await p.selectOption('[data-score] >> nth=0','4'); await p.fill('[data-cmt] >> nth=0','Great reasoning!'); await p.dispatchEvent('[data-cmt] >> nth=0','change'); }
 const [dl]=await Promise.all([p.waitForEvent('download'), p.click('#exp')]); const fp='backup.json'; await dl.saveAs(fp); log('export ok', require('fs').statSync(fp).size);
 await p.setInputFiles('#imp', fp); await p.waitForTimeout(400); log('after import', await p.textContent('#crumb'));
 await click('#tabs button[data-view="tutor"]'); if(await vis('#pin')){ await p.fill('#pin','1234'); await click('#pinGo'); } await click('#lock2','lock');
 // tests with ext time
 await click('#tabs button[data-view="tests"]'); await click('[data-t="pre|math"]'); log('ext time', await p.textContent('#tmr')); await click('#pauseBtn');
 // tools
 await click('#tabs button[data-view="home"]'); if(await vis('#resume')) { await click('#resume'); await answerAll(.5); await click('#tabs button[data-view="home"]'); }
 await click('[data-tool="calc"]'); await p.fill('#calcScreen','2^3+√(16)'); await p.press('#calcScreen','Enter'); log('calc', await p.inputValue('#calcScreen'));
 await click('#calcKeys button:has-text("C")'); await click('#calcKeys button:has-text("7")'); await click('#calcKeys button:has-text("×")'); await click('#calcKeys button:has-text("6")'); await click('#calcKeys button:has-text("=")'); log('calc keys', await p.inputValue('#calcScreen'));
 await click('[data-tool="formula"]'); log('formula open', await vis('#drawer-formula')); await click('#drawer-formula .x'); log('formula closed', !(await vis('#drawer-formula')));
 await click('[data-tool="timer"]'); await click('#timerStart'); await p.waitForTimeout(1200); log('timer', await p.textContent('#timerShow')); await click('#timerStop');
 await click('[data-tool="ref"]');
 await click('#themeBtn'); log('theme', await p.evaluate(()=>document.documentElement.dataset.theme)); await p.screenshot({path:'dark.png'}); await click('#themeBtn');
 // guide & placement pages
 await click('#tabs button[data-view="guide"]'); await click('#tabs button[data-view="placement"]');
 // reload persistence
 await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(200); log('splash on reload (should be skipped)', await vis('#splash')); log('results persisted', await p.evaluate(()=>ST.results.length));
 // MOBILE
 const m=await ctx.newPage(); await m.setViewportSize({width:390,height:844}); await m.route(/fonts\.g/,r=>r.abort()); m.on('pageerror',e=>errs.push('M '+e.message)); m.on('dialog',d=>d.accept());
 await m.goto(URL,{waitUntil:'domcontentloaded'}); await m.waitForTimeout(200);
 await m.click('#menuBtn'); await m.waitForTimeout(300); await m.click('#tabs button[data-view="report"]'); await m.waitForTimeout(300);
 log('mobile nav closed after select', !(await m.evaluate(()=>document.body.classList.contains('nav-open'))));
 const widths=[]; for(const v of ['home','placement','plan','learn','practice','tests','report','guide','tutor']){ await m.evaluate(v=>go(v),v); widths.push(v+':'+await m.evaluate(()=>document.documentElement.scrollWidth)); }
 log('mobile widths', widths.join(' '));
 await m.evaluate(()=>startTest('quiz','read',3)); await m.screenshot({path:'mobile-test.png'}); log('mobile test width', await m.evaluate(()=>document.documentElement.scrollWidth));
 await m.evaluate(()=>{pauseTest();RUN=null;go('learn','math')}); await m.click('[data-lesson="m10"]'); await m.click('.stagebar button[data-st="2"]'); await m.waitForTimeout(200); await m.screenshot({path:'mobile-lesson.png'});
 log('ISSUES', issues); log('ERRORS', errs);
 await b.close();})();
