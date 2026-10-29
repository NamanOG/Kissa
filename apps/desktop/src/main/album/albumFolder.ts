import { extname, isAbsolute, relative, resolve } from 'path'
import type { LocalAlbumTrack, TrackProblem } from '../../types/album'

/**
 * Pure helpers for playing an album folder: which files Kissa plays, the order they go in, and
 * the read-only kissa-album:// addresses. Kept free of Electron so they are tested directly.
 */

/** Played and checked on Electron 39 (docs/experiments/playback-2026-10-28). */
export const PLAYABLE = new Map<string, string>([
  ['.mp3', 'audio/mpeg'],
  ['.flac', 'audio/flac'],
  ['.m4a', 'audio/mp4'],
  ['.ogg', 'audio/ogg'],
  ['.opus', 'audio/ogg'],
  ['.wav', 'audio/wav']
])

/** Music files Kissa sees but cannot play (WMA failed in the experiment; the rest are untested). */
const KNOWN_MUSIC = new Set([
  '.wma',
  '.aac',
  '.aif',
  '.aiff',
  '.ape',
  '.wv',
  '.dsf',
  '.dff',
  '.mka',
  '.alac'
])

export const ALBUM_SCHEME = 'kissa-album'

export function isPlayableName(name: string): boolean {
  return PLAYABLE.has(extname(name).toLowerCase())
}

export function isUnplayableMusicName(name: string): boolean {
  return KNOWN_MUSIC.has(extname(name).toLowerCase())
}

export function mimeFor(name: string): string {
  return PLAYABLE.get(extname(name).toLowerCase()) ?? 'application/octet-stream'
}

/** "2/3", "2", "" → 2, 2, 0. */
export function firstNumber(value: string | undefined): number {
  const m = /\d+/.exec(value ?? '')
  return m ? Number(m[0]) : 0
}

/** A title for a file with no title tag: "03 - Blue in Green.flac" → "Blue in Green". */
export function titleFromFileName(name: string): string {
  const base = name.slice(0, name.length - extname(name).length)
  const plain = base.replace(/^\s*\d{1,3}(?:[\s._-]+|\s*-\s*)/, '').trim()
  return plain || base
}

/** Windows gives System.Media.Duration in 100 ns units. */
export function secondsFrom100ns(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.round(n / 1e7) : 0
}

const byName = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/**
 * Disc, then track, when every file carries a track number; otherwise the file names in natural
 * order ("2" before "10"), which is how most rips are named.
 */
export function orderTracks<T extends Pick<LocalAlbumTrack, 'disc' | 'track' | 'fileName'>>(
  tracks: T[]
): { order: 'tags' | 'filenames'; tracks: T[] } {
  const tagged = tracks.length > 0 && tracks.every((t) => t.track > 0)
  const sorted = [...tracks].sort((a, b) =>
    tagged
      ? (a.disc || 1) - (b.disc || 1) || a.track - b.track || byName.compare(a.fileName, b.fileName)
      : byName.compare(a.fileName, b.fileName)
  )
  return { order: tagged ? 'tags' : 'filenames', tracks: sorted }
}

/** The most common non-empty value, for an album artist when the files disagree. */
export function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best = ''
  let n = 0
  for (const [v, c] of counts) if (c > n) [best, n] = [v, c]
  return best
}

export function trackUrl(generation: number, index: number): string {
  return `${ALBUM_SCHEME}://track/${generation}/${index}`
}

/** The album generation and file index a kissa-album:// address names, or null for anything else. */
export function parseTrackUrl(url: string): { generation: number; index: number } | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== `${ALBUM_SCHEME}:` || u.hostname !== 'track') return null
  const m = /^\/(\d+)\/(\d+)\/?$/.exec(u.pathname)
  return m ? { generation: Number(m[1]), index: Number(m[2]) } : null
}

/** True only for a path strictly inside the folder (no "..", no other drive). */
export function isInside(folder: string, file: string): boolean {
  const rel = relative(resolve(folder), resolve(file))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

/** One satisfiable byte range from a Range header, or null to send the whole file. */
export function parseRange(
  header: string | null,
  size: number
): { start: number; end: number } | 'unsatisfiable' | null {
  const m = header && /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (!m[1] && !m[2])) return null
  let start: number
  let end: number
  if (!m[1]) {
    start = Math.max(0, size - Number(m[2]))
    end = size - 1
  } else {
    start = Number(m[1])
    end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
  }
  if (start >= size || end < start) return 'unsatisfiable'
  return { start, end }
}

/**
 * Why a file would not play, from what is on disk. Chromium reports every such failure as
 * MEDIA_ERR_SRC_NOT_SUPPORTED with no message, so the reason has to come from here.
 */
export function classifyProblem(
  name: string,
  file: { exists: boolean; size: number; sample?: Buffer }
): TrackProblem {
  if (!file.exists) return 'missing'
  if (!isPlayableName(name)) return 'unsupported'
  // Apple Lossless sits in an .m4a like AAC does; Chromium does not decode it.
  if (extname(name).toLowerCase() === '.m4a' && file.sample?.includes('alac')) return 'unsupported'
  return 'damaged'
}
