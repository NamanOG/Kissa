import { memo, useEffect, useState } from 'react'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { useSleepStore } from '@renderer/stores/sleepStore'
import { daylightAt, type DaylightTint } from './daylight'

/** Tints the room (never the record or the words) with the time of day. */
export const DaylightLayer = memo(() => {
  const on = useFeaturesStore((s) => s.followDaylight)
  // Closing time lowers the room a little more while its timer runs.
  const closing = useSleepStore((s) => s.reason === 'closing')
  const [tint, setTint] = useState<DaylightTint>(() => daylightAt(new Date()))

  useEffect(() => {
    if (!on) return
    const tick = (): void => setTint(daylightAt(new Date()))
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
  }, [on])

  const fade = 'opacity 50s linear'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[5]" data-testid="daylight-layer">
      {/* Off (the default): no blend layers at all, so the room costs nothing extra. */}
      {on && (
        <>
          <div className="absolute inset-0" style={{ background: '#ff9a4d', mixBlendMode: 'soft-light', opacity: tint.warm * 0.5, transition: fade }} />
          <div className="absolute inset-0" style={{ background: '#8fb6ff', mixBlendMode: 'soft-light', opacity: tint.cool * 0.4, transition: fade }} />
          <div className="absolute inset-0 bg-black" style={{ opacity: tint.dim, transition: fade }} />
        </>
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: closing ? 0.24 : 0, transition: 'opacity 60s ease-in-out' }} />
    </div>
  )
})

DaylightLayer.displayName = 'DaylightLayer'
