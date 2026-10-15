import React, { useEffect, useState } from 'react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import type { DiscordPresenceState, DiscordPresenceStatus } from '../../../../types/discord'

function stateText(state: DiscordPresenceState, spotify: boolean): string {
  const players = spotify ? 'Apple Music or Spotify' : 'Apple Music'
  switch (state) {
    case 'off':
      return 'Show the track you are playing on your Discord profile, with a link to Kissa'
    case 'unconfigured':
      return 'Discord sharing is not available in this build of Kissa'
    case 'no-discord':
      return 'Waiting for the Discord app to open'
    case 'idle':
      return `Connected. Shows up when Kissa is following ${players}`
    case 'sharing':
      return 'Sharing what you play on your Discord profile'
    case 'paused':
      return 'Paused. The track clears after two minutes'
    case 'studying':
      return 'Sharing your Study Room session'
  }
}

/**
 * Off by default. Turning it on first says plainly what becomes visible, because the
 * person's friends (and anyone in shared servers) will see it. Spotify is a second,
 * separate opt-in: Spotify can share itself, and both together put two cards on the profile.
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

  const setShareSpotify = (on: boolean): void => {
    void window.electron.setDiscordShareSpotify?.(on).then(setStatus)
  }

  const setShareStudy = (on: boolean): void => {
    void window.electron.setDiscordShareStudy?.(on).then(setStatus)
  }

  const live = status.state === 'sharing' || status.state === 'paused' || status.state === 'studying'
  const canShareSpotify = Boolean(window.electron?.setDiscordShareSpotify)
  const canShareStudy = Boolean(window.electron?.setDiscordShareStudy)

  return (
    <div className="flex flex-col px-5 py-[18px] min-[600px]:px-7 hover:bg-ink/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[13.5px] font-medium text-ink">Share on Discord</span>
          <span className="text-[12px] leading-relaxed text-dim mt-1 flex items-center gap-1.5" role="status">
            {live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone" aria-hidden="true" />}
            {stateText(status.state, status.shareSpotify)}
          </span>
        </div>
        <HardwareSwitch
          disabled={status.state === 'unconfigured' && !status.enabled}
          checked={status.enabled || confirming}
          onChange={onToggle}
          aria-label="Share listening activity on Discord"
        />
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-ink/[0.04] p-3.5">
          <p className="text-[12px] leading-relaxed text-ink/90">
            While Kissa follows Apple Music, your Discord profile will show the song, artist, album
            cover and time played, with a link to get Kissa. During a Study Room session it shows the
            room and its timer instead. Friends and people in your servers can see it.
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

      {status.enabled && canShareSpotify && (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-ink/[0.06] pt-3">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-ink">Also share Spotify</span>
            <span className="text-[11.5px] leading-relaxed text-dim mt-0.5">
              If Spotify is also connected in Discord, your profile can show two cards. To keep only
              Kissa's, turn off "Display Spotify as your status" in Discord's Connections settings.
            </span>
          </div>
          <HardwareSwitch
            checked={status.shareSpotify}
            onChange={setShareSpotify}
            aria-label="Also share Spotify activity on Discord"
          />
        </div>
      )}

      {status.enabled && canShareStudy && (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-ink/[0.06] pt-3">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-ink">Show study sessions</span>
            <span className="text-[11.5px] leading-relaxed text-dim mt-0.5">
              While a session runs, your profile shows the room and its timer. What you are working
              on stays private.
            </span>
          </div>
          <HardwareSwitch
            checked={status.shareStudy}
            onChange={setShareStudy}
            aria-label="Show Study Room sessions on Discord"
          />
        </div>
      )}
    </div>
  )
}
