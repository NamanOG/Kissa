import React, { memo } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { greetingFor } from '@renderer/utils/greeting'
import { Heart } from 'lucide-react'
import { SUPPORT_PAGE_URL, openSupportPage } from '@renderer/features/support/SupportKissaLink'
import { openBugReport, openFeatureRequest } from '@renderer/features/support/feedback'
import { useT } from '@renderer/i18n'

// Shared with SettingsModal; styled in assets/main.css (Settings).
const ROW = 'kissa-set-row'

/** Settings buttons: a quiet glass pill, and the room's accent for the one main action. */
export const BTN =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/[0.07] px-4 text-[12.5px] font-medium text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-[background-color,transform] duration-150 hover:bg-white/[0.12] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone disabled:pointer-events-none disabled:opacity-50'
export const BTN_PRIMARY =
  'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-tone px-4 text-[12.5px] font-semibold text-[#170f09] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_6px_16px_rgba(0,0,0,0.3)] transition-[filter,transform] duration-150 hover:brightness-110 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone disabled:pointer-events-none disabled:opacity-50'

/** What Kissa calls you. */
export const ListenerNameRow = memo((): React.JSX.Element => {
  const t = useT()
  const listenerName = usePlayerStore((s) => s.listenerName)
  const setListenerName = usePlayerStore((s) => s.setListenerName)

  return (
    <div className={ROW}>
      <label htmlFor="kissa-listener-name" className="flex min-w-0 flex-col pr-2">
        <span className="text-[14px] font-medium text-ink">{t('general.name')}</span>
        <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
          {listenerName.trim()
            ? t('general.name.greeting', { greeting: greetingFor(new Date(), listenerName) })
            : t('general.name.desc')}
        </span>
      </label>
      <input
        id="kissa-listener-name"
        type="text"
        value={listenerName}
        onChange={(e) => setListenerName(e.target.value)}
        maxLength={24}
        placeholder={t('general.name.placeholder')}
        autoComplete="off"
        spellCheck={false}
        className="h-8 w-[190px] shrink-0 select-text appearance-none rounded-full bg-black/25 px-3.5 text-[13px] text-ink shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_2px_rgba(0,0,0,0.3)] outline-none transition-shadow placeholder:text-dim/70 focus-visible:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_color-mix(in_srgb,var(--accent)_22%,transparent)]"
      />
    </div>
  )
})
ListenerNameRow.displayName = 'ListenerNameRow'

/** Who made this. Lives here so the deck itself stays free of credits. */
export const AboutRow = memo((): React.JSX.Element => {
  const t = useT()
  const open = (url: string): void => {
    if (window.electron?.openExternal) void window.electron.openExternal(url)
    else window.open(url, '_blank', 'noopener,noreferrer')
  }
  return (
    <>
      {SUPPORT_PAGE_URL && (
        <div className={ROW}>
          <div className="flex min-w-0 flex-col pr-2">
            <span className="text-[14px] font-medium text-ink">{t('nav.support')}</span>
            <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
              {t('about.support.desc')}
            </span>
          </div>
          <button type="button" onClick={() => openSupportPage()} className={`${BTN} gap-1.5`}>
            <Heart aria-hidden="true" className="h-3 w-3 fill-tone text-tone" strokeWidth={1.75} />
            {t('nav.support')}
          </button>
        </div>
      )}
      <div className={ROW}>
        <div className="flex min-w-0 flex-col pr-2">
          <span className="text-[14px] font-medium text-ink">{t('feedback.title')}</span>
          <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{t('feedback.desc')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={openFeatureRequest} className={BTN}>
            {t('feedback.feature')}
          </button>
          <button type="button" onClick={() => void openBugReport()} className={BTN}>
            {t('feedback.bug')}
          </button>
        </div>
      </div>
      <div className={ROW}>
        <div className="flex min-w-0 flex-col pr-2">
          <span className="text-[14px] font-medium text-ink">GlyphCode</span>
          <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{t('about.made')}</span>
        </div>
        <button type="button" onClick={() => open('https://github.com/NamanOG/Kissa')} className={BTN}>
          {t('about.github')}
        </button>
      </div>
    </>
  )
})
AboutRow.displayName = 'AboutRow'
