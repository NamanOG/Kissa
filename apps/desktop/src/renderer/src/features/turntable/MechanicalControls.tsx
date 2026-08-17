import { memo } from 'react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'

/**
 * Tactile On-Plinth Mechanical Controls.
 * Positions the 33/45 RPM rotary dial and recessed POWER / PAUSE buttons
 * comfortably on the top deck with rich tactile interactivity and LED indicators.
 */
export const MechanicalControls = memo(({ className }: { className?: string }): React.JSX.Element => {
  const isPlaying = usePlayerStore((state) => state.isPlaying)
  const isPowered = usePlayerStore((state) => state.isPowered)
  const rpm = usePlayerStore((state) => state.rpm)
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause)
  const togglePower = usePlayerStore((state) => state.togglePower)
  const toggleRpm = usePlayerStore((state) => state.toggleRpm)

  const handlePowerClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    togglePower()
    if (usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause && isPlaying) {
      void window.electron.mediaPlayPause()
    }
  }

  const handlePlayPauseClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    togglePlayPause()
    if (usePlayerStore.getState().currentTrack?.sourceAppId && window.electron?.mediaPlayPause) {
      void window.electron.mediaPlayPause()
    }
  }

  const handleRpmClick = (e: React.MouseEvent): void => {
    e.stopPropagation()
    toggleRpm()
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none select-none z-40', className)}>

      {/* ══ 1. Speed Selector Rotary Knob (Bottom-Left) ══ */}
      <div
        className="absolute pointer-events-auto flex flex-col items-center gap-1.5"
        style={{ left: '7%', bottom: '9%' }}
      >
        {/* Machined Dial Knob */}
        <button
          type="button"
          onClick={handleRpmClick}
          className="relative cursor-pointer active:scale-95 transition-transform focus:outline-none"
          style={{ width: '42px', height: '42px' }}
          title={`Speed: ${rpm} RPM (click to toggle)`}
          aria-label={`Toggle speed, currently ${rpm} RPM`}
        >
          <svg
            className="w-full h-full drop-shadow-[2px_5px_8px_rgba(10,6,4,0.85)]"
            viewBox="0 0 100 100"
            style={{
              transform: `rotate(${rpm === '33' ? -28 : 28}deg)`,
              transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <defs>
              <linearGradient id="knob-face" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#443731" />
                <stop offset="50%" stopColor="#2c221e" />
                <stop offset="100%" stopColor="#181210" />
              </linearGradient>
              <radialGradient id="knob-bevel" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                <stop offset="60%" stopColor="rgba(255,255,255,0.02)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Base cylinder */}
            <circle cx="50" cy="50" r="48" fill="#0f0b09" stroke="rgba(0,0,0,0.9)" strokeWidth="1" />
            <circle cx="50" cy="50" r="46" fill="url(#knob-face)" />
            <circle cx="50" cy="50" r="46" fill="url(#knob-bevel)" />
            <circle cx="50" cy="50" r="45.5" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

            {/* Position indicator notch */}
            <rect x="47.5" y="8" width="5" height="12" rx="2" fill="#0c0907" />
            <rect x="48.5" y="9" width="3" height="10" rx="1.5" fill="#f5efe6" />
          </svg>
        </button>

        {/* Speed typography & LED indicator */}
        <div className="flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.2em] pt-0.5">
          <span className={cn('transition-colors duration-300', rpm === '33' ? 'text-[#d7a76c] font-semibold' : 'text-[#887b70]')}>
            33
          </span>
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all duration-300',
              rpm === '45' ? 'bg-[#d7a76c] shadow-[0_0_6px_rgba(215,167,108,0.9)]' : 'bg-[#5a4940]'
            )}
          />
          <span className={cn('transition-colors duration-300', rpm === '45' ? 'text-[#d7a76c] font-semibold' : 'text-[#887b70]')}>
            45
          </span>
        </div>
      </div>

      {/* ══ 2. Power & Pause Pod (Bottom-Right) ══ */}
      <div
        className="absolute pointer-events-auto flex items-center gap-2.5"
        style={{ right: '5%', bottom: '9%' }}
      >
        {/* Recessed Pill Housing */}
        <div
          className="flex items-center rounded-full p-[3px] border border-white/[0.08] bg-[#221b18]/90 shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),0_1px_1px_rgba(255,255,255,0.06)] backdrop-blur-sm"
        >
          {/* POWER button */}
          <button
            onClick={handlePowerClick}
            aria-label={isPowered ? 'Power deck off' : 'Power deck on'}
            type="button"
            className="relative h-[28px] px-3.5 rounded-full flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 focus:outline-none"
            style={{
              background: isPowered
                ? 'linear-gradient(to bottom, #3c2f29, #251d19)'
                : 'linear-gradient(to bottom, #231a16, #16100e)',
              boxShadow: isPowered
                ? '0 1px 3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                : 'inset 0 1px 2px rgba(0,0,0,0.8)'
            }}
          >
            {/* Amber power indicator LED */}
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all duration-300',
                isPowered
                  ? 'bg-[#d7a76c] shadow-[0_0_8px_rgba(215,167,108,0.9)]'
                  : 'bg-[#5a4940]'
              )}
            />
            <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#f5efe6] uppercase">
              Power
            </span>
          </button>

          {/* PLAY / PAUSE button */}
          <button
            onClick={handlePlayPauseClick}
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
            type="button"
            className="relative h-[28px] px-3.5 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 focus:outline-none"
            style={{
              background: isPlaying
                ? 'linear-gradient(to bottom, #3c2f29, #251d19)'
                : 'linear-gradient(to bottom, #2a201b, #19120f)',
              boxShadow: isPlaying
                ? '0 1px 3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
                : 'inset 0 2px 3px rgba(0,0,0,0.85)'
            }}
          >
            <span className="font-mono text-[8px] font-bold tracking-[0.2em] text-[#f5efe6] uppercase">
              {isPlaying ? 'Pause' : 'Play'}
            </span>
          </button>
        </div>

        {/* Pinhole Motor Status LED */}
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors duration-500',
            isPlaying && isPowered
              ? 'bg-[#d7a76c] shadow-[0_0_6px_rgba(215,167,108,0.8)]'
              : 'bg-[#443731] shadow-[0_0_2px_rgba(0,0,0,0.8)]'
          )}
          title={isPlaying && isPowered ? 'Motor Running' : 'Motor Standby'}
        />
      </div>
    </div>
  )
})

MechanicalControls.displayName = 'MechanicalControls'
