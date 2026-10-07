import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { usePlayerStore, VINYL_COLORS } from '@renderer/stores/playerStore'
import { cn } from '@renderer/utils/cn'
import { LISTENING_ENVIRONMENTS } from '@renderer/features/settings/themes'
import { VINYL_PRESSINGS } from '@renderer/features/vinyl/VinylBase'
import { VinylEngine } from '@renderer/features/vinyl'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'

export interface OnboardingModalProps {
  className?: string
}

interface GuideStep {
  title: string
  lead: string
  /** Which room photograph backs this step. The room step shows the chosen room instead. */
  room: number
}

const STEPS: GuideStep[] = [
  { title: 'Welcome to Kissa', lead: 'Play music in any app. Kissa puts it on a turntable.', room: 0 },
  { title: 'It follows your music', lead: 'Spotify, Apple Music, TIDAL or a browser tab. There is nothing to connect and no account.', room: 5 },
  { title: 'Make the room yours', lead: 'Pick the light you listen in and the record on the platter. Both can be changed later in Settings.', room: 0 },
  { title: 'Read along', lead: 'Lyrics move with the song, word by word, when timed lyrics exist for the recording.', room: 2 },
  { title: 'Let it run', lead: 'Give the record the whole screen, or let it take over when your desk goes quiet.', room: 3 }
]

function Key({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] px-1.5 font-mono text-[11px] text-[#f5efe6]">
      {children}
    </kbd>
  )
}

function Row({ keys, children }: { keys: React.ReactNode; children: React.ReactNode }): React.JSX.Element {
  return (
    <li className="flex items-center gap-4 border-t border-white/[0.07] py-3 first:border-t-0">
      <span className="flex w-[92px] shrink-0 items-center gap-1">{keys}</span>
      <span className="text-[14px] leading-snug text-[#cfc5ba]">{children}</span>
    </li>
  )
}

