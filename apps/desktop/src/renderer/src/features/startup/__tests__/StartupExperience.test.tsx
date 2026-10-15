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

  it("renders Kissa's mark and name", () => {
    render(<StartupExperience onComplete={vi.fn()} />)
    expect(screen.getByText('Kissa')).toBeInTheDocument()
    expect(screen.getByLabelText('Kissa')).toBeInTheDocument()
  })

  it('triggers onComplete after the subtle wake duration', () => {
    const onComplete = vi.fn()
    render(<StartupExperience onComplete={onComplete} />)

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(onComplete).toHaveBeenCalled()
  })
})
