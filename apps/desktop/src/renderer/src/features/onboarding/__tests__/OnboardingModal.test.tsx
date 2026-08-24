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

  it('renders hardware manual when isOnboardingOpen is true', () => {
    render(<OnboardingModal />)
    expect(screen.getByText('THE DECK')).toBeInTheDocument()
    expect(screen.getByText('Hardware Manual — 1 / 4')).toBeInTheDocument()
  })

  it('navigates across steps', () => {
    const { container } = render(<OnboardingModal />)

    // Click Next (ArrowRight icon button) to go to Step 2
    // The next button is the one with ArrowRight
    const nextBtn = container.querySelector('button .lucide-arrow-right')?.parentElement
    expect(nextBtn).toBeDefined()
    fireEvent.click(nextBtn!)
    expect(screen.getByText('THE TONEARM')).toBeInTheDocument()

    // Click Next to go to Step 3
    fireEvent.click(nextBtn!)
    expect(screen.getByText('MATCH ALBUM')).toBeInTheDocument()
    
    // Click Next to go to Step 4
    fireEvent.click(nextBtn!)
    expect(screen.getByText('LYRICS')).toBeInTheDocument()

    // Click Done
    const doneBtn = screen.getByRole('button', { name: /done/i })
    fireEvent.click(doneBtn)

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  }, 15000)

  it('does not render when isOnboardingOpen is false', () => {
    usePlayerStore.setState({ isOnboardingOpen: false })
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })
})
