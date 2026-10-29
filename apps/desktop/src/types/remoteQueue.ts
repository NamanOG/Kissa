/** Only display metadata crosses the remote boundary: never paths or audio addresses. */
export interface RemoteQueueRow {
  index: number
  title: string
  duration: number
  current: boolean
  playable: boolean
}

export interface RemoteQueue {
  kind: 'album' | 'queue' | 'album-info' | 'none'
  /** Changes with the source/order, so an old phone cannot select a different track by mistake. */
  revision: string
  title: string
  rows: RemoteQueueRow[]
  total: number
  status: 'ready' | 'finding' | 'missing' | 'off' | 'empty'
}

export const MAX_QUEUE_ROWS = 200
export const EMPTY_QUEUE: RemoteQueue = {
  kind: 'none',
  revision: '',
  title: '',
  rows: [],
  total: 0,
  status: 'empty'
}

/** Main validates even renderer-originated snapshots. Bound both work and wire size. */
export function boundQueue(value: unknown): RemoteQueue {
  if (!value || typeof value !== 'object') return { ...EMPTY_QUEUE, rows: [] }
  const v = value as Record<string, unknown>
  if (!['album', 'queue', 'album-info', 'none'].includes(String(v.kind)))
    return { ...EMPTY_QUEUE, rows: [] }
  const kind = v.kind as RemoteQueue['kind']
  const text = (x: unknown): string => (typeof x === 'string' ? x.slice(0, 200) : '')
  const rows: RemoteQueueRow[] = []
  const seen = new Set<number>()
  for (const item of Array.isArray(v.rows) ? v.rows.slice(0, MAX_QUEUE_ROWS) : []) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    if (
      typeof r.index !== 'number' ||
      !Number.isSafeInteger(r.index) ||
      r.index < 0 ||
      seen.has(r.index)
    )
      continue
    seen.add(r.index)
    rows.push({
      index: r.index,
      title: text(r.title),
      duration:
        typeof r.duration === 'number' && Number.isFinite(r.duration)
          ? Math.min(86400, Math.max(0, r.duration))
          : 0,
      current: r.current === true,
      playable: (kind === 'album' || kind === 'queue') && r.playable === true
    })
  }
  return {
    kind,
    revision: text(v.revision),
    title: text(v.title),
    rows,
    total:
      typeof v.total === 'number' && Number.isSafeInteger(v.total)
        ? Math.max(rows.length, Math.min(1000000, v.total))
        : rows.length,
    status: ['ready', 'finding', 'missing', 'off', 'empty'].includes(String(v.status))
      ? (v.status as RemoteQueue['status'])
      : 'empty'
  }
}
