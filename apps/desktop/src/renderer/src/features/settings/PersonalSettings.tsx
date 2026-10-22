import React, { memo } from 'react'
import { usePlayerStore, VINYL_COLORS } from '@renderer/stores/playerStore'
import { VINYL_PRESSINGS, pressingGroups, pressingSwatch } from '@renderer/features/vinyl/VinylBase'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { FINISH_PALETTES } from '@renderer/features/editions/editions'
import { cn } from '@renderer/utils/cn'
import { greetingFor } from '@renderer/utils/greeting'
import { Heart } from 'lucide-react'
import { SUPPORT_PAGE_URL, openSupportPage } from '@renderer/features/support/SupportKissaLink'

// Shared with SettingsModal; styled in assets/main.css (Settings).
const GROUP = 'kissa-set-group'
const ROW = 'kissa-set-row'
const HEADING = 'kissa-set-heading'

/** The colour of the record on the platter, and what Kissa calls you. */
export const RoomPersonalSettings = memo((): React.JSX.Element => {
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const setVinylColor = usePlayerStore((s) => s.setVinylColor)
  const listenerName = usePlayerStore((s) => s.listenerName)
  const setListenerName = usePlayerStore((s) => s.setListenerName)

  const finish = useEditionsStore((s) => s.finish)
  const editions = useEditionsStore((s) => s.editions)
  const openEditionEditor = useEditionsStore((s) => s.showEditor)

  return (
    <div>
      <h4 className={HEADING}>Make it yours</h4>
      <div className={GROUP}>
        <div className={ROW}>
          <div className="flex flex-col">
            <span className="text-[14px] font-medium text-ink">Your turntable</span>
            <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
              {FINISH_PALETTES[finish].name} finish
              {editions.length > 0 ? ` · ${editions.length} saved` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={openEditionEditor}
            className="shrink-0 h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/70"
          >
            Open
          </button>
        </div>
        <div className={ROW}>
          <div className="flex flex-col">
            <span className="text-[14px] font-medium text-ink">Pressing</span>
            <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{VINYL_PRESSINGS[vinylColor].name}</span>
          </div>
          <div role="radiogroup" aria-label="Record colour" className="flex flex-col items-end gap-2">
            {pressingGroups(VINYL_COLORS).map((group) => (
              <div key={group.label} className="flex items-center gap-1.5" aria-label={group.label} role="group">
                {group.colors.map((color) => {
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
                        'relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full outline-none transition-[box-shadow] duration-150',
                        'focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink/70',
                        selected
                          ? 'shadow-[0_0_0_1.5px_var(--on-surface)]'
                          : 'shadow-[0_0_0_1px_rgba(255,255,255,0.12)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.4)]'
                      )}
                      style={{ background: pressingSwatch(color) }}
                    >
                      <span className="h-[7px] w-[7px] rounded-full bg-[#d9cdb8]" />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className={ROW}>
          <label htmlFor="kissa-listener-name" className="flex flex-col">
            <span className="text-[14px] font-medium text-ink">Your name</span>
            <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
              {listenerName.trim()
                ? `“${greetingFor(new Date(), listenerName)}” on the deck, the shelf and share cards`
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
            className="h-8 w-[180px] shrink-0 select-text appearance-none rounded-full border border-ink/[0.16] px-3.5 text-[13px] text-ink outline-none transition-colors placeholder:text-dim/60 focus-visible:border-ink/50"
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
      <div className={ROW}>
        <span className="text-[14px] font-medium text-ink">Text size</span>
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
      <div className={ROW}>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-ink">Typeface</span>
          <span
            className={cn(
              'mt-0.5 text-[13px] text-dim',
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
    <>
    {SUPPORT_PAGE_URL && (
      <div className={ROW}>
        <div className="flex flex-col">
          <span className="text-[14px] font-medium text-ink">Support Kissa</span>
          <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
            If Kissa is part of your day, you can help keep it going. Opens Kissa&apos;s website.
          </span>
        </div>
        <button
          type="button"
          onClick={() => openSupportPage()}
          className="shrink-0 inline-flex h-8 items-center gap-1.5 px-4 rounded-full border border-tone/40 text-[12.5px] font-medium text-ink transition-colors hover:border-tone/70 cursor-pointer active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone"
        >
          <Heart aria-hidden="true" className="h-3 w-3 fill-tone text-tone" strokeWidth={1.75} />
          Support Kissa
        </button>
      </div>
    )}
    <div className={ROW}>
      <div className="flex flex-col">
        <span className="text-[14px] font-medium text-ink">Kissa</span>
        <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Made by GlyphCode. Free, with nothing locked.</span>
      </div>
      <button
        type="button"
        onClick={() => open('https://github.com/NamanOG/Kissa')}
        className="shrink-0 h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/70"
      >
        View on GitHub
      </button>
    </div>
    </>
  )
})
AboutRow.displayName = 'AboutRow'
