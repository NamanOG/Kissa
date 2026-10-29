import { useAlbumSides } from './features/sides/useAlbumSides'
import { useSoundCapture } from './features/sound/useSoundCapture'
import React, { useEffect, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { VinylEngine } from './features/vinyl'
import albumPlaceholder from './media/placeholder-album.png'
import { AppLayout, ContentArea, Sidebar, CompactTopBar } from './components/layout'
import { useLayoutMode } from './hooks/useLayoutMode'
import { Background } from './features/background'
import { MetadataPanel } from './features/now-playing'
import { TurntableEngine } from './features/turntable'
import { ControlDock } from './features/controls'
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
import { usePhoneRemote } from './features/remote/usePhoneRemote'
import { useSleepClock } from './hooks/useSleepClock'
import { RoomNoticeCard, useClosingTime, useListeningSession } from './features/session'
import { PressedView, usePressedReady } from './features/wrap'
import { RecordShelfView } from './features/shelf/RecordShelfView'
import { MiniPlayerView, useMiniMovingLight } from './features/mini-player'
import { cn } from './utils/cn'
import { useAdaptiveColor } from './hooks/useAdaptiveColor'
import { useShelfStore } from './stores/shelfStore'
import { ShareExportMount } from './features/share/ShareExportMount'
import { ListeningRoom } from './features/listening-room'
import { ListeningDisplay } from './features/listening-room/ListeningDisplay'
import { PartyOverlay } from './features/listening-room/PartyOverlay'
import { StartupExperience } from './features/startup/StartupExperience'
import { GrowthPrompts } from './features/growth/GrowthPrompts'
import { NewInKissaPrompt } from './features/onboarding/NewInKissaPrompt'
import { StudyRoom, useStudyEngine } from './features/study'
import { EditionEditor } from './features/editions/EditionEditor'
import { SupportKissaLink } from './features/support/SupportKissaLink'
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
  const [wideDeck, setWideDeck] = useState(() => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(min-width: 1100px)').matches)
  const lyricsDeck = showSideLyrics && wideDeck
  const deckStageRef = useRef<HTMLDivElement>(null)
  const instrumentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(min-width: 1100px)')
    const update = (): void => setWideDeck(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])



  const isScreensaver = usePlayerStore((s) => s.isScreensaver)
  const setIsScreensaver = usePlayerStore((s) => s.setIsScreensaver)
  const [isScreensaverReady, setIsScreensaverReady] = useState<boolean>(false)
  const [hasStarted, setHasStarted] = useState<boolean>(false)

  const alignmentObserver = useRef<ResizeObserver | null>(null)
  const alignLyrics = useRef<() => void>(() => {})
  // The stage mounts after the opening/screensaver check. Register on its actual
  // mount, then remeasure when the entrance finishes or the instrument resizes.
  const registerDeckStage = useCallback((stage: HTMLDivElement | null): void => {
    alignmentObserver.current?.disconnect()
    deckStageRef.current = stage
    alignLyrics.current = () => {}
    const instrument = instrumentRef.current
    if (!stage || !instrument || !lyricsDeck) return
    const align = (): void => {
      const plinth = instrument.querySelector('[data-deck-plinth]')
      if (!plinth) return
      stage.style.setProperty('--lyrics-top', `${Math.max(104, plinth.getBoundingClientRect().top - stage.getBoundingClientRect().top)}px`)
    }
    alignLyrics.current = align
    alignmentObserver.current = new ResizeObserver(align)
    alignmentObserver.current.observe(instrument)
    align()
  }, [lyricsDeck])

  // Real audio playback engine (handles audio elements, time sync, seeking & volume)
  useAudioPlayback()

  useSystemMediaSync()

  useKeyboardShortcuts()

  useJumpList()

  useTrackToast()
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
          <StudyRoom key="study-room" />
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
                  <AnimatePresence mode="wait">
                    {activeView === 'deck' && (
                      /* Vinyl deck and listening room */
                      <motion.div
                        key="deck-view"
                        ref={registerDeckStage}
                        onAnimationComplete={() => alignLyrics.current()}
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          'absolute inset-0 min-h-0 overflow-hidden transform-gpu',
                          lyricsDeck && 'deck-lyrics-open',
                          !compact &&
                            (isPartyMode && !showSideLyrics
                              ? // One centred group: the words, a fixed gutter, the deck.
                                'grid grid-cols-[minmax(0,30rem)_auto] justify-center'
                              : showSideLyrics
                              ? // Wide windows move the track details into the lyrics card.
                                'grid grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.4fr)] min-[1100px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'
                              : 'grid grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(340px,1.5fr)] min-[1200px]:grid-cols-[minmax(320px,1fr)_minmax(400px,1.7fr)]'),
                          // Narrow window: the instrument first, the words beneath it. When the
                          // turntable editor is open it takes the lower part and the deck stays
                          // in view above as its live preview.
                          compact && !short && 'flex flex-col',
                          // Narrow and short: the instrument beside the words.
                          compact && short && 'grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center',
                          // Party mode: one stage with even margins. The side margins match the
                          // full-screen controls (48 px), the top clears their top row and the
                          // bottom their transport bar, and both columns centre on one line.
                          isPartyMode &&
                            'items-center gap-x-[clamp(40px,6vw,120px)] px-12 pt-[124px] pb-[148px]'
                        )}
                      >
                        {/* Quiet and always in the same place; hidden until the support page is live. */}
                        {!compact && !isPartyMode && (
                          <SupportKissaLink className="absolute right-6 top-12 z-20" />
                        )}

                        <motion.aside
                          aria-hidden={lyricsDeck || undefined}
                          inert={lyricsDeck || undefined}
                          initial={false}
                          animate={{ opacity: lyricsDeck ? 0 : 1, x: reduceMotion ? 0 : lyricsDeck ? -16 : 0 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className={cn(
                            'deck-details min-h-0 flex flex-col justify-center overflow-y-auto no-scrollbar transform-gpu',
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
                              className="flex min-h-0 flex-col justify-center"
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
                            'deck-instrument min-h-0 flex items-center justify-center p-2 min-[900px]:p-4 overflow-hidden transform-gpu',
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
                                      ? 'max-w-[min(1180px,calc((100vh-272px)*10/7*0.94))]'
                                      : 'w-[min(1180px,calc((100vh-272px)*10/7*0.94),calc(100vw-30rem-96px-6vw))] max-w-none'
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
                            // Starts below the Support pill (top-12, about 40 px tall) so the pill never sits on the card's close button.
                            className={cn(
                              'deck-lyrics-card hidden min-[1100px]:flex flex-col min-h-0 px-7 pt-6 pb-4 mt-[6.5rem] mb-4 mr-6 rounded-[36px] border border-white/[0.07] kissa-sheet',
                              // Party mode: the stage already sets the margins; the card fills the column height.
                              isPartyMode && 'mt-0 mb-0 mr-0 self-stretch'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3 pb-2 shrink-0">
                              <div className="flex min-w-0 items-center gap-4 pr-3">
                                <img src={currentTrack?.artworkUrl || albumPlaceholder} alt=""
                                  className="h-14 w-14 shrink-0 rounded-xl object-cover min-[1600px]:h-16 min-[1600px]:w-16" />
                                <div className="min-w-0">
                                  <h2 className="font-kissa-editorial text-[clamp(1.25rem,1.45vw,1.75rem)] leading-[1.12] text-ink [overflow-wrap:anywhere]">
                                    {currentTrack?.title || tl('nav.lyrics')}
                                  </h2>
                                  <p className="mt-1.5 text-[13px] leading-snug text-ink/70 [overflow-wrap:anywhere]">
                                    {[currentTrack?.artist, currentTrack?.album].filter(Boolean).join(' · ')}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={toggleSideLyrics}
                                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-ui ease-primary cursor-pointer text-dim hover:text-ink hover:bg-ink/[0.08]"
                                title={tl('a11y.closeSideLyrics')}
                                aria-label={tl('a11y.closeSideLyrics')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="relative flex-1 min-h-0 overflow-hidden">
                              <SyncedLyrics variant="panel" />
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}

                    {activeView === 'lyrics' && (
                      /* Immersive lyrics view */
                      <motion.div
                        key="lyrics-view"
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-0 grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,0.65fr)_minmax(280px,0.35fr)] overflow-hidden transform-gpu"
                      >
                        <div className="relative h-full min-h-0 flex flex-col px-4 min-[900px]:px-10 py-6 min-[900px]:py-8">
                          <SyncedLyrics isLargeView />
                        </div>
                        <div className="hidden min-[900px]:flex flex-col items-center justify-center p-8 mt-10 mb-2 mr-4">
                          <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                            <VinylEngine
                              albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
                              className="w-full h-full drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
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
                        initial={{ opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.985 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
      {!isScreensaver && <SettingsModal />}

      {!isScreensaver && <OnboardingModal />}

      {!isScreensaver && <KeyboardHelpOverlay />}
      {!isScreensaver && !isMiniPlayer && <PressedView />}

      {hasStarted && !isScreensaver && <GrowthPrompts />}
      {hasStarted && !isScreensaver && !isMiniPlayer && <NewInKissaPrompt />}

      {hasStarted && !isScreensaver && !isMiniPlayer && <RoomNoticeCard />}

      {!hasStarted && isScreensaver === false && (
        <StartupExperience onComplete={() => setHasStarted(true)} />
      )}
    </AppLayout>
  )
}

export default function App(): React.JSX.Element {
  const isShareExport = window.location.hash.startsWith('#/share-export')
  if (isShareExport) {
    return <ShareExportMount />
  }
  // Windows' "Animation effects" off (prefers-reduced-motion): every framer animation in the
  // app drops its movement and keeps only fades, not just the views that check it themselves.
  return (
    <MotionConfig reducedMotion="user">
      <KissaApp />
    </MotionConfig>
  )
}
