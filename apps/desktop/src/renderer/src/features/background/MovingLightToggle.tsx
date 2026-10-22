import { memo } from 'react'
import { Blend } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'

/**
 * Quick on/off for Moving light, on the Deck's control dock and in full screen. It operates
 * the same saved preference as Settings, so all three always agree.
 *
 * Moving light only exists with Match the album (manual rooms have their own photograph).
 * Under a manual room the button stays where it is, dimmed, and says so in its label and
 * tooltip instead of disappearing.
 */
export const MovingLightToggle = memo(({ variant }: { variant: 'dock' | 'fullscreen' }) => {
  const on = usePlayerStore((s) => s.ambientMotion)
  const setOn = usePlayerStore((s) => s.setAmbientMotion)
  const available = usePlayerStore((s) => s.theme === 'adaptive')

  const label = available
    ? on
      ? 'Moving light: on. Turn off'
      : 'Moving light: off. Turn on'
    : 'Moving light works with Match the album'
  const tip = available
    ? `Moving light ${on ? 'on' : 'off'}: album colours drift behind the room`
    : 'Moving light works with Match the album. Turn on Match Album first.'

  if (variant === 'fullscreen') {
    return (
      <button
        type="button"
        aria-pressed={available ? on : undefined}
        aria-disabled={!available || undefined}
        aria-label={label}
        title={tip}
        onClick={() => available && setOn(!on)}
        className={cn(
          'h-10 px-4 rounded-full flex items-center justify-center gap-2 text-[13px] font-medium transition-[color,background-color,transform] duration-150 active:scale-95',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/80',
          !available
            ? 'text-white/30 cursor-default'
            : on
              ? 'bg-white/15 text-white'
              : 'text-white/55 hover:text-white hover:bg-white/10'
        )}
      >
        <Blend className="h-4 w-4" />
        Moving light
        <span aria-hidden="true" className={cn('ml-0.5 h-1.5 w-1.5 rounded-full', on && available ? 'bg-white' : 'bg-white/25')} />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={available ? on : undefined}
      aria-disabled={!available || undefined}
      aria-label={label}
      title={tip}
      onClick={() => available && setOn(!on)}
      className={cn(
        'relative flex items-center justify-center w-[26px] h-[26px] min-[900px]:w-[28px] min-[900px]:h-[28px] rounded-full border transition duration-ui ease-primary select-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
        !available
          ? 'border-transparent text-dim/40 cursor-default'
          : on
            ? 'border-tone/60 bg-tone/15 text-tone cursor-pointer active:scale-95'
            : 'border-transparent hover:border-panel-line bg-transparent hover:bg-[var(--surface)] text-dim hover:text-ink cursor-pointer active:scale-95'
      )}
    >
      <Blend className="w-3.5 h-3.5 stroke-[1.75]" />
    </button>
  )
})

MovingLightToggle.displayName = 'MovingLightToggle'
