import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
  Blend,
  BookOpen,
  Disc,
  Disc3,
  HelpCircle,
  Layers,
  Library,
  ListMusic,
  Moon,
  MousePointerClick,
  Quote,
  Smartphone,
  SunMedium,
  Sparkles,
  Spline,
  Tv,
  WandSparkles,
  X
} from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { usePlayerStore, VINYL_COLORS } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useSidesStore } from '@renderer/features/sides/sidesStore'
import { useLidStore } from '@renderer/features/turntable/DustCover'
import { cn } from '@renderer/utils/cn'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import { VINYL_PRESSINGS, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import { VinylEngine } from '@renderer/features/vinyl'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { IconTile, TILE, type TileIcon, type TileTint } from '@renderer/components/ui/IconTile'
import { LANGUAGES, useLanguageStore, useT, type MessageKey } from '@renderer/i18n'
import markSrc from '@renderer/assets/brand/kissa-mark-384.webp'
import { useGuideStore } from './guideStore'

export interface OnboardingModalProps {
  className?: string
}

/**
 * The guide: a short film that is also the app. Two scenes introduce Kissa; then the record
 * flies onto the real turntable and a spotlight walks through the real controls, one at a time,
 * with a label saying what each one is and does. Scroll, the arrow keys or the buttons move it
 * on; everything glides from one stop to the next.
 */

type ChapterId = 'welcome' | 'deck' | 'room' | 'around' | 'ready'

interface Stop {
  id: string
  chapter: ChapterId
  /** A scene fills the screen; a spot lights one control of the real app. */
  kind: 'scene' | 'spot'
  target?: string
  /** Leave the stop out when its control is not on screen (it only exists sometimes). */
  optional?: boolean
  /** The spotlight is an ellipse (the record). */
  round?: boolean
  icon: TileIcon
  tint: TileTint
  title: MessageKey
  desc: MessageKey
  keys?: string[]
  extra?: 'rooms' | 'light' | 'lid'
  isNew?: boolean
}

const CHAPTERS: { id: ChapterId; label: MessageKey }[] = [
  { id: 'welcome', label: 'tour.ch.welcome' },
  { id: 'deck', label: 'tour.ch.deck' },
  { id: 'room', label: 'tour.ch.room' },
  { id: 'around', label: 'tour.ch.around' },
  { id: 'ready', label: 'tour.ch.ready' }
]

const STOPS: Stop[] = [
  {
    id: 'welcome',
    chapter: 'welcome',
    kind: 'scene',
    icon: Sparkles,
    tint: TILE.amber,
    title: 'guide.welcome.title',
    desc: 'guide.welcome.lead'
  },
  {
    id: 'listen',
    chapter: 'welcome',
    kind: 'scene',
    icon: AudioWaveform,
    tint: TILE.sky,
    title: 'guide.follow.title',
    desc: 'guide.follow.lead'
  },
  {
    id: 'record',
    chapter: 'deck',
    kind: 'spot',
    target: '[data-tour="record"]',
    round: true,
    icon: Disc3,
    tint: TILE.violet,
    title: 'tour.record.title',
    desc: 'tour.record.desc'
  },
  {
    id: 'tonearm',
    chapter: 'deck',
    kind: 'spot',
    target: '.onboarding-tonearm',
    icon: Spline,
    tint: TILE.amber,
    title: 'tour.arm.title',
    desc: 'tour.arm.desc'
  },
  {
    id: 'lid',
    chapter: 'deck',
    kind: 'spot',
    target: '[data-testid="lid-key"]',
    icon: Layers,
    tint: TILE.graphite,
    title: 'tour.lid.title',
    desc: 'tour.lid.desc',
    extra: 'lid',
    isNew: true
  },
  {
    id: 'match',
    chapter: 'deck',
    kind: 'spot',
    target: '.onboarding-match-album',
    icon: WandSparkles,
    tint: TILE.violet,
    title: 'tour.match.title',
    desc: 'tour.match.desc',
    keys: ['E'],
    extra: 'rooms'
  },
  {
    id: 'tracklist',
    chapter: 'deck',
    kind: 'spot',
    target: '[data-testid="tracklist-button"]',
    icon: ListMusic,
    tint: TILE.amber,
    title: 'tour.tracklist.title',
    desc: 'tour.tracklist.desc',
    isNew: true
  },
  {
    id: 'vinyl',
    chapter: 'deck',
    kind: 'spot',
    target: '[data-testid="vinyl-sound-button"]',
    optional: true,
    icon: Disc,
    tint: TILE.rose,
    title: 'tour.vinyl.title',
    desc: 'tour.vinyl.desc',
    isNew: true
  },
  {
    id: 'light',
    chapter: 'room',
    kind: 'spot',
    target: '[data-testid="room-light-button"]',
    icon: Blend,
    tint: TILE.violet,
    title: 'tour.light.title',
    desc: 'tour.light.desc',
    extra: 'light',
    isNew: true
  },
  {
    id: 'dimmer',
    chapter: 'room',
    kind: 'spot',
    target: '[data-tour="room-dimmer"]',
    icon: SunMedium,
    tint: TILE.amber,
    title: 'tour.dimmer.title',
    desc: 'tour.dimmer.desc'
  },
  {
    id: 'lyrics',
    chapter: 'around',
    kind: 'spot',
    target: '.onboarding-lyrics',
    icon: Quote,
    tint: TILE.rose,
    title: 'tour.lyrics.title',
    desc: 'tour.lyrics.desc',
    keys: ['L']
  },
  {
    id: 'display',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="fullscreen"]',
    icon: Disc,
    tint: TILE.sky,
    title: 'tour.display.title',
    desc: 'tour.display.desc',
    keys: ['F11', 'D']
  },
  {
    id: 'party',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="party"]',
    optional: true,
    icon: Tv,
    tint: TILE.sky,
    title: 'tour.party.title',
    desc: 'tour.party.desc',
    keys: ['P'],
    isNew: true
  },
  {
    id: 'remote',
    chapter: 'around',
    kind: 'spot',
    target: '[data-testid="phone-remote-button"]',
    optional: true,
    icon: Smartphone,
    tint: TILE.teal,
    title: 'tour.remote.title',
    desc: 'tour.remote.desc',
    isNew: true
  },
  {
    id: 'sleep',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="sleep"]',
    optional: true,
    icon: Moon,
    tint: TILE.indigo,
    title: 'tour.sleep.title',
    desc: 'tour.sleep.desc'
  },
  {
    id: 'nav-lyrics',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="nav-lyrics"]',
    icon: MousePointerClick,
    tint: TILE.rose,
    title: 'tour.navLyrics.title',
    desc: 'tour.navLyrics.desc'
  },
  {
    id: 'nav-shelf',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="nav-shelf"]',
    icon: Library,
    tint: TILE.teal,
    title: 'tour.navShelf.title',
    desc: 'tour.navShelf.desc',
    isNew: true
  },
  {
    id: 'nav-focus',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="nav-focus"]',
    icon: BookOpen,
    tint: TILE.indigo,
    title: 'tour.navFocus.title',
    desc: 'tour.navFocus.desc'
  },
  {
    id: 'nav-guide',
    chapter: 'around',
    kind: 'spot',
    target: '[data-tour="nav-guide"]',
    icon: HelpCircle,
    tint: TILE.graphite,
    title: 'tour.navGuide.title',
    desc: 'tour.navGuide.desc',
    keys: ['?']
  },
  {
    id: 'ready',
    chapter: 'ready',
    kind: 'scene',
    icon: Sparkles,
    tint: TILE.amber,
    title: 'tour.ready.title',
    desc: 'tour.ready.desc'
  }
]

