// Runs only on https://music.youtube.com (see manifest). Reads the player's own media
// metadata and the <video> element's playback state, nothing else on the page, and hands
// them to the extension's background worker. Ads are flagged so Kissa never shares them.
;(() => {
  const HEARTBEAT_MS = 5000
  const POLL_MS = 1000
  let lastKey = ''
  let lastSentAt = 0
  let lastPosition = 0
  let lastPositionAt = 0

  function isAd() {
    const player = document.getElementById('movie_player')
    return Boolean(
      (player && player.classList.contains('ad-showing')) ||
        document.querySelector('.ytp-ad-player-overlay, .ytp-ad-text, ytmusic-player-bar[is-ad]')
    )
  }

  function biggestArtwork(metadata) {
    const art = Array.from((metadata && metadata.artwork) || [])
    art.sort((a, b) => (parseInt(b.sizes, 10) || 0) - (parseInt(a.sizes, 10) || 0))
    return art.length ? art[0].src : undefined
  }

  function read() {
    const video = document.querySelector('video')
    const metadata = navigator.mediaSession && navigator.mediaSession.metadata
    if (!video || !metadata || !metadata.title) return null
    const duration = Number.isFinite(video.duration) ? video.duration : 0
    return {
      v: 1,
      ad: isAd(),
      title: metadata.title,
      artist: metadata.artist || '',
      album: metadata.album || '',
      artworkUrl: biggestArtwork(metadata),
      playing: !video.paused && !video.ended,
      position: video.currentTime || 0,
      duration
    }
  }

  function post(message) {
    try {
      chrome.runtime.sendMessage(message).catch(() => {})
    } catch {
      // The extension was reloaded or removed; this page's script is orphaned.
    }
  }

  function tick() {
    const state = read()
    const now = Date.now()
    if (!state) {
      if (lastKey !== 'none') {
        lastKey = 'none'
        post({ kind: 'gone' })
      }
      return
    }
    const key = [state.ad, state.title, state.artist, state.album, state.playing, Math.round(state.duration)].join('|')
    // A seek: the position moved further than time alone explains.
    const expected = lastPosition + (state.playing ? (now - lastPositionAt) / 1000 : 0)
    const seeked = Math.abs(state.position - expected) > 3
    lastPosition = state.position
    lastPositionAt = now
    if (key !== lastKey || seeked || now - lastSentAt >= HEARTBEAT_MS) {
      lastKey = key
      lastSentAt = now
      post({ kind: 'state', state })
    }
  }

  setInterval(tick, POLL_MS)
  addEventListener('pagehide', () => post({ kind: 'gone' }))
  tick()
})()
