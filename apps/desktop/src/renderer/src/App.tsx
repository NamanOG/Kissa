import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { VinylEngine } from './features/vinyl'
import albumPlaceholder from './media/placeholder-album.png'
import { AppLayout, ContentArea, Sidebar } from './components/layout'
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
import { RecordShelfView } from './features/shelf/RecordShelfView'
import { MiniPlayerView } from './features/mini-player'
import { cn } from './utils/cn'
import { useAdaptiveColor } from './hooks/useAdaptiveColor'
import { useShelfStore } from './stores/shelfStore'
import { ShareExportMount } from './features/share/ShareExportMount'
import { ListeningRoom } from './features/listening-room'
import { ListeningDisplay } from './features/listening-room/ListeningDisplay'
import { StartupExperience } from './features/startup/StartupExperience'

function KissaApp(): React.JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const activeView = usePlayerStore((s) => s.activeView)
  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)
  const isMiniPlayer = usePlayerStore((s) => s.isMiniPlayer)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)
  const isListeningDisplay = usePlayerStore((s) => s.isListeningDisplay)
  const theme = usePlayerStore((s) => s.theme)
  
  const isScreensaver = usePlayerStore((s) => s.isScreensaver)
  const setIsScreensaver = usePlayerStore((s) => s.setIsScreensaver)
  const [isScreensaverReady, setIsScreensaverReady] = useState<boolean>(false)
  const [hasStarted, setHasStarted] = useState<boolean>(false)

  // Real audio playback engine (handles audio elements, time sync, seeking & volume)
  useAudioPlayback()

  useSystemMediaSync()

  useKeyboardShortcuts()

  useAdaptiveColor()

  const addOrUpdateRecord = useShelfStore((s) => s.addOrUpdateRecord)
  
  useEffect(() => {
    if (currentTrack && currentTrack.album && currentTrack.artist) {
      addOrUpdateRecord(currentTrack)
    }
  }, [currentTrack, addOrUpdateRecord])

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
        state.isFullscreen === isFullscreen ? state : { isFullscreen }
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
            className="absolute inset-0 z-50 bg-[var(--panel-bg)]"
          >
            <MiniPlayerView />
          </motion.div>
        ) : isListeningDisplay ? (
          <ListeningDisplay key="listening-display" mode="interactive" />
        ) : isFullscreen ? (
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
            <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 pointer-events-auto" />

            <div className="flex flex-1 min-h-0 relative w-full">
              <Sidebar />

              <ContentArea>
              <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'deck' && (
            /* Vinyl deck and listening room */
            <motion.div
              key="deck-view"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'absolute inset-0 grid min-h-0 overflow-hidden transform-gpu',
                showSideLyrics
                  ? 'grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(320px,1.4fr)] min-[1100px]:grid-cols-[minmax(260px,0.8fr)_minmax(320px,1.4fr)_minmax(260px,0.8fr)]'
                  : 'grid-cols-1 min-[900px]:grid-cols-[minmax(280px,0.9fr)_minmax(340px,1.5fr)] min-[1200px]:grid-cols-[minmax(320px,1fr)_minmax(400px,1.7fr)]'
              )}
            >
              <aside className="min-h-0 flex flex-col justify-center overflow-y-auto no-scrollbar transform-gpu">
                <MetadataPanel />
              </aside>

              <section className="min-h-0 flex items-center justify-center p-2 min-[900px]:p-4 overflow-hidden transform-gpu">
                <div className="w-full flex items-center justify-center">
                  <TurntableEngine />
                </div>
              </section>

              {showSideLyrics && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden min-[1100px]:flex flex-col min-h-0 px-6 py-6 mt-10 mb-2 mr-4 rounded-[36px] border border-panel-line bg-[var(--panel-bg)] shadow-[var(--panel-shadow)]"
                >
                  <div className="flex items-center justify-between pb-3 shrink-0 border-b border-panel-line">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] font-bold text-dim">
                      SIDE LYRICS
                    </span>
                    <button
                      type="button"
                      onClick={toggleSideLyrics}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-ui ease-primary cursor-pointer text-dim hover:text-ink hover:bg-ink/[0.08]"
                      title="Close Side Lyrics"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="relative flex-1 min-h-0">
                    <SyncedLyrics />
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
              <div
                className="hidden min-[900px]:flex flex-col items-center justify-center p-8 mt-10 mb-2 mr-4 rounded-[36px] border border-panel-line bg-[var(--panel-bg)] shadow-[var(--panel-shadow)]"
              >
                <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                  <VinylEngine
                    albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
                    className="w-full h-full drop-shadow-[0_16px_26px_rgba(14,9,7,0.3)]"
                  />
                </div>

                <div className="mt-8 w-full px-4 text-center">
                  <h2
                    className="font-serif text-2xl font-medium line-clamp-1 tracking-tight text-ink"
                    title={currentTrack?.title}
                  >
                    {currentTrack?.title ?? '—'}
                  </h2>
                  <p className="mt-1 text-sm line-clamp-1 text-dim">{currentTrack?.artist ?? '—'}</p>
                  {currentTrack?.album && currentTrack.album !== currentTrack.title && (
                    <p className="mt-0.5 text-xs line-clamp-1 text-dim opacity-80">{currentTrack.album}</p>
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

          <ControlDock />
        </motion.div>
      )}
      </AnimatePresence>
      {!isScreensaver && <SettingsModal />}

      {!isScreensaver && <OnboardingModal />}

      {!isScreensaver && <KeyboardHelpOverlay />}

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
  return <KissaApp />
}
