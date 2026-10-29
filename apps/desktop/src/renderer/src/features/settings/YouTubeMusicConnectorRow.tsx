import React, { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { cn } from '@renderer/utils/cn'
import type { DiscordPresenceStatus, YouTubeMusicConnectorStatus } from '../../../../types/discord'
import { CONNECTOR_STORE_LINKS, YOUTUBE_MUSIC_AVAILABLE } from './youtubeMusicConnector'
import { BTN } from './PersonalSettings'
import { tl } from '@renderer/i18n'

const BUTTON = BTN

function openExternal(url: string): void {
  if (window.electron?.openExternal) void window.electron.openExternal(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}

/** One step of the setup, numbered until done. */
function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children?: React.ReactNode }): React.JSX.Element {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden="true"
        className={cn(
          'mt-[1px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]',
          done ? 'bg-ink/[0.12] text-ink' : 'border border-ink/20 text-dim'
        )}
      >
        {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[12.5px] leading-snug', done ? 'text-dim' : 'text-ink')}>
          {title}
          {done && <span className="sr-only"> (done)</span>}
        </p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </li>
  )
}

/**
 * YouTube Music in a browser. Windows cannot tell it apart from other browser tabs, so it
 * comes only from "Kissa for YouTube Music", a browser add-on that runs on music.youtube.com
 * and nowhere else, paired once with a code. Other browser media is never shared.
 *
 * Hidden entirely until the add-on is available from a store, so nobody meets a setup they
 * cannot finish.
 */
export function YouTubeMusicConnectorRow({
  status,
  onStatus
}: {
  status: DiscordPresenceStatus
  onStatus: (s: DiscordPresenceStatus) => void
}): React.JSX.Element | null {
  const api = window.electron
  const [connector, setConnector] = useState<YouTubeMusicConnectorStatus | null>(null)

  useEffect(() => {
    if (!api?.getYouTubeMusicConnector) return
    let alive = true
    void api.getYouTubeMusicConnector().then((c) => alive && setConnector(c))
    const off = api.onYouTubeMusicConnectorChanged?.((c) => setConnector(c))
    return (): void => {
      alive = false
      off?.()
    }
  }, [api, status.shareYouTubeMusic])

  if (!YOUTUBE_MUSIC_AVAILABLE || !api?.setDiscordShareYouTubeMusic) return null

  const toggle = (on: boolean): void => {
    void api.setDiscordShareYouTubeMusic?.(on).then(onStatus)
  }
  const paired = Boolean(connector?.paired)

  return (
    <div className="mt-3 flex flex-col border-t border-ink/[0.06] pt-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-ink">Also share YouTube Music</span>
          <span className="text-[11.5px] leading-relaxed text-dim mt-0.5">
            From music.youtube.com in Chrome or Edge, with the free Kissa add-on. Other tabs, videos and sites are
            never shared.
          </span>
        </div>
        <HardwareSwitch
          checked={status.shareYouTubeMusic}
          onChange={toggle}
          aria-label={tl('a11y.ytmShare')}
        />
      </div>

      {status.shareYouTubeMusic && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-ink/[0.04] p-3.5">
          <ol className="flex flex-col gap-3.5" aria-label={tl('a11y.ytmSetup')}>
            <Step n={1} done={paired} title="Add “Kissa for YouTube Music” to your browser">
              {!paired && (
                <div className="flex flex-wrap gap-2">
                  {CONNECTOR_STORE_LINKS.chrome && (
                    <button type="button" className={BUTTON} onClick={() => openExternal(CONNECTOR_STORE_LINKS.chrome!)}>
                      Chrome Web Store ↗
                    </button>
                  )}
                  {CONNECTOR_STORE_LINKS.edge && (
                    <button type="button" className={BUTTON} onClick={() => openExternal(CONNECTOR_STORE_LINKS.edge!)}>
                      Edge Add-ons ↗
                    </button>
                  )}
                </div>
              )}
            </Step>
            <Step n={2} done={paired && !connector?.pairing} title={connector?.pairing ? 'Type this code into the add-on (click its icon)' : 'Pair it with Kissa'}>
              {connector?.pairing ? (
                <div className="flex items-center gap-3">
                  <p
                    className="font-mono text-[22px] font-bold tracking-[0.3em] text-ink"
                    aria-label={`Pairing code ${connector.pairing.code.split('').join(' ')}`}
                  >
                    {connector.pairing.code}
                  </p>
                  <button type="button" className={BUTTON} onClick={() => void api.cancelYouTubeMusicPairing?.().then(setConnector)}>
                    Cancel
                  </button>
                </div>
              ) : (
                !paired && (
                  <button
                    type="button"
                    className={BUTTON}
                    disabled={!connector?.listening}
                    onClick={() => void api.beginYouTubeMusicPairing?.().then(setConnector)}
                  >
                    Show pairing code
                  </button>
                )
              )}
            </Step>
            <Step
              n={3}
              done={Boolean(connector?.connected)}
              title={connector?.connected ? 'Connected. Sharing what plays on music.youtube.com' : 'Play something on music.youtube.com'}
            />
          </ol>
          {paired && !connector?.pairing && (
            <div className="mt-3.5 flex flex-wrap justify-end gap-2 border-t border-ink/[0.06] pt-3">
              <button type="button" className={BUTTON} onClick={() => void api.beginYouTubeMusicPairing?.().then(setConnector)}>
                Pair another browser
              </button>
              <button type="button" className={BUTTON} onClick={() => void api.forgetYouTubeMusicConnector?.().then(setConnector)}>
                Forget add-on
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
