import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EventEmitter } from 'events'
import {
  DiscordPresenceService,
  isAppleMusicSource,
  isSpotifySource,
  type PresenceClient
} from '../discord/DiscordPresenceService'
import { FrameDecoder, encodeFrame } from '../discord/DiscordIpcClient'
import type { SystemMediaPayload } from '../../../types/media'

const APPLE = 'AppleInc.AppleMusicWin_nzyj5cx40ttqa!App'

class FakeClient extends EventEmitter implements PresenceClient {
  activities: Array<Record<string, unknown> | null> = []
  connectError: Error | null = null
  closed = false
  async connect(): Promise<void> {
    if (this.connectError) throw this.connectError
  }
  async setActivity(activity: Record<string, unknown> | null): Promise<unknown> {
    this.activities.push(activity)
    return {}
  }
  close(): void {
    this.closed = true
  }
}

function track(over: Partial<SystemMediaPayload> = {}): SystemMediaPayload {
  return {
    sourceAppId: APPLE,
    sourceAppName: 'Apple Music',
    title: 'Paper Lanterns',
    artist: 'The Quiet Hours',
    album: 'Night Shift',
    artworkDataUrl: 'https://is1-ssl.mzstatic.com/image/thumb/x/1200x1200bb.jpg',
    isPlaying: true,
    progress: 30,
    duration: 214,
    lastUpdatedTime: Date.now(),
    ...over
  }
}

function setup(enabled = true, applicationId = '123456789', shareSpotify = false) {
  const clients: FakeClient[] = []
  let saved: { enabled: boolean; shareSpotify?: boolean; shareStudy?: boolean } = { enabled, shareSpotify }
  const createClient = (): FakeClient => {
    const c = new FakeClient()
    if (failNext) {
      c.connectError = new Error('no pipe')
      failNext--
    }
    clients.push(c)
    return c
  }
  let failNext = 0
  const service = new DiscordPresenceService({
    applicationId,
    settings: { load: () => saved, save: (s) => (saved = s) },
    createClient
  })
  return {
    service,
    clients,
    saved: () => saved,
    failConnects: (n: number) => (failNext = n),
    last: () => clients[clients.length - 1]
  }
}

const flush = async (ms = 0): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
}

