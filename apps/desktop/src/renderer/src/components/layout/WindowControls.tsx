import { memo, useEffect, useState, type ReactNode } from 'react'
import { useT } from '@renderer/i18n'
import { cn } from '@renderer/utils/cn'

type Action = 'minimize' | 'toggle-maximize' | 'close'

/**
 * Kissa's own caption controls: one small glass capsule in the room's tint with a thin copper
 * edge, holding three segments with Kissa's own glyphs (a short low bar, four corners that open
 * outward or turn inward, a soft cross with an open centre). Hover fills a segment; Close warms to
 * a muted copper red with an ivory glyph. The capsule dims while the window is inactive.
 *
 * The title strip stays a drag region (double-click maximises, Snap by dragging and Win+arrow keep
 * working); only the hover Snap flyout of the native maximise button is gone. One component for
 * the Store and classic builds. Hidden in fullscreen, Party, the mini player and the screensaver
 * (the caller decides). No backdrop blur: it would be redrawn over the moving light every frame,
 * so the glass is a slightly stronger room tint instead.
 */
export const WindowControls = memo(({ className }: { className?: string }) => {
  const t = useT()
  const [maximized, setMaximized] = useState(false)
  const [active, setActive] = useState(() => (typeof document.hasFocus === 'function' ? document.hasFocus() : true))

  useEffect(() => {
    const api = window.electron
    if (!api?.onWindowMaximized) return
    let live = true
    void api.getWindowMaximized?.().then((m) => live && setMaximized(Boolean(m)), () => undefined)
    const off = api.onWindowMaximized((m) => setMaximized(m))
    return () => {
      live = false
      off()
    }
  }, [])

  useEffect(() => {
    const on = (): void => setActive(true)
    const off = (): void => setActive(false)
    window.addEventListener('focus', on)
    window.addEventListener('blur', off)
    return () => {
      window.removeEventListener('focus', on)
      window.removeEventListener('blur', off)
    }
  }, [])

  const send = (action: Action) => () => void window.electron?.windowControl?.(action)

  return (
    <div
      data-window-controls=""
      data-inactive={active ? undefined : ''}
      // Equal 8 px insets from the top and the right; in the compact layout this also centres it
      // in the 44 px top bar.
      className={cn(
        'app-region-no-drag fixed right-2 top-2 z-[200] flex h-7 items-center select-none',
        className
      )}
    >
      <div
        role="group"
        aria-label={t('window.controls')}
        className={cn(
          'flex h-7 items-center rounded-[14px] p-[3px] transition-opacity duration-200 ease-out',
          'bg-[color-mix(in_srgb,var(--on-surface)_7%,color-mix(in_srgb,var(--deck-bg)_45%,transparent))]',
          'shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_38%,transparent),inset_0_1px_0_rgba(255,255,255,0.07),0_4px_14px_-6px_rgba(0,0,0,0.55)]',
          !active && 'opacity-55'
        )}
      >
        <Segment label={t('window.minimise')} shortcut="Win+↓" onClick={send('minimize')}>
          <path d="M3 7.6h4" strokeWidth="1.9" />
        </Segment>
        <Hairline />
        <Segment
          label={maximized ? t('window.restore') : t('window.maximise')}
          shortcut={maximized ? 'Win+↓' : 'Win+↑'}
          onClick={send('toggle-maximize')}
        >
          {/* Four corners open outward to maximise and turn inward to restore; they cross-fade. */}
          <g className={cn('transition-opacity duration-[180ms] ease-out motion-reduce:transition-none', maximized ? 'opacity-0' : 'opacity-100')}>
            <path d="M1.2 3.8V2.7a1.5 1.5 0 0 1 1.5-1.5h1.1M6.2 1.2h1.1a1.5 1.5 0 0 1 1.5 1.5v1.1M8.8 6.2v1.1a1.5 1.5 0 0 1-1.5 1.5H6.2M3.8 8.8H2.7a1.5 1.5 0 0 1-1.5-1.5V6.2" />
          </g>
          <g className={cn('transition-opacity duration-[180ms] ease-out motion-reduce:transition-none', maximized ? 'opacity-100' : 'opacity-0')}>
            <path d="M3.8 1.2v1.4a1.2 1.2 0 0 1-1.2 1.2H1.2M6.2 1.2v1.4a1.2 1.2 0 0 0 1.2 1.2h1.4M6.2 8.8V7.4a1.2 1.2 0 0 1 1.2-1.2h1.4M3.8 8.8V7.4a1.2 1.2 0 0 0-1.2-1.2H1.2" />
          </g>
        </Segment>
        <Hairline />
        <Segment label={t('window.close')} shortcut="Alt+F4" onClick={send('close')} close>
          <path d="M2 2l1.75 1.75M8 2L6.25 3.75M2 8l1.75-1.75M8 8L6.25 6.25" />
        </Segment>
      </div>
    </div>
  )
})
WindowControls.displayName = 'WindowControls'

function Hairline(): React.JSX.Element {
  return <span aria-hidden="true" className="mx-px h-3.5 w-px bg-[color-mix(in_srgb,var(--on-surface)_14%,transparent)]" />
}

function Segment({
  label,
  shortcut,
  onClick,
  close = false,
  children
}: {
  label: string
  shortcut: string
  onClick: () => void
  close?: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-shortcut={shortcut}
      // Set here, not left to the tooltip layer: Maximise and Restore swap keys on one button.
      aria-keyshortcuts={shortcut.replace(/\s+/g, '')}
      onClick={onClick}
      // A mouse press leaves keyboard focus where it was.
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        // 34x24 visible; the clickable zone reaches the whole 32 px strip.
        'group/b relative flex h-6 w-[34px] cursor-default items-center justify-center rounded-[11px] outline-none',
        'before:absolute before:inset-x-0 before:-inset-y-1 before:content-[""]',
        'text-[color-mix(in_srgb,var(--on-surface)_74%,transparent)] transition-[color,background-color,transform] duration-150 ease-out',
        'active:scale-[0.92] motion-reduce:active:scale-100',
        'focus-visible:ring-2 focus-visible:ring-tone',
        close
          ? 'hover:bg-[rgba(196,84,62,0.82)] hover:text-[#f7efe5] focus-visible:text-[#f7efe5]'
          : 'hover:bg-[color-mix(in_srgb,var(--on-surface)_12%,transparent)] hover:text-[var(--on-surface)] focus-visible:text-[var(--on-surface)]'
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 10 10"
        width="10"
        height="10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative"
      >
        {children}
      </svg>
    </button>
  )
}
