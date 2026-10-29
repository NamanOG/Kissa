import React, { memo, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { usePlayerStore, VINYL_COLORS, type AppTheme, type VinylColor } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { VINYL_PRESSINGS, pressingGroups, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import brushedTexture from '@renderer/media/editions/brushed-aluminium-fine.jpg'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import { cn } from '@renderer/utils/cn'
import { tl, useT } from '@renderer/i18n'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { useLayoutMode } from '@renderer/hooks/useLayoutMode'
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
const LABEL = 'text-[13px] font-semibold tracking-[-0.005em] text-ink/90'

type EditorTab = 'record' | 'room' | 'saved'
/** The section last used, kept for the rest of the session so reopening lands where you were. */
let lastTab: EditorTab = 'record'

const roomName = (id: AppTheme): string =>
  id === 'adaptive' ? tl('turntable.match') : (LISTENING_ENVIRONMENTS.find((e) => e.id === id)?.name ?? id)

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
  const t = useT()
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

  const ambientMotion = usePlayerStore((s) => s.ambientMotion)
  const setAmbientMotion = usePlayerStore((s) => s.setAmbientMotion)
  const reduceMotion = useReducedMotion()
  // In a narrow window the header gives its height to the options.
  const { compact } = useLayoutMode()

  const [tab, setTab] = useState<EditorTab>(lastTab)
  const chooseTab = (next: EditorTab): void => {
    lastTab = next
    setTab(next)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }
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
    panelRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus()
    return () => {
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus()
    }
  }, [])


  // The look on the deck matches a saved setup?
  const current = editions.find((e) => e.finish === finish && e.pressing === vinylColor && e.theme === theme)

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    e.stopPropagation()
    cancelEditor()
  }

  const onSave = (e: React.SyntheticEvent): void => {
    e.preventDefault()
    const edition = saveEdition(name)
    if (edition) {
      setSaved(edition.name)
      setName('')
    }
  }

  const tabs = [
    { id: 'record' as const, label: t('editor.tab.record') },
    { id: 'room' as const, label: t('room.short') },
    { id: 'saved' as const, label: editions.length ? t('editor.tab.savedN', { n: editions.length }) : t('editor.tab.saved') }
  ]

  const finishOptions = (
    <fieldset>
      <legend className={LABEL}>{t('editor.finish')}</legend>
      <div role="radiogroup" aria-label={t('editor.finishGroup')} className="mt-3 grid grid-cols-3 gap-3.5">
        {DECK_FINISHES.map((f) => {
          const selected = f === finish
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${FINISH_PALETTES[f].name}: ${FINISH_PALETTES[f].description}`}
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
                className={cn(
                  'rounded-[7px] transition-[box-shadow,opacity,transform] duration-200 motion-reduce:transition-none',
                  selected ? 'shadow-[0_0_0_1.5px_var(--on-surface)]' : 'opacity-80 group-hover:-translate-y-0.5 group-hover:opacity-100'
                )}
              />
              <span className={cn('text-[12.5px] leading-tight transition-colors', selected ? 'font-medium text-ink' : 'text-ink/70 group-hover:text-ink')}>
                {FINISH_PALETTES[f].name}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-dim">{FINISH_PALETTES[finish].description}</p>
    </fieldset>
  )

  const pressingOptions = (
    <fieldset className="mt-7">
      <legend className={LABEL}>{t('editor.pressing')}</legend>
      <div role="radiogroup" aria-label={t('editor.pressingGroup')} className="mt-3 flex flex-col gap-3">
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
  )

  const matching = theme === 'adaptive'
  const roomOptions = (
    <div role="radiogroup" aria-label={t('room.short')} className="flex flex-col gap-5">
      {/* Match the album leads: it is the room most people keep, and it has its own light. */}
      <div
        className={cn(
          'rounded-[14px] transition-[box-shadow,background-color] duration-200 motion-reduce:transition-none',
          matching ? 'bg-ink/[0.05] shadow-[0_0_0_1.5px_var(--on-surface)]' : 'shadow-[0_0_0_1px_rgba(255,255,255,0.08)] hover:bg-ink/[0.03]'
        )}
      >
        <button
          type="button"
          role="radio"
          aria-checked={matching}
          onClick={() => setTheme('adaptive')}
          className={cn('flex w-full cursor-pointer items-center gap-3.5 rounded-[14px] p-3 text-left', FOCUS)}
        >
          <span aria-hidden="true" className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-[8px] bg-[#0d0b0a] shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
            {albumCover ? (
              <img src={albumCover} alt="" draggable={false} className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-2 rounded-full bg-[conic-gradient(from_200deg,#e08e45,#6b5bd6,#3f8f7a,#e08e45)] opacity-70 blur-[6px]" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn('block text-[13.5px] leading-snug', matching ? 'font-medium text-ink' : 'text-ink/85')}>{t('turntable.match')}</span>
            <span className="mt-0.5 block text-[11.5px] leading-snug text-dim">{t('editor.match.desc')}</span>
          </span>
        </button>
        {matching && (
          <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-[12.5px] text-ink/90">{t('turntable.moving')}</span>
              <span className="block text-[11px] text-dim">{t('editor.moving.desc')}</span>
            </span>
            <HardwareSwitch checked={ambientMotion} onChange={setAmbientMotion} aria-label={t('turntable.moving')} />
          </div>
        )}
      </div>

      <div>
        <span className={LABEL}>{t('editor.rooms')}</span>
        {/* The rooms as photographs, the same ones Settings shows. Names may take two lines. */}
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
          {LISTENING_ENVIRONMENTS.filter((env) => env.id !== 'adaptive').map((env) => {
            const selected = env.id === theme
            return (
              <button
                key={env.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={env.description}
                onClick={() => setTheme(env.id)}
                className={cn('group flex min-w-0 cursor-pointer flex-col gap-2 rounded-md text-left', FOCUS)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative block aspect-[16/10] w-full overflow-hidden rounded-[8px] transition-[box-shadow,opacity] duration-200 motion-reduce:transition-none',
                    selected ? 'shadow-[0_0_0_1.5px_var(--on-surface)]' : 'opacity-75 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] group-hover:opacity-100'
                  )}
                >
                  <img
                    src={env.image}
                    alt=""
                    draggable={false}
                    className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                      <Check className="h-3 w-3" strokeWidth={2.5} />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="shrink-0 font-mono text-[9.5px] tracking-[0.12em] text-dim/70">{env.number}</span>
                  <span className={cn('line-clamp-2 text-[12.5px] leading-snug transition-colors', selected ? 'font-medium text-ink' : 'text-ink/75 group-hover:text-ink')}>
                    {env.name}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )

  const savedOptions = (
    <section aria-label={t('editor.savedLabel')}>
      <p className="text-[12px] leading-relaxed text-dim">
        {t('editor.saved.desc')}
      </p>
      <form onSubmit={onSave} className="mt-4 flex items-center gap-2 rounded-[12px] bg-ink/[0.04] py-1.5 pl-3.5 pr-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
        <label htmlFor="kissa-edition-name" className="sr-only">
          {t('editor.name')}
        </label>
        <input
          ref={nameRef}
          id="kissa-edition-name"
          type="text"
          value={name}
          onChange={(e) => {
            setSaved(null)
            setName(e.target.value)
          }}
          maxLength={MAX_EDITION_NAME}
          placeholder={current ? t('editor.nameCopy') : t('editor.nameNew')}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 select-text bg-transparent py-1.5 font-kissa-editorial text-[16px] text-ink outline-none placeholder:text-dim/55"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className={cn('h-8 shrink-0 cursor-pointer rounded-full bg-ink/[0.1] px-3.5 text-[12px] font-semibold text-ink transition-colors hover:bg-ink/[0.16] disabled:cursor-default disabled:opacity-40', FOCUS)}
        >
          {t('editor.save')}
        </button>
      </form>
      <p aria-live="polite" className="mt-2 text-[11.5px] text-dim empty:hidden">
        {saved ? t('editor.savedAs', { name: saved }) : ''}
      </p>

      {editions.length > 0 ? (
        <ul className="mt-4 flex flex-col divide-y divide-ink/[0.06]">
          {editions.map((e) => {
            const isCurrent = current?.id === e.id
            return (
              <li key={e.id} className="group flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => applyEdition(e.id)}
                  aria-label={t('editor.apply', { name: e.name })}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn('flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md py-2.5 text-left', FOCUS)}
                >
                  <MiniDeck finish={e.finish} pressing={e.pressing} className="w-12 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[13px]', isCurrent ? 'font-medium text-ink' : 'text-ink/80')}>{e.name}</span>
                    <span className="block truncate text-[11px] text-dim">
                      {FINISH_PALETTES[e.finish].name} · {VINYL_PRESSINGS[e.pressing].name} · {roomName(e.theme)}
                    </span>
                  </span>
                  {isCurrent && <span className="shrink-0 text-[10.5px] font-medium text-tone">{t('editor.onDeck')}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => deleteEdition(e.id)}
                  aria-label={t('editor.delete', { name: e.name })}
                  title={t('editor.deleteShort')}
                  className={cn('flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim/50 opacity-60 transition-[color,opacity] hover:text-ink group-hover:opacity-100 focus-visible:opacity-100', FOCUS)}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-5 text-[12px] text-dim/80">{t('editor.empty')}</p>
      )}
    </section>
  )

  return (
    <div
      ref={panelRef}
      role="region"
      aria-label={t('editor.label')}
      onKeyDown={onKeyDown}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-panel-line bg-[var(--panel-bg)] shadow-[var(--panel-shadow)] backdrop-blur-xl',
        compact ? 'mx-3 my-3 max-h-[calc(100%-1.5rem)]' : 'mx-4 my-6 max-h-[calc(100%-3rem)] min-[900px]:ml-8'
      )}
    >
      <header className={cn('shrink-0 px-6', compact ? 'pt-4' : 'pt-6')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!compact && <span className="text-[12.5px] font-medium text-tone">{t('editor.kicker')}</span>}
            <h2 className={cn('truncate font-kissa-editorial leading-[1.1] text-ink', compact ? 'text-[21px]' : 'mt-2 text-[26px]')}>
              {current ? current.name : t('editor.yours')}
            </h2>
            <p className={cn('truncate text-[12px] text-dim', compact ? 'mt-1' : 'mt-1.5')}>
              {FINISH_PALETTES[finish].name} · {VINYL_PRESSINGS[vinylColor].name} · {roomName(theme)}
            </p>
          </div>
          <button
            type="button"
            onClick={cancelEditor}
            aria-label={t('editor.close')}
            className={cn('-mr-2 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-dim transition-colors hover:text-ink', FOCUS)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <SegmentedTabs tabs={tabs} value={tab} onChange={chooseTab} label={t('editor.sections')} className={compact ? 'mt-3' : 'mt-5'} />
      </header>

      {/* Only the options scroll; the actions below stay in view at every window size. */}
      <div className={cn('relative min-h-0 flex-1', compact ? 'mt-3' : 'mt-4')}>
        <div ref={scrollRef} onScroll={updateMore} className="h-full overflow-y-auto no-scrollbar px-6 pb-6 pt-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              aria-label={tabs.find((t) => t.id === tab)?.label}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.18, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={updateMore}
            >
              {tab === 'record' && (
                <>
                  {finishOptions}
                  {pressingOptions}
                </>
              )}
              {tab === 'room' && roomOptions}
              {tab === 'saved' && savedOptions}
            </motion.div>
          </AnimatePresence>
        </div>
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[var(--panel-bg)] to-transparent transition-opacity duration-200 motion-reduce:transition-none',
            more ? 'opacity-100' : 'opacity-0'
          )}
        />
      </div>

      <footer className={cn('flex shrink-0 items-center justify-between gap-2 border-t border-ink/[0.07] px-6', compact ? 'py-2.5' : 'py-4')}>
        <button
          type="button"
          onClick={resetToOriginal}
          title={t('editor.reset.title')}
          className={cn('cursor-pointer rounded-md text-[12px] text-dim transition-colors hover:text-ink', FOCUS)}
        >
          {t('lyrics.reset')}
        </button>
        <div className="flex items-center gap-4">
          <button type="button" onClick={cancelEditor} className={cn('cursor-pointer rounded-md text-[12.5px] text-ink/85 transition-colors hover:text-ink', FOCUS)}>
            {t('editor.cancel')}
          </button>
          <button
            type="button"
            onClick={closeEditor}
            className={cn('h-9 cursor-pointer rounded-full bg-ink px-5 text-[13px] font-semibold text-[var(--surface)] transition-opacity hover:opacity-90', FOCUS)}
          >
            {t('editor.done')}
          </button>
        </div>
      </footer>
    </div>
  )
})

EditionEditor.displayName = 'EditionEditor'
