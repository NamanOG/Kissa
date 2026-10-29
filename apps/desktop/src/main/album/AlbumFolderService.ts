import { BrowserWindow, dialog, ipcMain, protocol } from 'electron'
import { execFile } from 'child_process'
import { createReadStream, promises as fs } from 'fs'
import { basename, extname, join } from 'path'
import { Readable } from 'stream'
import type { LocalAlbum, LocalAlbumResult, LocalAlbumTrack, TrackProblem } from '../../types/album'
import {
  ALBUM_SCHEME,
  classifyProblem,
  firstNumber,
  isInside,
  isPlayableName,
  isUnplayableMusicName,
  mimeFor,
  mostCommon,
  orderTracks,
  parseRange,
  parseTrackUrl,
  secondsFrom100ns,
  titleFromFileName,
  trackUrl
} from './albumFolder'

/**
 * Plays an album folder the listener picks. Main reads the folder once (Windows' own file
 * properties, no extra libraries), and the renderer can then fetch only those files, read-only,
 * through kissa-album://track/<generation>/<index>. Nothing else on disk is reachable, and
 * choosing another folder retires the previous addresses.
 */

/** Must run before app ready. */
export function registerAlbumScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ALBUM_SCHEME, privileges: { standard: true, secure: true, stream: true, corsEnabled: true } }
  ])
}

const COVER_NAMES = ['cover', 'folder', 'front', 'album']
const COVER_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png'
}
const MAX_COVER_BYTES = 10 * 1024 * 1024
const MAX_FILES = 400

/**
 * Reads title, artist, album, track and disc with the Shell property system, and the first file's
 * embedded picture with WinRT (only when the folder has no cover image). Paths come in through
 * the environment, never the script text.
 */
const TAG_SCRIPT =
  String.raw`
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dir = $env:KISSA_ALBUM_DIR
$names = $env:KISSA_ALBUM_FILES -split '\|'
$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace($dir)
$props = 'System.Title','System.Music.Artist','System.Music.AlbumArtist','System.Music.AlbumTitle','System.Music.TrackNumber','System.Music.PartOfSet','System.Music.DiscNumber','System.Media.Duration'
$rows = @()
foreach ($name in $names) {
  if (-not $name) { continue }
  $r = [ordered]@{ name = $name }
  $item = $folder.ParseName($name)
  if ($item) {
    foreach ($p in $props) {
      try { $v = $item.ExtendedProperty($p); if ($v -is [array]) { $v = $v -join '; ' }; if ($null -ne $v) { $r[$p] = "$v" } } catch { }
    }
  }
  $rows += [pscustomobject]$r
}
$cover = ''
$coverType = ''
if ($env:KISSA_ALBUM_THUMB) {
  try {
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation` +
  '`' +
  String.raw`1' })[0]
    function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); [void]$task.Wait(10000); $task.Result }
    [void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
    [void][Windows.Storage.FileProperties.StorageItemThumbnail, Windows.Storage, ContentType = WindowsRuntime]
    $sf = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($env:KISSA_ALBUM_THUMB)) ([Windows.Storage.StorageFile])
    $th = Await ($sf.GetThumbnailAsync([Windows.Storage.FileProperties.ThumbnailMode]::MusicView, 600)) ([Windows.Storage.FileProperties.StorageItemThumbnail])
    if ($th -and "$($th.Type)" -eq 'Image') {
      $s = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($th)
      $ms = New-Object System.IO.MemoryStream
      $s.CopyTo($ms)
      $cover = [Convert]::ToBase64String($ms.ToArray())
      $coverType = $th.ContentType
    }
  } catch { }
}
[pscustomobject]@{ tracks = $rows; cover = $cover; coverType = $coverType } | ConvertTo-Json -Depth 3 -Compress
`

type TagRow = Record<string, string | undefined> & { name: string }
interface TagOutput {
  tracks: TagRow[]
  cover: string
  coverType: string
}

