const { chromium } = require('playwright');
const out=require('path').resolve(__dirname,'../tutoring-hub/icons')+'/';
const paw = (fill)=>`<g fill="${fill}"><ellipse cx="32" cy="42" rx="13" ry="11"/><ellipse cx="15" cy="27" rx="5.5" ry="7" transform="rotate(-18 15 27)"/><ellipse cx="25" cy="16" rx="5.5" ry="7.2"/><ellipse cx="39" cy="16" rx="5.5" ry="7.2"/><ellipse cx="49" cy="27" rx="5.5" ry="7" transform="rotate(18 49 27)"/></g>`;
const svg = (size, {rounded=true, scale=.62, splash=false}={}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#24124c"/><stop offset=".5" stop-color="#3a2270"/><stop offset="1" stop-color="#5b3aa3"/></linearGradient>
<radialGradient id="r" cx=".78" cy=".2" r=".6"><stop offset="0" stop-color="#f2b51d" stop-opacity=".35"/><stop offset="1" stop-color="#f2b51d" stop-opacity="0"/></radialGradient></defs>
<rect width="100" height="100" rx="${rounded?22:0}" fill="url(#g)"/><rect width="100" height="100" rx="${rounded?22:0}" fill="url(#r)"/>
<g transform="translate(${50-32*scale*100/64} ${50-32*scale*100/64 + 2}) scale(${scale*100/64})">${paw('#f2b51d')}</g></svg>`;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
 const p=await b.newPage();
 const shots=[['icon-192.png',192,{}],['icon-512.png',512,{}],['maskable-512.png',512,{rounded:false,scale:.46}],['apple-touch-icon.png',180,{rounded:false,scale:.56}],['favicon-32.png',32,{}],['icon-1024.png',1024,{rounded:false,scale:.56}]];
 for(const [n,sz,o] of shots){ await p.setViewportSize({width:sz,height:sz}); await p.setContent(`<html><body style="margin:0;background:transparent">${svg(sz,o)}</body></html>`); await p.screenshot({path:out+n,omitBackground:true,clip:{x:0,y:0,width:sz,height:sz}}); }
 // splash source 2732x2732
 await p.setViewportSize({width:2732,height:2732});
 await p.setContent(`<html><body style="margin:0;width:2732px;height:2732px;background:linear-gradient(135deg,#24124c,#3a2270 45%,#5b3aa3);display:grid;place-items:center;font-family:sans-serif"><div style="text-align:center"><svg width="520" height="520" viewBox="0 0 64 64">${paw('#f2b51d')}</svg><div style="color:#fff;font-size:150px;font-weight:800;margin-top:40px;letter-spacing:-4px">Jaguar <span style="color:#f2b51d">Ascend</span></div></div></body></html>`);
 await p.screenshot({path:out+'splash-2732.png'});
 await b.close();})();
