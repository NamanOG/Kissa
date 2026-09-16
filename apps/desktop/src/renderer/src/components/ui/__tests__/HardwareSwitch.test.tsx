import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HardwareSwitch } from '../HardwareSwitch'

describe('HardwareSwitch Component', () => {
  it('renders with role="switch" and reflects checked state in aria-checked', () => {
    const handleChange = vi.fn()
    const { rerender } = render(
      <HardwareSwitch checked={false} onChange={handleChange} aria-label="Auto-scroll" />
    )

    const toggle = screen.getByRole('switch', { name: 'Auto-scroll' })
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')

    rerender(<HardwareSwitch checked={true} onChange={handleChange} aria-label="Auto-scroll" />)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onChange with toggled value on click', () => {
    const handleChange = vi.fn()
    render(<HardwareSwitch checked={false} onChange={handleChange} aria-label="Physical Feedback" />)

    const toggle = screen.getByRole('switch', { name: 'Physical Feedback' })
    fireEvent.click(toggle)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('supports keyboard navigation via Space and Enter keys', () => {
    const handleChange = vi.fn()
    render(<HardwareSwitch checked={true} onChange={handleChange} aria-label="Always on top" />)

    const toggle = screen.getByRole('switch', { name: 'Always on top' })
    fireEvent.keyDown(toggle, { key: ' ' })
    expect(handleChange).toHaveBeenCalledWith(false)

    handleChange.mockClear()
    fireEvent.keyDown(toggle, { key: 'Enter' })
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('does not trigger onChange when disabled', () => {
    const handleChange = vi.fn()
    render(<HardwareSwitch checked={false} onChange={handleChange} disabled aria-label="Disabled Switch" />)

    const toggle = screen.getByRole('switch', { name: 'Disabled Switch' })
    fireEvent.click(toggle)
    expect(handleChange).not.toHaveBeenCalled()
  })
})
