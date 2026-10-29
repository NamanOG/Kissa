import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { EditionEditor } from '../EditionEditor'

// Tab changes animate out before the next panel mounts; jsdom never finishes that, so render plainly.
vi.mock('framer-motion', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = (await vi.importActual('framer-motion')) as any
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({ children, className, role, 'aria-label': label }: React.HTMLAttributes<HTMLDivElement>) => (
        <div className={className} role={role} aria-label={label}>
          {children}
        </div>
      ),
      span: ({ children, className }: React.HTMLAttributes<HTMLSpanElement>) => <span className={className}>{children}</span>
    }
  }
})

describe('Edition editor sections', () => {
  afterEach(() => {
    usePlayerStore.setState({ theme: 'quiet-room', ambientMotion: false })
    localStorage.removeItem('kissa_ambient_motion')
  })

  it('opens on Record with the finish and pressing choices', () => {
    render(<EditionEditor />)
    expect(screen.getByRole('tab', { name: 'Record' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('radiogroup', { name: 'Deck finish' })).toBeTruthy()
    expect(screen.getByRole('radiogroup', { name: 'Record pressing' })).toBeTruthy()
  })

  it('Room lists Match the album first and shows Moving light only when it is chosen', async () => {
    usePlayerStore.setState({ theme: 'quiet-room' })
    render(<EditionEditor />)
    fireEvent.click(screen.getByRole('tab', { name: 'Room' }))
    const panel = await screen.findByRole('tabpanel', { name: 'Room' })
    const radios = within(panel).getAllByRole('radio')
    expect(radios[0].textContent).toContain('Match the album')
    expect(screen.queryByRole('switch', { name: 'Moving light' })).toBeNull()

    fireEvent.click(radios[0])
    expect(usePlayerStore.getState().theme).toBe('adaptive')
    fireEvent.click(await screen.findByRole('switch', { name: 'Moving light' }))
    expect(usePlayerStore.getState().ambientMotion).toBe(true)
  })

  it('Saved names and keeps the current look', async () => {
    const before = useEditionsStore.getState().editions.length
    render(<EditionEditor />)
    fireEvent.click(screen.getByRole('tab', { name: /^Saved/ }))
    await screen.findByRole('tabpanel', { name: /^Saved/ })
    fireEvent.change(screen.getByLabelText('Edition name'), { target: { value: 'Late set' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(useEditionsStore.getState().editions.length).toBe(before + 1)
    expect(screen.getByText('Saved “Late set”.')).toBeTruthy()
  })
})
