import React, { useEffect, useState } from 'react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import type { DiscordPresenceState, DiscordPresenceStatus } from '../../../../types/discord'

const STATE_TEXT: Record<DiscordPresenceState, string> = {
  off: 'Show the Apple Music track you are playing on your Discord profile',
  unconfigured: 'Discord sharing is not available in this build of Kissa',
  'no-discord': 'Waiting for the Discord app to open',
  idle: 'Connected. Shows up when Kissa is following Apple Music',
  sharing: 'Sharing what you play in Apple Music',
  paused: 'Apple Music is paused. The track clears after two minutes'
}

/**
 * Off by default. Turning it on first says plainly what becomes visible, because the
 * person's friends (and anyone in shared servers) will see it.
 */
export function DiscordPresenceRow(): React.JSX.Element | null {
  const [status, setStatus] = useState<DiscordPresenceStatus | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const api = window.electron
    if (!api?.getDiscordPresence) return
    let alive = true
    void api.getDiscordPresence().then((s) => {
      if (alive) setStatus(s)
    })
    const unsubscribe = api.onDiscordPresenceChanged?.((s) => setStatus(s))
    return (): void => {
      alive = false
      unsubscribe?.()
    }
  }, [])

  if (!status) return null

  const setEnabled = (enabled: boolean): void => {
    setConfirming(false)
    void window.electron.setDiscordPresenceEnabled(enabled).then(setStatus)
  }

  const onToggle = (next: boolean): void => {
    if (next) setConfirming(true)
    else setEnabled(false)
  }

  const live = status.state === 'sharing' || status.state === 'paused'

  return (
    <div className="flex flex-col p-4 min-[600px]:px-5 hover:bg-ink/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[13.5px] font-medium text-ink">Share Apple Music on Discord</span>
          <span className="text-[11.5px] text-dim mt-0.5 flex items-center gap-1.5" role="status">
            {live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone" aria-hidden="true" />}
            {STATE_TEXT[status.state]}
          </span>
        </div>
        <HardwareSwitch
          disabled={status.state === 'unconfigured' && !status.enabled}
          checked={status.enabled || confirming}
          onChange={onToggle}
          aria-label="Share Apple Music activity on Discord"
        />
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-ink/[0.04] p-3.5">
          <p className="text-[12px] leading-relaxed text-ink/90">
            While Kissa follows Apple Music, your Discord profile will show the song, artist, album
            cover and time played. Friends and people in your servers can see it. Spotify shares
            itself, so Kissa leaves it alone.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-3.5 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/[0.12] text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className="px-4 py-1.5 rounded-xl bg-tone text-[var(--surface)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
            >
              Share on Discord
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
