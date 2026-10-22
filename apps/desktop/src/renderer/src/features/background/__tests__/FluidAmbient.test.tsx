import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { FluidAmbient, FRAG } from '../FluidAmbient'

describe('Moving light renderer', () => {
  it('falls back to the still background where WebGL is unavailable', () => {
    // jsdom has no WebGL, like a PC with graphics acceleration turned off.
    const { container } = render(<FluidAmbient artworkUrl="data:image/png;base64,iVBORw0KGgo=" />)
    expect(container.querySelector('[data-ambient="fluid"]')).toBeNull()
    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelectorAll('canvas').length).toBe(0)
  })

  it('asks for high precision where available (medium precision broke the field into blocks)', () => {
    expect(FRAG).toContain('#ifdef GL_FRAGMENT_PRECISION_HIGH')
  })
})
