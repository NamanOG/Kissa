import { useSyncExternalStore } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { albumIndexOf, useAlbumStore } from '@renderer/features/album/albumStore'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { locate } from '@renderer/features/sides/sides'
import {
  boundQueue,
  MAX_QUEUE_ROWS,
  type RemoteQueue,
  type RemoteQueueRow
} from '../../../../types/remoteQueue'

let previousInputs: unknown[] = []
let snapshot: RemoteQueue
let revision = 0

/** Memoized on order/source identity, never on playback time or animation state. */
export function queueSnapshot(): RemoteQueue {
  const player = usePlayerStore.getState()
  const local = useAlbumStore.getState()
  const sides = useSidesStore.getState()
  const track = player.currentTrack
  const inputs = [
    track?.audioUrl,
    track?.sourceAppId,
    track?.title,
    track?.artist,
    track?.album,
    track?.duration,
    player.queue,
    local.album,
    local.problems,
    sides.sides,
    sides.albumKey,
    sides.lookup
  ]
  if (snapshot && inputs.every((value, i) => value === previousInputs[i])) return snapshot
  previousInputs = inputs
  const result: RemoteQueue = {
    kind: 'none',
    revision: String(++revision),
    title: '',
    rows: [],
    total: 0,
    status: 'empty'
  }
  const localIndex = albumIndexOf(local.album, track?.audioUrl)
  const remainingAlbum =
    local.album && localIndex >= 0
      ? local.album.tracks.slice(localIndex + 1).filter((item) => !local.problems[item.url])
      : []
  const albumOrderIntact =
    remainingAlbum.length === player.queue.length &&
    remainingAlbum.every((item, i) => item.url === player.queue[i].audioUrl)
  if (track?.sourceAppId && track.sourceAppId !== 'kissa-idle') {
    result.kind = 'album-info'
    result.title = track.album || ''
    const matches = sides.albumKey === `${track.artist}|${track.album}`.toLowerCase()
    result.status =
      sides.lookup === 'off'
        ? 'off'
        : matches
          ? sides.lookup === 'found'
            ? 'ready'
            : sides.lookup
          : 'finding'
    if (matches && sides.sides) {
      const place = locate(sides.sides, track.title)
      let index = 0
      for (const [si, side] of sides.sides.sides.entries()) {
        for (const [ti, item] of side.tracks.entries()) {
          if (result.rows.length < MAX_QUEUE_ROWS)
            result.rows.push({
              index,
              title: item.title,
              duration: item.length / 1000,
              current: place?.side === si && place.track === ti,
              playable: false
            })
          index++
        }
      }
      result.total = index
    }
  } else if (local.album && localIndex >= 0 && !track?.sourceAppId && albumOrderIntact) {
    result.kind = 'album'
    result.title = local.album.title
    result.status = 'ready'
    result.total = local.album.tracks.length
    // Keep the current record visible even in an unusually long album folder.
    const start = Math.max(0, localIndex - 20)
    result.rows = local.album.tracks.slice(start, start + MAX_QUEUE_ROWS).map((item, i) => ({
      index: start + i,
      title: item.title,
      duration: item.duration,
      current: start + i === localIndex,
      playable: !local.problems[item.url]
    }))
  } else if (!track?.sourceAppId && (track?.audioUrl || player.queue.length)) {
    result.kind = 'queue'
    result.title = track?.album || ''
    result.status = 'ready'
    const current = track ? [track] : []
    result.total = current.length + player.queue.length
    result.rows = current
      .concat(player.queue.slice(0, MAX_QUEUE_ROWS))
      .slice(0, MAX_QUEUE_ROWS)
      .map((item, i): RemoteQueueRow => ({
        index: i,
        title: item.title,
        duration: item.duration,
        current: current.length > 0 && i === 0,
        playable: !!item.audioUrl && !item.sourceAppId
      }))
  }
  snapshot = boundQueue(result)
  return snapshot
}

export function subscribeQueue(listener: () => void): () => void {
  let last = queueSnapshot()
  const check = (): void => {
    const next = queueSnapshot()
    if (next === last) return
    last = next
    listener()
  }
  const off = [
    usePlayerStore.subscribe(check),
    useAlbumStore.subscribe(check),
    useSidesStore.subscribe(check)
  ]
  return () => off.forEach((unsubscribe) => unsubscribe())
}

export function useQueueSnapshot(): RemoteQueue {
  return useSyncExternalStore(subscribeQueue, queueSnapshot, queueSnapshot)
}

/** Revalidate against the live source after IPC: an old phone must not hijack streaming. */
export function playQueueIndex(index: number, expectedRevision: string): boolean {
  const queue = queueSnapshot()
  if (!Number.isSafeInteger(index) || index < 0 || queue.revision !== expectedRevision) return false
  if (!queue.rows.some((row) => row.index === index && row.playable)) return false
  const player = usePlayerStore.getState()
  if (player.currentTrack?.sourceAppId) return false
  if (queue.kind === 'album') useAlbumStore.getState().play(index)
  else if (queue.kind === 'queue') {
    if (player.currentTrack && index === 0) {
      usePlayerStore.setState({ progress: 0, isPlaying: true })
    } else player.playTrackAtIndex(index - (player.currentTrack ? 1 : 0))
  } else return false
  return true
}
