import React, { memo, useCallback, useState } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { playDeckSound, type DeckSound } from '@renderer/utils/deckSounds'
import { useT, tl } from '@renderer/i18n'
import { useLidStore } from './DustCover'

// The deck's sounds are recordings of real controls (utils/deckSounds), behind one preference.
type MechanicalSound = 'switch' | 'button' | 'buttonUp' | 'radio' | 'toggle'
const SOUND_FOR: Record<MechanicalSound, DeckSound> = {
  switch: 'power',
  radio: 'speed',
  button: 'button',
  buttonUp: 'buttonUp',
  toggle: 'toggle'
}

function playMechanicalSound(type: MechanicalSound): void {
  playDeckSound(SOUND_FOR[type])
}

// Power Control (Flush Rocker Switch)
export const PowerControl = memo(({ active, onClick }: { active: boolean; onClick: () => void }) => {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setIsPressed(true)
    playMechanicalSound('switch')
    onClick()
  }

  const handlePointerUp = () => setIsPressed(false)
  const handlePointerLeave = () => setIsPressed(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsPressed(true)
      playMechanicalSound('switch')
      onClick()
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') setIsPressed(false)
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        aria-label={tl('a11y.power')}
        className="relative w-5 h-5 rounded-full p-[1.5px] bg-[var(--deck-housing,#110d0a)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_var(--deck-bezel,rgba(255,255,255,0.05))] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer"
      >
        <div
          className={cn(
            'w-full h-full rounded-full border border-black/85 flex items-center justify-center transition duration-instant ease-primary',
            'bg-gradient-to-b from-[var(--deck-key-top,#2b221d)] via-[var(--deck-key-bottom,#1e1713)] to-[var(--deck-key-bottom,#120d0a)]',
            isPressed
              ? 'translate-y-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)]'
              : active
                ? 'translate-y-[0.5px] shadow-[0_1px_2px_rgba(0,0,0,0.8),inset_0_0.5px_0.5px_rgba(255,255,255,0.06)]'
                : 'shadow-[0_1.5px_3px_rgba(0,0,0,0.85),inset_0_0.6px_0.6px_rgba(255,255,255,0.08)]'
          )}
        >
          <div
            className="w-1.5 h-1.5 rounded-full border border-black/90 transition-colors duration-micro ease-primary"
            style={{
              backgroundColor: active ? '#22c55e' : '#14100e'
            }}
          />
        </div>
      </button>

      <span className="font-sans text-[6px] font-semibold tracking-[0.24em] text-[color:var(--deck-engrave,#635548)] uppercase pointer-events-none [filter:drop-shadow(0_1px_1px_var(--deck-engrave-shadow,rgba(0,0,0,0.9)))]">
        Power
      </span>
    </div>
  )
})
PowerControl.displayName = 'PowerControl'

// Speed Selector (33 / 45 Dual Interlocking Push Buttons)
export const SpeedControl = memo(({ rpm, onClick }: { rpm: '33' | '45'; onClick: () => void }) => {
  const [pressedBtn, setPressedBtn] = useState<'33' | '45' | null>(null)

  const handlePointerDown = (targetRpm: '33' | '45') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setPressedBtn(targetRpm)

    if (rpm !== targetRpm) {
      playMechanicalSound('radio')
      onClick()
    }
  }

  const handlePointerUp = () => setPressedBtn(null)
  const handlePointerLeave = () => setPressedBtn(null)

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <div className="flex gap-[2px] p-[1.5px] rounded-[2.5px] bg-[var(--deck-housing,#110d0a)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_var(--deck-bezel,rgba(255,255,255,0.05))]">
        <button
          type="button"
          onPointerDown={handlePointerDown('33')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="33 RPM"
          className="relative w-5 h-4.5 rounded-[2.5px] border border-black/85 focus:outline-none flex items-center justify-center cursor-pointer transition duration-instant ease-primary bg-gradient-to-b from-[var(--deck-key-top,#281f1a)] to-[var(--deck-key-bottom,#140e0b)]"
          style={{
            transform: pressedBtn === '33' ? 'translateY(1px)' : rpm === '33' ? 'translateY(0.5px)' : 'translateY(0)',
            boxShadow: pressedBtn === '33' || rpm === '33'
              ? 'inset 0 1px 2px rgba(0,0,0,0.85)'
              : '0 1px 2.5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.35)'
          }}
        >
          <span
            className={cn(
              'font-sans text-[7.5px] font-semibold tracking-[0.04em] transition-colors duration-micro ease-primary pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]',
              rpm === '33' ? 'text-[#d7a76c]' : 'text-[#5a4d42]'
            )}
          >
            33
          </span>
        </button>

        <button
          type="button"
          onPointerDown={handlePointerDown('45')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="45 RPM"
          className="relative w-5 h-4.5 rounded-[2.5px] border border-black/85 focus:outline-none flex items-center justify-center cursor-pointer transition duration-instant ease-primary bg-gradient-to-b from-[var(--deck-key-top,#281f1a)] to-[var(--deck-key-bottom,#140e0b)]"
          style={{
            transform: pressedBtn === '45' ? 'translateY(1px)' : rpm === '45' ? 'translateY(0.5px)' : 'translateY(0)',
            boxShadow: pressedBtn === '45' || rpm === '45'
              ? 'inset 0 1px 2px rgba(0,0,0,0.85)'
              : '0 1px 2.5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.35)'
          }}
        >
          <span
            className={cn(
              'font-sans text-[7.5px] font-semibold tracking-[0.04em] transition-colors duration-micro ease-primary pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]',
              rpm === '45' ? 'text-[#d7a76c]' : 'text-[#5a4d42]'
            )}
          >
            45
          </span>
        </button>
      </div>

      <span className="font-sans text-[6px] font-semibold tracking-[0.24em] text-[color:var(--deck-engrave,#635548)] uppercase pointer-events-none [filter:drop-shadow(0_1px_1px_var(--deck-engrave-shadow,rgba(0,0,0,0.9)))]">
        Speed
      </span>
    </div>
  )
})
SpeedControl.displayName = 'SpeedControl'

