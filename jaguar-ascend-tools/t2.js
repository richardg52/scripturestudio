const { chromium } = require('playwright');
const URL='file://'+require('path').resolve(__dirname,'../tutoring-hub/index.html');
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined}).catch(()=>chromium.launch());
 const ctx=await b.newContext({viewport:{width:1360,height:900}});
 const p=await ctx.newPage(); const errs=[];
 p.on('pageerror',e=>errs.push('PAGE '+e.stack)); p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_/.test(m.text()))errs.push('CON '+m.text())});
 p.on('dialog',d=>d.accept());
 await p.route(/fonts\.g/,r=>r.abort());
 await p.goto(URL,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(300);
 await p.screenshot({path:'d-welcome.png'});
 await p.click('#wcl');
 // generator stress: every generator 300x
 const r=await p.evaluate(()=>{const bad=[];
   for(const s of ['math','eng']) for(const f of HUB[s]) { const n = f.make?300:1; for(let k=0;k<n;k++){ const it=inst(s,f); if(it.type==='num'){ if(!Number.isFinite(it.answer)) bad.push(s+' '+(f.id||f.std)+' num NaN'); continue;} const all=[it.correct,...it.distractors].map(String); if(all.length!==4||new Set(all).size!==4) bad.push(s+' '+(f.id||f.std)+': '+all.join(' | ')); if(/NaN|undefined|Infinity/.test(it.stem+all.join())) bad.push('NaN '+(f.id||f.std)+' '+it.stem); } }
   for(const q of HUB.read.concat(HUB.readPost)){ const all=[q.correct,...q.distractors]; if(all.length!==4||new Set(all).size!==4) bad.push('read '+q.stem); if(!HUB.passages[q.passage]) bad.push('nopassage '+q.passage); if(!HUB.std[q.std]) bad.push('nostd '+q.std);}
   for(const s of ['math','eng']) for(const f of HUB[s]) if(!HUB.std[f.std]) bad.push('nostd '+f.std);
   // blueprints
   const counts={}; const pos=[0,0,0,0];
   for(let k=0;k<40;k++){ for(const s of ['math','eng','read']){ for(const kind of ['pre','post']){ const it=balanceKeys(BLUEPRINT[kind](s)); counts[kind+s]=it.length; it.forEach(i=>{ if(i.type==='mc')pos[i.key]++; if(i.type==='mc'&&i.choices[i.key]!==i.correct) bad.push('key'); }); }
      HUB.units[s].forEach(u=>{ const q=BLUEPRINT.quiz(s,u.n); counts['quiz'+s+u.n]=q.length; }); }
     const a=BLUEPRINT.ascend(); counts.ascend=a.length; }
   for(const l of HUB.lessons){ const e=BLUEPRINT.exit(l); if(e.length<5) bad.push('exit short '+l.id+' '+e.length); }
   const post=BLUEPRINT.post('read'); if(post.some(i=>!HUB.passages[i.passage].reserved)) bad.push('post not reserved');
   const pre=BLUEPRINT.pre('read'); if(pre.some(i=>HUB.passages[i.passage].reserved)) bad.push('pre uses reserved');
   return {bad:bad.slice(0,20),nbad:bad.length,counts,pos,lessons:HUB.lessons.length,math:HUB.math.length,eng:HUB.engCount,read:HUB.readCount,readPost:HUB.readPost.length}});
 console.log(JSON.stringify(r));
 await p.screenshot({path:'d-home.png',fullPage:true});
 for(const v of ['plan','learn','practice','tests','report','guide','tutor']){ await p.evaluate(v=>go(v),v); await p.waitForTimeout(80);} 
 await p.evaluate(()=>go('plan')); await p.screenshot({path:'d-plan.png'});
 // take all pre tests + ascend with ~55% accuracy
 for(const s of ['math','eng','read']){ await p.evaluate(s=>startTest('pre',s),s); await p.evaluate(()=>{RUN.items.forEach((it,k)=>RUN.resp[k]=Math.random()<.55?(it.type==='num'?String(it.answer):it.key):(it.type==='num'?'999':(it.key+1)%4))}); await p.evaluate(()=>submitRun()); }
 await p.evaluate(()=>startTest('ascend')); await p.screenshot({path:'d-test.png'});
 await p.evaluate(()=>{RUN.items.forEach((it,k)=>RUN.resp[k]=Math.random()<.6?(it.type==='num'?String(it.answer):it.key):(it.type==='num'?'999':(it.key+1)%4))}); 
 // pause & resume
 await p.evaluate(()=>{pauseTest(); RUN=null; go('home');}); const ip=await p.evaluate(()=>!!ST.inProgress); console.log('paused',ip);
 await p.evaluate(()=>resumeTest()); await p.evaluate(()=>submitRun()); await p.screenshot({path:'d-results.png'});
 // quizzes
 for(const s of ['math','eng','read']) for(let u=0;u<3;u++){ await p.evaluate(([s,u])=>startTest('quiz',s,u),[s,u]); await p.evaluate(()=>{RUN.items.forEach((it,k)=>RUN.resp[k]=Math.random()<.75?(it.type==='num'?String(it.answer):it.key):0)}); await p.evaluate(()=>submitRun()); }
 // practice with coach: reading item with passage
 await p.evaluate(()=>practiceStd('math','A-REI.3')); await p.waitForTimeout(100); await p.screenshot({path:'d-coach1.png'});
 await p.click('#wAll'); await p.waitForTimeout(100); await p.click('#myTurn'); await p.waitForTimeout(100); await p.screenshot({path:'d-yourturn.png'});
 // answer wrong
 await p.evaluate(()=>{ const it=RUN.items[RUN.i]; RUN.resp[RUN.i]= it.type==='num'?'12345':(it.key+1)%4; RUN.checked[RUN.i]=true; logAttempt(it,false,'practice'); renderQ(); });
 await p.click('#walkMine'); await p.waitForTimeout(2500); await p.screenshot({path:'d-walkmine.png',fullPage:true});
 await p.click('#similar'); await p.waitForTimeout(100); await p.screenshot({path:'d-similar.png'});
 await p.evaluate(()=>practiceStd('read','RL.9.2')); await p.waitForTimeout(100); await p.click('#wAll'); await p.screenshot({path:'d-coachread.png'});
 // all lessons, all stages
 const lessonErrs = await p.evaluate(async()=>{ const out=[]; for(const l of HUB.lessons){ try{ openLesson(l.id); for(let st=0;st<5;st++){ document.querySelector(`.stagebar button[data-st="${st}"]`).click(); if(st===1){ document.querySelectorAll('[data-ex]').forEach(b=>b.click()); } } }catch(e){ out.push(l.id+': '+e.message); } } return out; });
 console.log('lessonErrs',lessonErrs);
 await p.evaluate(()=>openLesson('m4')); await p.click('.stagebar button[data-st="1"]'); await p.click('[data-ex="0"]'); await p.waitForTimeout(1200); await p.click('[data-ex="0"]'); await p.waitForTimeout(1200); await p.screenshot({path:'d-lesson-learn.png',fullPage:true});
 await p.click('.stagebar button[data-st="2"]'); await p.waitForTimeout(200); await p.screenshot({path:'d-lesson-together.png',fullPage:true});
 await p.evaluate(()=>openLesson('e8')); await p.click('.stagebar button[data-st="4"]'); await p.fill('#wr','Students should be allowed phones at lunch. According to a survey, 78% of parents agree. This shows families want contact. Therefore schools should allow it.'); await p.dispatchEvent('#wr','input'); await p.click('#wrSave'); await p.click('#exitBtn'); await p.evaluate(()=>{RUN.items.forEach((it,k)=>RUN.resp[k]=it.key)}); await p.evaluate(()=>submitRun());
 await p.evaluate(()=>go('report')); await p.waitForTimeout(100); await p.screenshot({path:'d-report.png',fullPage:true});
 await p.evaluate(()=>go('home')); await p.waitForTimeout(100); await p.screenshot({path:'d-home2.png',fullPage:true});
 await p.evaluate(()=>go('tutor')); await p.fill('#pin','1234'); await p.click('#pinGo'); await p.screenshot({path:'d-portal.png'});
 await p.evaluate(()=>go('tests')); await p.screenshot({path:'d-tests.png',fullPage:true});
 // dark
 await p.evaluate(()=>{document.documentElement.dataset.theme='dark'; go('home');}); await p.screenshot({path:'d-dark.png'});
 // mobile
 const m=await ctx.newPage(); await m.setViewportSize({width:390,height:844}); await m.route(/fonts\.g/,r=>r.abort()); m.on('pageerror',e=>errs.push('M '+e.message));
 await m.goto(URL,{waitUntil:'domcontentloaded'}); await m.waitForTimeout(200);
 const sw=[]; for(const v of ['home','plan','learn','practice','tests','report','guide']){ await m.evaluate(v=>go(v),v); sw.push(v+':'+await m.evaluate(()=>document.documentElement.scrollWidth)); }
 console.log('mobile widths',sw.join(' '));
 await m.evaluate(()=>go('home')); await m.screenshot({path:'d-mobile.png',fullPage:false});
 await m.click('#menuBtn'); await m.waitForTimeout(300); await m.screenshot({path:'d-mobile-menu.png'});
 console.log('errors',errs); await b.close();})();
