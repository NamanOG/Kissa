import React, { memo, useState, useEffect, useRef } from 'react'
import { useDialogFocus } from '../../hooks/useDialogFocus'
import { motion, AnimatePresence } from 'framer-motion'
import { Minus, Plus, X } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useStudyStore } from '@renderer/stores/studyStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { AboutRow, LyricsAppearanceRows, RoomPersonalSettings } from './PersonalSettings'
import { DiscordPresenceRow } from './DiscordPresenceRow'
import { cn } from '@renderer/utils/cn'
import { checkForUpdates, KISSA_RELEASES_URL } from '@renderer/utils/updater'
import type { UpdateStatusPayload } from '../../../../types/update'

const SETTINGS_SECTIONS = [
  { id: 'room', label: 'Room', hint: 'Where you listen, and how it lights up' },
  { id: 'playback', label: 'Record & deck', hint: 'Your turntable, record and its sounds' },
  { id: 'lyrics', label: 'Lyrics', hint: 'Size, type and timing' },
  { id: 'system', label: 'System', hint: 'Windows, sharing and updates' }
] as const

// Settings rows and groups, styled in assets/main.css (Settings).
const ROW = 'kissa-set-row'
const GROUP = 'kissa-set-group'
const HEADING = 'kissa-set-heading'

export interface SettingsModalProps {
  className?: string
}

/**
 * Audiophile Preferences Modal.
 * High-end audio hardware aesthetic with 60/120 FPS GPU-accelerated scrolling.
 */
