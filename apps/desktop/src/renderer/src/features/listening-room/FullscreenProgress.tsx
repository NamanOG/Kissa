import { memo, useEffect, useRef } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'
import { useT } from '@renderer/i18n'

export const FullscreenProgress = memo((): React.JSX.Element => {
  const t = useT()
  const duration = usePlayerStore((s) => s.currentTrack?.duration ?? 0)
  const fillRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let last = -1
    return PlaybackClock.subscribe((time) => {
      if (!fillRef.current) return

      // A full-width bar: write only when it has moved about half a pixel on a wide screen.
      const progress = duration > 0 ? Math.max(0, Math.min(1, time / duration)) : 0
      const step = Math.round(progress * 4000) / 4000
      if (step === last) return
      last = step
      fillRef.current.style.transform = `scaleX(${step})`
    })
  }, [duration])

  return (
    <div aria-label={t('lr.progress')} className="absolute bottom-0 left-0 right-0 z-50">
      <div className="h-[3px] w-full bg-white/10 backdrop-blur-sm">
        <div
          ref={fillRef}
          data-testid="fullscreen-progress-fill"
          className="h-full w-full origin-left will-change-transform bg-tone shadow-[0_0_12px_var(--accent)]"
          style={{ transform: 'scaleX(0)' }}
        />
      </div>
    </div>
  )
})

FullscreenProgress.displayName = 'FullscreenProgress'