const SPRING = { type: 'spring', stiffness: 120, damping: 22, mass: 0.9 } as const
const EASE = [0.22, 1, 0.36, 1] as const
const CARD_W = 344
const PAD = 10

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function viewport(): { w: number; h: number } {
  return { w: window.innerWidth, h: window.innerHeight }
}

function measure(selector: string | undefined): Box | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 || r.height < 2) return null
  return { x: r.left, y: r.top, w: r.width, h: r.height }
}

/** Where the label goes: beside the control on the side with the most room, kept on screen. */
export function placeCard(
  target: Box,
  vw: number,
  vh: number,
  cardH: number
): { x: number; y: number; side: 'left' | 'right' | 'above' | 'below' } {
  const gap = 30
  const room = {
    right: vw - (target.x + target.w),
    left: target.x,
    above: target.y,
    below: vh - (target.y + target.h)
  }
  const clampY = (y: number): number => Math.max(16, Math.min(vh - cardH - 16, y))
  const clampX = (x: number): number => Math.max(16, Math.min(vw - CARD_W - 16, x))
  const midY = target.y + target.h / 2 - cardH / 2
  const midX = target.x + target.w / 2 - CARD_W / 2
  if (room.right >= CARD_W + gap + 16 && room.right >= room.left)
    return { x: target.x + target.w + gap, y: clampY(midY), side: 'right' }
  if (room.left >= CARD_W + gap + 16)
    return { x: target.x - gap - CARD_W, y: clampY(midY), side: 'left' }
  if (room.above >= cardH + gap + 16 && room.above >= room.below)
    return { x: clampX(midX), y: target.y - gap - cardH, side: 'above' }
  return { x: clampX(midX), y: clampY(target.y + target.h + gap), side: 'below' }
}

