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

/*
 * Keys, the modern way: nearly flush with the plate, one fine lit top edge and a soft shadow.
 * Pressing one settles it into the plate. Static shadows only; they change on press, never per
 * frame.
 */
const KEY_UP = '0 1px 2px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)'
const KEY_DOWN = '0 0 0 0.5px rgba(0,0,0,0.5), inset 0 1px 2px rgba(0,0,0,0.55)'
const KEY_FACE = 'bg-gradient-to-b from-[var(--deck-key-top,#2c2622)] to-[var(--deck-key-bottom,#1c1815)]'
/** Keys sit straight on the plate: no recessed chip round them. */
const HOUSING = ''
/** Printed legend on a key. */
const KEY_LEGEND = 'text-[#cfc3b5]/80'

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
        className={cn('relative w-5 h-5 rounded-full p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a76c] cursor-pointer', HOUSING)}
      >
        <div
          className={cn(
            'w-full h-full rounded-full border border-black/40 flex items-center justify-center transition duration-instant ease-primary',
            KEY_FACE,
            isPressed ? 'translate-y-[1px]' : active ? 'translate-y-[1px]' : ''
          )}
          style={{ boxShadow: isPressed || active ? KEY_DOWN : KEY_UP }}
        >
          {/* Power lamp: a small, clean green LED when the deck is on. */}
          <div
            data-power-led={active ? 'on' : 'off'}
            className="w-1.5 h-1.5 rounded-full border border-black/40 transition-[background-color,box-shadow] duration-micro ease-primary"
            style={{
              backgroundColor: active ? '#5ee08f' : '#14100e',
              boxShadow: active
                ? '0 0 3px rgba(94,224,143,0.55)'
                : 'inset 0 0.5px 1px rgba(0,0,0,0.8)'
            }}
          />
        </div>
      </button>

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
      <div className={cn('flex gap-[3px]', HOUSING)}>
        <button
          type="button"
          onPointerDown={handlePointerDown('33')}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label="33 RPM"
          className={cn('relative w-6 h-5 rounded-[3px] border border-black/40 focus:outline-none flex items-center justify-center cursor-pointer transition duration-instant ease-primary', KEY_FACE)}
          style={{
            transform: pressedBtn === '33' ? 'translateY(1px)' : rpm === '33' ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: pressedBtn === '33' || rpm === '33' ? KEY_DOWN : KEY_UP
          }}
        >
          <span
            className={cn(
              'font-sans text-[10.5px] font-medium tabular-nums transition-colors duration-micro ease-primary pointer-events-none',
              rpm === '33' ? 'text-[#e8b97c]' : 'text-[#9c8c7a]'
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
          className={cn('relative w-6 h-5 rounded-[3px] border border-black/40 focus:outline-none flex items-center justify-center cursor-pointer transition duration-instant ease-primary', KEY_FACE)}
          style={{
            transform: pressedBtn === '45' ? 'translateY(1px)' : rpm === '45' ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: pressedBtn === '45' || rpm === '45' ? KEY_DOWN : KEY_UP
          }}
        >
          <span
            className={cn(
              'font-sans text-[10.5px] font-medium tabular-nums transition-colors duration-micro ease-primary pointer-events-none',
              rpm === '45' ? 'text-[#e8b97c]' : 'text-[#9c8c7a]'
            )}
          >
            45
          </span>
        </button>
      </div>

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
      <div className={HOUSING}>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          aria-label={isPlaying ? tl('deck.key.stopMotor') : tl('deck.key.startMotor')}
          className={cn('relative w-12 h-6 rounded-[3px] border border-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-instant ease-primary', KEY_FACE)}
          style={{
            transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed ? KEY_DOWN : KEY_UP
          }}
        >
          <span className={cn('font-sans text-[11px] font-medium tracking-normal pointer-events-none', KEY_LEGEND)}>
            {isPlaying ? tl('deck.key.stop') : tl('deck.key.start')}
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
      <div className={HOUSING}>
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
          className={cn('relative w-9 h-5 rounded-[3px] border border-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-instant ease-primary', KEY_FACE)}
          style={{
            transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed ? KEY_DOWN : KEY_UP
          }}
        >
          <span className={cn('font-sans text-[11px] font-medium tracking-normal pointer-events-none', KEY_LEGEND)}>
            {t('deck.key.lid')}
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
      <div className={HOUSING}>
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          aria-label={isAdaptive ? tl('deck.key.matchAlbumOff') : tl('deck.key.matchAlbumOn')}
          className={cn(
            'relative min-w-[92px] h-8 px-3 rounded-[3px] border border-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a76c] cursor-pointer flex items-center justify-center transition duration-micro ease-primary',
            KEY_FACE
          )}
          style={{
            transform: isPressed ? 'translateY(1px)' : isAdaptive ? 'translateY(1px)' : 'translateY(0)',
            boxShadow: isPressed || isAdaptive ? KEY_DOWN : KEY_UP
          }}
        >
          {/* A small indicator lamp beside a printed legend: lit amber when the room follows the album. */}
          <span className="flex items-center gap-[6px] pointer-events-none">
            <span
              aria-hidden="true"
              className={cn(
                'h-[5px] w-[5px] rounded-full transition-[background-color,box-shadow] duration-micro ease-primary',
                isAdaptive
                  ? 'bg-[#f2ad60] shadow-[0_0_3px_rgba(242,173,96,0.5)]'
                  : 'bg-[#0d0a08] shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.9),0_0.5px_0_rgba(255,255,255,0.08)]'
              )}
            />
            <span
              className={cn(
                'font-sans text-[11px] font-medium tracking-normal transition-colors duration-micro ease-primary',
                isAdaptive ? 'text-[#f0e3d2]' : 'text-[#cfc3b5]/75'
              )}
            >
              {tl('deck.key.matchAlbum')}
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

