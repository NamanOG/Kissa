import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SleepTimer } from '../SleepTimer'
import { useSleepStore } from '@renderer/stores/sleepStore'

describe('SleepTimer from the keyboard', () => {
  beforeEach(() => {
    act(() => useSleepStore.getState().cancel())
  })

  it('opens as a labelled popover, and Escape closes it and returns focus to its button', async () => {
    render(<SleepTimer />)
    const button = screen.getByRole('button', { name: 'Sleep timer' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    button.focus()
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const dialog = await screen.findByRole('dialog', { name: 'Sleep timer' })
    expect(dialog).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.activeElement).toBe(button)
  })

  it('names the close button and marks the chosen length', async () => {
    render(<SleepTimer />)
    fireEvent.click(screen.getByRole('button', { name: 'Sleep timer' }))
    expect(await screen.findByRole('button', { name: 'Close sleep timer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '30 minutes' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: '45 minutes' }))
    expect(screen.getByRole('button', { name: '45 minutes' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30 minutes' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('returns focus to its button after starting the timer', async () => {
    render(<SleepTimer />)
    const button = screen.getByRole('button', { name: 'Sleep timer' })
    fireEvent.click(button)
    fireEvent.click(await screen.findByRole('button', { name: 'Start timer' }))
    expect(useSleepStore.getState().endsAt).not.toBeNull()
    expect(document.activeElement).toBe(button)
    act(() => useSleepStore.getState().cancel())
  })
})
