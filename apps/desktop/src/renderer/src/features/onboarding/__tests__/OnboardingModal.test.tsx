import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingModal } from '../OnboardingModal'
import { usePlayerStore } from '@renderer/stores/playerStore'

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
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByText('Play Any Music')).toBeInTheDocument()
  })

  it('navigates across steps and updates atmosphere', () => {
    render(<OnboardingModal />)

    // Click Continue to go to Step 2
    const continueBtn = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(continueBtn)
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByText('Interactive Needle Drops')).toBeInTheDocument()

    // Click Continue to go to Step 3
    fireEvent.click(continueBtn)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(screen.getByText('Select your listening environment')).toBeInTheDocument()

    // Select Japanese Jazz Bar
    const jazzBarBtn = screen.getByRole('button', { name: /japanese jazz bar/i })
    fireEvent.click(jazzBarBtn)
    expect(usePlayerStore.getState().theme).toBe('jazz-bar')

    // Click Finish / Enter
    const enterBtn = screen.getByRole('button', { name: /enter kissa/i })
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
