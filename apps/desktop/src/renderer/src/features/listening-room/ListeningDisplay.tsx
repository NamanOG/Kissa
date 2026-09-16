import { memo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { TurntableEngine } from '../turntable/TurntableEngine'
import { DisplayMetadata } from './DisplayMetadata'
import { AlbumSleeve } from '../now-playing/AlbumSleeve'
import { SyncedLyrics } from '../lyrics/SyncedLyrics'
import { useWakeDetection } from './useWakeDetection'

export interface ListeningDisplayProps {
  mode: 'interactive' | 'screensaver'
}

export const ListeningDisplay = memo(({ mode }: ListeningDisplayProps): React.JSX.Element => {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const setIsListeningDisplay = usePlayerStore((s) => s.setIsListeningDisplay)
  const prefersReducedMotion = useReducedMotion()

  // Wake handling
  useWakeDetection(() => {
    if (mode === 'interactive') {
      setIsListeningDisplay(false)
    } else if (mode === 'screensaver') {
      window.electron?.exitScreensaver?.()
    }
  })

  // Subtle breathing/parallax motion for the entire scene, but only if not reduced motion
  const environmentVariants = {
    animate: prefersReducedMotion 
      ? {} 
      : {
          scale: [1, 1.015, 1],
          y: ['0%', '-0.5%', '0%'],
          transition: {
            duration: 120, // extremely slow, 2-minute cycle
            repeat: Infinity,
            ease: "easeInOut" as const
          }
        }
  }

  return (
    <motion.main
      aria-label="Listening Display"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-10 overflow-hidden cursor-none select-none bg-transparent"
    >
      <motion.div
        variants={environmentVariants}
        animate="animate"
        className="w-full h-full flex flex-col justify-center items-center px-12 pb-16 min-[900px]:pb-20"
      >
        {/* Main Composition Grid */}
        <div className="w-full max-w-[2000px] h-full flex flex-col min-[1200px]:flex-row items-center justify-center gap-12 min-[1200px]:gap-20 min-[1600px]:gap-28">
          
          {/* Turntable as the Hero (Left/Center) */}
          <div className="w-full max-w-[85vh] min-[1200px]:max-w-[58vw] min-[1600px]:max-w-[62vw] flex-shrink-0 flex items-center justify-center pointer-events-none [&_.mechanical-controls-class-if-any]:pointer-events-none">
            {/* We override the default max-w-[840px] constraint and ensure buttons are unclickable */}
            <TurntableEngine 
              albumArt={currentTrack?.artworkUrl} 
              isActive={isPlaying} 
              className="!max-w-none w-full [&_button]:pointer-events-none [&_.pointer-events-auto]:!pointer-events-none" 
            />
          </div>

          {/* Right Area: Album Artwork Jacket Stand & Lyrics */}
          <div className="flex flex-col justify-center max-w-[560px] w-full mt-8 min-[1200px]:mt-0 min-h-[420px]">
            <AnimatePresence mode="wait">
              {screensaverLyrics ? (
                /* ── Mode 1: Live Synced Lyrics Mode ── */
                <motion.div
                  key="display-lyrics"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col w-full"
                >
                  {/* Compact Header: Mini Jacket + Metadata */}
                  <div className="flex items-center gap-5 pb-6 border-b border-white/[0.08]">
                    <div className="w-16 h-16 min-[1400px]:w-20 min-[1400px]:h-20 shrink-0">
                      <AlbumSleeve
                        artworkUrl={currentTrack?.artworkUrl}
                        title={currentTrack?.title}
                        flat
                        className="w-full h-full"
                      />
                    </div>
                    <DisplayMetadata className="text-left flex-1 min-w-0" />
                  </div>

                  {/* Synced Lyrics Scroller Viewport */}
                  <div className="w-full h-[300px] min-[1400px]:h-[360px] mt-4 relative overflow-hidden mask-image-vertical">
                    <SyncedLyrics isLargeView={false} className="w-full h-full" />
                  </div>

                  {/* Mode Hint */}
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono tracking-widest text-white/30 uppercase">
                    <span>[ L ] Album Art &nbsp;•&nbsp; [ T ] Theme &nbsp;•&nbsp; [ A ] Match Album</span>
                  </div>
                </motion.div>
              ) : (
                /* ── Mode 2: Pure Physical Album Sleeve Stand (Default) ── */
                <motion.div
                  key="display-album-art"
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-col items-center text-center w-full max-w-[480px] min-[1400px]:max-w-[540px] mx-auto"
                >
                  {/* Physical 12" Vinyl Jacket Stand */}
                  <div className="w-[320px] min-[1400px]:w-[380px] min-[1600px]:w-[420px] mb-8 shrink-0">
                    <AlbumSleeve
                      artworkUrl={currentTrack?.artworkUrl}
                      title={currentTrack?.title}
                      className="w-full"
                    />
                  </div>

                  {/* Cinematic Typography */}
                  <DisplayMetadata align="center" className="w-full" />

                  {/* Mode Hint */}
                  <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-mono tracking-widest text-white/30 uppercase">
                    <span>[ L ] Live Lyrics &nbsp;•&nbsp; [ T ] Theme &nbsp;•&nbsp; [ A ] Match Album</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </motion.main>
  )
})

ListeningDisplay.displayName = 'ListeningDisplay'
