import { memo, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AudioWaveform, Blend, SunMedium, WandSparkles } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { IconTile, TILE, type TileIcon, type TileTint } from '@renderer/components/ui/IconTile'
import { useT } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'

const EASE = [0.22, 1, 0.36, 1] as const

function LightRow({
  icon,
  tint,
  title,
  desc,
  children,
  dim
}: {
  icon: TileIcon
  tint: TileTint
  title: string
  desc: string
  children: React.ReactNode
  dim?: boolean
}): React.JSX.Element {
  return (
    <li className={cn('flex items-center gap-3 py-2.5 transition-opacity', dim && 'opacity-50')}>
      <IconTile icon={icon} tint={tint} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13.5px] font-medium leading-snug text-ink">{title}</span>
        <span className="mt-0.5 text-[12px] leading-snug text-ink/60">{desc}</span>
      </span>
      {children}
    </li>
  )
}

/**
 * Moving light's home: a named button on the dock that shows whether the light is moving, and
 * opens the room's light in one place (Moving light, moving with the music, following the day).
 * Moving light needs Match the album, so instead of a dead switch the card offers to turn it on.
 */
export const RoomLightButton = memo(() => {
  const t = useT()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)
  const titleId = useId()

  const moving = usePlayerStore((s) => s.ambientMotion)
  const setMoving = usePlayerStore((s) => s.setAmbientMotion)
  const matchAlbum = usePlayerStore((s) => s.theme === 'adaptive')
  const setTheme = usePlayerStore((s) => s.setTheme)
  const soundLight = useFeaturesStore((s) => s.soundLight)
  const setSoundLight = useFeaturesStore((s) => s.setSoundLight)
  const daylight = useFeaturesStore((s) => s.followDaylight)
  const setDaylight = useFeaturesStore((s) => s.setFollowDaylight)

  const on = moving && matchAlbum
  const state = !matchAlbum
    ? t('light.state.needsMatch')
    : !moving
      ? t('light.state.off')
      : soundLight
        ? t('light.state.music')
        : t('light.state.drift')

  useEffect(() => {
    if (!open) return
    const place = (): void => {
      const r = buttonRef.current?.getBoundingClientRect()
      if (r) setAnchor({ left: r.left + r.width / 2, bottom: window.innerHeight - r.top + 32 })
    }
    place()
    const focusFirst = window.setTimeout(
      () => panelRef.current?.querySelector<HTMLElement>('button, [role="switch"]')?.focus(),
      30
    )
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    const onDown = (e: PointerEvent): void => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('resize', place)
    return () => {
      window.clearTimeout(focusFirst)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  const width = 340
  const left = anchor
    ? Math.max(12, Math.min(window.innerWidth - width - 12, anchor.left - width / 2))
    : 0

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="room-light-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('light.title')}: ${state}`}
        title={state}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-full px-2.5 transition duration-ui ease-primary select-none active:scale-[0.97] min-[900px]:px-3',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
          open || on
            ? 'bg-tone/20 text-tone shadow-[inset_0_0_0_0.5px_color-mix(in_srgb,var(--accent)_55%,transparent)]'
            : 'bg-white/[0.06] text-ink/75 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.12)] hover:bg-white/[0.1] hover:text-ink'
        )}
      >
        <Blend
          className="h-3 w-3 min-[900px]:h-3.5 min-[900px]:w-3.5"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <span className="hidden text-[12px] font-medium tracking-[-0.005em] min-[1000px]:inline">
          {t('light.button')}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'h-1.5 w-1.5 rounded-full transition-colors',
            on ? 'bg-tone shadow-[0_0_6px_var(--accent)]' : 'bg-ink/25'
          )}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && anchor && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              data-testid="room-light-panel"
              initial={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 6 }}
              transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
              style={{ left, bottom: anchor.bottom, width, transformOrigin: 'bottom center' }}
              className="fixed z-[90] overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#16120f]/[0.93] p-4 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150"
            >
              {/* The light itself, small: the album's colours drifting when it moves. */}
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute -top-16 left-1/2 h-40 w-[130%] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-700',
                  on ? 'opacity-60' : 'opacity-20'
                )}
                style={{
                  background:
                    'radial-gradient(closest-side, color-mix(in srgb, var(--accent) 70%, transparent), transparent)'
                }}
              />
              <div className="relative">
                <p
                  id={titleId}
                  className="font-kissa-editorial text-[22px] leading-tight tracking-[-0.015em] text-ink"
                >
                  {t('light.title')}
                </p>
                <p className="mt-1 text-[12.5px] text-ink/65" role="status">
                  {state}
                </p>

                <ul className="mt-2 divide-y divide-white/[0.06]">
                  <LightRow
                    icon={Blend}
                    tint={TILE.violet}
                    title={t('turntable.moving')}
                    desc={t('light.moving.desc')}
                    dim={!matchAlbum}
                  >
                    <HardwareSwitch
                      checked={on}
                      onChange={setMoving}
                      disabled={!matchAlbum}
                      aria-label={t('turntable.moving')}
                    />
                  </LightRow>
                  <LightRow
                    icon={AudioWaveform}
                    tint={TILE.rose}
                    title={t('turntable.soundLight')}
                    desc={t('turntable.soundLight.desc')}
                    dim={!on}
                  >
                    <HardwareSwitch
                      checked={soundLight}
                      onChange={setSoundLight}
                      disabled={!on}
                      aria-label={t('turntable.soundLight')}
                    />
                  </LightRow>
                  <LightRow
                    icon={SunMedium}
                    tint={TILE.amber}
                    title={t('turntable.daylight')}
                    desc={t('turntable.daylight.desc')}
                  >
                    <HardwareSwitch
                      checked={daylight}
                      onChange={setDaylight}
                      aria-label={t('turntable.daylight')}
                    />
                  </LightRow>
                </ul>

                {!matchAlbum && (
                  <div className="mt-2 flex items-center gap-3 rounded-[14px] bg-white/[0.05] p-3 shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.1)]">
                    <IconTile icon={WandSparkles} tint={TILE.indigo} />
                    <p className="min-w-0 flex-1 text-[12px] leading-snug text-ink/75">
                      {t('light.needsMatch')}
                    </p>
                    <button
                      type="button"
                      data-testid="room-light-match"
                      onClick={() => {
                        setTheme('adaptive')
                        setMoving(true)
                      }}
                      className="h-8 shrink-0 rounded-full bg-tone px-3.5 text-[12.5px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition-[filter,transform] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone active:scale-[0.97]"
                    >
                      {t('light.useMatch')}
                    </button>
                  </div>
                )}

                <p className="mt-3 text-[11.5px] leading-snug text-ink/45">
                  {t('turntable.sound.note')}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
})
RoomLightButton.displayName = 'RoomLightButton'
