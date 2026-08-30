import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { SyncedLyrics } from '../lyrics/SyncedLyrics'

export const FullscreenLyrics = memo((): React.JSX.Element => {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
      transition={{ 
        duration: prefersReducedMotion ? 0.01 : 0.28, 
        ease: [0.22, 1, 0.36, 1] 
      }}
      className="flex flex-col items-start justify-center h-full w-1/2 max-w-[1200px] shrink-0 pr-6 min-[900px]:pr-12"
    >
      <SyncedLyrics isLargeView={true} className="w-full h-full max-h-[85vh] pr-4 mask-image-vertical" />
    </motion.div>
  )
})

FullscreenLyrics.displayName = 'FullscreenLyrics'
