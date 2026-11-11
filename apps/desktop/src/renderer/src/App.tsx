import { useAlbumSides } from './features/sides/useAlbumSides'
import { useSoundCapture } from './features/sound/useSoundCapture'
import React, { Suspense, lazy, useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { useMoreContrast, useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { VinylEngine } from './features/vinyl'
import albumPlaceholder from './media/placeholder-album.png'
import { AppLayout, ContentArea, Sidebar, CompactTopBar } from './components/layout'
import { WindowControls } from './components/layout/WindowControls'
import { LIGHT_SOURCE_ATTR, useLightSource } from './features/background/lightSource'
import { useLayoutMode } from './hooks/useLayoutMode'
import { Background } from './features/background'
import { MetadataPanel } from './features/now-playing'
import { TurntableEngine } from './features/turntable'
import { ControlDock } from './features/controls'
import { TooltipLayer } from './features/tooltip/TooltipLayer'
import { NowPlayingAnnouncer } from './features/now-playing/NowPlayingAnnouncer'
import { SyncedLyrics } from './features/lyrics'
import { SettingsModal } from './features/settings'
import { OnboardingModal } from './features/onboarding'
import { KeyboardHelpOverlay } from './features/keyboard/KeyboardHelpOverlay'
import { usePlayerStore } from './stores/playerStore'
import { useAudioPlayback } from './hooks/useAudioPlayback'
import { useSystemMediaSync } from './hooks/useSystemMediaSync'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useJumpList } from './hooks/useJumpList'
import { useTrackToast } from './hooks/useTrackToast'
import { useMinWidth } from './hooks/useMinWidth'
import { useDesktopLyricsFeed } from './features/desktop-lyrics/useDesktopLyricsFeed'
import { usePhoneRemote } from './features/remote/usePhoneRemote'
import { useSleepClock } from './hooks/useSleepClock'
import { RoomNoticeCard, useClosingTime, useListeningSession } from './features/session'
import { PressedView, usePressedReady } from './features/wrap'
import { RecordShelfView } from './features/shelf/RecordShelfView'
import { MiniPlayerView, useMiniMovingLight } from './features/mini-player'
import { cn } from './utils/cn'
import { DUR, EASE_EXIT, EASE_OUT } from './utils/motion'
import { useAdaptiveColor } from './hooks/useAdaptiveColor'
import { useShelfStore } from './stores/shelfStore'
import { ShareExportMount } from './features/share/ShareExportMount'
import { ListeningRoom } from './features/listening-room'
import { ListeningDisplay } from './features/listening-room/ListeningDisplay'
import { PartyOverlay } from './features/listening-room/PartyOverlay'
import { StartupExperience } from './features/startup/StartupExperience'
import { holdForOpening } from './features/startup/openingGate'
import { GrowthPrompts } from './features/growth/GrowthPrompts'
import { NewInKissaPrompt } from './features/onboarding/NewInKissaPrompt'
import { useStudyEngine } from './features/study/useStudyEngine'
// The Focus Room is its own chunk: it is not parsed at start-up, only when it is first opened.
/**
 * Deck, Lyrics and Shelf overlap as they change: the old page leaves quickly while the new one
 * arrives, so the stage is never empty (was 0.28 s out, then 0.28 s in). The leaving page lets
 * clicks through and sits beneath the arriving one.
 */
const PAGE_MOTION = {
  initial: { opacity: 0, scale: 0.985, zIndex: 1 },
  animate: { opacity: 1, scale: 1, zIndex: 1, pointerEvents: 'auto' as const, transition: { duration: DUR.pageIn, ease: EASE_OUT, delay: 0.04 } },
  exit: { opacity: 0, scale: 1, zIndex: 0, pointerEvents: 'none' as const, transition: { duration: DUR.pageOut, ease: EASE_EXIT } }
}
const StudyRoom = lazy(() => import('./features/study/StudyRoom').then((m) => ({ default: m.StudyRoom })))
import { EditionEditor } from './features/editions/EditionEditor'
import { useEditionsStore } from './stores/editionsStore'
import { tl } from '@renderer/i18n'

function KissaApp(): React.JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const activeView = usePlayerStore((s) => s.activeView)
  const isEditionEditorOpen = useEditionsStore((s) => s.isEditorOpen)
  const reduceMotion = useReducedMotion()
  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)
  const isMiniPlayer = usePlayerStore((s) => s.isMiniPlayer)
  const miniMovingLight = useMiniMovingLight()
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)
  const isListeningDisplay = usePlayerStore((s) => s.isListeningDisplay)
  const isPartyMode = usePlayerStore((s) => s.isPartyMode)
  const theme = usePlayerStore((s) => s.theme)
  const { compact, short } = useLayoutMode()
  // The side lyrics card needs this width (min-[1100px] in its classes); narrower, Lyrics opens the Lyrics view.
  const wideDeck = useMinWidth(1100)
  const lyricsDeck = showSideLyrics && wideDeck
  const deckStageRef = useRef<HTMLDivElement>(null)
  const instrumentRef = useRef<HTMLElement>(null)




  const isScreensaver = usePlayerStore((s) => s.isScreensaver)
  const setIsScreensaver = usePlayerStore((s) => s.setIsScreensaver)
  const [isScreensaverReady, setIsScreensaverReady] = useState<boolean>(false)
  const [hasStarted, setHasStarted] = useState<boolean>(false)
  // Start-up timeline (main/startupTiming.ts): the room's first render, and its first frame once
  // the opening has gone.
  useEffect(() => {
    window.electron?.startupMark?.('first-render')
  }, [])
  // Work that would stall the opening's frames (the system-audio capture) waits until the opening
  // and the room's arrival have played (openingGate.ts). Held from the first render, before the
  // room's own effects run; the screensaver has no opening and opens it at once.
  const [openOpeningGate] = useState(holdForOpening)
  const finishOpening = useCallback(() => {
    setHasStarted(true)
    window.setTimeout(openOpeningGate, 1700)
  }, [openOpeningGate])
  useEffect(() => {
    if (isScreensaverReady && isScreensaver) openOpeningGate()
  }, [isScreensaverReady, isScreensaver, openOpeningGate])
  useEffect(() => {
    if (!hasStarted) return
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => window.electron?.startupMark?.('interactive'))
    })
    return () => cancelAnimationFrame(raf)
  }, [hasStarted])

  const alignmentObserver = useRef<ResizeObserver | null>(null)
  // Moving light gathers around the record: the deck's turntable or the Lyrics page's record.
  useLightSource(
    isFullscreen || isPartyMode || isMiniPlayer
      ? null
      : activeView === 'deck'
        ? () => instrumentRef.current
        : activeView === 'lyrics'
          ? () => document.querySelector<HTMLElement>(`[${LIGHT_SOURCE_ATTR}]`)
          : null,
    `${activeView}|${isFullscreen}|${isPartyMode}|${isMiniPlayer}|${lyricsDeck}`
  )
  const alignLyrics = useRef<() => void>(() => {})
  // The stage mounts after the opening/screensaver check, so its ref records it and the
  // effect below measures. (framer-motion keeps the first ref callback it is given, so a ref
  // callback that changes with lyricsDeck never ran when lyrics were switched on later.)
  const [deckStage, setDeckStage] = useState<HTMLDivElement | null>(null)
  const registerDeckStage = useCallback((stage: HTMLDivElement | null): void => {
    deckStageRef.current = stage
    setDeckStage(stage)
  }, [])

  // Lyrics beside the deck: line the column up with the turntable's top and bottom edges, and
  // measure again when the entrance finishes or the instrument resizes.
  useEffect(() => {
    alignmentObserver.current?.disconnect()
    alignLyrics.current = () => {}
    const stage = deckStage
    const instrument = instrumentRef.current
    if (!stage || !instrument || !lyricsDeck) return
    const align = (): void => {
      const plinth = instrument.querySelector('[data-deck-plinth]')
      if (!plinth) return
      const p = plinth.getBoundingClientRect()
      const s = stage.getBoundingClientRect()
      stage.style.setProperty('--lyrics-top', `${Math.max(48, p.top - s.top)}px`)
      stage.style.setProperty('--lyrics-bottom', `${Math.max(24, s.bottom - p.bottom)}px`)
    }
    alignLyrics.current = align
    const observer = new ResizeObserver(align)
    observer.observe(instrument)
    alignmentObserver.current = observer
    align()
    return () => observer.disconnect()
  }, [deckStage, lyricsDeck])

  // Real audio playback engine (handles audio elements, time sync, seeking & volume)
  useAudioPlayback()

  useSystemMediaSync()

  useKeyboardShortcuts()

  useJumpList()

  useTrackToast()
  useDesktopLyricsFeed()
  usePhoneRemote()

  useSleepClock()

  useListeningSession()
  usePressedReady()

  useClosingTime()
  useSoundCapture()
  useAlbumSides()

  useAdaptiveColor()

  // The study session clock runs whichever view is open.
  useStudyEngine()

  const addOrUpdateRecord = useShelfStore((s) => s.addOrUpdateRecord)
  const repairArtwork = useShelfStore((s) => s.repairArtwork)
  const recordingKey = currentTrack
    ? JSON.stringify([
        currentTrack.title,
        currentTrack.artist,
        currentTrack.album,
        currentTrack.sourceAppId
      ])
    : ''

  useEffect(() => {
    if (currentTrack && currentTrack.album && currentTrack.artist) {
      addOrUpdateRecord(currentTrack)
    }
    // Progress, duration and artwork updates are the same listen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingKey, addOrUpdateRecord])

  useEffect(() => {
    if (currentTrack) repairArtwork(currentTrack)
  }, [currentTrack, repairArtwork])

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const state = usePlayerStore.getState()
      ;(window as any).electron.syncSettings({ runInBackground: state.runInBackground })
      ;(window as any).electron.setStartup(state.startWithWindows)
      ;(window as any).electron.isScreensaver().then((active: boolean) => {
        setIsScreensaver(Boolean(active))
        setIsScreensaverReady(true)
      })
    } else {
      setIsScreensaver(false)
      setIsScreensaverReady(true)
    }
  }, [])

  // BrowserWindow fullscreen events are authoritative. Update state directly so
  // an OS-driven transition never re-enters the renderer-to-main IPC path.
  useEffect(() => {
    if (!window.electron?.onFullscreenChanged) return

    return window.electron.onFullscreenChanged((isFullscreen) => {
      usePlayerStore.setState((state) =>
        state.isFullscreen === isFullscreen
          ? state
          : isFullscreen
            ? { isFullscreen }
            : { isFullscreen, isPartyMode: false }
      )
    })
  }, [])

  useEffect(() => {
    if (!window.electron?.onScreensaverModeChanged) return

    return window.electron.onScreensaverModeChanged((active) => {
      setIsScreensaver(active)
    })
  }, [])

  if (!isScreensaverReady) {
    return <></>
  }

  return (
    <AppLayout className={cn(isScreensaver && 'fixed inset-0 w-screen h-screen overflow-hidden')}>
      <Background />

      <AnimatePresence>
        {isScreensaver ? (
          <ListeningDisplay key="screensaver" mode="screensaver" />
        ) : isMiniPlayer ? (
          <motion.div
            key="mini-player"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            // With Moving light the mini panel lets the background layer's colour through.
            className={cn('absolute inset-0 z-50', !miniMovingLight && 'bg-[var(--panel-bg)]')}
          >
            <MiniPlayerView />
          </motion.div>
        ) : isListeningDisplay ? (
          <ListeningDisplay key="listening-display" mode="interactive" />
        ) : activeView === 'study' ? (
          <Suspense key="study-room" fallback={null}>
            <StudyRoom />
          </Suspense>
        ) : isFullscreen && !isPartyMode ? (
          <ListeningRoom key="listening-room" />
        ) : (
          <motion.div
            key="normal-app"
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 z-0 flex flex-col min-w-0 overflow-hidden"
          >
            {!isPartyMode && (
              <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 pointer-events-auto" />
            )}

            {compact && !isPartyMode && <CompactTopBar />}

            <div className="flex flex-1 min-h-0 relative w-full">
              {!isPartyMode && <Sidebar className="kissa-arrive-side" />}

              <ContentArea>
                <div className="kissa-arrive-stage relative flex-1 min-h-0 w-full overflow-hidden">
                  <AnimatePresence>
                    {activeView === 'deck' && (
                      /* Vinyl deck and listening room */
                      <motion.div
                        key="deck-view"
                        data-page="deck"
                        ref={registerDeckStage}
                        onAnimationComplete={() => alignLyrics.current()}
                        {...PAGE_MOTION}
                        className={cn(
                          'absolute inset-0 min-h-0 overflow-hidden transform-gpu',
                          lyricsDeck && 'deck-lyrics-open',
                          !compact &&
                            (isPartyMode && !showSideLyrics
                              ? // One centred group: the words, a gutter, the deck, all scaled to the screen.
                                'grid grid-cols-[minmax(0,clamp(24rem,44vh,64rem))_auto] justify-center'
                              : showSideLyrics
                              ? // Wide windows move the track details into the lyrics card.
                                'grid grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.4fr)] min-[1100px]:grid-cols-[minmax(0,1fr)_clamp(380px,30vw,760px)]'
                              : 'grid grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(340px,1.5fr)] min-[1200px]:grid-cols-[minmax(320px,1fr)_minmax(400px,1.7fr)]'),
                          // Narrow window: the instrument first, the words beneath it. When the
                          // turntable editor is open it takes the lower part and the deck stays
                          // in view above as its live preview.
                          compact && !short && 'flex flex-col',
                          // Narrow and short: the instrument beside the words.
                          compact && short && 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center',
                          // Party mode, for a TV across the room: one centred group with even outer
                          // margins and a gutter of the same size (7% of the width), centred
                          // vertically. The controls are overlays shown only when the pointer moves.
                          isPartyMode &&
                            'items-center gap-x-[7vw] px-[7vw] pt-[7vh] pb-[9vh]'
                        )}
                      >

                        <motion.aside
                          aria-hidden={lyricsDeck || undefined}
                          inert={lyricsDeck || undefined}
                          initial={false}
                          animate={{ opacity: lyricsDeck ? 0 : 1, x: reduceMotion ? 0 : lyricsDeck ? -16 : 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className={cn(
                            // Safe centring: when the details are taller than the column they start at the top and
                            // scroll, instead of overflowing above it (which cut the cover off).
                            'deck-details min-h-0 flex flex-col [justify-content:safe_center] overflow-y-auto no-scrollbar transform-gpu',
                            compact && 'order-2 mx-auto w-full max-w-[600px]',
                            compact && !short && (isEditionEditorOpen ? 'flex-1 justify-start' : 'shrink-0'),
                            compact && short && 'h-full'
                          )}
                        >
                          {/*
                            A short slide and fade between the track details and the editor:
                            transform and opacity only, once per open or close, so it costs
                            nothing while the record turns. Reduced motion keeps only the fade.
                          */}
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                              key={isEditionEditorOpen ? 'edition' : 'metadata'}
                              initial={{ opacity: 0, x: reduceMotion ? 0 : -14 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: reduceMotion ? 0 : -10 }}
                              transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                              className="flex min-h-0 flex-col [justify-content:safe_center]"
                            >
                              {isEditionEditorOpen ? (
                                <EditionEditor />
                              ) : (
                                <MetadataPanel compact={compact} stage={isPartyMode && !compact} />
                              )}
                            </motion.div>
                          </AnimatePresence>
                        </motion.aside>

                        <section
                          ref={instrumentRef}
                          className={cn(
                            // A right margin to match the left, so the deck never runs to the window edge.
                            'deck-instrument min-h-0 flex items-center justify-center p-2 min-[900px]:p-4 min-[900px]:pr-10 overflow-hidden transform-gpu',
                            compact && 'order-1 flex-1 px-5 pt-1 pb-0 [container-type:size]',
                            // With the editor open the deck becomes a preview band, so the panel gets the height.
                            compact && !short && isEditionEditorOpen && 'flex-none basis-[26%]',
                            compact && short && 'h-full pl-4 pr-0 py-3',
                            // The deck's right edge sits on the stage margin, under the top-right controls.
                            isPartyMode && 'p-0 min-[900px]:p-0 overflow-visible'
                          )}
                        >
                          <div
                            className={cn(
                              'w-full flex items-center justify-center',
                              isPartyMode && showSideLyrics && 'justify-end'
                            )}
                          >
                            {/* In a narrow window the deck is fitted to both the width and the height it has. */}
                            <TurntableEngine
                              className={
                                compact
                                  ? 'max-w-[min(840px,100cqw,calc(100cqh*10/7*0.92))]'
                                  : isPartyMode
                                    ? // As big as the stage allows: its height (the deck is 10:7), or the width left beside the words.
                                      showSideLyrics
                                      ? 'max-w-[calc(76vh*10/7*0.94)]'
                                      : 'w-[min(calc(76vh*10/7*0.94),calc(100vw-21vw-clamp(24rem,44vh,64rem)))] max-w-none'
                                    : undefined
                              }
                            />
                          </div>
                        </section>

                        {showSideLyrics && !compact && (
                          <motion.div
                            initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                            // No box: the words sit on the room itself. The header lines up with the
                            // turntable's top edge (--lyrics-top, measured from the plinth); the words
                            // use the height below it and fade out softly.
                            className={cn(
                              'deck-lyrics-card hidden min-[1100px]:flex flex-col min-h-0',
                              // Party mode has its own controls along the top and a transport pill at the
                              // bottom: the words (and their "..." and close buttons) sit between them.
                              isPartyMode && 'self-stretch !mt-0 !mb-0 !pt-[clamp(100px,10vh,160px)] !pb-[clamp(100px,12vh,180px)]'
                            )}
                          >
                            <div className="relative flex-1 min-h-0 overflow-hidden">
                              <SyncedLyrics
                                variant="panel"
                                onClose={toggleSideLyrics}
                                closeLabel={tl('a11y.closeSideLyrics')}
                                header={
                                  // Sits on the turntable's top edge, so the deck and the words read as one spread.
                                  <div className="min-w-0 pl-3.5">
                                    <h2 className="truncate font-kissa-editorial text-[clamp(1.125rem,1.25vw,1.375rem)] leading-[1.15] tracking-[-0.01em] text-ink/90">
                                      {currentTrack?.title || tl('nav.lyrics')}
                                    </h2>
                                    {currentTrack?.artist && (
                                      <p className="mt-0.5 truncate text-[12.5px] leading-snug text-dim">{currentTrack.artist}</p>
                                    )}
                                  </div>
                                }
                              />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {activeView === 'lyrics' && (
                      /* Immersive lyrics view */
                      <motion.div
                        key="lyrics-view"
                        data-page="lyrics"
                        {...PAGE_MOTION}
                        // The words at a readable measure and the record beside them, centred as one group,
                        // so the options button and the record sit by the text rather than across a void.
                        className="absolute inset-0 grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,56rem)_minmax(260px,24rem)] min-[900px]:justify-center min-[900px]:gap-x-[clamp(24px,4vw,96px)] overflow-hidden transform-gpu"
                      >
                        <div className="relative h-full min-h-0 flex flex-col px-4 min-[900px]:px-10 py-6 min-[900px]:py-8">
                          <SyncedLyrics isLargeView />
                        </div>
                        <div className="hidden min-[900px]:flex flex-col items-center justify-center py-8">
                          <div data-light-source="" className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                            {/* A still shadow under the record: a drop-shadow filter on the spinning
                                record was redrawn on every frame of the spin. */}
                            <span aria-hidden="true" className="pointer-events-none absolute inset-[1.5%] rounded-full shadow-[0_30px_40px_rgba(0,0,0,0.5)]" />
                            <VinylEngine
                              albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
                              className="w-full h-full"
                            />
                          </div>

                          <div className="mt-[calc(2rem-0.14em)] w-full px-4 text-center">
                            <h2
                              className="px-[0.2em] pt-[0.14em] font-kissa-editorial text-[1.75rem] font-medium leading-[1.1] line-clamp-2 text-balance tracking-[-0.025em] text-ink"
                              title={currentTrack?.title}
                            >
                              {currentTrack?.title ?? '—'}
                            </h2>
                            <p className="mt-1.5 text-[15px] font-medium tracking-[-0.01em] line-clamp-1 text-ink/80">
                              {currentTrack?.artist ?? '—'}
                            </p>
                            {currentTrack?.album && currentTrack.album !== currentTrack.title && (
                              <p className="mt-0.5 text-[13px] line-clamp-1 text-dim">
                                {currentTrack.album}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeView === 'shelf' && (
                      /* Record shelf */
                      <motion.div
                        key="shelf-view"
                        data-page="shelf"
                        {...PAGE_MOTION}
                        className="absolute inset-0 z-10"
                      >
                        <RecordShelfView />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ContentArea>
            </div>

            {isPartyMode ? <PartyOverlay /> : <ControlDock className="kissa-arrive-dock" />}
          </motion.div>
        )}
      </AnimatePresence>
      {/* The app's one tooltip: replaces the stock Windows tooltips from title attributes. */}
      {!isScreensaver && !isMiniPlayer && !isFullscreen && !isPartyMode && <WindowControls />}
      {!isScreensaver && <TooltipLayer />}
      {!isScreensaver && <NowPlayingAnnouncer />}
      {!isScreensaver && <SettingsModal />}

      {!isScreensaver && <OnboardingModal />}

      {!isScreensaver && <KeyboardHelpOverlay />}
      {!isScreensaver && !isMiniPlayer && <PressedView />}

      {hasStarted && !isScreensaver && <GrowthPrompts />}
      {hasStarted && !isScreensaver && !isMiniPlayer && <NewInKissaPrompt />}

      {hasStarted && !isScreensaver && !isMiniPlayer && <RoomNoticeCard />}

      {!hasStarted && isScreensaver === false && <StartupExperience onComplete={finishOpening} />}

    </AppLayout>
  )
}

export default function App(): React.JSX.Element {
  const isShareExport = window.location.hash.startsWith('#/share-export')
  if (isShareExport) {
    return <ShareExportMount />
  }
  return <ComfortRoot />
}

/**
 * Comfort settings for the whole app. Reduce motion (Settings > General > Comfort, or Windows'
 * "Animation effects" off): every framer animation drops its movement and keeps only fades, and
 * CSS follows data-reduce-motion. More contrast (the switch, or Windows asking for it):
 * data-contrast="more" on <html> (main.css).
 */
function ComfortRoot(): React.JSX.Element {
  const reduced = useReducedMotion()
  const moreContrast = useMoreContrast()
  useEffect(() => {
    document.documentElement.toggleAttribute('data-reduce-motion', reduced)
  }, [reduced])
  useEffect(() => {
    if (moreContrast) document.documentElement.dataset.contrast = 'more'
    else delete document.documentElement.dataset.contrast
  }, [moreContrast])
  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
      <KissaApp />
    </MotionConfig>
  )
}
