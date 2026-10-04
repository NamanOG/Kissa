import React, { memo } from 'react'
import { Check } from 'lucide-react'
import { usePlayerStore, VINYL_COLORS } from '@renderer/stores/playerStore'
import { VINYL_PRESSINGS } from '@renderer/features/vinyl/VinylBase'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { cn } from '@renderer/utils/cn'
import { greetingFor } from '@renderer/utils/greeting'

const GROUP = 'rounded-2xl bg-[var(--on-surface)]/[0.03] border border-[var(--on-surface)]/[0.08] overflow-hidden flex flex-col'
const ROW = 'flex items-center justify-between gap-4 p-4 min-[600px]:px-5'
const HEADING = 'text-[11px] font-mono font-bold text-[var(--muted)] mb-2.5 tracking-[0.2em] uppercase'

/** The colour of the record on the platter, and what Kissa calls you. */
export const RoomPersonalSettings = memo((): React.JSX.Element => {
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const setListenerName = usePlayerStore((s) => s.setListenerName)

  return (
    <div>
      <h4 className={HEADING}>Make it yours</h4>
      <div className={GROUP}>
        <div className={cn(ROW, 'border-b border-[var(--on-surface)]/[0.06]')}>
          <div className="flex flex-col">
            <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Pressing</span>
            <span className="mt-0.5 text-[11.5px] text-[var(--muted)]">{VINYL_PRESSINGS[vinylColor].name}</span>
          </div>
          <div role="radiogroup" aria-label="Record colour" className="flex items-center gap-2">
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
                    'relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-full outline-none transition-transform duration-micro active:scale-95',
                    'focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                    selected ? 'ring-[1.5px] ring-[var(--accent)] ring-offset-2 ring-offset-[var(--surface)]' : 'hover:scale-105'
                  )}
                  style={{
                    background: `radial-gradient(circle, ${pressing.inner} 0%, ${pressing.outer} 100%)`,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 2px 6px rgba(0,0,0,0.5)'
                  }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.4)]" />
                  {selected && (
                    <Check aria-hidden="true" className="absolute h-3 w-3 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]" strokeWidth={3} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className={ROW}>
          <label htmlFor="kissa-listener-name" className="flex flex-col">
            <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Your name</span>
            <span className="mt-0.5 text-[11.5px] text-[var(--muted)]">
              {listenerName.trim()
                ? `“${greetingFor(new Date(), listenerName)}” — on the deck, the shelf and share cards`
                : 'Kissa greets you by it and names your shelf'}
            </span>
          </label>
          <input
            id="kissa-listener-name"
            type="text"
            value={listenerName}
            onChange={(e) => setListenerName(e.target.value)}
            maxLength={24}
            placeholder="Optional"
            autoComplete="off"
            spellCheck={false}
            style={{ backgroundColor: 'color-mix(in srgb, var(--on-surface) 6%, transparent)' }}
            className="w-[170px] shrink-0 select-text appearance-none rounded-xl border border-[var(--on-surface)]/10 px-3 py-1.5 text-[13px] text-[var(--on-surface)] outline-none placeholder:text-[var(--muted)]/60 focus-visible:border-[var(--accent)]"
          />
        </div>
      </div>
    </div>
  )
})
RoomPersonalSettings.displayName = 'RoomPersonalSettings'

/** How the lyrics are set: size and typeface. */
export const LyricsAppearanceRows = memo((): React.JSX.Element => {
  const lyricsSize = usePlayerStore((s) => s.lyricsSize)
  const setLyricsSize = usePlayerStore((s) => s.setLyricsSize)
  const lyricsFace = usePlayerStore((s) => s.lyricsFace)
  const setLyricsFace = usePlayerStore((s) => s.setLyricsFace)

  return (
    <>
      <div className={cn(ROW, 'border-b border-[var(--on-surface)]/[0.06]')}>
        <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Text Size</span>
        <SegmentedTabs
          kind="radio"
          size="sm"
          label="Lyrics text size"
          value={lyricsSize}
          onChange={setLyricsSize}
          tabs={[
            { id: 's', label: 'Small' },
            { id: 'm', label: 'Medium' },
            { id: 'l', label: 'Large' }
          ]}
        />
      </div>
      <div className={cn(ROW, 'border-b border-[var(--on-surface)]/[0.06]')}>
        <div className="flex flex-col">
          <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Typeface</span>
          <span
            className={cn(
              'mt-0.5 text-[13px] text-[var(--muted)]',
              lyricsFace === 'serif' ? 'font-kissa-editorial text-[14.5px]' : 'font-kissa-lyrics'
            )}
          >
            Word by word, in time
          </span>
        </div>
        <SegmentedTabs
          kind="radio"
          size="sm"
          label="Lyrics typeface"
          value={lyricsFace}
          onChange={setLyricsFace}
          tabs={[
            { id: 'sans', label: 'Sans' },
            { id: 'serif', label: 'Serif' }
          ]}
        />
      </div>
    </>
  )
})
LyricsAppearanceRows.displayName = 'LyricsAppearanceRows'

/** Who made this. Lives here so the deck itself stays free of credits. */
export const AboutRow = memo((): React.JSX.Element => {
  const open = (url: string): void => {
    if (window.electron?.openExternal) void window.electron.openExternal(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <div className={cn(ROW, 'border-t border-[var(--on-surface)]/[0.06]')}>
      <div className="flex flex-col">
        <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Kissa</span>
        <span className="mt-0.5 text-[11.5px] text-[var(--muted)]">Made by GlyphCode · free to use</span>
      </div>
      <button
        type="button"
        onClick={() => open('https://github.com/NamanOG/Kissa')}
        className="shrink-0 cursor-pointer rounded-xl border border-[var(--on-surface)]/10 bg-[var(--on-surface)]/[0.06] px-3.5 py-1.5 text-[12px] font-bold text-[var(--on-surface)] transition-colors hover:bg-[var(--on-surface)]/[0.12] active:scale-95"
      >
        View on GitHub
      </button>
    </div>
  )
})
AboutRow.displayName = 'AboutRow'
