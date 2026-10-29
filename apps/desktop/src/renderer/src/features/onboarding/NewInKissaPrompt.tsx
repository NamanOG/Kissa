import { useEffect } from 'react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useNoticeStore } from '@renderer/stores/noticeStore'
import { useT } from '@renderer/i18n'
import { useGuideStore } from './guideStore'

/**
 * Once, for someone who already read the guide: a quiet card above the dock saying what is new,
 * with a way into just those pages. The guide button keeps a dot until they have been seen.
 */
export function NewInKissaPrompt(): null {
  const t = useT()
  useEffect(() => {
    const id = window.setTimeout(() => {
      const p = usePlayerStore.getState()
      let readGuide = false
      try {
        readGuide = localStorage.getItem('kissa_intro_seen_v3') === 'true'
      } catch {
        /* first run */
      }
      if (!readGuide || p.isOnboardingOpen || p.isSettingsOpen || p.isListeningDisplay) return
      if (!useGuideStore.getState().takePrompt()) return
      useNoticeStore.getState().show({
        id: 'new-in-kissa',
        title: t('guide.new.notice'),
        body: t('guide.new.noticeBody'),
        action: { label: t('guide.new.look'), run: () => useGuideStore.getState().openNew() },
        duration: 22000
      })
    }, 9000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
