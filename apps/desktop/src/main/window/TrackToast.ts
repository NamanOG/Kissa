import { BrowserWindow, screen } from 'electron'
import { WindowManager } from './WindowManager'
import type { TrackToastPayload } from './toastPayload'
export { sanitizeToastPayload } from './toastPayload'

/**
 * A small glass card in the corner of the screen when the song changes while Kissa is hidden.
 * It never takes focus (focusable: false, showInactive) and hides itself after a few seconds;
 * clicking it brings Kissa back. The page is self-contained HTML, so it costs no renderer bundle.
 */
const WIDTH = 404
const HEIGHT = 136
const OPEN_URL = 'https://kissa.invalid/open'
const DONE_URL = 'https://kissa.invalid/done'
const ACTION_URL = 'https://kissa.invalid/action/'

const SHOW_MS = 5200

const PAGE = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;font-family:"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;-webkit-user-select:none;user-select:none;-webkit-font-smoothing:antialiased}
:root{--accent:#d9a066}
.card{position:absolute;right:14px;bottom:14px;width:${WIDTH - 28}px;height:${HEIGHT - 32}px;box-sizing:border-box;display:flex;align-items:center;gap:14px;padding:12px 12px 12px 12px;border-radius:24px;cursor:pointer;overflow:hidden;isolation:isolate;
background:linear-gradient(180deg,#2a2521 0%,#1a1714 100%);
box-shadow:inset 0 1px 0 rgba(255,255,255,.09),inset 0 0 0 1px rgba(255,255,255,.07),0 22px 44px -16px rgba(0,0,0,.75),0 6px 14px -6px rgba(0,0,0,.55);
opacity:0;transform:translateY(16px) scale(.97);transition:opacity .42s cubic-bezier(.2,.8,.2,1),transform .6s cubic-bezier(.16,1,.3,1)}
.card::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(120% 140% at 0% 50%,color-mix(in srgb,var(--accent) 26%,transparent),transparent 62%);opacity:.9}
.card.in{opacity:1;transform:none}
.art{position:relative;width:80px;height:80px;border-radius:14px;flex:none;overflow:hidden;
background:radial-gradient(circle at 50% 50%,#0d0b0a 0 9%,color-mix(in srgb,var(--accent) 55%,#2a221c) 10% 30%,#121010 31% 100%);
box-shadow:0 10px 20px -8px rgba(0,0,0,.75),0 0 0 1px rgba(255,255,255,.08)}
.art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .35s ease}
.art img.on{opacity:1}
.text{min-width:0;flex:1;padding-right:2px}
.label{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:500;color:var(--accent);margin-bottom:4px;letter-spacing:.005em}
.eq{display:inline-flex;gap:2px;align-items:flex-end;height:9px}
.eq i{display:block;width:2px;border-radius:1px;background:var(--accent);animation:eq 1s ease-in-out infinite}
.eq i:nth-child(1){height:5px;animation-delay:-.2s}.eq i:nth-child(2){height:9px;animation-delay:-.5s}.eq i:nth-child(3){height:6px;animation-delay:-.8s}
.paused .eq i{animation:none;height:3px}
@keyframes eq{0%,100%{transform:scaleY(.45)}50%{transform:scaleY(1)}}
.eq i{transform-origin:bottom}
.title{font-family:"Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;font-size:16px;font-weight:600;letter-spacing:-.01em;color:#f7f1e9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.artist{font-size:13px;color:rgba(247,241,233,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}
.ctl{display:flex;gap:4px;flex:none;align-items:center}
.btn{width:36px;height:36px;border-radius:50%;border:0;padding:0;display:grid;place-items:center;cursor:pointer;color:#f7f1e9;background:transparent;transition:background .15s ease,transform .1s ease}
.btn:hover{background:rgba(255,255,255,.1)}
.btn:active{transform:scale(.92)}
.btn.main{background:rgba(255,255,255,.1)}
.btn.main:hover{background:rgba(255,255,255,.17)}
.btn svg{width:16px;height:16px;fill:currentColor}
.bar{position:absolute;left:24px;right:24px;bottom:0;height:2px;border-radius:2px;background:var(--accent);opacity:.5;transform-origin:left;transform:scaleX(0)}
.card.in .bar{transition:transform ${SHOW_MS}ms linear;transform:scaleX(1)}
.card:hover .bar{transition:none;transform:scaleX(0)}
</style></head><body><div class="card" id="c"><div class="art"><img id="a" alt=""></div><div class="text"><div class="label"><span class="eq"><i></i><i></i><i></i></span><span id="l"></span></div><div class="title" id="t"></div><div class="artist" id="r"></div></div>
<div class="ctl"><button class="btn main" id="pp" aria-label="Play or pause"></button><button class="btn" id="nx" aria-label="Next"><svg viewBox="0 0 16 16"><path d="M3 2.6v10.8c0 .5.5.8.9.5L11 8.5c.4-.3.4-.8 0-1.1L3.9 2.1c-.4-.3-.9 0-.9.5z"/><rect x="11.6" y="2.4" width="1.9" height="11.2" rx=".9"/></svg></button></div><div class="bar"></div></div>
<script>
const PLAY='<svg viewBox="0 0 16 16"><path d="M4.5 2.4v11.2c0 .6.6.9 1.1.6l8.6-5.6c.5-.3.5-.9 0-1.2L5.6 1.8c-.5-.3-1.1 0-1.1.6z"/></svg>';
const PAUSE='<svg viewBox="0 0 16 16"><rect x="3.4" y="2.2" width="3.4" height="11.6" rx="1.2"/><rect x="9.2" y="2.2" width="3.4" height="11.6" rx="1.2"/></svg>';
let timer=0,playing=true,shownKey='';const c=document.getElementById('c'),img=document.getElementById('a'),pp=document.getElementById('pp');
function setPlaying(p){playing=p;pp.innerHTML=p?PAUSE:PLAY;c.classList.toggle('paused',!p)}
function done(){c.classList.remove('in');setTimeout(()=>{location.href='${DONE_URL}'},460)}
function arm(ms){clearTimeout(timer);timer=setTimeout(done,ms)}
img.onload=()=>img.classList.add('on');img.onerror=()=>img.classList.remove('on');
window.render=function(p){
 const key=p.title+'\u0000'+(p.artist||'');const same=key===shownKey&&c.classList.contains('in');shownKey=key;
 document.getElementById('t').textContent=p.title;document.getElementById('r').textContent=p.artist||'';
 document.getElementById('l').textContent=p.label||'Now playing';
 if(p.accent)document.documentElement.style.setProperty('--accent',p.accent);
 setPlaying(p.playing!==false);
 const src=p.artwork||'';if(img.getAttribute('src')!==src){img.classList.remove('on');if(src)img.src=src;else img.removeAttribute('src')}
 if(same)return; // an update for the card on screen (the cover arrived): no new entrance
 c.classList.remove('in');void c.offsetWidth;requestAnimationFrame(()=>c.classList.add('in'));arm(${SHOW_MS})};
c.addEventListener('mouseenter',()=>clearTimeout(timer));
c.addEventListener('mouseleave',()=>arm(2200));
c.addEventListener('click',(e)=>{if(e.target.closest('.btn'))return;clearTimeout(timer);location.href='${OPEN_URL}'});
pp.addEventListener('click',()=>{setPlaying(!playing);location.href='${ACTION_URL}toggle'});
document.getElementById('nx').addEventListener('click',()=>{location.href='${ACTION_URL}next'});
</script></body></html>`

export class TrackToast {
  private static instance: TrackToast
  private win: BrowserWindow | null = null
  private ready: Promise<void> | null = null

  public static getInstance(): TrackToast {
    if (!TrackToast.instance) TrackToast.instance = new TrackToast()
    return TrackToast.instance
  }

  private ensureWindow(): Promise<void> {
    if (this.win && !this.win.isDestroyed() && this.ready) return this.ready
    const win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      hasShadow: false,
      thickFrame: false,
      backgroundColor: '#00000000',
      webPreferences: { sandbox: true, contextIsolation: true, javascript: true }
    })
    win.setAlwaysOnTop(true, 'pop-up-menu')
    win.webContents.on('will-navigate', (event, url) => {
      event.preventDefault()
      if (url.startsWith(OPEN_URL)) {
        this.hide()
        const main = WindowManager.getInstance().getMainWindow()
        if (main && !main.isDestroyed()) {
          if (main.isMinimized()) main.restore()
          main.show()
          main.focus()
        }
      } else if (url.startsWith(DONE_URL)) {
        this.hide()
      } else if (url.startsWith(ACTION_URL)) {
        // Play/pause and next, sent to the main window the way the taskbar buttons are.
        const action = url.slice(ACTION_URL.length) === 'next' ? 'playNext' : 'togglePlayPause'
        const main = WindowManager.getInstance().getMainWindow()
        if (main && !main.isDestroyed()) main.webContents.send('kissa:tray-action', action)
      }
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.on('closed', () => {
      this.win = null
      this.ready = null
    })
    this.win = win
    this.ready = win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(PAGE)}`).catch(() => undefined)
    return this.ready
  }

  private place(): void {
    if (!this.win) return
    const area = screen.getPrimaryDisplay().workArea
    this.win.setBounds({ x: area.x + area.width - WIDTH, y: area.y + area.height - HEIGHT, width: WIDTH, height: HEIGHT })
  }

  public async show(payload: TrackToastPayload): Promise<void> {
    const wm = WindowManager.getInstance()
    if (wm.isScreensaver) return
    await this.ensureWindow()
    const win = this.win
    if (!win || win.isDestroyed()) return
    this.place()
    try {
      await win.webContents.executeJavaScript(`window.render(${JSON.stringify(payload)})`)
    } catch {
      return
    }
    if (!win.isVisible()) win.showInactive()
  }

  public hide(): void {
    if (this.win && !this.win.isDestroyed() && this.win.isVisible()) this.win.hide()
  }

  public destroy(): void {
    if (this.win && !this.win.isDestroyed()) this.win.destroy()
    this.win = null
    this.ready = null
  }
}
