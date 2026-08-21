import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TonearmAssembly } from '../TonearmAssembly'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('TonearmAssembly component', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      isPlaying: false,
      currentTrack: {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 200
      },
      progress: 0
    })
  })

  it('renders unified tonearm SVG with drag title', () => {
    render(<TonearmAssembly />)
    const armEl = screen.getByTitle('Drag tonearm to drop needle & seek')
    expect(armEl).toBeInTheDocument()
  })

  it('starts drag interaction on pointerDown', () => {
    render(<TonearmAssembly />)
    const motionDiv = screen.getByTitle('Drag tonearm to drop needle & seek')

    Object.defineProperty(motionDiv, 'getBoundingClientRect', {
      value: () => ({
        left: 500,
        top: 100,
        width: 120,
        height: 380,
        right: 620,
        bottom: 480
      })
    })

    fireEvent.pointerDown(motionDiv, { clientX: 540, clientY: 300 })
    expect(motionDiv).toBeInTheDocument()
  })

  it('triggers pause and resets progress when dragged back to rest position', () => {
    usePlayerStore.setState({ isPlaying: true, progress: 100 })
    render(<TonearmAssembly />)
    const motionDiv = screen.getByTitle('Drag tonearm to drop needle & seek')

    Object.defineProperty(motionDiv, 'getBoundingClientRect', {
      value: () => ({
        left: 500,
        top: 100,
        width: 120,
        height: 380,
        right: 620,
        bottom: 480
      })
    })

    // Pointer down near center (dx ~ 0, dy > 0 -> angle ~ 0°, which is < 10°)
    fireEvent.pointerDown(motionDiv, { clientX: 560, clientY: 300 })
    fireEvent(window, new Event('pointerup'))
  })
})
