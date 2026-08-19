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
      isOnboardingOpen: true,
      theme: 'quiet-room'
    })
  })

  it('renders welcome guide when isOnboardingOpen is true', () => {
    render(<OnboardingModal />)
    expect(screen.getByText('Welcome to Kissa')).toBeInTheDocument()
    expect(screen.getByText('The Ritual')).toBeInTheDocument()
    expect(screen.getByText('Play Any Music')).toBeInTheDocument()
  })

  it('navigates across steps and updates atmosphere', () => {
    render(<OnboardingModal />)

    // Click Next to go to Step 2
    const nextBtn = screen.getByRole('button', { name: /next/i })
    fireEvent.click(nextBtn)
    expect(screen.getByText('Interactive Needle Drop')).toBeInTheDocument()

    // Click Next to go to Step 3
    fireEvent.click(nextBtn)
    expect(screen.getByText('Choose your atmosphere')).toBeInTheDocument()

    // Select Indigo Jazz Club
    const jazzBarBtn = screen.getByRole('button', { name: /indigo jazz club/i })
    fireEvent.click(jazzBarBtn)
    expect(usePlayerStore.getState().theme).toBe('jazz-bar')

    // Click Start Listening
    const enterBtn = screen.getByRole('button', { name: /start listening/i })
    fireEvent.click(enterBtn)

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
    expect(localStorage.getItem('kissa_intro_seen')).toBe('true')
  })

  it('does not render when isOnboardingOpen is false', () => {
    usePlayerStore.setState({ isOnboardingOpen: false })
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })
})
