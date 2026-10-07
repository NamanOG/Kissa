import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingModal } from '../OnboardingModal'
import { usePlayerStore } from '@renderer/stores/playerStore'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

vi.mock('@renderer/features/vinyl', () => ({ VinylEngine: () => <div data-testid="vinyl" /> }))

const TITLES = ['Welcome to Kissa', 'It follows your music', 'Make the room yours', 'Read along', 'Let it run']
const next = (): void => {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
}

describe('OnboardingModal', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.setState({
      isOnboardingOpen: true,
      listenerName: '',
      theme: 'quiet-room',
      vinylColor: 'black',
      screensaverLyrics: false
    })
  })

  it('renders nothing when closed', () => {
    usePlayerStore.setState({ isOnboardingOpen: false })
    const { container } = render(<OnboardingModal />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens on the welcome step', () => {
    render(<OnboardingModal />)
    expect(screen.getByRole('heading', { name: TITLES[0] })).toBeInTheDocument()
    expect(screen.getByText('1 of 5')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })

  it('walks through every step and closes at the end', () => {
    render(<OnboardingModal />)
    for (let i = 1; i < TITLES.length; i++) {
      next()
      expect(screen.getByRole('heading', { name: TITLES[i] })).toBeInTheDocument()
      expect(screen.getByText(`${i + 1} of 5`)).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Start listening' }))
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
    expect(localStorage.getItem('kissa_intro_seen_v3')).toBe('true')
  })

  it('goes back', () => {
    render(<OnboardingModal />)
    next()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('heading', { name: TITLES[0] })).toBeInTheDocument()
  })

  it('follows the arrow keys and closes on Escape', () => {
    render(<OnboardingModal />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: TITLES[1] })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { name: TITLES[0] })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('saves the name typed on the welcome step', () => {
    render(<OnboardingModal />)
    fireEvent.change(screen.getByLabelText('What should Kissa call you?'), { target: { value: 'Naman' } })
    expect(usePlayerStore.getState().listenerName).toBe('Naman')
  })

  it('lets the listener choose a room and a record colour', () => {
    render(<OnboardingModal />)
    next()
    next()
    fireEvent.click(screen.getByRole('radio', { name: /Vintage Amber/ }))
    expect(usePlayerStore.getState().theme).toBe('dusty-record')
    fireEvent.click(screen.getByRole('radio', { name: 'Oxblood' }))
    expect(usePlayerStore.getState().vinylColor).toBe('oxblood')
  })

  it('switches lyrics on for the display from the last step', () => {
    render(<OnboardingModal />)
    for (let i = 0; i < 4; i++) next()
    fireEvent.click(screen.getByRole('switch', { name: 'Show lyrics on the display and screensaver' }))
    expect(usePlayerStore.getState().screensaverLyrics).toBe(true)
  })
})
