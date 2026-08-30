import React, { memo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Power } from 'lucide-react'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { LISTENING_ENVIRONMENTS } from './themes'
import { ThemeCard } from './ThemeCard'
import { cn } from '@renderer/utils/cn'
import { checkForUpdates, UpdateCheckResult } from '@renderer/utils/updater'

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

  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'up-to-date' | 'available' | 'error'>('idle')
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const hasUpdateAvailable = usePlayerStore((s) => s.hasUpdateAvailable)

  useEffect(() => {
    if (isSettingsOpen && !appVersion) {
      window.electron?.getAppVersion?.().then(setAppVersion).catch(console.error)
    }
  }, [isSettingsOpen, appVersion])

  const handleCheckUpdate = async () => {
    if (updateStatus === 'checking' || !appVersion) return
    setUpdateStatus('checking')
    try {
      const result = await checkForUpdates(appVersion)
      if (result.hasUpdate) {
        setUpdateResult(result)
        setUpdateStatus('available')
      } else {
        setUpdateStatus('up-to-date')
      }
    } catch (err) {
      console.error(err)
      setUpdateStatus('error')
    }
  }

  // Auto-check if we know there is an update available
  useEffect(() => {
    if (isSettingsOpen && appVersion && hasUpdateAvailable && updateStatus === 'idle') {
      void handleCheckUpdate()
    }
  }, [isSettingsOpen, appVersion, hasUpdateAvailable, updateStatus])

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
                    <button
                      type="button"
                      onClick={() => setPhysicalFeedback(!physicalFeedback)}
                      className="w-11 h-7 flex items-center justify-center rounded-lg bg-[var(--on-surface)]/[0.05] border border-[var(--on-surface)]/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer active:scale-95 transition-transform"
                    >
                      <Power 
                        className={cn(
                          "w-4 h-4 transition-[color,filter] duration-ui ease-primary", 
                          physicalFeedback ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" : "text-[var(--on-surface)]/20"
                        )} 
                        strokeWidth={physicalFeedback ? 3 : 2}
                      />
                    </button>
                  </div>

                  {/* Auto-scroll Lyrics */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 border-b border-[var(--on-surface)]/[0.06] hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <span className="text-[13.5px] font-medium text-[var(--on-surface)]">Auto-scroll Lyrics</span>
                    <button
                      type="button"
                      onClick={() => setAutoScrollLyrics(!autoScrollLyrics)}
                      className="w-11 h-7 flex items-center justify-center rounded-lg bg-[var(--on-surface)]/[0.05] border border-[var(--on-surface)]/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer active:scale-95 transition-transform"
                    >
                      <Power 
                        className={cn(
                          "w-4 h-4 transition-[color,filter] duration-ui ease-primary", 
                          autoScrollLyrics ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" : "text-[var(--on-surface)]/20"
                        )} 
                        strokeWidth={autoScrollLyrics ? 3 : 2}
                      />
                    </button>
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
                    <button
                      type="button"
                      onClick={() => setMiniPlayerAlwaysOnTop(!miniPlayerAlwaysOnTop)}
                      className="w-11 h-7 flex items-center justify-center rounded-lg bg-[var(--on-surface)]/[0.05] border border-[var(--on-surface)]/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] cursor-pointer active:scale-95 transition-transform"
                    >
                      <Power 
                        className={cn(
                          "w-4 h-4 transition-[color,filter] duration-ui ease-primary", 
                          miniPlayerAlwaysOnTop ? "text-[var(--accent)] drop-shadow-[0_0_8px_var(--accent)]" : "text-[var(--on-surface)]/20"
                        )} 
                        strokeWidth={miniPlayerAlwaysOnTop ? 3 : 2}
                      />
                    </button>
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
                <h4 className="text-[11px] font-mono font-bold text-[var(--muted)] mb-2.5 tracking-[0.2em] uppercase">Application Software</h4>
                <div className="rounded-2xl bg-[var(--on-surface)]/[0.03] border border-[var(--on-surface)]/[0.08] overflow-hidden flex flex-col shadow-[inset_0_1px_4px_rgba(0,0,0,0.1)]">
                  
                  {/* Version & Updates */}
                  <div className="flex items-center justify-between p-4 min-[600px]:px-5 hover:bg-[var(--on-surface)]/[0.02] transition-colors">
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-medium text-[var(--on-surface)]">System Version</span>
                      <span className={cn(
                        "text-[11.5px] mt-0.5 font-mono",
                        updateStatus === 'available' ? 'text-[var(--accent)]' :
                        updateStatus === 'error' ? 'text-red-400' : 'text-[var(--muted)]'
                      )}>
                        {updateStatus === 'checking' && 'CHECKING...'}
                        {updateStatus === 'error' && 'UPDATE CHECK FAILED'}
                        {updateStatus === 'up-to-date' && `KISSA IS UP TO DATE — VERSION ${appVersion}`}
                        {updateStatus === 'available' && updateResult ? `KISSA ${updateResult.version} IS AVAILABLE` : ''}
                        {updateStatus === 'idle' && (appVersion ? `VERSION ${appVersion}` : 'LOADING...')}
                      </span>
                    </div>
                    {updateStatus === 'available' ? (
                      <button
                        type="button"
                        onClick={() => {
                          // Mandatory security boundary: enforce only the exact repo releases page
                          if (updateResult?.url.startsWith('https://github.com/NamanOG/Kissa/releases')) {
                            window.electron?.openExternal?.(updateResult.url)
                          }
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[var(--accent)] text-[var(--panel-bg)] text-[12px] font-bold transition-colors cursor-pointer shadow-[0_2px_12px_var(--accent)] shadow-black/30 active:scale-95"
                      >
                        View Release
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCheckUpdate}
                        disabled={updateStatus === 'checking'}
                        className="px-4 py-1.5 rounded-xl bg-[var(--on-surface)]/[0.08] hover:bg-[var(--on-surface)]/[0.14] text-[var(--on-surface)] text-[12px] font-bold transition-colors cursor-pointer border border-[var(--on-surface)]/10 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Check for Updates
                      </button>
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
