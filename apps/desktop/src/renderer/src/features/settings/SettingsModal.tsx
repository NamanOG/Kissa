import React, { memo, useState, useEffect, useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, MicVocal, Minus, MonitorPlay, Plus, Settings, UsersRound, X } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { useFeaturesStore } from '@renderer/stores/featuresStore'
import { usePlayerStore, type SettingsTab } from '@renderer/stores/playerStore'
import { useEditionsStore } from '@renderer/stores/editionsStore'
import { FINISH_PALETTES } from '@renderer/features/editions/editions'
import { VINYL_PRESSINGS } from '@renderer/features/vinyl/VinylBase'
import { TurntableIcon } from '@renderer/components/layout/TurntableIcon'
import { brandMarkSrc, brandMarkSrcSet } from '@renderer/utils/brandMark'
import { LANGUAGES, useLanguageStore, useT, type MessageKey } from '@renderer/i18n'
import { useStudyStore } from '@renderer/stores/studyStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { IconTile, TILE, type TileIcon, type TileTint } from '@renderer/components/ui/IconTile'
import { AboutRow, BTN, BTN_PRIMARY, ListenerNameRow } from './PersonalSettings'
import { DiscordPresenceRow } from './DiscordPresenceRow'
import { GraphicsRow } from './GraphicsRow'
import { cn } from '@renderer/utils/cn'
import { checkForUpdates, KISSA_RELEASES_URL } from '@renderer/utils/updater'
import type { UpdateStatusPayload } from '../../../../types/update'

const SETTINGS_SECTIONS: ReadonlyArray<{
  id: SettingsTab
  label: MessageKey
  hint: MessageKey
  icon: TileIcon | 'brand'
  tint: TileTint
}> = [
  { id: 'general', label: 'settings.general', hint: 'settings.general.hint', icon: Settings, tint: TILE.graphite },
  { id: 'turntable', label: 'settings.turntable', hint: 'settings.turntable.hint', icon: TurntableIcon, tint: TILE.amber },
  { id: 'lyrics', label: 'settings.lyrics', hint: 'settings.lyrics.hint', icon: MicVocal, tint: TILE.rose },
  { id: 'screensaver', label: 'settings.screensaver', hint: 'settings.screensaver.hint', icon: MonitorPlay, tint: TILE.indigo },
  { id: 'sharing', label: 'settings.sharing', hint: 'settings.sharing.hint', icon: UsersRound, tint: TILE.teal },
  { id: 'about', label: 'settings.about', hint: 'settings.about.hint', icon: 'brand', tint: TILE.ink }
]

// Settings rows and groups, styled in assets/main.css (Settings).
const ROW = 'kissa-set-row'
const GROUP = 'kissa-set-group'
const HEADING = 'kissa-set-heading'

export interface SettingsModalProps {
  className?: string
}

/**
 * Settings: a preferences window with one tile per section. The room, finish and pressing are
 * chosen in Your turntable (beside the live deck); Settings shows them and links there.
 */
