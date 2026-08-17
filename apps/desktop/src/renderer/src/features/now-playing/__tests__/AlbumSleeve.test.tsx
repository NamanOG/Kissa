import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlbumSleeve } from '../AlbumSleeve'

describe('AlbumSleeve component', () => {
  it('renders album sleeve with provided image and title alt text', () => {
    render(<AlbumSleeve artworkUrl="https://example.com/sleeve.jpg" title="Discovery" />)
    const img = screen.getByAltText('Discovery')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/sleeve.jpg')
  })

  it('renders fallback image when artworkUrl is omitted', () => {
    render(<AlbumSleeve />)
    const img = screen.getByAltText('Album cover')
    expect(img).toBeInTheDocument()
  })
})
