/**
 * The Desktop lyrics page: self-contained HTML and CSS (no network, no preload), kept apart
 * from the window logic in DesktopLyricsWindow. The page exposes
 * window.render(frame) and window.configure({ locked, size, labels }) and reports clicks by
 * navigating to `${action}<name>` (lock, unlock, close, size/s|m|l, hover/on|off).
 */
export function desktopLyricsPage(action: string): string {
  const LOCK_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7"/></svg>'
  const UNLOCK_ICON =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.2" y="7" width="9.6" height="6.6" rx="1.6"/><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5-1"/></svg>'
  const CLOSE_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/></svg>'

  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;-webkit-user-select:none;user-select:none;cursor:default;
font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
:root{--accent:#e2b98a;--cur:40px;--next:22px}
body.s{--cur:30px;--next:17px}body.l{--cur:52px;--next:28px}
.stage{position:absolute;inset:6px;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0 64px;box-sizing:border-box;transition:background-color .2s ease,box-shadow .2s ease}
body.unlocked .stage{-webkit-app-region:drag;background:rgba(14,12,10,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
.lines{display:flex;flex-direction:column;align-items:center;gap:6px;max-width:100%;opacity:0;transition:opacity .45s cubic-bezier(.22,1,.36,1)}
.lines.on{opacity:1}
.cur,.next{max-width:100%;text-align:center;text-wrap:balance;
text-shadow:0 1px 2px rgba(0,0,0,.6),0 2px 12px rgba(0,0,0,.42),0 0 28px rgba(0,0,0,.25)}
.cur{--lit:color-mix(in srgb,var(--accent) 34%,#fffaf2);font-size:var(--cur);font-weight:650;line-height:1.16;letter-spacing:-.012em;
color:var(--lit);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.next{font-size:var(--next);font-weight:500;line-height:1.2;color:rgba(255,250,242,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cur.in{animation:rise .38s cubic-bezier(.22,1,.36,1)}
.cur .w{position:relative;color:rgba(255,250,242,.42)}
.cur .f{position:absolute;left:0;top:0;white-space:nowrap;color:var(--lit);text-shadow:none;clip-path:inset(-25% calc(100% - var(--p,0%)) -25% -4%)}
@keyframes rise{from{opacity:.25;transform:translateY(5px)}to{opacity:1;transform:none}}
.ctl{position:absolute;top:12px;right:14px;display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;
background:rgba(22,19,17,.86);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 6px 16px rgba(0,0,0,.35);
-webkit-app-region:no-drag;opacity:0;pointer-events:none;transition:opacity .18s ease}
body.unlocked .ctl,body.hover .ctl{opacity:1;pointer-events:auto}
.b{height:26px;min-width:26px;padding:0 7px;border:0;border-radius:999px;background:transparent;color:rgba(255,250,242,.72);
font:600 11.5px "Segoe UI",system-ui,sans-serif;display:grid;place-items:center;cursor:pointer;transition:background-color .12s ease,color .12s ease}
.b:hover{background:rgba(255,255,255,.12);color:#fff}
.b[aria-pressed="true"]{background:rgba(255,255,255,.17);color:#fff}
.b:focus-visible{outline:2px solid rgba(255,255,255,.8);outline-offset:1px}
.b svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.sep{width:1px;height:14px;margin:0 3px;background:rgba(255,255,255,.16)}
.b{position:relative}
.b[data-tip]:hover::after,.b[data-tip]:focus-visible::after{content:attr(data-tip);position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;font:500 12px/1.3 'Segoe UI Variable','Segoe UI',sans-serif;color:rgba(255,255,255,.92);padding:5px 9px;border-radius:7px;background:rgba(18,18,22,.88);box-shadow:inset 0 0 0 .5px rgba(255,255,255,.14),0 8px 20px -6px rgba(0,0,0,.6);pointer-events:none;animation:tip .14s .45s both}
@keyframes tip{from{opacity:0}to{opacity:1}}
@media (prefers-reduced-motion: reduce){.b::after{animation-duration:0s!important}.lines,.stage,.ctl,.b{transition:none}.cur.in{animation:none}.cur .w{color:var(--lit)}.cur .f{display:none}}
</style></head><body class="m"><div class="stage"><div class="lines" id="ln"><div class="cur" id="cur"></div><div class="next" id="nx"></div></div></div>
<div class="ctl" id="ctl" role="toolbar"><button class="b" id="lk"></button><span class="sep"></span>
<button class="b" data-size="s">S</button><button class="b" data-size="m">M</button><button class="b" data-size="l">L</button>
<span class="sep"></span><button class="b" id="cl">${CLOSE_ICON}</button></div>
<script>
  const go=(p)=>{location.href='${action}'+p};
  const ln=document.getElementById('ln'),cur=document.getElementById('cur'),nx=document.getElementById('nx'),ctl=document.getElementById('ctl'),lk=document.getElementById('lk'),cl=document.getElementById('cl');
let locked=false,overCtl=false,hoverTimer=0,labels={};
function setLabels(l){labels=l;cl.dataset.tip=l.close;cl.setAttribute('aria-label',l.close);
 document.querySelectorAll('[data-size]').forEach(b=>{const t=l.size+' '+b.dataset.size.toUpperCase();b.dataset.tip=t;b.setAttribute('aria-label',t)});paintLock()}
function paintLock(){lk.innerHTML=locked?'${LOCK_ICON}':'${UNLOCK_ICON}';const t=locked?labels.unlock:labels.lock;lk.dataset.tip=t||'';lk.setAttribute('aria-label',t||'');lk.setAttribute('aria-pressed',String(locked))}
window.configure=function(c){locked=!!c.locked;document.body.classList.toggle('unlocked',!locked);
 document.body.classList.remove('s','m','l');document.body.classList.add(c.size);
 document.querySelectorAll('[data-size]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===c.size)));
 if(c.labels)setLabels(c.labels);else paintLock()};
// Word by word: each word is a dim span with a lit copy on top, revealed left to right by
// clip-path as it is sung. The fill runs here, from the line's word timings, so the app sends
// one message per line; it only writes when a word's percentage changes and stops at the end.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let raf=0,t0=0,els=[],timing=[],lineKey='';
function fill(){const t=(performance.now()-t0)/1000;let done=true;
 for(let i=0;i<els.length;i++){const w=timing[i];const p=t>=w.end?100:t<=w.start?0:Math.round((t-w.start)/Math.max(.01,w.end-w.start)*100);
  if(p<100)done=false;if(els[i].k!==p){els[i].k=p;els[i].style.setProperty('--p',p+'%')}}
 raf=done?0:requestAnimationFrame(fill)}
function setLine(f){cancelAnimationFrame(raf);raf=0;els=[];timing=f.words||[];cur.textContent='';
 if(!timing.length){cur.textContent=f.current;return}
 timing.forEach((w,i)=>{if(i)cur.appendChild(document.createTextNode(' '));
  const s=document.createElement('span');s.className='w';s.textContent=w.text;
  const o=document.createElement('span');o.className='f';o.setAttribute('aria-hidden','true');o.textContent=w.text;
  s.appendChild(o);cur.appendChild(s);els.push(s)});
 t0=performance.now()-((f.elapsed||0)+0.15)*1000;if(!reduce.matches)fill()}
window.render=function(f){
 if(f.accent)document.documentElement.style.setProperty('--accent',f.accent);
 if(f.visible){const key=f.current+'|'+(f.lineStart??'');
  if(key!==lineKey){lineKey=key;setLine(f);cur.classList.remove('in');void cur.offsetWidth;cur.classList.add('in')}
  nx.textContent=f.next}
 else{cancelAnimationFrame(raf);raf=0;lineKey=''}
 ln.classList.toggle('on',!!f.visible)};
lk.addEventListener('click',()=>go(locked?'unlock':'lock'));
cl.addEventListener('click',()=>go('close'));
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>go('size/'+b.dataset.size)));
// Locked: the window ignores the mouse but still hears it move. Show the controls for a moment,
// and let the window take clicks only while the pointer is on them.
document.addEventListener('mousemove',(e)=>{
 if(!locked)return;document.body.classList.add('hover');clearTimeout(hoverTimer);
 hoverTimer=setTimeout(()=>{if(!overCtl)document.body.classList.remove('hover')},1600);
 const on=!!(e.target&&e.target.closest&&e.target.closest('.ctl'));
 if(on!==overCtl){overCtl=on;go(on?'hover/on':'hover/off')}});
document.addEventListener('mouseleave',()=>{if(overCtl){overCtl=false;go('hover/off')}});
</script></body></html>`
}
