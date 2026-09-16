import { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { FullscreenMetadata } from './FullscreenMetadata'
import { FullscreenProgress } from './FullscreenProgress'
import { FullscreenControls } from './FullscreenControls'
import { FullscreenLyrics } from './FullscreenLyrics'
import { useAutoHide } from './useAutoHide'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { ListeningDisplay } from './ListeningDisplay'

export const ListeningRoom = memo((): React.JSX.Element => {
  const prefersReducedMotion = useReducedMotion()
  const { isVisible, handlePointerMove } = useAutoHide()
  const [showLyrics, setShowLyrics] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(true)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    
    const mql = window.matchMedia('(min-width: 1000px)')
    setIsLargeScreen(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsLargeScreen(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const isListeningDisplay = usePlayerStore((s) => s.isListeningDisplay)
  const lyricsActive = showLyrics && isLargeScreen

  return (
    <AnimatePresence mode="wait">
      {isListeningDisplay ? (
        <ListeningDisplay key="display" mode="interactive" />
      ) : (
        <motion.main
          key="interactive"
          aria-label="Listening Room"
      onPointerMove={handlePointerMove}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.995 }}
      transition={{
        duration: prefersReducedMotion ? 0.15 : 0.34,
        ease: [0.22, 1, 0.36, 1]
      }}
      className={`absolute inset-0 z-0 grid min-h-0 grid-rows-[minmax(0,1fr)_auto] overflow-hidden ${
        isVisible ? '' : 'cursor-none'
      }`}
    >
      <div className="flex justify-center w-full h-full min-h-0 overflow-hidden max-w-[2400px] mx-auto">
        <div 
          className={`flex flex-col justify-center shrink-0 h-full min-h-0 pb-16 min-[900px]:pb-20 items-center`}
          style={{
            width: lyricsActive ? '50%' : '100%',
            transitionProperty: 'width',
            transitionDuration: prefersReducedMotion ? '0ms' : '600ms',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
          }}
        >
          <FullscreenMetadata className="text-left" isCentered={!lyricsActive} />
        </div>
        
        <AnimatePresence>
          {lyricsActive && <FullscreenLyrics />}
        </AnimatePresence>
      </div>
      <FullscreenProgress />
      <FullscreenControls 
        isVisible={isVisible} 
        showLyrics={lyricsActive} 
        onToggleLyrics={() => setShowLyrics(!showLyrics)}
        canShowLyrics={isLargeScreen}
      />
    </motion.main>
      )}
    </AnimatePresence>
  )
})

ListeningRoom.displayName = 'ListeningRoom'
