/** What the phone remote shows: a small, bounded copy of what Kissa is playing. */
export interface RemoteNowPlaying {
  title: string
  artist: string
  album: string
  isPlaying: boolean
  /** Seconds into the track when this was taken. */
  progress: number
  duration: number
  /** The room's accent colour, so the phone page is tinted like the room. */
  accent?: string
  /** An embedded cover (data:image/jpeg|png|webp), served to the phone at /api/art. */
  artworkDataUrl?: string
  /** A web (https) cover, e.g. a catalogue match; Kissa fetches it and serves the bytes itself. */
  artworkRemoteUrl?: string
  /** False when the source app will not take next/previous from Kissa. */
  canSkip?: boolean
}

export interface RemoteLyricLine {
  /** Seconds. */
  time: number
  text: string
}

/** One choice the phone can offer: a room, a pressing or a finish. */
export interface RemoteChoice {
  id: string
  name: string
  /** A CSS background for the phone's little sample (a colour or gradient). */
  swatch?: string
}

/** How the room looks, so the phone can show it and change it. */
export interface RemoteLook {
  /** Kissa's language, so the phone page speaks it too. */
  lang: string
  room: string
  rooms: RemoteChoice[]
  pressing: string
  pressings: RemoteChoice[]
  finish: string
  finishes: RemoteChoice[]
  /** Room light, 0 to 100. */
  light: number
  /** Lyrics beside the record on the PC. */
  lyrics: boolean
  /** Seconds until the sleep timer stops the music, or null when it is off. */
  sleepLeft: number | null
}

export type RemoteLookChange =
  | { setting: 'room' | 'pressing' | 'finish'; value: string }
  | { setting: 'light'; value: number }
  | { setting: 'lyrics'; value: boolean }
  | { setting: 'sleep'; value: number }

export type RemoteCommand =
  | { action: 'playPause' }
  | { action: 'next' }
  | { action: 'prev' }
  | { action: 'playIndex'; index: number; revision: string }
  | ({ action: 'look' } & RemoteLookChange)

export interface PhoneRemoteStatus {
  on: boolean
  /** The address a phone on the same network opens, e.g. http://192.168.1.20:47330. */
  url: string | null
  /** The QR code's address. It never carries the session key: the phone must type the code. */
  pairUrl: string | null
  /** Six digits for typing the address in by hand instead of scanning. */
  code: string | null
  /** Phones connected now. */
  phones: number
  /** Why it could not switch on: no free port, or no Wi-Fi or wired network. */
  problem?: 'no-port' | 'no-network'
  /** Windows treats this Wi-Fi as Public, where its firewall stops phones reaching the PC. */
  publicNetwork?: boolean
}
