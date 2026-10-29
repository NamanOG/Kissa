import React, { useEffect, useState } from 'react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import type { DiscordPresenceState, DiscordPresenceStatus } from '../../../../types/discord'
import { YouTubeMusicConnectorRow } from './YouTubeMusicConnectorRow'
import { BTN, BTN_PRIMARY } from './PersonalSettings'
import { tl, useT } from '@renderer/i18n'

function stateText(state: DiscordPresenceState, spotify: boolean, youtubeMusic = false): string {
  const players = [
    'Apple Music',
    ...(spotify ? ['Spotify'] : []),
    ...(youtubeMusic ? ['YouTube Music'] : [])
  ].join(spotify && youtubeMusic ? ', ' : tl('discord.or')).replace(/, ([^,]*)$/, `${tl('discord.or')}$1`)
  switch (state) {
    case 'off':
      return tl('discord.off')
    case 'unconfigured':
      return tl('discord.unconfigured')
    case 'no-discord':
      return tl('discord.waiting')
    case 'idle':
      return tl('discord.idle', { players })
    case 'sharing':
      return tl('discord.sharing')
    case 'paused':
      return tl('discord.paused')
    case 'studying':
      return tl('discord.studying')
  }
}

/**
 * Off by default. Turning it on first says plainly what becomes visible, because the
 * person's friends (and anyone in shared servers) will see it. Spotify is a second,
 * separate opt-in: Spotify can share itself, and both together put two cards on the profile.
 */
export function DiscordPresenceRow(): React.JSX.Element | null {
  const t = useT()
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
    <div className="kissa-set-row flex-col items-stretch gap-0">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-ink">{t('discord.title')}</span>
          <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim flex items-center gap-1.5" role="status">
            {live && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tone" aria-hidden="true" />}
            {stateText(status.state, status.shareSpotify, status.shareYouTubeMusic)}
          </span>
        </div>
        <HardwareSwitch
          disabled={status.state === 'unconfigured' && !status.enabled}
          checked={status.enabled || confirming}
          onChange={onToggle}
          aria-label={t('discord.switch')}
        />
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-ink/[0.04] p-3.5">
          <p className="text-[12px] leading-relaxed text-ink/90">
            {t('discord.confirm')}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className={BTN}
            >
              {t('discord.notNow')}
            </button>
            <button
              type="button"
              onClick={() => setEnabled(true)}
              className={BTN_PRIMARY}
            >
              {t('discord.title')}
            </button>
          </div>
        </div>
      )}

      {status.enabled && canShareSpotify && (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-ink/[0.06] pt-3">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-ink">{t('discord.spotify')}</span>
            <span className="text-[11.5px] leading-relaxed text-dim mt-0.5">
              {t('discord.spotify.desc')}
            </span>
          </div>
          <HardwareSwitch
            checked={status.shareSpotify}
            onChange={setShareSpotify}
            aria-label={t('discord.spotify.label')}
          />
        </div>
      )}

      {status.enabled && <YouTubeMusicConnectorRow status={status} onStatus={setStatus} />}

      {status.enabled && canShareStudy && (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-ink/[0.06] pt-3">
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-ink">{t('discord.focus')}</span>
            <span className="text-[11.5px] leading-relaxed text-dim mt-0.5">
              {t('discord.focus.desc')}
            </span>
          </div>
          <HardwareSwitch
            checked={status.shareStudy}
            onChange={setShareStudy}
            aria-label={t('discord.focus.label')}
          />
        </div>
      )}
    </div>
  )
}