export const SettingsModal = memo(({ className }: SettingsModalProps): React.JSX.Element | null => {
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogFocus(panelRef, isSettingsOpen)
  const isStudyActive = useStudyStore((s) => s.active !== null)
  const toggleSettings = usePlayerStore((s) => s.toggleSettings)
  const currentTheme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
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
  const setRunInBackground = usePlayerStore((s) => s.setRunInBackground)
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const toggleScreensaverLyrics = usePlayerStore((s) => s.toggleScreensaverLyrics)
  const settingsTab = usePlayerStore((s) => s.settingsTab)
  const artworkUrl = usePlayerStore((s) => s.currentTrack?.artworkUrl)
  const room = LISTENING_ENVIRONMENTS.find((env) => env.id === currentTheme)
  const albumCover = artworkUrl && !artworkUrl.includes('placeholder-album') ? artworkUrl : undefined
  const roomImage = currentTheme === 'adaptive' ? albumCover : room?.image
  const roomName = currentTheme === 'adaptive' ? 'Match the album' : room?.name ?? 'Your room'
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
        error: err?.message || "Couldn't check for updates",
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

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 min-[640px]:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/80"
            onClick={toggleSettings}
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              // One fixed size for every section, so switching sections never resizes the window.
              'relative z-50 flex h-[min(780px,90vh)] w-full max-w-[1120px] overflow-hidden rounded-[24px] select-none border border-panel-line bg-[var(--deck-bg)] shadow-[0_40px_120px_rgba(0,0,0,0.6)] [transform:translateZ(0)]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/*
              The index sits in the room you are listening in: its photograph (or the album, for
              Match the album) fills the column, darkened, so Settings belongs to this room and
              no other app. A static image, drawn once.
            */}
            <nav
              aria-label="Settings sections"
              className="relative flex w-[264px] shrink-0 flex-col overflow-hidden border-r border-ink/[0.08] bg-ink/[0.02] max-[860px]:w-[220px]"
            >
              <div className="relative flex h-full flex-col px-7 pb-8 pt-7 max-[860px]:px-5">
              {/* The room, as a small print: crisp, contained, nothing behind the navigation. */}
              <figure className="m-0">
                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[12px] bg-ink/[0.05] shadow-[0_10px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)]">
                  {roomImage && (
                    currentTheme === 'adaptive' ? (
                      <img src={roomImage} alt="" draggable={false} className="absolute left-1/2 top-1/2 aspect-square w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[3px] object-cover shadow-[0_6px_16px_rgba(0,0,0,0.5)]" />
                    ) : (
                      <img src={roomImage} alt="" draggable={false} className="h-full w-full object-cover" />
                    )
                  )}
                </div>
                <figcaption className="mt-3.5">
                  <span className="block text-[12px] text-dim">Listening in</span>
                  <h2 className="mt-0.5 font-serif text-[24px] leading-[1.1] text-ink">{roomName}</h2>
                </figcaption>
              </figure>

              <div role="tablist" aria-orientation="vertical" aria-label="Settings sections" className="mt-7 flex flex-col gap-1">
                {SETTINGS_SECTIONS.map((section, i) => {
                  const selected = settingsTab === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      role="tab"
                      id={`settings-tab-${section.id}`}
                      aria-selected={selected}
                      aria-controls="settings-panel"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setSettingsTab(section.id)}
                      onKeyDown={(e) => {
                        const step = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
                        if (!step) return
                        e.preventDefault()
                        const next = SETTINGS_SECTIONS[(i + step + SETTINGS_SECTIONS.length) % SETTINGS_SECTIONS.length]
                        setSettingsTab(next.id)
                        document.getElementById(`settings-tab-${next.id}`)?.focus()
                      }}
                      className={cn(
                        'group relative -mx-4 flex cursor-pointer items-center gap-3 rounded-[12px] px-4 py-3 text-left transition-colors duration-150',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tone',
                        selected ? 'text-ink' : 'text-ink/60 hover:text-ink hover:bg-ink/[0.04]'
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="settings-section-plate"
                          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 rounded-[12px] bg-ink/[0.08]"
                        />
                      )}
                      {/* A small lamp, lit on the open section, like the deck's power light. */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'relative h-1.5 w-1.5 shrink-0 rounded-full transition-[background-color,box-shadow] duration-200',
                          selected ? 'bg-tone shadow-[0_0_8px_var(--accent)]' : 'bg-ink/20 group-hover:bg-ink/35'
                        )}
                      />
                      <span className="relative text-[15px] font-medium leading-none">{section.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-auto text-[11.5px] leading-relaxed text-ink/55">
                Everything stays on this PC.
              </p>
              </div>
            </nav>

            <button
              type="button"
              onClick={toggleSettings}
              className="absolute right-5 top-5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[var(--deck-bg)] text-dim transition-colors hover:bg-ink/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>

            <div
              id="settings-panel"
              role="tabpanel"
              aria-labelledby={`settings-tab-${settingsTab}`}
              className="min-w-0 flex-1 overflow-y-auto px-12 pb-12 pt-10 space-y-9 no-scrollbar overscroll-contain [transform:translateZ(0)] [mask-image:linear-gradient(to_bottom,#000_calc(100%-40px),transparent)] max-[720px]:px-6"
            >
              <header className="pr-10">
                <h3 className="font-serif text-[32px] leading-[1.1] text-ink">{SETTINGS_SECTIONS.find((x) => x.id === settingsTab)?.label}</h3>
                <p className="mt-1.5 text-[13px] text-dim">{SETTINGS_SECTIONS.find((x) => x.id === settingsTab)?.hint}</p>
              </header>
              
              {settingsTab === 'room' && (
              <>
              <div>
              <h4 className={HEADING}>Light</h4>
              <div className={GROUP}>
              <div className={ROW}>
                <div className="flex flex-col">
                  <span className="text-[14px] font-medium text-ink">Moving light</span>
                  <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                    {currentTheme === 'adaptive'
                      ? 'Let the album’s colours flow behind the room while music plays. Also on the Deck and in full screen.'
                      : 'Works with Match the album. Choose it above to use Moving light.'}
                  </span>
                </div>
                <HardwareSwitch
                  checked={ambientMotion}
                  onChange={setAmbientMotion}
                  disabled={currentTheme !== 'adaptive'}
                  aria-label="Moving light"
                />
              </div>
              </div>
              </div>

              <div>
                <h4 className={HEADING}>Rooms</h4>
                <div className="grid grid-cols-3 gap-x-4 gap-y-5">
                  {LISTENING_ENVIRONMENTS.map((env) => (
                    <ThemeCard
                      key={env.id}
                      theme={env}
                      isSelected={currentTheme === env.id}
                      onSelect={() => setTheme(env.id)}
                    />
                  ))}
                </div>
              </div>

              </>
              )}

              {settingsTab === 'playback' && (
              <>
              <RoomPersonalSettings />

              <div>
                <h4 className={HEADING}>The deck</h4>
                <div className={GROUP}>
                  
                  <div className={ROW}>
                    <span className="text-[14px] font-medium text-ink">Platter speed</span>
                    <SegmentedTabs
                      kind="radio"
                      size="sm"
                      label="Platter speed"
                      value={rpm}
                      onChange={setRpm}
                      tabs={[
                        { id: '33', label: '33 rpm' },
                        { id: '45', label: '45 rpm' }
                      ]}
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Turntable sounds</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">The needle touching and leaving the record, and the deck's switches and keys</span>
                    </div>
                    <HardwareSwitch
                      checked={needleSound}
                      onChange={setNeedleSound}
                      aria-label="Toggle Turntable Sounds"
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Physical feedback</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">The tonearm rises and settles with weight</span>
                    </div>
                    <HardwareSwitch
                      checked={physicalFeedback}
                      onChange={setPhysicalFeedback}
                      aria-label="Toggle Physical Feedback"
                    />
                  </div>

                </div>
              </div>

              </>
              )}

              {settingsTab === 'lyrics' && (
              <>
              <div>
                <h4 className={HEADING}>On screen</h4>
                <div className={GROUP}>
                  <LyricsAppearanceRows />

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Follow the song</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Keep the line being sung in view</span>
                    </div>
                    <HardwareSwitch
                      checked={autoScrollLyrics}
                      onChange={setAutoScrollLyrics}
                      aria-label="Toggle Auto-scroll Lyrics"
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Timing</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Nudge lyrics that run early or late</span>
                    </div>
                    <div className="flex h-8 items-center rounded-full border border-ink/[0.16]">
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.max(-2.0, Math.round((lyricsOffset - 0.1) * 10) / 10))}
                        className="flex h-full w-9 cursor-pointer items-center justify-center rounded-l-full text-dim transition-colors hover:bg-ink/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                        aria-label="Lyrics earlier by a tenth of a second"
                        title="Earlier"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(0)}
                        className="h-full min-w-[56px] cursor-pointer border-x border-ink/[0.1] px-2 text-center font-mono text-[12px] tabular-nums text-ink transition-colors hover:bg-ink/[0.05] focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                        aria-label={`Lyrics offset ${lyricsOffset.toFixed(1)} seconds. Reset`}
                        title="Reset"
                      >
                        {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.min(2.0, Math.round((lyricsOffset + 0.1) * 10) / 10))}
                        className="flex h-full w-9 cursor-pointer items-center justify-center rounded-r-full text-dim transition-colors hover:bg-ink/[0.07] hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/60"
                        aria-label="Lyrics later by a tenth of a second"
                        title="Later"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              </>
              )}

              {settingsTab === 'system' && (
              <>
              <div>
                <h4 className={HEADING}>Windows</h4>
                <div className={GROUP}>
                  
                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Mini player on top</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Keep the mini player above other windows</span>
                    </div>
                    <HardwareSwitch
                      checked={miniPlayerAlwaysOnTop}
                      onChange={setMiniPlayerAlwaysOnTop}
                      aria-label="Toggle Always on Top"
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Start with Windows</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Open Kissa in the tray when you sign in</span>
                    </div>
                    <HardwareSwitch
                      checked={startWithWindows}
                      onChange={setStartWithWindows}
                      aria-label="Toggle Start with Windows"
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">Keep running in the tray</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">Closing the window keeps Kissa following your music</span>
                    </div>
                    <HardwareSwitch
                      checked={runInBackground}
                      onChange={setRunInBackground}
                      aria-label="Toggle Keep Running in Tray"
                    />
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col pr-4">
                      <span className="text-[14px] font-medium text-ink">Screensaver</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                        {isScreensaverRegistered
                          ? '✓ Kissa is your Windows screensaver'
                          : showScreensaverSteps
                            ? 'A folder has opened with Kissa.scr selected. Right-click it and choose Install.'
                            : 'Kissa can be your Windows screensaver, showing the Listening Display.'}
                      </span>
                    </div>
                    {isScreensaverRegistered ? (
                      <button
                        type="button"
                        onClick={handleUnregisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Removing...' : isStoreManaged ? 'Change in Windows Settings' : 'Stop using Kissa'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRegisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="h-8 px-4 rounded-full bg-ink text-[var(--surface)] text-[12.5px] font-semibold transition-opacity hover:opacity-90 cursor-pointer active:translate-y-px disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Setting...' : isStoreManaged ? 'Set up…' : 'Use Kissa'}
                      </button>
                    )}
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col pr-4">
                      <span className="text-[14px] font-medium text-ink">Screensaver timing</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                        Choose when it starts, in Windows settings
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenScreensaverSettings}
                      className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px shrink-0"
                    >
                      Open Windows settings
                    </button>
                  </div>

                  <div className={ROW}>
                    <div className="flex flex-col pr-4">
                      <span className="text-[14px] font-medium text-ink">Lyrics on the screensaver</span>
                      <span className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                        Show synced lyrics beside the cover in the Listening Display
                      </span>
                    </div>
                    <HardwareSwitch
                      checked={screensaverLyrics}
                      onChange={toggleScreensaverLyrics}
                      aria-label="Toggle Screensaver Lyrics"
                    />
                  </div>

                  <div className={ROW}>
                    <span className="text-[14px] font-medium text-ink">Guide</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSettings()
                        usePlayerStore.getState().setIsOnboardingOpen(true)
                      }}
                      className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px"
                    >
                      Take the tour
                    </button>
                  </div>

                </div>
              </div>

              <div>
                <h4 className={HEADING}>Sharing</h4>
                <div className={GROUP}>
                  <DiscordPresenceRow />
                </div>
              </div>

              <div>
                <h4 className={HEADING}>About Kissa</h4>
                <div className={GROUP}>
                  
                  <div className={cn(ROW, 'flex-col items-stretch gap-3')}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-ink">Version</span>
                        <span className={cn(
                          "text-[11.5px] mt-0.5 font-mono",
                          currentState === 'available' || currentState === 'downloaded' ? 'text-tone' :
                          currentState === 'error' ? 'text-red-400' : 'text-dim'
                        )}>
                          {isConfirmingRestart && 'Restart Kissa now to apply update? Active playback will stop.'}
                          {!isConfirmingRestart && (
                            <>
                              {currentState === 'checking' && 'Checking for updates…'}
                              {currentState === 'error' && (updatePayload?.error || "Couldn't check for updates")}
                              {currentState === 'up-to-date' && (isStoreManaged ? `Version ${appVersion} · You're up to date` : "You're up to date")}
                              {currentState === 'available' && updatePayload?.updateInfo ? `${updatePayload.updateInfo.version === 'new' ? 'A new version of Kissa' : `Kissa ${updatePayload.updateInfo.version}`} is available${isStoreManaged ? ' in the Microsoft Store' : ''}${updatePayload.updateInfo.assetSize ? ` (${Math.round(updatePayload.updateInfo.assetSize / (1024 * 1024))} MB)` : ''}` : ''}
                              {currentState === 'downloading' && `Downloading ${updatePayload?.updateInfo?.version || ''}… ${updatePayload?.progress?.percent ?? 0}%`}
                              {currentState === 'downloaded' && (updatePayload?.isPortable ? 'Portable update downloaded to Downloads' : 'Update ready to install')}
                              {currentState === 'installing' && 'Restarting Kissa…'}
                              {currentState === 'cancelled' && 'Download cancelled'}
                              {currentState === 'idle' &&
                                (appVersion
                                  ? `${appVersion}${isStoreManaged ? ' · updated by the Microsoft Store' : ''}`
                                  : 'Loading…')}
                            </>
                          )}
                        </span>
                      </div>

                      {isStoreManaged ? (
                        currentState === 'available' ? (
                          <button
                            type="button"
                            onClick={() => void window.electron?.openStorePage?.()}
                            className="h-8 px-4 rounded-full bg-ink text-[var(--surface)] text-[12.5px] font-semibold transition-opacity hover:opacity-90 cursor-pointer active:translate-y-px shrink-0"
                          >
                            Update in the Store
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCheckUpdate}
                            disabled={currentState === 'checking'}
                            className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px disabled:opacity-50 disabled:pointer-events-none shrink-0"
                          >
                            Check for updates
                          </button>
                        )
                      ) : isConfirmingRestart ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingRestart(false)}
                            className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmRestart}
                            className="h-8 px-4 rounded-full bg-ink text-[var(--surface)] text-[12.5px] font-semibold transition-opacity hover:opacity-90 cursor-pointer active:translate-y-px"
                          >
                            Restart now
                          </button>
                        </div>
                      ) : currentState === 'downloading' ? (
                        <button
                          type="button"
                          onClick={handleCancelDownload}
                          className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px shrink-0"
                        >
                          Cancel
                        </button>
                      ) : currentState === 'downloaded' ? (
                        <button
                          type="button"
                          onClick={handleInstallUpdate}
                          className="h-8 px-4 rounded-full bg-ink text-[var(--surface)] text-[12.5px] font-semibold transition-opacity hover:opacity-90 cursor-pointer active:translate-y-px shrink-0"
                        >
                          {updatePayload?.isPortable ? 'Show in folder' : 'Restart and install'}
                        </button>
                      ) : currentState === 'available' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              window.electron?.openExternal?.(KISSA_RELEASES_URL)
                            }}
                            className="hidden sm:inline-flex h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px"
                          >
                            Release notes
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadUpdate}
                            className="h-8 px-4 rounded-full bg-ink text-[var(--surface)] text-[12.5px] font-semibold transition-opacity hover:opacity-90 cursor-pointer active:translate-y-px"
                          >
                            Download update
                          </button>
                        </div>
                      ) : currentState === 'error' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              window.electron?.openExternal?.(KISSA_RELEASES_URL)
                            }}
                            className="hidden sm:inline-flex h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px"
                          >
                            Release notes
                          </button>
                          <button
                            type="button"
                            onClick={handleCheckUpdate}
                            className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px"
                          >
                            Try again
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckUpdate}
                          disabled={currentState === 'checking'}
                          className="h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                          {currentState === 'checking' ? 'Checking…' : 'Check for updates'}
                        </button>
                      )}
                    </div>

                    {currentState === 'downloading' && (
                      <div className="w-full bg-ink/[0.08] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-tone h-full transition-all duration-150 rounded-full"
                          style={{ width: `${updatePayload?.progress?.percent ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className={ROW}>
                    <div>
                      <p className="text-[14px] font-medium text-ink">What&apos;s new</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-dim">
                        {isStudyActive ? 'Available after your focus session' : 'Read this version’s release notes'}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isStudyActive}
                      onClick={() => {
                        usePlayerStore.getState().setIsSettingsOpen(false)
                        usePlayerStore.getState().setActiveView('deck')
                        usePlayerStore.getState().setIsWhatsNewOpen(true)
                      }}
                      className="shrink-0 h-8 px-4 rounded-full border border-ink/[0.16] text-[12.5px] font-medium text-ink transition-colors hover:bg-ink/[0.07] hover:border-ink/25 cursor-pointer active:translate-y-px focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink/70 disabled:cursor-default disabled:opacity-50"
                    >
                      View changes
                    </button>
                  </div>
                  <AboutRow />
                </div>
              </div>
              </>
              )}

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

SettingsModal.displayName = 'SettingsModal'
