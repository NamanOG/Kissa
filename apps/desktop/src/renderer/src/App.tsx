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
  
  const [isScreensaver, setIsScreensaver] = useState<boolean | null>(null)
  const [hasStarted, setHasStarted] = useState<boolean>(false)

  // Real audio playback engine (handles audio elements, time sync, seeking & volume)
  useAudioPlayback()

  // Live Windows system media detection (Apple Music, Spotify, etc.)
  useSystemMediaSync()

  // Global Keyboard Shortcuts
  useKeyboardShortcuts()

  // Dynamic Theme Lighting
  useAdaptiveColor()

  // Update Record Shelf listening history
  const addOrUpdateRecord = useShelfStore((s) => s.addOrUpdateRecord)
  
  useEffect(() => {
    if (currentTrack && currentTrack.album && currentTrack.artist) {
      addOrUpdateRecord(currentTrack)
    }
  }, [currentTrack, addOrUpdateRecord])

  // Sync settings with main process on boot
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      const state = usePlayerStore.getState()
      ;(window as any).electron.syncSettings({ runInBackground: state.runInBackground })
      ;(window as any).electron.setStartup(state.startWithWindows)
      ;(window as any).electron.isScreensaver().then(setIsScreensaver)
    } else {
      setIsScreensaver(false)
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

  if (isScreensaver === null) {
    return <></>
  }

  if (isScreensaver) {
    return (
      <AppLayout className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#0f0b07]">
        <Background />
        <ListeningDisplay key="screensaver" mode="screensaver" />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      {/* Fixed atmospheric background */}
      <Background />

      <AnimatePresence mode="wait">
        {isMiniPlayer ? (
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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 z-0 flex flex-col min-w-0 overflow-hidden"
          >
            {/* Invisible drag region for frameless window movement */}
            <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 pointer-events-auto" />

            <div className="flex flex-1 min-h-0 relative w-full overflow-hidden transform-gpu">
              {/* Navigation rail */}
              <Sidebar />

              {/* Main content area */}
              <ContentArea>
              {/* Dynamic Main View Switcher */}
              <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'deck' && (
            /* ═════════ VIEW 1: Vinyl Deck & Listening Room ═════════ */
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
              {/* Left: Metadata & Now Playing Panel */}
              <aside className="min-h-0 flex flex-col justify-center overflow-y-auto no-scrollbar transform-gpu">
                <MetadataPanel />
              </aside>

              {/* Center: Turntable Deck */}
              <section className="min-h-0 flex items-center justify-center p-2 min-[900px]:p-4 overflow-hidden transform-gpu">
                <TurntableEngine />
              </section>

              {/* Optional Side Lyrics Panel (Only shown when user requests) */}
              {showSideLyrics && (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="hidden min-[1100px]:flex flex-col min-h-0 border-l px-5 py-6 transform-gpu border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--panel-shadow)]"
                >
                  <div className="flex items-center justify-between pb-3 shrink-0 border-b border-[var(--panel-border)]">
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] font-bold text-[var(--muted)]">
                      SIDE LYRICS
                    </span>
                    <button
                      type="button"
                      onClick={toggleSideLyrics}
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-ui ease-primary cursor-pointer text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-[var(--on-surface)]/[0.08]"
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
            /* ═════════ VIEW 2: Apple Music Immersive Lyrics View ═════════ */
            <motion.div
              key="lyrics-view"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,0.65fr)_minmax(280px,0.35fr)] overflow-hidden transform-gpu"
            >
              {/* Left/Center: Large Fluid Apple Music Lyrics Stream */}
              <div className="relative h-full min-h-0 flex flex-col px-4 min-[900px]:px-10 py-6 min-[900px]:py-8">
                <SyncedLyrics isLargeView />
              </div>
              {/* Right: Floating Vinyl Album Card Widget */}
              <div
                className="hidden min-[900px]:flex flex-col items-center justify-center p-8 border-l border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--panel-shadow)]"
              >
                {/* Floating Spinning Vinyl */}
                <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                  <div className="absolute inset-4 rounded-full blur-2xl pointer-events-none bg-[var(--accent)]/15" />
                  <VinylEngine
                    albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
                    className="w-full h-full drop-shadow-[0_24px_48px_rgba(14,9,7,0.4)]"
                  />
                </div>

                {/* Track Info Below Floating Vinyl */}
                <div className="mt-8 text-center w-full px-4 relative min-h-[4rem]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack?.audioUrl || currentTrack?.title || 'empty'}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-4 top-0"
                    >
                      <h2
                        className="font-serif text-2xl font-medium line-clamp-1 tracking-tight text-[var(--on-surface)]"
                        title={currentTrack?.title}
                      >
                        {currentTrack?.title ?? '—'}
                      </h2>
                      <p className="mt-1 text-sm line-clamp-1 text-[var(--muted)]">
                        {currentTrack?.artist ?? '—'}
                      </p>
                      <p className="mt-0.5 text-xs line-clamp-1 text-[var(--muted)] opacity-80">
                        {currentTrack?.album ?? '—'}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeView === 'shelf' && (
            /* ═════════ VIEW 4: Record Shelf ═════════ */
            <motion.div
              key="shelf-view"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 z-10 bg-black/5 dark:bg-black/20 backdrop-blur-[2px]"
            >
              <RecordShelfView />
            </motion.div>
          )}
        </AnimatePresence>
              </div>
            </ContentArea>
          </div>

          {/* ── Bottom Dock (Integrated into Chassis) ── */}
          <ControlDock />
        </motion.div>
      )}
      </AnimatePresence>
      {/* ── Settings & Preferences Modal ── */}
      <SettingsModal />

      {/* ── First-Time User Introduction & Guide Modal ── */}
      <OnboardingModal />

      {/* ── Keyboard Shortcuts Quick Reference ── */}
      <KeyboardHelpOverlay />

      {/* ── Subtle Physical Startup Experience (Bypassed in screensaver mode) ── */}
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
