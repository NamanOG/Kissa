import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SavedLinesView } from '../SavedLinesView'
import { useSavedLinesStore } from '@renderer/stores/savedLinesStore'
import { usePlayerStore } from '@renderer/stores/playerStore'

describe('Lines with nothing kept', () => {
  beforeEach(() => {
    useSavedLinesStore.setState({ lines: [] })
    usePlayerStore.setState({ activeView: 'shelf' })
  })

  it('says how to keep a line without relying on hover, and opens Lyrics', () => {
    render(<SavedLinesView />)
    expect(screen.getByText(/press Keep this line/)).toBeInTheDocument()
    expect(screen.queryByText(/hover/i)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Open Lyrics' }))
    expect(usePlayerStore.getState().activeView).toBe('lyrics')
  })
})