// Start / Stop Motor Control (Refined Tactile Push Button)
export const StartStopControl = memo(({ isPlaying, onClick }: { isPlaying: boolean; onClick: () => void }) => {
  const [isPressed, setIsPressed] = useState(false)

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setIsPressed(true)
    playMechanicalSound('button')
    onClick()
  }

  const handlePointerUp = () => {
    if (isPressed) playMechanicalSound('buttonUp')
    setIsPressed(false)
  }
  const handlePointerLeave = () => setIsPressed(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsPressed(true)
      playMechanicalSound('button')
      onClick()
    }
  }

  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') setIsPressed(false)
  }

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto">
      <div className="p-[1.5px] rounded-[2.5px] bg-[var(--deck-housing,#110d0a)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_var(--deck-bezel,rgba(255,255,255,0.05))]">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          aria-label={isPlaying ? 'Stop Motor' : 'Start Motor'}
          className="relative w-11 h-5.5 rounded-[2.5px] border border-black/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-instant ease-primary bg-gradient-to-b from-[var(--deck-key-top,#281f1a)] to-[var(--deck-key-bottom,#140e0b)]"
          style={{
            transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed
              ? 'inset 0 1px 2px rgba(0,0,0,0.9)'
              : '0 1.2px 2.5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.35)'
          }}
        >
          <span className="font-sans text-[7px] font-semibold tracking-[0.16em] text-[#8e8175] uppercase pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            {isPlaying ? 'STOP' : 'START'}
          </span>
        </button>
      </div>
    </div>
  )
})
StartStopControl.displayName = 'StartStopControl'

// Dust lid key: brings the lid down over the deck (clicking the lid lifts it again).
export const LidControl = memo(() => {
  const t = useT()
  const close = useLidStore((s) => s.setClosed)
  const [isPressed, setIsPressed] = useState(false)

  const press = (): void => {
    setIsPressed(true)
    playMechanicalSound('toggle')
    close(true)
  }

  return (
    <div className="flex flex-col items-center gap-1 select-none pointer-events-auto">
      <div className="p-[1.5px] rounded-[2.5px] bg-[var(--deck-housing,#110d0a)] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9),0_0.5px_0.5px_var(--deck-bezel,rgba(255,255,255,0.05))]">
        <button
          type="button"
          data-testid="lid-key"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            press()
          }}
          onPointerUp={() => setIsPressed(false)}
          onPointerCancel={() => setIsPressed(false)}
          onPointerLeave={() => setIsPressed(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              press()
            }
          }}
          onKeyUp={() => setIsPressed(false)}
          aria-label={t('lid.close')}
          title={t('lid.close')}
          className="relative w-8 h-4.5 rounded-[2.5px] border border-black/85 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-instant ease-primary bg-gradient-to-b from-[var(--deck-key-top,#281f1a)] to-[var(--deck-key-bottom,#140e0b)]"
          style={{
            transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed
              ? 'inset 0 1px 2px rgba(0,0,0,0.9)'
              : '0 1.2px 2.5px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.35)'
          }}
        >
          <span className="font-sans text-[6.5px] font-semibold tracking-[0.16em] text-[#8e8175] uppercase pointer-events-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
            Lid
          </span>
        </button>
      </div>
    </div>
  )
})
LidControl.displayName = 'LidControl'

