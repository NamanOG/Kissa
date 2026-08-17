import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppLayout, ContentArea, Sidebar } from './components/layout'
import { Background } from './features/background'
import { MetadataPanel } from './features/now-playing'
import { TurntableEngine } from './features/turntable'
import { ControlDock } from './features/controls'
import { SyncedLyrics } from './features/lyrics'
import { SettingsModal } from './features/settings'
import { OnboardingModal } from './features/onboarding'
import { usePlayerStore } from './stores/playerStore'
import { useAudioPlayback } from './hooks/useAudioPlayback'
import { useSystemMediaSync } from './hooks/useSystemMediaSync'
import { VinylEngine } from './features/vinyl'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { X } from 'lucide-react'

function App(): React.JSX.Element {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const activeView = usePlayerStore((s) => s.activeView)
  const showSideLyrics = usePlayerStore((s) => s.showSideLyrics)
  const toggleSideLyrics = usePlayerStore((s) => s.toggleSideLyrics)

  // Real audio playback engine (handles audio elements, time sync, seeking & volume)
  useAudioPlayback()

  // Live Windows system media detection (Apple Music, Spotify, etc.)
  useSystemMediaSync()

  return (
    <AppLayout>
      {/* Fixed atmospheric background */}
      <Background />

      {/* Invisible drag region for frameless window movement */}
      <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 pointer-events-auto" />

      {/* Navigation rail — 60px width */}
      <Sidebar />

      {/* Main content area */}
      <ContentArea>
        <div className="app-region-no-drag relative flex-1 min-h-0 overflow-hidden pt-4 min-[900px]:pt-0">
          <AnimatePresence mode="wait">
            {activeView === 'deck' ? (
              /* ═════════ VIEW 1: 3D Turntable Deck View (Default Hero) ═════════ */
              <motion.div
                key="deck-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={[
                  'relative h-full w-full overflow-hidden no-scrollbar grid grid-rows-1',
                  showSideLyrics
                    ? 'min-[1100px]:grid-cols-[minmax(220px,0.26fr)_minmax(360px,0.48fr)_minmax(240px,0.26fr)] grid-cols-[minmax(200px,0.34fr)_minmax(0,0.66fr)]'
                    : 'grid-cols-[minmax(200px,0.32fr)_minmax(0,0.68fr)]'
                ].join(' ')}
              >
                {/* Left Column: Metadata & Album Art */}
                <MetadataPanel className="h-full min-h-0 overflow-y-auto no-scrollbar" />

                {/* Center Hero: 3D Turntable Deck */}
                <section
                  className="relative flex min-h-0 min-w-0 h-full w-full items-center justify-center p-2 min-[800px]:p-4 min-[1200px]:p-8 overflow-hidden"
                >
                  <TurntableEngine
                    className="w-full max-w-[840px] max-h-full"
                    albumArt={currentTrack?.artworkUrl}
                  />
                </section>

                {/* Optional Side Lyrics Panel (Only shown when user requests) */}
                {showSideLyrics && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden min-[1100px]:flex flex-col min-h-0 border-l border-white/[0.08] bg-[#221a17]/40 backdrop-blur-xl px-5 py-6"
                  >
                    <div className="flex items-center justify-between pb-3 shrink-0 border-b border-white/[0.06]">
                      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-[#b7a99b] font-bold">
                        SIDE LYRICS
                      </span>
                      <button
                        type="button"
                        onClick={toggleSideLyrics}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[#887b70] hover:text-[#f5efe6] hover:bg-white/[0.08] transition-all cursor-pointer"
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
            ) : (
              /* ═════════ VIEW 2: Apple Music Immersive Lyrics View ═════════ */
              <motion.div
                key="lyrics-view"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative h-full w-full grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,0.65fr)_minmax(280px,0.35fr)] overflow-hidden"
              >
                {/* Left/Center: Large Fluid Apple Music Lyrics Stream */}
                <div className="relative h-full min-h-0 flex flex-col px-4 min-[900px]:px-10 py-6 min-[900px]:py-8">
                  <SyncedLyrics isLargeView />
                </div>

                {/* Right: Floating Vinyl Album Card Widget */}
                <div className="hidden min-[900px]:flex flex-col items-center justify-center p-8 border-l border-white/[0.06] bg-[#221a17]/25 backdrop-blur-xl">
                  {/* Floating Spinning Vinyl */}
                  <div className="relative w-full max-w-[280px] aspect-square flex items-center justify-center">
                    <div className="absolute inset-4 rounded-full bg-[#d7a76c]/10 blur-3xl pointer-events-none" />
                    <VinylEngine
                      albumArt={currentTrack?.artworkUrl ?? albumPlaceholder}
                      className="w-full h-full drop-shadow-[0_24px_48px_rgba(14,9,7,0.6)]"
                    />
                  </div>

                  {/* Track Info Below Floating Vinyl */}
                  <div className="mt-8 text-center w-full px-4">
                    <h2
                      className="font-serif text-2xl text-[#f5efe6] font-medium line-clamp-1 tracking-tight"
                      title={currentTrack?.title}
                    >
                      {currentTrack?.title ?? '—'}
                    </h2>
                    <p className="mt-1 text-sm text-[#b7a99b] line-clamp-1">
                      {currentTrack?.artist ?? '—'}
                    </p>
                    <p className="mt-0.5 text-xs text-[#887b70] line-clamp-1">
                      {currentTrack?.album ?? '—'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Bottom Dock ── */}
        <ControlDock />
      </ContentArea>

      {/* ── Settings & Preferences Modal ── */}
      <SettingsModal />

      {/* ── First-Time User Introduction & Guide Modal ── */}
      <OnboardingModal />
    </AppLayout>
  )
}

export default App