function readTags(
  dir: string,
  names: string[],
  thumbFrom: string | null
): Promise<TagOutput | null> {
  if (process.platform !== 'win32') return Promise.resolve(null)
  return new Promise((done) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-EncodedCommand',
        Buffer.from(TAG_SCRIPT, 'utf16le').toString('base64')
      ],
      {
        windowsHide: true,
        timeout: 45_000,
        maxBuffer: 48 * 1024 * 1024,
        encoding: 'utf8',
        env: {
          ...process.env,
          KISSA_ALBUM_DIR: dir,
          KISSA_ALBUM_FILES: names.join('|'),
          KISSA_ALBUM_THUMB: thumbFrom ?? ''
        }
      },
      (error, stdout) => {
        if (error) return done(null)
        try {
          const parsed = JSON.parse(stdout.trim()) as Partial<TagOutput>
          const rows = parsed.tracks
          done({
            tracks: Array.isArray(rows) ? rows : rows ? [rows as TagRow] : [],
            cover: parsed.cover || '',
            coverType: parsed.coverType || ''
          })
        } catch {
          done(null)
        }
      }
    )
  })
}

async function folderCover(dir: string, entries: string[]): Promise<string> {
  for (const want of COVER_NAMES) {
    const name = entries.find((e) => {
      const ext = extname(e).toLowerCase()
      return COVER_TYPES[ext] && e.slice(0, e.length - ext.length).toLowerCase() === want
    })
    if (!name) continue
    try {
      const full = join(dir, name)
      const st = await fs.stat(full)
      if (!st.isFile() || st.size > MAX_COVER_BYTES) continue
      const data = await fs.readFile(full)
      return `data:${COVER_TYPES[extname(name).toLowerCase()]};base64,${data.toString('base64')}`
    } catch {
      /* try the next name */
    }
  }
  return ''
}

/** Head and tail of a file, enough to spot Apple Lossless in an .m4a without reading it all. */
async function sampleOf(full: string, size: number): Promise<Buffer> {
  const span = 1024 * 1024
  const handle = await fs.open(full, 'r')
  try {
    const head = Buffer.alloc(Math.min(span, size))
    await handle.read(head, 0, head.length, 0)
    if (size <= span) return head
    const tail = Buffer.alloc(Math.min(span, size - head.length))
    await handle.read(tail, 0, tail.length, size - tail.length)
    return Buffer.concat([head, tail])
  } finally {
    await handle.close()
  }
}

export class AlbumFolderService {
  private static instance: AlbumFolderService | null = null
  private generation = 0
  private folder = ''
  private files: string[] = []
  private started = false

  static getInstance(): AlbumFolderService {
    if (!this.instance) this.instance = new AlbumFolderService()
    return this.instance
  }

  /** The file a kissa-album:// address names, only if it belongs to the album read last. */
  resolve(url: string): string | null {
    const ref = parseTrackUrl(url)
    if (!ref || ref.generation !== this.generation) return null
    const full = this.files[ref.index]
    return full && isInside(this.folder, full) ? full : null
  }

