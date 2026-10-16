import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, Upload, X } from 'lucide-react'
import type { LyricsCandidate, LyricsChoice, LyricsRequest } from '../../../../types/lyrics'
import { Button } from '../../components/ui/Button'

interface Props {
  request: LyricsRequest
  onClose: () => void
  onSaved: () => void
}

/** The caller keys this by recording; unmounting invalidates all pending UI work. */
export function LyricsRecovery({ request, onClose, onSaved }: Props): React.JSX.Element {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const revision = useRef(0)
  const heading = useId()
  const [query, setQuery] = useState(`${request.title} ${request.artist}`)
  const [candidates, setCandidates] = useState<LyricsCandidate[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    dialog.current?.querySelector('input')?.focus()
    return () => {
      revision.current++
      opener?.focus()
    }
  }, [])

  const search = async (): Promise<void> => {
    const mine = ++revision.current
    setBusy(true)
    setError('')
    setCandidates([])
    setSearched(false)
    try {
      const result = await window.electron!.searchLyrics(request, query)
      if (mine !== revision.current) return
      if (result.status === 'unavailable')
        setError('The lyrics library did not answer. Try again or import a file.')
      else {
        setCandidates(result.candidates)
        setSearched(true)
      }
    } catch {
      if (mine === revision.current) setError('Could not search. Try again or import a file.')
    } finally {
      if (mine === revision.current) setBusy(false)
    }
  }

  const save = async (choice: LyricsChoice): Promise<void> => {
    const mine = ++revision.current
    setBusy(true)
    setError('')
    try {
      await window.electron!.chooseLyrics(request, choice)
      if (mine === revision.current) onSaved()
    } catch (err) {
      if (mine === revision.current)
        setError(
          err instanceof Error
            ? err.message.replace(/^Error invoking remote method '[^']+': Error: /, '')
            : 'Could not save your choice. Try again.'
        )
    } finally {
      if (mine === revision.current) setBusy(false)
    }
  }

  const importFile = async (file?: File): Promise<void> => {
    if (!file || busy) return
    if (!/\.lrc$/i.test(file.name) || file.size > 256_000) {
      setError('Choose a UTF-8 .lrc file smaller than 256 KB.')
      return
    }
    const mine = ++revision.current
    setBusy(true)
    setError('')
    try {
      const text = await file.text()
      if (mine !== revision.current) return
      await save({ kind: 'import', text })
    } catch {
      if (mine === revision.current) setError('Could not read this file. Try another .lrc file.')
    } finally {
      if (mine === revision.current) setBusy(false)
    }
  }

  return createPortal(
    <dialog
      ref={dialog}
      aria-labelledby={heading}
      onCancel={onClose}
      className="m-auto w-[min(620px,calc(100vw-32px))] max-h-[85vh] overflow-y-auto rounded-2xl border border-panel-line bg-[var(--deck-bg)] p-6 text-ink shadow-2xl backdrop:bg-black/75"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        void importFile(e.dataTransfer.files[0])
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={heading} className="font-kissa-editorial text-3xl">
            Find the right words
          </h2>
          <p className="mt-2 text-sm text-dim">
            {request.title} · {request.artist}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lyrics choices"
          className="rounded-md p-2 text-dim hover:text-ink focus-visible:outline focus-visible:outline-tone"
        >
          <X size={20} />
        </button>
      </div>
      <p className="mt-4 text-sm text-dim">
        Choose another recording or drop an LRC file here. Your choice stays with this recording on
        this device.
      </p>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Search LRCLIB by title and artist</span>
          <input
            autoFocus
            value={query}
            maxLength={500}
            disabled={busy}
            onChange={(e) => {
              revision.current++
              setQuery(e.target.value)
              setCandidates([])
              setSearched(false)
              setError('')
            }}
            className="w-full rounded-md border border-panel-line bg-ink/5 px-3 py-2.5 text-sm focus:outline focus:outline-1 focus:outline-tone"
          />
        </label>
        <Button type="submit" disabled={busy || !query.trim()} variant="secondary">
          <Search size={16} className="mr-2" />
          Search
        </Button>
      </form>
      <div className="my-4 flex flex-wrap gap-3">
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={dragging ? 'outline outline-tone' : ''}
        >
          <Upload size={16} className="mr-2" />
          Import .lrc
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void save({ kind: 'reset' })}>
          Use automatic lyrics
        </Button>
        <input
          ref={input}
          type="file"
          accept=".lrc"
          className="hidden"
          aria-label="Import LRC file"
          onChange={(e) => {
            void importFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>
      <div role="status" aria-live="polite" className="text-sm text-dim">
        {busy && 'Working on the lyrics…'}
        {error && <p className="text-ink">{error}</p>}
        {searched &&
          !candidates.length &&
          'No matches. Try a shorter title, or import an LRC file.'}
      </div>
      <ul className="mt-3 divide-y divide-panel-line">
        {candidates.map((item) => (
          <li key={item.id} className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-base font-semibold break-words">{item.title}</h3>
                <p className="mt-1 text-sm text-dim break-words">
                  {item.artist} · {item.album || 'Album not listed'}
                </p>
                <p className="mt-2 font-mono text-xs text-tone">
                  {Math.floor(Math.round(item.duration) / 60)}:
                  {String(Math.round(item.duration) % 60).padStart(2, '0')} ·{' '}
                  {item.synced ? 'Timed' : 'Words only'}
                </p>
              </div>
              <Button
                variant="secondary"
                disabled={busy}
                aria-label={`Use ${item.title}, ${item.album || 'album not listed'}`}
                onClick={() => void save({ kind: 'candidate', id: item.id })}
              >
                Use
              </Button>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-dim">
              {item.preview}
            </p>
          </li>
        ))}
      </ul>
    </dialog>,
    document.body
  )
}
