import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { StartupExperience } from '../StartupExperience'

describe('StartupExperience', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the quiet kissa mark and platter', () => {
    render(<StartupExperience onComplete={vi.fn()} />)
    expect(screen.getByText('kissa')).toBeInTheDocument()
  })

  it('triggers onComplete after the subtle wake duration', () => {
    const onComplete = vi.fn()
    render(<StartupExperience onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(1200)
    })

    expect(onComplete).toHaveBeenCalled()
  })
})