// Match Album / Adaptive Lighting Control (Hardware Toggle)
export const MatchAlbumControl = memo(() => {
  const isAdaptive = usePlayerStore((s) => s.theme === 'adaptive')
  const setTheme = usePlayerStore((s) => s.setTheme)
  const previousManualTheme = usePlayerStore((s) => s.previousManualTheme || 'quiet-room')
  
  const [isPressed, setIsPressed] = useState(false)

  const handleToggle = useCallback(() => {
    playMechanicalSound('toggle')
    if (isAdaptive) {
      setTheme(previousManualTheme)
    } else {
      usePlayerStore.setState({ previousManualTheme: usePlayerStore.getState().theme })
      setTheme('adaptive')
    }
  }, [isAdaptive, previousManualTheme, setTheme])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    setIsPressed(true)
    handleToggle()
  }

  const handlePointerUp = () => setIsPressed(false)
  const handlePointerLeave = () => setIsPressed(false)

  return (
    <div className="flex flex-col items-center select-none pointer-events-auto onboarding-match-album">
      <div className="p-[2px] rounded-[3px] bg-[var(--deck-housing,#110d0a)] shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.95),0_0.5px_0.5px_var(--deck-bezel,rgba(255,255,255,0.08))]">
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label={isAdaptive ? 'Disable Match Album' : 'Enable Match Album'}
          className={cn(
            'relative w-[92px] h-8 rounded-[2px] border border-black/90 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-micro ease-primary',
            'bg-gradient-to-b from-[var(--deck-key-top,#2a221c)] to-[var(--deck-key-bottom,#15100d)]'
          )}
          style={{
            transform: (isPressed || isAdaptive) ? 'translateY(1.5px)' : 'translateY(0)',
            boxShadow: (isPressed || isAdaptive)
              ? 'inset 0 1.5px 3px rgba(0,0,0,0.9), inset 0 -1px 0 rgba(255,255,255,0.05)'
              : '0 1.5px 3px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.13), inset 0 -1px 0 rgba(0,0,0,0.35)'
          }}
        >
          {/* A small indicator lamp beside a printed legend: lit amber when the room follows the album. */}
          <span className="flex items-center gap-[6px] pointer-events-none">
            <span
              aria-hidden="true"
              className={cn(
                'h-[5px] w-[5px] rounded-full transition-[background-color,box-shadow] duration-micro ease-primary',
                isAdaptive
                  ? 'bg-[#f2ad60] shadow-[0_0_4px_rgba(242,173,96,0.75),inset_0_-0.5px_0.5px_rgba(0,0,0,0.3)]'
                  : 'bg-[#0d0a08] shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.08)]'
              )}
            />
            <span
              className={cn(
                'font-sans text-[7.5px] font-semibold tracking-[0.18em] uppercase transition-colors duration-micro ease-primary drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]',
                isAdaptive ? 'text-[#eadccb]' : 'text-[#8a7c6f]'
              )}
            >
              Match album
            </span>
          </span>
        </button>
      </div>
    </div>
  )
})
MatchAlbumControl.displayName = 'MatchAlbumControl'

// Control cluster
export interface MechanicalControlsProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Hi-Fi Turntable Physical Controls.
 * Authentic hardware hierarchy:
 * - Upper-Left Anchor: Power Switch (top: 7%, left: 4.5%)
 * - Lower-Left Upper: 33 / 45 Speed Selector (bottom: 16%, left: 4.5%)
 * - Lower-Left Bottom: Start / Stop Motor Switch (bottom: 9.5%, left: 4.5%)
 * - Lower-Right: Match Album Toggle (bottom: 9.5%, right: 4.5%)
 */
export const MechanicalControls = memo(({ className, style }: MechanicalControlsProps): React.JSX.Element => {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  // Under a closed lid the keys cannot be reached, by pointer or by keyboard.
  const lidClosed = useLidStore((s) => s.closed)
  const rpm = usePlayerStore((state) => state.rpm)

  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause)
  const togglePower = usePlayerStore((state) => state.togglePower)
  const toggleRpm = usePlayerStore((state) => state.toggleRpm)

  const handlePower = useCallback(() => {
    togglePower()
    if (usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause && isPlaying) {
      window.__kissaMediaCommandCooldown?.()
      void window.electron.mediaPlayPause()
    }
  }, [togglePower, isPlaying])

  const handlePlayPause = useCallback(() => {
    togglePlayPause()
    if (usePlayerStore.getState().isPowered && usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
      window.__kissaMediaCommandCooldown?.()
      void window.electron.mediaPlayPause()
    }
  }, [togglePlayPause])

  return (
    <div
      inert={lidClosed || undefined}
      className={cn('absolute inset-0 pointer-events-none select-none z-50 transition-opacity duration-instant ease-primary', className)}
      style={{
        ...style,
        opacity: 'calc(0.35 + 0.65 * var(--room-illumination, 1))'
      }}
    >
      <div className="absolute" style={{ left: '4.5%', top: '7%' }}>
        <PowerControl active={isPowered} onClick={handlePower} />
      </div>

      <div className="absolute" style={{ left: '4.5%', top: '17%' }}>
        <LidControl />
      </div>

      <div className="absolute" style={{ left: '4.5%', bottom: '16%' }}>
        <SpeedControl rpm={rpm} onClick={toggleRpm} />
      </div>

      <div className="absolute" style={{ left: '4.5%', bottom: '9.5%' }}>
        <StartStopControl isPlaying={isPlaying} onClick={handlePlayPause} />
      </div>

      <div className="absolute" style={{ right: '4.5%', bottom: '9.5%' }}>
        <MatchAlbumControl />
      </div>
    </div>
  )
})

MechanicalControls.displayName = 'MechanicalControls'

