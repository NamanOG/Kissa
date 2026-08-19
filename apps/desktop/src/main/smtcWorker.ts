import { parentPort } from 'worker_threads'
import { SMTCMonitor, PlaybackStatus, type MediaInfo } from '@coooookies/windows-smtc-monitor'
import type { SystemMediaPayload } from '../types/media'

function getCleanAppName(sourceAppId: string): string {
  if (!sourceAppId) return 'Media Player'
  const lower = sourceAppId.toLowerCase()
  if (lower.includes('applemusic') || lower.includes('apple music') || lower.includes('itunes')) {
    return 'Apple Music'
  }
  if (lower.includes('spotify')) {
    return 'Spotify'
  }
  if (lower.includes('tidal')) {
    return 'TIDAL'
  }
  if (lower.includes('chrome')) {
    return 'Chrome'
  }
  if (lower.includes('msedge') || lower.includes('edge')) {
    return 'Microsoft Edge'
  }
  if (lower.includes('firefox')) {
    return 'Firefox'
  }
  if (lower.includes('foobar')) {
    return 'foobar2000'
  }
  // Strip file extension / path
  const filename = sourceAppId.split(/[\\/]/).pop() || sourceAppId
  return filename.replace(/\.(exe|appx)$/i, '')
}

function normalizeTime(raw: number | undefined | null): number {
  if (!raw || raw <= 0 || !Number.isFinite(raw)) return 0
  // If > 10 million, value is in 100ns ticks (Windows TimeSpan)
  if (raw >= 10_000_000) {
    return Math.round(raw / 10_000_000)
  }
  // If between 86,400 (1 day in seconds) and 10 million, likely in milliseconds
  if (raw > 86_400) {
    return Math.round(raw / 1000)
  }
  return Math.round(raw)
}

function formatSession(session: MediaInfo | null): SystemMediaPayload | null {
  if (!session || !session.media) return null

  let artworkDataUrl: string | undefined = undefined
  if (session.media.thumbnail && session.media.thumbnail.length > 0) {
    try {
      const base64 = session.media.thumbnail.toString('base64')
      // Detect format or use standard JPEG/PNG
      const isPng = session.media.thumbnail[0] === 0x89 && session.media.thumbnail[1] === 0x50
      const mime = isPng ? 'image/png' : 'image/jpeg'
      artworkDataUrl = `data:${mime};base64,${base64}`
    } catch {
      artworkDataUrl = undefined
    }
  }

  const isPlaying = session.playback?.playbackStatus === PlaybackStatus.PLAYING // 4

  return {
    sourceAppId: session.sourceAppId,
    sourceAppName: getCleanAppName(session.sourceAppId),
    title: session.media.title || 'Unknown Title',
    artist: session.media.artist || 'Unknown Artist',
    album: session.media.albumTitle || '',
    artworkDataUrl,
    isPlaying,
    progress: Math.max(0, normalizeTime(session.timeline?.position || 0)),
    duration: Math.max(0, normalizeTime(session.timeline?.duration || 0)),
    lastUpdatedTime: session.lastUpdatedTime || Date.now()
  }
}

let monitor: SMTCMonitor | null = null
let lastPayloadJson: string | null = null

function sendUpdate(session: MediaInfo | null): void {
  const payload = formatSession(session)
  const json = JSON.stringify(payload)
  if (json !== lastPayloadJson) {
    lastPayloadJson = json
    parentPort?.postMessage({ type: 'MEDIA_UPDATE', payload })
  }
}

try {
  monitor = new SMTCMonitor()

  // Listen to native Windows media events
  monitor.on('session-media-changed', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  monitor.on('session-playback-changed', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  monitor.on('session-timeline-changed', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  monitor.on('current-session-changed', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  monitor.on('session-added', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  monitor.on('session-removed', () => {
    const current = SMTCMonitor.getCurrentMediaSession()
    sendUpdate(current)
  })

  // Initial check
  sendUpdate(SMTCMonitor.getCurrentMediaSession())

  // Regular poll fallback (every 800ms) to ensure smooth progress sync
  // and catch sessions if event dispatching is delayed by Windows
  setInterval(() => {
    try {
      const current = SMTCMonitor.getCurrentMediaSession()
      sendUpdate(current)
    } catch {
      // Ignore polling errors
    }
  }, 800)
} catch (err) {
  console.warn('[SMTC Worker] Failed to initialize Windows Media Transport monitor:', err)
}

// Cleanup on message
parentPort?.on('message', (msg) => {
  if (msg?.type === 'DESTROY') {
    try {
      monitor?.destroy()
    } catch {
      // Ignore
    }
    process.exit(0)
  }
})
