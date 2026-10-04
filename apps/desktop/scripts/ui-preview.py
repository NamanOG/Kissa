"""Browser preview of the renderer without Electron.

Copies the built renderer (out/renderer) to out/ui-preview and injects a
stand-in for the preload bridge, so the interface can be opened in a normal
browser with a pretend track playing, lyrics and all.

    npx electron-vite build
    python scripts/ui-preview.py
    python -m http.server 5181 --directory out/ui-preview

Page controls (browser console): __mock.pause(), __mock.play(), __mock.next(),
__mock.idle(), __mock.seek(seconds), __mock.lyrics('synced'|'plain'|'none'|'instrumental').
"""
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'out' / 'renderer'
DST = ROOT / 'out' / 'ui-preview'

MOCK = r"""
<script>
(() => {
  const art = (a, b, c) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 600
    const g = cv.getContext('2d')
    const lg = g.createLinearGradient(0, 0, 600, 600); lg.addColorStop(0, a); lg.addColorStop(1, b)
    g.fillStyle = lg; g.fillRect(0, 0, 600, 600)
    g.fillStyle = c; g.beginPath(); g.arc(410, 220, 150, 0, 7); g.fill()
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, 430, 600, 170)
    return cv.toDataURL('image/jpeg', 0.86)
  }
  const TRACKS = [
    { title: 'Paper Lanterns', artist: 'The Quiet Hours', album: 'Rooms We Left', duration: 214, sourceAppId: 'Spotify.exe', sourceAppName: 'Spotify', art: art('#c2410c', '#1c1917', '#fbbf24') },
    { title: 'Blue Hour, Slow Train (Live at the Old Exchange)', artist: 'Marlowe & The Night Shift', album: 'Platform Nine', duration: 187, sourceAppId: 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App', sourceAppName: 'Apple Music', art: art('#1e3a8a', '#020617', '#93c5fd') },
    { title: 'Greenhouse', artist: 'Odile', album: 'Greenhouse', duration: 251, sourceAppId: 'chrome.exe', sourceAppName: 'Chrome', art: art('#365314', '#0c0a09', '#d9f99d') }
  ]
  const LINES = [
    'We hung the lanterns one by one', 'Along the wire above the yard', 'The evening had not yet begun',
    'And nothing then was very hard', 'You said the light would find its way', 'Through paper thin as morning air',
    'I held the ladder, heard you say', 'That some things only glow up there', 'So let it burn, so let it sway',
    'A little fire for the dark', 'We will not need it in the day', 'But night is long and night is stark',
    'The neighbours watched us from the stair', 'The radio was playing low', 'I think we were already there',
    'The place we always meant to go', 'Now every summer when it rains', 'I see them swinging on the line',
    'The paper, wire, the window panes', 'Your hand a moment held in mine'
  ]
  const stamp = (s) => `[${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}]`
  const synced = LINES.map((l, i) => `${stamp(6 + i * 5.2 + (i > 9 ? 9 : 0))} ${l}`).join('\n')
  let lyricsMode = 'synced', index = 0, playing = true, base = 20, anchor = performance.now(), idle = false
  const listeners = new Set()
  const pos = () => {
    const d = TRACKS[index].duration
    const p = base + (playing ? (performance.now() - anchor) / 1000 : 0)
    if (p >= d) { api.next(); return 0 }
    return p
  }
  const payload = () => {
    if (idle) return null
    const t = TRACKS[index]
    return { sourceAppId: t.sourceAppId, sourceAppName: t.sourceAppName, title: t.title, artist: t.artist, album: t.album,
      artworkDataUrl: t.art, isPlaying: playing, progress: pos(), duration: t.duration, lastUpdatedTime: Date.now(), volume: 62, isMuted: false }
  }
  const emit = () => { const p = payload(); listeners.forEach((l) => l(p)) }
  const set = (p) => { base = p; anchor = performance.now() }
  const api = {
    play() { if (!playing) { anchor = performance.now(); playing = true; emit() } },
    pause() { if (playing) { base = pos(); playing = false; emit() } },
    next() { index = (index + 1) % TRACKS.length; set(0); emit() },
    prev() { index = (index + TRACKS.length - 1) % TRACKS.length; set(0); emit() },
    seek(s) { set(s); emit() },
    idle(v = true) { idle = v; emit() },
    lyrics(m) { lyricsMode = m }
  }
  window.__mock = api
  setInterval(emit, 1000)
  const real = {
    getSystemMedia: async () => payload(),
    onSystemMediaUpdate: (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    getLyrics: async () => {
      await new Promise((r) => setTimeout(r, 350))
      if (lyricsMode === 'none') return null
      if (lyricsMode === 'instrumental') return { syncedLyrics: null, plainLyrics: null, instrumental: true }
      if (lyricsMode === 'plain') return { syncedLyrics: null, plainLyrics: LINES.join('\n'), instrumental: false }
      return { syncedLyrics: synced, plainLyrics: LINES.join('\n'), instrumental: false, duration: TRACKS[index].duration }
    },
    getVolume: async () => ({ master: 62, isMuted: false }),
    mediaPlayPause: async () => { playing ? api.pause() : api.play() },
    mediaNext: async () => api.next(),
    mediaPrev: async () => api.prev(),
    mediaSeek: async (s) => api.seek(s),
    getAppVersion: async () => '4.2.0',
    isScreensaver: async () => false,
    isScreensaverRegistered: async () => false,
    setFullScreen: async (v) => v,
    getUpdateStatus: async () => ({ state: 'idle', currentVersion: '4.2.0' }),
    checkForUpdates: async () => ({ state: 'up-to-date', currentVersion: '4.2.0' }),
    openExternal: async (u) => { console.log('[mock] openExternal', u) }
  }
  window.electron = new Proxy(real, {
    get: (t, k) => (k in t ? t[k] : typeof k === 'string' && k.startsWith('on') ? () => () => {} : async () => undefined)
  })
})()
</script>
"""


def main() -> None:
    if not SRC.exists():
        raise SystemExit('Build the renderer first: npx electron-vite build')
    if DST.exists():
        shutil.rmtree(DST)
    shutil.copytree(SRC, DST)
    index = DST / 'index.html'
    html = index.read_text(encoding='utf-8')
    marker = '<script type="module"'
    assert marker in html, 'module script tag not found'
    index.write_text(html.replace(marker, MOCK + marker, 1), encoding='utf-8')
    print(f'Preview written to {DST}')


if __name__ == '__main__':
    main()
