import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useDialogFocus } from '@renderer/hooks/useDialogFocus'
import { useShelfStore } from '@renderer/stores/shelfStore'
import { useLanguageStore, useT, type Translate } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { albumKey, type TallyEntry } from '@renderer/features/session/tally'
import { buildRecap, hasEnough, periodFor, type Recap, type RecapKind } from './recap'
import { usePressedStore } from './pressedStore'
import { CoverLookup, PressedScene, SCENE_CAMERA, SCENE_SECONDS, sceneCover, scenesFor, useTitle } from './PressedPages'
import { cardImage } from './PressedCard'
import { Camera, EASE_IN_OUT, LightSweep, StoryBackdrop } from './storyKit'

/**
 * Pressed: a week, a month or a year of listening told as a short story. Each scene plays
 * its choreography once and holds; the story moves on by itself, like a record turning.
 * Click to go on, click the left side to go back, hold to pause, or use the arrow keys.
 */
export function PressedView(): React.JSX.Element | null {
  const open = usePressedStore((s) => s.open)
  // Once the story has faded in it covers the whole window, so the app beneath stops being
  // drawn (see `html[data-kissa-cover]` in main.css). It comes back as soon as the story starts
  // to close, so the fade out shows the app, not an empty window.
  useEffect(() => {
    const root = document.documentElement
    if (!open) {
      delete root.dataset.kissaCover
      return
    }
    const id = window.setTimeout(() => (root.dataset.kissaCover = ''), 650)
    return () => {
      window.clearTimeout(id)
      delete root.dataset.kissaCover
    }
  }, [open])
  return <AnimatePresence>{open && <PressedOverlay key="pressed" />}</AnimatePresence>
}

/** A press shorter than this is a click; longer is a hold that pauses. */
const TAP_MS = 260

