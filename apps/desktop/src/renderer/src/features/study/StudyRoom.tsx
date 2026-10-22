import React, { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Maximize,
  Minimize,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X
} from 'lucide-react'
import { cn } from '@renderer/utils/cn'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { VinylEngine } from '@renderer/features/vinyl'
import { AlbumSleeve } from '@renderer/features/now-playing/AlbumSleeve'
import albumPlaceholder from '@renderer/media/placeholder-album.png'
import { StudyWindowScene } from './StudyWindowScene'
import { StudyRoomView } from './StudyRoomView'
import { PressingPicker } from '../editions/PressingPicker'
import { ENVIRONMENTS, environmentInfo } from './scenes'

/**
 * The Study Room, in the Listening Room's language: the chosen weather fills the whole
 * window, the clock and journal sit on the left in Kissa's editorial serif and mono
 * labels, and the record turns on the right with the track beneath it. Controls are
 * glass pills that step back while a session runs and return on hover or keyboard focus.
 */

const ICON_BUTTON =
  'flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition-[color,background-color,transform] hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone cursor-pointer app-region-no-drag'
const GLASS =
  'rounded-full border border-white/10 bg-black/40 shadow-[0_24px_48px_rgba(0,0,0,0.45)] backdrop-blur-3xl'

export function StudyRoom(): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const studying = useStudyStore((s) => s.active !== null && s.active.segment.runningSince !== null)
  const environment = useStudyStore((s) => s.prefs.environment)
  const ambience = useStudyStore((s) => s.prefs.ambience)
  const ambienceVolume = useStudyStore((s) => s.prefs.ambienceVolume)
  const setPrefs = useStudyStore((s) => s.setPrefs)
  const isFullscreen = usePlayerStore((s) => s.isFullscreen)
  const info = environmentInfo(environment)

  const leave = (): void => {
    const player = usePlayerStore.getState()
    if (player.isFullscreen) player.setFullscreen(false)
    player.setActiveView('deck')
  }

  // Esc leaves the room, after anything else Esc is for (modals, true full screen, a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('dialog[open]')) return
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
      transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-0 z-0 overflow-hidden bg-black [--rec-h:clamp(210px,min(48vh,31vw),500px)]"
      role="region"
      aria-label="Focus Room"
    >
      <StudyWindowScene className="absolute inset-0" />

      <header
        className={cn(
          'absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-4 px-8 pt-6 app-region-drag transition-opacity duration-700',
          recede
        )}
      >
        <div className="flex items-center gap-5">
          <span className="font-kissa-chassis text-[11px] font-bold uppercase tracking-[0.26em] text-white/60">
            Focus Room
          </span>
          <div
            role="radiogroup"
            aria-label="Weather outside"
            className="flex items-center gap-0.5 app-region-no-drag"
          >
            {ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                role="radio"
                aria-checked={env.id === info.id}
                title={env.keepsTime}
                onClick={() => setPrefs({ environment: env.id })}
                className={cn(
                  'h-8 rounded-full px-3.5 font-sans text-[13px] font-medium transition-colors cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:outline-tone',
                  env.id === info.id ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'
                )}
              >
                {env.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-0.5 app-region-no-drag">
          <PressingPicker />
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => setPrefs({ ambience: !ambience })}
            aria-pressed={ambience}
            aria-label={ambience ? 'Turn off room sound' : 'Turn on room sound'}
            title={ambience ? 'Room sound on' : 'Room sound off'}
          >
            {ambience ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>{' '}
          {ambience && (
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={ambienceVolume}
              onChange={(e) => setPrefs({ ambienceVolume: Number(e.target.value) })}
              aria-label="Room sound volume"
              title="Room sound volume"
              className="mr-2 h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-white app-region-no-drag"
            />
          )}
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => usePlayerStore.getState().toggleMiniPlayer()}
            aria-label="Mini player"
            title="Mini player: keep the timer beside your work"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => usePlayerStore.getState().setFullscreen(!isFullscreen)}
            aria-label={isFullscreen ? 'Leave full screen' : 'Full screen'}
            title={isFullscreen ? 'Leave full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={leave}
            aria-label="Leave the Focus Room"
            title="Leave (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="absolute inset-0 z-10 flex items-center gap-[4vw] px-[6vw] pt-24 pb-10 [@media(max-height:720px)]:pt-20 [@media(max-height:720px)]:pb-6">
        {/* Left: the clock and the journal. */}
        <div className="flex h-full min-w-0 max-w-[min(560px,calc(85vw-var(--rec-h)*1.4))] flex-1 flex-col justify-center">
          <StudyRoomView />
        </div>
      </div>

      <RecordCorner />
    </motion.div>
  )
}

