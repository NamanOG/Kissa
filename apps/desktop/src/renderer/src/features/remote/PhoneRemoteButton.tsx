import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Smartphone } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { IconTile, TILE } from '@renderer/components/ui/IconTile'
import { useT } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'
import { encodeQr } from './qr'
import { useRemoteStore } from './remoteStore'

const EASE = [0.22, 1, 0.36, 1] as const

/**
 * The QR code as one SVG path: square modules for the data, with the three finder eyes drawn
 * as rounded squares so the code sits in Kissa's softer shapes. Dark on ivory, with the quiet
 * zone the standard asks for, so every phone camera reads it.
 */
export function QrCode({ text, label }: { text: string; label: string }): React.JSX.Element {
  const { size, path, eyes } = useMemo(() => {
    const grid = encodeQr(text)
    const n = grid.length
    const inEye = (x: number, y: number): boolean =>
      (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7)
    let d = ''
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (grid[y][x] && !inEye(x, y)) d += `M${x} ${y}h1v1h-1z`
      }
    }
    return {
      size: n,
      path: d,
      eyes: [
        [0, 0],
        [n - 7, 0],
        [0, n - 7]
      ]
    }
  }, [text])
  const q = 4
  return (
    <svg
      role="img"
      aria-label={label}
      data-testid="remote-qr"
      viewBox={`${-q} ${-q} ${size + q * 2} ${size + q * 2}`}
      className="block h-full w-full"
      shapeRendering="crispEdges"
    >
      <rect x={-q} y={-q} width={size + q * 2} height={size + q * 2} fill="#f7f1e8" />
      <path d={path} fill="#16120f" />
      {eyes.map(([x, y]) => (
        <g key={`${x}-${y}`} shapeRendering="geometricPrecision">
          <rect
            x={x + 0.5}
            y={y + 0.5}
            width={6}
            height={6}
            rx={1.6}
            fill="none"
            stroke="#16120f"
            strokeWidth={1}
          />
          <rect x={x + 2} y={y + 2} width={3} height={3} rx={0.8} fill="#16120f" />
        </g>
      ))}
    </svg>
  )
}

/**
 * The phone remote's home: a small phone button on the dock, lit while the remote is on, that
 * opens one card with the switch, the QR code to scan and the code for typing it in by hand.
 */
export const PhoneRemoteButton = memo(() => {
  const t = useT()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = useState<{ left: number; bottom: number } | null>(null)
  const titleId = useId()

  const status = useRemoteStore((s) => s.status)
  const busy = useRemoteStore((s) => s.busy)
  const setOn = useRemoteStore((s) => s.setOn)
  const available = typeof window !== 'undefined' && !!window.electron?.setPhoneRemoteOn

  const state = !status.on
    ? t('remote.state.off')
    : status.phones === 0
      ? t('remote.state.waiting')
      : status.phones === 1
        ? t('remote.state.one')
        : t('remote.state.many', { n: String(status.phones) })
  const problem =
    status.problem === 'no-network'
      ? t('remote.problem.network')
      : status.problem === 'no-port'
        ? t('remote.problem.port')
        : status.publicNetwork
          ? t('remote.problem.public')
          : null

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

  if (!available) return null

  const width = 340
  const left = anchor
    ? Math.max(12, Math.min(window.innerWidth - width - 12, anchor.left - width / 2))
    : 0
  const connected = status.on && status.phones > 0
  const host = status.url?.replace(/^http:\/\//, '') ?? ''

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="phone-remote-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${t('remote.title')}: ${state}`}
        title={`${t('remote.title')}: ${state}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center justify-center w-[26px] h-[26px] min-[900px]:w-[28px] min-[900px]:h-[28px] rounded-full border transition duration-ui ease-primary cursor-pointer select-none active:scale-95',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
          open || status.on
            ? 'border-tone/60 bg-tone/15 text-tone'
            : 'border-transparent hover:border-panel-line bg-transparent hover:bg-[var(--surface)] text-dim hover:text-ink'
        )}
      >
        <Smartphone className="w-3.5 h-3.5 stroke-[1.75]" aria-hidden="true" />
        {status.on && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute -right-px -top-px h-[7px] w-[7px] rounded-full ring-2 ring-[var(--dock-bg,#120e0b)]',
              connected ? 'bg-tone shadow-[0_0_6px_var(--accent)]' : 'bg-ink/45'
            )}
          />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && anchor && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              data-testid="phone-remote-panel"
              initial={{ opacity: 0, y: reduce ? 0 : 8, scale: reduce ? 1 : 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduce ? 0 : 6 }}
              transition={{ duration: reduce ? 0.12 : 0.26, ease: EASE }}
              style={{ left, bottom: anchor.bottom, width, transformOrigin: 'bottom center' }}
              className="fixed z-[90] max-h-[calc(100vh-120px)] overflow-y-auto overflow-x-hidden rounded-[22px] border border-white/[0.09] bg-[#16120f]/[0.93] p-4 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl backdrop-saturate-150"
            >
              <div
                aria-hidden="true"
                className={cn(
                  'pointer-events-none absolute -top-16 left-1/2 h-40 w-[130%] -translate-x-1/2 rounded-full blur-3xl transition-opacity duration-700',
                  status.on ? 'opacity-50' : 'opacity-15'
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
                  {t('remote.title')}
                </p>
                <p
                  className="mt-1 text-[12.5px] text-ink/65"
                  role="status"
                  data-testid="phone-remote-state"
                >
                  {state}
                </p>

                <div className="mt-2 flex items-center gap-3 border-b border-white/[0.06] py-2.5">
                  <IconTile icon={Smartphone} tint={TILE.sky} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13.5px] font-medium leading-snug text-ink">
                      {t('remote.switch')}
                    </span>
                    <span className="mt-0.5 text-[12px] leading-snug text-ink/60">
                      {t('remote.switch.desc')}
                    </span>
                  </span>
                  <HardwareSwitch
                    checked={status.on}
                    onChange={(on) => void setOn(on)}
                    disabled={busy}
                    aria-label={t('remote.switch')}
                  />
                </div>

                {problem && (
                  <p
                    className="mt-3 rounded-[12px] bg-[#f1a58c]/[0.1] px-3 py-2 text-[12px] leading-snug text-[#f4b8a4]"
                    role="alert"
                  >
                    {problem}
                  </p>
                )}

                <AnimatePresence initial={false}>
                  {status.on && status.pairUrl && (
                    <motion.div
                      key="pair"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: reduce ? 0.12 : 0.32, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col items-center pt-4">
                        <div className="h-[176px] w-[176px] overflow-hidden rounded-[18px] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_14px_34px_-12px_rgba(0,0,0,0.8),0_0_0_0.5px_rgba(255,255,255,0.18)]">
                          <QrCode text={status.pairUrl} label={t('remote.qrLabel')} />
                        </div>
                        <p className="mt-3 text-[12.5px] font-medium text-ink/80">
                          {t('remote.scan')}
                        </p>
                        <p
                          className="mt-1 select-text font-mono text-[22px] font-semibold tabular-nums tracking-[0.22em] text-ink"
                          data-testid="phone-remote-code"
                        >
                          {status.code}
                        </p>
                        <p className="mt-2.5 text-center text-[12px] leading-snug text-ink/55">
                          {t('remote.manual', { url: host })}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="mt-3 text-[11.5px] leading-snug text-ink/45">
                  {status.on ? t('remote.note') : t('remote.offNote')}
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
PhoneRemoteButton.displayName = 'PhoneRemoteButton'
