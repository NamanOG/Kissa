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
  activeView: 'deck' | 'lyrics'
  showSideLyrics: boolean
  theme: AppTheme
  isSettingsOpen: boolean
  needleSound: boolean
  autoScrollLyrics: boolean

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
  setActiveView: (view: 'deck' | 'lyrics') => void
  toggleActiveView: () => void
  setShowSideLyrics: (show: boolean) => void
  toggleSideLyrics: () => void
  setTheme: (theme: AppTheme) => void
  setIsSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
  setNeedleSound: (enabled: boolean) => void
  setAutoScrollLyrics: (enabled: boolean) => void
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
    'sunday-morning'
  ]
  return validThemes.includes(saved as AppTheme) ? (saved as AppTheme) : 'quiet-room'
}

const savedTheme = getInitialTheme()

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentTrack: {
    title: 'Self Control',
    artist: 'Frank Ocean',
    album: 'Blonde',
    artworkUrl: blondeAlbumCover,
    audioUrl: selfControlAudio,
    duration: 249,
    source: 'Spotify'
  },
  progress: 84,
  volume: 78,
  rpm: '33',
  isPowered: true,
  activeView: 'deck',
  showSideLyrics: false,
  theme: savedTheme,
  isSettingsOpen: false,
  needleSound: true,
  autoScrollLyrics: true,

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
  setTheme: (theme) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('kissa_theme', theme)
    }
    set({ theme })
  },
  setIsSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setNeedleSound: (needleSound) => set({ needleSound }),
  setAutoScrollLyrics: (autoScrollLyrics) => set({ autoScrollLyrics })
}))
