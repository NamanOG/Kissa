import { describe, expect, it, vi } from 'vitest'
import { importedLyrics, LyricsService } from '../LyricsService'
import { LyricsOverrides } from '../LyricsOverrides'
import type { LyricsCacheBackend } from '../LyricsCache'

const request = {
  title: 'Paper Lanterns',
  artist: 'The Quiet Hours',
  album: 'Night Shift',
  duration: 214
}
const text = '[00:01.00] chosen words\n[00:08.50] another line'
const item = {
  id: 7,
  trackName: request.title,
  artistName: request.artist,
  albumName: request.album,
  duration: 214,
  syncedLyrics: text
}

function backend(): LyricsCacheBackend {
  let raw: string | null = null
  return {
    read: () => raw,
    write: (value) => {
      raw = value
    }
  }
}

describe('lyrics recovery', () => {
  it('keeps a choice over restart, cache clearing and forced provider retries', async () => {
    const disk = backend()
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(item)))
    const service = new LyricsService({ fetch, overrides: new LyricsOverrides(disk) })
    await service.chooseLyrics(request, { kind: 'candidate', id: 7 })
    service.clearCache()
    const restarted = new LyricsService({ fetch, overrides: new LyricsOverrides(disk) })
    expect(await restarted.getLyrics({ ...request, force: true })).toMatchObject({
      syncedLyrics: text,
      source: 'lrclib-choice'
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    // A different cut of the same song must not inherit the chosen timing.
    expect(new LyricsOverrides(disk).get('unknown-recording')).toBeNull()
  })

  it('does not apply a choice to another recording length', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status: 404 }))
    const service = new LyricsService({ fetch })
    await service.chooseLyrics(request, { kind: 'import', text })
    expect((await service.getLyrics({ ...request, duration: 240 })).source).toBeUndefined()
    expect((await service.getLyrics(request)).source).toBe('lrc-import')
  })

  it('lets the user return to automatic lookup', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(item)))
    const disk = backend()
    const service = new LyricsService({ fetch, overrides: new LyricsOverrides(disk) })
    await service.chooseLyrics(request, { kind: 'import', text })
    await service.chooseLyrics(request, { kind: 'reset' })
    expect((await service.getLyrics(request)).source).toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(disk.read()).not.toContain('chosen words')
  })

  it('prevents a late automatic result from overwriting an import', async () => {
    let complete!: (value: Response) => void
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve
        })
    )
    const service = new LyricsService({ fetch })
    const pending = service.getLyrics(request)
    await service.chooseLyrics(request, { kind: 'import', text })
    complete(new Response(JSON.stringify({ ...item, syncedLyrics: '[00:00] old automatic words' })))
    expect((await pending).syncedLyrics).toBe(text)
    expect((await service.getLyrics(request)).source).toBe('lrc-import')
  })

  it('does not let a slower candidate replace a newer import', async () => {
    let complete!: (value: Response) => void
    const fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve
        })
    )
    const service = new LyricsService({ fetch })
    const pending = service.chooseLyrics(request, { kind: 'candidate', id: 7 })
    await service.chooseLyrics(request, { kind: 'import', text })
    complete(new Response(JSON.stringify(item)))
    await expect(pending).rejects.toThrow('newer lyrics choice')
    expect((await service.getLyrics(request)).source).toBe('lrc-import')
  })

  it('preserves the old choice if saving fails', async () => {
    const disk = backend()
    const overrides = new LyricsOverrides(disk)
    const service = new LyricsService({ overrides })
    await service.chooseLyrics(request, { kind: 'import', text })
    disk.write = () => {
      throw new Error('Disk full')
    }
    await expect(service.chooseLyrics(request, { kind: 'reset' })).rejects.toThrow('Disk full')
    expect((await service.getLyrics(request)).syncedLyrics).toBe(text)
  })

  it('rejects metadata-only, binary and oversized imports, and accepts BOM and CRLF', () => {
    for (const invalid of [
      '[ar:Artist]',
      '[00:00.00]   ',
      'plain lyrics',
      '[00:01] word\u0000',
      'a'.repeat(256001)
    ]) {
      expect(() => importedLyrics(invalid)).toThrow()
    }
    expect(importedLyrics('\uFEFF[00:01.00] One\r\n[00:02.00] Two').syncedLyrics).toBe(
      '[00:01.00] One\n[00:02.00] Two'
    )
  })

  it('searches alternate recordings without applying the automatic duration filter', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            item,
            item,
            { ...item, id: 8, duration: 300 },
            { id: 9, instrumental: true }
          ])
        )
      )
    const service = new LyricsService({ fetch })
    const result = await service.searchCandidates(request, 'Paper Lanterns')
    expect(result.candidates.map((c) => c.id)).toEqual([7, 8])
    expect(result.candidates[1]).toMatchObject({
      duration: 300,
      synced: true,
      preview: 'chosen words\nanother line'
    })
  })

  it('honours a provider backoff during recovery', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '60' } }))
    const service = new LyricsService({ fetch })
    expect((await service.searchCandidates(request, 'title')).status).toBe('unavailable')
    await expect(service.chooseLyrics(request, { kind: 'candidate', id: 7 })).rejects.toThrow(
      'busy'
    )
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
