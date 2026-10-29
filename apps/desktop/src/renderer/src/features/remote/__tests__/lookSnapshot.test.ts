import { afterEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { applyLook, lookSnapshot } from '../lookSnapshot'

describe('the room look the phone sees and changes', () => {
  afterEach(() => useSleepStore.getState().cancel())

  it('lists the rooms (Match the album first), pressings and finishes, with the current ones', () => {
    usePlayerStore.getState().setTheme('jazz-bar')
    const look = lookSnapshot()
    expect(look.room).toBe('jazz-bar')
    expect(look.rooms[0]).toMatchObject({ id: 'adaptive', name: 'Match the album' })
    expect(look.rooms.map((r) => r.id)).toContain('quiet-room')
    expect(look.pressings.length).toBeGreaterThan(5)
    expect(look.finishes.map((f) => f.id)).toEqual(['original', 'porcelain', 'silver'])
    expect(look.sleepLeft).toBeNull()
  })

  it('applies a phone change through the same store actions, and ignores unknown values', () => {
    applyLook({ setting: 'room', value: 'quiet-room' })
    expect(usePlayerStore.getState().theme).toBe('quiet-room')
    applyLook({ setting: 'room', value: 'attic' })
    expect(usePlayerStore.getState().theme).toBe('quiet-room')
    applyLook({ setting: 'finish', value: 'silver' })
    expect(useEditionsStore.getState().finish).toBe('silver')
    applyLook({ setting: 'lyrics', value: true })
    expect(usePlayerStore.getState().showSideLyrics).toBe(true)
    applyLook({ setting: 'sleep', value: 30 })
    expect(lookSnapshot().sleepLeft).toBeGreaterThan(29 * 60)
    applyLook({ setting: 'sleep', value: 0 })
    expect(useSleepStore.getState().endsAt).toBeNull()
  })
})