function PressedOverlay(): React.JSX.Element {
  const t = useT()
  const lang = useLanguageStore((s) => s.language)
  const reduce = !!useReducedMotion()
  const kind = usePressedStore((s) => s.kind)
  const offset = usePressedStore((s) => s.offset)
  const setPeriod = usePressedStore((s) => s.setPeriod)
  const close = usePressedStore((s) => s.close)
  const records = useShelfStore((s) => s.records)
  const rootRef = useRef<HTMLDivElement>(null)
  useDialogFocus(rootRef, true)

  const recap = useMemo(() => buildRecap(kind, Date.now(), offset, records), [kind, offset, records])
  const covers: CoverLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of records) if (r.artworkUrl) map.set(albumKey(r.album, r.artist), r.artworkUrl)
    return (e: TallyEntry) => map.get(e.k) ?? map.get(albumKey(e.a, e.b ?? ''))
  }, [records])
  const scenes = useMemo(() => scenesFor(recap, hasEnough(recap)), [recap])
  const [index, setIndex] = useState(0)
  // Bumped on every move, so the progress bar restarts even when a scene is shown again.
  const [run, setRun] = useState(0)
  const [paused, setPaused] = useState(false)
  const [held, setHeld] = useState(false)
  const scene = scenes[Math.min(index, scenes.length - 1)]
  const seconds = SCENE_SECONDS[scene]
  const auto = !reduce && seconds > 0

  useEffect(() => {
    setIndex(0)
    setRun((r) => r + 1)
  }, [kind, offset])

  const go = useCallback(
    (step: number) => {
      setIndex((i) => Math.max(0, Math.min(scenes.length - 1, i + step)))
      setRun((r) => r + 1)
    },
    [scenes.length]
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const onButton = e.target instanceof Element && e.target.closest('button')
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        go(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        go(-1)
      } else if (e.key === ' ' && !onButton) {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close, go])

  const press = useRef<{ at: number; x: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, a')) return
    press.current = { at: performance.now(), x: e.clientX }
    setHeld(true)
  }
  const onPointerUp = (e: React.PointerEvent): void => {
    const p = press.current
    press.current = null
    setHeld(false)
    if (!p || performance.now() - p.at > TAP_MS) return
    const box = e.currentTarget.getBoundingClientRect()
    go(p.x - box.left < box.width * 0.28 ? -1 : 1)
  }
  const onPointerCancel = (): void => {
    press.current = null
    setHeld(false)
  }

  const label = periodLabel(recap, lang, t)
  const cover = sceneCover(scene, recap, covers)
  const title = useTitle(recap, label)
  // Draw the share card while the opening scene rests, so the last scene does not stall.
  useEffect(() => {
    if (!scenes.includes('card')) return
    const id = window.setTimeout(() => void cardImage(recap, covers, title, t), 6500)
    return () => window.clearTimeout(id)
  }, [recap, covers, title, t, scenes])

  return (
    <motion.div
      ref={rootRef}
      data-kissa-overlay=""
      role="dialog"
      aria-modal="true"
      aria-label={t('pressed.label')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.5, ease: EASE_IN_OUT }}
      className="fixed inset-0 z-[95] flex select-none flex-col overflow-hidden bg-[#0b0806] text-ink"
    >
      <StoryBackdrop cover={cover} scene={`${kind}-${offset}-${scene}-${run}`} seconds={seconds || 12} reduce={reduce} />
      <LightSweep key={`sweep-${run}`} reduce={reduce} />

      {/* Progress: one track per scene, the current one filling over its time. */}
      <div className="relative z-10 flex gap-1.5 px-6 pt-4 min-[900px]:px-10" aria-hidden="true">
        {scenes.map((s, i) => (
          <div key={s} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.14]">
            <div
              key={i === index ? `run-${run}` : 'still'}
              className={cn(
                'h-full w-full origin-left rounded-full bg-white/85',
                i < index || (i === index && !auto) ? 'scale-x-100' : i > index ? 'scale-x-0' : ''
              )}
              style={
                i === index && auto
                  ? {
                      animation: `pressed-fill ${seconds}s linear both`,
                      animationPlayState: paused || held ? 'paused' : 'running'
                    }
                  : undefined
              }
              onAnimationEnd={i === index && auto ? () => go(1) : undefined}
            />
          </div>
        ))}
      </div>

      <header className="relative z-10 flex items-center gap-4 px-6 pt-4 min-[900px]:px-10">
        <div role="group" aria-label={t('pressed.periods')} className="kissa-well flex items-center gap-0.5 rounded-[12px] p-[3px]">
          {(['week', 'month', 'year'] as RecapKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setPeriod(k, 0)}
              className="relative h-[30px] cursor-pointer rounded-[9px] px-3.5 text-[12.5px] font-medium outline-none focus-visible:ring-1 focus-visible:ring-tone"
            >
              {kind === k && (
                <motion.span
                  layoutId="pressed-period"
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  className="kissa-raised absolute inset-0 rounded-[9px]"
                />
              )}
              <span className={cn('relative', kind === k ? 'text-ink' : 'text-dim hover:text-ink')}>{t(`pressed.${k}`)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <IconButton label={t('pressed.earlier')} onClick={() => setPeriod(kind, offset - 1)} disabled={offset <= -24}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="min-w-[9ch] text-center text-[13px] font-medium text-ink/85 tabular-nums" aria-live="polite">
            {label}
          </span>
          <IconButton label={t('pressed.later')} onClick={() => setPeriod(kind, offset + 1)} disabled={offset >= 0}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <div className="ml-auto">
          <IconButton label={t('pressed.close')} onClick={close} big>
            <X className="h-[18px] w-[18px]" />
          </IconButton>
        </div>
      </header>

      {/* The stage. Focus starts here, quietly, so the keys work without a ring on a button. */}
      <main
        data-autofocus
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={onPointerCancel}
        className="relative z-10 min-h-0 flex-1 cursor-pointer outline-none"
      >
        {/*
          Cuts overlap like a dissolve in film: the old shot keeps pushing in as it fades while
          the new one arrives on its own camera move.
        */}
        <AnimatePresence initial={false}>
          <motion.section
            key={`${kind}-${offset}-${scene}-${run}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: reduce ? 0.15 : 0.8, ease: EASE_IN_OUT, delay: reduce ? 0 : 0.12 } }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { opacity: 0, scale: 1.06, transition: { duration: 0.7, ease: EASE_IN_OUT } }
            }
            aria-roledescription={t('pressed.pageRole')}
            aria-label={t('pressed.page', { n: index + 1, total: scenes.length })}
            className="absolute inset-0 flex items-center justify-center px-6 min-[900px]:px-14"
          >
            <Camera move={SCENE_CAMERA[scene]} seconds={seconds || 10} paused={paused || held} reduce={reduce}>
              <div className="flex h-full max-h-[760px] w-full max-w-[1180px] items-center justify-center">
                <PressedScene id={scene} recap={recap} covers={covers} periodText={label} reduce={reduce} />
              </div>
            </Camera>
          </motion.section>
        </AnimatePresence>
      </main>

      <footer className="relative z-10 flex items-center gap-3 px-6 pb-6 pt-2 min-[900px]:px-10">
        <AnimatePresence>
          {index === 0 && scenes.length > 1 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: reduce ? 0 : 3.5, duration: 0.8 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              className="text-[12.5px] text-ink/50"
            >
              {t(auto ? 'pressed.hint' : 'pressed.hintStill')}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-2">
          <IconButton label={t('pressed.back')} onClick={() => go(-1)} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          {auto && (
            <IconButton label={t(paused ? 'pressed.play' : 'pressed.pause')} onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </IconButton>
          )}
          <IconButton label={t('pressed.next')} onClick={() => go(1)} disabled={index >= scenes.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
      </footer>
    </motion.div>
  )
}

function IconButton({
  label,
  onClick,
  disabled,
  big,
  children
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  big?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'kissa-raised grid shrink-0 cursor-pointer place-items-center rounded-full text-ink/80 transition duration-200 hover:text-ink active:scale-95',
        'outline-none focus-visible:ring-2 focus-visible:ring-tone/70 disabled:cursor-default disabled:opacity-30 disabled:active:scale-100',
        big ? 'h-10 w-10' : 'h-8 w-8'
      )}
    >
      {children}
    </button>
  )
}

export function periodLabel(r: Recap, lang: string, t: Translate): string {
  const start = new Date(r.period.start)
  if (r.period.kind === 'year') return String(start.getFullYear())
  if (r.period.kind === 'month') {
    const month = new Intl.DateTimeFormat(lang, { month: 'long' }).format(start)
    const sameYear = start.getFullYear() === new Date().getFullYear()
    return sameYear ? cap(month) : `${cap(month)} ${start.getFullYear()}`
  }
  if (r.period.current) return t('pressed.thisWeek')
  const prev = periodFor('week', Date.now(), -1)
  if (prev.start === r.period.start) return t('pressed.lastWeek')
  return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(start)
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
