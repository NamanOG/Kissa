import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { LyricsRecovery } from '../LyricsRecovery'

/* The lyrics library and the save step are stand-ins; the dialog's own handling is real. */

const request = { title: 'Self Control', artist: 'Frank Ocean', album: 'Blonde', duration: 249 } as never

let searchLyrics: ReturnType<typeof vi.fn>
let chooseLyrics: ReturnType<typeof vi.fn>

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  searchLyrics = vi.fn()
  chooseLyrics = vi.fn().mockResolvedValue(undefined)
  ;(window as unknown as { electron: unknown }).electron = { searchLyrics, chooseLyrics }
})
afterEach(() => {
  delete (window as unknown as { electron?: unknown }).electron
})

const lrc = (name: string, text: string): File => new File([text], name, { type: 'text/plain' })
const pick = async (file: File): Promise<void> => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Import LRC file'), { target: { files: [file] } })
  })
}

describe('Lyrics options dialog', () => {
  it('says the library did not answer when the search comes back unavailable', async () => {
    searchLyrics.mockResolvedValue({ status: 'unavailable', candidates: [] })
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /search/i }))
    })
    expect(screen.getByText(/did not answer/i)).toBeTruthy()
  })

  it('offers to try again when the search fails outright, and a retry can succeed', async () => {
    searchLyrics.mockRejectedValueOnce(new Error('timeout'))
    searchLyrics.mockResolvedValueOnce({ status: 'ok', candidates: [] })
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /search/i }))
    })
    expect(screen.getByText(/could not search/i)).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /search/i }))
    })
    expect(screen.queryByText(/could not search/i)).toBeNull()
    expect(screen.getByText(/no matches/i)).toBeTruthy()
  })

  it('ignores a search answer that arrives after the query was edited', async () => {
    let answer: (v: unknown) => void = () => {}
    searchLyrics.mockReturnValue(new Promise((r) => (answer = r)))
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={vi.fn()} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /search/i }))
    })
    // Typing is blocked while busy, so the dialog closing is the realistic way to move on;
    // here the edit stands in for any newer action that invalidates the old search.
    const input = screen.getByRole('textbox') as HTMLInputElement
    input.disabled = false
    fireEvent.change(input, { target: { value: 'Self Control live' } })
    await act(async () => {
      answer({ status: 'unavailable', candidates: [] })
    })
    expect(screen.queryByText(/did not answer/i)).toBeNull()
  })

  it('rejects a file that is not .lrc, or is too large, without saving', async () => {
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={vi.fn()} />)
    await pick(lrc('words.txt', '[00:01.00] hello'))
    expect(screen.getByText(/UTF-8 \.lrc file smaller than 256 KB/)).toBeTruthy()
    await pick(lrc('big.lrc', 'x'.repeat(256_001)))
    expect(chooseLyrics).not.toHaveBeenCalled()
  })

  it('imports an .lrc file and reports it saved', async () => {
    const onSaved = vi.fn()
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={onSaved} />)
    await pick(lrc('self-control.LRC', '[00:01.00] Kissa QA line'))
    expect(chooseLyrics).toHaveBeenCalledWith(request, { kind: 'import', text: '[00:01.00] Kissa QA line' })
    expect(onSaved).toHaveBeenCalled()
  })

  it('shows the reason when the import is refused, and stays open', async () => {
    chooseLyrics.mockRejectedValue(
      new Error("Error invoking remote method 'kissa:choose-lyrics': Error: This file has no timed lines.")
    )
    const onSaved = vi.fn()
    render(<LyricsRecovery request={request} onClose={vi.fn()} onSaved={onSaved} />)
    await pick(lrc('empty.lrc', '[ar:Nobody]'))
    expect(screen.getByText('This file has no timed lines.')).toBeTruthy()
    expect(onSaved).not.toHaveBeenCalled()
  })
})
