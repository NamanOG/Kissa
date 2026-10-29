import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { DustCover, DUST_COVER_DELAY_MS, useLidStore } from '../DustCover'
import { MechanicalControls } from '../MechanicalControls'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'

vi.mock('@renderer/utils/deckSounds', () => ({ playDeckSound: vi.fn() }))

function Deck(): React.JSX.Element {
  return (
    <div>
      <MechanicalControls />
      <DustCover />
    </div>
  )
}

describe('the dust lid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useLidStore.setState({ closed: false })
    useFeaturesStore.setState({ dustCover: true })
    usePlayerStore.setState({ isPlaying: false, isPowered: true })
  })
  afterEach(() => vi.useRealTimers())

  it('comes down with the LID key, keeps the keys out of reach, and lifts when clicked', () => {
    render(<Deck />)
    fireEvent.keyDown(screen.getByTestId('lid-key'), { key: 'Enter' })
    expect(useLidStore.getState().closed).toBe(true)
    const lid = screen.getByRole('button', { name: 'Lift the lid' })
    expect(screen.getByTestId('lid-key').closest('[inert]')).not.toBeNull()
    fireEvent.click(lid)
    expect(useLidStore.getState().closed).toBe(false)
  })

  it('can be lifted while music plays: it takes the pointer although the deck around it does not', () => {
    usePlayerStore.setState({ isPlaying: true })
    render(<Deck />)
    fireEvent.keyDown(screen.getByTestId('lid-key'), { key: 'Enter' })
    const lid = screen.getByTestId('dust-cover')
    // The deck's layers are pointer-events-none; without its own pointer-events the lid let
    // every click fall through and could never be lifted while playing.
    expect(lid.className).toContain('pointer-events-auto')
    fireEvent.click(lid)
    expect(useLidStore.getState().closed).toBe(false)
  })

  it('closes by itself after ten quiet minutes, not before', () => {
    render(<Deck />)
    act(() => vi.advanceTimersByTime(DUST_COVER_DELAY_MS - 1000))
    expect(useLidStore.getState().closed).toBe(false)
    act(() => vi.advanceTimersByTime(1000))
    expect(useLidStore.getState().closed).toBe(true)
    expect(DUST_COVER_DELAY_MS).toBe(600_000)
  })

  it('stays open when closing by itself is switched off, and lifts when music starts', () => {
    useFeaturesStore.setState({ dustCover: false })
    render(<Deck />)
    act(() => vi.advanceTimersByTime(DUST_COVER_DELAY_MS * 2))
    expect(useLidStore.getState().closed).toBe(false)
    act(() => useLidStore.getState().setClosed(true))
    act(() => usePlayerStore.setState({ isPlaying: true }))
    expect(useLidStore.getState().closed).toBe(false)
  })
})
