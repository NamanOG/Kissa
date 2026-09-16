import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingModal } from '../OnboardingModal'
import { usePlayerStore } from '@renderer/stores/playerStore'

// Mock framer-motion AnimatePresence to render children synchronously without waiting for exit transitions
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion')
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>
  }
})

describe('OnboardingModal component', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.setState({
      isOnboardingOpen: true
    })
  })

  it('renders initial intro step when isOnboardingOpen is true', () => {
    render(<OnboardingModal />)
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()
    expect(screen.getByText('1 of 7')).toBeInTheDocument()
  })

  it('navigates across 7 editorial steps and closes on completion', () => {
    render(<OnboardingModal />)

    // Step 1 -> Step 2 (The Turntable)
    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Turntable')).toBeInTheDocument()
    expect(screen.getByText('2 of 7')).toBeInTheDocument()

    // Step 2 -> Step 3 (The Shelf)
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Shelf')).toBeInTheDocument()
    expect(screen.getByText('3 of 7')).toBeInTheDocument()

    // Step 3 -> Step 4 (The Room)
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Room')).toBeInTheDocument()
    expect(screen.getByText('4 of 7')).toBeInTheDocument()

    // Step 4 -> Step 5 (The Words)
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Words')).toBeInTheDocument()
    expect(screen.getByText('5 of 7')).toBeInTheDocument()

    // Step 5 -> Step 6 (The Display)
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Display')).toBeInTheDocument()
    expect(screen.getByText('6 of 7')).toBeInTheDocument()

    // Step 6 -> Step 7 (Control)
    fireEvent.click(nextBtn)
    expect(screen.getByText('Control')).toBeInTheDocument()
    expect(screen.getByText('7 of 7')).toBeInTheDocument()

    // Step 7 -> Start Listening
    const startBtn = screen.getByRole('button', { name: /start listening/i })
    fireEvent.click(startBtn)

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('navigates backwards using Previous button', () => {
    render(<OnboardingModal />)

    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Turntable')).toBeInTheDocument()

    const prevBtn = screen.getByText('Previous')
    fireEvent.click(prevBtn)
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()
  })

  it('navigates using keyboard arrows and escapes', () => {
    render(<OnboardingModal />)

    // ArrowRight to Step 2
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('The Turntable')).toBeInTheDocument()

    // ArrowLeft back to Step 1
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()

    // Escape closes modal
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('respects prefers-reduced-motion via window.matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })

    render(<OnboardingModal />)
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()
  })

  it('allows customizing turntable speed, room atmosphere, and screensaver preference', () => {
    render(<OnboardingModal />)

    // Navigate to Step 2: The Turntable
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('The Turntable')).toBeInTheDocument()
    const speed45Btn = screen.getByRole('button', { name: /45 RPM/i })
    fireEvent.click(speed45Btn)
    expect(usePlayerStore.getState().rpm).toBe('45')

    // Navigate to Step 4: The Room
    fireEvent.click(screen.getByText('Next')) // to Step 3
    fireEvent.click(screen.getByText('Next')) // to Step 4
    expect(screen.getByText('The Room')).toBeInTheDocument()
    const roomBtn = screen.getByRole('button', { name: /Vintage Amber/i })
    fireEvent.click(roomBtn)
    expect(usePlayerStore.getState().theme).toBe('dusty-record')

    // Navigate to Step 6: The Display
    fireEvent.click(screen.getByText('Next')) // to Step 5
    fireEvent.click(screen.getByText('Next')) // to Step 6
    expect(screen.getByText('The Display')).toBeInTheDocument()
    const screensaverToggle = screen.getByRole('button', { name: /Show Live Lyrics on Screensaver/i })
    fireEvent.click(screensaverToggle)
    expect(usePlayerStore.getState().screensaverLyrics).toBe(true)
  })
})
