import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Slider } from '../Slider'

describe('Slider component', () => {
  it('renders slider element correctly with given percentage fill', () => {
    const { container } = render(<Slider value={50} min={0} max={100} />)
    const fill = container.querySelector('div.bg-neutral-400')
    expect(fill).toHaveStyle({ width: '50%' })
  })

  it('handles custom min and max bounds', () => {
    const { container } = render(<Slider value={25} min={20} max={40} />)
    const fill = container.querySelector('div.bg-neutral-400')
    // (25 - 20) / (40 - 20) = 5 / 20 = 25%
    expect(fill).toHaveStyle({ width: '25%' })
  })

  it('triggers onChange when pointer down occurs on track', () => {
    const handleChange = vi.fn()
    const { container } = render(<Slider value={0} min={0} max={100} onChange={handleChange} />)
    const sliderEl = container.firstChild as HTMLElement

    // Mock getBoundingClientRect for layout calculation in jsdom
    const trackEl = container.querySelector('div.rounded-full.overflow-hidden') as HTMLElement
    vi.spyOn(trackEl, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 10,
      right: 200,
      bottom: 10,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    fireEvent.pointerDown(sliderEl, { clientX: 100, pointerId: 1 })
    expect(handleChange).toHaveBeenCalledWith(50)
  })

  it('safely handles zero-width container without outputting NaN', () => {
    const handleChange = vi.fn()
    const { container } = render(<Slider value={0} min={10} max={50} onChange={handleChange} />)
    const sliderEl = container.firstChild as HTMLElement

    const trackEl = container.querySelector('div.rounded-full.overflow-hidden') as HTMLElement
    vi.spyOn(trackEl, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => {}
    })

    fireEvent.pointerDown(sliderEl, { clientX: 50, pointerId: 1 })
    expect(handleChange).toHaveBeenCalledWith(10)
  })

  it('respects disabled state and prevents pointer events', () => {
    const handleChange = vi.fn()
    const { container } = render(<Slider value={50} disabled onChange={handleChange} />)
    const sliderEl = container.firstChild as HTMLElement

    fireEvent.pointerDown(sliderEl, { clientX: 100, pointerId: 1 })
    expect(handleChange).not.toHaveBeenCalled()
    expect(sliderEl).toHaveClass('opacity-50', 'pointer-events-none')
  })
})
