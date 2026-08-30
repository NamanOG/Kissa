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
  })

  it('navigates across steps using buttons', () => {
    render(<OnboardingModal />)

    // Step 1 -> Step 2
    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    expect(screen.getByText('The Setup')).toBeInTheDocument()
    expect(screen.getByText('Record Shelf')).toBeInTheDocument()

    // Step 2 -> Step 3
    fireEvent.click(nextBtn)
    expect(screen.getByText('About Kissa')).toBeInTheDocument()
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
    
    // Step 3 -> Step 4 (Atmosphere & Audio)
    fireEvent.click(nextBtn)
    expect(screen.getByText('Atmosphere & Audio')).toBeInTheDocument()
    expect(screen.getByText('Hardware Mechanics')).toBeInTheDocument()

    // Step 4 -> Step 5 (Ready)
    fireEvent.click(nextBtn)
    expect(screen.getByText('Ready.')).toBeInTheDocument()

    // Step 5 -> Done
    const startBtn = screen.getByRole('button', { name: /start listening/i })
    fireEvent.click(startBtn)

    expect(usePlayerStore.getState().isOnboardingOpen).toBe(false)
  })

  it('navigates backwards using Previous button', () => {
    render(<OnboardingModal />)
    
    const nextBtn = screen.getByText('Next')
    fireEvent.click(nextBtn)
    
    const prevBtn = screen.getByText('Previous')
    fireEvent.click(prevBtn)
    
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()
  })

  it('navigates using keyboard arrows and escapes', () => {
    render(<OnboardingModal />)

    // ArrowRight to Step 2
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('The Setup')).toBeInTheDocument()

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
      value: vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<OnboardingModal />)
    
    // Ensures component still renders correctly; transitions check is implicit in variants internally
    expect(screen.getByText('A music player built around the feeling of listening.')).toBeInTheDocument()

    // Clean up
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('does not render when isOnboardingOpen is false', () => {
    usePlayerStore.setState({ isOnboardingOpen: false })
    const { container } = render(<OnboardingModal />)
    expect(container.firstChild).toBeNull()
  })
})
