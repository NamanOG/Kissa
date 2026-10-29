/** An album folder the listener chose, as main reads it (main/album). Only these files can be played. */
export interface LocalAlbumTrack {
  /** kissa-album:// address; main serves only the files of the album it last read. */
  url: string
  title: string
  artist: string
  disc: number
  track: number
  /** Seconds, from the file's properties; 0 when Windows does not know. */
  duration: number
  fileName: string
}

export interface LocalAlbum {
  title: string
  artist: string
  /** data: URL of the folder's cover image or the first file's embedded picture, else ''. */
  coverDataUrl: string
  /** 'tags' when every file had a track number; otherwise file names set the order. */
  order: 'tags' | 'filenames'
  tracks: LocalAlbumTrack[]
  /** Files left out because Kissa cannot play that kind of file. */
  leftOut: string[]
}

export type LocalAlbumResult =
  | { status: 'ok'; album: LocalAlbum }
  | { status: 'cancelled' }
  | { status: 'empty'; leftOut: string[] }
  | { status: 'error' }

/** Why a track would not play, worked out by main from the file itself. */
export type TrackProblem = 'missing' | 'unsupported' | 'damaged'
