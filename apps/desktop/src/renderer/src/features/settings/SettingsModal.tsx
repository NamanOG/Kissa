import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { HardwareSwitch } from '@renderer/components/ui/HardwareSwitch'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
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
  const screensaverLyrics = usePlayerStore((s) => s.screensaverLyrics)
  const toggleScreensaverLyrics = usePlayerStore((s) => s.toggleScreensaverLyrics)

  const [appVersion, setAppVersion] = useState<string>('')
  const [updatePayload, setUpdatePayload] = useState<UpdateStatusPayload | null>(null)
  const [isConfirmingRestart, setIsConfirmingRestart] = useState<boolean>(false)
  const [isScreensaverRegistered, setIsScreensaverRegistered] = useState<boolean>(false)
  const [isScreensaverWorking, setIsScreensaverWorking] = useState<boolean>(false)

  const currentState = updatePayload?.state || 'idle'

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

    // Fallback for mock/test environments
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

  // Fetch screensaver registration state when settings open
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
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsScreensaverWorking(false)
    }
  }

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/80"
            onClick={toggleSettings}
          />

          {/* Hardware Faceplate Surface */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'relative z-50 w-full max-w-[700px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden select-none border border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[var(--panel-shadow)] [transform:translateZ(0)]',
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--panel-border)] shrink-0 bg-[var(--panel-bg)]">
              <h2 className="text-[12.5px] text-[var(--muted)] uppercase tracking-[0.2em] font-kissa-chassis font-bold">
                Kissa Configuration
              </h2>
              <button
                type="button"
                onClick={toggleSettings}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] hover:bg-white/10 transition-colors cursor-pointer active:scale-95 border border-[var(--panel-border)]"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Smooth GPU Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 no-scrollbar overscroll-contain [transform:translateZ(0)]">
              
              {/* Removed legacy automatic banner */}
              {/* Section 1: Atmosphere */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-[var(--muted)] mb-3 tracking-[0.2em] uppercase">Atmosphere</h4>
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

              {/* Section 2: Playback */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-[var(--muted)] mb-2.5 tracking-[0.2em] uppercase">Hardware Configuration</h4>
                <div className="rounded-2xl bg-[var(--on-surface)]/[0.03] border border-[var(--on-surface)]/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]">
                  
                  {/* Speed */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Platter Speed</span>
                    <div className="flex items-center rounded-xl bg-[var(--on-surface)]/[0.05] p-1 border border-[var(--on-surface)]/10 shadow-inner gap-1">
                      <button
                        type="button"
                        onClick={() => setRpm('33')}
                        className={cn(
                          'px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wider transition-[color,background-color,box-shadow] cursor-pointer flex items-center justify-center min-w-[70px]',
                          rpm === '33' 
                            ? 'bg-[var(--accent)] text-[var(--panel-bg)] shadow-[0_0_14px_var(--accent)]' 
                            : 'text-[var(--muted)] hover:text-[var(--on-surface)] bg-transparent'
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
                            ? 'bg-[var(--accent)] text-[var(--panel-bg)] shadow-[0_0_14px_var(--accent)]' 
                            : 'text-[var(--muted)] hover:text-[var(--on-surface)] bg-transparent'
                        )}
                      >
                        45 RPM
                      </button>
                    </div>
                  </div>

                  {/* Physical Feedback */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Physical Feedback</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">Physical needle thud and visual tonearm weight</span>
                    </div>
                    <HardwareSwitch
                      checked={physicalFeedback}
                      onChange={setPhysicalFeedback}
                      aria-label="Toggle Physical Feedback"
                    />
                  </div>

                  {/* Auto-scroll Lyrics */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Auto-scroll Lyrics</span>
                    <HardwareSwitch
                      checked={autoScrollLyrics}
                      onChange={setAutoScrollLyrics}
                      aria-label="Toggle Auto-scroll Lyrics"
                    />
                  </div>

                  {/* Lyrics Timing Sync Offset */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Lyrics Timing Sync</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">Calibrate vocal alignment (- earlier, + later)</span>
                    </div>
                    <div className="flex items-center rounded-xl bg-[var(--on-surface)]/[0.05] p-1 border border-[var(--on-surface)]/10 shadow-inner gap-1.5">
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.max(-2.0, Math.round((lyricsOffset - 0.1) * 10) / 10))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] bg-[var(--on-surface)]/[0.04] hover:bg-[var(--on-surface)]/[0.08] transition-colors text-sm font-bold active:scale-95 cursor-pointer"
                        title="Earlier (-0.1s)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(0)}
                        className="font-mono text-[11px] font-bold text-[var(--accent)] min-w-[52px] text-center hover:underline cursor-pointer"
                        title="Click to reset to default"
                      >
                        {lyricsOffset > 0 ? `+${lyricsOffset.toFixed(1)}s` : `${lyricsOffset.toFixed(1)}s`}
                      </button>
                      <button
                        type="button"
                        onClick={() => setLyricsOffset(Math.min(2.0, Math.round((lyricsOffset + 0.1) * 10) / 10))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-[var(--on-surface)] bg-[var(--on-surface)]/[0.04] hover:bg-[var(--on-surface)]/[0.08] transition-colors text-sm font-bold active:scale-95 cursor-pointer"
                        title="Later (+0.1s)"
                      >
                        +
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Section 3: Integrations & Help */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-[var(--muted)] mb-2.5 tracking-[0.2em] uppercase">System Integrations</h4>
                <div className="rounded-2xl bg-[var(--on-surface)]/[0.03] border border-[var(--on-surface)]/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
                  
                  {/* Mini Player Always on Top */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Always on Top (Mini Player)</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">Keep the Mini Player visible above other windows</span>
                    </div>
                    <HardwareSwitch
                      checked={miniPlayerAlwaysOnTop}
                      onChange={setMiniPlayerAlwaysOnTop}
                      aria-label="Toggle Always on Top"
                    />
                  </div>

                  {/* Telemetry */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Windows Media Sync (SMTC)</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">Spotify, Apple Music, Tidal, & Web Media tracking</span>
                    </div>
                    <div className="flex items-center gap-2 bg-[var(--accent)]/15 px-3 py-1.5 rounded-full border border-[var(--accent)]/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)] animate-pulse" />
                      <span className="text-[10px] text-[var(--accent)] font-bold tracking-widest uppercase">Active</span>
                    </div>
                  </div>

                  {/* Windows Screensaver */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Windows Screensaver</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">
                        {isScreensaverRegistered
                          ? '✓ Kissa is your Windows screensaver'
                          : 'Kissa can run as your Windows screensaver, using the Listening Display experience.'}
                      </span>
                    </div>
                    {isScreensaverRegistered ? (
                      <button
                        type="button"
                        onClick={handleUnregisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="px-4 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-red-500/20 hover:text-red-300 text-[var(--muted)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Removing...' : 'Remove Kissa Screensaver'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRegisterScreensaver}
                        disabled={isScreensaverWorking}
                        className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95 disabled:opacity-50 shrink-0"
                      >
                        {isScreensaverWorking ? 'Setting...' : 'Set as Windows Screensaver'}
                      </button>
                    )}
                  </div>

                  {/* Windows Screensaver Timeout & Native Settings */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Windows Screensaver Settings</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">
                        Configure Windows idle timeout, wait duration, and lock screen behavior
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenScreensaverSettings}
                      className="px-3.5 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.12] text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95 shrink-0"
                    >
                      Open Windows Screensaver Settings
                    </button>
                  </div>

                  {/* Screensaver & Display Lyrics */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col pr-4">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Screensaver & Display Lyrics</span>
                      <span className="text-[11.5px] text-[var(--muted)] mt-0.5">
                        Display synchronized lyrics alongside album art in Listening Display
                      </span>
                    </div>
                    <HardwareSwitch
                      checked={screensaverLyrics}
                      onChange={toggleScreensaverLyrics}
                      aria-label="Toggle Screensaver Lyrics"
                    />
                  </div>

                  {/* Help */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Interactive Guide</span>
                    <button
                      type="button"
                      onClick={() => {
                        toggleSettings()
                        usePlayerStore.getState().setIsOnboardingOpen(true)
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-[var(--on-surface)]/[0.14] text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95"
                    >
                      View Guide
                    </button>
                  </div>

                </div>
              </div>

              {/* Section 4: Application */}
              <div>
                <h4 className="text-[11px] font-mono font-bold text-[var(--muted)] mb-2.5 tracking-[0.2em] uppercase">Application</h4>
                <div className="rounded-2xl bg-[var(--on-surface)]/[0.03] border border-[var(--on-surface)]/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
                  
                  {/* Version & Updates */}
                  <div className="flex flex-col p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/[0.02] transition-colors gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col">
                        <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Software Version</span>
                        <span className={cn(
                          "text-[11.5px] mt-0.5 font-mono",
                          currentState === 'available' || currentState === 'downloaded' ? 'text-[var(--accent)]' :
                          currentState === 'error' ? 'text-red-400' : 'text-[var(--muted)]'
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
                              {currentState === 'idle' && (appVersion ? `Version ${appVersion}` : 'Loading…')}
                            </>
                          )}
                        </span>
                      </div>

                      {/* Action buttons */}
                      {isConfirmingRestart ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => setIsConfirmingRestart(false)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.12] text-[var(--on-surface)] text-[12px] font-medium transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmRestart}
                            className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
                          >
                            Restart Now
                          </button>
                        </div>
                      ) : currentState === 'downloading' ? (
                        <button
                          type="button"
                          onClick={handleCancelDownload}
                          className="px-3.5 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-red-500/20 hover:text-red-400 text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95 shrink-0"
                        >
                          Cancel
                        </button>
                      ) : currentState === 'downloaded' ? (
                        <button
                          type="button"
                          onClick={handleInstallUpdate}
                          className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95 shrink-0"
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
                            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.12] text-[var(--muted)] hover:text-[var(--on-surface)] text-[12px] font-medium transition-colors cursor-pointer border border-[var(--on-surface)]/10"
                          >
                            View Release
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadUpdate}
                            className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
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
                            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.12] text-[var(--muted)] hover:text-[var(--on-surface)] text-[12px] font-medium transition-colors cursor-pointer border border-[var(--on-surface)]/10"
                          >
                            View Release
                          </button>
                          <button
                            type="button"
                            onClick={handleCheckUpdate}
                            className="px-4 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-[var(--on-surface)]/[0.14] text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95"
                          >
                            Try Again
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCheckUpdate}
                          disabled={currentState === 'checking'}
                          className="px-4 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-[var(--on-surface)]/[0.14] text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                          {currentState === 'checking' ? 'Checking…' : 'Check for Updates'}
                        </button>
                      )}
                    </div>

                    {/* Progress Bar when downloading */}
                    {currentState === 'downloading' && (
                      <div className="w-full bg-[var(--on-surface)]/[0.08] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[var(--accent)] h-full transition-all duration-150 rounded-full"
                          style={{ width: `${updatePayload?.progress?.percent ?? 0}%` }}
                        />
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
})

SettingsModal.displayName = 'SettingsModal'
