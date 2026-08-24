import { create } from 'zustand'

import blondeAlbumCover from '@renderer/media/blonde-album.jpg'
import selfControlAudio from '@renderer/media/self-control.mp3'

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
  rpm: '33' | '45'
  isPowered: boolean
  activeView: 'deck' | 'lyrics' | 'shelf'
  showSideLyrics: boolean
  isMiniPlayer: boolean
  miniPlayerAlwaysOnTop: boolean
  theme: AppTheme
  previousManualTheme: AppTheme | null
  isSettingsOpen: boolean
  isOnboardingOpen: boolean
  needleSound: boolean
  physicalFeedback: boolean
  autoScrollLyrics: boolean
  isKeyboardHelpOpen: boolean
  updateAvailable: { version: string; url: string } | null

  play: () => void
  pause: () => void
  setIsPlaying: (isPlaying: boolean) => void
  togglePlayPause: () => void
  setTrack: (track: TrackInfo | null) => void
  setProgress: (progress: number | ((prev: number) => number)) => void
  setVolume: (volume: number) => void
  setRpm: (rpm: '33' | '45') => void
  toggleRpm: () => void
  setIsPowered: (isPowered: boolean) => void
  togglePower: () => void

  setActiveView: (view: 'deck' | 'lyrics' | 'shelf') => void
  toggleActiveView: () => void
  setShowSideLyrics: (show: boolean) => void
  toggleSideLyrics: () => void
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
  toggleKeyboardHelp: () => void
  setUpdateAvailable: (updateInfo: { version: string; url: string } | null) => void
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
  const saved = localStorage.getItem('kissa_theme') || localStorage.getItem('phono_theme')
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

function getInitialOnboarding(): boolean {
  if (typeof localStorage === 'undefined') return false
  const seen = localStorage.getItem('kissa_intro_seen') || localStorage.getItem('kissa_onboarding_completed')
  return !seen
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTrack: {
    title: 'Self Control',
    artist: 'Frank Ocean',
    album: 'Blonde',
    artworkUrl: blondeAlbumCover,
    audioUrl: selfControlAudio,
    duration: 249,
    source: 'Local Audio'
  },
  progress: 84,
  volume: 78,
  rpm: '33',
  isPowered: true,
  activeView: 'deck',
  showSideLyrics: false,
  isMiniPlayer: false,
  miniPlayerAlwaysOnTop: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_always_on_top') !== 'false' : true,
  theme: getInitialTheme(),
  previousManualTheme: getInitialTheme() === 'adaptive' ? 'quiet-room' : getInitialTheme(),
  isSettingsOpen: false,
  isOnboardingOpen: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_intro_seen') !== 'true' : false,
  needleSound: true,
  physicalFeedback: typeof localStorage !== 'undefined' ? localStorage.getItem('kissa_physical_feedback') !== 'false' : true,
  autoScrollLyrics: true,
  isKeyboardHelpOpen: false,
  updateAvailable: null,

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
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(100, volume)) }),
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
      localStorage.setItem('kissa_intro_seen', 'true')
    }
    set({ isOnboardingOpen })
  },
  toggleOnboarding: () =>
    set((state) => {
      const next = !state.isOnboardingOpen
      if (!next && typeof localStorage !== 'undefined') {
        localStorage.setItem('kissa_intro_seen', 'true')
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
  toggleKeyboardHelp: () => set((state) => ({ isKeyboardHelpOpen: !state.isKeyboardHelpOpen })),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),

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