function Key({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="inline-flex h-[24px] min-w-[24px] items-center justify-center rounded-[7px] bg-white/[0.08] px-1.5 font-sans text-[11.5px] font-medium text-[#f5efe6] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(255,255,255,0.12)]">
      {children}
    </kbd>
  )
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const t = useT()
  const isOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const mode = useGuideStore((s) => s.mode)
  const lidClosed = useLidStore((s) => s.closed)
  const reduce = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  useDialogFocus(rootRef, isOpen)

  const [step, setStep] = useState(0)
  const [, setTick] = useState(0)
  const wasOpen = useRef(false)
  const lockRef = useRef(0)

  // Which stops this run shows: everything, or just what is new; optional stops only when
  // their control is on screen right now.
  const stops = useMemo(() => {
    if (!isOpen) return [] as Stop[]
    const base = mode === 'new' ? STOPS.filter((s) => s.isNew) : STOPS
    return base.filter((s) => !s.optional || measure(s.target))
    // Recomputed each time the guide opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode])

  const last = Math.max(0, stops.length - 1)
  const current = stops[Math.min(step, last)]

  const go = useCallback(
    (to: number) => {
      setStep(Math.max(0, Math.min(last, to)))
    },
    [last]
  )
  const close = useCallback(() => setIsOpen(false), [setIsOpen])
  const next = useCallback(() => (step >= last ? close() : go(step + 1)), [step, last, close, go])
  const back = useCallback(() => go(step - 1), [step, go])

  // Opening the guide puts the deck in view, with nothing in front of it.
  useEffect(() => {
    if (!isOpen) return
    const player = usePlayerStore.getState()
    if (player.activeView !== 'deck') player.setActiveView('deck')
    useLidStore.getState().setClosed(false)
    useSidesStore.setState({ sleeveTurned: false })
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true
      return
    }
    if (wasOpen.current) {
      wasOpen.current = false
      useGuideStore.getState().closed()
      useLidStore.getState().setClosed(false)
    }
    const timer = setTimeout(() => setStep(0), 400)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Leaving the lid stop puts the lid back up.
  useEffect(() => {
    if (current?.id !== 'lid') useLidStore.getState().setClosed(false)
  }, [current?.id])

  // Keys and the wheel move through the guide, like scrolling a story.
  useEffect(() => {
    if (!isOpen) return
    const typing = (el: EventTarget | null): boolean =>
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      (el as HTMLElement | null)?.isContentEditable === true
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        close()
        return
      }
      if (typing(e.target)) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        go(step + 1)
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        go(step - 1)
      }
    }
    const onWheel = (e: WheelEvent): void => {
      if (Math.abs(e.deltaY) < 24) return
      const now = Date.now()
      if (now < lockRef.current) return
      lockRef.current = now + 750
      go(step + (e.deltaY > 0 ? 1 : -1))
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
    }
  }, [isOpen, step, go, close])

  // Controls move (the window resizes, the dock fades in): follow them.
  useEffect(() => {
    if (!isOpen) return
    const bump = (): void => setTick((n) => n + 1)
    const id = window.setInterval(bump, 400)
    window.addEventListener('resize', bump)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', bump)
    }
  }, [isOpen])

  const cardRef = useRef<HTMLDivElement>(null)
  const [cardH, setCardH] = useState(240)
  // A scene's words and buttons, measured so the record above can make room for them.
  const sceneRef = useRef<HTMLDivElement>(null)
  const [sceneH, setSceneH] = useState(360)
  useLayoutEffect(() => {
    const h = cardRef.current?.offsetHeight
    if (h && Math.abs(h - cardH) > 2) setCardH(h)
    const s = sceneRef.current?.offsetHeight
    if (s && Math.abs(s - sceneH) > 2) setSceneH(s)
  })

  if (!isOpen || !current) return null

  const vp = viewport()
  // With the lid down, the light opens to the whole deck so the lid itself can be seen.
  const selector = current.id === 'lid' && lidClosed ? '.onboarding-deck' : current.target
  const target = current.kind === 'spot' ? measure(selector) : null
  const hole: Box = target
    ? { x: target.x - PAD, y: target.y - PAD, w: target.w + PAD * 2, h: target.h + PAD * 2 }
    : { x: vp.w / 2, y: vp.h / 2, w: 0, h: 0 }
  const scene = current.kind === 'scene'
  const card = target ? placeCard(hole, vp.w, vp.h, cardH) : null
  const chapterIndex = CHAPTERS.findIndex((c) => c.id === current.chapter)
  const move = reduce ? { duration: 0.18 } : SPRING
  const rx = current.round ? hole.w / 2 : 16
  const ry = current.round ? hole.h / 2 : 16

  // The hero record: big in the scenes, then it flies onto the real turntable.
  // In a short window the record gives way so the words and the buttons always fit below it.
  const SCENE_TOP = 64
  const GAP = 28
  const room = vp.h - sceneH - SCENE_TOP - GAP - 24
  const heroSize = Math.max(
    88,
    Math.min(current.id === 'ready' ? Math.min(200, vp.h * 0.22) : Math.min(300, vp.h * 0.32), room)
  )
  const heroScene = {
    x: vp.w / 2 - heroSize / 2,
    y: Math.max(SCENE_TOP, Math.min(vp.h * 0.2 - heroSize * 0.15, vp.h - sceneH - 24 - GAP - heroSize)),
    w: heroSize,
    h: heroSize
  }
  const recordStop = current.id === 'record' && target
  const hero = recordStop
    ? {
        x: target.x + target.w / 2 - Math.min(target.w, target.h) / 2,
        y: target.y + target.h / 2 - Math.min(target.w, target.h) / 2,
        w: Math.min(target.w, target.h),
        h: Math.min(target.w, target.h)
      }
    : heroScene
  const heroVisible = scene || recordStop

  const primaryLabel =
    step >= last ? (mode === 'new' ? t('guide.done') : t('guide.start')) : t('guide.next')

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('guide.label')}
      data-testid="guide"
      className={cn('fixed inset-0 z-[100] select-none', className)}
    >
      {/* Scenes: the app stays behind, deep in shadow. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-[#070504]/[0.86] backdrop-blur-[18px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: scene ? 1 : 0 }}
        transition={{ duration: reduce ? 0.2 : 0.8, ease: EASE }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: scene ? 0.9 : 0 }}
        transition={{ duration: 1.2 }}
        style={{
          background:
            'radial-gradient(60% 50% at 50% 28%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)'
        }}
      />

      {/* Spots: the room dims around one control. */}
      <motion.svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        width={vp.w}
        height={vp.h}
        initial={{ opacity: 0 }}
        animate={{ opacity: scene ? 0 : 1 }}
        transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE }}
      >
        <defs>
          <mask id="kissa-guide-hole">
            <rect x="0" y="0" width={vp.w} height={vp.h} fill="white" />
            <motion.rect
              fill="black"
              initial={false}
              animate={{ x: hole.x, y: hole.y, width: hole.w, height: hole.h, rx, ry }}
              transition={move}
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width={vp.w}
          height={vp.h}
          fill="rgba(6,5,4,0.76)"
          mask="url(#kissa-guide-hole)"
        />
      </motion.svg>

      {/* The ring around the lit control, breathing softly. */}
      {!scene && target && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute"
          initial={false}
          animate={{
            left: hole.x,
            top: hole.y,
            width: hole.w,
            height: hole.h,
            borderRadius: current.round ? '50%' : 16
          }}
          transition={move}
          style={{
            boxShadow:
              '0 0 0 1.5px color-mix(in srgb, var(--accent) 85%, white 15%), 0 0 26px 2px color-mix(in srgb, var(--accent) 45%, transparent)'
          }}
        >
          {!reduce && (
            <motion.span
              className="absolute inset-0"
              style={{
                borderRadius: 'inherit',
                boxShadow: '0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent)'
              }}
              animate={{ scale: [1, 1.08, 1.14], opacity: [0.7, 0.25, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      )}

      {/* The hero record. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute drop-shadow-[0_40px_50px_rgba(0,0,0,0.6)]"
        initial={false}
        animate={{
          left: hero.x,
          top: hero.y,
          width: hero.w,
          height: hero.h,
          opacity: heroVisible ? (recordStop ? [1, 1, 0] : 1) : 0
        }}
        transition={{
          ...(reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 70, damping: 18 }),
          opacity: recordStop
            ? { duration: reduce ? 0.2 : 1.4, times: [0, 0.7, 1] }
            : { duration: 0.5 }
        }}
      >
        <VinylEngine albumArt={markSrc} isActive />
      </motion.div>

      {/* Chapters, along the top. */}
      <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.08] bg-[#14100d]/80 p-1 pl-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.8)] backdrop-blur-xl">
        {mode === 'new' && (
          <span className="mr-1 inline-flex h-[24px] items-center rounded-full bg-tone/20 px-2.5 text-[11.5px] font-semibold text-tone">
            {t('guide.new.badge')}
          </span>
        )}
        <div className="flex items-center gap-0.5" role="tablist" aria-label={t('guide.label')}>
          {CHAPTERS.filter((c) => stops.some((s) => s.chapter === c.id)).map((c) => {
            const first = stops.findIndex((s) => s.chapter === c.id)
            const active = c.id === current.chapter
            const done = CHAPTERS.findIndex((x) => x.id === c.id) < chapterIndex
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => go(first)}
                className={cn(
                  'relative h-7 whitespace-nowrap rounded-full px-3 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-tone/70',
                  !active && 'max-[999px]:hidden',
                  active
                    ? 'text-[#170f09]'
                    : done
                      ? 'text-[#e8dccd] hover:bg-white/[0.06]'
                      : 'text-[#8e8175] hover:bg-white/[0.06] hover:text-[#e8dccd]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : 'guide-chapter'}
                    className="absolute inset-0 rounded-full bg-tone"
                    transition={SPRING}
                  />
                )}
                <span className="relative">{t(c.label)}</span>
              </button>
            )
          })}
        </div>
        <span className="mx-1.5 whitespace-nowrap text-[11.5px] tabular-nums text-[#8e8175]">
          {t('guide.stepOf', { n: step + 1, total: stops.length })}
        </span>
        <button
          type="button"
          onClick={close}
          aria-label={t('guide.close')}
          className="flex h-7 w-7 items-center justify-center rounded-full text-[#a89b8d] outline-none transition-colors hover:bg-white/[0.1] hover:text-[#f5efe6] focus-visible:ring-2 focus-visible:ring-tone/70"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        {/* How far through, as a thin line under the chapters. */}
        <span className="pointer-events-none absolute inset-x-4 -bottom-[3px] h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
          <motion.span
            className="block h-full origin-left rounded-full bg-tone"
            animate={{ scaleX: (step + 1) / stops.length }}
            transition={SPRING}
          />
        </span>
      </div>

      {/* Words: a scene's text, or the label beside the lit control. */}
      {scene ? (
        <div
          className="absolute inset-x-0 bottom-0 flex items-start justify-center px-6"
          style={{ top: heroScene.y + heroSize + GAP }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              ref={sceneRef}
              initial={{ opacity: 0, y: reduce ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduce ? 0 : -12 }}
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
              className="flex w-full max-w-[620px] flex-col items-center text-center"
              aria-live="polite"
            >
              <SceneBody id={current.id} />
              <div className="mt-7 flex items-center gap-2">
                {step > 0 && (
                  <button type="button" onClick={back} className={GHOST}>
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    {t('guide.back')}
                  </button>
                )}
                <button type="button" data-autofocus onClick={next} className={PRIMARY}>
                  {primaryLabel}
                  {step < last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {step === 0 && <p className="mt-4 text-[12px] text-[#8e8175]">{t('tour.hint')}</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          ref={cardRef}
          data-testid="guide-card"
          className="absolute overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#16120f]/[0.95] p-5 shadow-[0_34px_80px_-24px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl"
          style={{ width: CARD_W }}
          initial={false}
          animate={
            card
              ? { left: card.x, top: card.y }
              : { left: vp.w / 2 - CARD_W / 2, top: vp.h / 2 - cardH / 2 }
          }
          transition={move}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, x: reduce ? 0 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : -10 }}
              transition={{ duration: reduce ? 0.12 : 0.28, ease: EASE }}
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <IconTile icon={current.icon} tint={current.tint} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-[11.5px] font-medium text-[#a89b8d]">
                    {t(CHAPTERS[chapterIndex].label)}
                    {current.isNew && mode !== 'new' && (
                      <span className="ml-2 text-tone">{t('guide.new.badge')}</span>
                    )}
                  </span>
                  <h2 className="font-kissa-editorial text-[24px] leading-[1.1] tracking-[-0.015em] text-[#f7f1e8]">
                    {t(current.title)}
                  </h2>
                </span>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#cfc5ba]">{t(current.desc)}</p>
              {current.keys && (
                <div className="mt-3 flex items-center gap-1.5">
                  {current.keys.map((k) => (
                    <Key key={k}>{k}</Key>
                  ))}
                </div>
              )}
              {current.extra && <StopExtra kind={current.extra} />}
              {!target && <p className="mt-3 text-[12px] text-[#8e8175]">{t('tour.notHere')}</p>}
            </motion.div>
          </AnimatePresence>
          <div className="mt-5 flex items-center justify-between">
            <button type="button" onClick={back} className={cn(GHOST, 'h-9 px-3')}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {t('guide.back')}
            </button>
            <button type="button" data-autofocus onClick={next} className={cn(PRIMARY, 'h-9 px-4')}>
              {primaryLabel}
              {step < last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

const PRIMARY =
  'flex h-10 cursor-pointer items-center gap-2 rounded-full bg-tone px-5 text-[13.5px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_8px_22px_rgba(0,0,0,0.35)] outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-tone/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[0.97]'
const GHOST =
  'flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium text-[#b7a99b] outline-none transition-colors hover:bg-white/[0.06] hover:text-[#f7f1e8] focus-visible:ring-2 focus-visible:ring-tone/70'
const FIELD_LABEL = 'mb-2 block text-[12.5px] font-semibold text-[#e8dccd]'
const SELECTED_RING =
  'shadow-[0_0_0_1.5px_var(--accent),0_0_0_5px_color-mix(in_srgb,var(--accent)_16%,transparent)]'

/** What a scene says and lets you choose. */
function SceneBody({ id }: { id: string }): React.JSX.Element {
  const t = useT()
  const listenerName = usePlayerStore((s) => s.listenerName)
  const setListenerName = usePlayerStore((s) => s.setListenerName)
  const languageChoice = useLanguageStore((s) => s.choice)
  const setLanguageChoice = useLanguageStore((s) => s.setChoice)
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const setScreensaverLyrics = usePlayerStore((s) => s.setScreensaverLyrics)
  const reduce = useReducedMotion()

  const title =
    id === 'welcome'
      ? 'guide.welcome.title'
      : id === 'listen'
        ? 'guide.follow.title'
        : 'tour.ready.title'
  const lead =
    id === 'welcome'
      ? 'guide.welcome.lead'
      : id === 'listen'
        ? 'guide.follow.lead'
        : 'tour.ready.desc'

  // The title arrives a word at a time, like a title card.
  const words = t(title).split(' ')
  return (
    <>
      <h2 className="font-kissa-editorial text-[clamp(34px,4.4vw,54px)] font-normal leading-[1.04] tracking-[-0.02em] text-[#f7f1e8]">
        {words.map((w, i) => (
          <motion.span
            key={`${w}-${i}`}
            className="inline-block"
            initial={{ opacity: 0, y: reduce ? 0 : 14, filter: reduce ? 'none' : 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ delay: reduce ? 0 : 0.08 + i * 0.07, duration: 0.55, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        ))}
      </h2>
      <motion.p
        className="mt-3.5 max-w-[46ch] text-[15px] leading-relaxed text-[#cfc5ba]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduce ? 0 : 0.35, duration: 0.5 }}
      >
        {t(lead)}
      </motion.p>

      <motion.div
        className="mt-6 w-full"
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.5, duration: 0.5, ease: EASE }}
      >
        {id === 'welcome' && (
          <div className="mx-auto flex max-w-[460px] flex-col items-center gap-5">
            <div className="w-full">
              <label htmlFor="guide-name" className={cn(FIELD_LABEL, 'text-center')}>
                {t('guide.welcome.name')}
              </label>
              <input
                id="guide-name"
                type="text"
                value={listenerName}
                onChange={(e) => setListenerName(e.target.value)}
                maxLength={24}
                placeholder={t('guide.welcome.namePlaceholder')}
                autoComplete="off"
                spellCheck={false}
                className="w-full select-text appearance-none rounded-xl bg-black/30 px-4 py-3 text-center text-[15px] text-[#f7f1e8] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),inset_0_1px_2px_rgba(0,0,0,0.3)] outline-none placeholder:text-[#8e8175] focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
              />
              <p className="mt-2 text-[12px] text-[#8e8175]">{t('guide.welcome.nameNote')}</p>
            </div>
            <SegmentedTabs
              kind="radio"
              size="sm"
              label={t('general.language')}
              value={languageChoice}
              onChange={setLanguageChoice}
              tabs={[
                { id: 'auto', label: t('general.language.auto') },
                ...LANGUAGES.map((l) => ({ id: l.id, label: l.name }))
              ]}
            />
          </div>
        )}

        {id === 'listen' && (
          <div className="mx-auto flex max-w-[560px] flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {['Spotify', 'Apple Music', 'YouTube Music', 'TIDAL', 'Browser'].map((name, i) => (
                <motion.span
                  key={name}
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-[#e8dccd] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14)]"
                  initial={{ opacity: 0, y: reduce ? 0 : 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: reduce ? 0 : 0.55 + i * 0.08 }}
                >
                  {name}
                </motion.span>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[#a99c8f]">
              <span className="flex items-center gap-1.5">
                <Key>Space</Key> {t('guide.follow.play')}
              </span>
              <span className="flex items-center gap-1.5">
                <Key>Shift</Key>
                <Key>← →</Key> {t('guide.follow.skip')}
              </span>
              <span className="flex items-center gap-1.5">
                <Key>M</Key> {t('guide.follow.mute')}
              </span>
            </div>
          </div>
        )}

        {id === 'ready' && (
          <div className="mx-auto flex max-w-[460px] flex-col items-center gap-5">
            <div className="flex w-full flex-col items-center">
              <span className={FIELD_LABEL}>
                {t('guide.turntable.record')} · {VINYL_PRESSINGS[vinylColor].name}
              </span>
              <div
                role="radiogroup"
                aria-label={t('guide.turntable.record')}
                className="flex flex-wrap items-center justify-center gap-2.5"
              >
                {VINYL_COLORS.map((color) => {
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
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full outline-none transition-[transform,box-shadow] active:scale-95 focus-visible:ring-2 focus-visible:ring-tone/70',
                        selected
                          ? SELECTED_RING
                          : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] hover:scale-105'
                      )}
                      style={{ background: pressingSwatch(color) }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[#d9cdb8]" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex w-full items-center justify-between gap-4 rounded-xl bg-white/[0.05] px-4 py-3 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
              <span className="text-[13.5px] text-[#cfc5ba]">{t('guide.run.lyrics')}</span>
              <HardwareSwitch
                checked={screensaverLyrics}
                onChange={setScreensaverLyrics}
                aria-label={t('guide.run.lyrics')}
              />
            </div>
          </div>
        )}
      </motion.div>
    </>
  )
}

/** A stop's live control: try the feature right where it is being shown. */
function StopExtra({ kind }: { kind: 'rooms' | 'light' | 'lid' }): React.JSX.Element {
  const t = useT()
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const ambientMotion = usePlayerStore((s) => s.ambientMotion)
  const setAmbientMotion = usePlayerStore((s) => s.setAmbientMotion)
  const soundLight = useFeaturesStore((s) => s.soundLight)
  const setSoundLight = useFeaturesStore((s) => s.setSoundLight)
  const lidClosed = useLidStore((s) => s.closed)
  const setLid = useLidStore((s) => s.setClosed)

  if (kind === 'lid') {
    return (
      <button
        type="button"
        data-testid="guide-try-lid"
        onClick={() => setLid(!lidClosed)}
        className="mt-4 flex h-9 w-full items-center justify-center gap-2 rounded-full bg-white/[0.07] text-[12.5px] font-medium text-[#f5efe6] shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.14)] outline-none transition-colors hover:bg-white/[0.11] focus-visible:ring-2 focus-visible:ring-tone/70"
      >
        <Layers className="h-4 w-4" aria-hidden="true" />
        {lidClosed ? t('tour.lid.lift') : t('tour.lid.try')}
      </button>
    )
  }

  if (kind === 'light') {
    return (
      <div className="mt-3 divide-y divide-white/[0.06] rounded-xl bg-white/[0.04] px-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
        <label className="flex items-center justify-between gap-3 py-2.5 text-[13px] text-[#e8dccd]">
          {t('turntable.moving')}
          <HardwareSwitch
            checked={ambientMotion && theme === 'adaptive'}
            onChange={(on) => {
              if (on && theme !== 'adaptive') setTheme('adaptive')
              setAmbientMotion(on)
            }}
            aria-label={t('turntable.moving')}
          />
        </label>
        <label className="flex items-center justify-between gap-3 py-2.5 text-[13px] text-[#e8dccd]">
          {t('turntable.soundLight')}
          <HardwareSwitch
            checked={soundLight}
            onChange={setSoundLight}
            aria-label={t('turntable.soundLight')}
          />
        </label>
      </div>
    )
  }

  const rooms = LISTENING_ENVIRONMENTS.filter((env) => env.id !== 'adaptive')
  return (
    <div
      role="radiogroup"
      aria-label={t('guide.turntable.rooms')}
      className="mt-3 grid grid-cols-4 gap-1.5"
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'adaptive'}
        onClick={() => setTheme('adaptive')}
        className={cn(
          'col-span-4 flex h-9 items-center justify-center gap-2 rounded-xl bg-white/[0.05] text-[12.5px] font-medium text-[#f7f1e8] outline-none transition-[background-color,box-shadow] focus-visible:ring-2 focus-visible:ring-tone/70',
          theme === 'adaptive' ? cn('bg-white/[0.09]', SELECTED_RING) : 'hover:bg-white/[0.08]'
        )}
      >
        <WandSparkles className="h-3.5 w-3.5 text-tone" aria-hidden="true" />
        {t('guide.turntable.match')}
      </button>
      {rooms.map((env) => (
        <button
          key={env.id}
          type="button"
          role="radio"
          aria-checked={env.id === theme}
          aria-label={env.name}
          title={env.name}
          onClick={() => setTheme(env.id)}
          className={cn(
            'h-9 overflow-hidden rounded-[10px] outline-none transition-[box-shadow,transform] focus-visible:ring-2 focus-visible:ring-tone/70 active:scale-95',
            env.id === theme
              ? SELECTED_RING
              : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] hover:brightness-110'
          )}
        >
          <img src={env.image} alt="" draggable={false} className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  )
}
