import React, { memo, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { usePlayerStore, VINYL_COLORS, type AppTheme, type VinylColor } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { VINYL_PRESSINGS, pressingGroups, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import brushedTexture from '@renderer/media/editions/brushed-aluminium-fine.jpg'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import { cn } from '@renderer/utils/cn'
import { DECK_FINISHES, FINISH_PALETTES, MAX_EDITION_NAME, type DeckFinish } from './editions'

/*
 * Visual rules for this panel, so selection and focus never compete:
 * - Selection: a thin ink frame on the thing itself (the miniature, the record, the photo),
 *   and its label in full ink.
 * - Keyboard focus: an accent outline round the whole control, offset, keyboard only.
 *   Different colour, different shape, so the two can never be confused.
 */
const FOCUS =
  'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-tone'
const LABEL = 'font-mono text-[9.5px] font-bold uppercase tracking-[0.24em] text-dim/80'

const roomName = (id: AppTheme): string =>
  id === 'adaptive' ? 'Match the album' : (LISTENING_ENVIRONMENTS.find((e) => e.id === id)?.name ?? id)

/**
 * A small model of the deck in a finish, with the chosen record on it. It carries the same
 * material cues as the real plinth (brushed grain, a lit chamfer, a front edge with depth), so
 * the choice reads as a material, not a colour chip.
 */
function MiniDeck({ finish, pressing, className }: { finish: DeckFinish; pressing: VinylColor; className?: string }): React.JSX.Element {
  const p = FINISH_PALETTES[finish]
  return (
    <span aria-hidden="true" className={cn('relative block aspect-[10/6.8]', className)}>
      {/* Top plate */}
      <span
        className={cn('absolute inset-x-0 top-0 bottom-[8%] overflow-hidden rounded-b-[2px] shadow-[0_8px_18px_rgba(0,0,0,0.5)]', (p.radius ?? 18) < 12 ? 'rounded-t-[2px]' : 'rounded-t-[6px]')}
        style={{ background: `linear-gradient(160deg, ${p.top[0]} 0%, ${p.top[2]} 55%, ${p.top[4]} 100%)` }}
      >
        {p.brushed && (
          <span
            className="absolute inset-0 opacity-60 mix-blend-overlay"
            style={{ backgroundImage: `url(${brushedTexture})`, backgroundSize: '220% 100%' }}
          />
        )}
        {/* The chamfer: light along the back and left edge. */}
        <span
          className="absolute inset-0 rounded-[inherit]"
          style={{
            boxShadow: p.machining
              ? `inset 1px 1px 0 ${p.machining.chamfer[0]}, inset -1px 0 0 ${p.machining.chamfer[1]}`
              : `inset 0 1px 0 ${p.rim}`
          }}
        />
        <span className="absolute left-[12%] top-[8%] aspect-square h-[84%] rounded-full" style={{ background: p.well[1] }} />
        <span
          className="absolute left-[13.5%] top-[11%] aspect-square h-[78%] rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
          style={{ background: pressingSwatch(pressing) }}
        >
          <span className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9cbb2]/85" />
        </span>
        <span className="absolute right-[12%] top-[12%] h-[66%] w-[2px] rotate-[18deg] rounded-full bg-black/45" />
      </span>
      {/* Front edge: the plate's thickness, turned away from the light. */}
      <span
        className={cn('absolute inset-x-0 bottom-0 h-[10%]', (p.radius ?? 18) < 12 ? 'rounded-b-[2px]' : 'rounded-b-[6px]')}
        style={{ background: `linear-gradient(180deg, ${p.front[0]}, ${p.front[3]})` }}
      />
    </span>
  )
}

/**
 * Edition editor. It sits beside the deck instead of covering it, so every choice is
 * previewed on the real turntable. Cancel puts back what was there when it opened;
 * Original returns the finish and pressing to Kissa's own (the room is left alone).
 */
export const EditionEditor = memo((): React.JSX.Element => {
  const finish = useEditionsStore((s) => s.finish)
  const editions = useEditionsStore((s) => s.editions)
  const setFinish = useEditionsStore((s) => s.setFinish)
  const closeEditor = useEditionsStore((s) => s.closeEditor)
  const cancelEditor = useEditionsStore((s) => s.cancelEditor)
  const resetToOriginal = useEditionsStore((s) => s.resetToOriginal)
  const saveEdition = useEditionsStore((s) => s.saveEdition)
  const applyEdition = useEditionsStore((s) => s.applyEdition)
  const deleteEdition = useEditionsStore((s) => s.deleteEdition)

  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const albumCover = artworkUrl && !artworkUrl.includes('placeholder-album') ? artworkUrl : null

  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // More options below the fold: a soft fade says so.
  const [more, setMore] = useState(false)
  const updateMore = (): void => {
    const el = scrollRef.current
    if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }
  useEffect(() => {
    updateMore()
    const el = scrollRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(updateMore)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    returnFocus.current = document.activeElement
    panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus()
    }
  }, [])

  useEffect(() => {
    if (naming) nameRef.current?.focus()
  }, [naming])

  // The look on the deck matches a saved setup?
  const current = editions.find((e) => e.finish === finish && e.pressing === vinylColor && e.theme === theme)

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    if (naming) setNaming(false)
    else cancelEditor()
  }

  const onSave = (e: React.SyntheticEvent): void => {
    e.preventDefault()
    const edition = saveEdition(name)
    if (edition) {
      setSaved(edition.name)
      setName('')
      setNaming(false)
    }
  }

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label="Edition editor"
      onKeyDown={onKeyDown}
      className="mx-4 my-6 flex max-h-[calc(100%-3rem)] min-h-0 flex-col overflow-hidden rounded-[26px] border border-panel-line bg-[var(--panel-bg)] shadow-[var(--panel-shadow)] min-[900px]:ml-8"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 px-7 pt-7">
        <div className="min-w-0">
          <span className={LABEL}>Kissa Edition</span>
          <h2 className="mt-2 truncate font-kissa-editorial text-[26px] leading-[1.1] text-ink">{current ? current.name : 'Your turntable'}</h2>
          <p className="mt-1.5 text-[12px] text-dim">
            {FINISH_PALETTES[finish].name} · {VINYL_PRESSINGS[vinylColor].name} · {roomName(theme)}
          </p>
        </div>
        <button
          type="button"
          onClick={cancelEditor}
          aria-label="Cancel and close the Edition editor"
          className={cn('-mr-2 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors hover:text-ink', FOCUS)}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Only the options scroll; the actions below stay in view at every window size. */}
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} onScroll={updateMore} className="h-full overflow-y-auto no-scrollbar px-7 pb-5">

      <section className="mt-5 border-b border-ink/[0.07] pb-3" aria-label="Saved editions" title="Keep a finish, pressing and room together, and come back to it">
        <div className="flex items-baseline justify-between">
          <span className={LABEL}>Saved</span>
          {!naming && (
            <button
              type="button"
              onClick={() => {
                setSaved(null)
                setNaming(true)
              }}
              className={cn('cursor-pointer rounded-md text-[12px] text-ink/85 underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink/60', FOCUS)}
            >
              {current ? 'Save a copy…' : 'Save this edition…'}
            </button>
          )}
        </div>

        {naming && (
          <form onSubmit={onSave} className="mt-3 flex items-center gap-2">
            <label htmlFor="kissa-edition-name" className="sr-only">
              Edition name
            </label>
            <input
              ref={nameRef}
              id="kissa-edition-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_EDITION_NAME}
              placeholder="Name it"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 select-text border-b border-ink/20 bg-transparent px-0.5 py-1.5 font-kissa-editorial text-[17px] text-ink outline-none placeholder:text-dim/50 focus-visible:border-ink/60"
            />
            <button type="submit" disabled={!name.trim()} className={cn('cursor-pointer rounded-md px-2 py-1 text-[12px] font-bold text-ink disabled:cursor-default disabled:opacity-35', FOCUS)}>
              Save
            </button>
            <button type="button" onClick={() => setNaming(false)} className={cn('cursor-pointer rounded-md px-1.5 py-1 text-[12px] text-dim hover:text-ink', FOCUS)}>
              Cancel
            </button>
          </form>
        )}

        {editions.length > 0 ? (
          <ul className="mt-3 flex flex-col">
            {editions.map((e) => {
              const isCurrent = current?.id === e.id
              return (
                <li key={e.id} className="group flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => applyEdition(e.id)}
                    aria-label={`Apply ${e.name}`}
                    aria-current={isCurrent ? 'true' : undefined}
                    className={cn('flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md py-2 text-left', FOCUS)}
                  >
                    <MiniDeck finish={e.finish} pressing={e.pressing} className="w-11 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block truncate text-[13px]', isCurrent ? 'text-ink' : 'text-ink/80')}>{e.name}</span>
                      <span className="block truncate text-[11px] text-dim">
                        {FINISH_PALETTES[e.finish].name} · {VINYL_PRESSINGS[e.pressing].name} · {roomName(e.theme)}
                      </span>
                    </span>
                    {isCurrent && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEdition(e.id)}
                    aria-label={`Delete ${e.name}`}
                    className={cn('flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim/50 transition-colors hover:text-ink', FOCUS)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          null
        )}
        <p aria-live="polite" className="mt-1 text-[11.5px] text-dim empty:hidden">
          {saved ? `Saved “${saved}”.` : ''}
        </p>
      </section>

      <fieldset className="mt-6">
        <legend className={LABEL}>Finish</legend>
        <div role="radiogroup" aria-label="Deck finish" className="mt-3 grid grid-cols-3 gap-3.5">
          {DECK_FINISHES.map((f) => {
            const selected = f === finish
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${FINISH_PALETTES[f].name}: ${FINISH_PALETTES[f].description}`}
                data-autofocus={selected ? true : undefined}
                onClick={() => setFinish(f)}
                tabIndex={selected ? 0 : -1}
                data-finish-option={f}
                onKeyDown={(e) => {
                  // One tab stop for the group; arrows move and choose, as in any radio group.
                  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
                  if (!step) return
                  e.preventDefault()
                  const i = DECK_FINISHES.indexOf(f)
                  const next = DECK_FINISHES[(i + step + DECK_FINISHES.length) % DECK_FINISHES.length]
                  setFinish(next)
                  panelRef.current?.querySelector<HTMLElement>(`[data-finish-option="${next}"]`)?.focus()
                }}
                className={cn('group relative flex cursor-pointer flex-col gap-2.5 rounded-lg text-left', FOCUS)}
              >
                <MiniDeck
                  finish={f}
                  pressing={vinylColor}
                  className={cn('rounded-[7px] transition-[box-shadow,opacity] duration-200 motion-reduce:transition-none', selected ? 'shadow-[0_0_0_1.5px_var(--on-surface)]' : 'opacity-85 group-hover:opacity-100')}
                />
                <span className={cn('text-[12.5px] leading-tight transition-colors', selected ? 'font-medium text-ink' : 'text-ink/70 group-hover:text-ink')}>
                  {FINISH_PALETTES[f].name}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className={cn(LABEL, 'flex w-full items-baseline justify-between')}>
          <span>Pressing</span>
        </legend>
        <div role="radiogroup" aria-label="Record pressing" className="mt-3 flex flex-col gap-3">
          {pressingGroups(VINYL_COLORS).map((group) => (
          <div key={group.label} role="group" aria-label={group.label} className="flex flex-col gap-1.5">
          <span className="text-[11px] text-dim">{group.label}</span>
          <div className="flex flex-wrap gap-x-2 gap-y-3">
            {group.colors.map((color) => {
              const selected = color === vinylColor
              return (
                <button
                  key={color}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={VINYL_PRESSINGS[color].name}
                  title={VINYL_PRESSINGS[color].name}
                  onClick={() => setVinylColor(color)}
                  className={cn('relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full', FOCUS)}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative block h-7 w-7 rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-transform duration-200 motion-reduce:transition-none',
                      selected ? 'scale-100 ring-[1.5px] ring-[var(--on-surface)] ring-offset-2 ring-offset-[var(--panel-bg)]' : 'scale-[0.86] hover:scale-95'
                    )}
                    style={{ background: pressingSwatch(color) }}
                  >
                    <span className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d9cbb2]/85" />
                  </span>
                </button>
              )
            })}
          </div>
          </div>
          ))}
        </div>
        <p className="mt-3 font-kissa-editorial text-[16px] italic text-ink/90">{VINYL_PRESSINGS[vinylColor].name}</p>
      </fieldset>

      <fieldset className="mt-6">
        <legend className={LABEL}>Room</legend>
        {/* The rooms as small photographs, the same ones Settings shows. */}
        <div role="radiogroup" aria-label="Room" className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3.5">
          {LISTENING_ENVIRONMENTS.map((env) => {
            const selected = env.id === theme
            return (
              <button
                key={env.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(env.id)}
                className={cn('group flex min-w-0 cursor-pointer flex-col gap-1.5 rounded-md text-left', FOCUS)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative block aspect-[3/2] w-full overflow-hidden rounded-[6px] transition-[box-shadow,opacity] duration-200',
                    selected ? 'shadow-[0_0_0_1.5px_var(--on-surface)]' : 'opacity-70 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] group-hover:opacity-100'
                  )}
                >
                  {env.id === 'adaptive' ? (
                    // Match Album takes its light from whatever is playing.
                    <span className="absolute inset-0 bg-[#0d0b0a]">
                      {albumCover && <img src={albumCover} alt="" draggable={false} className="absolute left-1/2 top-1/2 aspect-square w-[42%] -translate-x-1/2 -translate-y-1/2 rounded-[2px] object-cover" />}
                    </span>
                  ) : (
                    <img src={env.image} alt="" draggable={false} className="h-full w-full object-cover" />
                  )}
                </span>
                <span className={cn('text-[12px] leading-snug transition-colors', selected ? 'font-medium text-ink' : 'text-ink/70 group-hover:text-ink')}>
                  {roomName(env.id)}
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>



        </div>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--panel-bg)] to-transparent transition-opacity duration-200 motion-reduce:transition-none',
            more ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-ink/[0.07] px-7 py-4">
        <button type="button" onClick={resetToOriginal} className={cn('cursor-pointer rounded-md text-[12px] text-dim transition-colors hover:text-ink', FOCUS)}>
          Reset
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={cancelEditor} className={cn('cursor-pointer rounded-md text-[12.5px] text-ink/85 transition-colors hover:text-ink', FOCUS)}>
            Cancel
          </button>
          <button
            type="button"
            onClick={closeEditor}
            className={cn('h-9 cursor-pointer rounded-full bg-ink px-5 text-[13px] font-semibold text-[var(--surface)] transition-opacity hover:opacity-90', FOCUS)}
          >
            Done
          </button>
        </div>
      </footer>
    </div>
  )
})

EditionEditor.displayName = 'EditionEditor'
