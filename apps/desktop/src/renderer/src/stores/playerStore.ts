import { create } from 'zustand'
import { PlaybackClock } from '@renderer/utils/PlaybackClock'

import kissaIdleCover from '@renderer/media/kissa_idle_cover.jpg'

// Try to use a dedicated Kissa artwork if it exists, fallback to kissa_logo
const kissaArtworkFallback = kissaIdleCover

export type AppTheme =
  | 'quiet-room'
  | 'dusty-record'
  | 'jazz-bar'
  | 'midnight-apartment'
  | 'rainy-window'
  | 'hifi-library'
  | 'concrete-vinyl'
  | 'sunday-morning'
  | 'adaptive'

export interface TrackInfo {
  title: string
  artist: string
  album: string
  artworkUrl?: string
  audioUrl?: string
  duration: number
  source?: string
  sourceAppId?: string
}

export interface PlayerState {
  isPlaying: boolean
  currentTrack: TrackInfo | null
  progress: number
  volume: number
  illuminationLevel: number
  rpm: '33' | '45'
  isPowered: boolean
  activeView: 'deck' | 'lyrics' | 'shelf'
  showSideLyrics: boolean
  isMiniPlayer: boolean
  isFullscreen: boolean
  isListeningDisplay: boolean
  isScreensaver: boolean
  screensaverLyrics: boolean
  miniPlayerAlwaysOnTop: boolean
  theme: AppTheme
  previousManualTheme: AppTheme | null
  isSettingsOpen: boolean
  isOnboardingOpen: boolean
  needleSound: boolean
  physicalFeedback: boolean
  autoScrollLyrics: boolean
  lyricsOffset: number
  isKeyboardHelpOpen: boolean
  runInBackground: boolean
  startWithWindows: boolean
  hasUpdateAvailable: boolean

  play: () => void
  pause: () => void
  setIsPlaying: (isPlaying: boolean) => void
  togglePlayPause: () => void
  setTrack: (track: TrackInfo | null) => void
  setProgress: (progress: number | ((prev: number) => number)) => void
  seek: (timeSeconds: number) => void
  setVolume: (volume: number) => void
  setIlluminationLevel: (level: number) => void
  setRpm: (rpm: '33' | '45') => void
  toggleRpm: () => void
  setIsPowered: (isPowered: boolean) => void
  togglePower: () => void

  setActiveView: (view: 'deck' | 'lyrics' | 'shelf') => void
  toggleActiveView: () => void
  setShowSideLyrics: (show: boolean) => void
  toggleSideLyrics: () => void
  setFullscreen: (value: boolean) => void
  toggleFullscreen: () => void
  setIsListeningDisplay: (isListeningDisplay: boolean) => void
  setIsScreensaver: (isScreensaver: boolean) => void
  setScreensaverLyrics: (screensaverLyrics: boolean) => void
  toggleScreensaverLyrics: () => void
  setTheme: (theme: AppTheme) => void
  toggleMiniPlayer: () => void
  setMiniPlayerAlwaysOnTop: (alwaysOnTop: boolean) => void
  setIsSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
  setIsOnboardingOpen: (open: boolean) => void
  toggleOnboarding: () => void
  setNeedleSound: (enabled: boolean) => void
  setPhysicalFeedback: (enabled: boolean) => void
  setAutoScrollLyrics: (enabled: boolean) => void
  setLyricsOffset: (offset: number) => void
  toggleKeyboardHelp: () => void
  setRunInBackground: (enabled: boolean) => void
  setStartWithWindows: (enabled: boolean) => void
  setHasUpdateAvailable: (hasUpdate: boolean) => void
  queue: TrackInfo[]
  playNext: () => void
  playPrev: () => void
  playTrackAtIndex: (index: number) => void
  reorderQueue: (newQueue: TrackInfo[]) => void
  removeFromQueue: (index: number) => void
  addToQueue: (track: TrackInfo) => void
  clearQueue: () => void
}

function getInitialTheme(): AppTheme {
  if (typeof localStorage === 'undefined') return 'quiet-room'
  
  let saved = localStorage.getItem('kissa_theme')
  const legacySaved = localStorage.getItem('phono_theme')
  
  if (!saved && legacySaved) {
    saved = legacySaved
    localStorage.setItem('kissa_theme', legacySaved)
    localStorage.removeItem('phono_theme')
  }

  if (!saved) return 'quiet-room'
  const legacyMap: Record<string, AppTheme> = {
    obsidian: 'quiet-room',
    walnut: 'quiet-room',
    nordic: 'sunday-morning',
    midnight: 'midnight-apartment'
  }
  if (legacyMap[saved]) return legacyMap[saved]
  const validThemes: AppTheme[] = [
    'quiet-room',
    'dusty-record',
    'jazz-bar',
    'midnight-apartment',
    'rainy-window',
    'hifi-library',
    'concrete-vinyl',
    'sunday-morning',
    'adaptive'
  ]
  if (validThemes.includes(saved as AppTheme)) return saved as AppTheme
  return 'quiet-room'
}