describe('DiscordPresenceService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing and connects to nothing while off', async () => {
    const h = setup(false)
    h.service.onMedia(track())
    await flush(10_000)
    expect(h.clients.length).toBe(0)
    expect(h.service.getStatus()).toEqual({ enabled: false, shareSpotify: false, shareStudy: true, state: 'off' })
  })

  it('says so when the build has no Application ID', async () => {
    const h = setup(true, '')
    h.service.onMedia(track())
    await flush(10_000)
    expect(h.clients.length).toBe(0)
    expect(h.service.getStatus().state).toBe('unconfigured')
  })

  it('shares the Apple Music track as Listening, with a time bar and verified cover', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track())
    await flush(5_000)
    const activity = h.last().activities.at(-1)!
    expect(activity.type).toBe(2)
    expect(activity.details).toBe('Paper Lanterns')
    expect(activity.state).toBe('The Quiet Hours')
    expect(activity.buttons).toEqual([{ label: 'Get Kissa for Windows', url: 'https://apps.microsoft.com/detail/9p3n4x4wm80j' }])
    expect(activity.assets).toMatchObject({
      large_image: 'https://is1-ssl.mzstatic.com/image/thumb/x/1200x1200bb.jpg',
      large_text: 'Night Shift'
    })
    const ts = activity.timestamps as { start: number; end: number }
    expect(ts.end - ts.start).toBe(214_000)
    expect(h.service.getStatus().state).toBe('sharing')
  })

  it('never sends an embedded cover', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track({ artworkDataUrl: 'data:image/jpeg;base64,AAAA' }))
    await flush(5_000)
    const assets = h.last().activities.at(-1)!.assets as Record<string, string>
    // Kissa's badge stands in; the embedded image is never sent.
    expect(assets.large_image).toBe('https://kissa.glyphcode.studio/favicon.png')
    expect(JSON.stringify(assets)).not.toContain('data:')
  })

  it('clears at once when the source switches to Spotify', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track())
    await flush(5_000)
    h.service.onMedia(track({ sourceAppId: 'Spotify.exe', sourceAppName: 'Spotify' }))
    expect(h.last().activities.at(-1)).toBeNull()
    expect(h.service.getStatus().state).toBe('idle')
  })

  it('shares Spotify only after the separate opt-in, and remembers it', async () => {
    const h = setup()
    await flush()
    const spotify = track({ sourceAppId: 'Spotify.exe', sourceAppName: 'Spotify', title: 'Green Room' })
    h.service.onMedia(spotify)
    await flush(5_000)
    expect(h.clients.length).toBe(1)
    expect(h.last().activities.some((a) => a?.details === 'Green Room')).toBe(false)
    expect(h.service.getStatus()).toEqual({ enabled: true, shareSpotify: false, shareStudy: true, state: 'idle' })

    const status = h.service.setShareSpotify(true)
    expect(h.saved()).toEqual({ enabled: true, shareSpotify: true, shareStudy: true })
    await flush(5_000)
    const a = h.last().activities.at(-1)!
    expect(a.details).toBe('Green Room')
    expect(a.buttons).toEqual([{ label: 'Get Kissa for Windows', url: 'https://apps.microsoft.com/detail/9p3n4x4wm80j' }])
    expect(h.service.getStatus().state).toBe('sharing')
    expect(status.shareSpotify).toBe(true)

    h.service.setShareSpotify(false)
    await flush(5_000)
    expect(h.last().activities.at(-1)).toBeNull()
    expect(h.service.getStatus().state).toBe('idle')
  })

  it('starts sharing Spotify at once when the saved setting says so', async () => {
    const h = setup(true, '123456789', true)
    await flush()
    h.service.onMedia(track({ sourceAppId: 'SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify', title: 'Green Room' }))
    await flush(5_000)
    expect(h.last().activities.at(-1)!.details).toBe('Green Room')
  })

  it('turning sharing off keeps the Spotify choice for next time', async () => {
    const h = setup(true, '123456789', true)
    await flush()
    h.service.setEnabled(false)
    expect(h.saved()).toEqual({ enabled: false, shareSpotify: true, shareStudy: true })
  })

  it('shows a running study session instead of the track, without the intention', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track())
    await flush(5_000)
    const endsAt = Date.now() + 25 * 60_000
    h.service.setStudy({ phase: 'focus', room: 'Rain room', endsAt, round: 1, tasksDone: 1, tasksTotal: 3 })
    await flush(5_000)
    const a = h.last().activities.at(-1)!
    expect(a.type).toBe(0)
    expect(a.details).toBe('Studying · Rain room')
    // The Apple Music song is shared, so it rides along on the study card.
    expect(a.state).toBe('♪ Paper Lanterns · The Quiet Hours')
    expect(a.timestamps).toEqual({ end: Math.round(endsAt) })
    expect(a.buttons).toEqual([{ label: 'Get Kissa for Windows', url: 'https://apps.microsoft.com/detail/9p3n4x4wm80j' }])
    expect(h.service.getStatus().state).toBe('studying')

    // Spotify (not opted in) never appears on the study card; the step count does.
    h.service.onMedia(track({ sourceAppId: 'Spotify.exe', title: 'Green Room' }))
    await flush(5_000)
    expect(h.last().activities.at(-1)!.state).toBe('1 of 3 steps done')

    h.service.setStudy({ phase: 'break', room: 'Rain room', endsAt: Date.now() + 5 * 60_000 })
    await flush(5_000)
    expect(h.last().activities.at(-1)!.details).toBe('On a break · Rain room')

    h.service.setStudy(null)
    await flush(5_000)
    expect(h.last().activities.at(-1)).toBeNull()
  })

  it('keeps study sessions off Discord when that switch is off', async () => {
    const h = setup()
    await flush()
    h.service.setShareStudy(false)
    expect(h.saved()).toEqual({ enabled: true, shareSpotify: false, shareStudy: false })
    h.service.setStudy({ phase: 'focus', room: 'Night room', startedAt: Date.now() })
    await flush(5_000)
    expect(h.last().activities.some((x) => x && x.type === 0)).toBe(false)
  })

  it('coalesces a burst of skips into the last track', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track({ title: 'One' }))
    await flush(5_000)
    const before = h.last().activities.length
    h.service.onMedia(track({ title: 'Two' }))
    h.service.onMedia(track({ title: 'Three' }))
    h.service.onMedia(track({ title: 'Four' }))
    await flush(5_000)
    const sent = h.last().activities.slice(before)
    expect(sent.length).toBe(1)
    expect(sent[0]!.details).toBe('Four')
  })

  it('does not resend for ordinary progress, but does after a seek', async () => {
    const h = setup()
    await flush()
    const t0 = Date.now()
    h.service.onMedia(track({ progress: 30, lastUpdatedTime: t0 }))
    await flush(5_000)
    const count = h.last().activities.length
    h.service.onMedia(track({ progress: 35, lastUpdatedTime: t0 + 5_000 }))
    await flush(5_000)
    expect(h.last().activities.length).toBe(count)
    h.service.onMedia(track({ progress: 120, lastUpdatedTime: Date.now() }))
    await flush(5_000)
    expect(h.last().activities.length).toBe(count + 1)
  })

  it('drops the time bar when paused and clears after two minutes', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track())
    await flush(5_000)
    h.service.onMedia(track({ isPlaying: false }))
    await flush(5_000)
    expect(h.last().activities.at(-1)!.timestamps).toBeUndefined()
    expect(h.service.getStatus().state).toBe('paused')
    await flush(2 * 60 * 1000)
    expect(h.last().activities.at(-1)).toBeNull()
    h.service.onMedia(track({ isPlaying: true }))
    await flush(5_000)
    expect(h.last().activities.at(-1)!.details).toBe('Paper Lanterns')
  })

  it('a queued update cannot bring presence back after turning it off', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track({ title: 'One' }))
    await flush(5_000)
    h.service.onMedia(track({ title: 'Two' })) // queued behind the rate limit
    h.service.setEnabled(false)
    await flush(10_000)
    const client = h.clients[0]
    expect(client.activities.at(-1)).toBeNull()
    expect(client.activities.some((a) => a?.details === 'Two')).toBe(false)
    expect(client.closed).toBe(true)
    expect(h.saved()).toEqual({ enabled: false, shareSpotify: false, shareStudy: true })
  })

  it('waits for Discord and reconnects with backoff, then shares', async () => {
    const h = setup(false)
    h.failConnects(2)
    h.service.onMedia(track())
    h.service.setEnabled(true)
    await flush()
    expect(h.service.getStatus().state).toBe('no-discord')
    await flush(5_000)
    expect(h.clients.length).toBe(2)
    await flush(10_000)
    expect(h.clients.length).toBe(3)
    await flush(5_000)
    expect(h.service.getStatus().state).toBe('sharing')
    expect(h.last().activities.at(-1)!.details).toBe('Paper Lanterns')
  })

  it('reconnects after Discord restarts and shares the current track again', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track())
    await flush(5_000)
    h.clients[0].emit('close')
    expect(h.service.getStatus().state).toBe('no-discord')
    await flush(5_000)
    await flush(5_000)
    expect(h.clients.length).toBe(2)
    expect(h.clients[1].activities.at(-1)!.details).toBe('Paper Lanterns')
  })

  it('falls back when Discord rejects status_display_type', async () => {
    const h = setup()
    await flush()
    const client = h.last()
    let rejected = false
    client.setActivity = async (activity) => {
      if (activity && 'status_display_type' in activity && !rejected) {
        rejected = true
        throw new Error('child "activity" fails because ["status_display_type" is not allowed]')
      }
      client.activities.push(activity)
      return {}
    }
    h.service.onMedia(track())
    await flush(10_000)
    expect(client.activities.at(-1)!.details).toBe('Paper Lanterns')
    expect(client.activities.at(-1)!.status_display_type).toBeUndefined()
  })

  it('keeps text within Discord limits', async () => {
    const h = setup()
    await flush()
    h.service.onMedia(track({ title: 'X', artist: 'A'.repeat(300) }))
    await flush(5_000)
    const a = h.last().activities.at(-1)!
    expect((a.details as string).length).toBeGreaterThanOrEqual(2)
    expect((a.state as string).length).toBeLessThanOrEqual(128)
  })
})