const FIELD_LABEL = 'mb-2.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#a89b8d]'

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ className }) => {
  const isOpen = usePlayerStore((s) => s.isOnboardingOpen)
  const setIsOpen = usePlayerStore((s) => s.setIsOnboardingOpen)
  const theme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const setListenerName = usePlayerStore((s) => s.setListenerName)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const setScreensaverLyrics = usePlayerStore((s) => s.setScreensaverLyrics)
  const reduceMotion = useReducedMotion()

  const [step, setStep] = useState(0)
  const last = STEPS.length - 1

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) {
        return
      }
      if (e.key === 'ArrowRight') setStep((s) => Math.min(last, s + 1))
      if (e.key === 'ArrowLeft') setStep((s) => Math.max(0, s - 1))
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, last, setIsOpen])

  useEffect(() => {
    if (isOpen) return
    const t = setTimeout(() => setStep(0), 400)
    return () => clearTimeout(t)
  }, [isOpen])

  if (!isOpen) return null

  const current = STEPS[step]
  const rooms = LISTENING_ENVIRONMENTS.filter((env) => env.id !== 'adaptive')
  const chosenRoom = rooms.find((env) => env.id === theme) ?? rooms[0]
  const picture = step === 2 ? chosenRoom.image : rooms[current.room].image
  const ease = [0.22, 1, 0.36, 1] as const

  return (
    <div className={cn('fixed inset-0 z-[100] flex items-center justify-center select-none p-4 min-[640px]:p-8', className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-[#080605]/90"
        onClick={() => setIsOpen(false)}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Kissa guide"
        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease }}
        className="relative grid h-[86vh] max-h-[660px] min-h-[540px] w-full max-w-[1000px] grid-cols-1 overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#12100d] shadow-[0_40px_90px_rgba(0,0,0,0.8)] min-[900px]:grid-cols-[minmax(0,0.92fr)_minmax(0,1fr)]"
      >
        {/* Picture: the room, with the record itself on the first step */}
        <div className="relative hidden overflow-hidden bg-black min-[900px]:block">
          <AnimatePresence initial={false}>
            <motion.div
              key={picture}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease }}
              className="absolute inset-0"
            >
              <img src={picture} alt="" className="h-full w-full object-cover" draggable={false} />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />

          {step === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75">
              <VinylEngine albumArt={kissaIdleCover} isActive className="w-[62%]" />
            </div>
          )}

          <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between">
            <span className="font-kissa-editorial text-[64px] font-medium leading-none text-white/90">
              {String(step + 1).padStart(2, '0')}
            </span>
            <span className="pb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-white/60">
              {step === 0
                ? '喫茶 · listening café'
                : step === 2
                  ? theme === 'adaptive'
                    ? 'Match Album'
                    : chosenRoom.name
                  : rooms[current.room].name}
            </span>
          </div>
        </div>

        {/* Words and choices */}
        <div className="flex min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between px-8 pt-6">
            <span className="font-mono text-[11px] tracking-[0.18em] text-[#a89b8d]">
              {step + 1} of {STEPS.length}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close guide"
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#8e8175] outline-none transition-colors hover:bg-white/[0.07] hover:text-[#f5efe6] focus-visible:ring-1 focus-visible:ring-[#d7a76c]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-8 pb-4 pt-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, ease }}
              >
                <h2 className="font-kissa-editorial text-[44px] font-medium leading-[1.04] tracking-[-0.02em] text-[#f7f1e8] text-balance">
                  {current.title}
                </h2>
                <p className="mt-4 max-w-[40ch] text-[16px] leading-relaxed text-[#cfc5ba]">{current.lead}</p>

                <div className="mt-8">
                  {step === 0 && (
                    <div>
                      <label htmlFor="guide-name" className={FIELD_LABEL}>
                        What should Kissa call you?
                      </label>
                      <input
                        id="guide-name"
                        type="text"
                        value={listenerName}
                        onChange={(e) => setListenerName(e.target.value)}
                        maxLength={24}
                        placeholder="Your name (optional)"
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full max-w-[320px] select-text appearance-none rounded-xl border border-white/[0.12] bg-white/[0.05] px-4 py-3 text-[16px] text-[#f7f1e8] outline-none placeholder:text-[#8e8175] focus-visible:border-[#d7a76c]"
                      />
                      <p className="mt-3 text-[13px] text-[#8e8175]">
                        It stays on this PC. Kissa uses it to greet you and to title your shelf.
                      </p>
                    </div>
                  )}

                  {step === 1 && (
                    <ul>
                      <Row keys={<Key>Space</Key>}>Play or pause</Row>
                      <Row
                        keys={
                          <>
                            <Key>Shift</Key>
                            <Key>→</Key>
                          </>
                        }
                      >
                        Next track (← for the previous one)
                      </Row>
                      <Row keys={<Key>?</Key>}>Every shortcut, any time</Row>
                    </ul>
                  )}

                  {step === 2 && (
                    <div className="space-y-7">
                      <div>
                        <span className={FIELD_LABEL}>Room</span>
                        <div role="radiogroup" aria-label="Listening room" className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={theme === 'adaptive'}
                            onClick={() => setTheme('adaptive')}
                            className={cn(
                              'col-span-2 flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#d7a76c]',
                              theme === 'adaptive'
                                ? 'border-white/30 bg-white/[0.1] text-[#f7f1e8]'
                                : 'border-white/[0.07] bg-white/[0.03] text-[#b7a99b] hover:bg-white/[0.06] hover:text-[#f7f1e8]'
                            )}
                          >
                            <span
                              className="h-3 w-3 shrink-0 rounded-full"
                              style={{ background: 'conic-gradient(#c8553d, #d9a441, #3d6fc8, #c8553d)' }}
                            />
                            <span className="truncate">Match Album · lit by the cover that is playing</span>
                          </button>
                          {rooms.map((env) => {
                            const selected = env.id === theme
                            return (
                              <button
                                key={env.id}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() => setTheme(env.id)}
                                className={cn(
                                  'flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13.5px] outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#d7a76c]',
                                  selected
                                    ? 'border-white/30 bg-white/[0.1] text-[#f7f1e8]'
                                    : 'border-white/[0.07] bg-white/[0.03] text-[#b7a99b] hover:bg-white/[0.06] hover:text-[#f7f1e8]'
                                )}
                              >
                                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: env.accentColor }} />
                                <span className="truncate">{env.name}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <span className={FIELD_LABEL}>Record · {VINYL_PRESSINGS[vinylColor].name}</span>
                        <div role="radiogroup" aria-label="Record colour" className="flex items-center gap-2.5">
                          {VINYL_COLORS.map((color) => {
                            const pressing = VINYL_PRESSINGS[color]
                            const selected = color === vinylColor
                            return (
                              <button
                                key={color}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                aria-label={pressing.name}
                                title={pressing.name}
                                onClick={() => setVinylColor(color)}
                                className={cn(
                                  'flex h-9 w-9 cursor-pointer items-center justify-center rounded-full outline-none transition-transform active:scale-95',
                                  selected ? 'ring-2 ring-[#f7f1e8] ring-offset-2 ring-offset-[#12100d]' : 'hover:scale-105'
                                )}
                                style={{
                                  background: `radial-gradient(circle, ${pressing.inner} 0%, ${pressing.outer} 100%)`,
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14)'
                                }}
                              >
                                <span className="h-2.5 w-2.5 rounded-full bg-[#d7a76c]" />
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <ul>
                      <Row keys={<span className="text-[13px] text-[#a89b8d]">Click a line</span>}>
                        Jump to that moment, where your music app allows it
                      </Row>
                      <Row
                        keys={
                          <>
                            <Key>−</Key>
                            <Key>+</Key>
                          </>
                        }
                      >
                        Hover the lyrics to nudge timing that runs early or late
                      </Row>
                      <Row keys={<span className="text-[13px] text-[#a89b8d]">Settings</span>}>
                        Choose the size and typeface of the words
                      </Row>
                    </ul>
                  )}

                  {step === 4 && (
                    <>
                      <ul>
                        <Row keys={<Key>D</Key>}>Listening Display: the deck and the sleeve, nothing else</Row>
                        <Row keys={<Key>F11</Key>}>Fullscreen, with the controls a mouse-move away</Row>
                        <Row keys={<span className="text-[13px] text-[#a89b8d]">Settings</span>}>
                          Set Kissa as your Windows screensaver
                        </Row>
                      </ul>
                      <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                        <span className="text-[14px] text-[#cfc5ba]">Show lyrics on the display and screensaver</span>
                        <HardwareSwitch
                          checked={screensaverLyrics}
                          onChange={setScreensaverLyrics}
                          aria-label="Show lyrics on the display and screensaver"
                        />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/[0.07] px-8 py-5">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Guide steps">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  onClick={() => setStep(i)}
                  className={cn(
                    'h-1 cursor-pointer rounded-full outline-none transition-[width,background-color] duration-300 focus-visible:ring-1 focus-visible:ring-[#d7a76c]',
                    i === step ? 'w-8 bg-[#f7f1e8]' : 'w-4 bg-white/15 hover:bg-white/30'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2.5">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-[13.5px] font-medium text-[#b7a99b] outline-none transition-colors hover:text-[#f7f1e8] focus-visible:ring-1 focus-visible:ring-[#d7a76c]"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => (step === last ? setIsOpen(false) : setStep((s) => s + 1))}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-[#f7f1e8] px-5 py-2.5 text-[13.5px] font-semibold text-[#12100d] outline-none transition-transform hover:bg-white focus-visible:ring-2 focus-visible:ring-[#d7a76c] active:scale-[0.97]"
              >
                {step === last ? 'Start listening' : 'Next'}
                {step !== last && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
