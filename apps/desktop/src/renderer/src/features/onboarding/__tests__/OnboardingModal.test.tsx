import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingModal, placeCard } from '../OnboardingModal'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useLidStore } from '@renderer/features/turntable/DustCover'
import { useGuideStore } from '../guideStore'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

vi.mock('@renderer/features/vinyl', () => ({ VinylEngine: () => <div data-testid="vinyl" /> }))

const next = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
}
const heading = (): string =>
  screen.getByRole('heading').textContent?.replace(/\s+/g, ' ').trim() ?? ''

describe('The guide', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    useGuideStore.setState({ mode: 'all' })
    useLidStore.setState({ closed: false })
    usePlayerStore.setState({
      isOnboardingOpen: true,
      activeView: 'lyrics',
      listenerName: '',
      theme: 'quiet-room',
      vinylColor: 'black',
      screensaverLyrics: false,
      ambientMotion: false
    })
  })

  it('renders nothing when closed', () => {
    usePlayerStore.setState({ isOnboardingOpen: false })
    const { container } = render(<OnboardingModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens on the welcome scene with the deck in view behind it', () => {
    render(<OnboardingModal />)
    expect(heading()).toBe('Welcome to Kissa')
    expect(screen.getByText('1 of 16')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(usePlayerStore.getState().activeView).toBe('deck')
    fireEvent.change(screen.getByLabelText('What should Kissa call you?'), {
      target: { value: 'Manoj' }
    })
    expect(usePlayerStore.getState().listenerName).toBe('Manoj')
  })

  it('walks the whole tour and closes at the end', () => {
    render(<OnboardingModal />)
    const seen: string[] = [heading()]
    for (let i = 1; i < 16; i++) {
      next()
      seen.push(heading())
      expect(screen.getByText(`${i + 1} of 16`)).toBeInTheDocument()
    }
    expect(seen).toContain('Your record')
    expect(seen).toContain('The dust lid')
    expect(seen).toContain('Moving light')
    expect(seen.at(-1)).toBe('The room is yours')
    // Vinyl sound is only shown when its control is on screen; here no album is playing.
    expect(seen).not.toContain('Vinyl sound')
    fireEvent.click(screen.getByRole('button', { name: 'Start listening' }))
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
    expect(localStorage.getItem('kissa_intro_seen_v3')).toBe('true')
  })

  it('moves with the arrow keys and the wheel, jumps by chapter, and closes on Escape', () => {
    render(<OnboardingModal />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(heading()).toBe('It follows your music')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(heading()).toBe('Welcome to Kissa')
    fireEvent.wheel(window, { deltaY: 120 })
    expect(heading()).toBe('It follows your music')
    fireEvent.click(screen.getByRole('tab', { name: 'The room' }))
    expect(heading()).toBe('Moving light')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('lets you try things where they are shown', () => {
    useFeaturesStore.setState({ soundLight: false })
    render(<OnboardingModal />)
    fireEvent.click(screen.getByRole('tab', { name: 'The deck' }))
    next()
    next()
    expect(heading()).toBe('The dust lid')
    fireEvent.click(screen.getByTestId('guide-try-lid'))
    expect(useLidStore.getState().closed).toBe(true)
    next()
    // Moving on puts the lid back up.
    expect(useLidStore.getState().closed).toBe(false)
    expect(heading()).toBe('Match the album')
    fireEvent.click(screen.getByRole('radio', { name: 'Match the album' }))
    expect(usePlayerStore.getState().theme).toBe('adaptive')
    fireEvent.click(screen.getByRole('tab', { name: 'The room' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Light moves with the music' }))
    expect(useFeaturesStore.getState().soundLight).toBe(true)
  })

  it('shows only what is new in New in Kissa, and records that it was seen', () => {
    useGuideStore.setState({ mode: 'new' })
    render(<OnboardingModal />)
    expect(screen.getByText('New in Kissa')).toBeInTheDocument()
    const seen: string[] = [heading()]
    while (screen.queryByRole('button', { name: 'Next' })) {
      next()
      seen.push(heading())
    }
    expect(seen).toEqual(['The dust lid', 'Track list', 'Moving light', 'Shelf'])
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })
})

describe('where the label goes', () => {
  it('sits beside a control with room, and above one at the bottom edge', () => {
    expect(placeCard({ x: 100, y: 200, w: 60, h: 60 }, 1440, 900, 200).side).toBe('right')
    expect(placeCard({ x: 1300, y: 200, w: 60, h: 60 }, 1440, 900, 200).side).toBe('left')
    const dock = placeCard({ x: 20, y: 820, w: 1400, h: 50 }, 1440, 900, 200)
    expect(dock.side).toBe('above')
    expect(dock.y + 200).toBeLessThanOrEqual(820)
  })
})
