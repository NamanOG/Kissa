import React, { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Maximize, Minimize, Minimize2, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { TurntableEngine } from '@renderer/features/turntable'
import { StudyWindowScene } from './StudyWindowScene'
import { StudyRoomView } from './StudyRoomView'
import { ENVIRONMENTS, environmentInfo } from './scenes'

const CHROME_BUTTON =
  'flex h-8 w-8 items-center justify-center rounded-full text-ink/70 transition-colors hover:bg-white/10 hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone cursor-pointer app-region-no-drag'

/**
 * The Study Room, full window: the environment fills the room, the desk sits in the lamp's
 * light, and the turntable stays on a low shelf in the corner, dimmed, still playing.
 * Everything that is not the desk recedes while a session runs and returns on hover.
 */
export function StudyRoom(): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const studying = useStudyStore((s) => s.active !== null && s.active.segment.runningSince !== null)
  const environment = useStudyStore((s) => s.prefs.environment)
  const ambience = useStudyStore((s) => s.prefs.ambience)
  const setPrefs = useStudyStore((s) => s.setPrefs)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)
  const info = environmentInfo(environment)

  const leave = (): void => {
    const player = usePlayerStore.getState()
    if (player.isFullscreen) player.setFullscreen(false)
    player.setActiveView('deck')
  }

  // Esc leaves the room, after anything else Esc is for (modals, true full screen).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        target.blur()
        return
      }
      const s = usePlayerStore.getState()
      if (s.isSettingsOpen || s.isOnboardingOpen || s.isKeyboardHelpOpen) return
      leave()
    }
    window.addEventListener('keydown', onKey)
    return (): void => window.removeEventListener('keydown', onKey)
  }, [])

  const recede = studying ? 'opacity-30 hover:opacity-100 focus-within:opacity-100' : 'opacity-100'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-0 overflow-hidden"
      aria-label="Study Room"
      role="region"
    >
      <StudyWindowScene />

      {/* Top: what this room is, its surroundings, and the way out. */}
      <header
        className={cn(
          'absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-6 pt-4 pb-3 app-region-drag transition-opacity duration-700',
          recede
        )}
      >
        <div className="flex items-center gap-5">
          <span className="font-kissa-chassis text-[10px] font-semibold uppercase tracking-[0.26em] text-ink/70">
            Study Room
          </span>
          <div role="radiogroup" aria-label="Surroundings" className="flex items-center gap-1 app-region-no-drag">
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                role="radio"
                aria-checked={env.id === info.id}
                title={env.keepsTime}
                onClick={() => setPrefs({ environment: env.id })}
                className={cn(
                  'rounded-full px-3 py-1 font-kissa-editorial text-[15px] italic transition-colors cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
                  env.id === info.id ? 'bg-white/10 text-ink' : 'text-ink/55 hover:text-ink'
                )}
              >
                {env.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={CHROME_BUTTON}
            onClick={() => setPrefs({ ambience: !ambience })}
            aria-pressed={ambience}
            aria-label={ambience ? 'Turn off room sound' : 'Turn on room sound'}
            title={ambience ? 'Room sound on' : 'Room sound off'}
          >
            {ambience ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className={CHROME_BUTTON}
            onClick={() => usePlayerStore.getState().toggleMiniPlayer()}
            aria-label="Mini player"
            title="Mini player (keeps the timer beside your work)"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={CHROME_BUTTON}
            onClick={() => usePlayerStore.getState().setFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Leave full screen' : 'Full screen'}
            title={isFullscreen ? 'Leave full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button type="button" className={CHROME_BUTTON} onClick={leave} aria-label="Leave the Study Room" title="Leave (Esc)">
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* The desk, in the lamp's light. */}
      <div className="absolute inset-y-0 left-0 z-10 flex w-full max-w-[560px] items-center overflow-y-auto no-scrollbar min-[1200px]:pl-8">
        <StudyRoomView />
      </div>

      <ShelfDeck receding={studying} />
    </motion.div>
  )
}

/** The turntable on a low shelf: smaller, dimmed, with quiet transport beneath. */
function ShelfDeck({ receding }: { receding: boolean }): React.JSX.Element {
  const track = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const [hover, setHover] = useState(false)
  const idle = !track || track.sourceAppId === 'kissa-idle'

  const send = (kind: 'prev' | 'next' | 'play'): void => {
    const external = Boolean(track?.sourceAppId) && window.electron
    if (kind === 'play') {
      togglePlayPause()
      if (external && window.electron.mediaPlayPause) {
        window.__kissaMediaCommandCooldown?.()
        void window.electron.mediaPlayPause()
      }
    } else if (kind === 'next') {
      if (external && window.electron.mediaNext) void window.electron.mediaNext()
      else usePlayerStore.getState().playNext()
    } else {
      if (external && window.electron.mediaPrev) void window.electron.mediaPrev()
      else usePlayerStore.getState().playPrev()
    }
  }

  const bright = hover || !receding

  return (
    <div
      className="absolute bottom-0 right-0 z-10 flex w-[min(58vw,820px)] items-end justify-end gap-6 pr-[3vw] pb-[2.5vh]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className={cn('mb-[5vh] flex flex-col items-end gap-2 transition-opacity duration-700', bright ? 'opacity-100' : 'opacity-45')}>
        <div className="max-w-[220px] text-right">
          <p className="truncate font-kissa-editorial text-[17px] italic text-ink/90" title={track?.title}>
            {idle ? 'Nothing on the platter' : track?.title}
          </p>
          {!idle && <p className="truncate text-[11.5px] text-ink/55">{track?.artist}</p>}
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Music">
          <button type="button" className={CHROME_BUTTON} onClick={() => send('prev')} aria-label="Previous track">
            <SkipBack className="h-3.5 w-3.5 fill-current" />
          </button>
          <button type="button" className={CHROME_BUTTON} onClick={() => send('play')} aria-label={isPlaying ? 'Pause music' : 'Play music'}>
            {isPlaying ? <Pause className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          </button>
          <button type="button" className={CHROME_BUTTON} onClick={() => send('next')} aria-label="Next track">
            <SkipForward className="h-3.5 w-3.5 fill-current" />
          </button>
        </div>
      </div>
      {/* The turntable stands on the desk in the lamp's light: full size and sharp, the room's centrepiece. */}
      <div className="relative w-[clamp(360px,38vw,600px)] shrink-0">
        <div
          aria-hidden="true"
          className="absolute inset-x-[6%] -bottom-[3%] h-[18%] rounded-[50%] bg-black/60 blur-2xl"
        />
        <TurntableEngine />
      </div>
    </div>
  )
}