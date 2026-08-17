import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '../Label'

describe('Label component', () => {
  it('renders custom album art image when provided', () => {
    render(<Label albumArt="https://example.com/artwork.jpg" />)
    const img = screen.getByAltText('Album Art')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/artwork.jpg')
  })

  it('renders fallback dark paper cardstock when albumArt is missing', () => {
    const { container } = render(<Label />)
    const fallback = container.querySelector('div.bg-\\[\\#1c1c1e\\]')
    expect(fallback).toBeInTheDocument()
  })
})
