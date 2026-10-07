import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { SegmentedTabs } from '@renderer/components/ui/SegmentedTabs'
import { AboutRow, LyricsAppearanceRows, RoomPersonalSettings } from './PersonalSettings'
import { cn } from '@renderer/utils/cn'
import { checkForUpdates, KISSA_RELEASES_URL } from '@renderer/utils/updater'
import type { UpdateStatusPayload } from '../../../../types/update'

export interface SettingsModalProps {
  className?: string
}

/**
 * Audiophile Preferences Modal.
 * High-end audio hardware aesthetic with 60/120 FPS GPU-accelerated scrolling.
 */
export const SettingsModal = memo(({ className }: SettingsModalProps): React.JSX.Element | null => {
  const isSettingsOpen = usePlayerStore((s) => s.isSettingsOpen)
  const toggleSettings = usePlayerStore((s) => s.toggleSettings)
  const currentTheme = usePlayerStore((s) => s.theme)
  const setTheme = usePlayerStore((s) => s.setTheme)
  const rpm = usePlayerStore((s) => s.rpm)
  const setRpm = usePlayerStore((s) => s.setRpm)
  const needleSound = usePlayerStore((s) => s.needleSound)
  const setNeedleSound = usePlayerStore((s) => s.setNeedleSound)
  const autoScrollLyrics = usePlayerStore((s) => s.autoScrollLyrics)
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
        console.error('[Download Update Error]', err)
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
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-50 w-full max-w-[700px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden select-none border border-panel-line bg-[var(--deck-bg)] shadow-[var(--panel-shadow)] [transform:translateZ(0)]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-8 py-5 border-b border-panel-line shrink-0 bg-[var(--deck-bg)]">
              <h2 className="sr-only">Settings</h2>
              <SegmentedTabs
                label="Settings sections"
                value={settingsTab}
                onChange={setSettingsTab}
                tabs={[
                  { id: 'room', label: 'Room' },
                  { id: 'playback', label: 'Playback' },
                  { id: 'system', label: 'System' }
                ]}
              />
              <button
                type="button"
                onClick={toggleSettings}
                className="w-8 h-8 rounded-full flex items-center justify-center text-dim hover:text-ink hover:bg-white/10 transition-colors cursor-pointer active:scale-95 border border-panel-line"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 no-scrollbar overscroll-contain [transform:translateZ(0)]">
              
              {settingsTab === 'room' && (
              <>
              <div>
                <h4 className="text-[11px] font-mono font-bold text-dim mb-3 tracking-[0.2em] uppercase">Listening Room</h4>
                <div className="grid grid-cols-4 gap-x-4 gap-y-5">
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

              <RoomPersonalSettings />
              </>
              )}

              {settingsTab === 'playback' && (
              <>
              <div>
                <h4 className="text-[11px] font-mono font-bold text-dim mb-2.5 tracking-[0.2em] uppercase">The Deck</h4>
                <div className="rounded-2xl bg-ink/[0.03] border border-ink/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                  
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-ink">Platter Speed</span>
                    <div className="flex items-center rounded-xl bg-ink/[0.05] p-1 border border-ink/10 shadow-inner gap-1">
                      <button
                        type="button"
                        onClick={() => setRpm('33')}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-[color,background-color,box-shadow] cursor-pointer flex items-center justify-center min-w-[70px]',
                          rpm === '33' 
                            ? 'bg-tone text-[var(--surface)] shadow-[0_0_14px_var(--accent)]' 
                            : 'text-dim hover:text-ink bg-transparent'
                        )}
                      >
                        33 RPM
                      </button>
                      <button
                        type="button"
                        onClick={() => setRpm('45')}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-[color,background-color,box-shadow] cursor-pointer flex items-center justify-center min-w-[70px]',
                          rpm === '45' 
                            ? 'bg-tone text-[var(--surface)] shadow-[0_0_14px_var(--accent)]' 
                            : 'text-dim hover:text-ink bg-transparent'
                        )}
                      >
                        45 RPM
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Physical Feedback</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Physical needle thud and visual tonearm weight</span>
                    </div>
                    <HardwareSwitch
                      checked={physicalFeedback}
                      onChange={setPhysicalFeedback}
                      aria-label="Toggle Physical Feedback"
                    />
                  </div>

                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-mono font-bold text-dim mb-2.5 tracking-[0.2em] uppercase">Lyrics</h4>
                <div className="rounded-2xl bg-ink/[0.03] border border-ink/[0.08] overflow-hidden flex flex-col">
                  <LyricsAppearanceRows />

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Follow the Song</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Keep the line being sung in view</span>
                    </div>
                    <HardwareSwitch
                      checked={autoScrollLyrics}
                      onChange={setAutoScrollLyrics}
                      aria-label="Toggle Auto-scroll Lyrics"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Timing</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Nudge lyrics that run early or late (also in the lyrics view)</span>
                    </div>
                    <div className="flex items-center rounded-xl bg-ink/[0.05] p-1 border border-ink/10 shadow-inner gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.max(-2.0, Math.round((lyricsOffset - 0.1) * 10) / 10))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-ink bg-ink/[0.04] hover:bg-ink/[0.08] transition-colors text-sm font-bold active:scale-95 cursor-pointer"
                        title="Earlier (-0.1s)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(0)}
                        className="font-mono text-[11px] font-bold text-tone min-w-[52px] text-center hover:underline cursor-pointer"
                        title="Click to reset to default"
                      >
                        {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.min(2.0, Math.round((lyricsOffset + 0.1) * 10) / 10))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-dim hover:text-ink bg-ink/[0.04] hover:bg-ink/[0.08] transition-colors text-sm font-bold active:scale-95 cursor-pointer"
                        title="Later (+0.1s)"
                      >
                        +
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
                <h4 className="text-[11px] font-mono font-bold text-dim mb-2.5 tracking-[0.2em] uppercase">Windows</h4>
                <div className="rounded-2xl bg-ink/[0.03] border border-ink/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
                  
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Always on Top (Mini Player)</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Keep the Mini Player visible above other windows</span>
                    </div>
                    <HardwareSwitch
                      checked={miniPlayerAlwaysOnTop}
                      onChange={setMiniPlayerAlwaysOnTop}
                      aria-label="Toggle Always on Top"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Start with Windows</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Open Kissa in the tray when you sign in</span>
                    </div>
                    <HardwareSwitch
                      checked={startWithWindows}
                      onChange={setStartWithWindows}
                      aria-label="Toggle Start with Windows"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-ink">Keep Running in Tray</span>
                      <span className="text-[11.5px] text-dim mt-0.5">Closing the window keeps Kissa following your music</span>
                    </div>
                    <HardwareSwitch
                      checked={runInBackground}
                      onChange={setRunInBackground}
                      aria-label="Toggle Keep Running in Tray"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-ink">Windows Screensaver</span>
                      <span className="text-[11.5px] text-dim mt-0.5">
                        {isScreensaverRegistered
                          ? '✓ Kissa is your Windows screensaver'
                          : showScreensaverSteps
                            ? 'A folder has opened with Kissa.scr selected. Right-click it and choose Install.'
                            : 'Kissa can run as your Windows screensaver, using the Listening Display experience.'}
                      </span>
                    </div>
                    {isScreensaverRegistered ? (
                      <button
                        type="button"
                        onClick={handleUnregisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="px-4 py-1.5 rounded-xl bg-ink/[0.08] hover:bg-red-500/20 hover:text-red-300 text-dim text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Removing...' : isStoreManaged ? 'Change in Windows Settings' : 'Remove Kissa Screensaver'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRegisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="px-4 py-1.5 rounded-xl bg-tone text-[var(--surface)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Setting...' : isStoreManaged ? 'Set Up Screensaver…' : 'Set as Windows Screensaver'}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-ink">Windows Screensaver Settings</span>
                      <span className="text-[11.5px] text-dim mt-0.5">
                        Configure Windows idle timeout, wait duration, and lock screen behavior
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenScreensaverSettings}
                      className="px-3.5 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/[0.12] text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95 shrink-0"
                    >
                      Open Windows Screensaver Settings
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-ink/[0.06] hover:bg-ink/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-ink">Screensaver & Display Lyrics</span>
                      <span className="text-[11.5px] text-dim mt-0.5">
                        Display synchronized lyrics alongside album art in Listening Display
                      </span>
                    </div>
                    <HardwareSwitch
                      checked={screensaverLyrics}
                      onChange={toggleScreensaverLyrics}
                      aria-label="Toggle Screensaver Lyrics"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-ink/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-ink">Interactive Guide</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSettings()
                        usePlayerStore.getState().setIsOnboardingOpen(true)
                      }}
                      className="px-4 py-1.5 rounded-xl bg-ink/[0.08] hover:bg-ink/[0.14] text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95"
                    >
                      View Guide
                    </button>
                  </div>

                </div>
              </div>

              <div>
                <h4 className="text-[11px] font-mono font-bold text-dim mb-2.5 tracking-[0.2em] uppercase">Application</h4>
                <div className="rounded-2xl bg-ink/[0.03] border border-ink/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
                  
                  <div className="flex flex-col p-4 min-[600px]:px-5 hover:bg-ink/[0.02] transition-colors gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-medium text-ink">Software Version</span>
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
                              {currentState === 'up-to-date' && "You're up to date"}
                              {currentState === 'available' && updatePayload?.updateInfo ? `Kissa ${updatePayload.updateInfo.version} is available${updatePayload.updateInfo.assetSize ? ` (${Math.round(updatePayload.updateInfo.assetSize / (1024 * 1024))} MB)` : ''}` : ''}
                              {currentState === 'downloading' && `Downloading ${updatePayload?.updateInfo?.version || ''}… ${updatePayload?.progress?.percent ?? 0}%`}
                              {currentState === 'downloaded' && (updatePayload?.isPortable ? 'Portable update downloaded to Downloads' : 'Update ready to install')}
                              {currentState === 'installing' && 'Restarting Kissa…'}
                              {currentState === 'cancelled' && 'Download cancelled'}
                              {currentState === 'idle' &&
                                (appVersion
                                  ? `Version ${appVersion}${isStoreManaged ? ' · Updated by Microsoft Store' : ''}`
                                  : 'Loading…')}
                            </>
                          )}
                        </span>
                      </div>

                      {isStoreManaged ? null : isConfirmingRestart ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingRestart(false)}
                            className="px-3 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/[0.12] text-ink text-[12px] font-medium transition-colors cursor-pointer border border-ink/10 active:scale-95"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmRestart}
                            className="px-3.5 py-1.5 rounded-xl bg-tone text-[var(--surface)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
                          >
                            Restart Now
                          </button>
                        </div>
                      ) : currentState === 'downloading' ? (
                        <button
                          type="button"
                          onClick={handleCancelDownload}
                          className="px-3.5 py-1.5 rounded-xl bg-ink/[0.08] hover:bg-red-500/20 hover:text-red-400 text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95 shrink-0"
                        >
                          Cancel
                        </button>
                      ) : currentState === 'downloaded' ? (
                        <button
                          type="button"
                          onClick={handleInstallUpdate}
                          className="px-4 py-1.5 rounded-xl bg-tone text-[var(--surface)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95 shrink-0"
                        >
                          {updatePayload?.isPortable ? 'Show in Folder' : 'Restart & Install'}
                        </button>
                      ) : currentState === 'available' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              window.electron?.openExternal?.(KISSA_RELEASES_URL)
                            }}
                            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/[0.12] text-dim hover:text-ink text-[12px] font-medium transition-colors cursor-pointer border border-ink/10"
                          >
                            View Release
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadUpdate}
                            className="px-4 py-1.5 rounded-xl bg-tone text-[var(--surface)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
                          >
                            Download Update
                          </button>
                        </div>
                      ) : currentState === 'error' ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              window.electron?.openExternal?.(KISSA_RELEASES_URL)
                            }}
                            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-ink/[0.06] hover:bg-ink/[0.12] text-dim hover:text-ink text-[12px] font-medium transition-colors cursor-pointer border border-ink/10"
                          >
                            View Release
                          </button>
                          <button
                            type="button"
                            onClick={handleCheckUpdate}
                            className="px-4 py-1.5 rounded-xl bg-ink/[0.08] hover:bg-ink/[0.14] text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckUpdate}
                          disabled={currentState === 'checking'}
                          className="px-4 py-1.5 rounded-xl bg-ink/[0.08] hover:bg-ink/[0.14] text-ink text-[12px] font-bold transition-colors cursor-pointer border border-ink/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                          {currentState === 'checking' ? 'Checking…' : 'Check for Updates'}
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