  async read(dir: string): Promise<LocalAlbumResult> {
    let entries: string[]
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => e.name)
    } catch {
      return { status: 'error' }
    }
    const playable = entries.filter(isPlayableName).slice(0, MAX_FILES)
    const leftOut = entries.filter(isUnplayableMusicName)
    if (playable.length === 0) return { status: 'empty', leftOut }

    const cover = await folderCover(dir, entries)
    const tags = await readTags(dir, playable, cover ? null : join(dir, playable[0]))
    const byName = new Map((tags?.tracks ?? []).map((r) => [r.name, r]))

    const rows = playable.map((fileName) => {
      const r = byName.get(fileName)
      return {
        fileName,
        title: r?.['System.Title']?.trim() || titleFromFileName(fileName),
        artist: r?.['System.Music.Artist']?.trim() || '',
        albumArtist: r?.['System.Music.AlbumArtist']?.trim() || '',
        album: r?.['System.Music.AlbumTitle']?.trim() || '',
        track: firstNumber(r?.['System.Music.TrackNumber']),
        disc:
          firstNumber(r?.['System.Music.PartOfSet']) || firstNumber(r?.['System.Music.DiscNumber']),
        duration: secondsFrom100ns(r?.['System.Media.Duration'])
      }
    })
    const { order, tracks: ordered } = orderTracks(rows)

    this.generation += 1
    this.folder = dir
    this.files = ordered.map((r) => join(dir, r.fileName))

    const albumArtist =
      mostCommon(rows.map((r) => r.albumArtist)) || mostCommon(rows.map((r) => r.artist))
    const tracks: LocalAlbumTrack[] = ordered.map((r, i) => ({
      url: trackUrl(this.generation, i),
      title: r.title,
      artist: r.artist || albumArtist,
      disc: r.disc,
      track: r.track,
      duration: r.duration,
      fileName: r.fileName
    }))
    const album: LocalAlbum = {
      title: mostCommon(rows.map((r) => r.album)) || basename(dir),
      artist: albumArtist,
      coverDataUrl:
        cover || (tags?.cover ? `data:${tags.coverType || 'image/jpeg'};base64,${tags.cover}` : ''),
      order,
      tracks,
      leftOut
    }
    return { status: 'ok', album }
  }

  async problem(url: string): Promise<TrackProblem> {
    const full = this.resolve(url)
    if (!full) return 'missing'
    try {
      const st = await fs.stat(full)
      if (!st.isFile()) return 'missing'
      if (st.size === 0) return classifyProblem(full, { exists: true, size: 0 })
      return classifyProblem(full, {
        exists: true,
        size: st.size,
        sample: await sampleOf(full, st.size)
      })
    } catch {
      return 'missing'
    }
  }

  private async serve(request: Request): Promise<Response> {
    const headers: Record<string, string> = {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      // Lets Kissa's own window pass the album through its vinyl sound (Web Audio only hears
      // media that allows it). It opens nothing new: only the chosen album's files are served,
      // and the renderer's CSP still keeps fetch away from this scheme.
      'Access-Control-Allow-Origin': '*'
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(null, { status: 405, headers })
    }
    const full = this.resolve(request.url)
    if (!full) return new Response(null, { status: 403, headers })
    let size: number
    try {
      const st = await fs.stat(full)
      if (!st.isFile()) throw new Error('not a file')
      size = st.size
    } catch {
      return new Response(null, { status: 404, headers })
    }
    headers['Content-Type'] = mimeFor(full)
    const range = parseRange(request.headers.get('range'), size)
    if (range === 'unsatisfiable') {
      return new Response(null, {
        status: 416,
        headers: { ...headers, 'Content-Range': `bytes */${size}` }
      })
    }
    const { start, end } = range ?? { start: 0, end: size - 1 }
    headers['Content-Length'] = String(size === 0 ? 0 : end - start + 1)
    if (range) headers['Content-Range'] = `bytes ${start}-${end}/${size}`
    const body =
      request.method === 'HEAD' || size === 0
        ? null
        : (Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream)
    return new Response(body, { status: range ? 206 : 200, headers })
  }

  /** After app ready: the protocol and the two IPC calls. */
  start(): void {
    if (this.started) return
    this.started = true
    protocol.handle(ALBUM_SCHEME, (request) => this.serve(request))

    ipcMain.handle('kissa:album-choose', async (event): Promise<LocalAlbumResult> => {
      const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] }
      const picked = owner
        ? await dialog.showOpenDialog(owner, options)
        : await dialog.showOpenDialog(options)
      if (picked.canceled || !picked.filePaths[0]) return { status: 'cancelled' }
      return this.read(picked.filePaths[0])
    })

    ipcMain.handle('kissa:album-problem', (_event, url: unknown) =>
      typeof url === 'string' ? this.problem(url) : 'missing'
    )
  }
}
