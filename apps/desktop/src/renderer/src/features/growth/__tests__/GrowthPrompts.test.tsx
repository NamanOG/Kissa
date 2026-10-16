import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { GrowthPrompts } from '../GrowthPrompts'
import { freshGrowth, loadGrowth, saveGrowth } from '../growth'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'

vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>()
  return { ...actual, useReducedMotion: () => true, AnimatePresence: ({ children }: { children: React.ReactNode }) => children }
})

describe('release notice lifecycle', () => {
  beforeEach(() => {
    localStorage.clear()
    usePlayerStore.setState({
      isOnboardingOpen: false, isSettingsOpen: false, isKeyboardHelpOpen: false,
      isListeningDisplay: false, isScreensaver: false, activeView: 'deck', isWhatsNewOpen: false
    })
    useStudyStore.setState({ active: null })
    Object.defineProperty(window, 'electron', {
      configurable: true, writable: true,
      value: { getAppVersion: vi.fn().mockResolvedValue('4.3.0'), getUpdateStatus: vi.fn().mockResolvedValue({ isStoreManaged: true }) }
    })
  })

  afterEach(() => {
    cleanup()
    delete (window as Partial<Window>).electron
  })

  it('does not mark an update seen while Settings hides it, including across relaunch', async () => {
    saveGrowth({ ...freshGrowth(Date.now()), lastSeenVersion: '4.2.0' })
    usePlayerStore.setState({ isSettingsOpen: true })
    let view: ReturnType<typeof render>
    await act(async () => { view = render(<GrowthPrompts />) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(loadGrowth(Date.now()).lastSeenVersion).toBe('4.2.0')
    view!.unmount()
    usePlayerStore.setState({ isSettingsOpen: false, isWhatsNewOpen: false })
    await act(async () => { render(<GrowthPrompts />) })
    expect(screen.getByRole('dialog', { name: 'New in the listening room' })).toBeInTheDocument()
    expect(loadGrowth(Date.now()).lastSeenVersion).toBe('4.3.0')
  })

  it('skips automatic notes on a fresh install but lets the listener reopen them', async () => {
    usePlayerStore.setState({ isOnboardingOpen: true })
    await act(async () => { render(<GrowthPrompts />) })
    expect(loadGrowth(Date.now()).lastSeenVersion).toBe('4.3.0')
    await act(async () => { usePlayerStore.setState({ isOnboardingOpen: false }) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await act(async () => { usePlayerStore.getState().setIsWhatsNewOpen(true) })
    expect(screen.getByRole('dialog', { name: 'New in the listening room' })).toBeInTheDocument()
  })
})
