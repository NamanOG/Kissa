import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StudyRoomView } from '../StudyRoomView'
import { useStudyStore, DEFAULT_PREFS } from '@renderer/stores/studyStore'

// The test environment's animate() never finishes, so exit animations would hold the old desk.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
})

describe('StudyRoomView', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-14T09:00:00Z') })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
    })
    localStorage.clear()
    useStudyStore.setState({ active: null, review: null, history: [], prefs: DEFAULT_PREFS })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('runs a whole sitting: intention, focus, finish, reflect, history', async () => {
    // Real timers so the desk's change-over animations run; only the clock is controlled.
    vi.useRealTimers()
    vi.useFakeTimers({ now: new Date('2026-10-14T09:00:00Z'), toFake: ['Date'] })
    render(<StudyRoomView />)
    fireEvent.change(screen.getByPlaceholderText(/chapter 4/i), { target: { value: 'Read chapter 4' } })
    fireEvent.click(screen.getByRole('radio', { name: '25 min' }))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /begin/i })))
    // Let the desk's change-over animation finish.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })

    expect(screen.getByRole('heading', { name: 'Read chapter 4' })).toBeInTheDocument()
    expect(screen.getByText(/^(25:00|24:59)$/)).toBeInTheDocument()

    await act(async () => {
      vi.setSystemTime(Date.now() + 60_000)
      useStudyStore.getState().tick()
      await new Promise((r) => setTimeout(r, 1100))
    })
    expect(screen.getByText(/^(24:00|23:59)$/)).toBeInTheDocument()

    // Persisted, so a restart would restore it.
    expect(JSON.parse(localStorage.getItem('kissa_study_v1')!).active.intention).toBe('Read chapter 4')

    await act(async () => fireEvent.click(screen.getByRole('button', { name: /finish/i })))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    expect(screen.getByText(/1 min of focus/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Focused' }))
    fireEvent.click(screen.getByText(/i did what i set out to do/i))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /save to my sessions/i })))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })

    const [record] = useStudyStore.getState().history
    expect(record).toMatchObject({ intention: 'Read chapter 4', rating: 'focused', intentionDone: true, })
    expect(record.focusMs).toBeGreaterThanOrEqual(60_000)
    expect(screen.getByText('My sessions')).toBeInTheDocument()
  })

  it('asks to resume or finish after time it could not observe', async () => {
    useStudyStore.getState().start('Essay', { focusMinutes: 50, breakMinutes: 10 })
    render(<StudyRoomView />)
    await act(async () => {
      vi.advanceTimersByTime(3 * 60 * 60 * 1000)
      useStudyStore.getState().tick()
    })
    expect(screen.getByText(/that time isn.t counted/i)).toBeInTheDocument()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /resume/i })))
    expect(useStudyStore.getState().active?.interruption).toBeNull()
  })

  it('offers a break when a block ends, and never touches playback', async () => {
    const mediaPlayPause = vi.fn()
    window.electron = { mediaPlayPause } as never
    useStudyStore.getState().start('', { focusMinutes: 25, breakMinutes: 5 })
    render(<StudyRoomView />)
    for (let i = 0; i < 26; i++) {
      await act(async () => {
        vi.advanceTimersByTime(60_000)
        useStudyStore.getState().tick()
      })
    }
    expect(screen.getAllByText('Focus block done').length).toBeGreaterThan(0)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /take 5 min break/i })))
    expect(useStudyStore.getState().active?.segment.kind).toBe('break')
    expect(mediaPlayPause).not.toHaveBeenCalled()
  })
})
