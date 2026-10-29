import React, { useEffect, useState } from 'react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { useT } from '@renderer/i18n'
import { BTN } from './PersonalSettings'

interface GraphicsState {
  hardwareAcceleration: boolean
  activeNow: boolean
}

/**
 * Hardware acceleration: on by default. Chromium reads it only at launch, so a change is saved
 * for the next start and a Restart button appears while the saved choice differs from this run.
 */
export function GraphicsRow(): React.JSX.Element | null {
  const t = useT()
  const [state, setState] = useState<GraphicsState | null>(null)

  useEffect(() => {
    let live = true
    void window.electron
      ?.getGraphics?.()
      .then((s) => live && s && setState(s))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  if (!state || !window.electron?.setHardwareAcceleration) return null
  const pending = state.hardwareAcceleration !== state.activeNow

  return (
    <div className="kissa-set-row">
      <div className="flex min-w-0 flex-col pr-2">
        <span className="text-[14px] font-medium text-ink">{t('general.gpu')}</span>
        <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
          {pending ? t('general.gpu.pending') : t('general.gpu.desc')}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {pending && (
          <button type="button" onClick={() => void window.electron?.relaunchApp?.()} className={BTN}>
            {t('general.gpu.restart')}
          </button>
        )}
        <HardwareSwitch
          checked={state.hardwareAcceleration}
          onChange={(on: boolean) => {
            setState({ ...state, hardwareAcceleration: on })
            void window.electron
              ?.setHardwareAcceleration?.(on)
              .then((s) => s && setState(s))
              .catch(() => {})
          }}
          aria-label={t('general.gpu')}
        />
      </div>
    </div>
  )
}
