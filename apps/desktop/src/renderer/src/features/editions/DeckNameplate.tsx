import React, { memo } from 'react'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { FINISH_PALETTES } from './editions'
import { tl } from '@renderer/i18n'

/**
 * The model nameplate engraved on the deck's front edge, as on real hi-fi. It names the
 * current finish and is the way into Kissa Editions from the Deck (the E key does the same).
 * Static: it redraws only when the finish changes.
 */
export const DeckNameplate = memo((): React.JSX.Element => {
  const finish = useEditionsStore((s) => s.finish)
  const isOpen = useEditionsStore((s) => s.isEditorOpen)
  const showEditor = useEditionsStore((s) => s.showEditor)
  const name = (FINISH_PALETTES[finish] ?? FINISH_PALETTES.original).name

  return (
    <div
      className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
      // The front edge of the plinth: y 650 to 688 of the deck's 700-unit drawing.
      style={{ top: '92.9%', height: '5.4%', opacity: 'calc(0.45 + 0.55 * var(--room-illumination, 1))' }}
    >
      <button
        type="button"
        onClick={showEditor}
        aria-label={`Kissa Edition: ${name}. Change your turntable`}
        aria-expanded={isOpen}
        title={tl('a11y.changeTurntable')}
        // Printed on the front edge in the app's sans, softly lit, like a modern product mark.
        className="group pointer-events-auto flex h-full cursor-pointer items-center gap-[0.7em] rounded-[3px] px-3 font-sans text-[9.5px] font-medium tracking-[0.01em] text-[color:var(--deck-plate,#b0a08c)] opacity-90 transition-[opacity] duration-micro ease-primary hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d7a76c]"
        data-deck-badge=""
      >
        <span>Kissa</span>
        <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-current opacity-50" />
        <span>{name}</span>
      </button>
    </div>
  )
})

DeckNameplate.displayName = 'DeckNameplate'
