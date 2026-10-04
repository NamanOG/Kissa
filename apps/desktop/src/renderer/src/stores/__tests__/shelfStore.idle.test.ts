import { describe, it, expect, beforeEach } from 'vitest'
import { useShelfStore, IDLE_SOURCE_APP_ID } from '../shelfStore'
import type { TrackInfo } from '../playerStore'

const idleTrack = {
  title: 'Kissa',
  artist: 'Listening Room',
  album: 'Kissa',
  duration: 0,
  source: 'Kissa',
  sourceAppId: IDLE_SOURCE_APP_ID
} as TrackInfo

const realTrack = {
  title: 'Weird Fishes / Arpeggi',
  artist: 'Radiohead',
  album: 'In Rainbows',
  duration: 318,
  source: 'Spotify',
  sourceAppId: 'Spotify.exe'
} as TrackInfo

describe('record shelf and the idle placeholder', () => {
  beforeEach(() => {
    useShelfStore.setState({ records: [] })
  })

  it('does not shelve the idle "Kissa — Listening Room" placeholder', () => {
    useShelfStore.getState().addOrUpdateRecord(idleTrack)
    expect(useShelfStore.getState().records).toHaveLength(0)
  })

  it('still shelves real listening', () => {
    useShelfStore.getState().addOrUpdateRecord(realTrack)
    const { records } = useShelfStore.getState()
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({ album: 'In Rainbows', artist: 'Radiohead', playCount: 1 })
  })

  it('removes a placeholder entry saved by earlier versions when the shelf is loaded', () => {
    const migrate = useShelfStore.persist.getOptions().migrate!
    const migrated = migrate(
      {
        records: [
          { albumKey: 'kissa-listening room', album: 'Kissa', artist: 'Listening Room', playCount: 12 },
          { albumKey: 'in rainbows-radiohead', album: 'In Rainbows', artist: 'Radiohead', playCount: 3 }
        ]
      },
      0
    ) as { records: { albumKey: string }[] }

    expect(migrated.records.map((r) => r.albumKey)).toEqual(['in rainbows-radiohead'])
  })
})