/**
 * The record in its sleeve, in the corner: Kissa's own sleeve and vinyl at desk size. The
 * record slides out of the sleeve and turns while music plays, and slips back in when it
 * stops, so the music is present without facing you.
 */
function RecordCorner(): React.JSX.Element {
  const track = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause)
  const reduceMotion = useReducedMotion()
  const idle = !track || track.sourceAppId === 'kissa-idle'
  const out = isPlaying && !idle

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
    } else if (external && window.electron.mediaPrev) void window.electron.mediaPrev()
    else usePlayerStore.getState().playPrev()
  }

  return (
    <div className="absolute right-[5vw] top-1/2 z-10 flex w-[calc(var(--rec-h)*1.4)] -translate-y-[46%] flex-col items-center">
      {/* The record rests in front of its sleeve: the vinyl whole and turning, the cover behind it. */}
      <div className="relative h-[var(--rec-h)] aspect-[1.4/1]">
        <div className="absolute left-0 top-0 h-full aspect-square">
          <AlbumSleeve
            artworkUrl={idle ? undefined : track?.artworkUrl}
            title={track?.album || track?.title}
            flat
            className="h-full w-auto aspect-square"
          />
        </div>
        <motion.div
          className="absolute top-[3%] h-[94%] aspect-square"
          initial={false}
          animate={{ left: out ? '38%' : '30%' }}
          transition={{ duration: reduceMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <VinylEngine
            albumArt={track?.artworkUrl ?? albumPlaceholder}
            className="h-full w-full drop-shadow-[0_26px_40px_rgba(0,0,0,0.65)]"
          />
        </motion.div>
      </div>
      <div className="mt-8 flex w-full flex-col items-center text-center">
        {/*
          Over a bright photograph a wide, faint shadow spreads too thin to darken the thin serif
          strokes. A soft local shade sits behind just these lines, plus a tight shadow on the
          glyphs themselves; the photograph stays untouched elsewhere.
        */}
        <div className="relative isolate flex w-full flex-col items-center">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-6 -inset-y-5 -z-10 bg-[radial-gradient(closest-side,rgba(8,6,5,0.42),rgba(8,6,5,0.18)_60%,transparent)]"
          />
          <p
            className="font-kissa-editorial line-clamp-2 text-[clamp(1.6rem,2.2vw,2.2rem)] leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55),0_2px_18px_rgba(0,0,0,0.6)]"
            title={track?.title}
          >
            {idle ? 'Nothing playing' : track?.title}
          </p>
          {!idle && (
            <p
              className="mt-2 line-clamp-1 text-[15px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6),0_1px_12px_rgba(0,0,0,0.7)]"
              title={track?.artist}
            >
              {track?.artist}
            </p>
          )}
        </div>
        <div
          className={cn(GLASS, 'mt-6 flex items-center gap-2 px-2 py-1.5')}
          role="group"
          aria-label="Music"
        >
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => send('prev')}
            aria-label="Previous track"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black transition-transform active:scale-95 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
            onClick={() => send('play')}
            aria-label={isPlaying ? 'Pause music' : 'Play music'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 translate-x-[1px] fill-current" />
            )}
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => send('next')}
            aria-label="Next track"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  )
}
