import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MetadataPanel } from '@renderer/features/now-playing/MetadataPanel'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useSidesStore } from '../sidesStore'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})

const sides = {
  kind: 'vinyl' as const,
  sides: [
    {
      letter: 'A',
      tracks: [
        { title: 'Give Life Back to Music', length: 274000 },
        { title: 'Get Lucky', length: 369000 }
      ]
    },
    { letter: 'B', tracks: [{ title: 'Touch', length: 498000 }] }
  ]
}

describe('the back of the sleeve', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        album: 'Random Access Memories',
        duration: 369
      }
    })
    useSidesStore.setState({ sides, place: { side: 0, track: 1 }, sleeveTurned: false })
  })

  it('turns over on a click and lists the record by side, with the song playing picked out', () => {
    render(<MetadataPanel />)
    expect(screen.queryByTestId('sleeve-back')).toBeNull()
    fireEvent.click(screen.getByTestId('sleeve'))
    const back = screen.getByTestId('sleeve-back')
    expect(within(back).getByText('Side A')).toBeInTheDocument()
    expect(within(back).getByText('Side B')).toBeInTheDocument()
    expect(within(back).getByText('Touch')).toBeInTheDocument()
    expect(back.querySelector('[data-playing="true"]')?.textContent).toContain('Get Lucky')
    fireEvent.keyDown(screen.getByTestId('sleeve'), { key: 'Escape' })
    expect(useSidesStore.getState().sleeveTurned).toBe(false)
  })

  it('opens from the side meter too', () => {
    render(<MetadataPanel />)
    fireEvent.click(screen.getByTestId('side-meter'))
    expect(useSidesStore.getState().sleeveTurned).toBe(true)
    expect(screen.getByTestId('sleeve-back')).toBeInTheDocument()
  })
})

describe('the Track list button', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: true,
      currentTrack: {
        title: 'Get Lucky',
        artist: 'Daft Punk',
        album: 'Random Access Memories',
        duration: 369
      }
    })
    useSidesStore.setState({
      sides,
      place: { side: 0, track: 1 },
      sleeveTurned: false,
      lookup: 'found'
    })
  })

  it('is labelled and turns the sleeve over and back', () => {
    render(<MetadataPanel />)
    const button = screen.getByTestId('tracklist-button')
    expect(button).toHaveTextContent('Track list')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(useSidesStore.getState().sleeveTurned).toBe(true)
    expect(button).toHaveTextContent('Hide track list')
    fireEvent.click(button)
    expect(useSidesStore.getState().sleeveTurned).toBe(false)
  })

  it('opens the back as a card in a narrow window, and Esc closes it', () => {
    render(<MetadataPanel compact />)
    fireEvent.click(screen.getByTestId('tracklist-button'))
    const card = screen.getByTestId('tracklist-card')
    expect(within(card).getByText('Touch')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(useSidesStore.getState().sleeveTurned).toBe(false)
  })

  it('says when there is no track list, and why', () => {
    useSidesStore.setState({ sides: null, place: null, lookup: 'missing' })
    render(<MetadataPanel compact />)
    const button = screen.getByTestId('tracklist-button')
    expect(button).toHaveTextContent('No track list')
    fireEvent.click(button)
    expect(
      within(screen.getByTestId('tracklist-card')).getByText(/isn't on MusicBrainz yet/)
    ).toBeInTheDocument()
  })

  it('tells vinyl release sides from sides arranged by Kissa', () => {
    useSidesStore.setState({ sleeveTurned: true })
    const { unmount } = render(<MetadataPanel />)
    expect(screen.getByTestId('side-source')).toHaveTextContent('Vinyl release sides')
    expect(screen.getByText(/Your copy or edition may differ/)).toBeInTheDocument()
    unmount()
    useSidesStore.setState({ sides: { ...sides, kind: 'split' } })
    render(<MetadataPanel />)
    expect(screen.getByTestId('side-source')).toHaveTextContent('Arranged by Kissa')
    expect(screen.getByTestId('meter-source')).toHaveTextContent('Arranged by Kissa')
  })
})
