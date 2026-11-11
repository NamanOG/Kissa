import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@renderer/hooks/useReducedMotion'
import { SHORTCUT_ATTR, TIP_ATTR, shortcutKeys, splitShortcut } from './tooltipText'

/** Hover this long before a tooltip opens. */
const OPEN_DELAY_MS = 450
/** Moving to another tooltipped item within this long opens its tooltip at once. */
const WARM_MS = 400
const GAP = 8
const EDGE = 8
const TIP_ID = 'kissa-tooltip'

interface Tip {
  target: HTMLElement
  label: string
  keys: string[]
}

/**
 * Moves every `title` attribute into `data-kissa-tip` as soon as it appears, so the stock
 * Windows tooltip never shows. The words stay accessible: an element with no name of its own
 * gets them as its aria-label, and a parsed shortcut becomes aria-keyshortcuts.
 */
function adoptTitle(el: Element): void {
  const text = el.getAttribute('title')
  if (text === null) return
  el.removeAttribute('title')
  if (!text.trim()) return
  el.setAttribute(TIP_ATTR, text)
  const { label, shortcut } = splitShortcut(text)
  const explicit = el.getAttribute(SHORTCUT_ATTR)
  if ((shortcut || explicit) && !el.hasAttribute('aria-keyshortcuts')) {
    el.setAttribute('aria-keyshortcuts', (explicit || shortcut || '').replace(/\s+/g, ''))
  }
  if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby') && !(el.textContent ?? '').trim()) {
    el.setAttribute('aria-label', label)
  }
}

function tipTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null
  const el = node.closest(`[${TIP_ATTR}]`)
  return el instanceof HTMLElement || el instanceof SVGElement ? (el as HTMLElement) : null
}

function readTip(target: HTMLElement): Tip | null {
  const text = target.getAttribute(TIP_ATTR)
  if (!text) return null
  const { label, shortcut } = splitShortcut(text)
  const explicit = target.getAttribute(SHORTCUT_ATTR) ?? undefined
  const key = explicit ?? shortcut
  return { target, label, keys: key ? shortcutKeys(key) : [] }
}

/**
 * The app's one tooltip: a small room-tinted glass label with the shortcut as keycaps. It opens
 * after a short hover (at once when moving between items), on keyboard focus too, closes on
 * Esc, a press, scroll or leaving, flips to stay inside the window, and never takes the pointer.
 * Mounted once; it reads the tooltips the app already declares with `title`.
 */
export const TooltipLayer = memo((): React.JSX.Element | null => {
  const reduce = useReducedMotion()
  const [tip, setTip] = useState<Tip | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean } | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)
  const openTimer = useRef(0)
  const lastClosed = useRef(Number.NEGATIVE_INFINITY)
  const current = useRef<HTMLElement | null>(null)

  // Adopt every title in the document, now and as the app renders.
  useEffect(() => {
    document.querySelectorAll('[title]').forEach(adoptTitle)
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') adoptTitle(r.target as Element)
        else
          r.addedNodes.forEach((n) => {
            if (n instanceof Element) {
              if (n.hasAttribute('title')) adoptTitle(n)
              n.querySelectorAll('[title]').forEach(adoptTitle)
            }
          })
      }
    })
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const close = (): void => {
      window.clearTimeout(openTimer.current)
      if (current.current) {
        current.current.removeAttribute('aria-describedby')
        lastClosed.current = performance.now()
      }
      current.current = null
      setTip(null)
      setPos(null)
    }
    const open = (target: HTMLElement, immediate: boolean): void => {
      if (current.current === target) return
      window.clearTimeout(openTimer.current)
      const show = (): void => {
        const next = readTip(target)
        if (!next || !target.isConnected) return
        if (current.current && current.current !== target) current.current.removeAttribute('aria-describedby')
        current.current = target
        target.setAttribute('aria-describedby', TIP_ID)
        setTip(next)
      }
      const warm = current.current !== null || performance.now() - lastClosed.current < WARM_MS
      if (immediate || warm) show()
      else openTimer.current = window.setTimeout(show, OPEN_DELAY_MS)
    }

    const onOver = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') return
      const target = tipTarget(e.target)
      if (target) open(target, false)
      else if (current.current || openTimer.current) close()
    }
    const onFocus = (e: FocusEvent): void => {
      const target = tipTarget(e.target)
      // Keyboard focus only: a click's focus should not pop a label up under the pointer.
      if (target && target.matches(':focus-visible')) open(target, true)
    }
    const onBlur = (e: FocusEvent): void => {
      if (current.current && e.target === current.current) close()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && current.current) close()
    }
    const onLeaveWindow = (e: PointerEvent): void => {
      if (!e.relatedTarget) close()
    }

    document.addEventListener('pointerover', onOver, true)
    document.addEventListener('pointerout', onLeaveWindow, true)
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('focusin', onFocus, true)
    document.addEventListener('focusout', onBlur, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('wheel', close, { passive: true, capture: true })
    window.addEventListener('blur', close)
    return () => {
      window.clearTimeout(openTimer.current)
      document.removeEventListener('pointerover', onOver, true)
      document.removeEventListener('pointerout', onLeaveWindow, true)
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('focusin', onFocus, true)
      document.removeEventListener('focusout', onBlur, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('wheel', close, true)
      window.removeEventListener('blur', close)
    }
  }, [])

  // Place it under its target, or above when there is no room, and inside the window.
  useLayoutEffect(() => {
    if (!tip || !boxRef.current) return
    const r = tip.target.getBoundingClientRect()
    const box = boxRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = r.bottom + GAP + box.height <= vh - EDGE
    const y = below ? r.bottom + GAP : Math.max(EDGE, r.top - GAP - box.height)
    const x = Math.min(Math.max(EDGE, r.left + r.width / 2 - box.width / 2), vw - EDGE - box.width)
    setPos({ x, y, above: !below })
  }, [tip])

  if (!tip) return null
  return (
    <div
      ref={boxRef}
      id={TIP_ID}
      role="tooltip"
      data-kissa-tooltip=""
      className="kissa-tooltip pointer-events-none fixed left-0 top-0 z-[1000] flex max-w-[min(320px,calc(100vw-16px))] items-center gap-2 rounded-[8px] px-2.5 py-[5px] font-sans text-[12.5px] font-medium leading-[1.35] tracking-[-0.003em] text-ink"
      style={{
        transform: pos ? `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px)` : 'translate(-9999px, -9999px)',
        animation: pos && !reduce ? `kissa-tooltip-in-${pos.above ? 'up' : 'down'} 140ms cubic-bezier(0.22, 1, 0.36, 1) both` : undefined
      }}
    >
      <span className="min-w-0 text-pretty">{tip.label}</span>
      {tip.keys.length > 0 && (
        <span className="flex shrink-0 items-center gap-0.5" aria-hidden="true">
          {tip.keys.map((k) => (
            <kbd key={k} className="kissa-keycap">
              {k}
            </kbd>
          ))}
        </span>
      )}
    </div>
  )
})

TooltipLayer.displayName = 'TooltipLayer'