export const SettingsModal = memo(({ className }: SettingsModalProps): React.JSX.Element | null => {
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, isSettingsOpen)
  const isStudyActive = useStudyStore((s) => s.active !== null)
  const toggleSettings = usePlayerStore((s) => s.toggleSettings)
  const currentTheme = usePlayerStore((s) => s.theme)
  const t = useT()
  const languageChoice = useLanguageStore((s) => s.choice)
  const setLanguageChoice = useLanguageStore((s) => s.setChoice)
  const lyricsSize = usePlayerStore((s) => s.lyricsSize)
  const setLyricsSize = usePlayerStore((s) => s.setLyricsSize)
  const lyricsFace = usePlayerStore((s) => s.lyricsFace)
  const setLyricsFace = usePlayerStore((s) => s.setLyricsFace)
  const vinylColor = usePlayerStore((s) => s.vinylColor)
  const finish = useEditionsStore((s) => s.finish)
  const editions = useEditionsStore((s) => s.editions)
  const showEditor = useEditionsStore((s) => s.showEditor)
  const rpm = usePlayerStore((s) => s.rpm)
  const setRpm = usePlayerStore((s) => s.setRpm)
  const needleSound = usePlayerStore((s) => s.needleSound)
  const setNeedleSound = usePlayerStore((s) => s.setNeedleSound)
  const autoScrollLyrics = usePlayerStore((s) => s.autoScrollLyrics)
  const ambientMotion = usePlayerStore((s) => s.ambientMotion)
  const setAmbientMotion = usePlayerStore((s) => s.setAmbientMotion)
  const setAutoScrollLyrics = usePlayerStore((s) => s.setAutoScrollLyrics)
  const lyricsOffset = usePlayerStore((s) => s.lyricsOffset)
  const setLyricsOffset = usePlayerStore((s) => s.setLyricsOffset)
  const physicalFeedback = usePlayerStore((s) => s.physicalFeedback)
  const setPhysicalFeedback = usePlayerStore((s) => s.setPhysicalFeedback)
  const miniPlayerAlwaysOnTop = usePlayerStore((s) => s.miniPlayerAlwaysOnTop)
  const setMiniPlayerAlwaysOnTop = usePlayerStore((s) => s.setMiniPlayerAlwaysOnTop)
  const startWithWindows = usePlayerStore((s) => s.startWithWindows)
  const setStartWithWindows = usePlayerStore((s) => s.setStartWithWindows)
  const runInBackground = usePlayerStore((s) => s.runInBackground)
  const trackToast = useFeaturesStore((s) => s.trackToast)
  const setTrackToast = useFeaturesStore((s) => s.setTrackToast)
  const followDaylight = useFeaturesStore((s) => s.followDaylight)
  const setFollowDaylight = useFeaturesStore((s) => s.setFollowDaylight)
  const soundLight = useFeaturesStore((s) => s.soundLight)
  const setSoundLight = useFeaturesStore((s) => s.setSoundLight)
  const albumSides = useFeaturesStore((s) => s.albumSides)
  const setAlbumSides = useFeaturesStore((s) => s.setAlbumSides)
  const dustCover = useFeaturesStore((s) => s.dustCover)
  const setDustCover = useFeaturesStore((s) => s.setDustCover)
  const closingTime = useFeaturesStore((s) => s.closingTime)
  const setClosingTime = useFeaturesStore((s) => s.setClosingTime)
  const closingHour = useFeaturesStore((s) => s.closingHour)
  const setClosingHour = useFeaturesStore((s) => s.setClosingHour)
  const sessionWrap = useFeaturesStore((s) => s.sessionWrap)
  const setSessionWrap = useFeaturesStore((s) => s.setSessionWrap)
  const setRunInBackground = usePlayerStore((s) => s.setRunInBackground)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const toggleScreensaverLyrics = usePlayerStore((s) => s.toggleScreensaverLyrics)
  const settingsTab = usePlayerStore((s) => s.settingsTab)
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const room = LISTENING_ENVIRONMENTS.find((env) => env.id === currentTheme)
  const albumCover = artworkUrl && !artworkUrl.includes('placeholder-album') ? artworkUrl : undefined
  const roomImage = currentTheme === 'adaptive' ? albumCover : room?.image
  const roomName = currentTheme === 'adaptive' ? t('turntable.match') : room?.name ?? t('upd.yourRoom')
  const setSettingsTab = usePlayerStore((s) => s.setSettingsTab)

  const [appVersion, setAppVersion] = useState<string>('')
  const [updatePayload, setUpdatePayload] = useState<UpdateStatusPayload | null>(null)
  const [isConfirmingRestart, setIsConfirmingRestart] = useState<boolean>(false)
  const [isScreensaverRegistered, setIsScreensaverRegistered] = useState<boolean>(false)
  const [isScreensaverWorking, setIsScreensaverWorking] = useState<boolean>(false)
  // Store build: Windows has to make the change, so Kissa shows the file and says what to do.
  const [showScreensaverSteps, setShowScreensaverSteps] = useState<boolean>(false)

  const currentState = updatePayload?.state || 'idle'
  // Microsoft Store build: the Store delivers updates, so there is nothing to check here.
  const isStoreManaged = Boolean(updatePayload?.isStoreManaged)

  useEffect(() => {
    if (isSettingsOpen) {
      if (window.electron?.getUpdateStatus) {
        window.electron.getUpdateStatus().then((payload) => {
          if (payload) {
            setUpdatePayload(payload)
            if (payload.currentVersion) setAppVersion(payload.currentVersion)
          }
        }).catch(console.error)
      }
      if (!appVersion && window.electron?.getAppVersion) {
        window.electron.getAppVersion().then(setAppVersion).catch(console.error)
      }
    }
  }, [isSettingsOpen, appVersion])

  useEffect(() => {
    if (!window.electron?.onUpdateStatusChanged) return
    const unsubscribe = window.electron.onUpdateStatusChanged((payload) => {
      setUpdatePayload(payload)
      if (payload.currentVersion) setAppVersion(payload.currentVersion)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleCheckUpdate = async () => {
    if (currentState === 'checking' || currentState === 'downloading') return
    setIsConfirmingRestart(false)

    if (window.electron?.checkForUpdates) {
      try {
        const payload = await window.electron.checkForUpdates()
        if (payload) {
          setUpdatePayload(payload)
          if (payload.currentVersion) setAppVersion(payload.currentVersion)
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[Update Check Error]', err)
        }
      }
      return
    }

    let ver = appVersion
    if (!ver && window.electron?.getAppVersion) {
      try {
        ver = await window.electron.getAppVersion()
        setAppVersion(ver)
      } catch {
        ver = ''
      }
    }
    if (!ver) {
      setUpdatePayload({
        state: 'error',
        currentVersion: '',
        updateInfo: null,
        progress: null,
        downloadedFilePath: null,
        error: 'Current version is required to check for updates.',
        isScreensaverActive: false,
        isPortable: false
      })
      return
    }

    setUpdatePayload({
      state: 'checking',
      currentVersion: ver,
      updateInfo: null,
      progress: null,
      downloadedFilePath: null,
      error: null,
      isScreensaverActive: false,
      isPortable: false
    })

    try {
      const [result] = await Promise.all([
        checkForUpdates(ver),
        new Promise((resolve) => setTimeout(resolve, 500))
      ])
      if (result.hasUpdate) {
        setUpdatePayload({
          state: 'available',
          currentVersion: ver,
          updateInfo: {
            version: result.version,
            releaseName: result.version,
            assetName: `Kissa-Setup-${result.version}.exe`,
            assetSize: 0,
            downloadUrl: result.url,
            isPortable: false
          },
          progress: null,
          downloadedFilePath: null,
          error: null,
          isScreensaverActive: false,
          isPortable: false
        })
      } else {
        setUpdatePayload({
          state: 'up-to-date',
          currentVersion: ver,
          updateInfo: null,
          progress: null,
          downloadedFilePath: null,
          error: null,
          isScreensaverActive: false,
          isPortable: false
        })
      }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[Update Check Error]', err)
      }
      setUpdatePayload({
        state: 'error',
        currentVersion: ver,
        updateInfo: null,
        progress: null,
        downloadedFilePath: null,
        error: err?.message || t('upd.error'),
        isScreensaverActive: false,
        isPortable: false
      })
    }
  }

  const handleDownloadUpdate = async () => {
    if (window.electron?.downloadUpdate) {
      try {
        const payload = await window.electron.downloadUpdate()
        setUpdatePayload(payload)
      } catch (err) {
        console.error('[Download update Error]', err)
      }
    }
  }

  const handleCancelDownload = async () => {
    if (window.electron?.cancelUpdate) {
      try {
        const payload = await window.electron.cancelUpdate()
        setUpdatePayload(payload)
      } catch (err) {
        console.error('[Cancel Update Error]', err)
      }
    }
  }

  const handleInstallUpdate = () => {
    if (updatePayload?.isPortable) {
      window.electron?.installUpdate?.().catch(console.error)
    } else {
      setIsConfirmingRestart(true)
    }
  }

  const handleConfirmRestart = async () => {
    setIsConfirmingRestart(false)
    if (window.electron?.installUpdate) {
      try {
        await window.electron.installUpdate()
      } catch (err) {
        console.error('[Install Update Error]', err)
      }
    }
  }

  useEffect(() => {
    if (isSettingsOpen) {
      window.electron?.isScreensaverRegistered?.()
        .then((registered) => setIsScreensaverRegistered(Boolean(registered)))
        .catch(console.error)
    }
  }, [isSettingsOpen])

  const handleRegisterScreensaver = async () => {
    if (isScreensaverWorking) return
    setIsScreensaverWorking(true)
    try {
      const res = await window.electron?.registerScreensaver?.()
      if (res?.success) {
        setIsScreensaverRegistered(true)
      } else if (res?.manual) {
        setShowScreensaverSteps(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsScreensaverWorking(false)
    }
  }

  // The listener finishes the Store build's setup in Windows, so look again when they come back.
  useEffect(() => {
    if (!isSettingsOpen) return
    const recheck = (): void => {
      window.electron
        ?.isScreensaverRegistered?.()
        .then((registered) => {
          setIsScreensaverRegistered(Boolean(registered))
          if (registered) setShowScreensaverSteps(false)
        })
        .catch(() => {})
    }
    window.addEventListener('focus', recheck)
    return () => window.removeEventListener('focus', recheck)
  }, [isSettingsOpen])

  const handleUnregisterScreensaver = async () => {
    if (isScreensaverWorking) return
    setIsScreensaverWorking(true)
    try {
      const res = await window.electron?.unregisterScreensaver?.()
      if (res?.success) {
        setIsScreensaverRegistered(false)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsScreensaverWorking(false)
    }
  }

  const handleOpenScreensaverSettings = async (): Promise<void> => {
    if (window.electron?.openScreensaverSettings) {
      try {
        await window.electron.openScreensaverSettings()
      } catch (err) {
        console.warn('Failed to open Windows screensaver settings:', err)
      }
    }
  }

  const section = SETTINGS_SECTIONS.find((x) => x.id === settingsTab) ?? SETTINGS_SECTIONS[0]
  const openEditor = (): void => {
    usePlayerStore.getState().setIsSettingsOpen(false)
    showEditor()
  }

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-[640px]:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/55 backdrop-blur-[6px]"
            onClick={toggleSettings}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('settings.title')}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              // One fixed size for every section, so switching sections never resizes the window.
              'relative z-50 flex h-[min(760px,90vh)] w-full max-w-[1040px] overflow-hidden rounded-[28px] select-none border border-white/[0.08] kissa-sheet [transform:translateZ(0)]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* The index: one tile per section, like a system preferences window. */}
            <nav
              aria-label={t('settings.title')}
              className="relative flex w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-black/[0.12] px-4 pb-6 pt-7 max-[760px]:w-[72px] max-[760px]:items-center max-[760px]:px-2"
            >
              <h2 className="px-3 font-kissa-editorial text-[26px] leading-none text-ink max-[760px]:sr-only">{t('settings.title')}</h2>

              <div role="tablist" aria-orientation="vertical" aria-label={t('settings.title')} className="mt-6 flex flex-col gap-0.5 max-[760px]:mt-2">
                {SETTINGS_SECTIONS.map((item, i) => {
                  const selected = section.id === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      id={`settings-tab-${item.id}`}
                      aria-selected={selected}
                      aria-controls="settings-panel"
                      tabIndex={selected ? 0 : -1}
                      title={t(item.label)}
                      onClick={() => setSettingsTab(item.id)}
                      onKeyDown={(e) => {
                        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
                        if (!step) return
                        e.preventDefault()
                        const next = SETTINGS_SECTIONS[(i + step + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length]
                        setSettingsTab(next.id)
                        document.getElementById(`settings-tab-${next.id}`)?.focus()
                      }}
                      className={cn(
                        'relative flex cursor-pointer items-center gap-3 rounded-[11px] px-2.5 py-2 text-left outline-none transition-colors duration-150 max-[760px]:px-2',
                        'focus-visible:ring-2 focus-visible:ring-tone/70',
                        selected ? 'text-ink' : 'text-ink/70 hover:bg-white/[0.04] hover:text-ink'
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="settings-section-plate"
                          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 rounded-[11px] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                        />
                      )}
                      <IconTile icon={item.icon} tint={item.tint} />
                      <span className="relative text-[14px] font-medium max-[760px]:sr-only">{t(item.label)}</span>
                    </button>
                  )
                })}
              </div>

              <p className="mt-auto flex items-center gap-2 px-3 text-[12px] leading-snug text-dim max-[760px]:hidden">
                <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                {t('settings.local')}
              </p>
            </nav>

            <button
              type="button"
              onClick={toggleSettings}
              className="absolute right-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-dim shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors hover:bg-white/[0.12] hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-tone"
              aria-label={t('settings.close')}
            >
              <X className="h-4 w-4" />
            </button>

            <div
              id="settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${section.id}`}
              className="min-w-0 flex-1 overflow-y-auto px-10 pb-12 pt-8 no-scrollbar overscroll-contain [transform:translateZ(0)] [mask-image:linear-gradient(to_bottom,#000_calc(100%-40px),transparent)] max-[720px]:px-6"
            >
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-[680px] space-y-8"
              >
              <header className="flex items-center gap-4 pr-10">
                <IconTile icon={section.icon} tint={section.tint} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-kissa-editorial text-[30px] leading-[1.05] text-ink">{t(section.label)}</h3>
                  <p className="mt-1 text-[13px] text-dim">{t(section.hint)}</p>
                </div>
              </header>

              {section.id === 'general' && (
                <>
                  <Group>
                    <Row title={t('general.language')} desc={t('general.language.desc')}>
                      <SegmentedTabs
                        kind="radio"
                        size="sm"
                        label={t('general.language')}
                        value={languageChoice}
                        onChange={setLanguageChoice}
                        tabs={[
                          { id: 'auto', label: t('general.language.auto') },
                          ...LANGUAGES.map((l) => ({ id: l.id, label: l.name }))
                        ]}
                      />
                    </Row>
                  </Group>

                  <Group heading={t('general.you')}>
                    <ListenerNameRow />
                  </Group>

                  <Group heading={t('general.windows')}>
                    <Row title={t('general.startup')} desc={t('general.startup.desc')}>
                      <HardwareSwitch checked={startWithWindows} onChange={setStartWithWindows} aria-label={t('general.startup')} />
                    </Row>
                    <Row title={t('general.tray')} desc={t('general.tray.desc')}>
                      <HardwareSwitch checked={runInBackground} onChange={setRunInBackground} aria-label={t('general.tray')} />
                    </Row>
                    <Row title={t('general.ontop')} desc={t('general.ontop.desc')}>
                      <HardwareSwitch checked={miniPlayerAlwaysOnTop} onChange={setMiniPlayerAlwaysOnTop} aria-label={t('general.ontop')} />
                    </Row>
                    <Row title={t('general.toast')} desc={t('general.toast.desc')}>
                      <HardwareSwitch checked={trackToast} onChange={setTrackToast} aria-label={t('general.toast')} />
                    </Row>
                  </Group>

                  <Group heading={t('general.performance')}>
                    <GraphicsRow />
                  </Group>

                  <Group heading={t('general.help')}>
                    <Row title={t('general.tour')} desc={t('general.tour.desc')}>
                      <button
                        type="button"
                        onClick={() => {
                          toggleSettings()
                          usePlayerStore.getState().setIsOnboardingOpen(true)
                        }}
                        className={BTN}
                      >
                        {t('general.tour.action')}
                      </button>
                    </Row>
                  </Group>
                </>
              )}

              {section.id === 'turntable' && (
                <>
                  {/* The look, shown rather than listed. Changing it happens in Your turntable, beside the live deck. */}
                  <div className="relative overflow-hidden rounded-[20px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.7),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                    <div className="absolute inset-0">
                      {roomImage &&
                        (currentTheme === 'adaptive' ? (
                          <img src={roomImage} alt="" draggable={false} className="h-full w-full scale-125 object-cover blur-2xl saturate-150" />
                        ) : (
                          <img src={roomImage} alt="" draggable={false} className="h-full w-full object-cover" />
                        ))}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.45)_55%,rgba(0,0,0,0.1)_100%)]" />
                    </div>
                    {currentTheme === 'adaptive' && albumCover && (
                      <img
                        src={albumCover}
                        alt=""
                        draggable={false}
                        className="absolute right-7 top-1/2 h-[128px] w-[128px] -translate-y-1/2 rounded-[10px] object-cover shadow-[0_16px_32px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.1)] max-[860px]:hidden"
                      />
                    )}
                    <div className="relative flex min-h-[188px] flex-col justify-end gap-4 p-6">
                      <div>
                        <span className="text-[12.5px] font-medium text-white/70">{t('turntable.listening')}</span>
                        <p className="mt-0.5 font-kissa-editorial text-[28px] leading-[1.05] text-white">{roomName}</p>
                        <p className="mt-1.5 text-[13px] text-white/75">
                          {t('turntable.finish', { finish: FINISH_PALETTES[finish].name })}
                          {' · '}
                          {VINYL_PRESSINGS[vinylColor].name}
                          {editions.length > 0 ? ` · ${t('turntable.saved', { count: editions.length })}` : ''}
                        </p>
                      </div>
                      <button type="button" onClick={openEditor} className={cn(BTN_PRIMARY, 'w-fit gap-2')}>
                        <TurntableIcon className="h-4 w-4" strokeWidth={1.8} />
                        {t('turntable.change')}
                      </button>
                    </div>
                  </div>

                  <Group heading={t('turntable.light')}>
                    <Row
                      title={t('turntable.moving')}
                      desc={currentTheme === 'adaptive' ? t('turntable.moving.on') : t('turntable.moving.off')}
                    >
                      <HardwareSwitch
                        checked={ambientMotion}
                        onChange={setAmbientMotion}
                        disabled={currentTheme !== 'adaptive'}
                        aria-label={t('turntable.moving')}
                      />
                    </Row>
                    <Row title={t('turntable.daylight')} desc={t('turntable.daylight.desc')}>
                      <HardwareSwitch checked={followDaylight} onChange={setFollowDaylight} aria-label={t('turntable.daylight')} />
                    </Row>
                  </Group>

                  <Group heading={t('turntable.sound')}>
                    <Row title={t('turntable.soundLight')} desc={t('turntable.soundLight.desc')}>
                      <HardwareSwitch checked={soundLight} onChange={setSoundLight} aria-label={t('turntable.soundLight')} />
                    </Row>
                  </Group>
                  <p className="-mt-3 px-1 text-[12px] leading-relaxed text-dim">{t('turntable.sound.note')}</p>

                  <Group heading={t('turntable.evening')}>
                    <Row title={t('turntable.closing')} desc={t('turntable.closing.desc')}>
                      <div className="flex items-center gap-3">
                        {closingTime && (
                          <div className="flex h-8 items-center rounded-full bg-black/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                            <button type="button" onClick={() => setClosingHour((closingHour + 23) % 24)} className="flex h-full w-9 cursor-pointer items-center justify-center rounded-l-full text-dim transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60" aria-label={t('turntable.closing.earlier')} title={t('turntable.closing.earlier')}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[64px] px-1 text-center text-[12.5px] font-medium tabular-nums text-ink" data-testid="closing-hour">
                              {formatHour(closingHour)}
                            </span>
                            <button type="button" onClick={() => setClosingHour((closingHour + 1) % 24)} className="flex h-full w-9 cursor-pointer items-center justify-center rounded-r-full text-dim transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60" aria-label={t('turntable.closing.later')} title={t('turntable.closing.later')}>
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <HardwareSwitch checked={closingTime} onChange={setClosingTime} aria-label={t('turntable.closing')} />
                      </div>
                    </Row>
                    <Row title={t('turntable.wrap')} desc={t('turntable.wrap.desc')}>
                      <HardwareSwitch checked={sessionWrap} onChange={setSessionWrap} aria-label={t('turntable.wrap')} />
                    </Row>
                  </Group>

                  <Group heading={t('turntable.deck')}>
                    <Row title={t('turntable.speed')}>
                      <SegmentedTabs
                        kind="radio"
                        size="sm"
                        label={t('turntable.speed')}
                        value={rpm}
                        onChange={setRpm}
                        tabs={[
                          { id: '33', label: '33 rpm' },
                          { id: '45', label: '45 rpm' }
                        ]}
                      />
                    </Row>
                    <Row title={t('turntable.sounds')} desc={t('turntable.sounds.desc')}>
                      <HardwareSwitch checked={needleSound} onChange={setNeedleSound} aria-label={t('turntable.sounds')} />
                    </Row>
                    <Row title={t('turntable.feedback')} desc={t('turntable.feedback.desc')}>
                      <HardwareSwitch checked={physicalFeedback} onChange={setPhysicalFeedback} aria-label={t('turntable.feedback')} />
                    </Row>
                    <Row title={t('turntable.cover')} desc={t('turntable.cover.desc')}>
                      <HardwareSwitch checked={dustCover} onChange={setDustCover} aria-label={t('turntable.cover')} />
                    </Row>
                    <Row title={t('turntable.sides')} desc={t('turntable.sides.desc')}>
                      <HardwareSwitch checked={albumSides} onChange={setAlbumSides} aria-label={t('turntable.sides')} />
                    </Row>
                  </Group>
                </>
              )}

              {section.id === 'lyrics' && (
                <>
                  {/* A line set exactly as the Lyrics view will set it. */}
                  <div className="flex min-h-[132px] items-center justify-center overflow-hidden rounded-[20px] bg-[radial-gradient(120%_140%_at_20%_0%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_60%)] px-8 py-7 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                    <p
                      className={cn(
                        'text-center leading-[1.15] text-ink transition-[font-size] duration-200',
                        lyricsFace === 'serif' ? 'font-kissa-editorial' : 'font-kissa-lyrics font-semibold tracking-[-0.01em]',
                        lyricsSize === 's' ? 'text-[22px]' : lyricsSize === 'l' ? 'text-[36px]' : 'text-[29px]'
                      )}
                    >
                      {t('lyrics.preview')}
                    </p>
                  </div>

                  <Group heading={t('lyrics.onscreen')}>
                    <Row title={t('lyrics.size')}>
                      <SegmentedTabs
                        kind="radio"
                        size="sm"
                        label={t('lyrics.size')}
                        value={lyricsSize}
                        onChange={setLyricsSize}
                        tabs={[
                          { id: 's', label: t('lyrics.size.s') },
                          { id: 'm', label: t('lyrics.size.m') },
                          { id: 'l', label: t('lyrics.size.l') }
                        ]}
                      />
                    </Row>
                    <Row title={t('lyrics.face')}>
                      <SegmentedTabs
                        kind="radio"
                        size="sm"
                        label={t('lyrics.face')}
                        value={lyricsFace}
                        onChange={setLyricsFace}
                        tabs={[
                          { id: 'sans', label: 'Sans' },
                          { id: 'serif', label: 'Serif' }
                        ]}
                      />
                    </Row>
                    <Row title={t('lyrics.follow')} desc={t('lyrics.follow.desc')}>
                      <HardwareSwitch checked={autoScrollLyrics} onChange={setAutoScrollLyrics} aria-label={t('lyrics.follow')} />
                    </Row>
                    <Row title={t('lyrics.timing')} desc={t('lyrics.timing.desc')}>
                      <div className="flex h-8 items-center rounded-full bg-black/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                        <button
                          type="button"
                          onClick={() => setLyricsOffset(Math.max(-2.0, Math.round((lyricsOffset - 0.1) * 10) / 10))}
                          className="flex h-full w-9 cursor-pointer items-center justify-center rounded-l-full text-dim transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                          aria-label={t('lyrics.earlier')}
                          title={t('lyrics.earlier')}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLyricsOffset(0)}
                          className="h-full min-w-[60px] cursor-pointer px-2 text-center text-[12.5px] font-medium tabular-nums text-ink transition-colors hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                          aria-label={`${t('lyrics.timing')} ${lyricsOffset.toFixed(1)} s. ${t('lyrics.reset')}`}
                          title={t('lyrics.reset')}
                        >
                          {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)} s` : `${lyricsOffset.toFixed(1)} s`}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLyricsOffset(Math.min(2.0, Math.round((lyricsOffset + 0.1) * 10) / 10))}
                          className="flex h-full w-9 cursor-pointer items-center justify-center rounded-r-full text-dim transition-colors hover:bg-white/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                          aria-label={t('lyrics.later')}
                          title={t('lyrics.later')}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </Row>
                  </Group>
                </>
              )}

              {section.id === 'screensaver' && (
                <>
                <Group>
                  <Row title={t('saver.display')} desc={t('saver.display.desc')}>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSettings()
                        usePlayerStore.getState().setIsListeningDisplay(true)
                      }}
                      className={BTN_PRIMARY}
                    >
                      {t('saver.display.action')}
                    </button>
                  </Row>
                </Group>
                <Group heading={t('saver.windows')}>
                  <Row
                    title={t('saver.use')}
                    desc={isScreensaverRegistered ? t('saver.on') : showScreensaverSteps ? t('saver.steps') : t('saver.off')}
                  >
                    {isScreensaverRegistered ? (
                      <button type="button" onClick={handleUnregisterScreensaver} disabled={isScreensaverWorking} className={BTN}>
                        {isScreensaverWorking ? t('saver.removing') : isStoreManaged ? t('saver.changeInWindows') : t('saver.stop')}
                      </button>
                    ) : (
                      <button type="button" onClick={handleRegisterScreensaver} disabled={isScreensaverWorking} className={BTN_PRIMARY}>
                        {isScreensaverWorking ? t('saver.setting') : isStoreManaged ? t('saver.setUp') : t('saver.useKissa')}
                      </button>
                    )}
                  </Row>
                  <Row title={t('saver.timing')} desc={t('saver.timing.desc')}>
                    <button type="button" onClick={handleOpenScreensaverSettings} className={BTN}>
                      {t('saver.openWindows')}
                    </button>
                  </Row>
                  <Row title={t('saver.lyrics')} desc={t('saver.lyrics.desc')}>
                    <HardwareSwitch checked={screensaverLyrics} onChange={toggleScreensaverLyrics} aria-label={t('saver.lyrics')} />
                  </Row>
                </Group>
                </>
              )}

              {section.id === 'sharing' && (
                <Group heading={t('sharing.discord')}>
                  <DiscordPresenceRow />
                </Group>
              )}

              {section.id === 'about' && (
                <>
                  <div className="flex items-center gap-5 rounded-[20px] bg-white/[0.03] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]">
                    <img
                      src={brandMarkSrc}
                      srcSet={brandMarkSrcSet}
                      sizes="64px"
                      alt=""
                      draggable={false}
                      className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_10px_24px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.12)]"
                    />
                    <div className="min-w-0">
                      <p className="font-kissa-editorial text-[28px] leading-none text-ink">Kissa</p>
                      <p className="mt-1.5 text-[13px] text-dim">
                        {t('about.tagline')}
                        {appVersion ? ` · ${appVersion}` : ''}
                      </p>
                    </div>
                  </div>

                  <Group heading={t('about.updates')}>
                    <div className={cn(ROW, 'flex-col items-stretch gap-3')}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-medium text-ink">{t('upd.version')}</span>
                          <span className={cn(
                            "text-[12.5px] mt-0.5 leading-relaxed",
                            currentState === 'available' || currentState === 'downloaded' ? 'text-tone' :
                            currentState === 'error' ? 'text-red-400' : 'text-dim'
                          )}>
                            {isConfirmingRestart && t('upd.confirm')}
                            {!isConfirmingRestart && (
                              <>
                                {currentState === 'checking' && t('upd.checking')}
                                {currentState === 'error' && (updatePayload?.error || t('upd.error'))}
                                {currentState === 'up-to-date' && (isStoreManaged ? t('upd.upToDateStore', { version: appVersion }) : t('upd.upToDate'))}
                                {currentState === 'available' && updatePayload?.updateInfo ? `${t(isStoreManaged ? 'upd.availableStore' : 'upd.available', { what: updatePayload.updateInfo.version === 'new' ? t('upd.newVersion') : `Kissa ${updatePayload.updateInfo.version}` })}${updatePayload.updateInfo.assetSize ? ` (${Math.round(updatePayload.updateInfo.assetSize / (1024 * 1024))} MB)` : ''}` : ''}
                                {currentState === 'downloading' && t('upd.downloading', { version: updatePayload?.updateInfo?.version || '', percent: updatePayload?.progress?.percent ?? 0 })}
                                {currentState === 'downloaded' && (updatePayload?.isPortable ? t('upd.portableDone') : t('upd.ready'))}
                                {currentState === 'installing' && t('upd.installing')}
                                {currentState === 'cancelled' && t('upd.cancelled')}
                                {currentState === 'idle' &&
                                  (appVersion
                                    ? `${appVersion}${isStoreManaged ? ` · ${t('upd.byStore')}` : ''}`
                                    : t('upd.loading'))}
                              </>
                            )}
                          </span>
                        </div>

                        {isStoreManaged ? (
                          currentState === 'available' ? (
                            <button
                              type="button"
                              onClick={() => void window.electron?.openStorePage?.()}
                              className={BTN_PRIMARY}
                            >
                              {t('upd.inStore')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCheckUpdate}
                              disabled={currentState === 'checking'}
                              className={BTN}
                            >
                              {t('upd.check')}
                            </button>
                          )
                        ) : isConfirmingRestart ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsConfirmingRestart(false)}
                              className={BTN}
                            >
                              {t('editor.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmRestart}
                              className={BTN_PRIMARY}
                            >
                              {t('upd.restartNow')}
                            </button>
                          </div>
                        ) : currentState === 'downloading' ? (
                          <button
                            type="button"
                            onClick={handleCancelDownload}
                            className={BTN}
                          >
                            {t('editor.cancel')}
                          </button>
                        ) : currentState === 'downloaded' ? (
                          <button
                            type="button"
                            onClick={handleInstallUpdate}
                            className={BTN_PRIMARY}
                          >
                            {updatePayload?.isPortable ? t('upd.showFolder') : t('upd.restartInstall')}
                          </button>
                        ) : currentState === 'available' ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                window.electron?.openExternal?.(KISSA_RELEASES_URL)
                              }}
                              className={cn(BTN, 'max-[720px]:hidden')}
                            >
                              {t('upd.notes')}
                            </button>
                            <button
                              type="button"
                              onClick={handleDownloadUpdate}
                              className={BTN_PRIMARY}
                            >
                              {t('upd.download')}
                            </button>
                          </div>
                        ) : currentState === 'error' ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                window.electron?.openExternal?.(KISSA_RELEASES_URL)
                              }}
                              className={cn(BTN, 'max-[720px]:hidden')}
                            >
                              {t('upd.notes')}
                            </button>
                            <button
                              type="button"
                              onClick={handleCheckUpdate}
                              className={BTN}
                            >
                              {t('upd.retry')}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCheckUpdate}
                            disabled={currentState === 'checking'}
                            className={BTN}
                          >
                            {currentState === 'checking' ? t('upd.checkingShort') : t('upd.check')}
                          </button>
                        )}
                      </div>

                      {currentState === 'downloading' && (
                        <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-tone h-full transition-all duration-150 rounded-full"
                            style={{ width: `${updatePayload?.progress?.percent ?? 0}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <Row
                      title={t('about.whatsnew')}
                      desc={isStudyActive ? t('about.whatsnew.busy') : t('about.whatsnew.desc')}
                    >
                      <button
                        type="button"
                        disabled={isStudyActive}
                        onClick={() => {
                          usePlayerStore.getState().setIsSettingsOpen(false)
                          usePlayerStore.getState().setActiveView('deck')
                          usePlayerStore.getState().setIsWhatsNewOpen(true)
                        }}
                        className={BTN}
                      >
                        {t('about.whatsnew.action')}
                      </button>
                    </Row>
                  </Group>

                  <Group heading={t('about.kissa')}>
                    <AboutRow />
                  </Group>
                </>
              )}
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

SettingsModal.displayName = 'SettingsModal'

/** 23 to "11 pm" in the listener's own clock style. */
function formatHour(hour: number): string {
  const d = new Date(2000, 0, 1, hour, 0)
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: d.getMinutes() ? '2-digit' : undefined })
  } catch {
    return `${hour}:00`
  }
}

function Group({ heading, children }: { heading?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <section>
      {heading && <h4 className={HEADING}>{heading}</h4>}
      <div className={GROUP}>{children}</div>
    </section>
  )
}

function Row({ title, desc, children }: { title: string; desc?: string; children?: React.ReactNode }): React.JSX.Element {
  return (
    <div className={ROW}>
      <div className="flex min-w-0 flex-col pr-2">
        <span className="text-[14px] font-medium text-ink">{title}</span>
        {desc && <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">{desc}</span>}
      </div>
      {children && <div className="flex shrink-0 items-center">{children}</div>}
    </div>
  )
}
