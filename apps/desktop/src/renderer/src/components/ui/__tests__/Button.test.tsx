import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../Button'

describe('Button component', () => {
  it('renders default button element correctly', () => {
    render(<Button>Click Me</Button>)
    const button = screen.getByRole('button', { name: 'Click Me' })
    expect(button).toBeInTheDocument()
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="circular">Icon</Button>)
    let button = screen.getByRole('button', { name: 'Icon' })
    expect(button).toHaveClass('rounded-full')

    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button', { name: 'Secondary' })
    expect(button).toHaveClass('border-neutral-600')
  })

  it('triggers onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Action</Button>)
    const button = screen.getByRole('button', { name: 'Action' })

    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('supports active state indicator styling', () => {
    render(<Button active>Active State</Button>)
    const button = screen.getByRole('button', { name: 'Active State' })
    expect(button).toHaveClass('text-amber-400')
  })
})