describe('isAppleMusicSource', () => {
  it('recognises Apple Music and iTunes, not browsers or Spotify', () => {
    expect(isAppleMusicSource(APPLE)).toBe(true)
    expect(isAppleMusicSource('C:\\Program Files\\iTunes\\iTunes.exe')).toBe(true)
    expect(isAppleMusicSource('Spotify.exe')).toBe(false)
    expect(isAppleMusicSource('MSEdge')).toBe(false)
    expect(isAppleMusicSource(undefined)).toBe(false)
  })
})

describe('isSpotifySource', () => {
  it('recognises classic and Store Spotify only', () => {
    expect(isSpotifySource('Spotify.exe')).toBe(true)
    expect(isSpotifySource('SpotifyAB.SpotifyMusic_zpdnekdrzrea0!Spotify')).toBe(true)
    expect(isSpotifySource(APPLE)).toBe(false)
    expect(isSpotifySource('MSEdge')).toBe(false)
    expect(isSpotifySource(undefined)).toBe(false)
  })
})

describe('Discord IPC framing', () => {
  it('round-trips frames split across chunks', () => {
    const a = encodeFrame(1, { cmd: 'SET_ACTIVITY', nonce: 'n1' })
    const b = encodeFrame(3, { ping: 'Ünïcode' })
    const all = Buffer.concat([a, b])
    const decoder = new FrameDecoder()
    const first = decoder.push(all.subarray(0, 5))
    const rest = decoder.push(all.subarray(5))
    expect(first).toEqual([])
    expect(rest).toEqual([
      { op: 1, data: { cmd: 'SET_ACTIVITY', nonce: 'n1' } },
      { op: 3, data: { ping: 'Ünïcode' } }
    ])
  })
})