// This tracks the onboarding content schema, rather than the app's patch version.
// It intentionally advances only when the guide needs to be shown again.
const ONBOARDING_COMPLETION_KEY = 'kissa_intro_seen_v3'

function getInitialOnboarding(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(ONBOARDING_COMPLETION_KEY) !== 'true'
}

function getInitialIllumination(): number {
  if (typeof localStorage === 'undefined') return 100
  const saved = localStorage.getItem('kissa_illumination')
  if (saved !== null) {
    const val = parseInt(saved, 10)
    if (!isNaN(val) && val >= 0 && val <= 100) return val
  }
  return 100
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  isPlaying: false,
  currentTrack: {
    title: 'Kissa',
    artist: 'Listening Room',
    album: 'Kissa',
    artworkUrl: kissaArtworkFallback,
    audioUrl: undefined,
    duration: 0,
    source: 'Kissa',
    sourceAppId: 'kissa-idle'
  },
  progress: 0,
  volume: 78,
  illuminationLevel: getInitialIllumination(),
  rpm: '33',
  isPowered: true,
  activeView: 'deck',
  showSideLyrics: false,
  isMiniPlayer: false,
  isFullscreen: false,
  isListeningDisplay: false,
  isScreensaver: false,
  screensaverLyrics: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_screensaver_lyrics') === 'true' : false,
  miniPlayerAlwaysOnTop: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_always_on_top') !== 'false' : true,
  theme: getInitialTheme(),
  previousManualTheme: getInitialTheme() === 'adaptive' ? 'quiet-room' : getInitialTheme(),
  isSettingsOpen: false,
  isOnboardingOpen: getInitialOnboarding(),
  needleSound: true,
  physicalFeedback: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_physical_feedback') !== 'false' : true,
  autoScrollLyrics: true,
  lyricsOffset: typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('kissa_lyrics_offset') || '0') || 0 : 0,
  isKeyboardHelpOpen: false,
  runInBackground: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_run_in_background') === 'true' : false,
  startWithWindows: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_start_with_windows') === 'true' : false,
  hasUpdateAvailable: false,

  play: () => set({ isPlaying: true, isPowered: true }),
  pause: () => set({ isPlaying: false }),
  setIsPlaying: (isPlaying) => set((state) => ({ isPlaying, isPowered: isPlaying ? true : state.isPowered })),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying, isPowered: !state.isPlaying ? true : state.isPowered })),
  setTrack: (track) => set({ currentTrack: track, progress: 0 }),
  setProgress: (progress) =>
    set((state) => {
      const duration = state.currentTrack?.duration ?? 0
      const current = state.progress
      const raw = typeof progress === 'function' ? progress(current) : progress
      const nextProgress = Number.isNaN(raw)
        ? 0
        : Math.max(0, duration > 0 ? Math.min(duration, raw) : Math.max(0, raw))
      return { progress: nextProgress }
    }),
  seek: (timeSeconds) => {
    if (typeof timeSeconds !== 'number' || isNaN(timeSeconds) || !isFinite(timeSeconds)) {
      return
    }
    const state = get()
    const duration = state.currentTrack?.duration ?? 0
    let target = Math.max(0, timeSeconds)
    if (duration > 0) {
      target = Math.min(target, duration)
    }

    // 1. Authoritative visual clock update
    PlaybackClock.setSeekPosition(target)
    set({ progress: target })

    // 2. Set seek cooldown to prevent rubberbanding from pre-seek packets
    if (typeof window !== 'undefined') {
      ;(window as any).__kissaSeekCooldown = {
        target,
        timestamp: performance.now()
      }
    }

    // 3. Dispatch to external SMTC via Electron IPC
    if (typeof window !== 'undefined' && window.electron?.mediaSeek) {
      window.electron.mediaSeek(target).catch(() => {
        // Handled gracefully if unsupported by active app
      })
    }
  },
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
  setIlluminationLevel: (level) => {
    const clamped = Math.max(0, Math.min(100, level))
    set({ illuminationLevel: clamped })
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_illumination', clamped.toString())
    }
  },
  setRpm: (rpm) => set({ rpm }),
  toggleRpm: () => set((state) => ({ rpm: state.rpm === '33' ? '45' : '33' })),
  setIsPowered: (isPowered) => set((state) => ({ isPowered, isPlaying: isPowered ? state.isPlaying : false })),
  togglePower: () =>
    set((state) => {
      const nextPower = !state.isPowered
      return { isPowered: nextPower, isPlaying: nextPower ? state.isPlaying : false }
    }),
  setActiveView: (activeView) => set({ activeView }),
  toggleActiveView: () => set((state) => ({ activeView: state.activeView === 'deck' ? 'lyrics' : 'deck' })),
  setShowSideLyrics: (showSideLyrics) => set({ showSideLyrics }),
  toggleSideLyrics: () => set((state) => ({ showSideLyrics: !state.showSideLyrics })),
  setFullscreen: (value) => {
    const state = get()

    if (value && state.isMiniPlayer) {
      window.electron?.toggleMiniPlayer?.(false, state.miniPlayerAlwaysOnTop)
      set({ isMiniPlayer: false })
    }

    set({ isFullscreen: value })

    window.electron?.setFullScreen(value).then(
      (isFullscreen) => set({ isFullscreen }),
      () => set({ isFullscreen: false })
    )
  },
  toggleFullscreen: () => get().setFullscreen(!get().isFullscreen),
  setIsListeningDisplay: (isListeningDisplay) => set({ isListeningDisplay }),
  setIsScreensaver: (isScreensaver) => set({ isScreensaver }),
  setScreensaverLyrics: (screensaverLyrics) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_screensaver_lyrics', screensaverLyrics.toString())
    }
    set({ screensaverLyrics })
  },
  toggleScreensaverLyrics: () => get().setScreensaverLyrics(!get().screensaverLyrics),
  toggleMiniPlayer: () => {
    set((state) => {
      const isMini = !state.isMiniPlayer
      if (typeof window !== 'undefined' && window.electron?.toggleMiniPlayer) {
        window.electron.toggleMiniPlayer(isMini, state.miniPlayerAlwaysOnTop)
      }
      return { isMiniPlayer: isMini }
    })
  },
  setMiniPlayerAlwaysOnTop: (alwaysOnTop) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_always_on_top', alwaysOnTop.toString())
    }
    set({ miniPlayerAlwaysOnTop: alwaysOnTop })
    const state = usePlayerStore.getState()
    if (state.isMiniPlayer && typeof window !== 'undefined' && window.electron?.toggleMiniPlayer) {
      window.electron.toggleMiniPlayer(true, alwaysOnTop)
    }
  },
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_theme', theme)
    }
    set({ theme })
  },
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setIsOnboardingOpen: (isOnboardingOpen) => {
    if (!isOnboardingOpen && typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_COMPLETION_KEY, 'true')
    }
    set({ isOnboardingOpen })
  },
  toggleOnboarding: () =>
    set((state) => {
      const next = !state.isOnboardingOpen
      if (!next && typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_COMPLETION_KEY, 'true')
      }
      return { isOnboardingOpen: next }
    }),
  setNeedleSound: (needleSound) => set({ needleSound }),
  setPhysicalFeedback: (physicalFeedback) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_physical_feedback', physicalFeedback.toString())
    }
    set({ physicalFeedback })
  },
  setAutoScrollLyrics: (autoScrollLyrics) => set({ autoScrollLyrics }),
  setLyricsOffset: (lyricsOffset) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_lyrics_offset', lyricsOffset.toString())
    }
    set({ lyricsOffset })
  },
  toggleKeyboardHelp: () => set((state) => ({ isKeyboardHelpOpen: !state.isKeyboardHelpOpen })),
  setRunInBackground: (runInBackground) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_run_in_background', runInBackground.toString())
    }
    set({ runInBackground })
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.syncSettings({ runInBackground })
    }
  },
  setStartWithWindows: (startWithWindows) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_start_with_windows', startWithWindows.toString())
    }
    set({ startWithWindows })
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.setStartup(startWithWindows)
    }
  },
  setHasUpdateAvailable: (hasUpdateAvailable) => set({ hasUpdateAvailable }),

  queue: [],
  
  playNext: () => set((state) => {
    if (state.queue.length === 0) {
      return { isPlaying: false, progress: 0 }
    }
    const nextTrack = state.queue[0]
    const newQueue = state.queue.slice(1)
    return { queue: newQueue, currentTrack: nextTrack, progress: 0, isPlaying: true }
  }),
  
  playPrev: () => set(() => {
    return { progress: 0, isPlaying: true }
  }),

  playTrackAtIndex: (index) => set((state) => {
    if (index >= 0 && index < state.queue.length) {
      const trackToPlay = state.queue[index]
      const newQueue = state.queue.slice(index + 1)
      return { queue: newQueue, currentTrack: trackToPlay, progress: 0, isPlaying: true }
    }
    return {}
  }),

  reorderQueue: (newQueue) => set({ queue: newQueue }),
  
  removeFromQueue: (index) => set((state) => {
    const newQueue = [...state.queue]
    newQueue.splice(index, 1)
    return { queue: newQueue }
  }),
  
  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
  
  clearQueue: () => set({ queue: [] })
}))
